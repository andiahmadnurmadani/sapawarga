/**
 * ConfirmDialog — Modal konfirmasi pengganti confirm() browser.
 * Gunakan hook useConfirm() untuk memunculkan dialog dari mana saja.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setPending({ ...opts, resolve });
    });
  }, []);

  const handleResolve = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  const variantStyles = {
    danger:  { icon: <Trash2 size={28} className="text-rose-600" />, bg: 'bg-rose-50 dark:bg-rose-500/10', btn: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' },
    warning: { icon: <AlertTriangle size={28} className="text-amber-600" />, bg: 'bg-amber-50 dark:bg-amber-500/10', btn: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' },
    default: { icon: <AlertTriangle size={28} className="text-indigo-600" />, bg: 'bg-indigo-50 dark:bg-indigo-500/10', btn: 'bg-indigo-900 hover:bg-indigo-950 shadow-indigo-900/20' },
  };

  const v = variantStyles[pending?.variant ?? 'default'];

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {pending && (
          <div className="fixed inset-0 flex items-center justify-center z-[9998] px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => handleResolve(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden z-10"
            >
              {/* Close */}
              <button
                onClick={() => handleResolve(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X size={16} />
              </button>

              <div className="p-8 text-center space-y-5">
                {/* Icon */}
                <div className={`w-16 h-16 ${v.bg} rounded-2xl flex items-center justify-center mx-auto`}>
                  {v.icon}
                </div>

                {/* Text */}
                <div className="space-y-2">
                  {pending.title && (
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {pending.title}
                    </h3>
                  )}
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                    {pending.message}
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleResolve(false)}
                    className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    {pending.cancelLabel ?? 'Batal'}
                  </button>
                  <button
                    onClick={() => handleResolve(true)}
                    className={`flex-1 py-3.5 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 ${v.btn}`}
                  >
                    {pending.confirmLabel ?? 'Ya, Lanjutkan'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
