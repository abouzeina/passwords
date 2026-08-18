'use client';

import React, { useState } from 'react';
import {
  Key,
  User,
  Eye,
  EyeOff,
  Copy,
  Check,
  Star,
  Edit2,
  Trash2,
  ExternalLink,
  ChevronLeft,
  Folder,
  Globe,
  Sparkles,
} from 'lucide-react';
import { getBrandInfo } from '@/lib/utils';

export interface VaultItemData {
  id: string;
  name: string;
  username: string;
  password: string;
  urls: string[];
  category: string;
  notes?: string | null;
  isFavorite: boolean;
  workspaceId?: string | null;
  workspace?: { id: string; name: string; icon: string } | null;
  createdAt?: string;
  updatedAt?: string;
}

interface AccountCardProps {
  item: VaultItemData;
  onEdit: (item: VaultItemData) => void;
  onDelete: (id: string, name: string) => void;
  onToggleFavorite: (item: VaultItemData) => void;
  onShowDetails: (item: VaultItemData) => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  item,
  onEdit,
  onDelete,
  onToggleFavorite,
  onShowDetails,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const brand = getBrandInfo(item.name, item.urls[0] || '', item.category);

  const handleCopyUsername = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.username);
    setCopiedUser(true);
    setTimeout(() => setCopiedUser(false), 2000);
  };

  const handleCopyPassword = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.password);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  const handleCopyAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const urlsText = item.urls.length > 0 ? item.urls.join('\n') + '\n' : '';
    const formatted = `\`\`\`\n${item.name}\n\n${urlsText}username: ${item.username}\npassword: ${item.password}\n\`\`\``;
    navigator.clipboard.writeText(formatted);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div
      onClick={() => onShowDetails(item)}
      className="glass-card rounded-2xl p-5 flex flex-col justify-between gap-4 cursor-pointer relative overflow-hidden group"
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shadow-md flex-shrink-0"
            style={{ backgroundColor: brand.color }}
          >
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-base text-slate-100 group-hover:text-blue-400 transition truncate max-w-[180px]">
              {item.name}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 text-[11px] bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700/50">
                <Folder className="w-3 h-3 text-slate-400" />
                <span>{item.workspace?.name || 'الخزنة الشخصية'}</span>
              </span>
              <span className="text-[11px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-md border border-blue-500/20">
                {item.category}
              </span>
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(item);
            }}
            title={item.isFavorite ? 'إزالة من المفضلة' : 'تثبيت في المفضلة'}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
              item.isFavorite
                ? 'text-amber-400 bg-amber-400/10'
                : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/50'
            }`}
          >
            <Star className={`w-4 h-4 ${item.isFavorite ? 'fill-amber-400' : ''}`} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            title="تعديل"
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800/50 flex items-center justify-center transition"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id, item.name);
            }}
            title="حذف الحساب"
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Credentials Body */}
      <div className="flex flex-col gap-2 bg-slate-950/40 border border-slate-800/60 rounded-xl p-3">
        {/* Username */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <User className="w-3.5 h-3.5" />
            <span>المستخدم</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200 truncate max-w-[150px]">
              {item.username}
            </span>
            <button
              type="button"
              onClick={handleCopyUsername}
              title="نسخ اسم المستخدم"
              className="text-slate-400 hover:text-white transition"
            >
              {copiedUser ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Password */}
        <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-800/50">
          <div className="flex items-center gap-2 text-slate-400">
            <Key className="w-3.5 h-3.5" />
            <span>كلمة السر</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-200 tracking-wider">
              {showPassword ? item.password : '••••••••••••'}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowPassword(!showPassword);
              }}
              title="إظهار/إخفاء"
              className="text-slate-400 hover:text-white transition"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleCopyPassword}
              title="نسخ كلمة المرور"
              className="text-slate-400 hover:text-white transition"
            >
              {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Footer Links & Actions */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-xs">
        <div>
          {item.urls && item.urls.length > 0 && (
            <a
              href={item.urls[0].startsWith('http') ? item.urls[0] : `https://${item.urls[0]}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-semibold bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-lg transition"
            >
              <ExternalLink className="w-3 h-3" />
              <span>فتح الموقع</span>
              {item.urls.length > 1 && (
                <span className="bg-blue-600/40 text-[10px] px-1 rounded-full">
                  +{item.urls.length - 1}
                </span>
              )}
            </a>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyAll}
            className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg text-xs font-semibold transition"
          >
            {copiedAll ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>نسخ الكل</span>
          </button>
          <button
            type="button"
            onClick={() => onShowDetails(item)}
            className="inline-flex items-center gap-0.5 text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg transition text-xs font-medium"
          >
            <span>التفاصيل</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
