// The contract templates each person used last (opened, saved or printed), newest first.
// shortcut: kept in this browser per account (no extra Supabase table), so another PC has its own
// list; move it to a table if the office wants it to follow people across computers.
import { useEffect, useState } from 'react';

const MAX = 9;
const key = (userId) => `monvia.recentContracts.${userId || 'anon'}`;
const EVENT = 'monvia-recent';

export function recentTemplates(userId) {
  try {
    const list = JSON.parse(localStorage.getItem(key(userId)) || '[]');
    return Array.isArray(list) ? list.filter((r) => r && typeof r.id === 'string' && typeof r.at === 'number') : [];
  } catch {
    return []; // private window or blocked storage: the section simply stays hidden
  }
}

export function markTemplateUsed(userId, templateId) {
  if (!templateId || templateId === 'new') return;
  const list = [{ id: templateId, at: Date.now() }, ...recentTemplates(userId).filter((r) => r.id !== templateId)].slice(0, MAX * 2);
  try { localStorage.setItem(key(userId), JSON.stringify(list)); } catch { return; }
  window.dispatchEvent(new Event(EVENT));
}

// The list, kept up to date when a contract is used here or in another tab.
export function useRecentTemplates(userId) {
  const [list, setList] = useState(() => recentTemplates(userId));
  useEffect(() => {
    const update = () => setList(recentTemplates(userId));
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener(EVENT, update); window.removeEventListener('storage', update); };
  }, [userId]);
  return list;
}

// "2 hours ago", "yesterday", "3 days ago"
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
export function timeAgo(at, now = Date.now()) {
  const s = Math.round((at - now) / 1000);
  if (s > -45) return 'just now';
  for (const [unit, size] of [['minute', 60], ['hour', 3600], ['day', 86400], ['week', 604800], ['month', 2592000], ['year', 31536000]]) {
    const next = { minute: 3600, hour: 86400, day: 604800, week: 2592000, month: 31536000, year: Infinity }[unit];
    if (-s < next) return rtf.format(Math.round(s / size), unit);
  }
  return rtf.format(Math.round(s / 31536000), 'year');
}
