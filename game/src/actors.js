// GERIMIS — the actor factory: pedestrians, handguns, vehicles, and
// the AIR ONE helicopter. Everything that moves is built here as a
// THREE.Group with a `userData` contract the engine relies on:
//   ped  -> userData.parts {legL, legR, armL, armR, headG, torso},
//           userData.phase, optional userData.marker / userData.gun
//   car  -> userData.wheels[], userData.len, cruiser userData.lightBar
//   heli -> userData.rotor, userData.spot, userData.beacon
//   gun  -> userData.muzzle (local), userData.len

const T = window.THREE;
import { PAL, rand, pick } from './config.js';

// One phong box, the brick every actor is built from.
function brick(w, h, d, color, opts = {}) {
  const mesh = new T.Mesh(
    new T.BoxGeometry(w, h, d),
    new T.MeshPhongMaterial({
      color,
      shininess: opts.shine ?? 12,
      specular: opts.spec ?? 0x111111,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.ei ?? 1,
    })
  );
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

// A canvas name-board (route boards, POLRESTA plate, bus destination).
function plate(text, w, h, fg, bg, fontPx = 64) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = Math.round(512 * h / w);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.font = `900 ${fontPx}px Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = fg; ctx.shadowBlur = 16;
  ctx.fillStyle = fg;
  ctx.fillText(text, cv.width / 2, cv.height / 2 + 2);
  const mesh = new T.Mesh(
    new T.PlaneGeometry(w, h),
    new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv), transparent: false })
  );
  return mesh;
}

// ------------------------------------------------------------ pedestrians
const SKIN_TONES = [0xe8b98d, 0xc98d5f, 0x9c6b43, 0x7a4e2e];
const SHIRT_TONES = [0x2e86ab, 0xf2b134, 0x7fb069, 0xbc4749, 0x5f6caf, 0x25a18e, 0xd90368, 0x8d6e63];
const PANTS_TONES = [0x23272e, 0x2f3e46, 0x3d405b, 0x54494b, 0x1f2a44];

export function makePed(opts = {}) {
  const g = new T.Group();
  const skin = opts.skin ?? pick(SKIN_TONES);
  const shirt = opts.shirt ?? pick(SHIRT_TONES);
  const pants = opts.pants ?? pick(PANTS_TONES);

  // Legs pivot at the hip (y 0.78) so the walk cycle can swing them.
  const legL = new T.Group(); legL.position.set(-0.11, 0.78, 0);
  const legR = new T.Group(); legR.position.set(0.11, 0.78, 0);
  const shinL = brick(0.17, 0.78, 0.2, pants); shinL.position.y = -0.39; legL.add(shinL);
  const shinR = brick(0.17, 0.78, 0.2, pants); shinR.position.y = -0.39; legR.add(shinR);
  g.add(legL, legR);

  const torso = brick(0.52, 0.66, 0.28, shirt, { shine: 26 });
  torso.position.y = 1.11;
  g.add(torso);
  if (opts.gang) {
    // ANAK KABUT uniform: grey hoodie + emissive red chest band.
    torso.material.color.set(0x565d66);
    const band = brick(0.54, 0.12, 0.3, 0xd21f3c, { emissive: 0x550a14 });
    band.position.y = 1.18; g.add(band);
  }
  if (opts.police) {
    // POLRESTA: blue shirt + hi-vis vest.
    torso.material.color.set(0x1d3fbf);
    const vest = brick(0.54, 0.4, 0.3, 0xd8e021, { emissive: 0x333d05 });
    vest.position.y = 1.14; g.add(vest);
  }

  // Head group carries cap or hood so it can nod independently.
  const headG = new T.Group(); headG.position.y = 1.44;
  const skull = brick(0.34, 0.36, 0.34, skin); skull.position.y = 0.18; headG.add(skull);
  if (opts.hood || opts.gang) {
    const hood = brick(0.42, 0.2, 0.42, opts.gang ? 0x454b54 : shirt);
    hood.position.y = 0.4; headG.add(hood);
  } else if (opts.cap !== false) {
    const capTop = brick(0.38, 0.1, 0.38, opts.capColor ?? 0x14181f);
    capTop.position.y = 0.4; headG.add(capTop);
    const brim = brick(0.36, 0.04, 0.22, opts.capColor ?? 0x14181f);
    brim.position.set(0, 0.36, 0.26); headG.add(brim);
  }
  g.add(headG);

  // Arms pivot at the shoulder (y 1.38); hands hang at the end.
  const armL = new T.Group(); armL.position.set(-0.33, 1.38, 0);
  const armR = new T.Group(); armR.position.set(0.33, 1.38, 0);
  const sleeveL = brick(0.15, 0.62, 0.17, shirt); sleeveL.position.y = -0.31; armL.add(sleeveL);
  const sleeveR = brick(0.15, 0.62, 0.17, shirt); sleeveR.position.y = -0.31; armR.add(sleeveR);
  const handL = brick(0.13, 0.13, 0.13, skin); handL.position.y = -0.66; armL.add(handL);
  const handR = brick(0.13, 0.13, 0.13, skin); handR.position.y = -0.66; armR.add(handR);
  g.add(armL, armR);

  if (opts.umbrella) {
    // Canopy + stick parented to the right hand; arm pre-raised.
    const um = new T.Group();
    const canopy = new T.Mesh(
      new T.ConeGeometry(0.78, 0.3, 8),
      new T.MeshPhongMaterial({ color: opts.umbrella, shininess: 60 })
    );
    canopy.position.y = 0.62; um.add(canopy);
    const stick = brick(0.035, 0.7, 0.035, 0x222222); stick.position.y = 0.26; um.add(stick);
    um.position.set(0.1, -0.6, 0.08);
    armR.add(um);
    armR.rotation.x = -0.5;
  }
  if (opts.marker) {
    // Floating red chevron marks a hostile from across the street.
    const mk = new T.Mesh(
      new T.ConeGeometry(0.16, 0.3, 4),
      new T.MeshBasicMaterial({ color: PAL.gangRed })
    );
    mk.rotation.x = Math.PI;
    mk.position.y = 2.15;
    g.add(mk);
    g.userData.marker = mk;
  }

  g.userData.parts = { legL, legR, armL, armR, headG, torso };
  g.userData.phase = rand(0, 6);
  return g;
}

// Walk cycle + aim pose. aimBlend 0..1 eases between the two: with a
// gun up, the right arm points forward and the left tucks across as
// support; at rest both arms swing against the legs.
export function animatePed(ped, speed, dt, aimBlend = 0) {
  const P = ped.userData.parts;
  ped.userData.phase += dt * (2.2 + speed * 2.4);
  const ph = ped.userData.phase;
  const amp = Math.min(0.62, speed * 0.16);
  P.legL.rotation.x = Math.sin(ph) * amp;
  P.legR.rotation.x = -Math.sin(ph) * amp;
  if (aimBlend > 0.02) {
    P.armR.rotation.x = -1.5 * aimBlend;
    P.armR.rotation.z = -0.12 * aimBlend;
    P.armL.rotation.x = -1.05 * aimBlend;
    P.armL.rotation.z = 0.55 * aimBlend;
    P.armL.rotation.y = -0.5 * aimBlend;
  } else {
    P.armL.rotation.x = -Math.sin(ph) * amp * 0.8;
    P.armR.rotation.x = Math.sin(ph) * amp * 0.8;
    P.armL.rotation.z = 0; P.armR.rotation.z = 0; P.armL.rotation.y = 0;
    if (ped.userData.holdsUmbrella) P.armR.rotation.x = -0.5;
  }
}

// ------------------------------------------------------------ guns
// Built pointing +z when the arm is raised; userData.muzzle is the
// barrel tip in local space — effects spawn streaks exactly there.
export function makeGunMesh(kind) {
  const g = new T.Group();
  const bodyMat = new T.MeshPhongMaterial({ color: 0x14161a, shininess: 70 });
  const steelMat = new T.MeshPhongMaterial({ color: 0x9aa4ae, shininess: 90 });
  const part = (geo, mat, x, y, z) => {
    const m = new T.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m;
  };
  if (kind === 'p9') {
    part(new T.BoxGeometry(0.055, 0.11, 0.24), bodyMat, 0, 0, 0.02);      // frame
    part(new T.BoxGeometry(0.045, 0.05, 0.2), steelMat, 0, 0.07, 0.03);   // slide
    part(new T.BoxGeometry(0.05, 0.14, 0.07), bodyMat, 0, -0.1, -0.05);   // grip
    g.userData.muzzle = new T.Vector3(0, 0.03, 0.16);
    g.userData.len = 0.26;
  } else if (kind === 'smg') {
    part(new T.BoxGeometry(0.06, 0.13, 0.46), bodyMat, 0, 0, 0.05);       // receiver
    part(new T.BoxGeometry(0.04, 0.04, 0.2), steelMat, 0, 0.02, 0.36);    // barrel
    part(new T.BoxGeometry(0.045, 0.2, 0.06), bodyMat, 0, -0.15, 0.02);   // magazine
    part(new T.BoxGeometry(0.05, 0.09, 0.16), bodyMat, 0, 0.03, -0.22);   // stock
    g.userData.muzzle = new T.Vector3(0, 0.02, 0.47);
    g.userData.len = 0.52;
  } else {
    // LARAS PETIR 12G — long gun with a wooden pump grip.
    part(new T.BoxGeometry(0.065, 0.13, 0.72), bodyMat, 0, 0, 0.1);
    part(new T.BoxGeometry(0.045, 0.045, 0.34), steelMat, 0, 0.03, 0.6);
    part(new T.BoxGeometry(0.055, 0.1, 0.2),
      new T.MeshPhongMaterial({ color: 0x5a3a22, shininess: 30 }), 0, -0.02, -0.32);
    part(new T.BoxGeometry(0.05, 0.16, 0.07), bodyMat, 0, -0.13, -0.05);
    g.userData.muzzle = new T.Vector3(0, 0.03, 0.79);
    g.userData.len = 0.85;
  }
  return g;
}

// Parent a gun into the ped's right hand, replacing any previous one.
export function giveGun(ped, kind) {
  const P = ped.userData.parts;
  if (ped.userData.gun) P.armR.remove(ped.userData.gun);
  const gun = makeGunMesh(kind);
  gun.position.set(0, -0.68, 0.06);
  gun.rotation.x = Math.PI / 2 - 0.12; // barrel forward once the arm raises
  P.armR.add(gun);
  ped.userData.gun = gun;
  return gun;
}

const _muzzleTmp = new T.Vector3();
export function gunMuzzleWorld(ped) {
  const gun = ped.userData.gun;
  if (!gun) return null;
  _muzzleTmp.copy(gun.userData.muzzle);
  return gun.localToWorld(_muzzleTmp);
}

// ------------------------------------------------------------ vehicles
const ANGKOT_LIVERY = [0xffc400, 0x00c853, 0xff6d00, 0x00b0ff, 0xff1744, 0x76ff03];
const CIVIL_LIVERY = [0xb0bec5, 0x546e7a, 0x8e24aa, 0x00897b, 0x3949ab, 0x6d4c41, 0xf4511e, 0x7cb342];

function tyre(r = 0.34) {
  const w = new T.Mesh(
    new T.CylinderGeometry(r, r, 0.22, 14),
    new T.MeshPhongMaterial({ color: 0x0c0d10, shininess: 40 })
  );
  w.rotation.z = Math.PI / 2; // cylinder axis across the car
  // Hubcap: a steel disc riding proud of both faces, with a dark
  // centre cap — the two-tone read is what makes a wheel read as a
  // wheel (not a black puck) at street distance. Children of the
  // tyre mesh, so spinWheels rolls them for free.
  const hub = new T.Mesh(
    new T.CylinderGeometry(r * 0.54, r * 0.54, 0.25, 12),
    new T.MeshPhongMaterial({ color: 0x8d99a6, shininess: 95, specular: 0xdfe9f5 })
  );
  w.add(hub);
  const cap = new T.Mesh(
    new T.CylinderGeometry(r * 0.2, r * 0.2, 0.27, 8),
    new T.MeshPhongMaterial({ color: 0x23282f, shininess: 60 })
  );
  w.add(cap);
  return w;
}

// Two lamp bricks + two additive light cones thrown ahead of the car —
// in the rain these cones do most of the "wet night" storytelling.
function headlights(group, x, y, z, spread = 0.62) {
  const coneMat = new T.MeshBasicMaterial({
    color: 0xffeebb, transparent: true, opacity: 0.16,
    blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide,
  });
  for (const side of [-1, 1]) {
    const cone = new T.Mesh(new T.ConeGeometry(1.05, 7.5, 10, 1, true), coneMat);
    cone.rotation.x = Math.PI / 2 + 0.06;
    cone.position.set(x + side * spread, y, z + 3.6);
    group.add(cone);
    const lamp = brick(0.26, 0.13, 0.06, 0xfff6c9, { emissive: 0xffedb5, ei: 2.2 });
    lamp.position.set(x + side * spread, y, z + 0.02);
    group.add(lamp);
  }
}

// ------------------------------------------------------------ car detail kit
// The dressing that makes a box read as a VEHICLE: glossy slanted
// glass, tail lamps, mirrors, bumper bands. Every piece is sized to
// sit INSIDE the kind's existing length/width/height envelope — the
// physics footprint (userData.len, wheel marks) never changes.
const GLASS_OPTS = { shine: 130, spec: 0xcfe2ff };
const GLASS_COLOR = 0x0d1826;

// A slanted windshield / rear glass panel. tilt > 0 leans the top
// edge rearward (front glass); tilt < 0 leans it forward (rear glass).
function glassPanel(group, w, h, x, y, z, tilt) {
  const m = brick(w, h, 0.05, GLASS_COLOR, GLASS_OPTS);
  m.rotation.x = tilt;
  m.position.set(x, y, z);
  group.add(m);
  return m;
}

// Two small emissive tail lamps at the rear corners.
function taillights(group, y, z, spread = 0.66) {
  for (const side of [-1, 1]) {
    const lamp = brick(0.3, 0.11, 0.05, 0xff2015, { emissive: 0xcc1105, ei: 2 });
    lamp.position.set(side * spread, y, z);
    group.add(lamp);
  }
}

// Mirror heads mounted flush at the A-pillar sides — they silhouette
// against the body edge from the front without widening the car.
function mirrors(group, y, z, halfW, color = 0x14181f) {
  for (const side of [-1, 1]) {
    const m = brick(0.15, 0.1, 0.07, color, { shine: 50 });
    m.position.set(side * (halfW - 0.06), y, z);
    group.add(m);
  }
}

// A charcoal bumper band across one end, face flush with the body.
function bumperBand(group, y, z, w) {
  const m = brick(w, 0.17, 0.06, 0x14181d, { shine: 25 });
  m.position.set(0, y, z);
  group.add(m);
  return m;
}

export function makeCarMesh(kind, color) {
  const g = new T.Group();
  const wheels = [];
  const mountWheel = (x, y, z, r) => {
    const w = tyre(r); w.position.set(x, y, z); g.add(w); wheels.push(w);
  };
  let len = 4.2;

  if (kind === 'angkot') {
    // Boxy minivan workhorse; route board front and back, white roof.
    const c = color ?? pick(ANGKOT_LIVERY);
    const bodyM = brick(1.85, 1.15, 3.9, c, { shine: 60 }); bodyM.position.y = 0.95; g.add(bodyM);
    const roof = brick(1.9, 0.14, 3.95, 0xf5f5f5, { shine: 40 }); roof.position.y = 1.6; g.add(roof);
    const glass = brick(1.87, 0.5, 3.2, 0x10222e, { shine: 120, spec: 0xcfe2ff }); glass.position.y = 1.24; g.add(glass);
    const front = plate('TERMINAL — PASAR', 1.5, 0.34, '#06121a', '#ffd54f', 58);
    front.position.set(0, 1.32, 1.99); g.add(front);
    const back = front.clone(); back.rotation.y = Math.PI; back.position.z = -1.99; g.add(back);
    // Dressing: a real windshield on the flat front, tail lamps,
    // mirrors at the glass line, bumper bands both ends.
    glassPanel(g, 1.6, 0.52, 0, 1.26, 1.94, 0.08);
    taillights(g, 0.55, -1.94, 0.7);
    mirrors(g, 1.3, 1.8, 0.95, c);
    bumperBand(g, 0.42, 1.93, 1.8); bumperBand(g, 0.42, -1.93, 1.8);
    mountWheel(-0.85, 0.34, 1.25); mountWheel(0.85, 0.34, 1.25);
    mountWheel(-0.85, 0.34, -1.25); mountWheel(0.85, 0.34, -1.25);
    headlights(g, 0, 0.62, 1.95);
    len = 3.9;
  } else if (kind === 'bajaj') {
    // Three-wheeled taxi: single front wheel, canvas canopy.
    const c = color ?? 0xff9100;
    const bodyM = brick(1.35, 0.8, 2.2, c, { shine: 55 }); bodyM.position.y = 0.72; g.add(bodyM);
    const canopy = brick(1.45, 0.5, 1.5, 0x21262e, { shine: 20 }); canopy.position.set(0, 1.32, -0.25); g.add(canopy);
    const shield = brick(1.2, 0.55, 0.08, 0x9fd8e8, { shine: 110, spec: 0xe8f6ff }); shield.position.set(0, 1.15, 0.95); g.add(shield);
    // Dressing: one centre tail lamp + mirrors flanking the shield.
    const tailB = brick(0.22, 0.1, 0.05, 0xff2015, { emissive: 0xcc1105, ei: 2 });
    tailB.position.set(0, 0.62, -1.09); g.add(tailB);
    mirrors(g, 1.28, 0.88, 0.68, c);
    mountWheel(0, 0.3, 1.0, 0.3); mountWheel(-0.62, 0.3, -0.8, 0.3); mountWheel(0.62, 0.3, -0.8, 0.3);
    headlights(g, 0, 0.6, 1.1, 0.3);
    len = 2.3;
  } else if (kind === 'bus') {
    const bodyM = brick(2.3, 2.2, 9.4, color ?? 0x26a69a, { shine: 45 }); bodyM.position.y = 1.5; g.add(bodyM);
    const glass = brick(2.32, 0.8, 8.6, 0x10222e, { shine: 120, spec: 0xcfe2ff }); glass.position.y = 1.95; g.add(glass);
    const sign = plate('GERIMIS TRANS', 2.6, 0.5, '#e0fff5', '#00695c', 62);
    sign.position.set(0, 2.2, 4.72); g.add(sign);
    // Dressing: windshield under the destination board, tail lamps,
    // mirrors, bumper bands.
    glassPanel(g, 2.0, 0.85, 0, 1.8, 4.68, 0.05);
    taillights(g, 0.7, -4.68, 0.9);
    mirrors(g, 2.0, 4.55, 1.15, color ?? 0x26a69a);
    bumperBand(g, 0.45, 4.68, 2.2); bumperBand(g, 0.45, -4.68, 2.2);
    mountWheel(-1.0, 0.48, 3.1, 0.48); mountWheel(1.0, 0.48, 3.1, 0.48);
    mountWheel(-1.0, 0.48, -3.1, 0.48); mountWheel(1.0, 0.48, -3.1, 0.48);
    headlights(g, 0, 0.8, 4.7, 0.8);
    len = 9.4;
  } else if (kind === 'truk') {
    // Sayur truck: cab + open bed with vegetable crates.
    const cab = brick(1.8, 1.1, 1.6, color ?? 0x43a047, { shine: 50 }); cab.position.set(0, 0.95, 1.5); g.add(cab);
    const glass = brick(1.7, 0.5, 0.1, 0x10222e, { shine: 120, spec: 0xcfe2ff }); glass.position.set(0, 1.2, 2.31); g.add(glass);
    const bed = brick(1.9, 0.55, 2.6, 0x6d4c41); bed.position.set(0, 0.75, -0.9); g.add(bed);
    for (let i = 0; i < 5; i++) {
      const crate = brick(0.5, 0.4, 0.5, pick([0x66bb6a, 0xffa726, 0xef5350, 0xab47bc]));
      crate.position.set(rand(-0.6, 0.6), 1.2, rand(-2, 0.2)); g.add(crate);
    }
    // Dressing: cab mirrors, a front bumper band, tail lamps on the bed.
    mirrors(g, 1.25, 2.2, 0.9, color ?? 0x43a047);
    bumperBand(g, 0.45, 2.28, 1.7);
    taillights(g, 0.6, -2.17, 0.75);
    mountWheel(-0.85, 0.36, 1.5); mountWheel(0.85, 0.36, 1.5);
    mountWheel(-0.85, 0.36, -1.4); mountWheel(0.85, 0.36, -1.4);
    headlights(g, 0, 0.66, 2.3);
    len = 4.4;
  } else if (kind === 'cruiser') {
    // POLRESTA interceptor: white body, blue stripe, red/blue light bar.
    const bodyM = brick(1.85, 0.55, 4.4, 0xf2f4f6, { shine: 80 }); bodyM.position.y = 0.62; g.add(bodyM);
    const cabin = brick(1.65, 0.5, 2.2, 0x14202e, { shine: 120, spec: 0xcfe2ff }); cabin.position.set(0, 1.12, -0.2); g.add(cabin);
    const stripe = brick(1.87, 0.2, 4.42, 0x1d4ed8); stripe.position.y = 0.6; g.add(stripe);
    const badge = plate('POLRESTA', 1.5, 0.3, '#ffffff', '#1d4ed8', 66);
    badge.position.set(0, 0.86, 2.21); g.add(badge);
    const bar = new T.Group();
    const barL = brick(0.5, 0.13, 0.3, 0xff2222, { emissive: 0xff2222, ei: 2.6 }); barL.position.x = -0.3; bar.add(barL);
    const barR = brick(0.5, 0.13, 0.3, 0x2266ff, { emissive: 0x2266ff, ei: 2.6 }); barR.position.x = 0.3; bar.add(barR);
    bar.position.set(0, 1.46, -0.2); g.add(bar);
    g.userData.lightBar = bar;
    // Dressing: the cabin becomes a glasshouse — slanted windshield
    // and rear glass over the dark band, a white roof slab on top,
    // tail lamps, mirrors, bumper bands.
    glassPanel(g, 1.5, 0.55, 0, 1.1, 0.82, 0.45);
    glassPanel(g, 1.5, 0.55, 0, 1.1, -1.22, -0.45);
    const roofC = brick(1.6, 0.05, 1.1, 0xf2f4f6, { shine: 60 }); roofC.position.set(0, 1.34, -0.2); g.add(roofC);
    taillights(g, 0.62, -2.17, 0.68);
    mirrors(g, 1.05, 0.85, 0.925, 0xf2f4f6);
    bumperBand(g, 0.4, 2.17, 1.8); bumperBand(g, 0.4, -2.17, 1.8);
    mountWheel(-0.85, 0.34, 1.45); mountWheel(0.85, 0.34, 1.45);
    mountWheel(-0.85, 0.34, -1.45); mountWheel(0.85, 0.34, -1.45);
    headlights(g, 0, 0.62, 2.2);
    len = 4.4;
  } else if (kind === 'coupe') {
    // RINTIK GT — the hero car. Vivid red on purpose: it is the cover's
    // focal point and must read instantly at thumbnail size.
    const bodyM = brick(1.8, 0.42, 4.3, PAL.heroRed, { shine: 110 }); bodyM.position.y = 0.52; g.add(bodyM);
    const nose = brick(1.7, 0.3, 0.9, 0xd50000, { shine: 110 }); nose.position.set(0, 0.44, 2.3); g.add(nose);
    const cabin = brick(1.5, 0.42, 1.9, 0x0d141d, { shine: 130, spec: 0xcfe2ff }); cabin.position.set(0, 0.92, -0.3); g.add(cabin);
    const spoiler = brick(1.7, 0.07, 0.4, 0x14181f); spoiler.position.set(0, 0.98, -2.05); g.add(spoiler);
    const tail = brick(1.6, 0.12, 0.06, 0xff5252, { emissive: 0xff1744, ei: 2.4 }); tail.position.set(0, 0.66, -2.16); g.add(tail);
    // Dressing: raked windshield and a sloping rear glass over the
    // cabin, mirrors, a rear bumper band.
    glassPanel(g, 1.4, 0.46, 0, 0.9, 0.62, 0.5);
    glassPanel(g, 1.4, 0.46, 0, 0.92, -1.3, -0.55);
    mirrors(g, 0.85, 0.6, 0.9, 0x14181f);
    bumperBand(g, 0.42, -2.12, 1.7);
    mountWheel(-0.82, 0.33, 1.4, 0.33); mountWheel(0.82, 0.33, 1.4, 0.33);
    mountWheel(-0.82, 0.33, -1.4, 0.33); mountWheel(0.82, 0.33, -1.4, 0.33);
    headlights(g, 0, 0.55, 2.6, 0.6);
    len = 4.5;
  } else {
    // Civilian sedan / hatchback in muted street colours.
    const c = color ?? pick(CIVIL_LIVERY);
    const isHatch = kind === 'hatch';
    const bodyM = brick(1.78, 0.55, isHatch ? 3.6 : 4.3, c, { shine: 70 }); bodyM.position.y = 0.62; g.add(bodyM);
    const cabin = brick(1.6, 0.5, isHatch ? 2.2 : 2.1, 0x101c26, { shine: 120, spec: 0xcfe2ff });
    cabin.position.set(0, 1.1, isHatch ? -0.3 : -0.15); g.add(cabin);
    // Dressing: slanted windshield + rear glass, a body-colour roof
    // slab, tail lamps, mirrors, bumper bands.
    const cabFront = isHatch ? 0.8 : 0.9, cabRear = isHatch ? -1.4 : -1.2;
    glassPanel(g, 1.45, 0.5, 0, 1.08, cabFront - 0.04, 0.48);
    glassPanel(g, 1.45, 0.5, 0, 1.08, cabRear + 0.04, -0.48);
    const roofS = brick(1.55, 0.05, 1.2, c, { shine: 70 }); roofS.position.set(0, 1.32, isHatch ? -0.3 : -0.15); g.add(roofS);
    const halfD = (isHatch ? 3.6 : 4.3) / 2;
    taillights(g, 0.62, -halfD + 0.03);
    mirrors(g, 1.0, cabFront - 0.15, 0.89, c);
    bumperBand(g, 0.42, halfD - 0.03, 1.72); bumperBand(g, 0.42, -halfD + 0.03, 1.72);
    mountWheel(-0.82, 0.33, 1.35, 0.33); mountWheel(0.82, 0.33, 1.35, 0.33);
    mountWheel(-0.82, 0.33, -1.35, 0.33); mountWheel(0.82, 0.33, -1.35, 0.33);
    headlights(g, 0, 0.6, (isHatch ? 3.6 : 4.3) / 2);
    len = isHatch ? 3.6 : 4.3;
  }

  g.userData.wheels = wheels;
  g.userData.len = len;
  return g;
}

// Roll every wheel by the distance travelled this frame.
export function spinWheels(car, dist) {
  const ws = car.userData.wheels || [];
  for (const w of ws) w.rotation.x += dist / 0.34;
}

// ------------------------------------------------------------ AIR ONE
// POLRESTA helicopter: dark airframe, cross rotor, tail beacon, and a
// real SpotLight whose visible cone + target the engine aims at Damar.
export function makeHeli() {
  const g = new T.Group();
  const hull = brick(2.1, 1.7, 4.6, 0x1b2735, { shine: 80 }); g.add(hull);
  const glass = brick(1.9, 1.0, 1.4, 0x9fd8e8, { shine: 110 }); glass.position.set(0, 0.15, 1.9); g.add(glass);
  const boom = brick(0.5, 0.5, 3.6, 0x1b2735); boom.position.set(0, 0.25, -3.8); g.add(boom);
  const fin = brick(0.14, 1.1, 0.6, 0xff2e88, { emissive: 0x550f30 }); fin.position.set(0, 0.6, -5.5); g.add(fin);
  const skidL = brick(0.12, 0.12, 3.4, 0x39424e); skidL.position.set(-0.85, -1.05, 0.3); g.add(skidL);
  const skidR = skidL.clone(); skidR.position.x = 0.85; g.add(skidR);

  const rotor = new T.Group();
  rotor.add(brick(11.5, 0.05, 0.5, 0x0c0f13));
  rotor.add(brick(0.5, 0.05, 11.5, 0x0c0f13));
  rotor.position.y = 1.15;
  g.add(rotor);
  g.userData.rotor = rotor;

  // Searchlight package: fake volumetric cone + the actual light.
  const coneMat = new T.MeshBasicMaterial({
    color: 0xfff3c4, transparent: true, opacity: 0.14,
    blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide,
  });
  const cone = new T.Mesh(new T.ConeGeometry(6.5, 46, 14, 1, true), coneMat);
  cone.position.y = -24;
  g.add(cone);
  const spot = new T.SpotLight(0xfff0bb, 2.4, 130, 0.24, 0.5, 0.6);
  spot.position.set(0, -0.8, 0.6);
  g.add(spot); g.add(spot.target);
  spot.target.position.set(0, -46, 2);
  g.userData.spot = spot;

  const beacon = brick(0.22, 0.22, 0.22, 0xff2222, { emissive: 0xff2222, ei: 3 });
  beacon.position.set(0, 0.4, -5.5);
  g.add(beacon);
  g.userData.beacon = beacon;
  return g;
}
