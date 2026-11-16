# RENCANA DAN PROGRES: Ruang Hitung v3

Terakhir diperbarui: 2 November 2026, 15.50 WIB

Status: **SELESAI, LIVE v3.1, SIAP SERAH TERIMA**

Dokumen ini adalah sumber status untuk agen berikutnya. Baca bagian **Cara melanjutkan** sebelum mengubah kode.

## Keputusan pemilik untuk v3

1. **PWA**: shortcut installable tanpa service worker. Tidak ada offline sejati.
2. **Bank soal**: 60 soal lama + 180 variasi baru = 240 soal.
3. **Adaptif**: Latihan Pemahaman memakai mastery historis; ujian memakai acak berstrata.
4. **Mode kuis**: kuis langsung kelas, guru host, siswa join dengan kode, leaderboard.
5. **Kesulitan**: guru/orang tua/siswa dapat menandai soal; guru mendapat daftar soal sulit.
6. **Editor**: editor soal dan editor paket.
7. **Ekspor**: rapor per siswa dan rekap kelas dalam PDF dan Excel.
8. **Jadwal**: mulai, batas akhir, dan durasi per paket.
9. **Audit log**: login, mulai, submit, buka kunci, flag, CRUD soal/paket, impor, laporan, kuis.
10. **Randomisasi**: soal dan urutan pilihan diacak saat attempt dibuat; attempt lama menyimpan urutan sehingga review tetap sama.

## Tautan dan ID

- Frontend live v3.2 (GitHub Pages): https://dfhstores-design.github.io/ruang-hitung-app/
- Backend Apps Script: https://script.google.com/macros/s/AKfycbw6FaGYiLy_kG8Q56EEHGwIEGufCOfrfArKPKtpSCxI5x4Qz-P5EJYGSvUw3QkSOp3J/exec
- Deployment ID: `AKfycbw6FaGYiLy_kG8Q56EEHGwIEGufCOfrfArKPKtpSCxI5x4Qz-P5EJYGSvUw3QkSOp3J`
- Script ID: `1yUrSfZHXOGI1XYZRLZ8QAzqvhl4SfVvBe0GstJwMyUx6rIVBx6-TkDl1`
- Spreadsheet: https://docs.google.com/spreadsheets/d/1rkEXS5DpVyiXBs64W4vHPF7vhb2kblFn2EIClwcxHU/edit
- Backup v2: https://docs.google.com/spreadsheets/d/1ZIAzNN52sVsj2KFYxx93F8v0P4kUvcrLaf8_utjIobc/edit
- Folder Drive: https://drive.google.com/drive/folders/1OCL6yFDDzFf2C2mZh04rCWxXknRiV79h
- Akun Google: `[AKUN_GOOGLE_ANDA]`
- Folder kerja: `D:\Documents\AI-GPT\Ruang-Hitung`
- Backup otomatis v3: ID/URL tersimpan di Script Properties `V3_BACKUP_ID` dan `V3_BACKUP_URL`; dibuat sebelum migrasi v3.

## Login v3

| Peran | Cara masuk |
|---|---|
| Guru | Kode `GURU-2049` |
| Siswa default | Nama `Siswa`, PIN `123456` |
| Orang tua default | Nama anak `Siswa`, PIN orang tua `654321` |

Guru wajib mengganti kode dan PIN default sebelum dipakai.

## Arsitektur final

- Google Apps Script sebagai backend dan web app.
- Google Sheets sebagai database.
- HTML Service untuk UI.
- Google Sheets laporan + tautan ekspor PDF/XLSX (tanpa scope Drive penuh).
- Shortcut Add to Home Screen, tanpa service worker.
- Kuis langsung memakai polling 3 detik, bukan WebSocket.

## Skema data final

### Questions

16 kolom: `id, topicId, topic, difficulty, question, optionA-D, answerIndex, solution, active, familyId, variantId, level, skill`.

### Packages

`id, name, mode, questionCount, durationMin, topicIds, levelStrategy, liveSecondsPerQuestion, availableFrom, availableUntil, active, createdAt, updatedAt`.

Paket default: Latihan Campuran, 6 latihan topik, Simulasi Ujian Akhir, Ujian Kilat, Kuis Langsung.

### Attempts

20 kolom. Tambahan penting: `optionOrder` (JSON urutan pilihan), `adaptiveLevel`, `questionIds` immutable.

### Answers

9 kolom: jawaban + `needsReview`, `flagNote`, `flaggedBy`, `flaggedAt`.

### Packages/Audit/Live

- `Audit`: audit log lengkap.
- `LiveSessions`: kode, status, soal aktif, urutan pilihan, timer.
- `LiveParticipants`: peserta, skor, benar.
- `LiveAnswers`: jawaban kuis langsung.

## Status fase

| Fase | Isi | Status |
|---|---|---|
| 0 | Rencana v3 dan dokumen Drive | SELESAI |
| 1 | Skema v3, migrasi, 180 soal baru, randomisasi soal/pilihan, attempt immutable | SELESAI |
| 2 | Latihan adaptif, flag soal sulit, audit log | SELESAI |
| 3 | Editor soal, editor paket, jadwal dan durasi | SELESAI |
| 4 | Rapor PDF/Excel per siswa + rekap kelas | SELESAI |
| 5 | Kuis langsung kelas dan leaderboard | SELESAI |
| 6 | Shortcut installable dan panduan Add to Home Screen | SELESAI |
| 7 | Uji, migrasi live, deploy, bersihkan endpoint uji | SELESAI |
| 8 | Delivery Gate dan serah terima | SELESAI |

## Bukti uji backend live

Self-test sementara dijalankan pada deployment v3 dan mengembalikan `ok: true`:

- setup: **240 soal, 10 paket**
- login guru, siswa default, orang tua default
- buat siswa uji
- editor soal
- editor paket
- latihan adaptif: **20 soal, skor 100**, flag soal dan daftar soal sulit aktif
- ujian: **20 soal**, pembahasan terkunci lalu dibuka orang tua
- impor CSV: 1 soal
- laporan: PDF, Excel, dan spreadsheet untuk rapor siswa + rekap kelas
- kuis langsung: buat, gabung, jawab, reveal, next, end
- audit: 31 baris

Cleanup self-test berhasil menghapus 21 jawaban, 2 attempt, 1 jawaban kuis, 1 peserta, 1 sesi kuis, 2 soal uji, 1 paket uji, 1 siswa uji, dan 14 baris audit uji. Endpoint self-test sudah dihapus dari deployment final.

Laporan uji yang dibuat self-test (dua Google Sheets, dapat dihapus manual dari Drive):

- Rapor siswa: https://docs.google.com/spreadsheets/d/1hPna3IuXsaO4mmNINbJd2QQySax2NwdmdZKea7gCaBA/edit
- Rekap kelas: https://docs.google.com/spreadsheets/d/1hBzKyJnvws_NbyMSMmKCFhUKq-zcmMcxzUVeK52urS0/edit

## Status UI

- Login siswa, orang tua, guru.
- Dashboard siswa: latihan adaptif, dua ujian, kuis langsung, pengingat, pasang shortcut.
- Dashboard guru: kelola siswa, bank soal + editor, paket + editor, soal sulit, audit, rapor, kuis langsung.
- Review jawaban dengan tombol flag.
- Modal paket/soal, laporan, kuis host/siswa.
- UI diuji dengan mock dan screenshot; build final lolos `node --check`.
- Apps Script iframe kadang kosong di Chrome headless. Gunakan Chrome normal/incognito dengan profil login untuk verifikasi visual live.
- Deployment final: **versi 39**.
- Uji UI final: mobile 390px tanpa overflow, panel pasang shortcut tampil, modal panduan tampil, tautan rapor hanya muncul di panel yang sesuai.

## Pembaruan v3.1: link aplikasi dan mobile-first

### Link aplikasi

- Link resmi aplikasi: `https://script.google.com/macros/s/AKfycbw6FaGYiLy_kG8Q56EEHGwIEGufCOfrfArKPKtpSCxI5x4Qz-P5EJYGSvUw3QkSOp3J/exec`.
- Uji URL dengan User-Agent Android: HTTP 200, **0 redirect**, akses deployment `ANYONE_ANONYMOUS`. URL `/exec` tidak mengarah ke Google Drive.
- Tautan yang memang membuka Google Drive adalah link Google Sheets, tautan laporan PDF/Excel, dan folder Drive. Karena itu UI sekarang memisahkan **Bagikan aplikasi** dari **Data kelas** dan memberi catatan bahwa link Google Sheet/laporan bukan link siswa.
- Panel **Bagikan aplikasi** di Pengaturan guru dan tombol **Bagikan aplikasi** di dashboard menyalin atau membagikan link `/exec`, bukan `window.location.href`.
- Tombol **Salin link** dan **Bagikan** diuji; copy menampilkan toast "Link aplikasi disalin. Bagikan link ini, bukan link Google Drive."

### Mobile-first

- Tampilan diuji pada 320, 390, 768, dan 1440 px. Tidak ada horizontal overflow.
- Semua tombol dan tautan yang diuji memiliki target sentuh minimal 44 px.
- Login ponsel memprioritaskan formulir; daftar contoh rumus disembunyikan di bawah 680 px.
- Statistik guru menjadi grid 2x2; aksi guru menjadi grid 2 kolom; baris siswa menumpuk.
- Footer kuis menempel di bawah layar dengan padding aman `env(safe-area-inset-bottom)`; toast digeser agar tidak menutup tombol.
- Modal memakai tombol selebar layar dan susunan terbalik agar aksi utama dekat jempol.
- Tema gelap diuji pada 390 px: tidak ada overflow, target tetap 44 px, kontras mengikuti variabel tema.

## Batasan

- 40 siswa pada kuis langsung melakukan polling 3 detik; perlu uji beban.
- Apps Script tidak bisa service worker; shortcut bukan PWA offline.
- Laporan adalah Google Sheets dengan tautan ekspor PDF/XLSX; bukan file yang disimpan ke folder khusus.
- Tautan laporan mengikuti akses akun Google pemilik data. Jika dibuka dari akun lain, atur berbagi file laporan.
- Notifikasi browser hanya saat tab terbuka; pengingat kalender adalah pengingat utama.
- Login memakai nama + PIN, bukan akun Google siswa.
- Jangan mengubah `questionIds` atau `optionOrder` attempt lama.

## Pembaruan v3.2: multi-akun Google dan perbaikan refresh

### Temuan 1: link mengarah ke Drive saat ada beberapa akun Google

- Penyebab: `/exec` adalah halaman Google Apps Script. Dengan beberapa akun Google aktif, Google dapat menampilkan pemilih akun dan mengarahkan ke Drive sebelum aplikasi terbuka. Tidak bisa dihilangkan dari sisi URL `/exec`.
- Solusi permanen: frontend statis di domain sendiri, backend Apps Script lewat `doPost` JSON.
- Tambahan backend: `doPost` dengan whitelist 30 aksi (login, dashboard, attempt, siswa, paket, soal, laporan, kuis langsung).
- File frontend: `standalone/index.html`. Fungsi `api()` memakai `fetch(APP_URL, {method:'POST', body: JSON.stringify({action, args})})`, bukan `google.script.run`.
- Uji cross-origin dari `http://127.0.0.1:8767` ke `/exec`: HTTP 200, JSON terbaca, login `Siswa`/`123456`, dashboard tampil, logout kembali ke login, tanpa error console.
- Hosting gratis: Netlify Drop, GitHub Pages, Cloudflare Pages, atau Vercel. Bagikan URL hosting, bukan `/exec`.

### Temuan 2: login/logout/tambah-edit tidak otomatis

- Akar masalah: blok fungsi kuis langsung hilang dari `Index.html`, sehingga `stopLivePolling()` dan `stopLiveClock()` dipanggil tetapi tidak terdefinisi.
- Dampak: `logout()` gagal sebelum `render()` (harus refresh), dashboard orang tua gagal render, dan tombol kuis langsung tidak berfungsi. Login siswa/guru dan tambah/edit siswa tetap berjalan.
- Perbaikan: mengembalikan 12 fungsi live (`openJoinLive`, `startLiveHost`, `liveLeaderboardMarkup`, `liveTimerMarkup`, `renderLiveHost`, `renderLiveStudent`, `startLivePolling`, `stopLivePolling`, `startLiveClock`, `stopLiveClock`, `updateLiveTimerDisplay`, `liveAction`) ke `Index.html`.
- Uji: login siswa, logout kembali ke login, dashboard orang tua tampil, kuis langsung lobby ke soal, tambah siswa 4 menjadi 5 baris tanpa refresh. Tanpa exception.

## Pembaruan v3.4

- Bank soal: 306 soal + hasil generate = 311 soal, 66 di antaranya soal cerita (skill `logika`).
- Review soal AI: hasil generate (Gemini dan offline) masuk status draf (`active=false`), guru mengaktifkan setelah ditinjau.
- Generator offline: `generateOfflineQuestions` membuat soal berhitung dari template (bilangan, aljabar, geometri, statistika, perbandingan, fungsi) tanpa API key.
- Filter soal cerita: tombol filter di bank soal (Semua / Soal cerita / Draf).

## Cara melanjutkan

1. Baca dokumen ini, `README.md`, `PROGRESS.md`, dan `DESIGN.md`.
2. Buka web app di Chrome normal dan login guru untuk verifikasi visual.
3. Periksa sheet `Questions` (240), `Packages` (10), `Audit`, dan `LiveSessions`.
4. Jika mengubah kode: `node --check Code.gs`, ekstrak script `Index.html`, lalu `node --check`.
5. Uji dengan siswa uji dan hapus data uji; jangan tinggalkan attempt atau soal uji.
6. Deploy dengan `clasp push --force` lalu `clasp deploy --deploymentId ...`.
7. Jangan menambahkan scope Drive penuh kecuali benar-benar diperlukan; laporan memakai tautan ekspor Sheets.
8. Perbarui dokumen ini dan unggah ulang ke Drive setelah perubahan.

## Rekomendasi v4

1. Impor 40 siswa lewat CSV.
2. Push notification sungguhan via PWA/Cloudflare/FCM.
3. Analitik tren skor dan mastery per topik.
4. Laporan PDF/XLSX yang disimpan ke folder Drive dengan berbagi otomatis.
5. Bank soal yang bisa dikurasi per kelas.
6. Uji beban 40 siswa untuk ujian dan kuis langsung.
