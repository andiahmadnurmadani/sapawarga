import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ServerOff, RefreshCw, Wifi, AlertTriangle } from 'lucide-react';
import AppLogo from './AppLogo';

interface ApiOfflineScreenProps {
  /** URL API yang gagal terhubung */
  apiUrl?: string;
  /** Pesan error teknis (opsional, ditampilkan kecil di bawah) */
  errorDetail?: string;
  /** Handler retry */
  onRetry: () => void | Promise<void>;
}

/**
 * Halaman error informatif saat backend API tidak bisa dijangkau.
 * Tidak menggunakan gambar fallback — fokus pada informasi dan tindakan.
 */
export default function ApiOfflineScreen({ apiUrl, errorDetail, onRetry }: ApiOfflineScreenProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [autoRetryCountdown, setAutoRetryCountdown] = useState(0);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  // Auto-retry setiap 15 detik dengan countdown
  useEffect(() => {
    setAutoRetryCountdown(15);
    const timer = setInterval(() => {
      setAutoRetryCountdown(prev => {
        if (prev <= 1) {
          handleRetry();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30 px-6 py-12 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl"
      >
        {/* Header dengan logo kecil */}
        <div className="flex items-center justify-center gap-2 mb-12 opacity-60">
          <AppLogo className="w-8 h-8 object-contain" />
          <span className="text-sm font-bold tracking-tight text-slate-500 dark:text-slate-400">
            Hallo <span className="text-indigo-900 dark:text-indigo-400">Warga</span>
          </span>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-900/5 dark:shadow-black/40 p-8 md:p-12 text-center">
          {/* Icon dengan animasi pulse */}
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-20 h-20 mx-auto mb-8 rounded-3xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 relative"
          >
            <ServerOff size={36} strokeWidth={1.5} />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full animate-ping opacity-50" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full" />
          </motion.div>

          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
            Server Tidak Terjangkau
          </h1>
          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8 max-w-md mx-auto">
            Aplikasi tidak dapat terhubung ke server. Layanan administrasi RT sementara tidak bisa diakses.
          </p>

          {/* Status koneksi internet */}
          <div className={`mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border ${
            isOnline
              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20'
              : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/20'
          }`}>
            <Wifi size={12} />
            {isOnline ? 'Internet terhubung' : 'Tidak ada internet'}
          </div>

          {/* Possible reasons */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 md:p-6 mb-8 text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <AlertTriangle size={11} /> Kemungkinan Penyebab
            </p>
            <ul className="space-y-2 text-xs md:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              {!isOnline && (
                <li className="flex gap-2">
                  <span className="text-rose-500 shrink-0">•</span>
                  <span>Perangkat Anda sedang tidak terhubung ke internet.</span>
                </li>
              )}
              <li className="flex gap-2">
                <span className="text-slate-400 shrink-0">•</span>
                <span>Server sedang dalam pemeliharaan atau restart.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-slate-400 shrink-0">•</span>
                <span>Koneksi ke server terputus sementara.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-slate-400 shrink-0">•</span>
                <span>Hubungi administrator RT jika masalah berlanjut.</span>
              </li>
            </ul>
          </div>

          {/* Retry button */}
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-indigo-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-950 transition-all shadow-xl shadow-indigo-900/20 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw size={14} className={isRetrying ? 'animate-spin' : ''} />
            {isRetrying ? 'Mencoba menghubungi server...' : 'Coba Hubungkan Ulang'}
          </button>

          {/* Auto-retry countdown */}
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">
            Mencoba otomatis dalam {autoRetryCountdown}s
          </p>

          {/* Detail teknis (collapsible) */}
          {(apiUrl || errorDetail) && (
            <details className="mt-8 text-left">
              <summary className="text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 transition-colors">
                Detail teknis
              </summary>
              <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-[11px] font-mono text-slate-500 dark:text-slate-400 break-all space-y-1">
                {apiUrl && (
                  <div>
                    <span className="text-slate-400">API URL:</span> {apiUrl}
                  </div>
                )}
                {errorDetail && (
                  <div>
                    <span className="text-slate-400">Error:</span> {errorDetail}
                  </div>
                )}
              </div>
            </details>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest mt-8">
          © 2025 Hallo Warga · RT Digital
        </p>
      </motion.div>
    </div>
  );
}
