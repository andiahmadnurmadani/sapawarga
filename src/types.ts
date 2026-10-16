/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'WARGA' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  password?: string;
  nik?: string;
  noKK?: string;
  alamat?: string;
  noHp?: string;
  tempatLahir?: string;
  tglLahir?: string;
  jenisKelamin?: string;
  agama?: string;
  statusPernikahan?: string;
  pekerjaan?: string;
  avatar?: string;
}

export type SuratStatus = 'PENDING' | 'DIPROSES' | 'DISETUJUI' | 'DITOLAK';

export type BlockType = 'HEADER' | 'TITLE' | 'PARAGRAPH' | 'DATA_GRID' | 'LINE' | 'SIGNATURE' | 'SPACER';

export interface SuratBlock {
  id: string;
  type: BlockType;
  content?: string;
  config?: any;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  padding?: number;
  paddingLeft?: number;
  paddingRight?: number;
  lineHeight?: number;
  marginTop?: number;
  marginBottom?: number;
  backgroundColor?: string;
  color?: string;
  hidden?: boolean;
  label?: string; // custom nama blok di panel layer
}

export interface FormFieldDefinition {
  id: string;
  label: string;
  type: 'text' | 'date' | 'select' | 'number';
  required?: boolean;
  options?: string[]; // For select type
}

export interface SuratType {
  id: string;
  name: string;
  category?: 'PENGANTAR' | 'KETERANGAN' | 'IJIN';
  description: string;
  template: string;
  blocks?: SuratBlock[];
  formFields?: FormFieldDefinition[];
}

export interface DocumentTemplate {
  id: string;
  name: string;
  content: string; // The markdown/text content with placeholders
  placeholders: string[]; // List of required fields like {{NAME}}, {{NIK}}, etc.
}

export interface PengajuanSurat {
  id: string;
  userId: string;
  userName: string;
  userNik: string;
  typeId: string;
  typeName: string;
  status: SuratStatus;
  createdAt: string;
  updatedAt: string;
  keterangan: string;
  data: Record<string, string>;
  rejectionReason?: string;
  suratContent?: string;
  pdfUrl?: string;
  blocks?: SuratBlock[];
}

export interface InfoRT {
  id: string;
  title: string;
  content: string;
  date: string;
  imageUrl?: string;
  type: 'PENGUMUMAN' | 'BERITA' | 'KEGIATAN' | 'HIMBAUAN' | 'EMERGENCY';
}

export interface Inventory {
  id: string;
  name: string;
  quantity: number;
  condition: 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT';
  source: string;
  dateIn: string;
  remarks?: string;
}

export interface IncidentLog {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  reporter: string;
  imageUrl?: string;
}

export interface WargaReport {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  title: string;
  content: string;
  type: 'SARAN' | 'KELUHAN' | 'LAPORAN';
  isPublic: boolean;
  status: 'BELUM_DITANGANI' | 'SELESAI_DITANGANI';
  createdAt: string;
  imageUrl?: string;
}

export interface TempResident {
  id: string;
  name: string;
  nik: string;
  origin: string;
  purpose: string;
  startDate: string;
  endDate?: string;
  address: string;
  phone: string;
}

export interface AppConfig {
  villageName: string;
  districtName: string;
  cityName: string;
  rtNumber: string;
  rwNumber: string;
  rtLeaderName: string;
  rwLeaderName: string;
  secretaryAddress: string;
  logoUrl?: string;
  logoX?: number;
  logoY?: number;
  signatureUrl?: string;     // Tanda tangan Ketua RT
  rwSignatureUrl?: string;   // Tanda tangan Ketua RW
  maxUploadSizeMb?: number;
  socialMedia?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    youtube?: string;
    whatsapp?: string;
  };
  footerSettings?: {
    manualBookUrl?: string;
    termsAndConditions?: string;
    privacyPolicy?: string;
  };
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SURAT' | 'LAPORAN' | 'SYSTEM';
  isRead: boolean;
  createdAt: string;
  relatedId?: string;
}

export interface CMSHero {
  title: string;
  subtitle: string;
  imageUrl: string;
  updatedAt: string;
}

export interface CMSVision {
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  updatedAt: string;
}

export interface CMSGalleryItem {
  id: string;
  url: string;
  title: string;
  desc: string;
  order: number;
  createdAt: string;
}

export interface CMSTestimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  avatarUrl: string;
  order: number;
  createdAt: string;
}

// ===== IURAN =====
export interface IuranConfig {
  amountPerMonth: number;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  qrisImageUrl?: string;
  notes?: string;
  updatedAt?: string;
}

export type IuranPeriodType = 'MONTH' | 'PERIOD' | 'YEAR';
export type IuranPaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface IuranPayment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  periodType: IuranPeriodType;
  year: number;
  startMonth: number;
  endMonth: number;
  months: number[];
  amountPerMonth: number;
  totalAmount: number;
  proofUrl: string;
  notes?: string;
  status: IuranPaymentStatus;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface IuranSummaryUser {
  userId: string;
  userName: string;
  userAvatar?: string | null;
  paidMonths: number[];
  total: number;
}

export interface IuranSummary {
  year: number;
  totalApproved: number;
  byUser: IuranSummaryUser[];
}
