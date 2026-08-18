'use client';

import React from 'react';
import { Shield, Sun, Moon, LogOut, Search, PlusCircle, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  user: { fullName?: string; email?: string } | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAddModal: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  searchQuery,
  onSearchChange,
  onOpenAddModal,
  theme,
  onToggleTheme,
}) => {
  const router = useRouter();

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
        <div className="flex items-center gap-2.5 cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-glow text-white">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-lg leading-tight">
              <span>SafeVault</span>
              <span className="text-[10px] uppercase font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded-md tracking-wider">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">سحابي فائق الأمان</p>
          </div>
        </div>

        {/* User Badge */}
        <div className="hidden sm:flex items-center gap-2.5 pr-4 border-r border-slate-700/60">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white font-bold text-xs flex items-center justify-center shadow-emerald-glow">
            {initial}
          </div>
          <div className="text-xs">
            <p className="font-semibold text-slate-200">{displayName}</p>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>سحابي متزامن</span>
            </div>
          </div>
        </div>
      </div>

      {/* Center Search Input */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث بأي شيء: الاسم، المستخدم، الرابط..."
            className="w-full bg-slate-900/60 border border-slate-800 focus:border-blue-500/50 rounded-xl pr-10 pl-4 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-100 transition"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenAddModal}
          className="hidden sm:inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-emerald-glow transition active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>إضافة حساب</span>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          title="تبديل الثيم"
          className="w-9 h-9 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-300 transition hover:text-white"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          title="تسجيل الخروج"
          className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 flex items-center justify-center text-rose-400 transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
