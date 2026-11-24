// GERIMIS — the city itself: wet roads, neon signs, six districts.
// One job: build the static world and report its colliders.

const T = window.THREE;
import { WORLD, PAL, DISTRICTS, rand, pick } from './config.js';
import { radialTexture } from './effects.js';

export const colliders = [];
function collide(x, z, hw, hd) { colliders.push({ x, z, hw, hd }); }

export function resolveCollisions(pos, radius) {
  for (const c of colliders) {
    const dx = pos.x - c.x, dz = pos.z - c.z;
    const px = c.hw + radius - Math.abs(dx), pz = c.hd + radius - Math.abs(dz);
    if (px > 0 && pz > 0) {
      if (px < pz) pos.x = c.x + (dx > 0 ? 1 : -1) * (c.hw + radius);
      else pos.z = c.z + (dz > 0 ? 1 : -1) * (c.hd + radius);
    }
  }
  pos.x = Math.max(-WORLD.half, Math.min(WORLD.half, pos.x));
  pos.z = Math.max(-WORLD.half, Math.min(WORLD.half, pos.z));
}

// ---------- textures ----------
function signTexture(text, fg, bg, sub) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 256);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = fg; g.shadowBlur = 42;
  g.fillStyle = fg;
  g.font = '900 118px Arial, sans-serif';
  g.fillText(text, 512, sub ? 104 : 128);
  g.shadowBlur = 18; g.fillText(text, 512, sub ? 104 : 128);
  if (sub) {
    g.font = '700 54px Arial, sans-serif';
    g.fillStyle = '#eaf6ff';
    g.shadowBlur = 10;
    g.fillText(sub, 512, 200);
  }
  return new T.CanvasTexture(c);
}

function windowsTexture(base, litRatio) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 256);
  for (let y = 0; y < 12; y++) for (let x = 0; x < 5; x++) {
    const lit = Math.random() < litRatio;
    g.fillStyle = lit ? pick(['#ffd98a', '#ffe9b0', '#a8e6ff', '#ffc4dd']) : '#131a24';
    g.fillRect(10 + x * 24, 12 + y * 20, 15, 11);
  }
  const t = new T.CanvasTexture(c);
  return t;
}

function roadTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#11151d'; g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 500; i++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
    g.fillRect(Math.random() * 128, Math.random() * 256, 2, 2);
  }
  g.fillStyle = 'rgba(255,214,120,0.85)';
  g.fillRect(60, 12, 8, 96); g.fillRect(60, 148, 8, 96);
  g.fillStyle = 'rgba(230,240,255,0.5)';
  g.fillRect(4, 0, 3, 256); g.fillRect(121, 0, 3, 256);
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  return t;
}

// ---------- shared materials / helpers ----------
const poolTexWarm = () => radialTexture('rgba(255,180,84,0.85)', 'rgba(255,150,50,0)');
const poolTexCool = () => radialTexture('rgba(160,220,255,0.8)', 'rgba(80,160,255,0)');
let poolTexNeon = null;
function addPool(parent, x, z, size, color, opacity = 0.5) {
  if (!poolTexNeon) poolTexNeon = radialTexture('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)');
  const m = new T.Mesh(
    new T.PlaneGeometry(size, size),
    new T.MeshBasicMaterial({ map: poolTexNeon, color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.045, z);
  parent.add(m);
  return m;
}

function addGlowSprite(parent, x, y, z, size, color, opacity = 0.75) {
  if (!poolTexNeon) poolTexNeon = radialTexture('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)');
  const s = new T.Sprite(new T.SpriteMaterial({ map: poolTexNeon, color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false }));
  s.scale.set(size, size, 1); s.position.set(x, y, z);
  parent.add(s);
  return s;
}

function addSign(parent, text, sub, fgCss, bgCss, w, x, y, z, ry = 0) {
  const tex = signTexture(text, fgCss, bgCss, sub);
  const m = new T.Mesh(new T.PlaneGeometry(w, w / 4), new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide }));
  m.position.set(x, y, z); m.rotation.y = ry;
  parent.add(m);
  // glossy reflection streak on the wet street below the sign
  const hex = new T.Color(fgCss).getHex();
  addPool(parent, x + Math.sin(ry) * 3.4, z + Math.cos(ry) * 3.4, w * 0.95, hex, 0.34);
  return m;
}

function lampPost(parent, x, z) {
  const pole = new T.Mesh(new T.CylinderGeometry(0.09, 0.11, 5.6, 6), new T.MeshPhongMaterial({ color: 0x1c232e }));
  pole.position.set(x, 2.8, z); parent.add(pole);
  const head = new T.Mesh(new T.SphereGeometry(0.3, 8, 8), new T.MeshBasicMaterial({ color: 0xd8ecff }));
  head.position.set(x, 5.7, z); parent.add(head);
  addGlowSprite(parent, x, 5.7, z, 3.6, 0xcfe6ff, 0.65);
  addPool(parent, x, z, 8.5, 0xbfd9ff, 0.3);
}

// ---------- main build ----------
export function buildCity(scene) {
  const world = new T.Group();
  scene.add(world);

  // Ground base
  const ground = new T.Mesh(new T.PlaneGeometry(900, 900), new T.MeshPhongMaterial({ color: 0x171d27, shininess: 30, specular: 0x445577 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05;
  world.add(ground);

  // Roads: strips along the grid, wet asphalt with dashes baked in.
  const roadTex = roadTexture();
  const roadMat = new T.MeshPhongMaterial({ map: roadTex, shininess: 95, specular: PAL.asphaltSpec });
  const lines = [];
  for (let i = -3; i <= 3; i++) lines.push(i * WORLD.pitch);
  for (const v of lines) {
    const mkStrip = (alongX) => {
      const tex = roadTex.clone(); tex.needsUpdate = true; tex.repeat.set(1, 24);
      const mat = new T.MeshPhongMaterial({ map: tex, shininess: 95, specular: PAL.asphaltSpec });
      const m = new T.Mesh(new T.PlaneGeometry(WORLD.roadW, 780), mat);
      m.rotation.x = -Math.PI / 2;
      if (alongX) { m.rotation.z = Math.PI / 2; m.position.set(0, 0.02, v); }
      else m.position.set(v, 0.02, 0);
      world.add(m);
    };
    mkStrip(true); mkStrip(false);
    // Sidewalks
    for (const s of [-1, 1]) {
      const sw = new T.Mesh(new T.PlaneGeometry(3.4, 780), new T.MeshPhongMaterial({ color: PAL.sidewalk, shininess: 40, specular: 0x66788f }));
      sw.rotation.x = -Math.PI / 2; sw.position.set(v + s * (WORLD.roadW / 2 + 1.7), 0.03, 0); world.add(sw);
      const sw2 = sw.clone(); sw2.rotation.z = Math.PI / 2; sw2.position.set(0, 0.03, v + s * (WORLD.roadW / 2 + 1.7)); world.add(sw2);
    }
  }

  // Puddles: glossy discs scattered on the roads.
  const puddleMat = new T.MeshPhongMaterial({ color: 0x2e4a66, shininess: 140, specular: 0xcfe4ff, transparent: true, opacity: 0.85 });
  const puddleGeo = new T.CircleGeometry(1, 14);
  for (let i = 0; i < 110; i++) {
    const onX = Math.random() < 0.5;
    const line = pick(lines), off = rand(-6.4, 6.4), along = rand(-370, 370);
    const p = new T.Mesh(puddleGeo, puddleMat);
    p.rotation.x = -Math.PI / 2;
    p.scale.set(rand(1.2, 3.6), rand(0.8, 2.2), 1);
    p.position.set(onX ? along : line + off, 0.035, onX ? line + off : along);
    world.add(p);
  }

  // Lamp posts along main roads.
  for (const v of lines) {
    for (let a = -342; a <= 342; a += 57) {
      if (Math.abs(a % WORLD.pitch) < 12) continue;
      lampPost(world, v - 9.6, a); lampPost(world, a, v + 9.6);
    }
  }

  buildBlocks(world);
  buildTerminal(world);
  buildPasar(world);
  buildStasiun(world);
  buildKampung(world);
  buildJalur(world);
  return world;
}

function building(world, x, z, w, h, d, texBase) {
  const tex = windowsTexture(texBase, rand(0.4, 0.66));
  const mat = new T.MeshPhongMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55, shininess: 24 });
  const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
  m.position.set(x, h / 2, z);
  world.add(m);
  collide(x, z, w / 2, d / 2);
  return m;
}

function buildBlocks(world) {
  const bases = ['#232d3d', '#1f2735', '#28303f', '#202833'];
  for (let bx = -3; bx <= 3; bx++) for (let bz = -3; bz <= 3; bz++) {
    const cx = bx * WORLD.pitch, cz = bz * WORLD.pitch;
    // Skip blocks owned by district set-pieces.
    if ((Math.abs(cx + 190) < 60 && Math.abs(cz - 48) < 60) ||
        (Math.abs(cx - 190) < 60 && Math.abs(cz - 48) < 60) ||
        (Math.abs(cx - 48) < 70 && Math.abs(cz - 190) < 55) ||
        (Math.abs(cx + 190) < 60 && Math.abs(cz + 190) < 60) ||
        (Math.abs(cx - 190) < 60 && Math.abs(cz + 190) < 60)) continue;
    const downtown = Math.abs(bx) <= 1 && Math.abs(bz) <= 1;
    const n = downtown ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const w = rand(16, 26), d = rand(16, 26);
      const h = downtown ? rand(26, 52) : rand(9, 22);
      const x = cx + rand(-24, 24), z = cz + rand(-24, 24);
      building(world, x, z, w, h, d, pick(bases));
    }
  }
  // Downtown neon — big, saturated, readable from a thumbnail.
  addSign(world, 'HOTEL GERIMIS', 'BUKA 24 JAM', '#ff2e88', '#1a0b16', 17, -26, 21, -39.5);
  addSign(world, 'WARUNG TEGAL', 'SATE • NASI • KOPI', '#ffb347', '#170f04', 13, 30, 9, -39.5);
  addSign(world, 'TOKO BERKAH', null, '#00e5ff', '#04161c', 12, 39.5, 13, 18, -Math.PI / 2);
  addSign(world, 'BANK GERIMIS', null, '#00ffc8', '#03140f', 13, -39.5, 16, -14, Math.PI / 2);
  addSign(world, 'KOPI KABUT', 'KOPI • SINGKONG KEJU', '#ff5da2', '#160510', 11, 16, 8, 39.5, Math.PI);
  addSign(world, 'BIOSKOP GERIMIS', 'FILM TENGAH MALAM', '#c77dff', '#0e0618', 14, -14, 15, 39.5, Math.PI);
  addSign(world, 'BENGKEL UJANG', 'TUNE UP • BAN • OLI', '#ffd54f', '#141003', 11, -39.5, 7, 30, Math.PI / 2);
}

function buildTerminal(world) {
  const cx = -200, cz = 55;
  // Shelter: wide flat roof on slim poles over the bays.
  const roof = new T.Mesh(new T.BoxGeometry(64, 1, 26), new T.MeshPhongMaterial({ color: 0x27313f, shininess: 50, specular: 0x8899bb }));
  roof.position.set(cx, 6.4, cz); world.add(roof);
  const trim = new T.Mesh(new T.BoxGeometry(64.6, 0.5, 26.6), new T.MeshBasicMaterial({ color: PAL.neonCyan }));
  trim.position.set(cx, 5.85, cz); world.add(trim);
  for (const px of [-28, -14, 0, 14, 28]) for (const pz of [-10, 10]) {
    const pole = new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 6.4, 6), new T.MeshPhongMaterial({ color: 0x39424e }));
    pole.position.set(cx + px, 3.2, cz + pz); world.add(pole);
  }
  addSign(world, 'TERMINAL BASAH', 'ANTAR KOTA • ANGKOT • BUS MALAM', '#00e5ff', '#03141a', 22, cx, 8.6, cz - 13.4);
  for (let i = 0; i < 7; i++) addPool(world, cx - 27 + i * 9, cz, 7, 0x66d9ff, 0.28);
  // Benches + crates under the shelter
  for (let i = 0; i < 6; i++) {
    const b = new T.Mesh(new T.BoxGeometry(3.4, 0.5, 0.8), new T.MeshPhongMaterial({ color: 0x4a5a6a }));
    b.position.set(cx - 25 + i * 10, 0.4, cz + 8); world.add(b);
  }
  collide(cx, cz - 12, 32, 1.2); collide(cx, cz + 12, 32, 1.2);
}

function buildPasar(world) {
  const cx = 200, cz = 45;
  addSign(world, 'PASAR KABUT', 'SAYUR • IKAN • REMPAH — BUKA 24 JAM', '#ff2e88', '#170510', 21, cx - 20, 7.6, cz - 26);
  const awningCols = [0xd81b60, 0x00897b, 0xf9a825, 0x5e35b1, 0xc62828, 0x2e7d32];
  for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++) {
    const x = cx - 30 + i * 15, z = cz - 18 + r * 17;
    const counter = new T.Mesh(new T.BoxGeometry(5.6, 1.1, 2.6), new T.MeshPhongMaterial({ color: 0x5d4037 }));
    counter.position.set(x, 0.55, z); world.add(counter);
    const awn = new T.Mesh(new T.BoxGeometry(6.6, 0.14, 4.6), new T.MeshPhongMaterial({ color: pick(awningCols), shininess: 30 }));
    awn.position.set(x, 2.9, z); awn.rotation.x = 0.16; world.add(awn);
    for (const s of [-2.9, 2.9]) {
      const post = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 2.9, 5), new T.MeshPhongMaterial({ color: 0x333333 }));
      post.position.set(x + s, 1.45, z + 1.6); world.add(post);
    }
    for (let k = 0; k < 4; k++) {
      const goods = new T.Mesh(new T.BoxGeometry(0.8, 0.5, 0.8), new T.MeshPhongMaterial({ color: pick([0x66bb6a, 0xff7043, 0xffee58, 0xab47bc, 0x26c6da]), shininess: 40 }));
      goods.position.set(x + rand(-2, 2), 1.36, z + rand(-0.7, 0.7)); world.add(goods);
    }
    addGlowSprite(world, x, 2.5, z + 1, 2.4, 0xffc46b, 0.8);
    addPool(world, x, z + 2.6, 6, 0xffb347, 0.3);
    collide(x, z, 3, 1.6);
  }
}

function buildStasiun(world) {
  const cx = 45, cz = 232;
  const facade = new T.Mesh(new T.BoxGeometry(66, 13, 8), new T.MeshPhongMaterial({ color: 0x2c3644, shininess: 30 }));
  facade.position.set(cx, 6.5, cz); world.add(facade);
  for (let i = 0; i < 6; i++) {
    const arch = new T.Mesh(new T.BoxGeometry(6, 8, 1), new T.MeshBasicMaterial({ color: 0xffc46b }));
    arch.position.set(cx - 27 + i * 11, 4, cz - 4.4); world.add(arch);
    addPool(world, cx - 27 + i * 11, cz - 9, 7, 0xffb347, 0.3);
  }
  addSign(world, 'STASIUN KOTA', 'KERETA MALAM • LOKET 24 JAM', '#ffb347', '#171003', 20, cx, 15.4, cz - 4.6);
  // Platform + rails + a waiting night train with lit windows.
  const plat = new T.Mesh(new T.BoxGeometry(90, 0.8, 7), new T.MeshPhongMaterial({ color: 0x39424e, shininess: 50, specular: 0x77879f }));
  plat.position.set(cx, 0.4, cz + 12); world.add(plat);
  for (const s of [-1.1, 1.1]) {
    const rail = new T.Mesh(new T.BoxGeometry(150, 0.12, 0.18), new T.MeshPhongMaterial({ color: 0x9aa7b5, shininess: 120, specular: 0xffffff }));
    rail.position.set(cx, 0.1, cz + 19 + s); world.add(rail);
  }
  const train = new T.Group();
  const tBody = new T.Mesh(new T.BoxGeometry(64, 3.4, 3.2), new T.MeshPhongMaterial({ color: 0x35506e, shininess: 70 }));
  tBody.position.y = 2.2; train.add(tBody);
  const tWinTex = windowsTexture('#35506e', 0.9);
  const tWin = new T.Mesh(new T.BoxGeometry(64.2, 1.1, 3.3), new T.MeshBasicMaterial({ map: tWinTex }));
  tWin.position.y = 2.7; train.add(tWin);
  const tStripe = new T.Mesh(new T.BoxGeometry(64.2, 0.4, 3.3), new T.MeshBasicMaterial({ color: PAL.neonPink }));
  tStripe.position.y = 1.35; train.add(tStripe);
  train.position.set(cx - 6, 0, cz + 19);
  world.add(train);
  collide(cx, cz, 33, 4.5); collide(cx - 6, cz + 19, 32, 2);
}

function buildKampung(world) {
  const cx = -185, cz = -205;
  // Raised terrace the kampung sits on.
  const terr = new T.Mesh(new T.BoxGeometry(120, 3, 105), new T.MeshPhongMaterial({ color: 0x1d2620, shininess: 20 }));
  terr.position.set(cx, 1.5, cz); world.add(terr);
  const roofCols = [0x8d3b2f, 0x37505e, 0x6b5136, 0x44554a, 0x59384a];
  for (let i = 0; i < 16; i++) {
    const w = rand(8, 13), d = rand(8, 12), h = rand(3.4, 5.6);
    const x = cx + rand(-48, 48), z = cz + rand(-40, 40);
    const house = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshPhongMaterial({ color: pick([0x4c4238, 0x3d4a52, 0x54453a, 0x41484f]), shininess: 16 }));
    house.position.set(x, 3 + h / 2, z); world.add(house);
    const roof = new T.Mesh(new T.ConeGeometry(Math.max(w, d) * 0.78, 2.2, 4), new T.MeshPhongMaterial({ color: pick(roofCols) }));
    roof.position.set(x, 3 + h + 1.1, z); roof.rotation.y = Math.PI / 4; world.add(roof);
    addGlowSprite(world, x, 4.6, z + d / 2 + 0.4, 2.2, 0xffb347, 0.7);
    collide(x, z, w / 2, d / 2);
  }
  addSign(world, 'KAMPUNG ATAS', null, '#00ffc8', '#03140f', 12, cx, 8.4, cz + 52);
  // Lantern string across the lane
  for (let i = 0; i < 9; i++) addGlowSprite(world, cx - 32 + i * 8, 6.4 - Math.abs(i - 4) * 0.22, cz + 30, 1.7, pick([0xffb347, 0xff5da2, 0x00e5ff]), 0.8);
}

function buildJalur(world) {
  const cx = 205, cz = -210;
  // Fog highway: a raised straight with guard rails + pine silhouettes.
  const deck = new T.Mesh(new T.BoxGeometry(150, 1.2, 15), new T.MeshPhongMaterial({ color: 0x171d27, shininess: 90, specular: PAL.asphaltSpec }));
  deck.position.set(cx, 3.4, cz); world.add(deck);
  for (const s of [-1, 1]) {
    const rail = new T.Mesh(new T.BoxGeometry(150, 0.7, 0.3), new T.MeshPhongMaterial({ color: 0x8fa3b8, shininess: 90, specular: 0xdfeaff }));
    rail.position.set(cx, 4.6, cz + s * 7.4); world.add(rail);
    for (let i = -3; i <= 3; i++) {
      const pillar = new T.Mesh(new T.BoxGeometry(1.4, 3.4, 1.4), new T.MeshPhongMaterial({ color: 0x2a333f }));
      pillar.position.set(cx + i * 22, 1.7, cz + s * 6); world.add(pillar);
    }
  }
  addSign(world, 'JALUR KABUT', 'TURUNAN TAJAM — HATI-HATI', '#7dff8a', '#04140a', 13, cx - 40, 8.6, cz - 9);
  for (let i = 0; i < 22; i++) {
    const x = cx + rand(-85, 85), z = cz + rand(-46, 46);
    if (Math.abs(z - cz) < 12) continue;
    const pine = new T.Group();
    const trunk = new T.Mesh(new T.CylinderGeometry(0.22, 0.3, 2.4, 5), new T.MeshPhongMaterial({ color: 0x2a2019 }));
    trunk.position.y = 1.2; pine.add(trunk);
    for (let k = 0; k < 3; k++) {
      const cone = new T.Mesh(new T.ConeGeometry(2.6 - k * 0.6, 3.4, 7), new T.MeshPhongMaterial({ color: 0x14352b }));
      cone.position.y = 3 + k * 1.7; pine.add(cone);
    }
    pine.position.set(x, 0, z);
    world.add(pine);
  }
}
