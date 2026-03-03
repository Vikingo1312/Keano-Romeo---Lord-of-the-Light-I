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

    if (typeof FX_BYPASS !== 'undefined' && FX_BYPASS.fades === 0) {
      // INSTANT CUT (BYPASS FADES)
      if (onMidpoint) onMidpoint();
      this.isTransitioning = false;
      return;
    }

    const fadeMult = (typeof FX_BYPASS !== 'undefined') ? FX_BYPASS.fades : 1.0;
    const finalIn = fadeInDuration * fadeMult;
    const finalWait = waitDuration * fadeMult;
    const finalOut = fadeOutDuration * fadeMult;

    // 1. Fade Into Black
    document.getElementById('scene-fader').style.transition = `opacity ${finalIn}ms ease-in-out`;
    document.getElementById('scene-fader').classList.add('fade-in');

    setTimeout(() => {
      // 2. Midpoint (Screen is fully black) -> Swap States!
      if (onMidpoint) onMidpoint();

      setTimeout(() => {
        // 3. Fade Out of Black into new Scene
        document.getElementById('scene-fader').style.transition = `opacity ${finalOut}ms ease-in-out`;
        document.getElementById('scene-fader').classList.remove('fade-in');

        setTimeout(() => {
          this.isTransitioning = false;
        }, finalOut);
      }, finalWait);
    }, finalIn);
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
    if (this.id === 'vikingo_coat' || this.id === 'dark_vikingo') {
      this.companion = new Companion(this);
    }
  }

  get w() { return FW(); }
  get h() { return FH(); }

  shout(text, duration = 2.0, actionType = null) {
    this.shoutText = text;
    this.shoutTimer = duration;

    // Play physical MP3 if actionType provided (e.g. 'intro', 'special', 'win')
    if (actionType && this._getVoiceId()) {
      SFX.playCharacterVoice(this._getVoiceId(), actionType);
    } else if (window.speechSynthesis && !SFX.muted) {
      // Fallback only if no action type given
      speechSynthesis.cancel();
      let u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = 1.1; u.pitch = this.isPlayer ? 1.0 : 0.8;
      speechSynthesis.speak(u);
    }
  }

  // Helper to resolve the correct Voice ID based on image subfolder
  _getVoiceId() {
    if (!this.fighterDir) return null;
    let d = this.fighterDir.toLowerCase();

    // Match against names in LEVELS
    if (d.includes('keano')) return 'keano';
    if (d.includes('vikingo')) return 'vikingo';
    if (d.includes('jay_x') || d.includes('jayden') || d.includes('jj_dark')) return 'jayden';
    if (d.includes('hattori')) return 'hattori';
    if (d.includes('raheel')) return 'raheel';
    if (d.includes('pablo')) return 'pablo';
    if (d.includes('tzubaza')) return 'tzubaza';
    if (d.includes('capone')) return 'capone';
    if (d.includes('gargamel')) return 'gargamel';
    if (d.includes('marley')) return 'marley';
    if (d.includes('kowalski')) return 'kowalski';
    if (d.includes('paco')) return 'paco';
    if (d.includes('juan')) return 'juan';
    if (d.includes('lee')) return 'lee';
    if (d.includes('putin')) return 'putin';

    return null;
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

      // Studio Polish 1: Reduced Pushback to allow combos instead of pushing opponents out of range
      let pushBase = isHeavy ? 14 : 6;
      let harmonicFader = (typeof FX_BYPASS !== 'undefined') ? FX_BYPASS.combatHarmonics : 1.0;

      this.knockVX = dir * pushBase * (0.6 + (0.4 * harmonicFader)); // Scales pushback
      this.hitFlash = 1 * (typeof FX_BYPASS !== 'undefined' ? FX_BYPASS.hitFlash : 1.0);
      this.hitStop = (isHeavy ? 0.22 : 0.12) * (typeof FX_BYPASS !== 'undefined' ? FX_BYPASS.hitStop : 1.0);
      screenShake = (isHeavy ? 15 : 8) * (typeof FX_BYPASS !== 'undefined' ? FX_BYPASS.screenShake : 1.0);

      SFX.hitHeavy(); // Impact thud
      if (Math.random() > 0.3) this.shout('', 0.1, 'hit'); // Character "Oof" 70% of time

      if (wasAlive && this.hp <= 0 && isHeavy) {
        finisherTint = 1.0;
        screenShake = 35;
      }
      if (wasAlive && this.hp <= 0) {
        // Studio Polish 3: Cinematic Street Fighter K.O.
        this.state = 'ko';
        this.stateTimer = 9.9; // Stay down
        this.hitStop = 0.5; // Massive hitstop

        // Post-Review 9: Completely kill flying/sliding if strict physics are active
        if (typeof FX_BYPASS !== 'undefined' && !FX_BYPASS.magneticGround) {
          this.knockVX = 0;
          this.vy = 0;
        } else {
          this.knockVX = dir * 25; // Slide far
          this.vy = -18; // Fly high up
        }

        this.shout("KO...", 2.0, "ko"); // Play physical KO sound file
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

    // V10: Advanced Physics & Gravity Control
    if (typeof FX_BYPASS !== 'undefined' && ((typeof FX_BYPASS !== "undefined" ? FX_BYPASS.gravityControl : 1.0) > 0.0 || (typeof FX_BYPASS !== "undefined" ? FX_BYPASS.strictGrounding : 1.0) > 0.0)) {
      // V12 Polish: Let the player jump organically! The "Magnet" only grabs them when they aren't actively in an aerial state
      const airborneStates = ['jump', 'hit', 'ko', 'special_roll', 'special_flip', 'special', 'punch', 'kick', 'super', 'finisher'];
      if (!airborneStates.includes(this.state)) {
        this.y = GROUND();
        this.vy = 0;
      }

      // Removed the jumpCap limit to explicitly restore normal jump heights
    }

    // V12: Magnetic Ground (Post-Review 7 + Polish 12)
    if (typeof FX_BYPASS !== 'undefined' && (typeof FX_BYPASS !== "undefined" ? FX_BYPASS.magneticGround : 1.0) > 0.0) {
      // Absolut feste Fixierung am Boden für ALLE Bewegungen außer Hit/Special/Jumping/Mid-Air Attacks
      const airborneStates2 = ['jump', 'hit', 'ko', 'special_roll', 'special_flip', 'special', 'punch', 'kick', 'super', 'finisher'];
      if (!airborneStates2.includes(this.state)) {
        this.y = GROUND();
        this.vy = 0;
      }
    }

    if (this.y > GROUND()) {
      this.y = GROUND();
      this.vy = 0;

      if (this.state === 'roll' || this.state === 'hit' || this.state === 'ko') {
        if (this.state === 'ko') {
          // Keine Reibung wenn wir starr am PC fallen
          this.knockVX = 0;
        } else if (this.isPlayer && this.hp > 0 && (keys['control'] || keys['alt'])) {
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

    // "Combat Harmonics" Physics friction tweaks
    let harmonicFader = (typeof FX_BYPASS !== 'undefined') ? FX_BYPASS.combatHarmonics : 1.0;

    // Blend between crisp modern friction (0.0) and loose retro friction (1.0)
    let airFriction = 0.95 + (0.03 * harmonicFader);
    let dashFriction = 0.88 + (0.04 * harmonicFader);
    let baseFriction = 0.75 + (0.07 * harmonicFader);

    if (this.y === GROUND()) {
      if (Math.abs(this.knockVX) > 0.5) {
        let friction = (this.state === 'dash') ? dashFriction : baseFriction;
        // Adjust friction scale slightly for slow mo so they don't slide forever
        if (this.timeScale < 1.0) friction -= 0.05;
        this.knockVX *= friction;
      } else {
        this.knockVX = 0;
      }
    } else {
      this.knockVX *= airFriction;
    }

    this.x = Math.max(this.w * 0.5, Math.min(C.width - this.w * 0.5, this.x));

    // Studio Polish 2: Jump-Lock Hysteresis & Corner Anti-Jitter
    // Don't change facing direction while in mid-air (jump) or during evade mechanics
    const isLockedState = (this.state === 'roll' || this.state === 'evade_back' || this.state === 'roll_forward' || this.state === 'jump' || Math.abs(this.vy) > 0.1);

    if (this.state !== 'hit' && this.state !== 'ko' && this.state !== 'special_roll' && this.state !== 'special_flip' && this.state !== 'dash' && this.state !== 'block' && this.state !== 'special') { // Added 'special'
      // Prevent rapid flipping when right on top of each other
      if (Math.abs(this.x - opponent.x) > 60) {
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
        this.hasHit = false; // Reset hit flag when animation ends
      }
    }
    if (this.specialCD > 0) this.specialCD -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt * 3;
    if (this.shoutTimer > 0) this.shoutTimer -= dt;
    this.t += dt * 8;

    // V19 Fix A: Process deferred attack hit check (Startup→Active)
    this._checkPendingHit(dt);

    if (opponent && (this.state === 'special_roll' || this.state === 'special_flip' || this.state === 'special')) { // Added 'special'
      const dist = Math.abs(this.x - opponent.x);
      const range = this.w * (this.state === 'special_roll' ? 0.9 : (this.state === 'special_flip' ? 1.2 : 0.8)); // Adjusted range for 'special'
      const isOppInvincible = (opponent.state === 'roll' || opponent.state === 'evade_back' || opponent.state === 'roll_forward');
      if (dist < range && Math.sin(this.t * 5) > 0.8 && !isOppInvincible) {
        const baseDmg = this.state === 'special_roll' ? 6 : (this.state === 'special_flip' ? 8 : 5); // Adjusted damage for 'special'
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
        let walkSpd = 10 - (2 * (1.0 - ((typeof FX_BYPASS !== 'undefined') ? FX_BYPASS.combatHarmonics : 1.0)));
        if (inLeft) { this.x -= walkSpd; moving = true; }
        if (inRight) { this.x += walkSpd; moving = true; }

        if (moving && this.state === 'idle') this.state = 'walk';
        if (!moving && this.state === 'walk') this.state = 'idle';

        if (inUp && this.y === GROUND()) {
          let jumpSpd = -26 + (4 * (1.0 - ((typeof FX_BYPASS !== 'undefined') ? FX_BYPASS.combatHarmonics : 1.0)));
          this.vy = jumpSpd; // Set jump speed directly without external DOM fader
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
        if (checkMotion(['s', fw, 'l'])) this.doSpecial(opponent); // Changed to doSpecial
        else if (checkMotion([bk, fw, 'k'])) this.doSpecialRoll(opponent);
        else if (checkMotion(['s', bk, 'k'])) this.doSpecialFlip(opponent);
        else if (keys['l']) this.doSpecial(opponent); // Changed to doSpecial
      }

      if (keys[' '] && this.super >= 100) this.doSuper(opponent);
    }

    // --- Utility AI Core ---
    if (!this.isPlayer && opponent) {
      this.updateAI(dt, opponent);
    }
  }

  updateAI(dt, opponent) {
    if (!opponent || this.hp <= 0 || this.state === 'ko') return;

    // --- CONTINUOUS MOVEMENT (Every Frame) ---
    const dist = Math.abs(this.x - opponent.x);
    const spdMult = this.ld?.speedMult || 1.0;
    const charType = this.ld?.special || 'fire';
    const projFreq = this.ld?.projFreq || 1.0;
    const jumpFreq = this.ld?.jumpFreq || 1.0;

    // Match player walk speed calculation for fairness
    let walkSpd = 10 - (2 * (1.0 - ((typeof FX_BYPASS !== 'undefined') ? FX_BYPASS.combatHarmonics : 1.0)));
    walkSpd *= (window.gameDifficulty === 'easy' ? 0.5 : (window.gameDifficulty === 'hard' ? 1.0 : 0.8)) * spdMult;

    let idealZoningDist = this.w * 0.5;
    if (charType === 'ice') idealZoningDist = this.w * 1.5;
    else if (charType === 'dark' || charType === 'earth') idealZoningDist = this.w * 0.4;
    if (projFreq > 1.5) idealZoningDist += this.w;

    const jitterDeadzone = 50;
    let aiMoving = false;

    // Move smoothly if idle or walking
    if (this.state === 'idle' || this.state === 'walk') {
      if (dist > idealZoningDist + jitterDeadzone) {
        this.x += (opponent.x > this.x ? walkSpd : -walkSpd);
        if (this.state !== 'walk') this.state = 'walk';
        aiMoving = true;
      } else if (dist < idealZoningDist - jitterDeadzone) {
        this.x += (opponent.x > this.x ? -walkSpd : walkSpd);
        if (this.state !== 'walk') this.state = 'walk';
        aiMoving = true;
      }

      // Stop walking if we reached ideal distance
      if (!aiMoving && this.state === 'walk') {
        this.state = 'idle';
      }
    }

    // --- DISCRETE DECISION MAKING (Reaction Timer) ---
    this.aiTimer -= dt;
    if (this.aiTimer > 0) return;

    let diffMult = window.gameDifficulty === 'easy' ? 0.4 : (window.gameDifficulty === 'hard' ? 1.5 : 1.0);
    if (typeof FX_BYPASS !== 'undefined' && (typeof FX_BYPASS !== "undefined" ? FX_BYPASS.combatAI : 1.0) > 0.0) {
      diffMult *= FX_BYPASS.combatAI;
    }

    // V19: Faster AI decisions (was 0.3-0.7s, now 0.2-0.5s)
    const baseTimerDelay = (0.2 + Math.random() * 0.3) / diffMult;
    this.aiTimer = this.isBoss ? baseTimerDelay * 0.6 : baseTimerDelay;

    const isOpponentAttacking = (opponent.state === 'punch' || opponent.state === 'kick' || opponent.state === 'proj' || opponent.state === 'special' || opponent.state === 'super');
    const r = Math.random();
    const canAct = (this.state === 'idle' || this.state === 'walk');

    // 1. Block Incoming Attacks
    if (isOpponentAttacking && dist < this.w * 1.8) {
      if (r < 0.4 * diffMult && canAct) {
        this.state = 'block';
        this.stateTimer = Math.max(0.3, opponent.stateTimer + 0.1);
        return;
      }
    }

    // 2. Dash/Evade/Punish Setup
    if ((opponent.state === 'evade_back' || opponent.state === 'hit' || opponent.state === 'roll') && dist < this.w * 1.5) {
      if (r < 0.4 * diffMult && canAct) {
        this.state = 'dash';
        this.stateTimer = 0.4;
        this.knockVX = (this.x < opponent.x) ? 22 : -22;
        SFX.dash();
        return;
      }
    }

    // 3. Super Attacks
    let superChance = 0.20 * diffMult;
    if (this.super >= 100 && dist < this.w * 2 && r < superChance && canAct) {
      this.doSuper(opponent);
      return;
    }

    // 4. Combat / Aggression
    // V19: More aggressive AI – wider attack range, higher probability, no setTimeout
    if (!aiMoving && canAct) {
      if ((charType === 'fire' || charType === 'lightning') && dist < this.w * 1.3) {
        if (r < 0.7 * diffMult) {
          this.doAttack('punch', opponent);
        } else if (r < 0.85 * diffMult && this.specialCD <= 0) {
          this.doSpecialFlip(opponent);
        } else {
          this.doAttack('kick', opponent);
        }
      } else if (charType === 'ice' && dist > this.w * 0.8) {
        if (r < 0.6 * diffMult * projFreq && this.specialCD <= 0) {
          this.fireProj();
        } else if (opponent.state === 'jump') {
          this.doAttack('kick', opponent);
        } else if (dist < this.w * 1.5 && r < 0.5 * diffMult) {
          this.doAttack('punch', opponent);
        }
      } else if ((charType === 'dark' || charType === 'earth') && dist < this.w * 1.0) {
        if (r < 0.7 * diffMult) {
          this.doAttack(r > 0.5 ? 'punch' : 'kick', opponent);
        } else if (r < 0.85 * diffMult && this.specialCD <= 0) {
          this.doSpecialRoll(opponent);
        }
      } else if (dist < this.w * 1.5 && r < 0.7 * diffMult) {
        this.doAttack(r > 0.5 ? 'punch' : 'kick', opponent);
      }
    }

    // 5. Agility / Random Jump / Roll
    if (r < (0.05 * jumpFreq) && canAct) {
      if ((charType === 'dark' || charType === 'lightning') && dist > this.w * 0.8) {
        this.state = 'roll_forward'; this.stateTimer = 0.5;
        this.knockVX = (opponent.x > this.x) ? 18 : -18;
        SFX.dash();
      } else {
        this.vy = -26; this.state = 'jump'; this.stateTimer = 0.5;
      }
    }

    // 6. Anti-Air
    if (opponent.y < GROUND() - 50 && dist < this.w * 1.2 && r < 0.8 * diffMult && canAct) {
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
    this.hasHit = false;

    // V19 Fix A: Store attack info for delayed hit check (Startup→Active→Recovery)
    // Punch startup: ~60ms, Kick startup: ~100ms
    this._pendingHit = {
      opponent: opponent,
      type: type,
      startupTimer: type === 'punch' ? 0.06 : 0.10
    };
  }

  // V19 Fix A: Deferred hit check – called from update loop
  _checkPendingHit(dt) {
    if (!this._pendingHit) return;
    this._pendingHit.startupTimer -= dt;
    if (this._pendingHit.startupTimer > 0) return; // Still in startup

    const { opponent, type } = this._pendingHit;
    this._pendingHit = null; // Only check once

    if (!opponent || this.hp <= 0 || opponent.hp <= 0) return;
    if (this.state !== 'punch' && this.state !== 'kick') return;
    if (this.hasHit) return;

    const distX = Math.abs(this.x - opponent.x);
    const distY = Math.abs(this.y - opponent.y);

    const baseRangeX = type === 'punch' ? this.w * 0.9 : this.w * 1.0;
    const rangeX = baseRangeX;
    const rangeY = this.h * 0.75;

    const isOpponentInvincible = (opponent.state === 'roll' || opponent.state === 'evade_back' || opponent.state === 'roll_forward');
    if (distX < rangeX && distY < rangeY && !isOpponentInvincible) {
      this.hasHit = true;
      let baseDmg = type === 'punch' ? 4 + Math.random() * 3 : 8 + Math.random() * 4;

      if (!this.isPlayer) {
        baseDmg *= (this.ld?.hitPow || 1);
        if (window.gameDifficulty === 'hard') baseDmg *= 1.3;
        else if (window.gameDifficulty === 'easy') baseDmg *= 0.6;
      }

      const dir = this.facingRight ? 1 : -1;
      const isHeavyHit = type === 'kick';

      opponent.takeHit(baseDmg, dir, isHeavyHit);
      this.hitStop = isHeavyHit ? 0.15 : 0.08;
      if (this.isPlayer && typeof FX_BYPASS !== 'undefined' && (typeof FX_BYPASS !== "undefined" ? FX_BYPASS.playerImpactFeel : 1.0) > 0.0) {
        this.hitStop *= 2.0;
      }

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

  fireProj() {
    if (this.isPlayer && comboCount < 3) return;
    if (QATracker.active) QATracker.specials++;
    this.state = 'special'; this.stateTimer = 0.4; this.specialCD = 1.2;
    const dir = this.facingRight ? 1 : -1;
    const type = this.isPlayer ? 'super' : (this.ld?.special || 'fire');
    projectiles.push(new Projectile(this.x + dir * this.w * 0.4, this.y - this.h * 0.4, dir, type, this.isPlayer));
    screenShake = 5;
    this.shout('', 1.5, 'special'); // Voice play
    if (this.isPlayer) comboCount = 0;

    if (this.companion) {
      const opp = (this === player) ? enemy : player;
      this.companion.triggerBite(opp);
      this.shout("Attack!", 1.5);
    } else {
      // Trigger MP3 based on logical special string instead of TTS
      this.shout(this.isPlayer ? "SPECIAL!" : "DIE!", 1.5, "special");
    }
  }

  doSpecial(opponent) {
    if (this.specialCD > 0) return;
    this.state = 'special';

    const spdMult = this.isPlayer ? 1.2 : (this.ld?.speedMult || 1);
    this.stateTimer = 0.6 / spdMult;

    // Keano's Spin Kick Fix: Ensure he doesn't sink into the ground by locking Y velocity
    this.vy = 0;

    this.knockVX = this.facingRight ? 12 : -12;
    this.specialCD = 5.0; // special cooldown

    if (QATracker.active) QATracker.specials++;
    SFX.dash();
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

    this.shout("SUPER!", 2.0, "super"); // Trigger MP3

    if (opponent && Math.abs(this.x - opponent.x) < this.w * 1.3) {
      // V19: Reduced Super melee (was 45/30, now 25/18) to prevent 1-hit kills
      opponent.takeHit(this.isPlayer ? 25 : 18, dir);
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

    // Studio Polish 8: Performance Bypass for costly canvas filters
    if ((typeof FX_BYPASS !== "undefined" ? FX_BYPASS.canvasFilters : 1.0) > 0.0) {
      X.filter = `saturate(1.8) contrast(1.1) brightness(1.1)`;
      if (this.hitFlash > 0) X.filter = `brightness(2) contrast(1.5)`;
    } else {
      X.filter = 'none';
      if (this.hitFlash > 0) X.globalAlpha = 0.5; // Cheap fallback for hit visibility
    }

    X.scale(faceScale, 1);


    // ==========================================
    // V11 GLOW SYSTEM (Master-Prompt: Only Main Heroes)
    // ==========================================
    const isMainHero = this.fighterDir.includes('Keano') ||
      this.fighterDir.includes('vikingo') ||
      this.fighterDir.includes('Jayden') ||
      this.fighterDir.includes('Jay_X') ||
      this.fighterDir.includes('Gargamel');

    if ((typeof FX_BYPASS !== "undefined" ? FX_BYPASS.heavyGlow : 1.0) > 0.0 && isMainHero && (this.state === 'special' || this.state === 'super' || finisherTint > 0.5)) {
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
      case 'idle':
        if (typeof FX_BYPASS !== 'undefined' && (typeof FX_BYPASS !== "undefined" ? FX_BYPASS.animSprite : 1.0) > 0.0) {
          const idleTime = performance.now() / 400; // Smooth engine time for breathing
          sY = 1 + Math.sin(idleTime) * 0.03;
          sX = 1 - Math.sin(idleTime) * 0.015;
          offY = Math.sin(idleTime) * 4; // 4px vertical breathing displacement
          this._lerpRot = 0; // Force upright stance
        }
        break;
      case 'walk': offY = Math.abs(Math.sin(this.t * 12)) * 10; rot = Math.sin(this.t * 6) * 0.05; break;
      case 'roll': offY = dH * 0.4; rot = this.t * 15; sX = 0.7; sY = 0.7; break;
      case 'punch':
        offX = dW * 0.45; rot = 0.2; sX = 1.15; sY = 0.9;
        // V19: Reduced player stretch (was 1.4/0.7 → 1.2/0.85) to prevent sprite split
        if (this.isPlayer && typeof FX_BYPASS !== 'undefined' && (typeof FX_BYPASS !== "undefined" ? FX_BYPASS.playerImpactFeel : 1.0) > 0.0) { sX = 1.2; sY = 0.85; offX = dW * 0.55; }
        break;
      case 'kick':
        offX = dW * 0.35; rot = -0.2; sX = 0.85; sY = 1.15; offY = -dH * 0.06;
        // V19: Reduced player stretch (was 0.6/1.5 → 0.75/1.3) to prevent sprite split
        if (this.isPlayer && typeof FX_BYPASS !== 'undefined' && (typeof FX_BYPASS !== "undefined" ? FX_BYPASS.playerImpactFeel : 1.0) > 0.0) { sX = 0.75; sY = 1.3; offY = -dH * 0.1; }
        break;
      case 'jump': sX = 0.9; sY = 1.1; rot = this.vy > 0 ? 0.1 : -0.1; break;
      case 'hit': rot = -0.3; offX = -dW * 0.2; sX = 0.85; sY = 1.15; break;
      case 'block': rot = -0.1; sX = 1.1; sY = 0.9; offX = -dW * 0.1; break;
      case 'ko':
        if (typeof FX_BYPASS !== 'undefined' && (typeof FX_BYPASS !== "undefined" ? FX_BYPASS.magneticGround : 1.0) > 0.0) {
          rot = 0; offY = 0; sX = 1.0; sY = 0.5; // Kein Kippen, staucht sich nur zusammen
        } else {
          rot = -Math.PI / 2; offY = -dH * 0.10; sX = 1.0; sY = 0.8;
        }
        break;
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
    // Studio Polish 6: Aura & Fire Shimmer Fix for all variants
    const dStr = (this.fighterDir || '').toLowerCase();
    const isGlowChar = dStr.includes('keano') || dStr.includes('vikingo') || dStr.includes('jayden') || dStr.includes('jay_x') || dStr.includes('gargamel');
    const isGlowState = ['special', 'super', 'special_roll', 'special_flip', 'finisher', 'perfect'].includes(this.state);

    if ((typeof FX_BYPASS !== "undefined" ? FX_BYPASS.heavyGlow : 1.0) > 0.0 && isGlowChar && isGlowState) {
      // Vikingo Fire Shimmer exception
      if (dStr.includes('vikingo')) {
        X.shadowColor = '#ff3300';
        X.filter = `drop-shadow(0 0 10px #ff6600) drop-shadow(0 0 20px #ff0000)`;
      } else {
        X.shadowColor = this.ld?.glowColor || '#00ffff';
      }

      X.shadowBlur = Math.abs(Math.sin(this.t * 6)) * 40 + 10;
      if (QATracker.active) QATracker.glowTriggers++;
    } else if (typeof FX_BYPASS !== 'undefined' && (typeof FX_BYPASS !== "undefined" ? FX_BYPASS.heroAura : 1.0) > 0.0 && dStr.includes('keano')) {
      // V11/V12: Special Hero Aura strictly attached to Keano silhouette, slower fade and less intense
      X.shadowColor = '#ffee00'; // Golden/White Hero Shimmer
      X.shadowBlur = Math.abs(Math.sin(performance.now() / 300)) * 35 + 10;
    } else {
      X.shadowBlur = 0;
      X.shadowColor = 'transparent';
    }

    // Body KO Glow
    if (this.state === 'ko' && typeof FX_BYPASS !== 'undefined' && (typeof FX_BYPASS !== "undefined" ? FX_BYPASS.bodyKoGlow : 1.0) > 0.0) {
      X.shadowColor = '#00ffff'; // Electric cyan flicker
      X.shadowBlur = 10 + Math.random() * 40;
    }

    // ==========================================
    // V12 STUDIO AGILITY (Smear / Phantom StrikeTrails)
    // DISABLED for V11: Caused extreme Matrix/Translate shaking regressions on AI attacks
    // ==========================================
    /*
    const isAttacking = ['punch', 'kick', 'special', 'super', 'finisher'].includes(this.state);
    if ((typeof FX_BYPASS !== "undefined" ? FX_BYPASS.attackSmear : 1.0) > 0.0 && isAttacking && this.stateTimer > 0.1 && imgCanvas && imgCanvas.complete !== false) {
       // Code removed to stabilize fighter coordinate rendering
    }
    */

    // Draw Main Character Sprite
    if (imgCanvas && imgCanvas.complete !== false && (imgCanvas.naturalWidth !== 0 || imgCanvas.width !== 0)) {
      if (this.state === 'idle' && typeof FX_BYPASS !== 'undefined' && (typeof FX_BYPASS !== "undefined" ? FX_BYPASS.advancedSlicing : 1.0) > 0.0) {
        // V10 Advanced Slicing Animation for Idle breathing
        const isRight = this.facingRight;
        const cutRatio = isRight ? 0.65 : 0.35; // Verschiebe Schnitt auf ~65% Schulterlinie
        const cutX = imgCanvas.width * cutRatio;

        if (isRight) {
          // Body (Links)
          X.drawImage(imgCanvas, 0, 0, cutX, imgCanvas.height, -dW / 2, -dH, dW * cutRatio, dH);
          // Front Arm (Rechts)
          X.save();
          const armPivotX = -dW / 2 + (dW * cutRatio);
          const armPivotY = -dH * 0.75;
          X.translate(armPivotX, armPivotY);
          X.rotate(Math.sin(performance.now() / 350) * 0.06); // Independent rotation
          X.drawImage(imgCanvas, cutX, 0, imgCanvas.width - cutX, imgCanvas.height, 0, -dH + Math.abs(armPivotY), dW * (1 - cutRatio), dH);
          X.restore();
        } else {
          // Front Arm (Links)
          X.save();
          const armPivotX = -dW / 2 + (dW * cutRatio);
          const armPivotY = -dH * 0.75;
          X.translate(armPivotX, armPivotY);
          X.rotate(-Math.sin(performance.now() / 350) * 0.06);
          X.drawImage(imgCanvas, 0, 0, cutX, imgCanvas.height, -dW * cutRatio, -dH + Math.abs(armPivotY), dW * cutRatio, dH);
          X.restore();
          // Body (Rechts)
          X.drawImage(imgCanvas, cutX, 0, imgCanvas.width - cutX, imgCanvas.height, armPivotX, -dH, dW * (1 - cutRatio), dH);
        }
      } else {
        // ==========================================
        // V16 CAPCOM 2.1 / V12 HOUDINI SKELETAL ILLUSION
        // Phantoms and Surgical Cuts (No actual dismemberment!)
        // ==========================================
        let smearFader = (typeof FX_BYPASS !== 'undefined') ? FX_BYPASS.attackSmear : 1.0;
        const isAttacking = ['punch', 'kick', 'special', 'super', 'finisher'].includes(this.state);

        if (smearFader > 0 && isAttacking && this.stateTimer > 0.05 && this.stateTimer < 0.25) {
          const isRight = this.facingRight;

          // Magnet-Pulse Calculation (How far the Phantom shoots out)
          const pulseProgress = Math.sin(this.stateTimer * Math.PI * 10); // 0 to 1 back to 0
          const magnetOffset = pulseProgress * (dW * 0.35) * smearFader;
          const directionMult = isRight ? 1 : -1;

          // 1. Draw the Base Character WHOLE (no destructive clipping)
          X.drawImage(imgCanvas, -dW / 2, -dH, dW, dH);

          // 2. Draw the Phantom Smear (Duplicate shifted forward)
          X.save();
          X.globalCompositeOperation = 'screen';
          X.globalAlpha = Math.min(1.0, pulseProgress) * 0.6 * smearFader; // Glow intensity peaks mid-attack

          // Color based on player vs AI
          const phantomColor = this.isPlayer ? '#00ccff' : '#ff3300';

          // Apply a heavy motion blur/glow to the phantom
          X.shadowBlur = 30;
          X.shadowColor = phantomColor;
          // Studio Polish: Use filter for the phantom if not bypassed, creates a blown-out neon look
          if (typeof FX_BYPASS !== 'undefined' && (typeof FX_BYPASS !== "undefined" ? FX_BYPASS.canvasFilters : 1.0) > 0.0) {
            X.filter = `drop-shadow(0 0 10px ${phantomColor}) brightness(2) contrast(1.5)`;
          }

          // Draw the physical shifted phantom
          X.translate(magnetOffset * directionMult, 0);
          X.drawImage(imgCanvas, -dW / 2, -dH, dW, dH);
          X.restore();

          // 3. Draw "Surgical" Laser-Cuts (Static visual cues, 1px lines at joints to hint at speed)
          X.save();
          X.globalAlpha = Math.min(1.0, pulseProgress) * 0.8 * smearFader;
          X.strokeStyle = 'rgba(255, 255, 255, 0.9)'; // Sharp white surgical line
          X.lineWidth = 1.5;
          X.shadowBlur = 10;
          X.shadowColor = phantomColor;

          X.beginPath();
          if (this.state === 'punch') {
            // Cut at shoulder
            const shoulderX = isRight ? dW * 0.1 : -dW * 0.1;
            X.moveTo(shoulderX, -dH * 0.6);
            X.lineTo(shoulderX + (isRight ? 15 : -15), -dH * 0.45);
          } else if (this.state === 'kick') {
            // Cut at hip
            const hipX = isRight ? dW * 0.0 : -dW * 0.0;
            X.moveTo(hipX - (isRight ? 10 : -10), -dH * 0.4);
            X.lineTo(hipX + (isRight ? 20 : -20), -dH * 0.3);
          }
          X.stroke();
          X.restore();

        } else {
          // Normal Rendering (No Smear/Slice Active)
          X.drawImage(imgCanvas, -dW / 2, -dH, dW, dH);
        }
      }
    }

    // ==========================================
    // V11 IMPACT SPARK (Plugin/Effect)
    // ==========================================
    let flashFader = (typeof FX_BYPASS !== 'undefined') ? FX_BYPASS.hitFlash : 1.0;
    if (this.hitFlash > 0 && flashFader > 0) {
      X.save();
      // Un-scale face direction for the spark so it doesn't flip weirdly relative to the screen
      X.scale(faceScale > 0 ? 1 : -1, 1);

      const sparkAlpha = Math.max(0, this.hitFlash);
      X.globalAlpha = Math.min(1.0, sparkAlpha * 0.85 * flashFader); // Transparent "chirurgisch" scaled
      X.globalCompositeOperation = 'screen';

      // Position roughly at chest height, shifted forward toward the hit origin
      const sparkX = faceScale * (dW * 0.15);
      const sparkY = -dH * 0.45;
      X.translate(sparkX, sparkY);

      if (this.state !== 'ko' || typeof FX_BYPASS === 'undefined' || FX_BYPASS.bodyKoGlow !== 0.0) {
        // Rotate dynamically for impact feel, plus spin
        X.rotate((performance.now() / 100) + this.hitFlash * Math.PI);

        // Flashy Manga-Star Core
        X.fillStyle = '#ffaa00';
        X.shadowBlur = 20;
        X.shadowColor = '#ff0000';

        X.beginPath();
        for (let i = 0; i < 8; i++) {
          const radius = (i % 2 === 0) ? (dW * 0.6) : (dW * 0.15);
          const angle = (i / 8) * Math.PI * 2;
          if (i === 0) X.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
          else X.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        X.closePath();
        X.fill();

        // Inner bright white/cyan core
        X.fillStyle = '#ffffff';
        X.shadowBlur = 10;
        X.shadowColor = '#00ffff';
        X.beginPath();
        X.arc(0, 0, dW * 0.12, 0, Math.PI * 2);
        X.fill();

      } // End bodyKoGlow Check

      X.restore();
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

    // ========== V11 KO FLARE (Overhaul) ==========
    if (this.koFlare > 0 && typeof FX_BYPASS !== 'undefined' && (typeof FX_BYPASS !== "undefined" ? FX_BYPASS.koOverhaul : 1.0) > 0.0) {
      X.save();
      X.globalCompositeOperation = 'screen';
      X.globalAlpha = this.koFlare;
      // Massive lightning flash at center of body
      X.translate(0, -dH * 0.5);
      X.fillStyle = '#ffffff';
      X.shadowColor = '#00ffff';
      X.shadowBlur = 50 + Math.random() * 50;
      X.beginPath();
      X.arc(0, 0, dW * 1.5, 0, Math.PI * 2);
      X.fill();
      X.fillStyle = '#00aaff';
      X.beginPath();
      X.arc(0, 0, dW * 3.0, 0, Math.PI * 2);
      X.fill();
      X.restore();

      this.koFlare -= dt * 2.5; // Fade out quickly
    }

    // --- LIMB SIMULATOR (by FX_BYPASS) ---
    if ((typeof FX_BYPASS !== "undefined" ? FX_BYPASS.limbs : 1.0) > 0.0 && (this.state === 'punch' || this.state === 'kick' || this.state === 'super') && this.stateTimer > 0) {
      X.save();
      X.fillStyle = this.isPlayer ? 'rgba(0, 255, 255, 0.6)' : 'rgba(255, 50, 50, 0.6)';
      const dir = this.facingRight ? 1 : -1;
      const ext = this.state === 'kick' ? this.w * 1.2 : this.w * 0.9;
      const yOff = this.state === 'kick' ? -this.h * 0.2 : -this.h * 0.6;
      X.fillRect(cX + (dir * this.w * 0.1), fY + yOff, dir * ext, this.state === 'kick' ? 25 : 15);
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
