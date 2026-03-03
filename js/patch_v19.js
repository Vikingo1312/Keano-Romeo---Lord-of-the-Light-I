// ============================================================
// KEANO V19 PATCH — Non-Destructive Enhancements
// Loaded AFTER all core scripts. Does NOT modify any originals.
// ============================================================
(function () {
    'use strict';

    // ─── 1. FIGHTER GLOW (Keano, Vikingo, JJ) ───
    const GLOW_CHARS = ['keano', 'vikingo', 'jj', 'supreme_keano', 'hyper_keano', 'dark_vikingo'];
    const GLOW_COLOR = 'rgba(0, 255, 255, 0.4)';
    const GLOW_BLUR = 18;

    // Wrap the HybridFighter.draw method if it exists
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
                // Second pass for stronger glow
                X.globalAlpha = 0.15;
                origDraw.call(this);
                X.restore();
            } else {
                origDraw.call(this);
            }
        };
        console.log('✅ V19 Patch: Fighter Glow active for', GLOW_CHARS.join(', '));
    }

    // ─── 2. PARTICLE LIMITER (max 150) ───
    if (typeof particles !== 'undefined') {
        const origPush = particles.push;
        particles.push = function () {
            if (this.length >= 150) return this.length;
            return origPush.apply(this, arguments);
        };
        console.log('✅ V19 Patch: Particle limiter active (max 150)');
    }

})();
