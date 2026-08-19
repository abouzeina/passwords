'use client';

import React, { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { AccountCard, VaultItemData } from '@/components/AccountCard';
import { AccountModal } from '@/components/AccountModal';
import { AccountDetailsModal } from '@/components/AccountDetailsModal';
import { WorkspaceModal } from '@/components/WorkspaceModal';
import { ImportModal } from '@/components/ImportModal';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import {
  Shield,
  Layers,
  Search,
  PlusCircle,
  Folder,
  Loader2,
  FolderOpen,
  CheckCircle2,
  Upload,
  Sparkles,
} from 'lucide-react';

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Unauthorized');
    return res.json();
  });

export default function DashboardPage() {
  const router = useRouter();

  const { data: userData, error: userError } = useSWR('/api/auth/me', fetcher);
  const {
    data: vaultData,
    error: vaultError,
    mutate: mutateVault,
  } = useSWR('/api/vault', fetcher, {
    refreshInterval: 3000,
    revalidateOnFocus: true,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('ALL');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mobileTab, setMobileTab] = useState('vault');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItemData | null>(null);
  const [detailsItem, setDetailsItem] = useState<VaultItemData | null>(null);
  const [isWsModalOpen, setIsWsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Toast state
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  useEffect(() => {
    if (userError || (vaultError && vaultError.message === 'Unauthorized')) {
      router.push('/');
    }
  }, [userError, vaultError, router]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const items: VaultItemData[] = vaultData?.items || [];
  const workspaces = vaultData?.workspaces || [];

  // Filter accounts
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Workspace filter
      const matchesWs =
        activeWorkspaceId === 'ALL' || item.workspaceId === activeWorkspaceId;

      // Category filter
      let matchesCat = true;
      if (activeCategory === 'FAVORITES') {
        matchesCat = Boolean(item.isFavorite);
      } else if (activeCategory !== 'ALL') {
        matchesCat = item.category === activeCategory;
      }

      if (!matchesWs || !matchesCat) return false;

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const searchable = [
        item.name,
        item.username,
        item.category,
        item.notes || '',
        ...(item.urls || []),
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(q);
    });
  }, [items, activeWorkspaceId, activeCategory, searchQuery]);

  // Save/Edit Account
  const handleSaveAccount = async (payload: Partial<VaultItemData>) => {
    if (payload.id) {
      const res = await fetch(`/api/vault/${payload.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        mutateVault();
        showToast('تم تحديث بيانات الحساب بنجاح 🔒');
      }
    } else {
      const res = await fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        mutateVault();
        showToast('تمت إضافة الحساب الجديد بنجاح 🛡️');
      }
    }
  };

  // Immediate Optimistic Delete
  const handleDeleteAccount = async (id: string, name: string) => {
    const confirmed = window.confirm(`هل أنت متأكد من رغبتك في حذف "${name}" نهائياً من السيرفر؟`);
    if (!confirmed) return;

    mutateVault(
      (current: any) => ({
        ...current,
        items: (current?.items || []).filter((i: VaultItemData) => i.id !== id),
      }),
      false
    );

    showToast('تم حذف الحساب بنجاح 🗑️');

    try {
      const res = await fetch(`/api/vault/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        mutateVault();
      }
    } catch (e) {
      mutateVault();
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (item: VaultItemData) => {
    const nextFav = !item.isFavorite;
    mutateVault(
      (current: any) => ({
        ...current,
        items: (current?.items || []).map((i: VaultItemData) =>
          i.id === item.id ? { ...i, isFavorite: nextFav } : i
        ),
      }),
      false
    );

    await fetch(`/api/vault/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFavorite: nextFav }),
    });

    mutateVault();
  };

  // Create Workspace
  const handleSaveWorkspace = async (name: string, desc?: string) => {
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, desc }),
    });
    if (res.ok) {
      mutateVault();
      showToast('تم إنشاء مساحة العمل بنجاح 📁');
    }
  };

  const activeWsObj = workspaces.find((w: any) => w.id === activeWorkspaceId);

  return (
    <div className="min-h-screen bg-vault-bg flex flex-col pb-24 lg:pb-8">
      {/* Top Header */}
      <Header
        user={userData?.user}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenAddModal={() => {
          setEditingItem(null);
          setIsAddModalOpen(true);
        }}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 items-start">
        {/* Sidebar */}
        <Sidebar
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onSelectWorkspace={setActiveWorkspaceId}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          totalCount={items.length}
          favCount={items.filter((i) => i.isFavorite).length}
          onOpenCreateWorkspace={() => setIsWsModalOpen(true)}
          onOpenImportModal={() => setIsImportModalOpen(true)}
        />

        {/* Center Main Dashboard Cards */}
        <main className="flex-1 w-full flex flex-col gap-6">
          {/* Active Workspace Banner */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold flex-shrink-0 shadow-glow">
                {activeWorkspaceId === 'ALL' ? (
                  <Layers className="w-7 h-7" />
                ) : (
                  <Folder className="w-7 h-7" />
                )}
              </div>
              <div>
                <h2 className="font-black text-xl md:text-2xl text-white">
                  {activeWorkspaceId === 'ALL'
                    ? 'جميع الحسابات (كل المساحات)'
                    : activeWsObj?.name || 'مساحة العمل'}
                </h2>
                <p className="text-xs md:text-sm text-slate-300 font-semibold mt-1">
                  {activeWorkspaceId === 'ALL'
                    ? 'إدارة جميع كلمات مرورك وحساباتك المسجلة عبر قاعدة البيانات السحابية.'
                    : activeWsObj?.desc || 'مساحة عمل مخصصة لتنظيم الحسابات.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setIsAddModalOpen(true);
              }}
              className="hidden sm:inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-extrabold px-5 py-3 rounded-2xl shadow-glow transition active:scale-95 flex-shrink-0"
            >
              <PlusCircle className="w-5 h-5" />
              <span>إضافة حساب</span>
            </button>
          </div>

          {/* Accounts Grid */}
          {!vaultData && !vaultError ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-sm md:text-base text-slate-300 font-bold">جاري جلب بيانات الخزنة السحابية...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 md:p-14 flex flex-col items-center justify-center text-center gap-6 border border-slate-800">
              <div className="w-20 h-20 rounded-3xl bg-blue-600/15 text-blue-400 flex items-center justify-center shadow-glow">
                <FolderOpen className="w-10 h-10" />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="font-black text-xl md:text-2xl text-white">لا توجد حسابات مسجلة في السحابة حالياً</h3>
                <p className="text-sm md:text-base text-slate-300 max-w-md font-medium leading-relaxed">
                  إذا كنت قد سجلت حسابات مسبقاً على هذا المتصفح، يمكنك استيرادها فوراً بنقرة واحدة!
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm md:text-base font-extrabold px-6 py-3.5 rounded-2xl shadow-glow transition active:scale-95"
                >
                  <Upload className="w-5 h-5" />
                  <span>استيراد الحسابات القديمة</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setIsAddModalOpen(true);
                  }}
                  className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-sm md:text-base font-extrabold px-6 py-3.5 rounded-2xl shadow-emerald-glow transition active:scale-95"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>إضافة أول حساب جديد</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredItems.map((item) => (
                <AccountCard
                  key={item.id}
                  item={item}
                  onEdit={(it) => {
                    setEditingItem(it);
                    setIsAddModalOpen(true);
                  }}
                  onDelete={handleDeleteAccount}
                  onToggleFavorite={handleToggleFavorite}
                  onShowDetails={(it) => setDetailsItem(it)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Account Add/Edit Modal */}
      <AccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveAccount}
        initialData={editingItem}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
      />

      {/* Account Details Popup */}
      <AccountDetailsModal
        item={detailsItem}
        isOpen={Boolean(detailsItem)}
        onClose={() => setDetailsItem(null)}
        onEdit={(it) => {
          setDetailsItem(null);
          setEditingItem(it);
          setIsAddModalOpen(true);
        }}
        onDelete={(id, name) => {
          setDetailsItem(null);
          handleDeleteAccount(id, name);
        }}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* Custom Workspace Creator Modal */}
      <WorkspaceModal
        isOpen={isWsModalOpen}
        onClose={() => setIsWsModalOpen(false)}
        onSave={handleSaveWorkspace}
      />

      {/* Bulk Import / Migration Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={(count) => {
          mutateVault();
          showToast(`تم استيراد ${count} حساب بنجاح إلى الخزنة السحابية! 🎉`);
        }}
      />

      {/* Mobile Floating Bottom Navigation */}
      <MobileBottomNav
        onOpenAddModal={() => {
          setEditingItem(null);
          setIsAddModalOpen(true);
        }}
        activeTab={mobileTab}
        onSelectTab={(tab) => {
          setMobileTab(tab);
          if (tab === 'favorites') {
            setActiveCategory('FAVORITES');
          } else if (tab === 'vault') {
            setActiveCategory('ALL');
            setActiveWorkspaceId('ALL');
          }
        }}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-slate-100 border border-slate-700 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-sm font-bold animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
