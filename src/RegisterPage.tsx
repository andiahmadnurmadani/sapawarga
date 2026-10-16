/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, FormEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserPlus, ChevronLeft, User, IdCard, Home, Phone, Mail, Lock,
  Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft,
} from 'lucide-react';
import { User as UserType } from '../types';
import { authService } from '../lib/authService';

import AppLogo from '../components/AppLogo';

interface RegisterPageProps {
  onBack: () => void;
  onSuccess: (user: UserType) => void;
  onGoToLogin: () => void;
}

const STEPS = [
  { id: 1, label: 'Identitas' },
  { id: 2, label: 'Domisili' },
  { id: 3, label: 'Akun' },
];

export default function RegisterPage({ onBack, onSuccess, onGoToLogin }: RegisterPageProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '', nik: '', noKK: '', noHp: '',
    alamat: '',
    email: '', password: '', confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Clear error saat step berubah
  useEffect(() => {
    setError('');
  }, [step]);

  const update = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const validateStep = (): string => {
    if (step === 1) {
      if (!formData.name.trim()) return 'Nama lengkap wajib diisi.';
      if (!/^\d{16}$/.test(formData.nik)) return 'NIK harus 16 digit angka.';
      if (!/^\d{16}$/.test(formData.noKK)) return 'Nomor KK harus 16 digit angka.';
      if (!formData.noHp.trim()) return 'Nomor handphone wajib diisi.';
    }
    if (step === 2) {
      if (!formData.alamat.trim()) return 'Alamat wajib diisi.';
    }
    if (step === 3) {
      if (!formData.email.trim()) return 'Email wajib diisi.';
      if (!/\S+@\S+\.\S+/.test(formData.email)) return 'Format email tidak valid.';
      if (!formData.password) return 'Password wajib diisi.';
      if (formData.password.length < 6) return 'Password minimal 6 karakter.';
      if (!formData.confirmPassword) return 'Konfirmasi password wajib diisi.';
      if (formData.password !== formData.confirmPassword) return 'Konfirmasi password tidak cocok.';
    }
    return '';
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep(s => s + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(s => s - 1);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validateStep();
    if (err) { setError(err); return; }
    setIsLoading(true);
    setError('');
    try {
      const { user } = await authService.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        nik: formData.nik,
        noKK: formData.noKK,
        alamat: formData.alamat,
        noHp: formData.noHp,
      });
      onSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Pendaftaran gagal. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = (() => {
    const p = formData.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  })();

  const strengthLabel = ['', 'Lemah', 'Cukup', 'Sedang', 'Kuat', 'Sangat Kuat'][passwordStrength];
  const strengthColor = ['', 'bg-rose-400', 'bg-amber-400', 'bg-yellow-400', 'bg-emerald-400', 'bg-emerald-500'][passwordStrength];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[40%] bg-indigo-950 flex-col justify-between p-14 relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-20%] w-[70%] h-[70%] bg-indigo-800/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-900/40 rounded-full blur-[100px]" />

        <div className="relative z-10 flex items-center gap-4">
          <AppLogo className="w-12 h-12 object-contain" />
          <span className="text-white text-xl font-bold tracking-tight">
            Hallo <span className="text-indigo-300">Warga</span>
          </span>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-black text-white leading-tight tracking-tight">
            Bergabung &<br />
            <span className="text-indigo-300">Jadi Warga Digital.</span>
          </h1>
          <p className="text-indigo-200/70 text-base font-medium leading-relaxed max-w-xs">
            Daftarkan diri Anda untuk mengakses layanan administrasi RT secara online.
          </p>

          {/* Step progress visual */}
          <div className="pt-6 space-y-4">
            {STEPS.map(s => (
              <div key={s.id} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  step > s.id
                    ? 'bg-emerald-500 text-white'
                    : step === s.id
                    ? 'bg-white text-indigo-900'
                    : 'bg-indigo-800/50 text-indigo-400'
                }`}>
                  {step > s.id ? <CheckCircle2 size={16} /> : s.id}
                </div>
                <span className={`text-sm font-bold transition-all ${
                  step === s.id ? 'text-white' : step > s.id ? 'text-emerald-400' : 'text-indigo-400/60'
                }`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-indigo-300/40 text-xs font-bold uppercase tracking-widest">
          © 2025 Hallo Warga · RT Digital
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative overflow-y-auto">
        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-8 left-8 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-indigo-900 transition-colors"
        >
          <ChevronLeft size={14} />
          Beranda
        </button>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <AppLogo className="w-10 h-10 object-contain" />
          <span className="text-slate-900 text-xl font-bold">
            Hallo <span className="text-indigo-900">Warga</span>
          </span>
        </div>

        {/* Mobile step bar */}
        <div className="lg:hidden flex items-center gap-2 mb-8 w-full max-w-md">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  step > s.id ? 'bg-emerald-500 text-white' : step === s.id ? 'bg-indigo-900 text-white' : 'bg-slate-200 text-slate-400'
                }`}>
                  {step > s.id ? <CheckCircle2 size={13} /> : s.id}
                </div>
                <span className={`text-xs font-bold hidden sm:block ${step === s.id ? 'text-slate-900' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 rounded-full transition-all ${step > s.id ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Heading */}
          <div className="mb-8">
            <p className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-1">
              Langkah {step} dari {STEPS.length}
            </p>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {step === 1 && 'Data Identitas'}
              {step === 2 && 'Alamat Domisili'}
              {step === 3 && 'Buat Akun'}
            </h2>
            <p className="text-slate-500 text-sm font-medium mt-1">
              {step === 1 && 'Isi data sesuai KTP dan Kartu Keluarga.'}
              {step === 2 && 'Masukkan alamat lengkap di lingkungan RT.'}
              {step === 3 && 'Buat email dan password untuk login.'}
            </p>
          </div>

          {/* Error */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center gap-3 p-4 mb-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600 text-sm font-semibold"
              >
                <AlertCircle size={18} className="shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {/* Step 1 — Identitas */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <InputField
                    label="Nama Lengkap"
                    icon={<User size={17} />}
                    placeholder="Sesuai KTP"
                    value={formData.name}
                    onChange={v => update('name', v)}
                    required
                  />
                  <InputField
                    label="NIK"
                    icon={<IdCard size={17} />}
                    placeholder="16 digit angka"
                    value={formData.nik}
                    onChange={v => update('nik', v.replace(/\D/g, '').slice(0, 16))}
                    maxLength={16}
                    hint={formData.nik ? `${formData.nik.length}/16 digit` : undefined}
                    required
                  />
                  <InputField
                    label="Nomor KK"
                    icon={<IdCard size={17} />}
                    placeholder="16 digit angka"
                    value={formData.noKK}
                    onChange={v => update('noKK', v.replace(/\D/g, '').slice(0, 16))}
                    maxLength={16}
                    hint={formData.noKK ? `${formData.noKK.length}/16 digit` : undefined}
                    required
                  />
                  <InputField
                    label="Nomor Handphone"
                    icon={<Phone size={17} />}
                    placeholder="0812xxxxxxxx"
                    value={formData.noHp}
                    onChange={v => update('noHp', v)}
                    required
                  />
                </motion.div>
              )}

              {/* Step 2 — Domisili */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 ml-1">Alamat Lengkap di RT</label>
                    <div className="relative group">
                      <Home
                        size={17}
                        className="absolute left-4 top-4 text-slate-300 group-focus-within:text-indigo-900 transition-colors"
                      />
                      <textarea
                        value={formData.alamat}
                        onChange={e => update('alamat', e.target.value)}
                        placeholder="Jl. Mawar No. 12, RT 001/RW 01"
                        rows={4}
                        required
                        className="w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-900/20 focus:border-indigo-900 transition-all text-sm font-semibold text-slate-800 placeholder:text-slate-300 shadow-sm resize-none"
                      />
                    </div>
                  </div>

                  {/* Info box */}
                  <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                    <CheckCircle2 size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-indigo-700 leading-relaxed">
                      Pastikan alamat sesuai dengan domisili di lingkungan RT agar pengajuan surat dapat diproses dengan benar.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Step 3 — Akun */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <InputField
                    label="Email"
                    icon={<Mail size={17} />}
                    type="email"
                    placeholder="warga@email.com"
                    value={formData.email}
                    onChange={v => update('email', v)}
                    required
                  />

                  {/* Password */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 ml-1">Password</label>
                    <div className="relative group">
                      <Lock
                        size={17}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-900 transition-colors"
                      />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={e => update('password', e.target.value)}
                        placeholder="Min. 6 karakter"
                        required
                        className="w-full pl-11 pr-12 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-900/20 focus:border-indigo-900 transition-all text-sm font-semibold text-slate-800 placeholder:text-slate-300 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    {/* Strength bar */}
                    {formData.password && (
                      <div className="space-y-1.5 px-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div
                              key={i}
                              className={`flex-1 h-1 rounded-full transition-all ${i <= passwordStrength ? strengthColor : 'bg-slate-100'}`}
                            />
                          ))}
                        </div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${
                          passwordStrength <= 1 ? 'text-rose-400' :
                          passwordStrength <= 2 ? 'text-amber-400' :
                          passwordStrength <= 3 ? 'text-yellow-500' : 'text-emerald-500'
                        }`}>
                          Kekuatan: {strengthLabel}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 ml-1">Konfirmasi Password</label>
                    <div className="relative group">
                      <Lock
                        size={17}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-900 transition-colors"
                      />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={e => update('confirmPassword', e.target.value)}
                        placeholder="Ulangi password"
                        required
                        className={`w-full pl-11 pr-12 py-4 bg-white border rounded-2xl focus:outline-none focus:ring-2 transition-all text-sm font-semibold text-slate-800 placeholder:text-slate-300 shadow-sm ${
                          formData.confirmPassword && formData.password !== formData.confirmPassword
                            ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-400'
                            : formData.confirmPassword && formData.password === formData.confirmPassword
                            ? 'border-emerald-300 focus:ring-emerald-200 focus:border-emerald-400'
                            : 'border-slate-200 focus:ring-indigo-900/20 focus:border-indigo-900'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(v => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                      {formData.confirmPassword && formData.password === formData.confirmPassword && (
                        <CheckCircle2 size={16} className="absolute right-11 top-1/2 -translate-y-1/2 text-emerald-500" />
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation buttons */}
            <div className={`flex gap-3 mt-8 ${step > 1 ? 'justify-between' : 'justify-end'}`}>
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-2 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all active:scale-[0.98]"
                >
                  <ArrowLeft size={16} />
                  Kembali
                </button>
              )}

              {step < STEPS.length ? (
                <button
                  key="btn-next"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNext();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-indigo-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-800 transition-all shadow-lg shadow-indigo-900/20 active:scale-[0.98]"
                >
                  Lanjut
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  key="btn-submit"
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-indigo-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-800 transition-all shadow-lg shadow-indigo-900/20 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      Daftar Sekarang
                    </>
                  )}
                </button>
              )}
            </div>
          </form>

          {/* Login link */}
          <p className="text-center text-sm text-slate-500 font-medium mt-8">
            Sudah punya akun?{' '}
            <button
              onClick={onGoToLogin}
              className="text-indigo-900 font-black hover:underline"
            >
              Masuk di sini
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function InputField({
  label, icon, placeholder, type = 'text', value, onChange, required, maxLength, hint,
}: {
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  maxLength?: number;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between ml-1">
        <label className="text-xs font-bold text-slate-600">{label}</label>
        {hint && <span className="text-[10px] font-bold text-slate-400">{hint}</span>}
      </div>
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-900 transition-colors">
          {icon}
        </div>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          maxLength={maxLength}
          className="w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-900/20 focus:border-indigo-900 transition-all text-sm font-semibold text-slate-800 placeholder:text-slate-300 shadow-sm"
        />
      </div>
    </div>
  );
}
