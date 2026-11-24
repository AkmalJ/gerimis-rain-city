// GERIMIS — shared configuration: world layout, districts, ranks, weapons.
// One job: hold every constant the other modules agree on.

export const WORLD = {
  half: 380,          // city spans -380..380 on both axes
  pitch: 95,          // road grid pitch (metres between road centrelines)
  roadW: 17,          // road width
  block: 78,          // buildable block size between roads
  startClock: 19 * 60 + 5, // 19:05, rainy evening
};

// BOLD palette: deep slate-blue world vs saturated neon + amber warung light.
export const PAL = {
  sky: 0x131e30, fog: 0x182636, fogDensity: 0.0042,
  ambient: 0x3a4c6e, hemiSky: 0x33507e, hemiGround: 0x0a0e14,
  asphalt: 0x11151d, asphaltSpec: 0x9db8dd, sidewalk: 0x232b38,
  neonPink: 0xff2e88, neonCyan: 0x00e5ff, neonTeal: 0x00ffc8,
  amber: 0xffb347, warung: 0xff9a3c, lampWhite: 0xcfe6ff,
  heroRed: 0xff2222, policeBlue: 0x2266ff, gangRed: 0xff3355,
  streakCore: 0xffe9b0, casing: 0xd8a83c, rainLine: 0xaed6ff,
};

export const DISTRICTS = [
  { id: 'pusat',    name: 'PUSAT GERIMIS', sub: 'Jalan Neon Raya',    x: 0,    z: 0,    hw: 88,  hd: 88,  turf: 'NETRAL' },
  { id: 'terminal', name: 'TERMINAL BASAH', sub: 'Jalan Terminal',    x: -200, z: 55,   hw: 82,  hd: 78,  turf: 'NETRAL' },
  { id: 'pasar',    name: 'PASAR KABUT',    sub: 'Lorong Pasar',      x: 200,  z: 45,   hw: 82,  hd: 78,  turf: 'ANAK KABUT' },
  { id: 'stasiun',  name: 'STASIUN KOTA',   sub: 'Jalan Stasiun',     x: 45,   z: 215,  hw: 95,  hd: 70,  turf: 'NETRAL' },
  { id: 'kampung',  name: 'KAMPUNG ATAS',   sub: 'Tangga Seribu',     x: -185, z: -205, hw: 85,  hd: 80,  turf: 'ANAK KABUT' },
  { id: 'jalur',    name: 'JALUR KABUT',    sub: 'Turunan Puncak',    x: 205,  z: -210, hw: 90,  hd: 80,  turf: 'NETRAL' },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (Math.abs(x - d.x) <= d.hw && Math.abs(z - d.z) <= d.hd) return d;
  }
  return null;
}

export const RANKS = [
  { name: 'ANAK TERMINAL', rp: 0 },
  { name: 'SOPIR ANDALAN', rp: 600 },
  { name: 'RAJA JALANAN', rp: 1400 },
  { name: 'LEGENDA GERIMIS', rp: 2600 },
  { name: 'PENGUASA KABUT', rp: 4200 },
];

export function rankFor(rp) {
  let cur = RANKS[0], next = null;
  for (let i = 0; i < RANKS.length; i++) {
    if (rp >= RANKS[i].rp) { cur = RANKS[i]; next = RANKS[i + 1] || null; }
  }
  return { cur, next };
}

export const WEAPONS = [
  { id: 'fists', name: 'TANGAN KOSONG', dmg: 0, rate: 0, speed: 0, spread: 0, auto: false },
  { id: 'p9',    name: 'P9',            dmg: 16, rate: 260, speed: 130, spread: 0.012, auto: false },
  { id: 'smg',   name: 'SMG RINTIK',    dmg: 11, rate: 95,  speed: 125, spread: 0.03,  auto: true },
  { id: 'laras', name: 'LARAS PETIR 12G', dmg: 34, rate: 720, speed: 115, spread: 0.055, auto: false, pellets: 3 },
];

export const CREW = [
  { id: 'sari',  name: 'SARI',  role: 'Sopir',   key: 'Z', ability: 'GANTI PLAT',     cd: 60 },
  { id: 'ujang', name: 'UJANG', role: 'Montir',  key: 'X', ability: 'PERBAIKAN CEPAT', cd: 45 },
  { id: 'ratna', name: 'RATNA', role: 'Pengintai', key: 'C', ability: 'MATA ELANG',    cd: 40 },
];

export const POLICE_UNITS = ['RINTIK-12', 'BADAI-40', 'PETIR-07', 'GERIMIS-21', 'KABUT-03', 'HUJAN-55', 'AWAN-18', 'MENDUNG-09'];
export const POLICE_TACTICS = ['PURSUIT', 'ROADBLOCK', 'FLANKING', 'INTERCEPT', 'SHADOW'];
export const DISPATCH_QUOTES = [
  '"Satu orang, jaket hijau tua. Bagaimana dia masih melaju?"',
  '"Semua unit, hujan makin deras — jangan kehilangan dia."',
  '"Dia memotong lewat Pasar Kabut, ulangi, Pasar Kabut."',
  '"Platnya baru diganti. Cari Rintik GT merah, itu dia."',
  '"Air One di atas. Lampu sorot tetap kunci ke target."',
];

export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const dist2d = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
export const fmtRp = n => 'Rp' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const fmtClock = mins => {
  const h = Math.floor(mins / 60) % 24, m = Math.floor(mins % 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
};
