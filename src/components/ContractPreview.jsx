import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getContract } from '../lib/db';
import { loadTemplate } from '../templates';
import DocRenderer, { pageCss } from './DocRenderer';
import { FitToWidth, PrintPortal, printDocument } from './print';
import { Button, ErrorNote, Modal, Spinner } from './ui';

const PT_TO_PX = 96 / 72;

export const EyeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
  </svg>
);

// Prints the template with every gap as dots, to fill in by hand.
export function useBlankPrint() {
  const [blank, setBlank] = useState(null);
  const print = (template) => {
    flushSync(() => setBlank(template));
    window.addEventListener('afterprint', () => setBlank(null), { once: true });
    printDocument(`${template.title} — blank`);
  };
  const portal = blank && (
    <PrintPortal css={pageCss(blank)}>
      <DocRenderer template={blank} mode="blank" paged={false} />
    </PrintPortal>
  );
  return [print, portal];
}

// Quick look at a template (templateId) or a saved contract (contractId) before opening it.
export default function ContractPreview({ templateId, contractId, onClose }) {
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [values, setValues] = useState({});
  const [error, setError] = useState(null);
  const [printBlank, blankPortal] = useBlankPrint();

  useEffect(() => {
    (async () => {
      try {
        if (contractId) {
          const c = await getContract(contractId);
          setValues(c.values || {});
          setTemplate(await loadTemplate(c.template_id));
        } else setTemplate(await loadTemplate(templateId));
      } catch (e) { setError(e); }
    })();
  }, [templateId, contractId]);

  const footer = template && (
    <div className="flex flex-wrap gap-2">
      <Button variant="primary" onClick={() => navigate(contractId ? `/contracts/${contractId}` : `/contracts/new/${template.id}`)}>{contractId ? 'Open contract' : 'Use this template'}</Button>
      <Button onClick={() => printBlank(template)}>Print blank copy</Button>
      <Button onClick={() => navigate(`/contracts/templates/${template.id}/edit`)}>Edit template</Button>
    </div>
  );

  return (
    <Modal title={template?.title || 'Preview'} onClose={onClose} footer={footer} wide>
      <ErrorNote error={error} />
      {!template ? !error && <Spinner /> : (
        <div className="max-h-[70vh] overflow-y-auto rounded-lg bg-slate-100 p-3">
          <FitToWidth pageWidthPx={template.page.width * PT_TO_PX}>
            <DocRenderer template={template} values={values} mode={contractId ? 'print' : 'screen'} />
          </FitToWidth>
        </div>
      )}
      {blankPortal}
    </Modal>
  );
}
