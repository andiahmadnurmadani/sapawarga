/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Key, ChevronLeft, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, Lock, Home, Pen } from 'lucide-react';
import { storage } from '../utils';
import AppLogo from '../components/AppLogo';

interface ForgotPasswordPageProps {
  onBack: () => void;
  onGoToLogin: () => void;
}

type Step = 'EMAIL' | 'OTP' | 'RESET';

export default function ForgotPasswordPage({ onBack, onGoToLogin }: ForgotPasswordPageProps) {
  const [step, setStep] = useState<Step>('EMAIL');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate finding user
    const users = storage.getUsers();
    const user = users.find(u => u.email === email);

    if (!user && email !== 'admin@desa.id') {
      setError('Email tidak terdaftar. Pastikan email sudah benar.');
      setIsLoading(false);
      return;
    }

    // Simulate sending OTP
    setTimeout(() => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setStep('OTP');
      setIsLoading(false);
      // For demo purposes, we usually wouldn't show the code in the UI like this 
      // but the user requested "munculkan otp ke email", so we simulate it with a notification
      alert(`DEMO: Kode OTP anda adalah ${code}`);
    }, 1500);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp === generatedOtp) {
      setStep('RESET');
      setError('');
    } else {
      setError('Kode OTP salah. Silakan periksa kembali.');
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Konformasi password tidak sesuai.');
      return;
    }

    setIsLoading(true);
    
    // Actually update the user in storage
    const users = storage.getUsers();
    const updatedUsers = users.map(u => {
      if (u.email === email) {
        return { ...u, password: newPassword };
      }
      return u;
    });

    storage.setUsers(updatedUsers);
    
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMessage('Password berhasil diperbarui. Silakan masuk kembali.');
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-950/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[40px] p-10 md:p-12 shadow-2xl relative z-10 border border-white/20"
      >
        {!successMessage && (
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-indigo-900 mb-10 transition-colors"
          >
            <ChevronLeft size={14} />
            Kembali
          </button>
        )}

        <div className="mb-12">
          <div className="flex items-center gap-4 mb-10">
            <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
              <AppLogo className="w-full h-full object-contain" />
            </div>
            <span className="text-3xl font-bold tracking-tight text-slate-900 border-l-4 border-slate-100 pl-4">Hallo <span className="text-indigo-900 font-black">Warga</span></span>
          </div>
          
          {successMessage ? (
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Berhasil!</h2>
              <p className="text-slate-500 font-bold mb-8">{successMessage}</p>
              <button 
                onClick={onGoToLogin}
                className="w-full py-5 bg-indigo-900 text-white rounded-[24px] font-black text-lg flex items-center justify-center gap-3 hover:bg-indigo-950 transition-all"
              >
                Masuk Sekarang
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">
                {step === 'EMAIL' && 'Lupa Password?'}
                {step === 'OTP' && 'Verifikasi Email'}
                {step === 'RESET' && 'Setel Ulang'}
              </h2>
              <p className="text-slate-500 font-bold">
                {step === 'EMAIL' && 'Masukkan email anda untuk menerima kode OTP.'}
                {step === 'OTP' && `Kami telah mengirimkan kode OTP ke ${email}.`}
                {step === 'RESET' && 'Buat password baru yang kuat untuk akun anda.'}
              </p>
            </>
          )}
        </div>

        {!successMessage && (
          <>
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-4 mb-8 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-bold"
              >
                <AlertCircle size={18} />
                <span>{error}</span>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {step === 'EMAIL' && (
                <motion.form 
                  key="email-step"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleRequestOtp} 
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email Terdaftar</label>
                    <div className="relative group">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-900 transition-colors" size={20} />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl focus:outline-none focus:ring-4 focus:ring-indigo-900/10 focus:border-indigo-900 focus:bg-white transition-all font-bold text-slate-800 placeholder:text-slate-300"
                        required
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full py-5 bg-indigo-900 text-white rounded-[24px] font-black text-lg flex items-center justify-center gap-3 hover:bg-indigo-950 transition-all disabled:opacity-50 active:scale-[0.98]"
                  >
                    {isLoading ? 'Sedang Memproses...' : 'Kirim Kode OTP'}
                    {!isLoading && <ArrowRight size={20} />}
                  </button>
                </motion.form>
              )}

              {step === 'OTP' && (
                <motion.form 
                  key="otp-step"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleVerifyOtp} 
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Kode Verifikasi (OTP)</label>
                    <div className="relative group">
                      <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-900 transition-colors" size={20} />
                      <input 
                        type="text" 
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="6 Digit Kode"
                        maxLength={6}
                        className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl focus:outline-none focus:ring-4 focus:ring-indigo-900/10 focus:border-indigo-900 focus:bg-white transition-all font-bold text-slate-800 tracking-[0.5em] text-center"
                        required
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    className="w-full py-5 bg-indigo-900 text-white rounded-[24px] font-black text-lg flex items-center justify-center gap-3 hover:bg-indigo-950 transition-all active:scale-[0.98]"
                  >
                    Verifikasi OTP
                    <Key size={20} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setStep('EMAIL')}
                    className="w-full text-xs font-black text-slate-400 hover:text-indigo-900 uppercase tracking-widest mt-2"
                  >
                    Kirim Ulang Kode?
                  </button>
                </motion.form>
              )}

              {step === 'RESET' && (
                <motion.form 
                  key="reset-step"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleResetPassword} 
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Password Baru</label>
                    <div className="relative group">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-900 transition-colors" size={20} />
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl focus:outline-none focus:ring-4 focus:ring-indigo-900/10 focus:border-indigo-900 focus:bg-white transition-all font-bold text-slate-800"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Konfirmasi Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-900 transition-colors" size={20} />
                      <input 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl focus:outline-none focus:ring-4 focus:ring-indigo-900/10 focus:border-indigo-900 focus:bg-white transition-all font-bold text-slate-800"
                        required
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full py-5 bg-indigo-900 text-white rounded-[24px] font-black text-lg flex items-center justify-center gap-3 hover:bg-indigo-950 transition-all disabled:opacity-50 active:scale-[0.98]"
                  >
                    {isLoading ? 'Sedang Menyimpan...' : 'Perbarui Password'}
                    {!isLoading && <ShieldCheck size={20} />}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>
    </div>
  );
}
