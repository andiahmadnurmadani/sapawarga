import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Users, 
  User as UserIcon, 
  Clock, 
  Shield, 
  CheckCircle2, 
  Home,
  Mail,
  Pen,
  ChevronDown,
  Bell,
  Activity,
  ArrowRight,
  Heart,
  Menu,
  X,
  BookOpen,
  Instagram,
  Facebook,
  Twitter,
  Globe,
  ZoomIn,
  LogIn,
  Sparkles,
  Image,
  MoreVertical,
  Newspaper,
  Footprints,
  Info
} from 'lucide-react';
import { CMSHero, CMSGalleryItem, InfoRT, AppConfig } from '../types';
import { cmsService } from '../lib/cmsService';
import { configService } from '../lib/configService';
import { getCdnUrl } from '../lib/cdnUtils';
import { formatDate } from '../utils';
import AppLogo from '../components/AppLogo';

// Helper: map icon name string to React component
const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  Mail, Bell, UserIcon, Activity, CheckCircle2, Shield, FileText, Heart, Users, Clock, Home, BookOpen, Globe
};
function getIconByName(name: string, size: number): React.ReactNode {
  const Icon = iconMap[name];
  return Icon ? <Icon size={size} /> : <FileText size={size} />;
}

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

const Logo = () => (
  <div className="flex items-center gap-2.5 md:gap-4">
    <div className="relative w-10 h-10 md:w-14 md:h-14 flex items-center justify-center shrink-0">
      <AppLogo className="w-full h-full object-contain" />
    </div>
    <span className="text-lg md:text-2xl font-bold tracking-tight text-slate-900 border-l-2 md:border-l-4 border-indigo-900/10 pl-2.5 md:pl-4">Hallo <span className="text-indigo-900 font-black">Warga</span></span>
  </div>
);

export default function LandingPage({ onLogin, onRegister }: LandingPageProps) {
  const [hero, setHero] = useState<CMSHero | null>(null);
  const [gallery, setGallery] = useState<CMSGalleryItem[]>([]);
  const [info, setInfo] = useState<InfoRT[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);

  // CMS Content states
  const [stats, setStats] = useState<{value: string; label: string}[]>([]);
  const [featuresWarga, setFeaturesWarga] = useState<{icon: string; title: string; desc: string; color: string}[]>([]);
  const [featuresAdmin, setFeaturesAdmin] = useState<{icon: string; title: string; desc: string; color: string}[]>([]);
  const [steps, setSteps] = useState<{num: string; title: string; desc: string; icon: string}[]>([]);
  const [cta, setCta] = useState<{title: string; buttonText: string} | null>(null);
  const [problemSolution, setProblemSolution] = useState<{oldTitle: string; oldDesc: string; newTitle: string; newDesc: string; sectionTitle: string} | null>(null);

  useEffect(() => {
    const unsubHero = cmsService.subscribeHero(setHero);
    const unsubGallery = cmsService.subscribeGallery(setGallery);
    const unsubInfo = cmsService.subscribeInfo(setInfo);
    configService.getConfig().then(data => data && setConfig(data));

    // Load CMS content sections
    cmsService.getContent<{value: string; label: string}[]>('stats').then(d => d && setStats(d));
    cmsService.getContent<{icon: string; title: string; desc: string; color: string}[]>('features_warga').then(d => d && setFeaturesWarga(d));
    cmsService.getContent<{icon: string; title: string; desc: string; color: string}[]>('features_admin').then(d => d && setFeaturesAdmin(d));
    cmsService.getContent<{num: string; title: string; desc: string; icon: string}[]>('steps').then(d => d && setSteps(d));
    cmsService.getContent<{title: string; buttonText: string}>('cta').then(d => d && setCta(d));
    cmsService.getContent<{oldTitle: string; oldDesc: string; newTitle: string; newDesc: string; sectionTitle: string}>('problem_solution').then(d => d && setProblemSolution(d));

    return () => {
      unsubHero();
      unsubGallery();
      unsubInfo();
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans text-slate-900 selection:bg-indigo-50 selection:text-indigo-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 md:px-6 py-1.5 md:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo />

          <div className="hidden md:flex items-center gap-10">
            {[
              { name: 'Fitur', href: '#fitur' },
              { name: 'Cara Kerja', href: '#cara-kerja' },
              { name: 'Tentang Kami', href: '#tentang' }
            ].map((item) => (
              <a key={item.name} href={item.href} className="text-sm font-bold text-slate-500 hover:text-indigo-900 transition-colors uppercase tracking-widest">
                {item.name}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button 
              onClick={onLogin}
              className="px-5 py-2 text-xs font-bold text-slate-500 hover:text-indigo-900 transition-colors uppercase tracking-widest"
            >
              Login
            </button>
            <button 
              onClick={onRegister}
              className="px-5 py-2.5 bg-indigo-900 text-white rounded-xl text-xs font-bold hover:bg-indigo-950 transition-all shadow-lg shadow-indigo-900/20 active:scale-95 uppercase tracking-widest"
            >
              Daftar Baru
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-indigo-50 border border-indigo-100 rounded-full text-[10px] font-bold text-indigo-900 uppercase tracking-[0.2em]">
              <Activity size={12} /> Transformasi Digital Rukun Tetangga
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold text-slate-900 leading-[1.05] mb-8 tracking-tight">
              {hero?.title || (
                <>Urus Surat RT Jadi <br/>
                <span className="text-indigo-900">Lebih Mudah & Cepat</span> <br/>
                dari Rumah.</>
              )}
            </h1>
            <p className="text-lg text-slate-500 leading-relaxed mb-10 max-w-xl font-medium">
              {hero?.subtitle || "Aplikasi Hallo Warga membantu warga RT 10 RW 04 mengurus pengajuan surat, mendapatkan informasi terbaru, dan mengelola data kependudukan secara digital. Koneksi Digital Antar Tetangga, Layanan Tanpa Antre."}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button 
                onClick={onRegister}
                className="w-full sm:w-auto px-10 py-5 bg-indigo-900 text-white rounded-2xl font-bold text-sm hover:bg-indigo-950 transition-all shadow-2xl shadow-indigo-900/30 active:scale-95 uppercase tracking-widest flex items-center justify-center gap-3"
              >
                Ajukan Surat Online <ArrowRight size={18} />
              </button>
              <button 
                onClick={onLogin}
                className="w-full sm:w-auto px-10 py-5 bg-white text-slate-900 border-2 border-slate-100 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all uppercase tracking-widest"
              >
                Cek Status
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            <div className="relative z-10 bg-slate-100 rounded-[3rem] p-4 shadow-2xl border-4 border-white">
              <img 
                src={hero?.imageUrl || "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=800"} 
                alt="Warga Hallo Warga" 
                className="rounded-[2.5rem] w-full object-cover shadow-inner aspect-[4/3]"
              />
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-100 rounded-full blur-3xl opacity-60 animate-pulse" />
            <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-teal-100 rounded-full blur-3xl opacity-60 animate-pulse" style={{ animationDelay: '2s' }} />
          </motion.div>
        </div>
      </section>

      {/* Stats / Problem & Solution */}
      <section className="py-24 bg-slate-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-20 items-center">
            <div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.3em] block mb-4">Meninggalkan Cara Lama</span>
              <h2 className="text-4xl lg:text-5xl font-bold leading-tight mb-8">{problemSolution?.sectionTitle || 'Urus Administrasi RT Tak Lagi Merepotkan'}</h2>
              <div className="space-y-8">
                <div className="flex gap-6 p-6 rounded-3xl bg-white/5 border border-white/10">
                  <div className="w-12 h-12 bg-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center shrink-0">
                    <X size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold mb-2">{problemSolution?.oldTitle || 'Masalah Cara Lama'}</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">{problemSolution?.oldDesc || 'Harus datang ke rumah Ketua RT, menunggu waktu luang, antre panjang, dan proses kertas manual yang lambat.'}</p>
                  </div>
                </div>
                <div className="flex gap-6 p-6 rounded-3xl bg-indigo-500/10 border border-indigo-500/20">
                  <div className="w-12 h-12 bg-indigo-500/20 text-indigo-500 rounded-2xl flex items-center justify-center shrink-0">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold mb-2">{problemSolution?.newTitle || 'Solusi Hallo Warga'}</h4>
                    <p className="text-slate-200 text-sm leading-relaxed">{problemSolution?.newDesc || 'Hemat waktu, ajukan kapan saja secara online, status terpantau real-time, dan arsip digital yang aman.'}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {(stats.length > 0 ? stats : [{value:'70%',label:'Efisiensi Waktu'},{value:'100%',label:'Warga Terdaftar'},{value:'24/7',label:'Proses Digital'},{value:'High',label:'Keamanan Data'}]).map((s, i) => (
                <StatItem key={i} label={s.label} value={s.value} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Village Gallery */}
      <VillageGallery items={gallery} />

      {/* Papan Informasi Section */}
      <section id="informasi" className="py-32 bg-slate-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div>
              <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-[0.3em] block mb-4">• Papan Informasi •</span>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">Kabar <span className="text-indigo-900">Terkini</span> Lingkungan</h2>
            </div>
            <p className="text-slate-500 font-medium max-w-md">Informasi resmi dari pengurus RT mengenai agenda, pengumuman, dan berita lingkungan.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {info.length > 0 ? (
              info.slice(0, 3).map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  className="group bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-900/10 transition-all flex flex-col h-full"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-900 group-hover:bg-indigo-900 group-hover:text-white transition-all shadow-sm">
                      <Bell size={24} />
                    </div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{formatDate(item.date)}</span>
                  </div>
                  <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-4 block">{item.type}</span>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4 line-clamp-2 leading-tight uppercase tracking-tight">{item.title}</h3>
                  <p className="text-slate-500 font-medium leading-relaxed mb-10 line-clamp-3 overflow-hidden">{item.content}</p>
                  <div className="mt-auto pt-8 border-t border-slate-50 flex items-center justify-between">
                    <button
                      onClick={onLogin}
                      className="text-xs font-black text-indigo-900 uppercase tracking-widest hover:underline flex items-center gap-2"
                    >
                      Baca Selengkapnya <ArrowRight size={14} />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                <Bell size={48} className="mx-auto text-slate-200 mb-6" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Belum ada informasi terbaru saat ini.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="fitur" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-24">
            <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-[0.3em] block mb-4">• Layanan Kami •</span>
            <h2 className="text-5xl font-bold text-slate-900 tracking-tight">Fitur Unggulan <span className="text-indigo-900">Hallo Warga</span></h2>
          </div>

          <div className="space-y-24">
            {/* For Citizens */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.4em] mb-12 text-center">Fokus Layanan Warga</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {(featuresWarga.length > 0 ? featuresWarga : [
                  {icon:'Mail',title:'Pengajuan Surat Online',desc:'Urus Surat Sakit, Domisili, atau Pengantar KK tanpa harus keluar rumah.',color:'indigo'},
                  {icon:'Bell',title:'Informasi & Berita RT',desc:'Dapatkan info jadwal ronda, kerja bakti, dan pengumuman terbaru di HP Anda.',color:'blue'},
                  {icon:'UserIcon',title:'Registrasi & Data Mandiri',desc:'Perbarui data keluarga dan identitas mandiri secara digital dan praktis.',color:'teal'}
                ]).map((f, i) => (
                  <FeatureCard key={i} icon={getIconByName(f.icon, 32)} title={f.title} desc={f.desc} color={f.color} />
                ))}
              </div>
            </div>

            {/* For Admins */}
            <div className="pt-24 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.4em] mb-12 text-center">Fokus Layanan Pengurus RT</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {(featuresAdmin.length > 0 ? featuresAdmin : [
                  {icon:'Activity',title:'Dashboard Manajemen',desc:'Pantau kondisi lingkungan dan performa layanan administrasi dalam satu layar.',color:'slate'},
                  {icon:'CheckCircle2',title:'Verifikasi Cepat',desc:'Setujui pengajuan surat warga dalam hitungan detik dengan verifikasi digital.',color:'indigo'},
                  {icon:'Shield',title:'Data Terpusat',desc:'Kelola database warga secara terintegrasi, aman, dan mudah diakses.',color:'amber'}
                ]).map((f, i) => (
                  <FeatureCard key={i} icon={getIconByName(f.icon, 32)} title={f.title} desc={f.desc} color={f.color} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="cara-kerja" className="py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-24">
            <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-[0.3em] block mb-4">• Langkah Mudah •</span>
            <h2 className="text-5xl font-bold text-slate-900 tracking-tight">Bagaimana Cara Kerjanya?</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 relative">
            <div className="hidden lg:block absolute top-12 left-0 w-full h-0.5 bg-slate-200 z-0" />
            {(steps.length > 0 ? steps : [
              {num:'1',title:'Daftar',desc:'Lengkapi NIK dan data diri Anda untuk pendaftaran awal.',icon:'UserIcon'},
              {num:'2',title:'Login',desc:'Masuk ke dashboard pribadi menggunakan email akun Anda.',icon:'Shield'},
              {num:'3',title:'Pilih Layanan',desc:'Pilih jenis surat yang ingin diajukan atau baca berita terbaru.',icon:'FileText'},
              {num:'4',title:'Selesai',desc:'Ambil surat di kantor RT atau langsung unduh file digitalnya.',icon:'CheckCircle2'}
            ]).map((s, i) => (
              <StepItem key={i} num={s.num} title={s.title} desc={s.desc} icon={getIconByName(s.icon, 24)} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto bg-indigo-900 rounded-[3rem] p-12 md:p-24 relative overflow-hidden flex flex-col items-center text-center text-white">
          <div className="relative z-10 max-w-2xl">
             <span className="text-[10px] font-bold uppercase tracking-[0.3em] mb-6 block opacity-80">• Mari Memulai •</span>
             <h2 className="text-5xl md:text-6xl font-bold mb-10 leading-tight">{cta?.title || 'Mari Bangun RT Kita Menjadi Lebih Modern & Terhubung.'}</h2>
             <button 
               onClick={onRegister} 
               className="px-12 py-5 bg-white text-indigo-900 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all shadow-2xl uppercase tracking-widest active:scale-95"
             >
               {cta?.buttonText || 'Gabung Hallo Warga Sekarang'}
             </button>
          </div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl opacity-50" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-950/20 rounded-full blur-3xl opacity-50" />
        </div>
      </section>

      {/* Footer */}
      <footer id="tentang" className="bg-slate-50 pt-24 pb-24 md:pb-12 text-slate-900 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-20">
            <div className="md:col-span-12 lg:col-span-4 space-y-8">
              <Logo />
              <p className="text-slate-500 text-base font-medium leading-relaxed max-w-sm">
                Hallo Warga hadir untuk memudahkan setiap urusan administrasi dan memperkuat hubungan antar tetangga di era digital.
              </p>
            </div>

            <div className="md:col-span-4 lg:col-span-2 space-y-8">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Portal</h4>
              <ul className="space-y-4">
                <li><button onClick={onLogin} className="text-sm text-slate-600 hover:text-indigo-900 transition-colors font-bold uppercase tracking-tight">Login Warga</button></li>
                <li><button onClick={onRegister} className="text-sm text-slate-600 hover:text-indigo-900 transition-colors font-bold uppercase tracking-tight">Daftar Baru</button></li>
              </ul>
            </div>

            <div className="md:col-span-4 lg:col-span-3 space-y-8">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Informasi</h4>
              <ul className="space-y-4">
                <li><button onClick={() => setShowTerms(true)} className="text-sm text-slate-600 hover:text-indigo-900 transition-colors font-bold uppercase tracking-tight text-left">Syarat & Ketentuan</button></li>
                <li><button onClick={() => setShowPrivacy(true)} className="text-sm text-slate-600 hover:text-indigo-900 transition-colors font-bold uppercase tracking-tight text-left">Kebijakan Privasi</button></li>
                {config?.footerSettings?.manualBookUrl && (
                  <li>
                    <a 
                      href={config.footerSettings.manualBookUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-900 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-indigo-100 transition-all"
                    >
                      <BookOpen size={14} /> Manual Book
                    </a>
                  </li>
                )}
              </ul>
            </div>

            <div className="md:col-span-4 lg:col-span-3 space-y-8">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Hubungi Kami</h4>
              <p className="text-sm text-slate-600 font-bold tracking-tight">
                RT {config?.rtNumber || '10'} RW {config?.rwNumber || '04'} <br/>
                {config?.villageName || 'Kelurahan'}, {config?.cityName || 'Kota'}
              </p>
              <p className="text-sm text-indigo-900 font-bold tracking-tight bg-indigo-50 px-3 py-1 rounded-lg inline-block">admin@hallowarga.com</p>
            </div>
          </div>
          
          <div className="pt-12 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-8">
            <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">© 2024 HALLO WARGA - RT {config?.rtNumber || '10'} RW {config?.rwNumber || '04'}.</p>
            <div className="flex gap-4">
              {config?.socialMedia?.instagram && (
                <a href={config.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-900 hover:bg-white hover:border-indigo-100 transition-all shadow-sm">
                  <Instagram size={18} />
                </a>
              )}
              {config?.socialMedia?.facebook && (
                <a href={config.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-900 hover:bg-white hover:border-indigo-100 transition-all shadow-sm">
                  <Facebook size={18} />
                </a>
              )}
              {config?.socialMedia?.twitter && (
                <a href={config.socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-900 hover:bg-white hover:border-indigo-100 transition-all shadow-sm">
                  <Twitter size={18} />
                </a>
              )}
              {config?.socialMedia?.whatsapp && (
                <a href={`https://wa.me/${config.socialMedia.whatsapp}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-900 hover:bg-white hover:border-indigo-100 transition-all shadow-sm">
                  <Globe size={18} />
                </a>
              )}
            </div>
          </div>
        </div>
      </footer>

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
            className="md:hidden fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] inset-x-3 z-[80] bg-white rounded-3xl border border-slate-200 shadow-2xl shadow-slate-900/20 p-4"
          >
            <div className="flex items-center justify-between mb-4 px-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Menu Lainnya</span>
              <button onClick={() => setShowMobileMore(false)} className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <a href="#galeri" onClick={() => setShowMobileMore(false)} className="flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 text-slate-500 hover:bg-slate-50 active:scale-95 transition-all">
                <Image size={20} />
                <span className="text-[9px] font-bold uppercase tracking-wider">Galeri</span>
              </a>
              <a href="#informasi" onClick={() => setShowMobileMore(false)} className="flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 text-slate-500 hover:bg-slate-50 active:scale-95 transition-all">
                <Newspaper size={20} />
                <span className="text-[9px] font-bold uppercase tracking-wider">Info</span>
              </a>
              <a href="#cara-kerja" onClick={() => setShowMobileMore(false)} className="flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 text-slate-500 hover:bg-slate-50 active:scale-95 transition-all">
                <Footprints size={20} />
                <span className="text-[9px] font-bold uppercase tracking-wider">Langkah</span>
              </a>
              <a href="#tentang" onClick={() => setShowMobileMore(false)} className="flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 text-slate-500 hover:bg-slate-50 active:scale-95 transition-all">
                <Info size={20} />
                <span className="text-[9px] font-bold uppercase tracking-wider">Tentang</span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-[75] px-3 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-2 bg-white/95 backdrop-blur-2xl border-t border-slate-200/60">
        <div className="grid grid-cols-5 gap-1">
          <a href="#" className="flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 px-1 text-indigo-900 transition-all">
            <Home size={21} />
            <span className="text-[9px] font-bold uppercase tracking-wider leading-none">Home</span>
            <span className="w-1 h-1 rounded-full bg-indigo-900 mt-0.5"></span>
          </a>
          <a href="#fitur" className="flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 px-1 text-slate-400 active:scale-90 transition-all">
            <Sparkles size={21} />
            <span className="text-[9px] font-bold uppercase tracking-wider leading-none opacity-70">Fitur</span>
          </a>
          <button onClick={onLogin} className="flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 px-1 text-slate-400 active:scale-90 transition-all">
            <LogIn size={21} />
            <span className="text-[9px] font-bold uppercase tracking-wider leading-none opacity-70">Login</span>
          </button>
          <button onClick={onRegister} className="flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 px-1 text-slate-400 active:scale-90 transition-all">
            <UserIcon size={21} />
            <span className="text-[9px] font-bold uppercase tracking-wider leading-none opacity-70">Daftar</span>
          </button>
          <button onClick={() => setShowMobileMore(!showMobileMore)} className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 px-1 transition-all active:scale-90 ${showMobileMore ? 'text-indigo-900' : 'text-slate-400'}`}>
            <MoreVertical size={21} />
            <span className="text-[9px] font-bold uppercase tracking-wider leading-none opacity-70">Lainnya</span>
          </button>
        </div>
      </nav>

      {/* Modals for Terms and Privacy */}
      <AnimatePresence>
        {showTerms && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTerms(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-[3rem] p-12 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
               <h2 className="text-3xl font-bold mb-8 uppercase tracking-tight text-indigo-900">Syarat & Ketentuan</h2>
               <div className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap mb-10">
                  {config?.footerSettings?.termsAndConditions || 'Belum ada syarat dan ketentuan yang ditetapkan.'}
               </div>
               <button onClick={() => setShowTerms(false)} className="w-full py-4 bg-indigo-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs">Tutup</button>
            </motion.div>
          </div>
        )}
        {showPrivacy && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPrivacy(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-[3rem] p-12 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
               <h2 className="text-3xl font-bold mb-8 uppercase tracking-tight text-indigo-900">Kebijakan Privasi</h2>
               <div className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap mb-10">
                  {config?.footerSettings?.privacyPolicy || 'Belum ada kebijakan privasi yang ditetapkan.'}
               </div>
               <button onClick={() => setShowPrivacy(false)} className="w-full py-4 bg-indigo-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs">Tutup</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VillageGallery({ items }: { items: CMSGalleryItem[] }) {
  const [lightbox, setLightbox] = useState<{ url: string; title: string; desc: string } | null>(null);

  const defaultImages = [
    {
      url: "https://images.unsplash.com/photo-1543733330-466d809f4851?auto=format&fit=crop&q=80&w=1200",
      title: "Kegiatan Kerja Bakti Minggu Pagi",
      desc: "Warga bahu membahu membersihkan lingkungan sekitar taman RT."
    },
    {
      url: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&q=80&w=1200",
      title: "Rapat Rutin Pengurus & Warga",
      desc: "Diskusi santai namun serius membahas pengembangan fasilitas balai warga."
    },
    {
      url: "https://images.unsplash.com/photo-1621213076116-2f0857398dbd?auto=format&fit=crop&q=80&w=1200",
      title: "Suasana Asri Lingkungan RT 10",
      desc: "Keasrian tetap terjaga berkat kepedulian seluruh warga akan kebersihan."
    },
    {
      url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1200",
      title: "Kebersamaan dalam Keberagaman",
      desc: "Saling menyapa dan membantu menjadi fondasi utama kerukunan kami."
    }
  ];

  const images = items.length > 0 ? items : defaultImages;

  // Tutup lightbox dengan tombol ESC
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightbox]);

  if (images.length === 0) return null;

  return (
    <section id="galeri" className="py-32 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-[0.3em] block mb-4">• Galeri Warga •</span>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">Keseharian & <span className="text-indigo-900">Momen Berharga</span> Kami</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {images.map((img, i) => (
            <motion.button
              key={i}
              type="button"
              onClick={() => setLightbox({ url: img.url, title: img.title, desc: img.desc })}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              viewport={{ once: true, margin: '-50px' }}
              className="group relative aspect-[4/3] rounded-[2rem] overflow-hidden bg-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-900/20 transition-all duration-500 cursor-pointer focus:outline-none focus:ring-4 focus:ring-indigo-900/20 text-left"
              aria-label={`Lihat detail: ${img.title}`}
            >
              <img
                src={getCdnUrl(img.url) || img.url}
                alt={img.title}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              {/* Gradient overlay — selalu ada agar teks terbaca */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent pointer-events-none" />
              {/* Info overlay */}
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 md:p-7 text-white pointer-events-none">
                <h4 className="text-base sm:text-lg md:text-xl font-bold tracking-tight leading-snug line-clamp-2 mb-1.5 drop-shadow-sm break-words [overflow-wrap:anywhere] [word-break:break-word]">
                  {img.title}
                </h4>
                <p className="text-xs md:text-sm text-white/80 font-medium leading-relaxed line-clamp-2 break-words [overflow-wrap:anywhere] [word-break:break-word]">
                  {img.desc}
                </p>
              </div>
              {/* Zoom hint icon di pojok */}
              <div className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110">
                <ZoomIn size={16} />
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Lightbox detail */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
            onClick={() => setLightbox(null)}
          >
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-5 right-5 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/20 transition-all z-10"
              aria-label="Tutup"
            >
              <X size={20} />
            </button>
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-5xl max-h-full bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-slate-100 flex items-center justify-center max-h-[70vh] overflow-hidden">
                <img
                  src={getCdnUrl(lightbox.url) || lightbox.url}
                  alt={lightbox.title}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              </div>
              <div className="p-6 md:p-8 bg-white">
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-tight mb-3 break-words [overflow-wrap:anywhere]">
                  {lightbox.title}
                </h3>
                <p className="text-sm md:text-base text-slate-600 font-medium leading-relaxed break-words [overflow-wrap:anywhere] whitespace-pre-line">
                  {lightbox.desc}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function FeatureCard({ icon, title, desc, color }: { icon: React.ReactNode, title: string, desc: string, color: string }) {
  const themes: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-900 border-indigo-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    teal: 'bg-teal-50 text-teal-600 border-teal-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
  };

  return (
    <div className="p-10 rounded-[2.5rem] border border-slate-100 bg-white hover:shadow-2xl hover:border-indigo-100 transition-all duration-500 group">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 ${themes[color] || themes.slate} group-hover:scale-110 transition-transform duration-500`}>
        {icon}
      </div>
      <h4 className="text-2xl font-bold mb-4 text-slate-900 tracking-tight group-hover:text-indigo-900 transition-colors">{title}</h4>
      <p className="text-slate-500 font-medium leading-relaxed">{desc}</p>
    </div>
  );
}

function StatItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="p-8 rounded-3xl bg-white/5 border border-white/10 text-center hover:bg-indigo-900/10 hover:border-indigo-500/50 transition-all group">
      <p className="text-4xl font-bold text-indigo-500 mb-2 group-hover:scale-110 transition-transform">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
    </div>
  );
}

function StepItem({ num, title, desc, icon }: { num: string, title: string, desc: string, icon: React.ReactNode }) {
  return (
    <div className="relative z-10 flex flex-col items-center text-center">
      <div className="w-24 h-24 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center text-indigo-900 mb-8 shadow-xl group hover:border-indigo-900 transition-all">
        {icon}
        <div className="absolute -top-2 -right-2 w-10 h-10 bg-indigo-900 text-white text-sm font-bold rounded-full flex items-center justify-center shadow-lg">
          {num}
        </div>
      </div>
      <h4 className="text-xl font-bold mb-3 text-slate-900 uppercase tracking-tight">{title}</h4>
      <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-[15rem]">{desc}</p>
    </div>
  );
}
