/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, LogIn, ChevronLeft, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { User } from '../types';
import { authService } from '../lib/authService';

interface LoginPageProps {
  onBack: () => void;
  onSuccess: (user: User) => void;
  onGoToRegister: () => void;
  onForgotPassword: () => void;
}

import AppLogo from '../components/AppLogo';

export default function LoginPage({ onBack, onSuccess, onGoToRegister, onForgotPassword }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const { user } = await authService.login(email, password);
      onSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Email atau password salah. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-indigo-950 flex-col justify-between p-14 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-[-20%] right-[-20%] w-[70%] h-[70%] bg-indigo-800/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-900/40 rounded-full blur-[100px]" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-4">
          <AppLogo className="w-12 h-12 object-contain" />
          <span className="text-white text-xl font-bold tracking-tight">
            Hallo <span className="text-indigo-300">Warga</span>
          </span>
        </div>

        {/* Center copy */}
        <div className="relative z-10 space-y-6">
          <h1 className="text-5xl font-black text-white leading-tight tracking-tight">
            Administrasi RT<br />
            <span className="text-indigo-300">Lebih Mudah.</span>
          </h1>
          <p className="text-indigo-200/70 text-lg font-medium leading-relaxed max-w-sm">
            Ajukan surat, pantau status, dan ikuti kabar RT — semua dari satu portal digital.
          </p>

          {/* Feature list */}
          <ul className="space-y-3 pt-4">
            {[
              'Pengajuan surat online 24 jam',
              'Notifikasi status real-time',
              'Kabar & pengumuman RT terkini',
            ].map(f => (
              <li key={f} className="flex items-center gap-3 text-indigo-100/80 text-sm font-medium">
                <CheckCircle2 size={16} className="text-indigo-400 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom note */}
        <p className="relative z-10 text-indigo-300/40 text-xs font-bold uppercase tracking-widest">
          © 2025 Hallo Warga · RT Digital
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative">
        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-8 left-8 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-indigo-900 transition-colors"
        >
          <ChevronLeft size={14} />
          Beranda
        </button>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <AppLogo className="w-10 h-10 object-contain" />
          <span className="text-slate-900 text-xl font-bold">
            Hallo <span className="text-indigo-900">Warga</span>
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Heading */}
          <div className="mb-10">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Selamat Datang</h2>
            <p className="text-slate-500 font-medium">Masuk ke portal warga Anda.</p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 mb-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600 text-sm font-semibold"
            >
              <AlertCircle size={18} className="shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 ml-1">Email</label>
              <div className="relative group">
                <Mail
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-900 transition-colors"
                />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                  placeholder="email@example.com"
                  className="w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-900/20 focus:border-indigo-900 transition-all text-sm font-semibold text-slate-800 placeholder:text-slate-300 shadow-sm"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-xs font-bold text-slate-600">Password</label>
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-xs font-bold text-indigo-900 hover:underline"
                >
                  Lupa password?
                </button>
              </div>
              <div className="relative group">
                <Lock
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-900 transition-colors"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-900/20 focus:border-indigo-900 transition-all text-sm font-semibold text-slate-800 placeholder:text-slate-300 shadow-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-indigo-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-800 transition-all shadow-lg shadow-indigo-900/20 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memuat...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Masuk Akun
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">atau</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-slate-500 font-medium">
            Belum punya akun?{' '}
            <button
              onClick={onGoToRegister}
              className="text-indigo-900 font-black hover:underline"
            >
              Daftar sekarang
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
