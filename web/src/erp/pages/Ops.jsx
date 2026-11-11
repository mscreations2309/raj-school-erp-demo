import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { FileClock, Eye, UserCheck, Loader2, Send, Inbox, MessageSquare, CalendarClock, Save, BookOpen, RotateCcw, Plus, Settings as SettingsIcon, History, Upload, Search } from 'lucide-react';
import { api, errMsg, uploadFile } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDate, fmtDateTime, money, fullName, pretty } from '../../lib/format';
import { PageHeader, Card, Spinner, Empty, useFetch, Field, Badge, Stat, Modal, Pagination, Tabs, Avatar, ErrorBox } from '../components/ui';
import { SectionSelect, useSections } from './Students';

// ───────── Admission applications pipeline ─────────
const STAGES = ['SUBMITTED', 'UNDER_REVIEW', 'TEST_SCHEDULED', 'APPROVED', 'ENROLLED', 'REJECTED'];
export function Applications() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, reload } = useFetch('/applications', { status: status || undefined, q: q || undefined, page, pageSize: 20 });
  const [view, setView] = useState(null);
  const [enroll, setEnroll] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const open = async (a) => { setView((await api.get(`/applications/${a.id}`)).data); setEnroll(''); setResult(null); };
  const update = async (patch) => {
    try { const { data: d } = await api.put(`/applications/${view.id}`, patch); setView({ ...view, ...d, documents: view.documents }); toast.success('Updated'); reload(); } catch (e) { toast.error(errMsg(e)); }
  };
  const doEnroll = async () => {
    setBusy(true);
    try { const { data: r } = await api.post(`/applications/${view.id}/enroll`, { sectionId: enroll }); setResult(r); toast.success('Student enrolled'); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <div>
      <PageHeader title="Online Applications" subtitle="Applications submitted from the website admission form" icon={FileClock} />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {STAGES.map((s) => (
          <motion.button whileHover={{ y: -2 }} key={s} onClick={() => { setStatus(status === s ? '' : s); setPage(1); }} className={`card p-4 text-left transition ${status === s ? 'ring-2 ring-brand-500' : ''}`}>
            <div className="text-2xl font-bold text-navy-900">{data?.byStatus?.[s] || 0}</div><Badge status={s} />
          </motion.button>
        ))}
      </div>
      <Card pad={false}>
        <div className="border-b p-4"><input className="input" placeholder="Search name, reg no, phone…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
        {loading && !data ? <Spinner /> : !data?.items.length ? <Empty /> : (
          <div className="overflow-x-auto"><table className="table-x">
            <thead><tr><th>Reg. No</th><th>Date</th><th>Student</th><th>Class</th><th>Father / Phone</th><th>Fee</th><th>Status</th><th></th></tr></thead>
            <tbody>{data.items.map((a) => (
              <tr key={a.id} className="cursor-pointer" onClick={() => open(a)}><td className="font-mono text-xs">{a.regNo}</td><td>{fmtDate(a.createdAt)}</td><td className="font-medium">{a.studentName}</td><td>{a.gradeSought}</td><td>{a.fatherName}<div className="text-xs text-slate-400">{a.fatherPhone}</div></td><td>{a.feePaid ? <Badge status="PAID">Paid</Badge> : <Badge status="UNPAID">Unpaid</Badge>}</td><td><Badge status={a.status} /></td><td><Eye size={16} className="text-slate-400" /></td></tr>
            ))}</tbody>
          </table></div>
        )}
        {data && <Pagination page={page} pageSize={20} total={data.total} onPage={setPage} />}
      </Card>
      <Modal open={!!view} onClose={() => setView(null)} title={view && `${view.studentName} — ${view.regNo}`} size="lg">
        {view && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">{STAGES.filter((s) => s !== 'ENROLLED').map((s) => <button key={s} disabled={view.status === 'ENROLLED'} onClick={() => update({ status: s })} className={`badge cursor-pointer px-3 py-1.5 ${view.status === s ? 'bg-navy-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{pretty(s)}</button>)}</div>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              {[['Class sought', view.gradeSought], ['Gender', pretty(view.gender)], ['DOB', fmtDate(view.dob)], ['Father', view.fatherName], ['Father mobile', view.fatherPhone], ['Father email', view.fatherEmail], ['Mother', view.motherName], ['Occupation', view.fatherOccupation], ['Previous school', view.previousSchool], ['Hostel', view.hostelRequired ? 'Yes' : 'No'], ['Transport', view.transportRequired ? 'Yes' : 'No'], ['Registration fee', `${money(view.registrationFee)} ${view.feePaid ? `(paid • ${view.paymentRef})` : '(unpaid)'}`]].map(([k, v]) => <div key={k}><div className="text-xs text-slate-400">{k}</div><div className="font-medium">{v || '—'}</div></div>)}
              <div className="sm:col-span-3"><div className="text-xs text-slate-400">Address</div><div className="font-medium">{view.permanentAddress}</div></div>
            </div>
            {view.documents.length > 0 && <div><div className="label">Documents</div><div className="flex flex-wrap gap-2">{view.documents.map((d) => <a key={d.url} href={d.url} target="_blank" rel="noreferrer" className="badge bg-sky-50 px-3 py-1.5 text-sky-700">{d.name}</a>)}</div></div>}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Interaction / test date"><input type="date" className="input" defaultValue={view.testDate?.slice(0, 10)} onBlur={(e) => e.target.value && update({ testDate: e.target.value, status: 'TEST_SCHEDULED' })} /></Field>
              <Field label="Remarks (visible to parent)"><input className="input" defaultValue={view.remarks || ''} onBlur={(e) => update({ remarks: e.target.value })} /></Field>
            </div>
            {view.status !== 'ENROLLED' && view.status !== 'REJECTED' && (
              <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-4">
                <div className="font-semibold text-emerald-800">Enroll as student</div>
                <div className="mt-3 flex gap-2"><SectionSelect value={enroll} onChange={setEnroll} /><button className="btn-success" disabled={!enroll || busy} onClick={doEnroll}>{busy ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />} Enroll</button></div>
              </div>
            )}
            {result && <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">Enrolled as <Link className="font-bold underline" to={`/app/students/${result.student.id}`}>{result.student.admissionNo}</Link>. {result.tempPassword ? <>Parent login: <b>{result.parentLogin}</b> / <b>{result.tempPassword}</b></> : <>Linked to existing parent login {result.parentLogin}.</>}</div>}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ───────── Messages ─────────
export function Messages() {
  const { user, is } = useAuth();
  const staff = !['PARENT', 'STUDENT'].includes(user.role);
  const [box, setBox] = useState('inbox');
  const { data, loading, reload } = useFetch('/messages', { box: box === 'sent' ? 'sent' : undefined });
  const [compose, setCompose] = useState(false);
  const [f, setF] = useState({ audience: 'INDIVIDUAL', channel: 'APP', subject: '', body: '', recipientId: '', sectionId: '' });
  const [rq, setRq] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [open, setOpen] = useState(null);
  useEffect(() => {
    if (!compose || f.audience !== 'INDIVIDUAL') return;
    const id = setTimeout(() => api.get('/messages/recipients', { params: { q: rq } }).then((r) => setRecipients(r.data.items)), 250);
    return () => clearTimeout(id);
  }, [rq, compose, f.audience]);
  const send = async () => {
    try { await api.post('/messages', f); toast.success(f.channel === 'APP' ? 'Message sent' : `Message queued for ${f.channel}`); setCompose(false); setBox('sent'); reload(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div>
      <PageHeader title="Messages" icon={MessageSquare} actions={staff && <button className="btn-primary" onClick={() => setCompose(true)}><Send size={16} /> Compose</button>} />
      {staff && <Tabs value={box} onChange={setBox} tabs={[['inbox', 'Inbox'], ['sent', 'Sent']]} />}
      <Card pad={false}>
        {loading ? <Spinner /> : !data?.items.length ? <Empty text="No messages" icon={Inbox} /> : (
          <div className="divide-y">{data.items.map((m) => (
            <button key={m.id} onClick={() => { setOpen(m); if (!m.isRead && m.recipientId === user.id) api.post(`/messages/${m.id}/read`); }} className="flex w-full items-start gap-4 p-4 text-left hover:bg-slate-50">
              <Avatar name={m.sender?.name || 'School'} />
              <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className={`font-semibold ${!m.isRead && m.recipientId === user.id ? 'text-navy-900' : 'text-slate-700'}`}>{m.subject}</span><Badge>{pretty(m.audience)}</Badge>{m.channel !== 'APP' && <Badge status="NEW">{m.channel}</Badge>}</div><p className="truncate text-sm text-slate-500">{m.body}</p></div>
              <span className="whitespace-nowrap text-xs text-slate-400">{fmtDateTime(m.createdAt)}</span>
            </button>
          ))}</div>
        )}
      </Card>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.subject} size="md">{open && <div><div className="mb-4 text-xs text-slate-500">From {open.sender?.name} ({pretty(open.sender?.role)}) • {fmtDateTime(open.createdAt)}</div><p className="whitespace-pre-wrap text-slate-700">{open.body}</p></div>}</Modal>
      <Modal open={compose} onClose={() => setCompose(false)} title="New message" size="md" footer={<><button className="btn-outline" onClick={() => setCompose(false)}>Cancel</button><button className="btn-primary" onClick={send}><Send size={16} /> Send</button></>}>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="To"><select className="input" value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}><option value="INDIVIDUAL">A person</option><option value="SECTION">Parents of a class</option>{is('SCHOOL_ADMIN', 'PRINCIPAL') && <><option value="ALL_PARENTS">All parents</option><option value="ALL_STAFF">All staff</option></>}</select></Field>
            <Field label="Channel"><select className="input" value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })}><option value="APP">In-app</option><option value="SMS">SMS</option><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">Email</option></select></Field>
          </div>
          {f.audience === 'INDIVIDUAL' && <Field label="Recipient"><input className="input mb-2" placeholder="Search name or mobile…" value={rq} onChange={(e) => setRq(e.target.value)} /><select className="input" size={5} value={f.recipientId} onChange={(e) => setF({ ...f, recipientId: e.target.value })}>{recipients.map((r) => <option key={r.id} value={r.id}>{r.name} — {pretty(r.role)} {r.phone ? `(${r.phone})` : ''}</option>)}</select></Field>}
          {f.audience === 'SECTION' && <Field label="Class"><SectionSelect value={f.sectionId} onChange={(v) => setF({ ...f, sectionId: v })} /></Field>}
          <Field label="Subject"><input className="input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
          <Field label="Message"><textarea className="input" rows={5} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
          {f.channel !== 'APP' && <p className="text-xs text-amber-700">SMS / WhatsApp / Email delivery uses the provider keys configured in Settings. In this demo the message is stored and shown in-app.</p>}
        </div>
      </Modal>
    </div>
  );
}

// ───────── Timetable ─────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DEFAULT_PERIODS = [['08:00', '08:40'], ['08:40', '09:20'], ['09:20', '10:00'], ['10:20', '11:00'], ['11:00', '11:40'], ['11:40', '12:20'], ['12:50', '13:30']];
export function Timetable() {
  const { is } = useAuth();
  const admin = is('SCHOOL_ADMIN', 'PRINCIPAL');
  const [sectionId, setSection] = useState('');
  const { data, loading } = useFetch(sectionId ? '/timetable' : null, { sectionId });
  const { data: subs } = useFetch(sectionId ? '/section-subjects' : null, { sectionId, all: 1 });
  const { data: staff } = useFetch(admin ? '/staff' : null, { all: 1, staffType: 'TEACHING' });
  const [grid, setGrid] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const g = {};
    (data?.items || []).forEach((s) => { g[`${s.day}-${s.period}`] = { subjectId: s.subjectId || '', teacherId: s.teacherId || '', startTime: s.startTime, endTime: s.endTime, subject: s.subject, teacher: s.teacher }; });
    setGrid(g);
  }, [data]);
  const subjOpts = (subs?.items || []).map((s) => ({ id: s.subjectId, name: s.subject.name, teacherId: s.teacherId }));
  const save = async () => {
    setBusy(true);
    const slots = [];
    DAYS.forEach((_, d) => DEFAULT_PERIODS.forEach(([st, en], p) => { const c = grid[`${d + 1}-${p + 1}`]; if (c?.subjectId) slots.push({ day: d + 1, period: p + 1, startTime: c.startTime || st, endTime: c.endTime || en, subjectId: c.subjectId, teacherId: c.teacherId || null }); }));
    try { await api.put('/timetable', { sectionId, slots }); toast.success('Timetable saved'); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <div>
      <PageHeader title="Timetable" subtitle={admin ? 'Pick subject per period; teacher clashes are blocked automatically' : ''} icon={CalendarClock} actions={admin && sectionId && <button className="btn-primary" disabled={busy} onClick={save}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save timetable</button>} />
      <Card className="mb-6"><div className="max-w-sm"><SectionSelect value={sectionId} onChange={setSection} /></div></Card>
      {!sectionId ? <Card><Empty text="Select a class" /></Card> : loading ? <Spinner /> : (
        <Card pad={false}><div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead><tr className="bg-navy-900 text-white"><th className="p-3 text-left">Day</th>{DEFAULT_PERIODS.map(([s, e], p) => <th key={p} className="p-3 text-center font-medium">P{p + 1}<div className="text-[10px] font-normal text-white/60">{s}–{e}</div></th>)}</tr></thead>
            <tbody>{DAYS.map((d, di) => (
              <tr key={d} className="border-t">
                <td className="bg-slate-50 p-3 font-semibold">{d}</td>
                {DEFAULT_PERIODS.map((_, pi) => {
                  const k = `${di + 1}-${pi + 1}`; const c = grid[k] || {};
                  const subj = subjOpts.find((s) => s.id === c.subjectId);
                  return (
                    <td key={k} className="border-l p-1.5 align-top">
                      {admin ? (
                        <div className="space-y-1">
                          <select className="w-full rounded-lg border border-slate-200 px-1.5 py-1 text-xs" value={c.subjectId || ''} onChange={(e) => { const s = subjOpts.find((x) => x.id === e.target.value); setGrid({ ...grid, [k]: { ...c, subjectId: e.target.value, teacherId: s?.teacherId || '' } }); }}><option value="">—</option>{subjOpts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                          <select className="w-full rounded-lg border border-slate-100 px-1.5 py-1 text-[11px] text-slate-500" value={c.teacherId || ''} onChange={(e) => setGrid({ ...grid, [k]: { ...c, teacherId: e.target.value } })}><option value="">No teacher</option>{(staff?.items || []).map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}</select>
                        </div>
                      ) : c.subjectId ? <div className="rounded-lg bg-navy-50 p-2"><div className="font-semibold text-navy-900">{c.subject?.name || subj?.name}</div><div className="text-[11px] text-slate-500">{c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName || ''}` : ''}</div></div> : <span className="text-slate-300">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}</tbody>
          </table>
        </div></Card>
      )}
    </div>
  );
}

// ───────── Library circulation ─────────
export function LibraryCirculation() {
  const [status, setStatus] = useState('ISSUED');
  const [page, setPage] = useState(1);
  const { data, loading, reload } = useFetch('/library/issues', { status, page, pageSize: 20 });
  const { data: stats, reload: reloadStats } = useFetch('/library/stats');
  const [issue, setIssue] = useState(false);
  const [f, setF] = useState({ bookId: '', studentId: '', days: 14 });
  const [bq, setBq] = useState(''); const [sq, setSq] = useState('');
  const { data: books } = useFetch(issue ? '/books' : null, { q: bq || undefined, pageSize: 10 });
  const { data: students } = useFetch(issue && sq.length > 1 ? '/students' : null, { q: sq, pageSize: 10 });
  const doIssue = async () => { try { await api.post('/library/issue', f); toast.success('Book issued'); setIssue(false); reload(); reloadStats(); } catch (e) { toast.error(errMsg(e)); } };
  const ret = async (i, lost = false) => { try { const { data: r } = await api.post(`/library/return/${i.id}`, { lost }); toast.success(`${lost ? 'Marked lost' : 'Returned'}${r.fine ? ` • fine ${money(r.fine)}` : ''}`); reload(); reloadStats(); } catch (e) { toast.error(errMsg(e)); } };
  return (
    <div className="space-y-6">
      <PageHeader title="Library Circulation" icon={BookOpen} actions={<button className="btn-primary" onClick={() => setIssue(true)}><Plus size={16} /> Issue book</button>} />
      {stats && <div className="grid gap-4 sm:grid-cols-4"><Stat label="Titles" value={stats.titles} icon={BookOpen} color="navy" /><Stat label="Copies available" value={`${stats.available}/${stats.copies}`} icon={BookOpen} color="emerald" /><Stat label="Issued" value={stats.issued} icon={BookOpen} color="sky" /><Stat label="Overdue" value={stats.overdue} icon={BookOpen} color="rose" /></div>}
      <Tabs value={status} onChange={(v) => { setStatus(v); setPage(1); }} tabs={[['ISSUED', 'Issued'], ['OVERDUE', 'Overdue'], ['RETURNED', 'Returned'], ['LOST', 'Lost']]} />
      <Card pad={false}>
        {loading ? <Spinner /> : !data?.items.length ? <Empty /> : (
          <div className="overflow-x-auto"><table className="table-x">
            <thead><tr><th>Book</th><th>Borrower</th><th>Issued</th><th>Due</th><th>Returned</th><th>Fine</th><th>Status</th><th></th></tr></thead>
            <tbody>{data.items.map((i) => { const overdue = i.status === 'ISSUED' && new Date(i.dueDate) < new Date(); return (
              <tr key={i.id}><td className="font-medium">{i.book.title}<div className="text-xs text-slate-400">{i.book.author}</div></td><td>{i.student ? <>{fullName(i.student)}<div className="text-xs text-slate-400">{i.student.grade?.name}-{i.student.section?.name}</div></> : fullName(i.staff)}</td><td>{fmtDate(i.issueDate)}</td><td className={overdue ? 'font-semibold text-rose-600' : ''}>{fmtDate(i.dueDate)}</td><td>{fmtDate(i.returnDate)}</td><td>{i.fine ? money(i.fine) : '—'}</td><td><Badge status={overdue ? 'ABSENT' : i.status}>{overdue ? 'Overdue' : pretty(i.status)}</Badge></td>
                <td className="whitespace-nowrap">{i.status === 'ISSUED' && <><button className="btn-success btn-sm" onClick={() => ret(i)}><RotateCcw size={13} /> Return</button> <button className="btn-ghost btn-sm text-rose-600" onClick={() => ret(i, true)}>Lost</button></>}</td></tr>
            ); })}</tbody>
          </table></div>
        )}
        {data && <Pagination page={page} pageSize={20} total={data.total} onPage={setPage} />}
      </Card>
      <Modal open={issue} onClose={() => setIssue(false)} title="Issue book" size="md" footer={<><button className="btn-outline" onClick={() => setIssue(false)}>Cancel</button><button className="btn-primary" disabled={!f.bookId || !f.studentId} onClick={doIssue}>Issue</button></>}>
        <div className="space-y-4">
          <Field label="Book"><input className="input mb-2" placeholder="Search title / author…" value={bq} onChange={(e) => setBq(e.target.value)} /><select className="input" size={5} value={f.bookId} onChange={(e) => setF({ ...f, bookId: e.target.value })}>{(books?.items || []).map((b) => <option key={b.id} value={b.id} disabled={!b.available}>{b.title} — {b.author} ({b.available} available)</option>)}</select></Field>
          <Field label="Student"><input className="input mb-2" placeholder="Search student…" value={sq} onChange={(e) => setSq(e.target.value)} /><select className="input" size={5} value={f.studentId} onChange={(e) => setF({ ...f, studentId: e.target.value })}>{(students?.items || []).map((s) => <option key={s.id} value={s.id}>{fullName(s)} • {s.admissionNo} • {s.grade?.name}-{s.section?.name}</option>)}</select></Field>
          <Field label="Loan period (days)"><input type="number" className="input" value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

// ───────── Remove demo data (button, never automatic) ─────────
function ClearDemoData() {
  const { is } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const { data: counts, reload } = useFetch(is('SCHOOL_ADMIN') ? '/settings/data-summary' : null);
  if (!is('SCHOOL_ADMIN') || !counts) return null;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const clear = async () => {
    setBusy(true);
    try { const { data } = await api.post('/settings/clear-demo-data', { confirm: text, reason }); setDone(data.removed); toast.success('All demo data removed'); setOpen(false); setText(''); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const rows = [['students', 'Students'], ['parents', 'Parent / student logins'], ['staff', 'Staff & teachers'], ['attendance', 'Attendance records'], ['invoices', 'Fee invoices'], ['payments', 'Fee receipts'], ['exams', 'Exams'], ['marks', 'Marks'], ['notices', 'Notices'], ['events', 'Calendar events'], ['enquiries', 'Enquiries'], ['applications', 'Admission applications'], ['expenses', 'Expenses'], ['payslips', 'Payslips'], ['books', 'Library books'], ['vehicles', 'Vehicles'], ['hostels', 'Hostels'], ['inventory', 'Inventory items']];
  return (
    <Card title="Demo data" className="border-rose-200">
      {total === 0 ? (
        <p className="text-sm text-emerald-700">✓ No demo data — everything you see is your own. {done && 'Demo data was removed successfully.'}</p>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-slate-600">
            <p>This school currently has sample records ({counts.students} students, {counts.staff} staff, {counts.invoices} invoices…). Remove them to start entering your own data.</p>
            <p className="mt-1 text-xs text-slate-500">Kept: website content, classes & sections, subjects, fee heads, academic session and School Admin login(s).</p>
          </div>
          <button className="btn-danger shrink-0" onClick={() => setOpen(true)}>Remove all demo data</button>
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Remove all demo data?" size="md" footer={<><button className="btn-outline" onClick={() => setOpen(false)}>Cancel</button><button className="btn-danger" disabled={text !== 'DELETE' || reason.trim().length < 3 || busy} onClick={clear}>{busy && <Loader2 size={16} className="animate-spin" />} Move to Recycle Bin</button></>}>
        <p className="text-sm text-slate-600">These records will be moved to the <b>Recycle Bin as one entry</b>. Nothing is erased — you can restore all of it in one click. Linked logins (staff, parents, students) are blocked.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">{rows.filter(([k]) => counts[k] > 0).map(([k, l]) => <div key={k} className="flex justify-between rounded-lg bg-rose-50 px-3 py-2"><span>{l}</span><b className="text-rose-700">{counts[k]}</b></div>)}</div>
        <p className="mt-4 text-xs text-slate-500">Kept: website content (banners, gallery, leadership, results, disclosure, contacts), classes & sections, subjects, fee heads, academic session and School Admin login(s).</p>
        <Field label="Reason *" className="mt-4"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Starting with real school data" /></Field>
        <Field label='Type "DELETE" to confirm' className="mt-4"><input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="DELETE" /></Field>
      </Modal>
    </Card>
  );
}

// ───────── Settings ─────────
export function Settings() {
  const { refresh } = useAuth();
  const { data, loading, setData } = useFetch('/settings');
  const [busy, setBusy] = useState(false);
  if (loading || !data) return <Spinner />;
  const s = data.settings || {};
  const set = (k, v) => setData({ ...data, [k]: v });
  const setS = (k, v) => setData({ ...data, settings: { ...s, [k]: v } });
  const save = async () => {
    setBusy(true);
    try { await api.put('/settings', data); toast.success('Settings saved'); refresh(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const sub = data.subscriptions?.[0];
  return (
    <div className="space-y-6">
      <PageHeader title="School Settings" icon={SettingsIcon} actions={<button className="btn-primary" disabled={busy} onClick={save}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save settings</button>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="School profile" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            {[['name', 'School name'], ['nameHi', 'School name (Hindi)'], ['tagline', 'Tagline'], ['taglineHi', 'Tagline (Hindi)'], ['board', 'Board'], ['affiliationNo', 'Affiliation no.'], ['schoolCode', 'School code'], ['established', 'Established (year)'], ['phone', 'Phone'], ['email', 'Email'], ['website', 'Website'], ['city', 'City'], ['state', 'State'], ['pincode', 'PIN code']].map(([k, l]) => <Field key={k} label={l}><input className="input" value={data[k] ?? ''} onChange={(e) => set(k, e.target.value)} /></Field>)}
            <Field label="Address" className="sm:col-span-2"><textarea className="input" rows={2} value={data.address || ''} onChange={(e) => set('address', e.target.value)} /></Field>
          </div>
        </Card>
        <div className="space-y-6">
          <Card title="Branding">
            <div className="space-y-4">
              <div className="flex items-center gap-4"><img src={data.logoUrl} alt="" className="h-16 w-16 rounded-xl border object-contain p-1" /><label className="btn-outline btn-sm cursor-pointer"><Upload size={14} /> Change logo<input type="file" accept="image/*" className="hidden" onChange={async (e) => { try { set('logoUrl', await uploadFile(e.target.files[0])); } catch (er) { toast.error(errMsg(er)); } }} /></label></div>
              <div className="grid grid-cols-2 gap-3"><Field label="Primary colour"><input type="color" className="h-10 w-full rounded-lg border" value={data.primaryColor} onChange={(e) => set('primaryColor', e.target.value)} /></Field><Field label="Secondary colour"><input type="color" className="h-10 w-full rounded-lg border" value={data.secondaryColor} onChange={(e) => set('secondaryColor', e.target.value)} /></Field></div>
            </div>
          </Card>
          <Card title="Subscription">
            <div className="text-sm"><div className="text-2xl font-bold text-navy-900">{data.plan?.name || '—'} plan</div><div className="mt-1"><Badge status={data.status} /></div>{sub && <div className="mt-3 text-slate-500">Valid till <b>{fmtDate(sub.endDate)}</b> • {money(sub.amount)}/{sub.billingCycle === 'YEARLY' ? 'year' : 'month'}</div>}<div className="mt-1 text-slate-500">Up to {data.plan?.maxStudents} students</div></div>
          </Card>
        </div>
      </div>
      <Card title="Fees & receipts">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Receipt prefix"><input className="input" value={s.receiptPrefix || ''} onChange={(e) => setS('receiptPrefix', e.target.value)} /></Field>
          <Field label="Invoice prefix"><input className="input" value={s.invoicePrefix || ''} onChange={(e) => setS('invoicePrefix', e.target.value)} /></Field>
          <Field label="Fee due day of month"><input type="number" className="input" value={s.feeDueDay || 10} onChange={(e) => setS('feeDueDay', Number(e.target.value))} /></Field>
          <Field label="Late fine / day (₹)"><input type="number" className="input" value={s.lateFinePerDay || 0} onChange={(e) => setS('lateFinePerDay', Number(e.target.value))} /></Field>
          <Field label="Admission reg. fee (₹)"><input type="number" className="input" value={s.registrationFee || 0} onChange={(e) => setS('registrationFee', Number(e.target.value))} /></Field>
          <Field label="Library fine / day (₹)"><input type="number" className="input" value={s.libraryFinePerDay || 0} onChange={(e) => setS('libraryFinePerDay', Number(e.target.value))} /></Field>
        </div>
      </Card>
      <Card title="Integrations (production)">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Razorpay key id"><input className="input" value={s.razorpayKeyId || ''} onChange={(e) => setS('razorpayKeyId', e.target.value)} placeholder="rzp_live_…" /></Field>
          <Field label="SMS sender id"><input className="input" value={s.smsSenderId || ''} onChange={(e) => setS('smsSenderId', e.target.value)} placeholder="RAJSCH" /></Field>
          <Field label="WhatsApp number"><input className="input" value={s.whatsappNumber || ''} onChange={(e) => setS('whatsappNumber', e.target.value)} /></Field>
          <Field label="Google Maps embed URL"><input className="input" value={s.mapEmbed || ''} onChange={(e) => setS('mapEmbed', e.target.value)} /></Field>
        </div>
      </Card>
      <ClearDemoData />
      <Card title="Grading scale (percentage → grade)">
        <div className="flex flex-wrap gap-3">{(s.gradeScale || []).map((g, k) => (
          <div key={k} className="flex items-center gap-1 rounded-xl border p-2"><input className="w-14 rounded border px-2 py-1 text-sm" value={g.grade} onChange={(e) => setS('gradeScale', s.gradeScale.map((x, i) => (i === k ? { ...x, grade: e.target.value } : x)))} /><span className="text-xs text-slate-400">≥</span><input type="number" className="w-16 rounded border px-2 py-1 text-sm" value={g.min} onChange={(e) => setS('gradeScale', s.gradeScale.map((x, i) => (i === k ? { ...x, min: Number(e.target.value) } : x)))} />%</div>
        ))}</div>
      </Card>
    </div>
  );
}

export function AuditLog({ platform = false }) {
  const [page, setPage] = useState(1);
  const { data, loading } = useFetch(platform ? '/platform/audit' : '/audit', { page, pageSize: 30 });
  return (
    <div>
      <PageHeader title="Activity Log" subtitle="Every create, update, delete, login and payment is recorded" icon={History} />
      <Card pad={false}>
        {loading && !data ? <Spinner /> : !data?.items.length ? <Empty /> : (
          <div className="overflow-x-auto"><table className="table-x">
            <thead><tr><th>Time</th>{platform && <th>School</th>}<th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
            <tbody>{data.items.map((a) => <tr key={a.id}><td className="whitespace-nowrap text-xs">{fmtDateTime(a.createdAt)}</td>{platform && <td>{a.school?.name || 'Platform'}</td>}<td>{a.userName || '—'}</td><td><Badge status={a.action.includes('DELETE') ? 'ABSENT' : a.action.includes('CREATE') ? 'PAID' : 'NEW'}>{a.action}</Badge></td><td>{a.entity}</td><td className="max-w-sm truncate font-mono text-xs text-slate-400">{a.meta}</td></tr>)}</tbody>
          </table></div>
        )}
        {data && <Pagination page={page} pageSize={30} total={data.total} onPage={setPage} />}
      </Card>
    </div>
  );
}
