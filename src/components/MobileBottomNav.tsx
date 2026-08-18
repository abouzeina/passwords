'use client';

import React from 'react';
import { Shield, Layers, Plus, Sparkles, User } from 'lucide-react';

interface MobileBottomNavProps {
  onOpenAddModal: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenAddModal,
  activeTab,
  onSelectTab,
}) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pb-3 pt-1 pointer-events-none">
      <div className="glass-panel rounded-2xl p-1.5 flex items-center justify-around shadow-2xl border border-slate-700/80 pointer-events-auto max-w-md mx-auto">
        <button
          type="button"
          onClick={() => onSelectTab('vault')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
            activeTab === 'vault' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Shield className="w-5 h-5" />
          <span className="text-[10px]">الخزنة</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('workspaces')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
            activeTab === 'workspaces' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px]">المساحات</span>
        </button>

        {/* Center Floating Plus Button */}
        <button
          type="button"
          onClick={onOpenAddModal}
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-emerald-glow -mt-5 transition active:scale-90"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('favorites')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
            activeTab === 'favorites' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px]">المفضلة</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('profile')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
            activeTab === 'profile' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">حسابي</span>
        </button>
      </div>
    </div>
  );
};
