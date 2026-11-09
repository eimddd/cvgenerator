import { NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/auth';

const NAV = [
  { to: '/contracts', label: 'Contrats', icon: 'M7 3h7l5 5v13H7z M14 3v5h5 M10 13h6 M10 17h6' },
  { to: '/cvs', label: 'CV', icon: 'M6 3h12v18H6z M12 7.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z M9 16c.6-1.6 1.6-2.5 3-2.5s2.4.9 3 2.5' },];

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export default function Layout() {
  const session = useSession();
  return (
    <div className="min-h-screen md:flex">
      <aside className="no-print border-b border-slate-200 bg-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2.5 px-5 py-4 md:py-6">
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          <div className="leading-tight">
            <div className="font-semibold text-ink">Monvia</div>
            <div className="text-xs text-slate-500">Office Docs</div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition ${isActive ? 'bg-brand-soft text-brand' : 'text-slate-600 hover:bg-slate-100'}`
              }
            >
              <Icon d={n.icon} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden px-5 pt-8 text-xs text-slate-500 md:absolute md:bottom-0 md:block md:w-60 md:pb-5">
          <div className="truncate" title={session?.user?.email}>{session?.user?.email}</div>
          <button type="button" onClick={() => supabase.auth.signOut()} className="mt-2 font-medium text-brand hover:underline">
            Se déconnecter
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <Outlet />
        <div className="no-print px-5 pb-6 text-xs text-slate-400 md:hidden">
          {session?.user?.email} ·{' '}
          <button type="button" onClick={() => supabase.auth.signOut()} className="font-medium text-brand">Se déconnecter</button>
        </div>
      </main>
    </div>
  );
}
