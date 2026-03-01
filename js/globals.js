// Globals
const C = document.getElementById('gameCanvas');
const X = C.getContext('2d', { alpha: false }); // Optimize for no transparency behind canvas
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
  // Visual FX
  screenShake: false,     // false = Effect Active. true = Bypassed
  hitFlash: false,        // White screen flash on heavy hits
  particles: false,       // Blood, sparks, dirt
  heavyGlow: false,       // The expensive globalCompositeOperation glow
  crtOverlay: false,      // The retro CRT scanline overlay
  lightning: false,       // Main menu dynamic lightning background
  stageProps: false,      // false = Props spawnen. true = Props komplett deaktiviert
  attackSmear: false,     // false = Agile Phantom Strikes active. true = off
  canvasFilters: false,   // false = Saturate/Contrast filters ON. true = Filters OFF (Performance jump)

  // Gameplay/Feel FX (Coming soon)
  hitStop: false,         // Mini slow-mo on heavy impacts
  combatAI: false,        // false = Dynamic AI Scaling based on difficulty. true = Vanilla AI

  // Audio FX
  music: false,
  sfx: false,
  voice: false
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

// Resize Handle
function resize() { C.width = window.innerWidth; C.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

