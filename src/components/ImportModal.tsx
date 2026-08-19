'use client';

import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertTriangle, Loader2, Sparkles, Database } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [localFoundCount, setLocalFoundCount] = useState<number | null>(null);
  const [localItemsToImport, setLocalItemsToImport] = useState<any[]>([]);
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Scan localStorage on open
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    const found: any[] = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        if (
          key.includes('vault') ||
          key.includes('account') ||
          key.includes('safevault')
        ) {
          const val = localStorage.getItem(key);
          if (!val) continue;

          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) {
              for (const item of parsed) {
                if (item && (item.name || item.title) && (item.password || item.username)) {
                  found.push({
                    name: item.name || item.title,
                    username: item.username || item.email || item.user || '',
                    password: item.password || item.pass || '',
                    urls: Array.isArray(item.urls) ? item.urls : item.url ? [item.url] : [],
                    category: item.category || 'أخرى',
                    notes: item.notes || '',
                    isFavorite: Boolean(item.isFavorite),
                  });
                }
              }
            }
          } catch (e) {
            // Not plain JSON
          }
        }
      }
    } catch (e) {
      console.warn('Scan storage error:', e);
    }

    setLocalItemsToImport(found);
    setLocalFoundCount(found.length);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleImportLocal = async () => {
    if (localItemsToImport.length === 0) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/vault/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: localItemsToImport }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'حدث خطأ أثناء الاستيراد');
        setLoading(false);
        return;
      }

      onSuccess(data.importedCount || localItemsToImport.length);
      onClose();
    } catch (e: any) {
      setError(e.message || 'تعذر استيراد البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleImportJson = async () => {
    if (!jsonText.trim()) {
      setError('يرجى لصق بيانات JSON أو اختيار ملف.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const parsed = JSON.parse(jsonText);
      const itemsToImport = Array.isArray(parsed) ? parsed : parsed.items || [];

      if (!Array.isArray(itemsToImport) || itemsToImport.length === 0) {
        setError('تنسيق ملف JSON غير صحيح أو لا يحتوي على حسابات.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/vault/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToImport }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'حدث خطأ أثناء الاستيراد');
        setLoading(false);
        return;
      }

      onSuccess(data.importedCount || itemsToImport.length);
      onClose();
    } catch (e: any) {
      setError('خطأ في قراءة نص الـ JSON: ' + (e.message || 'تأكد من صحة التنسيق'));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setJsonText(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg glass-panel rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-700/80 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-xl text-white">استيراد ونقل الحسابات</h3>
              <p className="text-xs md:text-sm text-slate-400 mt-0.5">استرجع بياناتك القديمة إلى الخزنة السحابية</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm font-semibold flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Option 1: Auto Browser LocalStorage */}
        {localFoundCount !== null && localFoundCount > 0 ? (
          <div className="mb-6 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col gap-3">
            <div className="flex items-center gap-3 text-emerald-400 font-bold text-base">
              <Sparkles className="w-5 h-5" />
              <span>تم العثور على {localFoundCount} حساب محفوظ في متصفحك!</span>
            </div>
            <p className="text-xs md:text-sm text-slate-300">
              يمكنك نقل كل هذه الحسابات مباشرة إلى قاعدة بياناتك السحابية الجديدة بضغطة زر واحدة.
            </p>
            <button
              type="button"
              disabled={loading}
              onClick={handleImportLocal}
              className="mt-2 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-sm md:text-base flex items-center justify-center gap-2 shadow-emerald-glow transition active:scale-98"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              <span>استيراد {localFoundCount} حساب الآن</span>
            </button>
          </div>
        ) : null}

        {/* Option 2: Upload or Paste JSON */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-200">
              أو استيراد من ملف نسخة احتياطية (JSON):
            </label>
            <label className="cursor-pointer text-xs md:text-sm font-bold text-blue-400 hover:text-blue-300 underline">
              اختر ملف من جهازك
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder="الصق نص ملف JSON هنا أو اضغط 'اختر ملف من جهازك'..."
            rows={5}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-xs md:text-sm font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
          />

          <button
            type="button"
            disabled={loading || !jsonText.trim()}
            onClick={handleImportJson}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm md:text-base flex items-center justify-center gap-2 shadow-glow transition active:scale-98"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            <span>استيراد الملف</span>
          </button>
        </div>
      </div>
    </div>
  );
};
