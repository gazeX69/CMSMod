# Aturan Pengembangan CMS Modern

## Arah Produk

Modern CMS adalah CMS berbasis TypeScript yang terinspirasi oleh fleksibilitas WordPress, tetapi dirancang dengan arsitektur modular modern.

Produk harus dimulai dari yang kecil:
- manajemen konten
- dasbor admin
- rendering publik
- manajemen media
- fondasi tema
- arsitektur siap plugin

Jangan membangun fitur marketplace, cloud SaaS, pembuat AI, forum, streaming, LMS, atau e-commerce sebelum inti CMS stabil.

## Arah Teknologi

Inti:
- Node.js
- TypeScript
- Fastify
- MySQL/MariaDB
- React + Vite

Basis data lokal saat ini:
- XAMPP MariaDB/MySQL

Infrastruktur opsional di masa mendatang:
- PostgreSQL
- Redis
- penyimpanan objek yang kompatibel dengan S3
- pekerja antrian
- mesin pencari

Alat-alat di masa mendatang ini tidak boleh ditambahkan sebelum dibutuhkan.

## Aturan Agen AI

Agen AI dapat membantu mengimplementasikan kode, tetapi tidak boleh menjalankan perintah Git.

Dilarang untuk Agen AI:
- git add
- git commit
- git push
- git reset
- git restore
- git clean
- git checkout

Pengembang manusia menangani Git secara manual.

## Prinsip Pengembangan

Lakukan perubahan kecil yang tervalidasi.

Setiap fase harus mencakup:
- file yang diubah
- apa yang diimplementasikan
- perintah validasi
- batasan yang diketahui
- fase selanjutnya yang direkomendasikan