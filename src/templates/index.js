import { useEffect, useMemo, useState } from 'react';
import list from './generated/index.json';
import { supabase } from '../lib/supabase';

const loaders = import.meta.glob(['./generated/*.json', '!./generated/index.json'], { import: 'default' });

export const templates = list;
export const templateById = Object.fromEntries(list.map((t) => [t.id, t]));
export const categories = [...new Set(list.map((t) => t.category))];

// The template as built from the office's Word file.
export const loadOriginal = (id) => loaders[`./generated/${id}.json`]?.() ?? Promise.reject(new Error('Template not found'));

// The office's edited copy (template editor) wins over the original; imported contracts only exist there.
export async function loadTemplate(id) {
  const { data } = (await supabase?.from('template_edits').select('data').eq('id', id).maybeSingle()) ?? {};
  return data?.data ?? loadOriginal(id);
}

// Imported contracts (ids starting with "u"): only the light columns, for the lists.
let imported = null;
const loadImported = () => (imported ??= supabase
  .from('template_edits').select('id, title:data->>title, category:data->>category, lang:data->>lang, fieldCount:data->>fieldCount')
  .like('id', 'u%').order('updated_at', { ascending: false })
  .then(({ data }) => (data || []).map((t) => ({ ...t, fieldCount: Number(t.fieldCount) || 0 }))));

// Every template for the lists and filters: the imported ones, then the built-in ones.
export function useTemplates() {
  const [extra, setExtra] = useState([]);
  useEffect(() => { let on = true; loadImported().then((r) => on && setExtra(r)); return () => { on = false; }; }, []);
  return useMemo(() => {
    const all = [...extra, ...list];
    return { templates: all, categories: [...new Set(all.map((t) => t.category))] };
  }, [extra]);
}

export async function saveTemplateEdit(template) {
  const { error } = await supabase.from('template_edits').upsert({ id: template.id, data: template });
  if (error) throw new Error(error.message);
  imported = null;
}

export async function resetTemplateEdit(id) {
  const { error } = await supabase.from('template_edits').delete().eq('id', id);
  if (error) throw new Error(error.message);
  imported = null;
}
