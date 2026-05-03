# ✅ Taskflow — Smart Todo List

Aplikasi Todo List modern dengan **database cloud gratis** (Supabase). Data tersinkronisasi di semua perangkat!

## ✨ Fitur

- ✅ CRUD Lengkap — Tambah, edit, hapus, tandai selesai
- 🔄 **Sinkronisasi lintas perangkat** — Buka di browser manapun, data sama
- 🔍 Pencarian & Filter real-time
- 🏷️ Prioritas & Kategori
- 📅 Tenggat waktu + indikator overdue
- 📊 Dashboard statistik
- 💾 Export/Import JSON
- 🌙 Dark mode premium
- 📱 Responsive

## 🗄️ Setup Database (Supabase — GRATIS)

### Langkah 1: Buat Akun Supabase

1. Buka **https://supabase.com** → Klik **"Start your project"**
2. Login dengan GitHub
3. Klik **"New Project"**
4. Isi nama project (misal: `taskflow`), set password, pilih region `Southeast Asia`
5. Klik **"Create new project"** → Tunggu selesai

### Langkah 2: Buat Tabel `todos`

1. Di dashboard Supabase, buka **SQL Editor** (menu kiri)
2. Klik **"New query"**
3. Paste SQL ini lalu klik **"Run"**:

```sql
CREATE TABLE todos (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    priority TEXT DEFAULT 'medium',
    category TEXT DEFAULT 'personal',
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk query berdasarkan username
CREATE INDEX idx_todos_username ON todos(username);

-- Aktifkan Row Level Security
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Policy: Semua orang bisa CRUD (menggunakan anon key)
CREATE POLICY "Allow all operations" ON todos
    FOR ALL
    USING (true)
    WITH CHECK (true);
```

### Langkah 3: Ambil URL dan Key

1. Buka **Settings** → **API** (di sidebar kiri)
2. Catat:
   - **Project URL** — `https://xxxxxxx.supabase.co`
   - **anon public key** — `eyJhbGciOiJIUzI1NiIs...`

### Langkah 4: Konfigurasi di Aplikasi

1. Buka aplikasi Taskflow
2. Akan muncul modal **"Setup Supabase"**
3. Masukkan **URL** dan **Anon Key**
4. Klik **Simpan**
5. Masukkan username → Mulai menggunakan!

> 💡 **Gunakan username yang sama** di semua perangkat untuk sinkronisasi data.

## 🚀 Deploy ke GitHub Pages

```bash
git add .
git commit -m "Add Supabase database"
git push origin main
```

Buka: Settings → Pages → Source: `main` → Save

Akses di: `https://wahyudi-komite.github.io/todo-list`

## 📁 Struktur File

```
todo-list/
├── index.html   — Halaman utama + login
├── style.css    — Styling premium
├── app.js       — Logika + Supabase integration
└── README.md    — Dokumentasi
```

## 🛠️ Teknologi

- HTML5 + CSS3 + Vanilla JavaScript
- **Supabase** (PostgreSQL database — free tier)
- Google Fonts (Inter)
- Zero npm dependencies
