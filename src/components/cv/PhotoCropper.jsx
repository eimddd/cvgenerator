import { useEffect, useRef, useState } from 'react';
import { Button, Modal } from '../ui';

const VIEW = 260; // px, square crop window
const OUT = 480; // px, saved photo size

// Drag to position, slide to zoom; returns a square JPEG data URL.
export default function PhotoCropper({ file, onDone, onClose }) {
  const [img, setImg] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => setImg(im);
    im.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!img) return null;
  const base = VIEW / Math.min(img.width, img.height); // "cover" scale at zoom 1
  const s = base * zoom;
  const w = img.width * s; const h = img.height * s;
  // keep the window fully covered by the picture
  const clamp = (p) => ({ x: Math.min(0, Math.max(VIEW - w, p.x)), y: Math.min(0, Math.max(VIEW - h, p.y)) });
  const at = clamp(pos.x === 0 && pos.y === 0 && !drag.current ? { x: (VIEW - w) / 2, y: (VIEW - h) / 2 } : pos);

  function save() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = OUT;
    const k = OUT / VIEW;
    canvas.getContext('2d').drawImage(img, at.x * k, at.y * k, w * k, h * k);
    onDone(canvas.toDataURL('image/jpeg', 0.88));
  }

  return (
    <Modal title="Crop photo" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Use this photo</Button></>}>
      <div className="flex flex-col items-center gap-4">
        <div
          className="relative cursor-grab touch-none overflow-hidden rounded-full bg-slate-100 active:cursor-grabbing"
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX - at.x, y: e.clientY - at.y }; }}
          onPointerMove={(e) => drag.current && setPos(clamp({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y }))}
          onPointerUp={() => { setPos(at); drag.current = null; }}
        >
          <img src={img.src} alt="" draggable={false} className="absolute max-w-none select-none" style={{ left: at.x, top: at.y, width: w, height: h }} />
        </div>
        <label className="flex w-full items-center gap-3 text-sm text-slate-600">
          Zoom
          <input type="range" min="1" max="3" step="0.01" value={zoom} className="flex-1" onChange={(e) => { const z = +e.target.value; const c = VIEW / 2; const r = z / zoom; setPos(clamp({ x: c - (c - at.x) * r, y: c - (c - at.y) * r })); setZoom(z); }} />
        </label>
        <p className="text-xs text-slate-500">Drag the photo to centre it.</p>
      </div>
    </Modal>
  );
}
