// Student profile card: house + roles + activities, with assign / remove for permitted staff.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Loader2, Award } from 'lucide-react';
import { api, errMsg } from '../../lib/api';
import { fmtDate } from '../../lib/format';
import { Card, useFetch, Field, Modal, DeleteDialog, Spinner } from './ui';
import { RoleRibbon, ActivityChip, HouseChip, activeTags } from './StudentBadges';

export default function StudentTagsCard({ studentId, onChange }) {
  const { data, loading, reload } = useFetch(`/students/${studentId}/tags`);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ typeId: '', house: '', fromDate: '', toDate: '', note: '' });
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  if (loading && !data) return <Card title="Roles, house & activities"><Spinner /></Card>;
  const type = data?.types.find((t) => t.id === f.typeId);
  const done = () => { reload(); onChange?.(); };
  const assign = async () => {
    setBusy(true);
    try { await api.post(`/students/${studentId}/tags`, { ...f, house: f.house || null, toDate: f.toDate || null }); toast.success(`${type.name} assigned`); setOpen(false); setF({ typeId: '', house: '', fromDate: '', toDate: '', note: '' }); done(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const setHouse = async (house) => { try { await api.put(`/students/${studentId}/house`, { house: house || null }); toast.success('House updated'); done(); } catch (e) { toast.error(errMsg(e)); } };
  const active = activeTags(data.tags);
  const past = data.tags.filter((t) => !active.includes(t));
  return (
    <Card title={<span className="flex items-center gap-2"><Award size={16} /> Roles, house & activities</span>} actions={data.types.length > 0 && <button className="btn-primary btn-sm" onClick={() => setOpen(true)}><Plus size={14} /> Assign</button>}>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase text-slate-400">House</span>
          {data.house ? <HouseChip house={data.house} /> : <span className="text-slate-400">Not set</span>}
          <select className="input ml-auto w-36 py-1.5 text-xs" value={data.house || ''} onChange={(e) => setHouse(e.target.value)} title="Class teacher or admin can change">
            <option value="">— change —</option>{data.houses.map((h) => <option key={h.name}>{h.name}</option>)}
          </select>
        </div>
        {!active.length && <p className="text-slate-400">No roles or activities yet.</p>}
        {active.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {t.type.kind === 'ROLE' ? <RoleRibbon tag={t} /> : <ActivityChip tag={t} />}
              <span className="text-xs text-slate-500">{t.session || ''} • since {fmtDate(t.fromDate)}{t.toDate ? ` till ${fmtDate(t.toDate)}` : ''}{t.assignedByName ? ` • by ${t.assignedByName}` : ''}{t.note ? ` • ${t.note}` : ''}</span>
            </div>
            {t.canRemove && <button className="text-slate-400 hover:text-rose-600" title="Remove (goes to Recycle Bin)" onClick={() => setDel(t)}><Trash2 size={15} /></button>}
          </div>
        ))}
        {past.length > 0 && <details className="text-xs text-slate-500"><summary className="cursor-pointer">Past roles ({past.length})</summary><ul className="mt-1 space-y-0.5">{past.map((t) => <li key={t.id}>{t.type.name}{t.house ? ` (${t.house})` : ''} — {t.session} {fmtDate(t.fromDate)} – {fmtDate(t.toDate)}</li>)}</ul></details>}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Assign role / activity" size="sm" footer={<><button className="btn-outline" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" disabled={!f.typeId || busy || (type?.needsHouse && !f.house && !data.house)} onClick={assign}>{busy && <Loader2 size={15} className="animate-spin" />} Assign</button></>}>
        <div className="space-y-4">
          <Field label="Role / activity"><select className="input" value={f.typeId} onChange={(e) => setF({ ...f, typeId: e.target.value })}><option value="">Select…</option>
            <optgroup label="Roles">{data.types.filter((t) => t.kind === 'ROLE').map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}</optgroup>
            <optgroup label="Activities">{data.types.filter((t) => t.kind !== 'ROLE').map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}</optgroup>
          </select></Field>
          {type?.needsHouse && <Field label="House"><select className="input" value={f.house || data.house || ''} onChange={(e) => setF({ ...f, house: e.target.value })}><option value="">Select…</option>{data.houses.map((h) => <option key={h.name}>{h.name}</option>)}</select></Field>}
          <div className="grid grid-cols-2 gap-3"><Field label="From"><input type="date" className="input" value={f.fromDate} onChange={(e) => setF({ ...f, fromDate: e.target.value })} /></Field><Field label="Till (optional)"><input type="date" className="input" value={f.toDate} onChange={(e) => setF({ ...f, toDate: e.target.value })} /></Field></div>
          <Field label="Note (optional)"><input className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="e.g. Elected in student council" /></Field>
          <p className="text-[11px] text-slate-500">You only see roles you are allowed to assign.</p>
        </div>
      </Modal>
      <DeleteDialog open={!!del} onClose={() => setDel(null)} what={del ? `${del.type.name} of this student` : ''} busy={busy} onConfirm={async (reason) => { setBusy(true); try { await api.delete(`/student-tags/${del.id}`, { data: { reason } }); toast.success('Removed — kept in Recycle Bin'); setDel(null); done(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); } }} />
    </Card>
  );
}
