/**
 * Iuran Warga Module — ajukan pembayaran, lihat history
 */
import { useState, useEffect, useMemo, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wallet, CreditCard, QrCode, CheckCircle2, Clock, XCircle, Calendar,
  Upload, FileText, X, Plus, History, Info, Copy, Check, ChevronDown,
} from 'lucide-react';
import { iuranApi } from '../lib/api';
import { IuranConfig, IuranPayment, IuranPeriodType, IuranPaymentStatus } from '../types';
import { processImageUpload } from '../lib/imageUtils';
import { getCdnUrl } from '../lib/cdnUtils';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmDialog';

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

export default function IuranWarga() {
  const toast = useToast();
  const confirm = useConfirm();

  const [tab, setTab] = useState<'PAY' | 'HISTORY'>('PAY');
  const [config, setConfig] = useState<IuranConfig | null>(null);
  const [payments, setPayments] = useState<IuranPayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [periodType, setPeriodType] = useState<IuranPeriodType>('MONTH');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [singleMonth, setSingleMonth] = useState<number>(new Date().getMonth() + 1);
  const [startMonth, setStartMonth] = useState<number>(1);
  const [endMonth, setEndMonth] = useState<number>(12);
  const [proofUrl, setProofUrl] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [previewProof, setPreviewProof] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const [cfg, pays] = await Promise.all([
        iuranApi.getConfig(),
        iuranApi.listPayments(),
      ]);
      setConfig(cfg);
      setPayments(pays);
    } catch (err: any) {
      toast.error('Gagal memuat data', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  // Bulan yang sudah locked (sudah ada PENDING/APPROVED untuk tahun ini)
  const lockedMonths = useMemo(() => {
    const set = new Set<number>();
    payments.forEach(p => {
      if (p.year === year && (p.status === 'PENDING' || p.status === 'APPROVED')) {
        p.months.forEach(m => set.add(m));
      }
    });
    return set;
  }, [payments, year]);

  // Hitung bulan yang akan dibayar — auto-skip bulan yang sudah lunas
  const { selectedMonths, totalPreview, requestedMonths, skippedMonths } = useMemo(() => {
    const amount = config?.amountPerMonth || 0;
    let requested: number[] = [];
    if (periodType === 'YEAR') {
      requested = Array.from({ length: 12 }, (_, i) => i + 1);
    } else if (periodType === 'PERIOD') {
      const lo = Math.min(startMonth, endMonth);
      const hi = Math.max(startMonth, endMonth);
      for (let m = lo; m <= hi; m++) requested.push(m);
    } else {
      requested = [singleMonth];
    }
    // Untuk MONTH: tidak skip (user pilih manual). Untuk YEAR/PERIOD: skip yang locked.
    const months = periodType === 'MONTH'
      ? requested
      : requested.filter(m => !lockedMonths.has(m));
    const skipped = requested.filter(m => lockedMonths.has(m));
    return {
      selectedMonths: months,
      requestedMonths: requested,
      skippedMonths: skipped,
      totalPreview: months.length * amount,
    };
  }, [periodType, year, singleMonth, startMonth, endMonth, config, lockedMonths]);

  // Conflict hanya untuk MONTH mode (karena YEAR/PERIOD sudah auto-skip)
  const conflictMonths = useMemo(
    () => periodType === 'MONTH' ? selectedMonths.filter(m => lockedMonths.has(m)) : [],
    [selectedMonths, lockedMonths, periodType]
  );

  const handleUploadProof = async (file: File) => {
    setUploading(true);
    try {
      const fileId = await processImageUpload(file, 3);
      setProofUrl(fileId);
      toast.success('Bukti pembayaran berhasil diupload');
    } catch (err: any) {
      toast.error('Gagal upload bukti', err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!proofUrl) {
      toast.warning('Bukti wajib', 'Upload bukti pembayaran terlebih dahulu');
      return;
    }
    if (selectedMonths.length === 0) {
      toast.warning('Tidak ada bulan untuk dibayar', `Semua bulan untuk tahun ${year} sudah pernah diajukan/disetujui`);
      return;
    }
    if (conflictMonths.length > 0) {
      toast.warning('Bulan sudah pernah diajukan', `Bulan ${conflictMonths.map(m => MONTH_NAMES_SHORT[m - 1]).join(', ')} sudah pernah diajukan/disetujui untuk tahun ${year}`);
      return;
    }
    if (!config?.amountPerMonth || config.amountPerMonth <= 0) {
      toast.error('Iuran belum tersedia', 'Admin belum mengatur nominal iuran');
      return;
    }

    const ok = await confirm({
      title: 'Konfirmasi Pembayaran',
      message: `Ajukan pembayaran ${formatRupiah(totalPreview)} untuk ${selectedMonths.length} bulan?`,
      confirmLabel: 'Kirim Pengajuan',
      variant: 'default',
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      const sm = selectedMonths[0];
      const em = selectedMonths[selectedMonths.length - 1];
      await iuranApi.createPayment({
        periodType, year,
        startMonth: sm, endMonth: em,
        months: selectedMonths,
        proofUrl, notes: notes.trim() || undefined,
      });
      toast.success('Pembayaran berhasil diajukan!', 'Tunggu admin untuk memverifikasi');
      // Reset form
      setProofUrl('');
      setNotes('');
      setSingleMonth(new Date().getMonth() + 1);
      setStartMonth(1);
      setEndMonth(12);
      reload();
      setTab('HISTORY');
    } catch (err: any) {
      toast.error('Gagal mengajukan', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (p: IuranPayment) => {
    const ok = await confirm({ title: 'Batalkan Pembayaran', message: 'Yakin batalkan pembayaran ini?', confirmLabel: 'Ya, Batalkan', variant: 'danger' });
    if (!ok) return;
    try {
      await iuranApi.removePayment(p.id);
      setPayments(prev => prev.filter(x => x.id !== p.id));
      toast.success('Pembayaran dibatalkan');
    } catch (err: any) {
      toast.error('Gagal membatalkan', err.message);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      toast.success('Disalin ke clipboard');
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const currentYear = new Date().getFullYear();
  const yearOptions: number[] = [];
  for (let y = currentYear + 1; y >= currentYear - 2; y--) yearOptions.push(y);

  const totalPaid = payments.filter(p => p.status === 'APPROVED').reduce((s, p) => s + p.totalAmount, 0);
  const pendingCount = payments.filter(p => p.status === 'PENDING').length;

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">Iuran Warga</h1>
          <p className="text-slate-500 mt-2 font-medium">Ajukan pembayaran iuran bulanan dan pantau riwayat pembayaran Anda.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="px-5 py-3 rounded-2xl bg-emerald-50 border border-emerald-100">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Total Terbayar</p>
            <p className="text-sm font-black text-emerald-900 tabular-nums">{formatRupiah(totalPaid)}</p>
          </div>
          {pendingCount > 0 && (
            <div className="px-5 py-3 rounded-2xl bg-amber-50 border border-amber-100">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Menunggu Verifikasi</p>
              <p className="text-sm font-black text-amber-900 tabular-nums">{pendingCount} pengajuan</p>
            </div>
          )}
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm w-fit">
        {[
          { id: 'PAY', label: 'Bayar Iuran', icon: <Plus size={14} /> },
          { id: 'HISTORY', label: 'Riwayat Saya', icon: <History size={14} /> },
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

          {/* ============ TAB: PAY ============ */}
          {tab === 'PAY' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form pengajuan */}
              <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Form Pembayaran</h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">Pilih periode pembayaran lalu upload bukti transfer atau QRIS.</p>
                </div>

                {/* Tahun */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tahun Iuran</label>
                  <div className="relative">
                    <select
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value))}
                      className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-6 pr-12 py-4 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-900 outline-none transition-all cursor-pointer"
                    >
                      {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                  </div>
                </div>

                {/* Tipe periode */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tipe Pembayaran</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'MONTH', label: '1 Bulan' },
                      { id: 'PERIOD', label: 'Periode' },
                      { id: 'YEAR', label: '1 Tahun' },
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setPeriodType(t.id as IuranPeriodType)}
                        className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${periodType === t.id ? 'bg-indigo-900 text-white shadow-lg shadow-indigo-900/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pemilihan bulan */}
                {periodType === 'MONTH' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Pilih Bulan</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {MONTH_NAMES_SHORT.map((name, i) => {
                        const m = i + 1;
                        const locked = lockedMonths.has(m);
                        const active = singleMonth === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            disabled={locked}
                            onClick={() => setSingleMonth(m)}
                            className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                              active
                                ? 'bg-indigo-900 text-white shadow-lg shadow-indigo-900/20'
                                : locked
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 cursor-not-allowed line-through opacity-60'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'
                            }`}
                            title={locked ? 'Sudah pernah diajukan / dibayar' : ''}
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {periodType === 'PERIOD' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Dari Bulan</label>
                      <div className="relative">
                        <select
                          value={startMonth}
                          onChange={(e) => setStartMonth(parseInt(e.target.value))}
                          className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-5 pr-11 py-4 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-900 outline-none transition-all cursor-pointer"
                        >
                          {MONTH_NAMES_FULL.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Sampai Bulan</label>
                      <div className="relative">
                        <select
                          value={endMonth}
                          onChange={(e) => setEndMonth(parseInt(e.target.value))}
                          className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-5 pr-11 py-4 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-900 outline-none transition-all cursor-pointer"
                        >
                          {MONTH_NAMES_FULL.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                      </div>
                    </div>
                  </div>
                )}

                {periodType === 'YEAR' && (
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3 text-xs font-bold text-indigo-900">
                    <Info size={16} /> Akan membayar {selectedMonths.length === 12 ? '12 bulan (Januari - Desember' : `${selectedMonths.length} bulan tersisa di tahun`} {year}
                  </div>
                )}

                {/* Info: ada bulan yang otomatis di-skip karena sudah lunas */}
                {(periodType === 'YEAR' || periodType === 'PERIOD') && skippedMonths.length > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-xs font-bold text-amber-800">
                    <p className="flex items-center gap-2 mb-1"><Info size={14} /> Bulan berikut sudah lunas dan akan otomatis dilewati:</p>
                    <p className="text-[10px] uppercase tracking-widest text-amber-700 ml-6">{skippedMonths.map(m => MONTH_NAMES_SHORT[m - 1]).join(', ')}</p>
                  </div>
                )}

                {/* Konflik bulan — hanya untuk MONTH */}
                {periodType === 'MONTH' && conflictMonths.length > 0 && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-bold text-rose-700">
                    <p className="mb-1">Bulan ini sudah pernah diajukan/disetujui:</p>
                    <p className="text-[10px] uppercase tracking-widest">{conflictMonths.map(m => MONTH_NAMES_SHORT[m - 1]).join(', ')}</p>
                  </div>
                )}

                {/* Tidak ada bulan yg bisa dibayar */}
                {(periodType === 'YEAR' || periodType === 'PERIOD') && selectedMonths.length === 0 && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-bold text-rose-700">
                    Semua bulan dalam periode ini sudah lunas. Pilih periode/tahun lain.
                  </div>
                )}

                {/* Total preview */}
                <div className="p-5 bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-2xl text-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Total Pembayaran</span>
                    <Wallet size={16} className="text-indigo-300" />
                  </div>
                  <p className="text-3xl font-black tabular-nums">{formatRupiah(totalPreview)}</p>
                  <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mt-2">
                    {selectedMonths.length} bulan × {formatRupiah(config?.amountPerMonth || 0)}
                  </p>
                  {selectedMonths.length > 0 && selectedMonths.length < 12 && (
                    <p className="text-[10px] font-medium text-indigo-200 mt-2 leading-relaxed">
                      Bulan: {selectedMonths.map(m => MONTH_NAMES_SHORT[m - 1]).join(', ')}
                    </p>
                  )}
                </div>

                {/* Upload bukti */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Bukti Pembayaran</label>
                  <input
                    type="file"
                    id="iuranProofInput"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadProof(f); }}
                  />
                  {proofUrl ? (
                    <div className="relative group">
                      <button
                        type="button"
                        onClick={() => setPreviewProof(proofUrl)}
                        className="w-full aspect-[16/9] bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden border-2 border-emerald-200 hover:border-emerald-400 transition-all"
                      >
                        <img src={getCdnUrl(proofUrl) || proofUrl} alt="Bukti" className="w-full h-full object-contain" />
                      </button>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1.5"><CheckCircle2 size={12} /> Bukti terupload — klik untuk preview</span>
                        <button
                          type="button"
                          onClick={() => { setProofUrl(''); }}
                          className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                        >
                          Ganti
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => document.getElementById('iuranProofInput')?.click()}
                      disabled={uploading}
                      className={`w-full aspect-[16/9] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 ${uploading ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed' : 'border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-900 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}
                    >
                      {uploading ? (
                        <>
                          <div className="w-6 h-6 border-2 border-slate-300 border-t-indigo-900 rounded-full animate-spin" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Mengupload...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={28} />
                          <span className="text-xs font-black uppercase tracking-widest">Upload Bukti Pembayaran</span>
                          <span className="text-[10px] font-medium text-slate-400 normal-case tracking-normal">JPG, PNG (Maks. 3MB)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Catatan (Opsional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                    maxLength={200}
                    rows={2}
                    placeholder="Tambahan info pembayaran (jika ada)"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-xs font-bold focus:ring-2 focus:ring-indigo-900 transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || uploading || !proofUrl || selectedMonths.length === 0 || conflictMonths.length > 0 || !config?.amountPerMonth}
                  className="w-full py-4 bg-indigo-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-950 transition-all shadow-xl shadow-indigo-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {submitting ? 'Mengirim...' : `Ajukan Pembayaran ${formatRupiah(totalPreview)}`}
                </button>
              </form>

              {/* Sidebar info pembayaran */}
              <div className="space-y-4">
                {/* Nominal info */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Iuran per Bulan</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                    {formatRupiah(config?.amountPerMonth || 0)}
                  </p>
                  {!config?.amountPerMonth && (
                    <p className="text-[10px] font-bold text-rose-500 mt-2 uppercase tracking-widest">Admin belum mengatur nominal</p>
                  )}
                </div>

                {/* Bank */}
                {(config?.bankName || config?.bankAccountNumber) && (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><CreditCard size={11} /> Transfer Bank</p>
                    <div>
                      <p className="text-xs font-bold text-slate-500">Bank</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white">{config?.bankName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500">No. Rekening</p>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(config?.bankAccountNumber || '', 'rek')}
                        className="text-sm font-black text-slate-900 dark:text-white tabular-nums hover:text-indigo-900 transition-colors flex items-center gap-2"
                      >
                        {config?.bankAccountNumber}
                        {copied === 'rek' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-slate-400" />}
                      </button>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500">Atas Nama</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white">{config?.bankAccountHolder}</p>
                    </div>
                  </div>
                )}

                {/* QRIS */}
                {config?.qrisImageUrl && (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3"><QrCode size={11} /> Scan QRIS</p>
                    <button
                      type="button"
                      onClick={() => setPreviewProof(config.qrisImageUrl!)}
                      className="block w-full bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-indigo-300 transition-all"
                    >
                      <img src={getCdnUrl(config.qrisImageUrl) || config.qrisImageUrl} alt="QRIS" className="w-full h-auto object-contain" />
                    </button>
                  </div>
                )}

                {/* Catatan admin */}
                {config?.notes && (
                  <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 text-xs font-bold text-amber-900 leading-relaxed">
                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Info size={11} /> Catatan</p>
                    <p className="whitespace-pre-line">{config.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============ TAB: HISTORY ============ */}
          {tab === 'HISTORY' && (
            <div className="space-y-4">
              {loading ? (
                <div className="p-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Memuat...</div>
              ) : payments.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-16 text-center">
                  <FileText size={40} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Belum ada riwayat pembayaran</p>
                  <button
                    onClick={() => setTab('PAY')}
                    className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-indigo-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-950 transition-all"
                  >
                    <Plus size={13} /> Bayar Iuran Pertama
                  </button>
                </div>
              ) : (
                payments.map(p => (
                  <div key={p.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => setPreviewProof(p.proofUrl)}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 hover:ring-2 hover:ring-indigo-300 transition-all"
                        >
                          <img src={getCdnUrl(p.proofUrl) || p.proofUrl} alt="Bukti" className="w-full h-full object-cover" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <StatusBadge status={p.status} />
                          </div>
                          <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{formatRupiah(p.totalAmount)}</p>
                          <p className="text-[11px] font-bold text-slate-500 mt-1">
                            {p.months.length === 1
                              ? `${MONTH_NAMES_FULL[p.months[0] - 1]} ${p.year}`
                              : p.months.length === 12
                                ? `1 tahun (${p.year})`
                                : `${MONTH_NAMES_SHORT[p.startMonth - 1]} - ${MONTH_NAMES_SHORT[p.endMonth - 1]} ${p.year}`}
                            {' · '}{p.months.length} bulan × {formatRupiah(p.amountPerMonth)}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{formatDateID(p.createdAt)}</p>
                          {p.status === 'REJECTED' && p.rejectionReason && (
                            <p className="text-xs font-bold text-rose-600 mt-2 p-3 bg-rose-50 rounded-xl">
                              <span className="text-[10px] uppercase tracking-widest text-rose-500">Alasan ditolak: </span>
                              {p.rejectionReason}
                            </p>
                          )}
                        </div>
                      </div>
                      {p.status === 'PENDING' && (
                        <button
                          onClick={() => handleCancel(p)}
                          className="self-start md:self-auto px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 hover:bg-rose-100 transition-colors"
                        >
                          Batalkan
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Preview lightbox */}
      <AnimatePresence>
        {previewProof && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPreviewProof(null)}
          >
            <button onClick={() => setPreviewProof(null)} className="absolute top-5 right-5 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all z-10">
              <X size={20} />
            </button>
            <motion.img
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              src={getCdnUrl(previewProof) || previewProof}
              alt="Preview"
              className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
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
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${m.cls}`}>
      <Icon size={11} />{m.label}
    </span>
  );
}
