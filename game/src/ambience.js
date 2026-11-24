// GERIMIS — ambience: the living-weather layer above the base rain.
//
// effects.js owns the falling streaks and the thunder. This module owns
// what the rain DOES to the city once it lands, plus the mist that moves
// through the streets:
//
//   1. Puddle ripples. A pooled set of flat rings on the asphalt. Each
//      ring is born small where a drop strikes, swells, thins and dies
//      in under a second. Spawning is anchored to the camera focus, so
//      the street around the player always sparkles with fresh impacts
//      while nothing is wasted on districts nobody can see.
//
//   2. Fog wisps. A handful of very large, very faint soft sprites at
//      knee-to-waist height, drifting slowly on individual headings.
//      When a wisp wanders too far from the anchor it re-enters on the
//      opposite side, so the mist reads as endless rather than placed.
//
// Everything is pooled and allocation-free in the frame loop: the ring
// pool and the wisp list are built once in the constructor, and update()
// only writes transforms and opacities.

const T = window.THREE;

const RIPPLE_COUNT = 90;      // rings in the pool
const RIPPLE_RATE = 30;       // births per second around the anchor
const RIPPLE_SPREAD = 27;     // metres: spawn disc radius around anchor
const RIPPLE_LIFE = 0.95;     // seconds from birth to fully faded
const WISP_COUNT = 14;        // drifting mist sprites
const WISP_WRAP = 150;        // metres: wisp field size around anchor

// One soft radial-gradient texture, generated once and shared by every
// wisp sprite — a canvas blob, no image asset needed.
function makeWispTexture() {
  const size = 128;
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const ctx = cv.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(196,220,245,0.85)');
  grad.addColorStop(0.55, 'rgba(170,200,235,0.38)');
  grad.addColorStop(1, 'rgba(160,195,235,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new T.CanvasTexture(cv);
  return tex;
}

export class Ambience {
  constructor(scene) {
    // --- ripple pool ---
    const ringGeo = new T.RingGeometry(0.42, 0.5, 20);
    this.ripples = [];
    for (let i = 0; i < RIPPLE_COUNT; i++) {
      const mat = new T.MeshBasicMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0, depthWrite: false });
      const ring = new T.Mesh(ringGeo, mat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.03;
      ring.visible = false;
      scene.add(ring);
      // age starts past life: the whole pool begins dormant.
      this.ripples.push({ mesh: ring, age: RIPPLE_LIFE + Math.random() });
    }
    this.rippleCursor = 0;
    this.spawnDebt = 0;

    // --- fog wisps ---
    const wispTex = makeWispTexture();
    this.wisps = [];
    for (let i = 0; i < WISP_COUNT; i++) {
      const mat = new T.SpriteMaterial({ map: wispTex, transparent: true, opacity: 0.05 + Math.random() * 0.05, depthWrite: false });
      const spr = new T.Sprite(mat);
      const span = 30 + Math.random() * 28;
      spr.scale.set(span, span * 0.36, 1);
      spr.position.set((Math.random() - 0.5) * WISP_WRAP, 2 + Math.random() * 4.5, (Math.random() - 0.5) * WISP_WRAP);
      scene.add(spr);
      this.wisps.push({ spr, vx: (Math.random() - 0.5) * 1.5, vz: (Math.random() - 0.5) * 1.1 });
    }
  }

  // Birth one ripple at a random point on the disc around (ax, az).
  birthRipple(ax, az) {
    const slot = this.ripples[this.rippleCursor];
    this.rippleCursor = (this.rippleCursor + 1) % RIPPLE_COUNT;
    const ang = Math.random() * Math.PI * 2;
    const rad = Math.sqrt(Math.random()) * RIPPLE_SPREAD; // sqrt: even disc coverage
    slot.mesh.position.x = ax + Math.cos(ang) * rad;
    slot.mesh.position.z = az + Math.sin(ang) * rad;
    slot.age = 0;
    slot.mesh.visible = true;
  }

  update(dt, anchor) {
    const ax = anchor.x, az = anchor.z;

    // Ripples: convert the birth rate into whole births, carrying the
    // fractional remainder so the rate stays honest at any frame time.
    this.spawnDebt += dt * RIPPLE_RATE;
    while (this.spawnDebt >= 1) { this.spawnDebt -= 1; this.birthRipple(ax, az); }
    for (const slot of this.ripples) {
      if (slot.age > RIPPLE_LIFE) { slot.mesh.visible = false; continue; }
      slot.age += dt;
      const t = Math.min(slot.age / RIPPLE_LIFE, 1);
      const grow = 0.35 + t * 1.5;
      slot.mesh.scale.set(grow, grow, 1);
      slot.mesh.material.opacity = (1 - t) * 0.5;
    }

    // Wisps: drift, and wrap around the anchor so the field is endless.
    for (const w of this.wisps) {
      const p = w.spr.position;
      p.x += w.vx * dt; p.z += w.vz * dt;
      const half = WISP_WRAP / 2;
      if (p.x - ax > half) p.x -= WISP_WRAP; else if (ax - p.x > half) p.x += WISP_WRAP;
      if (p.z - az > half) p.z -= WISP_WRAP; else if (az - p.z > half) p.z += WISP_WRAP;
    }
  }
}
