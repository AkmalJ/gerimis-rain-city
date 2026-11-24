// GERIMIS — the static city: wet grid roads, neon signage, and the six
// district set-pieces (terminal, market, station, kampung, fog highway,
// downtown blocks). buildCity() returns the world group; solid props
// register axis-aligned colliders that resolveCollisions() enforces.

const T = window.THREE;
import { WORLD, PAL, DISTRICTS, rand, pick } from './config.js';
import { radialTexture } from './effects.js';

// ------------------------------------------------------------ colliders
export const colliders = [];
function addCollider(x, z, hw, hd) { colliders.push({ x, z, hw, hd }); }

// Push `pos` (a Vector3 with a `radius` footprint) out of every box,
// then clamp it inside the world slab. Minimum-penetration axis wins.
export function resolveCollisions(pos, radius) {
  for (const c of colliders) {
    const dx = pos.x - c.x, dz = pos.z - c.z;
    const penX = c.hw + radius - Math.abs(dx);
    const penZ = c.hd + radius - Math.abs(dz);
    if (penX > 0 && penZ > 0) {
      if (penX < penZ) pos.x = c.x + (dx > 0 ? 1 : -1) * (c.hw + radius);
      else pos.z = c.z + (dz > 0 ? 1 : -1) * (c.hd + radius);
    }
  }
  pos.x = Math.max(-WORLD.half, Math.min(WORLD.half, pos.x));
  pos.z = Math.max(-WORLD.half, Math.min(WORLD.half, pos.z));
}

// ------------------------------------------------------------ canvas textures
// Neon sign face: bold text with a two-pass glow, optional subtitle row.
function makeSignTexture(text, fg, bg, sub) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 256;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1024, 256);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = fg; ctx.shadowBlur = 42;
  ctx.fillStyle = fg;
  ctx.font = '900 118px Arial, sans-serif';
  ctx.fillText(text, 512, sub ? 104 : 128);
  ctx.shadowBlur = 18; ctx.fillText(text, 512, sub ? 104 : 128); // second pass = hotter core
  if (sub) {
    ctx.font = '700 54px Arial, sans-serif';
    ctx.fillStyle = '#eaf6ff';
    ctx.shadowBlur = 10;
    ctx.fillText(sub, 512, 200);
  }
  return new T.CanvasTexture(cv);
}

// Building skin: dark facade with a scatter of lit windows. The same
// texture feeds emissiveMap, so lit windows genuinely glow at night.
function makeWindowsTexture(base, litRatio) {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = base; ctx.fillRect(0, 0, 128, 256);
  const litColours = ['#ffd98a', '#ffe9b0', '#a8e6ff', '#ffc4dd'];
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 5; col++) {
      ctx.fillStyle = Math.random() < litRatio ? pick(litColours) : '#131a24';
      ctx.fillRect(10 + col * 24, 12 + row * 20, 15, 11);
    }
  }
  return new T.CanvasTexture(cv);
}

// Asphalt: near-black base, faint speckle, amber centre dashes and pale
// edge lines baked in; repeats along the road.
function makeRoadTexture() {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#11151d'; ctx.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
    ctx.fillRect(Math.random() * 128, Math.random() * 256, 2, 2);
  }
  ctx.fillStyle = 'rgba(255,214,120,0.85)';
  ctx.fillRect(60, 12, 8, 96); ctx.fillRect(60, 148, 8, 96);
  ctx.fillStyle = 'rgba(230,240,255,0.5)';
  ctx.fillRect(4, 0, 3, 256); ctx.fillRect(121, 0, 3, 256);
  const tex = new T.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  return tex;
}

// ------------------------------------------------------------ glow helpers
// One shared white radial sprite texture, tinted per use.
let glowTex = null;
function sharedGlowTex() {
  if (!glowTex) glowTex = radialTexture('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)');
  return glowTex;
}
// Warm/cool pool variants kept for palette experiments.
const warmPoolTex = () => radialTexture('rgba(255,180,84,0.85)', 'rgba(255,150,50,0)');
const coolPoolTex = () => radialTexture('rgba(160,220,255,0.8)', 'rgba(80,160,255,0)');
void warmPoolTex; void coolPoolTex;

// A flat additive light pool on the wet ground — the fake reflection.
function lightPool(parent, x, z, size, color, opacity = 0.5) {
  const m = new T.Mesh(
    new T.PlaneGeometry(size, size),
    new T.MeshBasicMaterial({
      map: sharedGlowTex(), color, transparent: true, opacity,
      blending: T.AdditiveBlending, depthWrite: false,
    })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.045, z);
  parent.add(m);
  return m;
}

// A billboard glow sprite for lamps, lanterns and stall bulbs.
function glowSprite(parent, x, y, z, size, color, opacity = 0.75) {
  const s = new T.Sprite(new T.SpriteMaterial({
    map: sharedGlowTex(), color, transparent: true, opacity,
    blending: T.AdditiveBlending, depthWrite: false,
  }));
  s.scale.set(size, size, 1);
  s.position.set(x, y, z);
  parent.add(s);
  return s;
}

// A neon sign plane + its glossy reflection streak on the street below.
function neonSign(parent, text, sub, fgCss, bgCss, w, x, y, z, ry = 0) {
  const mesh = new T.Mesh(
    new T.PlaneGeometry(w, w / 4),
    new T.MeshBasicMaterial({ map: makeSignTexture(text, fgCss, bgCss, sub), side: T.DoubleSide })
  );
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  parent.add(mesh);
  const hex = new T.Color(fgCss).getHex();
  lightPool(parent, x + Math.sin(ry) * 3.4, z + Math.cos(ry) * 3.4, w * 0.95, hex, 0.34);
  return mesh;
}

// Street lamp: pole, bright head, halo sprite, ground pool.
function streetLamp(parent, x, z) {
  const pole = new T.Mesh(
    new T.CylinderGeometry(0.09, 0.11, 5.6, 6),
    new T.MeshPhongMaterial({ color: 0x1c232e })
  );
  pole.position.set(x, 2.8, z); parent.add(pole);
  const head = new T.Mesh(
    new T.SphereGeometry(0.3, 8, 8),
    new T.MeshBasicMaterial({ color: 0xd8ecff })
  );
  head.position.set(x, 5.7, z); parent.add(head);
  glowSprite(parent, x, 5.7, z, 3.6, 0xcfe6ff, 0.65);
  lightPool(parent, x, z, 8.5, 0xbfd9ff, 0.3);
  addCollider(x, z, 0.22, 0.22); // the pole is slim, but it is solid
}

// ------------------------------------------------------------ main build
export function buildCity(scene) {
  const world = new T.Group();
  scene.add(world);

  // Base slab under everything.
  const ground = new T.Mesh(
    new T.PlaneGeometry(900, 900),
    new T.MeshPhongMaterial({ color: 0x171d27, shininess: 30, specular: 0x445577 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  world.add(ground);

  // Roads: one strip per grid line in both directions. Each strip gets
  // its own texture clone so the repeat runs along the road's length.
  const roadTex = makeRoadTexture();
  const gridLines = [];
  for (let i = -3; i <= 3; i++) gridLines.push(i * WORLD.pitch);
  for (const v of gridLines) {
    const strip = (alongX) => {
      const tex = roadTex.clone();
      tex.needsUpdate = true;
      tex.repeat.set(1, 24);
      const mat = new T.MeshPhongMaterial({ map: tex, shininess: 95, specular: PAL.asphaltSpec });
      const m = new T.Mesh(new T.PlaneGeometry(WORLD.roadW, 780), mat);
      m.rotation.x = -Math.PI / 2;
      if (alongX) { m.rotation.z = Math.PI / 2; m.position.set(0, 0.02, v); }
      else m.position.set(v, 0.02, 0);
      world.add(m);
    };
    strip(true); strip(false);
    // Sidewalks flank every road on both axes.
    for (const s of [-1, 1]) {
      const swMat = new T.MeshPhongMaterial({ color: PAL.sidewalk, shininess: 40, specular: 0x66788f });
      const sw = new T.Mesh(new T.PlaneGeometry(3.4, 780), swMat);
      sw.rotation.x = -Math.PI / 2;
      sw.position.set(v + s * (WORLD.roadW / 2 + 1.7), 0.03, 0);
      world.add(sw);
      const swCross = sw.clone();
      swCross.rotation.z = Math.PI / 2;
      swCross.position.set(0, 0.03, v + s * (WORLD.roadW / 2 + 1.7));
      world.add(swCross);
    }
  }

  // Puddles: glossy discs scattered over the road network.
  const puddleMat = new T.MeshPhongMaterial({
    color: 0x2e4a66, shininess: 140, specular: 0xcfe4ff, transparent: true, opacity: 0.85,
  });
  const puddleGeo = new T.CircleGeometry(1, 14);
  for (let i = 0; i < 110; i++) {
    const onXRoad = Math.random() < 0.5;
    const line = pick(gridLines), off = rand(-6.4, 6.4), along = rand(-370, 370);
    const p = new T.Mesh(puddleGeo, puddleMat);
    p.rotation.x = -Math.PI / 2;
    p.scale.set(rand(1.2, 3.6), rand(0.8, 2.2), 1);
    p.position.set(onXRoad ? along : line + off, 0.035, onXRoad ? line + off : along);
    world.add(p);
  }

  // Lamp posts march along both road directions, skipping junctions.
  for (const v of gridLines) {
    for (let a = -342; a <= 342; a += 57) {
      if (Math.abs(a % WORLD.pitch) < 12) continue;
      streetLamp(world, v - 9.6, a);
      streetLamp(world, a, v + 9.6);
    }
  }

  fillBlocks(world);
  buildTerminal(world);
  buildPasar(world);
  buildStasiun(world);
  buildKampung(world);
  buildJalur(world);
  // Ruko rows (P5): station street west + east (fronting the spawn
  // street) and the downtown z=0 road's north side.
  rukoRow(world, -88, 163, 1, 8);
  rukoRow(world, 40, 163, 1, 8);
  rukoRow(world, -70, -14, 1, 8);
  streetProps(world);
  // Shadow contract: solid Phong geometry casts and receives; flat
  // Phong planes/discs (ground, roads, sidewalks, puddles) receive
  // only. Basic-material overlays (signs, light pools, glows) stay
  // out of the shadow pass entirely.
  world.traverse(o => {
    if (!o.isMesh || !o.material || o.material.type !== 'MeshPhongMaterial') return;
    const flat = o.geometry && (o.geometry.type === 'PlaneGeometry' || o.geometry.type === 'CircleGeometry');
    if (flat) o.receiveShadow = true;
    else { o.castShadow = true; o.receiveShadow = true; }
  });
  return world;
}

// ------------------------------------------------------------ shopfronts
// Ground-floor dressing for generic towers: a lit sign band, an
// awning, a doorway with a warm transom and lit shop windows on the
// street face — the layer that stops a tower reading as a flat slab
// from street level. Sign textures are cached per shop name.
const SHOP_NAMES = [
  ['WARUNG MAKMUR', '#ffb347'], ['TOKO BERKAH', '#00e5ff'], ['KOPI KABUT', '#ff5da2'],
  ['LAUNDRY KILOAN', '#7dff8a'], ['PANGKAS RAMBUT', '#ffd54f'], ['BAKSO SOLO', '#ff7043'],
  ['MINIMARKET 24', '#4fc3f7'], ['APOTEK SEHAT', '#00ffc8'], ['FOTO COPY', '#c77dff'],
  ['SATE PADANG', '#ffca7a'], ['KONTER PULSA', '#ffe082'], ['SATE MADURA', '#ff8a65'],
  ['MINIMARKET', '#81d4fa'], ['HOTEL MELATI', '#f48fb1'], ['TOKO ROTI', '#ffcc80'],
  ['PENJAHIT', '#a5d6a7'], ['SALON', '#ce93d8'], ['RENTAL PS', '#90caf9'],
  ['BENGKEL MOTOR', '#ffab91'], ['FOTOKOPI', '#b39ddb'], ['WARUNG TEGAL', '#fff59d'],
  ['TOKO OBAT', '#80cbc4'], ['KEDAI SUSU', '#ffecb3'],
];
const shopTexCache = new Map();
function shopTexture(name, fg) {
  const key = name + fg;
  if (shopTexCache.has(key)) return shopTexCache.get(key);
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#101319'; ctx.fillRect(0, 0, 512, 96);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = fg; ctx.shadowBlur = 16;
  ctx.fillStyle = fg;
  ctx.font = '900 46px Arial, sans-serif';
  ctx.fillText(name, 256, 50);
  const tex = new T.CanvasTexture(cv);
  shopTexCache.set(key, tex);
  return tex;
}

// Ruko row (P5): narrow 2–3 storey shophouses side by side, each a
// different muted colour with its OWN readable signboard facing the
// street (face=+1 fronts +z, face=-1 fronts -z; signs use the cached
// shop textures and are never mirrored). One collider per unit.
const RUKO_TONES = [0x8d6e63, 0x78909c, 0xa1887f, 0x90a4ae, 0x9e7d68, 0x6d8ea0, 0xb09a7a, 0x7a8b6f];
function rukoRow(world, x0, z, face, count) {
  for (let i = 0; i < count; i++) {
    const cx = x0 + i * 7 + 3.5;
    const h = pick([7, 8.75, 10.5]);
    const tone = pick(RUKO_TONES);
    const body = new T.Mesh(new T.BoxGeometry(6.9, h, 8), new T.MeshPhongMaterial({ color: tone, shininess: 14 }));
    body.position.set(cx, h / 2, z); world.add(body);
    const cap = new T.Mesh(new T.BoxGeometry(7.3, 0.4, 8.5), new T.MeshPhongMaterial({ color: new T.Color(tone).multiplyScalar(0.55), shininess: 10 }));
    cap.position.set(cx, h + 0.2, z); world.add(cap);
    const [name, color] = SHOP_NAMES[(i * 3 + Math.floor(rand(0, 3))) % SHOP_NAMES.length];
    const sign = new T.Mesh(new T.PlaneGeometry(6.3, 1.15),
      new T.MeshBasicMaterial({ map: shopTexture(name, color) }));
    sign.position.set(cx, h - 1.45, z + face * 4.07);
    sign.rotation.y = face > 0 ? 0 : Math.PI;
    world.add(sign);
    const awn = new T.Mesh(new T.BoxGeometry(6.4, 0.12, 1.5), new T.MeshPhongMaterial({ color: 0x37474f, shininess: 20 }));
    awn.position.set(cx, h - 2.25, z + face * 4.6); awn.rotation.x = face * 0.28; world.add(awn);
    const door = new T.Mesh(new T.BoxGeometry(1.3, 2.6, 0.1), new T.MeshPhongMaterial({ color: 0x14100c, emissive: 0xff9a3c, emissiveIntensity: 0.25 }));
    door.position.set(cx - 1.6, 1.3, z + face * 4.03); world.add(door);
    addCollider(cx, z, 3.5, 4);
  }
}

// One tower: window texture on all sides + a registered collider.
// The dressing (corner pilasters, cornice, mid band, rooftop props,
// street-face shopfront) adds silhouette and facade depth only —
// footprint, height and collider stay exactly as placed.
function tower(world, x, z, w, h, d, texBase) {
  const tex = makeWindowsTexture(texBase, rand(0.4, 0.66));
  const mat = new T.MeshPhongMaterial({
    map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55, shininess: 24,
  });
  const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
  m.position.set(x, h / 2, z);
  world.add(m);
  addCollider(x, z, w / 2, d / 2);

  const trimMat = new T.MeshPhongMaterial({
    color: new T.Color(texBase).multiplyScalar(0.6), shininess: 20,
  });
  // Corner pilasters run the full height: edges catch the light and
  // the box stops reading as one flat extrusion.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const pil = new T.Mesh(new T.BoxGeometry(0.55, h, 0.55), trimMat);
    pil.position.set(x + sx * (w / 2 - 0.1), h / 2, z + sz * (d / 2 - 0.1));
    world.add(pil);
  }
  // Cornice lip at the roofline (+ a mid band on tall towers).
  const cornice = new T.Mesh(new T.BoxGeometry(w + 0.7, 0.55, d + 0.7), trimMat);
  cornice.position.set(x, h - 0.27, z); world.add(cornice);
  if (h > 30) {
    const band = new T.Mesh(new T.BoxGeometry(w + 0.4, 0.4, d + 0.4), trimMat);
    band.position.set(x, h * 0.55, z); world.add(band);
  }
  // P5 variety: half the tall towers step back into a smaller upper
  // tier, and a third grow a low L-annex on one flank (own collider) —
  // the grid stops reading as identical extrusions.
  if (h >= 22 && rand(0, 1) < 0.5) {
    const tw = w * 0.62, td = d * 0.62, th = h * 0.34;
    const tier = new T.Mesh(new T.BoxGeometry(tw, th, td), mat);
    tier.position.set(x, h + th / 2, z); world.add(tier);
    const tcap = new T.Mesh(new T.BoxGeometry(tw + 0.6, 0.5, td + 0.6), trimMat);
    tcap.position.set(x, h + th - 0.25, z); world.add(tcap);
  }
  if (rand(0, 1) < 0.35) {
    const side = rand(0, 1) < 0.5 ? 1 : -1;
    const aw = w * 0.45, ad = d * 0.6, ah = rand(6, 10);
    const ax = x + side * (w / 2 + aw / 2);
    const annex = new T.Mesh(new T.BoxGeometry(aw, ah, ad), mat);
    annex.position.set(ax, ah / 2, z); world.add(annex);
    addCollider(ax, z, aw / 2, ad / 2);
  }
  // Round-2 silhouette work: some towers wear a second, lower cornice
  // lip, and mid-rise towers grow balcony rows on one flank — slab +
  // front rail — so the window grid stops being the only rhythm on
  // the facade and the skyline reads built, not extruded.
  if (rand(0, 1) < 0.4) {
    const lip2 = new T.Mesh(new T.BoxGeometry(w + 0.45, 0.3, d + 0.45), trimMat);
    lip2.position.set(x, h - 1.15, z); world.add(lip2);
  }
  if (h >= 15 && rand(0, 1) < 0.6) {
    const side = rand(0, 1) < 0.5 ? 1 : -1;
    const rows = 2 + Math.floor(rand(0, 2));
    for (let i = 0; i < rows; i++) {
      const by = 5 + i * rand(3.4, 4.6);
      if (by > h - 2.5) break;
      const bx = x + side * (w / 2 + 0.42);
      const slab = new T.Mesh(new T.BoxGeometry(0.85, 0.12, 2.3), trimMat);
      slab.position.set(bx, by, z + rand(-d / 4, d / 4)); world.add(slab);
      const rail = new T.Mesh(new T.BoxGeometry(0.05, 0.42, 2.3),
        new T.MeshPhongMaterial({ color: 0x11161d, shininess: 40 }));
      rail.position.set(x + side * (w / 2 + 0.82), by + 0.26, slab.position.z); world.add(rail);
    }
  }
  // Rooftop clutter: AC boxes, a water tank, an antenna with beacon.
  const roofMat = new T.MeshPhongMaterial({ color: 0x39424e, shininess: 30 });
  const propCount = 1 + Math.floor(rand(0, 3));
  for (let i = 0; i < propCount; i++) {
    const px = x + rand(-w / 2 + 2.5, w / 2 - 2.5), pz = z + rand(-d / 2 + 2.5, d / 2 - 2.5);
    const kind = rand(0, 1);
    if (kind < 0.45) {
      const ac = new T.Mesh(new T.BoxGeometry(rand(1.2, 2), 0.8, rand(1, 1.6)), roofMat);
      ac.position.set(px, h + 0.4, pz); world.add(ac);
    } else if (kind < 0.75) {
      const tank = new T.Mesh(new T.CylinderGeometry(0.85, 0.85, 1.7, 10),
        new T.MeshPhongMaterial({ color: 0x546e7a, shininess: 45 }));
      tank.position.set(px, h + 0.85, pz); world.add(tank);
      const capTop = new T.Mesh(new T.ConeGeometry(0.95, 0.5, 10), roofMat);
      capTop.position.set(px, h + 1.95, pz); world.add(capTop);
    } else {
      const antH = rand(2.5, 4.5);
      const ant = new T.Mesh(new T.CylinderGeometry(0.05, 0.07, antH, 5), roofMat);
      ant.position.set(px, h + antH / 2, pz); world.add(ant);
      if (rand(0, 1) < 0.6) {
        const beacon = new T.Mesh(new T.SphereGeometry(0.1, 6, 6), new T.MeshBasicMaterial({ color: 0xff3040 }));
        beacon.position.set(px, h + antH + 0.1, pz); world.add(beacon);
      }
    }
  }
  // Shopfront on the face toward the nearest street line.
  const pitch = WORLD.pitch;
  const nearLine = v => Math.round(v / pitch) * pitch;
  const toX = Math.abs(x - nearLine(x)), toZ = Math.abs(z - nearLine(z));
  let rotY, half, faceLen;
  if (toX < toZ) { rotY = nearLine(x) > x ? Math.PI / 2 : -Math.PI / 2; half = w / 2; faceLen = d; }
  else { rotY = nearLine(z) > z ? 0 : Math.PI; half = d / 2; faceLen = w; }
  const front = new T.Group();
  front.position.set(x, 0, z);
  front.rotation.y = rotY;
  const [shopName, shopColor] = pick(SHOP_NAMES);
  const signBand = new T.Mesh(
    new T.PlaneGeometry(faceLen * 0.62, 0.78),
    new T.MeshBasicMaterial({ map: shopTexture(shopName, shopColor) })
  );
  signBand.position.set(0, 3.32, half + 0.07);
  front.add(signBand);
  const awning = new T.Mesh(
    new T.BoxGeometry(faceLen * 0.66, 0.1, 0.95),
    new T.MeshPhongMaterial({ color: pick([0xd81b60, 0x00897b, 0xf9a825, 0x5e35b1, 0xc62828]), shininess: 30 })
  );
  awning.position.set(0, 2.82, half + 0.48);
  awning.rotation.x = 0.16;
  front.add(awning);
  const door = new T.Mesh(new T.BoxGeometry(1.5, 2.4, 0.1),
    new T.MeshPhongMaterial({ color: 0x0b0f16, shininess: 60, specular: 0x445577 }));
  door.position.set(-faceLen * 0.2, 1.2, half + 0.04);
  front.add(door);
  const transom = new T.Mesh(new T.BoxGeometry(1.5, 0.28, 0.1), new T.MeshBasicMaterial({ color: 0xffc46b }));
  transom.position.set(-faceLen * 0.2, 2.54, half + 0.04);
  front.add(transom);
  for (const s of [0.08, 0.3]) {
    const win = new T.Mesh(new T.BoxGeometry(1.7, 1.5, 0.08), new T.MeshBasicMaterial({ color: 0xd9a45b }));
    win.position.set(faceLen * s, 1.35, half + 0.04);
    front.add(win);
  }
  world.add(front);
  // Warm spill from the shopfront onto the wet street.
  const outX = Math.sin(rotY), outZ = Math.cos(rotY);
  lightPool(world, x + outX * (half + 1.7), z + outZ * (half + 1.7), 5.5, 0xffb347, 0.25);
  return m;
}

function fillBlocks(world) {
  const facades = ['#232d3d', '#1f2735', '#28303f', '#202833'];
  for (let bx = -3; bx <= 3; bx++) {
    for (let bz = -3; bz <= 3; bz++) {
      const cx = bx * WORLD.pitch, cz = bz * WORLD.pitch;
      // Blocks reserved for district set-pieces stay empty here.
      const reserved =
        (Math.abs(cx + 190) < 60 && Math.abs(cz - 48) < 60) ||   // terminal
        (Math.abs(cx - 190) < 60 && Math.abs(cz - 48) < 60) ||   // pasar
        (Math.abs(cx - 48) < 70 && Math.abs(cz - 190) < 55) ||   // stasiun
        (Math.abs(cx + 190) < 60 && Math.abs(cz + 190) < 60) ||  // kampung
        (Math.abs(cx - 190) < 60 && Math.abs(cz + 190) < 60);    // jalur
      if (reserved) continue;
      const downtown = Math.abs(bx) <= 1 && Math.abs(bz) <= 1;
      const count = downtown ? 2 : 3;
      for (let i = 0; i < count; i++) {
        const w = rand(16, 26), d = rand(16, 26);
        const h = downtown ? rand(26, 52) : rand(9, 22);
        tower(world, cx + rand(-24, 24), cz + rand(-24, 24), w, h, d, pick(facades));
      }
    }
  }
  // Downtown neon — big, saturated, readable from a thumbnail.
  neonSign(world, 'HOTEL GERIMIS', 'BUKA 24 JAM', '#ff2e88', '#1a0b16', 17, -26, 21, -39.5);
  neonSign(world, 'WARUNG TEGAL', 'SATE • NASI • KOPI', '#ffb347', '#170f04', 13, 30, 9, -39.5);
  neonSign(world, 'TOKO BERKAH', null, '#00e5ff', '#04161c', 12, 39.5, 13, 18, -Math.PI / 2);
  neonSign(world, 'BANK GERIMIS', null, '#00ffc8', '#03140f', 13, -39.5, 16, -14, Math.PI / 2);
  neonSign(world, 'KOPI KABUT', 'KOPI • SINGKONG KEJU', '#ff5da2', '#160510', 11, 16, 8, 39.5, Math.PI);
  neonSign(world, 'BIOSKOP GERIMIS', 'FILM TENGAH MALAM', '#c77dff', '#0e0618', 14, -14, 15, 39.5, Math.PI);
  neonSign(world, 'BENGKEL UJANG', 'TUNE UP • BAN • OLI', '#ffd54f', '#141003', 11, -39.5, 7, 30, Math.PI / 2);
}

// ------------------------------------------------------------ street props
// Round-2 street-level clutter (gameplay pass): the small solid things
// a street actually has — crate stacks at the market and depots, litter
// bins on the busy corners, rows of parked motorbikes at the station
// and pasar. Each cluster registers one honest collider.
function streetProps(world) {
  const crateMat = new T.MeshPhongMaterial({ color: 0x7a5c38, shininess: 15 });
  const crateMat2 = new T.MeshPhongMaterial({ color: 0x5d6e46, shininess: 15 });
  function crateStack(x, z, n) {
    for (let i = 0; i < n; i++) {
      const s = rand(0.55, 0.85);
      const crate = new T.Mesh(new T.BoxGeometry(s, s, s), rand(0, 1) < 0.5 ? crateMat : crateMat2);
      crate.position.set(x + rand(-0.5, 0.5), s / 2 + (i > 2 ? 0.62 : 0), z + rand(-0.5, 0.5));
      crate.rotation.y = rand(0, 0.6);
      world.add(crate);
    }
    addCollider(x, z, 1.05, 1.05);
  }
  crateStack(168, 18, 4);   // pasar south-west corner
  crateStack(236, 66, 3);   // pasar east lane
  crateStack(-166, 80, 4);  // terminal apron
  crateStack(-4, 224, 3);   // station forecourt west

  const binMat = new T.MeshPhongMaterial({ color: 0x2e4a3a, shininess: 35 });
  function bin(x, z) {
    const b = new T.Mesh(new T.CylinderGeometry(0.3, 0.26, 0.78, 9), binMat);
    b.position.set(x, 0.39, z); world.add(b);
    const rim = new T.Mesh(new T.TorusGeometry(0.3, 0.035, 6, 12),
      new T.MeshPhongMaterial({ color: 0x9fb2c8, shininess: 80 }));
    rim.rotation.x = Math.PI / 2; rim.position.set(x, 0.79, z); world.add(rim);
    addCollider(x, z, 0.34, 0.34);
  }
  bin(20, 197); bin(70, 197); bin(176, 20); bin(-176, 32); bin(-14, -44); bin(52, 44);

  // Parked motorbikes: two wheels, a low spine, seat and bars — five
  // parts each, in angled rows where riders actually leave them.
  const bikeBody = new T.MeshPhongMaterial({ color: 0x37474f, shininess: 60 });
  const bikeAccent = [0xc62828, 0x1565c0, 0x2e7d32, 0xf9a825, 0x6a1b9a];
  function motorbike(x, z, ry, accent) {
    const g = new T.Group();
    const wheelG = new T.CylinderGeometry(0.27, 0.27, 0.09, 10);
    const wheelM = new T.MeshPhongMaterial({ color: 0x0c0d10, shininess: 40 });
    for (const wz of [-0.52, 0.52]) {
      const wh = new T.Mesh(wheelG, wheelM);
      wh.rotation.z = Math.PI / 2;
      wh.position.set(0, 0.27, wz);
      g.add(wh);
    }
    const spine = new T.Mesh(new T.BoxGeometry(0.24, 0.22, 1.25), new T.MeshPhongMaterial({ color: accent, shininess: 70 }));
    spine.position.set(0, 0.52, -0.05); spine.rotation.x = 0.1; g.add(spine);
    const seat = new T.Mesh(new T.BoxGeometry(0.3, 0.1, 0.62), bikeBody);
    seat.position.set(0, 0.68, -0.32); g.add(seat);
    const bars = new T.Mesh(new T.BoxGeometry(0.44, 0.06, 0.08), bikeBody);
    bars.position.set(0, 0.92, 0.48); g.add(bars);
    const stem = new T.Mesh(new T.BoxGeometry(0.07, 0.42, 0.07), bikeBody);
    stem.position.set(0, 0.72, 0.46); stem.rotation.x = 0.35; g.add(stem);
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    world.add(g);
  }
  for (let i = 0; i < 4; i++) motorbike(84 + i * 2.6, 200, Math.PI / 2 + rand(-0.12, 0.12), bikeAccent[i % bikeAccent.length]);
  addCollider(88, 200, 5.4, 0.8);
  for (let i = 0; i < 3; i++) motorbike(158, 12 + i * 2.6, rand(-0.12, 0.12), bikeAccent[(i + 2) % bikeAccent.length]);
  addCollider(158, 15, 0.8, 4.2);
}

// ------------------------------------------------------------ districts
function buildTerminal(world) {
  const cx = -200, cz = 55;
  // A wide shelter roof on slim poles, cyan trim glowing underneath.
  const roof = new T.Mesh(
    new T.BoxGeometry(64, 1, 26),
    new T.MeshPhongMaterial({ color: 0x27313f, shininess: 50, specular: 0x8899bb })
  );
  roof.position.set(cx, 6.4, cz); world.add(roof);
  const trim = new T.Mesh(new T.BoxGeometry(64.6, 0.5, 26.6), new T.MeshBasicMaterial({ color: PAL.neonCyan }));
  trim.position.set(cx, 5.85, cz); world.add(trim);
  for (const px of [-28, -14, 0, 14, 28]) {
    for (const pz of [-10, 10]) {
      const pole = new T.Mesh(
        new T.CylinderGeometry(0.22, 0.22, 6.4, 6),
        new T.MeshPhongMaterial({ color: 0x39424e })
      );
      pole.position.set(cx + px, 3.2, cz + pz); world.add(pole);
    }
  }
  neonSign(world, 'TERMINAL BASAH', 'ANTAR KOTA • ANGKOT • BUS MALAM', '#00e5ff', '#03141a', 22, cx, 8.6, cz - 13.4);
  for (let i = 0; i < 7; i++) lightPool(world, cx - 27 + i * 9, cz, 7, 0x66d9ff, 0.28);
  for (let i = 0; i < 6; i++) {
    const bench = new T.Mesh(new T.BoxGeometry(3.4, 0.5, 0.8), new T.MeshPhongMaterial({ color: 0x4a5a6a }));
    bench.position.set(cx - 25 + i * 10, 0.4, cz + 8); world.add(bench);
    addCollider(cx - 25 + i * 10, cz + 8, 1.7, 0.45);
  }
  addCollider(cx, cz - 12, 32, 1.2);
  addCollider(cx, cz + 12, 32, 1.2);
}

function buildPasar(world) {
  const cx = 200, cz = 45;
  neonSign(world, 'PASAR KABUT', 'SAYUR • IKAN • REMPAH — BUKA 24 JAM', '#ff2e88', '#170510', 21, cx - 20, 7.6, cz - 26);
  const awningPalette = [0xd81b60, 0x00897b, 0xf9a825, 0x5e35b1, 0xc62828, 0x2e7d32];
  const goodsPalette = [0x66bb6a, 0xff7043, 0xffee58, 0xab47bc, 0x26c6da];
  // Three aisles of five stalls: counter, tilted awning, posts, goods,
  // a warm bulb glow and a light pool on the wet floor per stall.
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 5; i++) {
      const x = cx - 30 + i * 15, z = cz - 18 + row * 17;
      const counter = new T.Mesh(new T.BoxGeometry(5.6, 1.1, 2.6), new T.MeshPhongMaterial({ color: 0x5d4037 }));
      counter.position.set(x, 0.55, z); world.add(counter);
      const awning = new T.Mesh(
        new T.BoxGeometry(6.6, 0.14, 4.6),
        new T.MeshPhongMaterial({ color: pick(awningPalette), shininess: 30 })
      );
      awning.position.set(x, 2.9, z); awning.rotation.x = 0.16; world.add(awning);
      for (const s of [-2.9, 2.9]) {
        const post = new T.Mesh(
          new T.CylinderGeometry(0.07, 0.07, 2.9, 5),
          new T.MeshPhongMaterial({ color: 0x333333 })
        );
        post.position.set(x + s, 1.45, z + 1.6); world.add(post);
      }
      for (let k = 0; k < 4; k++) {
        const goods = new T.Mesh(
          new T.BoxGeometry(0.8, 0.5, 0.8),
          new T.MeshPhongMaterial({ color: pick(goodsPalette), shininess: 40 })
        );
        goods.position.set(x + rand(-2, 2), 1.36, z + rand(-0.7, 0.7)); world.add(goods);
      }
      glowSprite(world, x, 2.5, z + 1, 2.4, 0xffc46b, 0.8);
      lightPool(world, x, z + 2.6, 6, 0xffb347, 0.3);
      addCollider(x, z, 3, 1.6);
    }
  }
}

// ------------------------------------------------------------ warung stall
// One lit street stall — counter, tilted awning, goods, a warm bulb and
// a light pool — shared by the station plaza and the city-life clusters.
// Stools ring the serving side; the counter registers the collider.
export function warungStall(world, x, z, ry = 0) {
  const g = new T.Group();
  const counter = new T.Mesh(new T.BoxGeometry(4.6, 1.1, 1.8), new T.MeshPhongMaterial({ color: 0x5d4037 }));
  counter.position.set(0, 0.55, 0); g.add(counter);
  const awning = new T.Mesh(
    new T.BoxGeometry(5.6, 0.13, 3.6),
    new T.MeshPhongMaterial({ color: pick([0xd81b60, 0x00897b, 0xf9a825, 0x2e7d32]), shininess: 30 })
  );
  awning.position.set(0, 2.7, 0.3); awning.rotation.x = 0.15; g.add(awning);
  for (const s of [-2.5, 2.5]) {
    const post = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 2.7, 5), new T.MeshPhongMaterial({ color: 0x333333 }));
    post.position.set(s, 1.35, 1.3); g.add(post);
  }
  const goodsPalette = [0x66bb6a, 0xff7043, 0xffee58, 0xab47bc, 0x26c6da];
  for (let k = 0; k < 3; k++) {
    const goods = new T.Mesh(new T.BoxGeometry(0.7, 0.45, 0.7), new T.MeshPhongMaterial({ color: pick(goodsPalette), shininess: 40 }));
    goods.position.set(rand(-1.6, 1.6), 1.33, rand(-0.4, 0.4)); g.add(goods);
  }
  const stoolMat = new T.MeshPhongMaterial({ color: 0x37474f, shininess: 40 });
  for (const [sx, sz] of [[-1.6, 1.9], [0, 2.1], [1.6, 1.9]]) {
    const stool = new T.Mesh(new T.CylinderGeometry(0.26, 0.26, 0.5, 8), stoolMat);
    stool.position.set(sx, 0.25, sz); g.add(stool);
  }
  glowSprite(g, 0, 2.3, 0.6, 2.2, 0xffc46b, 0.85);
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  world.add(g);
  lightPool(world, x + Math.sin(ry) * 1.8, z + Math.cos(ry) * 1.8, 6, 0xffb347, 0.3);
  addCollider(x, z, 2.4, 1.1);
}

// ------------------------------------------------------------ the train
// The one piece of the city that moves. buildStasiun registers the
// group, its door-glow panels and a LIVE collider object here;
// updateCity() runs the loop — glide in from the east, dwell at the
// platform with doors lit, depart west, wait in the dark, return.
// The collider object is mutated in place: resolveCollisions reads
// the array fresh every call, so the box travels with the train.
const trainState = { group: null, collider: null, doorGlow: null, t: 0, phase: 'arrive', x: 218 };
const TRAIN_DWELL_X = 39, TRAIN_Z = 251;
export function updateCity(dt) {
  const tr = trainState;
  if (!tr.group) return;
  tr.t += dt;
  let speed = 0;
  if (tr.phase === 'arrive') {
    const gap = tr.x - TRAIN_DWELL_X;
    speed = -Math.max(2.4, Math.min(13, gap * 0.32));
    if (gap < 0.5) { tr.x = TRAIN_DWELL_X; tr.phase = 'dwell'; tr.t = 0; }
  } else if (tr.phase === 'dwell') {
    if (tr.t > 9) { tr.phase = 'depart'; tr.t = 0; }
  } else if (tr.phase === 'depart') {
    speed = -13;
    if (tr.x < -160) { tr.phase = 'away'; tr.t = 0; }
  } else if (tr.phase === 'away') {
    if (tr.t > 7) { tr.phase = 'arrive'; tr.t = 0; tr.x = 218; }
  }
  tr.x += speed * dt;
  tr.group.position.x = tr.x;
  if (tr.collider) tr.collider.x = tr.x;
  if (tr.doorGlow) tr.doorGlow.visible = tr.phase === 'dwell';
}

function buildStasiun(world) {
  const cx = 45, cz = 232;
  // Flanking towers fill the reserved block's empty flanks: the station
  // no longer sits alone on a slab, and the spawn forecourt reads as a
  // city square the moment the player steps in.
  tower(world, -18, 205, 20, 24, 18, '#232d3d');
  tower(world, 110, 206, 22, 31, 20, '#28303f');
  streetLamp(world, 0, 212);
  streetLamp(world, 90, 212);
  streetLamp(world, 26, 221);
  streetLamp(world, 64, 221);
  const facadeMat = new T.MeshPhongMaterial({ color: 0x2c3644, shininess: 30 });
  // THE HALL IS A PLACE NOW (P2): the front wall is built as segments
  // with three real doorways (x 29 / 45 / 62, 4.4 wide, 5.2 tall), so
  // the player walks IN — loket counters, a departure board, bench
  // rows and warm light inside, and doors through the back wall onto
  // the platform. From the street the wall reads exactly as before.
  const DOORS = [29, 45, 62];
  const wallSegs = [[12, 26.8], [31.2, 42.8], [47.2, 59.8], [64.2, 78]];
  for (const [x0, x1] of wallSegs) {
    const seg = new T.Mesh(new T.BoxGeometry(x1 - x0, 13, 1.2), facadeMat);
    seg.position.set((x0 + x1) / 2, 6.5, cz - 3.4); world.add(seg);
    addCollider((x0 + x1) / 2, cz - 3.4, (x1 - x0) / 2, 0.7);
  }
  for (const dx of DOORS) {
    const lintel = new T.Mesh(new T.BoxGeometry(4.4, 7.8, 1.2), facadeMat);
    lintel.position.set(dx, 9.1, cz - 3.4); world.add(lintel);
  }
  // Interior shell: side walls, a ceiling, and a back wall with two
  // doors of its own opening onto the platform.
  for (const sx of [12.6, 77.4]) {
    const side = new T.Mesh(new T.BoxGeometry(1.2, 7.5, 11.5), facadeMat);
    side.position.set(sx, 3.75, cz + 2.9); world.add(side);
    addCollider(sx, cz + 2.9, 0.7, 5.7);
  }
  const ceil = new T.Mesh(new T.BoxGeometry(66, 0.4, 12), new T.MeshPhongMaterial({ color: 0x1c242f, shininess: 20 }));
  ceil.position.set(cx, 7.6, cz + 2.9); world.add(ceil);
  for (const [x0, x1] of [[12, 26.8], [31.2, 59.8], [64.2, 78]]) {
    const seg = new T.Mesh(new T.BoxGeometry(x1 - x0, 7.5, 0.8), facadeMat);
    seg.position.set((x0 + x1) / 2, 3.75, cz + 8.2); world.add(seg);
    addCollider((x0 + x1) / 2, cz + 8.2, (x1 - x0) / 2, 0.5);
  }
  for (const dx of [29, 62]) {
    const lintel = new T.Mesh(new T.BoxGeometry(4.4, 2.3, 0.8), facadeMat);
    lintel.position.set(dx, 6.35, cz + 8.2); world.add(lintel);
  }
  const hallFloor = new T.Mesh(new T.BoxGeometry(64, 0.08, 11.4), new T.MeshPhongMaterial({ color: 0x323e4e, shininess: 80, specular: 0x77879f }));
  hallFloor.position.set(cx, 0.05, cz + 2.9); world.add(hallFloor);
  // Loket row along the back wall + the departure board above it.
  for (const [lx, label] of [[24, 'LOKET 1'], [36, 'LOKET 2'], [48, 'LOKET 3']]) {
    const counter = new T.Mesh(new T.BoxGeometry(5, 1.15, 1), new T.MeshPhongMaterial({ color: 0x4a3b2c, shininess: 40 }));
    counter.position.set(lx, 0.58, cz + 6.9); world.add(counter);
    addCollider(lx, cz + 6.9, 2.5, 0.6);
    neonSign(world, label, null, '#00e5ff', '#0a141c', 4.6, lx, 2.7, cz + 6.3, Math.PI);
  }
  neonSign(world, 'KEBERANGKATAN', 'MALAM 19:42 • PAGI 06:10 • KERETA MALAM', '#ffd54f', '#101319', 13, cx + 14, 5.4, cz + 7.7, Math.PI);
  // Bench rows in the waiting hall.
  for (const [bx, bz] of [[20, cz + 1.5], [36, cz + 1.5], [56, cz + 1.5], [70, cz + 1.5], [36, cz + 4.6], [56, cz + 4.6]]) {
    const bench = new T.Mesh(new T.BoxGeometry(3.4, 0.5, 0.8), new T.MeshPhongMaterial({ color: 0x4a5a6a }));
    bench.position.set(bx, 0.4, bz); world.add(bench);
    addCollider(bx, bz, 1.7, 0.45);
  }
  // Warm interior light + spill pools in every doorway, both sides.
  const hallLight = new T.PointLight(0xffb46b, 0.95, 58);
  hallLight.position.set(cx, 5.6, cz + 3); world.add(hallLight);
  for (const dx of DOORS) {
    lightPool(world, dx, cz - 1.2, 6.5, 0xffb347, 0.4);
    glowSprite(world, dx, 2.8, cz - 2.6, 3.2, 0xffc46b, 0.6);
  }
  // Six glowing arches along the front, each pooling light on the
  // street. Over the three doorways the arch becomes a transom band
  // so the opening below it stays truly open.
  for (let i = 0; i < 6; i++) {
    const ax = cx - 27 + i * 11;
    if (DOORS.includes(ax)) {
      const transom = new T.Mesh(new T.BoxGeometry(6, 2.8, 1), new T.MeshBasicMaterial({ color: 0xffc46b }));
      transom.position.set(ax, 6.6, cz - 4.4); world.add(transom);
    } else {
      const arch = new T.Mesh(new T.BoxGeometry(6, 8, 1), new T.MeshBasicMaterial({ color: 0xffc46b }));
      arch.position.set(ax, 4, cz - 4.4); world.add(arch);
    }
    lightPool(world, ax, cz - 9, 7, 0xffb347, 0.3);
  }
  // THE SIGN, twice: the original board faces the platform (+Z); this
  // second board is rotated PI so street-side players read STASIUN
  // KOTA correctly instead of mirrored — same canvas recipe, in-game.
  neonSign(world, 'STASIUN KOTA', 'KERETA MALAM • LOKET 24 JAM', '#ffb347', '#171003', 20, cx, 15.4, cz - 4.6);
  neonSign(world, 'STASIUN KOTA', 'KERETA MALAM • LOKET 24 JAM', '#ffb347', '#171003', 20, cx, 15.4, cz - 5.1, Math.PI);
  // --- the hall gets MASS: cornice + frieze, a roof volume with a
  // parapet and rooftop clutter, two side wings, and a recessed
  // entrance portal on columns — from any 3/4 angle it now reads as
  // a BUILDING with depth, not a billboard wall.
  const trimMat = new T.MeshPhongMaterial({ color: 0x1c242f, shininess: 24 });
  const cornice = new T.Mesh(new T.BoxGeometry(67.6, 0.6, 9.6), trimMat);
  cornice.position.set(cx, 12.75, cz); world.add(cornice);
  const frieze = new T.Mesh(new T.BoxGeometry(67.6, 0.22, 9.65), new T.MeshBasicMaterial({ color: 0xffb347 }));
  frieze.position.set(cx, 12.35, cz); world.add(frieze);
  const roof = new T.Mesh(new T.BoxGeometry(72, 1.3, 24), new T.MeshPhongMaterial({ color: 0x232c38, shininess: 26 }));
  roof.position.set(cx, 13.9, cz + 3); world.add(roof);
  for (const [px, pz, pw, pd] of [[cx, cz - 8.6, 72, 0.5], [cx, cz + 14.6, 72, 0.5], [cx - 35.8, cz + 3, 0.5, 24], [cx + 35.8, cz + 3, 0.5, 24]]) {
    const par = new T.Mesh(new T.BoxGeometry(pw, 0.95, pd), trimMat);
    par.position.set(px, 14.95, pz); world.add(par);
  }
  const tank = new T.Mesh(new T.CylinderGeometry(1.6, 1.6, 2.6, 10), new T.MeshPhongMaterial({ color: 0x546e7a, shininess: 45 }));
  tank.position.set(cx - 22, 15.85, cz + 6); world.add(tank);
  const acBox = new T.Mesh(new T.BoxGeometry(3.2, 1.1, 2.2), new T.MeshPhongMaterial({ color: 0x39424e, shininess: 30 }));
  acBox.position.set(cx + 18, 15.1, cz + 2); world.add(acBox);
  // Side wings: lower masses stepping down at both ends of the hall.
  tower(world, 1, 235, 13, 9.5, 15, '#28303f');
  tower(world, 89, 235, 13, 11, 15, '#232d3d');
  // Entrance portal: two columns + lintel + a lit canopy slab in front
  // of the centre doors, with a warm pool on the apron.
  for (const px of [cx - 7, cx + 7]) {
    const col = new T.Mesh(new T.BoxGeometry(0.8, 6.4, 0.8), facadeMat);
    col.position.set(px, 3.2, cz - 9.5); world.add(col);
    addCollider(px, cz - 9.5, 0.45, 0.45);
  }
  const lintel = new T.Mesh(new T.BoxGeometry(16.5, 0.9, 1.4), trimMat);
  lintel.position.set(cx, 6.6, cz - 9.5); world.add(lintel);
  const canopy = new T.Mesh(new T.BoxGeometry(21, 0.35, 6), new T.MeshPhongMaterial({ color: 0x27313f, shininess: 50, specular: 0x8899bb }));
  canopy.position.set(cx, 5.7, cz - 7.6); world.add(canopy);
  const canopyGlow = new T.Mesh(new T.BoxGeometry(21.2, 0.14, 6.2), new T.MeshBasicMaterial({ color: 0xffc46b }));
  canopyGlow.position.set(cx, 5.45, cz - 7.6); world.add(canopyGlow);
  lightPool(world, cx, cz - 11, 11, 0xffb347, 0.42);
  // Platform, twin rails, and the night train — now ON its track,
  // centred on the platform edge, and MOVING (see updateCity).
  const platform = new T.Mesh(
    new T.BoxGeometry(90, 0.8, 7),
    new T.MeshPhongMaterial({ color: 0x39424e, shininess: 50, specular: 0x77879f })
  );
  platform.position.set(cx, 0.4, cz + 12); world.add(platform);
  // Platform canopy on columns behind the hall.
  const pCanopy = new T.Mesh(new T.BoxGeometry(84, 0.45, 8.6), new T.MeshPhongMaterial({ color: 0x27313f, shininess: 50, specular: 0x8899bb }));
  pCanopy.position.set(cx, 6.7, cz + 12.5); world.add(pCanopy);
  for (const px of [9, 27, 45, 63, 81]) {
    for (const pz of [cz + 9.2, cz + 15.8]) {
      const col = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 6.7, 6), new T.MeshPhongMaterial({ color: 0x39424e }));
      col.position.set(px, 3.35, pz); world.add(col);
    }
    glowSprite(world, px, 6.2, cz + 12.5, 3, 0xffc46b, 0.55);
  }
  for (const s of [-1.1, 1.1]) {
    const rail = new T.Mesh(
      new T.BoxGeometry(150, 0.12, 0.18),
      new T.MeshPhongMaterial({ color: 0x9aa7b5, shininess: 120, specular: 0xffffff })
    );
    rail.position.set(cx, 0.1, cz + 19 + s); world.add(rail);
  }
  const train = new T.Group();
  const carriage = new T.Mesh(
    new T.BoxGeometry(64, 3.4, 3.2),
    new T.MeshPhongMaterial({ color: 0x35506e, shininess: 70 })
  );
  carriage.position.y = 2.2; train.add(carriage);
  const winBand = new T.Mesh(
    new T.BoxGeometry(64.2, 1.1, 3.3),
    new T.MeshBasicMaterial({ map: makeWindowsTexture('#35506e', 0.9) })
  );
  winBand.position.y = 2.7; train.add(winBand);
  const stripe = new T.Mesh(new T.BoxGeometry(64.2, 0.4, 3.3), new T.MeshBasicMaterial({ color: PAL.neonPink }));
  stripe.position.y = 1.35; train.add(stripe);
  // Headlight glows at both ends (it runs both ways across the night)
  // and a row of door panels on the platform side that light up only
  // while the train dwells at the platform.
  glowSprite(train, -32.6, 1.7, 0, 4.5, 0xd8ecff, 0.9);
  glowSprite(train, 32.6, 1.7, 0, 4.5, 0xd8ecff, 0.9);
  const doorGlow = new T.Group();
  for (let i = 0; i < 6; i++) {
    const door = new T.Mesh(new T.BoxGeometry(1.6, 2.3, 0.06), new T.MeshBasicMaterial({ color: 0xffd98a }));
    door.position.set(-26 + i * 10.4, 1.75, -1.66);
    doorGlow.add(door);
  }
  doorGlow.visible = false;
  train.add(doorGlow);
  train.position.set(trainState.x, 0, TRAIN_Z);
  world.add(train);
  trainState.group = train;
  trainState.doorGlow = doorGlow;
  trainState.collider = { x: trainState.x, z: TRAIN_Z, hw: 32, hd: 2 };
  colliders.push(trainState.collider);
  // (No whole-hall collider anymore: the segmented walls above carry
  // their own, and the doorways between them are genuinely open.)
  // Two lit warung stalls at the plaza edges — the forecourt feeds people.
  warungStall(world, 6, 219, 0.5);
  warungStall(world, 86, 219, -0.5);
}

function buildKampung(world) {
  const cx = -185, cz = -205;
  // The kampung sits on a raised terrace above the street grid.
  const terrace = new T.Mesh(
    new T.BoxGeometry(120, 3, 105),
    new T.MeshPhongMaterial({ color: 0x1d2620, shininess: 20 })
  );
  terrace.position.set(cx, 1.5, cz); world.add(terrace);
  const roofPalette = [0x8d3b2f, 0x37505e, 0x6b5136, 0x44554a, 0x59384a];
  const wallPalette = [0x4c4238, 0x3d4a52, 0x54453a, 0x41484f];
  for (let i = 0; i < 16; i++) {
    const w = rand(8, 13), d = rand(8, 12), h = rand(3.4, 5.6);
    const x = cx + rand(-48, 48), z = cz + rand(-40, 40);
    const house = new T.Mesh(
      new T.BoxGeometry(w, h, d),
      new T.MeshPhongMaterial({ color: pick(wallPalette), shininess: 16 })
    );
    house.position.set(x, 3 + h / 2, z); world.add(house);
    const roof = new T.Mesh(
      new T.ConeGeometry(Math.max(w, d) * 0.78, 2.2, 4),
      new T.MeshPhongMaterial({ color: pick(roofPalette) })
    );
    roof.position.set(x, 3 + h + 1.1, z); roof.rotation.y = Math.PI / 4; world.add(roof);
    glowSprite(world, x, 4.6, z + d / 2 + 0.4, 2.2, 0xffb347, 0.7);
    addCollider(x, z, w / 2, d / 2);
  }
  neonSign(world, 'KAMPUNG ATAS', null, '#00ffc8', '#03140f', 12, cx, 8.4, cz + 52);
  // A sagging string of coloured lanterns across the lane.
  for (let i = 0; i < 9; i++) {
    glowSprite(world, cx - 32 + i * 8, 6.4 - Math.abs(i - 4) * 0.22, cz + 30, 1.7,
      pick([0xffb347, 0xff5da2, 0x00e5ff]), 0.8);
  }
}

function buildJalur(world) {
  const cx = 205, cz = -210;
  // Fog highway: a raised deck on pillars, guard rails both sides.
  const deck = new T.Mesh(
    new T.BoxGeometry(150, 1.2, 15),
    new T.MeshPhongMaterial({ color: 0x171d27, shininess: 90, specular: PAL.asphaltSpec })
  );
  deck.position.set(cx, 3.4, cz); world.add(deck);
  for (const s of [-1, 1]) {
    const rail = new T.Mesh(
      new T.BoxGeometry(150, 0.7, 0.3),
      new T.MeshPhongMaterial({ color: 0x8fa3b8, shininess: 90, specular: 0xdfeaff })
    );
    rail.position.set(cx, 4.6, cz + s * 7.4); world.add(rail);
    for (let i = -3; i <= 3; i++) {
      const pillar = new T.Mesh(
        new T.BoxGeometry(1.4, 3.4, 1.4),
        new T.MeshPhongMaterial({ color: 0x2a333f })
      );
      pillar.position.set(cx + i * 22, 1.7, cz + s * 6); world.add(pillar);
    }
  }
  neonSign(world, 'JALUR KABUT', 'TURUNAN TAJAM — HATI-HATI', '#7dff8a', '#04140a', 13, cx - 40, 8.6, cz - 9);
  // Pine silhouettes fading into the fog on both shoulders.
  for (let i = 0; i < 22; i++) {
    const x = cx + rand(-85, 85), z = cz + rand(-46, 46);
    if (Math.abs(z - cz) < 12) continue;
    const pine = new T.Group();
    const trunk = new T.Mesh(
      new T.CylinderGeometry(0.22, 0.3, 2.4, 5),
      new T.MeshPhongMaterial({ color: 0x2a2019 })
    );
    trunk.position.y = 1.2; pine.add(trunk);
    for (let k = 0; k < 3; k++) {
      const cone = new T.Mesh(
        new T.ConeGeometry(2.6 - k * 0.6, 3.4, 7),
        new T.MeshPhongMaterial({ color: 0x14352b })
      );
      cone.position.y = 3 + k * 1.7; pine.add(cone);
    }
    pine.position.set(x, 0, z);
    world.add(pine);
  }
}
