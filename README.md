# FiqihAI — Sistem Tanya Jawab & Rujukan Fiqih Kontemporer

> **Tugas Praktikum Pengembangan Aplikasi Web (PPAW) — Week 7 s.d. Week 9**  
> **Kelas:** E (Kelompok 4)  
> **Metode SDLC:** Waterfall  
> **Arsitektur:** Model-View-Controller (MVC) — Express.js, EJS, Tailwind CSS (CDN), PostgreSQL, Google Gemini AI

---

## 📌 Deskripsi Proyek

**FiqihAI** adalah aplikasi web sistem tanya jawab dan katalog rujukan fiqih kontemporer berbasis kecerdasan buatan (Google Gemini AI & RAG berbasis PostgreSQL).

Perkembangan tiap minggu:
1. **Week 7 (Frontend, REST API, & Logger):** Halaman EJS + Tailwind CSS, status server live (`GET /api/status`), katalog awal (`GET /api/produk`), serta middleware logger (`middlewares/logger.js`) yang mencatat setiap HTTP request ke terminal dan `logs/logger.md`.
2. **Week 8 (PostgreSQL & CRUD Produk):** Migrasi katalog produk ke PostgreSQL (`config/database.js`, `schema.sql`), query `async/await` pada `models/produkModel.js`, dan CRUD penuh (`POST`, `PUT`, `DELETE` `/api/produk`) beserta modal di `views/index.ejs`.
3. **Week 9 (Chatbot AI & RAG Korpus PDF):** Antarmuka obrolan (`GET /chat` / `views/chat.ejs`), endpoint `POST /api/chat` dengan guardrail input (`middlewares/validateChatInput.js`), pengambilan konteks katalog + potongan PDF (`models/chatModel.js`, tabel `fatwa_chunk`), serta integrasi Gemini API dengan *fallback model* dan sitasi sumber (`services/geminiService.js`).

---

## 🚀 Cara Menjalankan

1. **Pasang Dependensi**:
   ```bash
   npm install
   ```

2. **Siapkan Database PostgreSQL**:
   Buat database (misalnya `fiqih_ai`) lalu jalankan DDL & seed data dari [schema.sql](schema.sql) (membuat tabel `produk` dan `fatwa_chunk`).

3. **Konfigurasi Environment (`.env`)**:
   Salin `.env.example` menjadi `.env` dan sesuaikan kredensial database serta API key Gemini:
   ```env
   DB_USER=postgres
   DB_HOST=localhost
   DB_NAME=fiqih_ai
   DB_PASSWORD=your_password
   DB_PORT=5432
   PORT=3000

   # Google Gemini
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_MODEL=gemini-flash-lite-latest
   GEMINI_FALLBACK_MODEL=gemini-3.1-flash-lite
   ```
   Untuk memeriksa daftar model Gemini yang aktif pada API key Anda:
   ```bash
   npm run models
   ```

4. **Impor Korpus PDF ke Tabel `fatwa_chunk`**:
   Letakkan file PDF di folder `./pdf`, lalu jalankan:
   ```bash
   npm run import-pdf
   ```

5. **Jalankan Aplikasi**:
   ```bash
   npm start
   # atau untuk mode auto-reload (development):
   npm run dev
   ```

6. **Akses Browser**:
   - Halaman Utama & Katalog: `http://localhost:3000/`
   - Halaman Chatbot AI: `http://localhost:3000/chat`

---

## 📡 Daftar Endpoint API & Halaman

| Endpoint | Method | Keterangan | Format Respon |
|---|---|---|---|
| `/` | `GET` | Halaman Web Utama & Katalog Modul FiqihAI | HTML (`views/index.ejs`) |
| `/chat` | `GET` | Halaman Chatbot AI Tanya Fiqih | HTML (`views/chat.ejs`) |
| `/api/status` | `GET` | Status server, uptime, dan metadata proyek | JSON |
| `/api/produk` | `GET` | Daftar seluruh modul fiqih (`?format=array` untuk array murni) | JSON |
| `/api/produk/:id` | `GET` | Detail satu modul berdasarkan ID | JSON |
| `/api/produk` | `POST` | Tambah modul baru ke PostgreSQL | JSON |
| `/api/produk/:id` | `PUT` | Perbarui modul berdasarkan ID | JSON |
| `/api/produk/:id` | `DELETE` | Hapus modul berdasarkan ID | JSON |
| `/api/chat` | `POST` | Kirim pertanyaan fiqih ke Gemini AI + konteks RAG | JSON (`{ success, data: { reply, sources } }`) |

---

## 🪵 Middleware Logger

Setiap request yang masuk dicatat secara *real-time*:
- **Terminal Backend / Console**:  
  `[2026-11-15T09:00:00.000Z] POST /api/chat - Status: 200 (1850.0 ms)`
- **File Rekaman**:  
  Tersimpan dalam tabel format Markdown di file `logs/logger.md`.

---

## 📁 Struktur Folder

```text
Fiqih-ChatbotAI/
├── config/             # Konfigurasi aplikasi, database PostgreSQL, dan Gemini AI
├── controllers/        # Logika endpoint (apiController, homeController, chatController)
├── logs/               # Rekaman log HTTP request (logger.md)
├── middlewares/        # Middleware logger & guardrail input chat (validateChatInput.js)
├── models/             # Query PostgreSQL (produkModel.js, chatModel.js)
├── pdf/                # Korpus PDF fiqih sumber chunking fatwa_chunk
├── routes/             # Pemetaan route web & API (web.js, api.js, chat.js, index.js)
├── scripts/            # Utilitas CLI (importPdf.js, listModels.js)
├── services/           # Integrasi Google Gemini API & penyusunan konteks (geminiService.js)
├── utils/              # Fungsi pembantu reusable (formatRupiah, logger helper)
├── views/              # Template EJS (index.ejs, chat.ejs, dan partials/)
├── .env.example        # Contoh variabel environment
├── app.js              # Entry point Express & server
├── schema.sql          # Skema tabel PostgreSQL (produk & fatwa_chunk)
├── server.js           # Delegasi backward-compatibility ke app.js
└── package.json        # Manifest proyek, dependencies, & npm scripts
```

---

## 💡 Alasan Pemilihan Metode Waterfall

> *"Kami memilih metode Waterfall karena alur kerjanya linier dan terstruktur, sehingga spesifikasi sistem dapat dikunci di awal untuk mencegah pembesaran yang tidak diinginkan pada ruang lingkup."*

Metode ini menjaga agar batasan korpus rujukan, validasi input, dan arsitektur API terdefinisi dengan rapi sebelum tahap pengkodean dan integrasi model AI dilakukan.
