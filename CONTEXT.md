# Sapa Warga — Konteks Proyek

## Stack
- **Frontend**: React + TypeScript + Vite (port 3000)
- **Backend**: Node.js + Express (port 5000)
- **Database**: MySQL (`sapa_warga`)
- **Styling**: Tailwind CSS + Framer Motion

## Menjalankan
```bash
# Frontend
cd /home/nmd/Dev/sapa-warga && npm run dev

# Backend
cd /home/nmd/Dev/sapa-warga/backend/src && node index.js
```

## Konfigurasi DB (`backend/.env`)
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=@Moriarty123
DB_NAME=sapa_warga
```

## Struktur Penting

### Frontend (`src/`)
| File | Fungsi |
|------|--------|
| `pages/LandingPage.tsx` | Halaman publik (load data dari API/DB) |
| `pages/WargaDashboard.tsx` | Dashboard warga login |
| `pages/AdminDashboard.tsx` | Dashboard admin (~4300 baris) |
| `lib/api.ts` | Helper fetch + `suratTypesApi` CRUD |
| `lib/cmsService.ts` | CMS: hero, vision, gallery, testimonials, info |
| `lib/configService.ts` | Config RT (nama desa, RT/RW, dll) |
| `constants.ts` | Fallback `SURAT_TYPES` jika DB tidak tersedia |
| `types.ts` | Semua interface TypeScript |

### Backend (`backend/src/`)
| File | Fungsi |
|------|--------|
| `index.js` | Express server entry point |
| `routes/config.js` | GET/POST/PUT/DELETE surat-types, app_config, notif |
| `routes/surat.js` | CRUD pengajuan surat |
| `routes/cms.js` | CMS content dinamis (hero, vision, dll) |
| `config/database.js` | Koneksi MySQL |
| `config/seed.js` | Seed data awal |
| `middleware/auth.js` | JWT auth + `adminOnly` middleware |

### Database Tabel Utama
| Tabel | Isi |
|-------|-----|
| `users` | Akun warga & admin |
| `surat_types` | Template surat (+ kolom `category`) |
| `pengajuan_surat` | Pengajuan surat dari warga |
| `app_config` | Config RT (nama, logo, dll) |
| `cms_content` | Konten landing page dinamis (JSON) |
| `info_rt` | Kabar RT / papan informasi |
| `notifications` | Notifikasi per user |

## Fitur yang Sudah Dikerjakan

### Sistem Surat
- `surat_types.category` = `PENGANTAR | KETERANGAN | IJIN`
- 7 Surat Pengantar, 3 Surat Keterangan, 1 Surat Ijin
- Frontend (admin & warga) load dari API → sinkron dengan DB
- Admin bisa: tambah template, edit (nama/deskripsi/kategori/blocks), pindah kategori, hapus
- Warga: lihat surat grouped by category, warna berbeda per kategori

### Admin Dashboard Tab: `TEMPLATES` (Format Surat)
- Grouped by category dengan header + warna unik
- Tombol "Tambah di sini" per kategori
- Dropdown pindah kategori per template card
- Tombol hapus template
- Tombol "Kategori Baru" → buat kategori custom

### TemplateVisualEditor
- Header editable: nama, kategori, deskripsi langsung di navbar
- Drag & drop blocks (DnD Kit)
- Save → API PUT ke `/config/surat-types/:id`

### CMS Landing Page
- Seluruh konten landing page dari DB (tabel `cms_content`)
- Admin bisa edit di tab CMS: stats, features, steps, CTA, masalah/solusi

### Warga Dashboard
- Kabar RT / Papan Informasi: **tidak menampilkan gambar** (hanya teks)
- Surat types load dari API (sinkron dengan admin)

## CORS Backend
Diizinkan: `localhost:3000`, `localhost:5173`, `localhost:5174`

## Catatan Teknis
- `AdminDashboard.tsx` sangat besar (~4300 baris), hati-hati saat edit
- `suratTypesApi` ada di `src/lib/api.ts`
- Error TypeScript di `LandingPage.tsx` (key prop) adalah pre-existing, bukan blocker
- Backend pakai JWT di header `Authorization: Bearer <token>`
