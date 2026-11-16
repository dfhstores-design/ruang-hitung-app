# Ruang Hitung

Aplikasi latihan soal matematika untuk persiapan Ujian Akhir SMP kelas 9. Siswa mengerjakan latihan dan ujian, orang tua memantau progres, dan guru mengelola siswa, soal, paket, serta pembahasan.

## Tautan aplikasi

**Link yang dibagikan ke guru dan siswa (disarankan):**

https://dfhstores-design.github.io/ruang-hitung-app/

Link ini disajikan dari GitHub Pages, bukan dari domain Google, sehingga tidak memunculkan pemilih akun Google saat browser punya beberapa akun.

**Link Apps Script `/exec` (backend):**

https://script.google.com/macros/s/AKfycbw6FaGYiLy_kG8Q56EEHGwIEGufCOfrfArKPKtpSCxI5x4Qz-P5EJYGSvUw3QkSOp3J/exec

> Link `/exec` tetap berfungsi, tetapi dapat menampilkan pemilih akun Google dan mengarah ke Drive bila browser sedang login ke beberapa akun. Gunakan link GitHub Pages untuk dibagikan.

## Login awal

| Peran | Cara masuk |
|---|---|
| Guru | Kode `GURU-2049` |
| Siswa | Nama `Siswa`, PIN `123456` |
| Orang tua | Nama anak `Siswa`, PIN orang tua `654321` |

Guru wajib mengganti kode guru dan PIN default segera setelah pertama kali masuk.

## Manual per peran

- [Manual Guru](MANUAL-GURU.md)
- [Manual Siswa](MANUAL-SISWA.md)
- [Manual Orang Tua](MANUAL-ORANG-TUA.md)

## Fitur utama

- **Bank soal**: 311 soal, 6 topik, termasuk 66 soal cerita logika/penalaran, dengan kunci dan pembahasan lengkap.
- **Latihan pemahaman**: latihan campuran 20 soal, per topik 10 soal, dan latihan singkat 5 soal. Tanpa batas waktu, pembahasan terbuka otomatis setelah dikumpulkan.
- **Ujian**: Simulasi Ujian Akhir (60 soal, 90 menit) dan Ujian Kilat (20 soal, 30 menit). Pembahasan terkunci sampai guru atau orang tua membukanya.
- **Latihan adaptif**: tingkat soal menyesuaikan riwayat jawaban siswa.
- **Soal cerita logika/penalaran**: soal cerita dengan `skill` logika untuk menguji penalaran, bukan hanya hitungan.
- **Generate soal otomatis**: guru membuat soal cerita baru memakai Gemini (perlu API key), atau generator offline tanpa API key untuk soal berhitung.
- **Review soal AI**: hasil generate masuk status draf dan diaktifkan guru setelah ditinjau.
- **Filter soal cerita**: tombol filter di bank soal untuk menampilkan hanya soal cerita (skill logika).
- **Kuis langsung**: guru membuat room dengan kode, siswa bergabung, ada leaderboard.
- **Soal sulit**: guru dan orang tua menandai soal yang perlu dibahas di kelas.
- **Rapor PDF/Excel**: laporan per siswa dan rekap kelas.
- **Audit log**: mencatat aktivitas penting.
- **Pengaturan paket**: jumlah soal, durasi, topik, level, dan jadwal per paket.
- **Shortcut di perangkat**: Add to Home Screen (bukan offline, bukan service worker).

## Data

Semua data tersimpan di Google Sheets pada akun `[AKUN_GOOGLE_ANDA]`.

Lembar data:

- `Questions`: bank soal, kunci, pembahasan, family, level, skill.
- `Students`: siswa, hash PIN, status aktif.
- `Packages`: paket latihan/ujian/kuis, jumlah soal, durasi, topik, jadwal.
- `Attempts`: sesi, mode, skor, durasi, urutan soal dan pilihan.
- `Answers`: jawaban per soal dan penanda soal sulit.
- `Audit`: audit log.
- `LiveSessions`, `LiveParticipants`, `LiveAnswers`: kuis langsung.

## Struktur proyek

- `Code.gs`: backend Apps Script.
- `Index.html`: antarmuka (dipakai di `/exec`).
- `standalone/index.html`: antarmuka versi GitHub Pages (memakai `fetch`).
- `Questions.gs`: data bank soal (dari `questions-v3.json`).
- `questions-v3.json`: sumber bank soal.
- `appsscript.json`: konfigurasi web app dan izin.
- `MANUAL-GURU.md`, `MANUAL-SISWA.md`, `MANUAL-ORANG-TUA.md`: panduan per peran.

## Deployment

- Script ID: `1yUrSfZHXOGI1XYZRLZ8QAzqvhl4SfVvBe0GstJwMyUx6rIVBx6-TkDl1`
- Deployment ID: `AKfycbw6FaGYiLy_kG8Q56EEHGwIEGufCOfrfArKPKtpSCxI5x4Qz-P5EJYGSvUw3QkSOp3J`
- Repositori frontend: https://github.com/dfhstores-design/ruang-hitung-app
- Akun Google: `[AKUN_GOOGLE_ANDA]`
- Timezone: `Asia/Jakarta`

Perintah pembaruan:

```powershell
clasp push --force
clasp deploy --deploymentId AKfycbw6FaGYiLy_kG8Q56EEHGwIEGufCOfrfArKPKtpSCxI5x4Qz-P5EJYGSvUw3QkSOp3J --description "Ruang Hitung"
```

## Kapasitas dan batasan

- Maksimal 40 siswa.
- Satu siswa hanya boleh punya satu sesi latihan/ujian aktif pada satu waktu.
- Login memakai nama + PIN, bukan akun Google siswa.
- Kuis langsung memakai polling 3 detik; 40 siswa serentak perlu uji beban.
- Notifikasi browser hanya saat tab aplikasi terbuka. Pengingat kalender adalah pengingat utama.
- Laporan berupa Google Sheets dengan tautan ekspor PDF/XLSX; akses mengikuti akun Google pemilik data.
