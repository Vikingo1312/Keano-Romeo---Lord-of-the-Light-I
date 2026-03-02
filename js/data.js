// =========================================================================
// 2. DATA (ROSTER & LEVELS)
// =========================================================================
const LEVELS = [
  {
    id: 'hattori', name: 'HATTORI', flag: '🇯🇵', fighterDir: 'assets/CHARACTERS/1.Hattori_Japan', stage: 'assets/1_Japan.png', special: 'fire',
    bgm: 'assets/audio/music/1_Japan.mp3', voice: { intro: 'assets/audio/voice/hattori_intro.mp3', win: 'assets/audio/voice/hattori_win.mp3' },
    title: 'Ninja-Erbe', desc: 'Die Schatten sind sein Zuhause.', speedMult: 1.1, hitPow: 1.0, str: { spd: 8, pow: 4, def: 3 }, style: 'Ninjutsu',
    portrait: 'assets/CHARACTERS/1.Hattori_Japan/_front.png'
  },
  {
    id: 'raheel', name: 'RAHEEL', flag: '🇮🇳', fighterDir: 'assets/CHARACTERS/2.Raheel', stage: 'assets/2_India.png', special: 'fire',
    bgm: 'assets/audio/music/2_India.mp3', voice: { intro: 'assets/audio/voice/raheel_intro.mp3', win: 'assets/audio/voice/raheel_win.mp3' },
    title: 'Der Guru', desc: 'Spirituelle Kraft & Yoga-Griffe.', speedMult: 1.0, hitPow: 1.0, str: { spd: 4, pow: 5, def: 6 }, style: 'Kalaripayattu',
    portrait: 'assets/2.Raheel fighter_india_fullbody_1772216021163.png'
  },
  {
    id: 'pablo', name: 'PABLO', flag: '🇧🇷', fighterDir: 'assets/CHARACTERS/3.Pablo', stage: 'assets/3_Brazil.png', special: 'electric',
    bgm: 'assets/audio/music/3_Brazil.mp3', voice: { intro: 'assets/audio/voice/pablo_intro.mp3', win: 'assets/audio/voice/pablo_win.mp3' },
    title: 'Capoeira-Meister', desc: 'Akrobatik und rohe Gewalt.', speedMult: 1.2, hitPow: 0.9, str: { spd: 7, pow: 6, def: 4 }, style: 'Capoeira',
    portrait: 'assets/3.Pablo_Brazil.png'
  },
  {
    id: 'tzubaza', name: 'TZUBAZA', flag: '🇨🇳', fighterDir: 'assets/CHARACTERS/4.Tzubaza', stage: 'assets/4_China.png', special: 'wind',
    bgm: 'assets/audio/music/4_China.mp3', voice: { intro: 'assets/audio/voice/tzubaza_intro.mp3', win: 'assets/audio/voice/tzubaza_win.mp3' },
    title: 'Meister des Windes', desc: 'Traditionelles Kung-Fu.', speedMult: 1.1, hitPow: 1.0, str: { spd: 6, pow: 5, def: 5 }, style: 'Wushu',
    portrait: 'assets/4.Tzubaza fighter_china_fullbody_1772216008435.png'
  },
  {
    id: 'alcapone', name: 'AL CAPONE', flag: '🇮🇹', fighterDir: 'assets/CHARACTERS/5.Al_Capone', stage: 'assets/5_Italy.png', special: 'super',
    bgm: 'assets/audio/music/5_Italy.mp3', voice: { intro: 'assets/audio/voice/alcapone_intro.mp3', win: 'assets/audio/voice/alcapone_win.mp3' },
    title: 'Der Pate', desc: 'Kaltblütige Exekutionen.', speedMult: 0.9, hitPow: 1.3, str: { spd: 4, pow: 7, def: 6 }, style: 'Mafia Brawler',
    portrait: 'assets/5.Al_Capone_Italy.png'
  },
  {
    id: 'gargamel', name: 'C. GARGAMEL', flag: '🌑', fighterDir: 'assets/CHARACTERS/6.C_Gargamel_Techwear', stage: 'assets/6_Germany.png', special: 'super',
    bgm: 'assets/audio/music/6_Germany.mp3', voice: { intro: 'assets/audio/voice/gargamel_intro.mp3', win: 'assets/audio/voice/gargamel_win.mp3' },
    title: 'Cyber-Sorcerer', desc: 'Technologie & dunkle Magie.', speedMult: 1.0, hitPow: 1.1, str: { spd: 5, pow: 5, def: 5 }, style: 'Cyber-Sorcery',
    portrait: 'assets/6.C_Gargamel_Techwear.png'
  },
  {
    id: 'marley', name: 'MARLEY', flag: '🇯🇲', fighterDir: 'assets/CHARACTERS/7.Marley_Jamaica', stage: 'assets/7_Jamaica.png', special: 'electric',
    bgm: 'assets/audio/music/7_Jamaica.wav', voice: { intro: 'assets/audio/voice/marley_intro.mp3', win: 'assets/audio/voice/marley_win.mp3' },
    title: 'Karibik-Blitz', desc: 'One Love — One Knockout.', speedMult: 1.3, hitPow: 0.8, str: { spd: 8, pow: 4, def: 4 }, style: 'Dreadlock-Fu',
    portrait: 'assets/7.Marley_Jamaica.png'
  },
  {
    id: 'kowalski', name: 'KOWALSKI', flag: '🇵🇱', fighterDir: 'assets/CHARACTERS/8.Kowalski_Poland', stage: 'assets/8_Poland.png', special: 'super',
    bgm: 'assets/audio/music/8_Poland.mp3', voice: { intro: 'assets/audio/voice/kowalski_intro.mp3', win: 'assets/audio/voice/kowalski_win.mp3' },
    title: 'Stahl-Panzer', desc: 'Massive Kybernetik-Schläge.', speedMult: 0.8, hitPow: 1.5, str: { spd: 2, pow: 9, def: 9 }, style: 'Combat Sambo',
    portrait: 'assets/8.Kowalski_Poland.png'
  },
  {
    id: 'paco', name: 'PACO EL TACO', flag: '🇲🇽', fighterDir: 'assets/CHARACTERS/9.Paco_el_Taco', stage: 'assets/9_Mexico.png', special: 'wind',
    bgm: 'assets/audio/music/9_Mexico.mp3', voice: { intro: 'assets/audio/voice/paco_intro.mp3', win: 'assets/audio/voice/paco_win.mp3' },
    title: 'El Luchador', desc: 'Fliegend und vernichtend.', speedMult: 1.4, hitPow: 0.9, str: { spd: 9, pow: 4, def: 3 }, style: 'Lucha Libre',
    portrait: 'assets/9.Paco el Taco fighter_mexico_fullbody_1772216033577.png'
  },
  {
    id: 'juan', name: 'JUAN', flag: '🇪🇸', fighterDir: 'assets/CHARACTERS/10.Juan', stage: 'assets/10_Spain.png', special: 'fire',
    bgm: 'assets/audio/music/10_Spain.mp3', voice: { intro: 'assets/audio/voice/juan_intro.mp3', win: 'assets/audio/voice/juan_win.mp3' },
    title: 'El Matador', desc: 'Elegant und tödlich.', speedMult: 1.1, hitPow: 1.0, str: { spd: 6, pow: 6, def: 5 }, style: 'Flamenco-Arts',
    portrait: 'assets/10.Juan fighter_spain_fullbody_1772215943315.png'
  },
  {
    id: 'lee', name: 'LEE', flag: '🇯🇵', fighterDir: 'assets/CHARACTERS/11.Lee', stage: 'assets/11_Japan_Night.png', special: 'electric',
    bgm: 'assets/audio/music/11_Japan_Night.mp3', voice: { intro: 'assets/audio/voice/lee_intro.mp3', win: 'assets/audio/voice/lee_win.mp3' },
    title: 'Yakuza Boss', desc: 'Neon-Tokyo gehört ihm.', speedMult: 1.2, hitPow: 1.1, str: { spd: 7, pow: 5, def: 4 }, style: 'Kyokushin',
    portrait: 'assets/11.Lee fighter_japan_fullbody_1772215814623.png'
  },
  {
    id: 'jayden', name: 'JAYDEN', flag: '🇩🇪', fighterDir: 'assets/CHARACTERS/12.JJ_Dark', stage: 'assets/12_Dojo_Dark.png', special: 'dark',
    bgm: 'assets/audio/music/12_Dojo_Dark.mp3', voice: { intro: 'assets/audio/voice/jayden_intro.mp3', win: 'assets/audio/voice/jayden_win.mp3' },
    title: 'Anti-Hero', desc: 'Verschlingt alles Licht.', speedMult: 1.1, hitPow: 1.2, str: { spd: 6, pow: 7, def: 6 }, style: 'Dark Arts',
    portrait: 'assets/CHARACTERS/12.JJ_Dark/_front.png'
  },
  {
    id: 'putin', name: 'PUTIN', flag: '🇷🇺', fighterDir: 'assets/CHARACTERS/13.Putin', stage: 'assets/13_Russia_Ice.png', special: 'dark',
    bgm: 'assets/audio/music/13_Russia_Ice.wav', voice: { intro: 'assets/audio/voice/putin_intro.mp3', win: 'assets/audio/voice/putin_win.mp3' },
    title: 'Sibirische Kälte', desc: 'Unaufhaltbarer Frost.', speedMult: 0.75, hitPow: 1.8, str: { spd: 3, pow: 8, def: 8 }, style: 'Sambo / KGB',
    portrait: 'assets/13.Putin fighter_russia_fullbody_1772215831383.png'
  },
  {
    id: 'dark_vikingo', name: 'DARK VIKINGO', flag: '💀', fighterDir: 'assets/CHARACTERS/14.1.vikingo_shirtless', stage: 'assets/14_Valhalla_Boss.png', special: 'super',
    bgm: 'assets/audio/music/14_Valhalla_Boss.wav', voice: { intro: 'assets/audio/voice/vikingo_intro.mp3', win: 'assets/audio/voice/vikingo_win.mp3' },
    title: 'Entfesselte Urgewalt', desc: 'Ohne Limit. Kein Erbarmen.', speedMult: 1.5, hitPow: 2.5, str: { spd: 8, pow: 10, def: 7 }, style: 'Asgardian Rage',
    portrait: 'assets/14.1.vikingo_shirtless_solo_1772218100612.png'
  },
  {
    id: 'supreme_keano', name: 'SUPREME KEANO', flag: '🌌', fighterDir: 'assets/CHARACTERS/0.1.Supreme_Keano', stage: 'assets/UX_Main_Menu_Nexus.png', special: 'super',
    bgm: 'assets/audio/music/0_Keano_Theme.mp3', voice: { intro: 'assets/audio/voice/keano_intro.mp3', win: 'assets/audio/voice/keano_win.mp3' },
    title: 'Herrscher des Lichts', desc: 'Erwachte Form.', speedMult: 1.5, hitPow: 2.0, str: { spd: 9, pow: 8, def: 7 }, style: 'Divine Light',
    portrait: 'assets/clean_supreme_keano.png'
  },
  {
    id: 'hyper_keano', name: 'HYPER KEANO', flag: '⚡', fighterDir: 'assets/CHARACTERS/0.2.Hyper_Keano', stage: 'assets/UX_Main_Menu_Nexus.png', special: 'electric',
    bgm: 'assets/audio/music/0_Keano_Theme.mp3', voice: { intro: 'assets/audio/voice/keano_intro.mp3', win: 'assets/audio/voice/keano_win.mp3' },
    title: 'Lichtgeschwindigkeit', desc: 'Zusammengeschmolzen.', speedMult: 2.5, hitPow: 1.2, str: { spd: 10, pow: 7, def: 5 }, style: 'Lightning Strike',
    portrait: 'assets/clean_hyper_keano.png'
  },
  {
    id: 'jay_x', name: 'JAY X', flag: '🧬', fighterDir: 'assets/CHARACTERS/12.1.Jay_X', stage: 'assets/12_Dojo_Dark.png', special: 'dark',
    bgm: 'assets/audio/music/12_Dojo_Dark.mp3', voice: { intro: 'assets/audio/voice/jayden_intro.mp3', win: 'assets/audio/voice/jayden_win.mp3' },
    title: 'Mutierte DNS', desc: 'Unzerstörbar.', speedMult: 1.4, hitPow: 1.5, str: { spd: 8, pow: 8, def: 8 }, style: 'Mutant DNA',
    portrait: 'assets/base_jayden.png'
  },
  {
    id: 'gargamel_hoodie', name: 'DARK GARGAMEL', flag: '🌑', fighterDir: 'assets/CHARACTERS/6.1.C_Gargamel_Hoodie', stage: 'assets/6_Germany.png', special: 'dark',
    bgm: 'assets/audio/music/6_Germany.mp3', voice: { intro: 'assets/audio/voice/gargamel_intro.mp3', win: 'assets/audio/voice/gargamel_win.mp3' },
    title: 'Absoluter Schatten', desc: 'Verborgene Macht.', speedMult: 1.1, hitPow: 1.3, str: { spd: 6, pow: 6, def: 5 }, style: 'Shadow Arts',
    portrait: 'assets/6.1.C_Gargamel_Hoodie.png'
  },
  {
    id: 'vikingo_coat', name: 'VIKINGO', flag: 'ᛣ', fighterDir: 'assets/CHARACTERS/14.vikingo_coat', stage: 'assets/14_Valhalla_Boss.png', special: 'super',
    bgm: 'assets/audio/music/14_Valhalla_Boss.wav', voice: { intro: 'assets/audio/voice/vikingo_intro.mp3', win: 'assets/audio/voice/vikingo_win.mp3' },
    title: 'Der Imperator', desc: 'Meister aller Dimensionen.', speedMult: 1.3, hitPow: 1.4, str: { spd: 7, pow: 9, def: 9 }, style: 'Asgardian',
    portrait: 'assets/14.vikingo_coat_solo_1772218116323.png'
  },
  {
    id: 'simba', name: 'SIMBA', flag: '🐕‍🦺', fighterDir: 'assets/CHARACTERS/15.Simba', stage: 'assets/14_Valhalla_Boss.png', special: 'electric',
    bgm: 'assets/audio/music/14_Valhalla_Boss.wav', voice: { intro: 'assets/audio/voice/vikingo_intro.mp3', win: 'assets/audio/voice/vikingo_win.mp3' },
    title: 'Loyaler Wächter', desc: 'Vikingos Gefährte.', speedMult: 1.35, hitPow: 1.1, str: { spd: 9, pow: 7, def: 5 }, style: 'Beast',
    portrait: 'assets/CHARACTERS/15.Simba/_front.png'
  }
];

const KEANO = {
  id: 'keano', name: 'KEANO', flag: '🇩🇪', fighterDir: 'assets/CHARACTERS/0.Keano', special: 'electric',
  bgm: 'assets/audio/music/0_Keano_Theme.mp3', voice: { intro: 'assets/audio/voice/keano_intro.mp3', win: 'assets/audio/voice/keano_win.mp3' },
  title: 'Krieger des Lichts', desc: 'Der Auserwählte.', speedMult: 1.15, hitPow: 1.3, str: { spd: 8, pow: 7, def: 6 }, style: 'Lightbringer',
  portrait: 'assets/Keano_Fighter.png'
};

const PROP_MAP = {
  'hattori': 'lantern',
  'raheel': 'incense',
  'pablo': 'crate',
  'tzubaza': 'pagoda',
  'alcapone': 'trashcan',
  'gargamel': 'server',
  'marley': 'speaker',
  'kowalski': 'barrel',
  'paco': 'chair',
  'juan': 'barricade',
  'lee': 'neon',
  'jayden': 'shrine',
  'putin': 'ice',
  'dark_vikingo': 'brazier',
  'vikingo_coat': 'brazier',
  'supreme_keano': 'crystal',
  'hyper_keano': 'crystal',
  'jay_x': 'shrine',
  'gargamel_hoodie': 'shrine'
};

LEVELS.forEach(l => {
  l.objType = PROP_MAP[l.id] || 'crate';
});
KEANO.objType = 'crate';
