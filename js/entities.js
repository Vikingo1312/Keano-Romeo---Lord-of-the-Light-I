// ===== PROJECTILES =====
let projectiles = [];
class Projectile {
  constructor(x, y, dir, type, fromPlayer) {
    this.x = x; this.y = y; this.dir = dir; this.type = type; this.fromPlayer = fromPlayer;
    this.speed = type === 'super' ? 14 : 9;
    this.life = 1; this.size = type === 'super' ? 45 : 25;
    this.trail = [];
  }
  update(dt) {
    this.x += this.dir * this.speed;
    this.life -= dt * 0.7;
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

    // Draw trailing particles first
    this.trail.forEach((t, idx) => {
      X.save(); X.globalAlpha = t.life * 0.6;
      X.fillStyle = idx % 2 === 0 ? c[0] : c[1];
      X.shadowBlur = 15; X.shadowColor = c[0];
      X.beginPath(); X.arc(t.x, t.y, this.size * 0.9 * t.life, 0, Math.PI * 2); X.fill();
      X.restore();
    });

    // Massive energy core
    X.save(); X.globalAlpha = this.life;
    X.translate(this.x, this.y);
    X.rotate(performance.now() / 150); // Fast spinning aura

    // Outer glow
    const grad = X.createRadialGradient(0, 0, 0, 0, 0, this.size * 1.5);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, c[1]);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    X.fillStyle = grad;
    X.beginPath(); X.arc(0, 0, this.size * 1.5, 0, Math.PI * 2); X.fill();

    // Inner dense core
    X.fillStyle = '#ffffff'; X.shadowBlur = 30; X.shadowColor = c[0];
    X.beginPath(); X.arc(0, 0, this.size * 0.6, 0, Math.PI * 2); X.fill();

    X.restore();
  }
  checkHit(fighter) {
    if (Math.abs(this.x - fighter.x) < fighter.w * 0.25 && Math.abs(this.y - (fighter.y - fighter.h * 0.4)) < fighter.h * 0.5) {
      const dmg = this.type === 'super' ? 25 : 12;
      fighter.takeHit(dmg, this.dir);
      screenShake = this.type === 'super' ? 18 : 8;
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
    this.y = GROUND();
    this.vy = 0;
    this.w = owner.w * 0.6;
    this.h = owner.h * 0.45;
    this.state = 'hidden';
    this.stateTimer = 0;
    this.facingRight = owner.facingRight;
    this.imgSrc = 'assets/clean_simba_cane_corso_solo.png';
    const img = new Image(); img.src = this.imgSrc;
    this.img = img;
    this.alpha = 0;
  }

  triggerBite() {
    if (this.state !== 'hidden') return;
    this.state = 'leap';
    this.facingRight = this.owner.facingRight;
    const fdir = this.facingRight ? 1 : -1;
    this.x = this.owner.x - fdir * 100;
    this.y = GROUND();
    this.vy = -18;
    this.alpha = 1;
    this.stateTimer = 1.0;
    if (QATracker.active) QATracker.specials++;
    SFX.hitHeavy(); // Bark proxy
  }

  update(dt, opponent) {
    if (this.state === 'hidden') return;

    if (this.state === 'leap') {
      const fdir = this.facingRight ? 1 : -1;
      this.x += fdir * 16 * gameSpeedMult;
      this.y += this.vy * gameSpeedMult;
      this.vy += GRAV * 1.5 * gameSpeedMult;

      if (this.y > GROUND()) {
        this.y = GROUND();
        this.state = 'bite';
        this.stateTimer = 0.5;
      }
    } else if (this.state === 'bite') {
      this.stateTimer -= dt * gameSpeedMult;
      if (this.stateTimer <= 0) {
        this.state = 'fade';
      }
    } else if (this.state === 'fade') {
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

    const imgCanvas = processedSprites[this.imgSrc] || rawImgs[this.imgSrc] || this.img;
    if (imgCanvas && imgCanvas.complete && imgCanvas.naturalWidth !== 0) {
      let rot = 0;
      if (this.state === 'leap') rot = this.vy > 0 ? 0.2 : -0.2;
      if (this.state === 'bite') rot = Math.sin(performance.now() / 20) * 0.1; // fast shaking bite

      X.rotate(rot);
      X.drawImage(imgCanvas, -this.w / 2, -this.h, this.w, this.h);

      // Speed kinetics
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
    if (type === 'lantern') { this.w = 34; this.h = 60; this.color = '#ff3300'; }
    else if (type === 'vase') { this.w = 40; this.h = 55; this.color = '#00aaff'; }
    else { this.w = 50; this.h = 50; this.color = '#885522'; }
  }
  draw() {
    X.save(); X.translate(this.x, this.y);
    if (!this.broken) {
      X.fillStyle = this.color; X.shadowBlur = 10; X.shadowColor = '#000';
      if (this.type === 'lantern') {
        X.fillRect(-this.w / 2, -this.h, this.w, this.h);
        X.fillStyle = '#ffeeaa'; X.globalAlpha = 0.6 + Math.sin(time * 5) * 0.3; X.shadowColor = '#ffaa00'; X.shadowBlur = 20;
        X.fillRect(-this.w / 2 + 4, -this.h + 8, this.w - 8, this.h - 16);
      } else if (this.type === 'vase') {
        X.beginPath(); X.arc(0, -this.h / 2, this.w / 2, 0, Math.PI * 2); X.fill();
        X.fillRect(-this.w / 4, -this.h, this.w / 2, this.h / 2);
      } else {
        X.fillRect(-this.w / 2, -this.h, this.w, this.h);
        X.strokeStyle = '#331100'; X.lineWidth = 3; X.strokeRect(-this.w / 2, -this.h, this.w, this.h);
        X.beginPath(); X.moveTo(-this.w / 2, -this.h); X.lineTo(this.w / 2, 0); X.stroke();
      }
    } else {
      X.fillStyle = this.color; X.globalAlpha = 0.5;
      X.fillRect(-this.w / 2, -this.h / 4, this.w, this.h / 4);
      X.beginPath(); X.moveTo(-this.w / 2, -this.h / 4); X.lineTo(-this.w / 4, -this.h / 2); X.lineTo(this.w / 4, -this.h / 4); X.fill();
    }
    X.restore();
  }
  checkHit(f) {
    if (this.broken) return;
    if ((f.state === 'hit' || f.state === 'ko' || f.state === 'dash' || f.state === 'special_roll') && Math.abs(f.knockVX) > 2) {
      if (Math.abs(this.x - f.x) < this.w / 2 + f.w / 2 && f.y >= GROUND() - this.h) {
        this.broken = true; SFX.hitHeavy(); screenShake += 6;
      }
    }
  }
}
