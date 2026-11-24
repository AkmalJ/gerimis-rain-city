// GERIMIS — actor factory: pedestrians, guns, vehicles, the AIR ONE heli.
// One job: build every moving mesh the world animates.

const T = window.THREE;
import { PAL, rand, pick } from './config.js';

function box(w, h, d, color, opts = {}) {
  const m = new T.Mesh(
    new T.BoxGeometry(w, h, d),
    new T.MeshPhongMaterial({ color, shininess: opts.shine ?? 12, emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.ei ?? 1 })
  );
  m.castShadow = false; m.receiveShadow = false;
  return m;
}

function textPlate(text, w, h, fg, bg, fontPx = 64) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
  g.font = `900 ${fontPx}px Arial, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = fg; g.shadowBlur = 16;
  g.fillStyle = fg;
  g.fillText(text, c.width / 2, c.height / 2 + 2);
  const tex = new T.CanvasTexture(c);
  const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, transparent: false }));
  return m;
}

// ---------- pedestrians ----------
const SKIN = [0xe8b98d, 0xc98d5f, 0x9c6b43, 0x7a4e2e];
const SHIRTS = [0x2e86ab, 0xf2b134, 0x7fb069, 0xbc4749, 0x5f6caf, 0x25a18e, 0xd90368, 0x8d6e63];
const PANTS = [0x23272e, 0x2f3e46, 0x3d405b, 0x54494b, 0x1f2a44];

export function makePed(opts = {}) {
  const g = new T.Group();
  const skin = opts.skin ?? pick(SKIN);
  const shirt = opts.shirt ?? pick(SHIRTS);
  const pants = opts.pants ?? pick(PANTS);

  const legL = new T.Group(); legL.position.set(-0.11, 0.78, 0);
  const legR = new T.Group(); legR.position.set(0.11, 0.78, 0);
  const ll = box(0.17, 0.78, 0.2, pants); ll.position.y = -0.39; legL.add(ll);
  const lr = box(0.17, 0.78, 0.2, pants); lr.position.y = -0.39; legR.add(lr);
  g.add(legL, legR);

  const torso = box(0.52, 0.66, 0.28, shirt, { shine: 26 });
  torso.position.y = 1.11; g.add(torso);
  if (opts.gang) { // ANAK KABUT: grey hoodie + red chest band
    torso.material.color.set(0x565d66);
    const band = box(0.54, 0.12, 0.3, 0xd21f3c, { emissive: 0x550a14 }); band.position.y = 1.18; g.add(band);
  }
  if (opts.police) {
    torso.material.color.set(0x1d3fbf);
    const vest = box(0.54, 0.4, 0.3, 0xd8e021, { emissive: 0x333d05 }); vest.position.y = 1.14; g.add(vest);
  }

  const headG = new T.Group(); headG.position.y = 1.44;
  const head = box(0.34, 0.36, 0.34, skin); head.position.y = 0.18; headG.add(head);
  if (opts.hood || opts.gang) {
    const hood = box(0.42, 0.2, 0.42, opts.gang ? 0x454b54 : shirt); hood.position.y = 0.4; headG.add(hood);
  } else if (opts.cap !== false) {
    const cap = box(0.38, 0.1, 0.38, opts.capColor ?? 0x14181f); cap.position.y = 0.4; headG.add(cap);
    const brim = box(0.36, 0.04, 0.22, opts.capColor ?? 0x14181f); brim.position.set(0, 0.36, 0.26); headG.add(brim);
  }
  g.add(headG);

  const armL = new T.Group(); armL.position.set(-0.33, 1.38, 0);
  const armR = new T.Group(); armR.position.set(0.33, 1.38, 0);
  const al = box(0.15, 0.62, 0.17, shirt); al.position.y = -0.31; armL.add(al);
  const ar = box(0.15, 0.62, 0.17, shirt); ar.position.y = -0.31; armR.add(ar);
  const handL = box(0.13, 0.13, 0.13, skin); handL.position.y = -0.66; armL.add(handL);
  const handR = box(0.13, 0.13, 0.13, skin); handR.position.y = -0.66; armR.add(handR);
  g.add(armL, armR);

  if (opts.umbrella) {
    const um = new T.Group();
    const canopy = new T.Mesh(new T.ConeGeometry(0.78, 0.3, 8), new T.MeshPhongMaterial({ color: opts.umbrella, shininess: 60 }));
    canopy.position.y = 0.62; um.add(canopy);
    const stick = box(0.035, 0.7, 0.035, 0x222222); stick.position.y = 0.26; um.add(stick);
    um.position.set(0.1, -0.6, 0.08);
    armR.add(um);
    armR.rotation.x = -0.5;
  }
  if (opts.marker) { // floating gang marker
    const mk = new T.Mesh(new T.ConeGeometry(0.16, 0.3, 4), new T.MeshBasicMaterial({ color: PAL.gangRed }));
    mk.rotation.x = Math.PI; mk.position.y = 2.15; g.add(mk);
    g.userData.marker = mk;
  }
  g.userData.parts = { legL, legR, armL, armR, headG, torso };
  g.userData.phase = rand(0, 6);
  return g;
}

export function animatePed(ped, speed, dt, aimBlend = 0) {
  const p = ped.userData.parts;
  ped.userData.phase += dt * (2.2 + speed * 2.4);
  const ph = ped.userData.phase, amp = Math.min(0.62, speed * 0.16);
  p.legL.rotation.x = Math.sin(ph) * amp;
  p.legR.rotation.x = -Math.sin(ph) * amp;
  if (aimBlend > 0.02) {
    // Real aim pose: gun arm up and forward, support arm tucked across.
    p.armR.rotation.x = -1.5 * aimBlend;
    p.armR.rotation.z = -0.12 * aimBlend;
    p.armL.rotation.x = -1.05 * aimBlend;
    p.armL.rotation.z = 0.55 * aimBlend;
    p.armL.rotation.y = -0.5 * aimBlend;
  } else {
    p.armL.rotation.x = -Math.sin(ph) * amp * 0.8;
    p.armR.rotation.x = Math.sin(ph) * amp * 0.8;
    p.armL.rotation.z = 0; p.armR.rotation.z = 0; p.armL.rotation.y = 0;
    if (ped.userData.holdsUmbrella) p.armR.rotation.x = -0.5;
  }
}

// ---------- guns ----------
export function makeGunMesh(kind) {
  const g = new T.Group();
  const body = new T.MeshPhongMaterial({ color: 0x14161a, shininess: 70 });
  const steel = new T.MeshPhongMaterial({ color: 0x9aa4ae, shininess: 90 });
  const add = (geo, mat, x, y, z) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  if (kind === 'p9') {
    add(new T.BoxGeometry(0.055, 0.11, 0.24), body, 0, 0, 0.02);
    add(new T.BoxGeometry(0.045, 0.05, 0.2), steel, 0, 0.07, 0.03);
    add(new T.BoxGeometry(0.05, 0.14, 0.07), body, 0, -0.1, -0.05);
    g.userData.muzzle = new T.Vector3(0, 0.03, 0.16);
    g.userData.len = 0.26;
  } else if (kind === 'smg') {
    add(new T.BoxGeometry(0.06, 0.13, 0.46), body, 0, 0, 0.05);
    add(new T.BoxGeometry(0.04, 0.04, 0.2), steel, 0, 0.02, 0.36);
    add(new T.BoxGeometry(0.045, 0.2, 0.06), body, 0, -0.15, 0.02);
    add(new T.BoxGeometry(0.05, 0.09, 0.16), body, 0, 0.03, -0.22);
    g.userData.muzzle = new T.Vector3(0, 0.02, 0.47);
    g.userData.len = 0.52;
  } else { // laras long gun
    add(new T.BoxGeometry(0.065, 0.13, 0.72), body, 0, 0, 0.1);
    add(new T.BoxGeometry(0.045, 0.045, 0.34), steel, 0, 0.03, 0.6);
    add(new T.BoxGeometry(0.055, 0.1, 0.2), new T.MeshPhongMaterial({ color: 0x5a3a22, shininess: 30 }), 0, -0.02, -0.32);
    add(new T.BoxGeometry(0.05, 0.16, 0.07), body, 0, -0.13, -0.05);
    g.userData.muzzle = new T.Vector3(0, 0.03, 0.79);
    g.userData.len = 0.85;
  }
  return g;
}

// Parent a gun into a ped's right hand; returns the gun group.
export function giveGun(ped, kind) {
  const p = ped.userData.parts;
  if (ped.userData.gun) { p.armR.remove(ped.userData.gun); }
  const gun = makeGunMesh(kind);
  gun.position.set(0, -0.68, 0.06);
  gun.rotation.x = Math.PI / 2 - 0.12; // barrel forward when the arm raises
  p.armR.add(gun);
  ped.userData.gun = gun;
  return gun;
}

const _mv = new T.Vector3();
export function gunMuzzleWorld(ped) {
  const gun = ped.userData.gun;
  if (!gun) return null;
  _mv.copy(gun.userData.muzzle);
  return gun.localToWorld(_mv);
}

// ---------- vehicles ----------
const ANGKOT_COLORS = [0xffc400, 0x00c853, 0xff6d00, 0x00b0ff, 0xff1744, 0x76ff03];
const CAR_COLORS = [0xb0bec5, 0x546e7a, 0x8e24aa, 0x00897b, 0x3949ab, 0x6d4c41, 0xf4511e, 0x7cb342];

function wheel(r = 0.34) {
  const w = new T.Mesh(new T.CylinderGeometry(r, r, 0.22, 12), new T.MeshPhongMaterial({ color: 0x0c0d10, shininess: 40 }));
  w.rotation.z = Math.PI / 2;
  return w;
}

function headlightCones(group, x, y, z, spread = 0.62) {
  const mat = new T.MeshBasicMaterial({ color: 0xffeebb, transparent: true, opacity: 0.16, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
  for (const s of [-1, 1]) {
    const cone = new T.Mesh(new T.ConeGeometry(1.05, 7.5, 10, 1, true), mat);
    cone.rotation.x = Math.PI / 2 + 0.06;
    cone.position.set(x + s * spread, y, z + 3.6);
    group.add(cone);
    const lamp = box(0.26, 0.13, 0.06, 0xfff6c9, { emissive: 0xffedb5, ei: 2.2 });
    lamp.position.set(x + s * spread, y, z + 0.02);
    group.add(lamp);
  }
}

export function makeCarMesh(kind, color) {
  const g = new T.Group();
  const wheels = [];
  const addWheel = (x, y, z, r) => { const w = wheel(r); w.position.set(x, y, z); g.add(w); wheels.push(w); };
  let len = 4.2;

  if (kind === 'angkot') {
    const c = color ?? pick(ANGKOT_COLORS);
    const bodyM = box(1.85, 1.15, 3.9, c, { shine: 60 }); bodyM.position.y = 0.95; g.add(bodyM);
    const roof = box(1.9, 0.14, 3.95, 0xf5f5f5, { shine: 40 }); roof.position.y = 1.6; g.add(roof);
    const glass = box(1.87, 0.5, 3.2, 0x10222e, { shine: 90 }); glass.position.y = 1.24; g.add(glass);
    const board = textPlate('TERMINAL — PASAR', 1.5, 0.34, '#06121a', '#ffd54f', 58);
    board.position.set(0, 1.32, 1.99); g.add(board);
    const board2 = board.clone(); board2.rotation.y = Math.PI; board2.position.z = -1.99; g.add(board2);
    addWheel(-0.85, 0.34, 1.25); addWheel(0.85, 0.34, 1.25); addWheel(-0.85, 0.34, -1.25); addWheel(0.85, 0.34, -1.25);
    headlightCones(g, 0, 0.62, 1.95);
    len = 3.9;
  } else if (kind === 'bajaj') {
    const c = color ?? 0xff9100;
    const bodyM = box(1.35, 0.8, 2.2, c, { shine: 55 }); bodyM.position.y = 0.72; g.add(bodyM);
    const canopy = box(1.45, 0.5, 1.5, 0x21262e, { shine: 20 }); canopy.position.set(0, 1.32, -0.25); g.add(canopy);
    const shield = box(1.2, 0.55, 0.08, 0x9fd8e8, { shine: 90 }); shield.position.set(0, 1.15, 0.95); g.add(shield);
    addWheel(0, 0.3, 1.0, 0.3); addWheel(-0.62, 0.3, -0.8, 0.3); addWheel(0.62, 0.3, -0.8, 0.3);
    headlightCones(g, 0, 0.6, 1.1, 0.3);
    len = 2.3;
  } else if (kind === 'bus') {
    const bodyM = box(2.3, 2.2, 9.4, color ?? 0x26a69a, { shine: 45 }); bodyM.position.y = 1.5; g.add(bodyM);
    const glass = box(2.32, 0.8, 8.6, 0x10222e, { shine: 90 }); glass.position.y = 1.95; g.add(glass);
    const sign = textPlate('GERIMIS TRANS', 2.6, 0.5, '#e0fff5', '#00695c', 62);
    sign.position.set(0, 2.2, 4.72); g.add(sign);
    addWheel(-1.0, 0.48, 3.1, 0.48); addWheel(1.0, 0.48, 3.1, 0.48); addWheel(-1.0, 0.48, -3.1, 0.48); addWheel(1.0, 0.48, -3.1, 0.48);
    headlightCones(g, 0, 0.8, 4.7, 0.8);
    len = 9.4;
  } else if (kind === 'truk') {
    const cab = box(1.8, 1.1, 1.6, color ?? 0x43a047, { shine: 50 }); cab.position.set(0, 0.95, 1.5); g.add(cab);
    const glass = box(1.7, 0.5, 0.1, 0x10222e, { shine: 90 }); glass.position.set(0, 1.2, 2.31); g.add(glass);
    const bed = box(1.9, 0.55, 2.6, 0x6d4c41); bed.position.set(0, 0.75, -0.9); g.add(bed);
    for (let i = 0; i < 5; i++) {
      const crate = box(0.5, 0.4, 0.5, pick([0x66bb6a, 0xffa726, 0xef5350, 0xab47bc]));
      crate.position.set(rand(-0.6, 0.6), 1.2, rand(-2, 0.2)); g.add(crate);
    }
    addWheel(-0.85, 0.36, 1.5); addWheel(0.85, 0.36, 1.5); addWheel(-0.85, 0.36, -1.4); addWheel(0.85, 0.36, -1.4);
    headlightCones(g, 0, 0.66, 2.3);
    len = 4.4;
  } else if (kind === 'cruiser') {
    const bodyM = box(1.85, 0.55, 4.4, 0xf2f4f6, { shine: 80 }); bodyM.position.y = 0.62; g.add(bodyM);
    const cabin = box(1.65, 0.5, 2.2, 0x14202e, { shine: 90 }); cabin.position.set(0, 1.12, -0.2); g.add(cabin);
    const stripe = box(1.87, 0.2, 4.42, 0x1d4ed8); stripe.position.y = 0.6; g.add(stripe);
    const plate = textPlate('POLRESTA', 1.5, 0.3, '#ffffff', '#1d4ed8', 66);
    plate.position.set(0, 0.86, 2.21); g.add(plate);
    const bar = new T.Group();
    const bl = box(0.5, 0.13, 0.3, 0xff2222, { emissive: 0xff2222, ei: 2.6 }); bl.position.x = -0.3; bar.add(bl);
    const br = box(0.5, 0.13, 0.3, 0x2266ff, { emissive: 0x2266ff, ei: 2.6 }); br.position.x = 0.3; bar.add(br);
    bar.position.set(0, 1.46, -0.2); g.add(bar);
    g.userData.lightBar = bar;
    addWheel(-0.85, 0.34, 1.45); addWheel(0.85, 0.34, 1.45); addWheel(-0.85, 0.34, -1.45); addWheel(0.85, 0.34, -1.45);
    headlightCones(g, 0, 0.62, 2.2);
    len = 4.4;
  } else if (kind === 'coupe') { // RINTIK GT — the hero car, vivid red focal point
    const bodyM = box(1.8, 0.42, 4.3, PAL.heroRed, { shine: 110 }); bodyM.position.y = 0.52; g.add(bodyM);
    const nose = box(1.7, 0.3, 0.9, 0xd50000, { shine: 110 }); nose.position.set(0, 0.44, 2.3); g.add(nose);
    const cabin = box(1.5, 0.42, 1.9, 0x0d141d, { shine: 100 }); cabin.position.set(0, 0.92, -0.3); g.add(cabin);
    const spoiler = box(1.7, 0.07, 0.4, 0x14181f); spoiler.position.set(0, 0.98, -2.05); g.add(spoiler);
    const tail = box(1.6, 0.12, 0.06, 0xff5252, { emissive: 0xff1744, ei: 2.4 }); tail.position.set(0, 0.66, -2.16); g.add(tail);
    addWheel(-0.82, 0.33, 1.4, 0.33); addWheel(0.82, 0.33, 1.4, 0.33); addWheel(-0.82, 0.33, -1.4, 0.33); addWheel(0.82, 0.33, -1.4, 0.33);
    headlightCones(g, 0, 0.55, 2.6, 0.6);
    len = 4.5;
  } else { // sedan / hatch
    const c = color ?? pick(CAR_COLORS);
    const hatch = kind === 'hatch';
    const bodyM = box(1.78, 0.55, hatch ? 3.6 : 4.3, c, { shine: 70 }); bodyM.position.y = 0.62; g.add(bodyM);
    const cabin = box(1.6, 0.5, hatch ? 2.2 : 2.1, 0x101c26, { shine: 90 }); cabin.position.set(0, 1.1, hatch ? -0.3 : -0.15); g.add(cabin);
    addWheel(-0.82, 0.33, 1.35, 0.33); addWheel(0.82, 0.33, 1.35, 0.33); addWheel(-0.82, 0.33, -1.35, 0.33); addWheel(0.82, 0.33, -1.35, 0.33);
    headlightCones(g, 0, 0.6, (hatch ? 3.6 : 4.3) / 2);
    len = hatch ? 3.6 : 4.3;
  }
  g.userData.wheels = wheels;
  g.userData.len = len;
  return g;
}

export function spinWheels(car, dist) {
  const ws = car.userData.wheels || [];
  for (const w of ws) w.rotation.x += dist / 0.34;
}

// ---------- AIR ONE helicopter ----------
export function makeHeli() {
  const g = new T.Group();
  const bodyM = box(2.1, 1.7, 4.6, 0x1b2735, { shine: 80 }); g.add(bodyM);
  const glass = box(1.9, 1.0, 1.4, 0x9fd8e8, { shine: 110 }); glass.position.set(0, 0.15, 1.9); g.add(glass);
  const tail = box(0.5, 0.5, 3.6, 0x1b2735); tail.position.set(0, 0.25, -3.8); g.add(tail);
  const fin = box(0.14, 1.1, 0.6, 0xff2e88, { emissive: 0x550f30 }); fin.position.set(0, 0.6, -5.5); g.add(fin);
  const skidL = box(0.12, 0.12, 3.4, 0x39424e); skidL.position.set(-0.85, -1.05, 0.3); g.add(skidL);
  const skidR = skidL.clone(); skidR.position.x = 0.85; g.add(skidR);
  const rotor = new T.Group();
  const blade = box(11.5, 0.05, 0.5, 0x0c0f13); rotor.add(blade);
  const blade2 = box(0.5, 0.05, 11.5, 0x0c0f13); rotor.add(blade2);
  rotor.position.y = 1.15; g.add(rotor);
  g.userData.rotor = rotor;
  // Searchlight: additive cone + ground pool + real spotlight
  const coneMat = new T.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0.14, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
  const cone = new T.Mesh(new T.ConeGeometry(6.5, 46, 14, 1, true), coneMat);
  cone.position.y = -24; g.add(cone);
  const spot = new T.SpotLight(0xfff0bb, 2.4, 130, 0.24, 0.5, 0.6);
  spot.position.set(0, -0.8, 0.6);
  g.add(spot); g.add(spot.target);
  spot.target.position.set(0, -46, 2);
  g.userData.spot = spot;
  const beacon = box(0.22, 0.22, 0.22, 0xff2222, { emissive: 0xff2222, ei: 3 });
  beacon.position.set(0, 0.4, -5.5); g.add(beacon);
  g.userData.beacon = beacon;
  return g;
}
