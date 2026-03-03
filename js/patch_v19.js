// ============================================================
// KEANO V19 PATCH — Non-Destructive Enhancements
// Loaded AFTER all core scripts. Wraps existing methods.
// To revert: Remove the <script> line for this file in index.html.
// ============================================================
(function () {
    'use strict';

    // ─── 1. FIGHTER GLOW (Keano, Vikingo, JJ) ───
    const GLOW_CHARS = ['keano', 'vikingo', 'jj', 'supreme_keano', 'hyper_keano', 'dark_vikingo'];
    const GLOW_COLOR = 'rgba(0, 255, 255, 0.4)';
    const GLOW_BLUR = 18;

    if (typeof HybridFighter !== 'undefined') {
        const origDraw = HybridFighter.prototype.draw;
        HybridFighter.prototype.draw = function () {
            const id = (this.id || '').toLowerCase();
            const shouldGlow = GLOW_CHARS.some(c => id.includes(c));

            if (shouldGlow && this.hp > 0) {
                X.save();
                X.shadowBlur = GLOW_BLUR + Math.sin(performance.now() * 0.003) * 6;
                X.shadowColor = GLOW_COLOR;
                origDraw.call(this);
                X.globalAlpha = 0.15;
                origDraw.call(this);
                X.restore();
            } else {
                origDraw.call(this);
            }
        };
        console.log('✅ V19: Fighter Glow active');
    }

    // ─── 2. PARTICLE LIMITER (max 150) ───
    if (typeof particles !== 'undefined') {
        const origPush = particles.push;
        particles.push = function () {
            if (this.length >= 150) return this.length;
            return origPush.apply(this, arguments);
        };
        console.log('✅ V19: Particle limiter (max 150)');
    }

    // ─── 3. FIX B: EXTENDED HITSTUN ───
    // Wraps takeHit to increase hitstun duration for better combo windows.
    if (typeof HybridFighter !== 'undefined') {
        const origTakeHit = HybridFighter.prototype.takeHit;
        HybridFighter.prototype.takeHit = function (dmg, dir, isHeavy) {
            origTakeHit.call(this, dmg, dir, isHeavy);
            // Extend hitstun if still in 'hit' state (not KO)
            if (this.state === 'hit') {
                this.stateTimer = isHeavy ? 0.75 : 0.50;
            }
        };
        console.log('✅ V19: Extended Hitstun (Light: 0.5s, Heavy: 0.75s)');
    }

    // ─── 4. FIX C: AI COMBO PATTERNS ───
    // Gives AI predefined attack sequences instead of pure random.
    if (typeof HybridFighter !== 'undefined') {
        const AI_COMBOS = {
            close: [
                ['punch', 'punch', 'kick'],
                ['punch', 'kick'],
                ['kick', 'punch', 'punch'],
            ],
            mid: [
                ['kick', 'special'],
                ['punch', 'punch', 'special'],
            ],
            far: [
                ['approach', 'punch', 'kick'],
            ]
        };

        const origUpdateAI = HybridFighter.prototype.updateAI;
        HybridFighter.prototype.updateAI = function (dt, opponent) {
            if (!this._comboQueue) this._comboQueue = [];
            if (!this._comboDelay) this._comboDelay = 0;

            // If combo in progress, execute it
            if (this._comboQueue.length > 0) {
                this._comboDelay -= dt;
                if (this._comboDelay <= 0) {
                    const nextAction = this._comboQueue.shift();
                    const canAct = (this.state === 'idle' || this.state === 'walk');

                    if (canAct && this.hp > 0 && opponent.hp > 0) {
                        if (nextAction === 'punch') {
                            this.doAttack('punch', opponent);
                            this._comboDelay = 0.18;
                        } else if (nextAction === 'kick') {
                            this.doAttack('kick', opponent);
                            this._comboDelay = 0.25;
                        } else if (nextAction === 'special' && this.specialCD <= 0) {
                            this.doSpecialFlip(opponent);
                            this._comboDelay = 0.4;
                        } else if (nextAction === 'approach') {
                            const dir = opponent.x > this.x ? 1 : -1;
                            this.x += dir * 40;
                            this._comboDelay = 0.1;
                        }
                    } else {
                        this._comboQueue = [];
                    }
                    return;
                }
                return;
            }

            // 30% chance to start a combo instead of normal single-action AI
            const dist = Math.abs(this.x - opponent.x);
            const canAct = (this.state === 'idle' || this.state === 'walk');

            if (canAct && Math.random() < 0.30) {
                let zone = 'far';
                if (dist < this.w * 1.0) zone = 'close';
                else if (dist < this.w * 2.0) zone = 'mid';

                const patterns = AI_COMBOS[zone];
                if (patterns && patterns.length > 0) {
                    const chosen = patterns[Math.floor(Math.random() * patterns.length)];
                    this._comboQueue = [...chosen];
                    this._comboDelay = 0.05;
                    return;
                }
            }

            // Fall through to normal AI
            origUpdateAI.call(this, dt, opponent);
        };
        console.log('✅ V19: AI Combo Patterns (30% combo chance)');
    }

})();
