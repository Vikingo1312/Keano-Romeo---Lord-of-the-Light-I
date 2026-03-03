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

  _bgmFilter: null,

  // New V7 Re-Route for Master EQ and Voice Distortion
  voiceAudioCtx: null,
  voiceSources: {},
  voiceFilter: null,
  voiceDistortion: null,
  bgmAudioCtx: null,
  bgmSource: null,
  bgmMasterEQ: null,

  init() {
    // V19: Master Dynamics Compressor – glues the mix, prevents clipping
    this._masterCompressor = AC.createDynamicsCompressor();
    this._masterCompressor.threshold.value = -12;
    this._masterCompressor.knee.value = 10;
    this._masterCompressor.ratio.value = 4;
    this._masterCompressor.attack.value = 0.003;
    this._masterCompressor.release.value = 0.25;
    this._masterCompressor.connect(AC.destination);

    this._musicGain = AC.createGain(); this._musicGain.gain.value = 0.5;

    // Add an EQ Filter (Lowpass) for Epic Cinematic Voice Overs
    this._bgmFilter = AC.createBiquadFilter();
    this._bgmFilter.type = 'lowpass';
    this._bgmFilter.frequency.value = 20000; // Open initially
    this._bgmFilter.Q.value = 1.2; // Slight resonance for epic feel

    // Connect Chain: Gain -> Filter -> Compressor -> Destination
    this._musicGain.connect(this._bgmFilter);
    this._bgmFilter.connect(this._masterCompressor);

    // V15 Global Mix Polish: Halved SFX volume to prevent clipping/deafening
    this._sfxGain = AC.createGain(); this._sfxGain.gain.value = 0.4; this._sfxGain.connect(this._masterCompressor);

    // Contexts for HTML Media Elements (BGM and Voice)
    this.bgmAudioCtx = AC;
    this.voiceAudioCtx = AC;

    // Create Master BGM EQ (-25% High Cut = roughly 5000Hz instead of 20000Hz)
    this.bgmMasterEQ = this.bgmAudioCtx.createBiquadFilter();
    this.bgmMasterEQ.type = 'lowpass';
    // V19: Raised from 5kHz to 15kHz for brighter, less muddy music
    this.bgmMasterEQ.frequency.value = typeof FX_BYPASS !== 'undefined' && (typeof FX_BYPASS !== "undefined" ? FX_BYPASS.masterEQ : 1.0) > 0.0 ? 15000 : 20000;
    this.bgmMasterEQ.connect(this._masterCompressor);

    // Create Voice FX Chain: Distortion -> EQ -> Destination
    this.voiceDistortion = this.voiceAudioCtx.createWaveShaper();
    // V19: Reduced distortion from 200 to 50 for cleaner crunch without ear-fatigue
    this.voiceDistortion.curve = this._makeDistortionCurve(typeof FX_BYPASS !== 'undefined' && (typeof FX_BYPASS !== "undefined" ? FX_BYPASS.voiceDistortion : 1.0) > 0.0 ? 50 : 0);
    this.voiceDistortion.oversample = '4x';

    this.voiceFilter = this.voiceAudioCtx.createBiquadFilter();
    this.voiceFilter.type = 'lowpass';
    // By User Request: Voice should stay clean, BGM takes the heavy compression
    this.voiceFilter.frequency.value = 20000;

    // Post-Review 7: Synth Reverb
    this.voiceReverbNode = this.voiceAudioCtx.createConvolver();
    this.voiceReverbGain = this.voiceAudioCtx.createGain();
    this.voiceReverbGain.gain.value = typeof FX_BYPASS !== 'undefined' && (typeof FX_BYPASS !== "undefined" ? FX_BYPASS.voiceReverb : 1.0) > 0.0 ? 0.35 : 0.0;

    // V16 Arcade Voice Mix: Create a tight synthetic impulse response 
    // Reduced from 1.5s to 0.25s so it's a harsh room bump, not a trailing cathedral reflection.
    const rate = this.voiceAudioCtx.sampleRate;
    const length = Math.floor(rate * 0.25); // 250ms snap
    const impulse = this.voiceAudioCtx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    for (let i = 0; i < length; i++) {
      // Steeper exponential decay for punchiness
      const decay = Math.pow(1 - i / length, 5);
      left[i] = (Math.random() * 2 - 1) * decay;
      right[i] = (Math.random() * 2 - 1) * decay;
    }
    this.voiceReverbNode.buffer = impulse;

    // Chain: Distortion -> Filter -> (Dry to Dest | Wet to Reverb -> Gain -> Dest)
    this.voiceDistortion.connect(this.voiceFilter);
    this.voiceFilter.connect(this._masterCompressor); // Dry -> Compressor
    this.voiceFilter.connect(this.voiceReverbNode); // Send to Reverb
    this.voiceReverbNode.connect(this.voiceReverbGain);
    this.voiceReverbGain.connect(this._masterCompressor); // Reverb -> Compressor
  },

  _makeDistortionCurve(amount) {
    if (amount <= 0) return null;
    let k = typeof amount === 'number' ? amount : 50,
      n = 44100, // Higher resolution for smoother clipping
      curve = new Float32Array(n),
      deg = Math.PI / 180;

    for (let i = 0; i < n; ++i) {
      let x = i * 2 / n - 1;
      // Soft-knee overdrive algorithm formula
      curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
    }
    return curve;
  },

  setMusicVol(v) {
    const clampedV = v * 0.5 * ((typeof FX_BYPASS !== 'undefined') ? FX_BYPASS.music : 1.0); // Allow up to 50% max
    if (this._musicGain) this._musicGain.gain.cancelScheduledValues(AC.currentTime);
    if (this._musicGain) this._musicGain.gain.linearRampToValueAtTime(clampedV, AC.currentTime + 0.1);
    if (this.bgmNode) this.bgmNode.volume = clampedV;
  },
  setSFXVol(v) { if (this._sfxGain) this._sfxGain.gain.value = v; },

  setVoiceVol(v) {
    if (this.voiceNode) this.voiceNode.volume = v * 0.85 * ((typeof FX_BYPASS !== 'undefined') ? FX_BYPASS.voice : 1.0);
  },

  duckBGM(targetVol = 0.08, durationMs = 800) {
    const timeToFade = durationMs / 1000;
    if (this._musicGain) {
      this._musicGain.gain.cancelScheduledValues(AC.currentTime);
      this._musicGain.gain.linearRampToValueAtTime(targetVol, AC.currentTime + timeToFade);
    }
    // Epic EQ Fade: Bring down high frequencies to create a "cinematic/underwater" feel
    if (this._bgmFilter) {
      this._bgmFilter.frequency.cancelScheduledValues(AC.currentTime);
      this._bgmFilter.frequency.setTargetAtTime(400, AC.currentTime, timeToFade * 0.3); // V13.1 Less aggressive cut (was 150)
    }

    // V12 Strict Ducking: Affect the Master BGM Element Filter dynamically, ignoring bypass temporarily
    if (this.bgmMasterEQ) {
      this.bgmMasterEQ.frequency.cancelScheduledValues(this.bgmAudioCtx.currentTime);
      this.bgmMasterEQ.frequency.setTargetAtTime(400, this.bgmAudioCtx.currentTime, timeToFade * 0.4);
    }

    // Force volume ducking on the HTML Audio element as well
    if (this.bgmNode) {
      // Use a simple interval for smooth volume ducking on the element
      let startVol = this.bgmNode.volume;
      let diff = startVol - targetVol;
      let steps = 20;
      let stepTime = durationMs / steps;
      let currentStep = 0;

      if (this._duckInterval) clearInterval(this._duckInterval);
      this._duckInterval = setInterval(() => {
        currentStep++;
        if (this.bgmNode) {
          // Never drop below targetVol
          this.bgmNode.volume = Math.max(targetVol, startVol - (diff * (currentStep / steps)));
        }
        if (currentStep >= steps) clearInterval(this._duckInterval);
      }, stepTime);
    }
  },

  restoreBGM(durationMs = 1200) {
    const timeToFade = durationMs / 1000;
    const userVol = document.getElementById('vol-music') ? parseFloat(document.getElementById('vol-music').value) : 0.5;
    let musicFader = (typeof FX_BYPASS !== 'undefined') ? FX_BYPASS.music : 1.0;
    const clampedVol = userVol * 0.5 * musicFader; // Studio Polish 1: Max Music Limit

    if (this._musicGain) {
      this._musicGain.gain.cancelScheduledValues(AC.currentTime);
      this._musicGain.gain.linearRampToValueAtTime(clampedVol, AC.currentTime + timeToFade);
    }
    // Restore EQ Frequencies
    if (this._bgmFilter) {
      this._bgmFilter.frequency.cancelScheduledValues(AC.currentTime);
      this._bgmFilter.frequency.setTargetAtTime(20000, AC.currentTime, timeToFade * 0.4); // Open filter back up
    }

    // V12 Strict Ducking Restore: Return BGM Element Filter back to bypass-defined state
    if (this.bgmMasterEQ) {
      let eqFader = (typeof FX_BYPASS !== 'undefined') ? FX_BYPASS.masterEQ : 1.0;
      let targetFreq = 5000 + (15000 * eqFader);
      this.bgmMasterEQ.frequency.cancelScheduledValues(this.bgmAudioCtx.currentTime);
      this.bgmMasterEQ.frequency.setTargetAtTime(targetFreq, this.bgmAudioCtx.currentTime, timeToFade * 0.4);
    }

    // Force volume restore on HTML Audio element
    if (this.bgmNode) {
      let startVol = this.bgmNode.volume;
      let diff = clampedVol - startVol;
      let steps = 20;
      let stepTime = durationMs / steps;
      let currentStep = 0;

      if (this._duckInterval) clearInterval(this._duckInterval);
      this._duckInterval = setInterval(() => {
        currentStep++;
        if (this.bgmNode) {
          this.bgmNode.volume = Math.min(1.0, startVol + (diff * (currentStep / steps)));
        }
        if (currentStep >= steps) clearInterval(this._duckInterval);
      }, stepTime);
    }
  },

  // --- ASSET-BASED AUDIO (V4) ---

  playBGM(url, loop = true, fadeTime = 0.5) {
    if (this.stopAmbientPad) this.stopAmbientPad();
    if (typeof FX_BYPASS !== 'undefined' && FX_BYPASS.music <= 0.0) return;
    if (this.activeBGMUrl === url) {
      this.restoreBGM(); // Always ensure it's un-ducked if re-requested
      return;
    }

    const userVol = document.getElementById('vol-music') ? parseFloat(document.getElementById('vol-music').value) : 0.5;

    const bgmEl = document.getElementById('bgm-player');
    if (!bgmEl) return;

    // Stop procedural stuff if any
    this.stopMusic();

    this.activeBGMUrl = url;
    bgmEl.src = url;
    bgmEl.loop = loop;
    // Studio Polish 1: Max Music limit lowered to let voices dominate the mix, but loud enough to hear clearly
    let musicFader = (typeof FX_BYPASS !== 'undefined') ? FX_BYPASS.music : 1.0;
    bgmEl.volume = userVol * 0.5 * musicFader;
    this.bgmNode = bgmEl; // Keep reference for Ducking

    // Actually play
    // Route through Web Audio API for EQ if not already routed
    if (!this.bgmSource) {
      try {
        this.bgmSource = this.bgmAudioCtx.createMediaElementSource(bgmEl);
        this.bgmSource.connect(this.bgmMasterEQ);
      } catch (e) {
        // Will throw if already connected, safe to ignore
      }
    }

    // Update live MasterEQ based on bypass
    if (this.bgmMasterEQ) {
      // 1.0 = Default (no cut, 20000Hz), 0.0 = Aggressive cut (5000Hz)
      let eqFader = (typeof FX_BYPASS !== 'undefined') ? FX_BYPASS.masterEQ : 1.0;
      this.bgmMasterEQ.frequency.value = 5000 + (15000 * eqFader);
    }

    bgmEl.play().catch(e => console.warn("BGM Playblock:", e));
  },

  playVoice(url) {
    if (typeof FX_BYPASS !== 'undefined' && FX_BYPASS.voice <= 0.0) return;
    const voiceEl = document.getElementById('voice-player');
    if (!voiceEl || !url) {
      console.warn("Audio Context Voice Skip:", url);
      return;
    }

    voiceEl.pause();
    voiceEl.src = url;
    this.voiceNode = voiceEl; // crucial for live slider updates

    // "Weiter nach hinten mischen": Default to 85% of set voice volume
    const voiceVol = document.getElementById('vol-voice') ? parseFloat(document.getElementById('vol-voice').value) : 0.7;
    let voiceFader = (typeof FX_BYPASS !== 'undefined') ? FX_BYPASS.voice : 1.0;
    voiceEl.volume = voiceVol * 0.85 * voiceFader;

    this.duckBGM();
    voiceEl.onended = () => {
      this.restoreBGM();
    };

    // Route Voice through Effects Chain if not already
    if (!this.voiceSources["voiceplayer"]) {
      try {
        this.voiceSources["voiceplayer"] = this.voiceAudioCtx.createMediaElementSource(voiceEl);
        this.voiceSources["voiceplayer"].connect(this.voiceDistortion);
      } catch (e) { }
    }

    // Live update FX values
    if (this.voiceDistortion && typeof FX_BYPASS !== 'undefined') {
      // Fader determines distortion amount. 1.0 = Clean (0 severity), 0.0 = Dirty (50 severity)
      let distFader = FX_BYPASS.voiceDistortion;
      this.voiceDistortion.curve = this._makeDistortionCurve(50 * (1.0 - distFader));
    }
    if (this.voiceFilter && typeof FX_BYPASS !== 'undefined') {
      let eqFader = FX_BYPASS.masterEQ;
      this.voiceFilter.frequency.value = 4000 + (16000 * eqFader);
    }
    if (this.voiceReverbGain && typeof FX_BYPASS !== 'undefined') {
      this.voiceReverbGain.gain.value = 0.0; // Reverb is permanently turned off 
    }

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
    if (typeof FX_BYPASS !== 'undefined' && FX_BYPASS.voice <= 0.0) return;

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

  hitBlock() {
    this._playQuickSFX('assets/audio/voice/announcer_fight.mp3', 0.5); // Fallback for block
  },
  hitLight() { },
  hitHeavy() {
    // We use one of the hit sounds randomly temporarily until characters map it themselves
    this._playQuickSFX('assets/audio/voice/keano_hit.mp3', 0.8);
  },
  hitCritical() { },
  blockImpact() { },
  swing() { },
  dash() {
    this._playQuickSFX('assets/audio/voice/alcapone_hit.mp3', 0.2); // Fast swoosh fallback
  },
  jump() { },
  ko() { },
  uiHover() { },
  uiSelect() { },
  uiSelectB() { },
  round() { },
  fight() { },

  _playQuickSFX(url, vol) {
    if (typeof FX_BYPASS !== 'undefined' && FX_BYPASS.sfx <= 0.0) return;
    const sfxEl = new Audio(url);
    let sfxFader = (typeof FX_BYPASS !== 'undefined') ? FX_BYPASS.sfx : 1.0;
    sfxEl.volume = vol * sfxFader * (document.getElementById('vol-sfx') ? parseFloat(document.getElementById('vol-sfx').value) : 0.8);
    sfxEl.play().catch(e => { }); // Fire and forget
  },

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
