# STATUS AKHIR: Ruang Hitung v3

Terakhir diperbarui: 2 November 2026, 15.50 WIB

Status: **SELESAI, LIVE, SIAP SERAH TERIMA**.

Dokumen utama: [V3-PLAN.md](V3-PLAN.md)

## Ringkasan

- Aplikasi live: **v3**, deployment versi **39**.
- Kapasitas: **40 siswa**.
- Bank soal: **240 soal** (60 lama + 180 variasi).
- Login: siswa dengan nama + PIN, orang tua dengan nama anak + PIN orang tua, guru dengan kode guru.
- Latihan adaptif tanpa timer; ujian bertimer dengan pembahasan terkunci; kuis langsung kelas.
- Paket ujian dapat diatur jumlah soal, durasi, topik, level, dan jadwal.
- Editor soal dan paket tersedia di UI guru.
- Flag soal sulit, daftar pembahasan kelas, dan audit log.
- Rapor PDF/Excel per siswa dan rekap kelas lewat tautan ekspor Google Sheets.
- Shortcut Add to Home Screen; tanpa service worker atau offline.
- Semua data di Google Sheets akun `[AKUN_GOOGLE_ANDA]`; tanpa layanan berbayar.

## Tautan dan ID

- Frontend yang dibagikan: https://dfhstores-design.github.io/ruang-hitung-app/
- Backend Apps Script: https://script.google.com/macros/s/AKfycbw6FaGYiLy_kG8Q56EEHGwIEGufCOfrfArKPKtpSCxI5x4Qz-P5EJYGSvUw3QkSOp3J/exec
- Deployment ID: `AKfycbw6FaGYiLy_kG8Q56EEHGwIEGufCOfrfArKPKtpSCxI5x4Qz-P5EJYGSvUw3QkSOp3J`
- Script ID: `1yUrSfZHXOGI1XYZRLZ8QAzqvhl4SfVvBe0GstJwMyUx6rIVBx6-TkDl1`
- Spreadsheet: https://docs.google.com/spreadsheets/d/1rkEXS5DpVyiXBs64W4vHPF7vhb2kblFn2EIClwcxHU/edit
- Backup v2: https://docs.google.com/spreadsheets/d/1ZIAzNN52sVsj2KFYxx93F8v0P4kUvcrLaf8_utjIobc/edit
- Folder Drive: https://drive.google.com/drive/folders/1OCL6yFDDzFf2C2mZh04rCWxXknRiV79h
- Akun: `[AKUN_GOOGLE_ANDA]`
- Timezone: `Asia/Jakarta`

## Kredensial awal

| Peran | Cara masuk |
|---|---|
| Guru | Kode `GURU-2049` |
| Siswa default | Nama `Siswa`, PIN `123456` |
| Orang tua default | Nama anak `Siswa`, PIN orang tua `654321` |

Guru harus segera mengganti kode guru dan PIN default.

## Fitur v3

1. Bank 240 soal dengan `familyId`, `variantId`, `level`, `skill`.
2. Randomisasi soal dan urutan pilihan; `optionOrder` disimpan per attempt.
3. Latihan adaptif berdasarkan mastery historis; ujian acak berstrata.
4. Paket latihan/ujian/kuis dengan jadwal, durasi, topik, dan level.
5. Editor soal dan editor paket di UI guru.
6. Flag `needsReview` + catatan; daftar soal sulit guru/orang tua.
7. Audit log lengkap.
8. Rapor siswa dan rekap kelas; PDF/XLSX via tautan ekspor Sheets.
9. Kuis langsung kelas: kode room, host guru, timer, reveal, leaderboard.
10. Shortcut installable dan panduan Android/iPhone.
11. Link aplikasi resmi dipisahkan dari link Google Sheets, laporan, dan folder Drive.
13. Frontend mandiri `standalone/index.html` memakai `fetch` ke `doPost`, untuk menghindari pemilih akun Google saat browser punya beberapa akun.
21. Generator offline (tanpa API key) + review draf + filter soal cerita.
20. Soal cerita ditambah jadi 66, bank total 311 soal.
19. v3.4: review soal AI, generator offline, filter soal cerita.
18. Latihan Singkat 5 soal (paket practice:quick5).
17. Generate soal otomatis pakai Gemini REST (guru masukkan API key di Pengaturan).
16. Bank soal bertambah 24 soal cerita logika/penalaran (CER-01..CER-24, skill logika), total 264 soal.
15. Bug logout, dashboard orang tua, dan kuis langsung diperbaiki dengan mengembalikan fungsi live yang hilang.
12. Tampilan mobile-first: 320, 390, 768, dan 1440 px; target sentuh minimal 44 px; footer kuis menempel di bawah; tema gelap diuji.

## Verifikasi

- Self-test backend live: **ok true**.
- Setup: 240 soal, 10 paket.
- Latihan adaptif 20 soal, skor 100.
- Ujian 20 soal; pembahasan terkunci lalu dibuka orang tua.
- Flag soal dan daftar soal sulit aktif.
- Impor CSV 1 soal.
- Rapor siswa + rekap kelas menghasilkan tautan PDF/Excel.
- Kuis langsung: buat, gabung, jawab, reveal, next, end.
- Audit 31 baris.
- Cleanup: 21 jawaban, 2 attempt, 1 jawaban kuis, 1 peserta, 1 sesi, 2 soal uji, 1 paket uji, 1 siswa uji, 14 audit uji terhapus.
- Final build: `node --check` lolos untuk `Code.gs` dan script `Index.html`.
- Endpoint self-test sudah dihapus dari deployment final.

## Batasan

- 40 siswa kuis langsung memakai polling 3 detik; uji beban diperlukan.
- Tidak ada service worker/offline/push sungguhan.
- Laporan adalah Google Sheets dengan tautan ekspor PDF/XLSX; akses mengikuti akun Google pemilik data.
- Notifikasi browser hanya saat tab terbuka.
- Login nama + PIN, bukan akun Google siswa.
- Apps Script dapat mengantre pada 40 siswa serentak.

## Struktur

- `Code.gs`: backend.
- `Index.html`: UI.
- `Questions.gs`: 240 soal.
- `questions-v3.json`: sumber bank soal.
- `V3-PLAN.md`: rencana/status rinci.
- `README.md`: panduan pengguna.
- `appsscript.json`: manifest.

## Handoff

1. Buka web app di Chrome normal dan login guru.
2. Periksa dashboard, bank soal, paket, rapor, dan kuis langsung.
3. Baca `V3-PLAN.md` untuk detail dan batasan.
4. Jika mengubah kode: `clasp push --force` lalu `clasp deploy --deploymentId ...`.
5. Jangan menambahkan scope Drive penuh tanpa kebutuhan; laporan memakai tautan ekspor Sheets.
