# Ruang Hitung: arah visual

## Design Read

Reading this as: aplikasi latihan dan monitoring belajar untuk satu siswa SMP kelas 9 dan orang tua/gurunya, dengan bahasa visual buku catatan matematika, dial ENERGY 2 / RHYTHM 2 / MOTION 1.

## Identitas

Ruang Hitung terasa seperti buku latihan yang dirawat baik: kertas krem, tinta biru tua, dan satu aksen terakota untuk tindakan penting. Ruangnya tenang, tetapi tidak dingin. Angka dan langkah pengerjaan menjadi isi utama, bukan dekorasi.

Nama ditulis sebagai wordmark teks. Tidak ada logo, avatar, atau ilustrasi buatan karena belum ada arahan aset dari pemilik produk.

## Palet

- Kertas: `#F6EFE1` untuk latar, `#FFF9EE` untuk permukaan.
- Tinta: `#20304A` untuk teks utama, `#5C6675` untuk teks pendukung.
- Garis: `#D8CDBA` untuk batas dan pemisah.
- Aksen terakota: `#B84A24`. Dipakai hanya untuk tindakan utama, fokus penting, dan penanda waktu hampir habis.
- Status: hijau `#2E6A4F` untuk benar, merah `#A33A32` untuk salah. Warna status selalu disertai teks.

Alasan: krem dan biru tinta meniru kertas dan tinta pulpen, terakota memberi satu titik perhatian tanpa membuat halaman ramai.

## Tipografi

- Judul: Fraunces, serif dengan karakter buku. Alasan: memberi kesan catatan yang disusun, bukan dashboard teknologi.
- Isi: Atkinson Hyperlegible. Alasan: bentuk huruf dirancang untuk keterbacaan, penting bagi siswa yang membaca soal panjang dan orang tua yang memeriksa jawaban.
- Angka skor memakai Fraunces agar terasa seperti angka yang ditulis di margin buku.

## Struktur dan gerak

- Satu fokus per layar: mulai latihan, soal yang sedang dikerjakan, atau skor terbaru.
- Halaman memakai garis margin putus-putus dan label bagian bernomor seperti buku latihan. Ini motif identitas, bukan latar grafis.
- Kartu simulasi lebih besar dari kartu latihan topik. Daftar topik memakai baris, bukan kumpulan kartu identik.
- Gerak dibatasi pada umpan balik tombol, transisi panel, dan perubahan status. Tidak ada animasi berulang.
- Mode terang dan gelap sama-sama berfungsi. Mode gelap memakai kertas malam `#18202C` dan tinta krem, dengan aksen yang lebih terang.

## Keputusan yang disengaja

- Tidak memakai gradien, glow, glassmorphism, atau bayangan pada setiap kartu. Hierarki dibangun dengan ukuran, garis, dan ruang kosong.
- Tidak memakai emoji atau ikon dekoratif. Label teks membawa makna.
- Tidak menampilkan statistik, testimoni, atau angka yang tidak berasal dari data latihan siswa.
- Tema terang adalah default karena identitas kertas, tetapi mode gelap disediakan untuk belajar malam dan diuji penuh.
