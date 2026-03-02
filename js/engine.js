// ===== GAME STATE =====
let player, enemy, currentLevel = 0, fwTimer = 0;
window._caesarWhiteImg = new Image(); window._caesarWhiteImg.src = 'assets/logo_white.png';
let roundNum = 1, p1Wins = 0, p2Wins = 0, roundTimerNum = defaultRoundTime;
let p1WonLast = false;
let seenMidpoint = false, playingOutro = false, playingHappyBirthday = false;

function startLevel(idx, forceEpilogue = false) {
  if (gameMode === 'story' && idx === 7 && !seenMidpoint) {
    seenMidpoint = true;
    gameState = 'midpoint_reflexion';
    stateTimer = 0;
    playEpicVoice(reflexionLines, 'reflexion');
    return;
  }

  currentLevel = idx; p1Wins = 0; p2Wins = 0; roundNum = 1;
  if (QATracker.active) QATracker.matches++;
  const ld = LEVELS[currentLevel];

  if (gameMode === 'story' && ld.name === 'VIKINGO') {
    ld.activeFighter = ld.altProfile?.fighter || ld.fighterDir;
    ld.activeName = ld.altProfile?.name || ld.name;
    ld.activeFlag = ld.altProfile?.flag || ld.flag;
  } else if (gameMode === 'story' && ld.name === 'C. GARGAMEL') {
    ld.activeFighter = ld.altProfile?.fighter || ld.fighterDir;
    ld.activeName = ld.altProfile?.name || ld.name;
    ld.activeFlag = ld.altProfile?.flag || ld.flag;
  } else if (ld.altProfile && Math.random() > 0.5) {
    ld.activeFighter = ld.altProfile?.fighter || ld.fighterDir;
    ld.activeName = ld.altProfile?.name || ld.name;
    ld.activeFlag = ld.altProfile?.flag || ld.flag;
  } else {
    ld.activeFighter = ld.fighterDir;
    ld.activeName = ld.name;
    ld.activeFlag = ld.flag;
  }

  // Safety mapping to ensure clean loading logic gets passed successfully down into fighter class
  ld.fighterDir = ld.activeFighter;

  gameState = 'vs_screen';
  SFX.playBGM('assets/audio/music/vs_theme.mp3'); // V17: Trigger VS Theme exactly when VS logic begins
  stateTimer = 4.5; // Auto VS transition after 4.5s matches master plan!

  let pData;
  if (gameMode === 'story') {
    pData = KEANO;
  } else {
    pData = [KEANO, ...LEVELS].find(l => l.name === arcadeSelectedName) || KEANO;
  }
  const eData = ld;

  player = new HybridFighter(C.width * 0.22, GROUND(), true, pData.col, pData);
  enemy = new HybridFighter(C.width * 0.78, GROUND(), false, eData.col, eData);

  // Reset
  enemy.facingRight = false;
  enemy.isBackTurned = false;
}

function startRound() {
  const ld = LEVELS[currentLevel];
  player.x = C.width * 0.22; player.y = GROUND(); player.hp = player.maxHP; player.state = 'idle';
  enemy.x = C.width * 0.78; enemy.y = GROUND(); enemy.hp = enemy.maxHP; enemy.state = 'idle';

  projectiles = [];
  stageObjects = [];
  if ((typeof FX_BYPASS !== "undefined" ? FX_BYPASS.stageProps : 1.0) > 0.0 && ld && ld.objType) {
    const isBossOrSecret = ['dark_vikingo', 'supreme_keano', 'hyper_keano', 'vikingo_coat', 'jay_x', 'gargamel_hoodie'].includes(ld.id);
    const count = isBossOrSecret ? 2 : (2 + Math.floor(Math.random() * 2)); // 2 to 3 objects

    for (let i = 0; i < count; i++) {
      // Spawn further inward to ensure they are destructible (not hugging the literal edge)
      const isLeftEdge = (i % 2 === 0);
      let ox = isLeftEdge ? (250 + Math.random() * 100) : (C.width - 350 + Math.random() * 100);
      stageObjects.push(new StageObject(ld.objType, ox, GROUND()));
    }
  }

  gameState = 'intro'; stateTimer = 3.0;
  roundTimerNum = defaultRoundTime;
  comboCount = 0; comboTimer = 0;

  // Reset BGM Tension Speed
  const bgmEl = document.getElementById('bgm-player');
  if (bgmEl) bgmEl.playbackRate = 1.0;

  // V4 AUDIO MANAGER: Play the stage specific BGM!
  if (ld && ld.bgm) {
    SFX.playBGM(ld.bgm);
  }

  // V4 AUDIO MANAGER: Pre-Match Intro Trash Talk!
  if (Math.random() > 0.5 && player._getVoiceId()) {
    player.shout(player.shoutText || "Let's go!", 2.0, "intro");
  } else if (enemy._getVoiceId()) {
    setTimeout(() => enemy.shout(enemy.shoutText || "Prepare!", 2.0, "intro"), 800); // slight delay for dramatic effect
  }
}
// Post-Review 9 & V12: Shooting Stars Pool (Diagonal & Natural)
let shootingStarsPool = [];
function updateAndDrawShootingStars(dt) {
  let starFader = (typeof FX_BYPASS !== 'undefined') ? FX_BYPASS.shootingStars : 1.0;
  if (starFader <= 0.01) return;

  // Spawn very rare, single stars (max 5 at a time)
  if (Math.random() < 0.02 && shootingStarsPool.length < 5) {
    const isLeftToRight = Math.random() > 0.5;

    // Start high up, slightly off-screen near top corners
    const startX = isLeftToRight ? -50 - Math.random() * 100 : C.width + 50 + Math.random() * 100;
    const startY = -50 - Math.random() * 100;

    // Diagonal towards opposite bottom corner for natural perspective
    const targetX = isLeftToRight ? C.width + 200 : -200;
    const targetY = C.height + 200;
    const angle = Math.atan2(targetY - startY, targetX - startX);

    shootingStarsPool.push({
      x: startX,
      y: startY,
      speed: 40 + Math.random() * 60,  // Very slow, gentle drift
      length: 80 + Math.random() * 120, // Long elegant tails
      angle: angle,
      alpha: 0,                         // Start completely invisible
      targetAlpha: 0.15 + Math.random() * 0.25, // Very subtle peak brightness
      life: 0,
      maxLife: 15 + Math.random() * 15  // Takes 15-30 seconds to cross/fade (huge arc)
    });
  }

  for (let i = shootingStarsPool.length - 1; i >= 0; i--) {
    const s = shootingStarsPool[i];
    s.life += dt;

    s.x += Math.cos(s.angle) * s.speed * dt;
    s.y += Math.sin(s.angle) * s.speed * dt;

    // Smooth parabola fade in and out based on its exact maxLife. 
    // 0 -> fades in to peak -> fades out -> 0
    let lifeRatio = s.life / s.maxLife;
    if (lifeRatio >= 1 || s.y > C.height + 200 || s.x < -300 || s.x > C.width + 300) {
      shootingStarsPool.splice(i, 1);
      continue;
    }

    // Perfect sine-wave fade in and out over its life duration
    s.alpha = s.targetAlpha * Math.sin(lifeRatio * Math.PI);

    X.save();
    X.globalCompositeOperation = 'screen';
    X.translate(s.x, s.y);
    X.rotate(s.angle);

    // Apply global FX_BYPASS fader and natural shimmer
    const shimmer = s.alpha * starFader * (0.8 + 0.2 * Math.sin(s.life * 4));

    const grad = X.createLinearGradient(0, 0, -s.length, 0);
    grad.addColorStop(0, `rgba(255, 255, 255, ${shimmer})`);
    grad.addColorStop(0.2, `rgba(150, 240, 255, ${shimmer * 0.5})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    X.fillStyle = grad;
    X.fillRect(-s.length, -1.0, s.length, 2);

    X.fillStyle = `rgba(255, 255, 255, ${shimmer})`;
    X.shadowBlur = 15;
    X.shadowColor = '#00ffff';
    X.beginPath();
    X.arc(0, 0, 1.2, 0, Math.PI * 2);
    X.fill();

    X.restore();
  }
}

// ===== GAME LOOP =====
function gameLoop(ts) {
  requestAnimationFrame(gameLoop);
  try {
    updateSkipButton();
    pollGamepad();
    let dtMult = 1.0;

    if ((player && player.hitStop > 0) || (enemy && enemy.hitStop > 0)) {
      dtMult = 0;
      if (player && player.hitStop > 0) player.hitStop -= 0.016;
      if (enemy && enemy.hitStop > 0) enemy.hitStop -= 0.016;
    }

    const dtRaw = (ts - lastTime) / 1000;
    if (QATracker.active && dtRaw > 0.035) QATracker.frameDrops++;
    const dt = Math.min(dtRaw, 0.05) * dtMult;
    lastTime = ts;
    time += dt;

    // --- Main Menu Lightning Effect ---
    if ((typeof FX_BYPASS !== "undefined" ? FX_BYPASS.lightning : 1.0) > 0.0 && gameState === 'menu' && !document.getElementById('main-menu').classList.contains('hidden')) {
      if (time > nextLightning) {
        document.getElementById('main-menu').classList.add('lightning-active');
        SFX.hitHeavy(); // Using a heavy hit sound to simulate thunder rumble
        setTimeout(() => {
          const menuDiv = document.getElementById('main-menu');
          if (menuDiv) menuDiv.classList.remove('lightning-active');
        }, 500);
        nextLightning = time + 4000 + Math.random() * 8000;
      }
    }

    X.clearRect(0, 0, C.width, C.height);
    X.save();
    if (screenShake > 0) {
      let shakeFader = (typeof FX_BYPASS !== 'undefined') ? FX_BYPASS.screenShake : 1.0;
      if (shakeFader > 0.0) {
        X.translate((Math.random() - 0.5) * screenShake * 3 * shakeFader, (Math.random() - 0.5) * screenShake * 3 * shakeFader);
      }
      screenShake *= 0.85; if (screenShake < 0.5) screenShake = 0;
    }
    const ld = LEVELS[currentLevel || 0]; const si = rawImgs[ld.stage];
    if (si && si.complete && si.naturalWidth !== 0) X.drawImage(si, 0, 0, C.width, C.height);
    else { const g = X.createLinearGradient(0, 0, 0, C.height); g.addColorStop(0, '#1a0030'); g.addColorStop(1, '#0a0015'); X.fillStyle = g; X.fillRect(0, 0, C.width, C.height); }

    if (finisherTint > 0) {
      X.fillStyle = `rgba(0,0,0,${finisherTint * 0.8})`;
      X.fillRect(0, 0, C.width, C.height);
      finisherTint -= dt * 0.8 * gameSpeedMult;
    }

    // State Machine
    if (gameState === 'splash') {
      stateTimer += dtRaw;

      // Draw Black Background
      X.fillStyle = '#000000'; X.fillRect(0, 0, C.width, C.height);

      // Draw CAESAR/KEANO logo with soft breathing pulse
      if (window._caesarDarkImg && window._caesarDarkImg.complete) {
        const cx = C.width / 2;
        const cy = C.height / 2;
        const targetWidth = C.width * 0.4;
        const targetHeight = targetWidth * (window._caesarDarkImg.height / window._caesarDarkImg.width);

        // V12 Polish: Soft Breathing Pulsation instead of starr math
        // Breathing cycle: full cycle every ~4 seconds. Math.PI * 2 = 1 cycle.
        const breath = 1.0 + Math.sin(time * (Math.PI / 2)) * 0.05; // +/- 5% scale breathing
        const glowPulse = 0.6 + Math.sin(time * (Math.PI / 2)) * 0.4; // 20% to 100% glow intensity

        let alpha = Math.min(1.0, stateTimer / 1.2); // Slower fade in
        let scale = breath + (stateTimer * 0.02); // Breathing + Slow overall growth

        if (stateTimer > 4.0) { // Keep splashing screen longer for effect
          alpha = Math.max(0.0, 1.0 - ((stateTimer - 4.0) / 1.0)); // 1 second gentle fade out
        }

        X.save();
        X.globalAlpha = alpha;
        X.translate(cx, cy);
        X.scale(scale, scale);

        // V12 Polish: Breathing Glow
        X.shadowBlur = 40 + (glowPulse * 20);
        X.shadowColor = `rgba(0, 255, 255, ${glowPulse * 0.6})`;
        X.drawImage(window._caesarDarkImg, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
        X.restore();
      }

      // Splash screen stays longer now (5 seconds)
      if (stateTimer > 5.0 || keys[' ']) {
        gameState = 'menu';
        document.getElementById('main-menu').classList.remove('hidden');
        SFX.playBGM('assets/audio/music/main_menu.mp3');
      }
    }
    else if (gameState === 'init') {
      X.fillStyle = '#0a0022'; X.fillRect(0, 0, C.width, C.height);
      if (!isGameLoaded) {
        const pct = totalAssets > 0 ? Math.floor((assetsLoaded / totalAssets) * 100) : 0;
        drawBigText(`LOADING DATA... ${pct}%`, '#00ffff', 0.8);
      } else {
        drawBigText('CLICK TO START ENGINE', '#ff00ff', 1.0);
      }
    }
    else if (gameState === 'prologue') {
      stateTimer += dt;
      const cosmicG = X.createRadialGradient(C.width / 2, C.height / 2, 0, C.width / 2, C.height / 2, C.width);
      cosmicG.addColorStop(0, '#00001a'); cosmicG.addColorStop(1, '#000000');
      X.fillStyle = cosmicG; X.fillRect(0, 0, C.width, C.height);

      // === SHIMMER EFFECTS (subtle, behind text) ===
      // Drifting nebula bands
      for (let n = 0; n < 3; n++) {
        X.save();
        X.globalAlpha = 0.04 + Math.sin(stateTimer * 0.3 + n * 2) * 0.02;
        const nebGrad = X.createLinearGradient(0, 0, C.width, C.height);
        const hue1 = (180 + n * 40 + stateTimer * 5) % 360;
        nebGrad.addColorStop(0, `hsla(${hue1}, 80%, 50%, 0.3)`);
        nebGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
        nebGrad.addColorStop(1, `hsla(${(hue1 + 60) % 360}, 80%, 40%, 0.2)`);
        X.fillStyle = nebGrad;
        X.fillRect(0, 0, C.width, C.height);
        X.restore();
      }

      // Center light beam (divine pillar)
      X.save();
      X.globalAlpha = 0.06 + Math.sin(stateTimer * 0.8) * 0.03;
      const beamGrad = X.createLinearGradient(C.width * 0.45, 0, C.width * 0.55, 0);
      beamGrad.addColorStop(0, 'rgba(0,0,0,0)');
      beamGrad.addColorStop(0.4, 'rgba(0,255,255,0.3)');
      beamGrad.addColorStop(0.5, 'rgba(150,0,255,0.2)');
      beamGrad.addColorStop(0.6, 'rgba(0,255,255,0.3)');
      beamGrad.addColorStop(1, 'rgba(0,0,0,0)');
      X.fillStyle = beamGrad;
      X.fillRect(0, 0, C.width, C.height);
      X.restore();

      // V17: Beautiful Diagonal Drifting Stars with soft glow
      for (let i = 0; i < 60; i++) {
        // Pseudo-random direction for each star based on its index (drifting down diagonally)
        const dirX = (i % 2 === 0 ? 1 : -1) * (0.5 + (i % 3) * 0.5);
        const dirY = 1.0 + (i % 4) * 0.3; // Gentle downward drift

        const sx = (i * 173.7 + stateTimer * 15 * dirX);
        const sy = (i * 97.3 + stateTimer * 15 * dirY);

        // Endless wrap-around logic
        const wrappedX = ((sx % C.width) + C.width) % C.width;
        const wrappedY = ((sy % C.height) + C.height) % C.height;

        const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(stateTimer * (0.3 + i * 0.1) + i));
        X.globalAlpha = twinkle;
        X.fillStyle = i % 5 === 0 ? '#aaddff' : (i % 7 === 0 ? '#ccaaff' : '#ffffff');
        X.beginPath(); X.arc(wrappedX, wrappedY, 1.2 + (i % 3) * 0.6, 0, Math.PI * 2);
        X.shadowBlur = 8;
        X.shadowColor = X.fillStyle;
        X.fill();
      }
      X.globalAlpha = 1;
      X.shadowBlur = 0;

      const cx = C.width / 2; const fs = (pct) => Math.min(C.width * pct, C.height * pct * 1.8);
      X.save(); X.textAlign = 'center'; const lineHeight = fs(0.04);

      // Default duration to 40 seconds if audio fails to load or duration is buggy (Infinity)
      let scrollSpeed = 30;
      let safeDuration = 40;

      if (currentAudioTrack && currentAudioTrack.duration > 0 && currentAudioTrack.duration < Infinity) {
        safeDuration = currentAudioTrack.duration;
      }

      const totalHeight = Array.from(prologueLines).reduce((acc, line) => acc + (line.text && !line.text.startsWith('(') ? lineHeight : 0), 0);

      // Audio Calibration: Perfect Sync Multiplier
      scrollSpeed = ((C.height * 0.8) + totalHeight) / safeDuration;

      // Accumulate the scrolling position using either audio time or state timer
      let currentPlaybackTime = stateTimer;
      if (currentAudioTrack && currentAudioTrack.currentTime > 0) {
        currentPlaybackTime = currentAudioTrack.currentTime;
      }
      const scrollOff = currentPlaybackTime * (scrollSpeed * 0.72); // Reduced speed for better audio sync

      // startY anchors the first line block. Start slightly higher than mid-screen.
      const startY = C.height * 0.55 - scrollOff;

      let yPos = startY;
      for (const line of prologueLines) {
        if (!line.text) { yPos += lineHeight * 0.6; continue; }
        if (line.text.startsWith('(')) { yPos += lineHeight * 0.5; continue; }

        if (yPos > -50 && yPos < C.height + 50) {
          const distFromCenter = Math.abs(yPos - C.height * 0.5);
          const maxDist = C.height * 0.55;
          X.globalAlpha = Math.max(0.05, 1 - (distFromCenter / maxDist));
          X.shadowBlur = 6; X.shadowColor = 'rgba(0,0,0,0.9)';

          if (line.style === 'title') { X.font = `bold ${fs(0.05)}px "Orbitron"`; X.fillStyle = line.color; }
          else if (line.style === 'bold') { X.font = `bold ${fs(0.024)}px "Orbitron"`; X.fillStyle = line.color || '#ffffff'; X.shadowBlur = 15; X.shadowColor = line.color || '#00ffff'; }
          else if (line.style === 'instruction') { X.font = `${fs(0.02)}px "Orbitron"`; X.fillStyle = line.color; }
          else if (line.style === 'italic') { X.font = `italic ${fs(0.022)}px "Orbitron"`; X.fillStyle = line.color || '#aaddff'; }
          else { X.font = `${fs(0.022)}px "Orbitron"`; X.fillStyle = line.color || '#cccccc'; }
          X.fillText(line.text, cx, yPos);
        }
        yPos += lineHeight;
      }
      X.restore();

      const audioEnded = currentAudioTrack && currentAudioTrack.ended;
      if (audioEnded || (keys[' '] && stateTimer > 2)) {
        if (window.speechSynthesis) speechSynthesis.cancel();
        if (currentAudioTrack) currentAudioTrack.pause();
        TransitionManager.fadeScreen(600, 200, 600, () => { startLevel(0); });
      }
    }
    else if (gameState === 'midpoint_reflexion') {
      stateTimer += dt;
      const cosmicG = X.createRadialGradient(C.width / 2, C.height / 2, 0, C.width / 2, C.height / 2, C.width);
      cosmicG.addColorStop(0, '#1a0033'); cosmicG.addColorStop(1, '#000000');
      X.fillStyle = cosmicG; X.fillRect(0, 0, C.width, C.height);

      // Shimmer: drifting purple nebula bands
      for (let n = 0; n < 3; n++) {
        X.save();
        X.globalAlpha = 0.04 + Math.sin(stateTimer * 0.4 + n * 1.5) * 0.02;
        const nebGrad = X.createLinearGradient(0, 0, C.width, C.height);
        const hue1 = (280 + n * 30 + stateTimer * 4) % 360;
        nebGrad.addColorStop(0, `hsla(${hue1}, 70%, 40%, 0.3)`);
        nebGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
        nebGrad.addColorStop(1, `hsla(${(hue1 + 50) % 360}, 80%, 35%, 0.2)`);
        X.fillStyle = nebGrad;
        X.fillRect(0, 0, C.width, C.height);
        X.restore();
      }

      // Center light beam (purple)
      X.save();
      X.globalAlpha = 0.05 + Math.sin(stateTimer * 0.6) * 0.025;
      const beamG = X.createLinearGradient(C.width * 0.42, 0, C.width * 0.58, 0);
      beamG.addColorStop(0, 'rgba(0,0,0,0)');
      beamG.addColorStop(0.4, 'rgba(180,0,255,0.25)');
      beamG.addColorStop(0.5, 'rgba(255,0,200,0.15)');
      beamG.addColorStop(0.6, 'rgba(180,0,255,0.25)');
      beamG.addColorStop(1, 'rgba(0,0,0,0)');
      X.fillStyle = beamG;
      X.fillRect(0, 0, C.width, C.height);
      X.restore();

      // V17: Beautiful Diagonal Purple/Pink Drifting Stars
      for (let i = 0; i < 60; i++) {
        const dirX = (i % 2 === 0 ? 1 : -1) * (0.5 + (i % 3) * 0.5);
        const dirY = 1.0 + (i % 4) * 0.3;

        const sx = (i * 173.7 + stateTimer * 15 * dirX);
        const sy = (i * 97.3 + stateTimer * 15 * dirY);

        const wrappedX = ((sx % C.width) + C.width) % C.width;
        const wrappedY = ((sy % C.height) + C.height) % C.height;

        const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(stateTimer * (0.3 + i * 0.1) + i));
        X.globalAlpha = twinkle;
        X.fillStyle = i % 2 === 0 ? '#ffccff' : (i % 3 === 0 ? '#cc88ff' : '#ee00ff');
        X.beginPath(); X.arc(wrappedX, wrappedY, 1.5 + (i % 3) * 0.6, 0, Math.PI * 2);
        X.shadowBlur = 10;
        X.shadowColor = X.fillStyle;
        X.fill();
      }
      X.globalAlpha = 1;
      X.shadowBlur = 0;

      const cx = C.width / 2; const fs = (pct) => Math.min(C.width * pct, C.height * pct * 1.8);
      X.save(); X.textAlign = 'center'; const lineHeight = fs(0.04);
      let scrollSpeed = 30;
      let safeDuration = 40;
      if (currentAudioTrack && currentAudioTrack.duration > 0 && currentAudioTrack.duration < Infinity) {
        safeDuration = currentAudioTrack.duration;
      }

      const totalHeight = Array.from(reflexionLines).reduce((acc, line) => acc + (line.text && !line.text.startsWith('(') ? lineHeight : 0), 0);
      scrollSpeed = ((C.height * 0.8) + totalHeight) / safeDuration;

      let currentPlaybackTime = stateTimer;
      if (currentAudioTrack && currentAudioTrack.currentTime > 0) {
        currentPlaybackTime = currentAudioTrack.currentTime;
      }
      const scrollOff = currentPlaybackTime * (scrollSpeed * 0.85); // 15% reduction for audio sync
      const startY = C.height * 0.75 - scrollOff;

      let yPos = startY;
      for (const line of reflexionLines) {
        if (!line.text) { yPos += lineHeight * 0.6; continue; }
        if (line.text.startsWith('(')) { yPos += lineHeight * 0.5; continue; }

        if (yPos > -50 && yPos < C.height + 50) {
          const distFromCenter = Math.abs(yPos - C.height * 0.5);
          const maxDist = C.height * 0.55;
          X.globalAlpha = Math.max(0.05, 1 - (distFromCenter / maxDist));
          X.shadowBlur = 6; X.shadowColor = 'rgba(0,0,0,0.9)';

          if (line.style === 'title') { X.font = `bold ${fs(0.05)}px "Orbitron"`; X.fillStyle = line.color; }
          else if (line.style === 'bold') { X.font = `bold ${fs(0.024)}px "Orbitron"`; X.fillStyle = line.color || '#ffffff'; X.shadowBlur = 15; X.shadowColor = line.color || '#00ffff'; }
          else if (line.style === 'instruction') { X.font = `${fs(0.02)}px "Orbitron"`; X.fillStyle = line.color; }
          else if (line.style === 'italic') { X.font = `italic ${fs(0.022)}px "Orbitron"`; X.fillStyle = line.color || '#aaddff'; }
          else { X.font = `${fs(0.022)}px "Orbitron"`; X.fillStyle = line.color || '#cccccc'; }

          X.fillText(line.text, cx, yPos);
        } yPos += lineHeight;
      } X.restore();

      const audioEnded2 = currentAudioTrack ? currentAudioTrack.ended : (stateTimer > 20); // Fallback length
      if (audioEnded2 || (keys[' '] && stateTimer > 2)) {
        if (window.speechSynthesis) speechSynthesis.cancel();
        if (currentAudioTrack) currentAudioTrack.pause();
        TransitionManager.fadeScreen(600, 200, 600, () => { startLevel(7); });
      }
    }
    else if (gameState === 'loading_screen') {
      stateTimer += dtRaw;

      // Pitch black atmosphere
      X.fillStyle = '#050011'; // Deep dark void
      X.fillRect(0, 0, C.width, C.height);

      // Calculate dot animation (0, 1, 2, or 3 dots depending on time)
      const dotCount = Math.floor(stateTimer * 2) % 4;
      const dots = ".".repeat(dotCount);

      // Draw centered LOADING text
      X.save();
      const cx = C.width / 2;
      const cy = C.height / 2;

      // Soft breathing пульс
      const alpha = 0.5 + 0.5 * Math.sin(stateTimer * Math.PI);
      X.globalAlpha = alpha;

      X.textAlign = 'center';
      X.textBaseline = 'middle';
      X.font = `bold ${C.height * 0.08}px "Orbitron"`;
      X.fillStyle = '#ffffff';

      // Cyber glow
      X.shadowBlur = 20;
      X.shadowColor = '#00ffff';

      X.fillText(`LOADING${dots}`, cx, cy);
      X.restore();
    }
    else if (gameState === 'vs_screen') {
      const vsBg = rawImgs['assets/UX_Main_Menu_Nexus.png'];
      if (vsBg && vsBg.complete) {
        if (vsBg.complete && vsBg.naturalWidth !== 0) {
          X.drawImage(vsBg, 0, 0, C.width, C.height);
        }
      } else {
        X.fillStyle = '#0a0022'; X.fillRect(0, 0, C.width, C.height);
      }

      if (stateTimer > 4.5) {
        startRound();
      }

      const slideIn1 = Math.max(0, (stateTimer - 2.5) * C.width);
      const slideIn2 = Math.max(0, (stateTimer - 2.5) * C.width);

      X.save(); X.translate(-slideIn1 + C.width * 0.25, C.height * 0.55);
      const p1ImgSrc = player.fighterDir + '/_right.png';
      const kCanv = processedSprites[p1ImgSrc] || rawImgs[p1ImgSrc];
      if (kCanv && kCanv.complete !== false && (kCanv.naturalWidth !== 0 || kCanv.width > 0)) {
        const scale = (C.height * 0.7) / kCanv.height;
        X.scale(scale, scale);
        X.drawImage(kCanv, -kCanv.width / 2, -kCanv.height / 2, kCanv.width, kCanv.height);
      }
      X.restore();

      X.save(); X.translate(C.width + slideIn2 - C.width * 0.25, C.height * 0.55);
      const eImgSrc = enemy.fighterDir + '/_left.png';
      const eCanv = processedSprites[eImgSrc] || rawImgs[eImgSrc];
      if (eCanv && eCanv.complete !== false && (eCanv.naturalWidth !== 0 || eCanv.width > 0)) {
        const scale = (C.height * 0.7) / eCanv.height;
        X.scale(scale, scale);
        X.drawImage(eCanv, -eCanv.width / 2, -eCanv.height / 2, eCanv.width, eCanv.height);
      }
      X.restore();

      X.save(); X.translate(C.width / 2, C.height / 2); X.rotate(Math.PI / 8);
      X.fillStyle = '#fff'; X.shadowBlur = 40; X.shadowColor = '#00ffff';
      X.fillRect(-10, -C.height, 20, C.height * 2); X.restore();

      X.font = `italic 900 ${Math.min(120, C.width * 0.15)}px "Orbitron"`;
      X.fillStyle = '#00ffff'; X.textAlign = 'center'; X.shadowBlur = 30; X.shadowColor = '#aa00ff';
      X.strokeStyle = '#fff'; X.lineWidth = 10;
      X.strokeText('VS', C.width / 2, C.height * 0.55); X.fillText('VS', C.width / 2, C.height * 0.55);

      const barH = 50; const barY = C.height - barH - 20;

      X.fillStyle = 'rgba(0, 50, 150, 0.8)'; X.fillRect(0, barY, C.width * 0.45, barH);
      X.fillStyle = '#00ffff'; X.fillRect(C.width * 0.45 - 5, barY, 5, barH);
      X.fillStyle = 'rgba(150, 0, 150, 0.8)'; X.fillRect(C.width * 0.55, barY, C.width * 0.45, barH);
      X.fillStyle = '#ff00ff'; X.fillRect(C.width * 0.55, barY, 5, barH);

      X.shadowBlur = 10; X.shadowColor = '#000';
      X.font = `bold ${Math.min(24, C.width * 0.035)}px "Orbitron"`;

      X.textAlign = 'left'; X.fillStyle = '#fff';
      if (gameMode === 'story') {
        X.fillText('🇩🇪 KEANO ROMEO', 20, barY + 35);
      } else {
        X.fillText(`${arcadeSelectedName || 'PLAYER 1'}`, 20, barY + 35);
      }
      X.textAlign = 'right';
      X.fillText(`${ld.activeName} ${ld.activeFlag || ''}`, C.width - 20, barY + 35);

      stateTimer -= dt;
      if (stateTimer <= 0) {
        startRound();
      }
    }
    else if (gameState === 'intro') {
      player.draw(); enemy.draw(); drawHUD(player, enemy, ld);
      stateTimer -= dt;

      if (stateTimer > 2.0) {
        X.fillStyle = `rgba(0,0,0,${Math.min(1, stateTimer - 2.0)})`; X.fillRect(0, 0, C.width, C.height);
      }

      const txt = roundNum >= 3 ? 'FINAL ROUND' : `ROUND ${roundNum}`;
      if (stateTimer > 1.5) {
        if (!this._announcedRound) {
          SFX.playCharacterVoice('announcer', roundNum >= 3 ? 'round_final' : (roundNum === 2 ? 'round_2' : 'round_1'));
          this._announcedRound = true;
        }
        drawBigText(txt, '#ffcc00', 1.0);
      } else if (stateTimer > 0.5) {
        drawBigText('READY...', '#ffffff', 0.8);
      } else if (stateTimer > 0) {
        if (!this._announcedFight) {
          SFX.playCharacterVoice('announcer', 'fight');
          this._announcedFight = true;
        }
        drawBigText('FIGHT!', '#ff0055', 1.3);
      }
      if (stateTimer <= 0) {
        gameState = 'fighting';
        this._announcedRound = false; this._announcedFight = false; // Reset for next round
        document.getElementById('btn-hamburger').classList.remove('hidden');
        if (isMobile) document.getElementById('mobile-controls').classList.remove('hidden');
      }
    }
    else if (gameState === 'fighting') {
      const simDt = dt * gameSpeedMult;

      if (gameTimerStyle !== 'infinite') {
        roundTimerNum -= simDt;
        if (roundTimerNum <= 0) roundTimerNum = 0;

        // V16 TENSION MUSIC: Timer falls below 30% -> speed up music!
        if (gameTimerStyle !== 'infinite' && roundTimerNum > 0 && roundTimerNum < (defaultRoundTime * 0.3)) {
          const bgmEl = document.getElementById('bgm-player');
          if (bgmEl && bgmEl.playbackRate < 1.15) {
            bgmEl.playbackRate = 1.15; // Smooth acceleration for tension
          }
        }
      }

      player.update(simDt, enemy); enemy.update(simDt, player);

      projectiles = projectiles.filter(p => {
        const alive = p.update(simDt);
        if (p.fromPlayer && p.checkHit(enemy)) return false;
        if (!p.fromPlayer && p.checkHit(player)) return false;
        return alive;
      });

      // V17.2: Draw stageObjects FIRST so they appear BEHIND the characters (Z-Index fix)
      stageObjects.forEach(obj => { obj.update(dt); obj.draw(); obj.checkHit(player); obj.checkHit(enemy); });
      stageObjects = stageObjects.filter(obj => !obj.deleted);

      if (player.state === 'punch' || player.state === 'kick' || player.state === 'super') { enemy.draw(); player.draw(); }
      else { player.draw(); enemy.draw(); }

      projectiles.forEach(p => p.draw());

      // Studio Polish 5: Action UI for Specials
      [player, enemy].forEach(f => {
        if (f && ['special', 'super', 'special_roll', 'special_flip', 'finisher'].includes(f.state) && f.stateTimer > 0.1) {
          X.save();
          X.translate(f.x, Math.max(C.height * 0.2, f.y - f.h * 1.2));
          X.scale(1.2 - (f.stateTimer * 0.5), 1.2 - (f.stateTimer * 0.5)); // Pop-in scale
          X.font = 'italic 900 35px "Orbitron"';
          X.textAlign = 'center';

          // Text colors based on move
          let txt = 'SPECIAL!'; let color = '#ffcc00'; let shadow = '#ff0000';
          if (f.state === 'super') { txt = 'SUPER!'; color = '#00ffff'; shadow = '#0000ff'; }
          else if (f.state === 'finisher') { txt = 'FINISHER!'; color = '#ff00ff'; shadow = '#ffffff'; }

          // Dim the whole screen slightly during SUPERS
          if (f.state === 'super' && f.stateTimer > 0.4) {
            X.fillStyle = 'rgba(0,0,0,0.3)'; X.fillRect(-C.width, -C.height, C.width * 2, C.height * 2);
          }

          X.fillStyle = color; X.shadowBlur = 20; X.shadowColor = shadow;
          X.strokeStyle = '#fff'; X.lineWidth = 4;
          X.strokeText(txt, 0, 0); X.fillText(txt, 0, 0);
          X.restore();
        }
      });

      drawHUD(player, enemy, ld);

      const timeOver = gameTimerStyle !== 'infinite' && roundTimerNum <= 0;
      if (enemy.hp <= 0 || player.hp <= 0 || timeOver) {
        gameState = 'ko'; stateTimer = 3.5;
        let winner = 'draw';
        if (player.hp > enemy.hp) winner = 'p1';
        else if (enemy.hp > player.hp) winner = 'p2';

        if (winner === 'p1') {
          p1Wins++; p1WonLast = true;
          enemy.state = 'ko';
          enemy.stateTimer = 99;

          let koSloMoBase = 0.15;
          let koOverhaulFader = (typeof FX_BYPASS !== 'undefined') ? FX_BYPASS.koOverhaul : 1.0;
          let finalKoTimeScale = koSloMoBase - (0.1 * koOverhaulFader); // Approaches 0.05 when fader is 1.0

          enemy.timeScale = finalKoTimeScale;
          player.timeScale = 1.0; player.state = 'idle'; // Sieger bleibt stehen
          player.shout("Victory.", 3.0, "win");
        }
        else if (winner === 'p2') {
          p2Wins++; p1WonLast = false;
          player.state = 'ko';
          player.stateTimer = 99;

          let koSloMoBase = 0.15;
          let koOverhaulFader = (typeof FX_BYPASS !== 'undefined') ? FX_BYPASS.koOverhaul : 1.0;
          let finalKoTimeScale = koSloMoBase - (0.1 * koOverhaulFader);

          player.timeScale = finalKoTimeScale;
          enemy.timeScale = 1.0; enemy.state = 'idle'; // Sieger bleibt stehen
          enemy.shout("Too weak.", 3.0, "win");
        }
        if (winner === 'draw') {
          let koSloMoBase = 0.15;
          let koOverhaulFader = (typeof FX_BYPASS !== 'undefined') ? FX_BYPASS.koOverhaul : 1.0;
          let finalKoTimeScale = koSloMoBase - (0.1 * koOverhaulFader);

          player.state = 'ko'; player.stateTimer = 99; player.timeScale = finalKoTimeScale;
          enemy.state = 'ko'; enemy.stateTimer = 99; enemy.timeScale = finalKoTimeScale;
        }

        // Massive KO Impact Vibration
        screenShake = 25;
      }
    }
    else if (gameState === 'ko') {
      // Allow independent updates for post-KO cinematic slow-motion logic
      player.update(dt, enemy); enemy.update(dt, player);

      // V17.2: Draw stageObjects FIRST (KO State Z-Index Fix)
      stageObjects.forEach(obj => { obj.update(dt); obj.draw(); obj.checkHit(player); obj.checkHit(enemy); });
      stageObjects = stageObjects.filter(obj => !obj.deleted);

      player.draw(); enemy.draw(); drawHUD(player, enemy, ld);

      let tStr = 'K.O.!'; let tc = '#ff0055'; let aVoice = 'ko';
      if (gameTimerStyle !== 'infinite' && roundTimerNum <= 0 && player.hp > 0 && enemy.hp > 0) {
        tStr = 'TIME OVER'; tc = '#ffcc00';
      } else if (p1WonLast && player.hp >= 100 && enemy.hp <= 0) {
        tStr = 'PERFECT!'; tc = '#00ff88'; aVoice = 'perfect';
      }

      if (stateTimer === 3.5 && !this._announcedKO) {
        SFX.playCharacterVoice('announcer', aVoice);
        this._announcedKO = true;
      }
      drawBigText(tStr, tc, 1.5); stateTimer -= dt;

      if (stateTimer <= 0) {
        this._announcedKO = false;
        let roundsToWin = 2;
        if (gameMode === 'story') roundsToWin = 1;
        // else defaults to 2 (Best of 3)

        if (p1Wins >= roundsToWin) {
          // Studio Polish: Hardcode Story Finale to Vikingo Boss (Index 13). Arcade goes till the very end.
          const isFinale = (gameMode === 'story' && currentLevel >= 13) || (gameMode === 'arcade' && currentLevel >= LEVELS.length - 1);

          if (isFinale) {
            if (gameMode === 'story') {
              localStorage.setItem('arcadeUnlocked', 'true');
              ['btn-arcade', 'btn-versus'].forEach(id => {
                const b = document.getElementById(id);
                if (b) { b.disabled = false; b.style.color = '#00ffff'; b.style.borderColor = '#00ffff'; b.style.cursor = 'pointer'; b.style.opacity = '1'; }
              });
              document.getElementById('btn-arcade').textContent = 'ARCADE MODUS';
              document.getElementById('btn-versus').textContent = 'VERSUS MODUS';
            }
            TransitionManager.fadeScreen(800, 300, 600, () => {
              // SFX.stopMusic(); // User Request: Keep Boss Theme playing!
              // Studio Polish: Epic Epilogue Theme
              // SFX.playBGM('assets/audio/music/end_theme.mp3');

              document.getElementById('btn-hamburger').classList.add('hidden');
              if (isMobile) document.getElementById('mobile-controls').classList.add('hidden');
              playingOutro = false; playingHappyBirthday = false;
              playEpicVoice(epilogLines, 'epilogue');
            });
          } else {
            TransitionManager.fadeScreen(400, 150, 400, () => {
              gameState = 'nextLevel'; stateTimer = 1.5;
            });
          }
        } else if (p2Wins >= roundsToWin) {
          gameState = 'continue'; stateTimer = 9.99;
        } else {
          roundNum++; startRound();
        }
      }
    }
    else if (gameState === 'nextLevel') {
      // Skip arcadeOnly fighters when calculating the next opponent level
      let nextLvl = currentLevel + 1;
      while (LEVELS[nextLvl] && LEVELS[nextLvl].arcadeOnly) {
        nextLvl++;
      }

      drawBigText(`STAGE ${LEVELS[nextLvl]?._lvl || nextLvl + 1}`, '#00ffff', 1.2);
      X.save(); X.font = 'bold 22px "Orbitron"'; X.textAlign = 'center'; X.fillStyle = '#fff';
      if (LEVELS[nextLvl]) {
        X.fillText(LEVELS[nextLvl].flag + ' ' + LEVELS[nextLvl].name, C.width / 2, C.height * 0.58);
      }
      X.restore();
      stateTimer -= dt; if (stateTimer <= 0) {
        TransitionManager.fadeScreen(400, 150, 400, () => {
          currentLevel = nextLvl - 1; // It increments inside startLevel usually, or we adjust startLevel logic. Wait, startLevel takes the ID. 
          startLevel(nextLvl);
        });
      }
    }
    else if (gameState === 'continue') {
      X.fillStyle = 'rgba(0,0,0,0.85)'; X.fillRect(0, 0, C.width, C.height);

      if (stateTimer > 9.9 && !this._announcedCont) {
        // SFX.playCharacterVoice('announcer', 'continue'); // Removed for final polish
        this._announcedCont = true;
      }

      drawBigText('CONTINUE?', '#ffcc00', 1.2);
      X.save(); X.font = 'bold 120px "Orbitron"'; X.fillStyle = '#fff'; X.textAlign = 'center';
      X.fillText(Math.ceil(stateTimer), C.width / 2, C.height * 0.65);
      stateTimer -= dt;
      if (stateTimer <= 0) { useCredit(); gameState = 'gameOver'; stateTimer = 3; this._announcedCont = false; }
      X.font = '20px "Orbitron"'; X.globalAlpha = 0.5 + Math.sin(time * 5) * 0.5;
      X.fillText('PRESS SPACE OR TAP TO CONTINUE', C.width / 2, C.height * 0.85);
      // Show remaining credits
      X.globalAlpha = 1; X.font = '16px "Orbitron"'; X.fillStyle = '#00ffff';
      X.fillText(`🪙 CREDITS: ${arcadeCredits}`, C.width / 2, C.height * 0.92);

      if (keys[' '] && stateTimer < 9.5) {
        keys[' '] = false; // Consume purely
        if (arcadeCredits > 0) {
          useCredit();
          p1Wins = 0; p2Wins = 0; roundNum = 1;
          SFX.stopMusic(); // Stop continue music
          startLevel(currentLevel);
        } else {
          SFX.hitBlock(); // Error sound if no credits
        }
      }
      X.restore();
    }
    else if (gameState === 'gameOver') {
      X.fillStyle = 'rgba(0,0,0,0.9)'; X.fillRect(0, 0, C.width, C.height);
      if (stateTimer === 3 && !this._announcedGameOver) {
        SFX.playCharacterVoice('announcer', 'game_over');
        this._announcedGameOver = true;
      }
      drawBigText('GAME OVER', '#ff0033', 1.5);
      X.save(); X.font = '20px "Orbitron"'; X.fillStyle = '#fff'; X.textAlign = 'center';
      X.globalAlpha = 0.5 + Math.sin(time * 5) * 0.5;
      X.fillText('TAP TO RETURN TO MENU', C.width / 2, C.height * 0.7);
      // Show credit status
      X.globalAlpha = 1; X.font = '16px "Orbitron"';
      X.fillStyle = arcadeCredits > 0 ? '#00ffff' : '#ff0033';
      X.fillText(arcadeCredits > 0 ? `🪙 CREDITS: ${arcadeCredits}` : '🪙 NO CREDITS!', C.width / 2, C.height * 0.78);

      if (keys[' '] && stateTimer <= 2.5) {
        keys[' '] = false;
        quitToMenu();
      }

      stateTimer -= dt; // Ensure this ticks down if we want the 3s delay
      if (stateTimer <= 0 && !keys[' ']) {
        this._announcedGameOver = false;
        quitToMenu();
      }

      X.restore();
    }
    else if (gameState === 'victory') {
      stateTimer += dt; fwTimer -= dt;
      if (fwTimer <= 0) {
        fireworks.push(new Firework(C.width * 0.2 + Math.random() * C.width * 0.6, C.height * 0.1 + Math.random() * C.height * 0.4));
        fwTimer = 0.5 + Math.random() * 1.5;
      }
      fireworks.forEach(f => { f.update(); f.draw(); });

      let linesToUse = epilogLines;
      let scrollSpeedMultiplier = 0.85; // Calibrated reduction

      if (!playingHappyBirthday) {
        X.save();
        const cx = C.width / 2; const fs = (pct) => Math.min(C.width * pct, C.height * pct * 1.8);
        X.textAlign = 'center';
        X.fillStyle = 'rgba(0,0,0,0.85)'; X.fillRect(0, 0, C.width, C.height);

        // Shimmer: golden/cyan nebula for victory
        for (let n = 0; n < 3; n++) {
          X.save();
          X.globalAlpha = 0.03 + Math.sin(stateTimer * 0.25 + n * 2) * 0.015;
          const vGrad = X.createLinearGradient(0, 0, C.width, C.height);
          const hue1 = (40 + n * 50 + stateTimer * 3) % 360;
          vGrad.addColorStop(0, `hsla(${hue1}, 80%, 55%, 0.3)`);
          vGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
          vGrad.addColorStop(1, `hsla(${(hue1 + 80) % 360}, 70%, 45%, 0.2)`);
          X.fillStyle = vGrad;
          X.fillRect(0, 0, C.width, C.height);
          X.restore();
        }
        // Golden light beam
        X.save();
        X.globalAlpha = 0.05 + Math.sin(stateTimer * 0.5) * 0.025;
        const vBeam = X.createLinearGradient(C.width * 0.43, 0, C.width * 0.57, 0);
        vBeam.addColorStop(0, 'rgba(0,0,0,0)');
        vBeam.addColorStop(0.35, 'rgba(255,200,50,0.2)');
        vBeam.addColorStop(0.5, 'rgba(0,255,255,0.15)');
        vBeam.addColorStop(0.65, 'rgba(255,200,50,0.2)');
        vBeam.addColorStop(1, 'rgba(0,0,0,0)');
        X.fillStyle = vBeam;
        X.fillRect(0, 0, C.width, C.height);
        X.restore();

        const lineHeight = fs(0.04);

        if (playingOutro) { linesToUse = outroLines; scrollSpeedMultiplier = 0.80; } // slightly slower for Outro

        let scrollSpeed = 35;
        let safeDuration = 45;
        if (currentAudioTrack && currentAudioTrack.duration > 0 && currentAudioTrack.duration < Infinity) {
          safeDuration = currentAudioTrack.duration;
        }

        const totalHeight = Array.from(linesToUse).reduce((acc, line) => acc + (line.text && !line.text.startsWith('(') ? lineHeight : 0), 0);
        scrollSpeed = ((C.height * 0.8) + totalHeight) / safeDuration;

        let currentPlaybackTime = stateTimer;
        if (currentAudioTrack && currentAudioTrack.currentTime > 0) {
          currentPlaybackTime = currentAudioTrack.currentTime;
        }
        const scrollOff = currentPlaybackTime * (scrollSpeed * scrollSpeedMultiplier);
        const startY = C.height * 0.75 - scrollOff; // Start lower down
        let yPos = startY;

        for (const line of linesToUse) {
          if (!line.text) { yPos += lineHeight * 0.6; continue; }
          if (line.text.startsWith('(')) { yPos += lineHeight * 0.5; continue; }

          if (yPos > -50 && yPos < C.height + 50) {
            const distFromCenter = Math.abs(yPos - C.height * 0.5); const maxDist = C.height * 0.55;
            X.globalAlpha = Math.max(0.05, 1 - (distFromCenter / maxDist));
            X.shadowBlur = 6; X.shadowColor = 'rgba(0,0,0,0.9)';

            if (line.style === 'producer') {
              if (window._caesarWhiteImg && window._caesarWhiteImg.complete) {
                const iw = C.width * 0.45;
                const ih = iw * (window._caesarWhiteImg.height / window._caesarWhiteImg.width);
                X.shadowBlur = 20; X.shadowColor = 'rgba(255,255,255,0.4)';
                X.drawImage(window._caesarWhiteImg, cx - iw / 2, yPos - ih / 2, iw, ih);
                yPos += ih * 0.6;
              } else {
                X.font = `bold ${fs(0.035)}px "Orbitron"`; X.fillStyle = '#ffffff'; X.shadowColor = '#ffffff'; X.shadowBlur = 15;
                X.fillText(line.text, cx, yPos);
              }
            } else {
              if (line.style === 'title') { X.font = `bold ${fs(0.05)}px "Orbitron"`; X.fillStyle = line.color; }
              else if (line.style === 'bold') { X.font = `bold ${fs(0.024)}px "Orbitron"`; X.fillStyle = line.color || '#ffffff'; X.shadowBlur = 15; X.shadowColor = line.color || '#00ffff'; }
              else if (line.style === 'instruction') { X.font = `${fs(0.02)}px "Orbitron"`; X.fillStyle = line.color; }
              else if (line.style === 'italic') { X.font = `italic ${fs(0.022)}px "Orbitron"`; X.fillStyle = line.color || '#aaddff'; }
              else { X.font = `${fs(0.022)}px "Orbitron"`; X.fillStyle = line.color || '#cccccc'; }
              X.fillText(line.text, cx, yPos);
            }
          } yPos += lineHeight;
        } X.restore();

        const audioEnded3 = currentAudioTrack ? currentAudioTrack.ended : (stateTimer > 25);
        if (audioEnded3 || (keys[' '] && stateTimer > 2)) {
          if (window.speechSynthesis) speechSynthesis.cancel();
          if (currentAudioTrack) currentAudioTrack.pause();
          if (!playingOutro) {
            playingOutro = true; stateTimer = 0; playEpicVoice(outroLines, 'outro'); keys[' '] = false;
          } else if (!playingHappyBirthday) {
            playingHappyBirthday = true; stateTimer = 0; keys[' '] = false;
            SFX.playBGM('assets/audio/music/end.mp3', false);
          }
        }
      }

      if (playingHappyBirthday) {
        X.save();

        // 1. Keano Victor Background Fade-In
        const vImg = rawImgs['assets/fighter/keano/_epic.png'];
        if (vImg) {
          X.globalAlpha = Math.min(0.3, stateTimer * 0.05); // Very slow, majestic fade
          const scale = Math.max(C.width / vImg.naturalWidth, C.height / vImg.naturalHeight);
          const w = vImg.naturalWidth * scale;
          const h = vImg.naturalHeight * scale;
          X.drawImage(vImg, (C.width - w) / 2, (C.height - h) / 2, w, h);
          X.fillStyle = 'rgba(0,0,0,0.5)'; // Darken overlay so text is readable
          X.fillRect(0, 0, C.width, C.height);
        }
        X.globalAlpha = 1.0;

        const cx = C.width / 2;
        const fs = (pct) => Math.min(C.width * pct, C.height * pct * 1.8);
        const scrollSpeed = 22;
        const lineHeight = fs(0.04);
        const gapHeight = lineHeight * 0.6;
        const gapSmHeight = lineHeight * 0.3;
        const totalScrollY = stateTimer * scrollSpeed;
        const startY = C.height + 80;

        let yPos = startY - totalScrollY;
        for (const line of birthdayLines) {
          if (line.style === 'gap') { yPos += gapHeight; continue; }
          if (line.style === 'gap-sm') { yPos += gapSmHeight; continue; }

          if (yPos > -50 && yPos < C.height + 50) {
            const distFromCenter = Math.abs(yPos - C.height * 0.45);
            const maxDist = C.height * 0.55;
            X.globalAlpha = Math.max(0.05, 1 - (distFromCenter / maxDist));
            X.textAlign = 'center';
            X.shadowBlur = 6; X.shadowColor = 'rgba(0,0,0,0.9)';

            if (line.style === 'title') { X.font = `bold ${fs(0.05)}px "Orbitron"`; X.fillStyle = line.color; X.shadowBlur = 30; X.shadowColor = '#ff8800'; }
            else if (line.style === 'mega') { X.font = `bold ${fs(0.055)}px "Orbitron"`; X.fillStyle = line.color; X.shadowBlur = 40; X.shadowColor = '#ff8800'; }
            else if (line.style === 'narr') { X.font = `${fs(0.022)}px "Orbitron"`; X.fillStyle = '#cccccc'; }
            else if (line.style === 'italic') { X.font = `italic ${fs(0.022)}px "Orbitron"`; X.fillStyle = line.color || '#aaddff'; }
            else if (line.style === 'bold') { X.font = `bold ${fs(0.024)}px "Orbitron"`; X.fillStyle = line.color || '#ffffff'; X.shadowBlur = 15; X.shadowColor = line.color || '#00ffff'; }
            else if (line.style === 'glow') { X.font = `italic 900 ${fs(0.035)}px "Orbitron"`; X.fillStyle = line.color; X.shadowBlur = 40; X.shadowColor = line.color; }
            else if (line.style === 'divider') { X.font = `${fs(0.03)}px "Orbitron"`; X.fillStyle = line.color; }
            else if (line.style === 'producer') { X.font = `italic 900 ${fs(0.04)}px "Press Start 2P"`; X.fillStyle = '#ff0033'; X.shadowBlur = 20; X.shadowColor = '#ff0033'; X.strokeStyle = '#fff'; X.lineWidth = 2; }

            X.fillText(line.text, cx, yPos);
            if (line.style === 'producer') X.strokeText(line.text, cx, yPos);

            if (line.text.includes('Lichtkristall') && distFromCenter < C.height * 0.1 && !window._fwT) {
              window._fwT = true;
              if (SFX.magicHit) SFX.magicHit(); // Explosive present
              // Massive Starburst Effect
              for (let i = 0; i < 200; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 30; // fast burst
                particles.push({
                  x: cx, y: yPos,
                  vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                  life: 2.0 + Math.random() * 3,
                  color: ['#00ffff', '#ffcc00', '#ff0033'][Math.floor(Math.random() * 3)],
                  size: 4 + Math.random() * 8, isSpark: true
                });
              }
            } else if (line.text.includes('Lichtkristall') && distFromCenter < C.height * 0.1 && window._fwT && Math.random() < 0.2) {
              // Residual dripping sparks off the crystal text
              for (let i = 0; i < 15; i++) {
                particles.push({
                  x: cx + (Math.random() - 0.5) * C.width * 0.4, y: yPos + (Math.random() - 0.5) * 30,
                  vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10,
                  life: 1.0 + Math.random(), color: Math.random() > 0.5 ? '#00ffff' : '#ffcc00',
                  size: 2 + Math.random() * 4, isSpark: Math.random() > 0.5
                });
              }
            }
          }
          yPos += lineHeight;
        }

        particles.forEach(p => {
          p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life -= dt;
          if (p.life > 0) { X.save(); X.globalAlpha = Math.min(1, p.life); X.fillStyle = p.color; X.shadowBlur = 10; X.shadowColor = p.color; X.fillRect(p.x, p.y, p.size, p.size); X.restore(); }
        });
        particles = particles.filter(p => p.life > 0);
        X.restore();
      }
    }

    // Post-Review 9: Render Shooting Stars overlay in cinematics
    if (['splash', 'menu', 'prologue', 'midpoint_reflexion', 'credits'].includes(gameState)) {
      updateAndDrawShootingStars(dtRaw);
    }

    if (flashTimer > 0) {
      let flashFader = (typeof FX_BYPASS !== 'undefined') ? FX_BYPASS.hitFlash : 1.0;
      if (flashFader > 0) {
        X.save(); X.globalAlpha = Math.min(1.0, flashTimer * 2 * flashFader); X.fillStyle = '#fff'; X.fillRect(0, 0, C.width, C.height); X.restore();
      }
      flashTimer -= dt;
    }
    X.restore();

  } catch (err) {
    if (!window._loopErrLogged) {
      window._loopErrLogged = true; console.error('GAMELOOP ERROR:', err.message, err.stack);
    }
  }
}

// ===== MENU LOGIC =====
