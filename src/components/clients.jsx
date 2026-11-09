import { useEffect, useMemo, useRef, useState } from 'react';
import { listClients, saveClient } from '../lib/db';
import { Button, Field, Input, Modal, Select, Textarea, ErrorNote } from './ui';

export const EMPTY_CLIENT = { full_name: '', gender: 'm', cin: '', birth_date: '', birth_place: '', nationality: '', job: '', address: '', phone: '', email: '', notes: '' };

export function ClientForm({ client, onSaved, onClose }) {
  const [c, setC] = useState({ ...EMPTY_CLIENT, ...client });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setC({ ...c, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(null);
    try { onSaved(await saveClient(c)); } catch (err) { setError(err); setBusy(false); }
  }

  return (
    <Modal
      title={c.id ? 'Modifier le client' : 'Nouveau client'}
      onClose={onClose}
      wide
      footer={<><Button onClick={onClose}>Annuler</Button><Button variant="primary" type="submit" form="client-form" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</Button></>}
    >
      <form id="client-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <ErrorNote error={error} />
        <Field label="Nom complet (tel qu’il doit apparaître sur les documents)" className="sm:col-span-2">
          <Input required autoFocus value={c.full_name} onChange={set('full_name')} />
        </Field>
        <Field label="Civilité">
          <Select value={c.gender} onChange={set('gender')}>
            <option value="m">Monsieur — السيد</option>
            <option value="f">Madame — السيدة</option>
          </Select>
        </Field>
        <Field label="N° CIN"><Input dir="ltr" value={c.cin} onChange={set('cin')} /></Field>
        <Field label="Date de naissance"><Input value={c.birth_date} onChange={set('birth_date')} placeholder="jj/mm/aaaa" /></Field>
        <Field label="Lieu de naissance"><Input value={c.birth_place} onChange={set('birth_place')} /></Field>
        <Field label="Nationalité"><Input value={c.nationality} onChange={set('nationality')} /></Field>
        <Field label="Profession"><Input value={c.job} onChange={set('job')} /></Field>
        <Field label="Adresse" className="sm:col-span-2"><Input value={c.address} onChange={set('address')} /></Field>
        <Field label="Téléphone"><Input dir="ltr" value={c.phone} onChange={set('phone')} /></Field>
        <Field label="E-mail"><Input dir="ltr" type="email" value={c.email} onChange={set('email')} /></Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea value={c.notes} onChange={set('notes')} /></Field>
      </form>
    </Modal>
  );
}

// Searchable client selector with an inline "new client" action.
export function ClientPicker({ value, onChange, placeholder = 'Choisir un client…', allowCreate = true, compact = false }) {
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const box = useRef(null);

  useEffect(() => { listClients().then(setClients).catch(() => {}); }, []);
  useEffect(() => {
    const close = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const selected = clients.find((c) => c.id === value) || (value && value.id ? value : null);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (s ? clients.filter((c) => [c.full_name, c.cin, c.phone].some((v) => v && v.toLowerCase().includes(s))) : clients).slice(0, 50);
  }, [clients, q]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white text-start text-sm hover:border-slate-400 ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'}`}
      >
        <span className={`truncate ${selected ? 'text-ink' : 'text-slate-400'}`} dir="auto">
          {selected ? `${selected.full_name}${selected.cin ? ` — ${selected.cin}` : ''}` : placeholder}
        </span>
        <span className="text-slate-400">▾</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-64 rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <input autoFocus dir="auto" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (nom, CIN, téléphone)" className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm focus:border-brand focus:outline-none" />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1 text-sm">
            {shown.map((c) => (
              <li key={c.id}>
                <button type="button" className="flex w-full items-center justify-between gap-3 px-3 py-2 text-start hover:bg-slate-50" onClick={() => { onChange(c); setOpen(false); setQ(''); }}>
                  <span dir="auto" className="truncate">{c.full_name}</span>
                  <span className="shrink-0 text-xs text-slate-400" dir="ltr">{c.cin}</span>
                </button>
              </li>
            ))}
            {!shown.length && <li className="px-3 py-3 text-slate-400">Aucun client trouvé</li>}
          </ul>
          {allowCreate && (
            <div className="border-t border-slate-100 p-2">
              <button type="button" onClick={() => { setCreating(true); setOpen(false); }} className="w-full rounded-md px-2 py-1.5 text-start text-sm font-medium text-brand hover:bg-brand-soft">
                + Nouveau client{q ? ` « ${q} »` : ''}
              </button>
            </div>
          )}
        </div>
      )}
      {creating && (
        <ClientForm
          client={{ full_name: q }}
          onClose={() => setCreating(false)}
          onSaved={(c) => { setClients([...clients, c]); onChange(c); setCreating(false); setQ(''); }}
        />
      )}
    </div>
  );
}
