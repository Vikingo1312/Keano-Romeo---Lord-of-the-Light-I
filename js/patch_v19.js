// ============================================================
// PATCH V19.5 – Mini-Patch (Non-Destructive, Additive Only)
// Füge dieses Script NACH allen anderen Scripts ein.
// Es überschreibt NICHTS – es erweitert nur bestehende Logik.
// ============================================================

(function () {
    'use strict';
    console.log('[PATCH V19.5] Initializing...');

    // ─── 1. FIGHTER GLOW (Keano, Vikingo, JJ) ───────────────
    // Wraps the existing HybridFighter.draw() to add a subtle glow
    if (typeof HybridFighter !== 'undefined' && HybridFighter.prototype.draw) {
        const _originalDraw = HybridFighter.prototype.draw;
        HybridFighter.prototype.draw = function () {
            const ctx = typeof X !== 'undefined' ? X : null;
            if (!ctx) return _originalDraw.call(this);

            // Glow only for main heroes
            const heroNames = ['keano', 'vikingo', 'jj', 'jayden', 'jay_x', 'vikingo_coat', 'dark_vikingo'];
            const fDir = (this.fighterDir || this.ld?.fighterDir || '').toLowerCase();
            const isHero = heroNames.some(h => fDir.includes(h));

            if (isHero && this.hp > 0) {
                ctx.save();
                // Subtle cyan glow during normal play
                let glowColor = 'rgba(0, 200, 255, 0.3)';
                let glowBlur = 15;

                // Stronger glow during attacks/specials
                if (['punch', 'kick', 'special', 'super', 'special_roll', 'special_flip', 'finisher'].includes(this.state)) {
                    glowColor = 'rgba(0, 255, 255, 0.6)';
                    glowBlur = 30;
                }

                ctx.shadowColor = glowColor;
                ctx.shadowBlur = glowBlur;
                _originalDraw.call(this);
                ctx.restore();
            } else {
                _originalDraw.call(this);
            }
        };
        console.log('[PATCH V19.5] ✅ Fighter Glow active');
    }


    // ─── 2. STORY MODE VOICE LINE QUEUE ─────────────────────
    // Only activates if audio elements exist in the DOM
    window._patchVoiceQueue = {
        lines: ['prologue', 'midpoint_reflexion', 'epilogue'],
        current: 0,
        playing: false,

        play: function () {
            if (this.current >= this.lines.length) {
                this.playing = false;
                return;
            }
            const id = this.lines[this.current];
            // Look for existing <audio> elements by various ID patterns
            const el = document.getElementById('audio-' + id)
                || document.getElementById('voice-' + id)
                || document.querySelector('audio[data-voice="' + id + '"]');
            if (!el) {
                this.current++;
                this.play();
                return;
            }
            this.playing = true;
            el.play().catch(() => { });
            el.onended = () => {
                this.current++;
                this.play();
            };
        },

        skip: function () {
            this.lines.forEach(id => {
                const el = document.getElementById('audio-' + id)
                    || document.getElementById('voice-' + id);
                if (el && !el.paused) el.pause();
            });
            this.current = this.lines.length;
            this.playing = false;
        }
    };

    // Wire up skip button if it exists
    const skipBtn = document.getElementById('btn-skip-sequence');
    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            window._patchVoiceQueue.skip();
        });
        console.log('[PATCH V19.5] ✅ Voice Queue + Skip wired');
    }


    // ─── 3. MOBILE CONTROLS + FULLSCREEN ────────────────────
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

    if (isMobile) {
        // Show mobile controls if they exist
        const mc = document.getElementById('mobile-controls');
        if (mc && mc.classList.contains('hidden')) {
            // Don't auto-show, wait for game start – but ensure they're visible when fighting
            const _showOnFight = setInterval(() => {
                if (typeof gameState !== 'undefined' && gameState === 'fighting') {
                    mc.classList.remove('hidden');
                    clearInterval(_showOnFight);
                }
            }, 500);
        }

        // Fullscreen on first touch (iOS/Android)
        let fullscreenTriggered = false;
        document.addEventListener('touchstart', function _fsHandler() {
            if (fullscreenTriggered) return;
            fullscreenTriggered = true;
            const docEl = document.documentElement;
            if (docEl.requestFullscreen) docEl.requestFullscreen().catch(() => { });
            else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
        }, { once: true });

        console.log('[PATCH V19.5] ✅ Mobile Controls + Fullscreen ready');
    }

    // Desktop key mapping safety net (only adds if keys{} exists)
    if (typeof keys !== 'undefined') {
        const keyMap = {
            'w': 'up', 'a': 'left', 's': 'down', 'd': 'right',
            'W': 'up', 'A': 'left', 'S': 'down', 'D': 'right',
            'j': 'j', 'k': 'k', 'l': 'l', 'u': 'u',
            'J': 'j', 'K': 'k', 'L': 'l', 'U': 'u'
        };

        // Only patch if WASD isn't already mapped
        if (!keys['w'] && !keys['W']) {
            document.addEventListener('keydown', (e) => {
                if (keyMap[e.key]) keys[keyMap[e.key]] = true;
            });
            document.addEventListener('keyup', (e) => {
                if (keyMap[e.key]) keys[keyMap[e.key]] = false;
            });
            console.log('[PATCH V19.5] ✅ WASD + JKLU key mapping added');
        }
    }


    // ─── 4. BUGFIXES (hasHit Lock + Combo Counter) ──────────
    // Ensure hasHit is initialized on fighters (safety net)
    if (typeof HybridFighter !== 'undefined') {
        const _origConstruct = HybridFighter.prototype.constructor;

        // Patch doAttack to always reset hasHit
        if (HybridFighter.prototype.doAttack) {
            const _origDoAttack = HybridFighter.prototype.doAttack;
            HybridFighter.prototype.doAttack = function (type, opponent) {
                this.hasHit = false; // Guarantee 1-hit-per-attack
                return _origDoAttack.call(this, type, opponent);
            };
            console.log('[PATCH V19.5] ✅ hasHit lock on doAttack');
        }

        // Patch doSpecial variants too
        ['doSpecial', 'doSpecialRoll', 'doSpecialFlip', 'doSuper'].forEach(fn => {
            if (HybridFighter.prototype[fn]) {
                const _orig = HybridFighter.prototype[fn];
                HybridFighter.prototype[fn] = function (opponent) {
                    this.hasHit = false;
                    return _orig.call(this, opponent);
                };
            }
        });

        // Combo counter safety: ensure properties exist on every fighter
        const _origUpdate = HybridFighter.prototype.update;
        if (_origUpdate) {
            HybridFighter.prototype.update = function (dt, opponent) {
                // Initialize combo properties if missing
                if (this.comboCount === undefined) this.comboCount = 0;
                if (this.comboTimer === undefined) this.comboTimer = 0;
                if (this.hitstun === undefined) this.hitstun = 0;
                if (this.juggleCount === undefined) this.juggleCount = 0;
                if (this.hasHit === undefined) this.hasHit = false;

                return _origUpdate.call(this, dt, opponent);
            };
        }

        console.log('[PATCH V19.5] ✅ Combo & Hit safety patches applied');
    }


    // ─── 5. PARTICLE PERFORMANCE LIMITER ────────────────────
    if (typeof particles !== 'undefined') {
        setInterval(() => {
            if (typeof particles !== 'undefined' && particles.length > 150) {
                particles.splice(0, particles.length - 100);
            }
        }, 1000);
        console.log('[PATCH V19.5] ✅ Particle limiter active (max 150)');
    }


    // ─── DONE ───────────────────────────────────────────────
    console.log('[PATCH V19.5] ✅ All patches loaded successfully.');
    console.log('[PATCH V19.5] No layouts, canvases, or menus were modified.');
})();
