// Development-only check: opening a template in the editor and saving it unchanged must
// give the same printed text and the same layout (paragraph heights) as the original.
import { useEffect, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import DocRenderer from '../components/DocRenderer';
import { loadOriginal, templates } from '../templates';
import { parseBlocks } from './TemplateEditor';

function mount(html, width) {
  const box = document.createElement('div');
  box.style.cssText = `position:absolute;left:-99999px;top:0;width:${width}pt`;
  box.innerHTML = html;
  document.body.append(box);
  return box;
}
const heights = (box) => [...box.querySelectorAll('p')].map((p) => Math.round(p.getBoundingClientRect().height));

export default function DevRoundtrip() {
  const [out, setOut] = useState({ done: 0, bad: [] });
  useEffect(() => {
    (async () => {
      await document.fonts.ready;
      const bad = [];
      for (const [n, t] of templates.entries()) {
        const tpl = await loadOriginal(t.id);
        const w = tpl.page.width;
        const edit = mount(renderToStaticMarkup(<DocRenderer template={tpl} mode="edit" />), w);
        const blocks = parseBlocks(edit.firstElementChild, tpl.blocks);
        edit.remove();
        const a = mount(renderToStaticMarkup(<DocRenderer template={tpl} mode="print" />), w);
        const b = mount(renderToStaticMarkup(<DocRenderer template={{ ...tpl, blocks }} mode="print" />), w);
        const ha = heights(a), hb = heights(b);
        if (a.innerText !== b.innerText) bad.push(`${t.id}: text differs`);
        else if (ha.join() !== hb.join()) bad.push(`${t.id}: layout differs at paragraph ${ha.findIndex((h, i) => h !== hb[i])}`);
        a.remove(); b.remove();
        if (n % 25 === 0) setOut({ done: n + 1, bad: [...bad] });
      }
      setOut({ done: templates.length, bad, finished: true });
    })();
  }, []);
  return (
    <pre id="result" className="p-4 text-sm">
      {out.finished ? 'FINISHED ' : ''}{out.done}/{templates.length} checked, {out.bad.length} problems{'\n'}{out.bad.join('\n')}
    </pre>
  );
}
