// ============================================================
// FIGHTER CLASS (V3 Clean Rendering)
// ============================================================
let screenShake = 0, flashTimer = 0, finisherTint = 0;
let comboCount = 0, comboTimer = 0;
let gameTimerStyle = 'normal';
let defaultRoundTime = 99;
let gameDifficulty = 'normal';
let gameSpeedMult = 1.0;

// =========================================================================
// V3 Scene / Transition Manager
// Inspired by Unity SceneManager / Godot Tween Fades
// =========================================================================
const TransitionManager = {
  isTransitioning: false,
  fadeScreen: function (fadeInDuration, waitDuration, fadeOutDuration, onMidpoint) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    const fader = document.getElementById('scene-fader');

    // 1. Fade Into Black
    fader.style.transition = `opacity ${fadeInDuration}ms ease-in-out`;
    fader.classList.add('fade-in');

    setTimeout(() => {
      // 2. Midpoint (Screen is fully black) -> Swap States!
      if (onMidpoint) onMidpoint();

      setTimeout(() => {
        // 3. Fade Out of Black into new Scene
        fader.style.transition = `opacity ${fadeOutDuration}ms ease-in-out`;
        fader.classList.remove('fade-in');

        setTimeout(() => {
          this.isTransitioning = false;
        }, fadeOutDuration);
      }, waitDuration);
    }, fadeInDuration);
  },

  switchState: function (newStateConfig) {
    this.fadeScreen(
      newStateConfig.fadeIn || 400,
      newStateConfig.wait || 100,
      newStateConfig.fadeOut || 400,
      () => {
        if (newStateConfig.hideDOM) {
          newStateConfig.hideDOM.forEach(id => document.getElementById(id).classList.add('hidden'));
        }
        if (newStateConfig.showDOM) {
          newStateConfig.showDOM.forEach(id => document.getElementById(id).classList.remove('hidden'));
        }
        if (newStateConfig.setGameState) {
          gameState = newStateConfig.setGameState;
        }
        if (newStateConfig.onSwap) {
          newStateConfig.onSwap();
        }
      }
    );
  }
};

// Hadouken motion parser
function checkMotion(sequence) {
  if (inputHistory.length < sequence.length) return false;
  const recent = inputHistory.slice(-sequence.length);
  // Give a generous 500ms window for the sequence to complete correctly
  if (Date.now() - recent[0].time > 500) return false;
  for (let i = 0; i < sequence.length; i++) {
    if (recent[i].key !== sequence[i]) return false;
  }
  return true;
}

class HybridFighter {
  constructor(startX, startY, isPlayer, color, ld = null) {
    this.x = startX;
    this.y = startY || GROUND();
    this.vy = 0;

    this.isPlayer = isPlayer;
    this.facingRight = isPlayer;

    // Force strictly the preloaded images from Asset Loader rule
    this.fighterDir = ld?.fighterDir || '';
    this.cleanImgSrc = this.fighterDir + (this.facingRight ? '/_right.png' : '/_left.png');

    this.ld = ld;
    this.wasFacingRight = this.facingRight;
    this.isBackTurned = false;

    this.color = ld?.col || '#00aaff';
    this.maxHP = 100 * (ld?.hpMult || 1) * (isPlayer ? 1 : (typeof getDiff === 'function' ? getDiff().hpScale : 1));
    this.hp = this.maxHP;
    this.super = isPlayer ? 0 : 0;
    this.state = 'idle';
    this.stateTimer = 0;
    this.knockVX = 0;
    this.specialCD = 0;
    this.t = Math.random() * Math.PI * 2;
    this.hitFlash = 0;
    this.hitStop = 0;

    // Voicelines
    this.shoutTimer = 0;
    this.shoutText = "";

    this.inputBuffer = [];
    this.inputTimer = 0;
    this.timeScale = 1.0;
    this.companion = null;
    if (this.fighterDir.includes('vikingo_') || (ld && ld.level === 14)) {
      this.companion = new Companion(this);
    }
  }

  get w() { return FW(); }
  get h() { return FH(); }

  shout(text, duration = 2.0) {
    this.shoutText = text;
    this.shoutTimer = duration;
    // Simple Text-to-Speech fallback if no MP3 exists for this line
    if (window.speechSynthesis && !SFX.muted) {
      speechSynthesis.cancel();
      let u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE'; u.rate = 1.1; u.pitch = this.isPlayer ? 1.0 : 0.8;
      speechSynthesis.speak(u);
    }
  }

  takeHit(dmg, dir, isHeavy = false) {
    if (this.state === 'block') {
      this.hp -= dmg * 0.15; // Chip damage
      this.knockVX = dir * (isHeavy ? 12 : 6);
      this.hitStop = isHeavy ? 0.15 : 0.08;
      SFX.hitBlock();
    } else {
      const wasAlive = this.hp > 0;
      this.hp -= dmg;
      this.state = 'hit';
      this.stateTimer = isHeavy ? 0.65 : 0.40;
      this.knockVX = dir * (isHeavy ? 20 : 12);
      this.hitFlash = 1;
      this.hitStop = isHeavy ? 0.22 : 0.12;
      screenShake = isHeavy ? 15 : 8;
      SFX.hitHeavy();
      if (wasAlive && this.hp <= 0 && isHeavy) {
        finisherTint = 1.0;
        screenShake = 35;
        this.hitStop = 0.5; // Massive hitstop
      }
      if (this.isPlayer) { comboCount = 0; comboTimer = 0; }
    }
    this.hp = Math.max(0, this.hp);
  }

  update(dt, opponent) {
    dt = dt * this.timeScale;
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      return;
    }

    this.y += this.vy * this.timeScale;
    this.vy += GRAV * 1.35 * this.timeScale;

    if (this.y > GROUND()) {
      this.y = GROUND();
      this.vy = 0;

      if (this.state === 'roll' || this.state === 'hit' || this.state === 'ko') {
        if (this.isPlayer && this.hp > 0 && (keys['control'] || keys['alt']) && this.state !== 'ko') {
          // Tech
          this.state = 'roll';
          this.stateTimer = 0.4;
          this.knockVX = this.facingRight ? -15 : 15;
          SFX.dash();
        } else if (this.state === 'roll') {
          this.state = 'idle';
          this.knockVX = 0;
        }
      }
    }

    this.x += this.knockVX * this.timeScale;
    if (this.y === GROUND()) {
      if (Math.abs(this.knockVX) > 0.5) {
        let friction = (this.state === 'dash') ? 0.92 : 0.82;
        // Adjust friction scale slightly for slow mo so they don't slide forever
        if (this.timeScale < 1.0) friction = 0.95;
        this.knockVX *= friction;
      } else {
        this.knockVX = 0;
      }
    } else {
      this.knockVX *= 0.98;
    }

    this.x = Math.max(this.w * 0.5, Math.min(C.width - this.w * 0.5, this.x));

    if (opponent && this.state !== 'roll' && this.state !== 'evade_back' && this.state !== 'roll_forward') {
      this.wasFacingRight = this.facingRight;
      if (Math.abs(this.x - opponent.x) > 10) {
        this.facingRight = this.x < opponent.x;
      }
    }

    // Apply strict left/right sprite rules dynamically based on direction
    this.cleanImgSrc = this.fighterDir + (this.facingRight ? '/_right.png' : '/_left.png');
    if (this.isPlayer && !this.facingRight) this.isBackTurned = true;
    else if (this.isPlayer && this.facingRight) this.isBackTurned = false;

    if (this.companion && this.hp > 0) {
      this.companion.update(dt, opponent);
    }

    if (this.stateTimer > 0) {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        if (this.y < GROUND()) this.state = 'jump';
        else this.state = 'idle';
      }
    }
    if (this.specialCD > 0) this.specialCD -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt * 3;
    if (this.shoutTimer > 0) this.shoutTimer -= dt;
    this.t += dt * 8;

    if (opponent && (this.state === 'special_roll' || this.state === 'special_flip')) {
      const dist = Math.abs(this.x - opponent.x);
      const range = this.w * (this.state === 'special_roll' ? 0.9 : 1.2);
      const isOppInvincible = (opponent.state === 'roll' || opponent.state === 'evade_back' || opponent.state === 'roll_forward');
      if (dist < range && Math.sin(this.t * 5) > 0.8 && !isOppInvincible) {
        const baseDmg = this.state === 'special_roll' ? 6 : 8;
        const dir = this.facingRight ? 1 : -1;
        opponent.takeHit(baseDmg, dir, false);
        this.hitStop = 0.03;
        if (this.isPlayer) {
          comboCount++; comboTimer = 1.0;
        }
      }
    }

    // Gamepad polling is global (works in menus too)
    pollGamepad();


    if (this.isPlayer && this.hp > 0 && this.state !== 'ko') {
      const inLeft = keys['arrowleft'] || keys['a'];
      const inRight = keys['arrowright'] || keys['d'];
      const inUp = keys['arrowup'] || keys['w'];
      const inDown = keys['arrowdown'] || keys['s'];
      const inPunch = keys['j'] || keys['f'];
      const inKick = keys['k'] || keys['g'];

      if (this.inputTimer > 0) this.inputTimer -= dt;
      else if (this.inputBuffer.length > 0) this.inputBuffer.shift();

      let currentDir = 'N';
      if (inRight) currentDir = 'R';
      else if (inLeft) currentDir = 'L';

      if (this.inputBuffer[this.inputBuffer.length - 1] !== currentDir) {
        this.inputBuffer.push(currentDir);
        this.inputTimer = 0.25;
        if (this.inputBuffer.length > 4) this.inputBuffer.shift();
      }

      let dashTriggered = false;
      if (this.state === 'idle' || this.state === 'walk') {
        const bufStr = this.inputBuffer.join('');
        if (bufStr.includes('RNR')) {
          this.state = 'dash'; this.stateTimer = 0.4;
          this.knockVX = 20;
          this.inputBuffer = [];
          dashTriggered = true;
          SFX.dash();
        } else if (bufStr.includes('LNL')) {
          this.state = 'dash'; this.stateTimer = 0.4;
          this.knockVX = -20;
          this.inputBuffer = [];
          dashTriggered = true;
          SFX.dash();
        }
      }

      if (!dashTriggered && (this.state === 'idle' || this.state === 'walk')) {
        let moving = false;
        if (inLeft) { this.x -= 10; moving = true; }
        if (inRight) { this.x += 10; moving = true; }

        if (moving && this.state === 'idle') this.state = 'walk';
        if (!moving && this.state === 'walk') this.state = 'idle';

        if (inUp && this.y === GROUND()) {
          this.vy = -26;
          if ((this.facingRight && inRight) || (!this.facingRight && inLeft)) {
            this.state = 'roll';
            this.stateTimer = 0.8;
            this.knockVX = this.facingRight ? 14 : -14;
            this.vy = -14;
          } else {
            this.state = 'jump';
            this.stateTimer = 0.5;
          }
        }
      }

      if (this.state === 'idle' || this.state === 'walk' || this.state === 'jump') {
        if (inPunch && this.stateTimer <= 0) this.doAttack('punch', opponent);
        if (inKick && this.stateTimer <= 0) {
          if (checkMotion([inDown, inRight, inKick]) && this.facingRight && this.super > 10) {
            this.doSuper(opponent);
          } else {
            this.doAttack('kick', opponent);
          }
        }
      }
      if (keys['u'] || inDown) { this.state = 'block'; this.stateTimer = 0.3; }

      const fw = this.facingRight ? 'd' : 'a';
      const bk = this.facingRight ? 'a' : 'd';

      if (this.specialCD <= 0) {
        if (checkMotion(['s', fw, 'l'])) this.fireProj();
        else if (checkMotion([bk, fw, 'k'])) this.doSpecialRoll(opponent);
        else if (checkMotion(['s', bk, 'k'])) this.doSpecialFlip(opponent);
        else if (keys['l']) this.fireProj();
      }

      if (keys[' '] && this.super >= 100) this.doSuper(opponent);
    }

    // --- Utility AI Core ---
    if (!this.isPlayer && opponent) {
      this.updateAI(dt, opponent);
    }
  }

  updateAI(dt, opponent) {
    if (this.state !== 'idle' && this.state !== 'walk') return;

    const dist = Math.abs(this.x - opponent.x);
    const diffMult = gameDifficulty === 'hard' ? 1.8 : (gameDifficulty === 'easy' ? 0.7 : 1.0);
    const spdMult = this.ld?.speedMult || 1.0;
    const jumpFreq = this.ld?.jumpFreq || 1.0;
    const projFreq = this.ld?.projFreq || 1.0;
    const charType = this.ld?.special || 'fire';
    const walkSpd = (gameDifficulty === 'easy' ? 4.0 : (gameDifficulty === 'hard' ? 6.0 : 5.0)) * spdMult;

    const isOpponentAttacking = (opponent.state === 'punch' || opponent.state === 'kick' || opponent.state === 'proj' || opponent.state === 'special');
    const r = Math.random();

    // 1. Evade / Defense (Highest Priority Reflex)
    if (isOpponentAttacking && dist < this.w * 1.5) {
      if (r < 0.25 * diffMult) {
        this.state = 'evade_back';
        this.stateTimer = 0.4;
        this.knockVX = (this.x > opponent.x) ? 25 : -25;
        SFX.dash();
        return;
      } else if (r < 0.5 * diffMult) {
        this.state = 'block';
        this.stateTimer = 0.5;
        return;
      }
    }

    // 2. Punish / Counter (Exploit player misses)
    if ((opponent.state === 'evade_back' || opponent.state === 'hit' || opponent.state === 'roll') && dist < this.w * 1.8) {
      if (r < 0.3 * diffMult) {
        this.state = 'dash';
        this.stateTimer = 0.4;
        this.knockVX = (this.x < opponent.x) ? 22 : -22;
        SFX.dash();
        return;
      }
    }

    // 3. Tactical Retreat (Low HP Survival)
    if (this.hp < this.maxHP * 0.25 && dist < this.w * 1.2 && r < 0.05) {
      this.state = 'evade_back';
      this.stateTimer = 0.4;
      this.knockVX = (this.x > opponent.x) ? 20 : -20;
      return;
    }

    // 4. Super Attack (Always use if full)
    let superChance = 0.10 * diffMult;
    if (charType === 'fire' || charType === 'lightning') superChance *= 1.5;
    if (this.super >= 100 && dist < this.w * 2 && r < superChance) {
      this.doSuper(opponent);
      return;
    }

    // 5. Normal Aggression & Zoning
    let idealZoningDist = this.w * 0.4;
    if (charType === 'ice') idealZoningDist = this.w * 1.5;
    else if (charType === 'dark' || charType === 'earth') idealZoningDist = this.w * 0.3;
    if (projFreq > 1.5) idealZoningDist += this.w;

    let aiMoving = false;
    // Introduce a wider deadzone (hysteresis) to prevent AI jittering back and forth
    const jitterDeadzone = 20;

    if (dist > idealZoningDist + jitterDeadzone) {
      this.x += (opponent.x > this.x ? walkSpd : -walkSpd);
      if (this.state !== 'walk') { this.state = 'walk'; this.stateTimer = 0.2; }
      aiMoving = true;
    } else if (dist < idealZoningDist - jitterDeadzone) {
      this.x += (opponent.x > this.x ? -walkSpd : walkSpd);
      if (this.state !== 'walk') { this.state = 'walk'; this.stateTimer = 0.2; }
      aiMoving = true;
    }

    if (!aiMoving && this.state === 'walk' && this.stateTimer <= 0) {
      this.state = 'idle';
    }

    // 6. Strategic Attacks
    if (!aiMoving) {
      if ((charType === 'fire' || charType === 'lightning') && dist < this.w * 0.6) {
        if (r < 0.20 * diffMult * spdMult) {
          this.doAttack('punch', opponent);
          setTimeout(() => { if (this.hp > 0 && opponent.hp > 0 && this.state !== 'ko') this.doAttack('kick', opponent); }, 250);
        } else if (r < 0.25 * diffMult * jumpFreq && this.specialCD <= 0) {
          this.doSpecialFlip(opponent);
        }
      } else if (charType === 'ice' && dist > this.w * 0.8) {
        if (r < 0.3 * diffMult * projFreq && this.specialCD <= 0) {
          this.fireProj();
        } else if (r < 0.4 && opponent.state === 'jump') {
          this.doAttack('kick', opponent);
        }
      } else if ((charType === 'dark' || charType === 'earth') && dist < this.w * 0.5) {
        if (r < 0.15 * diffMult) {
          this.doAttack(r > 0.5 ? 'punch' : 'kick', opponent);
        } else if (r < 0.2 * diffMult && this.specialCD <= 0) {
          this.doSpecialRoll(opponent);
        }
      } else if (dist < this.w * 0.55 && r < 0.12 * diffMult) {
        this.doAttack(r > 0.5 ? 'punch' : 'kick', opponent);
      }
    }

    // 7. Random Mobility (Agility injections)
    if (r < (0.015 * jumpFreq)) {
      if ((charType === 'dark' || charType === 'lightning') && dist > this.w * 0.8) {
        this.state = 'roll_forward'; this.stateTimer = 0.5;
        this.knockVX = (opponent.x > this.x) ? 18 : -18;
        SFX.dash();
      } else {
        this.vy = -26; this.state = 'jump'; this.stateTimer = 0.5;
      }
    }

    // 8. Anti-Air Reaction
    if (opponent.y < GROUND() - 50 && dist < this.w * 0.8 && r < 0.5 * diffMult) {
      this.doAttack('punch', opponent);
    }
  }

  doAttack(type, opponent) {
    this.state = type;
    if (QATracker.active) QATracker.misses++;
    const spdMult = this.isPlayer ? 1.2 : (this.ld?.speedMult || 1);
    this.stateTimer = type === 'punch' ? (0.25 / spdMult) : (0.4 / spdMult);
    this.knockVX = this.facingRight ? 4 : -4;

    if (type === 'punch') SFX.dash();

    this.hitStop = 0.05;

    if (opponent) {
      const dist = Math.abs(this.x - Math.max(opponent.x, this.x - this.w) - Math.min(opponent.x - this.x, 0));
      const range = type === 'punch' ? this.w * 0.8 : this.w * 1.0;
      const isOpponentInvincible = (opponent.state === 'roll' || opponent.state === 'evade_back' || opponent.state === 'roll_forward');
      if (dist < range && !isOpponentInvincible) {
        let baseDmg = type === 'punch' ? 8 + Math.random() * 5 : 14 + Math.random() * 6;
        if (!this.isPlayer) baseDmg *= (this.ld?.hitPow || 1);

        const dir = this.facingRight ? 1 : -1;
        const isHeavyHit = type === 'kick';

        opponent.takeHit(baseDmg, dir, isHeavyHit);
        this.hitStop = isHeavyHit ? 0.15 : 0.08;

        if (this.isPlayer) {
          comboCount++; comboTimer = 1.2;
          this.super = Math.min(100, this.super + 8 + comboCount * 2);
        } else {
          this.super = Math.min(100, this.super + 10);
        }

        if (QATracker.active) { QATracker.misses--; QATracker.hits++; }

        const ptType = isHeavyHit ? 'super_spark' : 'hitspark';
      }
    }
  }

  fireProj() {
    if (this.isPlayer && comboCount < 3) return;
    if (QATracker.active) QATracker.specials++;
    this.state = 'special'; this.stateTimer = 0.4; this.specialCD = 1.2;
    const dir = this.facingRight ? 1 : -1;
    const type = this.isPlayer ? 'super' : (this.ld?.special || 'fire');
    projectiles.push(new Projectile(this.x + dir * this.w * 0.4, this.y - this.h * 0.4, dir, type, this.isPlayer));
    screenShake = 5;
    if (this.isPlayer) comboCount = 0;

    if (this.companion) {
      const opp = (this === player) ? enemy : player;
      this.companion.triggerBite(opp);
      this.shout("Fass, Simba!", 1.5);
    } else {
      // Char-specific Voice triggers on Special
      if (this.fighterDir.includes('Gargamel')) this.shout("Schatten-Sog!", 1.5);
      else if (this.fighterDir.includes('Jay_X') || this.fighterDir.includes('Jayden')) this.shout("Feuer frei!", 1.5);
    }
  }

  doSpecialRoll(opponent) {
    if (QATracker.active) QATracker.specials++;
    this.state = 'special_roll'; this.stateTimer = 0.6; this.specialCD = 1.5;
    this.knockVX = this.facingRight ? 18 : -18; this.vy = -10;
  }

  doSpecialFlip(opponent) {
    if (QATracker.active) QATracker.specials++;
    this.state = 'special_flip'; this.stateTimer = 0.7; this.specialCD = 1.5;
    this.knockVX = this.facingRight ? 12 : -12; this.vy = -18;
  }

  doSuper(opponent) {
    if (this.isPlayer && comboCount < 5) return;
    if (QATracker.active) QATracker.specials++;
    this.super = 0; this.state = 'super'; this.stateTimer = 0.9;
    screenShake = 25; flashTimer = 0.4;
    const dir = this.facingRight ? 1 : -1;
    if (this.isPlayer) comboCount = 0;

    const projType = this.isPlayer ? 'super' : (this.ld?.special || 'fire');
    projectiles.push(new Projectile(this.x + dir * this.w * 0.3, this.y - this.h * 0.5, dir, projType, this.isPlayer));
    if (opponent && Math.abs(this.x - opponent.x) < this.w * 1.3) {
      opponent.takeHit(this.isPlayer ? 45 : 30, dir);
    }
  }

  draw() {
    const imgCanvas = processedSprites[this.cleanImgSrc] || rawImgs[this.cleanImgSrc] || this.img;
    if (!imgCanvas) return;

    if (this.companion && this.hp > 0) this.companion.draw();

    const dW = this.w; const dH = this.h;
    const fY = Math.round(this.y);
    const cX = Math.round(this.x);
    const st = this.stateTimer;

    X.save();
    X.save(); X.globalAlpha = 0.5; X.fillStyle = '#000';
    X.beginPath(); X.ellipse(cX, fY + 8, dW * 0.45, 15, 0, 0, Math.PI * 2); X.fill(); X.restore();

    X.translate(cX, fY);

    let faceScale = this.facingRight ? 1 : -1;
    if (this.cleanImgSrc.includes('_left.png') || this.cleanImgSrc.includes('_right.png')) faceScale = 1; // Actual sprites don't need reverse if strictly loaded

    X.filter = `saturate(1.8) contrast(1.1) brightness(1.1)`;
    if (this.hitFlash > 0) X.filter = `brightness(2) contrast(1.5)`;

    X.scale(faceScale, 1);

    // DEBUG INJECTION
    if (!window._qcRenderLogDone && this.isPlayer && this.hp > 0) {
      console.error("QC RENDER LOG:", {
        x: this.x, y: this.y, cx: cX, fy: fY,
        imgSrc: this.cleanImgSrc,
        hasProcessed: !!processedSprites[this.cleanImgSrc],
        hasRaw: !!rawImgs[this.cleanImgSrc],
        lerpSX: this._lerpSX, t: this.t
      });
      window._qcRenderLogDone = true;
    }

    // ==========================================
    // V11 GLOW SYSTEM (Master-Prompt: Only Main Heroes)
    // ==========================================
    const isMainHero = this.fighterDir.includes('Keano') ||
      this.fighterDir.includes('vikingo') ||
      this.fighterDir.includes('Jayden') ||
      this.fighterDir.includes('Jay_X') ||
      this.fighterDir.includes('Gargamel');

    if (isMainHero && (this.state === 'special' || this.state === 'super' || finisherTint > 0.5)) {
      X.shadowColor = this.color;
      // Animierbare Intensitätskurve basierend auf Zeit
      X.shadowBlur = 15 + Math.sin(this.t * 10) * 10;
      if (QATracker.active && this.stateTimer > 0) QATracker.glowTriggers++;
    } else {
      X.shadowBlur = 0;
      X.shadowColor = 'transparent';
    }
    // ==========================================

    let sX = 1, sY = 1, rot = 0, offX = 0, offY = 0;
    if (!this._lerpSX) {
      this._lerpSX = 1; this._lerpSY = 1; this._lerpRot = 0;
      this._lerpOX = 0; this._lerpOY = 0;
    }

    switch (this.state) {
      case 'idle': sY = 1 + Math.sin(this.t * 3) * 0.02; sX = 1 - Math.sin(this.t * 3) * 0.01; break;
      case 'walk': offY = Math.abs(Math.sin(this.t * 12)) * 10; rot = Math.sin(this.t * 6) * 0.05; break;
      case 'roll': offY = dH * 0.4; rot = this.t * 15; sX = 0.7; sY = 0.7; break;
      case 'punch': offX = dW * 0.3; rot = 0.2; sX = 1.08; sY = 0.92; break;
      case 'kick': offX = dW * 0.1; rot = -0.25; sX = 0.9; sY = 1.1; offY = -dH * 0.05; break;
      case 'jump': sX = 0.9; sY = 1.1; rot = this.vy > 0 ? 0.1 : -0.1; break;
      case 'hit': rot = -0.3; offX = -dW * 0.2; sX = 0.85; sY = 1.15; break;
      case 'block': rot = -0.1; sX = 1.1; sY = 0.9; offX = -dW * 0.1; break;
      case 'ko': rot = -Math.PI / 2; offY = -dH * 0.10; sX = 1.0; sY = 0.8; break;
      case 'special_roll': offY = dH * 0.3; rot = this.facingRight ? this.t * 20 : -this.t * 20; sX = 0.7; sY = 0.7; break;
      case 'special_flip': rot = this.facingRight ? this.t * 18 : -this.t * 18; sX = 0.8; sY = 0.8; break;
      case 'evade_back': offX = -dW * 0.3; sX = 0.85; sY = 1.05; rot = -0.15; break;
      case 'roll_forward': offX = dW * 0.3; rot = this.t * 12; sX = 0.75; sY = 0.75; break;
      case 'dash': offX = dW * 0.25; sX = 1.15; sY = 0.9; rot = 0.1; break;
    }

    const ls = 0.25;
    this._lerpSX += (sX - this._lerpSX) * ls; this._lerpSY += (sY - this._lerpSY) * ls;
    this._lerpRot += (rot - this._lerpRot) * ls; this._lerpOX += (offX - this._lerpOX) * ls;
    this._lerpOY += (offY - this._lerpOY) * ls;

    X.translate(this._lerpOX, this._lerpOY); X.rotate(this._lerpRot); X.scale(this._lerpSX, this._lerpSY);

    // ========== V9: CONDITIONAL SHADER GLOW ==========
    const fId = this.ld?.id || '';
    const isGlowChar = ['keano', 'supreme_keano', 'hyper_keano', 'vikingo', 'vikingo_god', 'c_gargamel', 'jay_x'].includes(fId);
    const isGlowState = ['special', 'super', 'special_roll', 'special_flip', 'finisher', 'perfect'].includes(this.state);

    if (isGlowChar && isGlowState) {
      X.shadowColor = this.ld?.glowColor || '#00ffff';
      X.shadowBlur = Math.abs(Math.sin(this.t * 6)) * 40 + 10;
      if (QATracker.active) QATracker.glowTriggers++;
    } else {
      X.shadowBlur = 0;
      X.shadowColor = 'transparent';
    }

    // Draw Character Sprite
    if (imgCanvas && imgCanvas.complete !== false && (imgCanvas.naturalWidth !== 0 || imgCanvas.width !== 0)) {
      X.drawImage(imgCanvas, -dW / 2, -dH, dW, dH);
    }

    // Draw Voice / Shout Bubble globally un-rotated
    if (this.shoutTimer > 0 && this.shoutText !== "") {
      X.save();
      X.translate(cX, fY - dH - 40); // Above the head
      X.textAlign = "center";
      X.textBaseline = "middle";
      X.font = "bold 18px Courier New, monospace";

      const txtWidth = X.measureText(this.shoutText).width;
      const padding = 10;
      const bw = txtWidth + padding * 2;
      const bh = 30;

      // Balloon Background
      X.fillStyle = "rgba(0, 0, 0, 0.75)";
      X.strokeStyle = this.color;
      X.lineWidth = 2;
      X.beginPath();
      X.roundRect(-bw / 2, -bh / 2, bw, bh, 5);
      X.fill();
      X.stroke();

      // Pointer triangle
      X.beginPath();
      X.moveTo(0, bh / 2);
      X.lineTo(-8, bh / 2 + 10);
      X.lineTo(8, bh / 2);
      X.fill();
      X.stroke();

      // Text
      X.fillStyle = "#ffffff";
      X.shadowBlur = 5;
      X.shadowColor = this.color;
      X.fillText(this.shoutText, 0, 1); // 1px offset optical correction
      X.restore();
    }

    X.restore();

    if (this.state === 'special_roll') {
      X.save(); X.translate(cX, fY - dH * 0.4); X.rotate(this.t * 10);
      const srGrad = X.createRadialGradient(0, 0, dW * 0.2, 0, 0, dW * 0.8);
      srGrad.addColorStop(0, 'rgba(255,100,0,0.8)'); srGrad.addColorStop(0.6, 'rgba(255,0,100,0.4)'); srGrad.addColorStop(1, 'rgba(0,0,0,0)');
      X.fillStyle = srGrad; X.globalAlpha = 0.7; X.beginPath(); X.arc(0, 0, dW * 0.8, 0, Math.PI * 2); X.fill();
      X.strokeStyle = '#ff4400'; X.lineWidth = 4; X.shadowBlur = 20; X.shadowColor = '#ff8800'; X.beginPath(); X.arc(0, 0, dW * 0.4, 0, Math.PI * 2); X.stroke(); X.restore();
    }

    if (this.state === 'special_flip') {
      X.save(); X.translate(cX, fY - dH * 0.5); X.globalAlpha = 0.6;
      X.strokeStyle = '#00ffff'; X.lineWidth = 8; X.shadowBlur = 30; X.shadowColor = '#00ffff'; X.beginPath(); X.arc(0, 0, dW * 0.6, -Math.PI, this.t * 5 % (Math.PI * 2)); X.stroke();
      X.strokeStyle = '#ff00ff'; X.lineWidth = 4; X.beginPath(); X.arc(0, 0, dW * 0.45, -Math.PI, this.t * 7 % (Math.PI * 2)); X.stroke(); X.restore();
    }

    if (this.state === 'super') {
      X.save(); X.translate(cX, fY - dH * 0.4);
      const pulse = 1 + Math.sin(this.t * 15) * 0.3; const superGrad = X.createRadialGradient(0, 0, 0, 0, 0, dW * 1.5 * pulse);
      superGrad.addColorStop(0, 'rgba(255,255,255,0.9)'); superGrad.addColorStop(0.2, 'rgba(0,255,255,0.6)'); superGrad.addColorStop(0.5, 'rgba(170,0,255,0.3)'); superGrad.addColorStop(1, 'rgba(0,0,0,0)');
      X.fillStyle = superGrad; X.beginPath(); X.arc(0, 0, dW * 1.5 * pulse, 0, Math.PI * 2); X.fill();
      X.strokeStyle = '#fff'; X.lineWidth = 3; X.shadowBlur = 15; X.shadowColor = '#00ffff';
      for (let b = 0; b < 6; b++) {
        const ang = (b / 6) * Math.PI * 2 + this.t * 3; const len = dW * 0.8 + Math.sin(this.t * 20 + b) * dW * 0.3;
        X.beginPath(); X.moveTo(0, 0); X.lineTo(Math.cos(ang) * len * 0.5, Math.sin(ang) * len * 0.5); X.lineTo(Math.cos(ang + 0.2) * len, Math.sin(ang + 0.2) * len); X.stroke();
      } X.restore();
    }

    if (this.state === 'dash') {
      X.save(); X.globalAlpha = 0.25; X.translate(cX - faceScale * dW * 0.4, fY);
      if (imgCanvas && imgCanvas.complete !== false && (imgCanvas.naturalWidth !== 0 || imgCanvas.width !== 0)) {
        X.scale(faceScale, 1); X.drawImage(imgCanvas, -dW / 2, -dH, dW, dH); X.restore();
      } else {
        X.restore();
      }
    }
  }
}
// ===== FIREWORKS =====
let fireworks = [];
class Firework {
  constructor(x, y) {
    this.sparks = []; const c = 60; const h = Math.random() * 360;
    for (let i = 0; i < c; i++) {
      const a = (Math.PI * 2 / c) * i; const s = 4 + Math.random() * 6;
      this.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, hue: h + Math.random() * 40, size: 2 + Math.random() * 4 })
    }
  }
  update() {
    this.sparks.forEach(s => { s.x += s.vx; s.y += s.vy; s.vy += 0.08; s.vx *= 0.97; s.vy *= 0.97; s.life -= 0.012; });
    this.sparks = this.sparks.filter(s => s.life > 0);
  }
  draw() {
    this.sparks.forEach(s => {
      X.save(); X.globalAlpha = s.life; X.fillStyle = `hsl(${s.hue},100%,60%)`;
      X.shadowBlur = 12; X.shadowColor = `hsl(${s.hue},100%,60%)`; X.beginPath(); X.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2); X.fill(); X.restore();
    });
  }
}
