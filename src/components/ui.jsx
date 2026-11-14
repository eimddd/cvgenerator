import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { dateProblem, typedDate } from '../lib/dates';

const VARIANTS = {
  primary: 'bg-brand text-white hover:bg-[#162d4a] shadow-sm',
  secondary: 'bg-white text-ink border border-slate-300 hover:bg-slate-50 shadow-sm',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-white text-red-700 border border-red-200 hover:bg-red-50',
};

export function Button({ variant = 'secondary', className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export const Input = ({ className = '', ...props }) => <input dir="auto" className={`${inputClass} ${className}`} {...props} />;
// Digits only; the slashes appear by themselves, with a small warning if the date can't exist.
export function DateInput({ value, onChange, allowYear = false, className = inputClass, warning = 'Invalid date (DD/MM/YYYY)', onBlur, ...props }) {
  const [left, setLeft] = useState(false);
  const bad = dateProblem(value || '', allowYear, left);
  return (
    <div>
      <input
        {...props} dir="ltr" inputMode="numeric" autoComplete="off" aria-invalid={bad}
        className={className} value={value ?? ''}
        onChange={(e) => { setLeft(false); onChange(typedDate(e.target.value, allowYear)); }}
        onBlur={(e) => { setLeft(true); onBlur?.(e); }}
      />
      {bad && <p className="mt-0.5 text-xs text-amber-700" role="alert">{warning}</p>}
    </div>
  );
}
export const Textarea = ({ className = '', ...props }) => <textarea dir="auto" rows={3} className={`${inputClass} ${className}`} {...props} />;
export const Select = ({ children, ...props }) => (
  <select className={inputClass} {...props}>
    {children}
  </select>
);

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand" />
      {label}
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <p className="font-medium text-ink">{title}</p>
      {children && <div className="mt-2 text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// Technical messages from the database or the network, said in plain French.
const PLAIN = [
  [/schema cache|does not exist|relation .* not found|client_id/i, 'The database is not up to date', 'An update is missing in Supabase. Run the SQL in supabase/migrations in the Supabase SQL Editor, then try again.'],
  [/failed to fetch|networkerror|load failed|network request failed/i, 'No connection', 'The server can’t be reached. Check your internet connection, then try again.'],
  [/jwt|not authenticated|invalid claim|refresh token/i, 'Session expired', 'Sign in again, then try again. Your unsaved changes are still on screen.'],
  [/row-level security|permission denied/i, 'Access denied', 'Your account is not allowed to do this.'],
  [/duplicate key/i, 'Already exists', 'Something with this name already exists.'],
];
export function plainError(error) {
  const raw = String(error?.message || error || '');
  const hit = PLAIN.find(([re]) => re.test(raw));
  return hit ? { title: hit[1], text: hit[2], raw } : { title: null, text: raw, raw: null };
}

export function ErrorNote({ error }) {
  if (!error) return null;
  const { title, text, raw } = plainError(error);
  return (
    <div role="alert" className="mb-4 flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true"><path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm-.9 4.5h1.8v5.5H9.1V6Zm0 7h1.8v1.8H9.1V13Z" /></svg>
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <p>{text}</p>
        {raw && (
          <details className="mt-1 text-xs text-red-700/80">
            <summary className="cursor-pointer select-none">Technical details</summary>
            <code className="mt-1 block break-words" dir="ltr">{raw}</code>
          </details>
        )}
      </div>
    </div>
  );
}

export function Modal({ title, onClose, children, footer, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-16" onMouseDown={onClose}>
      <div className={`w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-xl bg-white shadow-xl`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">✕</button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');
