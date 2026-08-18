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
  ShieldAlert,
  ShieldCheck,
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
}

const CATEGORIES = [
  { id: 'ALL', label: 'الكل', icon: Layers },
  { id: 'FAVORITES', label: 'المفضلة', icon: Star },
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
}) => {
  return (
    <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-5">
      {/* Workspaces Card */}
      <div className="glass-card rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-sm text-slate-200">مساحات العمل</h3>
          </div>
          <button
            type="button"
            onClick={onOpenCreateWorkspace}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>مساحة جديدة</span>
          </button>
        </div>

        <div className="flex flex-col gap-1">
          {/* All Accounts Tab */}
          <button
            type="button"
            onClick={() => onSelectWorkspace('ALL')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
              activeWorkspaceId === 'ALL'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-300 hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4" />
              <span>جميع الحسابات</span>
            </div>
            <span className="bg-slate-800/80 px-2 py-0.5 rounded-md text-[11px] font-mono">
              {totalCount}
            </span>
          </button>

          {/* User Workspaces */}
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              type="button"
              onClick={() => onSelectWorkspace(ws.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeWorkspaceId === ws.id
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Folder className="w-4 h-4 text-slate-400" />
                <span className="truncate max-w-[130px]">{ws.name}</span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {ws._count?.vaultItems ?? ''}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="glass-card rounded-2xl p-4 flex flex-col gap-3">
        <h3 className="font-bold text-sm text-slate-200">التصنيفات</h3>
        <div className="flex flex-col gap-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{cat.label}</span>
                </div>
                {cat.id === 'ALL' && (
                  <span className="text-[11px] font-mono text-slate-500">{totalCount}</span>
                )}
                {cat.id === 'FAVORITES' && (
                  <span className="text-[11px] font-mono text-amber-400">{favCount}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Security Health Box */}
      <div className="glass-card rounded-2xl p-4 flex items-center gap-3 bg-gradient-to-br from-slate-900/80 to-blue-950/20 border-blue-500/20">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-200">فحص أمان الخزنة</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            تشفير سحابي دائم وقاعدة بيانات PostgreSQL معزولة لكل مستخدم.
          </p>
        </div>
      </div>
    </aside>
  );
};
