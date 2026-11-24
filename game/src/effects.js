// GERIMIS — weather and combat effects, all pooled, nothing allocated
// per frame: 950 rain streaks, ground splashes, travelling bullet
// streaks, ejected brass casings, muzzle stars, impact sparks, and the
// lightning envelope the main loop reads for thunder timing.
//
// Pooling rule: every mesh/sprite is created once in the constructor
// and recycled through ring indices. update() only moves things.

const T = window.THREE;
import { PAL, rand } from './config.js';

// Soft radial sprite texture: `inner` at the centre fading to `outer`.
function radialTexture(inner, outer) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const ctx = cv.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return new T.CanvasTexture(cv);
}

// Four-point muzzle flash star, drawn once onto a canvas.
function muzzleTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const ctx = cv.getContext('2d');
  ctx.translate(64, 64);
  ctx.fillStyle = 'rgba(255,240,200,1)';
  ctx.strokeStyle = 'rgba(255,210,120,0.95)';
  ctx.lineWidth = 7; ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI + 0.4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * -46, Math.sin(ang) * -46);
    ctx.lineTo(Math.cos(ang) * 46, Math.sin(ang) * 46);
    ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
  return new T.CanvasTexture(cv);
}

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.frozen = false;               // staging lever: hold every particle
    this.anchor = new T.Vector3();     // weather follows this point (hero)
    this._makeRain();
    this._makeSplashes();
    this._makeStreaks();
    this._makeCasings();
    this._makeStars();
    this._makeSparks();
    // Lightning lives here: one far flash light + a 0..1 envelope.
    this.flashLight = new T.PointLight(0xbdd4ff, 0, 900);
    this.flashLight.position.set(0, 120, 0);
    scene.add(this.flashLight);
    this.flashEnv = 0;
    this.nextBolt = rand(25, 45);
    this.onThunder = null;             // main loop hooks the rumble here
  }

  // ---- rain: 950 line segments in a 104 m box around the anchor ------
  _makeRain() {
    const COUNT = 950;
    this.rainCount = COUNT;
    this.rainPos = new Float32Array(COUNT * 6); // two vertices per drop
    this.rainVel = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) this._respawnDrop(i, true);
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(this.rainPos, 3));
    const mat = new T.LineBasicMaterial({
      color: PAL.rainLine, transparent: true, opacity: 0.5,
      blending: T.AdditiveBlending, depthWrite: false,
    });
    this.rain = new T.LineSegments(geo, mat);
    this.rain.frustumCulled = false;
    this.scene.add(this.rain);
  }

  _respawnDrop(i, anywhere = false) {
    const RADIUS = 52;
    const x = this.anchor.x + rand(-RADIUS, RADIUS);
    const z = this.anchor.z + rand(-RADIUS, RADIUS);
    const y = this.anchor.y + (anywhere ? rand(0, 46) : rand(34, 46));
    this.rainVel[i * 3] = -2.4;          // slight wind slant
    this.rainVel[i * 3 + 1] = -41;       // terminal velocity
    this.rainVel[i * 3 + 2] = -1.1;
    const p = this.rainPos, o = i * 6;
    p[o] = x; p[o + 1] = y; p[o + 2] = z;
    // tail vertex sits up-back so each drop reads as a bright streak
    p[o + 3] = x + 0.14; p[o + 4] = y + 1.15; p[o + 5] = z + 0.06;
  }

  // ---- splashes: expanding rings where drops land --------------------
  _makeSplashes() {
    const geo = new T.RingGeometry(0.55, 0.8, 14);
    this.splashes = [];
    for (let i = 0; i < 56; i++) {
      const mesh = new T.Mesh(geo, new T.MeshBasicMaterial({
        color: 0x9fc8ee, transparent: true, opacity: 0,
        side: T.DoubleSide, depthWrite: false,
      }));
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      this.scene.add(mesh);
      this.splashes.push({ mesh, life: 0, max: rand(0.4, 0.7) });
    }
    this.splashIdx = 0;
  }

  // ---- bullet streaks: a ~2.4 m bright segment that TRAVELS ----------
  _makeStreaks() {
    const geo = new T.BoxGeometry(0.045, 0.045, 1); // unit length, scaled
    this.streaks = [];
    for (let i = 0; i < 90; i++) {
      const mat = new T.MeshBasicMaterial({
        color: PAL.streakCore, transparent: true, opacity: 0,
        blending: T.AdditiveBlending, depthWrite: false,
      });
      const mesh = new T.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.streaks.push({
        mesh, active: false, age: 0,
        from: new T.Vector3(), dir: new T.Vector3(),
        dist: 0, travelled: 0, speed: 125, onHit: null,
      });
    }
    this.streakIdx = 0;
  }

  fireStreak(from, dir, maxDist, speed, onHit) {
    const s = this.streaks[this.streakIdx];
    this.streakIdx = (this.streakIdx + 1) % this.streaks.length;
    s.active = true; s.age = 0;
    s.from.copy(from);
    s.dir.copy(dir).normalize();
    s.dist = maxDist; s.travelled = 0; s.speed = speed; s.onHit = onHit;
    s.mesh.visible = true;
    s.mesh.position.copy(from);
    s.mesh.lookAt(from.x + s.dir.x, from.y + s.dir.y, from.z + s.dir.z);
  }

  // ---- brass casings: tossed right, tumble, rest, vanish -------------
  _makeCasings() {
    const geo = new T.BoxGeometry(0.035, 0.035, 0.09);
    const mat = new T.MeshBasicMaterial({ color: PAL.casing });
    this.casings = [];
    for (let i = 0; i < 44; i++) {
      const mesh = new T.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.casings.push({ mesh, active: false, vel: new T.Vector3(), rot: new T.Vector3(), life: 0 });
    }
    this.casingIdx = 0;
  }

  ejectCasing(pos, rightDir) {
    const c = this.casings[this.casingIdx];
    this.casingIdx = (this.casingIdx + 1) % this.casings.length;
    c.active = true; c.life = 1.5;
    c.mesh.visible = true;
    c.mesh.position.copy(pos);
    c.vel.set(rightDir.x * rand(1.2, 2), rand(2.2, 3.1), rightDir.z * rand(1.2, 2));
    c.rot.set(rand(-9, 9), rand(-9, 9), rand(-9, 9));
  }

  // ---- muzzle stars ---------------------------------------------------
  _makeStars() {
    const tex = muzzleTexture();
    this.stars = [];
    for (let i = 0; i < 14; i++) {
      const mat = new T.SpriteMaterial({
        map: tex, transparent: true, opacity: 0,
        blending: T.AdditiveBlending, depthWrite: false,
      });
      const spr = new T.Sprite(mat);
      spr.scale.set(0.55, 0.55, 1);
      spr.visible = false;
      this.scene.add(spr);
      this.stars.push({ sprite: spr, life: 0 });
    }
    this.starIdx = 0;
  }

  muzzleStar(pos, scale = 1) {
    const st = this.stars[this.starIdx];
    this.starIdx = (this.starIdx + 1) % this.stars.length;
    st.life = 0.05;
    st.sprite.visible = true;
    st.sprite.position.copy(pos);
    st.sprite.scale.set(0.5 * scale, 0.5 * scale, 1);
    st.sprite.material.opacity = 1;
    st.sprite.material.rotation = rand(0, Math.PI);
  }

  // ---- impact sparks ---------------------------------------------------
  _makeSparks() {
    const tex = radialTexture('rgba(255,220,150,1)', 'rgba(255,140,40,0)');
    this.sparks = [];
    for (let i = 0; i < 26; i++) {
      const mat = new T.SpriteMaterial({
        map: tex, transparent: true, opacity: 0,
        blending: T.AdditiveBlending, depthWrite: false,
      });
      const spr = new T.Sprite(mat);
      spr.visible = false;
      this.scene.add(spr);
      this.sparks.push({ sprite: spr, active: false, vel: new T.Vector3(), life: 0 });
    }
    this.sparkIdx = 0;
  }

  impactBurst(pos, n = 5) {
    for (let k = 0; k < n; k++) {
      const sp = this.sparks[this.sparkIdx];
      this.sparkIdx = (this.sparkIdx + 1) % this.sparks.length;
      sp.active = true;
      sp.life = rand(0.14, 0.3);
      sp.sprite.visible = true;
      sp.sprite.position.copy(pos);
      sp.sprite.scale.set(0.3, 0.3, 1);
      sp.sprite.material.opacity = 0.95;
      sp.vel.set(rand(-2.4, 2.4), rand(0.4, 3), rand(-2.4, 2.4));
    }
  }

  // ---- lightning -------------------------------------------------------
  forceLightning() {
    this.flashEnv = 1;
    this.nextBolt = rand(25, 45);
    // thunder trails the flash by a beat, like real distance
    if (this.onThunder) setTimeout(() => this.onThunder(), 350);
  }

  _stepFlash(dt) {
    this.nextBolt -= dt;
    if (this.nextBolt <= 0) this.forceLightning();
    this.flashEnv = Math.max(0, this.flashEnv - dt * 5.5);
    const flicker = this.flashEnv * (0.7 + 0.3 * Math.sin(performance.now() * 0.09));
    this.flashLight.intensity = flicker * 2.0;
    this.flashLight.position.set(this.anchor.x + 60, 130, this.anchor.z - 40);
  }

  // ---- per-frame update --------------------------------------------------
  update(dt, anchorPos) {
    this.anchor.copy(anchorPos);
    if (this.frozen) { this._stepFlash(dt); return; }

    // Rain: advance both vertices of every drop; recycle at ground level.
    const p = this.rainPos;
    for (let i = 0; i < this.rainCount; i++) {
      const o = i * 6;
      const vx = this.rainVel[i * 3], vy = this.rainVel[i * 3 + 1], vz = this.rainVel[i * 3 + 2];
      p[o] += vx * dt;     p[o + 1] += vy * dt;     p[o + 2] += vz * dt;
      p[o + 3] += vx * dt; p[o + 4] += vy * dt;     p[o + 5] += vz * dt;
      if (p[o + 1] < 0.1) this._respawnDrop(i);
    }
    this.rain.geometry.attributes.position.needsUpdate = true;

    // Splashes: keep a steady drizzle of new rings near the anchor.
    if (Math.random() < 0.75) {
      const sp = this.splashes[this.splashIdx];
      this.splashIdx = (this.splashIdx + 1) % this.splashes.length;
      sp.life = sp.max;
      sp.mesh.visible = true;
      sp.mesh.position.set(this.anchor.x + rand(-26, 26), 0.06, this.anchor.z + rand(-26, 26));
    }
    for (const sp of this.splashes) {
      if (sp.life <= 0) continue;
      sp.life -= dt;
      const t = 1 - sp.life / sp.max;         // 0 born -> 1 dead
      sp.mesh.scale.setScalar(0.4 + t * 1.5);
      sp.mesh.material.opacity = 0.4 * (1 - t);
      if (sp.life <= 0) sp.mesh.visible = false;
    }

    // Streaks: the head races to the target; the visible segment is the
    // last 2.4 m behind it. onHit fires exactly once, on arrival.
    for (const s of this.streaks) {
      if (!s.active) continue;
      s.age += dt;
      s.travelled += s.speed * dt;
      const head = Math.min(s.travelled, s.dist);
      const tail = Math.max(0, head - 2.4);
      const mid = (head + tail) / 2;
      const len = Math.max(0.05, head - tail);
      s.mesh.position.set(
        s.from.x + s.dir.x * mid,
        s.from.y + s.dir.y * mid,
        s.from.z + s.dir.z * mid
      );
      s.mesh.scale.set(1, 1, len);
      s.mesh.material.opacity = 0.95;
      if (s.travelled >= s.dist) {
        s.active = false; s.mesh.visible = false;
        if (s.onHit) s.onHit();
      }
      if (s.age > 2.5) { s.active = false; s.mesh.visible = false; } // safety sweep
    }

    // Casings: gravity, a floor rest pose, then fade out of the pool.
    for (const c of this.casings) {
      if (!c.active) continue;
      c.life -= dt;
      c.vel.y -= 12.5 * dt;
      c.mesh.position.addScaledVector(c.vel, dt);
      if (c.mesh.position.y < 0.05) {
        c.mesh.position.y = 0.05;
        c.vel.set(0, 0, 0); c.rot.set(0, 0, 0);
      }
      c.mesh.rotation.x += c.rot.x * dt;
      c.mesh.rotation.y += c.rot.y * dt;
      c.mesh.rotation.z += c.rot.z * dt;
      if (c.life <= 0) { c.active = false; c.mesh.visible = false; }
    }

    // Muzzle stars: 50 ms of full glare, gone.
    for (const st of this.stars) {
      if (st.life <= 0) continue;
      st.life -= dt;
      st.sprite.material.opacity = Math.max(0, st.life / 0.05);
      if (st.life <= 0) st.sprite.visible = false;
    }

    // Sparks: light gravity, opacity tied to remaining life.
    for (const sp of this.sparks) {
      if (!sp.active) continue;
      sp.life -= dt;
      sp.vel.y -= 6 * dt;
      sp.sprite.position.addScaledVector(sp.vel, dt);
      sp.sprite.material.opacity = Math.max(0, sp.life * 3);
      if (sp.life <= 0) { sp.active = false; sp.sprite.visible = false; }
    }

    this._stepFlash(dt);
  }
}

export { radialTexture };
