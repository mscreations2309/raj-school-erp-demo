// Student / parent homework: submit work, see published evaluation, parent acknowledgement.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Upload, FileText, Send, CheckCircle2, Clock, AlertTriangle, RotateCcw, Loader2, X, Award, MessageSquare, ThumbsUp } from 'lucide-react';
import { api, errMsg } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDate, fmtDateTime, fullName } from '../../lib/format';
import { Spinner, Empty, useFetch, Badge, Modal, Field } from '../components/ui';

const STATUS = {
  NONE: ['Not submitted', 'bg-slate-100 text-slate-600'],
  OVERDUE: ['Overdue', 'bg-rose-50 text-rose-700'],
  SUBMITTED: ['Submitted — awaiting check', 'bg-sky-50 text-sky-700'],
  EVALUATED: ['Being checked', 'bg-violet-50 text-violet-700'],
  RESUBMIT: ['Redo requested', 'bg-amber-50 text-amber-700'],
  PUBLISHED: ['Checked', 'bg-emerald-50 text-emerald-700'],
};

const Files = ({ files, label }) => (files?.length ? (
  <div className="mt-2"><div className="text-[11px] font-semibold uppercase text-slate-400">{label}</div>
    <div className="mt-1 flex flex-wrap gap-2">{files.map((f) => <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border bg-white px-2.5 py-1 text-xs hover:border-brand-300 hover:text-brand-700"><FileText size={13} /> {f.name}</a>)}</div>
  </div>
) : null);

export default function HomeworkFamily({ studentId }) {
  const { user } = useAuth();
  const { data, loading, reload } = useFetch(`/portal/student/${studentId}/homework`);
  const [submitFor, setSubmitFor] = useState(null);
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [ack, setAck] = useState(null);
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState('ALL');

  const submit = async () => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('studentId', studentId); fd.append('text', text);
      files.forEach((f) => fd.append('files', f));
      await api.post(`/portal/homework/${submitFor.id}/submit`, fd);
      toast.success('Homework submitted to your teacher'); setSubmitFor(null); setText(''); setFiles([]); reload();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const acknowledge = async () => {
    setBusy(true);
    try { await api.post(`/portal/submissions/${ack.submission.id}/acknowledge`, { note }); toast.success('Acknowledged — the teacher can see it'); setAck(null); setNote(''); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  if (loading && !data) return <Spinner />;
  const items = data?.items || [];
  const stateOf = (h) => (h.submission ? h.submission.status : h.overdue ? 'OVERDUE' : 'NONE');
  const pendingAck = items.filter((h) => h.submission?.status === 'PUBLISHED' && !h.submission.parentAckAt).length;
  const shown = items.filter((h) => filter === 'ALL' || (filter === 'TODO' ? ['NONE', 'OVERDUE', 'RESUBMIT'].includes(stateOf(h)) && h.allowSubmission : filter === 'CHECKED' ? stateOf(h) === 'PUBLISHED' : filter === 'ACK' ? h.submission?.status === 'PUBLISHED' && !h.submission.parentAckAt : true));
  const canSubmit = (h) => h.allowSubmission && (!h.submission || ['SUBMITTED', 'RESUBMIT'].includes(h.submission.status));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[['ALL', 'All'], ['TODO', 'To do'], ['CHECKED', 'Checked'], ...(user.role === 'PARENT' ? [['ACK', `Needs my acknowledgement${pendingAck ? ` (${pendingAck})` : ''}`]] : [])].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${filter === k ? 'bg-navy-800 text-white' : 'bg-slate-100 text-slate-600'}`}>{l}</button>
        ))}
      </div>
      {!shown.length ? <div className="card"><Empty text="No homework here" /></div> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shown.map((h) => {
            const s = h.submission; const st = stateOf(h);
            return (
              <motion.div key={h.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><Badge status="NEW">{h.subject.name}</Badge><h3 className="mt-2 font-semibold text-navy-900">{h.title}</h3></div>
                  <span className={`badge shrink-0 ${STATUS[st][1]}`}>{STATUS[st][0]}</span>
                </div>
                {h.description && <p className="mt-2 text-sm text-slate-600">{h.description}</p>}
                {h.attachmentUrl && <a href={h.attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-brand-600 underline"><FileText size={13} /> Teacher's worksheet</a>}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className={`flex items-center gap-1 ${h.overdue ? 'font-semibold text-rose-600' : ''}`}><Clock size={12} /> Due {fmtDate(h.dueDate)}</span>
                  {h.maxMarks && <span>Max marks {h.maxMarks}</span>}
                  {h.teacher && <span>{fullName(h.teacher)}</span>}
                </div>

                {s && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">Submitted {fmtDateTime(s.submittedAt)} by {s.submittedBy}{s.isLate && <span className="badge bg-amber-100 text-amber-800">Late</span>}{s.attempts > 1 && <span>• attempt {s.attempts}</span>}</div>
                    {s.text && <p className="mt-2 whitespace-pre-wrap text-slate-700">{s.text}</p>}
                    <Files files={s.files} label="Uploaded work" />
                  </div>
                )}

                {s?.status === 'RESUBMIT' && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><b className="flex items-center gap-1"><RotateCcw size={14} /> Teacher asked to redo:</b> {s.feedback}</div>}

                {s?.status === 'PUBLISHED' && (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-3">
                      <Award size={18} className="text-emerald-600" />
                      {s.marks != null && <span className="text-lg font-bold text-navy-900">{s.marks}{h.maxMarks ? <span className="text-sm font-normal text-slate-500">/{h.maxMarks}</span> : ''}</span>}
                      {s.grade && <span className="badge bg-emerald-600 text-white">{s.grade}</span>}
                      <span className="text-xs text-slate-500">checked by {s.evaluatedByName} • {fmtDate(s.publishedAt)}</span>
                    </div>
                    {s.feedback && <p className="mt-2 flex gap-1.5 text-slate-700"><MessageSquare size={14} className="mt-0.5 shrink-0 text-slate-400" />{s.feedback}</p>}
                    <Files files={s.checkedFiles} label="Checked copy" />
                    <div className="mt-3 border-t border-emerald-200 pt-2 text-xs">
                      {s.parentAckAt ? <span className="flex items-center gap-1 text-emerald-700"><CheckCircle2 size={14} /> Acknowledged by {s.parentAckByName} on {fmtDateTime(s.parentAckAt)}{s.parentAckNote && ` — “${s.parentAckNote}”`}</span>
                        : user.role === 'PARENT' ? <button className="btn-success btn-sm" onClick={() => setAck(h)}><ThumbsUp size={13} /> Acknowledge</button>
                        : <span className="flex items-center gap-1 text-amber-700"><AlertTriangle size={13} /> Waiting for parent's acknowledgement</span>}
                    </div>
                  </div>
                )}

                {canSubmit(h) && <div className="mt-auto pt-4"><button className="btn-primary w-full" onClick={() => { setSubmitFor(h); setText(s?.text || ''); setFiles([]); }}><Upload size={15} /> {s ? 'Submit again' : 'Submit homework'}</button></div>}
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal open={!!submitFor} onClose={() => setSubmitFor(null)} title={`Submit — ${submitFor?.title}`} size="md" footer={<><button className="btn-outline" onClick={() => setSubmitFor(null)}>Cancel</button><button className="btn-primary" disabled={busy || (!text.trim() && !files.length)} onClick={submit}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Submit</button></>}>
        {submitFor && (
          <div className="space-y-4">
            {submitFor.overdue && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">The due date has passed — this will be marked as a late submission.</p>}
            <Field label="Your answer (optional)"><textarea className="input" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your answer here…" /></Field>
            <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center hover:border-brand-400">
              <Upload className="text-brand-600" /><span className="mt-2 text-sm font-semibold">Upload photos / PDF of your work</span><span className="text-xs text-slate-500">Up to 6 files, 5 MB each (JPG, PNG, PDF)</span>
              <input type="file" multiple accept=".png,.jpg,.jpeg,.webp,.pdf" capture="environment" className="hidden" onChange={(e) => setFiles([...files, ...Array.from(e.target.files)].slice(0, 6))} />
            </label>
            {files.map((f, k) => <div key={k} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"><span className="flex items-center gap-2"><FileText size={14} /> {f.name} <span className="text-xs text-slate-400">{(f.size / 1024).toFixed(0)} KB</span></span><button onClick={() => setFiles(files.filter((_, i) => i !== k))}><X size={15} className="text-slate-400" /></button></div>)}
          </div>
        )}
      </Modal>

      <Modal open={!!ack} onClose={() => setAck(null)} title="Acknowledge homework evaluation" size="sm" footer={<><button className="btn-outline" onClick={() => setAck(null)}>Cancel</button><button className="btn-success" disabled={busy} onClick={acknowledge}>{busy && <Loader2 size={16} className="animate-spin" />} Acknowledge</button></>}>
        {ack && <div className="space-y-4 text-sm"><p>I have seen the teacher's evaluation of <b>{ack.title}</b>{ack.submission.marks != null && <> — <b>{ack.submission.marks}{ack.maxMarks ? `/${ack.maxMarks}` : ''}</b></>}.</p><Field label="Note to teacher (optional)"><textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Thank you, we will practise more at home." /></Field></div>}
      </Modal>
    </div>
  );
}
