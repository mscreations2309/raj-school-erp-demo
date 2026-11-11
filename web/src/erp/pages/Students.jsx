import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Users, Plus, Download, Search, Pencil, KeyRound, FileText, Upload, Trash2, Printer, ArrowRightLeft, Loader2, Phone, Mail, MapPin, Bus, BedDouble, BookOpen, Wallet, ClipboardCheck, Award, UserCheck } from 'lucide-react';
import { api, errMsg, download } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDate, money, fullName, pretty, toInputDate } from '../../lib/format';
import { PageHeader, Card, Spinner, Empty, Badge, Pagination, useFetch, Modal, Field, Tabs, Avatar, Confirm, ErrorBox, Stat, DeleteDialog } from '../components/ui';

export function useSections() {
  const { data } = useFetch('/sections', { all: 1 });
  return (data?.items || []).map((s) => ({ id: s.id, gradeId: s.gradeId, label: `${s.grade.name} - ${s.name}`, grade: s.grade, name: s.name, count: s._count?.students }));
}

export function SectionSelect({ value, onChange, className = 'input', allowAll, placeholder = 'Select class & section' }) {
  const sections = useSections();
  return (
    <select className={className} value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">{allowAll ? 'All classes' : placeholder}</option>
      {sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
    </select>
  );
}

export function StudentsList() {
  const nav = useNavigate();
  const { is } = useAuth();
  const [sp, setSp] = useSearchParams();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState(sp.get('q') || '');
  const [qd, setQd] = useState(q);
  const [sectionId, setSection] = useState(sp.get('sectionId') || '');
  const [status, setStatus] = useState('');
  const [gender, setGender] = useState('');
  useEffect(() => { const id = setTimeout(() => { setQd(q); setPage(1); }, 300); return () => clearTimeout(id); }, [q]);
  const params = { page, pageSize: 25, q: qd || undefined, sectionId: sectionId || undefined, status: status || undefined, gender: gender || undefined };
  const { data, loading } = useFetch('/students', params);
  return (
    <div>
      <PageHeader title="Students" subtitle={data ? `${data.total} students` : ''} icon={Users} actions={<>
        <button className="btn-outline" onClick={() => download(`/students/export?${new URLSearchParams(Object.entries(params).filter(([k, v]) => v && !['page', 'pageSize'].includes(k))).toString()}`, 'students.csv')}><Download size={16} /> Export</button>
        {is('SCHOOL_ADMIN', 'PRINCIPAL', 'RECEPTIONIST') && <Link to="/app/students/new" className="btn-primary"><Plus size={16} /> Admit Student</Link>}
      </>} />
      <Card pad={false}>
        <div className="grid gap-3 border-b p-4 md:grid-cols-[1fr_200px_160px_140px]">
          <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input pl-9" placeholder="Search name, admission no, father, phone…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <SectionSelect value={sectionId} onChange={(v) => { setSection(v); setPage(1); setSp(v ? { sectionId: v } : {}); }} allowAll />
          <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">Status: Active</option>{['ACTIVE', 'TC_ISSUED', 'ALUMNI', 'LEFT'].map((s) => <option key={s} value={s}>{pretty(s)}</option>)}</select>
          <select className="input" value={gender} onChange={(e) => { setGender(e.target.value); setPage(1); }}><option value="">Gender: All</option><option value="MALE">Male</option><option value="FEMALE">Female</option></select>
        </div>
        {loading && !data ? <Spinner /> : !data?.items.length ? <Empty text="No students found" /> : (
          <div className="overflow-x-auto">
            <table className="table-x">
              <thead><tr><th>Student</th><th>Adm. No</th><th>Class</th><th>Roll</th><th>Father / Phone</th><th>Gender</th><th>Status</th></tr></thead>
              <tbody className={loading ? 'opacity-50' : ''}>
                {data.items.map((s) => (
                  <tr key={s.id} className="cursor-pointer" onClick={() => nav(`/app/students/${s.id}`)}>
                    <td><div className="flex items-center gap-3"><Avatar name={fullName(s)} src={s.photoUrl} /><div><div className="font-semibold text-navy-900">{fullName(s)}</div><div className="text-xs text-slate-400">DOB {fmtDate(s.dob)}{s.isHosteller ? ' • Hosteller' : ''}</div></div></div></td>
                    <td className="font-mono text-xs">{s.admissionNo}</td>
                    <td>{s.grade?.name}-{s.section?.name}</td>
                    <td>{s.rollNo}</td>
                    <td><div>{s.fatherName}</div><div className="text-xs text-slate-400">{s.fatherPhone}</div></td>
                    <td>{pretty(s.gender)}</td>
                    <td><Badge status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={page} pageSize={25} total={data.total} onPage={setPage} />}
      </Card>
    </div>
  );
}

const SECTIONS = [
  ['Student details', [
    ['firstName', 'First name', 'text', true], ['lastName', 'Last name'], ['gender', 'Gender', ['MALE', 'FEMALE', 'OTHER'], true], ['dob', 'Date of birth', 'date'],
    ['sectionId', 'Class & section', 'section', true], ['rollNo', 'Roll no.', 'number'], ['admissionNo', 'Admission no. (auto if blank)'], ['admissionDate', 'Admission date', 'date'],
    ['bloodGroup', 'Blood group', ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']], ['category', 'Category', ['GEN', 'OBC', 'SC', 'ST', 'EWS']], ['religion', 'Religion'], ['aadhaar', 'Aadhaar no.'],
    ['previousSchool', 'Previous school'], ['status', 'Status', ['ACTIVE', 'TC_ISSUED', 'ALUMNI', 'LEFT']], ['photoUrl', 'Photo URL'],
  ]],
  ['Parents / guardian', [
    ['fatherName', "Father's name"], ['fatherPhone', "Father's mobile"], ['fatherEmail', "Father's email"], ['fatherOccupation', "Father's occupation"],
    ['motherName', "Mother's name"], ['motherPhone', "Mother's mobile"], ['motherOccupation', "Mother's occupation"],
  ]],
  ['Contact', [['phone', 'Student phone'], ['email', 'Student email'], ['city', 'City'], ['address', 'Address', 'textarea']]],
];

export function StudentForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const sections = useSections();
  const { data: existing, loading } = useFetch(id ? `/students/${id}` : null);
  const [v, setV] = useState({ gender: 'MALE', status: 'ACTIVE', admissionDate: toInputDate(new Date()) });
  const [transport, setTransport] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const { data: routes } = useFetch('/routes', { all: 1 });
  useEffect(() => {
    if (existing) {
      const o = {};
      SECTIONS.flatMap(([, f]) => f).forEach(([k, , type]) => { o[k] = type === 'date' ? toInputDate(existing[k]) : existing[k] ?? ''; });
      setV(o); setTransport(existing.transportStopId || '');
    }
  }, [existing]);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const body = { ...v, transportStopId: transport || null };
      if (id) { await api.put(`/students/${id}`, body); toast.success('Student updated'); nav(`/app/students/${id}`); }
      else { const { data } = await api.post('/students', body); setCreated(data); toast.success('Student admitted'); }
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };
  if (id && loading) return <Spinner />;
  return (
    <div>
      <PageHeader title={id ? 'Edit Student' : 'Admit New Student'} subtitle={id ? fullName(existing) : 'Creates the student record and a parent login automatically'} icon={Users} />
      <form onSubmit={submit} className="space-y-6">
        {SECTIONS.map(([title, fields]) => (
          <Card key={title} title={title}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {fields.map(([k, label, type, req]) => (
                <Field key={k} label={`${label}${req ? ' *' : ''}`} className={type === 'textarea' ? 'sm:col-span-2 lg:col-span-4' : ''}>
                  {Array.isArray(type) ? <select className="input" required={req} value={v[k] || ''} onChange={(e) => setV({ ...v, [k]: e.target.value })}><option value="">—</option>{type.map((o) => <option key={o} value={o}>{pretty(o)}</option>)}</select>
                    : type === 'section' ? <select className="input" required value={v[k] || ''} onChange={(e) => setV({ ...v, [k]: e.target.value })}><option value="">—</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
                    : type === 'textarea' ? <textarea className="input" rows={2} value={v[k] || ''} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
                    : <input className="input" type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'} required={req} value={v[k] ?? ''} onChange={(e) => setV({ ...v, [k]: e.target.value })} />}
                </Field>
              ))}
              {title === 'Contact' && (
                <Field label="Transport stop" className="sm:col-span-2">
                  <select className="input" value={transport} onChange={(e) => setTransport(e.target.value)}><option value="">No school transport</option>{(routes?.items || []).map((r) => <optgroup key={r.id} label={`${r.name} (${money(r.monthlyFee)}/mo)`}>{r.stops.map((s) => <option key={s.id} value={s.id}>{s.name} — pickup {s.pickupTime}</option>)}</optgroup>)}</select>
                </Field>
              )}
            </div>
          </Card>
        ))}
        <ErrorBox error={error} />
        <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => nav(-1)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />} {id ? 'Save changes' : 'Admit student'}</button></div>
      </form>
      <Modal open={!!created} onClose={() => nav(`/app/students/${created.student.id}`)} title="Student admitted 🎉" size="sm" footer={<button className="btn-primary" onClick={() => nav(`/app/students/${created.student.id}`)}>Open profile</button>}>
        {created && <div className="space-y-3 text-sm"><p><b>{fullName(created.student)}</b> admitted with admission no. <b>{created.student.admissionNo}</b>.</p>
          {created.tempPassword ? <div className="rounded-xl bg-emerald-50 p-4 text-emerald-800">Parent portal login created:<br />Mobile: <b>{created.parentLogin}</b><br />Password: <b>{created.tempPassword}</b></div> : created.parentLogin ? <div className="rounded-xl bg-sky-50 p-4 text-sky-800">Linked to existing parent login <b>{created.parentLogin}</b> (sibling).</div> : null}</div>}
      </Modal>
    </div>
  );
}

export function StudentProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const { is } = useAuth();
  const { data: s, loading, reload, error } = useFetch(`/students/${id}`);
  const [tab, setTab] = useState('overview');
  const [tcOpen, setTcOpen] = useState(false);
  const [tc, setTc] = useState({ reason: '', conduct: 'Good' });
  const [login, setLogin] = useState(null);
  const [busy, setBusy] = useState(false);
  const [delDoc, setDelDoc] = useState(null);
  const [delStudent, setDelStudent] = useState(false);
  if (error) return <ErrorBox error={error} />;
  if (loading || !s) return <Spinner />;
  const canWrite = is('SCHOOL_ADMIN', 'PRINCIPAL', 'RECEPTIONIST');
  const examGroups = s.marks.reduce((a, m) => { (a[m.exam.name] ||= []).push(m); return a; }, {});
  const uploadDoc = async (e) => {
    const fd = new FormData();
    Array.from(e.target.files).forEach((f) => fd.append('files', f));
    try { await api.post(`/students/${id}/documents`, fd); toast.success('Uploaded'); reload(); } catch (err) { toast.error(errMsg(err)); }
  };
  const issueTc = async () => {
    setBusy(true);
    try { const { data } = await api.post(`/students/${id}/tc`, tc); toast.success(`TC ${data.tcNo} issued`); setTcOpen(false); reload(); } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  const resetLogin = async () => {
    try { setLogin((await api.post(`/students/${id}/parent-login`)).data); } catch (err) { toast.error(errMsg(err)); }
  };
  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-navy-800 via-navy-700 to-brand-700" />
        <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end">
          <div className="-mt-12 rounded-2xl border-4 border-white bg-white shadow"><Avatar name={fullName(s)} src={s.photoUrl} size={96} /></div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-navy-900">{fullName(s)}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span className="font-mono">{s.admissionNo}</span>•<span>Class {s.grade?.name}-{s.section?.name}</span>•<span>Roll {s.rollNo}</span><Badge status={s.status} />{s.isHosteller && <Badge status="NEW">Hosteller</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canWrite && <Link to={`/app/students/${id}/edit`} className="btn-outline"><Pencil size={15} /> Edit</Link>}
            {is('SCHOOL_ADMIN', 'PRINCIPAL', 'ACCOUNTANT', 'RECEPTIONIST') && <Link to={`/app/fees/collect?studentId=${id}`} className="btn-primary"><Wallet size={15} /> Collect fee</Link>}
            {canWrite && <button className="btn-outline" onClick={resetLogin}><KeyRound size={15} /> Parent login</button>}
            {canWrite && s.status === 'ACTIVE' && <button className="btn-outline text-rose-600" onClick={() => setTcOpen(true)}><FileText size={15} /> Issue TC</button>}
            {is('SCHOOL_ADMIN', 'PRINCIPAL') && <button className="btn-outline text-rose-600" onClick={() => setDelStudent(true)}><Trash2 size={15} /> Delete</button>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Attendance (session)" value={s.attendanceSummary.percent != null ? `${s.attendanceSummary.percent}%` : '—'} icon={ClipboardCheck} color="emerald" sub={`${s.attendanceSummary.PRESENT || 0} present / ${s.attendanceSummary.totalDays} days`} />
        <Stat label="Fee due" value={money(s.feeSummary.due)} icon={Wallet} color={s.feeSummary.due > 0 ? 'rose' : 'emerald'} sub={`Paid ${money(s.feeSummary.paid)} of ${money(s.feeSummary.total)}`} />
        <Stat label="Exams appeared" value={Object.keys(examGroups).length} icon={Award} color="violet" />
        <Stat label="Siblings" value={s.siblings.length} icon={UserCheck} color="sky" sub={s.siblings.map((x) => x.firstName).join(', ')} />
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[['overview', 'Overview'], ['fees', 'Fees'], ['marks', 'Results'], ['docs', 'Documents'], ['other', 'Transport / Hostel / Library']]} />

      {tab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Personal details">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {[['Gender', pretty(s.gender)], ['Date of birth', fmtDate(s.dob)], ['Blood group', s.bloodGroup], ['Category', s.category], ['Religion', s.religion], ['Aadhaar', s.aadhaar], ['Admission date', fmtDate(s.admissionDate)], ['Previous school', s.previousSchool]].map(([k, v]) => <div key={k}><dt className="text-xs text-slate-400">{k}</dt><dd className="font-medium">{v || '—'}</dd></div>)}
            </dl>
          </Card>
          <Card title="Parents & contact">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {[['Father', s.fatherName], ['Father mobile', s.fatherPhone], ['Father occupation', s.fatherOccupation], ['Father email', s.fatherEmail], ['Mother', s.motherName], ['Mother mobile', s.motherPhone], ['Address', s.address], ['Parent login', s.parentUser?.phone || 'Not created']].map(([k, v]) => <div key={k}><dt className="text-xs text-slate-400">{k}</dt><dd className="font-medium">{v || '—'}</dd></div>)}
            </dl>
          </Card>
          {s.siblings.length > 0 && (
            <Card title="Siblings in school">{s.siblings.map((x) => <Link key={x.id} to={`/app/students/${x.id}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50"><Avatar name={fullName(x)} /><div><div className="font-medium">{fullName(x)}</div><div className="text-xs text-slate-500">{x.grade?.name}-{x.section?.name}</div></div></Link>)}</Card>
          )}
        </div>
      )}

      {tab === 'fees' && (
        <Card title="Fee ledger" pad={false} actions={<Link to={`/app/fees/collect?studentId=${id}`} className="btn-primary btn-sm">Collect</Link>}>
          <div className="overflow-x-auto"><table className="table-x">
            <thead><tr><th>Invoice</th><th>Period</th><th>Due date</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
            <tbody>{s.invoices.map((i) => <tr key={i.id}><td className="font-mono text-xs">{i.invoiceNo}</td><td>{i.title}</td><td>{fmtDate(i.dueDate)}</td><td>{money(i.total)}</td><td className="text-emerald-600">{money(i.paid)}</td><td className="font-semibold">{money(i.total - i.paid)}</td><td><Badge status={i.status} /></td></tr>)}</tbody>
          </table></div>
          {s.concessions.length > 0 && <div className="border-t p-4 text-sm text-slate-600">Concessions: {s.concessions.map((c) => `${c.reason} (${c.type === 'PERCENT' ? `${c.value}%` : money(c.value)} on ${c.feeHead?.name || 'all'})`).join(', ')}</div>}
        </Card>
      )}

      {tab === 'marks' && (
        <div className="space-y-6">
          {!Object.keys(examGroups).length && <Card><Empty text="No marks recorded yet" /></Card>}
          {Object.entries(examGroups).map(([exam, rows]) => {
            const tot = rows.reduce((a, m) => a + (m.marksObtained || 0), 0); const max = rows.reduce((a, m) => a + m.maxMarks, 0);
            return (
              <Card key={exam} title={exam} actions={<Link to={`/app/report-card?studentId=${id}&examId=${rows[0].examId}`} className="btn-outline btn-sm"><Printer size={14} /> Report card</Link>}>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">{rows.map((m) => <div key={m.id} className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">{m.subject.name}</div><div className="mt-1 flex items-baseline justify-between"><b className="text-lg">{m.isAbsent ? 'AB' : m.marksObtained}<span className="text-xs font-normal text-slate-400">/{m.maxMarks}</span></b><Badge status={m.grade === 'E' ? 'ABSENT' : 'PAID'}>{m.grade}</Badge></div></div>)}</div>
                <div className="mt-4 text-sm font-semibold text-navy-900">Total: {tot}/{max} ({max ? ((tot / max) * 100).toFixed(1) : 0}%)</div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'docs' && (
        <Card title="Documents" actions={canWrite && <label className="btn-primary btn-sm cursor-pointer"><Upload size={14} /> Upload<input type="file" multiple className="hidden" onChange={uploadDoc} /></label>}>
          {!s.documents.length ? <Empty text="No documents uploaded" /> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{s.documents.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-xl border p-3"><a href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-medium hover:text-brand-600"><FileText size={16} /> {d.name}</a>
              {canWrite && <button className="text-slate-400 hover:text-rose-600" onClick={() => setDelDoc(d)}><Trash2 size={15} /></button>}</div>
          ))}</div>}
        </Card>
      )}

      {tab === 'other' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title={<span className="flex items-center gap-2"><Bus size={16} /> Transport</span>}>{s.transportStop ? <div className="space-y-1 text-sm"><div className="font-semibold">{s.transportStop.route.name}</div><div>Stop: {s.transportStop.name} (pickup {s.transportStop.pickupTime})</div><div>Bus: {s.transportStop.route.vehicle?.number} • Driver {s.transportStop.route.vehicle?.driverName} ({s.transportStop.route.vehicle?.driverPhone})</div></div> : <Empty text="Not using school transport" />}</Card>
          <Card title={<span className="flex items-center gap-2"><BedDouble size={16} /> Hostel</span>}>{s.hostelAllocations[0] ? <div className="text-sm"><div className="font-semibold">{s.hostelAllocations[0].room.hostel.name}</div><div>Room {s.hostelAllocations[0].room.roomNo} • since {fmtDate(s.hostelAllocations[0].fromDate)}</div></div> : <Empty text="Day scholar" />}</Card>
          <Card title={<span className="flex items-center gap-2"><BookOpen size={16} /> Library books</span>}>{s.bookIssues.length ? s.bookIssues.map((b) => <div key={b.id} className="text-sm"><b>{b.book.title}</b> — due {fmtDate(b.dueDate)}</div>) : <Empty text="No books issued" />}</Card>
          {s.tcs.length > 0 && <Card title="Transfer certificate" className="lg:col-span-3">{s.tcs.map((t) => <div key={t.id} className="text-sm">TC <b>{t.tcNo}</b> issued {fmtDate(t.issueDate)} — {t.reason}</div>)}</Card>}
        </div>
      )}

      <Modal open={tcOpen} onClose={() => setTcOpen(false)} title="Issue Transfer Certificate" size="sm" footer={<><button className="btn-outline" onClick={() => setTcOpen(false)}>Cancel</button><button className="btn-danger" disabled={busy} onClick={issueTc}>Issue TC</button></>}>
        <div className="space-y-4"><Field label="Reason for leaving"><input className="input" value={tc.reason} onChange={(e) => setTc({ ...tc, reason: e.target.value })} /></Field><Field label="Conduct"><select className="input" value={tc.conduct} onChange={(e) => setTc({ ...tc, conduct: e.target.value })}>{['Excellent', 'Very Good', 'Good', 'Satisfactory'].map((c) => <option key={c}>{c}</option>)}</select></Field><p className="text-xs text-slate-500">Student status becomes "TC Issued". The TC becomes verifiable on the public website.</p></div>
      </Modal>
      <DeleteDialog open={!!delDoc} onClose={() => setDelDoc(null)} what={`Document "${delDoc?.name}"`} busy={busy} onConfirm={async (reason) => { setBusy(true); try { await api.delete(`/students/${id}/documents/${delDoc.id}`, { data: { reason } }); toast.success('Moved to Recycle Bin'); setDelDoc(null); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); } }} />
      <DeleteDialog open={delStudent} onClose={() => setDelStudent(false)} what={`${fullName(s)} (${s.admissionNo}) with all fees, attendance, marks and documents — student & parent logins will be blocked`} busy={busy} onConfirm={async (reason) => { setBusy(true); try { await api.delete(`/students/${id}`, { data: { reason } }); toast.success('Student moved to Recycle Bin'); nav('/app/students'); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); } }} />
      <Modal open={!!login} onClose={() => setLogin(null)} title="Parent portal login" size="sm">
        {login && <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">Login (mobile): <b>{login.login}</b><br />Password: <b>{login.password}</b><p className="mt-2 text-xs">Share these with the parent. They can change the password after signing in.</p></div>}
      </Modal>
    </div>
  );
}

export function PromoteStudents() {
  const sections = useSections();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const { data, reload } = useFetch(from ? '/students' : null, { sectionId: from, all: 1 });
  const [sel, setSel] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => setSel((data?.items || []).map((s) => s.id)), [data]);
  const run = async () => {
    setBusy(true);
    try { const { data: r } = await api.post('/students/promote', { studentIds: sel, toSectionId: to || undefined, status: status || undefined }); toast.success(`${r.updated} students updated`); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <div>
      <PageHeader title="Promote / Transfer Students" subtitle="Move students to the next class at session end, or mark them as alumni" icon={ArrowRightLeft} />
      <Card>
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="From class"><select className="input" value={from} onChange={(e) => setFrom(e.target.value)}><option value="">Select</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.label} ({s.count})</option>)}</select></Field>
          <Field label="To class"><select className="input" value={to} onChange={(e) => setTo(e.target.value)}><option value="">Keep same class</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>
          <Field label="Set status"><select className="input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">No change</option><option value="ALUMNI">Alumni (passed out)</option><option value="LEFT">Left school</option><option value="ACTIVE">Active</option></select></Field>
          <div className="flex items-end"><button className="btn-primary w-full" disabled={!sel.length || (!to && !status) || busy} onClick={run}>{busy && <Loader2 size={16} className="animate-spin" />} Apply to {sel.length} students</button></div>
        </div>
      </Card>
      {data && (
        <Card className="mt-6" pad={false}>
          <table className="table-x"><thead><tr><th><input type="checkbox" checked={sel.length === data.items.length} onChange={(e) => setSel(e.target.checked ? data.items.map((s) => s.id) : [])} /></th><th>Roll</th><th>Name</th><th>Adm No</th><th>Status</th></tr></thead>
            <tbody>{data.items.map((s) => <tr key={s.id}><td><input type="checkbox" checked={sel.includes(s.id)} onChange={(e) => setSel(e.target.checked ? [...sel, s.id] : sel.filter((x) => x !== s.id))} /></td><td>{s.rollNo}</td><td className="font-medium">{fullName(s)}</td><td className="font-mono text-xs">{s.admissionNo}</td><td><Badge status={s.status} /></td></tr>)}</tbody></table>
        </Card>
      )}
    </div>
  );
}
