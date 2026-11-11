import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BookMarked, Save, Loader2, Printer, Trophy, Award } from 'lucide-react';
import { api, errMsg } from '../../lib/api';
import { fmtDate, fullName } from '../../lib/format';
import { PageHeader, Card, Spinner, Empty, useFetch, Field, Badge, Stat, ErrorBox } from '../components/ui';
import { SectionSelect, useSections } from './Students';

function ExamSelect({ value, onChange }) {
  const { data } = useFetch('/exams', { all: 1 });
  return <select className="input" value={value} onChange={(e) => onChange(e.target.value)}><option value="">Select exam</option>{(data?.items || []).map((e) => <option key={e.id} value={e.id}>{e.name} ({e.academicYear?.name}){e.isPublished ? ' ✓' : ''}</option>)}</select>;
}

export function MarksEntry() {
  const [examId, setExam] = useState('');
  const [sectionId, setSection] = useState('');
  const [subjectId, setSubject] = useState('');
  const { data: subs } = useFetch(sectionId ? '/section-subjects' : null, { sectionId, all: 1 });
  const { data, loading, error } = useFetch(examId && sectionId && subjectId ? '/assessment/marks' : null, { examId, sectionId, subjectId });
  const [rows, setRows] = useState([]);
  const [max, setMax] = useState(100);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) { setRows(data.rows); setMax(data.maxMarks); } }, [data]);
  const save = async () => {
    setBusy(true);
    try { const { data: r } = await api.post('/assessment/marks', { examId, sectionId, subjectId, maxMarks: max, records: rows.map((x) => ({ studentId: x.id, marksObtained: x.marksObtained, isAbsent: x.isAbsent, remarks: x.remarks })) }); toast.success(`Marks saved for ${r.saved} students`); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const filled = rows.filter((r) => r.marksObtained !== null && r.marksObtained !== '' || r.isAbsent).length;
  return (
    <div>
      <PageHeader title="Marks Entry" subtitle="Enter subject-wise marks; grades are calculated automatically (CBSE scale)" icon={BookMarked} />
      <Card><div className="grid gap-4 md:grid-cols-3">
        <Field label="Exam"><ExamSelect value={examId} onChange={setExam} /></Field>
        <Field label="Class & section"><SectionSelect value={sectionId} onChange={(v) => { setSection(v); setSubject(''); }} /></Field>
        <Field label="Subject"><select className="input" value={subjectId} onChange={(e) => setSubject(e.target.value)}><option value="">Select subject</option>{(subs?.items || []).map((s) => <option key={s.subjectId} value={s.subjectId}>{s.subject.name}{s.teacher ? ` — ${s.teacher.firstName}` : ''}</option>)}</select></Field>
      </div></Card>
      {!(examId && sectionId && subjectId) ? <Card className="mt-6"><Empty text="Choose exam, class and subject" icon={BookMarked} /></Card> : loading ? <Spinner /> : error ? <ErrorBox error={error} /> : (
        <Card className="mt-6" pad={false} title={`${filled}/${rows.length} entered`} actions={<div className="flex items-center gap-2 text-sm">Max marks <input type="number" className="input w-20" value={max} onChange={(e) => setMax(Number(e.target.value))} /></div>}>
          <div className="overflow-x-auto"><table className="table-x">
            <thead><tr><th>Roll</th><th>Student</th><th>Marks (out of {max})</th><th>Absent</th><th>Remarks</th></tr></thead>
            <tbody>{rows.map((r, k) => {
              const bad = r.marksObtained !== null && r.marksObtained !== '' && (Number(r.marksObtained) > max || Number(r.marksObtained) < 0);
              return (
                <tr key={r.id}>
                  <td>{r.rollNo}</td><td className="font-medium">{fullName(r)}</td>
                  <td><input type="number" step="0.5" disabled={r.isAbsent} className={`input w-28 ${bad ? 'border-rose-400 ring-4 ring-rose-100' : ''}`} value={r.marksObtained ?? ''} onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById(`m-${k + 1}`)?.focus(); }} id={`m-${k}`} onChange={(e) => setRows(rows.map((x) => (x.id === r.id ? { ...x, marksObtained: e.target.value } : x)))} /></td>
                  <td><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={r.isAbsent} onChange={(e) => setRows(rows.map((x) => (x.id === r.id ? { ...x, isAbsent: e.target.checked } : x)))} /></td>
                  <td><input className="input" value={r.remarks || ''} onChange={(e) => setRows(rows.map((x) => (x.id === r.id ? { ...x, remarks: e.target.value } : x)))} /></td>
                </tr>
              );
            })}</tbody>
          </table></div>
          <div className="flex justify-end border-t p-4"><button className="btn-primary" disabled={busy} onClick={save}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save marks</button></div>
        </Card>
      )}
    </div>
  );
}

export function Results() {
  const [examId, setExam] = useState('');
  const [sectionId, setSection] = useState('');
  const { data, loading } = useFetch(examId && sectionId ? '/assessment/results' : null, { examId, sectionId });
  return (
    <div>
      <PageHeader title="Results & Report Cards" subtitle="Tabulation sheet with rank, grade and printable report cards" icon={Trophy} actions={data && <button className="btn-outline" onClick={() => window.print()}><Printer size={16} /> Print sheet</button>} />
      <Card className="no-print"><div className="grid gap-4 md:grid-cols-2"><Field label="Exam"><ExamSelect value={examId} onChange={setExam} /></Field><Field label="Class & section"><SectionSelect value={sectionId} onChange={setSection} /></Field></div></Card>
      {!(examId && sectionId) ? <Card className="mt-6"><Empty text="Select exam and class" /></Card> : loading ? <Spinner /> : data && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            <Stat label="Appeared" value={data.summary.appeared} icon={BookMarked} color="navy" />
            <Stat label="Passed" value={data.summary.passed} icon={Award} color="emerald" />
            <Stat label="Class average" value={data.summary.average != null ? `${data.summary.average}%` : '—'} icon={Trophy} color="amber" />
            <Stat label="Topper" value={data.summary.topper ? fullName(data.summary.topper) : '—'} sub={data.summary.topper && `${data.summary.topper.percent}%`} icon={Trophy} color="brand" />
          </div>
          <Card className="print-area mt-6" pad={false}>
            <div className="overflow-x-auto"><table className="table-x">
              <thead><tr><th>Rank</th><th>Roll</th><th>Student</th>{data.subjects.map((s) => <th key={s.id} className="text-center">{s.code || s.name}</th>)}<th>Total</th><th>%</th><th>Grade</th><th>Result</th><th className="no-print"></th></tr></thead>
              <tbody>{data.rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.rank ? <span className={`badge ${r.rank <= 3 ? 'bg-gold-300/50 text-amber-900' : 'bg-slate-100'}`}>#{r.rank}</span> : '—'}</td>
                  <td>{r.rollNo}</td><td className="whitespace-nowrap font-medium">{fullName(r)}</td>
                  {data.subjects.map((s) => { const m = r.marks[s.id]; return <td key={s.id} className={`text-center ${m && !m.isAbsent && m.marksObtained < m.maxMarks * 0.33 ? 'font-bold text-rose-600' : ''}`}>{m ? (m.isAbsent ? 'AB' : m.marksObtained) : '—'}</td>; })}
                  <td className="font-semibold">{r.obtained}/{r.max}</td><td className="font-semibold">{r.percent ?? '—'}</td><td><Badge status="NEW">{r.grade}</Badge></td><td><Badge status={r.result === 'PASS' ? 'PASS' : 'PARTIAL'}>{r.result}</Badge></td>
                  <td className="no-print"><Link className="btn-ghost btn-sm" to={`/app/report-card?examId=${examId}&studentId=${r.id}`}><Printer size={14} /></Link></td>
                </tr>
              ))}</tbody>
            </table></div>
          </Card>
        </>
      )}
    </div>
  );
}

export function ReportCardView({ data }) {
  const s = data.student;
  return (
    <div className="print-area mx-auto max-w-4xl rounded-2xl border-4 border-double border-navy-200 bg-white p-8">
      <div className="flex items-center gap-5 border-b-2 border-navy-800 pb-5">
        <img src={data.school.logoUrl} alt="" className="h-20 w-20" />
        <div className="flex-1 text-center"><h1 className="font-display text-3xl font-bold text-navy-900">{data.school.name}</h1><p className="text-sm text-slate-600">{data.school.address}, {data.school.city} • CBSE Affiliation No. {data.school.affiliationNo}</p><p className="mt-2 inline-block rounded-full bg-brand-600 px-4 py-1 text-sm font-bold uppercase tracking-wider text-white">Report Card — {data.exam.name}</p></div>
        <div className="w-20 text-right text-xs text-slate-500">Session<br /><b>{data.exam.academicYear?.name}</b></div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
        {[["Student's name", fullName(s)], ['Admission no.', s.admissionNo], ['Class', `${s.grade?.name}-${s.section?.name}`], ['Roll no.', s.rollNo], ["Father's name", s.fatherName], ["Mother's name", s.motherName], ['Date of birth', fmtDate(s.dob)], ['Attendance', `${data.attendance.present}/${data.attendance.total}`]].map(([k, v]) => <div key={k}><span className="text-slate-500">{k}: </span><b>{v || '—'}</b></div>)}
      </div>
      <table className="mt-6 w-full border text-sm">
        <thead className="bg-navy-800 text-white"><tr><th className="p-2 text-left">Subject</th><th className="p-2">Max</th><th className="p-2">Obtained</th><th className="p-2">Grade</th><th className="p-2 text-left">Remarks</th></tr></thead>
        <tbody>{data.marks.map((m) => <tr key={m.subject} className="border-t"><td className="p-2 font-medium">{m.subject}</td><td className="p-2 text-center">{m.maxMarks ?? '—'}</td><td className="p-2 text-center font-semibold">{m.isAbsent ? 'AB' : m.marksObtained ?? '—'}</td><td className="p-2 text-center">{m.grade || '—'}</td><td className="p-2 text-slate-500">{m.remarks}</td></tr>)}</tbody>
        <tfoot className="bg-slate-50 font-bold"><tr className="border-t-2"><td className="p-2">Total</td><td className="p-2 text-center">{data.max}</td><td className="p-2 text-center">{data.obtained}</td><td className="p-2 text-center">{data.grade}</td><td className="p-2">{data.percent}% • Rank {data.rank} of {data.classSize} • {data.result}</td></tr></tfoot>
      </table>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="text-xs text-slate-500"><b className="text-slate-700">Grading scale:</b> {(data.gradeScale || []).map((g) => `${g.grade} ≥ ${g.min}`).join(' • ')}</div>
        <div className="flex justify-between pt-10 text-center text-xs text-slate-500"><div className="border-t px-6 pt-1">Class Teacher</div><div className="border-t px-6 pt-1">Parent</div><div className="border-t px-6 pt-1">Principal</div></div>
      </div>
      <p className="mt-6 text-center text-[10px] text-slate-400">Generated by RnY EduSuite • Powered by RnY Groups</p>
    </div>
  );
}

export function ReportCard() {
  const [sp] = useSearchParams();
  const { data, loading, error } = useFetch('/assessment/report-card', { examId: sp.get('examId'), studentId: sp.get('studentId') });
  if (error) return <ErrorBox error={error} />;
  if (loading || !data) return <Spinner />;
  return (
    <div>
      <div className="no-print mb-4 flex justify-end gap-2"><button className="btn-outline" onClick={() => history.back()}>Back</button><button className="btn-primary" onClick={() => window.print()}><Printer size={16} /> Print / Save PDF</button></div>
      <ReportCardView data={data} />
    </div>
  );
}
