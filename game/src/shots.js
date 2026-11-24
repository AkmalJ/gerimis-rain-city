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

    // COVER — the chase. Hero coupe northbound on Jalan Neon Raya, two
    // cruisers offset on its tail so all three cars read, an angkot and a
    // bajaj ahead for depth, wanted 4 so AIR ONE's spotlight joins live.
    chase() {
      api.seedStats({ money: 21750, respect: 1890, jobsDone: 2, packages: [0, 1, 4, 6, 9], lifted: 7, raceBest: { turunan: 44.8 } });
      api.startJobAt(2); api.setStage(1); // PENUMPANG GELAP, the police-escape leg
      // The convoy sits in the south stretch of Jalan Neon Raya: hero
      // ahead, both staged cruisers on its tail (behind = +z, since the
      // run heads north), traffic further up the road for depth.
      heroCar.mesh.position.set(3.5, 0, -20);
      heroCar.heading = Math.PI; heroCar.speed = 15;
      api.setPlayerCar(heroCar);
      const tail1 = api.spawnCruiserAt(-2.6, -8, Math.PI);
      const tail2 = api.spawnCruiserAt(6.4, -5, Math.PI);
      tail1.speed = 14; tail2.speed = 14;
      const angkot = api.carEntity('angkot', -4.5, -68, Math.PI, 'traffic', 0xffc400); angkot.speed = 8; scene.add(angkot.mesh);
      const bajaj = api.carEntity('bajaj', 5.5, -52, Math.PI, 'traffic', 0xff9100); bajaj.speed = 7; scene.add(bajaj.mesh);
      api.setWanted(4);
      S.quote = '"Platnya baru diganti. Cari Rintik GT merah, itu dia."';
      // Behind the cruisers, low: the tail cars flank the frame edges,
      // the red coupe rides centre, signs and the AIR ONE cone above.
      api.setCam([9.8, 2.6, -0.5], [1.0, 2.2, -38]);
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
