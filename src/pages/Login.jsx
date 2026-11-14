import { useState } from 'react';
import { setRemember, supabase } from '../lib/supabase';
import { Button, Field, Input, ErrorNote } from '../components/ui';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [remember, setRememberBox] = useState(true);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(null); setNotice('');
    setRemember(remember);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message);
  }

  async function reset() {
    if (!email) return setError('Enter your email, then click “Forgot password?” again.');
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/reset-password` });
    if (error) setError(error.message);
    else setNotice('We sent you an email with a link to choose a new password.');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="h-10 w-10" />
          <div>
            <h1 className="text-lg font-semibold text-ink">Monvia Office Docs</h1>
            <p className="text-sm text-slate-500">Office staff only</p>
          </div>
        </div>
        <ErrorNote error={error} />
        {notice && <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
        <div className="space-y-4">
          <Field label="Email">
            <Input type="email" dir="ltr" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password">
            <Input type="password" dir="ltr" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={remember} onChange={(e) => setRememberBox(e.target.checked)} className="h-4 w-4 accent-brand" />
            Stay signed in on this device
          </label>
          <Button type="submit" variant="primary" className="w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
          <button type="button" onClick={reset} className="w-full text-center text-sm text-slate-500 hover:text-brand">
            Forgot password?
          </button>
        </div>
      </form>
    </div>
  );
}

export function ResetPassword() {
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  async function submit(e) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else setDone(true);
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="text-lg font-semibold text-ink">New password</h1>
        <ErrorNote error={error} />
        {done ? (
          <p className="text-sm text-slate-600">Password saved. <a href="/" className="font-medium text-brand">Continue</a></p>
        ) : (
          <>
            <Field label="New password (at least 8 characters)">
              <Input type="password" dir="ltr" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Button type="submit" variant="primary" className="w-full">Save</Button>
          </>
        )}
      </form>
    </div>
  );
}

export function SetupNeeded() {
  return (
    <div className="mx-auto max-w-xl px-6 py-20 text-sm leading-6 text-slate-700">
      <h1 className="mb-3 text-xl font-semibold text-ink">Supabase settings missing</h1>
      <p>Create a <code className="rounded bg-slate-200 px-1">.env.local</code> file in the project folder with:</p>
      <pre className="mt-3 rounded-lg bg-slate-900 p-4 text-slate-100">{'VITE_SUPABASE_URL=https://xxxx.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJ...'}</pre>
      <p className="mt-3">Then restart the development server.</p>
    </div>
  );
}
