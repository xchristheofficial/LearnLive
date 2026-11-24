import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={toggleTheme}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative w-9 h-9 rounded-full grid place-items-center hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300 transition-colors ${className}`}
    >
      <motion.span key={theme} initial={{ rotate: -90, opacity: 0, scale: 0.5 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}>
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </motion.span>
    </motion.button>
  );
}
