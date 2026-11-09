import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// "Rester connecté sur cet appareil": the session lives in localStorage (kept, refreshed
// automatically) or, when unticked, in sessionStorage (gone when the browser closes).
const REMEMBER = 'monvia-remember';
export const setRemember = (on) => localStorage.setItem(REMEMBER, on ? '1' : '0');
const store = () => (localStorage.getItem(REMEMBER) === '0' ? sessionStorage : localStorage);
const storage = {
  getItem: (k) => store().getItem(k),
  setItem: (k, v) => store().setItem(k, v),
  removeItem: (k) => { localStorage.removeItem(k); sessionStorage.removeItem(k); },
};

export const isConfigured = Boolean(url && key);
export const supabase = isConfigured ? createClient(url, key, { auth: { storage, persistSession: true, autoRefreshToken: true } }) : null;
