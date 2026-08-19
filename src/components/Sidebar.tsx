'use client';

import React, { useState } from 'react';
import {
  Folder,
  FolderPlus,
  Briefcase,
  Home,
  Star,
  Layers,
  Globe,
  CreditCard,
  Mail,
  Gamepad2,
  MoreHorizontal,
  ShieldCheck,
  Upload,
  Wand2,
  RotateCw,
  Copy,
  Check,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import { VaultItemData } from './AccountCard';

interface Workspace {
  id: string;
  name: string;
  icon: string;
  desc?: string | null;
  _count?: { vaultItems: number };
}

interface SidebarProps {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onSelectWorkspace: (id: string) => void;
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  items: VaultItemData[];
  onOpenCreateWorkspace: () => void;
  onOpenImportModal: () => void;
}

const CATEGORIES = [
  { id: 'ALL', label: 'الكل', icon: Layers },
  { id: 'FAVORITES', label: 'المفضلة ⭐', icon: Star },
  { id: 'وسائط إجتماعية', label: 'وسائط اجتماعية', icon: Globe },
  { id: 'البريد الإلكتروني', label: 'البريد الإلكتروني', icon: Mail },
  { id: 'بنوك ومدفوعات', label: 'بنوك ومدفوعات', icon: CreditCard },
  { id: 'عمل واستضافة', label: 'عمل واستضافة', icon: Briefcase },
  { id: 'ألعاب وترفيه', label: 'ألعاب وترفيه', icon: Gamepad2 },
  { id: 'أخرى', label: 'أخرى', icon: MoreHorizontal },
];

export const Sidebar: React.FC<SidebarProps> = ({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  activeCategory,
  onSelectCategory,
  items,
  onOpenCreateWorkspace,
  onOpenImportModal,
}) => {
  // Generator State
  const [genLength, setGenLength] = useState(16);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useNums, setUseNums] = useState(true);
  const [useSyms, setUseSyms] = useState(true);
  const [genResult, setGenResult] = useState('');
  const [copiedGen, setCopiedGen] = useState(false);

  const generateQuickPassword = () => {
    let chars = '';
    if (useUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (useLower) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (useNums) chars += '0123456789';
    if (useSyms) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz0123456789';

    let res = '';
    const array = new Uint32Array(genLength);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < genLength; i++) {
      res += chars[array[i] % chars.length];
    }
    setGenResult(res);
  };

  const copyQuickPassword = () => {
    if (!genResult) {
      generateQuickPassword();
      return;
    }
    navigator.clipboard.writeText(genResult);
    setCopiedGen(true);
    setTimeout(() => setCopiedGen(false), 2000);
  };

  // Calculate Security Score & Breakdown
  const secStats = React.useMemo(() => {
    let strong = 0;
    let medium = 0;
    let weak = 0;

    items.forEach((it) => {
      const pwd = it.password || '';
      let score = 0;
      if (pwd.length >= 8) score += 25;
      if (pwd.length >= 12) score += 25;
      if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 20;
      if (/\d/.test(pwd)) score += 15;
      if (/[^a-zA-Z\d]/.test(pwd)) score += 15;

      if (score >= 75) strong++;
      else if (score >= 40) medium++;
      else weak++;
    });

    const total = items.length;
    const healthPercent = total > 0 ? Math.round((strong / total) * 100) : 100;

    return { strong, medium, weak, healthPercent };
  }, [items]);

  const totalCount = items.length;
  const favCount = items.filter((i) => i.isFavorite).length;

  return (
    <aside className="w-full lg:w-84 flex-shrink-0 flex flex-col gap-5">
      {/* Workspaces Card */}
      <div className="glass-card rounded-2xl p-5 flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-blue-400" />
            <h3 className="font-extrabold text-base text-slate-100">مساحات العمل</h3>
          </div>
          <button
            type="button"
            onClick={onOpenCreateWorkspace}
            className="text-xs md:text-sm text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1.5 transition px-2.5 py-1 rounded-lg hover:bg-blue-500/10"
          >
            <FolderPlus className="w-4 h-4" />
            <span>مساحة جديدة</span>
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          {/* All Accounts Tab */}
          <button
            type="button"
            onClick={() => onSelectWorkspace('ALL')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-extrabold transition ${
              activeWorkspaceId === 'ALL'
                ? 'bg-blue-600/25 text-blue-400 border border-blue-500/40 shadow-sm'
                : 'text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-blue-400" />
              <span>جميع الحسابات</span>
            </div>
            <span className="bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold text-slate-200">
              {totalCount}
            </span>
          </button>

          {/* User Workspaces */}
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              type="button"
              onClick={() => onSelectWorkspace(ws.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition ${
                activeWorkspaceId === ws.id
                  ? 'bg-blue-600/25 text-blue-400 border border-blue-500/40'
                  : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Folder className="w-5 h-5 text-slate-400" />
                <span className="truncate max-w-[150px]">{ws.name}</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-400 bg-slate-900/60 px-2.5 py-0.5 rounded-md">
                {ws._count?.vaultItems ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Security Health Breakdown Card */}
      <div className="glass-card rounded-2xl p-5 flex flex-col gap-3.5 bg-gradient-to-br from-slate-900/95 to-slate-950/80 border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-base text-slate-100">فحص أمان الخزنة</h3>
          </div>
          <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border ${
            secStats.healthPercent >= 80
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : secStats.healthPercent >= 50
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
          }`}>
            {secStats.healthPercent}% آمن
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center">
            <span className="font-extrabold text-lg text-emerald-400 font-mono">{secStats.strong}</span>
            <span className="text-[11px] font-bold text-emerald-300 mt-0.5">قوية ✅</span>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center">
            <span className="font-extrabold text-lg text-amber-400 font-mono">{secStats.medium}</span>
            <span className="text-[11px] font-bold text-amber-300 mt-0.5">متوسطة ⚠️</span>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col items-center">
            <span className="font-extrabold text-lg text-rose-400 font-mono">{secStats.weak}</span>
            <span className="text-[11px] font-bold text-rose-300 mt-0.5">ضعيفة ❌</span>
          </div>
        </div>
      </div>

      {/* Advanced Quick Password Generator Card */}
      <div className="glass-card rounded-2xl p-5 flex flex-col gap-3.5 border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Wand2 className="w-5 h-5 text-indigo-400" />
            <h3 className="font-extrabold text-base text-slate-100">مولد كلمات المرور</h3>
          </div>
          <button
            type="button"
            onClick={generateQuickPassword}
            title="توليد كلمة جديدة"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Output Box */}
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2 pr-3">
          <input
            type="text"
            readOnly
            value={genResult}
            placeholder="اضغط توليد..."
            className="w-full bg-transparent text-sm font-mono font-bold text-white focus:outline-none placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={copyQuickPassword}
            title="نسخ كلمة المرور"
            className="p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 transition flex-shrink-0"
          >
            {copiedGen ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-2.5 text-xs text-slate-300 font-bold">
          <div className="flex items-center justify-between">
            <span>الطول:</span>
            <span className="bg-slate-800 px-2 py-0.5 rounded text-blue-400 font-mono text-sm">{genLength}</span>
          </div>
          <input
            type="range"
            min="8"
            max="40"
            value={genLength}
            onChange={(e) => {
              setGenLength(Number(e.target.value));
              generateQuickPassword();
            }}
            className="accent-blue-500 cursor-pointer"
          />

          <div className="grid grid-cols-2 gap-2 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useUpper}
                onChange={(e) => setUseUpper(e.target.checked)}
                className="accent-blue-500 rounded"
              />
              <span>A-Z</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useLower}
                onChange={(e) => setUseLower(e.target.checked)}
                className="accent-blue-500 rounded"
              />
              <span>a-z</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useNums}
                onChange={(e) => setUseNums(e.target.checked)}
                className="accent-blue-500 rounded"
              />
              <span>0-9</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useSyms}
                onChange={(e) => setUseSyms(e.target.checked)}
                className="accent-blue-500 rounded"
              />
              <span>!@#$</span>
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={generateQuickPassword}
          className="w-full py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-extrabold text-sm flex items-center justify-center gap-2 transition"
        >
          <Wand2 className="w-4 h-4" />
          <span>توليد كلمة سر قوية</span>
        </button>
      </div>

      {/* Category Filter Chips */}
      <div className="glass-card rounded-2xl p-5 flex flex-col gap-3.5">
        <h3 className="font-extrabold text-base text-slate-100">التصنيفات</h3>
        <div className="flex flex-col gap-1.5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                  <span>{cat.label}</span>
                </div>
                {cat.id === 'ALL' && (
                  <span className="text-xs font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md">
                    {totalCount}
                  </span>
                )}
                {cat.id === 'FAVORITES' && (
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                    {favCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Import / Sync Box */}
      <button
        type="button"
        onClick={onOpenImportModal}
        className="w-full glass-card rounded-2xl p-4 flex items-center justify-center gap-2.5 bg-blue-600/10 border-blue-500/30 hover:bg-blue-600/20 text-blue-400 font-bold text-sm transition active:scale-95"
      >
        <Upload className="w-5 h-5" />
        <span>استيراد وتصدير الحسابات</span>
      </button>
    </aside>
  );
};
