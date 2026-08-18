import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function escapeHtml(str: string) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function getBrandInfo(name: string = '', url: string = '', category: string = '') {
  const text = (name + ' ' + (url || '')).toLowerCase().trim();

  if (text.includes('google') || text.includes('gmail') || text.includes('drive') || text.includes('youtube')) {
    return { name: 'Google', color: '#ea4335', icon: 'Globe' };
  }
  if (text.includes('github')) {
    return { name: 'GitHub', color: '#8b5cf6', icon: 'Github' };
  }
  if (text.includes('facebook') || text.includes('meta')) {
    return { name: 'Facebook', color: '#1877f2', icon: 'Facebook' };
  }
  if (text.includes('instagram')) {
    return { name: 'Instagram', color: '#e4405f', icon: 'Instagram' };
  }
  if (text.includes('twitter') || text.includes(' x ') || text.endsWith(' x')) {
    return { name: 'X', color: '#ffffff', icon: 'Twitter' };
  }
  if (text.includes('linkedin')) {
    return { name: 'LinkedIn', color: '#0a66c2', icon: 'Linkedin' };
  }
  if (text.includes('apple') || text.includes('icloud')) {
    return { name: 'Apple', color: '#a2aaad', icon: 'Apple' };
  }
  if (text.includes('microsoft') || text.includes('office') || text.includes('outlook')) {
    return { name: 'Microsoft', color: '#00a4ef', icon: 'LayoutGrid' };
  }
  if (text.includes('amazon') || text.includes('aws')) {
    return { name: 'Amazon', color: '#ff9900', icon: 'ShoppingBag' };
  }
  if (text.includes('netflix') || text.includes('spotify') || text.includes('steam')) {
    return { name: 'Entertainment', color: '#e50914', icon: 'Tv' };
  }
  if (text.includes('bank') || text.includes('pay') || text.includes('paypal') || text.includes('stripe') || text.includes('visa')) {
    return { name: 'Banking', color: '#10b981', icon: 'CreditCard' };
  }
  if (text.includes('cpanel') || text.includes('whm') || text.includes('host') || text.includes('server') || text.includes('ssh') || text.includes('vps')) {
    return { name: 'Server', color: '#f59e0b', icon: 'Server' };
  }

  return { name: 'General', color: '#3b82f6', icon: 'Key' };
}
