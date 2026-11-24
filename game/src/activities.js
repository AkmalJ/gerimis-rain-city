// GERIMIS — side activities: three street races and twelve lost parcels.
// One job: hold the optional content as data + tiny queries.

export const RACES = [
  {
    id: 'turunan', name: 'TURUNAN KABUT', par: 46,
    start: [285, -190], heading: -Math.PI / 2,
    checkpoints: [[190, -190], [95, -190], [0, -190], [-95, -190], [-190, -190]],
  },
  {
    id: 'terminal', name: 'KELILING TERMINAL', par: 38,
    start: [-285, 0], heading: 0,
    checkpoints: [[-190, 0], [-190, 95], [-285, 95], [-285, 0]],
  },
  {
    id: 'sprint', name: 'SPRINT JALUR BASAH', par: 40,
    start: [0, 285], heading: Math.PI,
    checkpoints: [[0, 190], [0, 95], [95, 95], [190, 95], [285, 95]],
  },
];

export function raceById(id) { return RACES.find(r => r.id === id) || null; }

// Twelve lost delivery parcels ("paket kiriman hilang") hidden around the city.
export const PACKAGES = [
  { id: 0, at: [-216, 66], hint: 'di bawah atap Terminal Basah' },
  { id: 1, at: [226, 30], hint: 'di antara kios Pasar Kabut' },
  { id: 2, at: [86, 240], hint: 'di ujung peron Stasiun Kota' },
  { id: 3, at: [-238, -238], hint: 'di sudut Kampung Atas' },
  { id: 4, at: [272, -238], hint: 'di bahu Jalur Kabut' },
  { id: 5, at: [-38, -38], hint: 'di gang belakang Hotel Gerimis' },
  { id: 6, at: [104, -104], hint: 'di persimpangan lampu neon' },
  { id: 7, at: [-104, 104], hint: 'di dekat pohon beringin kota' },
  { id: 8, at: [8, -272], hint: 'di ujung jalan utara' },
  { id: 9, at: [-272, -8], hint: 'di tepi barat kota' },
  { id: 10, at: [150, 150], hint: 'di blok perumahan tenggara' },
  { id: 11, at: [-150, 250], hint: 'di dekat rel selatan' },
];

export function packageAt(idx) { return PACKAGES[idx] || null; }
