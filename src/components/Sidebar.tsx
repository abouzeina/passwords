'use client';

import React from 'react';
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
} from 'lucide-react';

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
  totalCount: number;
  favCount: number;
  onOpenCreateWorkspace: () => void;
  onOpenImportModal?: () => void;
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
  totalCount,
  favCount,
  onOpenCreateWorkspace,
  onOpenImportModal,
}) => {
  return (
    <aside className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-5">
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
            className="text-xs md:text-sm text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1.5 transition px-2 py-1 rounded-lg hover:bg-blue-500/10"
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
              <span className="text-xs font-mono font-bold text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded-md">
                {ws._count?.vaultItems ?? 0}
              </span>
            </button>
          ))}
        </div>
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
      {onOpenImportModal && (
        <button
          type="button"
          onClick={onOpenImportModal}
          className="w-full glass-card rounded-2xl p-4 flex items-center justify-center gap-2.5 bg-blue-600/10 border-blue-500/30 hover:bg-blue-600/20 text-blue-400 font-bold text-sm transition active:scale-95"
        >
          <Upload className="w-5 h-5" />
          <span>استيراد الحسابات من المتصفح القديم</span>
        </button>
      )}

      {/* Security Health Box */}
      <div className="glass-card rounded-2xl p-4 flex items-center gap-3.5 bg-gradient-to-br from-slate-900/90 to-blue-950/30 border-blue-500/30">
        <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-emerald-glow">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-sm font-extrabold text-slate-100">فحص أمان الخزنة</h4>
          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
            تشفير سحابي وقاعدة بيانات PostgreSQL معزولة ومحمية.
          </p>
        </div>
      </div>
    </aside>
  );
};
