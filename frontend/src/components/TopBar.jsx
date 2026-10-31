import { Calendar, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function TopBar({ title, subtitle }) {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 flex-shrink-0 transition-colors duration-200">
      <div>
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400 dark:text-slate-400">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-400">
          <Calendar size={14} />
          <span>{dateStr}</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700 transition-colors"
        >
          {isDark ? (
            <Sun size={17} className="text-amber-400" />
          ) : (
            <Moon size={17} className="text-slate-600" />
          )}
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-transparent dark:border-emerald-800/40 flex items-center justify-center">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="hidden sm:block text-sm font-medium text-slate-700 dark:text-slate-200">{user?.name}</span>
        </div>
      </div>
    </header>
  );
}
