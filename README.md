# ✅ Taskflow — Smart Todo List

Aplikasi Todo List modern dengan desain premium, fitur lengkap, dan **100% gratis** tanpa backend.

## 🌐 Demo Online

Deploy ke GitHub Pages: `Settings → Pages → Source: main branch → / (root)`

## ✨ Fitur

- ✅ **CRUD Lengkap** — Tambah, edit, hapus, dan tandai selesai
- 🔍 **Pencarian** — Cari tugas secara real-time
- 🏷️ **Prioritas & Kategori** — Rendah/Sedang/Tinggi, Personal/Kerja/Belajar/dll
- 📅 **Tenggat Waktu** — Set deadline dengan indikator overdue
- 📊 **Dashboard Statistik** — Progress ring & counter
- 💾 **Export/Import JSON** — Backup & restore data
- 🌙 **Dark Mode** — Desain gelap premium
- 📱 **Responsive** — Berjalan di semua perangkat
- ⚡ **Tanpa Backend** — Data disimpan di localStorage (JSON)

## 🗄️ Database

Menggunakan **localStorage** sebagai database JSON yang gratis:
- Data tersimpan di browser secara permanen
- Format JSON — mudah di-export/import
- Tidak perlu server atau database eksternal
- Cocok untuk hosting statis (GitHub Pages)

## 🚀 Cara Deploy ke GitHub Pages

1. **Buat repository baru** di GitHub
2. **Push kode ini** ke repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/USERNAME/REPO.git
   git push -u origin main
   ```
3. **Aktifkan GitHub Pages**:
   - Buka Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main` / `/ (root)`
   - Klik Save
4. **Selesai!** Akses di `https://USERNAME.github.io/REPO`

## 📁 Struktur File

```
todo-list/
├── index.html   — Halaman utama
├── style.css    — Styling (dark theme, glassmorphism)
├── app.js       — Logika aplikasi & database
└── README.md    — Dokumentasi
```

## 🛠️ Teknologi

- HTML5 + CSS3 + Vanilla JavaScript
- localStorage (JSON database)
- Google Fonts (Inter)
- Zero dependencies
