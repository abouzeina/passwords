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
} from 'lucide-react';

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Unauthorized');
    return res.json();
  });

export default function DashboardPage() {
  const router = useRouter();

  // SWR Data Fetching with 4-second refreshInterval for multi-device realtime updates
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

  // Toast state
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
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
      // Edit
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
      // Create
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

    // 1. Optimistically update local UI immediately
    mutateVault(
      (current: any) => ({
        ...current,
        items: (current?.items || []).filter((i: VaultItemData) => i.id !== id),
      }),
      false
    );

    showToast('تم حذف الحساب بنجاح 🗑️');

    // 2. Execute deletion on database
    try {
      const res = await fetch(`/api/vault/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        mutateVault(); // Rollback if server error
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
    <div className="min-h-screen bg-vault-bg flex flex-col pb-20 lg:pb-6">
      {/* Top Header */}
      <Header
        user={userData?.user}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenAddModal={() => {
          setEditingItem(null);
          setIsAddModalOpen(true);
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 flex flex-col lg:flex-row gap-6 items-start">
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
        />

        {/* Center Main Dashboard Cards */}
        <main className="flex-1 w-full flex flex-col gap-5">
          {/* Active Workspace Banner */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                {activeWorkspaceId === 'ALL' ? (
                  <Layers className="w-6 h-6" />
                ) : (
                  <Folder className="w-6 h-6" />
                )}
              </div>
              <div>
                <h2 className="font-extrabold text-lg text-slate-100">
                  {activeWorkspaceId === 'ALL'
                    ? 'جميع الحسابات (كل المساحات)'
                    : activeWsObj?.name || 'مساحة العمل'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeWorkspaceId === 'ALL'
                    ? 'عرض وإدارة جميع كلمات مرورك وحساباتك المسجلة عبر قاعدة البيانات السحابية.'
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
              className="hidden sm:inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-glow transition active:scale-95 flex-shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إضافة حساب</span>
            </button>
          </div>

          {/* Accounts Grid */}
          {!vaultData && !vaultError ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-xs text-slate-400 font-semibold">جاري جلب بيانات الخزنة...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 flex flex-col items-center justify-center text-center gap-4 border border-dashed border-slate-800">
              <div className="w-16 h-16 rounded-3xl bg-slate-900 text-slate-500 flex items-center justify-center">
                <FolderOpen className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-200">لا توجد حسابات مسجلة هنا</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  لم تقم بإضافة حسابات بعد في هذا التصنيف أو مساحة العمل. ابدأ بإضافة حسابك الأول!
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setIsAddModalOpen(true);
                }}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-emerald-glow transition active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>إضافة أول حساب الآن</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-slate-100 border border-slate-700 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
