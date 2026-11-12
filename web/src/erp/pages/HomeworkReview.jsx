// Teacher: review submissions of one homework, evaluate, request redo, publish, see parent acknowledgements.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { NotebookPen, FileText, Upload, Loader2, Save, Send, RotateCcw, CheckCircle2, Clock, ThumbsUp, ArrowLeft, Eye } from 'lucide-react';
import { api, errMsg, uploadFile } from '../../lib/api';
import { fmtDate, fmtDateTime, fullName } from '../../lib/format';
import { PageHeader, Card, Spinner, Empty, useFetch, Badge, Stat, Field, Avatar, ErrorBox } from '../components/ui';

const LABEL = { SUBMITTED: ['To check', 'NEW'], EVALUATED: ['Checked (not published)', 'TEST_SCHEDULED'], PUBLISHED: ['Published', 'PAID'], RESUBMIT: ['Redo requested', 'PENDING'] };
const GRADES = ['A+', 'A', 'B+', 'B', 'C', 'D', 'E'];

export default function HomeworkReview() {
  const { id } = useParams();
  const { data, loading, error, reload } = useFetch(`/homework/${id}/submissions`);
  const [sel, setSel] = useState(null);
  const [f, setF] = useState({ marks: '', grade: '', feedback: '', checkedFiles: [] });
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState('ALL');

  const rows = data?.rows || [];
  const current = rows.find((r) => r.student.id === sel);
  useEffect(() => {
    const s = current?.submission;
    setF({ marks: s?.marks ?? '', grade: s?.grade || '', feedback: s?.feedback || '', checkedFiles: s?.checkedFiles || [] });
  }, [sel, data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <ErrorBox error={error} />;
  if (loading && !data) return <Spinner />;
  const hw = data.homework;
  const st = data.stats;
  const filtered = rows.filter((r) => tab === 'ALL' || (tab === 'PENDING' ? r.submission?.status === 'SUBMITTED' : tab === 'MISSING' ? !r.submission : tab === 'NOACK' ? r.submission?.status === 'PUBLISHED' && !r.submission.parentAckAt : true));

  const act = async (kind) => {
    const s = current.submission;
    setBusy(kind);
    try {
      if (kind === 'resubmit') await api.post(`/homework-submissions/${s.id}/resubmit`, { feedback: f.feedback });
      else await api.put(`/homework-submissions/${s.id}/evaluate`, { ...f, publish: kind === 'publish' });
      toast.success(kind === 'resubmit' ? 'Student asked to redo' : kind === 'publish' ? 'Evaluation published to student & parent' : 'Saved — publish when ready');
      reload();
      const next = rows.find((r) => r.submission?.status === 'SUBMITTED' && r.student.id !== sel);
      if (next && kind !== 'resubmit') setSel(next.student.id);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(''); }
  };
  const publishAll = async () => {
    setBusy('all');
    try { const { data: r } = await api.post(`/homework/${id}/publish`, {}); toast.success(`${r.published} evaluations published`); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(''); }
  };

  return (
    <div>
      <Link to="/app/homework" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft size={15} /> All homework</Link>
      <PageHeader title={hw.title} subtitle={`${hw.subject.name} • Class ${hw.section.grade.name}-${hw.section.name} • Due ${fmtDate(hw.dueDate)}${hw.maxMarks ? ` • Max ${hw.maxMarks} marks` : ''}`} icon={NotebookPen}
        actions={<button className="btn-primary" disabled={!rows.some((r) => r.submission?.status === 'EVALUATED') || busy === 'all'} onClick={publishAll}>{busy === 'all' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Publish all checked</button>} />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-6">
        <Stat label="Students" value={st.total} color="navy" />
        <Stat label="Submitted" value={st.submitted} color="sky" sub={`${st.late} late`} />
        <Stat label="Not submitted" value={st.notSubmitted} color="rose" />
        <Stat label="Checked" value={st.evaluated} color="violet" />
        <Stat label="Published" value={st.published} color="emerald" />
        <Stat label="Parent ack." value={`${st.acknowledged}/${st.published}`} color="amber" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card pad={false}>
          <div className="flex flex-wrap gap-1 border-b p-3">{[['ALL', 'All'], ['PENDING', 'To check'], ['MISSING', 'Not submitted'], ['NOACK', 'No parent ack']].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === k ? 'bg-navy-800 text-white' : 'bg-slate-100 text-slate-600'}`}>{l}</button>)}</div>
          <div className="max-h-[65vh] divide-y overflow-y-auto">
            {!filtered.length && <Empty text="Nobody here" />}
            {filtered.map(({ student, submission: s }) => (
              <button key={student.id} onClick={() => setSel(student.id)} className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${sel === student.id ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
                <span className="w-6 text-xs text-slate-400">{student.rollNo}</span><Avatar name={fullName(student)} size={32} />
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{fullName(student)}</div>
                  <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                    {s ? <Badge status={LABEL[s.status][1]}>{LABEL[s.status][0]}</Badge> : <Badge status="UNPAID">Not submitted</Badge>}
                    {s?.isLate && <Badge status="LATE">Late</Badge>}
                    {s?.marks != null && <b>{s.marks}{hw.maxMarks ? `/${hw.maxMarks}` : ''}</b>}
                    {s?.parentAckAt && <ThumbsUp size={12} className="text-emerald-600" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {!current ? <Card><Empty text="Select a student to view and check their work" icon={Eye} /></Card> : !current.submission ? (
          <Card title={fullName(current.student)}><Empty text="Not submitted yet" icon={Clock} /></Card>
        ) : (() => {
          const s = current.submission;
          return (
            <Card title={<span className="flex items-center gap-2">{fullName(current.student)} <span className="text-xs font-normal text-slate-400">{current.student.admissionNo}</span></span>} actions={<Badge status={LABEL[s.status][1]}>{LABEL[s.status][0]}</Badge>}>
              <div className="space-y-5">
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <div className="text-xs text-slate-500">Submitted {fmtDateTime(s.submittedAt)} by {s.submittedBy} ({s.submittedByRole?.toLowerCase()}) {s.isLate && <Badge status="LATE">Late</Badge>} {s.attempts > 1 && `• attempt ${s.attempts}`}</div>
                  {s.text && <p className="mt-2 whitespace-pre-wrap">{s.text}</p>}
                  {s.files.length > 0 && <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{s.files.map((x) => /\.(png|jpe?g|webp|gif)$/i.test(x.name) ? <a key={x.url} href={x.url} target="_blank" rel="noreferrer"><img src={x.url} alt={x.name} className="h-32 w-full rounded-lg border object-cover hover:opacity-90" /></a> : <a key={x.url} href={x.url} target="_blank" rel="noreferrer" className="flex h-32 flex-col items-center justify-center rounded-lg border bg-white text-xs hover:border-brand-300"><FileText className="mb-1 text-brand-600" />{x.name}</a>)}</div>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={`Marks${hw.maxMarks ? ` (out of ${hw.maxMarks})` : ''}`}><input type="number" step="0.5" min={0} max={hw.maxMarks || undefined} className="input" value={f.marks} onChange={(e) => setF({ ...f, marks: e.target.value })} /></Field>
                  <Field label="Grade"><div className="flex flex-wrap gap-1">{GRADES.map((g) => <button key={g} type="button" onClick={() => setF({ ...f, grade: f.grade === g ? '' : g })} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${f.grade === g ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200'}`}>{g}</button>)}</div></Field>
                </div>
                <Field label="Feedback for student & parent"><textarea className="input" rows={4} value={f.feedback} onChange={(e) => setF({ ...f, feedback: e.target.value })} placeholder="Well done! Work on your handwriting…" /></Field>
                <div>
                  <div className="label">Checked copy (optional)</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {f.checkedFiles.map((x) => <a key={x.url} href={x.url} target="_blank" rel="noreferrer" className="badge bg-sky-50 px-3 py-1.5 text-sky-700"><FileText size={12} /> {x.name}</a>)}
                    <label className="btn-outline btn-sm cursor-pointer"><Upload size={14} /> Upload<input type="file" accept=".png,.jpg,.jpeg,.pdf" className="hidden" onChange={async (e) => { const file = e.target.files[0]; if (!file) return; try { const url = await uploadFile(file); setF((v) => ({ ...v, checkedFiles: [...v.checkedFiles, { name: file.name, url }] })); } catch (er) { toast.error(errMsg(er)); } }} /></label>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                  <button className="btn-outline text-amber-700" disabled={!!busy || f.feedback.trim().length < 3 || s.status === 'PUBLISHED'} onClick={() => act('resubmit')} title="Write what to correct in Feedback">{busy === 'resubmit' ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />} Ask to redo</button>
                  <button className="btn-outline" disabled={!!busy} onClick={() => act('save')}>{busy === 'save' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save</button>
                  <button className="btn-primary" disabled={!!busy} onClick={() => act('publish')}>{busy === 'publish' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} {s.status === 'PUBLISHED' ? 'Update published' : 'Save & publish'}</button>
                </div>
                {s.status === 'PUBLISHED' && (
                  <div className={`rounded-xl p-3 text-sm ${s.parentAckAt ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                    {s.parentAckAt ? <span className="flex items-center gap-1"><CheckCircle2 size={15} /> Parent ({s.parentAckByName}) acknowledged on {fmtDateTime(s.parentAckAt)}{s.parentAckNote && <> — “{s.parentAckNote}”</>}</span> : <span className="flex items-center gap-1"><Clock size={15} /> Published {fmtDateTime(s.publishedAt)} — waiting for parent's acknowledgement</span>}
                  </div>
                )}
                <details className="text-xs text-slate-500"><summary className="cursor-pointer">History</summary><ul className="mt-2 space-y-1">{s.history.map((h, k) => <li key={k}>{fmtDateTime(h.at)} — {h.action.replace(/_/g, ' ').toLowerCase()} by {h.by}{h.note ? `: “${h.note}”` : ''}</li>)}</ul></details>
              </div>
            </Card>
          );
        })()}
      </div>
    </div>
  );
}
