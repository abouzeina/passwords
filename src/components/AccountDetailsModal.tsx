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
  Share2,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-700/80 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg"
              style={{ backgroundColor: brand.color }}
            >
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-100">{item.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-md border border-slate-700">
                  {item.workspace?.name || 'الخزنة الشخصية'}
                </span>
                <span className="text-xs bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded-md border border-blue-500/20">
                  {item.category}
                </span>
              </div>
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

        {/* Details Content */}
        <div className="flex flex-col gap-4 mt-5">
          {/* Username Field */}
          <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-[11px] font-semibold text-slate-400">اسم المستخدم / الإيميل</p>
                <p className="text-sm font-semibold text-slate-100 select-all">{item.username}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyUsername}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition"
            >
              {copiedUser ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Password Field */}
          <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-[11px] font-semibold text-slate-400">كلمة المرور</p>
                <p className="text-sm font-mono text-slate-100 tracking-wider select-all">
                  {showPassword ? item.password : '••••••••••••'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleCopyPassword}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition"
              >
                {copiedPass ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* URLs list */}
          {item.urls && item.urls.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-slate-400">الروابط المسجلة:</p>
              {item.urls.map((u, i) => (
                <div
                  key={i}
                  className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between gap-2"
                >
                  <span className="text-xs font-mono text-slate-300 truncate select-all">{u}</span>
                  <a
                    href={u.startsWith('http') ? u : `https://${u}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 flex-shrink-0"
                  >
                    <span>فتح</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <FileText className="w-3.5 h-3.5" />
                <span>الملاحظات:</span>
              </div>
              <p className="text-xs text-slate-200 whitespace-pre-wrap">{item.notes}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleCopyAll}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition"
            >
              {copiedAll ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>نسخ الكود المنسق</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(item);
              }}
              className="w-10 h-10 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl flex items-center justify-center transition"
              title="تعديل"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete(item.id, item.name);
              }}
              className="w-10 h-10 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center transition"
              title="حذف"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
