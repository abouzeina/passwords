'use client';

import React, { useState } from 'react';
import {
  X,
  Key,
  User,
  ExternalLink,
  Copy,
  Check,
  Star,
  Edit2,
  Trash2,
  Folder,
  FileText,
  Eye,
  EyeOff,
} from 'lucide-react';
import { VaultItemData } from './AccountCard';
import { getBrandInfo } from '@/lib/utils';

interface AccountDetailsModalProps {
  item: VaultItemData | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (item: VaultItemData) => void;
  onDelete: (id: string, name: string) => void;
  onToggleFavorite: (item: VaultItemData) => void;
}

export const AccountDetailsModal: React.FC<AccountDetailsModalProps> = ({
  item,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  if (!isOpen || !item) return null;

  const brand = getBrandInfo(item.name, item.urls[0] || '', item.category);

  const handleCopyUsername = () => {
    navigator.clipboard.writeText(item.username);
    setCopiedUser(true);
    setTimeout(() => setCopiedUser(false), 2000);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(item.password);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  const handleCopyAll = () => {
    const urlsText = item.urls.length > 0 ? item.urls.join('\n') + '\n' : '';
    const formatted = `\`\`\`\n${item.name}\n\n${urlsText}username: ${item.username}\npassword: ${item.password}\n\`\`\``;
    navigator.clipboard.writeText(formatted);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-700/80 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-5 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white shadow-xl"
              style={{ backgroundColor: brand.color }}
            >
              <Key className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-extrabold text-xl md:text-2xl text-white">{item.name}</h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs bg-slate-800 text-slate-200 px-3 py-1 rounded-lg border border-slate-700 font-bold">
                  {item.workspace?.name || 'الخزنة الشخصية'}
                </span>
                <span className="text-xs bg-blue-500/15 text-blue-300 font-bold px-3 py-1 rounded-lg border border-blue-500/30">
                  {item.category}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Credentials Details */}
        <div className="flex flex-col gap-4 mt-5">
          {/* Username */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between mb-1 text-xs text-slate-400 font-bold">
              <span>اسم المستخدم / البريد</span>
              <button
                type="button"
                onClick={handleCopyUsername}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold text-xs"
              >
                {copiedUser ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedUser ? 'تم النسخ' : 'نسخ'}</span>
              </button>
            </div>
            <p className="text-base md:text-lg font-bold text-white select-all">{item.username}</p>
          </div>

          {/* Password */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between mb-1 text-xs text-slate-400 font-bold">
              <span>كلمة المرور</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-white flex items-center gap-1 font-bold text-xs"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showPassword ? 'إخفاء' : 'إظهار'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold text-xs"
                >
                  {copiedPass ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedPass ? 'تم النسخ' : 'نسخ'}</span>
                </button>
              </div>
            </div>
            <p className="text-base md:text-lg font-mono font-bold text-white select-all">
              {showPassword ? item.password : '••••••••••••••••'}
            </p>
          </div>

          {/* URLs */}
          {item.urls && item.urls.length > 0 && (
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <span className="block text-xs text-slate-400 font-bold mb-2">الروابط المسجلة</span>
              <div className="flex flex-col gap-2">
                {item.urls.map((u, i) => (
                  <a
                    key={i}
                    href={u.startsWith('http') ? u : `https://${u}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-between text-xs md:text-sm font-semibold text-blue-400 hover:text-blue-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 transition"
                  >
                    <span className="truncate max-w-[280px]">{u}</span>
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <span className="block text-xs text-slate-400 font-bold mb-1">الملاحظات</span>
              <p className="text-sm font-medium text-slate-200 whitespace-pre-wrap">{item.notes}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-5 border-t border-slate-800 mt-5">
          <button
            type="button"
            onClick={handleCopyAll}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition"
          >
            {copiedAll ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>نسخ الكل</span>
          </button>
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition"
          >
            <Edit2 className="w-4 h-4" />
            <span>تعديل</span>
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id, item.name)}
            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold px-4 py-3 rounded-xl text-sm flex items-center justify-center transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
