import { Sun, Moon } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from '../lib/ThemeContext';

interface ThemeToggleProps {
  /** Style kompak untuk sidebar/header */
  size?: 'sm' | 'md';
  /** Tampilan tombol bulat icon-only atau pill dengan label */
  variant?: 'icon' | 'pill';
  className?: string;
}

/**
 * Tombol toggle tema. Bisa dipakai di sidebar, header, atau halaman pengaturan.
 */
export default function ThemeToggle({ size = 'md', variant = 'icon', className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
        title={isDark ? 'Mode terang' : 'Mode gelap'}
        className={`relative inline-flex items-center w-16 h-9 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
          isDark ? 'bg-indigo-900' : 'bg-slate-200'
        } ${className}`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className={`absolute top-1 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-slate-700 ${
            isDark ? 'left-8' : 'left-1'
          }`}
        >
          {isDark ? <Moon size={14} /> : <Sun size={14} />}
        </motion.span>
      </button>
    );
  }

  const sizeCls = size === 'sm' ? 'w-9 h-9' : 'w-10 h-10';
  const iconSize = size === 'sm' ? 16 : 18;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
      title={isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
      className={`${sizeCls} rounded-xl flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 active:scale-95 ${
        isDark
          ? 'bg-slate-800 text-amber-300 hover:bg-slate-700'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-amber-300 dark:hover:bg-slate-700'
      } ${className}`}
    >
      <motion.span
        key={theme}
        initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="inline-flex"
      >
        {isDark ? <Sun size={iconSize} /> : <Moon size={iconSize} />}
      </motion.span>
    </button>
  );
}
