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

  _ambientNodes: [],
  _ambientGain: null,

  init() {
    this._musicGain = AC.createGain(); this._musicGain.gain.value = 0.5; this._musicGain.connect(AC.destination);
    this._sfxGain = AC.createGain(); this._sfxGain.gain.value = 0.8; this._sfxGain.connect(AC.destination);
  },

  setMusicVol(v) {
    const clampedV = v * 0.3; // Studio Polish 1: Max Music limit 30% against master FX
    if (this._musicGain) this._musicGain.gain.value = clampedV;
    if (this.bgmNode) this.bgmNode.volume = clampedV;
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
      const clampedVol = userVol * 0.3; // Studio Polish 1: Max Music Limit
      this._musicGain.gain.cancelScheduledValues(AC.currentTime);
      this._musicGain.gain.linearRampToValueAtTime(clampedVol, AC.currentTime + (durationMs / 1000));
    }
  },

  // --- ASSET-BASED AUDIO (V4) ---

  playBGM(url, loop = true, fadeTime = 0.5) {
    if (this.stopAmbientPad) this.stopAmbientPad();
    if (FX_BYPASS.music) return;
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
    if (FX_BYPASS.voice) return;
    const voiceEl = document.getElementById('voice-player');
    if (!voiceEl || !url) {
      console.warn("Audio Context Voice Skip:", url);
      return;
    }

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

  startAmbientPad() {
    this.stopAmbientPad();
    this._ambientGain = AC.createGain();
    this._ambientGain.gain.value = 0.001;
    this._ambientGain.connect(this._musicGain);
    this._ambientGain.gain.linearRampToValueAtTime(0.3, AC.currentTime + 3.0); // Slow fade in

    // 16-bit style open minor/sus chord (A2, E3, A3, B3, E4)
    const freqs = [110.00, 164.81, 220.00, 246.94, 329.63];

    freqs.forEach(f => {
      const osc = AC.createOscillator();
      osc.type = 'triangle'; // Smooth 16-bit pad sound

      // Slight detune for chorus effect
      osc.frequency.value = f;
      osc.detune.value = (Math.random() - 0.5) * 15;

      const filter = AC.createBiquadFilter();
      filter.type = 'lowpass';
      // Slow sweep filter
      filter.frequency.setValueAtTime(400, AC.currentTime);
      filter.frequency.linearRampToValueAtTime(800, AC.currentTime + 10);

      const vca = AC.createGain();
      vca.gain.value = 0.2; // Divide volume

      osc.connect(filter);
      filter.connect(vca);
      vca.connect(this._ambientGain);

      osc.start();
      this._ambientNodes.push({ osc, filter, vca });
    });
  },

  stopAmbientPad() {
    if (this._ambientGain) {
      this._ambientGain.gain.cancelScheduledValues(AC.currentTime);
      this._ambientGain.gain.linearRampToValueAtTime(0.001, AC.currentTime + 1.5);
      const nodesToStop = this._ambientNodes;
      const gainToStop = this._ambientGain;
      this._ambientNodes = [];
      this._ambientGain = null;

      setTimeout(() => {
        nodesToStop.forEach(n => {
          try { n.osc.stop(); n.osc.disconnect(); n.filter.disconnect(); n.vca.disconnect(); } catch (e) { }
        });
        try { gainToStop.disconnect(); } catch (e) { }
      }, 1600);
    }
  },

  playCharacterVoice(charId, action) {
    // Dynamic path builder for the generated files: assets/audio/voice/{char}_{action}.mp3
    // charId needs to match the prefixes we generated (e.g. 'keano', 'vikingo', 'hattori')
    if (FX_BYPASS.voice) return;

    // Normalize charId mappings from levels.js to the generator script's IDs
    let cId = charId.toLowerCase();
    if (cId === 'dark_vikingo' || cId === 'vikingo_coat') cId = 'vikingo';
    if (cId === 'supreme_keano' || cId === 'hyper_keano') cId = 'keano';
    if (cId === 'jay_x') cId = 'jayden';
    if (cId === 'gargamel_hoodie') cId = 'gargamel';
    if (cId === 'alcapone') cId = 'capone';
    // 'paco' is correct for paco_el_taco but just in case:
    if (cId.includes('paco')) cId = 'paco';

    const url = `assets/audio/voice/${cId}_${action}.mp3`;
    this.playVoice(url);
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
