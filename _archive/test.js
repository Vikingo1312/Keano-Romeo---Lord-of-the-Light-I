
    // =========================================================================
    // V3: "LORD OF THE LIGHT" GAME ENGINE
    // =========================================================================

    // Globals
    const C = document.getElementById('gameCanvas');
    const X = C.getContext('2d', { alpha: false }); // Optimize for no transparency behind canvas
    let gameState = 'init'; // init, menu, prologue, select, vs_screen, fighting, ko, reflexion, epilogue, credits
    let time = 0, lastTime = performance.now(), stateTimer = 0;

    // Resize Handle
    function resize() { C.width = window.innerWidth; C.height = window.innerHeight; }
    window.addEventListener('resize', resize); resize();

    // =========================================================================
    // 1. AUDIO ENGINE (Synthesizer & Background Tracks)
    // =========================================================================
    const AC = new (window.AudioContext || window.webkitAudioContext)();
    const SFX = {
      _musicGain: null,
      _sfxGain: null,
      _musicInterval: null,
      _titleMusicInterval: null,
      _isPlayingTitleMusic: false,

      init() {
        this._musicGain = AC.createGain(); this._musicGain.gain.value = 0.5; this._musicGain.connect(AC.destination);
        this._sfxGain = AC.createGain(); this._sfxGain.gain.value = 0.8; this._sfxGain.connect(AC.destination);
      },

      setMusicVol(v) { if (this._musicGain) this._musicGain.gain.value = v; },
      setSFXVol(v) { if (this._sfxGain) this._sfxGain.gain.value = v; },

      _tone(freq, dur, type = 'sine', vol = 1.0) {
        if (AC.state === 'suspended') AC.resume();
        const o = AC.createOscillator(); const g = AC.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, AC.currentTime);
        g.gain.setValueAtTime(vol, AC.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, AC.currentTime + dur);
        o.connect(g); g.connect(this._sfxGain);
        o.start(); o.stop(AC.currentTime + dur);
      },

      hitBlock() { this._tone(250, 0.15, 'square', 0.5); },
      hitLight() { this._tone(350, 0.1, 'sawtooth', 0.8); },
      hitHeavy() {
        // Boom
        if (AC.state === 'suspended') AC.resume();
        const o = AC.createOscillator(); const g = AC.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(150, AC.currentTime);
        o.frequency.exponentialRampToValueAtTime(40, AC.currentTime + 0.3);
        g.gain.setValueAtTime(1.5, AC.currentTime); g.gain.exponentialRampToValueAtTime(0.01, AC.currentTime + 0.3);
        o.connect(g); g.connect(this._sfxGain); o.start(); o.stop(AC.currentTime + 0.3);
      },
      dash() { this._tone(800, 0.2, 'sine', 0.3); },
      uiHover() { this._tone(900, 0.05, 'square', 0.1); },
      uiSelect() { this._tone(1200, 0.1, 'square', 0.3); },

      // Epic Main Menu Theme
      playTitleMusic() {
        if (this._isPlayingTitleMusic) return;
        this.stopMusic();
        if (AC.state === 'suspended') AC.resume();
        this._isPlayingTitleMusic = true;
        let step = 0;

        const playChords = () => {
          const drone = AC.createOscillator(); const droneGain = AC.createGain();
          drone.type = 'sawtooth'; drone.frequency.value = 55; // Deep A1
          droneGain.gain.setValueAtTime(0.001, AC.currentTime);
          droneGain.gain.linearRampToValueAtTime(0.08, AC.currentTime + 1.0);
          droneGain.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 3.0);
          const filter = AC.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 200 + Math.sin(step) * 100;
          drone.connect(filter); filter.connect(droneGain); droneGain.connect(this._musicGain);
          drone.start(); drone.stop(AC.currentTime + 3.2);

          const arpNotes = [220, 277, 329, 440, 277, 329, 220, 164];
          const note = arpNotes[step % arpNotes.length];
          const arp = AC.createOscillator(); const arpGain = AC.createGain();
          arp.type = 'square'; arp.frequency.value = note;
          arpGain.gain.setValueAtTime(0.001, AC.currentTime); arpGain.gain.linearRampToValueAtTime(0.05, AC.currentTime + 0.02);
          arpGain.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.3);
          const arpFilter = AC.createBiquadFilter(); arpFilter.type = 'bandpass'; arpFilter.frequency.value = 1200;
          arp.connect(arpFilter); arpFilter.connect(arpGain); arpGain.connect(this._musicGain);
          arp.start(); arp.stop(AC.currentTime + 0.4);

          if (step % 8 === 0 || step % 8 === 4) {
            const kick = AC.createOscillator(); const kg = AC.createGain();
            kick.type = 'sine'; kick.frequency.setValueAtTime(200, AC.currentTime);
            kick.frequency.exponentialRampToValueAtTime(30, AC.currentTime + 0.15);
            kg.gain.setValueAtTime(0.2, AC.currentTime); kg.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.3);
            kick.connect(kg); kg.connect(this._musicGain); kick.start(); kick.stop(AC.currentTime + 0.35);
          }
          step++;
        };
        this._titleMusicInterval = setInterval(playChords, 380);
        playChords();
      },

      stopMusic() {
        this._isPlayingTitleMusic = false;
        if (this._titleMusicInterval) { clearInterval(this._titleMusicInterval); this._titleMusicInterval = null; }
        if (this._musicInterval) { clearInterval(this._musicInterval); this._musicInterval = null; }
      },

      // Simple procedural combat music
      playArenaMusic(bpm) {
        this.stopMusic();
        if (AC.state === 'suspended') AC.resume();
        const beatMs = Math.max(80, 60000 / bpm);
        let step = 0;

        const playBeat = () => {
          if (step % 2 === 0) {
            const kick = AC.createOscillator(); const kg = AC.createGain();
            kick.type = 'sine'; kick.frequency.setValueAtTime(150, AC.currentTime); kick.frequency.exponentialRampToValueAtTime(40, AC.currentTime + 0.1);
            kg.gain.setValueAtTime(0.15, AC.currentTime); kg.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.15);
            kick.connect(kg); kg.connect(this._musicGain); kick.start(); kick.stop(AC.currentTime + 0.15);

            // Bass
            const bass = AC.createOscillator(); const bg = AC.createGain();
            bass.type = 'square'; bass.frequency.value = 65.4 + (step % 4 === 0 ? 0 : 10); // Simple C2/D2 alternation
            bg.gain.setValueAtTime(0.2, AC.currentTime); bg.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.4);
            const lf = AC.createBiquadFilter(); lf.type = 'lowpass'; lf.frequency.value = 300;
            bass.connect(lf); lf.connect(bg); bg.connect(this._musicGain); bass.start(); bass.stop(AC.currentTime + 0.4);
          }
          if (step % 4 === 2) {
            const snare = AC.createBuffer(1, AC.sampleRate * 0.1, AC.sampleRate);
            const d = snare.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
            const ns = AC.createBufferSource(); ns.buffer = snare;
            const ng = AC.createGain(); ng.gain.setValueAtTime(0.1, AC.currentTime); ng.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.1);
            const hf = AC.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 1000;
            ns.connect(hf); hf.connect(ng); ng.connect(this._musicGain); ns.start(); ns.stop(AC.currentTime + 0.1);
          }
          step++;
        };
        this._musicInterval = setInterval(playBeat, beatMs);
      }
    };
    SFX.init();

    // =========================================================================
    // 2. DATA (ROSTER & LEVELS)
    // =========================================================================
    const LEVELS = [
      {
        id: 'hattori', name: 'HATTORI', flag: '🇯🇵', fighterDir: 'assets/CHARACTERS/1.Hattori_Japan', stage: 'assets/1_Japan.png', special: 'fire',
        title: 'Ninja-Erbe', desc: 'Die Schatten sind sein Zuhause.', speedMult: 1.1, hitPow: 1.0, str: { spd: 5, pow: 3, def: 2 }
      },
      {
        id: 'raheel', name: 'RAHEEL', flag: '🇮🇳', fighterDir: 'assets/CHARACTERS/2.Raheel', stage: 'assets/2_India.png', special: 'fire',
        title: 'Der Guru', desc: 'Spirituelle Kraft & Yoga-Griffe.', speedMult: 1.0, hitPow: 1.0, str: { spd: 2, pow: 3, def: 3 }
      },
      {
        id: 'pablo', name: 'PABLO', flag: '🇧🇷', fighterDir: 'assets/CHARACTERS/3.Pablo', stage: 'assets/3_Brazil.png', special: 'electric',
        title: 'Capoeira-Meister', desc: 'Akrobatik und rohe Gewalt.', speedMult: 1.2, hitPow: 0.9, str: { spd: 5, pow: 3, def: 1 }
      },
      {
        id: 'tzubaza', name: 'TZUBAZA', flag: '🇨🇳', fighterDir: 'assets/CHARACTERS/4.Tzubaza', stage: 'assets/4_China.png', special: 'wind',
        title: 'Meister des Windes', desc: 'Traditionelles Kung-Fu.', speedMult: 1.1, hitPow: 1.0, str: { spd: 3, pow: 3, def: 3 }
      },
      {
        id: 'alcapone', name: 'AL CAPONE', flag: '🇮🇹', fighterDir: 'assets/CHARACTERS/5.Al_Capone', stage: 'assets/5_Italy.png', special: 'super',
        title: 'Der Pate', desc: 'Kaltblütige Exekutionen.', speedMult: 0.9, hitPow: 1.3, str: { spd: 2, pow: 5, def: 3 }
      },
      {
        id: 'gargamel', name: 'C. GARGAMEL', flag: '🌑', fighterDir: 'assets/CHARACTERS/6.C_Gargamel_Techwear', stage: 'assets/6_Germany.png', special: 'super',
        title: 'Cyber-Sorcerer', desc: 'Technologie & dunkle Magie.', speedMult: 1.0, hitPow: 1.1, str: { spd: 3, pow: 3, def: 3 }
      },
      {
        id: 'marley', name: 'MARLEY', flag: '🇯🇲', fighterDir: 'assets/CHARACTERS/7.Marley_Jamaica', stage: 'assets/7_Jamaica.png', special: 'electric',
        title: 'Karibik-Blitz', desc: 'One Love — One Knockout.', speedMult: 1.3, hitPow: 0.8, str: { spd: 4, pow: 2, def: 2 }
      },
      {
        id: 'kowalski', name: 'KOWALSKI', flag: '🇵🇱', fighterDir: 'assets/CHARACTERS/8.Kowalski_Poland', stage: 'assets/8_Poland.png', special: 'super',
        title: 'Stahl-Panzer', desc: 'Massive Kybernetik-Schläge.', speedMult: 0.8, hitPow: 1.5, str: { spd: 1, pow: 5, def: 5 }
      },
      {
        id: 'paco', name: 'PACO EL TACO', flag: '🇲🇽', fighterDir: 'assets/CHARACTERS/9.Paco_el_Taco', stage: 'assets/9_Mexico.png', special: 'wind',
        title: 'El Luchador', desc: 'Fliegend und vernichtend.', speedMult: 1.4, hitPow: 0.9, str: { spd: 5, pow: 3, def: 1 }
      },
      {
        id: 'juan', name: 'JUAN', flag: '🇪🇸', fighterDir: 'assets/CHARACTERS/10.Juan', stage: 'assets/10_Spain.png', special: 'fire',
        title: 'El Matador', desc: 'Elegant und tödlich.', speedMult: 1.1, hitPow: 1.0, str: { spd: 3, pow: 3, def: 3 }
      },
      {
        id: 'lee', name: 'LEE', flag: '🇯🇵', fighterDir: 'assets/CHARACTERS/11.Lee', stage: 'assets/11_Japan_Night.png', special: 'electric',
        title: 'Yakuza Boss', desc: 'Neon-Tokyo gehört ihm.', speedMult: 1.2, hitPow: 1.1, str: { spd: 4, pow: 3, def: 2 }
      },
      {
        id: 'jayden', name: 'JAYDEN', flag: '🇩🇪', fighterDir: 'assets/CHARACTERS/12.JJ_Dark', stage: 'assets/12_Dojo_Dark.png', special: 'dark',
        title: 'Anti-Hero', desc: 'Verschlingt alles Licht.', speedMult: 1.1, hitPow: 1.2, str: { spd: 4, pow: 4, def: 4 }
      },
      {
        id: 'putin', name: 'PUTIN', flag: '🇷🇺', fighterDir: 'assets/CHARACTERS/13.Putin', stage: 'assets/13_Russia_Ice.png', special: 'dark',
        title: 'Sibirische Kälte', desc: 'Unaufhaltbarer Frost.', speedMult: 0.75, hitPow: 1.8, str: { spd: 1, pow: 5, def: 5 }
      },
      {
        id: 'vikingo', name: 'VIKINGO', flag: 'ᛣ', fighterDir: 'assets/CHARACTERS/14.vikingo_coat', stage: 'assets/14_Valhalla_Boss.png', special: 'super',
        title: 'Der Imperator', desc: 'Meister aller Dimensionen.', speedMult: 1.3, hitPow: 1.4, str: { spd: 5, pow: 5, def: 5 }
      },
      {
        id: 'commando', name: 'CYBER-COMMANDO', flag: '🇺🇸', fighterDir: 'assets/CHARACTERS/15.Cyber_Commando', stage: 'assets/15_Cyber_Commando.png', special: 'super',
        title: 'Die Maschine', desc: 'Halb Mensch, halb Waffe.', speedMult: 0.9, hitPow: 1.5, str: { spd: 2, pow: 5, def: 5 }
      }
    ];

    const KEANO = {
      id: 'keano', name: 'KEANO', flag: '🇩🇪', fighterDir: 'assets/CHARACTERS/0.Keano', special: 'electric',
      title: 'Krieger des Lichts', desc: 'Der Auserwählte.', speedMult: 1.0, hitPow: 1.0, str: { spd: 4, pow: 4, def: 3 }
    };

    // =========================================================================
    // 3. ASSET LOADER (STRICT PATHS)
    // =========================================================================
    const rawImgs = {};
    const processedSprites = {}; // For holding transparency-cleaned versions

    function removeWhiteBackground(imgObj, src) {
      const cvs = document.createElement('canvas'); const ctx = cvs.getContext('2d', { willReadFrequently: true });
      cvs.width = imgObj.width; cvs.height = imgObj.height; ctx.drawImage(imgObj, 0, 0);
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
    });
    // Global UI 
    allSrcs.add('assets/UX_Main_Menu_Nexus.png');
    allSrcs.add('assets/UX_End_Screen_Earth.png');

    // Load Engine
    allSrcs.forEach(s => {
      const i = new Image(); i.crossOrigin = "Anonymous";
      i.onload = () => { if (s.includes('_left.png') || s.includes('_right.png') || s.includes('_front.png')) removeWhiteBackground(i, s); };
      i.src = s; rawImgs[s] = i;
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
      document.getElementById('gamepad').style.display = 'none';
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
        const maxDist = 55; // Max knob travel
        const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDist);
        const angle = Math.atan2(dy, dx);

        const nx = Math.cos(angle) * dist;
        const ny = Math.sin(angle) * dist;

        joyKnob.style.transform = `translate(${nx}px, ${ny}px)`;

        // Reset inputs
        keys['arrowup'] = keys['arrowleft'] = keys['arrowdown'] = keys['arrowright'] = false;
        keys['w'] = keys['a'] = keys['s'] = keys['d'] = false;

        // Deadzone of 15px
        if (dist > 15) {
          if (nx < -20) { keys['a'] = true; keys['arrowleft'] = true; }
          if (nx > 20) { keys['d'] = true; keys['arrowright'] = true; }
          if (ny < -20) { keys['w'] = true; keys['arrowup'] = true; }
          if (ny > 20) { keys['s'] = true; keys['arrowdown'] = true; }
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

    // ===== PROJECTILES =====
    let projectiles = [];
    class Projectile {
      constructor(x, y, dir, type, fromPlayer) {
        this.x = x; this.y = y; this.dir = dir; this.type = type; this.fromPlayer = fromPlayer;
        this.speed = type === 'super' ? 14 : 9;
        this.life = 1; this.size = type === 'super' ? 45 : 25;
        this.trail = [];
      }
      update(dt) {
        this.x += this.dir * this.speed;
        this.life -= dt * 0.7;
        this.trail.push({ x: this.x, y: this.y, life: 0.3 });
        this.trail = this.trail.filter(t => { t.life -= dt * 2.5; return t.life > 0; });
        return this.x > -100 && this.x < C.width + 100 && this.life > 0;
      }
      draw() {
        const cols = {
          fire: ['#ff4400', '#ffaa00'], ice: ['#88ddff', '#ffffff'], electric: ['#ffff00', '#ffffff'],
          wind: ['#44ff88', '#ccffcc'], dark: ['#aa00ff', '#ff00ff'], super: ['#00ffff', '#ffffff']
        };
        const c = cols[this.type] || cols.fire;

        // Draw trailing particles first
        this.trail.forEach((t, idx) => {
          X.save(); X.globalAlpha = t.life * 0.6;
          X.fillStyle = idx % 2 === 0 ? c[0] : c[1];
          X.shadowBlur = 15; X.shadowColor = c[0];
          X.beginPath(); X.arc(t.x, t.y, this.size * 0.9 * t.life, 0, Math.PI * 2); X.fill();
          X.restore();
        });

        // Massive energy core
        X.save(); X.globalAlpha = this.life;
        X.translate(this.x, this.y);
        X.rotate(performance.now() / 150); // Fast spinning aura

        // Outer glow
        const grad = X.createRadialGradient(0, 0, 0, 0, 0, this.size * 1.5);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, c[1]);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        X.fillStyle = grad;
        X.beginPath(); X.arc(0, 0, this.size * 1.5, 0, Math.PI * 2); X.fill();

        // Inner dense core
        X.fillStyle = '#ffffff'; X.shadowBlur = 30; X.shadowColor = c[0];
        X.beginPath(); X.arc(0, 0, this.size * 0.6, 0, Math.PI * 2); X.fill();

        X.restore();
      }
      checkHit(fighter) {
        if (Math.abs(this.x - fighter.x) < fighter.w * 0.25 && Math.abs(this.y - (fighter.y - fighter.h * 0.4)) < fighter.h * 0.5) {
          const dmg = this.type === 'super' ? 25 : 12;
          fighter.takeHit(dmg, this.dir);
          spawnParticles(fighter.x, fighter.y - fighter.h * 0.4, this.type);
          screenShake = this.type === 'super' ? 18 : 8;
          return true;
        }
        return false;
      }
    }

    // ===== PARTICLES (MASSIVE CAPCOM-STYLE VFX) =====
    let particles = [];
    function spawnParticles(x, y, type) {
      const cols = { fire: '#ff4400', ice: '#88ddff', electric: '#ffff00', wind: '#44ff88', dark: '#aa00ff', hitspark: '#ffcc00', super_spark: '#00ffff' };
      const col = cols[type] || '#ffcc00';
      const isHeavy = type === 'super_spark' || type === 'super';
      const count = isHeavy ? 45 : 25; // WAY more particles

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 5 + Math.random() * (isHeavy ? 25 : 15);
        particles.push({
          x: x + (Math.random() - 0.5) * 20,
          y: y + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3,
          life: 0.6 + Math.random() * 0.6,
          color: Math.random() > 0.4 ? col : (Math.random() > 0.5 ? '#fff' : '#ffaa00'),
          size: 2 + Math.random() * (isHeavy ? 10 : 6)
        });
      }

      // CAPCOM HIT-SPARK CORES: Multiple overlapping explosions!
      if (type === 'hitspark' || type === 'super_spark') {
        const coreCount = isHeavy ? 3 : 1;
        for (let c = 0; c < coreCount; c++) {
          particles.push({
            x: x + (Math.random() - 0.5) * 30,
            y: y + (Math.random() - 0.5) * 30,
            vx: 0, vy: 0, life: 1,
            color: isHeavy ? '#00ffff' : '#ffcc00',
            size: isHeavy ? 80 : 55, isSpark: true
          });
        }
      }

      // RADIANT BURST LINES (like manga speed lines radiating from impact)
      if (isHeavy) {
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          particles.push({
            x, y,
            vx: Math.cos(angle) * 30,
            vy: Math.sin(angle) * 30,
            life: 0.4, color: '#ffffff', size: 3, isLine: true
          });
        }
      }
    }

    // ============================================================
    // COMPANION SYSTEM (Simba for Vikingo)
    // ============================================================
    const GROUND = () => C.height * 0.85;
    const FW = () => Math.min(270, C.height * 0.35);
    const FH = () => Math.min(370, C.height * 0.50);
    const GRAV = 0.65;

    class Companion {
      constructor(owner) {
        this.owner = owner;
        this.x = owner.facingRight ? owner.x - 150 : owner.x + 150;
        this.y = GROUND();
        this.vy = 0;
        this.w = owner.w * 0.6;
        this.h = owner.h * 0.45;
        this.state = 'idle';
        this.stateTimer = 0;
        this.facingRight = owner.facingRight;
        // The image to use; this can be updated once the new file is imported properly
        this.imgSrc = 'assets/#simba_cane_corso_solo_1772218185461.png';

        const img = new Image(); img.src = this.imgSrc;
        this.img = img;
      }

      update(dt, opponent) {
        this.y += this.vy; this.vy += GRAV * 1.35;
        if (this.y > GROUND()) {
          this.y = GROUND();
          this.vy = 0;
        }

        if (this.stateTimer > 0) {
          this.stateTimer -= dt;
          if (this.stateTimer <= 0 && this.state !== 'bite') {
            this.state = 'idle';
          }
        }

        // Face same way as owner unless biting
        if (this.state !== 'bite') {
          this.facingRight = this.owner.facingRight;
        }

        const fdir = this.facingRight ? 1 : -1;
        const targetX = this.owner.x - fdir * 180; // Follow 180px behind
        const distToTarget = targetX - this.x;

        // Biting Logic
        if (opponent && this.state === 'idle' && this.owner.hp > 0 && opponent.hp > 0) {
          const distToOpp = Math.abs(this.x - opponent.x);
          // Simba attacks if enemy is close and RNG favors it
          if (distToOpp < this.w * 1.5 && Math.random() < 0.015) {
            this.state = 'bite';
            this.stateTimer = 0.5;
            this.facingRight = this.x < opponent.x;
            this.vy = -12; // Small leap

            // Deal damage
            if (opponent.state !== 'roll') {
              opponent.takeHit(5 + Math.random() * 5, this.facingRight ? 1 : -1, false);
              spawnParticles(opponent.x, opponent.y - opponent.h * 0.2, 'hitspark');
              SFX.hitLight(); // Bark/Bite sound placeholder
            }
          }
        }

        // Movement Logic (Follow owner)
        if (this.state !== 'bite') {
          if (Math.abs(distToTarget) > 20) {
            this.state = 'run';
            this.x += distToTarget > 0 ? 5 : -5;
          } else {
            this.state = 'idle';
          }

          // Randomly jump if Owner jumps
          if (this.owner.y < GROUND() - 50 && this.y === GROUND() && Math.random() < 0.05) {
            this.vy = -20;
          }
        }
      }

      draw() {
        X.save();
        X.translate(this.x, this.y);

        // Shadow
        X.fillStyle = 'rgba(0,0,0,0.5)';
        X.beginPath(); X.ellipse(0, 0, this.w * 0.6, 15, 0, 0, Math.PI * 2); X.fill();

        if (!this.facingRight) X.scale(-1, 1);

        // Simple bobbing animation when running
        let bobY = 0;
        if (this.state === 'run') bobY = Math.sin(performance.now() / 80) * 10;
        if (this.y < GROUND()) bobY = -20; // Jump pose
        if (this.state === 'bite') {
          X.rotate(0.2); // Lunge forward
          bobY = -15;
        }

        try {
          // Dynamic Loading - Wait for actual raw Image Objects
          if (!this.img) return; // Wait
          X.drawImage(this.img, -this.w / 2, -this.h + bobY, this.w, this.h);
        } catch (e) { }

        X.restore();
      }
    }

    // ============================================================
    // FIGHTER CLASS (V3 Clean Rendering)
    // ============================================================
    let screenShake = 0, flashTimer = 0;
    let comboCount = 0, comboTimer = 0;
    let gameTimerStyle = 'normal';
    let gameDifficulty = 'normal';

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
        this.shoutTimer = 0;

        this.inputBuffer = [];
        this.inputTimer = 0;
        this.companion = null;
        if (this.fighterDir.includes('vikingo_') || (ld && ld.level === 14)) {
          this.companion = new Companion(this);
        }
      }

      get w() { return FW(); }
      get h() { return FH(); }

      takeHit(dmg, dir, isHeavy = false) {
        if (this.state === 'block') {
          this.hp -= dmg * 0.15; // Chip damage
          this.knockVX = dir * (isHeavy ? 12 : 6);
          this.hitStop = isHeavy ? 0.15 : 0.08;
          SFX.hitBlock();
        } else {
          this.hp -= dmg;
          this.state = 'hit';
          this.stateTimer = isHeavy ? 0.65 : 0.40;
          this.knockVX = dir * (isHeavy ? 20 : 12);
          this.hitFlash = 1;
          this.hitStop = isHeavy ? 0.22 : 0.12;
          screenShake = isHeavy ? 15 : 8;
          SFX.hitHeavy();
          if (this.isPlayer) { comboCount = 0; comboTimer = 0; }
        }
        this.hp = Math.max(0, this.hp);
      }

      update(dt, opponent) {
        if (this.hitStop > 0) {
          this.hitStop -= dt;
          return;
        }

        this.y += this.vy; this.vy += GRAV * 1.35;

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

        this.x += this.knockVX;
        if (this.y === GROUND()) {
          if (Math.abs(this.knockVX) > 0.5) {
            let friction = (this.state === 'dash') ? 0.92 : 0.82;
            this.knockVX *= friction;
          } else {
            this.knockVX = 0;
          }
        } else {
          this.knockVX *= 0.98;
        }

        this.x = Math.max(this.w * 0.5, Math.min(C.width - this.w * 0.5, this.x));

        if (opponent && this.state !== 'roll') {
          this.wasFacingRight = this.facingRight;
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
          }
        }
        if (this.specialCD > 0) this.specialCD -= dt;
        if (this.hitFlash > 0) this.hitFlash -= dt * 3;
        this.t += dt * 8;

        if (opponent && (this.state === 'special_roll' || this.state === 'special_flip')) {
          const dist = Math.abs(this.x - opponent.x);
          const range = this.w * (this.state === 'special_roll' ? 0.9 : 1.2);
          if (dist < range && Math.sin(this.t * 5) > 0.8 && opponent.state !== 'roll') {
            const baseDmg = this.state === 'special_roll' ? 6 : 8;
            const dir = this.facingRight ? 1 : -1;
            opponent.takeHit(baseDmg, dir, false);
            this.hitStop = 0.03;
            spawnParticles(opponent.x, opponent.y - opponent.h * 0.4, 'hitspark');
            if (this.isPlayer) {
              comboCount++; comboTimer = 1.0;
            }
          }
        }

        function pollGamepad() {
          const pads = navigator.getGamepads ? navigator.getGamepads() : [];
          let pad = null;
          for (let i = 0; i < pads.length; i++) {
            if (pads[i] && pads[i].connected) { pad = pads[i]; break; }
          }
          if (!pad) return;

          keys['arrowup'] = keys['arrowup'] || pad.buttons[12]?.pressed || pad.axes[1] < -0.5;
          keys['arrowdown'] = keys['arrowdown'] || pad.buttons[13]?.pressed || pad.axes[1] > 0.5;
          keys['arrowleft'] = keys['arrowleft'] || pad.buttons[14]?.pressed || pad.axes[0] < -0.5;
          keys['arrowright'] = keys['arrowright'] || pad.buttons[15]?.pressed || pad.axes[0] > 0.5;

          keys['control'] = keys['control'] || pad.buttons[0]?.pressed || pad.buttons[2]?.pressed;
          keys['alt'] = keys['alt'] || pad.buttons[1]?.pressed || pad.buttons[3]?.pressed;
          keys['h'] = keys['h'] || pad.buttons[4]?.pressed || pad.buttons[5]?.pressed;
          keys[' '] = keys[' '] || pad.buttons[6]?.pressed || pad.buttons[7]?.pressed;
        }
        pollGamepad();

        if (this.isPlayer) {
          const inLeft = keys['arrowleft'] || keys['a'];
          const inRight = keys['arrowright'] || keys['d'];
          const inUp = keys['arrowup'] || keys['w'];
          const inDown = keys['arrowdown'] || keys['s'];
          const inPunch = keys['control'] || keys['meta'] || keys['f'];
          const inKick = keys['alt'] || keys['g'];

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
            if (inLeft) { this.x -= 8; moving = true; }
            if (inRight) { this.x += 8; moving = true; }

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
          if (inDown) { this.state = 'block'; this.stateTimer = 0.3; }

          const fw = this.facingRight ? 'd' : 'a';
          const bk = this.facingRight ? 'a' : 'd';

          if (this.specialCD <= 0) {
            if (checkMotion(['s', fw, 'h'])) this.fireProj();
            else if (checkMotion([bk, fw, 'g'])) this.doSpecialRoll(opponent);
            else if (checkMotion(['s', bk, 'g'])) this.doSpecialFlip(opponent);
            else if (keys['h']) this.fireProj();
          }

          if (keys[' '] && this.super >= 100) this.doSuper(opponent);
        }

        // AI Input 
        if (!this.isPlayer && this.state === 'idle' && opponent) {
          const dist = Math.abs(this.x - opponent.x);
          const diffMult = gameDifficulty === 'hard' ? 1.8 : (gameDifficulty === 'easy' ? 0.7 : 1.0);
          const spdMult = this.ld?.speedMult || 1.0;
          const jumpFreq = this.ld?.jumpFreq || 1.0;
          const projFreq = this.ld?.projFreq || 1.0;
          const charType = this.ld?.special || 'fire';

          const walkSpd = (gameDifficulty === 'easy' ? 3.0 : (gameDifficulty === 'hard' ? 4.8 : 4.0)) * spdMult;

          let idealZoningDist = this.w * 0.4;
          if (charType === 'ice') idealZoningDist = this.w * 1.5;
          else if (charType === 'dark' || charType === 'earth') idealZoningDist = this.w * 0.3;
          if (projFreq > 1.5) idealZoningDist += this.w;

          let aiMoving = false;
          if (dist > idealZoningDist + 50) {
            this.x += (opponent.x > this.x ? walkSpd : -walkSpd);
            if (this.state !== 'walk') { this.state = 'walk'; this.stateTimer = 0.2; }
            aiMoving = true;
          } else if (dist < idealZoningDist - this.w * 0.5 - 50) {
            this.x += (opponent.x > this.x ? -walkSpd : walkSpd);
            if (this.state !== 'walk') { this.state = 'walk'; this.stateTimer = 0.2; }
            aiMoving = true;
          }

          if (!aiMoving && this.state === 'walk' && this.stateTimer <= 0) {
            this.state = 'idle';
          }

          let superChance = 0.10 * diffMult;
          if (charType === 'fire' || charType === 'lightning') superChance *= 1.5;
          if (this.super >= 100 && dist < this.w * 2 && Math.random() < superChance) {
            this.doSuper(opponent);
            return;
          }

          const r = Math.random();
          let isAttacked = (opponent.state === 'punch' || opponent.state === 'kick' || opponent.state === 'proj');

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
            if (isAttacked && r < 0.7 * diffMult) {
              this.state = 'block'; this.stateTimer = 0.5;
            } else if (r < 0.15 * diffMult) {
              this.doAttack(r > 0.5 ? 'punch' : 'kick', opponent);
            } else if (r < 0.2 * diffMult && this.specialCD <= 0) {
              this.doSpecialRoll(opponent);
            }
          } else if (dist < this.w * 0.55 && r < 0.12 * diffMult) {
            this.doAttack(r > 0.5 ? 'punch' : 'kick', opponent);
          }

          if (Math.random() < (0.012 * jumpFreq) && this.y === GROUND() && this.state === 'idle') {
            if ((charType === 'dark' || charType === 'lightning') && dist > this.w * 0.8) {
              this.state = 'roll'; this.stateTimer = 0.8;
              this.knockVX = (opponent.x > this.x) ? 14 : -14;
              this.vy = -14;
            } else {
              this.vy = -26; this.state = 'jump'; this.stateTimer = 0.5;
            }
          }

          if (opponent.y < GROUND() - 50 && dist < this.w * 0.8) {
            if (Math.random() < 0.6 * diffMult) {
              this.state = 'block'; this.stateTimer = 0.6;
            } else if (Math.random() < 0.4 * diffMult) {
              this.doAttack('punch', opponent);
            }
          }

          if (dist < this.w * 0.6 && isAttacked && Math.random() < (0.5 * diffMult)) {
            this.state = 'block'; this.stateTimer = 0.4;
          }

          if (dist > this.w * 1.5 && Math.random() < (0.03 * diffMult * projFreq) && this.specialCD <= 0) {
            this.fireProj();
          }
        }
      }

      doAttack(type, opponent) {
        this.state = type;
        const spdMult = this.isPlayer ? 1.2 : (this.ld?.speedMult || 1);
        this.stateTimer = type === 'punch' ? (0.25 / spdMult) : (0.4 / spdMult);
        this.knockVX = this.facingRight ? 4 : -4;

        if (type === 'punch') SFX.dash();

        this.hitStop = 0.05;

        if (opponent) {
          const dist = Math.abs(this.x - Math.max(opponent.x, this.x - this.w) - Math.min(opponent.x - this.x, 0));
          const range = type === 'punch' ? this.w * 0.45 : this.w * 0.60;
          if (dist < range && opponent.state !== 'roll') {
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

            const ptType = isHeavyHit ? 'super_spark' : 'hitspark';
            spawnParticles(opponent.x, opponent.y - opponent.h * (isHeavyHit ? 0.3 : 0.5), ptType);
          }
        }
      }

      fireProj() {
        if (this.isPlayer && comboCount < 3) return;
        this.state = 'special'; this.stateTimer = 0.4; this.specialCD = 1.2;
        const dir = this.facingRight ? 1 : -1;
        const type = this.isPlayer ? 'super' : (this.ld?.special || 'fire');
        projectiles.push(new Projectile(this.x + dir * this.w * 0.4, this.y - this.h * 0.4, dir, type, this.isPlayer));
        screenShake = 5;
        if (this.isPlayer) comboCount = 0;
      }

      doSpecialRoll(opponent) {
        this.state = 'special_roll'; this.stateTimer = 0.6; this.specialCD = 1.5;
        this.knockVX = this.facingRight ? 18 : -18; this.vy = -10;
      }

      doSpecialFlip(opponent) {
        this.state = 'special_flip'; this.stateTimer = 0.7; this.specialCD = 1.5;
        this.knockVX = this.facingRight ? 12 : -12; this.vy = -18;
      }

      doSuper(opponent) {
        if (this.isPlayer && comboCount < 5) return;
        this.super = 0; this.state = 'super'; this.stateTimer = 0.9;
        screenShake = 25; flashTimer = 0.4;
        const dir = this.facingRight ? 1 : -1;
        if (this.isPlayer) comboCount = 0;

        const projType = this.isPlayer ? 'super' : (this.ld?.special || 'fire');
        projectiles.push(new Projectile(this.x + dir * this.w * 0.3, this.y - this.h * 0.5, dir, projType, this.isPlayer));
        if (opponent && Math.abs(this.x - opponent.x) < this.w * 1.3) {
          opponent.takeHit(this.isPlayer ? 45 : 30, dir);
          spawnParticles(opponent.x, opponent.y - opponent.h * 0.4, projType);
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
        X.filter = `saturate(1.8) contrast(1.1) brightness(1.1)`;
        if (this.hitFlash > 0) X.filter = `brightness(2) contrast(1.5)`;

        let faceScale = this.facingRight ? 1 : -1;
        if (this.cleanImgSrc.includes('_left.png') || this.cleanImgSrc.includes('_right.png')) faceScale = 1; // Actual sprites don't need reverse if strictly loaded
        X.scale(faceScale, 1);

        let sX = 1, sY = 1, rot = 0, offX = 0, offY = 0;
        if (!this._lerpSX) {
          this._lerpSX = 1; this._lerpSY = 1; this._lerpRot = 0;
          this._lerpOX = 0; this._lerpOY = 0;
        }

        switch (this.state) {
          case 'idle': sY = 1 + Math.sin(this.t * 3) * 0.02; sX = 1 - Math.sin(this.t * 3) * 0.01; break;
          case 'walk': offY = Math.abs(Math.sin(this.t * 12)) * 10; rot = Math.sin(this.t * 6) * 0.05; break;
          case 'roll': offY = dH * 0.4; rot = this.t * 15; sX = 0.7; sY = 0.7; break;
          case 'punch': offX = dW * 0.2; rot = 0.15; sX = 1.05; sY = 0.95; break;
          case 'kick': offX = -dW * 0.15; rot = -0.15; sX = 0.95; sY = 1.05; break;
          case 'jump': sX = 0.9; sY = 1.1; rot = this.vy > 0 ? 0.1 : -0.1; break;
          case 'hit': rot = -0.2; offX = -dW * 0.15; sX = 0.9; sY = 1.1; break;
          case 'block': rot = -0.05; sX = 1.05; sY = 0.95; offX = -dW * 0.05; break;
          case 'ko': rot = -Math.PI / 2; offY = -dH * 0.10; sX = 1.0; sY = 0.8; break;
          case 'special_roll': offY = dH * 0.3; rot = this.facingRight ? this.t * 20 : -this.t * 20; sX = 0.7; sY = 0.7; break;
          case 'special_flip': rot = this.facingRight ? this.t * 18 : -this.t * 18; sX = 0.8; sY = 0.8; break;
        }

        const ls = 0.25;
        this._lerpSX += (sX - this._lerpSX) * ls; this._lerpSY += (sY - this._lerpSY) * ls;
        this._lerpRot += (rot - this._lerpRot) * ls; this._lerpOX += (offX - this._lerpOX) * ls;
        this._lerpOY += (offY - this._lerpOY) * ls;

        X.translate(this._lerpOX, this._lerpOY); X.rotate(this._lerpRot); X.scale(this._lerpSX, this._lerpSY);
        X.drawImage(imgCanvas, -dW / 2, -dH, dW, dH);
        X.restore();

        const fdir = this.facingRight ? 1 : -1;
        if (this.state === 'punch' && st < 0.15) {
          const ix = cX + fdir * dW * 0.8; const iy = fY - dH * 0.45;
          X.save(); const pGrad = X.createRadialGradient(ix, iy, 0, ix, iy, 50);
          pGrad.addColorStop(0, '#ffffff'); pGrad.addColorStop(0.4, '#ff00aa'); pGrad.addColorStop(1, 'rgba(119,0,255,0)');
          X.fillStyle = pGrad; X.globalAlpha = 0.9; X.beginPath(); X.arc(ix, iy, 50, 0, Math.PI * 2); X.fill(); X.restore();
        }

        if (this.state === 'kick' && st < 0.2) {
          const ix = cX + fdir * dW * 0.9; const iy = fY - dH * 0.3;
          X.save(); const kGrad = X.createRadialGradient(ix, iy, 0, ix, iy, 55);
          kGrad.addColorStop(0, '#ffffff'); kGrad.addColorStop(0.3, '#00ffff'); kGrad.addColorStop(1, 'rgba(0,85,255,0)');
          X.fillStyle = kGrad; X.globalAlpha = 0.9; X.beginPath(); X.arc(ix, iy, 55, 0, Math.PI * 2); X.fill(); X.restore();
        }

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
          X.save(); X.globalAlpha = 0.25; X.translate(cX - fdir * dW * 0.4, fY);
          X.scale(faceScale, 1); X.drawImage(imgCanvas, -dW / 2, -dH, dW, dH); X.restore();
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

    // ===== PROLOGUE & EPILOGUE (VOICE + TEXT DATA) =====
    const prologueLines = [
      { text: '', style: 'gap' },
      { text: 'Nicht jede Erschütterung beginnt mit einem Knall...', style: 'narr' },
      { text: '(Pause)', style: 'gap' },
      { text: 'Manche beginnen leise...', style: 'narr' },
      { text: 'wie ein Schatten, der über die Sterne gleitet...', style: 'italic', color: '#aaddff' },
      { text: '(Pause)', style: 'gap' },
      { text: 'Die Dimensionen drifteten auseinander.', style: 'narr' },
      { text: 'Ideologien verhärteten sich...', style: 'narr' },
      { text: 'Licht wurde gehortet, als sei es Besitz...', style: 'narr' },
      { text: '(Pause)', style: 'gap' },
      { text: 'Und irgendwo zwischen Sternen und Schatten', style: 'narr' },
      { text: 'stand ein Junge, der noch nicht wusste,', style: 'narr' },
      { text: 'dass sein Name einmal durch Welten getragen werden würde...', style: 'italic', color: '#00ffff' },
      { text: '(Pause)', style: 'gap' },
      { text: 'Und dass wahre Stärke nicht im Beherrschen liegt —', style: 'narr' },
      { text: 'sondern im Verbinden.', style: 'bold', color: '#ffcc00' },
      { text: '(Längere Pause)', style: 'gap' },
      { text: '', style: 'gap' },
      { text: '[ PRESS SPACE TO SKIP ]', style: 'instruction', color: '#666666' }
    ];

    const epilogLines = [
      { text: '', style: 'gap' },
      { text: 'Der letzte Gegner war kein Fremder...', style: 'narr' },
      { text: '(Pause)', style: 'gap' },
      { text: 'Er war sein Vater.', style: 'bold', color: '#ff8866' },
      { text: '(Pause)', style: 'gap' },
      { text: 'Vikingo — Hüter der Lichtlinie,', style: 'narr' },
      { text: 'Vater zweier Söhne:', style: 'narr' },
      { text: 'Keano, der das Licht trug...', style: 'italic', color: '#00ffff' },
      { text: 'und Jayden, der das Feuer trug...', style: 'italic', color: '#ff4400' },
      { text: '(Pause)', style: 'gap' },
      { text: 'Zu lange hatte Vikingo in den Abgrund geblickt...', style: 'narr' },
      { text: 'und der Abgrund blickte zurück...', style: 'italic', color: '#6600ff' },
      { text: '(Pause)', style: 'gap' },
      { text: 'Doch Keano schlug nicht zu, um zu zerstören...', style: 'narr' },
      { text: 'Er schlug zu, um zu befreien...', style: 'glow', color: '#00ffff' },
      { text: '(Pause)', style: 'gap' },
      { text: 'Jeder Schlag war ein Ruf:', style: 'narr' },
      { text: '„Komm zurück ins Licht...“', style: 'italic', color: '#aaddff' },
      { text: '(Pause)', style: 'gap' },
      { text: 'Die Linie seiner Ahnen lehrte ihn:', style: 'narr' },
      { text: 'Energie darf nicht blockiert werden...', style: 'narr' },
      { text: 'Sie muss fließen.', style: 'bold', color: '#00ffff' },
      { text: '(Längere Pause)', style: 'gap' },
      { text: 'Keano verband das alte Feuer...', style: 'bold', color: '#ffaa00' },
      { text: 'Und die Galaxie atmete wieder...', style: 'italic', color: '#aaddff' },
      { text: 'Sanft.', style: 'narr' },
      { text: 'Leise.', style: 'narr' },
      { text: 'Und dennoch unerschütterlich.', style: 'bold', color: '#ffffff' },
      { text: '(Lange, ruhige Pause)', style: 'gap' },
      { text: '', style: 'gap' },
      { text: '· · · · · · ·', style: 'divider', color: '#444' },
      { text: '', style: 'gap' },
      { text: '=====================', style: 'gap' },
      { text: 'PROD. BY CAESAR', style: 'producer' },
      { text: '© 2026', style: 'narr' },
      { text: '=====================', style: 'gap' },
      { text: '', style: 'gap' },
      { text: '', style: 'gap' },
      { text: '[ PRESS SPACE TO SKIP ]', style: 'instruction', color: '#666666' }
    ];

    const outroLines = [
      { text: '', style: 'gap' },
      { text: 'Der Kampf endete...', style: 'narr' },
      { text: '(Pause)', style: 'gap' },
      { text: 'nicht mit Vernichtung...', style: 'narr' },
      { text: 'sondern mit Erinnerung...', style: 'narr' },
      { text: '(Pause)', style: 'gap' },
      { text: 'Das Licht war nicht stärker geworden...', style: 'narr' },
      { text: 'es war wieder im Fluss...', style: 'italic', color: '#00ffff' },
      { text: '(Pause)', style: 'gap' },
      { text: 'Und in diesem Fluss lag Hoffnung...', style: 'bold', color: '#aaddff' },
      { text: 'leise, doch unvergänglich...', style: 'italic', color: '#ffffff' },
      { text: '(Längere Pause)', style: 'gap' },
      { text: '', style: 'gap' },
      { text: '[ PRESS SPACE TO SKIP ]', style: 'instruction', color: '#666666' }
    ];

    const reflexionLines = [
      { text: '', style: 'gap' },
      { text: 'Die Arenen sind durchschritten...', style: 'narr' },
      { text: 'Die Vertreter gefallen —', style: 'narr' },
      { text: 'nicht als Besiegte… sondern als Offenbarte…', style: 'italic', color: '#aaddff' },
      { text: '(Pause)', style: 'gap' },
      { text: 'Keano trat in jede Dimension als Fremder...', style: 'narr' },
      { text: 'Er verließ sie als Spiegel...', style: 'italic', color: '#00ffff' },
      { text: '(Pause)', style: 'gap' },
      { text: 'Denn was er bekämpfte, war nie nur Dunkelheit...', style: 'narr' },
      { text: '(Pause)', style: 'gap' },
      { text: 'Es war Angst vor Veränderung...', style: 'narr' },
      { text: 'Furcht, Kontrolle zu verlieren...', style: 'narr' },
      { text: 'Der Irrglaube, dass Isolation Stärke sei...', style: 'italic', color: '#ff8866' },
      { text: '(Pause)', style: 'gap' },
      { text: 'Jede Welt trug ihr eigenes Licht...', style: 'narr' },
      { text: 'doch sie hielten es fest, als wäre es endlich...', style: 'italic', color: '#aaddff' },
      { text: '(Pause)', style: 'gap' },
      { text: 'Keano verstand etwas, das nur wenige begreifen:', style: 'narr' },
      { text: 'Licht wird schwächer, wenn man es einsperrt...', style: 'bold', color: '#00ffff' },
      { text: '(Längere Pause)', style: 'gap' },
      { text: 'Manche Dimensionen werden sich widersetzen...', style: 'narr' },
      { text: 'Manche fallen wieder in Schatten...', style: 'narr' },
      { text: '(Pause)', style: 'gap' },
      { text: 'Doch nun existiert ein Weg...', style: 'bold', color: '#aaddff' },
      { text: 'Ein Pfad zwischen den Welten...', style: 'narr' },
      { text: 'Geöffnet von einem Jungen von vierzehn Wintern...', style: 'narr' },
      { text: 'der sich weigerte, Zersplitterung als Schicksal zu akzeptieren...', style: 'italic', color: '#ffcc00' },
      { text: '(Pause)', style: 'gap' },
      { text: 'Solange Dimensionen treiben...', style: 'narr' },
      { text: 'solange Macht über Mitgefühl gestellt wird...', style: 'narr' },
      { text: 'wird es jemanden brauchen...', style: 'narr' },
      { text: 'der in die Mitte tritt...', style: 'narr' },
      { text: '(Pause)', style: 'gap' },
      { text: 'und leuchtet...', style: 'glow', color: '#00ffff' },
      { text: '(Lange, ausklingende Pause)', style: 'gap' },

      { text: '· · · · · · ·', style: 'divider', color: '#444' },
      { text: '', style: 'gap' },
      { text: '=====================', style: 'gap' },
      { text: 'PROD. BY CAESAR', style: 'producer' },
      { text: '© 2026', style: 'narr' },
      { text: '=====================', style: 'gap' },
      { text: '', style: 'gap' },
      { text: '', style: 'gap' },
      { text: '[ PRESS SPACE TO SKIP ]', style: 'instruction', color: '#666666' }
    ];

    const audioTracks = {
      prologue: new Audio('assets/prologue_voice.mp3'),
      reflexion: new Audio('assets/reflexion_voice.mp3'),
      epilogue: new Audio('assets/epilogue_voice.mp3'),
      outro: new Audio('assets/outro_voice.mp3')
    };
    let currentAudioTrack = null;

    function playEpicVoice(linesArray, type) {
      currentAudioTrack = audioTracks[type];

      if (currentAudioTrack) {
        currentAudioTrack.currentTime = 0;
        currentAudioTrack.play().catch(e => {
          console.warn("Could not play MP3, using browser TTS fallback:", e);
          playFallbackTTS(linesArray);
        });
      } else {
        playFallbackTTS(linesArray);
      }
    }

    function playFallbackTTS(linesArray) {
      if (!window.speechSynthesis) return;
      speechSynthesis.cancel();
      let speechText = "";
      for (let l of linesArray) {
        if (!l.text) continue;
        if (l.style === 'title' || l.style === 'mega' || l.style === 'instruction' || l.style === 'divider' || l.style === 'gap') continue;
        if (l.text.includes('=')) continue;
        let t = l.text;
        if (t === '(Pause)') t = ' ... ';
        else if (t === '(Längere Pause)') t = ' ... ... ';
        else if (t === '(Lange, ruhige Pause)' || t === '(Lange, ausklingende Pause)') t = ' ... ... ... ';
        speechText += t + ' ';
      }
      const u = new SpeechSynthesisUtterance(speechText);
      u.lang = 'de-DE'; u.rate = 0.88; u.pitch = 0.9;
      const voices = speechSynthesis.getVoices();
      const germanVoices = voices.filter(v => v.lang.startsWith('de'));
      const preferredVoice = germanVoices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('google')) || germanVoices[0];
      if (preferredVoice) u.voice = preferredVoice;
      speechSynthesis.speak(u);
    }

    // ===== HUD (MODERNIZED & CAPCOM STYLE) =====

    function drawHUD(p1, p2, ld) {
      const bw = C.width * 0.38; // Wider bars
      const bh = 30; // Thicker bars
      const by = 20;

      // Draw P1 (Left) Health Bar Background (Angled Capcom style)
      X.save();
      X.transform(1, 0, -0.4, 1, 0, 0); // Skew it!
      X.fillStyle = 'rgba(0, 0, 0, 0.8)';
      X.fillRect(20 + by * 0.4, by, bw, bh);

      // P1 Health Fill (Gradient: Neon Blue to Purple to Red)
      const p1Pct = Math.max(0, p1.hp / 100);
      const gw1 = X.createLinearGradient(20 + by * 0.4, by, 20 + by * 0.4 + bw, by);
      gw1.addColorStop(0, '#ff00aa');
      gw1.addColorStop(0.5, '#7700ff');
      gw1.addColorStop(1, '#00ffff');

      X.fillStyle = p1.hp > 25 ? gw1 : '#ff0055';
      X.shadowBlur = 15; X.shadowColor = X.fillStyle;
      if (p1Pct > 0) X.fillRect(20 + by * 0.4, by, bw * p1Pct, bh);

      // Frame and Shine
      X.strokeStyle = '#fff'; X.lineWidth = 3;
      X.strokeRect(20 + by * 0.4, by, bw, bh);
      X.fillStyle = 'rgba(255,255,255,0.2)';
      X.fillRect(20 + by * 0.4, by, bw, bh * 0.4);
      X.restore();

      // P1 Name
      const p1Label = gameMode === 'story' ? 'KEANO' : (arcadeSelectedName || 'PLAYER 1');
      X.font = `bold ${Math.min(26, C.width * 0.028)}px "Orbitron"`;
      X.fillStyle = '#fff'; X.shadowBlur = 8; X.shadowColor = '#000';
      X.fillText(p1Label, 25, by + bh + 25, bw - 10);

      // P1 WINS (Golden stars)
      for (let i = 0; i < p1Wins; i++) {
        X.font = '18px serif'; X.fillText('★', 30 + (i * 22), by + bh + 45);
      }

      // P1 Super Meter (Bottom Left)
      const sw = bw * 0.6;
      const sh = 12;
      const sY = C.height - sh - 20;
      X.save();
      X.transform(1, 0, -0.5, 1, 0, 0);
      X.fillStyle = 'rgba(0,0,0,0.8)'; X.fillRect(40, sY, sw, sh);
      X.fillStyle = p1.super >= 100 ? '#00ffff' : '#0055ff';
      X.shadowBlur = p1.super >= 100 ? 15 : 0; X.shadowColor = '#00ffff';
      X.fillRect(40, sY, sw * (p1.super / 100), sh);
      X.strokeStyle = '#fff'; X.lineWidth = 2; X.strokeRect(40, sY, sw, sh);
      X.restore();
      if (p1.super >= 100) {
        X.fillStyle = '#00ffff'; X.font = 'bold 16px "Orbitron"';
        X.fillText('SUPER', 20, sY - 10);
      }

      // Draw P2 (Right) Health Bar Background
      const rx = C.width - 20 - bw;
      X.save();
      X.transform(1, 0, 0.4, 1, 0, 0); // Skew opposite way!
      X.fillStyle = 'rgba(0, 0, 0, 0.8)';
      X.fillRect(rx - by * 0.4, by, bw, bh);

      // P2 Health Fill
      const p2Pct = Math.max(0, p2.hp / p2.maxHP);
      const gw2 = X.createLinearGradient(rx - by * 0.4, by, rx - by * 0.4 + bw, by);
      gw2.addColorStop(0, '#00ffff');
      gw2.addColorStop(0.5, '#7700ff');
      gw2.addColorStop(1, '#ff00aa');

      X.fillStyle = p2.hp > (p2.maxHP * 0.25) ? gw2 : '#ff0055';
      X.shadowBlur = 15; X.shadowColor = X.fillStyle;
      // Right-aligned fill
      if (p2Pct > 0) {
        const fw = bw * p2Pct;
        X.fillRect(rx - by * 0.4 + (bw - fw), by, fw, bh);
      }

      // Frame and Shine
      X.strokeStyle = '#fff'; X.lineWidth = 3;
      X.strokeRect(rx - by * 0.4, by, bw, bh);
      X.fillStyle = 'rgba(255,255,255,0.2)';
      X.fillRect(rx - by * 0.4, by, bw, bh * 0.4);
      X.restore();

      // P2 Name
      X.textAlign = 'right'; X.fillStyle = '#fff'; X.font = 'bold 22px "Orbitron"';
      X.shadowBlur = 4; X.shadowColor = '#000';
      X.fillText(ld.name, C.width - 25, by + bh + 25, bw - 10);

      // P2 WINS
      for (let i = 0; i < p2Wins; i++) {
        X.font = '22px serif'; X.fillText('★', C.width - 30 - (i * 24), by + bh + 50);
      }

      // P2 Super Meter (Bottom Right)
      X.save();
      X.transform(1, 0, 0.5, 1, 0, 0);
      X.fillStyle = 'rgba(0,0,0,0.8)'; X.fillRect(C.width - 40 - sw - (C.height - sY) * 0.5, sY, sw, sh);
      X.fillStyle = p2.super >= 100 ? '#ff00ff' : '#aa00aa';
      X.shadowBlur = p2.super >= 100 ? 15 : 0; X.shadowColor = '#ff00ff';
      const p2Sw = sw * (p2.super / 100);
      X.fillRect(C.width - 40 - sw - (C.height - sY) * 0.5 + (sw - p2Sw), sY, p2Sw, sh);
      X.strokeStyle = '#fff'; X.lineWidth = 2; X.strokeRect(C.width - 40 - sw - (C.height - sY) * 0.5, sY, sw, sh);
      X.restore();

      // VERSUS or STAGE text in center
      X.textAlign = 'center'; X.fillStyle = '#ff8800'; X.font = 'bold 36px "Orbitron"';
      X.fillText(`STAGE ${ld.level}`, C.width / 2, by + 105);

      // TIMER (Classic Big Arcade Numbers)
      X.fillStyle = 'rgba(0,0,0,0.8)';
      X.beginPath(); X.arc(C.width / 2, by + 30, 45, 0, Math.PI * 2); X.fill();
      X.strokeStyle = '#00ffff'; X.lineWidth = 6; X.stroke();
      X.strokeStyle = '#aa00ff'; X.lineWidth = 2; X.stroke();

      X.fillStyle = '#fff'; X.font = 'bold 45px "Orbitron"';
      let roundTimerNumDisplay = Math.ceil(roundTimerNum);
      const tStr = gameTimerStyle === 'infinite' ? '∞' : roundTimerNumDisplay;
      if (gameTimerStyle !== 'infinite' && roundTimerNumDisplay <= 15) {
        X.fillStyle = '#ff0055'; X.shadowBlur = 20; X.shadowColor = '#ff0055';
      }
      X.fillText(tStr, C.width / 2, by + 45);
      X.shadowBlur = 0;
    }

    function drawBigText(t, c, s = 1) {
      const fSize = Math.min(80 * s, C.width * 0.08 * s, C.height * 0.1 * s);
      X.save(); X.font = `italic 900 ${fSize}px "Orbitron"`;
      X.textAlign = 'center'; X.fillStyle = c;
      X.shadowBlur = 0; X.shadowColor = '#000';
      X.lineWidth = 8; X.strokeStyle = '#000';
      X.strokeText(t, C.width / 2, C.height * 0.45);
      X.fillText(t, C.width / 2, C.height * 0.45);
      X.restore();
    }

    // ===== GAME STATE =====
    let player, enemy, currentLevel = 0, fwTimer = 0;
    let roundNum = 1, p1Wins = 0, p2Wins = 0, roundTimerNum = 99;
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
      gameState = 'intro'; stateTimer = 3.0;
      roundTimerNum = 99;
      comboCount = 0; comboTimer = 0;
      SFX.playArenaMusic(120);
    }

    // ===== GAME LOOP =====
    function gameLoop(ts) {
      requestAnimationFrame(gameLoop);
      try {
        let dtMult = (gameState === 'ko' && stateTimer > 2.0) ? 0.2 : 1.0;

        if ((player && player.hitStop > 0) || (enemy && enemy.hitStop > 0)) {
          dtMult = 0;
          if (player && player.hitStop > 0) player.hitStop -= 0.016;
          if (enemy && enemy.hitStop > 0) enemy.hitStop -= 0.016;
        }

        const dt = Math.min((ts - lastTime) / 1000, 0.05) * dtMult; lastTime = ts; time += dt;

        X.clearRect(0, 0, C.width, C.height);
        X.save();
        if (screenShake > 0) {
          X.translate((Math.random() - 0.5) * screenShake * 3, (Math.random() - 0.5) * screenShake * 3);
          screenShake *= 0.85; if (screenShake < 0.5) screenShake = 0;
        }
        const ld = LEVELS[currentLevel || 0]; const si = rawImgs[ld.stage];
        if (si && si.complete) X.drawImage(si, 0, 0, C.width, C.height);
        else { const g = X.createLinearGradient(0, 0, 0, C.height); g.addColorStop(0, '#1a0030'); g.addColorStop(1, '#0a0015'); X.fillStyle = g; X.fillRect(0, 0, C.width, C.height); }

        // State Machine
        if (gameState === 'prologue') {
          stateTimer += dt;
          const cosmicG = X.createRadialGradient(C.width / 2, C.height / 2, 0, C.width / 2, C.height / 2, C.width);
          cosmicG.addColorStop(0, '#00001a'); cosmicG.addColorStop(1, '#000000');
          X.fillStyle = cosmicG; X.fillRect(0, 0, C.width, C.height);

          for (let i = 0; i < 40; i++) {
            const sx = ((i * 173.7 + stateTimer * 4) % C.width);
            const sy = ((i * 97.3 + stateTimer * (1 + i % 3)) % C.height);
            X.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(stateTimer * 0.5 + i));
            X.fillStyle = '#ffffff'; X.beginPath(); X.arc(sx, sy, 1 + (i % 3) * 0.5, 0, Math.PI * 2); X.fill();
          } X.globalAlpha = 1;

          const cx = C.width / 2; const fs = (pct) => Math.min(C.width * pct, C.height * pct * 1.8);
          X.save(); X.textAlign = 'center'; const lineHeight = fs(0.04);

          let scrollSpeed = 30;
          if (currentAudioTrack && currentAudioTrack.duration && !isNaN(currentAudioTrack.duration)) {
            const totalHeight = prologueLines.length * lineHeight;
            scrollSpeed = ((C.height * 0.5) + totalHeight) / currentAudioTrack.duration;
          }

          const totalScrollY = (currentAudioTrack && !currentAudioTrack.paused) ? (currentAudioTrack.currentTime * scrollSpeed) : (stateTimer * scrollSpeed);
          const startY = C.height * 0.65;

          let yPos = startY - totalScrollY;
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

          if (yPos < -200 || (keys[' '] && stateTimer > 2)) {
            if (window.speechSynthesis) speechSynthesis.cancel();
            if (currentAudioTrack) currentAudioTrack.pause();
            startLevel(0);
          }
        }
        else if (gameState === 'midpoint_reflexion') {
          stateTimer += dt;
          const cosmicG = X.createRadialGradient(C.width / 2, C.height / 2, 0, C.width / 2, C.height / 2, C.width);
          cosmicG.addColorStop(0, '#1a0033'); cosmicG.addColorStop(1, '#000000');
          X.fillStyle = cosmicG; X.fillRect(0, 0, C.width, C.height);

          for (let i = 0; i < 40; i++) {
            const sx = ((i * 173.7 + stateTimer * 4) % C.width);
            const sy = ((i * 97.3 + stateTimer * (1 + i % 3)) % C.height);
            X.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(stateTimer * 0.5 + i));
            X.fillStyle = '#ff88ff';
            X.beginPath(); X.arc(sx, sy, 1 + (i % 3) * 0.5, 0, Math.PI * 2); X.fill();
          } X.globalAlpha = 1;

          const cx = C.width / 2; const fs = (pct) => Math.min(C.width * pct, C.height * pct * 1.8);
          X.save(); X.textAlign = 'center'; const lineHeight = fs(0.04);
          let scrollSpeed = 30;
          if (currentAudioTrack && currentAudioTrack.duration && !isNaN(currentAudioTrack.duration)) {
            const totalHeight = reflexionLines.length * lineHeight;
            scrollSpeed = ((C.height * 0.5) + totalHeight) / currentAudioTrack.duration;
          }

          const totalScrollY = (currentAudioTrack && !currentAudioTrack.paused) ? (currentAudioTrack.currentTime * scrollSpeed) : (stateTimer * scrollSpeed);
          const startY = C.height * 0.65;

          let yPos = startY - totalScrollY;
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

          if (yPos < -300 || (keys[' '] && stateTimer > 2)) {
            if (window.speechSynthesis) speechSynthesis.cancel();
            if (currentAudioTrack) currentAudioTrack.pause();
            startLevel(7);
          }
        }
        else if (gameState === 'vs_screen') {
          const vsBg = rawImgs['assets/UX_Main_Menu_Nexus.png'];
          if (vsBg && vsBg.complete) {
            X.drawImage(vsBg, 0, 0, C.width, C.height);
          } else {
            X.fillStyle = '#0a0022'; X.fillRect(0, 0, C.width, C.height);
          }

          if (stateTimer > 4.5) {
            gameState = 'fighting'; stateTimer = 0;
            if (enemy) { enemy.facingRight = false; enemy.isBackTurned = false; }
          }

          const slideIn1 = Math.max(0, (stateTimer - 2.5) * C.width);
          const slideIn2 = Math.max(0, (stateTimer - 2.5) * C.width);

          X.save(); X.translate(-slideIn1 + C.width * 0.25, C.height * 0.55);
          const p1ImgSrc = player.fighterDir + '/_right.png';
          const kCanv = processedSprites[p1ImgSrc] || rawImgs[p1ImgSrc];
          if (kCanv) {
            const scale = (C.height * 0.7) / kCanv.height;
            X.scale(scale, scale);
            X.drawImage(kCanv, -kCanv.width / 2, -kCanv.height / 2, kCanv.width, kCanv.height);
          }
          X.restore();

          X.save(); X.translate(C.width + slideIn2 - C.width * 0.25, C.height * 0.55);
          const eImgSrc = enemy.fighterDir + '/_left.png';
          const eCanv = processedSprites[eImgSrc] || rawImgs[eImgSrc];
          if (eCanv) {
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
            drawBigText(txt, '#ffcc00', 1.0);
          } else if (stateTimer > 0.5) {
            drawBigText('READY...', '#ffffff', 0.8);
          } else if (stateTimer > 0) {
            drawBigText('FIGHT!', '#ff0055', 1.3);
          }
          if (stateTimer <= 0) gameState = 'fighting';
        }
        else if (gameState === 'fighting') {
          if (gameTimerStyle !== 'infinite') {
            roundTimerNum -= dt;
            if (roundTimerNum <= 0) roundTimerNum = 0;
          }

          player.update(dt, enemy); enemy.update(dt, player);

          particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.4; p.life -= dt * 2.5; }); particles = particles.filter(p => p.life > 0);
          projectiles = projectiles.filter(p => {
            const alive = p.update(dt);
            if (p.fromPlayer && p.checkHit(enemy)) return false;
            if (!p.fromPlayer && p.checkHit(player)) return false;
            return alive;
          });

          if (player.state === 'punch' || player.state === 'kick' || player.state === 'super') { enemy.draw(); player.draw(); }
          else { player.draw(); enemy.draw(); }

          projectiles.forEach(p => p.draw());
          particles.forEach(p => {
            X.save();
            if (p.isSpark) {
              X.globalAlpha = p.life * 1.5; X.translate(p.x, p.y); X.rotate(p.life * Math.PI); X.scale(p.life, p.life);
              X.fillStyle = '#fff'; X.shadowBlur = 30; X.shadowColor = p.color;
              X.beginPath();
              for (let k = 0; k < 8; k++) {
                const ang = k * Math.PI / 4; const r = k % 2 == 0 ? p.size : p.size / 4;
                X.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
              } X.closePath(); X.fill();
              X.strokeStyle = p.color; X.lineWidth = 4; X.beginPath(); X.arc(0, 0, p.size / 2, 0, Math.PI * 2); X.stroke();
            } else if (p.isLine) {
              X.globalAlpha = p.life * 2; X.strokeStyle = '#fff'; X.lineWidth = 3; X.shadowBlur = 10; X.shadowColor = '#ffcc00';
              X.beginPath(); X.moveTo(p.x - p.vx * 0.3, p.y - p.vy * 0.3); X.lineTo(p.x, p.y); X.stroke();
            } else {
              X.globalAlpha = p.life; X.fillStyle = p.color; X.shadowBlur = 10; X.shadowColor = p.color;
              X.beginPath(); X.arc(p.x, p.y, p.size, 0, Math.PI * 2); X.fill();
            }
            X.restore();
          });
          drawHUD(player, enemy, ld);

          const timeOver = gameTimerStyle !== 'infinite' && roundTimerNum <= 0;
          if (enemy.hp <= 0 || player.hp <= 0 || timeOver) {
            gameState = 'ko'; stateTimer = 3.5; screenShake = 20;
            SFX.stopMusic();

            p1WonLast = false;
            let winner = 'draw';
            if (player.hp > enemy.hp) { winner = 'p1'; p1Wins++; p1WonLast = true; }
            else if (enemy.hp > player.hp) { winner = 'p2'; p2Wins++; }
            else { p1Wins++; p2Wins++; p1WonLast = true; }

            if (winner === 'p1') { enemy.state = 'ko'; enemy.stateTimer = 99; }
            if (winner === 'p2') { player.state = 'ko'; player.stateTimer = 99; }
          }
        }
        else if (gameState === 'ko') {
          player.draw(); enemy.draw(); drawHUD(player, enemy, ld);

          let tStr = 'K.O.!'; let tc = '#ff0055';
          if (gameTimerStyle !== 'infinite' && roundTimerNum <= 0 && player.hp > 0 && enemy.hp > 0) {
            tStr = 'TIME OVER'; tc = '#ffcc00';
          } else if (p1WonLast && player.hp >= 100 && enemy.hp <= 0) {
            tStr = 'PERFECT!'; tc = '#00ff88';
          }
          drawBigText(tStr, tc, 1.5); stateTimer -= dt;

          if (stateTimer <= 0) {
            let roundsToWin = 2;
            if (gameMode === 'story') roundsToWin = 1;
            else roundsToWin = Math.ceil(arcadeRoundsLimit / 2);

            if (p1Wins >= roundsToWin) {
              if (currentLevel >= LEVELS.length - 1) {
                if (gameMode === 'story') {
                  localStorage.setItem('arcadeUnlocked', 'true');
                  const btnArcade = document.getElementById('btn-arcade');
                  if (btnArcade) {
                    btnArcade.style.color = '#00ffff'; btnArcade.style.borderColor = '#00ffff'; btnArcade.style.cursor = 'pointer'; btnArcade.textContent = 'ARCADE MODE';
                  }
                }
                gameState = 'victory'; stateTimer = 0;
                SFX.stopMusic();
                if (isMobile) document.getElementById('gamepad').style.display = 'none';

                playingOutro = false; playingHappyBirthday = false;
                playEpicVoice(epilogLines, 'epilogue');

              } else {
                gameState = 'nextLevel'; stateTimer = 1.5;
              }
            } else if (p2Wins >= roundsToWin) {
              gameState = 'continue'; stateTimer = 9.99;
            } else {
              roundNum++; startRound();
            }
          }
        }
        else if (gameState === 'nextLevel') {
          drawBigText(`STAGE ${LEVELS[currentLevel + 1]?._lvl || currentLevel + 2}`, '#00ffff', 1.2);
          X.save(); X.font = 'bold 22px "Orbitron"'; X.textAlign = 'center'; X.fillStyle = '#fff';
          X.fillText(LEVELS[currentLevel + 1].flag + ' ' + LEVELS[currentLevel + 1].name, C.width / 2, C.height * 0.58); X.restore();
          stateTimer -= dt; if (stateTimer <= 0) startLevel(currentLevel + 1);
        }
        else if (gameState === 'continue') {
          X.fillStyle = 'rgba(0,0,0,0.85)'; X.fillRect(0, 0, C.width, C.height);
          drawBigText('CONTINUE?', '#ffcc00', 1.2);
          X.save(); X.font = 'bold 120px "Orbitron"'; X.fillStyle = '#fff'; X.textAlign = 'center';
          X.fillText(Math.ceil(stateTimer), C.width / 2, C.height * 0.65);
          stateTimer -= dt;
          if (stateTimer <= 0) { gameState = 'gameOver'; stateTimer = 3; }
          X.font = '20px "Orbitron"'; X.globalAlpha = 0.5 + Math.sin(time * 5) * 0.5;
          X.fillText('PRESS SPACE OR TAP TO CONTINUE', C.width / 2, C.height * 0.85); X.restore();
        }
        else if (gameState === 'gameOver') {
          X.fillStyle = 'rgba(0,0,0,0.9)'; X.fillRect(0, 0, C.width, C.height);
          drawBigText('GAME OVER', '#ff0033', 1.5);
          X.save(); X.font = '20px "Orbitron"'; X.fillStyle = '#fff'; X.textAlign = 'center';
          X.globalAlpha = 0.5 + Math.sin(time * 5) * 0.5;
          X.fillText('TAP TO RETURN TO MENU', C.width / 2, C.height * 0.7); X.restore();
        }
        else if (gameState === 'victory') {
          stateTimer += dt; fwTimer -= dt;
          if (fwTimer <= 0) {
            fireworks.push(new Firework(C.width * 0.2 + Math.random() * C.width * 0.6, C.height * 0.1 + Math.random() * C.height * 0.4));
            fwTimer = 0.5 + Math.random() * 1.5;
          }
          fireworks.forEach(f => { f.update(); f.draw(); });

          let linesToUse = epilogLines;
          let scrollSpeedMultiplier = 1.2;

          if (!playingHappyBirthday) {
            X.save();
            const cx = C.width / 2; const fs = (pct) => Math.min(C.width * pct, C.height * pct * 1.8);
            X.textAlign = 'center';
            X.fillStyle = 'rgba(0,0,0,0.85)'; X.fillRect(0, 0, C.width, C.height);
            const lineHeight = fs(0.04);

            if (playingOutro) { linesToUse = outroLines; scrollSpeedMultiplier = 1.0; }

            let scrollSpeed = 35;
            if (currentAudioTrack && currentAudioTrack.duration && !isNaN(currentAudioTrack.duration)) {
              const totalHeight = linesToUse.length * lineHeight;
              scrollSpeed = ((C.height * 0.5) + totalHeight) / currentAudioTrack.duration;
            }

            const totalScrollY = (currentAudioTrack && !currentAudioTrack.paused) ? (currentAudioTrack.currentTime * scrollSpeed * scrollSpeedMultiplier * 1.3) : (stateTimer * scrollSpeed * 1.3);
            const startY = C.height * 0.8;
            let yPos = startY - totalScrollY;

            for (const line of linesToUse) {
              if (!line.text) { yPos += lineHeight * 0.6; continue; }
              if (line.text.startsWith('(')) { yPos += lineHeight * 0.5; continue; }

              if (yPos > -50 && yPos < C.height + 50) {
                const distFromCenter = Math.abs(yPos - C.height * 0.5); const maxDist = C.height * 0.55;
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

            if (yPos < -200 || (keys[' '] && stateTimer > 2)) {
              if (window.speechSynthesis) speechSynthesis.cancel();
              if (currentAudioTrack) currentAudioTrack.pause();
              if (!playingOutro) {
                playingOutro = true; stateTimer = 0; playEpicVoice(outroLines, 'outro'); keys[' '] = false;
              } else {
                playingHappyBirthday = true; keys[' '] = false;
              }
            }
          }
        }

        if (flashTimer > 0) { X.save(); X.globalAlpha = flashTimer * 2; X.fillStyle = '#fff'; X.fillRect(0, 0, C.width, C.height); X.restore(); flashTimer -= dt; }
        X.restore();

      } catch (err) {
        if (!window._loopErrLogged) {
          window._loopErrLogged = true; console.error('GAMELOOP ERROR:', err.message, err.stack);
        }
      }
    }

    // ===== MENU LOGIC =====
    window.openCharacterSelect = function (mode) {
      gameMode = mode;
      document.getElementById('main-menu').classList.add('hidden');
      document.getElementById('char-select').classList.add('visible');
    };

    window.toggleOptions = function () {
      const panel = document.getElementById('options-panel');
      if (panel.style.display === 'flex') {
        panel.style.display = 'none';
        if (gameState === 'options-paused') { gameState = 'fighting'; lastTime = performance.now(); }
      } else {
        panel.style.display = 'flex';
        if (gameState === 'fight' || gameState === 'fighting') { gameState = 'options-paused'; }
      }
    };

    window.togglePause = function () {
      const overlay = document.getElementById('pause-overlay');
      if (overlay.style.display === 'flex') {
        overlay.style.display = 'none';
        if (gameState === 'paused') { gameState = 'fighting'; lastTime = performance.now(); }
      } else {
        if (gameState === 'fight' || gameState === 'fighting') { gameState = 'paused'; overlay.style.display = 'flex'; }
      }
    };

    window.quitToMenu = function () {
      document.getElementById('pause-overlay').style.display = 'none';
      document.getElementById('gamepad').style.display = 'none';
      document.getElementById('mobile-hamburger').style.display = 'none';
      document.getElementById('main-menu').classList.remove('hidden');
      gameState = 'menu';
      SFX.stopMusic();
    };

    function bootGame() {
      console.log("BOOT GAME RUNNING");
      document.addEventListener('click', () => {
        if (gameState === 'init') {
          SFX.playTitleMusic();
          gameState = 'menu';
        }
      }, { once: true });
      requestAnimationFrame(gameLoop);

      // Auto-trigger for QA:
      setTimeout(() => {
        console.log("AUTO TRIGGERING STORY CLICK!");
        const btn = document.getElementById('btn-story');
        if (btn) btn.click();
      }, 2000);
    }

    // Bind story mode directly
    document.getElementById('btn-story').addEventListener('click', () => {
      console.log("STORY MODE CLICK LISTENER FIRED");
      gameMode = 'story';
      document.getElementById('main-menu').classList.add('hidden');
      gameState = 'prologue';
      stateTimer = 0;
      playEpicVoice(prologueLines, 'prologue');
      SFX.stopMusic();
    });

    document.getElementById('btn-arcade').addEventListener('click', () => {
      if (!document.getElementById('btn-arcade').disabled) {
        openCharacterSelect('arcade');
      }
    });

    document.getElementById('btn-versus').addEventListener('click', () => {
      if (!document.getElementById('btn-versus').disabled) {
        openCharacterSelect('versus');
      }
    });

    document.getElementById('btn-options-menu').addEventListener('click', toggleOptions);
    document.getElementById('btn-hamburger').addEventListener('click', toggleOptions);

    window.onload = bootGame;
  