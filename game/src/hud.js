// GERIMIS — HUD: every readout that is not the 3D world.
// DOM panels for mission / dispatch / district / vitals / weapons / crew,
// a canvas minimap, and drawBoard(): the PETA KOTA GERIMIS poster.

import { DISTRICTS, RANKS, WEAPONS, CREW, rankFor, fmtRp, fmtClock, clamp } from './config.js';
import { RACES } from './activities.js';

const node = id => document.getElementById(id);
const pct = (value, max) => clamp(value / max * 100, 0, 100) + '%';

export class HUD {
  constructor() {
    this.nodes = {
      mission: node('missionPanel'), mKicker: node('mKicker'), mStage: node('mStage'), mTitle: node('mTitle'),
      mObj: node('mObj'), mNext: node('mNext'), mSegs: node('mSegs'),
      dispatch: node('dispatchPanel'), dHead: node('dHead'), dUnits: node('dUnits'), dQuote: node('dQuote'),
      district: node('districtCard'), dName: node('dName'), dSub: node('dSub'), dTurf: node('dTurf'), turfFill: node('turfFill'),
      clock: node('clock'), money: node('money'), stars: node('stars'),
      rankName: node('rankName'), rankRp: node('rankRp'), rankFill: node('rankFill'),
      actRaces: node('actRaces'), actPkgs: node('actPkgs'),
      healthFill: node('healthFill'), armourFill: node('armourFill'), healthNum: node('healthNum'), armourNum: node('armourNum'),
      dlg: node('dlgBox'), dlgName: node('dlgName'), dlgText: node('dlgText'), dlgAvatar: node('dlgAvatar'),
      speedo: node('speedo'), kmh: node('kmh'), vehName: node('vehName'), condFill: node('condFill'),
      toast: node('toast'), banner: node('banner'), bannerTitle: node('bannerTitle'), bannerSub: node('bannerSub'),
      minimap: node('minimap'), boardCanvas: node('boardCanvas'),
    };
    this.mapCtx = this.nodes.minimap.getContext('2d');
    this.shown = {}; // last painted string per slot: the DOM is only touched on change

    // Weapon slots and crew cards are built from the data tables, so the
    // HUD can never disagree with config about names, keys or order.
    this.weaponSlots = WEAPONS.map((w, i) => {
      const slot = document.createElement('div');
      slot.className = 'wslot';
      slot.innerHTML = `<span class="wkey">${i + 1}</span><span class="wname">${w.name}</span>`;
      node('weaponSlots').appendChild(slot);
      return slot;
    });
    this.crewCards = CREW.map(c => {
      const card = document.createElement('div');
      card.className = 'crewcard';
      card.innerHTML = `<span class="ckey">${c.key}</span><div class="cinfo"><b>${c.ability}</b><i>${c.name} • ${c.role}</i></div><span class="cstate">SIAP</span>`;
      node('crewCards').appendChild(card);
      return card;
    });

    this.toastLeft = 0;
    this.bannerLeft = 0;
  }

  // Write text only when it actually changed — update() runs every frame.
  paint(slot, el, text) {
    if (this.shown[slot] === text) return;
    this.shown[slot] = text;
    el.textContent = text;
  }

  showToast(text, ms = 2600) {
    this.nodes.toast.textContent = text;
    this.nodes.toast.style.opacity = 1;
    this.toastLeft = ms / 1000;
  }

  showBanner(title, sub, ms = 3400) {
    this.nodes.bannerTitle.textContent = title;
    this.nodes.bannerSub.textContent = sub || '';
    this.nodes.banner.style.opacity = 1;
    this.bannerLeft = ms / 1000;
  }

  update(dt, S) {
    const n = this.nodes;

    // --- mission panel: kicker, stage chip, objective, what's next ---
    if (S.job) {
      n.mission.style.display = 'block';
      this.paint('mk', n.mKicker, `JOB ${S.jobIdx + 1}/8 • ${S.job.giver}`);
      this.paint('mst', n.mStage, `TAHAP ${S.stageIdx + 1}/${S.job.stages.length}`);
      this.paint('mt', n.mTitle, S.job.title);
      this.paint('mo', n.mObj, S.stage ? S.stage.obj : '');
      this.paint('mn', n.mNext, S.stage ? ('BERIKUTNYA  ' + S.stage.next) : '');
      const segHtml = S.job.stages.map((_, i) => `<span class="seg${i < S.stageIdx ? ' done' : i === S.stageIdx ? ' now' : ''}"></span>`).join('');
      if (this.shown.segs !== segHtml) { this.shown.segs = segHtml; n.mSegs.innerHTML = segHtml; }
    } else n.mission.style.display = 'none';

    // --- POLRESTA dispatch: only while wanted ---
    if (S.wanted > 0) {
      n.dispatch.style.display = 'block';
      this.paint('dh', n.dHead, `POLRESTA GERIMIS — ${S.dispatch.length} UNIT • ${S.wanted}★`);
      const unitHtml = S.dispatch.map(u => `<div class="dunit"><span>▲ ${u.name}</span><span class="dtac ${u.tactic === 'ROADBLOCK' ? 'hot' : ''}">${u.tactic}</span><span class="ddist">${Math.round(u.dist)} m</span></div>`).join('');
      if (this.shown.dunits !== unitHtml) { this.shown.dunits = unitHtml; n.dUnits.innerHTML = unitHtml; }
      this.paint('dq', n.dQuote, S.quote || '');
    } else n.dispatch.style.display = 'none';

    // --- district card with its turf meter ---
    if (S.district) {
      n.district.style.display = 'block';
      this.paint('dn', n.dName, S.district.name);
      this.paint('ds', n.dSub, S.district.sub);
      this.paint('dt', n.dTurf, S.district.turf);
      const gangHeld = S.district.turf === 'ANAK KABUT';
      n.turfFill.style.width = (gangHeld ? 82 : 26) + '%';
      n.turfFill.style.background = gangHeld ? '#ff3355' : '#00ffc8';
    } else n.district.style.display = 'none';

    // --- clock, money, wanted stars ---
    this.paint('clk', n.clock, fmtClock(S.clockMin));
    this.paint('mon', n.money, fmtRp(S.money));
    this.paint('str', n.stars, '★'.repeat(S.wanted) + '☆'.repeat(5 - S.wanted));
    n.stars.style.color = S.inSight ? '#ff5252' : '#ffd54f';

    // --- respect rank with progress to the next rung ---
    const { cur, next } = rankFor(S.respect);
    this.paint('rn', n.rankName, cur.name);
    if (next) {
      this.paint('rr', n.rankRp, `${S.respect} / ${next.rp} RP`);
      n.rankFill.style.width = pct(S.respect - cur.rp, next.rp - cur.rp);
    } else {
      this.paint('rr', n.rankRp, `${S.respect} RP — MAKSIMAL`);
      n.rankFill.style.width = '100%';
    }

    // --- activity tallies ---
    this.paint('ar', n.actRaces, `BALAPAN JALANAN — ${S.racesWon}/3 MENANG`);
    this.paint('ap', n.actPkgs, `PAKET HILANG ${S.packagesGot}/12`);

    // --- vitals ---
    n.healthFill.style.width = pct(S.health, 100);
    n.armourFill.style.width = pct(S.armour, 100);
    this.paint('hn', n.healthNum, String(Math.ceil(S.health)));
    this.paint('an', n.armourNum, String(Math.ceil(S.armour)));

    // --- weapon slots + crew cooldowns ---
    this.weaponSlots.forEach((slot, i) => {
      slot.classList.toggle('active', i === S.weaponIdx);
      slot.classList.toggle('locked', !S.weaponsOwned[i]);
    });
    this.crewCards.forEach((card, i) => {
      const cd = S.crewCd[CREW[i].id] || 0;
      const state = card.querySelector('.cstate');
      const label = cd > 0 ? Math.ceil(cd) + ' dtk' : 'SIAP';
      if (state.textContent !== label) state.textContent = label;
      card.classList.toggle('ready', cd <= 0);
    });

    // --- dialogue box ---
    if (S.dialogue) {
      n.dlg.style.display = 'flex';
      this.paint('dln', n.dlgName, `${S.dialogue.name} — ${S.dialogue.role}`);
      this.paint('dlt', n.dlgText, S.dialogue.text);
      this.paint('dla', n.dlgAvatar, S.dialogue.name[0]);
    } else n.dlg.style.display = 'none';

    // --- speedometer cluster, driving only ---
    if (S.driving) {
      n.speedo.style.display = 'block';
      this.paint('kmh', n.kmh, String(Math.round(S.speedKmh)));
      this.paint('veh', n.vehName, S.vehicleName || '');
      n.condFill.style.width = pct(S.carHealth, 100);
    } else n.speedo.style.display = 'none';

    // --- toast / banner lifetimes ---
    if (this.toastLeft > 0) { this.toastLeft -= dt; if (this.toastLeft <= 0) n.toast.style.opacity = 0; }
    if (this.bannerLeft > 0) { this.bannerLeft -= dt; if (this.bannerLeft <= 0) n.banner.style.opacity = 0; }

    this.drawMinimap(S);
  }

  drawMinimap(S) {
    const m = this.mapCtx, SIZE = 190, MID = SIZE / 2, scale = SIZE / 460;
    m.clearRect(0, 0, SIZE, SIZE);
    m.save();
    m.beginPath(); m.arc(MID, MID, MID - 2, 0, Math.PI * 2); m.clip();
    m.fillStyle = '#101823'; m.fillRect(0, 0, SIZE, SIZE);
    const originX = S.playerPos.x, originZ = S.playerPos.z;
    const project = (x, z) => [MID + (x - originX) * scale, MID + (z - originZ) * scale];
    // District washes: red where the Anak Kabut hold, cyan elsewhere.
    for (const d of DISTRICTS) {
      const [dx, dy] = project(d.x, d.z);
      m.fillStyle = d.turf === 'ANAK KABUT' ? 'rgba(255,51,85,0.16)' : 'rgba(0,229,255,0.10)';
      m.fillRect(dx - d.hw * scale, dy - d.hd * scale, d.hw * 2 * scale, d.hd * 2 * scale);
    }
    // The street grid: seven avenues each way on the 95 m pitch.
    m.strokeStyle = 'rgba(160,190,225,0.5)'; m.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
      const line = i * 95;
      let a = project(line, -380), b = project(line, 380);
      m.beginPath(); m.moveTo(a[0], a[1]); m.lineTo(b[0], b[1]); m.stroke();
      a = project(-380, line); b = project(380, line);
      m.beginPath(); m.moveTo(a[0], a[1]); m.lineTo(b[0], b[1]); m.stroke();
    }
    // Objective diamond.
    if (S.objective) {
      const [ox, oy] = project(S.objective.x, S.objective.z);
      m.fillStyle = '#ffd54f';
      m.save(); m.translate(ox, oy); m.rotate(Math.PI / 4); m.fillRect(-5, -5, 10, 10); m.restore();
    }
    // Police dots blink red/blue on a 600 ms phase.
    const blinkRed = performance.now() % 600 < 300;
    for (const cop of S.copDots || []) {
      const [cx, cy] = project(cop.x, cop.z);
      m.fillStyle = blinkRed ? '#ff4444' : '#4488ff';
      m.beginPath(); m.arc(cx, cy, 3.4, 0, Math.PI * 2); m.fill();
    }
    // Player arrow at the centre, rotated to heading; U marks north.
    m.translate(MID, MID); m.rotate(-S.playerHeading);
    m.fillStyle = '#ffffff';
    m.beginPath(); m.moveTo(0, -8); m.lineTo(5.4, 6); m.lineTo(0, 3); m.lineTo(-5.4, 6); m.closePath(); m.fill();
    m.restore();
    m.fillStyle = '#eaf6ff'; m.font = '900 13px Arial'; m.textAlign = 'center';
    m.fillText('U', MID, 16);
    m.strokeStyle = 'rgba(140,180,230,0.65)'; m.lineWidth = 2;
    m.beginPath(); m.arc(MID, MID, MID - 2, 0, Math.PI * 2); m.stroke();
  }

  // ---------- PETA KOTA GERIMIS: a poster, not a menu ----------
  // Left: the lettered map. Right: Damar's ledger. Bottom: the crew.
  // Every number comes from the same state the save file keeps, so the
  // board can never promise progress the game has not recorded.
  drawBoard(S) {
    const cv = this.nodes.boardCanvas, b = cv.getContext('2d');
    const W = cv.width, H = cv.height, FRAME = 26;

    // Parchment sheet on a slate night backing, double-ruled border.
    b.fillStyle = '#0d1420'; b.fillRect(0, 0, W, H);
    b.fillStyle = '#dcc9a0'; b.fillRect(FRAME, FRAME, W - FRAME * 2, H - FRAME * 2);
    b.strokeStyle = '#7a6438'; b.lineWidth = 3; b.strokeRect(FRAME, FRAME, W - FRAME * 2, H - FRAME * 2);
    b.lineWidth = 1; b.strokeRect(FRAME + 10, FRAME + 10, W - (FRAME + 10) * 2, H - (FRAME + 10) * 2);

    // Header with the pink rule.
    b.fillStyle = '#22303f'; b.textAlign = 'left';
    b.font = '900 44px Georgia, serif';
    b.fillText('PETA KOTA GERIMIS', 58, 92);
    b.font = 'italic 19px Georgia, serif'; b.fillStyle = '#5a4a28';
    b.fillText('Kota hujan di pegunungan — hujan sejak 19:05 dan tidak pernah benar-benar berhenti.', 58, 124);
    b.fillStyle = '#ff2e88';
    b.fillRect(58, 140, 300, 5);

    // ----- the map -----
    const MAP = { x: 58, y: 168, w: 600, h: 452 };
    b.fillStyle = '#27384c'; b.fillRect(MAP.x, MAP.y, MAP.w, MAP.h);
    b.strokeStyle = '#7a6438'; b.lineWidth = 2; b.strokeRect(MAP.x, MAP.y, MAP.w, MAP.h);
    const mx = x => MAP.x + (x + 380) / 760 * MAP.w;
    const mz = z => MAP.y + (z + 380) / 760 * MAP.h;
    // Hillside contours in the north-west, five rings.
    b.strokeStyle = 'rgba(160,190,150,0.35)'; b.lineWidth = 1.4;
    for (let ring = 0; ring < 5; ring++) {
      b.beginPath();
      b.arc(mx(-185), mz(-205), 34 + ring * 20, 0, Math.PI * 2);
      b.stroke();
    }
    // Kali Gerimis, the stream that cuts the south of the city.
    b.strokeStyle = 'rgba(90,180,255,0.75)'; b.lineWidth = 4;
    b.beginPath(); b.moveTo(mx(-380), mz(120));
    b.bezierCurveTo(mx(-180), mz(160), mx(40), mz(90), mx(240), mz(150));
    b.lineTo(mx(380), mz(130)); b.stroke();
    b.fillStyle = 'rgba(160,215,255,0.9)'; b.font = 'italic 14px Georgia';
    b.fillText('Kali Gerimis', mx(30), mz(118));
    // Street grid.
    b.strokeStyle = 'rgba(225,235,250,0.55)'; b.lineWidth = 2.4;
    for (let i = -3; i <= 3; i++) {
      const line = i * 95;
      b.beginPath(); b.moveTo(mx(line), mz(-380)); b.lineTo(mx(line), mz(380)); b.stroke();
      b.beginPath(); b.moveTo(mx(-380), mz(line)); b.lineTo(mx(380), mz(line)); b.stroke();
    }
    // Jalur Kabut in gold — the descent the racers run.
    b.strokeStyle = '#ffd54f'; b.lineWidth = 4;
    b.beginPath(); b.moveTo(mx(120), mz(-210)); b.lineTo(mx(300), mz(-210)); b.stroke();
    // Districts: tinted ground, gold letter badge, name beneath.
    const LETTERS = 'ABCDEF';
    DISTRICTS.forEach((d, i) => {
      const cx = mx(d.x), cy = mz(d.z);
      b.fillStyle = d.turf === 'ANAK KABUT' ? 'rgba(255,51,85,0.30)' : 'rgba(0,229,255,0.20)';
      b.fillRect(mx(d.x - d.hw), mz(d.z - d.hd), d.hw * 2 / 760 * MAP.w, d.hd * 2 / 760 * MAP.h);
      b.beginPath(); b.arc(cx, cy, 15, 0, Math.PI * 2);
      b.fillStyle = '#ffd54f'; b.fill();
      b.strokeStyle = '#5a4a28'; b.lineWidth = 2; b.stroke();
      b.fillStyle = '#22303f'; b.font = '900 17px Arial'; b.textAlign = 'center';
      b.fillText(LETTERS[i], cx, cy + 6);
      b.font = '700 13.5px Arial'; b.fillStyle = '#eaf2ff';
      b.fillText(d.name, cx, cy + 32);
    });
    // You-are-here arrow.
    if (S.playerPos) {
      const cx = mx(S.playerPos.x), cy = mz(S.playerPos.z);
      b.fillStyle = '#ffffff';
      b.beginPath(); b.moveTo(cx, cy - 10); b.lineTo(cx + 7, cy + 7); b.lineTo(cx, cy + 3); b.lineTo(cx - 7, cy + 7); b.closePath(); b.fill();
      b.strokeStyle = '#22303f'; b.stroke();
    }
    b.textAlign = 'left';
    b.fillStyle = 'rgba(230,240,255,0.85)'; b.font = 'italic 13px Georgia';
    b.fillText('Garis kuning: Jalur Kabut — turunan balap. Merah: wilayah Anak Kabut.', MAP.x + 8, MAP.y + MAP.h - 10);

    // ----- the ledger -----
    const LX = 700, LW = W - LX - 58;
    const stats = S.stats;
    const completion = Math.round(((stats.jobsDone / 8) + (stats.packagesGot / 12) + (stats.racesWon / 3)) / 3 * 100);
    const { cur, next } = rankFor(S.respect);
    b.fillStyle = '#22303f';
    b.font = '900 30px Georgia, serif';
    b.fillText('DAMAR', LX, 196);
    b.font = '700 19px Arial'; b.fillStyle = '#8a6d1f';
    b.fillText(cur.name + '  •  KOTA GERIMIS', LX, 224);
    b.font = '900 64px Georgia, serif'; b.fillStyle = '#c2185b';
    b.fillText(completion + '%', LX, 292);
    b.font = '700 15px Arial'; b.fillStyle = '#5a4a28';
    b.fillText('SELESAI', LX + 128, 292);
    b.strokeStyle = '#7a6438'; b.beginPath(); b.moveTo(LX, 312); b.lineTo(LX + LW, 312); b.stroke();

    const ledgerRows = [
      ['UANG', fmtRp(S.money)],
      ['RESPECT', S.respect + ' RP' + (next ? `  / ${next.rp} ke ${next.name}` : '')],
      ['STORY JOBS', `${stats.jobsDone} / 8`],
      ['PAKET HILANG', `${stats.packagesGot} / 12`],
      ['MOBIL DIAMBIL', String(stats.carsLifted)],
      ['DISTRIK', S.district ? S.district.name : '—'],
      ['CUACA', 'Gerimis terus — kabut sedang'],
      ['BURONAN', S.wanted > 0 ? '★'.repeat(S.wanted) + `  (${S.wanted})` : 'Bersih'],
    ];
    b.font = '700 17px Arial';
    ledgerRows.forEach(([label, value], i) => {
      const y = 330 + i * 26;
      b.fillStyle = '#5a4a28'; b.fillText(label, LX, y);
      b.fillStyle = '#22303f'; b.textAlign = 'right'; b.fillText(value, LX + LW, y); b.textAlign = 'left';
      b.strokeStyle = 'rgba(122,100,56,0.4)'; b.beginPath(); b.moveTo(LX, y + 7); b.lineTo(LX + LW, y + 7); b.stroke();
    });

    // Street races: best time in green, or the par still to beat.
    const racesY = 330 + ledgerRows.length * 26 + 10;
    b.font = '900 19px Georgia, serif'; b.fillStyle = '#22303f';
    b.fillText('BALAPAN JALANAN', LX, racesY);
    b.font = '700 15.5px Arial';
    RACES.forEach((race, i) => {
      const y = racesY + 24 + i * 22;
      const best = S.raceBest[race.id];
      b.fillStyle = '#5a4a28'; b.fillText(race.name, LX, y);
      b.fillStyle = best ? '#1b7a43' : '#8a6d1f'; b.textAlign = 'right';
      b.fillText(best ? best.toFixed(1) + ' dtk  ✓' : `belum lari — par ${race.par} dtk`, LX + LW, y);
      b.textAlign = 'left';
    });

    // ----- crew roster strip across the foot of the sheet -----
    const crewY = H - 118, cardW = (W - 116) / 3;
    b.strokeStyle = '#7a6438'; b.beginPath(); b.moveTo(58, crewY - 16); b.lineTo(W - 58, crewY - 16); b.stroke();
    b.font = '900 18px Georgia, serif'; b.fillStyle = '#22303f';
    b.fillText('KRU DAMAR', 58, crewY + 8);
    CREW.forEach((member, i) => {
      const x = 58 + i * cardW;
      b.fillStyle = 'rgba(34,48,63,0.08)'; b.fillRect(x, crewY + 20, cardW - 14, 56);
      b.fillStyle = '#c2185b'; b.font = '900 21px Arial';
      b.fillText(member.name, x + 12, crewY + 48);
      b.fillStyle = '#5a4a28'; b.font = '700 14.5px Arial';
      b.fillText(`${member.role} — ${member.ability} [${member.key}]`, x + 12, crewY + 68);
    });
    b.font = 'italic 13px Georgia'; b.fillStyle = '#5a4a28'; b.textAlign = 'right';
    b.fillText('TAB untuk menutup peta', W - 58, H - 40);
    b.textAlign = 'left';
  }
}
