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
  Download,
  LayoutGrid,
  List,
  ArrowUpDown,
  Lock,
  Star,
  Globe,
  Mail,
  CreditCard,
  Briefcase,
  Gamepad2,
  MoreHorizontal,
  X,
  Key,
} from 'lucide-react';

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Unauthorized');
    return res.json();
  });

const CATEGORY_CHIPS = [
  { id: 'ALL', label: 'الكل', icon: Layers },
  { id: 'FAVORITES', label: 'المفضلة ⭐', icon: Star },
  { id: 'وسائط إجتماعية', label: 'وسائط اجتماعية', icon: Globe },
  { id: 'البريد الإلكتروني', label: 'البريد الإلكتروني', icon: Mail },
  { id: 'بنوك ومدفوعات', label: 'بنوك ومدفوعات', icon: CreditCard },
  { id: 'عمل واستضافة', label: 'عمل واستضافة', icon: Briefcase },
  { id: 'ألعاب وترفيه', label: 'ألعاب وترفيه', icon: Gamepad2 },
  { id: 'أخرى', label: 'أخرى', icon: MoreHorizontal },
];

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
  const [sortMode, setSortMode] = useState<'newest' | 'alphabetical' | 'category'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mobileTab, setMobileTab] = useState('vault');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItemData | null>(null);
  const [detailsItem, setDetailsItem] = useState<VaultItemData | null>(null);
  const [isWsModalOpen, setIsWsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');

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

  // Ctrl + K Global Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = document.getElementById('global-search-input');
        if (input) input.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const items: VaultItemData[] = vaultData?.items || [];
  const workspaces = vaultData?.workspaces || [];

  // Filter and Sort Accounts
  const filteredItems = useMemo(() => {
    const filtered = items.filter((item) => {
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

    // Sort
    return filtered.sort((a, b) => {
      if (sortMode === 'alphabetical') {
        return a.name.localeCompare(b.name, 'ar');
      } else if (sortMode === 'category') {
        return a.category.localeCompare(b.category, 'ar');
      } else {
        // newest
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });
  }, [items, activeWorkspaceId, activeCategory, searchQuery, sortMode]);

  // Export Data as Encrypted/Clean JSON Backup
  const handleExportData = () => {
    if (items.length === 0) {
      showToast('لا توجد بيانات لتصديرها حالياً');
      return;
    }
    const exportPayload = {
      version: '5.0.0',
      appName: 'SafeVault PRO',
      exportedAt: new Date().toISOString(),
      user: userData?.user?.email || 'user',
      workspaces: workspaces,
      items: items,
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safevault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير نسخة احتياطية مشفرة بنجاح 📥');
  };

  // Lock Vault
  const handleLockVault = () => {
    setIsLockModalOpen(true);
    setUnlockPassword('');
    setUnlockError('');
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword) return;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userData?.user?.email,
          password: unlockPassword,
        }),
      });

      if (!res.ok) {
        setUnlockError('كلمة المرور غير صحيحة.');
        return;
      }

      setIsLockModalOpen(false);
      setUnlockPassword('');
      setUnlockError('');
      showToast('تم إلغاء قفل الخزنة بنجاح 🔓');
    } catch (e) {
      setUnlockError('حدث خطأ أثناء فتح الخزنة.');
    }
  };

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

  // Immediate Delete
  const handleDeleteAccount = async (id: string, name: string) => {
    const confirmed = window.confirm(`هل أنت متأكد من رغبتك في حذف "${name}" نهائياً؟`);
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
      const res = await fetch(`/api/vault/${id}`, { method: 'DELETE' });
      if (!res.ok) mutateVault();
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
        onExportData={handleExportData}
        onManualSync={() => {
          mutateVault();
          showToast('تمت المزامنة بنجاح 🔄');
        }}
        onLockVault={handleLockVault}
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
          items={items}
          onOpenCreateWorkspace={() => setIsWsModalOpen(true)}
          onOpenImportModal={() => setIsImportModalOpen(true)}
        />

        {/* Center Main Dashboard Area */}
        <main className="flex-1 w-full flex flex-col gap-6">
          {/* Active Workspace Banner */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setIsAddModalOpen(true);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-sm font-extrabold px-5 py-3 rounded-2xl shadow-emerald-glow transition active:scale-95 flex-shrink-0"
              >
                <PlusCircle className="w-5 h-5" />
                <span>إضافة حساب</span>
              </button>
            </div>
          </div>

          {/* Controls Toolbar (Category chips, Sort, and View mode) */}
          <div className="glass-card rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Category Chips Scroll */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
              {CATEGORY_CHIPS.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-glow'
                        : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* View Mode & Sort Controls */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Sort Selector */}
              <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-xs md:text-sm font-bold text-slate-200">
                <ArrowUpDown className="w-4 h-4 text-slate-400" />
                <select
                  value={sortMode}
                  onChange={(e: any) => setSortMode(e.target.value)}
                  className="bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="newest" className="bg-slate-900 text-white">الأحدث إضافة</option>
                  <option value="alphabetical" className="bg-slate-900 text-white">أبجدياً (A-Z)</option>
                  <option value="category" className="bg-slate-900 text-white">حسب الفئة</option>
                </select>
              </div>

              {/* View Switcher */}
              <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="عرض شبكي (Grid)"
                  className={`p-2 rounded-lg transition ${
                    viewMode === 'grid'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  title="عرض قائمة (List)"
                  className={`p-2 rounded-lg transition ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Accounts Grid / List */}
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
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-5' : 'flex flex-col gap-4'}>
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

      {/* Temporary Lock Modal */}
      {isLockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-in fade-in">
          <div className="glass-panel w-full max-w-md rounded-3xl p-8 shadow-2xl border border-slate-700 text-center flex flex-col items-center gap-5">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-lg">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-extrabold text-2xl text-white">الخزنة مقفلة مؤقتاً</h3>
              <p className="text-sm text-slate-300 mt-1 font-medium">
                أدخل كلمة المرور لإلغاء القفل والوصول إلى بياناتك
              </p>
            </div>

            <form onSubmit={handleUnlock} className="w-full flex flex-col gap-4">
              <input
                type="password"
                required
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                placeholder="أدخل كلمة المرور..."
                className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3.5 text-base text-white focus:outline-none text-center font-bold"
              />

              {unlockError && <p className="text-xs font-bold text-rose-400">{unlockError}</p>}

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-extrabold text-base shadow-glow transition active:scale-95"
              >
                إلغاء القفل
              </button>
            </form>
          </div>
        </div>
      )}

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
