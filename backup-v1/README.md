# Ruang Hitung

Latihan soal matematika kelas 9 untuk persiapan ujian akhir SMP, dengan ruang monitoring untuk orang tua dan guru.

## Tautan aplikasi

https://script.google.com/macros/s/AKfycbw6FaGYiLy_kG8Q56EEHGwIEGufCOfrfArKPKtpSCxI5x4Qz-P5EJYGSvUw3QkSOp3J/exec

## Kode akses awal

| Peran | Kode |
|---|---|
| Siswa | `SISWA-2049` |
| Orang tua | `ORTU-2049` |
| Guru | `GURU-2049` |

Guru dapat mengganti nama siswa dan ketiga kode akses dari menu **Pengaturan** setelah masuk. Simpan kode baru di tempat yang aman. Kode guru memberi akses penuh ke data dan pengaturan.

## Alur pemakaian

1. Siswa masuk dengan kode siswa, memilih simulasi 60 soal, latihan cepat 20 soal, atau latihan per topik.
2. Jawaban tersimpan otomatis. Timer berjalan di server, jadi waktu tetap dihitung meskipun halaman ditutup.
3. Setelah dikumpulkan, siswa langsung melihat skor dan ketepatan per topik. Kunci jawaban dan pembahasan tetap terkunci.
4. Siswa dapat menekan **Minta kunci pembahasan**.
5. Orang tua atau guru masuk, membuka detail jawaban, lalu menekan **Buka pembahasan**.
6. Setelah dibuka, siswa dapat membaca kunci dan langkah penyelesaian dari halaman hasil atau riwayat.

## Data

Data disimpan di spreadsheet **Ruang Hitung - Data** pada Google Drive akun `[AKUN_GOOGLE_ANDA]`:

https://docs.google.com/spreadsheets/d/1rkEXS5DpVyiXBs64W4vHPF7vhb2kblFn2EIClwcxHU/edit

Lembar data:

- `Questions`: bank 60 soal, kunci, dan pembahasan.
- `Attempts`: daftar latihan, skor, durasi, status pembahasan.
- `Answers`: jawaban siswa per soal.
- `Activity`: catatan aktivitas singkat.

Jangan mengganti nama sheet atau urutan kolom. Untuk mengubah soal, edit sheet `Questions`. Kolom `answerIndex` memakai angka 0 sampai 3 untuk pilihan A sampai D. Perubahan soal muncul paling lambat sekitar 5 menit karena cache.

`questions.json` dan `Questions.gs` adalah sumber awal bank soal, bukan data yang dibaca aplikasi setelah pemasangan. Sumber aktif adalah sheet `Questions`.

## Batasan yang perlu diketahui

- Aplikasi ini dirancang untuk satu siswa dan satu sesi aktif dalam satu waktu.
- Kode akses adalah satu-satunya pintu masuk. Siapa pun yang memiliki kode dapat membuka peran tersebut, jadi bagikan hanya kepada orang yang tepat.
- Tidak ada layanan berbayar. Aplikasi berjalan di Google Apps Script dan Google Sheets, cocok untuk skala satu keluarga atau satu siswa.
- Pembahasan hanya terbuka setelah orang tua atau guru menekannya. Skor tetap terlihat oleh siswa segera setelah submit.

## Struktur proyek

- `Code.gs`: backend Apps Script, sesi, penilaian, monitoring, dan pembukaan kunci.
- `Index.html`: seluruh antarmuka siswa, orang tua, dan guru.
- `Questions.gs`: data awal 60 soal.
- `questions.json`: sumber data soal yang dipakai untuk menyusun `Questions.gs`.
- `appsscript.json`: konfigurasi web app dan izin Google.
- `DESIGN.md`: arah visual dan alasan keputusan desain.

## Deployment

Script ID: `1yUrSfZHXOGI1XYZRLZ8QAzqvhl4SfVvBe0GstJwMyUx6rIVBx6-TkDl1`

Deployment ID: `AKfycbw6FaGYiLy_kG8Q56EEHGwIEGufCOfrfArKPKtpSCxI5x4Qz-P5EJYGSvUw3QkSOp3J`

Perintah pembaruan:

```powershell
clasp push --force
clasp update-deployment AKfycbw6FaGYiLy_kG8Q56EEHGwIEGufCOfrfArKPKtpSCxI5x4Qz-P5EJYGSvUw3QkSOp3J --description "Ruang Hitung v1.1"
```