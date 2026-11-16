# Manual Guru

Panduan untuk guru dalam mengelola Ruang Hitung.

## 1. Masuk sebagai guru

1. Buka aplikasi: https://dfhstores-design.github.io/ruang-hitung-app/
2. Pilih tab **Guru**.
3. Masukkan **kode guru** (default: `GURU-2049`).
4. Tekan **Masuk**.

Setelah masuk, segera ganti kode guru di **Pengaturan** agar tidak dipakai orang lain.

## 2. Dashboard guru

Dashboard menampilkan:

- Jumlah siswa aktif, sesi selesai, dan soal di bank.
- Aktivitas terbaru dari seluruh siswa.
- Tombol aksi utama: **Kelola siswa**, **Bank soal**, **Paket**, **Kuis Langsung**, **Rapor**, **Soal sulit**, **Audit**, **Bagikan aplikasi**, **Pengaturan**.

## 3. Kelola siswa

Buka **Kelola siswa**.

- **Tambah siswa**: klik *Tambah siswa*, isi nama, PIN siswa (4-8 angka), PIN orang tua (4-8 angka), lalu simpan.
- **Edit siswa**: klik *Lihat* atau *Atur siswa*, ubah nama, ganti PIN (kosongkan jika tidak ingin mengubah), atau nonaktifkan akun.
- **Nonaktifkan siswa**: buka siswa, hilangkan centang *Akun siswa aktif*.

Maksimal 40 siswa. PIN disimpan sebagai hash, jadi guru hanya bisa mengatur ulang, tidak bisa melihat PIN lama.

## 4. Bank soal

Buka **Bank soal**.

- **Lihat dan edit soal**: daftar soal tampil di bawah; klik *Edit* untuk mengubah pertanyaan, pilihan, kunci, level, dan pembahasan.
- **Tambah soal manual**: klik *Tambah soal*, isi formulir, simpan.
- **Impor CSV**: klik *Unduh format CSV*, isi file, lalu unggah. Kolom: `topicId`, `id` (opsional), `question`, `difficulty`, `optionA`-`optionD`, `answer`, `solution`.
- **Generate soal otomatis (Gemini)**: klik *Generate soal*, pilih topik, level, jumlah (3/5/10), lalu *Generate*. Soal cerita baru langsung masuk bank dan bisa diedit.

> Untuk generate otomatis, guru harus memasukkan Gemini API key di **Pengaturan → Generator soal** terlebih dahulu.

## 5. Paket latihan dan ujian

Buka **Paket**.

- **Tambah paket**: klik *Tambah paket*, atur nama, mode (latihan/ujian/kuis), jumlah soal, durasi (khusus ujian), strategi level, topik, jadwal mulai dan selesai, serta status aktif.
- **Edit paket**: klik *Edit* pada paket, ubah lalu simpan.

Paket bawaan:

- Latihan Campuran (20 soal), Latihan Singkat (5 soal), latihan per topik (10 soal).
- Simulasi Ujian Akhir (60 soal, 90 menit), Ujian Kilat (20 soal, 30 menit).
- Kuis Langsung (10 soal, 20 detik per soal).

## 6. Soal sulit

Buka **Soal sulit**. Daftar ini menggabungkan soal yang paling sering salah dan soal yang ditandai oleh siswa, orang tua, atau guru. Gunakan untuk memilih materi yang dibahas di kelas.

Guru juga bisa menandai soal dari halaman pembahasan dengan tombol **Tandai untuk dibahas**.

## 7. Rapor PDF dan Excel

Buka **Rapor**.

- **Rapor per siswa**: pilih siswa, klik *Buat rapor siswa*.
- **Rekap kelas**: klik *Buat rekap kelas*.

Hasil berupa tautan **PDF**, **Excel**, dan **spreadsheet**. Tautan ini hanya untuk guru dan memakai akun Google pemilik data.

## 8. Kuis langsung

Buka **Kuis Langsung** dari dashboard.

1. Aplikasi membuat room dengan **kode 6 karakter**.
2. Bagikan kode ke siswa; siswa bergabung lewat menu **Gabung kuis**.
3. Klik **Mulai kuis** saat peserta siap.
4. Setiap soal tampil dengan timer; klik **Tampilkan jawaban** untuk membuka kunci dan leaderboard.
5. Klik **Soal berikutnya** untuk lanjut, atau **Akhiri kuis** saat selesai.

## 9. Audit

Buka **Audit** untuk melihat 100 aktivitas terakhir: login, mulai/submit, buka kunci pembahasan, penandaan soal, perubahan soal/paket, impor, laporan, dan kuis.

## 10. Pengaturan

Buka **Pengaturan**.

- **Bagikan aplikasi**: salin link aplikasi untuk guru dan siswa.
- **Kode guru**: ganti kode guru.
- **Generator soal (Gemini)**: tempel Gemini API key, klik simpan.
- **Data kelas**: buka Google Sheet data internal.
- **Panduan pasang**: cara menambahkan aplikasi ke layar utama.

## Catatan penting

- Jangan bagikan link Google Sheet atau tautan laporan ke siswa; gunakan link aplikasi.
- Kode guru dan PIN harus dijaga kerahasiaannya.
