import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Trash2, RotateCcw, ArrowUpCircle, Eye, Loader2, Archive, ShieldCheck, History, User } from 'lucide-react';
import { api, errMsg } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDateTime, pretty } from '../../lib/format';
import { PageHeader, Card, Spinner, Empty, useFetch, Badge, Modal, Pagination, Tabs, Field } from '../components/ui';

const NEXT = { TEACHER: 'Principal', ACCOUNTANT: 'Principal', RECEPTIONIST: 'Principal', LIBRARIAN: 'Principal', PRINCIPAL: 'School Admin', SCHOOL_ADMIN: 'RnY Super Admin', SUPER_ADMIN: 'Archive (kept forever)' };
const ACTION = { DELETED: 'Moved to Recycle Bin', MOVED_TO_MANAGER: 'Removed from bin → sent to', ARCHIVED: 'Archived (kept forever)', RESTORED: 'Restored' };

function Summary({ summary }) {
  const e = Object.entries(summary || {});
  if (!e.length) return <span className="text-slate-300">—</span>;
  return <div className="flex max-w-xs flex-wrap gap-1">{e.slice(0, 5).map(([k, v]) => <span key={k} className="badge bg-slate-100 text-slate-600">{v} {pretty(k.replace(/([a-z])([A-Z])/g, '$1_$2'))}</span>)}{e.length > 5 && <span className="badge bg-slate-100">+{e.length - 5}</span>}</div>;
}

function Deleter({ e }) {
  const d = e.deletedBy || {};
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-700"><User size={14} /></div>
      <div className="leading-tight"><div className="font-medium">{e.deletedByName}</div><div className="text-[11px] text-slate-500">{pretty(e.deletedByRole)}{d.employeeId ? ` • ${d.employeeId}` : ''}{d.designation ? ` • ${d.designation}` : ''}</div></div>
    </div>
  );
}

export default function RecycleBin({ platform = false }) {
  const { user } = useAuth();
  const base = platform ? '/platform/recycle-bin' : '/recycle-bin';
  const [view, setView] = useState('mine');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const { data, loading, reload } = useFetch(base, { view, page, pageSize: 20, q: q || undefined });
  const [detail, setDetail] = useState(null);
  const [act, setAct] = useState(null); // { type: 'restore' | 'escalate', entry }
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => setPage(1), [view, q]);

  const open = async (e) => { try { setDetail((await api.get(`${base}/${e.id}`)).data); } catch (x) { toast.error(errMsg(x)); } };
  const run = async () => {
    setBusy(true);
    try {
      if (act.type === 'restore') { await api.post(`${base}/${act.entry.id}/restore`); toast.success('Restored — everything is back exactly as before'); }
      else { const { data: r } = await api.post(`${base}/${act.entry.id}/escalate`, { reason: note }); toast.success(r.status === 'ARCHIVED' ? 'Archived — kept forever, still restorable' : `Sent to ${pretty(r.holderRole)}'s Recycle Bin`); }
      setAct(null); setNote(''); setDetail(null); reload();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const tabs = [['mine', `In my bin${data?.inMyBin ? ` (${data.inMyBin})` : ''}`], ['deletedByMe', 'Deleted by me']];
  if (user.role !== 'TEACHER' && !['ACCOUNTANT', 'RECEPTIONIST', 'LIBRARIAN'].includes(user.role)) tabs.push(['team', 'Deleted by my team']);
  if (user.role === 'SUPER_ADMIN') tabs.push(['archived', 'Archive']);
  tabs.push(['restored', 'Restored']);

  return (
    <div>
      <PageHeader title="Recycle Bin" subtitle="Nothing is ever erased. Restore anytime — removing from your bin sends it to your manager." icon={Trash2} />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[[Trash2, 'Delete', 'Moves the record and everything linked to it here, with your name & reason. Linked logins are blocked.'], [RotateCcw, 'Restore', 'Puts everything back exactly as it was and unlocks logins.'], [ArrowUpCircle, 'Remove from my bin', `Sends it to ${NEXT[user.role] || 'your manager'}'s Recycle Bin — never erased.`]].map(([I, t, d]) => (
          <div key={t} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4"><I className="mt-0.5 shrink-0 text-brand-600" size={20} /><div><div className="font-semibold text-navy-900">{t}</div><div className="text-xs text-slate-500">{d}</div></div></div>
        ))}
      </div>
      <Tabs value={view} onChange={setView} tabs={tabs} />
      <Card pad={false}>
        <div className="border-b p-4"><input className="input" placeholder="Search item, deleted by, reason…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {loading && !data ? <Spinner /> : !data?.items.length ? <Empty text="Recycle Bin is empty" icon={Trash2} /> : (
          <div className="overflow-x-auto"><table className="table-x">
            <thead><tr><th>Item</th>{platform && <th>School</th>}<th>Linked records</th><th>Deleted by</th><th>When</th><th>Reason</th><th>Now in</th><th className="text-right">Actions</th></tr></thead>
            <tbody>{data.items.map((e) => (
              <motion.tr key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <td className="max-w-xs"><div className="font-semibold text-navy-900">{e.label}</div><div className="text-[11px] text-slate-400">{pretty(e.entityType.replace(/([a-z])([A-Z])/g, '$1_$2'))}</div></td>
                {platform && <td>{e.schoolName || '—'}</td>}
                <td><Summary summary={e.summary} /></td>
                <td><Deleter e={e} /></td>
                <td className="whitespace-nowrap text-xs">{fmtDateTime(e.deletedAt)}</td>
                <td className="max-w-[220px] truncate text-sm italic text-slate-600" title={e.reason}>“{e.reason}”</td>
                <td>{e.status === 'RESTORED' ? <Badge status="PAID">Restored</Badge> : e.status === 'ARCHIVED' ? <Badge status="ALUMNI">Archive</Badge> : <Badge status={e.inMyBin ? 'PENDING' : 'NEW'}>{e.holderUserId ? `${e.deletedByName}'s bin` : `${pretty(e.holderRole)} bin`}</Badge>}</td>
                <td className="whitespace-nowrap text-right">
                  <button className="btn-ghost btn-sm" title="Details" onClick={() => open(e)}><Eye size={15} /></button>
                  {e.status !== 'RESTORED' && <button className="btn-success btn-sm" onClick={() => setAct({ type: 'restore', entry: e })}><RotateCcw size={13} /> Restore</button>}
                  {e.inMyBin && <button className="btn-outline btn-sm ml-1" onClick={() => setAct({ type: 'escalate', entry: e })}><ArrowUpCircle size={13} /> Remove</button>}
                </td>
              </motion.tr>
            ))}</tbody>
          </table></div>
        )}
        {data && <Pagination page={page} pageSize={20} total={data.total} onPage={setPage} />}
      </Card>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.label} size="lg">
        {detail && (
          <div className="space-y-5 text-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4"><div className="label">Deleted by</div>
                {[['Name', detail.deletedBy.name], ['Role', pretty(detail.deletedBy.role)], ['Employee ID', detail.deletedBy.employeeId], ['Designation', detail.deletedBy.designation], ['Email', detail.deletedBy.email], ['Mobile', detail.deletedBy.phone], ['When', fmtDateTime(detail.deletedAt)]].map(([k, v]) => v ? <div key={k} className="flex justify-between gap-3 py-0.5"><span className="text-slate-500">{k}</span><b className="text-right">{v}</b></div> : null)}
              </div>
              <div className="rounded-xl bg-slate-50 p-4"><div className="label">Reason</div><p className="italic">“{detail.reason}”</p>
                <div className="label mt-4">Linked records ({detail.totalRecords})</div><Summary summary={detail.summary} />
                <div className="label mt-4">Status</div><Badge status={detail.status === 'IN_BIN' ? 'PENDING' : detail.status === 'RESTORED' ? 'PAID' : 'ALUMNI'}>{detail.status === 'IN_BIN' ? `In ${detail.holderUserId ? `${detail.deletedByName}'s` : pretty(detail.holderRole)} bin` : pretty(detail.status)}</Badge>
              </div>
            </div>
            <div>
              <div className="label flex items-center gap-1"><History size={13} /> History</div>
              <ol className="relative ml-2 border-l-2 border-slate-200 pl-5">
                {detail.history.map((h, k) => (
                  <li key={k} className="mb-3"><span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-brand-600" />
                    <div className="font-medium">{ACTION[h.action] || h.action}{h.to ? ` ${pretty(h.to)}` : ''}</div>
                    <div className="text-xs text-slate-500">{h.by} ({pretty(h.role)}{h.employeeId ? ` • ${h.employeeId}` : ''}) • {fmtDateTime(h.at)}</div>
                    {h.note && <div className="text-xs italic text-slate-600">“{h.note}”</div>}
                  </li>
                ))}
              </ol>
            </div>
            {detail.preview && (
              <details className="rounded-xl border p-3"><summary className="cursor-pointer font-medium">Record data ({detail.preview.model})</summary>
                <div className="mt-3 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">{Object.entries(detail.preview.data || {}).filter(([k, v]) => v !== null && !['schoolId', 'passwordHash'].includes(k) && typeof v !== 'object').map(([k, v]) => <div key={k} className="flex justify-between gap-2 border-b border-dashed py-1"><span className="text-slate-500">{k}</span><span className="truncate font-medium">{String(v)}</span></div>)}</div>
              </details>
            )}
            <div className="flex justify-end gap-2 border-t pt-4">
              {detail.canEscalate && <button className="btn-outline" onClick={() => setAct({ type: 'escalate', entry: detail })}><ArrowUpCircle size={15} /> Remove from my bin</button>}
              {detail.canRestore && <button className="btn-success" onClick={() => setAct({ type: 'restore', entry: detail })}><RotateCcw size={15} /> Restore</button>}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!act} onClose={() => setAct(null)} title={act?.type === 'restore' ? 'Restore' : 'Remove from my Recycle Bin'} size="sm" footer={<><button className="btn-outline" onClick={() => setAct(null)}>Cancel</button><button className={act?.type === 'restore' ? 'btn-success' : 'btn-primary'} disabled={busy || (act?.type === 'escalate' && note.trim().length < 3)} onClick={run}>{busy && <Loader2 size={16} className="animate-spin" />} {act?.type === 'restore' ? 'Restore' : 'Send up'}</button></>}>
        {act?.type === 'restore' ? (
          <p className="text-sm text-slate-600"><b>{act.entry.label}</b> and all its linked records will be restored exactly as they were. Any blocked logins are unlocked.</p>
        ) : act && (
          <div className="space-y-4 text-sm">
            <p className="text-slate-600"><b>{act.entry.label}</b> will leave your bin and go to <b>{NEXT[user.role]}</b>{user.role !== 'SUPER_ADMIN' && "'s Recycle Bin"}, with your name and this note. <span className="inline-flex items-center gap-1 text-emerald-700"><ShieldCheck size={14} /> It is never erased.</span></p>
            <Field label="Note *"><textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why remove it from your bin?" /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
