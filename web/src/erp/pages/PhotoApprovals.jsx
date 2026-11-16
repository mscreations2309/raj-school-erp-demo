import { useState } from 'react';
import toast from 'react-hot-toast';
import { Camera, Check, X, Loader2, ArrowRight } from 'lucide-react';
import { api, errMsg } from '../../lib/api';
import { fmtDateTime } from '../../lib/format';
import { PageHeader, Card, Spinner, Empty, useFetch, Avatar, Modal, Field } from '../components/ui';

export default function PhotoApprovals() {
  const { data, loading, reload } = useFetch('/photo-requests');
  const [busy, setBusy] = useState('');
  const [rej, setRej] = useState(null);
  const [reason, setReason] = useState('');
  const approve = async (p) => { setBusy(p.id); try { await api.post(`/photo-requests/${p.id}/approve`); toast.success(`${p.userName}'s photo approved`); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(''); } };
  const reject = async () => { setBusy(rej.id); try { await api.post(`/photo-requests/${rej.id}/reject`, { reason }); toast.success('Rejected — the person has been told why'); setRej(null); setReason(''); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(''); } };
  return (
    <div>
      <PageHeader title="Photo Approvals" subtitle="New profile photos become visible only after you approve them" icon={Camera} />
      <Card pad={false}>
        {loading && !data ? <Spinner /> : !data?.items.length ? <Empty text="No photos waiting for your approval" icon={Camera} /> : (
          <div className="divide-y">
            {data.items.map((p) => (
              <div key={p.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="text-center"><Avatar name={p.userName} src={p.previousUrl} size={56} /><div className="text-[10px] text-slate-400">Current</div></div>
                  <ArrowRight className="text-slate-300" size={18} />
                  <a href={p.photoUrl} target="_blank" rel="noreferrer" className="text-center"><img src={p.photoUrl} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-amber-300" /><div className="text-[10px] text-amber-700">New</div></a>
                </div>
                <div className="flex-1 text-sm"><div className="font-semibold text-navy-900">{p.userName}</div><div className="text-xs text-slate-500">{p.context}</div><div className="text-[11px] text-slate-400">Sent {fmtDateTime(p.createdAt)}</div></div>
                <div className="flex gap-2">
                  <button className="btn-success btn-sm" disabled={!!busy} onClick={() => approve(p)}>{busy === p.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve</button>
                  <button className="btn-outline btn-sm text-rose-600" disabled={!!busy} onClick={() => setRej(p)}><X size={14} /> Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Modal open={!!rej} onClose={() => setRej(null)} title={`Reject ${rej?.userName}'s photo`} size="sm" footer={<><button className="btn-outline" onClick={() => setRej(null)}>Cancel</button><button className="btn-danger" disabled={reason.trim().length < 3 || !!busy} onClick={reject}>Reject</button></>}>
        <Field label="Reason (sent to the person)"><textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Face not clearly visible, please use a passport-style photo" /></Field>
      </Modal>
    </div>
  );
}
