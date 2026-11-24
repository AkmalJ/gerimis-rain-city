// GERIMIS — side activities: three street races + twelve lost parcels.
//
// The story jobs live in missions.js; everything optional lives here.
// Races are checkpoint chains with a par time (seconds). Parcels are the
// twelve "paket kiriman hilang" scattered off the main roads, each with
// a spoken-style hint the HUD can surface.

// Small factories keep the tables below terse and uniform.
const race = (id, name, par, start, heading, checkpoints) =>
  ({ id, name, par, start, heading, checkpoints });
const parcel = (id, at, hint) => ({ id, at, hint });

// ------------------------------------------------------------- races
// TURUNAN KABUT runs the fog highway west; KELILING TERMINAL loops the
// terminal block; SPRINT JALUR BASAH crosses the southern avenues.
export const RACES = [
  race('turunan', 'TURUNAN KABUT', 46, [285, -190], -Math.PI / 2,
    [[190, -190], [95, -190], [0, -190], [-95, -190], [-190, -190]]),
  race('terminal', 'KELILING TERMINAL', 38, [-285, 0], 0,
    [[-190, 0], [-190, 95], [-285, 95], [-285, 0]]),
  race('sprint', 'SPRINT JALUR BASAH', 40, [0, 285], Math.PI,
    [[0, 190], [0, 95], [95, 95], [190, 95], [285, 95]]),
];

export function raceById(id) {
  const found = RACES.find(r => r.id === id);
  return found === undefined ? null : found;
}

// ------------------------------------------------------------- parcels
export const PACKAGES = [
  parcel(0,  [-216, 66],   'di bawah atap Terminal Basah'),
  parcel(1,  [226, 30],    'di antara kios Pasar Kabut'),
  parcel(2,  [86, 240],    'di ujung peron Stasiun Kota'),
  parcel(3,  [-238, -238], 'di sudut Kampung Atas'),
  parcel(4,  [272, -238],  'di bahu Jalur Kabut'),
  parcel(5,  [-38, -38],   'di gang belakang Hotel Gerimis'),
  parcel(6,  [104, -104],  'di persimpangan lampu neon'),
  parcel(7,  [-104, 104],  'di dekat pohon beringin kota'),
  parcel(8,  [8, -272],    'di ujung jalan utara'),
  parcel(9,  [-272, -8],   'di tepi barat kota'),
  parcel(10, [150, 150],   'di blok perumahan tenggara'),
  parcel(11, [-150, 250],  'di dekat rel selatan'),
];

export function packageAt(idx) { return PACKAGES[idx] || null; }
