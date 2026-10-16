/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Users,
  FileText,
  Megaphone,
  Settings,
  LogOut,
  Search,
  Filter,
  Check,
  X,
  MoreVertical,
  Plus,
  ArrowRight,
  Download,
  Trash2,
  Edit2,
  UserPlus,
  Bell,
  User as UserIcon,
  XCircle,
  CheckCircle2,
  Clock,
  Home,
  Mail,
  Pen,
  History,
  BookOpen,
  ArrowRightLeft,
  Calendar,
  Box,
  AlertTriangle,
  FileSearch,
  Globe,
  ClipboardList,
  Type,
  Table,
  Minus,
  Square,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  GripVertical,
  MoveHorizontal,
  Upload,
  ArrowUp,
  ArrowDown,
  Copy,
  Bold,
  Grid,
  Undo2,
  Redo2,
  Hash,
  PenTool,
  MousePointer2,
  Move,
  Layout,
  ShieldCheck,
  Camera,
  Music,
  Activity,
  Heart,
  Briefcase,
  Truck,
  FolderPlus,
  Lock,
  EyeOff,
  Eye,
  Maximize2,
  Minimize2,
  MoveVertical,
  MapPin,
  Key,
  Wallet
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  User,
  PengajuanSurat,
  InfoRT,
  SuratStatus,
  SuratType,
  Inventory,
  IncidentLog,
  WargaReport,
  TempResident,
  AppConfig,
  SuratBlock,
  BlockType,
  AppNotification,
  CMSHero,
  CMSGalleryItem
} from '../types';
import { storage, formatDate, formatDateTime, generateId, downloadTextFile, generatePDF, createNotification } from '../utils';
import { SURAT_TYPES } from '../constants';
import { cmsService } from '../lib/cmsService';
import { configService } from '../lib/configService';
import { suratTypesApi, usersApi, suratApi, inventoryApi, incidentApi, reportsApi, tempResidentsApi, notifApi, iuranApi } from '../lib/api';
import { processImageUpload } from '../lib/imageUtils';
import { uploadToCdn, deleteFromCdn, getCdnUrl } from '../lib/cdnUtils';
import { Pagination } from '../components/Pagination';
import AppLogo from '../components/AppLogo';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import IuranAdmin from '../components/IuranAdmin';
import ThemeToggle from '../components/ThemeToggle';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
  onUpdateUser?: (user: User) => void;
  onConfigChange?: (config: AppConfig) => void;
}

type AdminTab =
  | 'OVERVIEW'
  | 'WARGA'
  | 'SURAT'
  | 'INFO'
  | 'TEMPLATES'
  | 'BOOK_LOG'
  | 'BOOK_PENGANTAR'
  | 'BOOK_KETERANGAN'
  | 'BOOK_IJIN'
  | 'BOOK_MUTASI'
  | 'BOOK_TEMP'
  | 'INVENTORY'
  | 'INCIDENTS'
  | 'REPORTS'
  | 'CMS'
  | 'IURAN'
  | 'SETTINGS';

const getSuratIcon = (id: string | null) => {
  if (!id) return <FileText size={28} />;
  if (id.includes('ijin')) return <Music size={28} />;
  if (id.includes('kematian')) return <Activity size={28} />;
  if (id.includes('domisili')) return <Home size={28} />;
  if (id.includes('kehilangan')) return <Search size={28} />;
  if (id.includes('sktm')) return <Heart size={28} />;
  if (id.includes('usaha')) return <Briefcase size={28} />;
  if (id.includes('pindah')) return <Truck size={28} />;
  return <FileText size={28} />;
};

export default function AdminDashboard({ user, onLogout, onUpdateUser, onConfigChange }: AdminDashboardProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<AdminTab>('OVERVIEW');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allPengajuan, setAllPengajuan] = useState<PengajuanSurat[]>([]);
  const [allInfo, setAllInfo] = useState<InfoRT[]>([]);
  const [allTemplates, setAllTemplates] = useState<SuratType[]>([]);
  const [allInventory, setAllInventory] = useState<Inventory[]>([]);
  const [allIncidents, setAllIncidents] = useState<IncidentLog[]>([]);
  const [allReports, setAllReports] = useState<WargaReport[]>([]);
  const [allIuranPayments, setAllIuranPayments] = useState<import('../types').IuranPayment[]>([]);

  useEffect(() => {
    setSearchQuery('');
    setFilterType('ALL');
  }, [activeTab]);

  // CMS States
  const [cmsHero, setCmsHero] = useState<CMSHero | null>(null);
  const [cmsGallery, setCmsGallery] = useState<CMSGalleryItem[]>([]);
  const [cmsSubTab, setCmsSubTab] = useState<'HERO' | 'GALLERY' | 'FOOTER' | 'STATS' | 'FEATURES' | 'STEPS' | 'CTA' | 'PROBLEM'>('HERO');
  // Gallery form state — toggle upload/url & preview
  const [galleryUploadMode, setGalleryUploadMode] = useState<'upload' | 'url'>('upload');
  const [galleryPreviewUrl, setGalleryPreviewUrl] = useState<string>('');
  const [galleryImageValue, setGalleryImageValue] = useState<string>('');
  const [galleryUrlInput, setGalleryUrlInput] = useState<string>('');
  const [galleryPreviewError, setGalleryPreviewError] = useState<boolean>(false);
  const [galleryTitleInput, setGalleryTitleInput] = useState<string>('');
  const [galleryDescInput, setGalleryDescInput] = useState<string>('');
  const [editingGalleryItem, setEditingGalleryItem] = useState<CMSGalleryItem | null>(null);
  const [isSavingCms, setIsSavingCms] = useState(false);
  // CMS Content states
  const [cmsStats, setCmsStats] = useState<{ value: string; label: string }[]>([]);
  const [cmsFeaturesWarga, setCmsFeaturesWarga] = useState<{ icon: string; title: string; desc: string; color: string }[]>([]);
  const [cmsFeaturesAdmin, setCmsFeaturesAdmin] = useState<{ icon: string; title: string; desc: string; color: string }[]>([]);
  const [cmsSteps, setCmsSteps] = useState<{ num: string; title: string; desc: string; icon: string }[]>([]);
  const [cmsCta, setCmsCta] = useState<{ title: string; buttonText: string }>({ title: '', buttonText: '' });
  const [cmsProblem, setCmsProblem] = useState<{ oldTitle: string; oldDesc: string; newTitle: string; newDesc: string; sectionTitle: string }>({ oldTitle: '', oldDesc: '', newTitle: '', newDesc: '', sectionTitle: '' });
  const [allTempResidents, setAllTempResidents] = useState<TempResident[]>([]);
  const [allNotifications, setAllNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [profileData, setProfileData] = useState<User>(user);

  // Sinkronisasi jika prop user berubah dari parent
  useEffect(() => {
    setProfileData(user);
  }, [user]);

  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);
  const [showAddIncidentModal, setShowAddIncidentModal] = useState(false);
  const [showAddTempModal, setShowAddTempModal] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const [newInventory, setNewInventory] = useState<Partial<Inventory>>({ condition: 'BAIK' });
  const [newIncident, setNewIncident] = useState<Partial<IncidentLog>>({ status: 'PENDING' });
  const [newTemp, setNewTemp] = useState<Partial<TempResident>>({});
  const [editingInventory, setEditingInventory] = useState<Inventory | null>(null);

  const handleEditInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInventory) return;
    inventoryApi.update(editingInventory.id, editingInventory).then(() => {
      inventoryApi.getAll().then(setAllInventory);
      setEditingInventory(null);
      toast.success('Inventaris berhasil diupdate!');
    }).catch(err => toast.error('Gagal update inventaris', err.message));
  };

  const handleDeleteInventory = (id: string) => {
    confirm({
      title: 'Hapus Inventaris',
      message: 'Yakin ingin menghapus barang inventaris ini?',
      confirmLabel: 'Ya, Hapus',
      variant: 'danger',
    }).then(ok => {
      if (!ok) return;
      inventoryApi.remove(id).then(() => {
        inventoryApi.getAll().then(setAllInventory);
        toast.success('Inventaris berhasil dihapus.');
      }).catch(err => toast.error('Gagal menghapus', err.message));
    });
  };

  const [editingIncident, setEditingIncident] = useState<IncidentLog | null>(null);

  const handleEditIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIncident) return;
    incidentApi.update(editingIncident.id, editingIncident).then(() => {
      incidentApi.getAll().then(setAllIncidents);
      setEditingIncident(null);
      toast.success('Catatan kejadian berhasil diupdate!');
    }).catch(err => toast.error('Gagal update kejadian', err.message));
  };

  const handleDeleteIncident = (id: string) => {
    confirm({
      title: 'Hapus Catatan Kejadian',
      message: 'Yakin ingin menghapus catatan kejadian ini?',
      confirmLabel: 'Ya, Hapus',
      variant: 'danger',
    }).then(ok => {
      if (!ok) return;
      const incident = allIncidents.find(i => i.id === id);
      if (incident && (incident as any).imageUrl) deleteFromCdn((incident as any).imageUrl);
      incidentApi.remove(id).then(() => {
        incidentApi.getAll().then(setAllIncidents);
        toast.success('Catatan kejadian berhasil dihapus.');
      }).catch(err => toast.error('Gagal menghapus', err.message));
    });
  };

  const handleAddInventory = (e: React.FormEvent) => {
    e.preventDefault();
    const item = {
      name: newInventory.name || '',
      quantity: Number(newInventory.quantity) || 0,
      condition: newInventory.condition as any || 'BAIK',
      source: newInventory.source || 'RW / RT',
      dateIn: new Date().toISOString(),
      remarks: newInventory.remarks || ''
    };
    inventoryApi.create(item).then(() => {
      inventoryApi.getAll().then(setAllInventory);
      setShowAddInventoryModal(false);
      setNewInventory({ condition: 'BAIK' });
      toast.success('Inventaris berhasil ditambahkan!');
    }).catch(err => toast.error('Gagal menambah inventaris', err.message));
  };

  const handleAddIncident = (e: React.FormEvent) => {
    e.preventDefault();
    const log = {
      title: newIncident.title || '',
      description: newIncident.description || '',
      location: newIncident.location || '',
      reporter: newIncident.reporter || 'Warga',
      imageUrl: (newIncident as any).imageUrl || undefined,
    };
    incidentApi.create(log).then(() => {
      incidentApi.getAll().then(setAllIncidents);
      setShowAddIncidentModal(false);
      setNewIncident({ status: 'PENDING' });
      toast.success('Catatan kejadian berhasil ditambahkan!');
    }).catch(err => toast.error('Gagal menambah kejadian', err.message));
  };

  const handleAddTemp = (e: React.FormEvent) => {
    e.preventDefault();
    const res = {
      name: newTemp.name || '',
      nik: newTemp.nik || '',
      origin: newTemp.origin || '',
      purpose: newTemp.purpose || '',
      startDate: new Date().toISOString(),
      address: newTemp.address || '',
      phone: newTemp.phone || ''
    };
    tempResidentsApi.create(res).then(() => {
      tempResidentsApi.getAll().then(setAllTempResidents);
      setShowAddTempModal(false);
      setNewTemp({});
      toast.success('Data warga musiman berhasil ditambahkan!');
    }).catch(err => toast.error('Gagal menambah data', err.message));
  };

  const [editingTemp, setEditingTemp] = useState<TempResident | null>(null);

  const handleEditTemp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemp) return;
    tempResidentsApi.update(editingTemp.id, editingTemp).then(() => {
      tempResidentsApi.getAll().then(setAllTempResidents);
      setEditingTemp(null);
      toast.success('Data warga musiman berhasil diupdate!');
    }).catch(err => toast.error('Gagal update data', err.message));
  };

  const handleDeleteTemp = (id: string) => {
    confirm({
      title: 'Hapus Data Tamu',
      message: 'Yakin ingin menghapus data warga musiman ini?',
      confirmLabel: 'Ya, Hapus',
      variant: 'danger',
    }).then(ok => {
      if (!ok) return;
      tempResidentsApi.remove(id).then(() => {
        tempResidentsApi.getAll().then(setAllTempResidents);
        toast.success('Data warga musiman berhasil dihapus.');
      }).catch(err => toast.error('Gagal menghapus', err.message));
    });
  };

  const handleUpdateReportStatus = (reportId: string, status: string) => {
    reportsApi.updateStatus(reportId, status).then(() => {
      setAllReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
    }).catch(err => toast.error('Gagal update status laporan', err.message));
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [suratFilter, setSuratFilter] = useState<'SEMUA' | 'PENDING' | 'DIPROSES' | 'DISETUJUI' | 'DITOLAK'>('SEMUA');
  const [suratSearchQuery, setSuratSearchQuery] = useState('');

  // Pagination states
  const ITEMS_PER_PAGE = 10;
  const [pageWarga, setPageWarga] = useState(1);
  const [pageSurat, setPageSurat] = useState(1);
  const [pageBookLog, setPageBookLog] = useState(1);
  const [pageBookTamu, setPageBookTamu] = useState(1);
  const [pageKejadian, setPageKejadian] = useState(1);
  const [pageInventaris, setPageInventaris] = useState(1);
  const [pageLaporan, setPageLaporan] = useState(1);
  const [pageInfo, setPageInfo] = useState(1);
  const [pageTemplates, setPageTemplates] = useState(1);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);
  const [showAddWargaModal, setShowAddWargaModal] = useState(false);
  const [showEditWargaModal, setShowEditWargaModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [selectedWarga, setSelectedWarga] = useState<User | null>(null);

  const [showAddInfoModal, setShowAddInfoModal] = useState(false);
  const [showEditInfoModal, setShowEditInfoModal] = useState(false);
  const [showDeleteInfoConfirmModal, setShowDeleteInfoConfirmModal] = useState(false);
  const [selectedInfo, setSelectedInfo] = useState<InfoRT | null>(null);
  const [infoDetail, setInfoDetail] = useState<InfoRT | null>(null);
  const [confirmPublishReport, setConfirmPublishReport] = useState<WargaReport | null>(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [selectedTemplate, setSelectedTemplate] = useState<SuratType | null>(null);
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);

  const [processingSurat, setProcessingSurat] = useState<PengajuanSurat | null>(null);
  const [showProcessSuratModal, setShowProcessSuratModal] = useState(false);

  // Reset pagination when filters change
  useEffect(() => { setPageWarga(1); }, [searchQuery]);
  useEffect(() => { setPageSurat(1); }, [suratFilter, suratSearchQuery]);
  useEffect(() => { setPageBookLog(1); }, [activeTab, filterType, searchQuery]);
  useEffect(() => { setPageBookTamu(1); }, [activeTab, searchQuery]);
  useEffect(() => { setPageKejadian(1); }, [activeTab, filterType, searchQuery]);
  useEffect(() => { setPageInventaris(1); }, [activeTab, filterType, searchQuery]);
  useEffect(() => { setPageLaporan(1); }, [activeTab, filterType, searchQuery]);
  useEffect(() => { setPageInfo(1); }, [activeTab, searchQuery]);
  useEffect(() => { setPageTemplates(1); }, [activeTab]);

  useEffect(() => {
    // Load semua data dari API database
    usersApi.getAll().then(setAllUsers).catch(() => { });
    suratApi.getAll().then(setAllPengajuan).catch(() => { });
    inventoryApi.getAll().then(setAllInventory).catch(() => { });
    incidentApi.getAll().then(setAllIncidents).catch(() => { });
    reportsApi.getAll().then(setAllReports).catch(() => { });
    tempResidentsApi.getAll().then(setAllTempResidents).catch(() => { });
    notifApi.getAll().then(setAllNotifications).catch(() => { });
    iuranApi.listPayments().then(setAllIuranPayments).catch(() => { });
    configService.getConfig().then(data => data && setConfig(data));

    // Load templates dari API database (sinkron dengan warga)
    suratTypesApi.getAll().then(types => {
      if (types && types.length > 0) {
        setAllTemplates(types);
      } else {
        setAllTemplates(SURAT_TYPES);
      }
    }).catch(() => {
      setAllTemplates(SURAT_TYPES);
    });

    // Load CMS Data
    cmsService.getHero().then(data => data && setCmsHero(data));
    cmsService.getGallery().then(setCmsGallery);
    cmsService.getInfo().then(setAllInfo);
    // Load CMS content sections
    cmsService.getContent('stats').then((d: any) => d && setCmsStats(d));
    cmsService.getContent('features_warga').then((d: any) => d && setCmsFeaturesWarga(d));
    cmsService.getContent('features_admin').then((d: any) => d && setCmsFeaturesAdmin(d));
    cmsService.getContent('steps').then((d: any) => d && setCmsSteps(d));
    cmsService.getContent('cta').then((d: any) => d && setCmsCta(d));
    cmsService.getContent('problem_solution').then((d: any) => d && setCmsProblem(d));
  }, []);

  // ESC untuk tutup lightbox
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxUrl(null); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleExportExcel = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleUpdateStatus = async (id: string, newStatus: SuratStatus, reason?: string, content?: string, pdfUrl?: string, blocks?: SuratBlock[]) => {
    try {
      await suratApi.updateStatus(id, { status: newStatus, rejectionReason: reason, suratContent: content, blocks: blocks ? blocks : undefined });
      const all = await suratApi.getAll();
      setAllPengajuan(all);
      toast.success(`Status surat diperbarui menjadi ${newStatus}.`);
    } catch (err: any) {
      toast.error('Gagal update status', err.message || 'Terjadi kesalahan');
    }
  };

  const handleAddWarga = (formData: Partial<User>) => {
    usersApi.create(formData).then(res => {
      const newUser: User = { id: res.id, name: formData.name || '', email: formData.email || `${formData.nik}@rt.com`, role: 'WARGA', nik: formData.nik, noKK: formData.noKK, alamat: formData.alamat, noHp: formData.noHp };
      setAllUsers([...allUsers, newUser]);
      setShowAddWargaModal(false);
      toast.success('Data warga berhasil ditambahkan!');
    }).catch(err => toast.error('Gagal menambah warga', err.message));
  };

  const handleEditWarga = (formData: Partial<User>) => {
    if (!selectedWarga) return;
    usersApi.update(selectedWarga.id, formData).then(() => {
      setAllUsers(allUsers.map(u => u.id === selectedWarga.id ? { ...u, ...formData } : u));
      setShowEditWargaModal(false);
      setSelectedWarga(null);
      toast.success('Data warga berhasil diperbarui!');
    }).catch(err => toast.error('Gagal update warga', err.message));
  };

  const handleDeleteWarga = (warga: User) => {
    setSelectedWarga(warga);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteWarga = () => {
    if (!selectedWarga) return;
    usersApi.remove(selectedWarga.id).then(() => {
      if (selectedWarga.avatar) deleteFromCdn(selectedWarga.avatar);
      setAllUsers(allUsers.filter(u => u.id !== selectedWarga.id));
      setShowDeleteConfirmModal(false);
      setSelectedWarga(null);
      toast.success('Data warga berhasil dihapus.');
    }).catch(err => toast.error('Gagal menghapus warga', err.message));
  };

  const handleResetPassword = () => {
    if (!selectedWarga || !newPassword) return;
    usersApi.resetPassword(selectedWarga.id, newPassword).then(() => {
      toast.success(`Password ${selectedWarga.name} berhasil direset!`);
      setShowResetPasswordModal(false);
      setNewPassword('');
      setSelectedWarga(null);
    }).catch(err => toast.error('Gagal reset password', err.message));
  };

  const handleAddInfo = async (formData: Partial<InfoRT>) => {
    const newInfoData: Omit<InfoRT, 'id'> = {
      title: formData.title || '',
      content: formData.content || '',
      type: formData.type || 'PENGUMUMAN',
      date: new Date().toISOString(),
      imageUrl: formData.imageUrl || undefined
    };

    const id = await cmsService.saveInfo(newInfoData);
    if (!id) return;
    const newInfo = { ...newInfoData, id };
    setAllInfo([newInfo, ...allInfo]);
    setShowAddInfoModal(false);
    toast.success('Pengumuman berhasil dipublikasikan!');
  };

  const handleEditInfo = async (formData: Partial<InfoRT>) => {
    if (!selectedInfo) return;
    await cmsService.updateInfo(selectedInfo.id, formData);
    setAllInfo(allInfo.map(i => i.id === selectedInfo.id ? { ...i, ...formData } : i));
    setShowEditInfoModal(false);
    setSelectedInfo(null);
    toast.success('Pengumuman berhasil diperbarui!');
  };

  const handleSaveTemplate = (id: string, newTemplate: string) => {
    suratTypesApi.update(id, { template: newTemplate }).then(() => {
      setAllTemplates(allTemplates.map(t => t.id === id ? { ...t, template: newTemplate } : t));
      setShowEditTemplateModal(false);
      setSelectedTemplate(null);
      toast.success('Format surat berhasil diperbarui!');
    }).catch(err => toast.error('Gagal simpan template', err.message));
  };

  const handleDeleteInfo = (info: InfoRT) => {
    setSelectedInfo(info);
    setShowDeleteInfoConfirmModal(true);
  };

  const confirmDeleteInfo = async () => {
    if (!selectedInfo) return;
    if (selectedInfo.imageUrl) {
      deleteFromCdn(selectedInfo.imageUrl);
    }
    await cmsService.deleteInfo(selectedInfo.id);
    const updated = allInfo.filter(i => i.id !== selectedInfo.id);
    setAllInfo(updated);
    setShowDeleteInfoConfirmModal(false);
    setSelectedInfo(null);
  };

  const [showDeleteReportConfirmModal, setShowDeleteReportConfirmModal] = useState(false);
  const [selectedReportToDelete, setSelectedReportToDelete] = useState<WargaReport | null>(null);

  const handleDeleteReport = (report: WargaReport) => {
    setSelectedReportToDelete(report);
    setShowDeleteReportConfirmModal(true);
  };

  const confirmDeleteReport = async () => {
    if (!selectedReportToDelete) return;
    try {
      await reportsApi.remove(selectedReportToDelete.id);
      if (selectedReportToDelete.imageUrl) deleteFromCdn(selectedReportToDelete.imageUrl);
      setAllReports(prev => prev.filter(r => r.id !== selectedReportToDelete.id));
      setShowDeleteReportConfirmModal(false);
      setSelectedReportToDelete(null);
      toast.success('Laporan berhasil dihapus.');
    } catch (err: any) {
      toast.error('Gagal menghapus laporan', err.message);
    }
  };

  const handleMarkAsRead = (notifId: string) => {
    notifApi.markRead(notifId).then(() => {
      const updated = allNotifications.map(n => n.id === notifId ? { ...n, isRead: true } : n);
      setAllNotifications(updated);
    }).catch(() => { });
  };

  const handleUpdateAdminProfile = (e: React.FormEvent) => {
    e.preventDefault();
    usersApi.update(profileData.id, profileData).then(() => {
      if (onUpdateUser) onUpdateUser(profileData);
      toast.success('Profil admin berhasil diperbarui!');
    }).catch(err => toast.error('Gagal update profil', err.message));
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-200/20 dark:bg-indigo-900/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-5%] left-[20%] w-[30%] h-[30%] bg-indigo-100/30 dark:bg-indigo-950/10 rounded-full blur-[100px]" />
      </div>

      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 hidden md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        hidden md:flex fixed inset-y-0 left-0 w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col z-[60] transition-transform duration-300 transform md:relative md:translate-x-0 md:h-screen md:shrink-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              <AppLogo className="w-full h-full object-contain" />
            </div>
            <span className="text-2xl font-bold text-slate-900 dark:text-white leading-tight border-l-2 border-slate-100 dark:border-slate-800 pl-3">Hallo <span className="text-indigo-900">Warga</span> <span className="block text-[8px] font-black uppercase tracking-[0.2em] text-indigo-900/50">Admin Portal</span></span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-red-500 transition-colors">
            <XCircle size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="px-4 py-2 mb-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">Utama</div>
          <AdminSidebarLink
            icon={<LayoutDashboard size={18} />}
            label="Ringkasan"
            active={activeTab === 'OVERVIEW'}
            onClick={() => { setActiveTab('OVERVIEW'); setIsSidebarOpen(false); }}
          />
          <AdminSidebarLink
            icon={<Globe size={18} />}
            label="Landing Page"
            active={activeTab === 'CMS'}
            onClick={() => { setActiveTab('CMS'); setIsSidebarOpen(false); }}
          />
          <AdminSidebarLink
            icon={<Megaphone size={18} />}
            label="Papan Informasi"
            active={activeTab === 'INFO'}
            onClick={() => { setActiveTab('INFO'); setIsSidebarOpen(false); }}
          />
          <AdminSidebarLink
            icon={<Settings size={18} />}
            label="Pengaturan RT"
            active={activeTab === 'SETTINGS'}
            onClick={() => { setActiveTab('SETTINGS'); setIsSidebarOpen(false); }}
          />

          <div className="px-4 py-2 mt-6 mb-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">Administrasi Surat</div>
          <AdminSidebarLink
            icon={<FileText size={18} />}
            label="Permintaan Surat"
            active={activeTab === 'SURAT'}
            onClick={() => { setActiveTab('SURAT'); setIsSidebarOpen(false); }}
            badge={allPengajuan.filter(p => p.status === 'PENDING').length}
          />
          <AdminSidebarLink
            icon={<Edit2 size={18} />}
            label="Format Surat"
            active={activeTab === 'TEMPLATES'}
            onClick={() => { setActiveTab('TEMPLATES'); setIsSidebarOpen(false); }}
          />

          <div className="px-4 py-2 mt-6 mb-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">Buku Register</div>
          <AdminSidebarLink
            icon={<ClipboardList size={18} />}
            label="Register In/Out"
            active={activeTab === 'BOOK_LOG'}
            onClick={() => { setActiveTab('BOOK_LOG'); setIsSidebarOpen(false); }}
          />
          <AdminSidebarLink
            icon={<BookOpen size={18} />}
            label="Surat Pengantar"
            active={activeTab === 'BOOK_PENGANTAR'}
            onClick={() => { setActiveTab('BOOK_PENGANTAR'); setIsSidebarOpen(false); }}
          />
          <AdminSidebarLink
            icon={<FileSearch size={18} />}
            label="Surat Keterangan"
            active={activeTab === 'BOOK_KETERANGAN'}
            onClick={() => { setActiveTab('BOOK_KETERANGAN'); setIsSidebarOpen(false); }}
          />
          <AdminSidebarLink
            icon={<CheckCircle2 size={18} />}
            label="Surat Ijin"
            active={activeTab === 'BOOK_IJIN'}
            onClick={() => { setActiveTab('BOOK_IJIN'); setIsSidebarOpen(false); }}
          />

          <div className="px-4 py-2 mt-6 mb-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">Data Kependudukan</div>
          <AdminSidebarLink
            icon={<Users size={18} />}
            label="Buku Induk Warga"
            active={activeTab === 'WARGA'}
            onClick={() => { setActiveTab('WARGA'); setIsSidebarOpen(false); }}
            badge={allUsers.filter(u => u.role === 'WARGA').length}
          />
          <AdminSidebarLink
            icon={<ArrowRightLeft size={18} />}
            label="Mutasi Penduduk"
            active={activeTab === 'BOOK_MUTASI'}
            onClick={() => { setActiveTab('BOOK_MUTASI'); setIsSidebarOpen(false); }}
          />
          <AdminSidebarLink
            icon={<Calendar size={18} />}
            label="Warga Musiman"
            active={activeTab === 'BOOK_TEMP'}
            onClick={() => { setActiveTab('BOOK_TEMP'); setIsSidebarOpen(false); }}
          />

          <div className="px-4 py-2 mt-6 mb-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">Lainnya</div>
          <AdminSidebarLink
            icon={<Box size={18} />}
            label="Inventaris"
            active={activeTab === 'INVENTORY'}
            onClick={() => { setActiveTab('INVENTORY'); setIsSidebarOpen(false); }}
          />
          <AdminSidebarLink
            icon={<Wallet size={18} />}
            label="Iuran Warga"
            active={activeTab === 'IURAN'}
            onClick={() => { setActiveTab('IURAN'); setIsSidebarOpen(false); }}
            badge={allIuranPayments.filter(p => p.status === 'PENDING').length}
          />
          <AdminSidebarLink
            icon={<AlertTriangle size={18} />}
            label="Catatan Kejadian"
            active={activeTab === 'INCIDENTS'}
            onClick={() => { setActiveTab('INCIDENTS'); setIsSidebarOpen(false); }}
          />
          <AdminSidebarLink
            icon={<Mail size={18} />}
            label="Laporan Warga"
            active={activeTab === 'REPORTS'}
            onClick={() => { setActiveTab('REPORTS'); setIsSidebarOpen(false); }}
            badge={allReports.filter(r => r.status === 'PROSES').length}
          />
        </nav>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-900 flex items-center justify-center text-white overflow-hidden shadow-sm">
              {profileData.avatar ? (
                <img src={getCdnUrl(profileData.avatar)} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={20} />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{profileData.name || user.name}</p>
              <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase truncate">Administrator</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full py-4 text-sm font-black text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center gap-3 transition-all rounded-2xl hover:bg-red-50 dark:hover:bg-red-500/10 uppercase tracking-widest"
          >
            <LogOut size={18} />
            Keluar Panel
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden pb-24 md:pb-0">
        {/* Header */}
        <header className="h-12 md:h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-3 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 md:gap-4">
            <h2 className="text-[11px] md:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-[0.15em] md:tracking-[0.2em]">
              {(() => {
                switch (activeTab) {
                  case 'OVERVIEW': return 'Sistem Terpadu';
                  case 'WARGA': return 'Buku Induk Warga';
                  case 'SURAT': return 'Permintaan Surat';
                  case 'INFO': return 'Kabar RT';
                  case 'TEMPLATES': return 'Format Surat';
                  case 'BOOK_LOG': return 'Register Surat Masuk/Keluar';
                  case 'BOOK_PENGANTAR': return 'Buku Surat Pengantar';
                  case 'BOOK_KETERANGAN': return 'Buku Surat Keterangan';
                  case 'BOOK_IJIN': return 'Buku Surat Ijin';
                  case 'BOOK_MUTASI': return 'Buku Mutasi Penduduk';
                  case 'BOOK_TEMP': return 'Warga Tinggal Sementara';
                  case 'INVENTORY': return 'Buku Inventaris';
                  case 'INCIDENTS': return 'Catatan Kejadian';
                  case 'REPORTS': return 'Laporan & Pengaduan';
                  case 'IURAN': return 'Iuran Warga';
                  case 'CMS': return 'Pengaturan Landing Page';
                  case 'SETTINGS': return 'Pengaturan Profil RT';
                  default: return 'Admin Portal';
                }
              })()}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 md:gap-4">
            <ThemeToggle size="sm" />
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all ${showNotifications ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                <Bell size={18} className="md:w-5 md:h-5" />
                {allNotifications.some(n => !n.isRead) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-900 rounded-full border-2 border-white dark:border-slate-900" />
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-[280px] sm:w-[350px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">Pemberitahuan Admin</h3>
                        {allNotifications.some(n => !n.isRead) && (
                          <button
                            onClick={() => {
                              notifApi.markAllRead().then(() => {
                                const updated = allNotifications.map(n => ({ ...n, isRead: true }));
                                setAllNotifications(updated);
                              }).catch(() => { });
                            }}
                            className="text-[10px] font-black text-indigo-900 dark:text-indigo-400 hover:underline"
                          >
                            Tandai semua dibaca
                          </button>
                        )}
                      </div>
                      <div className="max-h-[350px] overflow-y-auto overflow-x-hidden scrollbar-hide">
                        {allNotifications.length === 0 ? (
                          <div className="p-10 text-center">
                            <Bell size={32} className="mx-auto text-slate-200 mb-3" />
                            <p className="text-xs text-slate-400 font-medium tracking-tight">Belum ada pemberitahuan baru.</p>
                          </div>
                        ) : (
                          allNotifications.map(n => (
                            <div
                              key={n.id}
                              onClick={() => {
                                handleMarkAsRead(n.id);
                                if (n.type === 'SURAT' && n.relatedId) {
                                  setActiveTab('SURAT');
                                } else if (n.type === 'LAPORAN') {
                                  setActiveTab('REPORTS');
                                }
                                setShowNotifications(false);
                              }}
                              className={`p-4 border-b border-slate-50 dark:border-slate-800/50 cursor-pointer transition-colors ${n.isRead ? 'opacity-60 bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'}`}
                            >
                              <div className="flex gap-3">
                                <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${n.type === 'SURAT' ? 'bg-blue-50 text-blue-600' : n.type === 'INFO' ? 'bg-indigo-50 text-indigo-900' : 'bg-rose-50 text-rose-600'}`}>
                                  {n.type === 'SURAT' ? <FileText size={16} /> : n.type === 'INFO' ? <Bell size={16} /> : <Mail size={16} />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className={`text-[13px] leading-tight mb-1 ${n.isRead ? 'font-medium text-slate-600 dark:text-slate-400' : 'font-bold text-slate-900 dark:text-white'}`}>{n.title}</p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug">{n.message}</p>
                                  <p className="text-[9px] font-bold text-slate-300 uppercase mt-2">{formatDate(n.createdAt)}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Profile */}
            <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-slate-200 dark:border-slate-800">
              <div className="hidden lg:block text-right">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{profileData.name}</p>
                <p className="text-[10px] font-bold text-indigo-900 uppercase tracking-widest leading-none mt-0.5">Control Center</p>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-indigo-900 flex items-center justify-center text-white shadow-lg shadow-indigo-900/20 group cursor-pointer active:scale-95 transition-transform overflow-hidden">
                {profileData.avatar ? (
                  <img src={getCdnUrl(profileData.avatar)} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={16} className="md:w-5 md:h-5 group-hover:rotate-12 transition-transform" />
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-3 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'OVERVIEW' && (
              <div className="space-y-6 md:space-y-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Kondisi Saat Ini 📊</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-lg mt-0.5 md:mt-1">Laporan singkat performa administrasi RT.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                  <AdminStatCard label="Total Warga" value={allUsers.filter(u => u.role === 'WARGA').length} icon={<Users size={24} />} color="indigo" />
                  <AdminStatCard label="Antrean Surat" value={allPengajuan.filter(p => p.status === 'PENDING').length} icon={<FileText size={24} />} color="amber" />
                  <AdminStatCard label="Informasi" value={allInfo.length} icon={<Megaphone size={24} />} color="indigo" />
                  <AdminStatCard label="Total Selesai" value={allPengajuan.filter(p => p.status === 'DISETUJUI').length} icon={<CheckCircle2 size={24} />} color="indigo" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">Antrean Pengajuan</h2>
                      <button onClick={() => setActiveTab('SURAT')} className="text-xs font-bold text-indigo-900 hover:underline uppercase tracking-widest">Semua Data</button>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                      {allPengajuan.filter(p => p.status === 'PENDING').length === 0 ? (
                        <div className="p-20 text-center text-slate-400 font-semibold uppercase tracking-widest text-xs">Aman! Tidak ada antrean.</div>
                      ) : (
                        <>
                          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
                            {allPengajuan.filter(p => p.status === 'PENDING').slice(0, 5).map(p => (
                              <AdminPengajuanRow key={p.id} item={p} onUpdate={handleUpdateStatus} onProcess={(item) => {
                                handleUpdateStatus(item.id, 'DIPROSES');
                              setProcessingSurat(item);
                            }} allTemplates={allTemplates} config={config} />
                          ))}
                          </div>
                          {allPengajuan.filter(p => p.status === 'PENDING').length > 5 && (
                            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                              <button
                                onClick={() => setActiveTab('SURAT')}
                                className="w-full py-2.5 rounded-xl text-xs font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all flex items-center justify-center gap-2"
                              >
                                Lihat {allPengajuan.filter(p => p.status === 'PENDING').length - 5} antrean lainnya
                                <ArrowRight size={13} />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">Warga Terbaru</h2>
                      <button onClick={() => setActiveTab('WARGA')} className="text-xs font-bold text-indigo-900 hover:underline uppercase tracking-widest">Semua</button>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                      {(() => {
                        const wargaList = allUsers.filter(u => u.role === 'WARGA');
                        if (wargaList.length === 0) {
                          return <div className="p-20 text-center text-slate-400 font-semibold uppercase tracking-widest text-xs">Belum ada warga.</div>;
                        }
                        return (
                          <>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
                              {wargaList.slice(0, 5).map(u => (
                                <div key={u.id} className="p-4 flex items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-900 group-hover:text-white transition-all font-bold text-base shrink-0 overflow-hidden">
                                    {u.avatar ? (
                                      <img src={getCdnUrl(u.avatar)} alt={u.name} className="w-full h-full object-cover" />
                                    ) : (
                                      u.name[0]
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{u.name}</p>
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest group-hover:text-indigo-900 transition-colors truncate">NIK: {u.nik}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {wargaList.length > 5 && (
                              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                <button
                                  onClick={() => setActiveTab('WARGA')}
                                  className="w-full py-2.5 rounded-xl text-xs font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all flex items-center justify-center gap-2"
                                >
                                  Lihat {wargaList.length - 5} warga lainnya
                                  <ArrowRight size={13} />
                                </button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'WARGA' && (
              <div className="space-y-10">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">Database Warga</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Kelola dan pantau data penduduk lingkungan RT.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                      onClick={() => {
                        const wargaData = allUsers
                          .filter(u => u.role === 'WARGA')
                          .map((u, idx) => ({
                            'No': idx + 1,
                            'Nama': u.name,
                            'NIK': u.nik,
                            'No KK': u.noKK || '-',
                            'Email': u.email,
                            'No HP': u.noHp || '-',
                            'Alamat': u.alamat || '-',
                            'Status Pernikahan': u.statusPernikahan || '-',
                            'Pekerjaan': u.pekerjaan || '-',
                            'Agama': u.agama || '-',
                            'Tempat Lahir': u.tempatLahir || '-',
                            'Tanggal Lahir': u.tanggalLahir || u.tglLahir || '-'
                          }));
                        handleExportExcel(wargaData, 'Buku_Induk_Warga');
                      }}
                      className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all uppercase tracking-widest text-xs"
                    >
                      <Download size={18} />
                      Export Data
                    </button>
                    <button
                      onClick={() => setShowAddWargaModal(true)}
                      className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-indigo-900 text-white rounded-2xl font-bold hover:bg-indigo-950 transition-all shadow-xl shadow-indigo-900/20 uppercase tracking-widest text-xs active:scale-95"
                    >
                      <Plus size={20} />
                      Tambah Warga
                    </button>
                  </div>
                </header>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="relative flex-1 max-w-xl group">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-900 transition-colors" size={20} />
                      <input
                        type="text"
                        placeholder="Cari berdasarkan Nama, NIK, atau Alamat..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-900/10 focus:border-indigo-900 transition-all text-sm font-bold placeholder:text-slate-300 dark:placeholder:text-slate-700 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    {(() => {
                      const filteredWarga = allUsers.filter(u => u.role === 'WARGA' && (u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.nik?.includes(searchQuery) || u.alamat?.toLowerCase().includes(searchQuery.toLowerCase())));
                      const paginatedWarga = filteredWarga.slice((pageWarga - 1) * ITEMS_PER_PAGE, pageWarga * ITEMS_PER_PAGE);

                      return (
                        <>
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800/50">
                                <th className="px-4 md:px-10 py-3 md:py-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Data Penduduk</th>
                                <th className="hidden md:table-cell px-4 md:px-10 py-3 md:py-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Identitas Resmi</th>
                                <th className="hidden lg:table-cell px-4 md:px-10 py-3 md:py-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Domisili</th>
                                <th className="px-4 md:px-10 py-3 md:py-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-right">Tindakan</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {paginatedWarga.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                  <td className="px-4 md:px-10 py-4 md:py-8">
                                    <div className="flex items-center gap-3 md:gap-5">
                                      <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-indigo-50 dark:bg-indigo-900/10 flex items-center justify-center text-indigo-900 dark:text-indigo-400 font-bold text-base md:text-xl shadow-sm group-hover:scale-105 transition-transform shrink-0 overflow-hidden">
                                        {u.avatar ? (
                                          <img src={getCdnUrl(u.avatar)} alt={u.name} className="w-full h-full object-cover" />
                                        ) : (
                                          u.name[0]
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm md:text-base font-bold text-slate-900 dark:text-white truncate">{u.name}</p>
                                        <p className="text-[10px] md:text-xs text-slate-400 dark:text-slate-500 font-medium truncate">{u.email}</p>
                                        {/* Inline info di mobile */}
                                        <p className="md:hidden text-[10px] font-bold text-slate-500 mt-1 truncate">NIK: {u.nik}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="hidden md:table-cell px-4 md:px-10 py-4 md:py-8">
                                    <div className="space-y-1">
                                      <p className="text-xs font-black text-slate-700 dark:text-slate-300 tracking-wider">NIK {u.nik}</p>
                                      <p className="text-xs font-bold text-slate-400 dark:text-slate-500">KK: {u.noKK || '-'}</p>
                                    </div>
                                  </td>
                                  <td className="hidden lg:table-cell px-4 md:px-10 py-4 md:py-8">
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 line-clamp-1 max-w-[200px]">{u.alamat}</p>
                                    <div className="flex items-center gap-1.5 mt-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                      <p className="text-[10px] font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest">{u.noHp || 'Tanpa Kontak'}</p>
                                    </div>
                                  </td>
                                  <td className="px-4 md:px-10 py-4 md:py-8 text-right">
                                    <div className="flex items-center justify-end gap-1 md:gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => {
                                          setSelectedWarga(u);
                                          setShowEditWargaModal(true);
                                        }}
                                        className="p-2 md:p-3 text-slate-400 hover:text-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 rounded-xl transition-all active:scale-90"
                                      >
                                        <Edit2 size={16} className="md:w-[18px] md:h-[18px]" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteWarga(u)}
                                        className="p-2 md:p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all active:scale-90"
                                      >
                                        <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedWarga(u);
                                          setShowResetPasswordModal(true);
                                        }}
                                        className="p-2 md:p-3 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl transition-all active:scale-90"
                                        title="Reset Password"
                                      >
                                        <Key size={16} className="md:w-[18px] md:h-[18px]" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {filteredWarga.length === 0 && (
                            <div className="p-20 text-center">
                              <Users size={48} className="mx-auto text-slate-200 dark:text-slate-800 mb-6" />
                              <p className="text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest text-xs">Warga tidak ditemukan.</p>
                            </div>
                          )}
                          {filteredWarga.length > 0 && (
                            <Pagination
                              currentPage={pageWarga}
                              totalItems={filteredWarga.length}
                              itemsPerPage={ITEMS_PER_PAGE}
                              onPageChange={setPageWarga}
                            />
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'SURAT' && (
              <div className="space-y-10">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">Manajemen Surat</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Proses pengajuan surat dari warga secara digital.</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <button
                      onClick={() => {
                        const suratData = allPengajuan.map((p, idx) => ({
                          'No': idx + 1,
                          'Tanggal': formatDate(p.createdAt),
                          'Pemohon': p.userName,
                          'NIK': p.userNik,
                          'Jenis Surat': p.typeName,
                          'Keperluan': p.keterangan || '-',
                          'Status': p.status
                        }));
                        handleExportExcel(suratData, 'Manajemen_Surat_Warga');
                      }}
                      className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 shadow-sm"
                    >
                      <Download size={14} /> Export
                    </button>
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-[20px] p-1.5 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto no-scrollbar">
                      {([
                        { key: 'SEMUA', label: 'Semua', count: allPengajuan.length },
                        { key: 'PENDING', label: 'Pending', count: allPengajuan.filter(p => p.status === 'PENDING').length },
                        { key: 'DIPROSES', label: 'Diproses', count: allPengajuan.filter(p => p.status === 'DIPROSES').length },
                        { key: 'DISETUJUI', label: 'Disetujui', count: allPengajuan.filter(p => p.status === 'DISETUJUI').length },
                        { key: 'DITOLAK', label: 'Ditolak', count: allPengajuan.filter(p => p.status === 'DITOLAK').length },
                      ] as const).map(f => (
                        <button
                          key={f.key}
                          onClick={() => setSuratFilter(f.key)}
                          className={`flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all whitespace-nowrap ${suratFilter === f.key
                              ? 'bg-indigo-900 text-white shadow-lg shadow-indigo-900/20'
                              : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                          {f.label}
                          {f.count > 0 && (
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${suratFilter === f.key ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              }`}>{f.count}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </header>

                <div className="relative mb-6">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="text-slate-400" size={20} />
                  </div>
                  <input
                    type="text"
                    placeholder="Cari berdasarkan nama pemohon, NIK, atau jenis surat..."
                    value={suratSearchQuery}
                    onChange={(e) => setSuratSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-900/10 focus:border-indigo-900 dark:text-white transition-all font-medium text-sm shadow-sm"
                  />
                  {suratSearchQuery && (
                    <button
                      onClick={() => setSuratSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(() => {
                      let filtered = suratFilter === 'SEMUA'
                        ? allPengajuan
                        : allPengajuan.filter(p => p.status === suratFilter);

                      if (suratSearchQuery) {
                        const q = suratSearchQuery.toLowerCase();
                        filtered = filtered.filter(p =>
                          (p.userName && p.userName.toLowerCase().includes(q)) ||
                          (p.userNik && p.userNik.includes(q)) ||
                          (p.typeName && p.typeName.toLowerCase().includes(q))
                        );
                      }

                      const paginatedSurat = filtered.slice((pageSurat - 1) * ITEMS_PER_PAGE, pageSurat * ITEMS_PER_PAGE);

                      return (
                        <>
                          {filtered.length === 0 ? (
                            <div className="p-40 text-center">
                              <FileText size={64} className="mx-auto text-slate-200 dark:text-slate-800 mb-8" />
                              <p className="text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest text-sm">
                                {suratFilter === 'SEMUA' ? 'Belum ada aktivitas surat.' : `Tidak ada surat dengan status ${suratFilter}.`}
                              </p>
                            </div>
                          ) : (
                            paginatedSurat.map(p => (
                              <AdminPengajuanRow key={p.id} item={p} onUpdate={handleUpdateStatus} onProcess={(item) => {
                                handleUpdateStatus(item.id, 'DIPROSES');
                                setProcessingSurat(item);
                              }} allTemplates={allTemplates} config={config} />
                            ))
                          )}
                          {filtered.length > 0 && (
                            <Pagination
                              currentPage={pageSurat}
                              totalItems={filtered.length}
                              itemsPerPage={ITEMS_PER_PAGE}
                              onPageChange={setPageSurat}
                            />
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'INFO' && (
              <div className="space-y-10">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">Kabar & Informasi</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Publikasikan informasi penting ke aplikasi warga.</p>
                  </div>
                  <button
                    onClick={() => setShowAddInfoModal(true)}
                    className="flex items-center justify-center gap-3 px-10 py-5 bg-indigo-900 text-white rounded-2xl font-bold hover:bg-indigo-950 transition-all shadow-xl shadow-indigo-900/20 uppercase tracking-widest text-xs active:scale-95 leading-none shrink-0"
                  >
                    <Plus size={24} />
                    Berita Baru
                  </button>
                </header>

                <div className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {allInfo.slice((pageInfo - 1) * ITEMS_PER_PAGE, pageInfo * ITEMS_PER_PAGE).map(i => (
                      <div key={i.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col group hover:border-indigo-900 transition-all relative overflow-hidden shadow-sm">
                        {/* Gambar cover jika ada — klik untuk detail */}
                        {i.imageUrl && (
                          <button
                            onClick={() => setInfoDetail(i)}
                            className="w-full h-40 overflow-hidden cursor-zoom-in shrink-0"
                            title="Klik untuk lihat detail"
                          >
                            <img src={getCdnUrl(i.imageUrl)} alt={i.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          </button>
                        )}
                        <div className="p-8 flex-1 relative z-10 flex flex-col">
                          <div className="flex items-center justify-between mb-5">
                            <span className={`px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest leading-none border ${
                              i.type === 'PENGUMUMAN' ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/20' :
                              i.type === 'BERITA'     ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/20' :
                              i.type === 'KEGIATAN'   ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/20' :
                              i.type === 'HIMBAUAN'   ? 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-900/20' :
                              i.type === 'EMERGENCY'  ? 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/20' :
                              'bg-indigo-50 text-indigo-900 border-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-400 dark:border-indigo-900/20'
                            }`}>{i.type}</span>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setSelectedInfo(i);
                                  setShowEditInfoModal(true);
                                }}
                                className="p-3 text-slate-400 hover:text-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 rounded-xl transition-all active:scale-90"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteInfo(i)}
                                className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all active:scale-90"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 leading-tight group-hover:text-indigo-900 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight line-clamp-2">{i.title}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mb-6 font-medium leading-relaxed flex-1">{i.content}</p>
                          <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-5 mt-auto">
                            <div className="flex items-center gap-2">
                              <Clock size={14} className="text-slate-300" />
                              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Dipublikasi {formatDate(i.date)}</span>
                            </div>
                            <button
                              onClick={() => setInfoDetail(i)}
                              className="flex items-center gap-1.5 text-[10px] font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest hover:gap-2.5 transition-all"
                            >
                              Detail <ArrowRight size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {allInfo.length > 0 && (
                    <Pagination
                      currentPage={pageInfo}
                      totalItems={allInfo.length}
                      itemsPerPage={ITEMS_PER_PAGE}
                      onPageChange={setPageInfo}
                    />
                  )}
                </div>
              </div>
            )}

            {activeTab === 'TEMPLATES' && (() => {
              // Kumpulkan semua kategori unik dari data
              const allCategories = Array.from(new Set([
                'PENGANTAR', 'KETERANGAN', 'IJIN',
                ...allTemplates.map(t => t.category || 'PENGANTAR')
              ]));
              const categoryLabels: Record<string, string> = {
                'PENGANTAR': 'Surat Pengantar',
                'KETERANGAN': 'Surat Keterangan',
                'IJIN': 'Surat Ijin',
              };
              const categoryColors: Record<string, string> = {
                'PENGANTAR': 'bg-indigo-50 text-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-400',
                'KETERANGAN': 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400',
                'IJIN': 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
              };
              const getCatColor = (cat: string) => categoryColors[cat] || 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
              const getCatBar = (cat: string) => cat === 'PENGANTAR' ? 'bg-indigo-600' : cat === 'KETERANGAN' ? 'bg-teal-500' : cat === 'IJIN' ? 'bg-amber-500' : 'bg-slate-400';

              const handleAddTemplate = (category: string) => {
                const newType: SuratType = {
                  id: `custom-${Date.now()}`,
                  name: 'Template Baru',
                  category: category as any,
                  description: 'Deskripsi template baru...',
                  template: '',
                  blocks: [
                    { id: generateId(), type: 'HEADER' },
                    { id: generateId(), type: 'TITLE', content: 'SURAT KETERANGAN' },
                    { id: generateId(), type: 'PARAGRAPH', content: 'Yang bertanda tangan di bawah ini...' },
                    { id: generateId(), type: 'SIGNATURE' }
                  ]
                };
                suratTypesApi.create(newType)
                  .then(() => suratTypesApi.getAll())
                  .then(types => { if (types?.length) setAllTemplates(types); })
                  .catch(() => {
                    setAllTemplates(prev => [...prev, newType]);
                  });
                setSelectedTemplate(newType);
                setShowEditTemplateModal(true);
              };

              const handleMoveCategory = (templateId: string, newCategory: string) => {
                const t = allTemplates.find(x => x.id === templateId);
                if (!t) return;
                const updated = { ...t, category: newCategory as any };
                suratTypesApi.update(templateId, { category: newCategory as any })
                  .then(() => suratTypesApi.getAll())
                  .then(types => { if (types?.length) setAllTemplates(types); })
                  .catch(() => {
                    setAllTemplates(prev => prev.map(x => x.id === templateId ? updated : x));
                  });
              };

              const handleDeleteTemplate = (templateId: string) => {
                confirm({
                  title: 'Hapus Template',
                  message: 'Hapus template ini? Tindakan tidak dapat dibatalkan.',
                  confirmLabel: 'Ya, Hapus',
                  variant: 'danger',
                }).then(ok => {
                  if (!ok) return;
                  suratTypesApi.remove(templateId)
                    .then(() => suratTypesApi.getAll())
                    .then(types => { if (types?.length) setAllTemplates(types); })
                    .catch(() => { setAllTemplates(prev => prev.filter(x => x.id !== templateId)); });
                  toast.success('Template berhasil dihapus.');
                });
              };

              const handleAddCategory = () => {
                const name = prompt('Nama kategori baru (huruf kapital, contoh: KHUSUS):');
                if (!name) return;
                const key = name.trim().toUpperCase().replace(/\s+/g, '_');
                categoryLabels[key] = name.trim();
                // Langsung tambah template pertama di kategori ini
                handleAddTemplate(key);
              };

              return (
                <div className="space-y-12">
                  {/* Header */}
                  <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                      <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">Format Surat</h1>
                      <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
                        {allTemplates.length} template terdaftar · terorganisir dalam {allCategories.filter(c => allTemplates.some(t => (t.category || 'PENGANTAR') === c)).length} kategori
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleAddCategory}
                        className="px-6 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
                      >
                        <FolderPlus size={15} />
                        Kategori Baru
                      </button>
                      <button
                        onClick={() => handleAddTemplate('PENGANTAR')}
                        className="px-8 py-3.5 bg-indigo-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-xl shadow-indigo-900/20 active:scale-95 transition-all hover:bg-indigo-800"
                      >
                        <Plus size={15} />
                        Template Baru
                      </button>
                    </div>
                  </header>

                  {/* Categories */}
                  {allCategories.map(cat => {
                    const items = allTemplates.filter(t => (t.category || 'PENGANTAR') === cat);
                    if (items.length === 0) return null;
                    const label = categoryLabels[cat] || cat;
                    return (
                      <section key={cat} className="space-y-5">
                        {/* Category header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`w-2 h-8 rounded-full ${getCatBar(cat)}`} />
                            <div>
                              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">{label}</h2>
                              <p className="text-xs text-slate-400 font-medium">{items.length} template</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddTemplate(cat)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-900 dark:hover:bg-indigo-900/20 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest transition-all"
                          >
                            <Plus size={13} />
                            Tambah di sini
                          </button>
                        </div>

                        {/* Template cards */}
                        {(() => {
                          const paginated = items.slice((pageTemplates - 1) * ITEMS_PER_PAGE, pageTemplates * ITEMS_PER_PAGE);
                          return (
                            <>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {paginated.map(t => (
                                  <div key={t.id} className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 p-7 flex flex-col group hover:border-indigo-900/30 hover:shadow-lg hover:shadow-indigo-900/5 transition-all shadow-sm">
                                    {/* Badge kategori */}
                                    <div className="flex items-center justify-between mb-5">
                                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getCatColor(cat)}`}>
                                        {label}
                                      </span>
                                      {/* Move category dropdown */}
                                      <select
                                        value={cat}
                                        onChange={e => handleMoveCategory(t.id, e.target.value)}
                                        className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-transparent border-none outline-none cursor-pointer hover:text-indigo-900 transition-colors"
                                        title="Pindah ke kategori lain"
                                      >
                                        {allCategories.map(c => (
                                          <option key={c} value={c}>{categoryLabels[c] || c}</option>
                                        ))}
                                      </select>
                                    </div>

                                    <div className={`w-12 h-12 rounded-2xl ${getCatColor(cat)} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                                      {getSuratIcon(t.id)}
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 leading-tight uppercase tracking-tight line-clamp-2">{t.name}</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6 flex-1 line-clamp-2">{t.description}</p>

                                    {/* Actions */}
                                    <div className="flex gap-2 mt-auto">
                                      <button
                                        onClick={() => { setSelectedTemplate(t); setShowEditTemplateModal(true); }}
                                        className="flex-1 py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-900 hover:text-white transition-all active:scale-95"
                                      >
                                        <Edit2 size={13} />
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteTemplate(t.id)}
                                        className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20 transition-all active:scale-95"
                                        title="Hapus template"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {items.length > ITEMS_PER_PAGE && (
                                <div className="mt-4">
                                  <Pagination
                                    currentPage={pageTemplates}
                                    totalItems={items.length}
                                    itemsPerPage={ITEMS_PER_PAGE}
                                    onPageChange={setPageTemplates}
                                  />
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </section>
                    );
                  })}
                </div>
              );
            })()}


            {/* BUKU REGISTER VIEWS */}
            {(activeTab === 'BOOK_LOG' || activeTab === 'BOOK_PENGANTAR' || activeTab === 'BOOK_KETERANGAN' || activeTab === 'BOOK_IJIN' || activeTab === 'BOOK_MUTASI') && (() => {
              const activeBookData = allPengajuan
                .filter(p => {
                  if (activeTab === 'BOOK_PENGANTAR') return p.typeId.startsWith('pengantar-');
                  if (activeTab === 'BOOK_KETERANGAN') return p.typeId.startsWith('ket-');
                  if (activeTab === 'BOOK_IJIN') return p.typeId.startsWith('ijin-');
                  if (activeTab === 'BOOK_MUTASI') return ['pengantar-pindah', 'pengantar-nik', 'pengantar-akta-lahir', 'pengantar-kematian', 'pengantar-kk'].includes(p.typeId);
                  return true; // BOOK_LOG
                });
              const filteredBookData = activeBookData
                .filter(p => filterType === 'ALL' || p.status === filterType)
                .filter(p =>
                  p.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.typeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (p.userNik || '').includes(searchQuery) ||
                  (p.keterangan || '').toLowerCase().includes(searchQuery.toLowerCase())
                );
              return (
                <div className="space-y-10">
                  <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                      <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {activeTab === 'BOOK_LOG' ? 'Register Surat Masuk & Keluar' :
                          activeTab === 'BOOK_PENGANTAR' ? 'Buku Surat Pengantar' :
                            activeTab === 'BOOK_KETERANGAN' ? ' Buku Surat Keterangan' :
                              activeTab === 'BOOK_IJIN' ? 'Buku Surat Ijin' :
                                'Buku Mutasi Penduduk'}
                      </h1>
                      <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Data historis pengarsipan surat resmi lingkungan RT.</p>
                    </div>
                    <button
                      onClick={() => {
                        const bookData = filteredBookData
                          .map((p, idx) => ({
                            'No': idx + 1,
                            'No Surat': `#${(idx + 1).toString().padStart(3, '0')}`,
                            'Tanggal': formatDate(p.createdAt),
                            'Nama Warga': p.userName,
                            'NIK': p.userNik,
                            'Jenis Surat': p.typeName,
                            'Keterangan': p.keterangan || '-',
                            'Status': p.status
                          }));
                        handleExportExcel(bookData, activeTab);
                      }}
                      className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all uppercase tracking-widest text-xs"
                    >
                      <Download size={18} /> Export Excel
                    </button>
                  </header>

                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100">
                    <div className="relative w-full md:w-96">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search size={18} className="text-slate-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Cari warga, NIK, atau surat..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
                      {['ALL', 'PENDING', 'DIPROSES', 'DISETUJUI', 'DITOLAK'].map(status => (
                        <button
                          key={status}
                          onClick={() => setFilterType(status)}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${filterType === status
                              ? 'bg-indigo-900 text-white shadow-lg shadow-indigo-900/20'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                        >
                          {status === 'ALL' ? 'Semua Status' : status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/50">
                            <th className="px-4 md:px-8 py-3 md:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">No Surat</th>
                            <th className="hidden sm:table-cell px-4 md:px-8 py-3 md:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Tanggal</th>
                            <th className="px-4 md:px-8 py-3 md:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Nama Warga</th>
                            <th className="hidden md:table-cell px-4 md:px-8 py-3 md:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Jenis Surat</th>
                            <th className="hidden lg:table-cell px-4 md:px-8 py-3 md:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Keterangan</th>
                            <th className="px-4 md:px-8 py-3 md:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredBookData.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-20 text-center">
                                <FileText size={48} className="mx-auto text-slate-200 mb-4" />
                                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Belum ada data registrasi.</p>
                              </td>
                            </tr>
                          ) : (
                            filteredBookData.slice((pageBookLog - 1) * ITEMS_PER_PAGE, pageBookLog * ITEMS_PER_PAGE).map((p, idx) => (
                              <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td className="px-4 md:px-8 py-4 md:py-6 text-xs font-black text-slate-700 dark:text-slate-300">#{((pageBookLog - 1) * ITEMS_PER_PAGE + idx + 1).toString().padStart(3, '0')}</td>
                                <td className="hidden sm:table-cell px-4 md:px-8 py-4 md:py-6 text-xs font-bold text-slate-500">{formatDate(p.createdAt)}</td>
                                <td className="px-4 md:px-8 py-4 md:py-6 text-xs font-bold text-slate-900 dark:text-white uppercase">{p.userName}</td>
                                <td className="hidden md:table-cell px-4 md:px-8 py-4 md:py-6 text-xs font-bold text-indigo-900 dark:text-indigo-400 uppercase">{p.typeName}</td>
                                <td className="hidden lg:table-cell px-4 md:px-8 py-4 md:py-6 text-xs text-slate-500 line-clamp-1 max-w-[200px]">{p.keterangan || '-'}</td>
                                <td className="px-4 md:px-8 py-4 md:py-6">
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${p.status === 'DISETUJUI' ? 'bg-emerald-50 text-emerald-600' :
                                      p.status === 'DITOLAK' ? 'bg-rose-50 text-rose-600' :
                                        'bg-amber-50 text-amber-600'
                                    }`}>
                                    {p.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    {filteredBookData.length > 0 && (
                      <Pagination
                        currentPage={pageBookLog}
                        totalItems={filteredBookData.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setPageBookLog}
                      />
                    )}
                  </div>
                </div>
              )
            })()}

            {activeTab === 'BOOK_TEMP' && (() => {
              const filteredTemp = allTempResidents.filter(res =>
                res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                res.nik.includes(searchQuery) ||
                res.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
                res.purpose.toLowerCase().includes(searchQuery.toLowerCase())
              );
              return (
                <div className="space-y-10">
                  <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-none text-center sm:text-left">Buku Data Penduduk Tinggal Sementara</h1>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const tempData = filteredTemp.map((res, idx) => ({
                            'No': idx + 1,
                            'Nama': res.name,
                            'NIK': res.nik,
                            'Asal': res.origin,
                            'Tujuan': res.purpose,
                            'Mulai Tinggal': formatDate(res.startDate),
                            'No HP': res.phone || '-',
                            'Alamat di Asal': res.address || '-'
                          }));
                          handleExportExcel(tempData, 'Buku_Warga_Musiman');
                        }}
                        className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all uppercase tracking-widest text-xs"
                      >
                        <Download size={18} /> Export
                      </button>
                      <button
                        onClick={() => setShowAddTempModal(true)}
                        className="px-8 py-4 bg-indigo-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-indigo-900/20 active:scale-95"
                      >
                        Tambah Tamu
                      </button>
                    </div>
                  </header>

                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100">
                    <div className="relative w-full md:w-96">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search size={18} className="text-slate-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Cari nama, NIK, asal, atau tujuan..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    {filteredTemp.length === 0 ? (
                      <div className="p-40 text-center border-dashed border-2 border-slate-200 rounded-2xl m-8">
                        <Calendar size={64} className="mx-auto text-slate-200 mb-6" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Belum ada data warga musiman.</p>
                      </div>
                    ) : (
                      <>
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <th className="p-4 md:p-8">Nama</th>
                              <th className="hidden sm:table-cell p-4 md:p-8">NIK</th>
                              <th className="hidden md:table-cell p-4 md:p-8">Asal</th>
                              <th className="hidden lg:table-cell p-4 md:p-8">Tujuan</th>
                              <th className="hidden lg:table-cell p-4 md:p-8">Mulai</th>
                              <th className="p-4 md:p-8">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredTemp.slice((pageBookTamu - 1) * ITEMS_PER_PAGE, pageBookTamu * ITEMS_PER_PAGE).map(res => (
                              <tr key={res.id} className="hover:bg-slate-50 text-xs font-bold text-slate-600 dark:text-slate-300">
                                <td className="p-4 md:p-8 uppercase text-slate-900 dark:text-white">{res.name}</td>
                                <td className="hidden sm:table-cell p-4 md:p-8">{res.nik}</td>
                                <td className="hidden md:table-cell p-4 md:p-8">{res.origin}</td>
                                <td className="hidden lg:table-cell p-4 md:p-8">{res.purpose}</td>
                                <td className="hidden lg:table-cell p-4 md:p-8">{formatDate(res.startDate)}</td>
                                <td className="p-4 md:p-8">
                                  <div className="flex items-center gap-3">
                                    <button onClick={() => setEditingTemp(res)} className="text-indigo-500 font-black uppercase tracking-widest hover:underline">Edit</button>
                                    <button onClick={() => handleDeleteTemp(res.id)} className="text-rose-500 font-black uppercase tracking-widest hover:underline">Hapus</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <Pagination
                          currentPage={pageBookTamu}
                          totalItems={filteredTemp.length}
                          itemsPerPage={ITEMS_PER_PAGE}
                          onPageChange={setPageBookTamu}
                        />
                      </>
                    )}
                  </div>
                </div>
              )
            })()}

            {activeTab === 'INVENTORY' && (() => {
              const filteredInventory = allInventory
                .filter(i => filterType === 'ALL' || i.condition === filterType)
                .filter(i =>
                  i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (i.remarks || '').toLowerCase().includes(searchQuery.toLowerCase())
                );
              return (
                <div className="space-y-10">
                  <header className="flex items-center justify-between">
                    <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-none"> Buku Inventaris RT</h1>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const invData = filteredInventory.map((item, idx) => ({
                            'No': idx + 1,
                            'Nama Barang': item.name,
                            'Jumlah': item.quantity,
                            'Kondisi': item.condition,
                            'Sumber': item.source,
                            'Tanggal Masuk': formatDate(item.dateIn),
                            'Keterangan': item.remarks || '-'
                          }));
                          handleExportExcel(invData, 'Buku_Inventaris_RT');
                        }}
                        className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all uppercase tracking-widest text-xs"
                      >
                        <Download size={18} /> Export
                      </button>
                      <button
                        onClick={() => setShowAddInventoryModal(true)}
                        className="px-8 py-4 bg-indigo-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-indigo-900/20"
                      >
                        Tambah Barang
                      </button>
                    </div>
                  </header>

                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100">
                    <div className="relative w-full md:w-96">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search size={18} className="text-slate-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Cari barang inventaris..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
                      {['ALL', 'BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT'].map(status => (
                        <button
                          key={status}
                          onClick={() => setFilterType(status)}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${filterType === status
                              ? 'bg-indigo-900 text-white shadow-lg shadow-indigo-900/20'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                        >
                          {status === 'ALL' ? 'Semua Kondisi' : status.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredInventory.length === 0 ? (
                      <div className="col-span-full p-40 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 border-dashed">
                        <Box size={64} className="mx-auto text-slate-200 mb-6" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Gudang inventaris masih kosong.</p>
                      </div>
                    ) : filteredInventory.slice((pageInventaris - 1) * ITEMS_PER_PAGE, pageInventaris * ITEMS_PER_PAGE).map(item => (
                      <div key={item.id} className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 shadow-sm space-y-4 hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400"><Box size={24} /></div>
                          <div className="flex items-center gap-2">
                            <span className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase ${item.condition === 'BAIK' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{item.condition}</span>
                            <button onClick={() => setEditingInventory(item)} className="p-2 text-slate-400 hover:text-indigo-500 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 rounded-lg transition-colors">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDeleteInventory(item.id)} className="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 dark:bg-slate-800 rounded-lg transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase">{item.name}</h3>
                          <div className="flex items-center justify-between mt-4 py-3 border-t border-slate-50 dark:border-slate-800">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Jumlah</p>
                              <p className="text-lg font-black text-indigo-900 mt-1">{item.quantity} Unit</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Sumber</p>
                              <p className="text-sm font-bold text-slate-600 mt-1 uppercase">{item.source}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {filteredInventory.length > 0 && (
                    <Pagination
                      currentPage={pageInventaris}
                      totalItems={filteredInventory.length}
                      itemsPerPage={ITEMS_PER_PAGE}
                      onPageChange={setPageInventaris}
                    />
                  )}
                </div>
              )
            })()}

            {activeTab === 'INCIDENTS' && (() => {
              const filteredIncidents = allIncidents
                .filter(r =>
                  r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  r.reporter.toLowerCase().includes(searchQuery.toLowerCase())
                );
              return (
                <div className="space-y-10">
                  <header className="flex items-center justify-between">
                    <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">Buku Catatan Kejadian</h1>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const incidentData = filteredIncidents.map((log, idx) => ({
                            'No': idx + 1,
                            'Kejadian': log.title,
                            'Deskripsi': log.description,
                            'Tanggal': formatDate(log.date),
                            'Lokasi': log.location,
                            'Pelapor': log.reporter,
                          }));
                          handleExportExcel(incidentData, 'Buku_Catatan_Kejadian');
                        }}
                        className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all uppercase tracking-widest text-xs"
                      >
                        <Download size={18} /> Export
                      </button>
                      <button
                        onClick={() => setShowAddIncidentModal(true)}
                        className="px-8 py-4 bg-indigo-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-indigo-900/20"
                      >
                        Catat Kejadian
                      </button>
                    </div>
                  </header>

                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100">
                    <div className="relative w-full md:w-96">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search size={18} className="text-slate-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Cari kejadian..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    {filteredIncidents.length === 0 ? (
                      <div className="p-40 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 border-dashed">
                        <AlertTriangle size={64} className="mx-auto text-slate-200 mb-6" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Belum ada kejadian tercatat.</p>
                      </div>
                    ) : (
                      filteredIncidents.slice((pageKejadian - 1) * ITEMS_PER_PAGE, pageKejadian * ITEMS_PER_PAGE).map(log => (
                        <div key={log.id} className="p-10 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 flex flex-col gap-6">
                          <div className="flex flex-col md:flex-row items-start gap-8">
                            <div className="w-16 h-16 bg-rose-50 rounded-[24px] flex items-center justify-center text-rose-500 shrink-0">
                              <AlertTriangle size={30} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{log.title}</h3>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => setEditingIncident(log)} className="p-2 text-slate-400 hover:text-indigo-500 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 rounded-lg transition-colors">
                                    <Edit2 size={16} />
                                  </button>
                                  <button onClick={() => handleDeleteIncident(log.id)} className="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 dark:bg-slate-800 rounded-lg transition-colors">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                              <p className="text-base text-slate-500 mt-2 font-medium">{log.description}</p>
                              <div className="flex flex-wrap items-center gap-6 mt-4">
                                <span className="flex items-center gap-2 text-xs font-bold text-indigo-900 uppercase tracking-widest"><Calendar size={14} /> {formatDate(log.date)}</span>
                                <span className="flex items-center gap-2 text-xs font-bold text-indigo-900 uppercase tracking-widest"><MapPin size={14} /> {log.location}</span>
                              </div>
                            </div>
                          </div>
                          {(log as any).imageUrl && (
                            <div
                              className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 cursor-zoom-in"
                              onClick={() => setLightboxUrl(getCdnUrl((log as any).imageUrl))}
                              title="Klik untuk memperbesar"
                            >
                              <img src={getCdnUrl((log as any).imageUrl)} alt="Lampiran Kejadian" className="w-full max-h-56 object-cover hover:scale-[1.02] transition-transform duration-300" />
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  {filteredIncidents.length > 0 && (
                    <Pagination
                      currentPage={pageKejadian}
                      totalItems={filteredIncidents.length}
                      itemsPerPage={ITEMS_PER_PAGE}
                      onPageChange={setPageKejadian}
                    />
                  )}
                </div>
              )
            })()}

            {activeTab === 'REPORTS' && (() => {
              const activeReportsData = allReports.filter(r => r.status !== 'SELESAI');
              const filteredReports = activeReportsData
                .filter(r => filterType === 'ALL' || r.type === filterType)
                .filter(r =>
                  r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  r.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  r.userName.toLowerCase().includes(searchQuery.toLowerCase())
                );
              return (
                <div className="space-y-10">
                  <header className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">Laporan & Kritik Warga</h1>
                      <p className="text-slate-500 mt-2 font-medium">Suara warga untuk lingkungan yang lebih baik.</p>
                    </div>
                    <button
                      onClick={() => {
                        const reportData = filteredReports.map((r, idx) => ({
                          'No': idx + 1,
                          'Judul': r.title,
                          'Isi': r.content,
                          'Tanggal': formatDate(r.createdAt),
                          'Jenis': r.type,
                          'Status': r.status
                        }));
                        handleExportExcel(reportData, 'Laporan_Warga');
                      }}
                      className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all uppercase tracking-widest text-xs"
                    >
                      <Download size={18} /> Export Excel
                    </button>
                  </header>

                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100">
                    <div className="relative w-full md:w-96">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search size={18} className="text-slate-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Cari laporan..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
                      {['ALL', 'LAPORAN', 'KELUHAN', 'SARAN'].map(status => (
                        <button
                          key={status}
                          onClick={() => setFilterType(status)}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${filterType === status
                              ? 'bg-indigo-900 text-white shadow-lg shadow-indigo-900/20'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                        >
                          {status === 'ALL' ? 'Semua Kategori' : status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {filteredReports.length === 0 ? (
                        <div className="col-span-full p-40 text-center border-dashed border-2 border-slate-200 rounded-2xl">
                          <Mail size={64} className="mx-auto text-slate-200 mb-6" />
                          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Belum ada laporan masuk.</p>
                        </div>
                      ) : filteredReports.slice((pageLaporan - 1) * ITEMS_PER_PAGE, pageLaporan * ITEMS_PER_PAGE).map(report => (
                        <div key={report.id} className={`p-10 bg-white dark:bg-slate-900 rounded-[48px] border shadow-sm space-y-6 flex flex-col justify-between transition-all ${report.isPublic ? 'border-emerald-200 dark:border-emerald-900/40' : 'border-slate-100'}`}>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${report.type === 'LAPORAN' ? 'bg-rose-50 text-rose-600' : report.type === 'KELUHAN' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-900'}`}>{report.type}</span>
                                {/* Badge public/private */}
                                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${report.isPublic ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                  {report.isPublic ? <Globe size={11} /> : <Lock size={11} />}
                                  {report.isPublic ? 'Publik' : 'Privat'}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400">{formatDate(report.createdAt)}</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">{report.title}</h3>
                            <p className="text-base text-slate-500 font-medium leading-relaxed">{report.content}</p>
                            {(report as any).imageUrl && (
                              <div
                                className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 mt-2 cursor-zoom-in"
                                onClick={() => setLightboxUrl(getCdnUrl((report as any).imageUrl))}
                                title="Klik untuk memperbesar"
                              >
                                <img src={getCdnUrl((report as any).imageUrl)} alt="Lampiran" className="w-full max-h-56 object-cover hover:scale-[1.02] transition-transform duration-300" />
                              </div>
                            )}
                          </div>
                          <div className="pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-sm text-slate-500 uppercase overflow-hidden shrink-0">
                                {(report as any).userAvatar ? (
                                  <img src={getCdnUrl((report as any).userAvatar)} alt={report.userName} className="w-full h-full object-cover" />
                                ) : (
                                  report.userName[0]
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{report.userName}</p>
                                {/* Dropdown status */}
                                <select
                                  value={report.status}
                                  onChange={e => handleUpdateReportStatus(report.id, e.target.value)}
                                  className={`mt-1 text-[10px] font-black uppercase tracking-widest border-0 bg-transparent cursor-pointer focus:outline-none focus:ring-0 p-0 pr-4 ${report.status === 'SELESAI_DITANGANI' ? 'text-emerald-500' : 'text-amber-500'}`}
                                >
                                  <option value="BELUM_DITANGANI">BELUM DITANGANI</option>
                                  <option value="SELESAI_DITANGANI">SELESAI DITANGANI</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Toggle visibility dengan konfirmasi */}
                              <button
                                onClick={() => {
                                  if (!report.isPublic) {
                                    // Publikasikan → konfirmasi dulu
                                    setConfirmPublishReport(report);
                                  } else {
                                    // Sembunyikan → langsung
                                    reportsApi.updateVisibility(report.id, false)
                                      .then(() => setAllReports(prev => prev.map(r => r.id === report.id ? { ...r, isPublic: false } : r)))
                                      .catch(() => toast.error('Gagal mengubah visibilitas'));
                                  }
                                }}
                                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${report.isPublic ? 'bg-emerald-50 text-emerald-600 hover:bg-rose-50 hover:text-rose-600' : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'}`}
                                title={report.isPublic ? 'Jadikan Privat' : 'Publikasikan ke Forum'}
                              >
                                {report.isPublic ? <><EyeOff size={12} /> Sembunyikan</> : <><Globe size={12} /> Publikasikan</>}
                              </button>
                              <button
                                onClick={() => handleDeleteReport(report)}
                                className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-all active:scale-95"
                                title="Hapus Laporan Selamanya"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {filteredReports.length > 0 && (
                      <Pagination
                        currentPage={pageLaporan}
                        totalItems={filteredReports.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setPageLaporan}
                      />
                    )}
                  </div>
                </div>
              )
            })()}
            {activeTab === 'IURAN' && (
              <IuranAdmin onPaymentsChange={() => iuranApi.listPayments().then(setAllIuranPayments).catch(() => {})} />
            )}
            {activeTab === 'CMS' && (
              <div className="space-y-10 pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">Manajemen Landing Page</h1>
                    <p className="text-slate-500 mt-2 font-medium">Ubah konten landing page secara langsung di sini.</p>
                  </div>
                  <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto no-scrollbar">
                    {[
                      { id: 'HERO', label: 'Hero', icon: <Home size={14} /> },
                      { id: 'PROBLEM', label: 'Masalah/Solusi', icon: <AlertTriangle size={14} /> },
                      { id: 'STATS', label: 'Statistik', icon: <Hash size={14} /> },
                      { id: 'GALLERY', label: 'Galeri', icon: <Camera size={14} /> },
                      { id: 'FEATURES', label: 'Fitur', icon: <Grid size={14} /> },
                      { id: 'STEPS', label: 'Langkah', icon: <ClipboardList size={14} /> },
                      { id: 'CTA', label: 'CTA', icon: <ArrowRight size={14} /> },
                      { id: 'FOOTER', label: 'Footer', icon: <BookOpen size={14} /> }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setCmsSubTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap uppercase tracking-widest ${cmsSubTab === tab.id ? 'bg-indigo-900 text-white shadow-xl shadow-indigo-900/20' : 'text-slate-400 hover:text-indigo-900 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={cmsSubTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {cmsSubTab === 'HERO' && (
                      <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 p-8 md:p-12 shadow-sm max-w-4xl">
                        <form className="space-y-8" onSubmit={async (e) => {
                          e.preventDefault();
                          setIsSavingCms(true);
                          try {
                            const formData = new FormData(e.currentTarget);
                            const data: CMSHero = {
                              title: formData.get('title') as string,
                              subtitle: formData.get('subtitle') as string,
                              imageUrl: formData.get('imageUrl') as string,
                              updatedAt: new Date().toISOString()
                            };
                            await cmsService.updateHero(data);
                            setCmsHero(data);
                            toast.success('Konten Hero berhasil disimpan!');
                          } catch (err) {
                            toast.error('Gagal menyimpan Hero', String(err));
                          } finally {
                            setIsSavingCms(false);
                          }
                        }}>
                          <div className="grid grid-cols-1 gap-8">
                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Judul Utama (Hero Title)</label>
                              <input
                                name="title"
                                type="text"
                                defaultValue={cmsHero?.title || "Urus Surat RT Jadi Lebih Mudah & Cepat dari Rumah."}
                                className="w-full h-16 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-900 transition-all"
                                placeholder="Masukkan Judul..."
                                required
                              />
                            </div>
                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Slogan (Hero Subtitle)</label>
                              <textarea
                                name="subtitle"
                                className="w-full h-32 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-6 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-900 transition-all resize-none"
                                defaultValue={cmsHero?.subtitle || "Aplikasi Hallo Warga membantu warga RT 10 RW 04 mengurus pengajuan surat, mendapatkan informasi terbaru, dan mengelola data kependudukan secara digital."}
                                placeholder="Masukkan deskripsi penjelas..."
                                required
                              />
                            </div>
                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">URL atau Unggah Gambar Utama</label>
                              <div className="flex flex-col gap-4">
                                <div className="flex gap-4">
                                  <input
                                    id="heroImageUrl"
                                    name="imageUrl"
                                    type="text"
                                    defaultValue={cmsHero?.imageUrl || "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=800"}
                                    className="flex-1 h-16 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-900 transition-all"
                                    placeholder="https://images.unsplash.com/..."
                                    required
                                  />
                                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden shadow-inner border-2 border-white dark:border-slate-700 shrink-0">
                                    <img src={getCdnUrl(cmsHero?.imageUrl || "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=800")} className="w-full h-full object-cover" alt="Preview" />
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <input
                                    type="file"
                                    id="heroFile"
                                    className="hidden"
                                    accept="image/*,application/pdf"
                                    disabled={!!uploadingField}
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        setUploadingField('cmsHero');
                                        try {
                                          const fileId = await processImageUpload(file, 2);
                                          const input = document.getElementById('heroImageUrl') as HTMLInputElement;
                                          if (input) input.value = getCdnUrl(fileId);
                                          setCmsHero(prev => prev ? { ...prev, imageUrl: fileId } : { title: '', subtitle: '', updatedAt: '', imageUrl: fileId } as any);
                                        } catch (err: any) { toast.error('Gagal upload gambar', err.message); }
                                        finally { setUploadingField(null); }
                                      }
                                    }}
                                  />
                                  <button
                                    type="button"
                                    disabled={!!uploadingField}
                                    onClick={() => document.getElementById('heroFile')?.click()}
                                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${uploadingField ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                  >
                                    {uploadingField === 'cmsHero' ? <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin" /> : <Camera size={14} />}
                                    {uploadingField === 'cmsHero' ? 'Mengupload...' : 'Unggah dari Perangkat'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          <button
                            disabled={isSavingCms}
                            type="submit"
                            className="px-10 py-5 bg-indigo-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-950 transition-all shadow-2xl shadow-indigo-900/20 active:scale-95 disabled:opacity-50"
                          >
                            {isSavingCms ? 'Menyimpan...' : 'Simpan Perubahan Hero'}
                          </button>
                        </form>
                      </div>
                    )}

                    {cmsSubTab === 'GALLERY' && (
                      <div className="space-y-8">
                        <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 p-8 md:p-12 shadow-sm">
                          <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Tambah Foto Galeri</h3>
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${cmsGallery.length >= 6 ? 'bg-rose-100 text-rose-500' : 'bg-green-100 text-green-500'}`}>
                              {cmsGallery.length} / 6 Foto
                            </span>
                          </div>

                          {cmsGallery.length >= 6 && (
                            <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
                              <AlertTriangle size={16} /> Maksimal 6 foto di galeri. Hapus foto lama untuk menambah baru.
                            </div>
                          )}

                          <form className="space-y-5" onSubmit={async (e) => {
                            e.preventDefault();
                            if (cmsGallery.length >= 6) {
                              toast.warning('Galeri penuh', 'Maksimal 6 foto. Hapus foto lama untuk menambah baru.');
                              return;
                            }
                            const formData = new FormData(e.currentTarget);
                            const url = galleryImageValue.trim();
                            if (!url) {
                              toast.warning('Gambar wajib', 'Upload gambar atau isi URL terlebih dahulu.');
                              return;
                            }
                            setIsSavingCms(true);
                            try {
                              const newItem: Omit<CMSGalleryItem, 'id'> = {
                                title: galleryTitleInput.trim() || (formData.get('title') as string),
                                desc: galleryDescInput.trim() || (formData.get('desc') as string),
                                url,
                                order: cmsGallery.length + 1,
                                createdAt: new Date().toISOString()
                              };
                              const id = await cmsService.addGalleryItem(newItem);
                              if (id) {
                                setCmsGallery([...cmsGallery, { ...newItem, id }]);
                                (e.target as any)?.reset?.();
                                setGalleryPreviewUrl('');
                                setGalleryImageValue('');
                                setGalleryUrlInput('');
                                setGalleryTitleInput('');
                                setGalleryDescInput('');
                                setGalleryPreviewError(false);
                                setGalleryUploadMode('upload');
                                toast.success('Foto berhasil ditambahkan ke galeri!');
                              }
                            } catch (err) {
                              toast.error('Gagal menambah foto', String(err));
                            } finally {
                              setIsSavingCms(false);
                            }
                          }}>
                            {/* Tab Upload / URL */}
                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Sumber Gambar</label>
                              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                                <button
                                  type="button"
                                  onClick={() => setGalleryUploadMode('upload')}
                                  className={`px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${galleryUploadMode === 'upload' ? 'bg-white dark:bg-slate-900 text-indigo-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                  <Upload size={13} /> Upload File
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setGalleryUploadMode('url')}
                                  className={`px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${galleryUploadMode === 'url' ? 'bg-white dark:bg-slate-900 text-indigo-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                  <Globe size={13} /> Dari URL
                                </button>
                              </div>
                            </div>

                            {/* Image picker — Upload mode */}
                            {galleryUploadMode === 'upload' && (
                              <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Unggah Gambar</label>
                                <div className="flex flex-col sm:flex-row gap-4">
                                  {/* Preview */}
                                  <div className="w-full sm:w-32 h-32 bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center">
                                    {galleryPreviewUrl ? (
                                      <img src={galleryPreviewUrl} className="w-full h-full object-cover" alt="Preview" />
                                    ) : (
                                      <Camera size={28} className="text-slate-300" />
                                    )}
                                  </div>
                                  {/* Upload button */}
                                  <div className="flex-1 flex flex-col gap-3">
                                    <input
                                      type="file"
                                      id="galleryFile"
                                      className="hidden"
                                      accept="image/*"
                                      disabled={!!uploadingField}
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          setUploadingField('cmsGallery');
                                          try {
                                            const fileId = await processImageUpload(file, 2);
                                            setGalleryImageValue(fileId);
                                            setGalleryPreviewUrl(getCdnUrl(fileId));
                                            toast.success('Gambar berhasil diupload.');
                                          } catch (err: any) { toast.error('Gagal upload gambar', err.message); }
                                          finally { setUploadingField(null); }
                                        }
                                      }}
                                    />
                                    <button
                                      type="button"
                                      disabled={!!uploadingField}
                                      onClick={() => document.getElementById('galleryFile')?.click()}
                                      className={`flex-1 min-h-[80px] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 ${uploadingField ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed' : 'border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-900 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}
                                    >
                                      {uploadingField === 'cmsGallery' ? (
                                        <>
                                          <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-900 rounded-full animate-spin" />
                                          <span className="text-[10px] font-black uppercase tracking-widest">Mengupload...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Upload size={20} />
                                          <span className="text-[10px] font-black uppercase tracking-widest">Pilih File Gambar</span>
                                          <span className="text-[10px] font-medium text-slate-400 normal-case tracking-normal">JPG, PNG, WebP (Maks. 2MB)</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Image picker — URL mode */}
                            {galleryUploadMode === 'url' && (
                              <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">URL Gambar</label>
                                <div className="flex flex-col sm:flex-row gap-4">
                                  {/* Preview */}
                                  <div className="w-full sm:w-32 h-32 bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center">
                                    {galleryPreviewUrl && !galleryPreviewError ? (
                                      <img
                                        src={galleryPreviewUrl}
                                        className="w-full h-full object-cover"
                                        alt="Preview"
                                        onError={() => setGalleryPreviewError(true)}
                                      />
                                    ) : (
                                      <Globe size={28} className="text-slate-300" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <input
                                      type="url"
                                      placeholder="https://example.com/foto.jpg"
                                      value={galleryUrlInput}
                                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-xs font-bold focus:ring-2 focus:ring-indigo-900 transition-all"
                                      onChange={(e) => {
                                        const url = e.target.value;
                                        setGalleryUrlInput(url);
                                        setGalleryImageValue(url.trim());
                                        setGalleryPreviewUrl(url.trim());
                                        setGalleryPreviewError(false);
                                      }}
                                    />
                                    <p className="text-[10px] text-slate-400 mt-2 px-1">Masukkan URL gambar yang valid (mis. dari Unsplash, CDN, dsb).</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Title & Description */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between px-1">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Judul Foto</label>
                                  <span className={`text-[10px] font-bold tabular-nums ${galleryTitleInput.length > 50 ? 'text-rose-500' : 'text-slate-400'}`}>
                                    {galleryTitleInput.length}/60
                                  </span>
                                </div>
                                <input
                                  name="title"
                                  type="text"
                                  placeholder="Mis. Kerja Bakti Minggu Pagi"
                                  value={galleryTitleInput}
                                  onChange={(e) => setGalleryTitleInput(e.target.value.slice(0, 60))}
                                  maxLength={60}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-xs font-bold focus:ring-2 focus:ring-indigo-900 transition-all"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between px-1">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan Singkat</label>
                                  <span className={`text-[10px] font-bold tabular-nums ${galleryDescInput.length > 180 ? 'text-rose-500' : 'text-slate-400'}`}>
                                    {galleryDescInput.length}/200
                                  </span>
                                </div>
                                <input
                                  name="desc"
                                  type="text"
                                  placeholder="Mis. Warga membersihkan taman RT"
                                  value={galleryDescInput}
                                  onChange={(e) => setGalleryDescInput(e.target.value.slice(0, 200))}
                                  maxLength={200}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-xs font-bold focus:ring-2 focus:ring-indigo-900 transition-all"
                                  required
                                />
                              </div>
                            </div>

                            {/* Submit */}
                            <button
                              type="submit"
                              disabled={isSavingCms || !!uploadingField}
                              className="w-full md:w-auto px-10 py-4 bg-indigo-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-950 transition-all shadow-xl shadow-indigo-900/20 active:scale-95 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                            >
                              <Plus size={14} />
                              {isSavingCms ? 'Menyimpan...' : 'Tambah Foto Galeri'}
                            </button>
                          </form>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {cmsGallery.map((item) => (
                            <div key={item.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm group flex flex-col">
                              <div className="aspect-video relative overflow-hidden shrink-0">
                                <img src={getCdnUrl(item.url)} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.title} />
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => setEditingGalleryItem(item)}
                                    className="w-10 h-10 bg-white/90 backdrop-blur rounded-xl flex items-center justify-center text-indigo-900 hover:bg-indigo-900 hover:text-white transition-all shadow-lg"
                                    title="Edit foto"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const ok = await confirm({ title: 'Hapus Foto', message: 'Hapus foto ini dari galeri?', confirmLabel: 'Ya, Hapus', variant: 'danger' });
                                      if (ok) {
                                        await cmsService.deleteGalleryItem(item.id);
                                        setCmsGallery(cmsGallery.filter(g => g.id !== item.id));
                                        toast.success('Foto berhasil dihapus.');
                                      }
                                    }}
                                    className="w-10 h-10 bg-white/90 backdrop-blur rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-lg"
                                    title="Hapus foto"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                              <div className="p-5 flex flex-col flex-1">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5 line-clamp-1">{item.title}</h4>
                                <p className="text-[11px] font-medium text-slate-400 line-clamp-2 leading-relaxed">{item.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Modal Edit Gallery */}
                        <AnimatePresence>
                          {editingGalleryItem && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
                              onClick={() => setEditingGalleryItem(null)}
                            >
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
                              >
                                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
                                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Edit Foto Galeri</h3>
                                  <button
                                    onClick={() => setEditingGalleryItem(null)}
                                    className="w-9 h-9 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                                  >
                                    <X size={18} />
                                  </button>
                                </div>
                                <form
                                  className="p-6 space-y-5 overflow-y-auto"
                                  onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (!editingGalleryItem) return;
                                    setIsSavingCms(true);
                                    try {
                                      const updated: CMSGalleryItem = { ...editingGalleryItem };
                                      await cmsService.updateGalleryItem(editingGalleryItem.id, {
                                        url: updated.url,
                                        title: updated.title,
                                        desc: updated.desc,
                                        order: updated.order,
                                      });
                                      setCmsGallery(cmsGallery.map(g => g.id === updated.id ? updated : g));
                                      toast.success('Foto galeri berhasil diperbarui.');
                                      setEditingGalleryItem(null);
                                    } catch (err) {
                                      toast.error('Gagal memperbarui foto', String(err));
                                    } finally {
                                      setIsSavingCms(false);
                                    }
                                  }}
                                >
                                  {/* Preview + tombol ganti gambar */}
                                  <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Gambar</label>
                                    <div className="flex flex-col sm:flex-row gap-4">
                                      <div className="w-full sm:w-40 h-32 bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                                        {editingGalleryItem.url && (
                                          <img
                                            src={getCdnUrl(editingGalleryItem.url)}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = editingGalleryItem.url; }}
                                          />
                                        )}
                                      </div>
                                      <div className="flex-1 space-y-2">
                                        <input
                                          type="file"
                                          id="editGalleryFile"
                                          className="hidden"
                                          accept="image/*"
                                          disabled={!!uploadingField}
                                          onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file && editingGalleryItem) {
                                              setUploadingField('cmsGalleryEdit');
                                              try {
                                                const fileId = await processImageUpload(file, 2);
                                                setEditingGalleryItem({ ...editingGalleryItem, url: fileId });
                                                toast.success('Gambar berhasil diupload.');
                                              } catch (err: any) { toast.error('Gagal upload gambar', err.message); }
                                              finally { setUploadingField(null); }
                                            }
                                          }}
                                        />
                                        <button
                                          type="button"
                                          disabled={!!uploadingField}
                                          onClick={() => document.getElementById('editGalleryFile')?.click()}
                                          className={`w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${uploadingField ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-900/40'}`}
                                        >
                                          {uploadingField === 'cmsGalleryEdit' ? (
                                            <>
                                              <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-900 rounded-full animate-spin" />
                                              Mengupload...
                                            </>
                                          ) : (
                                            <>
                                              <Upload size={13} /> Ganti dengan File Baru
                                            </>
                                          )}
                                        </button>
                                        <input
                                          type="url"
                                          placeholder="atau ganti dengan URL gambar"
                                          value={editingGalleryItem.url || ''}
                                          onChange={(e) => setEditingGalleryItem({ ...editingGalleryItem, url: e.target.value })}
                                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-900 transition-all"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Title */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between px-1">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Judul</label>
                                      <span className={`text-[10px] font-bold tabular-nums ${(editingGalleryItem.title?.length || 0) > 50 ? 'text-rose-500' : 'text-slate-400'}`}>
                                        {(editingGalleryItem.title?.length || 0)}/60
                                      </span>
                                    </div>
                                    <input
                                      type="text"
                                      value={editingGalleryItem.title}
                                      onChange={(e) => setEditingGalleryItem({ ...editingGalleryItem, title: e.target.value.slice(0, 60) })}
                                      maxLength={60}
                                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-xs font-bold focus:ring-2 focus:ring-indigo-900 transition-all"
                                      required
                                    />
                                  </div>

                                  {/* Description */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between px-1">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan</label>
                                      <span className={`text-[10px] font-bold tabular-nums ${(editingGalleryItem.desc?.length || 0) > 180 ? 'text-rose-500' : 'text-slate-400'}`}>
                                        {(editingGalleryItem.desc?.length || 0)}/200
                                      </span>
                                    </div>
                                    <textarea
                                      value={editingGalleryItem.desc}
                                      onChange={(e) => setEditingGalleryItem({ ...editingGalleryItem, desc: e.target.value.slice(0, 200) })}
                                      maxLength={200}
                                      rows={3}
                                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-xs font-bold focus:ring-2 focus:ring-indigo-900 transition-all resize-none"
                                      required
                                    />
                                  </div>

                                  {/* Buttons */}
                                  <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingGalleryItem(null)}
                                      className="flex-1 sm:flex-initial px-6 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                    >
                                      Batal
                                    </button>
                                    <button
                                      type="submit"
                                      disabled={isSavingCms || !!uploadingField}
                                      className="flex-1 px-6 py-3.5 bg-indigo-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-950 transition-all shadow-xl shadow-indigo-900/20 active:scale-95 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                                    >
                                      {isSavingCms ? 'Menyimpan...' : 'Simpan Perubahan'}
                                    </button>
                                  </div>
                                </form>
                              </motion.div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {cmsSubTab === 'STATS' && (
                      <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 p-8 md:p-12 shadow-sm max-w-4xl space-y-8">
                        <div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit Statistik Landing Page</h3>
                          <p className="text-xs text-slate-500 mt-1">Item statistik yang ditampilkan di bagian gelap landing page.</p>
                        </div>
                        {cmsStats.map((s, i) => (
                          <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl group">
                            <div className="w-10 h-10 rounded-xl bg-indigo-900/10 text-indigo-900 flex items-center justify-center font-black text-lg shrink-0">{i + 1}</div>
                            <div className="flex-1 grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nilai</label>
                                <input className="w-full px-4 py-3 bg-white dark:bg-slate-800 rounded-xl font-bold text-sm outline-none border border-slate-200 dark:border-slate-700" placeholder="cth: 70%" value={s.value} onChange={e => { const u = [...cmsStats]; u[i] = { ...u[i], value: e.target.value }; setCmsStats(u); }} />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Label</label>
                                <input className="w-full px-4 py-3 bg-white dark:bg-slate-800 rounded-xl font-bold text-sm outline-none border border-slate-200 dark:border-slate-700" placeholder="cth: Efisiensi Waktu" value={s.label} onChange={e => { const u = [...cmsStats]; u[i] = { ...u[i], label: e.target.value }; setCmsStats(u); }} />
                              </div>
                            </div>
                            <button onClick={() => setCmsStats(cmsStats.filter((_, idx) => idx !== i))} className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-100 shrink-0"><X size={14} /></button>
                          </div>
                        ))}
                        <div className="flex items-center gap-4">
                          <button onClick={() => setCmsStats([...cmsStats, { value: '', label: '' }])} className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-bold hover:bg-slate-200 transition-colors"><Plus size={16} /> Tambah Item</button>
                          <button onClick={async () => { setIsSavingCms(true); await cmsService.updateContent('stats', cmsStats); setIsSavingCms(false); toast.success('Statistik berhasil disimpan!'); }} disabled={isSavingCms} className="px-10 py-3 bg-indigo-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-900/20 hover:bg-indigo-950 active:scale-95 transition-all">{isSavingCms ? 'Menyimpan...' : 'Simpan'}</button>
                        </div>
                      </div>
                    )}

                    {cmsSubTab === 'FEATURES' && (() => {
                      const iconOptions = [
                        { name: 'Mail', icon: <Mail size={20} />, label: 'Surat' },
                        { name: 'Bell', icon: <Bell size={20} />, label: 'Notifikasi' },
                        { name: 'UserIcon', icon: <UserIcon size={20} />, label: 'Pengguna' },
                        { name: 'Activity', icon: <Activity size={20} />, label: 'Aktivitas' },
                        { name: 'CheckCircle2', icon: <CheckCircle2 size={20} />, label: 'Centang' },
                        { name: 'Shield', icon: <ShieldCheck size={20} />, label: 'Keamanan' },
                        { name: 'FileText', icon: <FileText size={20} />, label: 'Dokumen' },
                        { name: 'Heart', icon: <Heart size={20} />, label: 'Hati' },
                        { name: 'Users', icon: <Users size={20} />, label: 'Warga' },
                        { name: 'Home', icon: <Home size={20} />, label: 'Rumah' },
                        { name: 'Globe', icon: <Globe size={20} />, label: 'Web' },
                        { name: 'Clock', icon: <Clock size={20} />, label: 'Waktu' },
                        { name: 'BookOpen', icon: <BookOpen size={20} />, label: 'Buku' },
                        { name: 'Briefcase', icon: <Briefcase size={20} />, label: 'Usaha' },
                      ];
                      const colorOptions = [
                        { name: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500', label: 'Biru Tua' },
                        { name: 'blue', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Biru' },
                        { name: 'teal', bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500', label: 'Hijau' },
                        { name: 'amber', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Kuning' },
                        { name: 'rose', bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500', label: 'Merah' },
                        { name: 'slate', bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500', label: 'Abu' },
                        { name: 'purple', bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500', label: 'Ungu' },
                        { name: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Zamrud' },
                      ];

                      const renderFeatureEditor = (items: typeof cmsFeaturesWarga, setItems: typeof setCmsFeaturesWarga, title: string, sectionKey: string) => (
                        <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 p-8 md:p-12 shadow-sm space-y-8">
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h3>
                          {items.map((f, i) => (
                            <div key={i} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl space-y-5 relative group">
                              <button onClick={() => { const u = items.filter((_, idx) => idx !== i); setItems(u); }} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-100"><X size={14} /></button>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Judul Fitur</label>
                                <input className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 rounded-2xl font-bold text-sm text-slate-900 dark:text-white outline-none focus:ring-2 ring-indigo-900/20 border border-slate-200 dark:border-slate-700" value={f.title} onChange={e => { const u = [...items]; u[i] = { ...u[i], title: e.target.value }; setItems(u); }} />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Deskripsi</label>
                                <textarea className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 rounded-2xl font-bold text-sm text-slate-900 dark:text-white outline-none focus:ring-2 ring-indigo-900/20 resize-none border border-slate-200 dark:border-slate-700" rows={2} value={f.desc} onChange={e => { const u = [...items]; u[i] = { ...u[i], desc: e.target.value }; setItems(u); }} />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Ikon</label>
                                <div className="flex flex-wrap gap-2">
                                  {iconOptions.map(opt => (
                                    <button key={opt.name} onClick={() => { const u = [...items]; u[i] = { ...u[i], icon: opt.name }; setItems(u); }} title={opt.label} className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${f.icon === opt.name ? 'bg-indigo-900 text-white shadow-lg shadow-indigo-900/30 scale-110' : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'}`}>
                                      {opt.icon}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Warna</label>
                                <div className="flex flex-wrap gap-2">
                                  {colorOptions.map(opt => (
                                    <button key={opt.name} onClick={() => { const u = [...items]; u[i] = { ...u[i], color: opt.name }; setItems(u); }} title={opt.label} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${f.color === opt.name ? 'ring-2 ring-indigo-900 ring-offset-2 ' + opt.bg + ' ' + opt.text : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'}`}>
                                      <span className={`w-3 h-3 rounded-full ${opt.dot}`} />
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                          <div className="flex items-center gap-4">
                            <button onClick={() => setItems([...items, { icon: 'FileText', title: '', desc: '', color: 'indigo' }])} className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><Plus size={16} /> Tambah Fitur</button>
                            <button onClick={async () => { setIsSavingCms(true); await cmsService.updateContent(sectionKey, items); setIsSavingCms(false); toast.success('Fitur berhasil disimpan!'); }} disabled={isSavingCms} className="px-10 py-3 bg-indigo-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-900/20 hover:bg-indigo-950 active:scale-95 transition-all">{isSavingCms ? 'Menyimpan...' : 'Simpan'}</button>
                          </div>
                        </div>
                      );

                      return (
                        <div className="space-y-8 max-w-4xl">
                          {renderFeatureEditor(cmsFeaturesWarga, setCmsFeaturesWarga, 'Fitur Layanan Warga', 'features_warga')}
                          {renderFeatureEditor(cmsFeaturesAdmin, setCmsFeaturesAdmin, 'Fitur Layanan Admin', 'features_admin')}
                        </div>
                      );
                    })()}

                    {cmsSubTab === 'STEPS' && (() => {
                      const stepIconOptions = [
                        { name: 'UserIcon', icon: <UserIcon size={18} />, label: 'Pengguna' },
                        { name: 'Shield', icon: <ShieldCheck size={18} />, label: 'Keamanan' },
                        { name: 'FileText', icon: <FileText size={18} />, label: 'Dokumen' },
                        { name: 'CheckCircle2', icon: <CheckCircle2 size={18} />, label: 'Selesai' },
                        { name: 'Mail', icon: <Mail size={18} />, label: 'Surat' },
                        { name: 'Home', icon: <Home size={18} />, label: 'Rumah' },
                        { name: 'Bell', icon: <Bell size={18} />, label: 'Notifikasi' },
                        { name: 'Activity', icon: <Activity size={18} />, label: 'Aktivitas' },
                        { name: 'Search', icon: <Search size={18} />, label: 'Cari' },
                        { name: 'Download', icon: <Download size={18} />, label: 'Unduh' },
                      ];
                      return (
                        <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 p-8 md:p-12 shadow-sm max-w-4xl space-y-8">
                          <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Langkah Cara Kerja</h3>
                            <p className="text-xs text-slate-500 mt-1">Atur langkah-langkah yang ditampilkan di section "Bagaimana Cara Kerjanya?"</p>
                          </div>
                          {cmsSteps.map((s, i) => (
                            <div key={i} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl space-y-4 relative group">
                              <button onClick={() => setCmsSteps(cmsSteps.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-100"><X size={14} /></button>
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-900 text-white flex items-center justify-center font-black text-lg shrink-0">{s.num}</div>
                                <div className="flex-1 grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nomor</label>
                                    <input className="w-full px-4 py-3 bg-white dark:bg-slate-800 rounded-xl font-bold text-sm outline-none border border-slate-200 dark:border-slate-700" value={s.num} onChange={e => { const u = [...cmsSteps]; u[i] = { ...u[i], num: e.target.value }; setCmsSteps(u); }} />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Judul</label>
                                    <input className="w-full px-4 py-3 bg-white dark:bg-slate-800 rounded-xl font-bold text-sm outline-none border border-slate-200 dark:border-slate-700" value={s.title} onChange={e => { const u = [...cmsSteps]; u[i] = { ...u[i], title: e.target.value }; setCmsSteps(u); }} />
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Deskripsi</label>
                                <textarea className="w-full px-4 py-3 bg-white dark:bg-slate-800 rounded-xl font-bold text-sm outline-none resize-none border border-slate-200 dark:border-slate-700" rows={2} value={s.desc} onChange={e => { const u = [...cmsSteps]; u[i] = { ...u[i], desc: e.target.value }; setCmsSteps(u); }} />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Ikon</label>
                                <div className="flex flex-wrap gap-2">
                                  {stepIconOptions.map(opt => (
                                    <button key={opt.name} onClick={() => { const u = [...cmsSteps]; u[i] = { ...u[i], icon: opt.name }; setCmsSteps(u); }} title={opt.label} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${s.icon === opt.name ? 'bg-indigo-900 text-white shadow-lg shadow-indigo-900/30 scale-110' : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-indigo-50 border border-slate-200 dark:border-slate-600'}`}>
                                      {opt.icon}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                          <div className="flex items-center gap-4">
                            <button onClick={() => setCmsSteps([...cmsSteps, { num: String(cmsSteps.length + 1), title: '', desc: '', icon: 'FileText' }])} className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-bold hover:bg-slate-200 transition-colors"><Plus size={16} /> Tambah Langkah</button>
                            <button onClick={async () => { setIsSavingCms(true); await cmsService.updateContent('steps', cmsSteps); setIsSavingCms(false); toast.success('Langkah berhasil disimpan!'); }} disabled={isSavingCms} className="px-10 py-3 bg-indigo-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-900/20 hover:bg-indigo-950 active:scale-95 transition-all">{isSavingCms ? 'Menyimpan...' : 'Simpan'}</button>
                          </div>
                        </div>
                      );
                    })()}

                    {cmsSubTab === 'CTA' && (
                      <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 p-8 md:p-12 shadow-sm max-w-4xl space-y-6">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Call To Action (CTA)</h3>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Judul CTA</label>
                          <textarea className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-sm outline-none resize-none" rows={3} value={cmsCta.title} onChange={e => setCmsCta({ ...cmsCta, title: e.target.value })} />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Teks Tombol</label>
                          <input className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-sm outline-none" value={cmsCta.buttonText} onChange={e => setCmsCta({ ...cmsCta, buttonText: e.target.value })} />
                        </div>
                        <button onClick={async () => { setIsSavingCms(true); await cmsService.updateContent('cta', cmsCta); setIsSavingCms(false); toast.success('CTA berhasil disimpan!'); }} disabled={isSavingCms} className="px-10 py-4 bg-indigo-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Simpan CTA</button>
                      </div>
                    )}

                    {cmsSubTab === 'PROBLEM' && (
                      <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 p-8 md:p-12 shadow-sm max-w-4xl space-y-6">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Section Masalah & Solusi</h3>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Judul Section</label>
                          <input className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-sm outline-none" value={cmsProblem.sectionTitle} onChange={e => setCmsProblem({ ...cmsProblem, sectionTitle: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest px-1">Judul Masalah</label>
                            <input className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-sm outline-none" value={cmsProblem.oldTitle} onChange={e => setCmsProblem({ ...cmsProblem, oldTitle: e.target.value })} />
                            <textarea className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-sm outline-none resize-none" rows={3} value={cmsProblem.oldDesc} onChange={e => setCmsProblem({ ...cmsProblem, oldDesc: e.target.value })} />
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">Judul Solusi</label>
                            <input className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-sm outline-none" value={cmsProblem.newTitle} onChange={e => setCmsProblem({ ...cmsProblem, newTitle: e.target.value })} />
                            <textarea className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-sm outline-none resize-none" rows={3} value={cmsProblem.newDesc} onChange={e => setCmsProblem({ ...cmsProblem, newDesc: e.target.value })} />
                          </div>
                        </div>
                        <button onClick={async () => { setIsSavingCms(true); await cmsService.updateContent('problem_solution', cmsProblem); setIsSavingCms(false); toast.success('Konten berhasil disimpan!'); }} disabled={isSavingCms} className="px-10 py-4 bg-indigo-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Simpan</button>
                      </div>
                    )}

                    {cmsSubTab === 'FOOTER' && (
                      <div className="space-y-8">
                        <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 p-8 md:p-12 shadow-sm max-w-4xl">
                          <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-900 dark:text-indigo-400 flex items-center justify-center rounded-2xl">
                              <BookOpen size={24} />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Manual Book & Panduan</h3>
                              <p className="text-xs text-slate-500 font-medium tracking-tight">Atur link pedoman penggunaan aplikasi untuk warga.</p>
                            </div>
                          </div>

                          <div className="space-y-6">
                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Link Manual Book (Google Drive)</label>
                              <input
                                type="text"
                                value={config.footerSettings?.manualBookUrl || ''}
                                onChange={e => setConfig({ ...config, footerSettings: { ...config.footerSettings, manualBookUrl: e.target.value } })}
                                className="w-full h-16 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-900 transition-all"
                                placeholder="https://drive.google.com/file/d/..."
                              />
                              <p className="text-[10px] text-slate-400 font-medium italic mt-1">Pastikan link dapat diakses oleh siapa saja (Public with Link).</p>
                            </div>

                            <button
                              onClick={async () => {
                                setIsSavingCms(true);
                                try {
                                  await configService.updateConfig(config);
                                  toast.success('Pengaturan panduan berhasil disimpan!');
                                } catch (err) {
                                  toast.error('Gagal menyimpan pengaturan', String(err));
                                } finally {
                                  setIsSavingCms(false);
                                }
                              }}
                              className="px-10 py-5 bg-indigo-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-950 transition-all shadow-2xl shadow-indigo-900/20 active:scale-95"
                            >
                              Simpan Pengaturan
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}

            {activeTab === 'SETTINGS' && (
              <div className="max-w-4xl space-y-12">
                <section className="space-y-8">
                  <div>
                    <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">Profil Pengelola</h1>
                    <p className="text-slate-500 mt-2 font-medium">Atur foto profil dan identitas login Admin Anda.</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-[48px] border border-slate-100 dark:border-slate-800 p-8 md:p-12 shadow-sm">
                    <div className="flex flex-col md:flex-row items-center gap-12">
                      <div className="relative group">
                        {uploadingField === 'avatar' && (
                          <div className="absolute inset-0 z-10 rounded-[40px] bg-indigo-900/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                            <span className="text-[9px] font-black text-white uppercase tracking-widest">Upload CDN...</span>
                          </div>
                        )}
                        <div className="w-32 h-32 rounded-[40px] bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-700 shadow-2xl overflow-hidden flex items-center justify-center">
                          {profileData.avatar ? (
                            <img src={getCdnUrl(profileData.avatar)} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon size={48} className="text-slate-300" />
                          )}
                        </div>
                        <label className={`absolute bottom-[-10px] right-[-10px] w-12 h-12 bg-indigo-900 text-white rounded-2xl flex items-center justify-center shadow-xl transition-all ${uploadingField ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110 active:scale-95'}`}>
                          {uploadingField === 'avatar' ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Camera size={20} />}
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            disabled={!!uploadingField}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setUploadingField('avatar');
                                try {
                                  if (profileData.avatar) deleteFromCdn(profileData.avatar);
                                  const { uploadToCdn } = await import('../lib/cdnUtils');
                                  const fileId = await uploadToCdn(file, 'HalloWarga-Avatar');
                                  setProfileData({ ...profileData, avatar: fileId });
                                } catch (err: any) { toast.error('Gagal upload avatar', err.message); }
                                finally { setUploadingField(null); }
                              }
                            }}
                          />
                        </label>
                      </div>
                      <div className="flex-1 w-full space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                            <input type="text" value={profileData.name} onChange={e => setProfileData({ ...profileData, name: e.target.value })} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white outline-none focus:ring-4 ring-indigo-900/10" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Login</label>
                            <input type="email" value={profileData.email} onChange={e => setProfileData({ ...profileData, email: e.target.value })} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white outline-none focus:ring-4 ring-indigo-900/10" />
                          </div>
                        </div>
                        <button onClick={handleUpdateAdminProfile} className="px-10 py-4 bg-indigo-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-900/20 active:scale-95 transition-all">Update Profil Admin</button>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="w-full h-px bg-slate-100 dark:bg-slate-800" />

                <section className="space-y-8">
                  <div>
                    <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">Pengaturan Profil RT</h1>
                    <p className="text-slate-500 mt-2 font-medium">Konfigurasi profile dan identitas untuk Header/Kop Surat.</p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-[48px] border border-slate-100 p-4 md:p-8 lg:p-12 shadow-sm space-y-8 md:space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-3 col-span-full">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Kota/Kabupaten</label>
                        <input type="text" value={config.cityName} onChange={e => setConfig({ ...config, cityName: e.target.value })} className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white focus:ring-4 ring-indigo-900/10 outline-none" placeholder="KOTA PROBOLINGGO" />
                      </div>
                      {/* Logo */}
                      <div className="space-y-3 col-span-full">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Logo RT / Kop Surat</label>
                        <div className="flex items-center gap-6">
                          {uploadingField === 'logo' ? (
                            <div className="w-24 h-24 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border-2 border-dashed border-indigo-300 flex flex-col items-center justify-center gap-2 shrink-0">
                              <div className="w-7 h-7 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                              <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Upload...</span>
                            </div>
                          ) : config.logoUrl ? (
                            <div className="w-24 h-24 rounded-2xl bg-white border border-slate-200 dark:border-slate-700 flex items-center justify-center p-2 shadow-sm shrink-0">
                              <img src={getCdnUrl(config.logoUrl)} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                              <Camera size={28} className="text-slate-300" />
                            </div>
                          )}
                          <div className="flex-1 space-y-3">
                            <label className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest w-fit transition-all ${uploadingField ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-400 cursor-pointer hover:bg-indigo-100'}`}>
                              {uploadingField === 'logo' ? <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin" /> : <Upload size={14} />}
                              {uploadingField === 'logo' ? 'Mengupload ke CDN...' : 'Upload Logo'}
                              <input type="file" className="hidden" accept="image/*,application/pdf" disabled={!!uploadingField} onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setUploadingField('logo');
                                  try {
                                    const { uploadToCdn } = await import('../lib/cdnUtils');
                                    const fileId = await uploadToCdn(file, 'HalloWarga-Logo');
                                    setConfig({ ...config, logoUrl: fileId });
                                  } catch (err: any) { toast.error('Gagal upload logo', err.message); }
                                  finally { setUploadingField(null); }
                                }
                              }} />
                            </label>
                            {config.logoUrl && (
                              <button onClick={() => { if (config.logoUrl) deleteFromCdn(config.logoUrl); setConfig({ ...config, logoUrl: '' }); }} className="text-[10px] font-bold text-rose-400 hover:text-rose-600 uppercase tracking-widest">Hapus Logo</button>
                            )}
                            <p className="text-[10px] text-slate-400 font-medium italic">Gunakan gambar PNG transparan untuk hasil terbaik di PDF.</p>
                          </div>
                        </div>
                      </div>

                      {/* Tanda Tangan Ketua RT */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tanda Tangan Ketua RT</label>
                        <div className="flex items-center gap-5">
                          {config.signatureUrl ? (
                            <div className="w-32 h-16 rounded-xl bg-white border border-slate-200 dark:border-slate-700 flex items-center justify-center p-2 shadow-sm shrink-0">
                              <img src={getCdnUrl(config.signatureUrl)} alt="TTD RT" className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <div className="w-32 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border-2 border-dashed border-slate-200">
                              <span className="text-[10px] text-slate-400 font-bold text-center px-2">Belum ada TTD</span>
                            </div>
                          )}
                          <div className="space-y-2">
                            <label className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest w-fit transition-all ${uploadingField ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-200'}`}>
                              {uploadingField === 'signatureRt' ? <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /> : <Upload size={13} />}
                              {uploadingField === 'signatureRt' ? 'Mengupload...' : 'Upload TTD RT'}
                              <input type="file" className="hidden" accept="image/*,application/pdf" disabled={!!uploadingField} onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setUploadingField('signatureRt');
                                  try {
                                    const { uploadToCdn } = await import('../lib/cdnUtils');
                                    const fileId = await uploadToCdn(file, 'HalloWarga-TTD-RT');
                                    setConfig({ ...config, signatureUrl: fileId });
                                  } catch (err: any) { toast.error('Gagal upload TTD RT', err.message); }
                                  finally { setUploadingField(null); }
                                }
                              }} />
                            </label>
                            {config.signatureUrl && (
                              <button onClick={() => { if (config.signatureUrl) deleteFromCdn(config.signatureUrl); setConfig({ ...config, signatureUrl: '' }); }} className="text-[10px] font-bold text-rose-400 hover:text-rose-600 uppercase tracking-widest">Hapus</button>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium italic">Upload gambar tanda tangan PNG transparan. Akan muncul otomatis di semua surat.</p>
                      </div>

                      {/* Tanda Tangan Ketua RW */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tanda Tangan Ketua RW</label>
                        <div className="flex items-center gap-5">
                          {config.rwSignatureUrl ? (
                            <div className="w-32 h-16 rounded-xl bg-white border border-slate-200 dark:border-slate-700 flex items-center justify-center p-2 shadow-sm shrink-0">
                              <img src={getCdnUrl(config.rwSignatureUrl)} alt="TTD RW" className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <div className="w-32 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border-2 border-dashed border-slate-200">
                              <span className="text-[10px] text-slate-400 font-bold text-center px-2">Belum ada TTD</span>
                            </div>
                          )}
                          <div className="space-y-2">
                            <label className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest w-fit transition-all ${uploadingField ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-200'}`}>
                              {uploadingField === 'signatureRw' ? <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /> : <Upload size={13} />}
                              {uploadingField === 'signatureRw' ? 'Mengupload...' : 'Upload TTD RW'}
                              <input type="file" className="hidden" accept="image/*,application/pdf" disabled={!!uploadingField} onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setUploadingField('signatureRw');
                                  try {
                                    const { uploadToCdn } = await import('../lib/cdnUtils');
                                    const fileId = await uploadToCdn(file, 'HalloWarga-TTD-RW');
                                    setConfig({ ...config, rwSignatureUrl: fileId });
                                  } catch (err: any) { toast.error('Gagal upload TTD RW', err.message); }
                                  finally { setUploadingField(null); }
                                }
                              }} />
                            </label>
                            {config.rwSignatureUrl && (
                              <button onClick={() => { if (config.rwSignatureUrl) deleteFromCdn(config.rwSignatureUrl); setConfig({ ...config, rwSignatureUrl: '' }); }} className="text-[10px] font-bold text-rose-400 hover:text-rose-600 uppercase tracking-widest">Hapus</button>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium italic">Upload gambar tanda tangan PNG transparan. Akan muncul otomatis di semua surat.</p>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Kelurahan</label>
                        <input type="text" value={config.villageName} onChange={e => setConfig({ ...config, villageName: e.target.value })} className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white focus:ring-4 ring-indigo-900/10 outline-none" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kecamatan</label>
                        <input type="text" value={config.districtName} onChange={e => setConfig({ ...config, districtName: e.target.value })} className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white focus:ring-4 ring-indigo-900/10 outline-none" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor RT</label>
                        <input type="text" value={config.rtNumber} onChange={e => setConfig({ ...config, rtNumber: e.target.value })} className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white focus:ring-4 ring-indigo-900/10 outline-none" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor RW</label>
                        <input type="text" value={config.rwNumber} onChange={e => setConfig({ ...config, rwNumber: e.target.value })} className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white focus:ring-4 ring-indigo-900/10 outline-none" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Ketua RT</label>
                        <input type="text" value={config.rtLeaderName} onChange={e => setConfig({ ...config, rtLeaderName: e.target.value })} className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white focus:ring-4 ring-indigo-900/10 outline-none" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Ketua RW</label>
                        <input type="text" value={config.rwLeaderName} onChange={e => setConfig({ ...config, rwLeaderName: e.target.value })} className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white focus:ring-4 ring-indigo-900/10 outline-none" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Sekretariat</label>
                      <textarea value={config.secretaryAddress} onChange={e => setConfig({ ...config, secretaryAddress: e.target.value })} className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white min-h-[120px] focus:ring-4 ring-indigo-900/10 outline-none" />
                    </div>

                    <div className="pt-12 border-t border-slate-50 flex flex-col gap-12">
                      <section className="space-y-8">
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">Sosial Media</h3>
                          <p className="text-slate-500 mt-2 font-medium">Hubungkan warga dengan platform media sosial RT.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instagram</label>
                            <input type="text" value={config.socialMedia?.instagram || ''} onChange={e => setConfig({ ...config, socialMedia: { ...config.socialMedia, instagram: e.target.value } })} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white outline-none focus:ring-4 ring-indigo-900/10" placeholder="https://instagram.com/username" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Facebook</label>
                            <input type="text" value={config.socialMedia?.facebook || ''} onChange={e => setConfig({ ...config, socialMedia: { ...config.socialMedia, facebook: e.target.value } })} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white outline-none focus:ring-4 ring-indigo-900/10" placeholder="https://facebook.com/username" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Twitter (X)</label>
                            <input type="text" value={config.socialMedia?.twitter || ''} onChange={e => setConfig({ ...config, socialMedia: { ...config.socialMedia, twitter: e.target.value } })} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white outline-none focus:ring-4 ring-indigo-900/10" placeholder="https://twitter.com/username" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                            <input type="text" value={config.socialMedia?.whatsapp || ''} onChange={e => setConfig({ ...config, socialMedia: { ...config.socialMedia, whatsapp: e.target.value } })} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white outline-none focus:ring-4 ring-indigo-900/10" placeholder="628123456789" />
                          </div>
                        </div>
                      </section>

                      <section className="space-y-8">
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">Dokumen & Kebijakan</h3>
                          <p className="text-slate-500 mt-2 font-medium">Konfigurasi teks kebijakan dan link panduan.</p>
                        </div>
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Syarat & Ketentuan</label>
                            <textarea value={config.footerSettings?.termsAndConditions || ''} onChange={e => setConfig({ ...config, footerSettings: { ...config.footerSettings, termsAndConditions: e.target.value } })} className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-medium text-slate-900 dark:text-white min-h-[150px] focus:ring-4 ring-indigo-900/10 outline-none" placeholder="Tuliskan syarat dan ketentuan..." />
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kebijakan Privasi</label>
                            <textarea value={config.footerSettings?.privacyPolicy || ''} onChange={e => setConfig({ ...config, footerSettings: { ...config.footerSettings, privacyPolicy: e.target.value } })} className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-medium text-slate-900 dark:text-white min-h-[150px] focus:ring-4 ring-indigo-900/10 outline-none" placeholder="Tuliskan kebijakan privasi..." />
                          </div>
                        </div>
                      </section>

                      <section className="space-y-8">
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">Pengaturan Upload Media</h3>
                          <p className="text-slate-500 mt-2 font-medium">Atur batas ukuran file gambar yang dapat diunggah warga dan admin.</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 space-y-6">
                          <div className="flex items-start justify-between gap-6">
                            <div className="space-y-1">
                              <p className="text-sm font-black text-slate-900 dark:text-white">Batas Ukuran Gambar</p>
                              <p className="text-xs text-slate-400 font-medium">Berlaku untuk upload gambar di Papan Informasi, Catatan Kejadian, dan Laporan Warga.</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-3xl font-black text-indigo-900 dark:text-indigo-400 min-w-[3rem] text-right">{config.maxUploadSizeMb || 5}</span>
                              <span className="text-sm font-bold text-slate-400">MB</span>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <input
                              type="range"
                              min="1"
                              max="15"
                              step="1"
                              value={config.maxUploadSizeMb || 5}
                              onChange={e => setConfig({ ...config, maxUploadSizeMb: parseInt(e.target.value) })}
                              className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-900"
                            />
                            <div className="flex justify-between text-[10px] font-black text-slate-300 uppercase tracking-widest">
                              <span>1 MB</span>
                              <span>5 MB (default)</span>
                              <span>15 MB</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-2">
                            {[2, 5, 8, 10].map(sz => (
                              <button
                                key={sz}
                                type="button"
                                onClick={() => setConfig({ ...config, maxUploadSizeMb: sz })}
                                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${(config.maxUploadSizeMb || 5) === sz ? 'bg-indigo-900 text-white' : 'bg-white dark:bg-slate-700 text-slate-500 border border-slate-200 dark:border-slate-600 hover:border-indigo-300'}`}
                              >
                                {sz} MB
                              </button>
                            ))}
                          </div>
                        </div>
                      </section>

                      <div className="flex items-center justify-between">
                        <button
                          onClick={async () => {
                            try {
                              await configService.updateConfig(config);
                              if (onConfigChange) onConfigChange(config);
                              alert('Konfigurasi Profil Lingkungan berhasil disimpan!');
                            } catch (err: any) {
                              alert('Gagal menyimpan konfigurasi: ' + (err.message || 'Terjadi kesalahan pada server'));
                            }
                          }}
                          className="px-16 py-6 bg-indigo-900 text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-indigo-900/40 active:scale-95 transition-all"
                        >
                          Simpan Semua Pengaturan
                        </button>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest max-w-[200px] text-right">Data ini akan disimpan permanen di sistem.</p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add/Edit Warga Modal */}
      <AnimatePresence>
        {(showAddWargaModal || showEditWargaModal) && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAddWargaModal(false);
                setShowEditWargaModal(false);
                setSelectedWarga(null);
              }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[48px] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-10 md:p-12 overflow-y-auto">
                <header className="mb-10 text-center">
                  <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-900 dark:text-indigo-400 flex items-center justify-center rounded-3xl mx-auto mb-6">
                    {showEditWargaModal ? <Edit2 size={32} /> : <UserPlus size={32} />}
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {showEditWargaModal ? 'Perbarui Data Warga' : 'Daftarkan Warga Baru'}
                  </h2>
                  <p className="text-slate-400 dark:text-slate-500 font-bold mt-2 uppercase tracking-widest text-[10px]">
                    {showEditWargaModal ? 'Pastikan informasi terbaru sudah benar' : 'Lengkapi data kependudukan secara akurat'}
                  </p>
                </header>

                <WargaForm
                  initialData={showEditWargaModal ? selectedWarga : undefined}
                  onSubmit={showEditWargaModal ? handleEditWarga : handleAddWarga}
                  onCancel={() => {
                    setShowAddWargaModal(false);
                    setShowEditWargaModal(false);
                    setSelectedWarga(null);
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirmModal && selectedWarga && (
          <div className="fixed inset-0 flex items-center justify-center z-[110] px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowDeleteConfirmModal(false);
                setSelectedWarga(null);
              }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl relative p-10 overflow-hidden text-center"
            >
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 text-rose-600 flex items-center justify-center rounded-3xl mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight mb-2">Konfirmasi Hapus</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">
                Apakah Anda yakin ingin menghapus data <span className="text-slate-900 dark:text-white font-bold">{selectedWarga.name}</span>? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmDeleteWarga}
                  className="w-full py-4 bg-rose-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-rose-700 transition-all shadow-xl shadow-rose-500/20 active:scale-95"
                >
                  Hapus Selamanya
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirmModal(false);
                    setSelectedWarga(null);
                  }}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Batalkan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* === MODAL RESET PASSWORD === */}
      <AnimatePresence>
        {showResetPasswordModal && selectedWarga && (
          <div className="fixed inset-0 flex items-center justify-center z-[400] px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowResetPasswordModal(false); setSelectedWarga(null); setNewPassword(''); }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl p-10 max-w-md w-full z-10"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 shadow-sm">
                  <Key size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Reset Password</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">{selectedWarga.name}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password Baru</label>
                  <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      type="text"
                      placeholder="Masukkan password baru..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-900/10 focus:border-indigo-900 transition-all font-bold text-slate-900 dark:text-white"
                      autoFocus
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium ml-1">Pastikan Anda memberikan password baru ini kepada warga yang bersangkutan.</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setShowResetPasswordModal(false); setSelectedWarga(null); setNewPassword(''); }}
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleResetPassword}
                    className="flex-1 py-4 bg-indigo-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-950 transition-all shadow-xl shadow-indigo-900/20 active:scale-95"
                  >
                    Reset Sekarang
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Info Modal */}
      <AnimatePresence>
        {(showAddInfoModal || showEditInfoModal) && (
          <div className="fixed inset-0 flex items-center justify-center z-[120] px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAddInfoModal(false);
                setShowEditInfoModal(false);
                setSelectedInfo(null);
              }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-10 md:p-12 overflow-y-auto">
                <header className="mb-10 text-center">
                  <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-900 dark:text-indigo-400 flex items-center justify-center rounded-3xl mx-auto mb-6">
                    {showEditInfoModal ? <Edit2 size={32} /> : <Megaphone size={32} />}
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                    {showEditInfoModal ? 'Perbarui Berita' : 'Publikasi Berita Baru'}
                  </h2>
                  <p className="text-slate-400 dark:text-slate-500 font-bold mt-2 uppercase tracking-widest text-[10px]">
                    {showEditInfoModal ? 'Update informasi untuk seluruh warga' : 'Informasi ini akan muncul di dashboard warga'}
                  </p>
                </header>

                <InfoForm
                  initialData={showEditInfoModal ? selectedInfo : undefined}
                  onSubmit={showEditInfoModal ? handleEditInfo : handleAddInfo}
                  maxSizeMb={config.maxUploadSizeMb || 5}
                  onCancel={() => {
                    setShowAddInfoModal(false);
                    setShowEditInfoModal(false);
                    setSelectedInfo(null);
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Info Confirmation Modal */}
      <AnimatePresence>
        {showDeleteInfoConfirmModal && selectedInfo && (
          <div className="fixed inset-0 flex items-center justify-center z-[130] px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowDeleteInfoConfirmModal(false);
                setSelectedInfo(null);
              }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl relative p-10 overflow-hidden text-center"
            >
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 text-rose-600 flex items-center justify-center rounded-3xl mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight mb-2">Konfirmasi Hapus</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">
                Apakah Anda yakin ingin menghapus berita <span className="text-slate-900 dark:text-white font-bold">{selectedInfo.title}</span>?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmDeleteInfo}
                  className="w-full py-4 bg-rose-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-rose-700 transition-all shadow-xl shadow-rose-500/20 active:scale-95"
                >
                  Ya, Hapus
                </button>
                <button
                  onClick={() => {
                    setShowDeleteInfoConfirmModal(false);
                    setSelectedInfo(null);
                  }}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Template Modal (Visual Builder) */}
      <AnimatePresence>
        {showEditTemplateModal && selectedTemplate && (
          <div className="fixed inset-0 z-[150] overflow-hidden flex flex-col bg-slate-900/50 backdrop-blur-md">
            <TemplateVisualEditor
              template={selectedTemplate}
              config={config}
              onUpdateConfig={setConfig}
              onSave={(updated) => {
                suratTypesApi.update(updated.id, updated)
                  .then(() => suratTypesApi.getAll())
                  .then(types => { if (types?.length) setAllTemplates(types); })
                  .catch(() => {
                    // fallback ke local state saja
                    const up = allTemplates.map(t => t.id === updated.id ? updated : t);
                    setAllTemplates(up);
                  });
                setShowEditTemplateModal(false);
                setSelectedTemplate(null);
              }}
              onCancel={() => {
                setShowEditTemplateModal(false);
                setSelectedTemplate(null);
              }}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Process Request Modal (Visual Builder) */}
      <AnimatePresence>
        {processingSurat && (() => {
          // Cari template: by typeId → by typeName → default dengan blocks pengajuan
          const foundTemplate =
            allTemplates.find(t => t.id === processingSurat.typeId) ||
            allTemplates.find(t => t.name.toLowerCase() === processingSurat.typeName.toLowerCase()) ||
            allTemplates[0];

          // Gabungkan template dengan blocks dari pengajuan (jika ada)
          let finalBlocks = undefined;

          let pBlocks = processingSurat.blocks;
          if (typeof pBlocks === 'string') {
            try { pBlocks = JSON.parse(pBlocks); } catch (e) { pBlocks = undefined; }
          }

          if (Array.isArray(pBlocks) && pBlocks.length > 0) {
            finalBlocks = pBlocks;
          } else if (foundTemplate?.blocks && foundTemplate.blocks.length > 0) {
            // Auto populate placeholders!
            finalBlocks = foundTemplate.blocks.map(b => {
              const newBlock = { ...b };

              const replacePlaceholders = (text: string) => {
                let res = text;
                const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
                const now = new Date();

                res = res.replace(/{{NAMA}}/g, processingSurat.userName);
                res = res.replace(/{{NIK}}/g, processingSurat.userNik);
                res = res.replace(/{{KEPERLUAN}}/g, processingSurat.keterangan);

                // Variabel lingkungan RT/RW (Sama dengan PDF)
                res = res.replace(/{{RT}}/g, config.rtNumber);
                res = res.replace(/{{RW}}/g, config.rwNumber);
                res = res.replace(/{{KELURAHAN}}/g, config.villageName);
                res = res.replace(/{{KECAMATAN}}/g, config.districtName);
                res = res.replace(/{{KOTA}}/g, config.cityName);
                res = res.replace(/{{TAHUN}}/g, now.getFullYear().toString());
                res = res.replace(/{{BULAN_ROMAWI}}/g, romanMonths[now.getMonth()]);

                Object.entries(processingSurat.data).forEach(([key, val]) => {
                  const regex = new RegExp(`{{${key.toUpperCase()}}}`, 'g');
                  res = res.replace(regex, (val as string) || '');
                });
                return res;
              };

              if (newBlock.type === 'PARAGRAPH' && newBlock.content) {
                newBlock.content = replacePlaceholders(newBlock.content);
              }

              if (newBlock.type === 'DATA_GRID' && newBlock.config?.fields) {
                if (!newBlock.config.values) newBlock.config.values = [];
                newBlock.config.fields.forEach((field, i) => {
                  if (newBlock.config!.values![i] === undefined) {
                    const ck = field.toLowerCase().replace(/\s/g, '').replace(/^\d+\./, '');
                    if (ck.includes('nama')) newBlock.config!.values![i] = processingSurat.userName;
                    else if (ck.includes('status') || ck.includes('kawin') || ck.includes('nikah')) newBlock.config!.values![i] = processingSurat.data.statusPernikahan || '-';
                    else if (ck.includes('nik')) newBlock.config!.values![i] = processingSurat.userNik;
                    else if (ck.includes('jenis')) newBlock.config!.values![i] = processingSurat.data.jenisKelamin || '-';
                    else if (ck.includes('tempat') || ck.includes('lahir')) newBlock.config!.values![i] = processingSurat.data.tempatLahir || processingSurat.data.tglLahir || '-';
                    else if (ck.includes('alamat')) newBlock.config!.values![i] = processingSurat.data.alamat || processingSurat.data.alamatLengkap || '-';
                    else if (ck.includes('agama')) newBlock.config!.values![i] = processingSurat.data.agama || '-';
                    else if (ck.includes('pekerjaan')) newBlock.config!.values![i] = processingSurat.data.pekerjaan || '-';
                    else if (ck.includes('keperluan')) newBlock.config!.values![i] = processingSurat.keterangan || '-';
                    else newBlock.config!.values![i] = processingSurat.data[field] || processingSurat.data[ck] || "-";
                  }
                });
              }

              return newBlock;
            });
          }

          const templateToUse: import('../types').SuratType = {
            ...(foundTemplate || { id: processingSurat.typeId, name: processingSurat.typeName, description: '', category: 'PENGANTAR' as any }),
            blocks: finalBlocks

          };

          return (
            <div className="fixed inset-0 z-[150] overflow-hidden flex flex-col">
              <TemplateVisualEditor
                template={templateToUse}
                pengajuan={processingSurat}
                config={config}
                onUpdateConfig={setConfig}
                onSave={async (_, blocks) => {
                  setUploadingField('processingSurat');
                  try {
                    const { generatePDF } = await import('../utils');
                    const { processImageUpload } = await import('../lib/imageUtils');
                    const filename = `Surat-${processingSurat.typeName}-${processingSurat.userName}-${processingSurat.id}.pdf`.replace(/\s+/g, '_');
                    const pdfBlob = await generatePDF(filename, '', config, blocks, processingSurat, true);
                    const file = new File([pdfBlob], filename, { type: 'application/pdf' });
                    const pdfUrl = await processImageUpload(file, 5);
                    await handleUpdateStatus(processingSurat.id, 'DISETUJUI', undefined, undefined, pdfUrl, blocks);
                    setProcessingSurat(null);
                  } catch (err: any) {
                    alert('Gagal memproses PDF: ' + err.message);
                  } finally {
                    setUploadingField(null);
                  }
                }}
                onCancel={() => {
                  setProcessingSurat(null);
                }}
              />
            </div>
          );
        })()}
      </AnimatePresence>

      {/* NEW MODULE MODALS */}
      <AnimatePresence>
        {showAddInventoryModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-12">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowAddInventoryModal(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[32px] md:rounded-[48px] p-6 md:p-12 shadow-2xl overflow-y-auto max-h-[90vh]">
              <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 md:mb-8">Tambah Inventaris Baru</h2>
              <form onSubmit={handleAddInventory} className="space-y-8">
                <AdminFormInput label="Nama Barang" placeholder="Misal: Tenda, Kursi Lipat" value={newInventory.name || ''} onChange={v => setNewInventory({ ...newInventory, name: v })} required />
                <div className="grid grid-cols-2 gap-6">
                  <AdminFormInput label="Jumlah" placeholder="0" type="number" value={newInventory.quantity?.toString() || ''} onChange={v => setNewInventory({ ...newInventory, quantity: Number(v) })} required />
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kondisi</label>
                    <select value={newInventory.condition} onChange={e => setNewInventory({ ...newInventory, condition: e.target.value as any })} className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white outline-none">
                      <option value="BAIK">BAIK</option>
                      <option value="RUSAK_RINGAN">RUSAK RINGAN</option>
                      <option value="RUSAK_BERAT">RUSAK BERAT</option>
                    </select>
                  </div>
                </div>
                <AdminFormInput label="Sumber / Asal Barang" placeholder="Misal: Hibah RW / Pembelian RT" value={newInventory.source || ''} onChange={v => setNewInventory({ ...newInventory, source: v })} />
                <div className="pt-6 flex gap-4">
                  <button type="submit" className="flex-1 py-5 bg-indigo-900 text-white rounded-3xl font-black uppercase tracking-widest text-xs">Simpan Data</button>
                  <button type="button" onClick={() => setShowAddInventoryModal(false)} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase tracking-widest text-xs">Batal</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingInventory && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-12">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setEditingInventory(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[32px] md:rounded-[48px] p-6 md:p-12 shadow-2xl overflow-y-auto max-h-[90vh]">
              <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 md:mb-8">Edit Inventaris</h2>
              <form onSubmit={handleEditInventory} className="space-y-8">
                <AdminFormInput label="Nama Barang" placeholder="" value={editingInventory.name || ''} onChange={v => setEditingInventory({ ...editingInventory, name: v })} required />
                <div className="grid grid-cols-2 gap-6">
                  <AdminFormInput label="Jumlah" placeholder="" type="number" value={editingInventory.quantity?.toString() || ''} onChange={v => setEditingInventory({ ...editingInventory, quantity: Number(v) })} required />
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kondisi</label>
                    <select value={editingInventory.condition} onChange={e => setEditingInventory({ ...editingInventory, condition: e.target.value as any })} className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white outline-none">
                      <option value="BAIK">BAIK</option>
                      <option value="RUSAK_RINGAN">RUSAK RINGAN</option>
                      <option value="RUSAK_BERAT">RUSAK BERAT</option>
                    </select>
                  </div>
                </div>
                <AdminFormInput label="Sumber / Asal Barang" placeholder="" value={editingInventory.source || ''} onChange={v => setEditingInventory({ ...editingInventory, source: v })} />
                <div className="pt-6 flex gap-4">
                  <button type="submit" className="flex-1 py-5 bg-indigo-900 text-white rounded-3xl font-black uppercase tracking-widest text-xs">Simpan Perubahan</button>
                  <button type="button" onClick={() => setEditingInventory(null)} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase tracking-widest text-xs">Batal</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddIncidentModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-12">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowAddIncidentModal(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[32px] md:rounded-[48px] p-6 md:p-12 shadow-2xl overflow-y-auto max-h-[90vh]">
              <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 md:mb-8">Catat Kejadian Lingkungan</h2>
              <form onSubmit={handleAddIncident} className="space-y-8">
                <AdminFormInput label="Judul Kejadian" placeholder="Misal: Pohon Tumbang di Jl. Melati" value={newIncident.title || ''} onChange={v => setNewIncident({ ...newIncident, title: v })} required />
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Keterangan / Kronologi</label>
                  <textarea value={newIncident.description || ''} onChange={e => setNewIncident({ ...newIncident, description: e.target.value })} className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white min-h-[120px] outline-none" required />
                </div>
                <AdminFormInput label="Lokasi" placeholder="Lokasi tepatnya..." value={newIncident.location || ''} onChange={v => setNewIncident({ ...newIncident, location: v })} required />
                {/* Image Upload */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Foto Dokumentasi (opsional)</label>
                  <label className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-indigo-400 transition-all group">
                    {(newIncident as any).imageUrl ? (
                      <div className="relative w-full">
                        <img src={getCdnUrl((newIncident as any).imageUrl)} alt="Preview" className="w-full max-h-40 object-cover rounded-xl" />
                        <button type="button" onClick={(e) => { e.preventDefault(); setNewIncident({ ...newIncident, imageUrl: undefined } as any); }} className="absolute top-2 right-2 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center">
                          <X size={14} />
                        </button>
                      </div>
                    ) : uploadingField === 'newIncident' ? (
                      <>
                        <div className="w-6 h-6 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
                        <span className="text-xs font-bold text-slate-400">Mengupload ke CDN...</span>
                      </>
                    ) : (
                      <>
                        <Camera size={24} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                        <span className="text-xs font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">Upload lampiran (foto/pdf)</span>
                        <span className="text-[10px] text-slate-300">Maks {config.maxUploadSizeMb || 5}MB</span>
                      </>
                    )}
                    <input type="file" accept="image/*,application/pdf" className="hidden" disabled={!!uploadingField} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingField('newIncident');
                      try {
                        const fileId = await processImageUpload(file, config.maxUploadSizeMb || 5);
                        setNewIncident({ ...newIncident, imageUrl: fileId } as any);
                      } catch (err: any) { toast.error('Gagal upload lampiran', err.message); }
                      finally { setUploadingField(null); }
                    }} />
                  </label>
                </div>
                <div className="pt-6 flex gap-4">
                  <button type="submit" className="flex-1 py-5 bg-indigo-900 hover:bg-indigo-950 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-900/20 transition-all">Simpan Kejadian</button>
                  <button type="button" onClick={() => setShowAddIncidentModal(false)} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase tracking-widest text-xs">Batal</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingIncident && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-12">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setEditingIncident(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[32px] md:rounded-[48px] p-6 md:p-12 shadow-2xl overflow-y-auto max-h-[90vh]">
              <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 md:mb-8">Edit Kejadian Lingkungan</h2>
              <form onSubmit={handleEditIncident} className="space-y-8">
                <AdminFormInput label="Judul Kejadian" placeholder="" value={editingIncident.title || ''} onChange={v => setEditingIncident({ ...editingIncident, title: v })} required />
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Keterangan / Kronologi</label>
                  <textarea value={editingIncident.description || ''} onChange={e => setEditingIncident({ ...editingIncident, description: e.target.value })} className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white min-h-[120px] outline-none" required />
                </div>
                <AdminFormInput label="Lokasi" placeholder="" value={editingIncident.location || ''} onChange={v => setEditingIncident({ ...editingIncident, location: v })} required />
                {/* Image Upload */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Foto Dokumentasi (opsional)</label>
                  <label className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-indigo-400 transition-all group">
                    {(editingIncident as any).imageUrl ? (
                      <div className="relative w-full">
                        <img src={getCdnUrl((editingIncident as any).imageUrl)} alt="Preview" className="w-full max-h-40 object-cover rounded-xl" />
                        <button type="button" onClick={(e) => { e.preventDefault(); setEditingIncident({ ...editingIncident, imageUrl: undefined } as any); }} className="absolute top-2 right-2 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center">
                          <X size={14} />
                        </button>
                      </div>
                    ) : uploadingField === 'editIncident' ? (
                      <>
                        <div className="w-6 h-6 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
                        <span className="text-xs font-bold text-slate-400">Mengupload ke CDN...</span>
                      </>
                    ) : (
                      <>
                        <Camera size={24} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                        <span className="text-xs font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">Upload lampiran (foto/pdf)</span>
                        <span className="text-[10px] text-slate-300">Maks {config.maxUploadSizeMb || 5}MB</span>
                      </>
                    )}
                    <input type="file" accept="image/*,application/pdf" className="hidden" disabled={!!uploadingField} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingField('editIncident');
                      try {
                        const fileId = await processImageUpload(file, config.maxUploadSizeMb || 5);
                        setEditingIncident({ ...editingIncident, imageUrl: fileId } as any);
                      } catch (err: any) { toast.error('Gagal upload lampiran', err.message); }
                      finally { setUploadingField(null); }
                    }} />
                  </label>
                </div>
                <div className="pt-6 flex gap-4">
                  <button type="submit" className="flex-1 py-5 bg-indigo-900 hover:bg-indigo-950 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-900/20 transition-all">Simpan Perubahan</button>
                  <button type="button" onClick={() => setEditingIncident(null)} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase tracking-widest text-xs">Batal</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddTempModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-12">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowAddTempModal(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[32px] md:rounded-[48px] p-6 md:p-12 shadow-2xl overflow-y-auto max-h-[90vh]">
              <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 md:mb-8">Data Warga Tinggal Sementara</h2>
              <form onSubmit={handleAddTemp} className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <AdminFormInput label="Nama Lengkap" placeholder="Nama..." value={newTemp.name || ''} onChange={v => setNewTemp({ ...newTemp, name: v })} required />
                  <AdminFormInput label="NIK" placeholder="16 digit NIK" value={newTemp.nik || ''} onChange={v => setNewTemp({ ...newTemp, nik: v })} required />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <AdminFormInput label="Daerah Asal" placeholder="Kota Asal..." value={newTemp.origin || ''} onChange={v => setNewTemp({ ...newTemp, origin: v })} required />
                  <AdminFormInput label="Tujuan Berkunjung" placeholder="Misal: Kerja, Liburan" value={newTemp.purpose || ''} onChange={v => setNewTemp({ ...newTemp, purpose: v })} required />
                </div>
                <AdminFormInput label="Alamat di Lingkungan RT" placeholder="Alamat menginap..." value={newTemp.address || ''} onChange={v => setNewTemp({ ...newTemp, address: v })} required />
                <AdminFormInput label="No. WhatsApp" placeholder="0812..." value={newTemp.phone || ''} onChange={v => setNewTemp({ ...newTemp, phone: v })} required />
                <div className="pt-6 flex gap-4">
                  <button type="submit" className="flex-1 py-5 bg-indigo-900 text-white rounded-3xl font-black uppercase tracking-widest text-xs">Simpan Data Tamu</button>
                  <button type="button" onClick={() => setShowAddTempModal(false)} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase tracking-widest text-xs">Batal</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingTemp && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-12">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setEditingTemp(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[32px] md:rounded-[48px] p-6 md:p-12 shadow-2xl overflow-y-auto max-h-[90vh]">
              <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 md:mb-8">Edit Warga Tinggal Sementara</h2>
              <form onSubmit={handleEditTemp} className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <AdminFormInput label="Nama Lengkap" placeholder="" value={editingTemp.name || ''} onChange={v => setEditingTemp({ ...editingTemp, name: v })} required />
                  <AdminFormInput label="NIK" placeholder="" value={editingTemp.nik || ''} onChange={v => setEditingTemp({ ...editingTemp, nik: v })} required />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <AdminFormInput label="Daerah Asal" placeholder="" value={editingTemp.origin || ''} onChange={v => setEditingTemp({ ...editingTemp, origin: v })} required />
                  <AdminFormInput label="Tujuan Berkunjung" placeholder="" value={editingTemp.purpose || ''} onChange={v => setEditingTemp({ ...editingTemp, purpose: v })} required />
                </div>
                <AdminFormInput label="Alamat di Lingkungan RT" placeholder="" value={editingTemp.address || ''} onChange={v => setEditingTemp({ ...editingTemp, address: v })} required />
                <AdminFormInput label="No. WhatsApp" placeholder="" value={editingTemp.phone || ''} onChange={v => setEditingTemp({ ...editingTemp, phone: v })} required />
                <div className="pt-6 flex gap-4">
                  <button type="submit" className="flex-1 py-5 bg-indigo-900 text-white rounded-3xl font-black uppercase tracking-widest text-xs">Simpan Perubahan</button>
                  <button type="button" onClick={() => setEditingTemp(null)} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase tracking-widest text-xs">Batal</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* === KONFIRMASI PUBLIKASI LAPORAN === */}
      <AnimatePresence>
        {confirmPublishReport && (
          <div className="fixed inset-0 flex items-center justify-center z-[300] px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmPublishReport(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="relative bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl p-10 max-w-md w-full z-10 space-y-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto">
                <Globe size={28} className="text-emerald-600" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Publikasikan Laporan?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Laporan <strong className="text-slate-900 dark:text-white">"{confirmPublishReport.title}"</strong> akan tampil di <strong>Forum Warga</strong> dan bisa dilihat oleh semua warga.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmPublishReport(null)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={async () => {
                    try {
                      await reportsApi.updateVisibility(confirmPublishReport.id, true);
                      setAllReports(prev => prev.map(r => r.id === confirmPublishReport.id ? { ...r, isPublic: true } : r));
                      setConfirmPublishReport(null);
                    } catch { alert('Gagal mempublikasikan laporan'); }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20"
                >
                  <Globe size={14} /> Ya, Publikasikan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* === KONFIRMASI HAPUS LAPORAN === */}
      <AnimatePresence>
        {showDeleteReportConfirmModal && selectedReportToDelete && (
          <div className="fixed inset-0 flex items-center justify-center z-[300] px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowDeleteReportConfirmModal(false); setSelectedReportToDelete(null); }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              className="relative bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl p-10 max-w-md w-full z-10 space-y-6 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mx-auto">
                <Trash2 size={28} className="text-rose-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Hapus Laporan Ini?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Laporan <strong className="text-slate-900 dark:text-white">"{selectedReportToDelete.title}"</strong> akan dihapus permanen dari database. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteReportConfirmModal(false); setSelectedReportToDelete(null); }}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-xs uppercase tracking-widest"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDeleteReport}
                  className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20"
                >
                  Ya, Hapus Permanen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* === INFO DETAIL MODAL === */}
      <AnimatePresence>
        {infoDetail && (
          <div className="fixed inset-0 flex items-end sm:items-center justify-center z-[200] px-0 sm:px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInfoDetail(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative bg-white dark:bg-slate-900 w-full sm:max-w-2xl rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col z-10"
            >
              {/* Gambar penuh */}
              {infoDetail.imageUrl ? (
                <div className="w-full bg-slate-100 dark:bg-slate-800 shrink-0">
                  <img
                    src={getCdnUrl(infoDetail.imageUrl)}
                    alt="Info Cover"
                    className="w-full h-full object-cover"
                    onClick={() => setLightboxUrl(getCdnUrl(infoDetail.imageUrl!))}
                    title="Klik untuk perbesar"
                  />
                </div>
              ) : (
                <div className="w-full h-20 bg-gradient-to-r from-indigo-900 to-indigo-700 shrink-0" />
              )}

              {/* Tombol tutup */}
              <button
                onClick={() => setInfoDetail(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 shadow-lg transition-colors z-20"
              >
                <X size={18} />
              </button>

              {/* Konten */}
              <div className="flex-1 overflow-y-auto p-8 space-y-5">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    infoDetail.type === 'PENGUMUMAN' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                    infoDetail.type === 'BERITA'     ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                    infoDetail.type === 'KEGIATAN'   ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
                    infoDetail.type === 'HIMBAUAN'   ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400' :
                    infoDetail.type === 'EMERGENCY'  ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400' :
                    'bg-indigo-50 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-400'
                  }`}>
                    {infoDetail.type}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {formatDate(infoDetail.date)}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">
                  {infoDetail.title}
                </h2>
                <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed font-medium whitespace-pre-line">
                  {infoDetail.content}
                </p>
              </div>

              {/* Footer aksi */}
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3 shrink-0">
                <button
                  onClick={() => { setSelectedInfo(infoDetail); setShowEditInfoModal(true); setInfoDetail(null); }}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-indigo-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-950 transition-all"
                >
                  <Edit2 size={14} /> Edit Informasi
                </button>
                <button
                  onClick={() => { handleDeleteInfo(infoDetail); setInfoDetail(null); }}
                  className="px-6 py-4 bg-rose-50 dark:bg-rose-500/10 text-rose-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-rose-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={() => setInfoDetail(null)}
                  className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* === LIGHTBOX === */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/95 backdrop-blur-md"
            onClick={() => setLightboxUrl(null)}
          >
            {/* Close button */}
            <button
              className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-2xl flex items-center justify-center transition-all z-10 active:scale-95"
              onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }}
            >
              <X size={22} />
            </button>

            {/* Download button */}
            <a
              href={lightboxUrl}
              download="lampiran.jpg"
              onClick={(e) => e.stopPropagation()}
              className="absolute top-6 right-24 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-2xl flex items-center justify-center transition-all z-10"
              title="Unduh gambar"
            >
              <Download size={20} />
            </a>

            {/* Image container */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              className="relative max-w-[92vw] max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightboxUrl}
                alt="Gambar penuh"
                className="max-w-full max-h-[90vh] object-contain rounded-3xl shadow-2xl ring-1 ring-white/10"
              />
            </motion.div>

            {/* Hint */}
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/30 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
              Klik di luar gambar untuk menutup · ESC
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Bottom Navigation - Mobile Only ─── */}
      <AnimatePresence>
        {showMobileMore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMobileMore(false)}
            className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80]"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMobileMore && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="md:hidden fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] inset-x-3 z-[85] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-900/20 p-4"
          >
            <div className="flex items-center justify-between mb-4 px-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Menu Lainnya</span>
              <button onClick={() => setShowMobileMore(false)} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: <Globe size={20} />, label: 'Landing', tab: 'CMS' as AdminTab },
                { icon: <Megaphone size={20} />, label: 'Info', tab: 'INFO' as AdminTab },
                { icon: <Edit2 size={20} />, label: 'Template', tab: 'TEMPLATES' as AdminTab },
                { icon: <ClipboardList size={20} />, label: 'Register', tab: 'BOOK_LOG' as AdminTab },
                { icon: <Box size={20} />, label: 'Inventaris', tab: 'INVENTORY' as AdminTab },
                { icon: <AlertTriangle size={20} />, label: 'Kejadian', tab: 'INCIDENTS' as AdminTab },
                { icon: <Mail size={20} />, label: 'Laporan', tab: 'REPORTS' as AdminTab, badge: allReports.filter(r => r.status === 'PROSES').length },
                { icon: <Settings size={20} />, label: 'Setting', tab: 'SETTINGS' as AdminTab },
              ].map(item => (
                <button
                  key={item.tab}
                  onClick={() => { setActiveTab(item.tab); setShowMobileMore(false); }}
                  className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 transition-all ${activeTab === item.tab
                    ? 'bg-indigo-900 text-white shadow-lg shadow-indigo-900/20'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95'
                  }`}
                >
                  {item.badge ? (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center border-2 border-white dark:border-slate-900">
                      {item.badge}
                    </span>
                  ) : null}
                  {item.icon}
                  <span className="text-[9px] font-bold uppercase tracking-wider truncate">{item.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => { setShowMobileMore(false); onLogout(); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all active:scale-95"
              >
                <LogOut size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Keluar Panel</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-[80] px-3 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-2 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="grid grid-cols-5 gap-1">
          <AdminMobileNavItem
            icon={<LayoutDashboard size={21} />}
            label="Home"
            active={activeTab === 'OVERVIEW'}
            onClick={() => { setActiveTab('OVERVIEW'); setShowMobileMore(false); }}
          />
          <AdminMobileNavItem
            icon={<FileText size={21} />}
            label="Surat"
            active={activeTab === 'SURAT' || activeTab === 'TEMPLATES' || activeTab === 'BOOK_LOG' || activeTab === 'BOOK_PENGANTAR' || activeTab === 'BOOK_KETERANGAN' || activeTab === 'BOOK_IJIN' || activeTab === 'BOOK_MUTASI' || activeTab === 'BOOK_TEMP'}
            onClick={() => { setActiveTab('SURAT'); setShowMobileMore(false); }}
            badge={allPengajuan.filter(p => p.status === 'PENDING').length}
          />
          <AdminMobileNavItem
            icon={<Users size={21} />}
            label="Warga"
            active={activeTab === 'WARGA'}
            onClick={() => { setActiveTab('WARGA'); setShowMobileMore(false); }}
          />
          <AdminMobileNavItem
            icon={<Wallet size={21} />}
            label="Iuran"
            active={activeTab === 'IURAN'}
            onClick={() => { setActiveTab('IURAN'); setShowMobileMore(false); }}
            badge={allIuranPayments.filter(p => p.status === 'PENDING').length}
          />
          <AdminMobileNavItem
            icon={<MoreVertical size={21} />}
            label="Lainnya"
            active={showMobileMore || activeTab === 'CMS' || activeTab === 'INFO' || activeTab === 'INVENTORY' || activeTab === 'INCIDENTS' || activeTab === 'REPORTS' || activeTab === 'SETTINGS'}
            onClick={() => setShowMobileMore(!showMobileMore)}
          />
        </div>
      </nav>
    </div>
  );
}

function WargaForm({ initialData, onSubmit, onCancel }: { initialData?: User | null, onSubmit: (data: any) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    role: 'WARGA' as const,
    nik: initialData?.nik || '',
    noKK: initialData?.noKK || '',
    alamat: initialData?.alamat || '',
    noHp: initialData?.noHp || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormInput
          label="Nama Lengkap"
          placeholder="Sesuai KTP"
          value={formData.name}
          onChange={(val) => setFormData({ ...formData, name: val })}
          required
        />
        <FormInput
          label="Email (Opsional)"
          placeholder="user@example.com"
          type="email"
          value={formData.email}
          onChange={(val) => setFormData({ ...formData, email: val })}
        />
        <FormInput
          label="Nomor NIK"
          placeholder="16 Digit NIK"
          value={formData.nik}
          onChange={(val) => setFormData({ ...formData, nik: val })}
          required
        />
        <FormInput
          label="Nomor Kartu Keluarga"
          placeholder="16 Digit KK"
          value={formData.noKK}
          onChange={(val) => setFormData({ ...formData, noKK: val })}
          required
        />
        <FormInput
          label="Alamat Domisili"
          placeholder="Nama Jalan, No. Rumah"
          value={formData.alamat}
          onChange={(val) => setFormData({ ...formData, alamat: val })}
          className="md:col-span-2"
          required
        />
        <FormInput
          label="Nomor WhatsApp"
          placeholder="0812...."
          value={formData.noHp}
          onChange={(val) => setFormData({ ...formData, noHp: val })}
          required
        />
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 pt-8">
        <button
          type="submit"
          className="w-full sm:flex-1 py-5 bg-indigo-900 text-white rounded-[24px] font-bold text-lg hover:bg-indigo-950 transition-all shadow-xl shadow-indigo-900/20 uppercase tracking-widest active:scale-95 flex items-center justify-center gap-3"
        >
          <Check size={24} />
          Simpan Data
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto px-10 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-[24px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-sm"
        >
          Batal
        </button>
      </div>
    </form>
  );
}

function InfoForm({ initialData, onSubmit, onCancel, maxSizeMb = 5 }: { initialData?: InfoRT | null, onSubmit: (data: any) => void, onCancel: () => void, maxSizeMb?: number }) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    content: initialData?.content || '',
    type: initialData?.type || 'PENGUMUMAN',
    imageUrl: initialData?.imageUrl || ''
  });
  const [uploading, setUploading] = useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileId = await processImageUpload(file, maxSizeMb);
      setFormData(prev => ({ ...prev, imageUrl: fileId }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-6">
        <FormInput
          label="Judul Berita"
          placeholder="Misal: Kerja Bakti Hari Minggu"
          value={formData.title}
          onChange={(val) => setFormData({ ...formData, title: val })}
          required
        />

        <div className="space-y-3">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Kategori Berita</label>
          <div className="flex flex-wrap gap-2">
            {([
              { value: 'PENGUMUMAN', color: 'bg-amber-500 border-amber-500' },
              { value: 'BERITA',     color: 'bg-blue-600 border-blue-600' },
              { value: 'KEGIATAN',   color: 'bg-emerald-600 border-emerald-600' },
              { value: 'HIMBAUAN',   color: 'bg-violet-600 border-violet-600' },
              { value: 'EMERGENCY',  color: 'bg-rose-600 border-rose-600' },
            ] as const).map(({ value, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFormData({ ...formData, type: value })}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
                  formData.type === value
                    ? `${color} text-white shadow-lg`
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-800 hover:border-indigo-200'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Isi Informasi Lengkap</label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="Tuliskan detail informasi di sini..."
            required
            rows={6}
            className="w-full p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-3xl focus:outline-none focus:ring-4 focus:ring-indigo-900/10 focus:border-indigo-900 dark:text-white transition-all font-bold placeholder:text-slate-300 dark:placeholder:text-slate-700 resize-none"
          />
        </div>

        {/* Image Upload */}
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Foto / Gambar Pendukung (opsional)</label>
          <label className="flex flex-col items-center justify-center gap-3 p-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-indigo-400 transition-all group">
            {formData.imageUrl ? (
              <div className="relative w-full">
                <img src={getCdnUrl(formData.imageUrl)} alt="Preview" className="w-full max-h-40 object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setFormData(prev => ({ ...prev, imageUrl: '' })); }}
                  className="absolute top-2 right-2 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600"
                >
                  <X size={14} />
                </button>
              </div>
            ) : uploading ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="w-8 h-8 border-4 border-indigo-900 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold text-indigo-900">Mengupload ke CDN...</span>
              </div>
            ) : (
              <>
                <Camera size={22} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <span className="text-xs font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">Upload lampiran (foto/pdf) berita</span>
                <span className="text-[10px] text-slate-300">JPG, PNG — maks {maxSizeMb}MB</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={uploading} />
          </label>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 pt-8">
        <button
          type="submit"
          className="w-full sm:flex-1 py-5 bg-indigo-900 text-white rounded-[24px] font-bold text-lg hover:bg-indigo-950 transition-all shadow-xl shadow-indigo-900/20 uppercase tracking-widest active:scale-95 flex items-center justify-center gap-3"
        >
          <Check size={24} />
          {initialData ? 'Perbarui Berita' : 'Publikasikan'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto px-10 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-[24px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-sm"
        >
          Batal
        </button>
      </div>
    </form>
  );
}

function FormInput({ label, placeholder, type = 'text', value, onChange, required, className = '' }: {
  label: string, placeholder: string, type?: string, value: string, onChange: (v: string) => void, required?: boolean, className?: string
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-3xl focus:outline-none focus:ring-4 focus:ring-indigo-900/10 focus:border-indigo-900 dark:text-white transition-all font-bold placeholder:text-slate-300 dark:placeholder:text-slate-700"
      />
    </div>
  );
}


function AdminMobileNavItem({ icon, label, active, onClick, badge }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 px-1 transition-all duration-300 ${active
        ? 'text-indigo-900 dark:text-indigo-400'
        : 'text-slate-400 dark:text-slate-500 active:scale-90'
      }`}
    >
      {badge ? (
        <span className="absolute top-1 right-1/4 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center border-2 border-white dark:border-slate-950 shadow-sm z-10">
          {badge}
        </span>
      ) : null}
      <span className={`relative transition-all duration-300 ${active ? 'scale-110 -translate-y-0.5' : ''}`}>
        {icon}
      </span>
      <span className={`text-[9px] font-bold uppercase tracking-wider leading-none transition-all duration-300 ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
      {active && (
        <motion.div
          layoutId="adminMobileNavDot"
          className="w-1 h-1 rounded-full bg-indigo-900 dark:bg-indigo-400 mt-0.5"
          transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
        />
      )}
    </button>
  );
}

function AdminSidebarLink({ icon, label, active, onClick, badge }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-4 px-4 py-4 rounded-2xl text-sm font-bold transition-all ${active
          ? 'bg-indigo-900 text-white shadow-xl shadow-indigo-900/30'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
        }`}
    >
      <div className="flex items-center gap-4">
        {icon}
        {label}
      </div>
      {badge !== undefined && badge > 0 && (
        <span className={`w-7 h-7 flex items-center justify-center rounded-xl text-[10px] font-bold leading-none ${active ? 'bg-white text-indigo-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

interface AdminStatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: 'primary' | 'amber' | 'teal' | 'indigo';
}

function AdminStatCard({ label, value, icon, color }: AdminStatCardProps) {
  const themes = {
    teal: {
      text: 'text-indigo-700 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-900/10',
      border: 'border-indigo-100 dark:border-indigo-900/20',
      gradient: 'from-indigo-600 to-slate-900'
    },
    amber: {
      text: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      border: 'border-amber-100 dark:border-amber-500/20',
      gradient: 'from-amber-500 to-orange-500'
    },
    primary: {
      text: 'text-indigo-900 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      border: 'border-indigo-100 dark:border-indigo-900/30',
      gradient: 'from-indigo-600 to-slate-950'
    },
    indigo: {
      text: 'text-indigo-900 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-900/10',
      border: 'border-indigo-100 dark:border-indigo-900/20',
      gradient: 'from-indigo-900 to-indigo-700'
    },
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white dark:bg-slate-900 p-4 md:p-7 rounded-2xl md:rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group transition-colors"
    >
      <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-6 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${themes[color].bg} ${themes[color].text} border ${themes[color].border} shadow-sm [&>svg]:w-5 [&>svg]:h-5 md:[&>svg]:w-6 md:[&>svg]:h-6`}>
        {icon}
      </div>
      <div>
        <p className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] md:tracking-[0.2em] mb-0.5 md:mb-1">{label}</p>
        <p className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white leading-none tracking-tight">{value}</p>
      </div>

      {/* Decorative gradient blob */}
      <div className={`absolute -right-10 -bottom-10 w-24 h-24 rounded-full blur-3xl opacity-[0.03] group-hover:opacity-20 transition-opacity bg-gradient-to-br ${themes[color].gradient}`} />
    </motion.div>
  );
}

interface AdminPengajuanRowProps {
  item: PengajuanSurat;
  onUpdate: (id: string, st: SuratStatus, reason?: string, content?: string, pdfUrl?: string, blocks?: SuratBlock[]) => void;
  onProcess: (item: PengajuanSurat) => void;
  allTemplates: SuratType[];
  config: AppConfig;
  key?: string | number;
}

function AdminPengajuanRow({ item, onUpdate, onProcess, allTemplates, config }: AdminPengajuanRowProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState('');
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [pdfLink, setPdfLink] = useState('');
  const [editContent, setEditContent] = useState(item.suratContent || '');
  const [showDetails, setShowDetails] = useState(false);

  const statusStyles: Record<SuratStatus, string> = {
    PENDING: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    DIPROSES: 'bg-indigo-100 dark:bg-indigo-900/10 text-indigo-900 dark:text-indigo-400',
    DISETUJUI: 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-900 dark:text-indigo-400',
    DITOLAK: 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
  };

  const generateDraftContent = () => {
    const template = allTemplates.find(t => t.id === item.typeId);
    if (!template) return '';

    const now = new Date();
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const dateStr = now.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

    // Construct KOP SURAT
    const kopSurat = `
         PENGURUS RUKUN TETANGGA ${config.rtNumber} RUKUN WARGA ${config.rwNumber}
             KELURAHAN ${config.villageName} KECAMATAN ${config.districtName}
                     ${config.cityName.toUpperCase()}
       Sekretariat: ${config.secretaryAddress}
    ==========================================================================
    `;

    const penutup = `
    
    Demikian surat ini kami buat untuk dapat dipergunakan sebagaimana mestinya.
    
    ${config.cityName}, ${dateStr}
    
            Ketua RW ${config.rwNumber},                       Ketua RT ${config.rtNumber},
    
    
    
    ( ...................... )               ( ${config.rtLeaderName} )
    `;

    let content = template.template;

    // Inject KOP and PENUTUP
    if (content.includes('{{KOP_SURAT}}')) {
      content = content.replace('{{KOP_SURAT}}', kopSurat);
    } else {
      content = kopSurat + "\n" + content;
    }

    if (content.includes('{{PENUTUP}}')) {
      content = content.replace('{{PENUTUP}}', penutup);
    } else {
      content = content + "\n" + penutup;
    }

    // Replace variables
    content = content.replace(/{{NAMA}}/g, item.userName);
    content = content.replace(/{{NIK}}/g, item.userNik);
    content = content.replace(/{{KEPERLUAN}}/g, item.keterangan);
    content = content.replace(/{{ALAMAT}}/g, item.data.alamat || "Alamat Sesuai KTP");
    content = content.replace(/{{ALAMAT_ASAL}}/g, item.data.alamatAsal || item.data.alamat || "-");
    content = content.replace(/{{ALAMAT_TUJUAN}}/g, item.data.alamatTujuan || "-");
    content = content.replace(/{{ALASAN_PINDAH}}/g, item.data.alasanPindah || item.keterangan);
    content = content.replace(/{{STATUS_PERKAWINAN}}/g, item.data.statusPerkawinan || "-");
    content = content.replace(/{{TGL_MENINGGAL}}/g, item.data.tglMeninggal || "-");
    content = content.replace(/{{PENYEBAB}}/g, item.data.penyebab || "-");
    content = content.replace(/{{KETERANGAN}}/g, item.keterangan);
    content = content.replace(/{{PEKERJAAN}}/g, item.data.pekerjaan || "-");
    content = content.replace(/{{TEMPAT_TGL_LAHIR}}/g, item.data.tempatTglLahir || "-");
    content = content.replace(/{{JENIS_KELAMIN}}/g, item.data.jenisKelamin || "-");

    content = content.replace(/{{NOMOR_SURAT}}/g, String(Math.floor(Math.random() * 900) + 100));
    content = content.replace(/{{BULAN}}/g, romanMonths[now.getMonth()]);
    content = content.replace(/{{TAHUN}}/g, String(now.getFullYear()));
    content = content.replace(/{{TANGGAL}}/g, dateStr);

    // Replace any remaining data fields
    Object.entries(item.data).forEach(([key, val]) => {
      const regex = new RegExp(`{{${key.toUpperCase()}}}`, 'g');
      content = content.replace(regex, (val as string) || '');
    });

    return content;
  };

  return (
    <div className="p-5 sm:p-8 lg:p-10 group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all border-b border-slate-100 dark:border-slate-800 last:border-0 relative">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 lg:gap-8">
        <div className="flex items-start gap-4 sm:gap-6 min-w-0 flex-1">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-900 group-hover:text-white group-hover:rotate-12 transition-all duration-500 shadow-sm shrink-0">
            <FileText size={28} className="sm:w-8 sm:h-8" />
          </div>
          <div className="space-y-3 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h4 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 dark:text-white tracking-tight uppercase break-words">{item.typeName}</h4>
              <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest shrink-0 ${statusStyles[item.status]}`}>
                {item.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><Users size={14} className="text-indigo-900" /> {item.userName}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="flex items-center gap-1.5"><Search size={14} className="text-indigo-900" /> {item.userNik}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="text-xs">Diajukan: {formatDateTime(item.createdAt)}</span>
              {item.status !== 'PENDING' && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span className="text-xs">
                    {item.status === 'DISETUJUI' ? 'Disetujui: ' : item.status === 'DITOLAK' ? 'Ditolak: ' : 'Diupdate: '}
                    {formatDateTime(item.updatedAt)}
                  </span>
                </>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span className="font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest text-[9px] block mb-1">Keperluan:</span>
                {item.keterangan}
              </div>

              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-[10px] font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2 hover:underline w-fit"
              >
                {showDetails ? 'Sembunyikan Biodata' : 'Lihat Biodata Pemohon'}
                {showDetails ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
              </button>

              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-900/20 rounded-2xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
                >
                  {Object.entries(item.data).map(([key, val]) => (
                    <div key={key}>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</span>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{val || '-'}</p>
                    </div>
                  ))}
                  {/* Ensure basic info is there if not in item.data */}
                  {!item.data.nik && (
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">NIK</span>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.userNik}</p>
                    </div>
                  )}
                  {!item.data.nama && (
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">NAMA</span>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.userName}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-nowrap items-center gap-3 shrink-0">
          {(item.status === 'PENDING' || item.status === 'DIPROSES') && (
            <>
              {item.status === 'PENDING' ? (
                <button
                  onClick={() => onProcess(item)}
                  className="h-12 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-[0.15em] transition-all shadow-lg shadow-blue-600/20 active:scale-95 inline-flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Pen size={15} />
                  Proses
                </button>
              ) : (
                <button
                  onClick={() => onProcess(item)}
                  className="h-12 px-5 bg-indigo-900 text-white rounded-xl text-xs font-bold uppercase tracking-[0.15em] hover:bg-indigo-950 transition-all shadow-xl shadow-indigo-900/20 active:scale-95 inline-flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Check size={16} />
                  <span className="hidden sm:inline">Selesaikan / Edit Surat</span>
                  <span className="sm:hidden">Edit</span>
                </button>
              )}

              <button
                onClick={() => setShowRejectForm(!showRejectForm)}
                className={`h-12 w-12 rounded-xl transition-all active:scale-95 inline-flex items-center justify-center shrink-0 ${showRejectForm ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-slate-200 dark:border-slate-700'}`}
                title="Tolak / Beri Tanggapan"
                aria-label="Tolak pengajuan"
              >
                <X size={18} />
              </button>
            </>
          )}

          {item.status === 'DISETUJUI' && (
            <div className="flex flex-nowrap items-center gap-2">
              <button
                onClick={async () => {
                  const filename = `${item.typeName}-${item.userName}-${item.id}.pdf`.replace(/\s+/g, '_');
                  const t = allTemplates.find(tpl => tpl.id === item.typeId);
                  await generatePDF(filename, item.suratContent || '', config, t?.blocks || item.blocks, item);
                }}
                className="h-12 px-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-indigo-900 uppercase tracking-[0.15em] hover:bg-emerald-50 dark:hover:bg-emerald-900/10 hover:border-emerald-200 dark:hover:border-emerald-900/50 transition-all active:scale-95 shadow-sm inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Cetak (PDF)</span>
                <span className="sm:hidden">Cetak</span>
              </button>
              {item.pdfUrl && (
                <a
                  href={getCdnUrl(item.pdfUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-12 px-5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-900/50 rounded-xl text-xs font-bold text-indigo-900 dark:text-indigo-400 uppercase tracking-[0.15em] hover:bg-indigo-100 transition-all active:scale-95 inline-flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Download size={16} />
                  <span className="hidden sm:inline">Lihat PDF</span>
                  <span className="sm:hidden">Lihat</span>
                </a>
              )}
            </div>
          )}

          {item.status === 'DITOLAK' && (
            <div className="h-12 px-5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold uppercase tracking-[0.15em] border border-rose-100 dark:border-rose-500/20 inline-flex items-center justify-center whitespace-nowrap">
              Ditolak
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showRejectForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-8 p-8 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="relative z-10">
              <label className="text-[10px] font-bold text-rose-900 dark:text-rose-400 uppercase tracking-[0.2em] mb-4 block">Alasan Penolakan</label>
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Misal: Data tidak valid..."
                  className="flex-1 p-5 bg-white dark:bg-slate-950 border border-rose-200 dark:border-rose-500/30 rounded-2xl focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm font-semibold text-slate-700 dark:text-white"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onUpdate(item.id, 'DITOLAK', reason);
                      setShowRejectForm(false);
                    }}
                    className="flex-1 px-8 py-4 bg-rose-600 text-white rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg active:scale-95"
                  >
                    Tolak
                  </button>
                  <button
                    onClick={() => setShowRejectForm(false)}
                    className="px-6 py-4 text-rose-400 text-xs font-bold uppercase tracking-widest active:scale-95"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {showApproveForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-8 p-10 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-[32px] shadow-sm overflow-hidden"
          >
            <div className="relative z-10 space-y-8">
              <header className="flex items-center justify-between">
                <div>
                  <label className="text-[10px] font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-[0.2em] block mb-1">Finalisasi Surat</label>
                  <h5 className="text-xl font-bold text-slate-900 dark:text-white">Review & Edit Konten Surat</h5>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Warga: {item.userName}</p>
                </div>
              </header>

              <div className="space-y-4">
                <div className="bg-slate-200 dark:bg-slate-800 p-4 md:p-8 rounded-[32px] overflow-auto max-h-[600px] flex justify-center">
                  <div className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] p-6 md:p-[20mm] shadow-2xl relative font-serif">
                    {/* Header Preview */}
                    <div className="relative">
                      <div className="flex gap-4 md:gap-6 pb-4 items-center relative">
                        {config.logoUrl && (
                          <img src={config.logoUrl} alt="Logo" className="w-16 h-16 md:w-20 md:h-20 object-contain" />
                        )}
                        <div className="flex-1 text-center pr-8">
                          <h4 className="text-sm md:text-lg font-black uppercase leading-tight tracking-normal">
                            RUKUN TETANGGA {config.rtNumber} RUKUN WARGA {config.rwNumber}
                          </h4>
                          <h4 className="text-[10px] md:text-xs font-bold uppercase leading-tight mt-1">
                            Kelurahan {config.villageName} | Kecamatan {config.districtName}
                          </h4>
                          <h3 className="text-xs md:text-sm font-bold uppercase leading-tight mt-0.5">{config.cityName}</h3>
                          <p className="text-[8px] md:text-[10px] italic mt-1 font-medium text-slate-600">Sekretariat: {config.secretaryAddress}</p>
                        </div>
                      </div>
                      <div className="w-full border-b-[3px] border-black mt-1" />
                      <div className="w-full border-b border-black mt-[2px] mb-8" />
                    </div>

                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-full min-h-[200mm] border-none focus:ring-0 p-0 text-sm md:text-base leading-relaxed resize-none bg-transparent text-black placeholder:text-slate-100"
                      placeholder="Hasil olah data akan tampil di sini..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">Tautan PDF (Optional)</label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={pdfLink}
                      onChange={(e) => setPdfLink(e.target.value)}
                      placeholder="Masukkan URL PDF Surat jika sudah dicetak..."
                      className="flex-1 p-5 bg-white dark:bg-slate-950 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-900/10 focus:border-indigo-900 transition-all text-sm font-semibold text-slate-700 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const filename = `Surat-${item.typeName}-${item.userName}.pdf`.replace(/\s+/g, '_');
                        await generatePDF(filename, editContent, config);
                      }}
                      className="px-6 bg-emerald-500 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                      Download PDF Draft
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    onUpdate(item.id, 'DISETUJUI', undefined, editContent, pdfLink);
                    setShowApproveForm(false);
                  }}
                  className="flex-1 py-5 bg-indigo-900 text-white rounded-[24px] font-bold text-lg hover:bg-slate-900 transition-all shadow-xl shadow-indigo-900/20 active:scale-95 flex items-center justify-center gap-3"
                >
                  <CheckCircle2 size={24} />
                  Selesaikan & Terbitkan
                </button>
                <button
                  onClick={() => setShowApproveForm(false)}
                  className="px-8 py-5 text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm font-bold uppercase tracking-widest active:scale-95"
                >
                  Batal
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TemplateVisualEditor({ template, config, onUpdateConfig, onSave, onCancel, pengajuan }: { template: SuratType, config: AppConfig, onUpdateConfig: (c: AppConfig) => void, onSave: (t: SuratType, blocks?: SuratBlock[]) => void, onCancel: () => void, pengajuan?: PengajuanSurat }) {
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<SuratBlock[]>(() => {
    if (template.blocks && template.blocks.length > 0) return template.blocks;

    const isIzinKeramaian = template.name.toUpperCase().includes('KERAMAIAN') || template.name.toUpperCase().includes('IZIN');
    if (isIzinKeramaian) {
      return [
        { id: generateId(), type: 'HEADER' },
        { id: generateId(), type: 'TITLE', content: 'SURAT IZIN KERAMAIAN', fontSize: 16, isBold: true },
        { id: generateId(), type: 'PARAGRAPH', content: 'Yang bertanda tangan di bawah ini, Ketua RT.{{RT}} RW.{{RW}} Kelurahan {{KELURAHAN}} Kecamatan {{KECAMATAN}} {{KOTA}}, menerangkan bahwa:', textAlign: 'justify', fontSize: 11 },
        { id: generateId(), type: 'DATA_GRID', config: { fields: ['1. NIK', '2. Nama', '3. Tempat/Tgl Lahir', '4. Jenis Kelamin', '5. Alamat', '6. Agama', '7. Status Pernikahan', '8. Pekerjaan'] }, fontSize: 11 },
        { id: generateId(), type: 'PARAGRAPH', content: 'Adalah benar yang bersangkutan berdomisili di alamat tersebut dan berencana untuk mengadakan acara perayaan pernikahan di Jl. daeyuhkolot rt 12 rw15 pada:', textAlign: 'justify', fontSize: 11 },
        { id: generateId(), type: 'DATA_GRID', config: { fields: ['Hari/Tanggal', 'Waktu', 'Tempat'] }, fontSize: 11 },
        { id: generateId(), type: 'PARAGRAPH', content: 'Dengan ini, kami memberikan izin untuk mengadakan acara tersebut dengan catatan tidak mengganggu ketertiban umum dan tetap mematuhi peraturan yang berlaku.', textAlign: 'justify', fontSize: 11 },
        { id: generateId(), type: 'PARAGRAPH', content: 'Demikian surat izin keramaian ini dibuat dengan sebenar-benarnya agar dapat dipergunakan sebagaimana mestinya.', textAlign: 'justify', fontSize: 11 },
        { id: generateId(), type: 'SIGNATURE', fontSize: 11 }
      ];
    }
    return [
      { id: generateId(), type: 'HEADER' },
      { id: generateId(), type: 'TITLE', content: template.name.toUpperCase() },
      { id: generateId(), type: 'PARAGRAPH', content: 'Yang bertanda tangan di bawah ini Ketua RT ... / RW ... Kelurahan ... Kecamatan ... menerangkan bahwa:' },
      { id: generateId(), type: 'DATA_GRID', config: { fields: ['Nama', 'NIK', 'Tempat / Tgl Lahir', 'Jenis Kelamin', 'Agama', 'Status Pernikahan', 'Pekerjaan', 'Alamat'] } },
      { id: generateId(), type: 'PARAGRAPH', content: 'Adalah benar-benar penduduk/warga kami yang bertempat tinggal di alamat tersebut di atas.' },
      { id: generateId(), type: 'PARAGRAPH', content: 'Demikian surat keterangan ini kami buat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.' },
      { id: generateId(), type: 'SIGNATURE' }
    ];
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(75);
  const [activePropertyTab, setActivePropertyTab] = useState<'STYLE' | 'LAYOUT' | 'PAGE' | 'FORM'>('STYLE');
  const [formFields, setFormFields] = useState<import('../types').FormFieldDefinition[]>(() => {
    if (template.formFields && template.formFields.length > 0) return template.formFields;
    return [
      { id: 'nik', label: 'NIK', type: 'text', required: true },
      { id: 'nama', label: 'Nama Lengkap', type: 'text', required: true },
      { id: 'tempatLahir', label: 'Tempat Lahir', type: 'text', required: false },
      { id: 'tglLahir', label: 'Tanggal Lahir', type: 'date', required: false },
      { id: 'jenisKelamin', label: 'Jenis Kelamin', type: 'select', options: ['Laki-laki', 'Perempuan'], required: false },
      { id: 'agama', label: 'Agama', type: 'select', options: ['Islam', 'Kristen', 'Hindu', 'Buddha', 'Katholik', 'Konghucu', 'Lainnya'], required: false },
      { id: 'statusPernikahan', label: 'Status Pernikahan', type: 'select', options: ['Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati'], required: false },
      { id: 'pekerjaan', label: 'Pekerjaan', type: 'text', required: false },
      { id: 'alamat', label: 'Alamat Lengkap', type: 'text', required: true },
    ];
  });
  const [tName, setTName] = useState(template.name);
  const [tDesc, setTDesc] = useState(template.description || '');
  const [tCategory, setTCategory] = useState(template.category || 'PENGANTAR');
  const [pageMargin, setPageMargin] = useState(15);
  const [history, setHistory] = useState<SuratBlock[][]>([]);
  const [future, setFuture] = useState<SuratBlock[][]>([]);

  // ── Fitur baru canvas ──────────────────────────────────────────────────
  const [paperSize, setPaperSize] = useState<'A4' | 'F4' | 'Letter' | 'Legal'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [previewMode, setPreviewMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [leftPanel, setLeftPanel] = useState<'ELEMENTS' | 'LAYERS'>('ELEMENTS');

  const PAPER_DIMENSIONS: Record<string, { w: number; h: number }> = {
    A4:     { w: 210, h: 297 },
    F4:     { w: 215, h: 330 },
    Letter: { w: 216, h: 279 },
    Legal:  { w: 216, h: 356 },
  };
  const paperW = orientation === 'portrait' ? PAPER_DIMENSIONS[paperSize].w : PAPER_DIMENSIONS[paperSize].h;
  const paperH = orientation === 'portrait' ? PAPER_DIMENSIONS[paperSize].h : PAPER_DIMENSIONS[paperSize].w;
  // ───────────────────────────────────────────────────────────────────────

  const pushHistory = useCallback((prev: SuratBlock[]) => {
    setHistory(h => [...h.slice(-20), prev]);
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setFuture(f => [blocks, ...f]);
    setBlocks(prev);
    setHistory(h => h.slice(0, -1));
  }, [history, blocks]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory(h => [...h, blocks]);
    setBlocks(next);
    setFuture(f => f.slice(1));
  }, [future, blocks]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
      // Zoom shortcuts
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) { e.preventDefault(); setZoom(z => Math.min(300, z + 10)); }
      if ((e.metaKey || e.ctrlKey) && e.key === '-') { e.preventDefault(); setZoom(z => Math.max(10, z - 10)); }
      if ((e.metaKey || e.ctrlKey) && e.key === '0') { e.preventDefault(); setZoom(75); }
      // Preview toggle
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') { e.preventDefault(); setPreviewMode(p => !p); }
      // Arrow nav antar blok
      if (!previewMode && selectedId && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const idx = blocks.findIndex(b => b.id === selectedId);
        const next = e.key === 'ArrowUp' ? Math.max(0, idx - 1) : Math.min(blocks.length - 1, idx + 1);
        setSelectedId(blocks[next]?.id || null);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          pushHistory(blocks);
          setBlocks(b => b.filter(bl => bl.id !== selectedId));
          setSelectedId(null);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        if (selectedId) {
          const block = blocks.find(b => b.id === selectedId);
          if (block) {
            pushHistory(blocks);
            const copy = { ...block, id: generateId() };
            const idx = blocks.findIndex(b => b.id === selectedId);
            const nb = [...blocks];
            nb.splice(idx + 1, 0, copy);
            setBlocks(nb);
            setSelectedId(copy.id);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedId, blocks, undo, redo, pushHistory, previewMode]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setBlocks((items) => {
        pushHistory(items);
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const updateBlock = (block: SuratBlock) => {
    setBlocks(blocks.map(b => b.id === block.id ? block : b));
  };

  const addBlock = (type: BlockType) => {
    pushHistory(blocks);
    const newBlock: SuratBlock = {
      id: generateId(),
      type,
      content: type === 'PARAGRAPH' ? 'Ketik isi teks di sini...' : type === 'TITLE' ? 'JUDUL SURAT' : '',
      config: type === 'DATA_GRID' ? { fields: ['Nama', 'NIK', 'Alamat'] } : {},
      textAlign: type === 'TITLE' ? 'center' : 'justify',
      fontSize: type === 'SPACER' ? 0 : 11,
      height: type === 'SPACER' ? 10 : undefined,
      marginTop: 0,
      marginBottom: 2,
    };
    setBlocks([...blocks, newBlock]);
    setSelectedId(newBlock.id);
  };

  // ── Aksi blok — dipakai di panel Layers dan context menu ──
  const moveBlock = (id: string, dir: 'up' | 'down') => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= blocks.length) return;
    pushHistory(blocks);
    const nb = [...blocks];
    [nb[idx], nb[target]] = [nb[target], nb[idx]];
    setBlocks(nb);
  };

  const duplicateBlock = (id: string) => {
    const block = blocks.find(b => b.id === id);
    if (!block) return;
    pushHistory(blocks);
    const copy = { ...block, id: generateId() };
    const idx = blocks.findIndex(b => b.id === id);
    const nb = [...blocks];
    nb.splice(idx + 1, 0, copy);
    setBlocks(nb);
    setSelectedId(copy.id);
  };

  const deleteBlock = (id: string) => {
    pushHistory(blocks);
    setBlocks(blocks.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const toggleBlockHidden = (id: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, hidden: !b.hidden } : b));
  };

  const renameBlock = (id: string, label: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, label } : b));
  };

  const blockTypeLabel = (type: BlockType): string => ({
    HEADER: 'Kop Surat',
    TITLE: 'Judul',
    PARAGRAPH: 'Paragraf',
    DATA_GRID: 'Tabel Data',
    LINE: 'Garis',
    SIGNATURE: 'Tanda Tangan',
    SPACER: 'Spasi',
  }[type]);

  const blockTypeIcon = (type: BlockType): React.ReactNode => ({
    HEADER:    <Layout size={14} />,
    TITLE:     <Hash size={14} />,
    PARAGRAPH: <Type size={14} />,
    DATA_GRID: <Table size={14} />,
    LINE:      <Minus size={14} />,
    SIGNATURE: <ShieldCheck size={14} />,
    SPACER:    <ArrowRight size={14} />,
  }[type]);

  const selectedBlock = blocks.find(b => b.id === selectedId);

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-[100] flex flex-col font-sans overflow-hidden">
      {/* Top Navbar */}
      <header className="h-auto min-h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between px-6 py-3 gap-3 shrink-0 z-50">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="p-2 bg-indigo-600 rounded-lg text-white shrink-0">
            <FileText size={18} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              value={tName}
              onChange={e => setTName(e.target.value)}
              className="text-sm font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none truncate w-full sm:max-w-[220px] transition-colors"
              placeholder="Nama template..."
            />
            <select
              value={tCategory}
              onChange={e => setTCategory(e.target.value as any)}
              className="text-[10px] font-bold uppercase tracking-widest bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-600 dark:text-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="PENGANTAR">Surat Pengantar</option>
              <option value="KETERANGAN">Surat Keterangan</option>
              <option value="IJIN">Surat Ijin</option>
            </select>
            <input
              value={tDesc}
              onChange={e => setTDesc(e.target.value)}
              className="text-[10px] text-slate-400 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full sm:max-w-[260px] transition-colors"
              placeholder="Deskripsi singkat template..."
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mr-4">
            <button onClick={undo} disabled={history.length === 0} className="p-1.5 text-slate-400 hover:text-slate-900 disabled:opacity-30" title="Undo (Ctrl+Z)"><Undo2 size={16} /></button>
            <button onClick={redo} disabled={future.length === 0} className="p-1.5 text-slate-400 hover:text-slate-900 disabled:opacity-30" title="Redo (Ctrl+Y)"><Redo2 size={16} /></button>
          </div>

          {/* Preview mode toggle */}
          <button
            onClick={() => setPreviewMode(p => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${previewMode ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            title="Toggle preview mode (Ctrl+P)"
          >
            <Eye size={14} /> {previewMode ? 'Mode Edit' : 'Preview'}
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setFullscreen(f => !f)}
            className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            title={fullscreen ? 'Keluar fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            {pengajuan ? 'Tutup' : 'Batal'}
          </button>

          {pengajuan ? (
            /* Mode proses surat pengajuan */
            <button
              disabled={uploadingField === 'saving'}
              onClick={async () => {
                setUploadingField('saving');
                await onSave({ ...template, name: tName, description: tDesc, category: tCategory as any, blocks, formFields }, blocks);
                setUploadingField(null);
              }}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-100 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadingField === 'saving' ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={18} />}
              {uploadingField === 'saving' ? 'Memproses...' : 'Setujui & Selesaikan'}
            </button>
          ) : (
            /* Mode edit template */
            <button
              disabled={uploadingField === 'saving'}
              onClick={async () => {
                setUploadingField('saving');
                await onSave({ ...template, name: tName, description: tDesc, category: tCategory as any, blocks, formFields }, blocks);
                setUploadingField(null);
              }}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadingField === 'saving' ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={18} />}
              {uploadingField === 'saving' ? 'Menyimpan...' : 'Simpan Template'}
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Components, Layers & Reference */}
        {!fullscreen && !previewMode && (
        <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 z-40 overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 shrink-0">
            <button
              onClick={() => setLeftPanel('ELEMENTS')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${leftPanel === 'ELEMENTS' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}
            >
              Elemen
            </button>
            <button
              onClick={() => setLeftPanel('LAYERS')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${leftPanel === 'LAYERS' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}
            >
              Layer <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-mono text-slate-500">{blocks.length}</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
          {leftPanel === 'ELEMENTS' && (
          <div className="p-6">
            {pengajuan && (
              <div className="mb-10 last:mb-0">
                <h2 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <UserIcon size={12} /> Data Pemohon
                </h2>
                <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Nama</span>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{pengajuan.userName}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">NIK</span>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{pengajuan.userNik}</p>
                  </div>
                  {Object.entries(pengajuan.data).slice(0, 5).map(([key, val]) => (
                    <div key={key}>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</span>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{val || '-'}</p>
                    </div>
                  ))}
                  {Object.keys(pengajuan.data).length > 5 && (
                    <p className="text-[9px] text-slate-400 italic">... dan data lainnya</p>
                  )}
                </div>
              </div>
            )}

            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Elemen Dokumen</h2>
            <div className="grid grid-cols-1 gap-3">
              <SideToolButton icon={<Layout size={20} />} label="KOP SURAT" onClick={() => addBlock('HEADER')} color="text-orange-500 bg-orange-50" />
              <SideToolButton icon={<Type size={20} />} label="PARAGRAF TEKS" onClick={() => addBlock('PARAGRAPH')} color="text-blue-500 bg-blue-50" />
              <SideToolButton icon={<Hash size={20} />} label="JUDUL SURAT" onClick={() => addBlock('TITLE')} color="text-indigo-500 bg-indigo-50" />
              <SideToolButton icon={<Table size={20} />} label="TABEL DATA" onClick={() => addBlock('DATA_GRID')} color="text-emerald-500 bg-emerald-50" />
              <SideToolButton icon={<Minus size={20} />} label="GARIS PEMBATAS" onClick={() => addBlock('LINE')} color="text-slate-500 bg-slate-50" />
              <SideToolButton icon={<ShieldCheck size={20} />} label="TANDA TANGAN" onClick={() => addBlock('SIGNATURE')} color="text-purple-500 bg-purple-50" />
              <SideToolButton icon={<ArrowRight size={20} />} label="SPASI KOSONG" onClick={() => addBlock('SPACER')} color="text-amber-500 bg-amber-50" />
            </div>

            <div className="mt-12 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <MousePointer2 size={14} className="text-indigo-600" />
                <span className="text-[10px] font-bold text-slate-900 dark:text-white uppercase">Tips</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed italic">
                Seret handle di samping elemen untuk mengatur urutan. Tekan <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-mono">Ctrl+P</kbd> untuk preview.
              </p>
            </div>
          </div>
          )}

          {leftPanel === 'LAYERS' && (
          <div className="p-4 space-y-1">
            {blocks.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Layout size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Canvas kosong</p>
                <p className="text-[10px] mt-1">Tambah elemen dari tab Elemen</p>
              </div>
            ) : (
              blocks.map((b, i) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${selectedId === b.id ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-300 dark:ring-indigo-700' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  <MoveVertical size={12} className="text-slate-300 cursor-grab shrink-0" />
                  <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${selectedId === b.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    {blockTypeIcon(b.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-bold truncate ${b.hidden ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                      {b.label || blockTypeLabel(b.type)}
                    </p>
                    <p className="text-[9px] text-slate-400 font-mono">#{i + 1}</p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); moveBlock(b.id, 'up'); }} disabled={i === 0} className="p-1 text-slate-400 hover:text-slate-900 disabled:opacity-30" title="Naik"><ArrowUp size={10} /></button>
                    <button onClick={(e) => { e.stopPropagation(); moveBlock(b.id, 'down'); }} disabled={i === blocks.length - 1} className="p-1 text-slate-400 hover:text-slate-900 disabled:opacity-30" title="Turun"><ArrowDown size={10} /></button>
                    <button onClick={(e) => { e.stopPropagation(); toggleBlockHidden(b.id); }} className="p-1 text-slate-400 hover:text-slate-900" title={b.hidden ? 'Tampilkan' : 'Sembunyikan'}>{b.hidden ? <EyeOff size={10} /> : <Eye size={10} />}</button>
                    <button onClick={(e) => { e.stopPropagation(); duplicateBlock(b.id); }} className="p-1 text-slate-400 hover:text-indigo-600" title="Duplikat"><Copy size={10} /></button>
                    <button onClick={(e) => { e.stopPropagation(); deleteBlock(b.id); }} className="p-1 text-slate-400 hover:text-rose-600" title="Hapus"><Trash2 size={10} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
          )}
          </div>
        </aside>
        )}

        {/* Center Canvas */}
        <main className="flex-1 bg-slate-100 dark:bg-slate-950 flex flex-col relative overflow-hidden">
          {/* Canvas Header Control */}
          <div className="h-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 shadow-sm z-30">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Paper size & orientation */}
              {!previewMode && (
                <div className="flex items-center gap-2">
                  <select
                    value={paperSize}
                    onChange={e => setPaperSize(e.target.value as any)}
                    className="text-[10px] font-bold uppercase tracking-widest bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-600 focus:outline-none focus:border-indigo-500"
                    title="Ukuran kertas"
                  >
                    <option value="A4">A4</option>
                    <option value="F4">F4 / Folio</option>
                    <option value="Letter">Letter</option>
                    <option value="Legal">Legal</option>
                  </select>
                  <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                    <button
                      onClick={() => setOrientation('portrait')}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${orientation === 'portrait' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                      title="Portrait"
                    >Potret</button>
                    <button
                      onClick={() => setOrientation('landscape')}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${orientation === 'landscape' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                      title="Landscape"
                    >Lanskap</button>
                  </div>
                </div>
              )}

              {/* Zoom control */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <button onClick={() => setZoom(Math.max(10, zoom - 10))} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors inline-flex items-center justify-center"><Minus size={14} /></button>
                <select
                  value={zoom}
                  onChange={e => setZoom(parseInt(e.target.value))}
                  className="px-2 text-[10px] font-mono font-bold bg-transparent border-none focus:outline-none cursor-pointer"
                >
                  {[25, 50, 75, 100, 125, 150, 200, 300].map(z => (
                    <option key={z} value={z}>{z}%</option>
                  ))}
                </select>
                <button onClick={() => setZoom(Math.min(300, zoom + 10))} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors inline-flex items-center justify-center"><Plus size={14} /></button>
                {!previewMode && (
                  <>
                    <div className="h-4 w-px bg-slate-200" />
                    <button
                      onClick={() => setShowGrid(!showGrid)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${showGrid ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'text-slate-400 hover:bg-slate-50'}`}
                      title="Toggle grid"
                    >
                      <Grid size={14} /> Grid
                    </button>
                  </>
                )}
                <button onClick={() => setZoom(75)} className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-400 hover:bg-slate-50 transition-all" title="Reset zoom (Ctrl+0)">Reset</button>
              </div>

              {/* Info */}
              <span className="hidden md:inline text-[10px] font-mono text-slate-400">
                {paperW}×{paperH}mm · {blocks.length} blok
              </span>
            </div>

            {previewMode && (
              <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-widest">
                <Eye size={12} /> Mode Preview
              </div>
            )}
          </div>

          {/* Rulers and Stage */}
          <div className="flex-1 overflow-auto p-12 scrollbar-hide flex justify-center relative">
            <div
              className={`bg-white text-black shadow-[0_30px_90px_-15px_rgba(0,0,0,0.2)] relative font-serif overflow-visible transition-transform origin-top flex flex-col antialiased ${previewMode ? 'ring-1 ring-slate-200' : ''}`}
              style={{
                width: `${paperW}mm`,
                minHeight: `${paperH}mm`,
                transform: `scale(${zoom / 100})`,
                flexShrink: 0,
                padding: `${pageMargin}mm`,
                textRendering: 'optimizeLegibility',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale'
              }}
              onClick={() => setSelectedId(null)}
            >
              {/* Grid Overlay */}
              {showGrid && !previewMode && (
                <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '15px 15px' }} />
              )}

              <div className="p-0">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                    {blocks.filter(b => !b.hidden).map((block) => (
                      <CanvasBlock
                        key={block.id}
                        block={block}
                        config={config}
                        pengajuan={pengajuan}
                        onUpdateConfig={onUpdateConfig}
                        onUpdateBlock={updateBlock}
                        onDelete={() => setBlocks(blocks.filter(b => b.id !== block.id))}
                        isSelected={!previewMode && selectedId === block.id}
                        onSelect={() => !previewMode && setSelectedId(block.id)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar: Properties */}
        {!fullscreen && !previewMode && (
        <aside className="w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0 z-40">
          <header className="flex border-b border-slate-100 dark:border-slate-800">
            <button onClick={() => setActivePropertyTab('STYLE')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activePropertyTab === 'STYLE' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>Gaya</button>
            <button onClick={() => setActivePropertyTab('LAYOUT')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activePropertyTab === 'LAYOUT' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>Layout</button>
            <button onClick={() => setActivePropertyTab('PAGE')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activePropertyTab === 'PAGE' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>Halaman</button>
            <button onClick={() => setActivePropertyTab('FORM')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activePropertyTab === 'FORM' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>Form</button>
          </header>

          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            {activePropertyTab === 'FORM' && (
              <div className="space-y-6">
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daftar Input Warga</h3>
                    <button onClick={() => setFormFields([...formFields, { id: generateId(), label: 'Input Baru', type: 'text', required: false }])} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-indigo-600"><Plus size={14} /></button>
                  </div>
                  <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">
                    Input ini akan muncul saat warga mengisi form pengajuan surat di aplikasi mereka.
                  </p>
                  {formFields.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 border-dashed">
                      <Type size={20} className="mx-auto mb-2 opacity-30" />
                      <p className="text-[10px] font-bold uppercase tracking-widest">Belum ada input tambahan</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formFields.map((f, i) => (
                        <div key={f.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 relative group">
                          <button onClick={() => setFormFields(formFields.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={12} /></button>
                          <div className="space-y-3 pt-1">
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Nama / Label Input</label>
                              <input type="text" value={f.label} onChange={e => { const nf = [...formFields]; nf[i].label = e.target.value; setFormFields(nf); }} className="w-full text-xs font-bold bg-transparent border-b border-slate-200 dark:border-slate-600 focus:border-indigo-500 focus:outline-none py-1" placeholder="Contoh: Nama Anak" />
                            </div>
                            <div className="flex gap-3">
                              <div className="flex-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Tipe Isian</label>
                                <select value={f.type} onChange={e => { const nf = [...formFields]; nf[i].type = e.target.value as any; setFormFields(nf); }} className="w-full text-[10px] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded p-1.5 focus:outline-none focus:border-indigo-500">
                                  <option value="text">Teks Pendek</option>
                                  <option value="number">Angka</option>
                                  <option value="date">Tanggal</option>
                                  <option value="select">Pilihan</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-1.5 pt-4">
                                <input type="checkbox" checked={f.required} onChange={e => { const nf = [...formFields]; nf[i].required = e.target.checked; setFormFields(nf); }} id={`req-${f.id}`} className="accent-indigo-600" />
                                <label htmlFor={`req-${f.id}`} className="text-[10px] font-bold cursor-pointer text-slate-600 dark:text-slate-300">Wajib Diisi</label>
                              </div>
                            </div>
                            {f.type === 'select' && (
                              <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Daftar Pilihan (pisahkan koma)</label>
                                <input type="text" value={(f.options || []).join(', ')} onChange={e => { const nf = [...formFields]; nf[i].options = e.target.value.split(',').map(s => s.trim()).filter(Boolean); setFormFields(nf); }} placeholder="Laki-laki, Perempuan" className="w-full text-[10px] bg-transparent border-b border-slate-200 dark:border-slate-600 focus:border-indigo-500 focus:outline-none py-1" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {activePropertyTab === 'PAGE' && (
              <div className="space-y-6">
                <section>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Margin Halaman</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">Margin ({pageMargin}mm)</span>
                      <span className="text-[10px] font-mono font-bold text-indigo-600">{pageMargin}mm</span>
                    </div>
                    <input type="range" min="5" max="30" value={pageMargin} onChange={e => setPageMargin(parseInt(e.target.value))} className="w-full accent-indigo-600 cursor-pointer" />
                    <div className="grid grid-cols-3 gap-2">
                      {[10, 15, 20].map(v => <button key={v} onClick={() => setPageMargin(v)} className={`py-2 rounded-xl text-[10px] font-bold border-2 transition-all ${pageMargin === v ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>{v}mm</button>)}
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Pintasan Keyboard</h3>
                  <div className="space-y-2 text-[10px] text-slate-500">
                    {[['Ctrl+Z', 'Undo'], ['Ctrl+Y', 'Redo'], ['Ctrl+D', 'Duplikat elemen'], ['Delete', 'Hapus elemen terpilih']].map(([key, desc]) => (
                      <div key={key} className="flex justify-between items-center py-1.5 border-b border-slate-50">
                        <span>{desc}</span>
                        <code className="bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-600">{key}</code>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
            {selectedBlock && activePropertyTab === 'STYLE' && (
              <div className="space-y-6">
                {selectedBlock.type === 'SPACER' ? (
                  <section>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Tinggi Spasi</h3>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">Tinggi ({selectedBlock.height || 10}mm)</span>
                      <span className="text-[10px] font-mono font-bold text-indigo-600">{selectedBlock.height || 10}mm</span>
                    </div>
                    <input type="range" min="2" max="60" value={selectedBlock.height || 10} onChange={e => updateBlock({ ...selectedBlock, height: parseInt(e.target.value) })} className="w-full accent-indigo-600 cursor-pointer mt-2" />
                  </section>
                ) : (
                  <>
                    <section>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Tipografi</h3>
                      <div className="space-y-3">
                        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-50 rounded-xl">
                          <AlignButton active={selectedBlock.textAlign === 'left'} onClick={() => updateBlock({ ...selectedBlock, textAlign: 'left' })} icon={<AlignLeft size={16} />} />
                          <AlignButton active={selectedBlock.textAlign === 'center'} onClick={() => updateBlock({ ...selectedBlock, textAlign: 'center' })} icon={<AlignCenter size={16} />} />
                          <AlignButton active={selectedBlock.textAlign === 'right'} onClick={() => updateBlock({ ...selectedBlock, textAlign: 'right' })} icon={<AlignRight size={16} />} />
                          <AlignButton active={selectedBlock.textAlign === 'justify'} onClick={() => updateBlock({ ...selectedBlock, textAlign: 'justify' })} icon={<AlignJustify size={16} />} />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                          <span className="text-xs font-bold text-slate-500">Ukuran Teks</span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateBlock({ ...selectedBlock, fontSize: Math.max(6, (selectedBlock.fontSize || 11) - 1) })} className="w-6 h-6 flex items-center justify-center rounded bg-slate-200 hover:bg-slate-300 text-xs font-bold">-</button>
                            <input type="number" value={selectedBlock.fontSize || 11} onChange={e => updateBlock({ ...selectedBlock, fontSize: parseInt(e.target.value) })} className="w-10 bg-transparent border-none text-center font-mono font-bold text-indigo-600 p-0 focus:ring-0" />
                            <button onClick={() => updateBlock({ ...selectedBlock, fontSize: Math.min(36, (selectedBlock.fontSize || 11) + 1) })} className="w-6 h-6 flex items-center justify-center rounded bg-slate-200 hover:bg-slate-300 text-xs font-bold">+</button>
                            <span className="text-[10px] font-black text-slate-400">PT</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                          <span className="text-xs font-bold text-slate-500">Jarak Baris</span>
                          <div className="flex items-center gap-2">
                            <input type="number" step="0.1" min="0.8" max="3" value={selectedBlock.lineHeight || 1.5} onChange={e => updateBlock({ ...selectedBlock, lineHeight: parseFloat(e.target.value) })} className="w-14 bg-transparent border-none text-right font-mono font-bold text-indigo-600 p-0 focus:ring-0" />
                            <span className="text-[10px] font-black text-slate-400">×</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => updateBlock({ ...selectedBlock, isBold: !selectedBlock.isBold })} className={`flex-1 py-2.5 rounded-xl border-2 transition-all flex items-center justify-center gap-1 text-xs font-bold ${selectedBlock.isBold ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}><Bold size={14} /> Tebal</button>
                          <button onClick={() => updateBlock({ ...selectedBlock, isItalic: !selectedBlock.isItalic })} className={`flex-1 py-2.5 rounded-xl border-2 transition-all flex items-center justify-center gap-1 text-xs font-bold ${selectedBlock.isItalic ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}><span className="italic font-serif text-sm">I</span> Miring</button>
                          <button onClick={() => updateBlock({ ...selectedBlock, isUnderline: !selectedBlock.isUnderline })} className={`flex-1 py-2.5 rounded-xl border-2 transition-all flex items-center justify-center gap-1 text-xs font-bold ${selectedBlock.isUnderline ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}><span className="underline font-bold text-sm">U</span></button>
                        </div>
                      </div>
                    </section>
                    <section>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Konten</h3>
                      {selectedBlock.type === 'DATA_GRID' ? (
                        <div className="space-y-2">
                          {(selectedBlock.config?.fields || []).map((field: string, idx: number) => (
                            <div key={idx} className="flex gap-2">
                              <input value={field} onChange={e => { const fields = [...(selectedBlock.config?.fields || [])]; fields[idx] = e.target.value; updateBlock({ ...selectedBlock, config: { ...selectedBlock.config!, fields } }); }} className="flex-1 bg-slate-50 border-none rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-100" />
                              <button onClick={() => { const fields = (selectedBlock.config?.fields || []).filter((_: any, i: number) => i !== idx); updateBlock({ ...selectedBlock, config: { ...selectedBlock.config!, fields } }); }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={12} /></button>
                            </div>
                          ))}
                          <button onClick={() => { const fields = [...(selectedBlock.config?.fields || []), 'Field Baru']; updateBlock({ ...selectedBlock, config: { ...selectedBlock.config!, fields } }); }} className="w-full py-2 border-2 border-dashed border-slate-100 rounded-xl text-[10px] font-black text-slate-400 hover:border-indigo-200 hover:text-indigo-600 transition-all">+ TAMBAH</button>
                        </div>
                      ) : selectedBlock.type !== 'HEADER' && selectedBlock.type !== 'SIGNATURE' && selectedBlock.type !== 'LINE' ? (
                        <textarea value={selectedBlock.content || ''} onChange={e => updateBlock({ ...selectedBlock, content: e.target.value })} className="w-full p-3 bg-slate-50 border-none rounded-xl text-xs font-medium leading-relaxed focus:ring-2 ring-indigo-900/10 outline-none resize-none h-28" placeholder="Konten elemen..." />
                      ) : null}
                    </section>
                  </>
                )}
              </div>
            )}
            {selectedBlock && activePropertyTab === 'LAYOUT' && (
              <div className="space-y-6">
                {selectedBlock.type === 'DATA_GRID' && (
                  <section>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Kolom Tabel</h3>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Lebar Kolom Label</label>
                          <span className="text-[10px] font-mono font-bold text-indigo-600">{selectedBlock.config?.labelWidth ?? 44}mm</span>
                        </div>
                        <input type="range" min="20" max="100" value={selectedBlock.config?.labelWidth ?? 44} onChange={e => updateBlock({ ...selectedBlock, config: { ...selectedBlock.config, labelWidth: parseInt(e.target.value) } })} className="w-full accent-indigo-600 cursor-pointer" />
                        <p className="text-[9px] text-slate-400 italic">💡 Atau seret garis biru di antara kolom</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Indentasi Kiri</label>
                          <span className="text-[10px] font-mono font-bold text-indigo-600">{selectedBlock.config?.indent ?? 10}mm</span>
                        </div>
                        <input type="range" min="0" max="40" value={selectedBlock.config?.indent ?? 10} onChange={e => updateBlock({ ...selectedBlock, config: { ...selectedBlock.config, indent: parseInt(e.target.value) } })} className="w-full accent-indigo-600 cursor-pointer" />
                      </div>
                    </div>
                  </section>
                )}
                <section>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Jarak Vertikal</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Margin Atas</label>
                      <div className="flex items-center bg-slate-50 rounded-xl p-2">
                        <input type="number" min="0" max="50" value={selectedBlock.marginTop ?? 0} onChange={e => updateBlock({ ...selectedBlock, marginTop: parseInt(e.target.value) })} className="w-full bg-transparent border-none text-xs font-mono font-bold text-indigo-600 p-0 focus:ring-0" />
                        <span className="text-[9px] text-slate-400">mm</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Margin Bawah</label>
                      <div className="flex items-center bg-slate-50 rounded-xl p-2">
                        <input type="number" min="0" max="50" value={selectedBlock.marginBottom ?? 2} onChange={e => updateBlock({ ...selectedBlock, marginBottom: parseInt(e.target.value) })} className="w-full bg-transparent border-none text-xs font-mono font-bold text-indigo-600 p-0 focus:ring-0" />
                        <span className="text-[9px] text-slate-400">mm</span>
                      </div>
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Aksi Cepat</h3>
                  <div className="flex gap-2">
                    <button onClick={() => { pushHistory(blocks); const copy = { ...selectedBlock, id: generateId() }; const idx = blocks.findIndex(b => b.id === selectedBlock.id); const nb = [...blocks]; nb.splice(idx + 1, 0, copy); setBlocks(nb); setSelectedId(copy.id); }} className="flex-1 flex flex-col items-center gap-2 p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all">
                      <Copy size={18} className="text-slate-400" />
                      <span className="text-[9px] font-bold uppercase">Duplikat</span>
                    </button>
                    <button onClick={() => { pushHistory(blocks); setBlocks(blocks.filter(b => b.id !== selectedBlock.id)); setSelectedId(null); }} className="flex-1 flex flex-col items-center gap-2 p-4 border border-red-50 bg-red-50/20 text-red-500 rounded-2xl hover:bg-red-50 transition-all">
                      <Trash2 size={18} />
                      <span className="text-[9px] font-bold uppercase">Hapus</span>
                    </button>
                  </div>
                </section>
              </div>
            )}
            {!selectedBlock && activePropertyTab !== 'PAGE' && (
              <div className="h-full flex flex-col items-center justify-center p-10 text-center">
                <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <MousePointer2 size={22} className="text-slate-200" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Pilih Elemen</h4>
                <p className="text-xs text-slate-400 leading-relaxed">Klik elemen di kanvas untuk mengatur propertinya.</p>
              </div>
            )}
          </div>
        </aside>
        )}
      </div>
    </div>
  );
}

function SideToolButton({ icon, label, onClick, color }: { icon: React.ReactNode, label: string, onClick: () => void, color: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 dark:hover:shadow-none transition-all group active:scale-[0.98] bg-white dark:bg-slate-900`}
    >
      <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm`}>
        {icon}
      </div>
      <div className="text-left">
        <span className="block text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{label}</span>
        <span className="block text-[9px] text-slate-400 mt-0.5">Tambah komponen</span>
      </div>
    </button>
  );
}

function AlignButton({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center py-2.5 rounded-lg transition-all ${active ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
    >
      {icon}
    </button>
  );
}

function CanvasBlock({ block, isSelected, onSelect, config, onUpdateConfig, onUpdateBlock, onDelete, pengajuan }: {
  block: SuratBlock,
  isSelected: boolean,
  onSelect: () => void,
  config: AppConfig,
  onUpdateConfig: (c: AppConfig) => void,
  onUpdateBlock: (b: SuratBlock) => void,
  onDelete: () => void;
  pengajuan?: PengajuanSurat;
  key?: any;
}) {
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: block.id });

  const isHeader = block.type === 'HEADER';

  // --- Resize logic ---
  const resizeRef = useRef<{ dir: string; startX: number; startY: number; startW: number; startH: number; startFs: number } | null>(null);

  const startResize = (e: React.PointerEvent, dir: string) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    resizeRef.current = {
      dir,
      startX: e.clientX,
      startY: e.clientY,
      startW: block.width ?? 180,
      startH: block.height ?? 10,
      startFs: block.fontSize ?? 11,
    };
  };

  const onResizeMove = (e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    const { dir, startX, startY, startW, startH, startFs } = resizeRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (dir === 'bottom') {
      const newH = Math.max(2, Math.round(startH + dy / 3.78));
      onUpdateBlock({ ...block, height: newH });
    } else if (dir === 'right') {
      const newW = Math.max(20, Math.round(startW + dx / 3.78));
      onUpdateBlock({ ...block, width: newW });
    } else if (dir === 'corner') {
      const newW = Math.max(20, Math.round(startW + dx / 3.78));
      const newH = Math.max(2, Math.round(startH + dy / 3.78));
      onUpdateBlock({ ...block, width: newW, height: newH });
    }
  };

  const stopResize = () => { resizeRef.current = null; };

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isSelected ? 50 : 10,
    fontSize: block.fontSize ? `${block.fontSize}pt` : '11pt',
    lineHeight: block.lineHeight || 1.5,
    textAlign: (block.textAlign || 'justify') as any,
    fontWeight: block.isBold ? 'bold' : 'normal',
    fontStyle: block.isItalic ? 'italic' : 'normal',
    textDecoration: block.isUnderline ? 'underline' : 'none',
    marginTop: block.marginTop ? `${block.marginTop}mm` : undefined,
    marginBottom: block.marginBottom ? `${block.marginBottom}mm` : undefined,
    padding: block.padding ? `${block.padding}mm` : undefined,
    width: block.width ? `${block.width}mm` : '100%',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group transition-all cursor-pointer ${isSelected ? 'ring-2 ring-indigo-500 z-50 rounded-sm' : 'hover:ring-1 hover:ring-slate-200 hover:rounded-sm'}`}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onPointerMove={onResizeMove}
      onPointerUp={stopResize}
    >
      {/* Selection Handles */}
      {isSelected && (
        <>
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full z-[60]" />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full z-[60]" />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full z-[60]" />

          {/* Bottom-right corner resize handle */}
          <div
            className="absolute -bottom-2 -right-2 w-4 h-4 bg-indigo-600 border-2 border-white rounded-br-sm rounded-tl-sm z-[60] cursor-nwse-resize"
            title="Seret untuk ubah ukuran"
            onPointerDown={e => startResize(e, 'corner')}
          />
          {/* Bottom edge — height only (for SPACER) */}
          <div
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-3 bg-indigo-400 border border-white rounded-full z-[60] cursor-s-resize flex items-center justify-center"
            title="Seret untuk ubah tinggi"
            onPointerDown={e => startResize(e, 'bottom')}
          >
            <div className="w-4 h-0.5 bg-white/60 rounded" />
          </div>
          {/* Right edge — width */}
          <div
            className="absolute top-1/2 -right-2 -translate-y-1/2 w-3 h-8 bg-indigo-400 border border-white rounded-full z-[60] cursor-e-resize flex items-center justify-center"
            title="Seret untuk ubah lebar elemen"
            onPointerDown={e => startResize(e, 'right')}
          >
            <div className="w-0.5 h-4 bg-white/60 rounded" />
          </div>

          {/* Floating toolbar */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900 text-white rounded-lg px-2 py-1 shadow-xl z-[70]">
            <div
              {...attributes}
              {...listeners}
              className="p-1.5 hover:bg-slate-700 rounded cursor-grab active:cursor-grabbing"
              title="Seret untuk pindah urutan"
            >
              <Move size={12} />
            </div>
            <div className="w-px h-4 bg-white/20" />
            <button onClick={e => { e.stopPropagation(); onUpdateBlock({ ...block, isBold: !block.isBold }); }} className={`p-1.5 rounded text-xs font-bold hover:bg-slate-700 ${block.isBold ? 'bg-indigo-600' : ''}`} title="Tebal"><Bold size={11} /></button>
            <button onClick={e => { e.stopPropagation(); onUpdateBlock({ ...block, isItalic: !block.isItalic }); }} className={`p-1.5 rounded text-xs font-bold italic hover:bg-slate-700 ${block.isItalic ? 'bg-indigo-600' : ''}`} title="Miring"><span className="italic text-[10px]">I</span></button>
            <div className="w-px h-4 bg-white/20" />
            <button onClick={e => { e.stopPropagation(); onUpdateBlock({ ...block, fontSize: Math.max(6, (block.fontSize || 11) - 1) }); }} className="p-1 hover:bg-slate-700 rounded text-xs font-bold">-</button>
            <span className="text-[10px] font-mono w-6 text-center">{block.fontSize || 11}</span>
            <button onClick={e => { e.stopPropagation(); onUpdateBlock({ ...block, fontSize: Math.min(36, (block.fontSize || 11) + 1) }); }} className="p-1 hover:bg-slate-700 rounded text-xs font-bold">+</button>
            <div className="w-px h-4 bg-white/20" />
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 hover:bg-rose-600 rounded transition-colors"
              title="Hapus"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </>
      )}

      {/* Content Area */}
      <div className={`font-serif ${isHeader ? 'mb-2' : 'py-0.5 px-2'}`}>
        {block.type === 'HEADER' && (
          <div className="relative flex flex-col items-center">
            <div className="flex gap-4 pb-2 items-center w-full relative">
              <div className="w-20 h-20 shrink-0 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center p-1 relative group/logo bg-slate-50/50">
                {config.logoUrl ? (
                  <img src={getCdnUrl(config.logoUrl)} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-400">
                    <Camera size={20} />
                    <span className="text-[8px] font-bold">LOGO</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={!!uploadingField}
                  className={`absolute inset-0 opacity-0 ${uploadingField ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadingField('templateLogo');
                      try {
                        if (config.logoUrl) deleteFromCdn(config.logoUrl);
                        const { uploadToCdn } = await import('../lib/cdnUtils');
                        const fileId = await uploadToCdn(file, 'HalloWarga-Logo');
                        onUpdateConfig({ ...config, logoUrl: fileId });
                      } catch (err: any) { alert(err.message); }
                      finally { setUploadingField(null); }
                    }
                  }}
                />
                {uploadingField === 'templateLogo' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 rounded-xl z-10">
                    <div className="w-4 h-4 border-2 border-indigo-900 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col items-center pr-20">
                <input
                  type="text"
                  value={block.content || (config.rtNumber && config.rwNumber ? `RUKUN TETANGGA ${config.rtNumber} RUKUN WARGA ${config.rwNumber}` : 'RUKUN TETANGGA ... RUKUN WARGA ...')}
                  onChange={(e) => onUpdateBlock({ ...block, content: e.target.value.toUpperCase() })}
                  className="w-full border-none bg-transparent p-0 text-center font-bold text-black text-2xl tracking-tight focus:ring-0 uppercase font-serif"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex flex-col items-center w-full mt-0.5">
                  <div className="flex items-center gap-1.5 text-lg font-bold text-black w-full justify-center">
                    <textarea
                      value={block.config?.headerPrefix1 ?? 'KELURAHAN'}
                      onChange={(e) => onUpdateBlock({ ...block, config: { ...block.config, headerPrefix1: e.target.value } })}
                      className="border border-transparent hover:border-slate-300 bg-transparent p-0 text-lg font-bold text-black focus:ring-1 focus:ring-indigo-500 uppercase text-center resize-x overflow-hidden whitespace-nowrap rounded-md leading-relaxed"
                      style={{ width: `${Math.max((block.config?.headerPrefix1 ?? 'KELURAHAN').length * 1.5, 5)}ch`, minWidth: '50px', height: '36px' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <textarea
                      value={config.villageName || '...'}
                      onChange={(e) => onUpdateConfig({ ...config, villageName: e.target.value })}
                      className="border border-transparent hover:border-slate-300 bg-transparent p-0 text-lg font-bold text-black focus:ring-1 focus:ring-indigo-500 uppercase text-center resize-x overflow-hidden whitespace-nowrap rounded-md leading-relaxed"
                      style={{ width: `${Math.max((config.villageName || '...').length * 1.5, 5)}ch`, minWidth: '50px', height: '36px' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-base font-bold text-black w-full justify-center mt-0.5">
                    <textarea
                      value={block.config?.headerPrefix2 ?? 'KECAMATAN'}
                      onChange={(e) => onUpdateBlock({ ...block, config: { ...block.config, headerPrefix2: e.target.value } })}
                      className="border border-transparent hover:border-slate-300 bg-transparent p-0 text-base font-bold text-black focus:ring-1 focus:ring-indigo-500 uppercase text-center resize-x overflow-hidden whitespace-nowrap rounded-md leading-relaxed"
                      style={{ width: `${Math.max((block.config?.headerPrefix2 ?? 'KECAMATAN').length * 1.5, 5)}ch`, minWidth: '50px', height: '32px' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <textarea
                      value={config.districtName || '...'}
                      onChange={(e) => onUpdateConfig({ ...config, districtName: e.target.value })}
                      className="border border-transparent hover:border-slate-300 bg-transparent p-0 text-base font-bold text-black focus:ring-1 focus:ring-indigo-500 uppercase text-center resize-x overflow-hidden whitespace-nowrap rounded-md leading-relaxed"
                      style={{ width: `${Math.max((config.districtName || '...').length * 1.5, 5)}ch`, minWidth: '50px', height: '32px' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <textarea
                      value={config.cityName || '...'}
                      onChange={(e) => onUpdateConfig({ ...config, cityName: e.target.value })}
                      className="border border-transparent hover:border-slate-300 bg-transparent p-0 text-base font-bold text-black focus:ring-1 focus:ring-indigo-500 uppercase text-center resize-x overflow-hidden whitespace-nowrap rounded-md leading-relaxed"
                      style={{ width: `${Math.max((config.cityName || '...').length * 1.5, 5)}ch`, minWidth: '50px', height: '32px' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="w-64 h-[1.5px] bg-black my-1" />
            <div className="flex items-center gap-1 text-[9px] italic font-bold text-black w-full justify-center">
              <textarea
                value={block.config?.headerPrefix3 ?? 'Sekretariat :'}
                onChange={(e) => onUpdateBlock({ ...block, config: { ...block.config, headerPrefix3: e.target.value } })}
                className="border border-transparent hover:border-slate-300 bg-transparent p-0 text-[10px] italic font-bold text-black focus:ring-1 focus:ring-indigo-500 text-right resize-x overflow-hidden whitespace-nowrap rounded-md leading-relaxed"
                style={{ width: `${Math.max((block.config?.headerPrefix3 ?? 'Sekretariat :').length * 1.5, 5)}ch`, minWidth: '50px', height: '24px' }}
                onClick={(e) => e.stopPropagation()}
              />
              <input
                type="text"
                value={config.secretaryAddress || ''}
                onChange={(e) => onUpdateConfig({ ...config, secretaryAddress: e.target.value })}
                className="border-none bg-transparent p-0 text-[10px] italic font-bold text-black focus:ring-0 text-left flex-1 cursor-text"
                placeholder="..."
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <div className="w-full border-t-[3px] border-black mt-2 mb-[1px]" />
            <div className="w-full border-t border-black mb-4" />
          </div>
        )}

        {block.type === 'TITLE' && (
          <div className="flex flex-col items-center py-2">
            <div className="border-b-[1.5px] border-black inline-block px-10 pb-0.5 w-full text-center">
              <textarea
                value={block.content || ''}
                onChange={(e) => {
                  onUpdateBlock({ ...block, content: e.target.value.toUpperCase() });
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                className="w-full border-none bg-transparent p-0 text-lg font-bold uppercase focus:ring-0 text-center font-serif text-black resize-none overflow-hidden"
                placeholder="JUDUL SURAT"
                rows={1}
                onClick={(e) => e.stopPropagation()}
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = t.scrollHeight + 'px';
                }}
                style={{ fontSize: block.fontSize ? `${block.fontSize}pt` : '18px' }}
              />
            </div>
            <div className="mt-1 text-sm font-medium flex items-center justify-center gap-1 text-black w-full">
              <textarea
                value={block.config?.titlePrefix ?? 'Nomor :'}
                onChange={(e) => onUpdateBlock({ ...block, config: { ...block.config, titlePrefix: e.target.value } })}
                className="border border-transparent hover:border-slate-300 bg-transparent p-0 text-[10pt] font-bold uppercase text-black focus:ring-1 focus:ring-indigo-500 text-center resize-x overflow-hidden whitespace-nowrap rounded-md leading-relaxed"
                style={{ width: `${Math.max((block.config?.titlePrefix ?? 'Nomor :').length * 1.5, 5)}ch`, minWidth: '50px', height: '28px' }}
                onClick={(e) => e.stopPropagation()}
              />
              <textarea
                value={block.config?.customNumber || `... / RT.${config.rtNumber || '...'} / ${config.rwNumber || '...'} / ${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][new Date().getMonth()]} / ${new Date().getFullYear()}`}
                onChange={(e) => onUpdateBlock({ ...block, config: { ...block.config, customNumber: e.target.value } })}
                className="border border-transparent hover:border-slate-300 bg-transparent p-0 text-[10pt] text-black focus:ring-1 focus:ring-indigo-500 text-center resize-x overflow-hidden whitespace-nowrap rounded-md leading-relaxed"
                style={{ width: `${Math.max((block.config?.customNumber || '').length * 1.5, 25)}ch`, minWidth: '100px', height: '28px' }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {block.type === 'PARAGRAPH' && (
          <div className="w-full py-0.5">
            <textarea
              value={block.content || ''}
              onChange={(e) => {
                onUpdateBlock({ ...block, content: e.target.value });
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              className="w-full border-none bg-transparent p-0 text-black leading-tight focus:ring-0 resize-none font-serif overflow-hidden cursor-text text-justify"
              style={{ fontSize: block.fontSize ? `${block.fontSize}pt` : '11.5pt' }}
              placeholder="Ketik isi surat di sini..."
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
            />
          </div>
        )}

        {block.type === 'DATA_GRID' && (
          <div className="my-2 text-black font-serif relative group/grid" style={{ paddingLeft: `${block.config?.indent ?? 10}mm` }}>
            {/* Label-width resize handle */}
            {isSelected && (
              <div
                className="absolute top-0 bottom-0 w-1 bg-indigo-400 opacity-0 group-hover/grid:opacity-100 hover:opacity-100 cursor-col-resize z-10 transition-opacity"
                style={{ left: `calc(${block.config?.indent ?? 10}mm + ${block.config?.labelWidth ?? 44}mm)` }}
                title="Seret untuk ubah lebar kolom label"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const startX = e.clientX;
                  const startW = block.config?.labelWidth ?? 44;
                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  const onMove = (ev: PointerEvent) => {
                    const dx = (ev.clientX - startX) / 3.78; // px to mm
                    const newW = Math.max(20, Math.min(100, Math.round(startW + dx)));
                    onUpdateBlock({ ...block, config: { ...block.config, labelWidth: newW } });
                  };
                  const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
                  window.addEventListener('pointermove', onMove);
                  window.addEventListener('pointerup', onUp);
                }}
              />
            )}
            {(block.config?.fields || []).map((field: string, i: number) => (
              <div key={i} className="flex mb-1.5 relative group/field items-start">
                <div className="shrink-0 font-bold uppercase tracking-tight" style={{ width: `${block.config?.labelWidth ?? 44}mm`, fontSize: block.fontSize ? `${block.fontSize}pt` : '11pt' }}>
                  <input
                    type="text"
                    value={field}
                    onChange={(e) => {
                      const newFields = [...(block.config?.fields || [])];
                      newFields[i] = e.target.value;
                      onUpdateBlock({ ...block, config: { ...block.config, fields: newFields } });
                    }}
                    className="w-full border-none bg-transparent p-0 focus:ring-0 text-black font-bold uppercase"
                    style={{ fontSize: 'inherit' }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="mx-2 font-bold text-black shrink-0 pt-0.5">:</div>
                <div className="flex-1 flex items-start relative group/field-val text-black min-w-0">
                  <div className="flex-1">
                    {pengajuan ? (
                      <textarea
                        rows={1}
                        value={block.config?.values?.[i] !== undefined ? block.config.values[i] : (() => {
                          const ck = field.toLowerCase().replace(/\s/g, '').replace(/^\d+\./, '');
                          if (ck.includes('nama')) return pengajuan.userName;
                          if (ck.includes('status') || ck.includes('kawin') || ck.includes('nikah')) return pengajuan.data.statusPernikahan;
                          if (ck.includes('nik')) return pengajuan.userNik;
                          if (ck.includes('jenis')) return pengajuan.data.jenisKelamin;
                          if (ck.includes('tempat')) return pengajuan.data.tempatLahir;
                          if (ck.includes('tanggal') || ck.includes('tgl')) return pengajuan.data.tglLahir || pengajuan.data.tanggalLahir;
                          if (ck.includes('alamat')) return (pengajuan.data.alamat || pengajuan.data.alamatLengkap);
                          if (ck.includes('agama')) return pengajuan.data.agama;
                          if (ck.includes('pekerjaan')) return pengajuan.data.pekerjaan;
                          if (ck.includes('keperluan')) return pengajuan.data.keperluan;
                          return pengajuan.data[field] || pengajuan.data[ck] || "...";
                        })()}
                        onChange={(e) => {
                          const newValues = block.config?.values ? [...block.config.values] : [];
                          // Pre-fill if this is the first edit
                          if (!block.config?.values) {
                            (block.config?.fields || []).forEach((f, idx) => {
                              if (newValues[idx] === undefined || newValues[idx] === '') {
                                const ck = f.toLowerCase().replace(/\s/g, '').replace(/^\d+\./, '');
                                if (ck.includes('nama')) newValues[idx] = pengajuan.userName;
                                else if (ck.includes('status') || ck.includes('kawin') || ck.includes('nikah')) newValues[idx] = pengajuan.data.statusPernikahan;
                                else if (ck.includes('nik')) newValues[idx] = pengajuan.userNik;
                                else if (ck.includes('jenis')) newValues[idx] = pengajuan.data.jenisKelamin;
                                else if (ck.includes('tempat')) newValues[idx] = pengajuan.data.tempatLahir;
                                else if (ck.includes('tanggal') || ck.includes('tgl')) newValues[idx] = pengajuan.data.tglLahir || pengajuan.data.tanggalLahir;
                                else if (ck.includes('alamat')) newValues[idx] = (pengajuan.data.alamat || pengajuan.data.alamatLengkap);
                                else if (ck.includes('agama')) newValues[idx] = pengajuan.data.agama;
                                else if (ck.includes('pekerjaan')) newValues[idx] = pengajuan.data.pekerjaan;
                                else if (ck.includes('keperluan')) newValues[idx] = pengajuan.data.keperluan;
                                else newValues[idx] = pengajuan.data[f] || pengajuan.data[ck] || "";
                              }
                            });
                          }
                          newValues[i] = e.target.value;
                          onUpdateBlock({ ...block, config: { ...block.config, values: newValues } });
                        }}
                        className="w-full border-none bg-blue-50/30 p-0 px-1 focus:ring-1 focus:ring-indigo-500 text-black font-bold rounded antialiased resize-none overflow-hidden leading-snug"
                        style={{ fontSize: block.fontSize ? `${block.fontSize}pt` : '11pt' }}
                        onClick={(e) => e.stopPropagation()}
                        onInput={(e) => {
                          const t = e.target as HTMLTextAreaElement;
                          t.style.height = 'auto';
                          t.style.height = t.scrollHeight + 'px';
                        }}
                      />
                    ) : (
                      <div className="w-full border-b border-dotted border-black/40 h-full min-h-[20px]" />
                    )}
                  </div>

                  {isSelected && (
                    <div className="absolute -right-12 opacity-0 group-hover/field:opacity-100 flex items-center gap-1 transition-all">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newFields = [...(block.config?.fields || [])];
                          newFields.splice(i, 1);
                          onUpdateBlock({ ...block, config: { ...block.config, fields: newFields } });
                        }}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isSelected && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newFields = [...(block.config?.fields || []), 'Field Baru'];
                  onUpdateBlock({ ...block, config: { ...block.config, fields: newFields } });
                }}
                className="mt-2 px-4 py-1.5 border border-dashed border-indigo-200 text-indigo-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center gap-2"
              >
                <Plus size={12} /> Tambah Field
              </button>
            )}
          </div>
        )}

        {block.type === 'SIGNATURE' && (
          <div className="flex justify-between mt-12 px-4 pb-4 text-black font-serif relative">
            <div className="w-64 text-center flex flex-col items-center group/sig-rw relative">
              <div className="flex flex-col items-center gap-1 font-bold mb-4 text-black">
                <input
                  type="text"
                  value={block.config?.leftLabel || 'Mengetahui,'}
                  onChange={(e) => onUpdateBlock({ ...block, config: { ...block.config, leftLabel: e.target.value } })}
                  className="w-full border-none bg-transparent p-0 text-center font-bold uppercase focus:ring-0 text-black text-[11pt]"
                  onClick={(e) => e.stopPropagation()}
                />
                <input
                  type="text"
                  value={block.config?.leftSubLabel || `Ketua RW ${config.rwNumber || '...'}`}
                  onChange={(e) => onUpdateBlock({ ...block, config: { ...block.config, leftSubLabel: e.target.value } })}
                  className="w-full border-none bg-transparent p-0 text-center font-bold uppercase focus:ring-0 text-black text-[11pt]"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Signature Area RW */}
              <div className="h-24 w-full flex items-center justify-center relative group/sig-box cursor-pointer">
                {(block.config?.rwSigUrl || config.rwSignatureUrl) ? (
                  <img src={getCdnUrl(block.config?.rwSigUrl || config.rwSignatureUrl!)} alt="RW Signature" className="max-h-full max-w-[150px] object-contain" />
                ) : (
                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-slate-300 group-hover/sig-box:border-indigo-300 group-hover/sig-box:text-indigo-400 transition-colors">
                    <PenTool size={24} />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={!!uploadingField}
                  className={`absolute inset-0 opacity-0 ${uploadingField ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadingField('templateRwSig');
                      try {
                        if (block.config?.rwSigUrl) deleteFromCdn(block.config.rwSigUrl);
                        const { uploadToCdn } = await import('../lib/cdnUtils');
                        const fileId = await uploadToCdn(file, 'HalloWarga-TTD-RW');
                        onUpdateBlock({ ...block, config: { ...block.config, rwSigUrl: fileId } });
                      } catch (err: any) { alert(err.message); }
                      finally { setUploadingField(null); }
                    }
                  }}
                />
                {uploadingField === 'templateRwSig' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 rounded-xl z-10">
                    <div className="w-4 h-4 border-2 border-indigo-900 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {block.config?.rwSigUrl && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onUpdateBlock({ ...block, config: { ...block.config, rwSigUrl: '' } }); }}
                    className="absolute top-0 right-0 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover/sig-box:opacity-100 transition-opacity"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>

              <div className="border-b-2 border-black px-4 pb-0.5 min-w-[200px] mt-2 relative group/sig-rw-leader">
                <div className="flex items-center justify-center text-[11.5pt] font-bold text-black uppercase w-full">
                  <span>(</span>
                  <input
                    type="text"
                    value={config.rwLeaderName || ''}
                    onChange={(e) => onUpdateConfig({ ...config, rwLeaderName: e.target.value })}
                    className="border-none bg-transparent p-0 text-center font-bold focus:ring-0 uppercase mx-1 w-full max-w-[150px]"
                    placeholder="NAMA KETUA RW"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span>)</span>
                </div>
              </div>
            </div>

            <div className="w-72 text-center flex flex-col items-center group/sig-rt">
              <input
                type="text"
                value={block.config?.dateText ?? `${config.cityName}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                onChange={(e) => onUpdateBlock({ ...block, config: { ...block.config, dateText: e.target.value } })}
                className="mb-1 w-full border-none bg-transparent p-0 text-center font-bold text-black focus:ring-0 text-[11pt]"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex flex-col items-center gap-1 font-bold mb-4 text-black">
                <input
                  type="text"
                  value={block.config?.rightSubLabel || `Ketua RT ${config.rtNumber || '...'}`}
                  onChange={(e) => onUpdateBlock({ ...block, config: { ...block.config, rightSubLabel: e.target.value } })}
                  className="w-full border-none bg-transparent p-0 text-center font-bold uppercase focus:ring-0 text-black text-[11pt]"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Signature Area RT */}
              <div className="h-24 w-full flex items-center justify-center relative group/sig-box-rt cursor-pointer">
                {(block.config?.rtSigUrl || config.signatureUrl) ? (
                  <img src={getCdnUrl(block.config?.rtSigUrl || config.signatureUrl!)} alt="RT Signature" className="max-h-full max-w-[150px] object-contain" />
                ) : (
                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-slate-300 group-hover/sig-box-rt:border-indigo-300 group-hover/sig-box-rt:text-indigo-400 transition-colors">
                    <PenTool size={24} />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={!!uploadingField}
                  className={`absolute inset-0 opacity-0 ${uploadingField ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadingField('templateRtSig');
                      try {
                        if (block.config?.rtSigUrl) deleteFromCdn(block.config.rtSigUrl);
                        const { uploadToCdn } = await import('../lib/cdnUtils');
                        const fileId = await uploadToCdn(file, 'HalloWarga-TTD-RT');
                        onUpdateBlock({ ...block, config: { ...block.config, rtSigUrl: fileId } });
                      } catch (err: any) { alert(err.message); }
                      finally { setUploadingField(null); }
                    }
                  }}
                />
                {uploadingField === 'templateRtSig' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 rounded-xl z-10">
                    <div className="w-4 h-4 border-2 border-indigo-900 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {block.config?.rtSigUrl && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onUpdateBlock({ ...block, config: { ...block.config, rtSigUrl: '' } }); }}
                    className="absolute top-0 right-0 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover/sig-box-rt:opacity-100 transition-opacity"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>

              <div className="border-b-2 border-black px-10 pb-0.5 min-w-[220px] relative group/sig-leader mt-2">
                <input
                  type="text"
                  value={config.rtLeaderName || ''}
                  onChange={(e) => onUpdateConfig({ ...config, rtLeaderName: e.target.value })}
                  className="w-full border-none bg-transparent p-0 text-center font-bold focus:ring-0 text-black uppercase text-[11.5pt]"
                  placeholder="NAMA KETUA RT"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          </div>
        )}

        {block.type === 'LINE' && <div className="w-full border-t-[1.5px] border-black my-4" />}
        {block.type === 'SPACER' && (
          <div
            className={`w-full flex items-center justify-center ${isSelected ? 'bg-amber-50 border-2 border-dashed border-amber-300' : 'border border-dashed border-slate-100'}`}
            style={{ height: `${block.height || 10}mm` }}
          >
            {isSelected && <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Spasi: {block.height || 10}mm</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolboxButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all group"
    >
      <div className="group-hover:scale-110 transition-transform">{icon}</div>
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}

function AdminFormInput({ label, placeholder, type = 'text', value, onChange, required, className = '' }: {
  label: string, placeholder: string, type?: string, value: string, onChange: (v: string) => void, required?: boolean, className?: string
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-900/10 focus:border-indigo-900 dark:text-white transition-all font-bold placeholder:text-slate-300 dark:placeholder:text-slate-700"
      />
    </div>
  );
}
