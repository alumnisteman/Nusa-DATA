# NUSA - Indonesia Business Readiness Intelligence

[![CI](https://github.com/alumnisteman/Nusa-DATA/actions/workflows/ci.yml/badge.svg)](https://github.com/alumnisteman/Nusa-DATA/actions/workflows/ci.yml)
[![Docker Hub](https://img.shields.io/docker/pulls/alumnisteman/nusa-data.svg)](https://hub.docker.com/r/alumnisteman/nusa-data)

> *"Tahu posisi bisnis Anda. Tahu apa yang kurang. Tahu peluang berikutnya."*
> *"Dari Legalitas, Kepatuhan, hingga Peluang Usaha."*

## Visi Produk
NUSA adalah sebuah platform **Business Readiness Intelligence & Procurement Engine** yang membantu perusahaan dan konsultan B2B untuk memahami posisi kepatuhan hukum mereka dan memetakan peluang pengadaan (tender) secara proaktif.

### Fitur Utama:
1. **Business DNA & Reasoning Engine**: Memetakan profil bisnis pengguna hanya dari deskripsi teks (KBLI, Aktivitas Utama, Produk/Jasa).
2. **"What Can I Legally Do?" Engine**: Memeriksa batasan hukum dan syarat perizinan (Bisa dilakukan, Perlu persyaratan, Jangan lakukan).
3. **Business Gap Scanner**: Menganalisis *readiness score* (legalitas, OSS, SDM, pengalaman) dan apa yang kurang dari perusahaan.
4. **Tender Reverse Matching**: Memberikan persentase kecocokan profil perusahaan terhadap paket pengadaan yang ada di e-Procurement.
5. **Tender Gap Simulator**: Simulasi pencapaian syarat tender (misal: "Jika sertifikat X ada, readiness naik menjadi 91%").
6. **Company Digital Twin & Passport**: Profil digital perusahaan yang senantiasa diperbarui, lengkap dengan QR Code verifikasi.
7. **Compliance Time Machine**: Sistem analisis dampak peringatan kedaluwarsa dokumen (H-90, H-60, H-30).
8. **Business Scenario Simulator**: Menghitung dampak jika perusahaan ingin menambah KBLI baru atau ekspansi.

### 🚀 Ide Fitur & Modul Mendatang (Roadmap NUSA)
Berikut adalah beberapa konsep modul lanjutan yang dapat dikembangkan untuk memperkuat kapabilitas NUSA di masa depan:

- **🤖 NUSA AI Business Assistant (Chatbot B2B)**
  Asisten virtual interaktif (seperti ChatGPT) yang dirancang khusus untuk memandu pengguna terkait regulasi, persyaratan OSS, dan kewajiban hukum spesifik sesuai KBLI mereka dengan bahasa yang mudah dipahami.
- **📡 NUSA Procurement Radar (Integrasi LPSE/LKPP)**
  Modul scraper atau integrasi API yang secara otomatis menarik data paket lelang pemerintah. Sistem akan mencocokkan (*auto-match*) syarat kualifikasi tender dengan "Business Passport" pengguna dan memberikan notifikasi *real-time* jika ada lelang yang sangat cocok (High Match).
- **📊 NUSA Tax & Reporting Intelligence**
  Sistem pengingat dan kalkulator pintar untuk kewajiban rutin perusahaan, seperti perhitungan PPN, PPh, serta pengingat tenggat waktu penyampaian Laporan Kegiatan Penanaman Modal (LKPM) berdasarkan skala bisnis dan KBLI.
- **🌍 NUSA Export-Import Gateway**
  Modul khusus untuk perusahaan yang ingin ekspansi ke pasar global. Menyediakan analisis kelayakan (*readiness*) ekspor-impor, mengidentifikasi syarat NIB Kepabeanan, SNI, BPOM, atau izin edar luar negeri yang dibutuhkan.
- **🌱 NUSA ESG Readiness (Environmental, Social, Governance)**
  Banyak perusahaan besar / BUMN kini mewajibkan vendor untuk memiliki standar ESG. Modul ini akan mengukur skor ESG perusahaan UMKM dan memberikan panduan praktis (seperti pengelolaan limbah K3, BPJS Ketenagakerjaan, dll) untuk meningkatkan daya saing lelang.
- **🔐 Digital Document Vault (Brankas Digital Terenkripsi)**
  Penyimpanan awan terenkripsi yang aman untuk dokumen sensitif perusahaan (NIB, NPWP, Akta Pendirian, SK Kemenkumham, Sertifikat ISO). Dilengkapi teknologi OCR cerdas yang bisa otomatis membaca dan mengekstrak tanggal kedaluwarsa dari dokumen yang diunggah.
## Prasyarat Server & Deployment
- Sistem Operasi: Linux (Ubuntu/Debian) atau Windows dengan WSL2
- **Docker** dan **Docker Compose** terinstal (versi terbaru).
- Git (untuk mengunduh pembaruan).

## Panduan Instalasi (Deployment)
1. **Clone Repositori:**
   ```bash
   git clone https://github.com/alumnisteman/Nusa-DATA.git
   cd Nusa-DATA
   ```

2. **Jalankan Aplikasi dengan Docker:**
   Aplikasi ini dibungkus penuh dengan container, sehingga Anda cukup menjalankan perintah berikut dari root proyek:
   ```bash
   docker compose up -d --build
   ```
   *Perintah ini akan membuat container untuk Database (PostgreSQL/PostGIS) dan API (FastAPI).*

3. **Verifikasi Instalasi:**
   Buka peramban (browser) dan akses `http://<IP_SERVER_ANDA>`. 
   Anda akan melihat antarmuka utama NUSA.

## Panduan Pemeliharaan (Maintenance)

Sebagai Administrator, berikut adalah perintah-perintah umum yang sering digunakan untuk pemeliharaan aplikasi:

### 1. Memeriksa Status Layanan
Untuk melihat apakah semua container berjalan dengan baik:
```bash
docker compose ps
```

### 2. Melihat Log Aplikasi (Troubleshooting)
Jika terjadi error (misalnya *502 Bad Gateway* atau error di sisi klien), periksa log dari container API:
```bash
docker compose logs api --tail 50 -f
```
*(Gunakan `Ctrl+C` untuk keluar dari tampilan log).*

### 3. Memperbarui Aplikasi (Update dari GitHub)
Jika ada pembaruan kode terbaru di repositori GitHub, lakukan langkah berikut untuk memperbarui server Anda:
```bash
# 1. Unduh pembaruan terbaru
git pull origin main

# 2. Rebuild dan restart container API di latar belakang (tanpa downtime pada DB)
docker compose up -d --build api
```

### 4. Restart Layanan
Jika aplikasi terasa lambat atau ada konfigurasi yang macet, restart layanan dengan aman:
```bash
docker compose restart api
```

### 5. Mematikan Aplikasi
Jika Anda perlu menghentikan sementara seluruh layanan NUSA:
```bash
docker compose down
```
*(Jangan khawatir, data di database akan tetap aman karena disimpan di dalam Docker Volume).*

---
**Catatan Penting:** 
Jangan pernah menghapus volume database secara manual kecuali Anda berniat melakukan *reset* (hapus data) secara penuh. Jika perlu mereset data: `docker compose down -v`.
