/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  FileText,
  Bell,
  User as UserIcon,
  LogOut,
  Plus,
  Clock,
  CheckCircle2,
  Home,
  Mail,
  Pen,
  XCircle,
  ChevronRight,
  Send,
  Info as InfoIcon,
  Download,
  ArrowRight,
  Camera,
  Upload,
  Music,
  Activity,
  Search,
  Heart,
  Briefcase,
  Truck,
  Users,
  X,
  Globe,
  Lock,
  EyeOff,
  Trash2,
  Edit2,
  AlertTriangle,
  Wallet,
  MoreVertical
} from 'lucide-react';
import { User, PengajuanSurat, InfoRT, SuratStatus, WargaReport, AppNotification, AppConfig } from '../types';
import { storage, formatDate, formatDateTime, generateId, downloadTextFile, generatePDF, createNotification } from '../utils';
import { SURAT_TYPES, INITIAL_INFO } from '../constants';
import { cmsService } from '../lib/cmsService';
import { suratTypesApi, suratApi, reportsApi, notifApi, usersApi } from '../lib/api';
import { configService } from '../lib/configService';
import { processImageUpload } from '../lib/imageUtils';
import { getCdnUrl, deleteFromCdn } from '../lib/cdnUtils';
import { Pagination } from '../components/Pagination';
import AppLogo from '../components/AppLogo';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import IuranWarga from '../components/IuranWarga';
import ThemeToggle from '../components/ThemeToggle';

interface WargaDashboardProps {
  user: User;
  onLogout: () => void;
  onUpdateUser?: (user: User) => void;
}

const getSuratIcon = (id: string) => {
  if (id.includes('ijin')) return <Music size={24} />;
  if (id.includes('kematian')) return <Activity size={24} />;
  if (id.includes('lahir')) return <Activity size={24} />;
  if (id.includes('domisili')) return <Home size={24} />;
  if (id.includes('kehilangan')) return <Search size={24} />;
  if (id.includes('sktm')) return <Heart size={24} />;
  if (id.includes('nikah')) return <Heart size={24} />;
  if (id.includes('usaha')) return <Briefcase size={24} />;
  if (id.includes('pindah')) return <Truck size={24} />;
  if (id.includes('nik')) return <UserIcon size={24} />;
  if (id.includes('skck')) return <Search size={24} />;
  if (id.includes('kk')) return <Users size={24} />;
  return <FileText size={24} />;
};

export default function WargaDashboard({ user, onLogout, onUpdateUser }: WargaDashboardProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SURAT' | 'RIWAYAT' | 'INFO' | 'LAPORAN' | 'IURAN' | 'PROFILE'>('OVERVIEW');
  const [pengajuan, setPengajuan] = useState<PengajuanSurat[]>([]);
  const [riwayatFilter, setRiwayatFilter] = useState<'SEMUA' | 'PENDING' | 'DIPROSES' | 'DISETUJUI' | 'DITOLAK'>('SEMUA');
  const [riwayatSearch, setRiwayatSearch] = useState('');
  const [infoFilter, setInfoFilter] = useState<'SEMUA' | 'PENGUMUMAN' | 'BERITA' | 'KEGIATAN' | 'HIMBAUAN' | 'EMERGENCY'>('SEMUA');
  const [infoSearch, setInfoSearch] = useState('');
  const [info, setInfo] = useState<InfoRT[]>([]);
  const [reports, setReports] = useState<WargaReport[]>([]);
  const [publicReports, setPublicReports] = useState<WargaReport[]>([]);
  const [laporanSubTab, setLaporanSubTab] = useState<'MILIK' | 'FORUM'>('MILIK');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [suratTypes, setSuratTypes] = useState(SURAT_TYPES);
  const [selectedSuratType, setSelectedSuratType] = useState(SURAT_TYPES[0]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);
  const [selectedPengajuan, setSelectedPengajuan] = useState<PengajuanSurat | null>(null);
  const [selectedInfo, setSelectedInfo] = useState<InfoRT | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [profileData, setProfileData] = useState<User>(user);

  // Pagination states
  const ITEMS_PER_PAGE = 6;
  const [pageRiwayat, setPageRiwayat] = useState(1);
  const [pageInfo, setPageInfo] = useState(1);
  const [pageLaporanMilik, setPageLaporanMilik] = useState(1);
  const [pageLaporanForum, setPageLaporanForum] = useState(1);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [editingReport, setEditingReport] = useState<WargaReport | null>(null);

  // Reset pagination when filters change
  useEffect(() => { setPageRiwayat(1); }, [riwayatFilter, riwayatSearch]);
  useEffect(() => { setPageInfo(1); }, [infoFilter, infoSearch]);
  useEffect(() => { setPageLaporanMilik(1); }, [laporanSubTab]);
  useEffect(() => { setPageLaporanForum(1); }, [laporanSubTab]);

  // Sinkronisasi jika prop user berubah dari parent
  useEffect(() => {
    setProfileData(user);
  }, [user]);

  const [savingProfile, setSavingProfile] = useState(false);

  // ── Profile completeness gate ──────────────────────────────────────────────
  const REQUIRED_PROFILE_FIELDS: { key: keyof typeof profileData; label: string }[] = [
    { key: 'nik',              label: 'NIK' },
    { key: 'noKK',             label: 'Nomor KK' },
    { key: 'alamat',           label: 'Alamat Domisili' },
    { key: 'noHp',             label: 'Nomor Handphone' },
    { key: 'tempatLahir',      label: 'Tempat Lahir' },
    { key: 'tglLahir',         label: 'Tanggal Lahir' },
    { key: 'jenisKelamin',     label: 'Jenis Kelamin' },
    { key: 'agama',            label: 'Agama' },
    { key: 'statusPernikahan', label: 'Status Pernikahan' },
    { key: 'pekerjaan',        label: 'Pekerjaan' },
  ];

  const getMissingFields = () =>
    REQUIRED_PROFILE_FIELDS.filter(f => !profileData[f.key] || String(profileData[f.key]).trim() === '');

  const [showIncompleteProfileModal, setShowIncompleteProfileModal] = useState(false);

  /** Panggil ini di semua titik masuk pengajuan surat */
  const handleGoToSurat = (suratTypeToSelect?: typeof selectedSuratType) => {
    const missing = getMissingFields();
    if (missing.length > 0) {
      setShowIncompleteProfileModal(true);
      return;
    }
    if (suratTypeToSelect) setSelectedSuratType(suratTypeToSelect);
    setActiveTab('SURAT');
    setShowForm(true);
  };
  // ──────────────────────────────────────────────────────────────────────────

  const loadDashboardData = () => {
    suratApi.getAll()
      .then(all => setPengajuan(all.filter(p => p.userId === user.id)))
      .catch(() => { });

    reportsApi.getAll()
      .then(all => setReports(all.filter(r => r.userId === user.id)))
      .catch(() => { });

    reportsApi.getPublic()
      .then(setPublicReports)
      .catch(() => { });

    configService.getConfig().then(data => data && setConfig(data));

    usersApi.getById(user.id)
      .then(u => setProfileData(u))
      .catch(() => { });

    notifApi.getAll()
      .then(all => setNotifications(all.filter(n => n.userId === user.id)))
      .catch(() => { });

    cmsService.getInfo().then(setInfo);

    suratTypesApi.getAll().then(types => {
      if (types && types.length > 0) {
        setSuratTypes(types);
        if (!showForm) setSelectedSuratType(types[0]);
      }
    }).catch(() => { });
  };

  useEffect(() => {
    loadDashboardData();
  }, [user.id]);

  // ── Sinkronisasi data laporan secara real-time ─────────────────────────────
  const fetchReports = () => {
    reportsApi.getAll()
      .then(all => setReports(all.filter(r => r.userId === user.id)))
      .catch(() => { });
    reportsApi.getPublic()
      .then(setPublicReports)
      .catch(() => { });
  };

  // Refresh laporan setiap kali tab LAPORAN atau OVERVIEW aktif
  useEffect(() => {
    if (activeTab === 'LAPORAN' || activeTab === 'OVERVIEW') {
      fetchReports();
    }
  }, [activeTab]);

  // Polling setiap 10 detik saat tab LAPORAN aktif
  useEffect(() => {
    if (activeTab !== 'LAPORAN') return;
    const interval = setInterval(fetchReports, 10_000);
    return () => clearInterval(interval);
  }, [activeTab, user.id]);

  // Refresh saat window kembali fokus
  useEffect(() => {
    window.addEventListener('focus', fetchReports);
    return () => window.removeEventListener('focus', fetchReports);
  }, [user.id]);
  // ──────────────────────────────────────────────────────────────────────────

  const handleMarkAsRead = (notifId: string) => {
    notifApi.markRead(notifId).then(() => {
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true } : n));
    }).catch(() => { });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await usersApi.update(profileData.id, {
        name: profileData.name,
        nik: profileData.nik,
        noKK: profileData.noKK,
        alamat: profileData.alamat,
        noHp: profileData.noHp,
        tempatLahir: profileData.tempatLahir,
        tglLahir: profileData.tglLahir,
        jenisKelamin: profileData.jenisKelamin,
        agama: profileData.agama,
        statusPernikahan: profileData.statusPernikahan,
        pekerjaan: profileData.pekerjaan,
        avatar: profileData.avatar,
      });
      // Refresh profil dari server
      const updated = await usersApi.getById(profileData.id);
      setProfileData(updated);
      if (onUpdateUser) onUpdateUser(updated);
      toast.success('Profil berhasil disimpan!');
    } catch (err: any) {
      toast.error('Gagal menyimpan profil', err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAjukanSurat = async (keterangan: string, data: Record<string, string>) => {
    try {
      await suratApi.create({
        typeId: selectedSuratType.id,
        typeName: selectedSuratType.name,
        keterangan,
        data,
        blocks: selectedSuratType.blocks,
      });

      // Refresh pengajuan dari database
      const all = await suratApi.getAll();
      setPengajuan(all.filter(p => p.userId === user.id));
      setShowForm(false);
      toast.success('Pengajuan berhasil dikirim!', 'Silakan cek status di menu Riwayat.');
    } catch (err: any) {
      toast.error('Gagal mengirim pengajuan', err.message || 'Terjadi kesalahan');
    }
  };

  const handleAddReport = async (title: string, content: string, type: 'SARAN' | 'KELUHAN' | 'LAPORAN', imageUrl?: string, isPublic?: boolean) => {
    try {
      if (editingReport) {
        await reportsApi.update(editingReport.id, { title, content, type, isPublic: !!isPublic, imageUrl });
      } else {
        await reportsApi.create({ title, content, type, isPublic: !!isPublic, imageUrl });
      }
      setShowReportForm(false);
      setEditingReport(null);
      loadDashboardData();
    } catch (err: any) { toast.error('Gagal menyimpan laporan', err.message); }
  };

  const handleDeleteReport = async (id: string, imageUrl?: string) => {
    const ok = await confirm({
      title: 'Hapus Laporan',
      message: 'Apakah Anda yakin ingin menghapus laporan ini? Tindakan ini tidak dapat dibatalkan.',
      confirmLabel: 'Ya, Hapus',
      variant: 'danger',
    });
    if (ok) {
      try {
        await reportsApi.remove(id);
        if (imageUrl) await deleteFromCdn(imageUrl);
        loadDashboardData();
        toast.success('Laporan berhasil dihapus.');
      } catch (err: any) { toast.error('Gagal menghapus laporan', err.message); }
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-200/20 dark:bg-indigo-900/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-5%] left-[20%] w-[30%] h-[30%] bg-indigo-100/30 dark:bg-indigo-950/10 rounded-full blur-[100px]" />
      </div>

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

      <aside className={`
        hidden md:flex fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col z-[60] transition-transform duration-300 transform md:relative md:translate-x-0 md:h-screen md:shrink-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              <AppLogo className="w-full h-full object-contain" />
            </div>
            <span className="text-2xl font-bold text-slate-900 dark:text-white leading-tight border-l-2 border-slate-100 dark:border-slate-800 pl-3">Hallo <span className="text-indigo-900">Warga</span></span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-red-500 transition-colors">
            <XCircle size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <SidebarLink
            icon={<LayoutDashboard size={20} />}
            label="Home"
            active={activeTab === 'OVERVIEW'}
            onClick={() => { setActiveTab('OVERVIEW'); setIsSidebarOpen(false); }}
          />
          <SidebarLink
            icon={<FileText size={20} />}
            label="Layanan Surat"
            active={activeTab === 'SURAT'}
            onClick={() => { setActiveTab('SURAT'); setIsSidebarOpen(false); }}
          />
          <SidebarLink
            icon={<Clock size={20} />}
            label="Riwayat Surat"
            active={activeTab === 'RIWAYAT'}
            onClick={() => { setActiveTab('RIWAYAT'); setIsSidebarOpen(false); }}
          />
          <SidebarLink
            icon={<Bell size={20} />}
            label="Kabar RT"
            active={activeTab === 'INFO'}
            onClick={() => { setActiveTab('INFO'); setIsSidebarOpen(false); }}
          />
          <SidebarLink
            icon={<Mail size={20} />}
            label="Laporan & Kritik"
            active={activeTab === 'LAPORAN'}
            onClick={() => { setActiveTab('LAPORAN'); setIsSidebarOpen(false); }}
          />
          <SidebarLink
            icon={<Wallet size={20} />}
            label="Iuran Warga"
            active={activeTab === 'IURAN'}
            onClick={() => { setActiveTab('IURAN'); setIsSidebarOpen(false); }}
          />
          <SidebarLink
            icon={<UserIcon size={20} />}
            label="Profil Saya"
            active={activeTab === 'PROFILE'}
            onClick={() => { setActiveTab('PROFILE'); setIsSidebarOpen(false); }}
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
              <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase truncate">{user.role}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full py-3 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center gap-2 transition-colors rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <LogOut size={18} />
            Keluar Akun
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden pb-24 md:pb-0">
        <header className="h-12 md:h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-3 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <h2 className="text-[11px] md:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-[0.15em] md:tracking-widest">
              {activeTab === 'OVERVIEW' ? 'Ringkasan' :
                activeTab === 'SURAT' ? 'Surat Digital' :
                  activeTab === 'RIWAYAT' ? 'Riwayat Pengajuan' :
                    activeTab === 'INFO' ? 'Kabar RT' :
                      activeTab === 'LAPORAN' ? 'Laporan & Kritik' :
                        activeTab === 'IURAN' ? 'Iuran Warga' :
                        'Profil Saya'}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 md:gap-4">
            <ThemeToggle size="sm" />
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all ${showNotifications ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <Bell size={18} className="md:w-5 md:h-5" />
                {notifications.some(n => !n.isRead) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-3 w-[300px] sm:w-[360px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      {/* Header */}
                      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">Pemberitahuan</h3>
                        {notifications.some(n => !n.isRead) && (
                          <button
                            onClick={() => {
                              notifications.forEach(n => { if (!n.isRead) handleMarkAsRead(n.id); });
                            }}
                            className="text-[10px] font-black text-indigo-900 dark:text-indigo-400 hover:underline"
                          >
                            Tandai semua dibaca
                          </button>
                        )}
                      </div>

                      {/* List */}
                      <div className="max-h-[360px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-10 text-center">
                            <Bell size={32} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
                            <p className="text-xs text-slate-400 font-medium">Belum ada pemberitahuan.</p>
                          </div>
                        ) : (
                          notifications.map(n => (
                            <div
                              key={n.id}
                              onClick={() => {
                                handleMarkAsRead(n.id);
                                if (n.type === 'SURAT') setActiveTab('RIWAYAT');
                                else if (n.type === 'LAPORAN') setActiveTab('LAPORAN');
                                setShowNotifications(false);
                              }}
                              className={`p-4 border-b border-slate-50 dark:border-slate-800/50 cursor-pointer transition-colors ${n.isRead ? 'opacity-60' : 'bg-indigo-50/40 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}
                            >
                              <div className="flex gap-3">
                                <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${n.type === 'SURAT' ? 'bg-blue-50 text-blue-600' : n.type === 'INFO' ? 'bg-indigo-50 text-indigo-900' : 'bg-rose-50 text-rose-600'}`}>
                                  {n.type === 'SURAT' ? <FileText size={15} /> : n.type === 'INFO' ? <Bell size={15} /> : <Mail size={15} />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className={`text-xs leading-tight mb-0.5 ${n.isRead ? 'font-medium text-slate-600 dark:text-slate-400' : 'font-bold text-slate-900 dark:text-white'}`}>{n.title}</p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug">{n.message}</p>
                                  <p className="text-[9px] font-bold text-slate-300 dark:text-slate-600 uppercase mt-1.5">{formatDate(n.createdAt)}</p>
                                </div>
                                {!n.isRead && (
                                  <div className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1" />
                                )}
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
            <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-slate-200 dark:border-slate-800">
              <div className="hidden lg:block text-right">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">Warga RT 01</p>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center text-white shadow-lg shadow-indigo-900/20 overflow-hidden">
                {profileData.avatar ? (
                  <img src={getCdnUrl(profileData.avatar)} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={16} className="md:w-5 md:h-5" />
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-3 md:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'OVERVIEW' && (
              <div className="space-y-6 md:space-y-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 md:gap-6">
                  <div>
                    <h1 className="text-xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Halo, {user.name.split(' ')[0]} 👋</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-lg mt-0.5 md:mt-1">Gunakan layanan mandiri untuk urusan RT Anda.</p>
                  </div>
                  <button
                    onClick={() => handleGoToSurat()}
                    className="flex items-center justify-center gap-2 md:gap-3 px-5 md:px-8 py-3 md:py-5 bg-indigo-900 text-white rounded-xl md:rounded-2xl font-bold text-sm md:text-lg hover:bg-indigo-950 transition-all shadow-xl shadow-indigo-900/20 active:scale-95"
                  >
                    <Plus size={18} className="md:w-6 md:h-6" />
                    Ajukan Surat
                  </button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                  <StatCard
                    label="Semua Pengajuan"
                    value={pengajuan.length}
                    color="indigo"
                    icon={<FileText size={24} />}
                  />
                  <StatCard
                    label="Status Diproses"
                    value={pengajuan.filter(p => p.status === 'PENDING' || p.status === 'DIPROSES').length}
                    color="amber"
                    icon={<Clock size={24} />}
                  />
                  <StatCard
                    label="Telah Disetujui"
                    value={pengajuan.filter(p => p.status === 'DISETUJUI').length}
                    color="indigo"
                    icon={<CheckCircle2 size={24} />}
                  />
                </div>

                {/* Riwayat Surat & Kabar RT ringkas */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Riwayat Surat Ringkas */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-900 dark:text-indigo-400">
                          <Clock size={18} />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Riwayat Surat</h3>
                      </div>
                      <button
                        onClick={() => setActiveTab('RIWAYAT')}
                        className="flex items-center gap-1 text-[10px] font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest hover:gap-2 transition-all"
                      >
                        Lihat Semua <ChevronRight size={12} />
                      </button>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-800">
                      {pengajuan.length === 0 ? (
                        <div className="px-6 py-8 text-center">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Belum ada pengajuan surat.</p>
                        </div>
                      ) : (
                        pengajuan.slice(0, 4).map(p => {
                          const statusStyles: Record<SuratStatus, string> = {
                            PENDING: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                            DIPROSES: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-400',
                            DISETUJUI: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
                            DITOLAK: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
                          };
                          const statusDot: Record<SuratStatus, string> = {
                            PENDING: 'bg-slate-400',
                            DIPROSES: 'bg-indigo-600',
                            DISETUJUI: 'bg-emerald-500',
                            DITOLAK: 'bg-rose-500',
                          };
                          const statusLabels: Record<SuratStatus, string> = {
                            PENDING: 'Menunggu',
                            DIPROSES: 'Diproses',
                            DISETUJUI: 'Selesai',
                            DITOLAK: 'Ditolak',
                          };
                          return (
                            <button
                              key={p.id}
                              onClick={() => { setSelectedPengajuan(p); }}
                              className="w-full flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-900 group-hover:text-white transition-all shrink-0">
                                  <FileText size={14} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight truncate group-hover:text-indigo-900 dark:group-hover:text-indigo-400 transition-colors">{p.typeName}</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(p.createdAt)}</p>
                                </div>
                              </div>
                              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shrink-0 ${statusStyles[p.status]}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusDot[p.status]}`} />
                                {statusLabels[p.status]}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                    {pengajuan.length > 4 && (
                      <div className="px-6 py-4 border-t border-slate-50 dark:border-slate-800">
                        <button
                          onClick={() => setActiveTab('RIWAYAT')}
                          className="w-full py-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-900 dark:hover:text-indigo-400 transition-all flex items-center justify-center gap-2"
                        >
                          Lihat {pengajuan.length - 4} Pengajuan Lainnya <ArrowRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Kabar RT Ringkas */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-900 dark:text-indigo-400">
                          <Bell size={18} />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Kabar RT</h3>
                      </div>
                      <button
                        onClick={() => setActiveTab('INFO')}
                        className="flex items-center gap-1 text-[10px] font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest hover:gap-2 transition-all"
                      >
                        Lihat Semua <ChevronRight size={12} />
                      </button>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-800">
                      {info.length === 0 ? (
                        <div className="px-6 py-8 text-center">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Belum ada informasi dari RT.</p>
                        </div>
                      ) : (
                        info.slice(0, 4).map(i => {
                          const typeColors: Record<string, string> = {
                            PENGUMUMAN: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
                            BERITA: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
                            KEGIATAN: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
                            HIMBAUAN: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
                            EMERGENCY: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
                          };
                          return (
                            <button
                              key={i.id}
                              onClick={() => { setSelectedInfo(i); }}
                              className="w-full flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {i.imageUrl ? (
                                  <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0">
                                    <img src={getCdnUrl(i.imageUrl)} alt={i.title} className="w-full h-full object-cover" />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-900 group-hover:text-white transition-all shrink-0">
                                    <InfoIcon size={14} />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight truncate group-hover:text-indigo-900 dark:group-hover:text-indigo-400 transition-colors">{i.title}</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(i.date)}</p>
                                </div>
                              </div>
                              <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shrink-0 ${typeColors[i.type] || 'bg-slate-100 text-slate-500'}`}>
                                {i.type}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                    {info.length > 4 && (
                      <div className="px-6 py-4 border-t border-slate-50 dark:border-slate-800">
                        <button
                          onClick={() => setActiveTab('INFO')}
                          className="w-full py-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-900 dark:hover:text-indigo-400 transition-all flex items-center justify-center gap-2"
                        >
                          Lihat {info.length - 4} Kabar Lainnya <ArrowRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'SURAT' && (() => {
              const categoryMeta: Record<string, { label: string; bar: string; badge: string }> = {
                PENGANTAR: {
                  label: 'Surat Pengantar',
                  bar: 'bg-indigo-600',
                  badge: 'bg-indigo-50 text-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-400',
                },
                KETERANGAN: {
                  label: 'Surat Keterangan',
                  bar: 'bg-teal-500',
                  badge: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400',
                },
                IJIN: {
                  label: 'Surat Ijin',
                  bar: 'bg-amber-500',
                  badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
                },
              };

              const allCats = Array.from(new Set([
                'PENGANTAR', 'KETERANGAN', 'IJIN',
                ...suratTypes.map(t => t.category || 'PENGANTAR'),
              ]));

              return (
                <div className="space-y-10">
                  <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                      <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Layanan Surat</h1>
                      <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {suratTypes.length} jenis surat tersedia · pilih dan ajukan secara digital.
                      </p>
                    </div>
                    {showForm && (
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="flex items-center gap-2 px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                      >
                        <ArrowRight size={16} className="rotate-180" />
                        Pilih Surat Lain
                      </button>
                    )}
                  </header>

                  {showForm ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-slate-900 rounded-2xl p-8 md:p-12 shadow-xl border border-slate-100 dark:border-slate-800"
                    >
                      <SuratForm
                        types={suratTypes}
                        selectedType={selectedSuratType}
                        onSelectType={setSelectedSuratType}
                        onSubmit={handleAjukanSurat}
                        onCancel={() => setShowForm(false)}
                        user={profileData}
                      />
                    </motion.div>
                  ) : (
                    <div className="space-y-12">
                      {allCats.map(cat => {
                        const items = suratTypes.filter(t => (t.category || 'PENGANTAR') === cat);
                        if (items.length === 0) return null;
                        const meta = categoryMeta[cat] || {
                          label: cat,
                          bar: 'bg-slate-400',
                          badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                        };
                        return (
                          <section key={cat} className="space-y-5">
                            {/* Category header */}
                            <div className="flex items-center gap-3">
                              <span className={`w-2 h-8 rounded-full ${meta.bar}`} />
                              <div>
                                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">{meta.label}</h2>
                                <p className="text-xs text-slate-400 font-medium">{items.length} jenis surat</p>
                              </div>
                            </div>

                            {/* Surat cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                              {items.map(t => (
                                <motion.div
                                  key={t.id}
                                  whileHover={{ y: -4 }}
                                  className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 p-7 flex flex-col group hover:border-indigo-900/30 hover:shadow-lg hover:shadow-indigo-900/5 transition-all shadow-sm"
                                >
                                  {/* Badge kategori */}
                                  <div className="mb-5">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${meta.badge}`}>
                                      {meta.label}
                                    </span>
                                  </div>

                                  {/* Icon */}
                                  <div className={`w-12 h-12 rounded-2xl ${meta.badge} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                                    {getSuratIcon(t.id)}
                                  </div>

                                  {/* Nama & Deskripsi */}
                                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 leading-tight uppercase tracking-tight line-clamp-2">
                                    {t.name}
                                  </h3>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6 flex-1 line-clamp-2">
                                    {t.description || 'Ajukan surat ini untuk keperluan administrasi RT.'}
                                  </p>

                  {/* Tombol Ajukan */}
                                  <button
                                    onClick={() => handleGoToSurat(t)}
                                    className="w-full py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-900 hover:text-white transition-all active:scale-95 group-hover:bg-indigo-900 group-hover:text-white"
                                  >
                                    <Send size={13} />
                                    Ajukan Sekarang
                                  </button>
                                </motion.div>
                              ))}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
            {activeTab === 'RIWAYAT' && (
              <div className="space-y-10">
                <header>
                  <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Riwayat Surat</h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">Daftar surat yang pernah Anda ajukan.</p>
                </header>

                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="text"
                      placeholder="Cari berdasarkan nama surat atau keperluan..."
                      value={riwayatSearch}
                      onChange={(e) => setRiwayatSearch(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-900 focus:border-transparent outline-none transition-all dark:text-white"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
                    {['SEMUA', 'PENDING', 'DIPROSES', 'DISETUJUI', 'DITOLAK'].map(status => (
                      <button
                        key={status}
                        onClick={() => setRiwayatFilter(status as any)}
                        className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${riwayatFilter === status
                            ? 'bg-indigo-900 text-white shadow-lg shadow-indigo-900/20'
                            : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                          }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  {(() => {
                    const filtered = pengajuan
                      .filter(p => riwayatFilter === 'SEMUA' ? true : p.status === riwayatFilter)
                      .filter(p => riwayatSearch === '' ? true : (
                        p.typeName.toLowerCase().includes(riwayatSearch.toLowerCase()) ||
                        p.keterangan.toLowerCase().includes(riwayatSearch.toLowerCase())
                      ));

                    const paginated = filtered.slice((pageRiwayat - 1) * ITEMS_PER_PAGE, pageRiwayat * ITEMS_PER_PAGE);

                    return filtered.length === 0 ? (
                      <EmptyState message="Riwayat pengajuan tidak ditemukan." />
                    ) : (
                      <>
                        <div className="space-y-6">
                          {paginated.map(p => (
                            <PengajuanItem key={p.id} item={p} config={config} onClick={() => setSelectedPengajuan(p)} />
                          ))}
                        </div>
                        <Pagination
                          currentPage={pageRiwayat}
                          totalItems={filtered.length}
                          itemsPerPage={ITEMS_PER_PAGE}
                          onPageChange={setPageRiwayat}
                        />
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {activeTab === 'INFO' && (
              <div className="space-y-10">
                <div>
                  <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Papan Informasi</h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">Informasi terkini dari lingkungan RT.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="text"
                      placeholder="Cari berdasarkan judul atau konten informasi..."
                      value={infoSearch}
                      onChange={(e) => setInfoSearch(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-900 focus:border-transparent outline-none transition-all dark:text-white"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
                    {['SEMUA', 'PENGUMUMAN', 'BERITA', 'KEGIATAN', 'HIMBAUAN', 'EMERGENCY'].map(type => (
                      <button
                        key={type}
                        onClick={() => setInfoFilter(type as any)}
                        className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${infoFilter === type
                            ? 'bg-indigo-900 text-white shadow-lg shadow-indigo-900/20'
                            : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                          }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-8">
                  {(() => {
                    const filtered = info
                      .filter(i => infoFilter === 'SEMUA' ? true : i.type === infoFilter)
                      .filter(i => infoSearch === '' ? true : (
                        i.title.toLowerCase().includes(infoSearch.toLowerCase()) ||
                        i.content.toLowerCase().includes(infoSearch.toLowerCase())
                      ));

                    const paginated = filtered.slice((pageInfo - 1) * ITEMS_PER_PAGE, pageInfo * ITEMS_PER_PAGE);

                    return filtered.length === 0 ? (
                      <EmptyState message="Informasi tidak ditemukan." />
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                          {paginated.map(i => (
                            <InfoCard key={i.id} item={i} onClick={() => setSelectedInfo(i)} />
                          ))}
                        </div>
                        <Pagination
                          currentPage={pageInfo}
                          totalItems={filtered.length}
                          itemsPerPage={ITEMS_PER_PAGE}
                          onPageChange={setPageInfo}
                        />
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {activeTab === 'LAPORAN' && (
              <div className="space-y-10">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Laporan & Kritik</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Sampaikan masukan atau lihat aspirasi warga lainnya.</p>
                  </div>
                  {!showReportForm && (
                    <button
                      onClick={() => setShowReportForm(true)}
                      className="px-8 py-4 bg-indigo-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-indigo-900/20 active:scale-95"
                    >
                      Buat Laporan Baru
                    </button>
                  )}
                </header>

                {showReportForm ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-900 rounded-[32px] p-8 md:p-12 shadow-xl border border-slate-100 dark:border-slate-800"
                  >
                    <ReportForm
                      onSubmit={handleAddReport}
                      onCancel={() => { setShowReportForm(false); setEditingReport(null); }}
                      initialData={editingReport}
                      maxSizeMb={config?.maxUploadSizeMb || 5}
                    />
                  </motion.div>
                ) : (
                  <div className="space-y-8">
                    <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm w-fit">
                      {(['MILIK', 'FORUM'] as const).map(sub => (
                        <button
                          key={sub}
                          onClick={() => setLaporanSubTab(sub)}
                          className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${laporanSubTab === sub ? 'bg-indigo-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          {sub === 'MILIK' ? `Laporan Saya (${reports.length})` : `Forum Warga (${publicReports.length})`}
                        </button>
                      ))}
                    </div>

                    {/* LAPORAN SAYA */}
                    {laporanSubTab === 'MILIK' && (
                      <div className="space-y-8">
                        {(() => {
                          const paginated = reports.slice((pageLaporanMilik - 1) * ITEMS_PER_PAGE, pageLaporanMilik * ITEMS_PER_PAGE);
                          return reports.length === 0 ? (
                            <div className="col-span-full"><EmptyState message="Anda belum pernah mengirim laporan atau kritik." /></div>
                          ) : (
                            <>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {paginated.map(report => (
                                  <div key={report.id} className="p-8 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 flex flex-col">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${report.type === 'LAPORAN' ? 'bg-rose-50 text-rose-600' : report.type === 'KELUHAN' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-900'}`}>{report.type}</span>
                                        <span className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${report.isPublic ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                          {report.isPublic ? <Globe size={10} /> : <Lock size={10} />}
                                          {report.isPublic ? 'Publik' : 'Privat'}
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-bold text-slate-400">{formatDate(report.createdAt)}</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">{report.title}</h3>
                                    <p className="text-base text-slate-500 dark:text-slate-400 font-medium line-clamp-3 flex-1">{report.content}</p>
                                    {/* Area gambar — selalu h-40, placeholder jika tidak ada */}
                                    <div
                                      className={`w-full h-40 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${report.imageUrl ? 'cursor-zoom-in group/img' : ''}`}
                                      onClick={() => report.imageUrl && setLightboxUrl(getCdnUrl(report.imageUrl!))}
                                    >
                                      {report.imageUrl ? (
                                        <img src={getCdnUrl(report.imageUrl!)} alt="Lampiran" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" />
                                      ) : (
                                        <div className="flex flex-col items-center gap-2 text-slate-300 dark:text-slate-700">
                                          <Upload size={28} />
                                          <span className="text-[10px] font-black uppercase tracking-widest">Tanpa Lampiran</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                                      <span className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-tight ${report.status === 'SELESAI_DITANGANI' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                        {report.status === 'SELESAI_DITANGANI' ? 'Selesai Ditangani' : 'Belum Ditangani'}
                                      </span>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => { setEditingReport(report); setShowReportForm(true); }}
                                          className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-indigo-900 hover:text-white transition-all"
                                          title="Edit Laporan"
                                        >
                                          <Edit2 size={14} />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteReport(report.id, report.imageUrl)}
                                          className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-rose-600 hover:text-white transition-all"
                                          title="Hapus Laporan"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <Pagination
                                currentPage={pageLaporanMilik}
                                totalItems={reports.length}
                                itemsPerPage={ITEMS_PER_PAGE}
                                onPageChange={setPageLaporanMilik}
                              />
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* FORUM WARGA */}
                    {laporanSubTab === 'FORUM' && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 p-5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl">
                          <Globe size={18} className="text-emerald-600 shrink-0" />
                          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Forum ini menampilkan laporan yang dipublikasikan oleh warga. Saat membuat laporan, pilih <strong>Publik</strong> agar muncul di sini.</p>
                        </div>
                        {publicReports.length === 0 ? (
                          <EmptyState message="Belum ada laporan publik dari warga." />
                        ) : (
                          <div className="space-y-8">
                            {(() => {
                              const paginated = publicReports.slice((pageLaporanForum - 1) * ITEMS_PER_PAGE, pageLaporanForum * ITEMS_PER_PAGE);
                              return (
                                <>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {paginated.map(report => (
                                      <div key={report.id} className="p-8 bg-white dark:bg-slate-900 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30 shadow-sm space-y-4 flex flex-col">
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                          <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${report.type === 'LAPORAN' ? 'bg-rose-50 text-rose-600' : report.type === 'KELUHAN' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-900'}`}>{report.type}</span>
                                          <span className="text-[10px] font-bold text-slate-400">{formatDate(report.createdAt)}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center font-black text-xs text-indigo-700 dark:text-indigo-400 uppercase shrink-0 overflow-hidden">
                                            {report.userAvatar ? (
                                              <img src={getCdnUrl(report.userAvatar)} alt={report.userName} className="w-full h-full object-cover" />
                                            ) : (
                                              report.userName[0]
                                            )}
                                          </div>
                                          <p className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-tight">{report.userName}</p>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">{report.title}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed flex-1">{report.content}</p>
                                        {/* Area gambar — selalu h-40, placeholder jika tidak ada */}
                                        <div
                                          className={`w-full h-40 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${report.imageUrl ? 'cursor-zoom-in group/img' : ''}`}
                                          onClick={() => report.imageUrl && setLightboxUrl(getCdnUrl(report.imageUrl!))}
                                        >
                                          {report.imageUrl ? (
                                            <img src={getCdnUrl(report.imageUrl!)} alt="Lampiran" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" />
                                          ) : (
                                            <div className="flex flex-col items-center gap-2 text-slate-300 dark:text-slate-700">
                                              <Upload size={28} />
                                              <span className="text-[10px] font-black uppercase tracking-widest">Tanpa Lampiran</span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="pt-3 border-t border-slate-50 dark:border-slate-800">
                                          <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight ${report.status === 'SELESAI_DITANGANI' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                            {report.status === 'SELESAI_DITANGANI' ? 'Selesai Ditangani' : 'Belum Ditangani'}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <Pagination
                                    currentPage={pageLaporanForum}
                                    totalItems={publicReports.length}
                                    itemsPerPage={ITEMS_PER_PAGE}
                                    onPageChange={setPageLaporanForum}
                                  />
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}


            {activeTab === 'IURAN' && <IuranWarga />}

            {activeTab === 'PROFILE' && (
              <div className="space-y-10">
                <header>
                  <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">Profil Warga</h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Pastikan data Anda selalu mutakhir untuk kemudahan pelayanan surat.</p>
                </header>

                {/* Quick Access Menu - Mobile Only */}
                <div className="md:hidden grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setActiveTab('IURAN')}
                    className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-indigo-900 dark:hover:border-indigo-700 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-900 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                      <Wallet size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Iuran</p>
                      <p className="text-[10px] text-slate-400">Lihat tagihan</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('RIWAYAT')}
                    className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-indigo-900 dark:hover:border-indigo-700 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-900 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                      <Clock size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Riwayat</p>
                      <p className="text-[10px] text-slate-400">Surat saya</p>
                    </div>
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[32px] md:rounded-[48px] p-4 md:p-8 lg:p-16 border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="flex flex-col items-center mb-12">
                    <div className="relative group">
                      <div className="w-32 h-32 rounded-[40px] bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-700 shadow-2xl overflow-hidden flex items-center justify-center relative">
                        {avatarUploading && (
                          <div className="absolute inset-0 z-10 bg-slate-900/60 flex flex-col items-center justify-center gap-2">
                            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            <span className="text-[8px] font-black text-white uppercase tracking-tighter">Processing</span>
                          </div>
                        )}
                        {profileData.avatar && profileData.avatar !== 'null' ? (
                          <img src={getCdnUrl(profileData.avatar)} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon size={48} className="text-slate-300" />
                        )}
                      </div>
                      <label className="absolute bottom-[-10px] right-[-10px] w-12 h-12 bg-indigo-900 text-white rounded-2xl flex items-center justify-center shadow-xl cursor-pointer hover:scale-110 active:scale-95 transition-all">
                        <Camera size={20} />
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setAvatarUploading(true);
                              try {
                                const fileId = await processImageUpload(file, config?.maxUploadSizeMb || 5);
                                setProfileData({ ...profileData, avatar: fileId });
                              } catch (err: any) { toast.error('Gagal upload foto', err.message); }
                              finally { setAvatarUploading(false); }
                            }
                          }}
                        />
                      </label>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-6 uppercase tracking-tight">{profileData.name || 'Nama Pengguna'}</h2>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Warga Digital</p>
                  </div>
                  <form onSubmit={handleUpdateProfile} className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <FormInput label="Nama Lengkap" placeholder="Sesuai KTP" value={profileData.name} onChange={v => setProfileData({ ...profileData, name: v })} required />
                      <FormInput label="NIK" placeholder="16 Digit NIK" value={profileData.nik || ''} onChange={v => setProfileData({ ...profileData, nik: v })} required />
                      <FormInput label="No. KK" placeholder="16 Digit KK" value={profileData.noKK || ''} onChange={v => setProfileData({ ...profileData, noKK: v })} required />
                      <FormInput label="Tempat Lahir" placeholder="Kota" value={profileData.tempatLahir || ''} onChange={v => setProfileData({ ...profileData, tempatLahir: v })} />
                      <FormInput label="Tanggal Lahir" type="date" placeholder="" value={(profileData.tglLahir || '').split('T')[0]} onChange={v => setProfileData({ ...profileData, tglLahir: v })} />
                      <FormSelect
                        label="Jenis Kelamin"
                        value={profileData.jenisKelamin || ''}
                        onChange={v => setProfileData({ ...profileData, jenisKelamin: v })}
                        options={['Laki-laki', 'Perempuan']}
                      />
                      <FormSelect
                        label="Agama"
                        value={profileData.agama || ''}
                        onChange={v => setProfileData({ ...profileData, agama: v })}
                        options={['Islam', 'Kristen', 'Hindu', 'Buddha', 'Katholik', 'Konghucu', 'Lainnya']}
                      />
                      <FormSelect label="Status Pernikahan" value={profileData.statusPernikahan || ''} onChange={v => setProfileData({ ...profileData, statusPernikahan: v })} options={['Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati']} />
                      <FormInput label="Pekerjaan" placeholder="Pekerjaan saat ini" value={profileData.pekerjaan || ''} onChange={v => setProfileData({ ...profileData, pekerjaan: v })} />
                      <FormInput label="No. WhatsApp" placeholder="0812..." value={profileData.noHp || ''} onChange={v => setProfileData({ ...profileData, noHp: v })} required />
                      <FormInput label="Alamat Domisili" placeholder="Alamat lengkap..." value={profileData.alamat || ''} onChange={v => setProfileData({ ...profileData, alamat: v })} className="md:col-span-2" required />
                    </div>
                    <div className="pt-10 border-t border-slate-50 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
                      <button type="submit" disabled={savingProfile} className="flex items-center gap-3 px-12 py-5 bg-indigo-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-900/20 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                        {savingProfile ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Menyimpan...</>) : 'Simpan Profil'}
                      </button>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest text-right max-w-[250px]">Data ini akan digunakan otomatis saat Anda mengajukan surat resmi.</p>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      {/* ── Modal: Profil Belum Lengkap ─────────────────────────────────── */}
      <AnimatePresence>
        {showIncompleteProfileModal && (
          <div className="fixed inset-0 flex items-center justify-center z-[200] px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIncompleteProfileModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden z-10"
            >
              {/* Header strip */}
              <div className="bg-amber-500 px-8 py-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <AlertTriangle size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Profil Belum Lengkap</h3>
                  <p className="text-amber-100 text-xs font-semibold mt-0.5">Lengkapi data diri sebelum mengajukan surat</p>
                </div>
                <button
                  onClick={() => setShowIncompleteProfileModal(false)}
                  className="ml-auto w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="px-8 py-6 space-y-5">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                  Data berikut diperlukan agar surat dapat diproses dengan benar. Silakan lengkapi profil Anda terlebih dahulu.
                </p>

                {/* Missing fields list */}
                <div className="space-y-2">
                  {getMissingFields().map(f => (
                    <div
                      key={f.key}
                      className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                        {f.label}
                      </span>
                      <span className="ml-auto text-[10px] font-black text-amber-400 uppercase tracking-widest">
                        Belum diisi
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 pb-8 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowIncompleteProfileModal(false)}
                  className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Nanti Saja
                </button>
                <button
                  onClick={() => {
                    setShowIncompleteProfileModal(false);
                    setActiveTab('PROFILE');
                  }}
                  className="flex-1 py-3.5 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <UserIcon size={14} />
                  Lengkapi Profil
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Info Detail Modal */}
      <AnimatePresence>
        {selectedInfo && (
          <div className="fixed inset-0 flex items-end sm:items-center justify-center z-[100] px-0 sm:px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInfo(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative bg-white dark:bg-slate-900 w-full sm:max-w-2xl rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col z-10"
            >
              {/* Gambar header */}
              {selectedInfo.imageUrl ? (
                <div className="w-full bg-slate-50 dark:bg-slate-800 shrink-0">
                  <img src={getCdnUrl(selectedInfo.imageUrl)} alt={selectedInfo.title} className="w-full h-auto object-contain max-h-96" />
                </div>
              ) : (
                <div className="w-full h-24 bg-gradient-to-br from-indigo-900 to-indigo-700 shrink-0" />
              )}

              {/* Tombol tutup */}
              <button
                onClick={() => setSelectedInfo(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 shadow-lg transition-colors"
              >
                <X size={18} />
              </button>

              {/* Konten */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="flex items-start gap-3 flex-wrap">
                  <span className="px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                    {selectedInfo.type}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest pt-1">
                    {formatDate(selectedInfo.date)}
                  </span>
                </div>

                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">
                  {selectedInfo.title}
                </h2>

                <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed font-medium whitespace-pre-line">
                  {selectedInfo.content}
                </p>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <button
                  onClick={() => setSelectedInfo(null)}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
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
                src={getCdnUrl(lightboxUrl)}
                alt="Gambar penuh"
                className="max-w-full max-h-[90vh] object-contain rounded-3xl shadow-2xl ring-1 ring-white/10"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedPengajuan && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPengajuan(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Detail Pengajuan Surat</h3>
                <button onClick={() => setSelectedPengajuan(null)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                  <XCircle size={24} />
                </button>
              </div>
              <div className="p-8 overflow-y-auto space-y-6">
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-900 flex items-center justify-center text-white">
                    <FileText size={32} />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedPengajuan.typeName}</h4>
                    <p className="text-sm font-semibold text-indigo-900 uppercase tracking-widest">{selectedPengajuan.status}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Tanggal Pengajuan</label>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatDateTime(selectedPengajuan.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">ID Pengajuan</label>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{selectedPengajuan.id.toUpperCase()}</p>
                  </div>
                  {selectedPengajuan.status === 'DISETUJUI' && selectedPengajuan.updatedAt && (
                    <div>
                      <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block mb-1">Tanggal Disetujui</label>
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatDateTime(selectedPengajuan.updatedAt)}</p>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Keperluan</label>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">{selectedPengajuan.keterangan}</p>
                  </div>
                </div>


                {selectedPengajuan.rejectionReason && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-500/10 rounded-2xl border border-rose-100 dark:border-rose-500/20">
                    <label className="text-[10px] font-bold text-rose-600 uppercase tracking-widest block mb-1">Alasan Penolakan</label>
                    <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">{selectedPengajuan.rejectionReason}</p>
                  </div>
                )}
              </div>
              <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4">
                {selectedPengajuan.status === 'DISETUJUI' && (
                  <>
                    <button
                      onClick={async () => {
                        const filename = `${selectedPengajuan.typeName}-${selectedPengajuan.userName}-${selectedPengajuan.id}.pdf`.replace(/\s+/g, '_');
                        await generatePDF(filename, selectedPengajuan.suratContent || '', config, selectedPengajuan.blocks, selectedPengajuan);
                      }}
                      className="flex-1 py-4 bg-indigo-900 text-white rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-indigo-950 transition-all shadow-lg"
                    >
                      <Download size={20} />
                      PDF
                    </button>
                    {selectedPengajuan.pdfUrl && (
                      <a
                        href={selectedPengajuan.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-slate-200 transition-all"
                      >
                        <Mail size={20} />
                        Link Luar
                      </a>
                    )}
                  </>
                )}
                <button
                  onClick={() => setSelectedPengajuan(null)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation - Mobile Only */}
      <AnimatePresence>
        {showMobileMore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMobileMore(false)}
            className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[75]"
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
            className="md:hidden fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] inset-x-3 z-[80] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-900/20 p-4"
          >
            <div className="flex items-center justify-between mb-3 px-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Menu Lainnya</span>
              <button onClick={() => setShowMobileMore(false)} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => { setActiveTab('PROFILE'); setShowMobileMore(false); }}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 transition-all ${activeTab === 'PROFILE' ? 'bg-indigo-900 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95'}`}
              >
                <UserIcon size={20} />
                <span className="text-[9px] font-bold uppercase tracking-wider">Profil</span>
              </button>
              <button
                onClick={() => { setActiveTab('LAPORAN'); setShowMobileMore(false); }}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 transition-all ${activeTab === 'LAPORAN' ? 'bg-indigo-900 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95'}`}
              >
                <Mail size={20} />
                <span className="text-[9px] font-bold uppercase tracking-wider">Laporan</span>
              </button>
              <button
                onClick={() => { setActiveTab('RIWAYAT'); setShowMobileMore(false); }}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 transition-all ${activeTab === 'RIWAYAT' ? 'bg-indigo-900 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95'}`}
              >
                <Clock size={20} />
                <span className="text-[9px] font-bold uppercase tracking-wider">Riwayat</span>
              </button>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => { setShowMobileMore(false); onLogout(); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all active:scale-95"
              >
                <LogOut size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Keluar Akun</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-[75] px-3 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-2 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="grid grid-cols-5 gap-1">
          <MobileNavItem 
            icon={<LayoutDashboard size={21} />} 
            label="Home" 
            active={activeTab === 'OVERVIEW'} 
            onClick={() => { setActiveTab('OVERVIEW'); setShowMobileMore(false); }} 
          />
          <MobileNavItem 
            icon={<FileText size={21} />} 
            label="Surat" 
            active={activeTab === 'SURAT'} 
            onClick={() => { setActiveTab('SURAT'); setShowMobileMore(false); }} 
          />
          <MobileNavItem 
            icon={<Bell size={21} />} 
            label="Kabar" 
            active={activeTab === 'INFO'} 
            onClick={() => { setActiveTab('INFO'); setShowMobileMore(false); }} 
          />
          <MobileNavItem 
            icon={<Wallet size={21} />} 
            label="Iuran" 
            active={activeTab === 'IURAN'} 
            onClick={() => { setActiveTab('IURAN'); setShowMobileMore(false); }} 
          />
          <MobileNavItem 
            icon={<MoreVertical size={21} />} 
            label="Lainnya" 
            active={showMobileMore || activeTab === 'PROFILE' || activeTab === 'LAPORAN' || activeTab === 'RIWAYAT'} 
            onClick={() => setShowMobileMore(!showMobileMore)} 
          />
        </div>
      </nav>
    </div>
  );
}


function MobileNavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 px-1 transition-all duration-300 ${active
        ? 'text-indigo-900 dark:text-indigo-400'
        : 'text-slate-400 dark:text-slate-500 active:scale-90'
      }`}
    >
      <span className={`relative transition-all duration-300 ${active ? 'scale-110 -translate-y-0.5' : ''}`}>{icon}</span>
      <span className={`text-[9px] font-bold uppercase tracking-wider leading-none transition-all duration-300 ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
      {active && (
        <motion.div
          layoutId="mobileNavDot"
          className="w-1 h-1 rounded-full bg-indigo-900 dark:bg-indigo-400 mt-0.5"
          transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
        />
      )}
    </button>
  );
}

function SidebarLink({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-bold transition-all ${active
          ? 'bg-indigo-900 text-white shadow-lg shadow-indigo-900/20 translate-x-1'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
        }`}
    >
      {icon}
      {label}
    </button>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  color: 'indigo' | 'amber' | 'blue';
  icon: React.ReactNode;
}

function StatCard({ label, value, color, icon }: StatCardProps) {
  const themes = {
    indigo: {
      bg: 'bg-indigo-900',
      lightBg: 'bg-indigo-50 dark:bg-indigo-900/10',
      text: 'text-indigo-900 dark:text-indigo-400',
      border: 'border-indigo-100 dark:border-indigo-900/20',
      gradient: 'from-indigo-900 to-slate-950'
    },
    amber: {
      bg: 'bg-amber-500',
      lightBg: 'bg-amber-50 dark:bg-amber-500/10',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-100 dark:border-amber-500/20',
      gradient: 'from-amber-500 to-orange-500'
    },
    blue: {
      bg: 'bg-blue-500',
      lightBg: 'bg-blue-50 dark:bg-blue-500/10',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-100 dark:border-blue-500/20',
      gradient: 'from-blue-500 to-indigo-500'
    },
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className={`p-3.5 md:p-6 rounded-xl md:rounded-2xl border ${themes[color].border} bg-white dark:bg-slate-900 shadow-sm flex flex-col gap-2.5 md:gap-4 relative overflow-hidden group`}
    >
      <div className={`w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center ${themes[color].lightBg} ${themes[color].text} group-hover:scale-110 transition-transform duration-300 [&>svg]:w-5 [&>svg]:h-5 md:[&>svg]:w-6 md:[&>svg]:h-6`}>
        {icon}
      </div>
      <div>
        <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.15em] md:tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-0.5 md:mb-1">{label}</p>
        <p className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white leading-none">{value}</p>
      </div>

      {/* Decorative gradient corner */}
      <div className={`absolute -top-12 -right-12 w-24 h-24 bg-gradient-to-br ${themes[color].gradient} opacity-[0.03] group-hover:opacity-10 rounded-full blur-2xl transition-opacity`} />
    </motion.div>
  );
}

interface PengajuanItemProps {
  item: PengajuanSurat;
  config: any;
  onClick?: () => void;
  key?: string | number;
}

function PengajuanItem({ item, config, onClick }: PengajuanItemProps) {
  const statusStyles: Record<SuratStatus, string> = {
    PENDING: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    DIPROSES: 'bg-indigo-100 dark:bg-indigo-900/10 text-indigo-900 dark:text-indigo-400',
    DISETUJUI: 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-900 dark:text-indigo-400',
    DITOLAK: 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
  };

  const statusDot: Record<SuratStatus, string> = {
    PENDING: 'bg-slate-400',
    DIPROSES: 'bg-indigo-900',
    DISETUJUI: 'bg-indigo-600',
    DITOLAK: 'bg-rose-500'
  };

  const statusLabels: Record<SuratStatus, string> = {
    PENDING: 'Menunggu',
    DIPROSES: 'Diproses',
    DISETUJUI: 'Selesai',
    DITOLAK: 'Ditolak'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-all shadow-sm group cursor-pointer"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-900 group-hover:text-white group-hover:rotate-6 transition-all duration-300 shadow-sm shrink-0">
            <FileText size={28} />
          </div>
          <div className="min-w-0">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-900 transition-colors uppercase truncate">{item.typeName}</h4>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{formatDateTime(item.createdAt)}</span>
              <span className="hidden sm:block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">ID: {item.id.toUpperCase()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-50 dark:border-slate-800">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest ${statusStyles[item.status]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusDot[item.status]} animate-pulse`} />
            {statusLabels[item.status]}
          </div>
          {item.status === 'DISETUJUI' ? (
            <div className="flex gap-2">
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const filename = `${item.typeName}-${item.userName}-${item.id}.pdf`.replace(/\s+/g, '_');
                  await generatePDF(filename, item.suratContent || '', config, item.blocks, item);
                }}
                className="w-10 h-10 rounded-full bg-indigo-900 flex items-center justify-center text-white shadow-lg shadow-indigo-900/20 hover:scale-110 transition-all"
                title="Download PDF"
              >
                <Download size={18} />
              </button>
              {item.pdfUrl && (
                <a
                  href={getCdnUrl(item.pdfUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-white shadow-sm hover:scale-110 transition-all"
                  title="Open Link"
                >
                  <Mail size={18} />
                </a>
              )}
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-300 group-hover:text-indigo-900 group-hover:border-indigo-100 dark:group-hover:border-indigo-900/50 transition-all">
              <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          )}
        </div>
      </div>
      {item.rejectionReason && (
        <div className="mt-5 p-4 bg-rose-50 dark:bg-rose-500/10 rounded-2xl border border-rose-100 dark:border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-bold flex gap-3 items-center">
          <XCircle size={16} />
          Alasan Ditolak: {item.rejectionReason}
        </div>
      )}
    </motion.div>
  );
}

interface InfoItemProps {
  item: InfoRT;
  key?: string | number;
}

function InfoItem({ item }: InfoItemProps) {
  return (
    <div className="flex items-center gap-4 group cursor-pointer p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all">
      <div className="flex-1">
        <span className="text-[10px] font-bold text-indigo-900 dark:text-indigo-400 uppercase tracking-widest">{item.type}</span>
        <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-900 transition-colors uppercase tracking-tight line-clamp-1">{item.title}</h4>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{formatDate(item.date)}</p>
      </div>
      <ChevronRight size={16} className="text-slate-200 dark:text-slate-700 group-hover:text-indigo-900 transition-colors" />
    </div>
  );
}

interface InfoCardProps {
  item: InfoRT;
  key?: string | number;
  onClick?: () => void;
}

function InfoCard({ item, onClick }: InfoCardProps) {
  const typeBadge: Record<string, string> = {
    PENGUMUMAN: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    BERITA:     'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    KEGIATAN:   'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    HIMBAUAN:   'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
    EMERGENCY:  'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
  };
  const badge = typeBadge[item.type] || 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-950 dark:text-indigo-400';

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-black/20 transition-all flex flex-col h-full group cursor-pointer hover:-translate-y-1 active:scale-[0.99]"
    >
      {/* Area gambar — selalu h-48, placeholder jika tidak ada gambar */}
      <div className="w-full h-48 rounded-xl overflow-hidden mb-5 bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center">
        {item.imageUrl ? (
          <img src={getCdnUrl(item.imageUrl)} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-300 dark:text-slate-700">
            <Bell size={32} />
            <span className="text-[10px] font-black uppercase tracking-widest">{item.type}</span>
          </div>
        )}
      </div>
      <span className={`inline-block px-3 py-1 mb-4 rounded-full text-[10px] font-bold uppercase tracking-widest self-start ${badge}`}>
        {item.type}
      </span>
      <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white leading-tight uppercase tracking-tight group-hover:text-indigo-900 dark:group-hover:text-indigo-400 transition-colors">{item.title}</h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6 line-clamp-3 font-medium flex-1">{item.content}</p>
      <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
        <span className="text-xs font-bold uppercase tracking-widest text-[10px] text-slate-400">{formatDate(item.date)}</span>
        <span className="flex items-center gap-1 text-[10px] font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest group-hover:gap-2 transition-all">
          Selengkapnya <ChevronRight size={12} />
        </span>
      </div>
    </button>
  );
}

function SuratForm({ types, selectedType, onSelectType, onSubmit, onCancel, user }: {
  types: import('../types').SuratType[],
  selectedType: import('../types').SuratType,
  onSelectType: (t: import('../types').SuratType) => void,
  onSubmit: (ket: string, data: Record<string, string>) => void | Promise<void>,
  onCancel: () => void,
  user: User
}) {
  const [keterangan, setKeterangan] = useState('');

  // Helper strip ISO ke YYYY-MM-DD untuk input[type=date]
  const toDateOnly = (val?: string) => val ? val.split('T')[0] : '';

  const buildFormData = (u: User) => ({
    nama: u.name || '',
    nik: u.nik || '',
    alamat: u.alamat || '',
    tempatLahir: u.tempatLahir || '',
    tglLahir: toDateOnly(u.tglLahir),
    jenisKelamin: u.jenisKelamin || '',
    agama: u.agama || '',
    statusPernikahan: u.statusPernikahan || '',
    pekerjaan: u.pekerjaan || ''
  });

  const [formData, setFormData] = useState<Record<string, string>>(buildFormData(user));

  // Sync ulang saat user (profileData) berubah — misal setelah load dari API
  useEffect(() => {
    setFormData(buildFormData(user));
  }, [user.id, user.tglLahir, user.nik, user.name]);

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(keterangan, formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Ajukan Surat Digital</h3>
        <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 block">Jenis Surat</label>
        <select
          value={selectedType.id}
          onChange={(e) => {
            const type = types.find(t => t.id === e.target.value);
            if (type) onSelectType(type);
          }}
          className="w-full p-5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-900/10 focus:border-indigo-900 dark:text-white transition-all font-bold shadow-sm"
        >
          <optgroup label="— Surat Pengantar —">
            {types.filter(t => t.category === 'PENGANTAR').map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </optgroup>
          <optgroup label="— Surat Keterangan —">
            {types.filter(t => t.category === 'KETERANGAN').map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </optgroup>
          <optgroup label="— Surat Ijin —">
            {types.filter(t => t.category === 'IJIN').map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </optgroup>
        </select>
      </div>

      <div className="space-y-6">
        <div>
          <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 block">Tujuan Pengajuan / Keperluan</label>
          <textarea
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            rows={3}
            placeholder="Contoh: Mengurus SIM atau Melamar Pekerjaan"
            className="w-full p-5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-900/10 focus:border-indigo-900 dark:text-white transition-all font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600 shadow-sm"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {selectedType.formFields && selectedType.formFields.length > 0 ? (
            /* Dynamic Custom Form Fields (defined via Admin Template Editor) */
            selectedType.formFields.map(field => {
              if (field.type === 'select') {
                return (
                  <FormSelect
                    key={field.id}
                    label={field.label}
                    value={String(formData[field.id] || '')}
                    onChange={(val) => { setFormData({ ...formData, [field.id]: val }); }}
                    options={field.options || []}
                    required={!!field.required}
                  />
                );
              }
              return (
                <FormInput
                  key={field.id}
                  label={field.label}
                  type={field.type}
                  value={String(formData[field.id] || '')}
                  onChange={(val) => { setFormData({ ...formData, [field.id]: val }); }}
                  required={!!field.required}
                />
              );
            })
          ) : (
            /* Legacy Hardcoded Fields for backward compatibility */
            <>
              <FormInput label="NIK" value={formData.nik || ''} onChange={(val) => setFormData({ ...formData, nik: val })} required />
              <FormInput label="Nama Lengkap" value={formData.nama || ''} onChange={(val) => setFormData({ ...formData, nama: val })} required />
              <FormInput label="Tempat Lahir" value={formData.tempatLahir || ''} onChange={(val) => setFormData({ ...formData, tempatLahir: val })} />
              <FormInput label="Tanggal Lahir" type="date" value={formData.tglLahir || ''} onChange={(val) => setFormData({ ...formData, tglLahir: val })} />
              <FormSelect
                label="Jenis Kelamin"
                value={formData.jenisKelamin || ''}
                onChange={(val) => setFormData({ ...formData, jenisKelamin: val })}
                options={['Laki-laki', 'Perempuan']}
              />
              <FormSelect
                label="Agama"
                value={formData.agama || ''}
                onChange={(val) => setFormData({ ...formData, agama: val })}
                options={['Islam', 'Kristen', 'Hindu', 'Buddha', 'Katholik', 'Konghucu', 'Lainnya']}
              />
              <FormSelect label="Status Pernikahan" value={formData.statusPernikahan || ''} onChange={(val) => setFormData({ ...formData, statusPernikahan: val })} options={['Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati']} />
              <FormInput label="Pekerjaan" value={formData.pekerjaan || ''} onChange={(val) => setFormData({ ...formData, pekerjaan: val })} />
              <FormInput label="Alamat" className="md:col-span-2" value={formData.alamat || ''} onChange={(val) => setFormData({ ...formData, alamat: val })} required />

              {selectedType.id === 'ijin-keramaian' && (
                <>
                  <FormInput label="Nama Acara" value={formData.namaAcara || ''} onChange={(val) => setFormData({ ...formData, namaAcara: val })} required />
                  <FormInput label="Lokasi Acara" value={formData.lokasiDetail || ''} onChange={(val) => setFormData({ ...formData, lokasiDetail: val })} required />
                  <FormInput label="Hari/Tgl Acara" type="date" value={formData.tglAcara || ''} onChange={(val) => setFormData({ ...formData, tglAcara: val })} required />
                  <FormInput label="Waktu Acara" value={formData.waktuAcara || ''} onChange={(val) => setFormData({ ...formData, waktuAcara: val })} required />
                </>
              )}

              {selectedType.id === 'ket-kematian' && (
                <>
                  <FormInput label="Tgl Meninggal" type="date" value={formData.tglMeninggal || ''} onChange={(val) => setFormData({ ...formData, tglMeninggal: val })} required />
                  <FormInput label="Waktu Meninggal" value={formData.waktuMeninggal || ''} onChange={(val) => setFormData({ ...formData, waktuMeninggal: val })} />
                  <FormInput label="Tempat Meninggal" value={formData.tempatMeninggal || ''} onChange={(val) => setFormData({ ...formData, tempatMeninggal: val })} />
                  <FormInput label="Penyebab" value={formData.penyebab || ''} onChange={(val) => setFormData({ ...formData, penyebab: val })} />
                </>
              )}

              {selectedType.id === 'ket-usaha' && (
                <>
                  <FormInput label="Alamat Usaha" value={formData.usahaAlamat || ''} onChange={(val) => setFormData({ ...formData, usahaAlamat: val })} required />
                  <FormInput label="Jenis Usaha" value={formData.usahaJenis || ''} onChange={(val) => setFormData({ ...formData, usahaJenis: val })} required />
                </>
              )}

              {selectedType.id === 'ket-domisili' && (
                <FormInput label="Tahun Domisili" value={formData.tahunDomisili || ''} onChange={(val) => setFormData({ ...formData, tahunDomisili: val })} required />
              )}

              {selectedType.id === 'pengantar-pindah' && (
                <>
                  <FormInput
                    label="Alamat Tujuan Pindah"
                    placeholder="Alamat lengkap tujuan"
                    value={formData.alamatTujuan || ''}
                    onChange={(val) => setFormData({ ...formData, alamatTujuan: val })}
                    required
                  />
                  <FormInput
                    label="Alasan Pindah"
                    placeholder="Misal: Ikut Orang Tua"
                    value={formData.alasanPindah || ''}
                    onChange={(val) => setFormData({ ...formData, alasanPindah: val })}
                    required
                  />
                </>
              )}

              {(selectedType.id === 'pengantar-nik' || selectedType.id === 'pengantar-kk') && (
                <FormInput
                  label="Alamat Asal"
                  placeholder="Alamat sebelum mutasi"
                  value={formData.alamatAsal || ''}
                  onChange={(val) => setFormData({ ...formData, alamatAsal: val })}
                />
              )}

              {selectedType.id === 'ket-akmati' && (
                <>
                  <FormInput
                    label="Tanggal Meninggal Dunia"
                    type="date"
                    value={formData.tglMeninggal || ''}
                    onChange={(val) => setFormData({ ...formData, tglMeninggal: val })}
                    required
                  />
                  <FormInput
                    label="Penyebab Meninggal"
                    placeholder="Misal: Sakit / Usia Lanjut"
                    value={formData.penyebab || ''}
                    onChange={(val) => setFormData({ ...formData, penyebab: val })}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
        <button
          disabled={submitting}
          type="submit"
          className="w-full sm:flex-1 py-5 bg-indigo-900 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-indigo-950 transition-all shadow-xl shadow-indigo-900/20 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {submitting ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Mengirim...</>) : (<>Kirim Pengajuan <Send size={24} /></>)}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto px-10 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-sm"
        >
          Batal
        </button>
      </div>
    </form>
  );
}

function ReportForm({ onSubmit, onCancel, initialData, maxSizeMb = 5 }: {
  onSubmit: (t: string, c: string, type: 'SARAN' | 'KELUHAN' | 'LAPORAN', imageUrl?: string, isPublic?: boolean) => void,
  onCancel: () => void,
  initialData?: WargaReport | null,
  maxSizeMb?: number
}) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [type, setType] = useState<'SARAN' | 'KELUHAN' | 'LAPORAN'>(initialData?.type as any || 'LAPORAN');
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl || null);
  const [uploading, setUploading] = useState(false);
  const [isPublic, setIsPublic] = useState(initialData?.isPublic || false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileId = await processImageUpload(file, maxSizeMb);
      setImagePreview(fileId);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(title, content, type, imagePreview || undefined, isPublic); }} className="space-y-8">
      <div className="flex flex-col gap-8">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Kategori</label>
          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => setType('LAPORAN')}
              className={`flex-1 py-4 px-6 rounded-2xl font-bold text-[10px] uppercase tracking-widest border transition-all ${type === 'LAPORAN' ? 'bg-rose-500 text-white border-rose-500 shadow-xl shadow-rose-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-800'}`}
            >
              Laporan Kejadian
            </button>
            <button
              type="button"
              onClick={() => setType('KELUHAN')}
              className={`flex-1 py-4 px-6 rounded-2xl font-bold text-[10px] uppercase tracking-widest border transition-all ${type === 'KELUHAN' ? 'bg-amber-500 text-white border-amber-500 shadow-xl shadow-amber-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-800'}`}
            >
              Keluhan
            </button>
            <button
              type="button"
              onClick={() => setType('SARAN')}
              className={`flex-1 py-4 px-6 rounded-2xl font-bold text-[10px] uppercase tracking-widest border transition-all ${type === 'SARAN' ? 'bg-indigo-900 text-white border-indigo-900 shadow-xl shadow-indigo-900/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-800'}`}
            >
              Saran & Kritik
            </button>
          </div>
        </div>

        <FormInput
          label="Judul Laporan"
          placeholder="Misal: Lampu Jalan Mati atau Usulan Kegiatan"
          value={title}
          onChange={setTitle}
          required
        />

        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Isi Laporan / Detail</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            required
            className="w-full p-6 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-3xl focus:outline-none focus:ring-4 focus:ring-indigo-900/10 focus:border-indigo-900 dark:text-white transition-all font-bold placeholder:text-slate-300 dark:placeholder:text-slate-700 resize-none"
            placeholder="Tuliskan detail laporan Anda di sini..."
          />
        </div>

        {/* Image Upload */}
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Lampiran Foto (opsional)</label>
          <label className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-indigo-400 transition-all group">
            {imagePreview ? (
              <div className="relative w-full">
                <img src={getCdnUrl(imagePreview)} alt="Preview" className="w-full max-h-48 object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setImagePreview(null); }}
                  className="absolute top-2 right-2 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600"
                >
                  <X size={14} />
                </button>
              </div>
            ) : uploading ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="w-8 h-8 border-4 border-indigo-900 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold text-indigo-900">Menyimpan ke CDN...</span>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                  <Camera size={24} />
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">Klik untuk upload foto bukti</span>
                <span className="text-[10px] text-slate-300">JPG, PNG — maks {maxSizeMb}MB</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={uploading} />
          </label>
        </div>
      </div>

      {/* Toggle Visibilitas */}
      <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          {isPublic ? <Globe size={18} className="text-emerald-600" /> : <Lock size={18} className="text-slate-400" />}
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">
              {isPublic ? 'Laporan Publik' : 'Laporan Privat'}
            </p>
            <p className="text-[10px] text-slate-400 font-medium">
              {isPublic ? 'Terlihat semua warga di Forum Warga' : 'Hanya terlihat oleh admin'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsPublic(p => !p)}
          className={`relative w-14 h-7 rounded-full transition-all duration-300 ${isPublic ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
        >
          <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${isPublic ? 'left-8' : 'left-1'}`} />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
        <button
          type="submit"
          className={`w-full sm:flex-1 py-5 text-white rounded-2xl font-bold text-lg transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 ${isPublic ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-indigo-900 hover:bg-slate-900 shadow-indigo-900/20'}`}
        >
          {isPublic ? <Globe size={20} /> : <Send size={20} />}
          {isPublic ? 'Kirim & Publikasikan' : 'Kirim Laporan'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto px-10 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all uppercase tracking-widest text-sm"
        >
          Batal
        </button>
      </div>
    </form>
  );
}

function FormInput({ label, placeholder = '', type = 'text', value, onChange, required, className = '' }: {
  key?: React.Key, label: string, placeholder?: string, type?: string, value: string, onChange: (v: string) => void, required?: boolean, className?: string
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
        className="w-full p-5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-900/10 focus:border-indigo-900 dark:text-white transition-all font-bold placeholder:text-slate-300 dark:placeholder:text-slate-700"
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, options, required, className = '' }: {
  key?: React.Key, label: string, value: string, onChange: (v: string) => void, options: string[], required?: boolean, className?: string
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full p-5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-900/10 focus:border-indigo-900 dark:text-white transition-all font-bold shadow-sm"
      >
        <option value="">Pilih {label}</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
      <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-200 dark:text-slate-700 mb-8 shadow-sm">
        <FileText size={40} />
      </div>
      <p className="text-slate-400 dark:text-slate-500 font-bold max-w-xs">{message}</p>
    </div>
  );
}
