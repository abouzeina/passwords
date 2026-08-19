'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Sun,
  Moon,
  LogOut,
  Search,
  PlusCircle,
  CheckCircle2,
  Download,
  Upload,
  Lock,
  RotateCw,
  Smartphone,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  user: { fullName?: string; email?: string } | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAddModal: () => void;
  onOpenImportModal: () => void;
  onExportData: () => void;
  onManualSync: () => void;
  onLockVault: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  searchQuery,
  onSearchChange,
  onOpenAddModal,
  onOpenImportModal,
  onExportData,
  onManualSync,
  onLockVault,
  theme,
  onToggleTheme,
}) => {
  const router = useRouter();
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const triggerSync = () => {
    setIsSyncing(true);
    onManualSync();
    setTimeout(() => setIsSyncing(false), 1500);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const displayName = user?.fullName || user?.email?.split('@')[0] || 'المستخدم';
  const initial = displayName.trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4">
      {/* Brand & User Profile */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-glow text-white">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 font-black text-xl leading-tight text-white">
              <span>SafeVault</span>
              <span className="text-xs uppercase font-black bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-lg tracking-wider">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-300 font-semibold mt-0.5">سحابي فائق الأمان ومزامن</p>
          </div>
        </div>

        {/* User Badge */}
        <div className="hidden sm:flex items-center gap-3 pr-4 border-r border-slate-700/60">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white font-bold text-sm flex items-center justify-center shadow-emerald-glow">
            {initial}
          </div>
          <div className="text-sm">
            <p className="font-bold text-slate-100">{displayName}</p>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>سحابي متزامن</span>
            </div>
          </div>
        </div>
      </div>

      {/* Center Search Input */}
      <div className="flex-1 max-w-lg hidden md:block">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="global-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث بأي شيء (Ctrl + K)..."
            className="w-full bg-slate-900/80 border border-slate-700/80 focus:border-blue-500 rounded-xl pr-11 pl-16 py-2.5 text-sm md:text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-100 font-medium transition"
          />
          <kbd className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-mono bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-md pointer-events-none">
            Ctrl K
          </kbd>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* PWA Install Button if available */}
        {installPrompt && (
          <button
            type="button"
            onClick={handleInstallApp}
            title="تثبيت التطبيق على جهازك"
            className="hidden sm:inline-flex items-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs md:text-sm font-bold px-3 py-2 rounded-xl transition"
          >
            <Smartphone className="w-4 h-4" />
            <span>تثبيت التطبيق</span>
          </button>
        )}

        {/* Sync Button */}
        <button
          type="button"
          onClick={triggerSync}
          title="مزامنة فورية مع السيرفر"
          className="hidden sm:inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs md:text-sm font-bold px-3 py-2 rounded-xl transition"
        >
          <RotateCw className={`w-4 h-4 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
          <span className="hidden lg:inline">مزامنة</span>
        </button>

        {/* Export / Import */}
        <button
          type="button"
          onClick={onExportData}
          title="تصدير نسخة احتياطية مشفرة (JSON)"
          className="hidden sm:inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs md:text-sm font-bold px-3 py-2 rounded-xl transition"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span className="hidden lg:inline">تصدير</span>
        </button>

        <button
          type="button"
          onClick={onOpenImportModal}
          title="استيراد البيانات القديمة"
          className="hidden sm:inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs md:text-sm font-bold px-3 py-2 rounded-xl transition"
        >
          <Upload className="w-4 h-4 text-blue-400" />
          <span className="hidden lg:inline">استيراد</span>
        </button>

        {/* Add Account CTA */}
        <button
          type="button"
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs md:text-sm font-bold px-3.5 py-2 rounded-xl shadow-emerald-glow transition active:scale-95"
        >
          <PlusCircle className="w-4 h-4 md:w-5 md:h-5" />
          <span>إضافة حساب</span>
        </button>

        {/* Lock Button */}
        <button
          type="button"
          onClick={onLockVault}
          title="قفل الخزنة مؤقتاً"
          className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 flex items-center justify-center text-amber-400 transition"
        >
          <Lock className="w-4 h-4 md:w-5 md:h-5" />
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          title="تبديل الثيم"
          className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-slate-900/80 border border-slate-700/80 hover:border-slate-600 flex items-center justify-center text-slate-300 transition hover:text-white"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 md:w-5 md:h-5 text-amber-400" /> : <Moon className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />}
        </button>

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          title="تسجيل الخروج"
          className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 flex items-center justify-center text-rose-400 transition"
        >
          <LogOut className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </div>
    </header>
  );
};
