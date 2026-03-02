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
  { text: '', style: 'gap' }
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
  { text: 'KEANO ROMEO - LORD OF THE LIGHT', style: 'producer' },
  { text: '© 2026', style: 'narr' },
  { text: '', style: 'gap' },
  { text: '', style: 'gap' }
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
  { text: 'und leuchtet.', style: 'glow', color: '#00ffff' }
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
  { text: 'Aber der Fluss lässt sich nicht aufhalten.', style: 'bold', color: '#aaddff' },
  { text: '(Lange, ausklingende Pause)', style: 'gap' },
  { text: '', style: 'gap' }
];

const birthdayLines = [
  { text: '', style: 'gap' },
  { text: '🏆 HAPPY BIRTHDAY KEANO! 🏆', style: 'mega', color: '#ffcc00' },
  { text: '', style: 'gap' },
  { text: '🎇', style: 'glow', color: '#ffcc00' },
  { text: '', style: 'gap-sm' },
  { text: 'Ein Lichtkristall wurde dir freigeschaltet –', style: 'bold', color: '#00ffff' },
  { text: 'ein Geschenk des Lords of the Light selbst.', style: 'bold', color: '#00ffff' },
  { text: '', style: 'gap' },
  { text: 'Mit diesem Kristall kannst du', style: 'narr' },
  { text: 'epische Icons für deinen Avatar erwerben.', style: 'narr' },
  { text: '', style: 'gap-sm' },
  { text: 'Er kann nur vom Lord of the Light', style: 'italic', color: '#aaddff' },
  { text: 'genutzt werden und muss bei deinem Vater', style: 'italic', color: '#aaddff' },
  { text: 'eingelöst werden bis zum nächsten Lichtmond,', style: 'italic', color: '#aaddff' },
  { text: 'am 28. Februar 2027.', style: 'bold', color: '#ffcc00' },
  { text: '', style: 'gap' },
  { text: 'Möge dein Licht hell brennen', style: 'glow', color: '#00ffff' },
  { text: 'und jede Dimension erleuchten,', style: 'italic', color: '#aaddff' },
  { text: 'die du betrittst.', style: 'italic', color: '#aaddff' },
  { text: '', style: 'gap' },
  { text: 'In Liebe, Papa ❤️', style: 'glow', color: '#ffcc00' },
  { text: '', style: 'gap' },
  { text: '', style: 'gap' },
  { text: 'KEANO ROMEO - LORD OF THE LIGHT', style: 'producer' },
  { text: '© 2026', style: 'narr' },
  { text: '', style: 'gap' }
];

const audioTracks = {
  prologue: new Audio('assets/audio/voice/prologue.mp3'),
  reflexion: new Audio('assets/audio/voice/reflexion.mp3'),
  epilogue: new Audio('assets/audio/voice/epilogue.mp3'),
  outro: new Audio('assets/audio/voice/outro.mp3')
};
let currentAudioTrack = null;

let voiceAudioCtx = null;
let voiceFilter, voiceSources = {};

function initVoiceEffects() {
  if (voiceAudioCtx) return;
  voiceAudioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // Wärme (Bass Boost & Low-Mid Warmth) - PET Pad Restauration
  voiceFilter = voiceAudioCtx.createBiquadFilter();
  voiceFilter.type = 'lowshelf';
  voiceFilter.frequency.value = 180; // Tiefer ansetzen für echte Stimmwärme
  voiceFilter.gain.value = 8; // Deutlich mehr Wärme

  // Sanfter Raum (sehr subtil, ohne Echo/Verdopplung)
  const convolver = voiceAudioCtx.createConvolver();
  // Studio Polish 2: Voice Compressor & Warm Room (No Echo)
  const compressor = voiceAudioCtx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-24, voiceAudioCtx.currentTime); // Catch spoken peaks early
  compressor.knee.setValueAtTime(10, voiceAudioCtx.currentTime);       // Smooth compression curve
  compressor.ratio.setValueAtTime(4, voiceAudioCtx.currentTime);       // 4:1 Ratio (studio standard voice)
  compressor.attack.setValueAtTime(0.005, voiceAudioCtx.currentTime);  // Fast attack
  compressor.release.setValueAtTime(0.15, voiceAudioCtx.currentTime);  // Smooth release

  // Very short, thick 'Slap/Room' feel to avoid distinct echoing
  const delay = voiceAudioCtx.createDelay();
  delay.delayTime.value = 0.04; // 40ms = Room reflections, not a canyon echo

  const voiceGain = voiceAudioCtx.createGain();
  voiceGain.gain.value = 0.8; // Wieder etwas lauter, da Halleffekt wegfällt

  // Routing: Filter -> Compressor -> Split (Direct + Room Body) -> Gain
  voiceFilter.connect(compressor);

  compressor.connect(voiceGain);

  compressor.connect(delay);
  const delayGain = voiceAudioCtx.createGain();
  delayGain.gain.value = 0.25; // Thicker body presence
  delay.connect(delayGain);
  delayGain.connect(voiceGain);

  voiceGain.connect(voiceAudioCtx.destination);
}

function playEpicVoice(linesArray, type) {
  if (currentAudioTrack) currentAudioTrack.pause();
  currentAudioTrack = audioTracks[type];

  if (currentAudioTrack) {
    if (!voiceAudioCtx) initVoiceEffects();
    if (voiceAudioCtx.state === 'suspended') voiceAudioCtx.resume();

    if (!voiceSources[type]) {
      try {
        voiceSources[type] = voiceAudioCtx.createMediaElementSource(currentAudioTrack);
        voiceSources[type].connect(voiceFilter);
      } catch (e) { console.warn("AudioContext connect fail:", e); }
    }

    SFX.duckBGM(0.15, 1000);
    if (SFX.startAmbientPad) SFX.startAmbientPad();
    currentAudioTrack.currentTime = 0;

    // Track ending triggers next scene AND clears pad (Capcom Sequence Fix)
    currentAudioTrack.addEventListener('ended', () => {
      SFX.restoreBGM();
      if (SFX.stopAmbientPad) SFX.stopAmbientPad();

      // Auto-jump to next state when voice sequence is completely done
      if (window.gameState === 'prologue' || window.gameState === 'midpoint_reflexion' || window.gameState === 'epilogue' || window.gameState === 'victory') {
        // This syncs the transition exactly to the end of the voice track instead of a random timer
        setTimeout(() => {
          if (typeof keys !== 'undefined') keys[' '] = true;
          setTimeout(() => { if (typeof keys !== 'undefined') keys[' '] = false; }, 100);
        }, 500);
      }
    }, { once: true });

    currentAudioTrack.play().catch(e => {
      console.warn("Could not play MP3, using browser TTS fallback:", e);
      playFallbackTTS(linesArray);
    });
  } else {
    playFallbackTTS(linesArray);
  }
}

// STOPS any currently playing voice sequence immediately
function stopEpicVoice() {
  if (currentAudioTrack) {
    currentAudioTrack.pause();
    currentAudioTrack.currentTime = 0;
  }
  if (window.speechSynthesis) {
    speechSynthesis.cancel();
  }
  SFX.restoreBGM();
  if (SFX.stopAmbientPad) SFX.stopAmbientPad();
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

  SFX.duckBGM(0.15, 1000);
  u.onend = () => { SFX.restoreBGM(); };

  speechSynthesis.speak(u);
}

// ===== HUD (MODERNIZED & CAPCOM STYLE) =====
