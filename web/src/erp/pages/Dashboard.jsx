import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Users, Briefcase, IndianRupee, ClipboardCheck, AlertTriangle, UserPlus, CalendarDays, Bell, Wallet, BookOpen, Package, FileClock, ArrowRight } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { compactMoney, fmtDate, fmtDateTime, money, num, fullName } from '../../lib/format';
import { Card, Stat, Spinner, useFetch, Badge, ErrorBox } from '../components/ui';

const COLORS = ['#c8102e', '#1b3a8c', '#f5b301', '#10b981', '#8b5cf6', '#0ea5e9'];

export default function Dashboard() {
  const { user, school, has } = useAuth();
  const { data: d, loading, error } = useFetch('/dashboard');
  const { data: fees } = useFetch(has('fees') ? '/fees/summary' : null);
  if (error) return <ErrorBox error={error} />;
  if (loading || !d) return <Spinner />;
  const attPct = d.attendanceToday.marked ? Math.round((d.attendanceToday.present / d.attendanceToday.marked) * 100) : 0;
  const hour = new Date().getHours();
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-navy-900 via-navy-800 to-brand-800 p-6 text-white sm:p-8">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-gold-400/20 blur-3xl" />
        <p className="text-sm text-white/70">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Good {hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'}, {user.name.split(' ')[0]} 👋</h1>
        <p className="mt-2 text-white/70">Here's what's happening at {school?.name} today.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/app/fees/collect" className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/25">Collect fee</Link>
          <Link to="/app/attendance" className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/25">Mark attendance</Link>
          <Link to="/app/students/new" className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/25">Admit student</Link>
          <Link to="/app/notices" className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/25">Post notice</Link>
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active Students" value={num(d.students)} icon={Users} color="navy" sub={`${d.boys} boys • ${d.girls} girls`} />
        <Stat label="Attendance Today" value={`${attPct}%`} icon={ClipboardCheck} color="emerald" sub={`${d.attendanceToday.present} present • ${d.attendanceToday.absent} absent • ${d.attendanceToday.marked}/${d.students} marked`} />
        <Stat label="Fee Collected (Month)" value={compactMoney(d.feeThisMonth)} icon={IndianRupee} color="brand" sub={`Today: ${money(d.feeToday)}`} />
        <Stat label="Outstanding Dues" value={compactMoney(d.outstanding)} icon={AlertTriangle} color="amber" sub={<Link to="/app/fees/dues" className="text-brand-600 hover:underline">View defaulters →</Link>} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Staff" value={num(d.staff)} icon={Briefcase} color="violet" sub={`${d.staffToday.present} present today • ${d.staffToday.leave} on leave`} />
        <Stat label="New Enquiries" value={d.newEnquiries} icon={UserPlus} color="sky" sub={<Link to="/app/enquiries" className="text-brand-600 hover:underline">Follow up →</Link>} />
        <Stat label="Open Applications" value={d.openApplications} icon={FileClock} color="rose" sub={<Link to="/app/applications" className="text-brand-600 hover:underline">Review →</Link>} />
        <Stat label="Pending Leaves" value={d.pendingLeaves} icon={CalendarDays} color="amber" sub={<Link to="/app/leaves" className="text-brand-600 hover:underline">Approve →</Link>} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Fee Collection — last 12 months" className="xl:col-span-2">
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={fees?.monthly || []}>
                <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c8102e" stopOpacity={0.35} /><stop offset="100%" stopColor="#c8102e" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} /><YAxis tickFormatter={compactMoney} tick={{ fontSize: 12 }} width={70} />
                <Tooltip formatter={(v) => money(v)} />
                <Area type="monotone" dataKey="amount" stroke="#c8102e" strokeWidth={2.5} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Payment Modes (this month)">
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={fees?.byMethod || []} dataKey="amount" nameKey="method" innerRadius={60} outerRadius={95} paddingAngle={3}>
                  {(fees?.byMethod || []).map((_, k) => <Cell key={k} fill={COLORS[k % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => money(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 text-xs">{(fees?.byMethod || []).map((m, k) => <span key={m.method} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[k % COLORS.length] }} />{m.method}</span>)}</div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Attendance trend (%)" className="xl:col-span-2">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={d.attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(x) => x.slice(8)} tick={{ fontSize: 12 }} /><YAxis domain={[70, 100]} tick={{ fontSize: 12 }} />
                <Tooltip labelFormatter={(x) => fmtDate(x)} formatter={(v) => `${v}%`} />
                <Bar dataKey="percent" radius={[6, 6, 0, 0]} fill="#1b3a8c" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Class strength">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={d.classStrength} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" hide /><YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
                <Tooltip /><Bar dataKey="students" fill="#f5b301" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Recent fee payments" pad={false} actions={<Link to="/app/fees/payments" className="text-xs font-semibold text-brand-600">View all</Link>} className="xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="table-x">
              <thead><tr><th>Receipt</th><th>Student</th><th>Class</th><th>Mode</th><th>Amount</th><th>Time</th></tr></thead>
              <tbody>
                {d.recentPayments.map((p) => (
                  <tr key={p.id}><td className="font-mono text-xs">{p.receiptNo}</td><td><Link to={`/app/students/${p.studentId}`} className="font-medium hover:text-brand-600">{fullName(p.student)}</Link></td><td>{p.student.grade?.name}-{p.student.section?.name}</td><td><Badge>{p.method}</Badge></td><td className="font-semibold">{money(p.amount)}</td><td className="text-xs text-slate-500">{fmtDateTime(p.paidAt)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="space-y-6">
          <Card title="Upcoming events" actions={<Link to="/app/events" className="text-xs font-semibold text-brand-600">Calendar</Link>}>
            <div className="space-y-3">
              {d.upcomingEvents.map((e) => (
                <div key={e.id} className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700"><b className="leading-none">{new Date(e.startDate).getUTCDate()}</b><span className="text-[9px] uppercase">{new Date(e.startDate).toLocaleString('en', { month: 'short', timeZone: 'UTC' })}</span></div>
                  <div className="min-w-0"><div className="truncate text-sm font-medium">{e.title}</div><Badge status={e.type === 'HOLIDAY' ? 'ACTIVE' : 'NEW'}>{e.type}</Badge></div>
                </div>
              ))}
            </div>
          </Card>
          {(d.lowStock.length > 0 || d.overdueBooks > 0) && (
            <Card title="Alerts">
              <div className="space-y-2 text-sm">
                {d.lowStock.map((i) => <div key={i.name} className="flex items-center gap-2 rounded-lg bg-amber-50 p-2.5 text-amber-800"><Package size={15} /> Low stock: <b>{i.name}</b> ({i.quantity} {i.unit})</div>)}
                {d.overdueBooks > 0 && <Link to="/app/library" className="flex items-center gap-2 rounded-lg bg-rose-50 p-2.5 text-rose-700"><BookOpen size={15} /> {d.overdueBooks} library books overdue <ArrowRight size={14} className="ml-auto" /></Link>}
              </div>
            </Card>
          )}
          <Card title="Latest notices" actions={<Link to="/app/notices" className="text-xs font-semibold text-brand-600">Manage</Link>}>
            <div className="space-y-3">{d.notices.map((n) => <div key={n.id} className="flex gap-2 text-sm"><Bell size={15} className="mt-0.5 shrink-0 text-brand-600" /><div><div className="font-medium">{n.title}</div><div className="text-xs text-slate-400">{fmtDate(n.publishDate)}</div></div></div>)}</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
