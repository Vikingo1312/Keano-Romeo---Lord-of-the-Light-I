// Globals
const C = document.getElementById('gameCanvas');
const mainCtx = C.getContext('2d', { alpha: false }); // Render context

// V19 ARCHITECTURE: Offscreen Canvas (Double Buffering) for Mobile FPS stability
const offCanvas = document.createElement('canvas');
offCanvas.width = 1920;
offCanvas.height = 1080;
const X = offCanvas.getContext('2d', { alpha: false }); // Core logic drawing context
let gameState = 'init'; // init, splash, menu, prologue, select, vs_screen, fighting, ko, reflexion, epilogue, credits
let time = 0, lastTime = performance.now(), stateTimer = 0;
let nextLightning = 4000; // Initialize first thunder rumble for Main Menu

window._caesarDarkImg = new Image(); window._caesarDarkImg.src = 'assets/logo_dark.png';

// FPS Monitor Globals
let lastFpsTime = performance.now();
let currentFps = 60;
let framesThisSecond = 0;

// =========================================================================
// FX MIXBOARD (BYPASS SYSTEM)
// =========================================================================
const FX_BYPASS = {
  // Visual FX (1.0 = 100% Intensity, 0.0 = Off/Bypassed)
  screenShake: 0.85,      // 85% - Punchy and weighty without causing motion sickness
  hitFlash: 0.75,         // 75% - Reduced whitewash for better combat visibility
  particles: 1.35,        // 135% - Boosted for juicier arcade prop destruction
  heavyGlow: 1.0,         // 100% - Global Composite Glow ON
  crtOverlay: 0.80,       // 80% - Subtle reduction to keep pixel art crisp
  lightning: 1.0,         // 100% - Menu lightning active
  stageProps: 1.0,        // 100% - Props spawn
  attackSmear: 0.65,      // 65% - The phantom strikes glow elegantly but remain surgical
  canvasFilters: 1.0,     // 100% - Saturate/Contrast filters ON
  menuFx: 1.0,            // 100% - Enhanced menu FX

  // Gameplay/Feel FX
  hitStop: 1.15,          // 115% - Increased hit freezing for a crunchier, heavier impact feel
  combatAI: 0.95,         // 95% - Slightly tuned down AI aggression for a fair 100HP brawl
  limbs: 1.0,             // 100% - Draw rect limbs during attacks
  animSprite: 1.0,        // 100% - Enable subtle idle breathing animation

  // Physics & Advanced Anim Flags
  gravityControl: 1.0,    // Multiplier for gravity/jump height caps
  advancedSlicing: 1.0,   // 100% - Split sprite drawing ON
  playerImpactFeel: 1.0,  // Multiplier for squash/stretch intensity

  // Game Balance
  gameBalance: 1.0,       // Multiplier for damage output scaling
  strictGrounding: 1.0,   // Multiplier reducing jump limits
  koOverhaul: 1.0,        // 100% - Cinematic KOs ON
  heroAura: 1.0,          // 100% - Golden aura ON

  // Capcom 2.0 / Post-Review 7 & 8 & 9 (False/0.0 = Aktiv)
  voiceReverb: 1.0,       // 0.0 = +25% Voice Reverb
  magneticGround: 1.0,    // 0.0 = 100% Y-Axis lock to ground
  bodyKoGlow: 1.0,        // 0.0 = Glow locked to KO body instead of world particles
  specialVariations: 1.0, // 0.0 = Element-specific projectile behaviors
  shootingStars: 1.0,     // 0.0 = Render shooting stars in menus and cutscenes

  // Final "Gold Master" Harmonics
  fades: 0.65,            // 65% - Cinematic fade durations reduced for snappier, responsive transitions
  combatHarmonics: 0.88,  // 88% - Super tight responsive friction, retaining 12% classic retro slide

  // Audio FX
  music: 0.75,            // 75% Volume - Drops backing tracks slightly so voices dominate the mix
  sfx: 1.15,              // 115% Volume - Extremely punchy impact and swing sounds
  voice: 1.0,             // 100% Volume - Clear voice lines
  voiceDistortion: 0.35,  // 35% Severity - Adds a subtle gritty, vintage arcade radio crackle
  masterEQ: 1.0           // 100% HQ - No high cut. Full spectrum clarity.
};


// =========================================================================
// ARCADE CREDIT SYSTEM
// =========================================================================
let arcadeCredits = 3;

function updateCreditDisplay() {
  const el = document.getElementById('credit-counter');
  if (el) el.textContent = `CREDIT(S): ${arcadeCredits}`;
  const bar = document.getElementById('insert-coin-bar');
  if (bar) {
    if (arcadeCredits <= 0) {
      bar.classList.add('empty');
    } else {
      bar.classList.remove('empty');
    }
  }
}

function useCredit() {
  arcadeCredits = Math.max(0, arcadeCredits - 1);
  updateCreditDisplay();
}

function insertCoin() {
  if (arcadeCredits <= 0) {
    arcadeCredits = 3;
    updateCreditDisplay();
    SFX.uiHover();
  }
}

// V19 Architecture: Screen Resize with DPR (Device Pixel Ratio) Scaling
function resize() {
  const targetRatio = 16 / 9;
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const winRatio = winW / winH;

  // DPR Scaling for tack-sharp Retina/Mobile rendering
  const dpr = window.devicePixelRatio || 1;

  let cssWidth, cssHeight;

  // Calculate CSS boundary based on Letterboxing
  if (winRatio > targetRatio) {
    cssHeight = winH;
    cssWidth = winH * targetRatio;
    C.style.width = Math.floor(cssWidth) + 'px';
    C.style.height = winH + 'px';
    C.style.left = Math.floor((winW - cssWidth) / 2) + 'px';
    C.style.top = '0px';
  } else {
    cssWidth = winW;
    cssHeight = winW / targetRatio;
    C.style.width = winW + 'px';
    C.style.height = Math.floor(cssHeight) + 'px';
    C.style.left = '0px';
    C.style.top = Math.floor((winH - cssHeight) / 2) + 'px';
  }

  // Physical Canvas Hardware pixels
  C.width = Math.floor(cssWidth * dpr);
  C.height = Math.floor(cssHeight * dpr);

  // We keep the internal Offscreen Game Canvas resolution fixed to 1920x1080
  // and simply scale the main context to draw it seamlessly!
  mainCtx.scale(C.width / 1920, C.height / 1080);
}
window.addEventListener('resize', resize); resize();

