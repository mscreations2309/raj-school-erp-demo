// Teacher: open a submission straight into annotation + evaluation. Marks autosave to the cloud;
// on Save/Publish the annotated pages become the checked copy automatically. Claude AI can suggest
// an evaluation, which the teacher reviews before publishing.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { NotebookPen, FileText, Loader2, Save, Send, RotateCcw, CheckCircle2, Clock, ThumbsUp, ArrowLeft, Eye, Sparkles, Cloud, CloudOff, Wand2, AlertTriangle, ChevronDown } from 'lucide-react';
import { api, errMsg } from '../../lib/api';
import { fmtDate, fmtDateTime, fullName } from '../../lib/format';
import { Card, Spinner, Empty, useFetch, Badge, Field, Avatar, ErrorBox } from '../components/ui';
import Annotator, { flattenPage, pdfToImages } from '../components/Annotator';

const LABEL = { SUBMITTED: ['To check', 'NEW'], EVALUATED: ['Checked (not published)', 'TEST_SCHEDULED'], PUBLISHED: ['Published', 'PAID'], RESUBMIT: ['Redo requested', 'PENDING'] };
const GRADES = ['A+', 'A', 'B+', 'B', 'C', 'D', 'E'];
const VERDICT = { correct: ['Correct', 'text-emerald-700 bg-emerald-50'], partially_correct: ['Partly correct', 'text-amber-700 bg-amber-50'], incorrect: ['Incorrect', 'text-rose-700 bg-rose-50'], not_attempted: ['Not attempted', 'text-slate-600 bg-slate-100'] };
const isImg = (n) => /\.(png|jpe?g|webp|gif)$/i.test(n);
const isPdf = (n) => /\.pdf$/i.test(n);

function AiPanel({ ai, maxMarks, onApply }) {
  const [open, setOpen] = useState(true);
  if (!ai) return null;
  return (
    <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-3 text-sm">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between font-semibold text-violet-800"><span className="flex items-center gap-1.5"><Sparkles size={15} /> Claude AI suggestion</span><ChevronDown size={15} className={open ? 'rotate-180' : ''} /></button>
      {open && (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {ai.suggestedMarks != null && <span className="text-lg font-bold text-navy-900">{ai.suggestedMarks}<span className="text-xs font-normal text-slate-500">/{maxMarks}</span></span>}
            <span className="badge bg-violet-600 text-white">{ai.suggestedGrade}</span>
            <span className={`badge ${ai.confidence === 'high' ? 'bg-emerald-50 text-emerald-700' : ai.confidence === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>{ai.confidence} confidence</span>
            {ai.legibility !== 'clear' && <span className="badge bg-amber-50 text-amber-700"><AlertTriangle size={11} /> {ai.legibility.replace('_', ' ')}</span>}
          </div>
          <p className="text-slate-700">{ai.summary}</p>
          {ai.questions?.length > 0 && <div className="space-y-1">{ai.questions.map((q, k) => <div key={k} className="flex items-start gap-2 text-xs"><span className={`badge shrink-0 ${VERDICT[q.verdict]?.[1]}`}>{q.label}: {VERDICT[q.verdict]?.[0]}{maxMarks ? ` • ${q.marksAwarded}` : ''}</span><span className="text-slate-600">{q.comment}</span></div>)}</div>}
          {ai.strengths?.length > 0 && <div className="text-xs"><b className="text-emerald-700">Strengths:</b> {ai.strengths.join('; ')}</div>}
          {ai.improvements?.length > 0 && <div className="text-xs"><b className="text-amber-700">Improve:</b> {ai.improvements.join('; ')}</div>}
          {ai.teacherNotes && <div className="rounded-lg bg-white/70 p-2 text-xs text-slate-600"><b>Note for teacher:</b> {ai.teacherNotes}</div>}
          <div className="rounded-lg bg-white p-2 text-xs italic text-slate-700">“{ai.feedbackForStudent}”</div>
          <button className="btn-outline btn-sm w-full border-violet-300 text-violet-700 hover:bg-violet-50" onClick={onApply}><Wand2 size={13} /> Use this suggestion (you can edit before publishing)</button>
        </div>
      )}
    </div>
  );
}

export default function HomeworkReview() {
  const { id } = useParams();
  const { data, loading, error, reload, setData } = useFetch(`/homework/${id}/submissions`);
  const { data: aiStatus } = useFetch('/ai/status');
  const [sel, setSel] = useState(null);
  const [tab, setTab] = useState('ALL');
  const [f, setF] = useState({ marks: '', grade: '', feedback: '' });
  const [ann, setAnn] = useState({});
  const [pages, setPages] = useState([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [saveState, setSaveState] = useState('saved'); // saved | saving | dirty | error
  const [busy, setBusy] = useState('');
  const [aiUsed, setAiUsed] = useState(false);
  const timer = useRef(null);

  const rows = data?.rows || [];
  const current = rows.find((r) => r.student.id === sel);
  const sub = current?.submission;

  // pick first student needing a check
  useEffect(() => { if (data && !sel) setSel((rows.find((r) => r.submission?.status === 'SUBMITTED') || rows.find((r) => r.submission))?.student.id || null); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // load the selected submission into the board
  useEffect(() => {
    setF({ marks: sub?.marks ?? '', grade: sub?.grade || '', feedback: sub?.feedback || '' });
    setAnn(sub?.annotations || {});
    setSaveState('saved');
    setAiUsed(!!sub?.aiAssisted);
    if (!sub) { setPages([]); return; }
    let alive = true;
    (async () => {
      setPagesLoading(true);
      const out = [];
      for (const file of sub.files || []) {
        if (isImg(file.name) || isImg(file.url)) out.push({ key: file.url, src: file.url, name: file.name });
        else if (isPdf(file.name)) {
          try { (await pdfToImages(file.url)).forEach((src, k) => out.push({ key: `${file.url}#p${k + 1}`, src, name: `${file.name} – page ${k + 1}` })); } catch { /* shown as link below */ }
        }
      }
      if (alive) { setPages(out); setPagesLoading(false); }
    })();
    return () => { alive = false; };
  }, [sub?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // autosave annotations to the cloud
  const changeAnn = useCallback((next) => {
    setAnn(next);
    setSaveState('dirty');
    clearTimeout(timer.current);
    const sid = sub?.id;
    timer.current = setTimeout(async () => {
      setSaveState('saving');
      try { await api.put(`/homework-submissions/${sid}/annotations`, { annotations: next }); setSaveState('saved'); } catch { setSaveState('error'); }
    }, 1200);
  }, [sub?.id]);
  useEffect(() => () => clearTimeout(timer.current), []);

  if (error) return <ErrorBox error={error} />;
  if (loading && !data) return <Spinner />;
  const hw = data.homework;
  const st = data.stats;
  const filtered = rows.filter((r) => tab === 'ALL' || (tab === 'PENDING' ? r.submission?.status === 'SUBMITTED' : tab === 'MISSING' ? !r.submission : tab === 'NOACK' ? r.submission?.status === 'PUBLISHED' && !r.submission.parentAckAt : true));

  /** Annotated pages → PNGs uploaded to the cloud → checked copy (no manual upload). */
  const buildCheckedCopy = async () => {
    const marked = pages.filter((p) => (ann[p.key] || []).length);
    const out = [];
    for (const p of marked) {
      const blob = await flattenPage(p.src, ann[p.key]);
      const fd = new FormData();
      fd.append('file', new File([blob], `checked-page-${out.length + 1}.png`, { type: 'image/png' }));
      const { data: up } = await api.post('/upload', fd);
      out.push({ name: `Checked – ${p.name}`, url: up.url });
    }
    return out;
  };

  const act = async (kind) => {
    setBusy(kind);
    try {
      clearTimeout(timer.current);
      if (saveState !== 'saved') await api.put(`/homework-submissions/${sub.id}/annotations`, { annotations: ann });
      if (kind === 'resubmit') {
        await api.post(`/homework-submissions/${sub.id}/resubmit`, { feedback: f.feedback });
        toast.success('Student asked to redo');
      } else {
        const checkedFiles = await buildCheckedCopy();
        await api.put(`/homework-submissions/${sub.id}/evaluate`, { ...f, checkedFiles, publish: kind === 'publish', aiAssisted: aiUsed });
        toast.success(kind === 'publish' ? 'Published to student & parent (with your marked-up copy)' : 'Saved to cloud — publish when ready');
      }
      setSaveState('saved');
      const nextRow = rows.find((r) => r.submission?.status === 'SUBMITTED' && r.student.id !== sel);
      await reload();
      if (nextRow && kind !== 'save') setSel(nextRow.student.id);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(''); }
  };

  const aiEvaluate = async () => {
    setBusy('ai');
    try {
      const { data: updated } = await api.post(`/homework-submissions/${sub.id}/ai-evaluate`);
      setData((d) => ({ ...d, rows: d.rows.map((r) => (r.submission?.id === updated.id ? { ...r, submission: { ...r.submission, aiEvaluation: updated.aiEvaluation, aiEvaluatedAt: updated.aiEvaluatedAt, history: updated.history } } : r)) }));
      toast.success('Claude has suggested an evaluation — please review it');
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(''); }
  };
  const applyAi = () => {
    const ai = sub.aiEvaluation;
    setF({ marks: ai.suggestedMarks ?? '', grade: ai.suggestedGrade || '', feedback: ai.feedbackForStudent || '' });
    setAiUsed(true);
    toast('Suggestion applied — review and edit before publishing', { icon: '✍️' });
  };

  const SaveBadge = () => (
    <span className={`flex items-center gap-1 text-xs ${saveState === 'error' ? 'text-rose-600' : saveState === 'saved' ? 'text-emerald-600' : 'text-slate-500'}`}>
      {saveState === 'error' ? <><CloudOff size={14} /> Not saved — check connection</> : saveState === 'saved' ? <><Cloud size={14} /> Saved to cloud</> : <><Loader2 size={13} className="animate-spin" /> Saving…</>}
    </span>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/app/homework" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft size={15} /> All homework</Link>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-bold text-navy-900"><NotebookPen size={20} className="text-brand-600" /> {hw.title}</h1>
          <p className="text-sm text-slate-500">{hw.subject.name} • Class {hw.section.grade.name}-{hw.section.name} • Due {fmtDate(hw.dueDate)}{hw.maxMarks ? ` • Max ${hw.maxMarks} marks` : ''}{hw.answerKey ? ' • Answer key set' : ''}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {[['Submitted', `${st.submitted}/${st.total}`, 'bg-sky-50 text-sky-700'], ['Late', st.late, 'bg-amber-50 text-amber-700'], ['Checked', st.evaluated, 'bg-violet-50 text-violet-700'], ['Published', st.published, 'bg-emerald-50 text-emerald-700'], ['Parent ack.', `${st.acknowledged}/${st.published}`, 'bg-slate-100 text-slate-700']].map(([l, v, c]) => <span key={l} className={`rounded-xl px-3 py-2 font-semibold ${c}`}>{l}: {v}</span>)}
          <button className="btn-primary" disabled={!rows.some((r) => r.submission?.status === 'EVALUATED') || busy === 'all'} onClick={async () => { setBusy('all'); try { const { data: r } = await api.post(`/homework/${id}/publish`, {}); toast.success(`${r.published} evaluations published`); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(''); } }}><Send size={15} /> Publish all checked</button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[240px_1fr_360px]">
        {/* Students */}
        <Card pad={false} className="h-fit">
          <div className="flex flex-wrap gap-1 border-b p-2">{[['ALL', 'All'], ['PENDING', 'To check'], ['MISSING', 'Missing'], ['NOACK', 'No ack']].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${tab === k ? 'bg-navy-800 text-white' : 'bg-slate-100 text-slate-600'}`}>{l}</button>)}</div>
          <div className="max-h-[70vh] divide-y overflow-y-auto">
            {!filtered.length && <Empty text="Nobody here" />}
            {filtered.map(({ student, submission: s }) => (
              <button key={student.id} onClick={() => setSel(student.id)} className={`flex w-full items-center gap-2 px-3 py-2.5 text-left ${sel === student.id ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
                <Avatar name={fullName(student)} size={28} />
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{student.rollNo}. {fullName(student)}</div>
                  <div className="flex flex-wrap items-center gap-1 text-[10px]">{s ? <Badge status={LABEL[s.status][1]}>{LABEL[s.status][0]}</Badge> : <Badge status="UNPAID">Missing</Badge>}{s?.isLate && <Badge status="LATE">Late</Badge>}{s?.aiEvaluation && <Sparkles size={11} className="text-violet-500" />}{s?.parentAckAt && <ThumbsUp size={11} className="text-emerald-600" />}</div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Work + annotation */}
        <div className="min-w-0 space-y-3">
          {!current ? <Card><Empty text="Select a student" icon={Eye} /></Card> : !sub ? <Card><Empty text={`${fullName(current.student)} has not submitted yet`} icon={Clock} /></Card> : (
            <>
              <div className="card p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2"><div className="font-semibold text-navy-900">{fullName(current.student)} <span className="font-normal text-slate-400">• {current.student.admissionNo}</span></div><SaveBadge /></div>
                <div className="mt-1 text-xs text-slate-500">Submitted {fmtDateTime(sub.submittedAt)} by {sub.submittedBy}{sub.isLate && ' • LATE'}{sub.attempts > 1 && ` • attempt ${sub.attempts}`}</div>
                {sub.text && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3">{sub.text}</p>}
                {sub.files.filter((x) => !isImg(x.name) && !isPdf(x.name)).map((x) => <a key={x.url} href={x.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-brand-600 underline"><FileText size={13} /> {x.name}</a>)}
              </div>
              {(pagesLoading || pages.length > 0) ? <Annotator pages={pages} value={ann} onChange={changeAnn} loading={pagesLoading} /> : <div className="card p-6 text-center text-sm text-slate-400">No photos/PDF attached — evaluate the typed answer.</div>}
            </>
          )}
        </div>

        {/* Evaluation */}
        <div className="space-y-3">
          {sub && (
            <Card title={<span className="flex items-center gap-2">Evaluation <Badge status={LABEL[sub.status][1]}>{LABEL[sub.status][0]}</Badge></span>}>
              <div className="space-y-4">
                <button className="btn w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700" disabled={busy === 'ai' || aiStatus?.enabled === false || sub.status === 'PUBLISHED'} onClick={aiEvaluate} title={aiStatus?.enabled === false ? 'AI evaluation is not set up on the server yet' : ''}>
                  {busy === 'ai' ? <><Loader2 size={16} className="animate-spin" /> Claude is reading the work…</> : <><Sparkles size={16} /> {sub.aiEvaluation ? 'Re-evaluate with Claude AI' : 'Evaluate with Claude AI'}</>}
                </button>
                {aiStatus?.enabled === false && <p className="-mt-2 text-center text-[11px] text-amber-700">AI evaluation needs to be switched on by the administrator.</p>}
                <AiPanel ai={sub.aiEvaluation} maxMarks={hw.maxMarks} onApply={applyAi} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label={`Marks${hw.maxMarks ? ` / ${hw.maxMarks}` : ''}`}><input type="number" step="0.5" min={0} max={hw.maxMarks || undefined} className="input" value={f.marks} onChange={(e) => setF({ ...f, marks: e.target.value })} /></Field>
                  <Field label="Grade"><select className="input" value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })}><option value="">—</option>{GRADES.map((g) => <option key={g}>{g}</option>)}</select></Field>
                </div>
                <Field label="Feedback for student & parent"><textarea className="input" rows={5} value={f.feedback} onChange={(e) => setF({ ...f, feedback: e.target.value })} placeholder="Well done! Work on…" /></Field>
                {aiUsed && <p className="text-[11px] text-violet-700">✓ AI-assisted — reviewed by you before publishing</p>}
                <p className="text-[11px] text-slate-500">Your pen marks are saved automatically and attached as the checked copy when you save or publish.</p>
                <div className="grid grid-cols-2 gap-2">
                  <button className="btn-outline" disabled={!!busy} onClick={() => act('save')}>{busy === 'save' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save</button>
                  <button className="btn-primary" disabled={!!busy} onClick={() => act('publish')}>{busy === 'publish' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} {sub.status === 'PUBLISHED' ? 'Update' : 'Publish'}</button>
                </div>
                <button className="btn-ghost w-full text-amber-700" disabled={!!busy || f.feedback.trim().length < 3 || sub.status === 'PUBLISHED'} onClick={() => act('resubmit')} title="Write what to correct in Feedback first">{busy === 'resubmit' ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />} Ask student to redo</button>
                {sub.status === 'PUBLISHED' && (
                  <div className={`rounded-xl p-3 text-xs ${sub.parentAckAt ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                    {sub.parentAckAt ? <span className="flex items-start gap-1"><CheckCircle2 size={14} className="shrink-0" /> Parent ({sub.parentAckByName}) acknowledged {fmtDateTime(sub.parentAckAt)}{sub.parentAckNote && <> — “{sub.parentAckNote}”</>}</span> : <span className="flex items-center gap-1"><Clock size={14} /> Waiting for parent's acknowledgement</span>}
                  </div>
                )}
                <details className="text-[11px] text-slate-500"><summary className="cursor-pointer">History</summary><ul className="mt-1 space-y-0.5">{sub.history.map((h, k) => <li key={k}>{fmtDateTime(h.at)} — {h.action.replace(/_/g, ' ').toLowerCase()} by {h.by}{h.note ? `: “${h.note}”` : ''}</li>)}</ul></details>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
