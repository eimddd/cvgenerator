import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Printable copy of a document, mounted directly under <body>.
export function PrintPortal({ css, children }) {
  return createPortal(
    <div className="print-root">
      <style>{css}</style>
      {children}
    </div>,
    document.body,
  );
}

// Opens the browser print dialog. The document title becomes the PDF file name
// when the user picks "Save as PDF".
export function printDocument(fileName) {
  const previous = document.title;
  if (fileName) document.title = fileName.replace(/[\\/:*?"<>|]+/g, ' ').trim();
  const restore = () => { document.title = previous; window.removeEventListener('afterprint', restore); };
  window.addEventListener('afterprint', restore);
  window.print();
}

// Shrinks an A4 page to fit the preview column without changing its layout.
export function FitToWidth({ pageWidthPx, children }) {
  const box = useRef(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(Math.min(1, (entry.contentRect.width - 8) / pageWidthPx)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [pageWidthPx]);
  return (
    <div ref={box} className="w-full">
      <div style={{ zoom: scale }}>{children}</div>
    </div>
  );
}
