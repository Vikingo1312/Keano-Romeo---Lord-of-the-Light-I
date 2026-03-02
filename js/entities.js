// ===== PROJECTILES =====
let projectiles = [];
class Projectile {
  constructor(x, y, dir, type, fromPlayer) {
    this.x = x; this.y = y; this.dir = dir; this.type = type; this.fromPlayer = fromPlayer;
    this.speed = type === 'super' ? 14 : 9;
    this.life = 1; this.size = type === 'super' ? 45 : 25;
    this.trail = [];

    // Post-Review 8: Capcom 2.0 Specific Properties
    if (typeof FX_BYPASS !== 'undefined' && (typeof FX_BYPASS !== "undefined" ? FX_BYPASS.specialVariations : 1.0) > 0.0) {
      if (this.type === 'electric') { this.speed = 22; this.size = 15; }
      if (this.type === 'wind') { this.speed = 8; this.size = 35; }
      if (this.type === 'fire') { this.speed = 6; this.size = 40; }
      if (this.type === 'ice') { this.speed = 5; this.size = 50; }
      if (this.type === 'dark' || this.type === 'super') { this.speed = 10; this.size = 60; }
    }
  }

  update(dt) {
    if (typeof FX_BYPASS !== 'undefined' && (typeof FX_BYPASS !== "undefined" ? FX_BYPASS.specialVariations : 1.0) > 0.0) {
      // Custom Physics per type
      if (this.type === 'wind') this.speed += dt * 15; // Accel
      if (this.type === 'fire') { this.speed *= 0.98; this.y += Math.sin(performance.now() / 50) * 3; } // Flamethrower wave
      if (this.type === 'ice') this.life -= dt * 0.4; // Lingers longer
      else this.life -= dt * 0.7;
    } else {
      this.life -= dt * 0.7;
    }

    this.x += this.dir * this.speed;
    this.trail.push({ x: this.x, y: this.y, life: 0.3 });
    this.trail = this.trail.filter(t => { t.life -= dt * 2.5; return t.life > 0; });
    return this.x > -100 && this.x < C.width + 100 && this.life > 0;
  }

  draw() {
    const cols = {
      fire: ['#ff4400', '#ffaa00'], ice: ['#88ddff', '#ffffff'], electric: ['#ffff00', '#ffffff'],
      wind: ['#44ff88', '#ccffcc'], dark: ['#aa00ff', '#ff00ff'], super: ['#00ffff', '#ffffff']
    };
    const c = cols[this.type] || cols.fire;

    X.save(); X.globalAlpha = this.life;
    X.translate(this.x, this.y);

    if (typeof FX_BYPASS !== 'undefined' && (typeof FX_BYPASS !== "undefined" ? FX_BYPASS.specialVariations : 1.0) > 0.0) {
      if (this.type === 'electric') {
        X.fillStyle = c[0]; X.shadowBlur = 20; X.shadowColor = c[1];
        X.fillRect(this.dir === 1 ? -150 : 0, -5, 150, 10); // Lazer beam
      } else if (this.type === 'fire') {
        X.rotate(performance.now() / 150);
        for (let i = 0; i < 3; i++) {
          X.fillStyle = i === 0 ? c[1] : c[0]; X.shadowBlur = 30; X.shadowColor = c[0];
          X.beginPath(); X.arc((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, this.size - i * 10, 0, Math.PI * 2); X.fill();
        }
      } else if (this.type === 'wind') {
        X.strokeStyle = c[0]; X.lineWidth = 5; X.globalAlpha = this.life * 0.5;
        X.beginPath(); X.arc(0, 0, this.size, -Math.PI / 2, Math.PI / 2, this.dir === 1); X.stroke();
      } else {
        // Default / Ice / Dark rendering
        X.rotate(performance.now() / 150);
        const grad = X.createRadialGradient(0, 0, 0, 0, 0, this.size);
        grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.3, c[1]); grad.addColorStop(1, 'rgba(0,0,0,0)');
        X.fillStyle = grad; X.beginPath(); X.arc(0, 0, this.size, 0, Math.PI * 2); X.fill();
      }
    } else {
      // Legacy V10 uniform glow
      this.trail.forEach((t, idx) => {
        X.save(); X.globalAlpha = t.life * 0.6; X.fillStyle = idx % 2 === 0 ? c[0] : c[1];
        X.shadowBlur = 15; X.shadowColor = c[0]; X.beginPath(); X.arc(t.x - this.x, t.y - this.y, this.size * 0.9 * t.life, 0, Math.PI * 2); X.fill();
        X.restore();
      });
      X.rotate(performance.now() / 150);
      const grad = X.createRadialGradient(0, 0, 0, 0, 0, this.size * 1.5);
      grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.3, c[1]); grad.addColorStop(1, 'rgba(0,0,0,0)');
      X.fillStyle = grad; X.beginPath(); X.arc(0, 0, this.size * 1.5, 0, Math.PI * 2); X.fill();
      X.fillStyle = '#ffffff'; X.shadowBlur = 30; X.shadowColor = c[0];
      X.beginPath(); X.arc(0, 0, this.size * 0.6, 0, Math.PI * 2); X.fill();
    }
    X.restore();
  }

  checkHit(fighter) {
    let hitRadius = fighter.w * 0.25;
    let hitHeight = fighter.h * 0.5;

    // Post-Review 8: Custom Hitboxes per type
    if (typeof FX_BYPASS !== 'undefined' && (typeof FX_BYPASS !== "undefined" ? FX_BYPASS.specialVariations : 1.0) > 0.0) {
      if (this.type === 'ice') hitRadius = fighter.w * 0.5; // Huge
      if (this.type === 'fire') { hitRadius = fighter.w * 0.4; hitHeight = fighter.h * 0.8; }
    }

    if (Math.abs(this.x - fighter.x) < hitRadius && Math.abs(this.y - (fighter.y - fighter.h * 0.4)) < hitHeight) {
      let dmg = this.type === 'super' || this.type === 'dark' ? 25 : 12;

      if (typeof FX_BYPASS !== 'undefined' && (typeof FX_BYPASS !== "undefined" ? FX_BYPASS.specialVariations : 1.0) > 0.0) {
        if (this.type === 'electric') dmg = 8; // Fast but weak
        if (this.type === 'fire') dmg = 15; // Burn
        if (this.type === 'ice') dmg = 10;
      }

      fighter.takeHit(dmg, this.dir);
      screenShake = this.type === 'super' ? 18 : 8;

      // Ice freezes (extra hitstop)
      if (this.type === 'ice' && typeof FX_BYPASS !== 'undefined' && (typeof FX_BYPASS !== "undefined" ? FX_BYPASS.specialVariations : 1.0) > 0.0) {
        fighter.hitStop = 0.6; // Freeze
      }

      return true;
    }
    return false;
  }
}



// ============================================================
// COMPANION SYSTEM (Simba for Vikingo)
// ============================================================
const GROUND = () => C.height * 0.85;
const FW = () => Math.min(270, C.height * 0.35);
const FH = () => Math.min(370, C.height * 0.50);
const GRAV = 0.65;

class Companion {
  constructor(owner) {
    this.owner = owner;
    this.x = owner.x;
    this.y = owner.y;
    this.vy = 0;
    this.w = owner.w * 0.6;
    this.h = owner.h * 0.45;
    this.state = 'idle';
    this.stateTimer = 0;
    this.facingRight = owner.facingRight;
    this.imgSrc = 'assets/CHARACTERS/15.Simba/_side.png'; // Fallback
    this.alpha = 1;
  }

  triggerBite() {
    if (this.state === 'leap' || this.state === 'bite') return;
    this.state = 'leap';
    this.facingRight = this.owner.facingRight;
    const fdir = this.facingRight ? 1 : -1;
    this.vy = -12;
    this.stateTimer = 1.0;
    if (QATracker.active) QATracker.specials++;
    SFX.hitHeavy(); // Bark proxy
  }

  update(dt, opponent) {
    const isAdvancedAI = (typeof FX_BYPASS !== 'undefined' && (typeof FX_BYPASS !== "undefined" ? FX_BYPASS.companionAI : 1.0) <= 0.0);

    // Legacy behavior: hidden unless biting
    if (!isAdvancedAI && this.state === 'hidden') return;

    const fdir = this.facingRight ? 1 : -1;

    if (this.state === 'idle' || this.state === 'hidden') {
      if (isAdvancedAI) {
        this.state = 'idle';
        this.alpha = 1;
        this.facingRight = this.owner.facingRight;
        // Follow owner at an offset
        const targetX = this.owner.x - (this.owner.facingRight ? 120 : -120);
        this.x += (targetX - this.x) * 0.1; // Smooth follow
        this.y = this.owner.y; // Match jumps perfectly
      } else {
        this.state = 'hidden';
      }
    }
    else if (this.state === 'leap') {
      this.alpha = 1;
      this.x += fdir * 18 * gameSpeedMult;
      this.y += this.vy * gameSpeedMult;
      this.vy += GRAV * 1.5 * gameSpeedMult;

      if (this.y > GROUND()) {
        this.y = GROUND();
        this.state = 'bite';
        this.stateTimer = 0.5;
      }
    }
    else if (this.state === 'bite') {
      this.stateTimer -= dt * gameSpeedMult;
      if (this.stateTimer <= 0) {
        // advanced AI simply returns to idle; legacy fades out
        this.state = isAdvancedAI ? 'idle' : 'fade';
      }
    }
    else if (this.state === 'fade') {
      this.alpha -= dt * 2.5 * gameSpeedMult;
      if (this.alpha <= 0) {
        this.state = 'hidden';
        this.alpha = 0;
      }
    }
  }

  draw() {
    if (this.state === 'hidden' || this.alpha <= 0) return;
    X.save();
    X.globalAlpha = this.alpha;
    X.translate(Math.round(this.x), Math.round(this.y));
    const faceScale = this.facingRight ? 1 : -1;
    X.scale(faceScale, 1);

    // Get correct Simba asset direction
    const assetId = `assets/CHARACTERS/15.Simba/${this.facingRight ? '_right' : '_left'}.png`;
    const imgCanvas = processedSprites[assetId] || rawImgs[assetId];

    if (imgCanvas && imgCanvas.complete && imgCanvas.naturalWidth !== 0) {
      let rot = 0;
      if (this.state === 'leap') rot = this.vy > 0 ? 0.2 : -0.2;
      if (this.state === 'bite') rot = Math.sin(performance.now() / 20) * 0.1;

      X.rotate(rot);
      X.drawImage(imgCanvas, -this.w / 2, -this.h, this.w, this.h);

      if (this.state === 'leap') {
        X.strokeStyle = 'rgba(255,255,255,0.6)'; X.lineWidth = 3;
        X.beginPath(); X.moveTo(-this.w / 2, -this.h / 2); X.lineTo(-this.w - 60, -this.h / 2); X.stroke();
      }
    }
    X.restore();
  }
}

// ============================================================
// STAGE OBJECTS (V8 Destructibles)
// ============================================================
let stageObjects = [];
class StageObject {
  constructor(type, x, y) {
    this.type = type; this.x = x; this.y = y; this.broken = false;
    this.fadeTimer = 0; this.deleted = false;

    // V14 Polish: New Studio Sizing (Bigger, more Arcade presence)
    this.w = 160; this.h = 200;

    // Image Asset Paths
    this.imgSrc = `assets/props/${type}.png`;
    this.imgBrokenSrc = `assets/props/${type}_broken.png`;

    // Fallback Colors for placeholder boxes if images don't exist yet
    if (type === 'lantern' || type === 'brazier') { this.color = '#ff3300'; }
    else if (type === 'neon' || type === 'server' || type === 'speaker') { this.color = '#ff00ff'; }
    else if (type === 'ice' || type === 'crystal') { this.color = '#00ffff'; }
    else { this.color = '#885522'; }
  }

  update(dt) {
    if (this.broken) {
      this.fadeTimer += dt;
      if (this.fadeTimer > 3.0) this.deleted = true;
    }
  }

  draw() {
    if (this.deleted) return;

    X.save(); X.translate(this.x, this.y);

    // V14: Capcom Flicker Effect before despawn
    if (this.broken && this.fadeTimer > 1.5) {
      // Flashing rapidly between visible and invisible
      if (Math.sin(performance.now() * 0.05) > 0) {
        X.globalAlpha = 0.3; X.filter = 'brightness(2) contrast(2)';
      } else {
        X.globalAlpha = 0;
      }
    }

    const targetSrc = this.broken ? this.imgBrokenSrc : this.imgSrc;
    const imgCanvas = processedSprites[targetSrc] || rawImgs[targetSrc];

    if (imgCanvas && imgCanvas.complete && imgCanvas.naturalWidth !== 0 && imgCanvas.width > 0) {
      // Draw actual high-quality sprite
      X.drawImage(imgCanvas, -this.w / 2, -this.h, this.w, this.h);
    } else {
      // Render Placeholder Geometry
      if (!this.broken) {
        X.fillStyle = this.color;
        X.globalAlpha *= 0.6;
        X.shadowBlur = 15; X.shadowColor = '#000';
        X.fillRect(-this.w / 2, -this.h, this.w, this.h);

        X.strokeStyle = '#fff'; X.lineWidth = 2; X.globalAlpha = 0.8;
        X.strokeRect(-this.w / 2, -this.h, this.w, this.h);

        X.fillStyle = '#fff'; X.font = 'bold 16px Orbitron'; X.textAlign = 'center';
        X.fillText(this.type.toUpperCase(), 0, -this.h / 2);
      } else {
        X.fillStyle = this.color; X.globalAlpha *= 0.3;
        X.fillRect(-this.w / 2, -this.h / 4, this.w, this.h / 4);
      }
    }
    X.restore();
  }

  checkHit(f) {
    if (this.broken) return;
    // Expanded range to ensure flying bodies always trigger the break
    // V17.2: Decoupled logic. Props break if a body goes flying INTO them OR if they are punched/kicked directly.
    const isFlyingBody = (f.state === 'hit' || f.state === 'ko' || f.state === 'dash' || f.state === 'special_roll') && Math.abs(f.knockVX || 0) > 2;
    const isDirectAttack = (f.state === 'kick' || f.state === 'punch' || f.state === 'super') && f.hasHit;

    if (isFlyingBody || isDirectAttack) {
      if (Math.abs(this.x - f.x) < f.w * 1.5 && f.y >= GROUND() - this.h * 1.5) {

        this.broken = true;
        SFX.hitHeavy();
        let shakeFader = (typeof FX_BYPASS !== 'undefined') ? FX_BYPASS.screenShake : 1.0;
        let particleFader = (typeof FX_BYPASS !== 'undefined') ? FX_BYPASS.particles : 1.0;

        screenShake += 8 * shakeFader;

        // V14 "Splitter" (Splinter) Explosion
        let particleCount = Math.floor(40 * particleFader);
        if (f.sparks && Array.isArray(f.sparks)) {
          for (let i = 0; i < particleCount; i++) {
            f.sparks.push({
              x: this.x + (Math.random() - 0.5) * this.w,
              y: this.y - this.h / 2 + (Math.random() - 0.5) * this.h,
              vx: (Math.random() - 0.5) * 18, // Wide horizontal spread
              vy: (Math.random() - 1) * 20,   // High vertical chunk arc
              life: 1 + Math.random() * 0.5,
              hue: this.type === 'ice' ? 180 + Math.random() * 40 : 20 + Math.random() * 20, // Cyan for ice, Wood/Orange mostly
              size: 4 + Math.random() * 8       // Chunker particles
            });
          }
        }
      }
    }
  }
}
