// =========================================================================
// 1. AUDIO ENGINE (Synthesizer & Background Tracks)
// =========================================================================
const AC = new (window.AudioContext || window.webkitAudioContext)();
const SFX = {
  _musicGain: null,
  _sfxGain: null,

  // V4 AUDIO MANAGER PROPERTIES
  bgmNode: null,        // Currently playing background music Audio element
  voiceNode: null,      // Currently playing voice line Audio element
  activeBGMUrl: null,

  init() {
    this._musicGain = AC.createGain(); this._musicGain.gain.value = 0.5; this._musicGain.connect(AC.destination);
    this._sfxGain = AC.createGain(); this._sfxGain.gain.value = 0.8; this._sfxGain.connect(AC.destination);
  },

  setMusicVol(v) {
    if (this._musicGain) this._musicGain.gain.value = v;
    if (this.bgmNode) this.bgmNode.volume = v;
  },
  setSFXVol(v) { if (this._sfxGain) this._sfxGain.gain.value = v; },

  setVoiceVol(v) {
    if (this.voiceNode) this.voiceNode.volume = v;
  },

  duckBGM(targetVol = 0.15, durationMs = 500) {
    if (this._musicGain) {
      this._musicGain.gain.cancelScheduledValues(AC.currentTime);
      this._musicGain.gain.linearRampToValueAtTime(targetVol, AC.currentTime + (durationMs / 1000));
    }
  },
  restoreBGM(durationMs = 800) {
    if (this._musicGain) {
      const userVol = document.getElementById('vol-music') ? parseFloat(document.getElementById('vol-music').value) : 0.5;
      this._musicGain.gain.cancelScheduledValues(AC.currentTime);
      this._musicGain.gain.linearRampToValueAtTime(userVol, AC.currentTime + (durationMs / 1000));
    }
  },

  // --- ASSET-BASED AUDIO (V4) ---

  playBGM(url, loop = true, fadeTime = 0.5) {
    if (this.activeBGMUrl === url) {
      this.restoreBGM(); // Always ensure it's un-ducked if re-requested
      return;
    }

    const userVol = document.getElementById('vol-music') ? parseFloat(document.getElementById('vol-music').value) : 0.5;

    const bgmEl = document.getElementById('bgm-player');
    if (!bgmEl) return;

    // Stop procedural stuff if any
    this.stopMusic();

    // Music disabled per user request
    return;
  },

  playVoice(url) {
    const voiceEl = document.getElementById('voice-player');
    if (!voiceEl || !url) return;

    voiceEl.pause();
    voiceEl.src = url;

    // Default to max voice volume or what's set in options
    const voiceVol = document.getElementById('vol-voice') ? parseFloat(document.getElementById('vol-voice').value) : 0.9;
    voiceEl.volume = voiceVol;

    this.duckBGM();
    voiceEl.onended = () => {
      this.restoreBGM();
    };

    voiceEl.play().catch(e => console.warn("Voice Playblock:", e));
  },

  playSound(url) {
    // Generic sound disabled
    return;
  },

  // --- LEGACY PROCEDURAL SFX (Kept for compatibility until assets are mapped) ---

  _noiseLayer(dur, vol, filterFreq) {
    if (AC.state === 'suspended') AC.resume();
    const bufferSize = AC.sampleRate * dur;
    const buffer = AC.createBuffer(1, bufferSize, AC.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = AC.createBufferSource(); noise.buffer = buffer;
    const speed = (typeof gameSpeedMult !== 'undefined') ? gameSpeedMult : 1;
    noise.playbackRate.value = speed;

    const filter = AC.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = filterFreq;
    const env = AC.createGain(); env.gain.setValueAtTime(vol, AC.currentTime); env.gain.exponentialRampToValueAtTime(0.01, AC.currentTime + dur / speed);

    noise.connect(filter); filter.connect(env); env.connect(this._sfxGain);
    noise.start(); noise.stop(AC.currentTime + dur / speed);
  },

  _tone(freq, dur, type = 'sine', vol = 1.0) {
    return;
  },

  hitBlock() { },
  hitLight() { },
  hitHeavy() { },
  hitCritical() { },
  blockImpact() { },
  swing() { },
  dash() { },
  jump() { },
  ko() { },
  uiHover() { },
  uiSelect() { },
  uiSelectB() { },
  round() { },
  fight() { },

  // ==========================================
  // V13 "SEGA GENESIS RETROWAVE" PROCEDURAL THEME (Golden Axe X Conan)
  // ==========================================
  waveThemeActive: false,
  _playLordOfTheLightTheme() {
    return; // Procedural theme disabled as per user request
  },

  stopLordOfTheLightTheme() {
    this.waveThemeActive = false;
  },

  // ==========================================
  // V14 "STORY AMBIENT" PROCEDURAL THEME (Hans Zimmer Underscore)
  // ==========================================
  storyThemeActive: false,
  _playStoryAmbientTheme() {
    return; // Procedural theme disabled as per user request
  },

  stopStoryAmbientTheme() {
    return; // Procedural theme disabled as per user request
  },

  // Legacy Hooks (Will be routed to BGM loader later)
  playTitleMusic() {
    // Handled by playBGM('main_menu.mp3') which intercepts to _playLordOfTheLightTheme
  },
  playArenaMusic(bpm) { },
  stopMusic() {
    this.stopLordOfTheLightTheme();
    this.stopStoryAmbientTheme();
  }
};
SFX.init();
