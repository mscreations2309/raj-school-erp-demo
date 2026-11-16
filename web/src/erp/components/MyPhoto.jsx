// "My profile photo" — upload / change own photo; visible to others only after approval.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Upload, Loader2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { api, errMsg } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDateTime } from '../../lib/format';
import { Modal, Avatar, useFetch } from './ui';

const WHO = { STUDENT: 'your class teacher', PARENT: "your child's class teacher" };

export default function MyPhoto({ open, onClose }) {
  const { user } = useAuth();
  const { data, reload } = useFetch(open ? '/me/photo' : null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const req = data?.request;
  const submit = async () => {
    setBusy(true);
    try { const fd = new FormData(); fd.append('photo', file); await api.post('/me/photo', fd); toast.success('Photo sent for approval'); setFile(null); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={() => { setFile(null); onClose(); }} title="My profile photo" size="sm">
      <div className="space-y-5 text-sm">
        <div className="flex items-center gap-6">
          <div className="text-center"><Avatar name={user.name} src={data?.current} size={88} /><div className="mt-1 text-[11px] text-slate-500">Visible to everyone</div></div>
          {(file || req?.status === 'PENDING') && (
            <div className="text-center"><img src={file ? URL.createObjectURL(file) : req.photoUrl} alt="" className="h-[88px] w-[88px] rounded-full object-cover ring-2 ring-amber-300" /><div className="mt-1 text-[11px] text-amber-700">{file ? 'New (not sent yet)' : 'Waiting for approval'}</div></div>
          )}
        </div>
        {req?.status === 'PENDING' && <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800"><Clock size={14} /> Sent {fmtDateTime(req.createdAt)} — waiting for approval by {WHO[user.role] || 'the Principal / School Admin'}.</p>}
        {req?.status === 'APPROVED' && <p className="flex items-center gap-1.5 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800"><CheckCircle2 size={14} /> Last photo approved by {req.reviewedByName} on {fmtDateTime(req.reviewedAt)}.</p>}
        {req?.status === 'REJECTED' && <p className="flex items-start gap-1.5 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-800"><XCircle size={14} className="shrink-0" /> Last photo not approved by {req.reviewedByName}: “{req.reason}”. Please upload another.</p>}
        <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center hover:border-brand-400">
          <Upload className="text-brand-600" /><span className="mt-1 font-semibold">{data?.current ? 'Change photo' : 'Upload photo'}</span><span className="text-xs text-slate-500">JPG, PNG or WEBP, up to 5 MB. A clear face photo, school-appropriate.</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" capture="user" className="hidden" onChange={(e) => setFile(e.target.files[0] || null)} />
        </label>
        <p className="text-[11px] text-slate-500">Your new photo is shown to others only after it is approved by {WHO[user.role] || 'the Principal / School Admin'}.</p>
        <button className="btn-primary w-full" disabled={!file || busy} onClick={submit}>{busy && <Loader2 size={15} className="animate-spin" />} Send for approval</button>
      </div>
    </Modal>
  );
}
