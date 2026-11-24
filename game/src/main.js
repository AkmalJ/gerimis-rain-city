// GERIMIS — the conductor module. It owns the loop and the state, and it
// wires the specialists together: city.js builds the world, actors.js the
// people and cars, effects.js the weather and ballistics, ambience.js the
// living street-level weather, hud.js everything the player reads,
// missions.js / activities.js the content, shots.js the staging.

const T = window.THREE;
import { WORLD, PAL, DISTRICTS, districtAt, WEAPONS, CREW, POLICE_UNITS, POLICE_TACTICS, DISPATCH_QUOTES, rankFor, clamp, lerp, rand, pick, dist2d } from './config.js';
import { buildCity, resolveCollisions } from './city.js';
import { Effects } from './effects.js';
import { Ambience } from './ambience.js';
import { makePed, animatePed, giveGun, gunMuzzleWorld, makeCarMesh, spinWheels, makeHeli } from './actors.js';
import { JOBS } from './missions.js';
import { RACES, PACKAGES } from './activities.js';
import { HUD } from './hud.js';
import { AudioSys } from './audio.js';
import { installStaging } from './shots.js';

// ---------------- state ----------------
// One flat state object for the whole run. S is also what hudState()
// snapshots for the HUD each frame and what the save file persists.
const SAVE_KEY = 'gerimis-save-v1';
const S = {
  // session
  mode: 'title', paused: false, boardOpen: false,
  // Damar
  health: 100, armour: 60, money: 2500, respect: 0,
  // police pressure
  wanted: 0, inSight: false, sightTimer: 0, dispatch: [], quote: '',
  // story progress
  jobIdx: 0, jobState: 'offer', stageIdx: 0, stageSpawned: false, stageKills: 0, stageGot: 0,
  // world progress
  clockMin: WORLD.startClock, packagesGot: new Set(), lifted: 0, raceBest: {},
  // loadout + crew
  weaponsOwned: [true, true, false, false], weaponIdx: 1,
  crewCd: { sari: 0, ujang: 0, ratna: 0 },
  // conversation + driving mirrors the HUD reads
  dialogue: null, dlgQueue: [], dlgT: 0,
  driving: false, speedKmh: 0, vehicleName: '', carHealth: 100,
  statsDirty: true,
};
let jobsDone = 0; // completed story jobs; lives outside S because the save predates it

// The save is deliberately small: money, respect, story position and the
// three collection counters. Health, wanted and position always restart
// at the station — waking up in Gerimis is the game's respawn fiction.
function saveGame() {
  const snapshot = {
    money: S.money, respect: S.respect, jobIdx: S.jobIdx, jobsDone,
    packages: [...S.packagesGot], lifted: S.lifted, raceBest: S.raceBest, weaponsOwned: S.weaponsOwned,
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot)); } catch (e) { /* private mode: play unsaved */ }
}
function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; }
}
function applySave(data) {
  if (!data) return false;
  S.money = data.money; S.respect = data.respect; S.jobIdx = data.jobIdx;
  jobsDone = data.jobsDone || 0;
  S.packagesGot = new Set(data.packages || []);
  S.lifted = data.lifted || 0;
  S.raceBest = data.raceBest || {};
  S.weaponsOwned = data.weaponsOwned || [true, true, false, false];
  return true;
}

// ---------------- three setup ----------------
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new T.Scene();
scene.background = new T.Color(PAL.sky);
scene.fog = new T.FogExp2(PAL.fog, PAL.fogDensity);
const camera = new T.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 900);

// Lighting recipe for the rain look: a cool ambient + hemisphere base,
// a pale moon key light, and one warm point glow at the city centre so
// the slate world always has amber in it — the MENCOLOK contrast the
// neon signs then sharpen. The key light CASTS: one directional with
// a modest shadow map whose ortho box rides the action (see loop),
// ambient trimmed down so forms model with real light and shade
// instead of reading as flat cutouts. Night-rain mood kept — just
// with depth.
scene.add(new T.AmbientLight(PAL.ambient, 0.52));
const hemisphere = new T.HemisphereLight(PAL.hemiSky, PAL.hemiGround, 0.45); scene.add(hemisphere);
const moonlight = new T.DirectionalLight(0x8fb4e8, 0.9);
moonlight.position.set(-60, 100, -40);
moonlight.castShadow = true;
moonlight.shadow.mapSize.set(2048, 2048);
moonlight.shadow.camera.left = -62;
moonlight.shadow.camera.right = 62;
moonlight.shadow.camera.top = 62;
moonlight.shadow.camera.bottom = -62;
moonlight.shadow.camera.near = 30;
moonlight.shadow.camera.far = 280;
moonlight.shadow.bias = -0.0004;
moonlight.shadow.normalBias = 0.03;
moonlight.shadow.camera.updateProjectionMatrix();
scene.add(moonlight); scene.add(moonlight.target);
const cityGlow = new T.PointLight(0xff9a3c, 0.7, 420); cityGlow.position.set(0, 26, 0); scene.add(cityGlow);

buildCity(scene);
const fx = new Effects(scene);
const ambience = new Ambience(scene);
const hud = new HUD();
const audio = new AudioSys();
fx.onThunder = () => audio.thunder();
// Where the title camera drifts: mid Jalan Neon Raya, so the title
// screen's rain, ripples and wisps all live on the same street.
const TITLE_ANCHOR = new T.Vector3(0, 0, -10);

// ---------------- entities ----------------
// Thin runtime wrappers around the actors.js meshes: the mesh draws, the
// wrapper remembers hp, intent and cooldowns.
function pedEntity(kind, style, x, z, heading = 0) {
  const mesh = makePed(style);
  mesh.position.set(x, 0, z); mesh.rotation.y = heading;
  scene.add(mesh);
  return {
    mesh, kind, hp: 100, alive: true, dead: 0, hostile: false, stageTag: false,
    phase: rand(0, 6), fireCd: rand(0.6, 2), aimBlend: 0,
    wanderT: rand(2, 6), tx: x, tz: z,
  };
}
function carEntity(kind, x, z, heading, role, color) {
  const mesh = makeCarMesh(kind, color);
  mesh.position.set(x, 0, z); mesh.rotation.y = heading;
  scene.add(mesh);
  return { mesh, kind, heading, role, speed: 0, hp: 100, steer: 0, aiT: rand(1, 3), len: mesh.userData.len || 4.2 };
}

// Display names for the speedometer and the theft toast, per car kind.
// Declared before the population code below, which names every car it parks.
const CAR_NAMES = {
  angkot: 'ANGKOT', bajaj: 'BAJAJ', bus: 'BUS MALAM', truk: 'TRUK SAYUR',
  coupe: 'RINTIK GT', cruiser: 'PATROLI POLRESTA', sedan: 'SEDAN KOTA', hatch: 'HATCHBACK',
};

// Damar spawns at the station with his crew in a loose triangle behind
// him — the first frame of play already tells the crew story.
const player = pedEntity('player', { shirt: 0x4a5548, pants: 0x22262e, capColor: 0x14181f }, 16, 178, Math.PI);
player.mesh.userData.parts.torso.material.color.set(0x44513f); // the dark olive rain jacket is his silhouette
giveGun(player.mesh, 'p9');
const crewPeds = {
  sari: pedEntity('crew', { shirt: 0xc2185b, pants: 0x23272e }, 13, 181),
  ujang: pedEntity('crew', { shirt: 0xf2b134, pants: 0x2f3e46 }, 19, 181),
  ratna: pedEntity('crew', { shirt: 0x00897b, pants: 0x1f2a44 }, 16, 184),
};
const civs = [], gangs = [], traffics = [], parkeds = [], cruisers = [];
let heli = null, heliPos = new T.Vector3(0, 60, 0);

// Sixteen civilians scattered across all six districts: umbrellas up or
// hoods on, because in Gerimis nobody walks dry.
const civSpots = [[-30, 60], [40, -20], [180, 20], [-180, 90], [60, 190], [-60, -60], [120, 60], [-120, -120], [230, 90], [-230, -40], [90, -160], [-90, 160], [10, 260], [260, 10], [-260, -160], [150, -60]];
civSpots.forEach(([sx, sz], i) => {
  const withUmbrella = Math.random() < 0.45;
  const civ = pedEntity('civ', {
    umbrella: withUmbrella ? pick([0xd81b60, 0x00897b, 0xf9a825, 0x3949ab]) : undefined,
    hood: Math.random() < 0.4,
  }, sx + rand(-6, 6), sz + rand(-6, 6), rand(0, 6.3));
  if (civ.mesh.userData.parts && withUmbrella) civ.mesh.userData.holdsUmbrella = true;
  civs.push(civ);
});
// Anak Kabut hold two corners of the map even before any job starts.
const gangHomes = [[216, 30], [188, 66], [228, 66], [-206, -186], [-168, -228], [240, 100]];
for (const [hx, hz] of gangHomes) {
  const member = pedEntity('gang', { gang: true, marker: true }, hx, hz, rand(0, 6.3));
  giveGun(member.mesh, pick(['p9', 'smg']));
  gangs.push(member);
}
// The hero coupe waits by the station in vivid red — the focal point of
// the cover frame and the first car every player steals.
const heroCar = carEntity('coupe', 26, 186, Math.PI / 2, 'parked');
heroCar.name = 'RINTIK GT';
parkeds.push(heroCar);
// Parked life: a weighted mix so angkot and hatchbacks dominate, the way
// they do on a real wet street.
const carKinds = ['angkot', 'sedan', 'hatch', 'bajaj', 'truk', 'sedan', 'angkot', 'hatch'];
const parkSpots = [[-196, 30], [-208, 78], [60, -30], [-60, 120], [120, -60], [-120, 40], [232, 120], [30, 232], [-40, -120], [170, 170], [-170, -60], [90, 90], [-90, -190], [250, -60], [-250, 150]];
parkSpots.forEach(([px, pz]) => {
  const parked = carEntity(pick(carKinds), px, pz, pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]), 'parked');
  parked.name = carName(parked.kind);
  parkeds.push(parked);
});
// Eleven movers on the grid lines, each with a fixed compass direction
// the traffic step steers and occasionally turns at intersections.
for (let i = 0; i < 11; i++) {
  const line = pick([-190, -95, 0, 95, 190]);
  const alongX = Math.random() < 0.5;
  const mover = carEntity(pick(carKinds), alongX ? rand(-300, 300) : line, alongX ? line : rand(-300, 300), 0, 'traffic');
  mover.name = carName(mover.kind);
  mover.dirx = alongX ? pick([1, -1]) : 0;
  mover.dirz = alongX ? 0 : pick([1, -1]);
  mover.heading = Math.atan2(mover.dirx, mover.dirz);
  mover.speed = rand(7, 11);
  traffics.push(mover);
}
// Terminal dressing: three buses and an angkot row under the shelter.
for (let i = 0; i < 3; i++) { const bus = carEntity('bus', -222 + i * 20, 55, Math.PI / 2, 'parked'); bus.name = 'BUS GERIMIS TRANS'; parkeds.push(bus); }
for (let i = 0; i < 3; i++) { const ang = carEntity('angkot', -186 + i * 13, 40, 0, 'parked'); ang.name = 'ANGKOT'; parkeds.push(ang); }

function carName(kind) { return CAR_NAMES[kind] || 'MOBIL'; }

// The twelve lost parcels: an amber box on the street with a thin gold
// beam over it, so a parcel reads from a block away in the rain.
const parcelMeshes = [];
{
  const parcelGeo = new T.BoxGeometry(0.72, 0.5, 0.72);
  const parcelMat = new T.MeshPhongMaterial({ color: 0xffb300, emissive: 0x664400, shininess: 60 });
  for (const parcel of PACKAGES) {
    const box = new T.Mesh(parcelGeo, parcelMat);
    box.position.set(parcel.at[0], 0.55, parcel.at[1]);
    scene.add(box); parcelMeshes.push(box);
    const beam = new T.Mesh(
      new T.CylinderGeometry(0.3, 0.5, 7, 8, 1, true),
      new T.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    beam.position.set(parcel.at[0], 3.5, parcel.at[1]);
    scene.add(beam); parcelMeshes.push(beam);
  }
}
// Two tall beams share one maker: gold for objectives, cyan for races.
function makeBeam(color) {
  const beam = new T.Mesh(
    new T.CylinderGeometry(0.9, 1.4, 42, 10, 1, true),
    new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
  beam.visible = false;
  scene.add(beam);
  return beam;
}
const objBeam = makeBeam(0xffd54f);
const raceBeam = makeBeam(0x00e5ff);

// ---------------- input ----------------
// Keyboard state is a plain code->down map the frame steps poll; the
// discrete actions (board, weapons, car, race, crew) fire on keydown.
const keys = {};
let camYaw = Math.PI, camPitch = 0.16, firing = false;
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Tab') { e.preventDefault(); toggleBoard(); }
  if (['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) selectWeapon(+e.code.slice(-1) - 1);
  if (e.code === 'KeyF') tryEnterExit();
  if (e.code === 'KeyE') tryRaceStart();
  if (e.code === 'KeyZ') crewAbility('sari');
  if (e.code === 'KeyX') crewAbility('ujang');
  if (e.code === 'KeyC') crewAbility('ratna');
  audio.init();
});
addEventListener('keyup', e => { keys[e.code] = false; });
renderer.domElement.addEventListener('mousedown', () => {
  audio.init();
  // Firing and pointer lock are the same gesture in play.
  if (S.mode === 'play' && !S.boardOpen) { firing = true; renderer.domElement.requestPointerLock?.(); }
});
addEventListener('mouseup', () => { firing = false; });
addEventListener('mousemove', e => {
  if (document.pointerLockElement !== renderer.domElement || S.mode !== 'play') return;
  camYaw -= e.movementX * 0.0026;
  camPitch = clamp(camPitch + e.movementY * 0.002, -0.12, 0.62);
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function selectWeapon(idx) {
  if (!S.weaponsOwned[idx]) { hud.showToast('Senjata belum dimiliki'); return; }
  S.weaponIdx = idx;
  const parts = player.mesh.userData.parts;
  if (idx === 0) {
    // Fists: the gun model leaves the hand entirely.
    if (player.mesh.userData.gun) { parts.armR.remove(player.mesh.userData.gun); player.mesh.userData.gun = null; }
    return;
  }
  giveGun(player.mesh, WEAPONS[idx].id);
}

// ---------------- helpers ----------------
function headingTo(ax, az, bx, bz) { return Math.atan2(bx - ax, bz - az); }
// Shortest-arc angle blend: the only safe way to turn anything in this game.
function angleLerp(from, to, t) {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return from + delta * t;
}
function say(name, role, text, dur = 3.8) { S.dlgQueue.push({ name, role, text, dur }); }
function gainWanted(amount, reason) {
  const before = S.wanted;
  S.wanted = clamp(S.wanted + amount, 0, 5);
  if (S.wanted > before && reason) hud.showToast('★ POLRESTA MEMBURU: ' + reason);
}
function currentJob() { return JOBS[S.jobIdx] || null; }
function currentStage() { const job = currentJob(); return job ? job.stages[S.stageIdx] : null; }
// Where the gold/cyan objective beam belongs right now: the giver while a
// job is on offer, the stage point while active, the quarry car mid-chase.
function objectivePos() {
  const job = currentJob(); if (!job) return null;
  if (S.jobState === 'offer') return { x: job.place[0], z: job.place[1] };
  const stage = currentStage(); if (!stage) return null;
  if (stage.type === 'chase' && targetCar && targetCar.alive !== false) {
    return { x: targetCar.mesh.position.x, z: targetCar.mesh.position.z };
  }
  return { x: stage.at[0], z: stage.at[1] };
}

// ---------------- cars: enter / drive ----------------
let playerCar = null;
function nearestCar(maxDist) {
  const pp = player.mesh.position;
  let best = null, bestDist = maxDist;
  for (const car of [...parkeds, ...traffics]) {
    const d = dist2d(pp.x, pp.z, car.mesh.position.x, car.mesh.position.z);
    if (d < bestDist) { bestDist = d; best = car; }
  }
  return best;
}
function tryEnterExit() {
  if (S.mode !== 'play') return;
  if (S.driving && playerCar) {
    // Step out on the car's left flank and hand the car back to the street.
    S.driving = false;
    const flank = new T.Vector3(1.6, 0, 0).applyAxisAngle(new T.Vector3(0, 1, 0), playerCar.heading);
    player.mesh.position.copy(playerCar.mesh.position).add(flank);
    player.mesh.visible = true;
    playerCar.role = 'parked';
    audio.setEngine(0, false);
    playerCar = null;
    return;
  }
  const car = nearestCar(3.6);
  if (!car) return;
  if (car.role === 'parked' && !car.counted) {
    // First theft of this car counts — and half the time, someone sees.
    car.counted = true;
    S.lifted++;
    hud.showToast('MOBIL DIAMBIL — total ' + S.lifted);
    if (Math.random() < 0.5) gainWanted(1, 'pencurian kendaraan');
  }
  car.role = 'player'; playerCar = car; S.driving = true;
  player.mesh.visible = false;
  camYaw = car.heading + Math.PI;
  hud.showToast(car.name + ' — WASD untuk menyetir, F untuk turun');
}
function tryRaceStart() {
  if (!S.driving || S.race) return;
  for (const race of RACES) {
    const atStart = dist2d(playerCar.mesh.position.x, playerCar.mesh.position.z, race.start[0], race.start[1]) < 10;
    if (!atStart) continue;
    S.race = { race, cp: 0, t: 0 };
    hud.showBanner('BALAPAN: ' + race.name, 'Ikuti cahaya biru — par ' + race.par + ' detik');
    audio.sting();
    return;
  }
}

// ---------------- crew abilities ----------------
// One key per crew member, one long cooldown each: Sari launders the
// car's identity, Ujang patches whatever is broken, Ratna sees the city.
function crewAbility(id) {
  if (S.mode !== 'play' || S.crewCd[id] > 0) return;
  const member = CREW.find(k => k.id === id);
  S.crewCd[id] = member.cd;
  if (id === 'sari') {
    if (S.wanted > 0) {
      S.wanted = Math.max(0, S.wanted - 1);
      S.sightTimer = 0;
      for (const cruiser of cruisers) cruiser.loseT = 5;
      hud.showToast('GANTI PLAT — Polresta kehilangan jejak, buronan turun');
    } else hud.showToast('GANTI PLAT — plat cadangan terpasang');
  } else if (id === 'ujang') {
    if (playerCar) { playerCar.hp = Math.min(100, playerCar.hp + 55); hud.showToast('PERBAIKAN CEPAT — kondisi mobil pulih'); }
    else { S.health = Math.min(100, S.health + 25); hud.showToast('PERBAIKAN CEPAT — Ujang menambal lukamu'); }
  } else {
    S.pingT = 9;
    hud.showToast('MATA ELANG — Ratna menandai paket & polisi di sekeliling');
  }
  audio.click();
}

// ---------------- combat ----------------
// The ballistics rule of the whole game: a bullet is a thing that
// travels. playerFire finds a lock near the camera ray, then hands
// effects.js a start point, a direction and a distance — the streak
// flies, and the hit lands when it arrives, never instantly.
let fireTimer = 0;
let targetPedList = null;

// Scan everything shootable and return the candidate closest to the
// crosshair ray: { ped } or { car }, plus the point to aim at.
function scanLock(origin, dir) {
  let lock = null, lockAngle = 0.035, lockDist = 70;
  const consider = (point, payload) => {
    const to = point.clone().sub(origin);
    const d = to.length();
    const ang = to.normalize().angleTo(dir);
    if (ang < lockAngle && d < lockDist) { lockAngle = ang; lockDist = d; lock = { ...payload, point }; }
  };
  const shootablePeds = [...gangs.filter(g => g.alive), ...(targetPedList || [])];
  for (const ped of shootablePeds) consider(ped.mesh.position.clone().setY(ped.mesh.position.y + 1.2), { ped });
  for (const cruiser of cruisers) consider(cruiser.mesh.position.clone().setY(cruiser.mesh.position.y + 0.8), { car: cruiser });
  if (targetCar && targetCar.alive !== false) consider(targetCar.mesh.position.clone().setY(targetCar.mesh.position.y + 0.8), { car: targetCar });
  return lock;
}

function playerFire(dt) {
  fireTimer -= dt * 1000;
  const weapon = WEAPONS[S.weaponIdx];
  const armed = S.weaponIdx > 0;
  if (!firing || !armed || S.driving || fireTimer > 0) {
    // Not shooting: the aim pose still rises while the trigger is held.
    player.aimBlend = lerp(player.aimBlend || 0, firing && armed ? 1 : 0, dt * 8);
    return;
  }
  fireTimer = weapon.rate;
  player.aimBlend = 1;
  audio.shot(weapon.id);
  const muzzle = gunMuzzleWorld(player.mesh);
  if (!muzzle) return;

  const dir = new T.Vector3(); camera.getWorldDirection(dir);
  const origin = camera.position.clone();
  const lock = scanLock(origin, dir);

  // One streak per pellet; the shotgun's spread is what makes it a shotgun.
  for (let p = 0; p < (weapon.pellets || 1); p++) {
    const shotDir = dir.clone();
    shotDir.x += rand(-weapon.spread, weapon.spread);
    shotDir.y += rand(-weapon.spread, weapon.spread);
    shotDir.z += rand(-weapon.spread, weapon.spread);
    shotDir.normalize();
    let hitPoint, onHit, travel;
    if (lock) {
      hitPoint = lock.point.clone();
      travel = muzzle.distanceTo(hitPoint);
      onHit = () => {
        fx.impactBurst(hitPoint, 5);
        if (lock.ped) damagePed(lock.ped, weapon.dmg);
        if (lock.car) damageCar(lock.car, weapon.dmg);
      };
    } else {
      // No lock: the round flies to the ray's end and bites the street.
      hitPoint = origin.clone().addScaledVector(shotDir, 65);
      if (hitPoint.y < 0.1) hitPoint.y = 0.1;
      travel = muzzle.distanceTo(hitPoint);
      onHit = () => fx.impactBurst(hitPoint, 3);
    }
    const from = muzzle.clone();
    fx.fireStreak(from, hitPoint.clone().sub(from).normalize(), travel, weapon.speed, onHit);
  }
  // Brass to the right of the aim, star on the true barrel tip.
  const right = new T.Vector3().crossVectors(dir, new T.Vector3(0, 1, 0)).normalize();
  fx.ejectCasing(muzzle.clone(), right);
  fx.muzzleStar(muzzle.clone(), S.weaponIdx === 2 ? 0.9 : 1.15);
  if (S.wanted < 3 && anyWitness()) gainWanted(1, 'tembak-menembak');
}
function anyWitness() {
  const pp = player.mesh.position;
  for (const civ of civs) {
    if (civ.alive && dist2d(civ.mesh.position.x, civ.mesh.position.z, pp.x, pp.z) < 30) return true;
  }
  return cruisers.length > 0;
}
function damagePed(ped, dmg) {
  if (!ped.alive) return;
  ped.hp -= dmg;
  ped.hostile = true; // getting shot settles any question of intent
  if (ped.hp > 0) return;
  ped.alive = false; ped.dead = 0.001;
  if (ped.stageTag) S.stageKills++;
  if (ped.kind === 'gang') gainWanted(1, 'korban jatuh');
}
function damageCar(car, dmg) {
  car.hp -= dmg;
  if (car.role === 'police') gainWanted(1, 'menembak polisi');
  if (car.hp > 0 || car.alive === false) return;
  car.alive = false; car.speed = 0;
  fx.impactBurst(car.mesh.position.clone().setY(1), 16);
  if (car === targetCar) hud.showToast('Mobil target lumpuh!');
}

// Enemy fire mirrors the player's: a hostile ped raises his gun, the
// streak travels, and the hit roll happens on arrival — distance is the
// only armour that always works.
function enemyFire(shooter, dt) {
  shooter.fireCd -= dt;
  const prey = S.driving && playerCar ? playerCar.mesh.position : player.mesh.position;
  const range = dist2d(shooter.mesh.position.x, shooter.mesh.position.z, prey.x, prey.z);
  shooter.aimBlend = lerp(shooter.aimBlend, (shooter.hostile && range < 40) ? 1 : 0, dt * 5);
  if (!shooter.hostile || range > 40 || shooter.fireCd > 0) return;
  shooter.fireCd = rand(1.3, 2.3);
  shooter.mesh.rotation.y = headingTo(shooter.mesh.position.x, shooter.mesh.position.z, prey.x, prey.z);
  const muzzle = gunMuzzleWorld(shooter.mesh);
  if (!muzzle) return;
  const aimPoint = prey.clone(); aimPoint.y += S.driving ? 0.8 : 1.15;
  aimPoint.x += rand(-0.7, 0.7); aimPoint.z += rand(-0.7, 0.7); // human error, both axes
  const from = muzzle.clone();
  const shotDir = aimPoint.clone().sub(from).normalize();
  audio.shot('p9');
  fx.muzzleStar(from.clone(), 0.9);
  const right = new T.Vector3().crossVectors(shotDir, new T.Vector3(0, 1, 0)).normalize();
  fx.ejectCasing(from.clone(), right);
  const hitChance = clamp(0.62 - range * 0.008, 0.15, 0.6);
  fx.fireStreak(from, shotDir, from.distanceTo(aimPoint), 125, () => {
    fx.impactBurst(aimPoint, 4);
    if (Math.random() < hitChance) hurtPlayer(rand(4, 9));
  });
}
function hurtPlayer(dmg) {
  // The vest eats 60% of a hit until it is gone; the rest is blood.
  const absorbed = Math.min(S.armour, dmg * 0.6);
  S.armour -= absorbed;
  S.health -= (dmg - absorbed);
  const flash = document.getElementById('hurt');
  flash.style.opacity = 0.85; setTimeout(() => { flash.style.opacity = 0; }, 130);
  if (S.health <= 0) playerDown();
}
function playerDown() {
  hud.showBanner('TERJATUH DI HUJAN', 'Kamu terbangun di Stasiun Kota — uang berkurang Rp1.500');
  S.money = Math.max(0, S.money - 1500);
  S.health = 100; S.armour = 30; S.wanted = 0;
  if (S.driving) tryEnterExit();
  player.mesh.position.set(24, 0, 196);
  saveGame();
}

// ---------------- missions engine ----------------
// A job is a list of stages; each stage knows how to spawn itself and
// how to recognise its own completion. updateMissions is the referee.
let targetCar = null;
const stageCrates = [];
function beginStage() {
  S.stageSpawned = true; S.stageKills = 0; S.stageGot = 0;
  const stage = currentStage(); if (!stage) return;
  if (stage.type === 'fight') {
    // The ambush: stage.count Anak Kabut scattered around the point.
    for (let i = 0; i < stage.count; i++) {
      const ambusher = pedEntity('gang', { gang: true, marker: true }, stage.at[0] + rand(-9, 9), stage.at[1] + rand(-9, 9), rand(0, 6.3));
      giveGun(ambusher.mesh, pick(['p9', 'smg', 'smg']));
      ambusher.stageTag = true; ambusher.hostile = true;
      gangs.push(ambusher);
    }
  } else if (stage.type === 'collect') {
    // Cyan document crates, dropped loose around the point.
    for (let i = 0; i < stage.count; i++) {
      const crate = new T.Mesh(new T.BoxGeometry(0.8, 0.55, 0.8), new T.MeshPhongMaterial({ color: 0x26c6da, emissive: 0x0d4d57, shininess: 60 }));
      crate.position.set(stage.at[0] + rand(-8, 8), 0.5, stage.at[1] + rand(-8, 8));
      scene.add(crate); stageCrates.push(crate);
    }
  } else if (stage.type === 'chase') {
    // The stolen twin of Damar's own car, already running west.
    targetCar = carEntity('coupe', stage.at[0], stage.at[1], -Math.PI / 2, 'target', 0xffc400);
    targetCar.name = 'RINTIK GT CURIAN'; targetCar.hp = 130; targetCar.speed = 13;
    targetCar.dirx = -1; targetCar.dirz = 0;
  } else if (stage.type === 'escape') {
    gainWanted(3, 'operasi Polresta'); // the stage IS the heat
  }
}
function endStageCleanup() {
  for (const crate of stageCrates) scene.remove(crate);
  stageCrates.length = 0;
  // A disabled chase car stays where it died: street evidence.
}
function completeJob() {
  const job = currentJob();
  S.money += job.rewardRp; S.respect += job.rewardRespect; jobsDone++;
  say(job.giver, job.role, job.outro);
  hud.showBanner('JOB SELESAI — ' + job.title, `+${job.rewardRp.toLocaleString('id-ID')} Rp • +${job.rewardRespect} respect`);
  audio.sting();
  // Story gifts: the SMG after job 5, the 12-gauge after job 7.
  if (S.jobIdx === 4 && !S.weaponsOwned[2]) { S.weaponsOwned[2] = true; hud.showToast('SENJATA BARU: SMG RINTIK (tekan 3)'); }
  if (S.jobIdx === 6 && !S.weaponsOwned[3]) { S.weaponsOwned[3] = true; hud.showToast('SENJATA BARU: LARAS PETIR 12G (tekan 4)'); }
  S.jobIdx++; S.jobState = 'offer'; S.stageIdx = 0; S.stageSpawned = false;
  saveGame();
}
function updateMissions(dt) {
  const job = currentJob();
  if (!job) { objBeam.visible = false; return; }
  // Keep the objective beam standing over whatever matters now.
  const objective = objectivePos();
  if (objective) {
    objBeam.visible = S.mode === 'play';
    objBeam.position.set(objective.x, 21, objective.z);
    objBeam.material.color.set(S.jobState === 'offer' ? 0xffd54f : 0x00e5ff);
  }
  const anchor = S.driving && playerCar ? playerCar.mesh.position : player.mesh.position;
  if (S.jobState === 'offer') {
    // Walk into the giver's circle and the job begins with its intro.
    if (dist2d(anchor.x, anchor.z, job.place[0], job.place[1]) < 5.5) {
      S.jobState = 'active'; S.stageIdx = 0; S.stageSpawned = false;
      for (const line of job.intro) say(job.giver, job.role, line);
      hud.showBanner('JOB ' + (S.jobIdx + 1) + ' — ' + job.title, job.giver + ' • ' + job.role);
      audio.sting();
    }
    return;
  }
  const stage = currentStage();
  if (!stage) { completeJob(); return; }
  if (!S.stageSpawned) beginStage();
  // Completion tests, one per stage type.
  let done = false;
  const gap = dist2d(anchor.x, anchor.z, stage.at[0], stage.at[1]);
  if (stage.type === 'go') done = gap < (S.driving ? 7.5 : 4.2);
  else if (stage.type === 'drive') done = S.driving && gap < 9;
  else if (stage.type === 'fight') done = S.stageKills >= stage.count;
  else if (stage.type === 'collect') {
    for (let i = stageCrates.length - 1; i >= 0; i--) {
      const crate = stageCrates[i];
      if (dist2d(anchor.x, anchor.z, crate.position.x, crate.position.z) < 3.2) {
        scene.remove(crate); stageCrates.splice(i, 1); S.stageGot++;
        audio.pickup(); hud.showToast(`Berkas diambil ${S.stageGot}/${stage.count}`);
      }
    }
    done = S.stageGot >= stage.count;
  }
  else if (stage.type === 'chase') done = targetCar && targetCar.alive === false;
  else if (stage.type === 'escape') done = S.wanted === 0;
  if (done) {
    endStageCleanup();
    S.stageIdx++; S.stageSpawned = false;
    if (S.stageIdx >= j.stages.length) completeJob();
    else hud.showToast('Tahap selesai — lanjutkan');
  }
}

// ---------------- police ----------------
// POLRESTA keeps wanted+1 cruisers in the world, spawned on a ring
// around the player so pressure arrives from a direction, not nowhere.
function spawnCruiser() {
  const pp = player.mesh.position;
  const bearing = rand(0, Math.PI * 2), ring = rand(62, 88);
  const x = clamp(pp.x + Math.cos(bearing) * ring, -360, 360);
  const z = clamp(pp.z + Math.sin(bearing) * ring, -360, 360);
  const cruiser = carEntity('cruiser', x, z, rand(0, 6.3), 'police');
  cruiser.name = 'PATROLI POLRESTA';
  cruiser.unit = POLICE_UNITS[cruisers.length % POLICE_UNITS.length];
  cruiser.tactic = pick(POLICE_TACTICS);
  cruiser.loseT = 0;
  cruisers.push(cruiser);
}
function updatePolice(dt) {
  const desiredCount = S.wanted === 0 ? 0 : Math.min(5, S.wanted + 1);
  while (cruisers.length < desiredCount) spawnCruiser();
  const anchor = S.driving && playerCar ? playerCar.mesh.position : player.mesh.position;
  for (let i = cruisers.length - 1; i >= 0; i--) {
    const cruiser = cruisers[i];
    const gap = dist2d(cruiser.mesh.position.x, cruiser.mesh.position.z, anchor.x, anchor.z);
    // Despawn: heat over and far away, or simply too far to matter.
    if ((S.wanted === 0 && gap > 40) || gap > 190) { scene.remove(cruiser.mesh); cruisers.splice(i, 1); continue; }
    if (cruiser.alive === false) { cruiser.speed = 0; continue; }
    if (cruiser.loseT > 0) cruiser.loseT -= dt;
    // Pursuit steering: chase the player's position, gentler while the
    // GANTI PLAT confusion (loseT) lasts.
    const chaseHeading = headingTo(cruiser.mesh.position.x, cruiser.mesh.position.z, anchor.x, anchor.z);
    cruiser.heading = angleLerp(cruiser.heading, chaseHeading, dt * (cruiser.loseT > 0 ? 0.4 : 1.6));
    const cruiseSpeed = S.wanted === 0 ? 0 : clamp(9 + S.wanted * 1.6, 0, 17);
    cruiser.speed = lerp(cruiser.speed, cruiser.loseT > 0 ? 4 : cruiseSpeed, dt * 0.8);
    moveCar(cruiser, dt, true);
    // Contact is a ram: both cars pay, the player pays in blood on foot.
    if (gap < 3.4) {
      if (S.driving && playerCar) {
        playerCar.hp -= 14 * dt * 4; cruiser.hp -= 6 * dt * 4;
        if (Math.random() < dt * 2) fx.impactBurst(anchor.clone().setY(0.8), 3);
      } else if (Math.random() < dt * 0.5) hurtPlayer(3);
    }
    // Light bar: the two lamps trade places on a fast sine.
    if (cruiser.mesh.userData.lightBar) {
      const phase = Math.sin(performance.now() * 0.012) > 0;
      cruiser.mesh.userData.lightBar.children[0].material.emissiveIntensity = phase ? 3.2 : 0.3;
      cruiser.mesh.userData.lightBar.children[1].material.emissiveIntensity = phase ? 0.3 : 3.2;
    }
  }
  // AIR ONE joins at four stars: an orbiting heli whose spotlight is a
  // promise — while it shines on you, the wanted level cannot decay.
  if (S.wanted >= 4) {
    if (!heli) { heli = makeHeli(); scene.add(heli); }
    heliPos.lerp(new T.Vector3(anchor.x + Math.sin(performance.now() * 0.0004) * 16, 33, anchor.z + Math.cos(performance.now() * 0.0004) * 16), dt * 1.4);
    heli.position.copy(heliPos);
    heli.userData.rotor.rotation.y += dt * 28;
    heli.lookAt(anchor.x, 33, anchor.z);
    heli.userData.spot.target.position.set(anchor.x - heliPos.x, -34, anchor.z - heliPos.z);
  } else if (heli) { scene.remove(heli); heli = null; }
  // Sight and decay: nine unseen seconds shed one star.
  let seen = false;
  for (const cruiser of cruisers) {
    if (dist2d(cruiser.mesh.position.x, cruiser.mesh.position.z, anchor.x, anchor.z) < 48 && cruiser.loseT <= 0) seen = true;
  }
  if (heli && S.wanted >= 4) seen = true;
  S.inSight = seen;
  if (S.wanted > 0) {
    if (seen) S.sightTimer = 0;
    else {
      S.sightTimer += dt;
      if (S.sightTimer > 9) { S.wanted--; S.sightTimer = 0; hud.showToast('Polresta kehilangan jejak — buronan turun'); }
    }
  }
  // The dispatch roster the HUD prints: nearest five units, AIR ONE first.
  const byDistance = [...cruisers].sort((a, b) =>
    dist2d(a.mesh.position.x, a.mesh.position.z, anchor.x, anchor.z) -
    dist2d(b.mesh.position.x, b.mesh.position.z, anchor.x, anchor.z));
  S.dispatch = byDistance.slice(0, 5).map((cruiser, i) => ({
    name: cruiser.unit || POLICE_UNITS[i],
    tactic: cruiser.tactic || 'PURSUIT',
    dist: dist2d(cruiser.mesh.position.x, cruiser.mesh.position.z, anchor.x, anchor.z),
  }));
  if (heli && S.wanted >= 4) S.dispatch.unshift({ name: 'AIR ONE', tactic: 'SHADOW', dist: 34 });
  if (Math.random() < dt * 0.14) S.quote = pick(DISPATCH_QUOTES);
}

// ---------------- traffic / car physics ----------------
// One integrator for every car in the game; only the steering differs.
function moveCar(car, dt, isPolice = false) {
  car.mesh.position.x += Math.sin(car.heading) * car.speed * dt;
  car.mesh.position.z += Math.cos(car.heading) * car.speed * dt;
  car.mesh.rotation.y = car.heading;
  spinWheels(car.mesh, car.speed * dt);
  if (!isPolice) resolveCollisions(car.mesh.position, 1.6); // police may cut corners; traffic may not
}
function updateTraffic(dt) {
  for (const car of traffics) {
    if (car.role !== 'traffic' || car.alive === false) continue;
    car.aiT -= dt;
    const pos = car.mesh.position;
    // Intersections are where a coordinate meets the 95 m grid pitch.
    const mod95 = v => ((v % 95) + 95) % 95;
    const nearCrossing = (mod95(pos.x) < 3 || mod95(pos.x) > 92) && (mod95(pos.z) < 3 || mod95(pos.z) > 92);
    if (car.aiT <= 0 && nearCrossing) {
      car.aiT = rand(1.5, 4);
      if (Math.random() < 0.45) {
        // Turn anywhere except back the way it came.
        const options = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([ox, oz]) => !(ox === -car.dirx && oz === -car.dirz));
        const [nx, nz] = pick(options);
        car.dirx = nx; car.dirz = nz;
      }
    }
    // The world edge turns everyone around.
    if (Math.abs(pos.x) > 366) car.dirx = pos.x > 0 ? -1 : 1;
    if (Math.abs(pos.z) > 366) car.dirz = pos.z > 0 ? -1 : 1;
    car.heading = angleLerp(car.heading, Math.atan2(car.dirx, car.dirz), dt * 2.4);
    car.speed = lerp(car.speed, 9.5, dt * 0.7);
    moveCar(car, dt);
    // Courtesy: traffic brakes when Damar is right in front of it.
    if (dist2d(pos.x, pos.z, player.mesh.position.x, player.mesh.position.z) < 7) car.speed = lerp(car.speed, 0, dt * 5);
  }
  // The chase quarry flees along the grid, away from the player, and
  // trades paint whenever the player closes to touching distance.
  if (targetCar && targetCar.alive !== false && currentStage()?.type === 'chase') {
    const quarry = targetCar, qp = quarry.mesh.position;
    const hunter = S.driving && playerCar ? playerCar.mesh.position : player.mesh.position;
    const awayHeading = headingTo(hunter.x, hunter.z, qp.x, qp.z);
    const fleeX = Math.abs(Math.sin(awayHeading)) > Math.abs(Math.cos(awayHeading)) ? Math.sign(Math.sin(awayHeading)) : 0;
    const fleeZ = fleeX === 0 ? Math.sign(Math.cos(awayHeading)) : 0;
    quarry.heading = angleLerp(quarry.heading, Math.atan2(fleeX, fleeZ), dt * 1.8);
    quarry.speed = lerp(quarry.speed, 14.5, dt * 0.8);
    moveCar(quarry, dt);
    if (S.driving && playerCar && dist2d(qp.x, qp.z, hunter.x, hunter.z) < 3.6) {
      quarry.hp -= 26 * dt * 3; playerCar.hp -= 8 * dt * 3;
      fx.impactBurst(qp.clone().setY(0.7), 4);
      if (quarry.hp <= 0) damageCar(quarry, 0);
    }
    if (quarry.hp <= 0 && quarry.alive !== false) damageCar(quarry, 0);
  }
}

// ---------------- peds AI ----------------
function updatePeds(dt) {
  const pp = player.mesh.position;
  // Civilians wander between nearby points — and run from gunfire or a
  // three-star street, which is most of the life the city shows.
  for (const civ of civs) {
    if (!civ.alive) continue;
    civ.wanderT -= dt;
    if (civ.wanderT <= 0) {
      civ.wanderT = rand(2.5, 6);
      civ.tx = civ.mesh.position.x + rand(-16, 16);
      civ.tz = civ.mesh.position.z + rand(-16, 16);
    }
    const panic = (firing || S.wanted >= 3) && dist2d(civ.mesh.position.x, civ.mesh.position.z, pp.x, pp.z) < 22;
    const destX = panic ? civ.mesh.position.x + (civ.mesh.position.x - pp.x) : civ.tx;
    const destZ = panic ? civ.mesh.position.z + (civ.mesh.position.z - pp.z) : civ.tz;
    walkToward(civ, destX, destZ, panic ? 3.4 : 1.1, dt);
  }
  // Hostile Anak Kabut hold a 13 m fighting distance and shoot in bursts;
  // the peaceful ones just stand their corner.
  for (const member of gangs) {
    if (!member.alive) { updateCorpse(member, dt); continue; }
    const range = dist2d(member.mesh.position.x, member.mesh.position.z, pp.x, pp.z);
    if (member.hostile && range < 42) {
      const drift = range > 16 ? 1 : range < 10 ? -1 : 0; // close in or back off toward 13 m
      if (drift !== 0) {
        const toward = headingTo(member.mesh.position.x, member.mesh.position.z, pp.x, pp.z);
        member.mesh.position.x += Math.sin(toward) * drift * 1.7 * dt;
        member.mesh.position.z += Math.cos(toward) * drift * 1.7 * dt;
        resolveCollisions(member.mesh.position, 0.5);
      }
      member.mesh.rotation.y = headingTo(member.mesh.position.x, member.mesh.position.z, pp.x, pp.z);
      enemyFire(member, dt);
      animatePed(member.mesh, 0.4, dt, member.aimBlend);
    } else {
      walkToward(member, member.mesh.position.x, member.mesh.position.z, 0, dt);
      animatePed(member.mesh, 0, dt, 0);
    }
  }
  // The crew trails Damar in a loose V on foot and vanishes while he
  // drives — three passengers would need a bigger story than this one.
  const crewInOrder = [crewPeds.sari, crewPeds.ujang, crewPeds.ratna];
  crewInOrder.forEach((member, i) => {
    member.mesh.visible = !S.driving;
    if (S.driving) return;
    const back = new T.Vector3(Math.sin(player.mesh.rotation.y), 0, Math.cos(player.mesh.rotation.y));
    const side = new T.Vector3(back.z, 0, -back.x);
    const slotX = pp.x - back.x * (1.6 + i * 0.4) + side.x * (i - 1) * 1.5;
    const slotZ = pp.z - back.z * (1.6 + i * 0.4) + side.z * (i - 1) * 1.5;
    const gap = dist2d(member.mesh.position.x, member.mesh.position.z, slotX, slotZ);
    walkToward(member, slotX, slotZ, gap > 6 ? 4.4 : 2.2, dt, gap < 0.5);
  });
}
function walkToward(ped, destX, destZ, speed, dt, idle = false) {
  const pos = ped.mesh.position;
  const gap = dist2d(pos.x, pos.z, destX, destZ);
  if (idle || gap < 0.3 || speed === 0) { animatePed(ped.mesh, 0, dt, ped.aimBlend || 0); return; }
  const heading = headingTo(pos.x, pos.z, destX, destZ);
  ped.mesh.rotation.y = angleLerp(ped.mesh.rotation.y, heading, dt * 8);
  pos.x += Math.sin(ped.mesh.rotation.y) * speed * dt;
  pos.z += Math.cos(ped.mesh.rotation.y) * speed * dt;
  resolveCollisions(pos, 0.45);
  animatePed(ped.mesh, speed, dt, ped.aimBlend || 0);
}
// The fallen fall fast, lie a while, then sink out of the street's memory.
function updateCorpse(ped, dt) {
  if (ped.dead === 0) return;
  ped.dead += dt;
  const mesh = ped.mesh;
  if (ped.dead < 0.35) {
    const fall = ped.dead / 0.35;
    mesh.rotation.x = -Math.PI / 2 * fall;
    mesh.position.y = 0.25 * fall;
  }
  if (ped.dead > 7) {
    mesh.position.y -= dt * 0.24;
    if (mesh.position.y < -1.6) { scene.remove(mesh); ped.dead = 0; }
  }
}

// ---------------- player ----------------
function updatePlayer(dt) {
  const pos = player.mesh.position;
  if (S.driving && playerCar) {
    const car = playerCar;
    const throttle = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    const steer = (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0);
    const boosting = keys.ShiftLeft || keys.ShiftRight;
    const topSpeed = boosting ? 34 : 26;
    if (throttle > 0) car.speed = Math.min(car.speed + 13 * dt, topSpeed);
    else if (throttle < 0) car.speed = Math.max(car.speed - 16 * dt, -9);
    else car.speed = lerp(car.speed, 0, dt * 0.55); // engine braking
    if (keys.Space) car.speed = lerp(car.speed, 0, dt * 3.4); // handbrake: one strong decay, applied once
    // Steering authority grows with speed, capped so the car stays a car.
    if (Math.abs(car.speed) > 0.4 && steer !== 0) {
      car.heading += steer * dt * clamp(Math.abs(car.speed) * 0.055, 0.2, 1.5) * Math.sign(car.speed);
    }
    const before = car.mesh.position.clone();
    moveCar(car, dt);
    // A building that eats most of a fast frame's travel is a crash.
    const travelled = before.distanceTo(car.mesh.position);
    if (Math.abs(car.speed) > 12 && travelled < Math.abs(car.speed) * dt * 0.4) {
      car.hp -= 6; car.speed *= 0.4;
      fx.impactBurst(car.mesh.position.clone().setY(0.7), 6);
    }
    S.speedKmh = Math.abs(car.speed) * 3.6;
    S.vehicleName = car.name || carName(car.kind);
    S.carHealth = car.hp;
    audio.setEngine(car.speed / 30, true);
    pos.copy(car.mesh.position);
    player.heading = car.heading;
    return;
  }
  audio.setEngine(0, false);
  // On foot: camera-relative WASD, walk 4.4, run 7.6 on Shift.
  const pace = (keys.ShiftLeft || keys.ShiftRight) ? 7.6 : 4.4;
  let strafe = 0, forward = 0;
  if (keys.KeyW) forward += 1; if (keys.KeyS) forward -= 1;
  if (keys.KeyA) strafe -= 1; if (keys.KeyD) strafe += 1;
  const moving = strafe !== 0 || forward !== 0;
  if (moving) {
    const heading = camYaw + Math.atan2(strafe, forward);
    player.mesh.rotation.y = angleLerp(player.mesh.rotation.y, heading, dt * 11);
    pos.x += Math.sin(player.mesh.rotation.y) * pace * dt;
    pos.z += Math.cos(player.mesh.rotation.y) * pace * dt;
    resolveCollisions(pos, 0.45);
  } else if (firing && S.weaponIdx > 0) {
    // Standing and shooting: face where the camera faces.
    player.mesh.rotation.y = angleLerp(player.mesh.rotation.y, camYaw + Math.PI, dt * 12);
  }
  animatePed(player.mesh, moving ? pace : 0, dt, player.aimBlend || 0);
  player.heading = player.mesh.rotation.y;
  S.speedKmh = 0;
  checkPackages(pos, 2.4);
}
// Parcels pay out on touch — on foot at arm's length, by car at a bumper's.
function checkPackages(at, radius) {
  PACKAGES.forEach((parcel, i) => {
    const boxMesh = parcelMeshes[i * 2], beamMesh = parcelMeshes[i * 2 + 1];
    if (S.packagesGot.has(parcel.id)) { boxMesh.visible = false; beamMesh.visible = false; return; }
    if (dist2d(at.x, at.z, parcel.at[0], parcel.at[1]) >= radius) return;
    S.packagesGot.add(parcel.id);
    S.money += 150; S.respect += 15;
    audio.pickup();
    hud.showToast(`PAKET HILANG DITEMUKAN ${S.packagesGot.size}/12 — +Rp150 (${parcel.hint})`);
    saveGame();
  });
}

// ---------------- races ----------------
// A race is a chain of cyan beams. Near a start beam in a car, the game
// offers; E accepts; every beam crossed starts the clock on the next.
function updateRace(dt) {
  raceBeam.visible = false;
  if (!S.race) {
    if (S.driving && playerCar) {
      for (const race of RACES) {
        const atStart = dist2d(playerCar.mesh.position.x, playerCar.mesh.position.z, race.start[0], race.start[1]) < 10;
        if (!atStart) continue;
        raceBeam.visible = true;
        raceBeam.position.set(race.start[0], 21, race.start[1]);
        showPrompt('E — Balapan: ' + race.name + ' (par ' + race.par + ' dtk)');
        return;
      }
    }
    hidePrompt();
    return;
  }
  const run = S.race; run.t += dt;
  const gate = run.race.checkpoints[run.cp];
  raceBeam.visible = true; raceBeam.position.set(gate[0], 21, gate[1]);
  const anchor = playerCar ? playerCar.mesh.position : player.mesh.position;
  if (dist2d(anchor.x, anchor.z, gate[0], gate[1]) < 10) {
    run.cp++; audio.pickup();
    if (run.cp >= run.race.checkpoints.length) {
      // Finish: par decides the prize, the clock decides the record.
      const time = run.t, previousBest = S.raceBest[run.race.id];
      const won = time <= run.race.par;
      if (!previousBest || time < previousBest) S.raceBest[run.race.id] = time;
      S.money += won ? 2000 : 600;
      S.respect += won ? 120 : 40;
      hud.showBanner(won ? 'BALAPAN MENANG!' : 'BALAPAN SELESAI', `${run.race.name} — ${time.toFixed(1)} detik (par ${run.race.par})`);
      S.race = null; saveGame();
    } else {
      hud.showToast(`Checkpoint ${run.cp}/${run.race.checkpoints.length} — ${run.t.toFixed(1)} dtk`);
    }
  }
  if (!S.driving) { hud.showToast('Balapan batal — kamu turun dari mobil'); S.race = null; }
}
let promptEl = null;
function showPrompt(text) {
  if (!promptEl) promptEl = document.getElementById('prompt');
  promptEl.textContent = text;
  promptEl.style.display = 'block';
}
function hidePrompt() { if (promptEl) promptEl.style.display = 'none'; }

// ---------------- board / pause ----------------
// TAB freezes the world behind the PETA KOTA poster. The board redraws
// twice a second while open — cheap canvas, live numbers.
const boardOverlay = document.getElementById('boardOverlay');
function toggleBoard() {
  if (S.mode !== 'play') return;
  S.boardOpen = !S.boardOpen;
  boardOverlay.style.display = S.boardOpen ? 'flex' : 'none';
  if (S.boardOpen) hud.drawBoard(hudState());
}
// The single snapshot both HUD surfaces consume: panels every frame, the
// board on its slower tick. Derived tallies (races won, the stats block)
// are computed here so the two surfaces can never disagree.
function hudState() {
  const anchor = S.driving && playerCar ? playerCar.mesh.position : player.mesh.position;
  const racesWon = RACES.filter(r => S.raceBest[r.id] && S.raceBest[r.id] <= r.par).length;
  return {
    job: currentJob(), jobIdx: S.jobIdx, stageIdx: S.stageIdx, stage: currentStage(),
    dispatch: S.dispatch, quote: S.quote, wanted: S.wanted, inSight: S.inSight,
    district: districtAt(anchor.x, anchor.z), clockMin: S.clockMin, money: S.money, respect: S.respect,
    racesWon, packagesGot: S.packagesGot.size, health: S.health, armour: S.armour,
    weaponIdx: S.weaponIdx, weaponsOwned: S.weaponsOwned, crewCd: S.crewCd,
    dialogue: S.dialogue, driving: S.driving, speedKmh: S.speedKmh, vehicleName: S.vehicleName, carHealth: S.carHealth,
    playerPos: anchor, playerHeading: S.driving && playerCar ? playerCar.heading : player.mesh.rotation.y,
    objective: objectivePos(),
    copDots: cruisers.map(c => ({ x: c.mesh.position.x, z: c.mesh.position.z })),
    stats: { jobsDone, packagesGot: S.packagesGot.size, racesWon, carsLifted: S.lifted },
    raceBest: S.raceBest,
  };
}

// ---------------- camera ----------------
// Three framings: the title drift, the follow cam (looser in a car,
// tight over-the-shoulder while aiming), and the staging override that
// shots.js installs for captures.
let titleAngkot = null;
function updateCamera(dt) {
  if (S.camOverride) {
    camera.position.copy(S.camOverride.pos);
    camera.lookAt(S.camOverride.look);
    return;
  }
  if (S.mode === 'title') {
    // The title lives on Jalan Neon Raya: one fixed, verified framing
    // down the neon street — signs and lit towers behind the wordmark,
    // the crossing angkot and the weather providing the motion. (Two
    // earlier framings failed in captures: the station drift clipped
    // the facade, and a drifting street cam wandered into a tower.)
    camera.position.set(0, 4.5, 30);
    camera.lookAt(-6, 11, -70);
    return;
  }
  const subject = S.driving && playerCar ? playerCar.mesh.position : player.mesh.position;
  const aiming = firing && !S.driving && S.weaponIdx > 0;
  const gap = S.driving ? 9.2 : aiming ? 3.6 : 6.4;
  const lift = S.driving ? 3.1 : aiming ? 1.75 : 2.3;
  const behind = new T.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
  const wanted = subject.clone().addScaledVector(behind, -gap);
  wanted.y = subject.y + lift + camPitch * 4;
  if (aiming) {
    const shoulder = new T.Vector3(behind.z, 0, -behind.x);
    wanted.addScaledVector(shoulder, 1.05);
  }
  camera.position.lerp(wanted, 1 - Math.pow(0.0001, dt));
  const gaze = subject.clone(); gaze.y += S.driving ? 1.6 : 1.5;
  gaze.addScaledVector(behind, 6);
  camera.lookAt(gaze);
  // Driving gently drags the camera behind the car's heading.
  if (S.driving && playerCar && (keys.KeyW || keys.KeyS)) {
    camYaw = angleLerp(camYaw, playerCar.heading + Math.PI, dt * 1.1);
  }
}

// ---------------- title flow ----------------
const titleEl = document.getElementById('titleScreen');
// The Continue button advertises the save it would load.
function refreshContinue() {
  const saved = loadSave();
  const info = document.getElementById('continueInfo');
  info.textContent = saved
    ? `Simpanan: Rp${saved.money.toLocaleString('id-ID')} • job ${(saved.jobsDone || 0)}/8 • paket ${(saved.packages || []).length}/12`
    : 'Belum ada simpanan';
}
document.getElementById('btnNew').addEventListener('click', () => {
  audio.init();
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* nothing to clear */ }
  startPlay(false);
});
document.getElementById('btnContinue').addEventListener('click', () => {
  audio.init();
  startPlay(true);
});
function startPlay(withSave) {
  if (withSave) applySave(loadSave());
  titleEl.style.display = 'none';
  S.mode = 'play';
  const job = currentJob();
  if (job) hud.showBanner('GERIMIS', 'Job menunggu: ' + job.title + ' — temui ' + job.giver);
  refreshPackagesVisibility();
}
function refreshPackagesVisibility() {
  PACKAGES.forEach((parcel, i) => {
    const found = S.packagesGot.has(parcel.id);
    parcelMeshes[i * 2].visible = !found;
    parcelMeshes[i * 2 + 1].visible = !found;
  });
}
// Title vista traffic: one angkot crosses the neon street through the
// title frame, headlights in the rain behind the menu.
titleAngkot = carEntity('angkot', -60, 2, Math.PI / 2, 'title');
titleAngkot.speed = 8;

// ---------------- main loop ----------------
// Three modes share one loop: title (vista only), board (frozen world,
// live poster), play (everything). dt is clamped so a hiccup can never
// tunnel a car through a building.
const clock = new T.Clock();
let boardTick = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const anchor = S.driving && playerCar ? playerCar.mesh.position : player.mesh.position;
  // The shadow key light rides the action: its ortho box stays
  // centred on what the camera watches (the title vista anchors on
  // the downtown street instead of on Damar).
  const lightAnchor = S.mode === 'title' ? TITLE_ANCHOR : anchor;
  moonlight.position.set(lightAnchor.x - 60, 100, lightAnchor.z - 40);
  moonlight.target.position.set(lightAnchor.x, 0, lightAnchor.z);

  if (S.mode === 'title') {
    titleAngkot.mesh.position.x += titleAngkot.speed * dt;
    titleAngkot.mesh.rotation.y = Math.PI / 2;
    spinWheels(titleAngkot.mesh, titleAngkot.speed * dt);
    if (titleAngkot.mesh.position.x > 90) titleAngkot.mesh.position.x = -70;
    fx.update(dt, TITLE_ANCHOR);
    ambience.update(dt, TITLE_ANCHOR);
    updateCamera(dt);
    renderer.render(scene, camera);
    return;
  }
  if (S.boardOpen) {
    boardTick -= dt;
    if (boardTick <= 0) { boardTick = 0.5; hud.drawBoard(hudState()); }
    renderer.render(scene, camera);
    return;
  }

  // The city clock runs a little slower than real time; the rain doesn't.
  S.clockMin += dt * 0.55;
  for (const id in S.crewCd) S.crewCd[id] = Math.max(0, S.crewCd[id] - dt);
  if (S.pingT > 0) S.pingT -= dt;

  // Dialogue: one speaker at a time, each line for its own duration.
  if (S.dlgQueue.length && !S.dialogue) { S.dialogue = S.dlgQueue.shift(); S.dlgT = S.dialogue.dur; }
  if (S.dialogue) { S.dlgT -= dt; if (S.dlgT <= 0) S.dialogue = null; }

  updatePlayer(dt);
  playerFire(dt);
  updateTraffic(dt);
  updatePeds(dt);
  updatePolice(dt);
  updateMissions(dt);
  updateRace(dt);
  if (S.driving && playerCar) checkPackages(playerCar.mesh.position, 3.6);
  // Shots fired inside 26 m of an uncommitted Anak Kabut commit him.
  for (const member of gangs) {
    if (member.alive && !member.hostile && !member.stageTag && firing &&
        dist2d(member.mesh.position.x, member.mesh.position.z, player.mesh.position.x, player.mesh.position.z) < 26) {
      member.hostile = true;
    }
  }
  // Parcel beams breathe; the two tall beams slowly counter-rotate.
  const pulse = 0.3 + 0.14 * Math.sin(performance.now() * 0.005);
  parcelMeshes.forEach((mesh, i) => { if (i % 2 === 1) mesh.material.opacity = pulse; });
  objBeam.rotation.y += dt * 0.7;
  raceBeam.rotation.y -= dt * 0.9;

  fx.update(dt, anchor);
  ambience.update(dt, anchor);
  hud.update(dt, hudState());
  document.getElementById('insight').style.display = S.inSight ? 'block' : 'none';
  document.getElementById('crosshair').style.display = (!S.driving && S.weaponIdx > 0) ? 'block' : 'none';
  updateCamera(dt);
  renderer.render(scene, camera);
}

// ---------------- staging ----------------
// The handle shots.js composes captures through. It exists in every
// build but stays inert unless the URL asks for a stage — plain play
// never calls it and never sees __gerimisDebug.
const api = {
  S, scene, camera, fx, hud, player, crewPeds, heroCar, gangs, cruisers, traffics, parkeds,
  carEntity, pedEntity, giveGun, say,
  setPlayerCar(car) {
    playerCar = car; S.driving = !!car;
    if (car) { car.role = 'player'; player.mesh.visible = false; }
  },
  getPlayerCar: () => playerCar,
  spawnCruiserAt(x, z, heading) {
    const cruiser = carEntity('cruiser', x, z, heading, 'police');
    cruiser.unit = POLICE_UNITS[cruisers.length % POLICE_UNITS.length];
    cruiser.tactic = pick(POLICE_TACTICS);
    cruisers.push(cruiser);
    return cruiser;
  },
  startJobAt(idx) { S.jobIdx = idx; S.jobState = 'active'; S.stageIdx = 0; S.stageSpawned = false; },
  setStage(i) { S.stageIdx = i; S.stageSpawned = false; },
  // Plant a coherent mid-game Damar: the captures' ledger, money and
  // parcel state all come from this one seed, so frames agree.
  seedStats(seed) {
    S.money = seed.money; S.respect = seed.respect; jobsDone = seed.jobsDone;
    S.packagesGot = new Set(seed.packages);
    S.lifted = seed.lifted; S.raceBest = seed.raceBest;
    S.weaponsOwned = [true, true, true, true];
    refreshPackagesVisibility();
  },
  beginCurrentStage: () => beginStage(),
  duelVolley() {
    // One readable hero burst at the nearest hostile, with return fire
    // unlocked in the same instant — the duel frame needs both
    // directions of streaks alive together.
    player.aimBlend = 1;
    const muzzle = gunMuzzleWorld(player.mesh);
    if (!muzzle) return;
    let nearest = null, nearestDist = 60;
    for (const member of gangs) {
      if (!member.alive || !member.hostile) continue;
      const d = player.mesh.position.distanceTo(member.mesh.position);
      if (d < nearestDist) { nearestDist = d; nearest = member; }
    }
    if (nearest) {
      const chest = nearest.mesh.position.clone(); chest.y += 1.15;
      const from = muzzle.clone();
      const shotDir = chest.clone().sub(from).normalize();
      fx.muzzleStar(from.clone(), 1.05);
      const right = new T.Vector3().crossVectors(shotDir, new T.Vector3(0, 1, 0)).normalize();
      fx.ejectCasing(from.clone(), right);
      audio.shot('smg');
      fx.fireStreak(from, shotDir, from.distanceTo(chest), 125, () => fx.impactBurst(chest, 5));
    }
    for (const member of gangs) if (member.alive && member.hostile) member.fireCd = Math.min(member.fireCd, 0.05);
  },
  setWanted(n) { S.wanted = n; },
  setCam(pos, look) { S.camOverride = { pos: new T.Vector3(...pos), look: new T.Vector3(...look) }; },
  clearCam() { S.camOverride = null; },
  hideTitle() { titleEl.style.display = 'none'; S.mode = 'play'; },
  refreshPackagesVisibility,
};
// Boot: staging installs only when asked, the Continue line is priced
// from any existing save, and the loop starts on the title vista.
if (new URLSearchParams(location.search).has('stage')) {
  installStaging(api);
}
refreshContinue();
loop();

export { S, api };
