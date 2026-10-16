/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SuratType, InfoRT } from './types';

export const SURAT_TYPES: SuratType[] = [
  // ===== SURAT PENGANTAR =====
  {
    id: 'pengantar-nik',
    name: 'Surat Pengantar Pembuatan NIK Baru',
    category: 'PENGANTAR',
    description: 'Khusus bagi penduduk dewasa yang baru pertama kali terdaftar.',
    template: 'SURAT PENGANTAR NIK',
    blocks: [
      { id: 'h1', type: 'HEADER' },
      { id: 't1', type: 'TITLE', content: 'SURAT PENGANTAR PEMBUATAN NIK' },
      { id: 'p1', type: 'PARAGRAPH', content: 'Yang bertanda tangan di bawah ini, Ketua RT.{{RT}} RW.{{RW}} Kelurahan {{KELURAHAN}} Kecamatan {{KECAMATAN}} {{KOTA}}, menerangkan bahwa:' },
      { id: 'dg1', type: 'DATA_GRID', config: { fields: ['1. NIK', '2. Nama', '3. Tempat/Tgl Lahir', '4. Jenis Kelamin', '5. Alamat', '6. Agama', '7. Status Pernikahan', '8. Pekerjaan'] } },
      { id: 'p2', type: 'PARAGRAPH', content: 'Adalah benar yang bersangkutan warga kami dan bermaksud untuk mengajukan pembuatan NIK Baru.' },
      { id: 'p3', type: 'PARAGRAPH', content: 'Demikian surat pengantar ini dibuat untuk dapat dipergunakan sebagaimana mestinya.' },
      { id: 's1', type: 'SIGNATURE' }
    ]
  },
  {
    id: 'pengantar-akta-lahir',
    name: 'Surat Pengantar Akta Kelahiran',
    category: 'PENGANTAR',
    description: 'Diperlukan jika proses persalinan dilakukan di rumah.',
    template: 'SURAT PENGANTAR AKTA LAHIR',
    blocks: [
      { id: 'h1', type: 'HEADER' },
      { id: 't1', type: 'TITLE', content: 'SURAT PENGANTAR AKTA KELAHIRAN' },
      { id: 'p1', type: 'PARAGRAPH', content: 'Ketua RT.{{RT}} RW.{{RW}} Kelurahan {{KELURAHAN}} Kecamatan {{KECAMATAN}} {{KOTA}}, menerangkan bahwa telah lahir seorang anak dari:' },
      { id: 'dg1', type: 'DATA_GRID', config: { fields: ['Nama Ayah', 'Nama Ibu', 'Alamat'] } },
      { id: 'p2', type: 'PARAGRAPH', content: 'Data Anak:' },
      { id: 'dg2', type: 'DATA_GRID', config: { fields: ['Nama Anak', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal/Waktu Lahir'] } },
      { id: 'p3', type: 'PARAGRAPH', content: 'Surat ini dibuat sebagai pengantar untuk pengurusan Akta Kelahiran.' },
      { id: 's1', type: 'SIGNATURE' }
    ]
  },
  {
    id: 'pengantar-kematian',
    name: 'Surat Pengantar Akta Kematian',
    category: 'PENGANTAR',
    description: 'Dibutuhkan apabila ada warga yang meninggal dunia di rumah.',
    template: 'SURAT PENGANTAR AKTA KEMATIAN',
    blocks: [
      { id: 'h1', type: 'HEADER' },
      { id: 't1', type: 'TITLE', content: 'SURAT PENGANTAR AKTA KEMATIAN' },
      { id: 'p1', type: 'PARAGRAPH', content: 'Yang bertanda tangan di bawah ini, Ketua RT.{{RT}} RW.{{RW}} Kelurahan {{KELURAHAN}}, menerangkan bahwa:' },
      { id: 'dg1', type: 'DATA_GRID', config: { fields: ['Nama Almarhum/ah', 'NIK', 'Alamat'] } },
      { id: 'p2', type: 'PARAGRAPH', content: 'Telah meninggal dunia pada:' },
      { id: 'dg2', type: 'DATA_GRID', config: { fields: ['Hari/Tanggal', 'Tempat Meninggal', 'Penyebab'] } },
      { id: 'p3', type: 'PARAGRAPH', content: 'Surat ini sebagai pengantar pengurusan Akta Kematian.' },
      { id: 's1', type: 'SIGNATURE' }
    ]
  },
  {
    id: 'pengantar-pindah',
    name: 'Surat Pengantar Pindah Domisili',
    category: 'PENGANTAR',
    description: 'Masuk Data Mutasi Penduduk.',
    template: 'SURAT PENGANTAR PINDAH',
    blocks: [
      { id: 'h1', type: 'HEADER' },
      { id: 't1', type: 'TITLE', content: 'SURAT PENGANTAR PINDAH' },
      { id: 'p1', type: 'PARAGRAPH', content: 'Yang bertanda tangan di bawah ini, Ketua RT.{{RT}} RW.{{RW}} Kelurahan {{KELURAHAN}} Kecamatan {{KECAMATAN}} {{KOTA}}, menerangkan bahwa:' },
      { id: 'dg1', type: 'DATA_GRID', config: { fields: ['1. NIK', '2. Nama', '3. Tempat/Tgl Lahir', '4. Jenis Kelamin', '5. Alamat', '6. Agama', '7. Status Pernikahan', '8. Pekerjaan'] } },
      { id: 'p2', type: 'PARAGRAPH', content: 'Adalah benar yang bersangkutan adalah warga kami yang akan pindah domisili ke alamat {{ALAMAT_TUJUAN}} dengan alasan {{ALASAN_PINDAH}}.' },
      { id: 'p3', type: 'PARAGRAPH', content: 'Surat pengantar ini diberikan untuk melengkapi persyaratan mutasi kependudukan.' },
      { id: 'p4', type: 'PARAGRAPH', content: 'Demikian surat keterangan ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.' },
      { id: 's1', type: 'SIGNATURE' }
    ]
  },
  {
    id: 'pengantar-skck',
    name: 'Surat Pengantar SKCK',
    category: 'PENGANTAR',
    description: 'Beberapa daerah masih mensyaratkan pengantar RT sebagai langkah awal verifikasi lingkungan.',
    template: 'SURAT PENGANTAR SKCK',
    blocks: [
      { id: 'h1', type: 'HEADER' },
      { id: 't1', type: 'TITLE', content: 'SURAT PENGANTAR SKCK' },
      { id: 'p1', type: 'PARAGRAPH', content: 'Yang bertanda tangan di bawah ini, Ketua RT.{{RT}} RW.{{RW}}, menerangkan bahwa:' },
      { id: 'dg1', type: 'DATA_GRID', config: { fields: ['Nama', 'NIK', 'Alamat', 'Keperluan'] } },
      { id: 'p2', type: 'PARAGRAPH', content: 'Selama berdomisili di lingkungan kami, yang bersangkutan berkelakuan baik dan tidak pernah terlibat tindakan kriminal.' },
      { id: 'p3', type: 'PARAGRAPH', content: 'Surat pengantar ini dibuat untuk persyaratan pengurusan SKCK.' },
      { id: 's1', type: 'SIGNATURE' }
    ]
  },
  {
    id: 'pengantar-kk',
    name: 'Pengantar Perubahan Kartu Keluarga (KK)',
    category: 'PENGANTAR',
    description: 'Digunakan sebagai syarat awal saat ada penambahan atau pengurangan anggota keluarga di tingkat kelurahan.',
    template: 'SURAT PENGANTAR KK',
    blocks: [
      { id: 'h1', type: 'HEADER' },
      { id: 't1', type: 'TITLE', content: 'SURAT PENGANTAR PERUBAHAN KK' },
      { id: 'p1', type: 'PARAGRAPH', content: 'Menerangkan bahwa warga berikut bermaksud melakukan perubahan data Kartu Keluarga:' },
      { id: 'dg1', type: 'DATA_GRID', config: { fields: ['Nama Kepala Keluarga', 'No KK', 'Alamat', 'Alasan Perubahan'] } },
      { id: 'p2', type: 'PARAGRAPH', content: 'Demikian untuk dipergunakan sebagaimana mestinya.' },
      { id: 's1', type: 'SIGNATURE' }
    ]
  },
  {
    id: 'pengantar-nikah',
    name: 'Surat Pengantar Nikah',
    category: 'PENGANTAR',
    description: 'Pengantar untuk proses pernikahan di KUA.',
    template: 'SURAT PENGANTAR NIKAH',
    blocks: [
      { id: 'h1', type: 'HEADER' },
      { id: 't1', type: 'TITLE', content: 'SURAT PENGANTAR NIKAH' },
      { id: 'dg1', type: 'DATA_GRID', config: { fields: ['Nama Calon', 'NIK', 'Alamat', 'Bin / Binti'] } },
      { id: 'p1', type: 'PARAGRAPH', content: 'Adalah benar warga kami yang akan melangsungkan pernikahan.' },
      { id: 's1', type: 'SIGNATURE' }
    ]
  },
  // ===== SURAT KETERANGAN =====
  {
    id: 'ket-domisili',
    name: 'Surat Keterangan Domisili',
    category: 'KETERANGAN',
    description: 'Untuk membuktikan bahwa seseorang benar-benar tinggal di wilayah tersebut bagi warga pendatang atau urusan tertentu.',
    template: 'SURAT KETERANGAN DOMISILI',
    blocks: [
      { id: 'h1', type: 'HEADER' },
      { id: 't1', type: 'TITLE', content: 'SURAT KETERANGAN DOMISILI' },
      { id: 'p1', type: 'PARAGRAPH', content: 'Yang bertanda tangan di bawah ini, Ketua RT.{{RT}} RW.{{RW}} Kelurahan {{KELURAHAN}} Kecamatan {{KECAMATAN}} {{KOTA}}, menerangkan bahwa:' },
      { id: 'dg1', type: 'DATA_GRID', config: { fields: ['1. NIK', '2. Nama', '3. Tempat/Tgl Lahir', '4. Jenis Kelamin', '5. Alamat', '6. Agama', '7. Status Pernikahan', '8. Pekerjaan'] } },
      { id: 'p2', type: 'PARAGRAPH', content: 'Adalah benar yang bersangkutan berdomisili di alamat tersebut sejak tahun {{TAHUN_DOMISILI}} hingga saat ini.' },
      { id: 'p3', type: 'PARAGRAPH', content: 'Surat keterangan domisili ini diberikan untuk keperluan: {{KEPERLUAN}}.' },
      { id: 'p4', type: 'PARAGRAPH', content: 'Demikian surat keterangan ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.' },
      { id: 's1', type: 'SIGNATURE' }
    ]
  },
  {
    id: 'ket-sktm',
    name: 'Surat Keterangan Tidak Mampu (SKTM)',
    category: 'KETERANGAN',
    description: 'Pengantar bagi warga yang membutuhkan bantuan sosial atau keringanan biaya pendidikan/kesehatan.',
    template: 'SURAT KETERANGAN TIDAK MAMPU',
    blocks: [
      { id: 'h1', type: 'HEADER' },
      { id: 't1', type: 'TITLE', content: 'SURAT KETERANGAN TIDAK MAMPU' },
      { id: 'p1', type: 'PARAGRAPH', content: 'Yang bertanda tangan di bawah ini, Ketua RT.{{RT}} RW.{{RW}} Kelurahan {{KELURAHAN}} Kecamatan {{KECAMATAN}} {{KOTA}}, menerangkan bahwa:' },
      { id: 'dg1', type: 'DATA_GRID', config: { fields: ['1. NIK', '2. Nama', '3. Tempat/Tgl Lahir', '4. Jenis Kelamin', '5. Alamat', '6. Agama', '7. Status Pernikahan', '8. Pekerjaan'] } },
      { id: 'p2', type: 'PARAGRAPH', content: 'Adalah benar yang bersangkutan berdomisili di alamat tersebut dan berdasarkan penilaian kami, termasuk dalam kategori keluarga tidak mampu.' },
      { id: 'p3', type: 'PARAGRAPH', content: 'Surat keterangan ini diberikan untuk keperluan: {{KEPERLUAN}}.' },
      { id: 'p4', type: 'PARAGRAPH', content: 'Demikian surat keterangan ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.' },
      { id: 's1', type: 'SIGNATURE' }
    ]
  },
  {
    id: 'ket-usaha',
    name: 'Surat Keterangan Izin Usaha',
    category: 'KETERANGAN',
    description: 'Diperlukan bagi warga yang ingin membuka usaha kecil di lingkungan rumah.',
    template: 'SURAT KETERANGAN USAHA',
    blocks: [
      { id: 'h1', type: 'HEADER' },
      { id: 't1', type: 'TITLE', content: 'SURAT KETERANGAN USAHA' },
      { id: 'p1', type: 'PARAGRAPH', content: 'Yang bertanda tangan di bawah ini, Ketua RT.{{RT}} RW.{{RW}} Kelurahan {{KELURAHAN}} Kecamatan {{KECAMATAN}} {{KOTA}}, menerangkan bahwa:' },
      { id: 'dg1', type: 'DATA_GRID', config: { fields: ['Nama', 'NIK', 'Tempat / Tgl Lahir', 'Jenis Kelamin', 'Agama', 'Status Pernikahan', 'Pekerjaan', 'Alamat'] } },
      { id: 'p2', type: 'PARAGRAPH', content: 'Adalah benar-benar penduduk/warga kami yang memiliki usaha dengan jenis {{USAHA_JENIS}} yang berlokasi di {{USAHA_ALAMAT}}.' },
      { id: 'p3', type: 'PARAGRAPH', content: 'Demikian surat keterangan ini kami buat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.' },
      { id: 's1', type: 'SIGNATURE' }
    ]
  },
  // ===== SURAT IJIN =====
  {
    id: 'ijin-keramaian',
    name: 'Surat Izin Keramaian',
    category: 'IJIN',
    description: 'Pengantar untuk warga yang akan mengadakan acara besar seperti hajatan di lingkungan sekitar.',
    template: 'SURAT IZIN KERAMAIAN',
    blocks: [
      { id: 'h1', type: 'HEADER' },
      { id: 't1', type: 'TITLE', content: 'SURAT IZIN KERAMAIAN' },
      { id: 'p1', type: 'PARAGRAPH', content: 'Yang bertanda tangan di bawah ini, Ketua RT.{{RT}} RW.{{RW}} Kelurahan {{KELURAHAN}} Kecamatan {{KECAMATAN}} {{KOTA}}, menerangkan bahwa:' },
      { id: 'dg1', type: 'DATA_GRID', config: { fields: ['1. NIK', '2. Nama', '3. Tempat/Tgl Lahir', '4. Jenis Kelamin', '5. Alamat', '6. Agama', '7. Status Pernikahan', '8. Pekerjaan'] } },
      { id: 'p2', type: 'PARAGRAPH', content: 'Adalah benar yang bersangkutan berdomisili di alamat tersebut dan berencana untuk mengadakan acara {{KEPERLUAN}} pada:' },
      { id: 'dg2', type: 'DATA_GRID', config: { fields: ['Hari/Tanggal', 'Waktu', 'Tempat'] }, padding: 20 },
      { id: 'p3', type: 'PARAGRAPH', content: 'Dengan ini, kami memberikan izin untuk mengadakan acara tersebut dengan catatan tidak mengganggu ketertiban umum dan tetap mematuhi peraturan yang berlaku.' },
      { id: 'p4', type: 'PARAGRAPH', content: 'Demikian surat keterangan ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.' },
      { id: 's1', type: 'SIGNATURE' }
    ]
  }
];

export const INITIAL_INFO: InfoRT[] = [
  {
    id: '1',
    title: 'Kerja Bakti Minggu Ceria',
    content: 'Dihimbau kepada seluruh warga untuk mengikuti kegiatan kerja bakti pada hari Minggu, 4 Mei 2026 pukul 07:00 WIB.',
    date: '2026-04-25',
    type: 'KEGIATAN',
    imageUrl: 'https://images.unsplash.com/photo-1591115765373-520b7a217631?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '2',
    title: 'Pembayaran Iuran Bulanan',
    content: 'Informasi mengenai penagihan iuran keamanan dan kebersihan bulan Mei dapat dilakukan melalui Koordinator masing-masing gang.',
    date: '2026-04-20',
    type: 'PENGUMUMAN'
  },
  {
    id: '3',
    title: 'Laporan Keuangan RT Q1 2026',
    content: 'Laporan keuangan RT untuk periode Januari - Maret 2026 telah tersedia dan dapat dilihat di papan pengumuman atau melalui akun warga.',
    date: '2026-04-15',
    type: 'BERITA'
  }
];
