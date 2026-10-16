/**
 * Iuran Admin Module — kelola pengaturan iuran, approve pembayaran, lihat summary
 */
import { useState, useEffect, FormEvent, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wallet,
  CreditCard,
  QrCode,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  TrendingUp,
  Users as UsersIcon,
  Search,
  Eye,
  X,
  Settings,
  ListChecks,
  Grid as GridIcon,
  Upload,
  Image as ImageIcon,
  Check,
  Trash2,
} from 'lucide-react';
import { iuranApi } from '../lib/api';
import { IuranConfig, IuranPayment, IuranSummary, IuranPaymentStatus } from '../types';
import { processImageUpload } from '../lib/imageUtils';
import { getCdnUrl } from '../lib/cdnUtils';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmDialog';
import { Pagination } from './Pagination';

const MONTH_NAMES_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const MONTH_NAMES_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];

const formatRupiah = (n: number) =>
  'Rp ' + (n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const formatDateID = (d: string | undefined) => {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return d; }
};

interface IuranAdminProps {
  onPaymentsChange?: () => void;
}

export default function IuranAdmin({ onPaymentsChange }: IuranAdminProps) {
  const toast = useToast();
  const confirm = useConfirm();

  const [tab, setTab] = useState<'CONFIG' | 'PAYMENTS' | 'MATRIX'>('PAYMENTS');
  const [config, setConfig] = useState<IuranConfig | null>(null);
  const [payments, setPayments] = useState<IuranPayment[]>([]);
  const [summary, setSummary] = useState<IuranSummary | null>(null);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | IuranPaymentStatus>('ALL');
  const [previewProof, setPreviewProof] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [uploadingQris, setUploadingQris] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Pagination
  const PAYMENTS_PER_PAGE = 10;
  const MATRIX_PER_PAGE = 15;
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [matrixPage, setMatrixPage] = useState(1);

  // Form config state
  const [cfgForm, setCfgForm] = useState<IuranConfig>({
    amountPerMonth: 0, bankName: '', bankAccountNumber: '', bankAccountHolder: '', qrisImageUrl: '', notes: '',
  });

  const reload = async () => {
    setLoading(true);
    try {
      const [cfg, pays] = await Promise.all([
        iuranApi.getConfig(),
        iuranApi.listPayments(),
      ]);
      setConfig(cfg);
      setCfgForm(cfg);
      setPayments(pays);
    } catch (err: any) {
      toast.error('Gagal memuat data iuran', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  useEffect(() => {
    if (tab === 'MATRIX') {
      iuranApi.getSummary(year).then(setSummary).catch((e: any) => toast.error('Gagal memuat summary', e.message));
    }
  }, [tab, year]);

  // Save config
  const handleSaveConfig = async (e: FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await iuranApi.updateConfig(cfgForm);
      setConfig(cfgForm);
      toast.success('Pengaturan iuran berhasil disimpan!');
    } catch (err: any) {
      toast.error('Gagal menyimpan pengaturan', err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleUploadQris = async (file: File) => {
    setUploadingQris(true);
    try {
      const fileId = await processImageUpload(file, 3);
      setCfgForm(prev => ({ ...prev, qrisImageUrl: fileId }));
      toast.success('QRIS berhasil diupload');
    } catch (err: any) {
      toast.error('Gagal upload QRIS', err.message);
    } finally {
      setUploadingQris(false);
    }
  };

  // Approve / reject
  const handleApprove = async (p: IuranPayment) => {
    const ok = await confirm({ title: 'Setujui Pembayaran', message: `Setujui pembayaran ${formatRupiah(p.totalAmount)} dari ${p.userName}?`, confirmLabel: 'Setujui', variant: 'default' });
    if (!ok) return;
    try {
      await iuranApi.updatePaymentStatus(p.id, { status: 'APPROVED' });
      setPayments(prev => prev.map(x => x.id === p.id ? { ...x, status: 'APPROVED' as const } : x));
      onPaymentsChange?.();
      toast.success('Pembayaran disetujui');
    } catch (err: any) {
      toast.error('Gagal approve', err.message);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      toast.warning('Alasan wajib', 'Isi alasan penolakan terlebih dahulu');
      return;
    }
    try {
      await iuranApi.updatePaymentStatus(id, { status: 'REJECTED', rejectionReason: rejectReason });
      setPayments(prev => prev.map(x => x.id === id ? { ...x, status: 'REJECTED' as const, rejectionReason: rejectReason } : x));
      onPaymentsChange?.();
      toast.success('Pembayaran ditolak');
      setRejectingId(null);
      setRejectReason('');
    } catch (err: any) {
      toast.error('Gagal reject', err.message);
    }
  };

  const handleDelete = async (p: IuranPayment) => {
    const ok = await confirm({ title: 'Hapus Pembayaran', message: `Hapus pembayaran dari ${p.userName} senilai ${formatRupiah(p.totalAmount)}?`, confirmLabel: 'Hapus', variant: 'danger' });
    if (!ok) return;
    try {
      await iuranApi.removePayment(p.id);
      setPayments(prev => prev.filter(x => x.id !== p.id));
      onPaymentsChange?.();
      toast.success('Pembayaran dihapus');
    } catch (err: any) {
      toast.error('Gagal hapus', err.message);
    }
  };

  // Filter payments
  const filteredPayments = useMemo(() => {
    let res = payments;
    if (statusFilter !== 'ALL') res = res.filter(p => p.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(p => p.userName.toLowerCase().includes(q));
    }
    return res;
  }, [payments, statusFilter, search]);

  // Reset page saat filter/search berubah
  useEffect(() => { setPaymentsPage(1); }, [search, statusFilter]);
  useEffect(() => { setMatrixPage(1); }, [year, summary]);

  // Slice untuk halaman saat ini
  const pagedPayments = useMemo(() => {
    const start = (paymentsPage - 1) * PAYMENTS_PER_PAGE;
    return filteredPayments.slice(start, start + PAYMENTS_PER_PAGE);
  }, [filteredPayments, paymentsPage]);

  const pagedMatrix = useMemo(() => {
    if (!summary) return [];
    const start = (matrixPage - 1) * MATRIX_PER_PAGE;
    return summary.byUser.slice(start, start + MATRIX_PER_PAGE);
  }, [summary, matrixPage]);

  const totalApproved = useMemo(() => payments.filter(p => p.status === 'APPROVED').reduce((s, p) => s + p.totalAmount, 0), [payments]);
  const pendingCount = useMemo(() => payments.filter(p => p.status === 'PENDING').length, [payments]);

  // Year options for matrix tab (current year +/- 2)
  const currentYear = new Date().getFullYear();
  const yearOptions: number[] = [];
  for (let y = currentYear + 1; y >= currentYear - 4; y--) yearOptions.push(y);

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">Iuran Warga</h1>
          <p className="text-slate-500 mt-2 font-medium">Kelola besaran iuran, verifikasi pembayaran, dan pantau dana yang masuk.</p>
        </div>
        {/* Stat ringkas */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="px-5 py-3 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-3">
            <TrendingUp size={18} className="text-emerald-600" />
            <div>
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Total Disetujui</p>
              <p className="text-sm font-black text-emerald-900 tabular-nums">{formatRupiah(totalApproved)}</p>
            </div>
          </div>
          {pendingCount > 0 && (
            <div className="px-5 py-3 rounded-2xl bg-amber-50 border border-amber-100 flex items-center gap-3">
              <Clock size={18} className="text-amber-600" />
              <div>
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Menunggu Review</p>
                <p className="text-sm font-black text-amber-900 tabular-nums">{pendingCount} pengajuan</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm w-fit overflow-x-auto">
        {[
          { id: 'PAYMENTS', label: 'Daftar Pembayaran', icon: <ListChecks size={14} /> },
          { id: 'MATRIX', label: 'Tabel Per Bulan', icon: <GridIcon size={14} /> },
          { id: 'CONFIG', label: 'Pengaturan', icon: <Settings size={14} /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all ${tab === t.id ? 'bg-indigo-900 text-white shadow-xl shadow-indigo-900/20' : 'text-slate-400 hover:text-indigo-900 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >

          {/* ============ TAB: CONFIG ============ */}
          {tab === 'CONFIG' && (
            <form onSubmit={handleSaveConfig} className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 p-8 md:p-10 shadow-sm space-y-8 max-w-4xl">
              {/* Nominal */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                  <Wallet size={12} /> Besaran Iuran per Bulan (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={cfgForm.amountPerMonth || ''}
                  onChange={(e) => setCfgForm({ ...cfgForm, amountPerMonth: parseFloat(e.target.value) || 0 })}
                  placeholder="Mis. 50000"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-base font-bold tabular-nums focus:ring-2 focus:ring-indigo-900 transition-all"
                  required
                />
                <p className="text-[10px] text-slate-400 px-1">Nominal otomatis dikalikan dengan jumlah bulan yang dipilih warga.</p>
              </div>

              {/* Rekening Bank */}
              <div className="space-y-5 pt-5 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <CreditCard size={16} className="text-indigo-900" /> Rekening Bank
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nama Bank</label>
                    <input
                      type="text"
                      value={cfgForm.bankName || ''}
                      onChange={(e) => setCfgForm({ ...cfgForm, bankName: e.target.value })}
                      placeholder="Mis. BCA"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-xs font-bold focus:ring-2 focus:ring-indigo-900 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">No. Rekening</label>
                    <input
                      type="text"
                      value={cfgForm.bankAccountNumber || ''}
                      onChange={(e) => setCfgForm({ ...cfgForm, bankAccountNumber: e.target.value })}
                      placeholder="Mis. 1234567890"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-xs font-bold tabular-nums focus:ring-2 focus:ring-indigo-900 transition-all"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Atas Nama</label>
                    <input
                      type="text"
                      value={cfgForm.bankAccountHolder || ''}
                      onChange={(e) => setCfgForm({ ...cfgForm, bankAccountHolder: e.target.value })}
                      placeholder="Nama pemilik rekening"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-xs font-bold focus:ring-2 focus:ring-indigo-900 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* QRIS */}
              <div className="space-y-5 pt-5 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <QrCode size={16} className="text-indigo-900" /> Kode QRIS
                </h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-44 h-44 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                    {cfgForm.qrisImageUrl ? (
                      <img src={getCdnUrl(cfgForm.qrisImageUrl) || cfgForm.qrisImageUrl} alt="QRIS" className="w-full h-full object-contain" />
                    ) : (
                      <QrCode size={36} className="text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <input
                      type="file"
                      id="qrisFileInput"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadQris(f); }}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('qrisFileInput')?.click()}
                      disabled={uploadingQris}
                      className={`w-full h-32 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 ${uploadingQris ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed' : 'border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-900 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}
                    >
                      {uploadingQris ? (
                        <>
                          <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-900 rounded-full animate-spin" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Mengupload...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={20} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Upload Gambar QRIS</span>
                          <span className="text-[10px] font-medium text-slate-400 normal-case tracking-normal">JPG, PNG (Maks. 3MB)</span>
                        </>
                      )}
                    </button>
                    {cfgForm.qrisImageUrl && (
                      <button
                        type="button"
                        onClick={() => setCfgForm({ ...cfgForm, qrisImageUrl: '' })}
                        className="w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-rose-500 hover:bg-rose-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Trash2 size={12} /> Hapus QRIS
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2 pt-5 border-t border-slate-100 dark:border-slate-800">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Catatan / Petunjuk Pembayaran (Opsional)</label>
                <textarea
                  value={cfgForm.notes || ''}
                  onChange={(e) => setCfgForm({ ...cfgForm, notes: e.target.value })}
                  rows={3}
                  placeholder="Mis. Mohon transfer sesuai nominal dan upload bukti pembayaran"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-xs font-bold focus:ring-2 focus:ring-indigo-900 transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={savingConfig}
                className="px-10 py-4 bg-indigo-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-950 transition-all shadow-xl shadow-indigo-900/20 active:scale-95 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {savingConfig ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </form>
          )}

          {/* ============ TAB: PAYMENTS ============ */}
          {tab === 'PAYMENTS' && (
            <div className="space-y-6">
              {/* Filter bar */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama warga..."
                    className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-900 outline-none transition-all"
                  />
                </div>
                <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                  {[
                    { id: 'ALL', label: 'Semua', count: payments.length },
                    { id: 'PENDING', label: 'Menunggu', count: payments.filter(p => p.status === 'PENDING').length },
                    { id: 'APPROVED', label: 'Disetujui', count: payments.filter(p => p.status === 'APPROVED').length },
                    { id: 'REJECTED', label: 'Ditolak', count: payments.filter(p => p.status === 'REJECTED').length },
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => setStatusFilter(s.id as any)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${statusFilter === s.id ? 'bg-indigo-900 text-white' : 'text-slate-500 hover:text-indigo-900'}`}
                    >
                      {s.label} <span className="opacity-60">({s.count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {loading ? (
                  <div className="p-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Memuat...</div>
                ) : filteredPayments.length === 0 ? (
                  <div className="p-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Tidak ada pembayaran</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Warga</th>
                          <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Periode</th>
                          <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                          <th className="text-right px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                          <th className="text-center px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                          <th className="text-right px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {pagedPayments.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 shrink-0 overflow-hidden">
                                  {p.userAvatar ? <img src={getCdnUrl(p.userAvatar) || p.userAvatar} alt="" className="w-full h-full object-cover" /> : p.userName?.[0] || '?'}
                                </div>
                                <span className="text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">{p.userName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                  {p.months.length === 1
                                    ? `${MONTH_NAMES_FULL[p.months[0] - 1]} ${p.year}`
                                    : p.months.length === 12
                                      ? `1 tahun ${p.year}`
                                      : `${MONTH_NAMES_SHORT[p.startMonth - 1]} - ${MONTH_NAMES_SHORT[p.endMonth - 1]} ${p.year}`}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  {p.months.length} bulan × {formatRupiah(p.amountPerMonth)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-500 whitespace-nowrap">{formatDateID(p.createdAt)}</td>
                            <td className="px-6 py-4 text-right text-sm font-black text-slate-900 dark:text-white tabular-nums whitespace-nowrap">{formatRupiah(p.totalAmount)}</td>
                            <td className="px-6 py-4 text-center">
                              <StatusBadge status={p.status} />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 justify-end">
                                <button
                                  onClick={() => setPreviewProof(p.proofUrl)}
                                  title="Lihat bukti"
                                  className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-indigo-900 hover:text-white inline-flex items-center justify-center transition-all"
                                >
                                  <Eye size={14} />
                                </button>
                                {p.status === 'PENDING' && (
                                  <>
                                    <button
                                      onClick={() => handleApprove(p)}
                                      title="Setujui"
                                      className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white inline-flex items-center justify-center transition-all"
                                    >
                                      <Check size={14} />
                                    </button>
                                    <button
                                      onClick={() => { setRejectingId(p.id); setRejectReason(''); }}
                                      title="Tolak"
                                      className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white inline-flex items-center justify-center transition-all"
                                    >
                                      <X size={14} />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => handleDelete(p)}
                                  title="Hapus"
                                  className="h-9 w-9 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-500 inline-flex items-center justify-center transition-all"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <Pagination
                      currentPage={paymentsPage}
                      totalItems={filteredPayments.length}
                      itemsPerPage={PAYMENTS_PER_PAGE}
                      onPageChange={setPaymentsPage}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============ TAB: MATRIX ============ */}
          {tab === 'MATRIX' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-indigo-900" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tahun:</span>
                  <select
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-900 outline-none"
                  >
                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                {summary && (
                  <div className="px-5 py-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Total Disetujui ({year})</p>
                    <p className="text-lg font-black text-emerald-900 tabular-nums">{formatRupiah(summary.totalApproved)}</p>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {!summary ? (
                  <div className="p-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Memuat...</div>
                ) : summary.byUser.length === 0 ? (
                  <div className="p-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Belum ada warga terdaftar</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 sticky top-0">
                        <tr>
                          <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50 dark:bg-slate-800/50 z-10">Nama Warga</th>
                          {MONTH_NAMES_SHORT.map((m, i) => (
                            <th key={i} className="px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{m}</th>
                          ))}
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {pagedMatrix.map(u => (
                          <tr key={u.userId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-3 sticky left-0 bg-white dark:bg-slate-900 z-10 group-hover:bg-slate-50">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-500 shrink-0 overflow-hidden">
                                  {u.userAvatar ? <img src={getCdnUrl(u.userAvatar) || u.userAvatar} alt="" className="w-full h-full object-cover" /> : u.userName?.[0] || '?'}
                                </div>
                                <span className="text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">{u.userName}</span>
                              </div>
                            </td>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                              <td key={m} className="px-2 py-3 text-center">
                                {u.paidMonths.includes(m) ? (
                                  <span className="inline-flex w-6 h-6 rounded-md bg-emerald-100 text-emerald-600 items-center justify-center" title={`Lunas ${MONTH_NAMES_FULL[m - 1]}`}>
                                    <CheckCircle2 size={14} />
                                  </span>
                                ) : (
                                  <span className="inline-block w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800" title={`Belum bayar ${MONTH_NAMES_FULL[m - 1]}`} />
                                )}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-right text-xs font-black text-slate-900 dark:text-white tabular-nums whitespace-nowrap">{formatRupiah(u.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <Pagination
                      currentPage={matrixPage}
                      totalItems={summary.byUser.length}
                      itemsPerPage={MATRIX_PER_PAGE}
                      onPageChange={setMatrixPage}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Lightbox bukti pembayaran */}
      <AnimatePresence>
        {previewProof && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPreviewProof(null)}
          >
            <button onClick={() => setPreviewProof(null)} className="absolute top-5 right-5 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all">
              <X size={20} />
            </button>
            <motion.img
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              src={getCdnUrl(previewProof) || previewProof}
              alt="Bukti pembayaran"
              className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject dialog */}
      <AnimatePresence>
        {rejectingId && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setRejectingId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-2">Tolak Pembayaran</h3>
              <p className="text-sm text-slate-500 mb-6 font-medium">Berikan alasan agar warga bisa memperbaiki pembayarannya.</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="Mis. Bukti tidak jelas / nominal kurang"
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500 transition-all resize-none mb-6 outline-none"
                autoFocus
              />
              <div className="flex gap-3">
                <button onClick={() => setRejectingId(null)} className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">Batal</button>
                <button onClick={() => handleReject(rejectingId)} className="flex-1 py-3.5 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg active:scale-95">Tolak Pembayaran</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ status }: { status: IuranPaymentStatus }) {
  const map: Record<IuranPaymentStatus, { label: string; cls: string; icon: any }> = {
    PENDING: { label: 'Menunggu', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    APPROVED: { label: 'Disetujui', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    REJECTED: { label: 'Ditolak', cls: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
  };
  const m = map[status];
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${m.cls}`}>
      <Icon size={11} />{m.label}
    </span>
  );
}
