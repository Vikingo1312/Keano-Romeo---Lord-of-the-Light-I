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
    if (typeof HybridFighter !== 'undefined') {
        const origTakeHit = HybridFighter.prototype.takeHit;
        HybridFighter.prototype.takeHit = function (dmg, dir, isHeavy) {
            origTakeHit.call(this, dmg, dir, isHeavy);
            if (this.state === 'hit') {
                this.stateTimer = isHeavy ? 0.75 : 0.50;
            }
        };
        console.log('✅ V19: Extended Hitstun (Light: 0.5s, Heavy: 0.75s)');
    }

    // ─── 4. FIX C: AI COMBO PATTERNS + EVENT-BASED REACTIONS ───
    // SF Alpha Upgrade: AI reacts to events instead of pure random
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

        // COUNTER COMBOS: Used after blocking or recovering from hit
        const COUNTER_COMBOS = [
            ['punch', 'punch', 'kick'],     // Quick punish
            ['kick', 'special'],             // Heavy punish
            ['punch', 'kick', 'punch'],      // Mix-up
        ];

        const origUpdateAI = HybridFighter.prototype.updateAI;
        HybridFighter.prototype.updateAI = function (dt, opponent) {
            if (!this._comboQueue) this._comboQueue = [];
            if (!this._comboDelay) this._comboDelay = 0;
            if (!this._aiReactCooldown) this._aiReactCooldown = 0;
            if (this._lastHP === undefined) this._lastHP = this.hp;
            if (this._lastOppState === undefined) this._lastOppState = '';

            this._aiReactCooldown = Math.max(0, this._aiReactCooldown - dt);

            // ─── EVENT: onTakeHit ─── (SF Alpha pattern)
            // When AI gets hit, it tries to block on recovery
            if (this.hp < this._lastHP && this._aiReactCooldown <= 0) {
                // Got hit! After hitstun, try to counter
                if (this.state === 'idle' || this.state === 'walk') {
                    this._comboQueue = [];
                    // 50% block first, 50% immediate counter
                    if (Math.random() < 0.5) {
                        this.state = 'block';
                        this.stateTimer = 0.3;
                        this._aiReactCooldown = 0.5;
                    } else {
                        const counter = COUNTER_COMBOS[Math.floor(Math.random() * COUNTER_COMBOS.length)];
                        this._comboQueue = [...counter];
                        this._comboDelay = 0.05;
                        this._aiReactCooldown = 0.8;
                    }
                    this._lastHP = this.hp;
                    return;
                }
            }
            this._lastHP = this.hp;

            // ─── EVENT: onOpponentAttack ─── (SF Alpha pattern)
            // When opponent starts attacking, AI tries to block
            const oppAttacking = (opponent.state === 'punch' || opponent.state === 'kick' || opponent.state === 'special');
            if (oppAttacking && this._lastOppState !== opponent.state && this._aiReactCooldown <= 0) {
                const canAct = (this.state === 'idle' || this.state === 'walk');
                const dist = Math.abs(this.x - opponent.x);
                // Block if close, dodge if far
                if (canAct && dist < this.w * 1.5) {
                    if (Math.random() < 0.6) { // 60% block reaction
                        this.state = 'block';
                        this.stateTimer = 0.4;
                        this._aiReactCooldown = 0.6;
                        this._lastOppState = opponent.state;
                        return;
                    }
                }
            }
            this._lastOppState = opponent.state;

            // ─── EVENT: onOpponentRecovery ─── (SF Alpha pattern)
            // When opponent finishes an attack (enters idle from attack state), punish!
            if (this._lastOppAttacking && !oppAttacking && this._aiReactCooldown <= 0) {
                const canAct = (this.state === 'idle' || this.state === 'walk' || this.state === 'block');
                const dist = Math.abs(this.x - opponent.x);
                if (canAct && dist < this.w * 1.5 && Math.random() < 0.5) {
                    if (this.state === 'block') { this.state = 'idle'; this.stateTimer = 0; }
                    const counter = COUNTER_COMBOS[Math.floor(Math.random() * COUNTER_COMBOS.length)];
                    this._comboQueue = [...counter];
                    this._comboDelay = 0.05;
                    this._aiReactCooldown = 1.0;
                    this._lastOppAttacking = false;
                    return;
                }
            }
            this._lastOppAttacking = oppAttacking;

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

            // 25% chance to start a proactive combo
            const dist = Math.abs(this.x - opponent.x);
            const canAct = (this.state === 'idle' || this.state === 'walk');

            if (canAct && this._aiReactCooldown <= 0 && Math.random() < 0.25) {
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
        console.log('✅ V19: Event-Based AI (onTakeHit, onOpponentAttack, onOpponentRecovery)');
    }

})();
