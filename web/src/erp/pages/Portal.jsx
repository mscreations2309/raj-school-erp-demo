// Parent / Student portal and Teacher home.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { ClipboardCheck, Wallet, BookMarked, NotebookPen, CalendarDays, Bell, Bus, BedDouble, Printer, CreditCard, Smartphone, ShieldCheck, Loader2, CheckCircle2, ChevronLeft, ChevronRight, CalendarClock, Users, BookOpen, Plus } from 'lucide-react';
import { api, errMsg } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDate, money, fullName, pretty, isoDay } from '../../lib/format';
import { Card, Spinner, Empty, useFetch, Badge, Stat, Modal, Tabs, Avatar, Field, ErrorBox } from '../components/ui';
import { ReportCardView } from './Exams';
import HomeworkFamily from './HomeworkFamily';

const DOT = { PRESENT: 'bg-emerald-500', ABSENT: 'bg-rose-500', LATE: 'bg-amber-500', HALF_DAY: 'bg-sky-500', LEAVE: 'bg-violet-500' };

function AttendanceCalendar({ studentId }) {
  const [month, setMonth] = useState(isoDay().slice(0, 7));
  const { data } = useFetch(`/portal/student/${studentId}/attendance`, { month });
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1).getDay();
  const days = new Date(y, m, 0).getDate();
  const map = Object.fromEntries((data?.items || []).map((x) => [Number(x.date.slice(8)), x.status]));
  const shift = (d) => { const x = new Date(y, m - 1 + d, 1); setMonth(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`); };
  return (
    <div>
      <div className="mb-4 flex items-center justify-between"><button className="btn-ghost btn-sm" onClick={() => shift(-1)}><ChevronLeft size={16} /></button><b>{new Date(y, m - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</b><button className="btn-ghost btn-sm" onClick={() => shift(1)}><ChevronRight size={16} /></button></div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="py-1 font-semibold text-slate-400">{d}</div>)}
        {Array.from({ length: first }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: days }, (_, i) => i + 1).map((d) => (
          <motion.div key={d} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: d * 0.01 }} className={`flex aspect-square items-center justify-center rounded-lg text-xs font-semibold ${map[d] ? `${DOT[map[d]]} text-white` : 'bg-slate-50 text-slate-400'}`} title={map[d]}>{d}</motion.div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs">{Object.entries(DOT).map(([k, c]) => <span key={k} className="flex items-center gap-1"><span className={`h-2.5 w-2.5 rounded ${c}`} />{pretty(k)}</span>)}</div>
    </div>
  );
}

function PayModal({ invoice, onClose, onPaid }) {
  const [method, setMethod] = useState('UPI');
  const [stage, setStage] = useState('choose');
  const [payment, setPayment] = useState(null);
  const pay = async () => {
    setStage('processing');
    await new Promise((r) => setTimeout(r, 1800));
    try { const { data } = await api.post(`/portal/pay/${invoice.id}`, { method }); setPayment(data); setStage('done'); onPaid(); } catch (e) { toast.error(errMsg(e)); setStage('choose'); }
  };
  return (
    <Modal open={!!invoice} onClose={onClose} title="Pay fee online" size="sm">
      {invoice && (
        <AnimatePresence mode="wait">
          {stage === 'choose' && (
            <motion.div key="c" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
              <div className="rounded-2xl bg-gradient-to-br from-navy-800 to-brand-700 p-5 text-white"><div className="text-sm text-white/70">{invoice.title}</div><div className="text-3xl font-bold">{money(invoice.total - invoice.paid)}</div><div className="text-xs text-white/60">{invoice.invoiceNo}</div></div>
              <div className="grid grid-cols-3 gap-2">{[['UPI', Smartphone, 'UPI'], ['CARD', CreditCard, 'Card'], ['ONLINE', ShieldCheck, 'Net banking']].map(([k, I, l]) => <button key={k} onClick={() => setMethod(k)} className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-semibold ${method === k ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500'}`}><I size={20} />{l}</button>)}</div>
              <button className="btn-primary w-full py-3" onClick={pay}>Pay {money(invoice.total - invoice.paid)}</button>
              <p className="text-center text-[11px] text-slate-400">Demo payment gateway — plug in Razorpay keys in Settings for live payments.</p>
            </motion.div>
          )}
          {stage === 'processing' && <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center"><Loader2 className="mx-auto animate-spin text-brand-600" size={48} /><p className="mt-4 font-semibold">Processing secure payment…</p></motion.div>}
          {stage === 'done' && (
            <motion.div key="d" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-6 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}><CheckCircle2 size={64} className="mx-auto text-emerald-500" /></motion.div>
              <h3 className="mt-4 text-xl font-bold">Payment successful</h3>
              <p className="mt-1 text-sm text-slate-500">Receipt {payment.receiptNo} • {money(payment.amount)}</p>
              <Link to={`/app/receipt/${payment.id}`} className="btn-primary mt-6"><Printer size={16} /> View receipt</Link>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </Modal>
  );
}

export function ParentPortal() {
  const { user } = useAuth();
  const { data: kids, loading } = useFetch('/portal/children');
  const [active, setActive] = useState(null);
  useEffect(() => { if (kids?.items?.length && !active) setActive(kids.items[0].id); }, [kids, active]);
  const { data: d, reload } = useFetch(active ? `/portal/student/${active}` : null);
  const [tab, setTab] = useState('home');
  const [pay, setPay] = useState(null);
  const [exam, setExam] = useState('');
  const { data: rc } = useFetch(exam && active ? `/portal/student/${active}/report-card` : null, { examId: exam });
  const [leave, setLeave] = useState(false);
  const [lf, setLf] = useState({ fromDate: isoDay(), toDate: isoDay(), reason: '' });
  const today = new Date().getDay() || 7;
  if (loading) return <Spinner />;
  if (!kids?.items?.length) return <Card><Empty text="No student is linked to your account yet. Please contact the school office." /></Card>;
  const s = d?.student;
  const applyLeave = async () => { try { await api.post('/portal/leave', { ...lf, studentId: active }); toast.success('Leave application sent to class teacher'); setLeave(false); } catch (e) { toast.error(errMsg(e)); } };
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-navy-900 via-navy-800 to-brand-800 p-6 text-white">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold-400/20 blur-3xl" />
        <p className="text-sm text-white/70">Namaste, {user.name} 🙏</p>
        <h1 className="mt-1 text-2xl font-bold">{user.role === 'STUDENT' ? 'Student Portal' : 'Parent Portal'}</h1>
        {kids.items.length > 1 && <div className="mt-5 flex flex-wrap gap-2">{kids.items.map((k) => <button key={k.id} onClick={() => { setActive(k.id); setExam(''); }} className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${active === k.id ? 'bg-white text-navy-900' : 'bg-white/10 hover:bg-white/20'}`}><Avatar name={fullName(k)} size={26} />{k.firstName} • {k.grade?.name}-{k.section?.name}</button>)}</div>}
      </motion.div>
      {!d ? <Spinner /> : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar name={fullName(s)} src={s.photoUrl} size={64} />
            <div className="flex-1"><h2 className="text-xl font-bold text-navy-900">{fullName(s)}</h2><p className="text-sm text-slate-500">Class {s.grade?.name}-{s.section?.name} • Roll {s.rollNo} • {s.admissionNo}</p>{s.section?.classTeacher && <p className="text-sm text-slate-500">Class teacher: <b>{fullName(s.section.classTeacher)}</b></p>}</div>
            {user.role === 'PARENT' && <button className="btn-outline" onClick={() => setLeave(true)}><Plus size={16} /> Apply leave</button>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Attendance" value={d.attendance.percent != null ? `${d.attendance.percent}%` : '—'} sub={`${d.attendance.PRESENT || 0} present of ${d.attendance.total} days`} icon={ClipboardCheck} color="emerald" />
            <Stat label="Fee due" value={money(d.fees.due)} sub={d.fees.due > 0 ? <button onClick={() => setTab('fees')} className="text-brand-600">Pay now →</button> : 'All clear ✓'} icon={Wallet} color={d.fees.due > 0 ? 'rose' : 'emerald'} />
            <Stat label="Homework" value={d.homework.length} sub="assigned recently" icon={NotebookPen} color="violet" />
            <Stat label="Results" value={d.exams.length} sub="published exams" icon={BookMarked} color="amber" />
          </div>
          <Tabs value={tab} onChange={setTab} tabs={[['home', 'Overview'], ['attendance', 'Attendance'], ['fees', 'Fees'], ['results', 'Results'], ['homework', 'Homework'], ['timetable', 'Timetable']]} />

          {tab === 'home' && (
            <div className="grid gap-6 lg:grid-cols-3">
              <Card title={<span className="flex items-center gap-2"><Bell size={16} /> Notices</span>} className="lg:col-span-2">
                <div className="space-y-4">{d.notices.map((n) => <div key={n.id} className="flex gap-3"><div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-600" /><div><div className="font-medium">{n.title}{n.isPinned && <Badge status="PENDING" className="ml-2">Pinned</Badge>}</div><p className="text-sm text-slate-500">{n.body}</p><p className="text-xs text-slate-400">{fmtDate(n.publishDate)}</p></div></div>)}</div>
              </Card>
              <div className="space-y-6">
                <Card title={<span className="flex items-center gap-2"><CalendarDays size={16} /> Upcoming</span>}>{d.events.map((e) => <div key={e.id} className="mb-3 flex items-center justify-between text-sm"><span>{e.title}</span><Badge status={e.type === 'HOLIDAY' ? 'ACTIVE' : 'NEW'}>{fmtDate(e.startDate)}</Badge></div>)}</Card>
                {s.transportStop && <Card title={<span className="flex items-center gap-2"><Bus size={16} /> Transport</span>}><div className="text-sm"><b>{s.transportStop.route.name}</b><div>Stop: {s.transportStop.name} • Pickup {s.transportStop.pickupTime} • Drop {s.transportStop.dropTime}</div><div>Bus {s.transportStop.route.vehicle?.number} • Driver {s.transportStop.route.vehicle?.driverName} <a href={`tel:${s.transportStop.route.vehicle?.driverPhone}`} className="text-brand-600">{s.transportStop.route.vehicle?.driverPhone}</a></div></div></Card>}
                {s.hostelAllocations?.[0] && <Card title={<span className="flex items-center gap-2"><BedDouble size={16} /> Hostel</span>}><div className="text-sm">{s.hostelAllocations[0].room.hostel.name} • Room {s.hostelAllocations[0].room.roomNo}<div>Warden: {s.hostelAllocations[0].room.hostel.wardenName} ({s.hostelAllocations[0].room.hostel.wardenPhone})</div></div></Card>}
                {d.books.length > 0 && <Card title={<span className="flex items-center gap-2"><BookOpen size={16} /> Library</span>}>{d.books.map((b) => <div key={b.id} className="text-sm">{b.book.title} — due {fmtDate(b.dueDate)}</div>)}</Card>}
              </div>
            </div>
          )}
          {tab === 'attendance' && <div className="grid gap-6 lg:grid-cols-2"><Card title="Monthly calendar"><AttendanceCalendar studentId={active} /></Card><Card title="Session summary"><div className="grid grid-cols-2 gap-3">{['PRESENT', 'ABSENT', 'LATE', 'LEAVE'].map((k) => <div key={k} className="rounded-xl bg-slate-50 p-4"><div className="text-2xl font-bold">{d.attendance[k] || 0}</div><Badge status={k} /></div>)}</div></Card></div>}
          {tab === 'fees' && (
            <Card pad={false} title="Fee invoices">
              <div className="overflow-x-auto"><table className="table-x">
                <thead><tr><th>Period</th><th>Particulars</th><th>Due date</th><th>Amount</th><th>Paid</th><th>Status</th><th></th></tr></thead>
                <tbody>{d.fees.invoices.map((i) => (
                  <tr key={i.id}><td className="font-medium">{i.title}</td><td className="text-xs text-slate-500">{i.items.map((x) => x.name).join(', ')}</td><td>{fmtDate(i.dueDate)}</td><td>{money(i.total)}</td><td className="text-emerald-600">{money(i.paid)}</td><td><Badge status={i.status} /></td>
                    <td className="whitespace-nowrap">{i.status !== 'PAID' ? <button className="btn-primary btn-sm" onClick={() => setPay(i)}>Pay {money(i.total - i.paid)}</button> : i.payments[0] && <Link to={`/app/receipt/${i.payments[0].id}`} className="btn-ghost btn-sm"><Printer size={14} /> Receipt</Link>}</td></tr>
                ))}</tbody>
              </table></div>
            </Card>
          )}
          {tab === 'results' && (
            <div className="space-y-4">
              <Card><div className="flex flex-wrap gap-2">{d.exams.length ? d.exams.map((e) => <button key={e.id} onClick={() => setExam(e.id)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${exam === e.id ? 'bg-brand-600 text-white' : 'bg-slate-100'}`}>{e.name}</button>) : <Empty text="No published results yet" />}</div></Card>
              {exam && !rc && <Spinner />}
              {rc && <><div className="flex justify-end"><button className="btn-outline" onClick={() => window.print()}><Printer size={16} /> Print</button></div><ReportCardView data={rc} /></>}
            </div>
          )}
          {tab === 'homework' && <HomeworkFamily studentId={active} />}
          {tab === 'timetable' && (
            <Card pad={false}><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm">
              <thead><tr className="bg-navy-900 text-white"><th className="p-3 text-left">Day</th>{[1, 2, 3, 4, 5, 6, 7].map((p) => <th key={p} className="p-3">P{p}</th>)}</tr></thead>
              <tbody>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, di) => <tr key={day} className={`border-t ${today === di + 1 ? 'bg-gold-300/20' : ''}`}><td className="p-3 font-semibold">{day}</td>{[1, 2, 3, 4, 5, 6, 7].map((p) => { const sl = d.timetable.find((x) => x.day === di + 1 && x.period === p); return <td key={p} className="border-l p-2 text-center"><div className="font-medium">{sl?.subject?.name || '—'}</div><div className="text-[10px] text-slate-400">{sl?.startTime}</div></td>; })}</tr>)}</tbody>
            </table></div></Card>
          )}
        </>
      )}
      <PayModal invoice={pay} onClose={() => setPay(null)} onPaid={reload} />
      <Modal open={leave} onClose={() => setLeave(false)} title="Leave application" size="sm" footer={<><button className="btn-outline" onClick={() => setLeave(false)}>Cancel</button><button className="btn-primary" onClick={applyLeave}>Submit</button></>}>
        <div className="space-y-4"><div className="grid grid-cols-2 gap-3"><Field label="From"><input type="date" className="input" value={lf.fromDate} onChange={(e) => setLf({ ...lf, fromDate: e.target.value })} /></Field><Field label="To"><input type="date" className="input" value={lf.toDate} onChange={(e) => setLf({ ...lf, toDate: e.target.value })} /></Field></div><Field label="Reason"><textarea className="input" rows={3} value={lf.reason} onChange={(e) => setLf({ ...lf, reason: e.target.value })} /></Field></div>
      </Modal>
    </div>
  );
}

export function TeacherHome() {
  const { user } = useAuth();
  const { data: d, loading, error } = useFetch('/portal/teacher');
  if (error) return <ErrorBox error={error} />;
  if (loading || !d) return <Spinner />;
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-gradient-to-r from-navy-900 to-brand-800 p-6 text-white">
        <p className="text-sm text-white/70">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="mt-1 text-2xl font-bold">Welcome, {user.name.split(' ')[0]} 👋</h1>
        <p className="text-white/70">{d.staff?.designation}</p>
        <div className="mt-5 flex flex-wrap gap-2">{[['/app/attendance', 'Mark attendance'], ['/app/marks', 'Enter marks'], ['/app/homework', 'Post homework'], ['/app/leaves', 'Apply leave']].map(([to, l]) => <Link key={to} to={to} className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/25">{l}</Link>)}</div>
      </motion.div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title={<span className="flex items-center gap-2"><CalendarClock size={16} /> Today's classes</span>}>
          {!d.today.length ? <Empty text="No classes today" /> : <div className="space-y-2">{d.today.map((t) => <div key={t.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><div className="w-14 text-center text-xs font-bold text-brand-600">P{t.period}<div className="font-normal text-slate-400">{t.startTime}</div></div><div><div className="font-medium">{t.subject?.name}</div><div className="text-xs text-slate-500">Class {t.section.grade.name}-{t.section.name}</div></div></div>)}</div>}
        </Card>
        <Card title={<span className="flex items-center gap-2"><Users size={16} /> My class (class teacher)</span>}>
          {!d.classSections.length ? <Empty text="Not a class teacher" /> : d.classSections.map((c) => <div key={c.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-4"><div><div className="text-lg font-bold">{c.grade.name}-{c.name}</div><div className="text-xs text-slate-500">{c._count.students} students</div></div>{c.attendanceMarked ? <Badge status="PAID">Attendance done</Badge> : <Link to="/app/attendance" className="btn-primary btn-sm">Mark now</Link>}</div>)}
        </Card>
        <Card title={<span className="flex items-center gap-2"><BookMarked size={16} /> Subjects I teach</span>}>
          <div className="flex flex-wrap gap-2">{d.subjectSections.map((s) => <span key={s.id} className="badge bg-navy-50 px-3 py-1.5 text-navy-700">{s.subject.name} • {s.section.grade.name}-{s.section.name}</span>)}</div>
        </Card>
      </div>
      <Card title="Recent homework I posted">{!d.homework.length ? <Empty /> : <div className="divide-y">{d.homework.map((h) => <div key={h.id} className="flex items-center justify-between py-3 text-sm"><div><b>{h.title}</b><div className="text-xs text-slate-500">{h.subject.name} • {h.section.grade.name}-{h.section.name}</div></div><span className="text-xs text-slate-400">Due {fmtDate(h.dueDate)}</span></div>)}</div>}</Card>
    </div>
  );
}
