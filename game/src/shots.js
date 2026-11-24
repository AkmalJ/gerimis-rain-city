// GERIMIS — screenshot staging.
//
// Five composed cases (title, chase, duel, pasar, board), reachable only
// through ?stage=<case>. Plain play never enters this module's state and
// never exposes the debug global; staging exists so the contact-sheet
// frames are art-directed instead of whatever the game happened to show.

const T = window.THREE;
import { pick } from './config.js';
import { giveGun, gunMuzzleWorld } from './actors.js';

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
      } else {
        // Elevated south-east of the market, looking across the stalls
        // to the sign and the towers behind it (the rev1b original).
        api.setCam([214, 17, 112], [182, 3, 22]);
      }
    },

    // DUEL — a Pasar Kabut aisle gunfight. Hero west aiming east, three
    // Anak Kabut down the lane with staggered first shots, so the frame
    // can hold travelling streaks in both directions at once.
    duel() {
      api.seedStats(SHOWCASE);
      api.startJobAt(6); api.setStage(2); // GUDANG BASAH: "Ketahuan! Tembak jalan keluar"
      S.weaponIdx = 2; giveGun(player.mesh, 'smg');
      player.mesh.position.set(179, 0, 53);
      player.mesh.rotation.y = Math.PI / 2;
      player.aimBlend = 1;
      const firingLine = [[190, 50.5], [193, 55.5], [189, 59]];
      firingLine.forEach(([gx, gz], i) => {
        const gunman = api.pedEntity('gang', { gang: true, marker: true }, gx, gz, -Math.PI / 2);
        giveGun(gunman.mesh, pick(['smg', 'p9', 'smg']));
        gunman.hostile = true;
        gunman.fireCd = 0.3 + i * 0.22; // staggered: return fire overlaps the hero's burst
        api.gangs.push(gunman);
      });
      // Tight and low: hero large at the left, the firing line big enough
      // that both directions of streak read at thumbnail size.
      api.setCam([173.8, 1.7, 48.6], [192, 1.25, 54.8]);
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
