// Annotation board for checking homework: pen, highlighter, tick, cross, text, eraser, undo.
// Coordinates are stored normalised (0..1) so marks stay in place at any zoom / screen size.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pen, Highlighter, Check, X, Type, Eraser, Undo2, ZoomIn, ZoomOut, Loader2, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

const COLORS = ['#dc2626', '#16a34a', '#2563eb', '#111827'];

/** Draw annotation items onto a 2D context of size W×H. */
export function drawItems(ctx, items, W, H) {
  for (const it of items || []) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (it.t === 'pen' || it.t === 'hl') {
      ctx.strokeStyle = it.t === 'hl' ? 'rgba(250, 204, 21, 0.38)' : it.c;
      ctx.lineWidth = (it.w || (it.t === 'hl' ? 0.022 : 0.004)) * W;
      if (it.t === 'hl') ctx.globalCompositeOperation = 'multiply';
      ctx.beginPath();
      it.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H)));
      ctx.stroke();
    } else if (it.t === 'tick' || it.t === 'cross') {
      const s = (it.s || 0.035) * W;
      const x = it.x * W, y = it.y * H;
      ctx.strokeStyle = it.c;
      ctx.lineWidth = s * 0.16;
      ctx.beginPath();
      if (it.t === 'tick') { ctx.moveTo(x - s * 0.5, y); ctx.lineTo(x - s * 0.1, y + s * 0.4); ctx.lineTo(x + s * 0.6, y - s * 0.5); }
      else { ctx.moveTo(x - s * 0.45, y - s * 0.45); ctx.lineTo(x + s * 0.45, y + s * 0.45); ctx.moveTo(x + s * 0.45, y - s * 0.45); ctx.lineTo(x - s * 0.45, y + s * 0.45); }
      ctx.stroke();
    } else if (it.t === 'text') {
      const fs = (it.s || 0.026) * W;
      ctx.fillStyle = it.c;
      ctx.font = `bold ${fs}px "Segoe Print", "Comic Sans MS", cursive`;
      String(it.txt || '').split('\n').forEach((line, i) => ctx.fillText(line, it.x * W, it.y * H + i * fs * 1.2));
    }
    ctx.restore();
  }
}

/** Merge a page image with its annotations into a PNG blob (for the checked copy). */
export async function flattenPage(src, items, maxW = 1600) {
  const img = await new Promise((resolve, reject) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => resolve(i); i.onerror = reject; i.src = src; });
  const scale = Math.min(1, maxW / img.naturalWidth);
  const W = Math.round(img.naturalWidth * scale), H = Math.round(img.naturalHeight * scale);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0, W, H);
  drawItems(ctx, items, W, H);
  return new Promise((r) => c.toBlob(r, 'image/png'));
}

/** Render a PDF into page images (data URLs) with pdf.js — loaded only when a PDF is opened. */
export async function pdfToImages(url) {
  const pdfjs = await import('pdfjs-dist');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ url }).promise;
  const out = [];
  for (let p = 1; p <= Math.min(doc.numPages, 20); p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1.6 });
    const c = document.createElement('canvas');
    c.width = vp.width; c.height = vp.height;
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp, canvas: c }).promise;
    out.push(c.toDataURL('image/png'));
  }
  return out;
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function hit(it, p) {
  if (it.pts) return it.pts.some((q) => dist(q, p) < 0.02);
  return dist([it.x, it.y], p) < 0.04;
}

/**
 * pages: [{ key, src, name }]  value: { [key]: Item[] }  onChange(nextValue)
 */
export default function Annotator({ pages, value, onChange, loading }) {
  const [idx, setIdx] = useState(0);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState([]);
  const wrap = useRef(null);
  const canvas = useRef(null);
  const img = useRef(null);
  const drawing = useRef(null);
  const page = pages[Math.min(idx, pages.length - 1)];
  const items = (page && value?.[page.key]) || [];

  useEffect(() => { setIdx(0); setHistory([]); }, [pages.map((p) => p.key).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const redraw = useCallback(() => {
    const c = canvas.current, i = img.current;
    if (!c || !i || !i.clientWidth) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = i.clientWidth * dpr; c.height = i.clientHeight * dpr;
    c.style.width = `${i.clientWidth}px`; c.style.height = `${i.clientHeight}px`;
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, i.clientWidth, i.clientHeight);
    drawItems(ctx, drawing.current ? [...items, drawing.current] : items, i.clientWidth, i.clientHeight);
  }, [items]);
  useEffect(() => { redraw(); }, [redraw, zoom, idx]);
  useEffect(() => { const r = () => redraw(); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r); }, [redraw]);

  const setItems = (next) => {
    setHistory((h) => [...h.slice(-49), { key: page.key, items }]);
    onChange({ ...(value || {}), [page.key]: next });
  };
  const pos = (e) => { const r = canvas.current.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };

  const down = (e) => {
    if (!page) return;
    const p = pos(e);
    if (tool === 'pen' || tool === 'hl') {
      canvas.current.setPointerCapture(e.pointerId);
      drawing.current = { t: tool, c: color, pts: [p] };
    } else if (tool === 'tick' || tool === 'cross') {
      setItems([...items, { t: tool, c: tool === 'tick' ? '#16a34a' : '#dc2626', x: p[0], y: p[1] }]);
    } else if (tool === 'text') {
      const txt = window.prompt('Text to write on the page:');
      if (txt) setItems([...items, { t: 'text', c: color, x: p[0], y: p[1], txt }]);
    } else if (tool === 'erase') {
      const k = [...items].reverse().findIndex((it) => hit(it, p));
      if (k >= 0) setItems(items.filter((_, i) => i !== items.length - 1 - k));
    }
  };
  const move = (e) => { if (!drawing.current) return; drawing.current.pts.push(pos(e)); redraw(); };
  const up = () => {
    if (!drawing.current) return;
    const d = drawing.current; drawing.current = null;
    if (d.pts.length > 1) setItems([...items, { ...d, pts: d.pts.map(([x, y]) => [Math.round(x * 10000) / 10000, Math.round(y * 10000) / 10000]) }]);
    else redraw();
  };
  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory(history.slice(0, -1));
    onChange({ ...(value || {}), [last.key]: last.items });
  };

  const tools = [['pen', Pen, 'Pen'], ['hl', Highlighter, 'Highlighter'], ['tick', Check, 'Tick ✓'], ['cross', X, 'Cross ✗'], ['text', Type, 'Text'], ['erase', Eraser, 'Eraser']];
  if (loading) return <div className="flex h-96 items-center justify-center rounded-2xl bg-slate-100"><Loader2 className="animate-spin text-brand-600" /></div>;
  if (!pages.length) return null;
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border bg-slate-100">
      <div className="flex flex-wrap items-center gap-1 border-b bg-white px-2 py-1.5">
        {tools.map(([k, I, label]) => (
          <button key={k} title={label} onClick={() => setTool(k)} className={`flex h-9 w-9 items-center justify-center rounded-lg ${tool === k ? 'bg-navy-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}><I size={17} /></button>
        ))}
        <span className="mx-1 h-6 w-px bg-slate-200" />
        {COLORS.map((c) => <button key={c} onClick={() => setColor(c)} title="Colour" className={`h-6 w-6 rounded-full border-2 ${color === c ? 'border-navy-900 ring-2 ring-offset-1 ring-navy-300' : 'border-white'}`} style={{ background: c }} />)}
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <button title="Undo" onClick={undo} disabled={!history.length} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30"><Undo2 size={17} /></button>
        <button title="Clear this page" onClick={() => items.length && window.confirm('Remove all marks from this page?') && setItems([])} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><Trash2 size={16} /></button>
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <button title="Zoom out" onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><ZoomOut size={17} /></button>
        <span className="w-10 text-center text-xs text-slate-500">{Math.round(zoom * 100)}%</span>
        <button title="Zoom in" onClick={() => setZoom((z) => Math.min(3, z + 0.2))} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><ZoomIn size={17} /></button>
        {pages.length > 1 && (
          <div className="ml-auto flex items-center gap-1 text-xs text-slate-500">
            <button className="rounded p-1 hover:bg-slate-100" disabled={idx === 0} onClick={() => setIdx(idx - 1)}><ChevronLeft size={16} /></button>
            Page {idx + 1} / {pages.length}
            <button className="rounded p-1 hover:bg-slate-100" disabled={idx >= pages.length - 1} onClick={() => setIdx(idx + 1)}><ChevronRight size={16} /></button>
          </div>
        )}
      </div>
      <div ref={wrap} className="max-h-[75vh] overflow-auto p-3">
        <div className="relative mx-auto select-none" style={{ width: `${zoom * 100}%`, maxWidth: zoom === 1 ? 900 : undefined }}>
          <img ref={img} src={page.src} alt={page.name} onLoad={redraw} draggable={false} className="block w-full rounded bg-white shadow" crossOrigin="anonymous" />
          <canvas ref={canvas} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
            className={`absolute left-0 top-0 touch-none ${tool === 'erase' ? 'cursor-cell' : tool === 'text' ? 'cursor-text' : 'cursor-crosshair'}`} />
        </div>
      </div>
      {pages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-t bg-white p-2">
          {pages.map((p, k) => (
            <button key={p.key} onClick={() => setIdx(k)} className={`relative h-16 w-12 shrink-0 overflow-hidden rounded border-2 ${k === idx ? 'border-brand-600' : 'border-transparent'}`}>
              <img src={p.src} alt="" className="h-full w-full object-cover" />
              {(value?.[p.key] || []).length > 0 && <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-brand-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
