// =========================================================================
// 3. ASSET LOADER (PROMISE-BASED PRELOADER)
// =========================================================================
const rawImgs = {};
const processedSprites = {}; // For holding transparency-cleaned versions
let assetsLoaded = 0;
let isGameLoaded = false;

function removeWhiteBackground(imgObj, src) {
  const cvs = document.createElement('canvas'); const ctx = cvs.getContext('2d', { willReadFrequently: true });
  cvs.width = imgObj.naturalWidth || imgObj.width || 1024;
  cvs.height = imgObj.naturalHeight || imgObj.height || 1024;
  ctx.drawImage(imgObj, 0, 0, cvs.width, cvs.height);
  const imgData = ctx.getImageData(0, 0, cvs.width, cvs.height); const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) { data[i + 3] = 0; } // Strict white to alpha
  }
  ctx.putImageData(imgData, 0, 0);
  processedSprites[src] = cvs;
}

// Force load strictly _front.png, _left.png, _right.png for EVERY character
const allSrcs = new Set();
[KEANO, ...LEVELS].forEach(l => {
  allSrcs.add(l.fighterDir + '/_front.png');
  allSrcs.add(l.fighterDir + '/_left.png');
  allSrcs.add(l.fighterDir + '/_right.png');
  if (l.stage) allSrcs.add(l.stage);
  if (l.objType) {
    allSrcs.add(`assets/props/${l.objType}.png`);
    allSrcs.add(`assets/props/${l.objType}_broken.png`);
  }
});
// Global UI & VFX
allSrcs.add('assets/UX_Main_Menu_Nexus.png');
allSrcs.add('assets/UX_End_Screen_Earth.png');
allSrcs.add('assets/clean_simba_cane_corso_solo.png');

const totalAssets = allSrcs.size;

// Load Engine Synchronously via Promises to prevent race conditions
Promise.all(Array.from(allSrcs).map(s => {
  return new Promise(resolve => {
    const i = new Image();
    i.crossOrigin = "Anonymous";
    i.onload = () => {
      // Tunnel the loaded image directly into the global object so Canvas can find it instantly
      rawImgs[s] = i;
      if (s.includes('_left.png') || s.includes('_right.png') || s.includes('_front.png') || s.includes('simba')) {
        removeWhiteBackground(i, s);
      }
      assetsLoaded++;
      resolve();
    };
    i.onerror = () => {
      console.warn("Asset failed to load:", s);
      rawImgs[s] = i; // Save the broken ref anyway so the engine doesn't crash reading 'undefined'
      assetsLoaded++;
      resolve();
    };
    i.src = s;
  });
})).then(() => {
  isGameLoaded = true;
  console.log("All Sprite Assets strictly loaded into RAM!");
});

// =========================================================================
// 4. CAPCOM STYLE INPUT BUFFER
// =========================================================================
const keys = {};
const inputHistory = [];

function logInput(keyName) {
  if (inputHistory.length > 0 && inputHistory[inputHistory.length - 1].key === keyName && (Date.now() - inputHistory[inputHistory.length - 1].time) < 100) return;
  inputHistory.push({ key: keyName, time: Date.now() });
  if (inputHistory.length > 20) inputHistory.shift();
}

// Detect mobile touch device to hide/show screen gamepad
const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
if (!isMobile) {
  document.getElementById('mobile-controls').classList.add('hidden');
}

// Bind HTML Action Buttons (Touch Overlay)
['f', 'g', 'h', 'space'].forEach(k => {
  const btn = document.getElementById('btn-' + k);
  if (!btn) return;
  const actualKey = k === 'space' ? ' ' : k;
  btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[actualKey] = true; });
  btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[actualKey] = false; });
});

C.addEventListener('pointerdown', e => {
  if (gameState === 'continue' || gameState === 'gameOver') {
    keys[' '] = true; setTimeout(() => keys[' '] = false, 100);
  }
});

// ===== VIRTUAL ANALOG JOYSTICK =====
const joyArea = document.getElementById('joystick-area');
const joyKnob = document.getElementById('joystick-knob');
if (joyArea && joyKnob) {
  let isDragging = false;
  const center = 70; // Half of 140px

  const handleJoy = (ex, ey) => {
    const rect = joyArea.getBoundingClientRect();
    const cx = rect.left + center;
    const cy = rect.top + center;
    const dx = ex - cx;
    const dy = ey - cy;
    // V16 Mobile Overhaul: Wider snap radius but smaller deadzones for instant 8-way response
    const maxDist = 70; // Increased Max knob travel so thumbs don't slip out easily
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDist);
    const angle = Math.atan2(dy, dx);

    const nx = Math.cos(angle) * dist;
    const ny = Math.sin(angle) * dist;

    // Visual Joystick Knob drag
    joyKnob.style.transform = `translate(${nx}px, ${ny}px)`;

    // Reset inputs
    keys['arrowup'] = keys['arrowleft'] = keys['arrowdown'] = keys['arrowright'] = false;
    keys['w'] = keys['a'] = keys['s'] = keys['d'] = false;

    // Sensitive Deadzone (10px) to prevent resting-thumb drift, but sharp enough for diagonals
    if (dist > 10) {
      if (nx < -15) { keys['a'] = true; keys['arrowleft'] = true; }
      if (nx > 15) { keys['d'] = true; keys['arrowright'] = true; }
      if (ny < -15) { keys['w'] = true; keys['arrowup'] = true; }
      if (ny > 15) { keys['s'] = true; keys['arrowdown'] = true; }
    }
  };

  const resetJoy = () => {
    isDragging = false;
    joyKnob.style.transform = `translate(0px, 0px)`;
    keys['arrowup'] = keys['arrowleft'] = keys['arrowdown'] = keys['arrowright'] = false;
    keys['w'] = keys['a'] = keys['s'] = keys['d'] = false;
  };

  joyArea.addEventListener('touchstart', e => { e.preventDefault(); isDragging = true; handleJoy(e.touches[0].clientX, e.touches[0].clientY); });
  joyArea.addEventListener('touchmove', e => { e.preventDefault(); if (isDragging) handleJoy(e.touches[0].clientX, e.touches[0].clientY); });
  joyArea.addEventListener('touchend', e => { e.preventDefault(); resetJoy(); });

  joyArea.addEventListener('mousedown', e => { isDragging = true; handleJoy(e.clientX, e.clientY); });
  window.addEventListener('mousemove', e => { if (isDragging) handleJoy(e.clientX, e.clientY); });
  window.addEventListener('mouseup', resetJoy);
}

// ===== TOUCH ACTION BUTTONS (Punch, Kick, Special, Block) =====
const touchMap = { 'btn-punch': 'j', 'btn-kick': 'k', 'btn-special': 'l', 'btn-block': 'u' };
Object.entries(touchMap).forEach(([btnId, key]) => {
  const btn = document.getElementById(btnId);
  if (btn) {
    // V16 Responsive touch classes for instant button feedback
    btn.addEventListener('pointerdown', e => { e.preventDefault(); keys[key] = true; btn.classList.add('active'); });
    btn.addEventListener('pointerup', e => { e.preventDefault(); keys[key] = false; btn.classList.remove('active'); });
    btn.addEventListener('pointerleave', e => { keys[key] = false; btn.classList.remove('active'); });
  }
});

