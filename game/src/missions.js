// GERIMIS — the eight story jobs: givers, stages, dialogue, rewards.
// One job: hold the whole story as data the engine in main.js performs.

export const JOBS = [
  {
    id: 'angkot', giver: 'PAK HAJI RAHMAN', role: 'Juragan Terminal', title: 'ANGKOT TERAKHIR',
    place: [-186, 22],
    intro: [
      'Hujan begini angkotku mogok semua. Kau bisa menyetir, Damar?',
      'Antar angkot kuning itu ke Pasar Kabut sebelum sayurnya busuk.',
    ],
    stages: [
      { type: 'go', at: [-196, 40], obj: 'Ambil angkot kuning di bawah atap terminal', next: 'Masuk ke angkot (F)' },
      { type: 'drive', at: [168, 18], obj: 'Antar angkot ke depan Pasar Kabut', next: 'Parkir di cahaya pink gerbang pasar' },
    ],
    rewardRp: 2400, rewardRespect: 120,
    outro: 'Pasar kebagian sayur malam ini. Kau memang sopir andalan.',
  },
  {
    id: 'sayur', giver: 'BU LASTRI', role: 'Ratu Pasar Kabut', title: 'SAYUR UNTUK PASAR',
    place: [172, 16],
    intro: [
      'Anak Kabut menahan truk sayurku di Jalur Kabut. Mereka minta jatah.',
      'Ambil kembali tiga peti sayurku. Jangan sampai rusak.',
    ],
    stages: [
      { type: 'go', at: [238, -178], obj: 'Pergi ke truk sayur yang ditahan di Jalur Kabut', next: 'Hati-hati, ada Anak Kabut menjaga' },
      { type: 'fight', at: [238, -178], count: 3, obj: 'Kalahkan 3 Anak Kabut penjaga truk', next: 'Pakai P9 dari Bu Lastri — tekan 2' },
      { type: 'collect', at: [238, -178], count: 3, obj: 'Kumpulkan 3 peti sayur', next: 'Jalan melewati peti untuk mengambilnya' },
      { type: 'drive', at: [196, 20], obj: 'Bawa peti kembali ke Pasar Kabut', next: 'Serahkan ke Bu Lastri' },
    ],
    rewardRp: 3600, rewardRespect: 180,
    outro: 'Peti utuh semua! Pasar Kabut berhutang padamu, Damar.',
  },
  {
    id: 'penumpang', giver: 'SARI', role: 'Kru — Sopir', title: 'PENUMPANG GELAP',
    place: [-30, -52],
    intro: [
      'Ada penumpang mau keluar kota malam ini juga. Bayarannya besar, Damar.',
      'Jemput dia di Stasiun Kota. Jangan tanya namanya.',
    ],
    stages: [
      { type: 'drive', at: [30, 196], obj: 'Jemput penumpang gelap di Stasiun Kota', next: 'Berhenti di peron yang menyala' },
      { type: 'drive', at: [-160, -150], obj: 'Antar ke gang Kampung Atas', next: 'Polresta mulai curiga — jangan menabrak' },
      { type: 'escape', at: [-160, -150], obj: 'Lepaskan diri dari POLRESTA', next: 'Putus garis pandang dan bersembunyi' },
    ],
    rewardRp: 5200, rewardRespect: 220,
    outro: 'Dia turun tanpa sepatah kata. Uang segini selalu berarti masalah.',
  },
  {
    id: 'koper', giver: 'MAS BIMO', role: 'Porter Stasiun', title: 'KOPER DI STASIUN',
    place: [24, 200],
    intro: [
      'Koper hitam tertukar di kereta malam. Isinya bukan baju, Damar.',
      'Ambil dari loker, lalu tukar dengan orangku di Terminal Basah.',
    ],
    stages: [
      { type: 'go', at: [78, 226], obj: 'Ambil koper hitam di ujung peron', next: 'Jalan ke cahaya di ujung peron' },
      { type: 'drive', at: [-232, 84], obj: 'Bawa koper ke Terminal Basah', next: 'Orang Bimo menunggu di bangku ujung' },
      { type: 'fight', at: [-232, 84], count: 2, obj: 'Anak Kabut menyergap! Tahan mereka', next: 'Lindungi koper' },
    ],
    rewardRp: 4800, rewardRespect: 200,
    outro: 'Koper berpindah tangan. Stasiun kembali tenang — untuk malam ini.',
  },
  {
    id: 'balasan', giver: 'PAKDE WIRYO', role: 'Sesepuh Kampung Atas', title: 'BALASAN ANAK KABUT',
    place: [-160, -168],
    intro: [
      'Anak Kabut membakar warung kopi keponakanku. Kampung tidak diam saja.',
      'Usir mereka dari lorong atas. Tunjukkan kampung ini ada yang jaga.',
    ],
    stages: [
      { type: 'go', at: [-214, -196], obj: 'Naik ke lorong atas Kampung Atas', next: 'Ikuti lampion ke atas' },
      { type: 'fight', at: [-214, -196], count: 4, obj: 'Usir 4 Anak Kabut dari lorong atas', next: 'Mereka bersenjata — pakai SMG Rintik (3)' },
      { type: 'go', at: [-160, -168], obj: 'Kembali ke Pakde Wiryo', next: 'Lapor ke sesepuh' },
    ],
    rewardRp: 5600, rewardRespect: 300,
    outro: 'Kampung Atas bernafas lagi. Nama Damar disebut di setiap warung.',
  },
  {
    id: 'turunan', giver: 'UJANG', role: 'Kru — Montir', title: 'KEJAR TURUNAN',
    place: [-46, 30],
    intro: [
      'Rintik GT merahku dicuri kurir Anak Kabut. Dia lari ke Jalur Kabut!',
      'Kejar dia di turunan. Tabrak sampai berhenti — jangan hancurkan mobilku.',
    ],
    stages: [
      { type: 'go', at: [-40, 36], obj: 'Ambil mobil di depan Bengkel Ujang', next: 'Masuk mobil (F)' },
      { type: 'chase', at: [150, -190], obj: 'Kejar Rintik GT curian di Jalur Kabut', next: 'Tabrak dari samping, pepet terus' },
      { type: 'drive', at: [-40, 40], obj: 'Bawa Rintik GT kembali ke bengkel', next: 'Parkir di cahaya kuning bengkel' },
    ],
    rewardRp: 6400, rewardRespect: 260,
    outro: 'Catnya lecet sedikit, tapi mesinnya utuh. Kerja bagus, Damar.',
  },
  {
    id: 'gudang', giver: 'RATNA', role: 'Kru — Pengintai', title: 'GUDANG BASAH',
    place: [120, -120],
    intro: [
      'Aku memotret gudang Anak Kabut di belakang pasar. Isinya barang selundupan.',
      'Masuk, ambil tiga bundel bukti, keluar sebelum mereka sadar.',
    ],
    stages: [
      { type: 'go', at: [238, 96], obj: 'Menyusup ke gudang belakang Pasar Kabut', next: 'Dekati dari lorong gelap' },
      { type: 'collect', at: [238, 96], count: 3, obj: 'Ambil 3 bundel bukti', next: 'Cepat — jangan sampai terlihat' },
      { type: 'fight', at: [238, 96], count: 3, obj: 'Ketahuan! Tembak jalan keluar', next: 'Bertahan sampai lorong bersih' },
      { type: 'drive', at: [120, -112], obj: 'Antar bukti ke Ratna', next: 'Dia menunggu di bawah neon' },
    ],
    rewardRp: 7200, rewardRespect: 320,
    outro: 'Bukti ini cukup untuk menekan Anak Kabut sebulan penuh.',
  },
  {
    id: 'raja', giver: 'DAMAR', role: 'Malam Terakhir', title: 'RAJA GERIMIS',
    place: [196, 20],
    intro: [
      'Malam ini Anak Kabut turun semua ke Pasar Kabut. Ini wilayahku sekarang.',
      'Tahan pasar. Lalu hilang sebelum Polresta menutup kota.',
    ],
    stages: [
      { type: 'fight', at: [200, 45], count: 6, obj: 'Tahan Pasar Kabut dari 6 Anak Kabut', next: 'Gelombang terakhir mereka' },
      { type: 'escape', at: [200, 45], obj: 'Hilang dari kejaran POLRESTA', next: 'Masuk gang, matikan lampu, tunggu' },
      { type: 'go', at: [45, 196], obj: 'Tutup malam di Stasiun Kota', next: 'Kereta terakhir menunggumu' },
    ],
    rewardRp: 12000, rewardRespect: 600,
    outro: 'Hujan masih turun, tapi kota ini tahu siapa rajanya malam ini.',
  },
];

export function jobAt(idx) { return JOBS[idx] || null; }
