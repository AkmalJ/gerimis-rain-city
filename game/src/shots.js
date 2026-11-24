// GERIMIS — screenshot staging.
//
// Five composed cases (title, chase, duel, pasar, board), reachable only
// through ?stage=<case>. Plain play never enters this module's state and
// never exposes the debug global; staging exists so the contact-sheet
// frames are art-directed instead of whatever the game happened to show.

const T = window.THREE;
import { pick } from './config.js';
import { giveGun, gunMuzzleWorld, animatePed } from './actors.js';

// The showcase save every in-world case shares: a Damar who has clearly
// been busy — money in the bank, five jobs closed, most parcels found,
// two race times on the board. The ledger in the board frame and the
// Continue line on the title both read from numbers like these.
const SHOWCASE = { money: 21750, respect: 1890, jobsDone: 5, packages: [0, 1, 2, 4, 6, 8, 9], lifted: 7, raceBest: { turunan: 44.8, terminal: 41.2 } };
const CAPTURE_FOG = 0.0031; // a touch thinner than play fog: frames must read

export function installStaging(api) {
  const stageName = new URLSearchParams(location.search).get('stage');
  if (!stageName) return;
  const { S, scene, fx, player, heroCar } = api;
  window.__gerimisDebug = { api, S, case: stageName, streaksActive: () => fx.streaks.filter(s => s.active).length };

  // Title is special: the menu stays up, the vista just gets weather drama.
  if (stageName === 'title') {
    setTimeout(() => fx.forceLightning(), 700);
    setInterval(() => fx.forceLightning(), 2600);
    return;
  }

  api.hideTitle();
  scene.fog.density = CAPTURE_FOG;

  const cases = {

    // COVER — the chase, restaged for identity (rev1). The old framing
    // was a tower canyon that could have been any city: cruiser rear in
    // front, hero hidden, signs out of frame. The restage makes the
    // red GT the unobstructed centre subject with POLRESTA cruisers
    // flanking (never blocking), the AIR ONE spotlight cone striking
    // the street around it, an angkot crossing the junction at the
    // frame edge, umbrella peds on the sidewalks, and the live
    // dispatch panel — the Indonesian street read the old cover lacked.
    chase() {
      api.seedStats({ money: 21750, respect: 1890, jobsDone: 2, packages: [0, 1, 4, 6, 9], lifted: 7, raceBest: { turunan: 44.8 } });
      api.startJobAt(2); api.setStage(1); // PENUMPANG GELAP, the police-escape leg
      // Slow crawl (stills don't show speed; control beats drift).
      // NOTE on geometry: downtown tower placement is randomized per
      // load (fillBlocks uses rand), so no sightline is guaranteed —
      // the junction sign-wall framing only lands on lucky rolls and
      // ate cameras on three of them. The framing below is the one
      // that produced the installed cover: low behind the convoy in
      // the tower canyon, GT centre, cone descending through frame.
      heroCar.mesh.position.set(-1.5, 0, 15);
      heroCar.heading = Math.PI; heroCar.speed = 3;
      api.setPlayerCar(heroCar);
      const flankL = api.spawnCruiserAt(-7.5, 18.5, Math.PI);
      const flankR = api.spawnCruiserAt(4.5, 18.5, Math.PI);
      flankL.speed = 3; flankR.speed = 3;
      const angkot = api.carEntity('angkot', -16, -1, Math.PI / 2, 'traffic', 0xffc400); angkot.speed = 2.5; scene.add(angkot.mesh);
      const bajaj = api.carEntity('bajaj', 4.5, -22, Math.PI, 'traffic', 0xff9100); bajaj.speed = 3; scene.add(bajaj.mesh);
      // Umbrella peds on both sidewalks, frame edges: rain-gear crowd
      // as silhouettes with saturated umbrella discs.
      const umbrellaPalette = [0xd81b60, 0x00897b, 0xf9a825, 0xc62828];
      [[-10.4, 4, Math.PI / 2], [-10.4, -13, Math.PI / 2], [10.4, -5, -Math.PI / 2], [10.4, -19, -Math.PI / 2]].forEach(([px, pz, ph], i) => {
        const walker = api.pedEntity('civ', { umbrella: umbrellaPalette[i % umbrellaPalette.length] }, px, pz, ph);
        walker.mesh.userData.holdsUmbrella = true;
      });
      api.setWanted(4);
      S.quote = '"Platnya baru diganti. Cari Rintik GT merah, itu dia."';
      // Low and close behind the flank cruisers: the red GT rides the
      // centre, the AIR ONE cone shaft descends through the middle of
      // the frame onto the street around it, light pools on the wet
      // asphalt, the crossing angkot at the left edge.
      api.setCam([1.5, 2.7, 27], [-3.5, 6.5, -42]);
    },

    // VISTA — the cover family: the city itself is the subject. The
    // owner bounced the chase framing as clutter ("berantakan") and
    // asked for a calm, wide establishing frame where GERIMIS reads
    // as a whole open world — districts, landmarks, ambient traffic,
    // rain. No wanted, no roadblock, no cone; the GT is one life
    // detail among many. Probes over the downtown, station and jalur
    // overlooks settled on Pasar Kabut: the legible pink sign, the
    // awning grid, umbrella shoppers in the aisles, towers behind.
    //
    // REV1C — recomposition. Take 2's single elevated framing read
    // empty and disorganized (market small in a middle band, dead sky
    // above, dead junction below), so the case now carries three
    // designed framings, chosen with ?stage=vista&frame=a|b|c (no
    // frame = the rev1b original). Four probe rounds fed the picks:
    // every southern low shot fights the same physics — stall light
    // pools sit on the stalls' north faces and the lamp line at
    // x=180.4 spears aisle views — so each framing below is the
    // survivor of its family, not a first guess.
    //
    // REV1D — the owner's word on the cover: the vista idea is
    // right, but come DOWN to the street, make the stall order read
    // and put the sign where it cannot be missed. Frame d stands in
    // the market's west gap at 3.4 m, looking along the aisle axis:
    // the lamp line at x=180.4 marches down the view but passes just
    // east of the sign, the stall rows converge on both sides, and
    // the 21 m PASAR KABUT board closes the vista large enough to
    // read at thumbnail size. An angkot waits at the west mouth and
    // umbrella shoppers thread the aisle — life at the edges.
    //
    // REV1E — the owner's next word: frame d fixed the sign and the
    // closeness but shows ONE lane, not a city — its middle is a
    // dark empty street. "Harus nampilin isi kota, biar kelihatan
    // hidup dan kelihatan open world-nya": the cover must display
    // the CONTENTS of the city. Frame e pulls back up to a medium
    // three-quarter (~10.5 m) over the market's south junction and
    // fills EVERY depth layer: staged dense traffic on the foreground
    // streets, the market full of shoppers in the midground, the
    // sign closing the vista as the focal, towers and rain behind.
    //
    // REV1F — the owner changed the SUBJECT and the parent changed
    // the LIGHT, and this is the current default. Five market takes
    // all died on the same two facts: the market's slab grid reads
    // scattered from every angle, and the night palette is ~60%
    // black (black sky, black streets), so every frame felt empty
    // however it was composed. Frame f is a station postcard: the
    // FRONT of Stasiun Kota from its forecourt street — facade and
    // amber STASIUN KOTA sign as the landmark centre, the lit night
    // train nosing past the facade's west edge, angkot/bajaj/sedan
    // traffic on Jalan Stasiun, umbrella peds on the forecourt, the
    // red GT waiting at the front — all of it under a BLUE HOUR:
    // staging lifts the sky to a deep rainy blue with a lighter fog
    // horizon and raises the ambient/hemisphere base so facades,
    // vehicles and asphalt read WITH COLOUR while the neon pops
    // against the blue instead of drowning in black.
    //
    // REV1G — the owner approved f's postcard ("nah bagus") with
    // two notes: it is still not PADAT — add the big buildings so
    // it reads as a real city — and the station reads as just a
    // wall. Frame g (the default now) keeps f's subject, light and
    // composition family and answers both notes with staging-only
    // dressing: a packed backdrop skyline in the game's own tower
    // recipe behind and around the station, real architecture on
    // the facade (cornice, canopy, pilasters, entrance portal,
    // lamp posts, apron edge), and a fuller forecourt with a bus
    // and angkot drop-off queue.
    vista() {
      api.seedStats(SHOWCASE);
      api.startJobAt(5); // JOB 6 sits on offer — the panel reads calm
      S.jobState = 'offer';
      scene.fog.density = 0.0026; // thinner than capture norm: layers must read
      // Damar in the market aisle, umbrella shoppers threaded around.
      player.mesh.position.set(196, 0, 52);
      player.mesh.rotation.y = Math.PI;
      const umbrellaPalette = [0xd81b60, 0x00897b, 0xf9a825, 0x3949ab, 0xc62828, 0x2e7d32];
      [[186, 34], [201, 38], [216, 33], [188, 51], [203, 55], [218, 50], [193, 66], [210, 68]].forEach(([px, pz], i) => {
        const shopper = api.pedEntity('civ', { umbrella: umbrellaPalette[i % umbrellaPalette.length] }, px, pz, Math.PI + (i % 2 ? 0.4 : -0.3));
        shopper.mesh.userData.holdsUmbrella = true;
      });
      // Ambient traffic on the frame streets — movement, not a chase.
      heroCar.mesh.position.set(189.5, 0, -38);
      heroCar.mesh.rotation.y = 0;
      api.carEntity('angkot', 148, 1.5, Math.PI / 2, 'traffic', 0xffc400);
      api.carEntity('bajaj', 191.5, 92, Math.PI, 'traffic', 0xff9100);
      api.carEntity('sedan', 232, -1.5, -Math.PI / 2, 'traffic', 0x90a4ae);

      const frame = new URLSearchParams(location.search).get('frame');
      if (frame === 'a') {
        // A — low three-quarter from the x=190 street: the road and a
        // bajaj waiting at the market mouth lead the eye in, the stall
        // rows spread left and right, the sign closes the vista.
        api.carEntity('bajaj', 192.5, 69, Math.PI, 'traffic', 0xff9100);
        const crosser = api.pedEntity('civ', { umbrella: 0xc62828 }, 186, 74, -Math.PI / 2);
        crosser.mesh.userData.holdsUmbrella = true;
        api.setCam([195, 3.0, 81], [180, 5.4, 19]);
      } else if (frame === 'b') {
        // B — medium height from the south-east: the market fills two
        // thirds of the frame in ordered rows, the sign rides large
        // above it, and the GT waits on the wet street in the near
        // foreground with its headlights pooling on the asphalt.
        heroCar.mesh.position.set(206, 0, 74);
        heroCar.mesh.rotation.y = -0.3;
        api.carEntity('bajaj', 192.5, 69, Math.PI, 'traffic', 0xff9100);
        api.carEntity('angkot', 198, 93.5, -Math.PI / 2, 'traffic', 0xffc400);
        api.setCam([214, 8.5, 92], [182, 3, 24]);
      } else if (frame === 'c') {
        // C — diagonal elevated from the south-west: the market runs
        // corner to corner, the GT idles on the south street, towers
        // stand behind the sign.
        heroCar.mesh.position.set(189.5, 0, 71);
        api.setCam([152, 9.5, 94], [197, 3, 33]);
      } else if (frame === 'b2') {
        // The rev1b original, kept for reference: elevated south-east
        // of the market, looking across the stalls to the sign and
        // the towers behind it.
        api.setCam([214, 17, 112], [182, 3, 22]);
      } else if (frame === 'd') {
        // D — street level in the west gap, rev1d. The
        // angkot waits at the market's west mouth with its front to
        // the street; three more shoppers thread the aisle so the
        // mid-distance carries life between the converging rows.
        api.carEntity('angkot', 169.5, 53, 0, 'traffic', 0xffc400);
        const aisleDress = [
          [0xd81b60, 173, 47, Math.PI],
          [0xf9a825, 186, 36, Math.PI + 0.3],
          [0x00897b, 183, 44, Math.PI - 0.2],
        ];
        aisleDress.forEach(([c, px, pz, ph]) => {
          const shopper = api.pedEntity('civ', { umbrella: c }, px, pz, ph);
          shopper.mesh.userData.holdsUmbrella = true;
        });
        api.setCam([176.5, 3.4, 64], [180, 5.3, 19]);
      } else if (frame === 'e') {
        // E — the full-city cover, rev1e. Medium
        // three-quarter over the market's south junction, every
        // depth layer filled: a staged rush on the foreground
        // streets (angkot, truk sayur, sedan, bajaj around the GT),
        // eight extra shoppers crowding the aisles and the south
        // edge on top of the base crowd, the PASAR KABUT sign
        // closing the vista as the focal, towers and rain behind.
        heroCar.mesh.position.set(206, 0, 74);
        heroCar.mesh.rotation.y = -0.3;
        const rush = [
          ['angkot', 193, 72, Math.PI / 2, 0xffc400],
          ['bajaj', 198, 68, Math.PI / 2, 0xff9100],
          ['sedan', 214, 68, Math.PI / 2, 0x90a4ae],
          ['truk', 225, 2, -Math.PI / 2, 0x66bb6a],
          ['hatch', 172, 48, Math.PI / 2, 0x7e57c2],
        ];
        rush.forEach(([kind, vx, vz, vh, vc]) => {
          const v = api.carEntity(kind, vx, vz, vh, 'traffic', vc);
          v.speed = 0; // staged stills: the rush holds its marks
        });
        const crowdE = [
          [176, 40], [180, 57], [173, 63], [224, 42],
          [228, 58], [183, 67], [210, 66], [217, 60],
          [190, 64], [205, 58], [215, 70], [199, 44],
          [193, 50], [221, 50], [186, 76],
          [202, 47], [176, 52],
        ];
        crowdE.forEach(([px, pz], i) => {
          const shopper = api.pedEntity('civ', { umbrella: umbrellaPalette[i % umbrellaPalette.length] }, px, pz, Math.PI + (i % 2 ? 0.35 : -0.3));
          shopper.mesh.userData.holdsUmbrella = true;
        });
        api.setCam([208, 10, 90], [186, 2.5, 26]);
      } else if (frame === 'f') {
        // F — the station postcard at blue hour, rev1f.
        // BLUE HOUR first: repaint the sky a deep rainy blue, lift
        // the fog to a lighter steel blue (distance melts into a
        // horizon glow instead of black), and raise the ambient /
        // hemisphere / moon base so every Phong surface reads with
        // colour. Staging-only: plain play never runs this branch.
        scene.background = new T.Color(0x1e3a63);
        scene.fog.color.set(0x39598c);
        scene.fog.density = 0.0021;
        scene.traverse(o => {
          if (o.isAmbientLight) { o.color.set(0x5f7fb4); o.intensity = 1.15; }
          else if (o.isHemisphereLight) { o.color.set(0x51749f); o.groundColor.set(0x141c2a); o.intensity = 0.9; }
          else if (o.isDirectionalLight) { o.color.set(0xa8c8f0); o.intensity = 0.75; }
        });
        // The station's own billboard was hung facing the platform:
        // from the street its texture reads mirrored. Staging hangs
        // a twin over it, street-facing, drawn with the same canvas
        // recipe (amber 900-weight title, pale sub-line, hot core) —
        // plain play keeps the original board untouched.
        const signCv = document.createElement('canvas'); signCv.width = 1024; signCv.height = 256;
        const sctx = signCv.getContext('2d');
        sctx.fillStyle = '#171003'; sctx.fillRect(0, 0, 1024, 256);
        sctx.textAlign = 'center'; sctx.textBaseline = 'middle';
        sctx.shadowColor = '#ffb347'; sctx.shadowBlur = 42;
        sctx.fillStyle = '#ffb347';
        sctx.font = '900 118px Arial, sans-serif';
        sctx.fillText('STASIUN KOTA', 512, 104);
        sctx.shadowBlur = 18; sctx.fillText('STASIUN KOTA', 512, 104);
        sctx.font = '700 54px Arial, sans-serif';
        sctx.fillStyle = '#eaf6ff'; sctx.shadowBlur = 10;
        sctx.fillText('KERETA MALAM • LOKET 24 JAM', 512, 200);
        const signTwin = new T.Mesh(
          new T.PlaneGeometry(20, 5),
          new T.MeshBasicMaterial({ map: new T.CanvasTexture(signCv), side: T.DoubleSide })
        );
        signTwin.position.set(45, 15.4, 227.15);
        signTwin.rotation.y = Math.PI;
        scene.add(signTwin);
        // Damar on the forecourt, back to the street, facing his
        // station; the GT waits at the front doors as a life detail.
        player.mesh.position.set(40, 0, 206);
        player.mesh.rotation.y = 0;
        heroCar.mesh.position.set(59, 0, 210);
        heroCar.mesh.rotation.y = -0.35;
        // Forecourt life: a drop-off angkot nosed toward the doors,
        // a bajaj waiting by the arches, umbrella peds crossing the
        // apron between the light pools.
        const dropOff = api.carEntity('angkot', 24, 211, 0, 'traffic', 0xffc400); dropOff.speed = 0;
        const waitBajaj = api.carEntity('bajaj', 36, 215, Math.PI, 'traffic', 0xff9100); waitBajaj.speed = 0;
        [[18, 206], [29, 217], [47, 218], [52, 204], [66, 215], [71, 205], [12, 200], [80, 201]].forEach(([px, pz], i) => {
          const walker = api.pedEntity('civ', { umbrella: umbrellaPalette[i % umbrellaPalette.length] }, px, pz, (i % 2 ? -0.4 : 0.35));
          walker.mesh.userData.holdsUmbrella = true;
        });
        // Jalan Stasiun traffic (the z=190 road): an eastbound
        // angkot and a westbound sedan, headlights pooling on the
        // wet asphalt in the near foreground.
        const roadA = api.carEntity('angkot', 82, 193.5, Math.PI / 2, 'traffic', 0xffc400); roadA.speed = 0;
        const roadS = api.carEntity('sedan', -6, 186.5, -Math.PI / 2, 'traffic', 0x90a4ae); roadS.speed = 0;
        // Near-frontal from over the forecourt street, the probe
        // winner: the facade and its six amber arches fill the
        // centre with the (twin) sign riding above them, towers at
        // both frame edges, traffic and umbrella peds filling the
        // foreground apron and the road below.
        api.setCam([6, 9, 174], [46, 8, 233]);
      } else {
        // G (default) — the station postcard, densified, rev1g.
        // Same blue hour as f (sky, fog, light bases repainted
        // identically), same street-facing sign twin, same
        // composition family — plus the skyline, the facade
        // architecture and the forecourt density the owner asked
        // for. Everything below is staging-only dressing.
        scene.background = new T.Color(0x1e3a63);
        scene.fog.color.set(0x39598c);
        scene.fog.density = 0.0021;
        scene.traverse(o => {
          if (o.isAmbientLight) { o.color.set(0x5f7fb4); o.intensity = 1.15; }
          else if (o.isHemisphereLight) { o.color.set(0x51749f); o.groundColor.set(0x141c2a); o.intensity = 0.9; }
          else if (o.isDirectionalLight) { o.color.set(0xa8c8f0); o.intensity = 0.75; }
        });
        // No sign twin in this frame anymore: the game now carries
        // its own street-facing STASIUN KOTA board on the facade
        // band (b2263e1). The old roofline twin only duplicated it —
        // clipped by the parapet, masking the real sign.
        // Backdrop skyline in the game's own tower recipe (canvas
        // window grid, emissive map, downtown facade tones): a
        // packed wall of towers behind the station and flanking
        // it, so the postcard sits inside a big city. The real
        // downtown towers are all south of the station (behind
        // this camera), which is why f's skyline read thin.
        const towerTex = base => {
          const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256;
          const ctx = cv.getContext('2d');
          ctx.fillStyle = base; ctx.fillRect(0, 0, 128, 256);
          const lit = ['#ffd98a', '#ffe9b0', '#a8e6ff', '#ffc4dd'];
          for (let row = 0; row < 12; row++) {
            for (let col = 0; col < 5; col++) {
              ctx.fillStyle = Math.random() < 0.55 ? lit[(Math.random() * lit.length) | 0] : '#131a24';
              ctx.fillRect(10 + col * 24, 12 + row * 20, 15, 11);
            }
          }
          return new T.CanvasTexture(cv);
        };
        const backdrop = (x, z, w, h, d, base) => {
          const tex = towerTex(base);
          const m = new T.Mesh(
            new T.BoxGeometry(w, h, d),
            new T.MeshPhongMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55, shininess: 24 })
          );
          m.position.set(x, h / 2, z);
          scene.add(m);
        };
        const facadeTones = ['#232d3d', '#1f2735', '#28303f', '#202833'];
        backdrop(-52, 258, 18, 28, 18, facadeTones[0]);  // west flank-back
        backdrop(-18, 274, 22, 36, 20, facadeTones[1]);  // behind, west of centre
        backdrop(22, 284, 24, 46, 22, facadeTones[2]);   // behind centre — tallest
        backdrop(58, 278, 20, 31, 20, facadeTones[3]);   // behind, east of centre
        backdrop(96, 286, 24, 41, 22, facadeTones[0]);   // behind, east
        backdrop(132, 270, 20, 27, 18, facadeTones[1]);  // east flank-back
        backdrop(-28, 244, 16, 24, 16, facadeTones[2]);  // west near flank
        backdrop(118, 247, 16, 23, 16, facadeTones[3]);  // east near flank
        backdrop(-64, 226, 18, 30, 18, facadeTones[1]);  // far-west edge, station latitude
        backdrop(152, 224, 18, 33, 18, facadeTones[2]);  // far-east edge, station latitude
        // Facade architecture. The game's station front is one
        // flat 66×13 box with six glowing rectangles; staging
        // gives it a cornice and lit frieze along the roofline, a
        // canopy over the arches on slim columns with a warm glow
        // underneath, pilasters between the window bays, a framed
        // entrance portal around the centre arch pair, a raised
        // apron edge and lamp posts — depth enough to read as a
        // station building, not a wall.
        const stone = new T.MeshPhongMaterial({ color: 0x39485c, shininess: 40, specular: 0x66788f });
        const stoneDark = new T.MeshPhongMaterial({ color: 0x232d3b, shininess: 30 });
        const cornice = new T.Mesh(new T.BoxGeometry(68, 1.3, 9.6), stone);
        cornice.position.set(45, 13.4, 232); scene.add(cornice);
        const frieze = new T.Mesh(new T.BoxGeometry(68, 0.35, 9.7), new T.MeshBasicMaterial({ color: 0xffb347 }));
        frieze.position.set(45, 12.6, 232); scene.add(frieze);
        // No staging canopy either: from this low camera its slab
        // crossed the game's facade sign and hid the sub-line. The
        // game's own entrance canopy carries the depth now.
        for (const px of [16, 30, 60, 74]) {
          const col = new T.Mesh(new T.CylinderGeometry(0.14, 0.14, 9, 6), stoneDark);
          col.position.set(px, 4.5, 223.4); scene.add(col);
        }
        for (const px of [12.8, 23.5, 34.5, 56.5, 67.5, 77.2]) {
          const pil = new T.Mesh(new T.BoxGeometry(1.5, 13, 1.4), stone);
          pil.position.set(px, 6.5, 227.5); scene.add(pil);
        }
        for (const px of [37.8, 53.2]) {
          const pcol = new T.Mesh(new T.BoxGeometry(1.9, 11, 2.1), stone);
          pcol.position.set(px, 5.5, 227.2); scene.add(pcol);
        }
        // No portal lintel: it stood exactly over the game's own
        // facade-band STASIUN KOTA sign (y 10.35) and hid its title
        // from this camera. The portal columns alone frame the door.
        const apron = new T.Mesh(new T.BoxGeometry(66, 0.35, 3), new T.MeshPhongMaterial({ color: 0x39424e, shininess: 50, specular: 0x77879f }));
        apron.position.set(45, 0.18, 221.5); scene.add(apron);
        const apronLine = new T.Mesh(new T.BoxGeometry(66, 0.1, 0.4), new T.MeshBasicMaterial({ color: 0xffb347 }));
        apronLine.position.set(45, 0.4, 220.1); scene.add(apronLine);
        const lampAt = (x, z) => {
          const pole = new T.Mesh(new T.CylinderGeometry(0.09, 0.12, 4.6, 6), stoneDark);
          pole.position.set(x, 2.3, z); scene.add(pole);
          const head = new T.Mesh(new T.SphereGeometry(0.34, 10, 8), new T.MeshBasicMaterial({ color: 0xcfe4ff }));
          head.position.set(x, 4.8, z); scene.add(head);
          const pool = new T.Mesh(new T.CircleGeometry(3, 16), new T.MeshBasicMaterial({ color: 0x8fb6e8, transparent: true, opacity: 0.16 }));
          pool.rotation.x = -Math.PI / 2; pool.position.set(x, 0.06, z); scene.add(pool);
        };
        [[16, 216], [34, 214.5], [56, 214.5], [74, 216]].forEach(([x, z]) => lampAt(x, z));
        // Damar on the forecourt facing his station; the GT
        // waits east of the entrance as a life detail.
        player.mesh.position.set(40, 0, 206);
        player.mesh.rotation.y = 0;
        heroCar.mesh.position.set(66, 0, 209);
        heroCar.mesh.rotation.y = -0.35;
        // Drop-off queue along the apron: a BUS MALAM loading at
        // the doors, two angkot queued behind it, a bajaj waiting
        // by the arches, a sedan parked at the east end.
        const busQ = api.carEntity('bus', 22, 213.5, Math.PI / 2, 'traffic', 0x4fc3f7); busQ.speed = 0;
        const qA1 = api.carEntity('angkot', 39, 213.5, Math.PI / 2, 'traffic', 0xffc400); qA1.speed = 0;
        const qA2 = api.carEntity('angkot', 52, 213.5, Math.PI / 2, 'traffic', 0xffc400); qA2.speed = 0;
        const waitBajaj = api.carEntity('bajaj', 33, 217.5, Math.PI, 'traffic', 0xff9100); waitBajaj.speed = 0;
        const parkSedan = api.carEntity('sedan', 76, 216.5, -0.15, 'traffic', 0x90a4ae); parkSedan.speed = 0;
        // Jalan Stasiun traffic in the near foreground: two
        // eastbound, two westbound, headlights on the wet asphalt.
        const roadA = api.carEntity('angkot', 82, 193.5, Math.PI / 2, 'traffic', 0xffc400); roadA.speed = 0;
        const roadH = api.carEntity('hatch', 28, 193.5, Math.PI / 2, 'traffic', 0x7e57c2); roadH.speed = 0;
        const roadS = api.carEntity('sedan', -6, 186.5, -Math.PI / 2, 'traffic', 0x90a4ae); roadS.speed = 0;
        const roadB = api.carEntity('bajaj', -26, 186.5, -Math.PI / 2, 'traffic', 0xff9100); roadB.speed = 0;
        // Umbrella peds crossing the apron — a real crowd this
        // time, three of them near the camera so the life reads
        // at full size, the rest threading between the queue and
        // the entrance.
        [[24, 197, 0.3], [52, 198, -0.4], [68, 196.5, 0.2],
         [14, 204, 0.35], [21, 209, -0.3], [30, 202, 0.4], [36, 218.5, -0.35],
         [44, 205, 0.3], [49, 219, 0.4], [58, 203, -0.4], [63, 218, 0.35],
         [70, 207, -0.3], [77, 202, 0.4], [82, 210, -0.35]].forEach(([px, pz, ph], i) => {
          const walker = api.pedEntity('civ', { umbrella: umbrellaPalette[i % umbrellaPalette.length] }, px, pz, ph);
          walker.mesh.userData.holdsUmbrella = true;
        });
        // Slightly lower and closer than f, aimed up the stack:
        // forecourt at the bottom, dressed facade in the middle,
        // the packed skyline rising behind it, sky only as a top
        // band.
        api.setCam([12, 6.8, 183], [47, 10, 235]);
      }
    },

    // DUEL — a Pasar Kabut aisle gunfight (rev9 restage). The old frame
    // stood WEST of the market on the empty apron: Damar clipped at the
    // frame edge, three gunmen small against bare asphalt. Now the duel
    // plays INSIDE the market's middle aisle (stall rows at z 44 and
    // z 61): Damar at the aisle mouth aiming east, SIX Anak Kabut spread
    // down the lane inside their 40 m firing range, staggered first
    // shots so the frame can hold travelling streaks in both directions
    // at once, stall awnings and goods flanking both sides.
    duel() {
      api.seedStats(SHOWCASE);
      api.startJobAt(6); api.setStage(2); // GUDANG BASAH: "Ketahuan! Tembak jalan keluar"
      S.weaponIdx = 2; giveGun(player.mesh, 'smg');
      player.mesh.position.set(205, 0, 52.5);
      player.mesh.rotation.y = Math.PI / 2;
      player.aimBlend = 1;
      const firingLine = [[215, 49.5], [219, 55.5], [226, 50], [231, 55], [236, 51], [240, 54.5]];
      const gunmen = [];
      firingLine.forEach(([gx, gz], i) => {
        const gunman = api.pedEntity('gang', { gang: true, marker: true }, gx, gz, -Math.PI / 2);
        giveGun(gunman.mesh, pick(['smg', 'p9', 'smg']));
        gunman.hostile = true;
        gunman.fireCd = 0.3 + i * 0.22; // staggered: return fire overlaps the hero's burst
        api.gangs.push(gunman);
        gunmen.push(gunman);
      });
      // REV10 floor dressing — the rev9 frame's aisle floor read as
      // bare dark asphalt ("masih kosong"). Wet-market floor life,
      // spread foreground → far so the lane reads dressed at dossier
      // size: puddles with neon reflection streaks and ripple rings,
      // a worn painted guide line, crates and sacks at the stall
      // fronts, woven mat runners, paper scraps, one tipped basket.
      // Pure staging meshes — no entities, no colliders, plain play
      // never sees them.
      {
        const flat = (geo, mat, x, z, ry = 0, y = 0.02) => {
          const m = new T.Mesh(geo, mat);
          m.rotation.x = -Math.PI / 2; m.rotation.z = ry;
          m.position.set(x, y, z); scene.add(m); return m;
        };
        const puddleMat = new T.MeshBasicMaterial({ color: 0x14273d, transparent: true, opacity: 0.82 });
        const rippleMat = new T.MeshBasicMaterial({ color: 0xbfd9e8, transparent: true, opacity: 0.16, side: T.DoubleSide });
        const puddles = [[209, 51.0, 2.4, 0x18c8b8], [217.5, 54.8, 1.7, 0xffb347], [224, 50.6, 2.7, 0xff4fa3], [233, 53.6, 1.9, 0x18c8b8], [241, 51.8, 2.2, 0xffb347]];
        for (const [px, pz, r, tint] of puddles) {
          flat(new T.CircleGeometry(r, 22), puddleMat, px, pz, 0, 0.015);
          // neon reflection: a broken bright streak stretched on the water
          const streakMat = new T.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.30, blending: T.AdditiveBlending });
          flat(new T.PlaneGeometry(0.34, r * 1.5), streakMat, px + 0.3, pz - 0.2, 0.12, 0.03);
          flat(new T.RingGeometry(r * 0.30, r * 0.34, 22), rippleMat, px - r * 0.3, pz + r * 0.25, 0, 0.032);
          flat(new T.RingGeometry(r * 0.55, r * 0.58, 22), rippleMat, px + r * 0.2, pz - r * 0.3, 0, 0.032);
        }
        // worn painted guide line down the lane, in dashed segments
        const paintMat = new T.MeshBasicMaterial({ color: 0xd8b93a, transparent: true, opacity: 0.30 });
        for (let i = 0; i < 6; i++) flat(new T.PlaneGeometry(2.6, 0.26), paintMat, 210 + i * 6.2, 52.6, 0, 0.018);
        // mat runners in front of two stalls
        flat(new T.PlaneGeometry(3.0, 1.5), new T.MeshBasicMaterial({ color: 0x7a2436, transparent: true, opacity: 0.9 }), 214, 46.9, 0.06, 0.022);
        flat(new T.PlaneGeometry(3.0, 1.5), new T.MeshBasicMaterial({ color: 0x1f5f57, transparent: true, opacity: 0.9 }), 228, 58.3, -0.05, 0.022);
        // crates + sacks at the stall fronts, both sides of the lane
        const crateMat = new T.MeshStandardMaterial({ color: 0x7a5a38, roughness: 0.9 });
        const crateMat2 = new T.MeshStandardMaterial({ color: 0x5d4630, roughness: 0.9 });
        const sackMat = new T.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 1 });
        const box = (mat, s, x, y, z, ry) => {
          const m = new T.Mesh(new T.BoxGeometry(s, s, s), mat);
          m.position.set(x, y, z); m.rotation.y = ry; scene.add(m);
        };
        box(crateMat, 0.72, 211.5, 0.36, 58.6, 0.3); box(crateMat2, 0.6, 211.6, 0.96, 58.5, 0.8);
        box(crateMat2, 0.68, 221, 0.34, 46.6, 0.15); box(crateMat, 0.72, 230.5, 0.36, 58.8, 0.5);
        box(crateMat, 0.64, 238, 0.32, 46.8, 0.2);
        const sack = (x, z, s) => {
          const m = new T.Mesh(new T.SphereGeometry(0.55, 10, 8), sackMat);
          m.scale.set(s, s * 0.62, s); m.position.set(x, 0.32 * s, z); scene.add(m);
        };
        sack(218.5, 58.9, 1); sack(219.3, 59.2, 0.8); sack(235.5, 46.5, 0.95);
        // paper scraps scattered down the lane
        const paperMat = new T.MeshBasicMaterial({ color: 0xb9c4cc, transparent: true, opacity: 0.75, side: T.DoubleSide });
        [[207, 54.5, 0.4], [213, 50.8, 1.2], [220, 53.4, 2.1], [227, 51.5, 0.9], [232, 55.0, 1.7], [238, 52.2, 2.8], [243, 54.0, 0.2]].forEach(([px, pz, ry]) => {
          flat(new T.PlaneGeometry(0.34, 0.44), paperMat, px, pz, ry, 0.025);
        });
        // one tipped basket spilling by the near stall
        const basket = new T.Mesh(new T.CylinderGeometry(0.34, 0.26, 0.5, 10, 1, true), new T.MeshStandardMaterial({ color: 0xc96a2c, roughness: 0.95, side: T.DoubleSide }));
        basket.position.set(212.8, 0.27, 47.3); basket.rotation.z = Math.PI / 2.2; basket.rotation.y = 0.6; scene.add(basket);
      }
      // REV10 ally — Sari fights beside Damar ("tambahin temen kita
      // 1"). Her magenta shirt (her real crew colours from main.js)
      // reads unmistakably friendly against the gang's dark kit, and
      // she stands on the camera side of Damar, large in the left
      // foreground, gun up and aimed down the same lane.
      const ally = api.pedEntity('crew', { shirt: 0xc2185b, pants: 0x23272e }, 206.2, 55.0, Math.PI / 2);
      giveGun(ally.mesh, 'smg');
      ally.aimBlend = 1;
      // No loop animates a staging-spawned crew ped, so lock the aim
      // pose onto her arms directly — gun up at shoulder height, or
      // her muzzle (and its star) sits at her thigh.
      animatePed(ally.mesh, 0, 0.016, 1);
      // The capture script calls this beside duelVolley() so her
      // burst leaves in the same instant as Damar's: muzzle star +
      // a streak of her own at the nearest gunman.
      window.__gerimisDebug.allyVolley = () => {
        animatePed(ally.mesh, 0, 0.016, 1); // re-lock the aim pose at the instant of fire
        const muzzle = gunMuzzleWorld(ally.mesh);
        if (!muzzle) return;
        let target = null, best = 1e9;
        for (const g of gunmen) {
          if (!g.alive) continue;
          const d = ally.mesh.position.distanceTo(g.mesh.position);
          if (d < best) { best = d; target = g; }
        }
        if (!target) return;
        const chest = target.mesh.position.clone(); chest.y += 1.15;
        const from = muzzle.clone();
        const dir = chest.clone().sub(from).normalize();
        fx.muzzleStar(from.clone(), 1.0);
        fx.fireStreak(from, dir, from.distanceTo(chest), 125, () => fx.impactBurst(chest, 5));
      };
      // Over Damar's right shoulder from the aisle's south side, low:
      // looking east, screen-right runs along +z, so the camera sits at
      // the higher z to hold the hero large and whole at the LEFT while
      // the aisle runs diagonally east past him; the firing line stays
      // big enough that both directions of streak read at dossier size,
      // and the stage beam at the gudang falls outside the frame.
      api.setCam([198.6, 1.8, 57.6], [228, 1.1, 51.6]);
    },

    // PASAR — the wet market at full density: hero mid-aisle, a crowd of
    // umbrella shoppers threaded between the stalls.
    pasar() {
      api.seedStats(SHOWCASE);
      api.startJobAt(1); api.setStage(3);
      player.mesh.position.set(186, 0, 40);
      player.mesh.rotation.y = Math.PI * 0.8;
      const umbrellaPalette = [0xd81b60, 0x00897b, 0xf9a825, 0x3949ab, 0xc62828];
      for (let i = 0; i < 7; i++) {
        const shopper = api.pedEntity('civ', { umbrella: umbrellaPalette[i % umbrellaPalette.length] }, 178 + i * 7.5, 36 + (i % 3) * 8, Math.PI + (i % 2 ? 0.4 : -0.3));
        shopper.mesh.userData.holdsUmbrella = true;
      }
      // From the aisle mouth, diagonal down the market: stalls, awnings,
      // umbrella crowd and the lit towers behind them.
      api.setCam([170, 2.2, 33], [208, 1.2, 52]);
    },

    // BOARD — the PETA KOTA poster over a live world: Damar stands in
    // Pusat Gerimis while TAB raises the board with the showcase ledger.
    board() {
      api.seedStats(SHOWCASE);
      api.startJobAt(5); // JOB 6 context, matching the ledger's era
      S.jobState = 'offer';
      player.mesh.position.set(10, 0, 150);
      player.mesh.rotation.y = Math.PI;
      setTimeout(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' })), 350);
    },
  };

  if (cases[stageName]) cases[stageName]();
}
