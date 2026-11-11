import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Loader2, ChevronLeft, ChevronRight, Inbox, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { api, errMsg } from '../../lib/api';
import { STATUS_COLORS, pretty } from '../../lib/format';

export const cx = clsx;

export function PageHeader({ title, subtitle, actions, icon: I }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-3">
        {I && <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-glow"><I size={20} /></div>}
        <div>
          <h1 className="text-2xl font-bold text-navy-900">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '', title, actions, pad = true }) {
  return (
    <div className={cx('card', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold text-navy-900">{title}</h3>
          {actions}
        </div>
      )}
      <div className={pad ? 'p-5' : ''}>{children}</div>
    </div>
  );
}

export function Stat({ label, value, icon: I, color = 'brand', sub, trend }) {
  const colors = {
    brand: 'from-brand-500 to-brand-700', navy: 'from-navy-500 to-navy-700', emerald: 'from-emerald-500 to-emerald-700',
    amber: 'from-amber-400 to-amber-600', violet: 'from-violet-500 to-violet-700', sky: 'from-sky-500 to-sky-700', rose: 'from-rose-500 to-rose-700',
  };
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }} className="card relative overflow-hidden p-5">
      <div className={cx('absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-10', colors[color])} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-navy-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        {I && <div className={cx('flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow', colors[color])}><I size={20} /></div>}
      </div>
      {trend}
    </motion.div>
  );
}

export function Badge({ status, children, className = '' }) {
  return <span className={cx('badge', STATUS_COLORS[status] || 'bg-slate-100 text-slate-600', className)}>{children || pretty(status)}</span>;
}

export function Spinner({ className = '' }) {
  return <div className={cx('flex items-center justify-center py-16', className)}><Loader2 className="animate-spin text-brand-600" size={32} /></div>;
}

export function Empty({ text = 'Nothing here yet', icon: I = Inbox }) {
  return <div className="flex flex-col items-center justify-center py-16 text-slate-400"><I size={40} className="mb-3" /><p className="text-sm">{text}</p></div>;
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  const w = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' }[size];
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-navy-950/50 p-4 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div className={cx('my-8 w-full rounded-2xl bg-white shadow-2xl', w)} initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.97 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-lg font-semibold text-navy-900">{title}</h3>
              <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t bg-slate-50/60 px-6 py-4">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Confirm({ open, onClose, onConfirm, title = 'Are you sure?', text, danger = true, busy }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className={danger ? 'btn-danger' : 'btn-primary'} disabled={busy} onClick={onConfirm}>{busy && <Loader2 size={16} className="animate-spin" />} Confirm</button></>}>
      <div className="flex gap-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600"><AlertTriangle size={20} /></div><p className="text-slate-600">{text}</p></div>
    </Modal>
  );
}

export function Pagination({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return <div className="px-5 py-3 text-xs text-slate-500">{total} record{total === 1 ? '' : 's'}</div>;
  return (
    <div className="flex items-center justify-between border-t px-5 py-3 text-sm text-slate-500">
      <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
      <div className="flex items-center gap-1">
        <button className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={16} /></button>
        <span className="px-2">{page} / {pages}</span>
        <button className="btn-ghost btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
      {tabs.map(([k, label]) => (
        <button key={k} onClick={() => onChange(k)} className={cx('relative whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition', value === k ? 'text-navy-900' : 'text-slate-500 hover:text-slate-700')}>
          {value === k && <motion.span layoutId="tab-bg" className="absolute inset-0 rounded-lg bg-white shadow-sm" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children, className = '', hint }) {
  return <div className={className}><label className="label">{label}</label>{children}{hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}</div>;
}

/** Simple data hook: const { data, loading, reload } = useFetch('/url', params) */
export function useFetch(url, params, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const key = JSON.stringify(params || {});
  const load = useCallback(async () => {
    if (!url) return setState({ data: null, loading: false, error: null });
    setState((s) => ({ ...s, loading: true }));
    try {
      const { data } = await api.get(url, { params });
      setState({ data, loading: false, error: null });
    } catch (e) {
      setState({ data: null, loading: false, error: errMsg(e) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, key, ...deps]);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load, setData: (d) => setState((s) => ({ ...s, data: typeof d === 'function' ? d(s.data) : d })) };
}

/** Options loader for selects */
export function useOptions(url, map) {
  const { data } = useFetch(url, { all: 1 });
  return (data?.items || []).map(map);
}

export function ErrorBox({ error }) {
  if (!error) return null;
  return <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>;
}

export function Avatar({ name = '', src, size = 36 }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  return src ? <img src={src} alt="" style={{ width: size, height: size }} className="rounded-full object-cover" /> : (
    <div style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy-500 to-brand-600 text-xs font-bold text-white">{initials || '?'}</div>
  );
}

/** Delete = "Move to Recycle Bin" with a mandatory reason. Nothing is ever erased. */
export function DeleteDialog({ open, onClose, onConfirm, what = 'this record', busy, extraConfirm }) {
  const [reason, setReason] = useState('');
  const [check, setCheck] = useState('');
  useEffect(() => { if (open) { setReason(''); setCheck(''); } }, [open]);
  const ok = reason.trim().length >= 3 && (!extraConfirm || check === extraConfirm);
  return (
    <Modal open={open} onClose={onClose} title="Move to Recycle Bin" size="sm" footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-danger" disabled={!ok || busy} onClick={() => onConfirm(reason.trim())}>{busy && <Loader2 size={16} className="animate-spin" />} Move to Recycle Bin</button></>}>
      <div className="space-y-4 text-sm">
        <p className="text-slate-600"><b>{what}</b> and everything linked to it will move to the Recycle Bin. Nothing is erased — it can be restored anytime.</p>
        <Field label="Reason for deleting *"><textarea autoFocus rows={3} className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Duplicate entry, student left school…" /></Field>
        {extraConfirm && <Field label={`Type "${extraConfirm}" to confirm`}><input className="input" value={check} onChange={(e) => setCheck(e.target.value)} /></Field>}
        <p className="text-xs text-slate-400">Your name, role and employee ID are recorded with this action.</p>
      </div>
    </Modal>
  );
}
