import { supabase } from './supabase';

const PAGE = 50;

async function run(query) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

// ---------- clients ----------
// commas and parentheses would break the PostgREST or() filter syntax
const clean = (q) => q.replace(/[,()%*]/g, ' ').trim();

export const listClients = (q = '') => {
  q = clean(q);
  let query = supabase.from('clients').select('*').order('full_name');
  if (q) query = query.or(`full_name.ilike.%${q}%,cin.ilike.%${q}%,phone.ilike.%${q}%`);
  return run(query.limit(500));
};
export const getClient = (id) => run(supabase.from('clients').select('*').eq('id', id).single());
export const saveClient = (client) => {
  const { id, created_at, updated_at, created_by, ...rest } = client;
  return id
    ? run(supabase.from('clients').update(rest).eq('id', id).select().single())
    : run(supabase.from('clients').insert(rest).select().single());
};

// ---------- contracts ----------
// saved contracts are deleted by the database after this many days (pg_cron job in supabase/schema.sql)
export const KEEP_DAYS = 30;
const CONTRACT_COLS = 'id, template_id, template_title, category, lang, title, created_at, updated_at';

export function listContracts({ q, category, templateId, from, to, page = 0 } = {}) {
  q = q && clean(q);
  let query = supabase.from('contracts').select(CONTRACT_COLS).order('created_at', { ascending: false });
  if (q) query = query.ilike('search_text', `%${q}%`);
  if (category) query = query.eq('category', category);
  if (templateId) query = query.eq('template_id', templateId);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lt('created_at', nextDay(to));
  return run(query.range(page * PAGE, page * PAGE + PAGE - 1));
}
export const getContract = (id) => run(supabase.from('contracts').select('*').eq('id', id).single());
export const saveContract = (contract) => {
  const { id, created_at, updated_at, created_by, ...rest } = contract;
  return id
    ? run(supabase.from('contracts').update(rest).eq('id', id).select().single())
    : run(supabase.from('contracts').insert(rest).select().single());
};
export const deleteContract = (id) => run(supabase.from('contracts').delete().eq('id', id));

// ---------- CVs ----------
export function listCvs({ q, clientId, page = 0 } = {}) {
  let query = supabase.from('cvs').select('id, client_id, lang, title, created_at, updated_at, clients(full_name)').order('created_at', { ascending: false });
  if (q) query = query.ilike('title', `%${q}%`);
  if (clientId) query = query.eq('client_id', clientId);
  return run(query.range(page * PAGE, page * PAGE + PAGE - 1));
}
export const getCv = (id) => run(supabase.from('cvs').select('*, clients(*)').eq('id', id).single());
export const saveCv = (cv) => {
  const { id, clients, created_at, updated_at, created_by, ...rest } = cv;
  return id
    ? run(supabase.from('cvs').update(rest).eq('id', id).select().single())
    : run(supabase.from('cvs').insert(rest).select().single());
};
export const deleteCv = (id) => run(supabase.from('cvs').delete().eq('id', id));

export const PAGE_SIZE = PAGE;

function nextDay(date) {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
