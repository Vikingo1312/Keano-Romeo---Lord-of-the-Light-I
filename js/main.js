// ===== MENU LOGIC =====
window.openCharacterSelect = function (mode) {
  gameMode = mode;
  document.getElementById('main-menu').classList.add('hidden');
  const csEl = document.getElementById('char-select');
  csEl.classList.remove('hidden');
  // Reset background to default dark cosmic gradient
  csEl.style.background = 'linear-gradient(135deg, #0a001a 0%, #000033 100%)';
  csEl.style.backgroundSize = '';

  const grid = document.getElementById('cs-grid');
  grid.innerHTML = '';

  // Build roster: Keano first, then story fighters (0-13), then variant slots at end
  const storyFighters = LEVELS.slice(0, 14); // Original story roster (no Cyber-Commando)
  const variantFighters = LEVELS.slice(14);   // Supreme, Hyper, Jay X, Vikingo Prime, Dark Gargamel
  const roster = [KEANO, ...storyFighters, ...variantFighters];

  roster.forEach((fighter, idx) => {
    const div = document.createElement('div');
    const isVariant = idx > 14;
    div.className = 'cs-portrait' + (fighter.name === 'DARK VIKINGO' ? ' boss' : '') + (isVariant ? ' variant' : '');
    const img = document.createElement('img');

    // Grid thumbnails: Use clean _front.png from fighter directories
    const frontPath = fighter.fighterDir + '/_front.png';
    if (rawImgs[frontPath] && rawImgs[frontPath].src) {
      img.src = rawImgs[frontPath].src;
    } else {
      img.src = frontPath;
    }

    // Add fighter name label below portrait
    const label = document.createElement('span');
    label.className = 'cs-portrait-name';
    label.textContent = fighter.flag + ' ' + fighter.name;
    div.appendChild(img);
    div.appendChild(label);

    div.onclick = () => {
      SFX.uiHover();
      document.querySelectorAll('.cs-portrait').forEach(el => el.classList.remove('selected'));
      div.classList.add('selected');

      arcadeSelectedFighter = fighter;
      arcadeSelectedName = fighter.name;
      currentLevel = idx === 0 ? 0 : idx - 1;
      if (currentLevel < 0) currentLevel = 0;

      // Right preview: Use epic portrait (full wallpaper) or fallback to _front.png
      const previewImg = document.getElementById('cs-preview-img');
      if (fighter.portrait) {
        previewImg.src = fighter.portrait;
      } else {
        previewImg.src = img.src;
      }
      document.getElementById('cs-flag').textContent = fighter.flag;
      document.getElementById('cs-name').textContent = fighter.name;
      document.getElementById('cs-title-label').textContent = fighter.title || 'STREET FIGHTER';
      document.getElementById('cs-desc').textContent = fighter.desc || '';

      // Stats: Use the `str` object (spd/pow/def on a scale of 1-7)
      const maxStat = 7;
      document.getElementById('stat-spd').style.width = Math.min((fighter.str?.spd || 3) / maxStat * 100, 100) + '%';
      document.getElementById('stat-pow').style.width = Math.min((fighter.str?.pow || 3) / maxStat * 100, 100) + '%';
      document.getElementById('stat-def').style.width = Math.min((fighter.str?.def || 3) / maxStat * 100, 100) + '%';

      document.getElementById('btn-confirm-fighter').textContent = 'FIGHT!';

      // Background: Hot-swap to the Arena stage (not the portrait with text)
      if (fighter.stage) {
        csEl.style.background = `url('${fighter.stage}') no-repeat center center`;
        csEl.style.backgroundSize = 'cover';
      }
    };

    grid.appendChild(div);
  });

  // Auto-select Keano (first fighter) so his card shows immediately
  const firstPortrait = grid.querySelector('.cs-portrait');
  if (firstPortrait) firstPortrait.click();
};

// V3: Bind FIGHT Button explicitly to use TransitionManager
document.getElementById('btn-confirm-fighter').addEventListener('click', () => {
  // Must have selected a fighter
  if (!arcadeSelectedFighter) return;

  if (gameMode === 'arcade') {
    const keanoStats = KEANO.str;
    player = new HybridFighter(100, GROUND(), true, '#00aaff', Object.assign({}, KEANO, {
      hpScale: 1, dmgScale: 1
    }));
    enemy = new HybridFighter(500, GROUND(), false, '#ff4400', Object.assign({}, LEVELS[currentLevel], {
      hpScale: gameDifficulty === 'hard' ? 1.5 : (gameDifficulty === 'easy' ? 0.7 : 1),
      dmgScale: gameDifficulty === 'hard' ? 1.5 : (gameDifficulty === 'easy' ? 0.8 : 1)
    }));
    enemy.x = C.width - 150;
  } else if (gameMode === 'versus') {
    // Assuming P1 and P2 selection logic is handled elsewhere, the selected characters are in `player` and `enemy` variables
    player.x = 100;
    enemy.x = C.width - 150;
    // Ensure they face each other
    player.facingRight = true;
    enemy.facingRight = false;
  }

  SFX.uiSelect();

  TransitionManager.switchState({
    hideDOM: ['char-select'],
    setGameState: 'vs_screen',
    fadeIn: 500, wait: 200, fadeOut: 500,
    onSwap: () => {
      SFX.playBGM('assets/audio/music/vs_screen.mp3');
      stateTimer = 0;
      // Trigger epic VS Voice or effect here if desired!
    }
  });
});

window.toggleOptions = function () {
  const panel = document.getElementById('pause-menu');
  if (!panel) return;
  const isVisible = !panel.classList.contains('hidden');
  if (isVisible) {
    panel.classList.add('hidden');
    if (gameState === 'options-paused') { gameState = 'fighting'; lastTime = performance.now(); }
  } else {
    panel.classList.remove('hidden');
    if (gameState === 'fight' || gameState === 'fighting') { gameState = 'options-paused'; }
  }
};

window.togglePause = function () {
  const overlay = document.getElementById('pause-menu');
  if (!overlay) return;
  const isVisible = !overlay.classList.contains('hidden');
  if (isVisible) {
    overlay.classList.add('hidden');
    if (gameState === 'paused' || gameState === 'options-paused') { gameState = 'fighting'; lastTime = performance.now(); }
  } else {
    if (gameState === 'fight' || gameState === 'fighting') { gameState = 'options-paused'; overlay.classList.remove('hidden'); }
  }
};

window.quitToMenu = function () {
  document.getElementById('pause-menu').classList.add('hidden');
  TransitionManager.fadeScreen(400, 150, 400, () => {
    if (document.getElementById('mobile-controls')) document.getElementById('mobile-controls').classList.add('hidden');
    if (document.getElementById('btn-hamburger')) document.getElementById('btn-hamburger').classList.add('hidden');
    document.getElementById('char-select').classList.add('hidden');
    SFX.stopMusic();
    if (typeof stopEpicVoice === 'function') stopEpicVoice(); // Force stop any running voice-overs
    // --- V7 QA AUTORUN HARNESS ---
    if (window.location.search.includes('qa=true')) {
      console.log("[QA] Initializing Automated Test Run...");
      qaLogger.style.display = 'block';
      qaLogger.innerHTML += '<strong>[QA] AUTORUN ENGAGED.</strong><br>';

      gameMode = 'arcade';
      currentLevel = 0;
      arcadeSelectedName = 'KEANO';

      // Force instantaneous transitions for QA
      TransitionManager.switchState({
        hideDOM: ['main-menu', 'char-select'],
        setGameState: 'versus', // Skip select, go straight to fight prep
        fadeIn: 10, wait: 10, fadeOut: 10,
        onSwap: () => {
          player = new HybridFighter(C.width * 0.22, GROUND(), true, KEANO.col, KEANO);
          enemy = new HybridFighter(C.width * 0.78, GROUND(), false, ld.col, ld);

          startRound();

          // QA Master Bot Loop - Persists across matches!
          let fCount = 0;
          let isFinished = false;
          setInterval(() => {
            if (isFinished) return;
            fCount++;

            // Track frame drops - roughly if loop missed ticks (rudimentary measure placed here for heartbeat)

            if (gameState === 'fighting') {
              if (fCount % 20 === 0) { // Every 20 ticks
                // Simulate P1
                const p1actions = ['punch', 'kick', 'jump', 'right', 'special', 'super', 'evade_back'];
                handleAction(p1actions[Math.floor(Math.random() * p1actions.length)], true);
                // Simulate P2
                const p2actions = ['punch', 'kick', 'jump', 'left', 'special', 'super', 'roll_forward'];
                handleAction(p2actions[Math.floor(Math.random() * p2actions.length)], false);
              }
            }
            else if (gameState === 'continue' || gameState === 'gameOver' || gameState === 'prologue' || gameState === 'epilogue' || gameState === 'midpoint_reflexion') {
              if (fCount % 30 === 0) {
                keys[' '] = true; // Auto-skip / auto-continue
                setTimeout(() => keys[' '] = false, 50);
              }
            }
            else if (gameState === 'victory' && stateTimer > 5.0) {
              isFinished = true;
              qaLogger.style.display = 'block';
              qaLogger.style.width = '80%';
              qaLogger.style.top = '10%';
              qaLogger.style.left = '10%';
              qaLogger.innerHTML = QATracker.print();
            }
          }, 16);
        }
      });
      return; // Block standard boot
    }
    // --- END QA HARNESS ---

    document.getElementById('main-menu').classList.remove('hidden');
    gameState = 'menu';
    document.getElementById('btn-start-menu').addEventListener('click', () => {
      SFX.init();
      SFX.playBGM('assets/audio/music/main_soundtrack.mp3');

      // Bind UI Sounds to all interactive elements
      document.querySelectorAll('.menu-btn, .action-btn, .slot-container, input[type="range"], input[type="checkbox"]').forEach(el => {
        el.addEventListener('mouseenter', () => SFX.uiHover());
        el.addEventListener('click', () => SFX.uiSelect());
      });
    });
  });
};

function bootGame() {
  const overlay = document.getElementById('audio-unlock-overlay');
  if (overlay) overlay.style.display = 'flex';

  // Strictly prevent game from starting before assets load and user interacts
  const initClick = () => {
    if (gameState === 'init') {
      if (!isGameLoaded) return; // Wait for assets to finish!

      // Unlock Web Audio Context
      if (AC.state === 'suspended') AC.resume();

      if (overlay) overlay.style.display = 'none';

      // Start CAPCOM style intro
      gameState = 'splash';
      stateTimer = 0;

      // Play a heavy synthesized impact for the logo
      // Gentle, harmonious "Unlock" Chime
      const freqs = [440, 554.37, 659.25]; // A major chord
      freqs.forEach(f => {
        const osc = AC.createOscillator();
        const gain = AC.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, AC.currentTime);
        gain.gain.setValueAtTime(0.05, AC.currentTime); // Very quiet
        gain.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 1.0);
        osc.connect(gain); gain.connect(AC.destination);
        osc.start(); osc.stop(AC.currentTime + 1.0);
      });

      document.removeEventListener('click', initClick);
      document.removeEventListener('keydown', initClick);
    }
  };

  document.addEventListener('click', initClick);
  document.addEventListener('keydown', initClick);

  requestAnimationFrame(gameLoop);
}

// Bind story mode directly
document.getElementById('btn-story').addEventListener('click', () => {
  gameMode = 'story';
  TransitionManager.switchState({
    hideDOM: ['main-menu'],
    setGameState: 'prologue',
    fadeIn: 600, wait: 200, fadeOut: 800,
    onSwap: () => {
      SFX.playBGM('assets/audio/music/prologue.mp3');
      stateTimer = 0;
      playEpicVoice(prologueLines, 'prologue');
    }
  });
});

document.getElementById('btn-arcade').addEventListener('click', () => {
  if (!document.getElementById('btn-arcade').disabled) {
    // Mobile Polish: Force App-Fullscreen
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(e => console.log('FS blocked'));
    }
    SFX.playBGM('assets/audio/music/char_select.mp3');
    TransitionManager.switchState({
      hideDOM: ['main-menu'],
      showDOM: ['char-select'],
      setGameState: 'select',
      fadeIn: 300, wait: 50, fadeOut: 300,
      onSwap: () => {
        openCharacterSelect('arcade');
      }
    });
  }
});

document.getElementById('btn-versus').addEventListener('click', () => {
  if (!document.getElementById('btn-versus').disabled) {
    // Mobile Polish: Force App-Fullscreen
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(e => console.log('FS blocked'));
    }
    SFX.playBGM('assets/audio/music/char_select.mp3');
    TransitionManager.switchState({
      hideDOM: ['main-menu'],
      showDOM: ['char-select'],
      setGameState: 'select',
      fadeIn: 300, wait: 50, fadeOut: 300,
      onSwap: () => {
        openCharacterSelect('versus');
      }
    });
  }
});

document.getElementById('btn-options-menu').addEventListener('click', toggleOptions);
document.getElementById('btn-hamburger').addEventListener('click', toggleOptions);

// INSERT COIN: Click to refill credits when empty
if (document.getElementById('insert-coin-bar')) {
  document.getElementById('insert-coin-bar').addEventListener('click', insertCoin);
}// RESUME button in pause menu
document.getElementById('btn-resume').addEventListener('click', () => {
  document.getElementById('pause-menu').classList.add('hidden');
  if (gameState === 'options-paused') { gameState = 'fighting'; lastTime = performance.now(); }
});

// QUIT TO MENU button in pause menu
document.getElementById('btn-quit').addEventListener('click', () => {
  quitToMenu();
});

// Show hamburger button in main menu too (so OPTIONS always works)
document.getElementById('btn-hamburger').classList.remove('hidden');

// SKIP button: triggers space key to skip voice sequences
document.getElementById('btn-skip-sequence').addEventListener('click', () => {
  keys[' '] = true;
  document.getElementById('btn-skip-sequence').classList.add('hidden'); // Hide immediately to prevent double triggers
  setTimeout(() => keys[' '] = false, 200);
});

// START QA MODE DIRECTLY FROM MENU
const btnTest = document.getElementById('btn-test-mode');
if (btnTest) {
  btnTest.addEventListener('click', () => {
    // Set flag and reload basically
    if (!window.location.search.includes('qa=true')) {
      window.location.href = window.location.pathname + "?qa=true";
    }
  });
}

// Show/hide skip button based on game state
function updateSkipButton() {
  const skipBtn = document.getElementById('btn-skip-sequence');
  if (!skipBtn) return;
  const showStates = ['prologue', 'midpoint_reflexion', 'victory'];
  if (showStates.includes(gameState) && stateTimer > 2) {
    skipBtn.classList.remove('hidden');
  } else {
    skipBtn.classList.add('hidden');
  }
}
if (document.getElementById('sel-round-time')) {
  document.getElementById('sel-round-time').addEventListener('change', (e) => {
    defaultRoundTime = parseInt(e.target.value, 10);
  });
}
if (document.getElementById('sel-game-speed')) {
  document.getElementById('sel-game-speed').addEventListener('change', (e) => {
    gameSpeedMult = parseFloat(e.target.value);
  });
}
// ===== GAMEPAD / CONTROLLER SUPPORT (Mac + Windows + Linux) =====
// Works with: Xbox, PlayStation, Switch Pro, generic USB controllers
// Uses standard W3C Gamepad API — no plugins needed
let gamepadConnected = false;

window.addEventListener('gamepadconnected', (e) => {
  gamepadConnected = true;
  console.log(`🎮 Controller connected: ${e.gamepad.id} (${e.gamepad.buttons.length} buttons, ${e.gamepad.axes.length} axes)`);
});
window.addEventListener('gamepaddisconnected', (e) => {
  gamepadConnected = false;
  console.log(`🎮 Controller disconnected: ${e.gamepad.id}`);
});

function pollGamepad() {
  if (!navigator.getGamepads) return;
  const pads = navigator.getGamepads();
  for (let i = 0; i < pads.length; i++) {
    const pad = pads[i];
    if (!pad || !pad.connected) continue;

    const dz = 0.3; // Deadzone for analog sticks
    // D-pad + Left stick
    keys['arrowup'] = keys['arrowup'] || pad.buttons[12]?.pressed || pad.axes[1] < -dz;
    keys['arrowdown'] = keys['arrowdown'] || pad.buttons[13]?.pressed || pad.axes[1] > dz;
    keys['arrowleft'] = keys['arrowleft'] || pad.buttons[14]?.pressed || pad.axes[0] < -dz;
    keys['arrowright'] = keys['arrowright'] || pad.buttons[15]?.pressed || pad.axes[0] > dz;

    // Action buttons (standard mapping: 0=A/X, 1=B/O, 2=X/□, 3=Y/△)
    keys['j'] = keys['j'] || pad.buttons[0]?.pressed || pad.buttons[2]?.pressed;  // Punch (A/X or X/□)
    keys['k'] = keys['k'] || pad.buttons[1]?.pressed || pad.buttons[3]?.pressed;  // Kick (B/O or Y/△)
    keys['l'] = keys['l'] || pad.buttons[4]?.pressed || pad.buttons[5]?.pressed;  // Special (L1/R1)
    keys['u'] = keys['u'] || pad.buttons[8]?.pressed || pad.buttons[9]?.pressed;  // Block (Select/Start)
    keys[' '] = keys[' '] || pad.buttons[6]?.pressed || pad.buttons[7]?.pressed;  // Pause (L2/R2)
  }
}

// Prevent default game keys
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
});

window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  keys[k] = false;
});

// INITIALIZE START BUTTONS PROPERLY (No Auto-Boot to bypass browser Audio blocks)
document.addEventListener('DOMContentLoaded', () => {
  const btnStory = document.getElementById('btn-story');
  const btnArcade = document.getElementById('btn-arcade');
  const btnVersus = document.getElementById('btn-versus');

  // Check if Arcade is unlocked, else disable buttons initially
  if (localStorage.getItem('arcadeUnlocked') !== 'true') {
    if (btnArcade) { btnArcade.disabled = true; btnArcade.style.color = '#555'; btnArcade.style.borderColor = '#555'; btnArcade.textContent = '???'; }
    if (btnVersus) { btnVersus.disabled = true; btnVersus.style.color = '#555'; btnVersus.style.borderColor = '#555'; btnVersus.textContent = '???'; }
  }

  if (btnStory) {
    btnStory.addEventListener('click', () => {
      // Mobile Polish: Force App-Fullscreen
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(e => console.log('FS blocked'));
      }
      gameMode = 'story';
      bootGame();
    });
  }

  if (btnArcade) {
    btnArcade.addEventListener('click', () => {
      // Mobile Polish: Force App-Fullscreen
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(e => console.log('FS blocked'));
      }
      gameMode = 'arcade';
      bootGame();
    });
  }

  // CHEAT: SKIP TO ENDING
  window.forceEnding = function () {
    const panel = document.getElementById('pause-menu');
    if (panel) panel.classList.add('hidden');

    TransitionManager.fadeScreen(400, 150, 400, () => {
      window.gameState = 'victory';
      window.stateTimer = 0;
      SFX.stopMusic();

      const btnHam = document.getElementById('btn-hamburger');
      if (btnHam) btnHam.classList.add('hidden');

      const mobileControls = document.getElementById('mobile-controls');
      if (mobileControls) mobileControls.classList.add('hidden');

      window.playingOutro = false;
      window.playingHappyBirthday = false;

      if (typeof playEpicVoice === 'function' && typeof epilogLines !== 'undefined') {
        playEpicVoice(epilogLines, 'epilogue');
      }
    });
  };

  // The btnVersus listener that boots straight into the game has been removed.
  // The correct listener that opens the Character Select screen is managed at line 302.
  // Difficulty Selection
  if (document.getElementById('sel-difficulty')) {
    document.getElementById('sel-difficulty').addEventListener('change', (e) => {
      window.gameDifficulty = e.target.value;
    });
  }

  // ===== PROCEDURAL LIGHTNING BOLT RENDERER =====
  (function initLightning() {
    const canvas = document.getElementById('lightning-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let bolts = [];
    let nextBoltTime = 0;

    function resize() {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    function drawBolt(x1, y1, x2, y2, depth) {
      if (depth <= 0) return;
      const dx = x2 - x1, dy = y2 - y1;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 5) return;

      const segments = 8 + Math.floor(Math.random() * 6);
      const points = [{ x: x1, y: y1 }];
      for (let i = 1; i < segments; i++) {
        const t = i / segments;
        const jitter = (Math.random() - 0.5) * dist * 0.15;
        points.push({
          x: x1 + dx * t + jitter,
          y: y1 + dy * t + (Math.random() - 0.5) * 10
        });
      }
      points.push({ x: x2, y: y2 });

      // Main bolt
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = depth > 2 ? 'rgba(200,220,255,0.9)' : 'rgba(150,180,255,0.5)';
      ctx.lineWidth = depth > 2 ? 3 : 1.5;
      ctx.shadowBlur = depth > 2 ? 25 : 10;
      ctx.shadowColor = '#4488ff';
      ctx.stroke();

      // Branches
      if (depth > 1) {
        for (let i = 2; i < points.length - 2; i++) {
          if (Math.random() < 0.3) {
            const branchLen = dist * 0.3 * Math.random();
            const angle = (Math.random() - 0.5) * Math.PI * 0.8;
            const bx = points[i].x + Math.cos(angle + Math.PI / 2) * branchLen;
            const by = points[i].y + Math.sin(angle + Math.PI / 2) * branchLen;
            drawBolt(points[i].x, points[i].y, bx, by, depth - 1);
          }
        }
      }
    }

    function spawnBolt() {
      const startX = Math.random() * canvas.width;
      const endX = startX + (Math.random() - 0.5) * 300;
      const endY = canvas.height * (0.3 + Math.random() * 0.3);
      bolts.push({ x1: startX, y1: 0, x2: endX, y2: endY, life: 0.15 + Math.random() * 0.1 });
    }

    function animate() {
      requestAnimationFrame(animate);
      // Only draw when menu is visible
      const menu = document.getElementById('main-menu');
      if (FX_BYPASS.lightning || !menu || menu.classList.contains('hidden')) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = performance.now() / 1000;
      if (now >= nextBoltTime) {
        spawnBolt();
        // Sometimes double-strike
        if (Math.random() < 0.2) setTimeout(spawnBolt, 50 + Math.random() * 100);
        nextBoltTime = now + 1.5 + Math.random() * 4; // every 1.5-5.5 seconds
      }

      // Draw active bolts
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        b.life -= 0.016;
        if (b.life <= 0) { bolts.splice(i, 1); continue; }
        ctx.globalAlpha = Math.min(1, b.life * 8);
        drawBolt(b.x1, b.y1, b.x2, b.y2, 4);

        // Screen flash on fresh bolt
        if (b.life > 0.1) {
          ctx.globalAlpha = b.life * 1.5;
          ctx.fillStyle = 'rgba(150,180,255,0.02)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
      ctx.globalAlpha = 1;
    }
    animate();
  })();

  // --- FX BYPASS: CRT Overlay ---
  if (FX_BYPASS.crtOverlay) {
    const crt = document.getElementById('crt-overlay');
    if (crt) crt.style.display = 'none';
  }

});
