'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  User,
  Globe,
  Plus,
  Trash2,
  Sparkles,
  Shield,
  Star,
  Folder,
  Layers,
  Check,
  RefreshCw,
} from 'lucide-react';
import { VaultItemData } from './AccountCard';

interface Workspace {
  id: string;
  name: string;
}

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<VaultItemData>) => Promise<void>;
  initialData?: VaultItemData | null;
  workspaces: Workspace[];
  activeWorkspaceId: string;
}

const CATEGORY_OPTIONS = [
  'وسائط إجتماعية',
  'البريد الإلكتروني',
  'بنوك ومدفوعات',
  'عمل واستضافة',
  'ألعاب وترفيه',
  'أخرى',
];

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  workspaces,
  activeWorkspaceId,
}) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [urls, setUrls] = useState<string[]>(['']);
  const [category, setCategory] = useState('وسائط إجتماعية');
  const [workspaceId, setWorkspaceId] = useState('');
  const [notes, setNotes] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password Generator State
  const [showGen, setShowGen] = useState(false);
  const [genLength, setGenLength] = useState(16);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setUsername(initialData.username || '');
      setPassword(initialData.password || '');
      setUrls(initialData.urls && initialData.urls.length > 0 ? initialData.urls : ['']);
      setCategory(initialData.category || 'أخرى');
      setWorkspaceId(initialData.workspaceId || (workspaces[0]?.id ?? ''));
      setNotes(initialData.notes || '');
      setIsFavorite(Boolean(initialData.isFavorite));
    } else {
      setName('');
      setUsername('');
      setPassword('');
      setUrls(['']);
      setCategory('وسائط إجتماعية');
      setWorkspaceId(activeWorkspaceId === 'ALL' ? (workspaces[0]?.id ?? '') : activeWorkspaceId);
      setNotes('');
      setIsFavorite(false);
    }
  }, [initialData, isOpen, workspaces, activeWorkspaceId]);

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    let chars = '';
    if (useUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (useLower) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (useNumbers) chars += '0123456789';
    if (useSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz0123456789';

    let result = '';
    const array = new Uint32Array(genLength);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < genLength; i++) {
      result += chars[array[i] % chars.length];
    }

    setPassword(result);
  };

  const handleAddUrl = () => {
    setUrls([...urls, '']);
  };

  const handleUrlChange = (idx: number, val: string) => {
    const next = [...urls];
    next[idx] = val;
    setUrls(next);
  };

  const handleRemoveUrl = (idx: number) => {
    const next = urls.filter((_, i) => i !== idx);
    setUrls(next.length > 0 ? next : ['']);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !password || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSave({
        id: initialData?.id,
        name,
        username,
        password,
        urls: urls.filter((u) => u.trim()),
        category,
        workspaceId: workspaceId || null,
        notes,
        isFavorite,
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password Strength Score
  const getStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score += 25;
    if (pwd.length >= 12) score += 25;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 20;
    if (/\d/.test(pwd)) score += 15;
    if (/[^a-zA-Z\d]/.test(pwd)) score += 15;
    return score;
  };

  const strengthScore = getStrength(password);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-700/80 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                {initialData ? 'تعديل بيانات الحساب' : 'إضافة حساب جديد إلى الخزنة'}
              </h3>
              <p className="text-xs text-slate-400">حفظ مشفر سحابياً</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          {/* Account Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              عنوان الحساب / الخدمة <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: Google, cPanel Elnoor, Facebook..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500/50 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
            />
          </div>

          {/* Workspace & Category Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">مساحة العمل</label>
              <select
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500/50 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-200 focus:outline-none"
              >
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">التصنيف</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500/50 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-200 focus:outline-none"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              اسم المستخدم / البريد الإلكتروني <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="name@example.com أو username"
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500/50 rounded-xl pr-10 pl-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Password & Generator */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                كلمة المرور <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowGen(!showGen);
                  if (!showGen) handleGeneratePassword();
                }}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{showGen ? 'إخفاء المولد' : 'توليد كلمة سر قوية'}</span>
              </button>
            </div>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور أو استخدم المولد..."
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500/50 rounded-xl pr-10 pl-4 py-2.5 text-sm font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
            </div>

            {/* Strength Bar */}
            {password && (
              <div className="mt-2">
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      strengthScore < 40
                        ? 'bg-rose-500'
                        : strengthScore < 75
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${strengthScore}%` }}
                  />
                </div>
              </div>
            )}

            {/* Interactive Password Generator Drawer */}
            {showGen && (
              <div className="mt-3 p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col gap-2.5 animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>طول كلمة السر: {genLength}</span>
                  <input
                    type="range"
                    min="8"
                    max="32"
                    value={genLength}
                    onChange={(e) => {
                      setGenLength(Number(e.target.value));
                      handleGeneratePassword();
                    }}
                    className="w-32 accent-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useUpper}
                      onChange={(e) => setUseUpper(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                    <span>أحرف كبيرة (A-Z)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useNumbers}
                      onChange={(e) => setUseNumbers(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                    <span>أرقام (0-9)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useSymbols}
                      onChange={(e) => setUseSymbols(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                    <span>رموز خاصة (@#$)</span>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="w-full mt-1 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>توليد كلمة سر جديدة</span>
                </button>
              </div>
            )}
          </div>

          {/* Multiple URLs List */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">روابط الموقع أو اللوحة</label>
              <button
                type="button"
                onClick={handleAddUrl}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>إضافة رابط إضافي</span>
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {urls.map((url, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Globe className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => handleUrlChange(idx, e.target.value)}
                      placeholder={idx === 0 ? 'https://example.com' : 'رابط لوحة التحكم أو صفحة الدخول...'}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500/50 rounded-xl pr-9 pl-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none"
                    />
                  </div>
                  {urls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveUrl(idx)}
                      className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              ملاحظات إضافية (اختياري)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: أسئلة الأمان، كود الاسترجاع..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500/50 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none"
            />
          </div>

          {/* Favorite Toggle */}
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="rounded accent-amber-400 w-4 h-4"
            />
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>تثبيت هذا الحساب في المفضلة</span>
            </span>
          </label>

          {/* Submit Actions */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-800 mt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2.5 rounded-xl shadow-glow transition active:scale-95 text-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{initialData ? 'حفظ التعديلات سحابياً' : 'إضافة الحساب للخزنة'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2.5 rounded-xl text-xs transition"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
