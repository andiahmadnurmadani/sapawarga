/**
 * Toast — Sistem notifikasi ringan tanpa library eksternal.
 * Gunakan hook useToast() untuk memunculkan toast dari mana saja.
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (opts: Omit<ToastItem, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />,
  error:   <XCircle     size={18} className="text-rose-500 shrink-0" />,
  warning: <AlertTriangle size={18} className="text-amber-500 shrink-0" />,
  info:    <Info        size={18} className="text-blue-500 shrink-0" />,
};

const STYLES: Record<ToastType, string> = {
  success: 'border-emerald-100 dark:border-emerald-900/30',
  error:   'border-rose-100 dark:border-rose-900/30',
  warning: 'border-amber-100 dark:border-amber-900/30',
  info:    'border-blue-100 dark:border-blue-900/30',
};

const BAR_STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-500',
  error:   'bg-rose-500',
  warning: 'bg-amber-500',
  info:    'bg-blue-500',
};

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const duration = item.duration ?? 4000;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl border overflow-hidden ${STYLES[item.type]}`}
    >
      {/* Progress bar */}
      <motion.div
        className={`absolute bottom-0 left-0 h-0.5 ${BAR_STYLES[item.type]}`}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        onAnimationComplete={() => onDismiss(item.id)}
      />

      <div className="flex items-start gap-3 p-4 pr-10">
        <div className="mt-0.5">{ICONS[item.type]}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{item.title}</p>
          {item.message && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-relaxed">{item.message}</p>
          )}
        </div>
      </div>

      <button
        onClick={() => onDismiss(item.id)}
        className="absolute top-3 right-3 w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
      >
        <X size={13} />
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((opts: Omit<ToastItem, 'id'>) => {
    const id = `toast-${++counterRef.current}`;
    setToasts(prev => [{ ...opts, id }, ...prev].slice(0, 5)); // max 5 toasts
  }, []);

  const success = useCallback((title: string, message?: string) =>
    toast({ type: 'success', title, message }), [toast]);
  const error = useCallback((title: string, message?: string) =>
    toast({ type: 'error', title, message, duration: 6000 }), [toast]);
  const warning = useCallback((title: string, message?: string) =>
    toast({ type: 'warning', title, message }), [toast]);
  const info = useCallback((title: string, message?: string) =>
    toast({ type: 'info', title, message }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      {/* Toast container — top-right */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
              <ToastCard item={t} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
