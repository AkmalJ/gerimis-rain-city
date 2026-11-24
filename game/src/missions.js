// GERIMIS — the story campaign: eight jobs across one rainy night.
//
// Each job is pure data; the engine in main.js performs it. A job has a
// giver standing at `place`, two lines of `intro` dialogue, a chain of
// stages, an Rp + respect reward, and one `outro` line on completion.
// Stage types the engine understands:
//   go      — walk/drive to the marker
//   drive   — arrive by car at the marker
//   fight   — defeat `count` Anak Kabut at the marker
//   collect — pick up `count` props at the marker
//   chase   — ram the fleeing car until it stops
//   escape  — break POLRESTA line of sight
// `obj` is the objective line, `next` the "what now" hint under it.

// Stage factories — keep the eight scripts below readable.
const go = (at, obj, next) => ({ type: 'go', at, obj, next });
const drive = (at, obj, next) => ({ type: 'drive', at, obj, next });
const fight = (at, count, obj, next) => ({ type: 'fight', at, count, obj, next });
const collect = (at, count, obj, next) => ({ type: 'collect', at, count, obj, next });
const chase = (at, obj, next) => ({ type: 'chase', at, obj, next });
const escape = (at, obj, next) => ({ type: 'escape', at, obj, next });

export const JOBS = [
  // 1 — a gentle opener: borrow the yellow angkot, feed the market.
  {
    id: 'angkot', title: 'ANGKOT TERAKHIR',
    giver: 'PAK HAJI RAHMAN', role: 'Juragan Terminal', place: [-186, 22],
    intro: [
      'Hujan begini angkotku mogok semua. Kau bisa menyetir, Damar?',
      'Antar angkot kuning itu ke Pasar Kabut sebelum sayurnya busuk.',
    ],
    stages: [
      go([-196, 40], 'Ambil angkot kuning di bawah atap terminal', 'Masuk ke angkot (F)'),
      drive([168, 18], 'Antar angkot ke depan Pasar Kabut', 'Parkir di cahaya pink gerbang pasar'),
    ],
    rewardRp: 2400, rewardRespect: 120,
    outro: 'Pasar kebagian sayur malam ini. Kau memang sopir andalan.',
  },
  // 2 — first fight: Bu Lastri's vegetable truck, held on the fog road.
  {
    id: 'sayur', title: 'SAYUR UNTUK PASAR',
    giver: 'BU LASTRI', role: 'Ratu Pasar Kabut', place: [172, 16],
    intro: [
      'Anak Kabut menahan truk sayurku di Jalur Kabut. Mereka minta jatah.',
      'Ambil kembali tiga peti sayurku. Jangan sampai rusak.',
    ],
    stages: [
      go([238, -178], 'Pergi ke truk sayur yang ditahan di Jalur Kabut', 'Hati-hati, ada Anak Kabut menjaga'),
      fight([238, -178], 3, 'Kalahkan 3 Anak Kabut penjaga truk', 'Pakai P9 dari Bu Lastri — tekan 2'),
      collect([238, -178], 3, 'Kumpulkan 3 peti sayur', 'Jalan melewati peti untuk mengambilnya'),
      drive([196, 20], 'Bawa peti kembali ke Pasar Kabut', 'Serahkan ke Bu Lastri'),
    ],
    rewardRp: 3600, rewardRespect: 180,
    outro: 'Peti utuh semua! Pasar Kabut berhutang padamu, Damar.',
  },
  // 3 — Sari's unnamed passenger; the first POLRESTA escape.
  {
    id: 'penumpang', title: 'PENUMPANG GELAP',
    giver: 'SARI', role: 'Kru — Sopir', place: [-30, -52],
    intro: [
      'Ada penumpang mau keluar kota malam ini juga. Bayarannya besar, Damar.',
      'Jemput dia di Stasiun Kota. Jangan tanya namanya.',
    ],
    stages: [
      drive([30, 196], 'Jemput penumpang gelap di Stasiun Kota', 'Berhenti di peron yang menyala'),
      drive([-160, -150], 'Antar ke gang Kampung Atas', 'Polresta mulai curiga — jangan menabrak'),
      escape([-160, -150], 'Lepaskan diri dari POLRESTA', 'Putus garis pandang dan bersembunyi'),
    ],
    rewardRp: 5200, rewardRespect: 220,
    outro: 'Dia turun tanpa sepatah kata. Uang segini selalu berarti masalah.',
  },
  // 4 — the swapped suitcase at the night station, ambushed at handover.
  {
    id: 'koper', title: 'KOPER DI STASIUN',
    giver: 'MAS BIMO', role: 'Porter Stasiun', place: [24, 200],
    intro: [
      'Koper hitam tertukar di kereta malam. Isinya bukan baju, Damar.',
      'Ambil dari loker, lalu tukar dengan orangku di Terminal Basah.',
    ],
    stages: [
      go([78, 226], 'Ambil koper hitam di ujung peron', 'Jalan ke cahaya di ujung peron'),
      drive([-232, 84], 'Bawa koper ke Terminal Basah', 'Orang Bimo menunggu di bangku ujung'),
      fight([-232, 84], 2, 'Anak Kabut menyergap! Tahan mereka', 'Lindungi koper'),
    ],
    rewardRp: 4800, rewardRespect: 200,
    outro: 'Koper berpindah tangan. Stasiun kembali tenang — untuk malam ini.',
  },
  // 5 — Kampung Atas answers a burned coffee stall; the SMG job.
  {
    id: 'balasan', title: 'BALASAN ANAK KABUT',
    giver: 'PAKDE WIRYO', role: 'Sesepuh Kampung Atas', place: [-160, -168],
    intro: [
      'Anak Kabut membakar warung kopi keponakanku. Kampung tidak diam saja.',
      'Usir mereka dari lorong atas. Tunjukkan kampung ini ada yang jaga.',
    ],
    stages: [
      go([-214, -196], 'Naik ke lorong atas Kampung Atas', 'Ikuti lampion ke atas'),
      fight([-214, -196], 4, 'Usir 4 Anak Kabut dari lorong atas', 'Mereka bersenjata — pakai SMG Rintik (3)'),
      go([-160, -168], 'Kembali ke Pakde Wiryo', 'Lapor ke sesepuh'),
    ],
    rewardRp: 5600, rewardRespect: 300,
    outro: 'Kampung Atas bernafas lagi. Nama Damar disebut di setiap warung.',
  },
  // 6 — Ujang's stolen Rintik GT, run down on the descent.
  {
    id: 'turunan', title: 'KEJAR TURUNAN',
    giver: 'UJANG', role: 'Kru — Montir', place: [-46, 30],
    intro: [
      'Rintik GT merahku dicuri kurir Anak Kabut. Dia lari ke Jalur Kabut!',
      'Kejar dia di turunan. Tabrak sampai berhenti — jangan hancurkan mobilku.',
    ],
    stages: [
      go([-40, 36], 'Ambil mobil di depan Bengkel Ujang', 'Masuk mobil (F)'),
      chase([150, -190], 'Kejar Rintik GT curian di Jalur Kabut', 'Tabrak dari samping, pepet terus'),
      drive([-40, 40], 'Bawa Rintik GT kembali ke bengkel', 'Parkir di cahaya kuning bengkel'),
    ],
    rewardRp: 6400, rewardRespect: 260,
    outro: 'Catnya lecet sedikit, tapi mesinnya utuh. Kerja bagus, Damar.',
  },
  // 7 — Ratna's warehouse evidence run: sneak in, fight out.
  {
    id: 'gudang', title: 'GUDANG BASAH',
    giver: 'RATNA', role: 'Kru — Pengintai', place: [120, -120],
    intro: [
      'Aku memotret gudang Anak Kabut di belakang pasar. Isinya barang selundupan.',
      'Masuk, ambil tiga bundel bukti, keluar sebelum mereka sadar.',
    ],
    stages: [
      go([238, 96], 'Menyusup ke gudang belakang Pasar Kabut', 'Dekati dari lorong gelap'),
      collect([238, 96], 3, 'Ambil 3 bundel bukti', 'Cepat — jangan sampai terlihat'),
      fight([238, 96], 3, 'Ketahuan! Tembak jalan keluar', 'Bertahan sampai lorong bersih'),
      drive([120, -112], 'Antar bukti ke Ratna', 'Dia menunggu di bawah neon'),
    ],
    rewardRp: 7200, rewardRespect: 320,
    outro: 'Bukti ini cukup untuk menekan Anak Kabut sebulan penuh.',
  },
  // 8 — finale: hold the market against the whole gang, then vanish.
  {
    id: 'raja', title: 'RAJA GERIMIS',
    giver: 'DAMAR', role: 'Malam Terakhir', place: [196, 20],
    intro: [
      'Malam ini Anak Kabut turun semua ke Pasar Kabut. Ini wilayahku sekarang.',
      'Tahan pasar. Lalu hilang sebelum Polresta menutup kota.',
    ],
    stages: [
      fight([200, 45], 6, 'Tahan Pasar Kabut dari 6 Anak Kabut', 'Gelombang terakhir mereka'),
      escape([200, 45], 'Hilang dari kejaran POLRESTA', 'Masuk gang, matikan lampu, tunggu'),
      go([45, 196], 'Tutup malam di Stasiun Kota', 'Kereta terakhir menunggumu'),
    ],
    rewardRp: 12000, rewardRespect: 600,
    outro: 'Hujan masih turun, tapi kota ini tahu siapa rajanya malam ini.',
  },
];

export function jobAt(idx) { return JOBS[idx] || null; }
