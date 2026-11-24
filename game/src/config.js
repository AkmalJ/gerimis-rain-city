// GERIMIS — central tuning sheet for the whole game.
//
// Design notes
// ------------
// Every module imports its shared numbers from here so the world stays
// coherent: one grid pitch, one road width, one clock start, one palette.
// The look is a deliberate clash — a deep slate-blue city drowned in rain,
// lit by saturated neon (pink / cyan / teal) and warm amber warung light.
// If a colour or a distance matters in two files, it lives in this file.
//
// Contents: world geometry, palette, district table + lookup, respect
// ranks, weapon table, crew table, POLRESTA flavour data, math helpers.

// ---------------------------------------------------------------- world
// The city is a square slab, roads on a regular grid. `pitch` is the
// distance between neighbouring road centrelines; `block` is what is
// left between two roads once the road and sidewalks are subtracted.
export const WORLD = {
  half: 380,               // playable area runs -380..380 on x and z
  pitch: 95,               // metres between road centrelines
  roadW: 17,               // asphalt width of one road
  block: 78,               // buildable block size inside the grid cell
  startClock: 19 * 60 + 5, // the night opens at 19:05, already raining
};

// ---------------------------------------------------------------- palette
export const PAL = {
  sky: 0x131e30, fog: 0x182636, fogDensity: 0.0042,
  ambient: 0x3a4c6e, hemiSky: 0x33507e, hemiGround: 0x0a0e14,
  asphalt: 0x11151d, asphaltSpec: 0x9db8dd, sidewalk: 0x232b38,
  neonPink: 0xff2e88, neonCyan: 0x00e5ff, neonTeal: 0x00ffc8,
  amber: 0xffb347, warung: 0xff9a3c, lampWhite: 0xcfe6ff,
  heroRed: 0xff2222, policeBlue: 0x2266ff, gangRed: 0xff3355,
  streakCore: 0xffe9b0, casing: 0xd8a83c, rainLine: 0xaed6ff,
};

// ---------------------------------------------------------------- districts
// Six named districts. hw/hd are half-extents around the centre point;
// `turf` is the standing control label the HUD shows on entry.
export const DISTRICTS = [
  { id: 'pusat',    name: 'PUSAT GERIMIS',  sub: 'Jalan Neon Raya', x: 0,    z: 0,    hw: 88, hd: 88, turf: 'NETRAL' },
  { id: 'terminal', name: 'TERMINAL BASAH', sub: 'Jalan Terminal',  x: -200, z: 55,   hw: 82, hd: 78, turf: 'NETRAL' },
  { id: 'pasar',    name: 'PASAR KABUT',    sub: 'Lorong Pasar',    x: 200,  z: 45,   hw: 82, hd: 78, turf: 'ANAK KABUT' },
  { id: 'stasiun',  name: 'STASIUN KOTA',   sub: 'Jalan Stasiun',   x: 45,   z: 215,  hw: 95, hd: 70, turf: 'NETRAL' },
  { id: 'kampung',  name: 'KAMPUNG ATAS',   sub: 'Tangga Seribu',   x: -185, z: -205, hw: 85, hd: 80, turf: 'ANAK KABUT' },
  { id: 'jalur',    name: 'JALUR KABUT',    sub: 'Turunan Puncak',  x: 205,  z: -210, hw: 90, hd: 80, turf: 'NETRAL' },
];

// First district whose rectangle contains the point, else null (open road).
export function districtAt(x, z) {
  const hit = DISTRICTS.find(d => Math.abs(x - d.x) <= d.hw && Math.abs(z - d.z) <= d.hd);
  return hit === undefined ? null : hit;
}

// ---------------------------------------------------------------- ranks
// Respect ladder: each rung unlocks at its `rp` threshold.
export const RANKS = [
  { name: 'ANAK TERMINAL', rp: 0 },
  { name: 'SOPIR ANDALAN', rp: 600 },
  { name: 'RAJA JALANAN',   rp: 1400 },
  { name: 'LEGENDA GERIMIS', rp: 2600 },
  { name: 'PENGUASA KABUT', rp: 4200 },
];

// Resolve a respect total into the current rung and the next one up
// (next is null at the top of the ladder).
export function rankFor(rp) {
  let cur = RANKS[0];
  let next = null;
  RANKS.forEach((rung, i) => {
    if (rp >= rung.rp) { cur = rung; next = RANKS[i + 1] || null; }
  });
  return { cur, next };
}

// ---------------------------------------------------------------- weapons
// rate = ms between shots, speed = streak travel speed (m/s),
// spread = aim cone jitter, pellets = streaks per trigger pull.
export const WEAPONS = [
  { id: 'fists', name: 'TANGAN KOSONG',   dmg: 0,  rate: 0,   speed: 0,   spread: 0,     auto: false },
  { id: 'p9',    name: 'P9',              dmg: 16, rate: 260, speed: 130, spread: 0.012, auto: false },
  { id: 'smg',   name: 'SMG RINTIK',      dmg: 11, rate: 95,  speed: 125, spread: 0.03,  auto: true },
  { id: 'laras', name: 'LARAS PETIR 12G', dmg: 34, rate: 720, speed: 115, spread: 0.055, auto: false, pellets: 3 },
];

// ---------------------------------------------------------------- crew
// One ability per crew member, bound to Z / X / C, cooldown in seconds.
export const CREW = [
  { id: 'sari',  name: 'SARI',  role: 'Sopir',     key: 'Z', ability: 'GANTI PLAT',      cd: 60 },
  { id: 'ujang', name: 'UJANG', role: 'Montir',    key: 'X', ability: 'PERBAIKAN CEPAT', cd: 45 },
  { id: 'ratna', name: 'RATNA', role: 'Pengintai', key: 'C', ability: 'MATA ELANG',      cd: 40 },
];

// ---------------------------------------------------------------- police flavour
export const POLICE_UNITS = ['RINTIK-12', 'BADAI-40', 'PETIR-07', 'GERIMIS-21', 'KABUT-03', 'HUJAN-55', 'AWAN-18', 'MENDUNG-09'];
export const POLICE_TACTICS = ['PURSUIT', 'ROADBLOCK', 'FLANKING', 'INTERCEPT', 'SHADOW'];
export const DISPATCH_QUOTES = [
  '"Satu orang, jaket hijau tua. Bagaimana dia masih melaju?"',
  '"Semua unit, hujan makin deras — jangan kehilangan dia."',
  '"Dia memotong lewat Pasar Kabut, ulangi, Pasar Kabut."',
  '"Platnya baru diganti. Cari Rintik GT merah, itu dia."',
  '"Air One di atas. Lampu sorot tetap kunci ke target."',
];

// ---------------------------------------------------------------- tiny math kit
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const dist2d = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

// "Rp21.750" — Indonesian thousands separator is a dot.
export const fmtRp = n => 'Rp' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// Minutes-since-midnight -> "19:05".
export const fmtClock = mins => {
  const hh = Math.floor(mins / 60) % 24;
  const mm = Math.floor(mins % 60);
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
};
