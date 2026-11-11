import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart, Legend } from 'recharts';
import { Wallet, IndianRupee, Search, Printer, Loader2, Receipt as ReceiptIcon, FileText, AlertTriangle, Download, Plus, Ban, CheckCircle2, PieChart as PieIcon, TrendingUp, TrendingDown, Phone } from 'lucide-react';
import { api, errMsg, download } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { amountInWords, compactMoney, fmtDate, fmtDateTime, money, fullName, isoDay } from '../../lib/format';
import { PageHeader, Card, Spinner, Empty, useFetch, Field, Badge, Stat, Modal, Pagination, Avatar, ErrorBox } from '../components/ui';
import { SectionSelect } from './Students';

export function FeeDashboard() {
  const { data, loading } = useFetch('/fees/summary');
  const { data: dues } = useFetch('/fees/dues');
  if (loading || !data) return <Spinner />;
  return (
    <div className="space-y-6">
      <PageHeader title="Fee Dashboard" icon={Wallet} actions={<><Link to="/app/fees/invoices" className="btn-outline"><FileText size={16} /> Invoices</Link><Link to="/app/fees/collect" className="btn-primary"><IndianRupee size={16} /> Collect fee</Link></>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Collected today" value={money(data.today)} sub={`${data.todayCount} receipts`} icon={IndianRupee} color="emerald" />
        <Stat label="Collected this month" value={compactMoney(data.month)} sub={`${data.monthCount} receipts`} icon={TrendingUp} color="navy" />
        <Stat label="Outstanding" value={compactMoney(data.outstanding)} sub={`${data.outstandingInvoices} open invoices`} icon={AlertTriangle} color="amber" />
        <Stat label="Defaulters" value={dues?.students ?? '…'} sub={<Link to="/app/fees/dues" className="text-brand-600">View list →</Link>} icon={AlertTriangle} color="rose" />
      </div>
      <Card title="Monthly collection">
        <div className="h-80"><ResponsiveContainer><AreaChart data={data.monthly}><defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1b3a8c" stopOpacity={0.35} /><stop offset="100%" stopColor="#1b3a8c" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" /><XAxis dataKey="label" /><YAxis tickFormatter={compactMoney} width={70} /><Tooltip formatter={(v) => money(v)} /><Area dataKey="amount" stroke="#1b3a8c" strokeWidth={2.5} fill="url(#fg)" /></AreaChart></ResponsiveContainer></div>
      </Card>
      <Card title="Top defaulters" pad={false} actions={<button className="btn-outline btn-sm" onClick={() => download('/fees/dues?format=csv', 'fee-dues.csv')}><Download size={14} /> CSV</button>}>
        <DuesTable rows={(dues?.rows || []).slice(0, 10)} />
      </Card>
    </div>
  );
}

function DuesTable({ rows }) {
  if (!rows.length) return <Empty text="No dues 🎉" />;
  return (
    <div className="overflow-x-auto"><table className="table-x">
      <thead><tr><th>Student</th><th>Class</th><th>Father / Phone</th><th>Invoices</th><th>Overdue</th><th>Total due</th><th></th></tr></thead>
      <tbody>{rows.map((r) => (
        <tr key={r.student.id}>
          <td><Link to={`/app/students/${r.student.id}`} className="font-medium hover:text-brand-600">{fullName(r.student)}</Link><div className="font-mono text-xs text-slate-400">{r.student.admissionNo}</div></td>
          <td>{r.student.grade?.name}-{r.student.section?.name}</td>
          <td>{r.student.fatherName}<div className="text-xs text-slate-400"><a href={`tel:${r.student.fatherPhone}`} className="inline-flex items-center gap-1"><Phone size={11} />{r.student.fatherPhone}</a></div></td>
          <td>{r.invoices}</td><td className="text-rose-600">{money(r.overdue)}</td><td className="font-bold">{money(r.due)}</td>
          <td><Link to={`/app/fees/collect?studentId=${r.student.id}`} className="btn-primary btn-sm">Collect</Link></td>
        </tr>
      ))}</tbody>
    </table></div>
  );
}

export function Dues() {
  const [sectionId, setSection] = useState('');
  const { data, loading } = useFetch('/fees/dues', { sectionId: sectionId || undefined });
  return (
    <div>
      <PageHeader title="Defaulters / Fee Dues" subtitle={data && `${data.students} students • ${money(data.totalDue)} pending`} icon={AlertTriangle} actions={<button className="btn-outline" onClick={() => download(`/fees/dues?format=csv${sectionId ? `&sectionId=${sectionId}` : ''}`, 'fee-dues.csv')}><Download size={16} /> Export CSV</button>} />
      <Card className="mb-6"><div className="max-w-sm"><SectionSelect value={sectionId} onChange={setSection} allowAll /></div></Card>
      <Card pad={false}>{loading ? <Spinner /> : <DuesTable rows={data?.rows || []} />}</Card>
    </div>
  );
}

export function CollectFee() {
  const [sp, setSp] = useSearchParams();
  const studentId = sp.get('studentId');
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const { data, loading, reload } = useFetch(studentId ? `/fees/student/${studentId}` : null);
  const [pay, setPay] = useState(null);
  const [form, setForm] = useState({ amount: '', method: 'CASH', reference: '', remarks: '', fine: 0 });
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  useEffect(() => {
    if (q.length < 2) return setResults([]);
    const id = setTimeout(() => api.get('/students', { params: { q, pageSize: 8 } }).then((r) => setResults(r.data.items)), 250);
    return () => clearTimeout(id);
  }, [q]);
  const open = data?.invoices.filter((i) => ['UNPAID', 'PARTIAL'].includes(i.status)) || [];
  const totalDue = open.reduce((a, i) => a + i.total - i.paid, 0);
  const startPay = (inv) => { setPay(inv); setForm({ amount: inv.total - inv.paid, method: 'CASH', reference: '', remarks: '', fine: new Date(inv.dueDate) < new Date() ? 0 : 0 }); };
  const submit = async () => {
    setBusy(true);
    try {
      const { data: p } = await api.post('/fees/collect', { invoiceId: pay.id, ...form });
      toast.success(`Receipt ${p.receiptNo} generated`);
      setPay(null); reload();
      nav(`/app/fees/receipt/${p.id}`);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <div>
      <PageHeader title="Collect Fee" subtitle="Search a student, select an invoice and record the payment" icon={IndianRupee} />
      <Card>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input autoFocus className="input py-3 pl-10 text-base" placeholder="Search by name, admission no. or father's mobile…" value={q} onChange={(e) => setQ(e.target.value)} />
          {results.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border bg-white p-2 shadow-soft">
              {results.map((s) => <button key={s.id} onClick={() => { setSp({ studentId: s.id }); setQ(''); setResults([]); }} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-50"><Avatar name={fullName(s)} size={34} /><div><div className="font-medium">{fullName(s)}</div><div className="text-xs text-slate-500">{s.admissionNo} • {s.grade?.name}-{s.section?.name} • {s.fatherName}</div></div></button>)}
            </div>
          )}
        </div>
      </Card>
      {!studentId ? <Card className="mt-6"><Empty text="Search for a student to view dues" icon={Wallet} /></Card> : loading || !data ? <Spinner /> : (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card>
            <div className="flex items-center gap-4"><Avatar name={fullName(data.student)} size={56} /><div><Link to={`/app/students/${data.student.id}`} className="text-lg font-bold text-navy-900 hover:text-brand-600">{fullName(data.student)}</Link><div className="text-sm text-slate-500">{data.student.admissionNo} • {data.student.grade?.name}-{data.student.section?.name}</div><div className="text-sm text-slate-500">{data.student.fatherName} • {data.student.fatherPhone}</div></div></div>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className={`mt-6 rounded-2xl p-5 text-white ${totalDue > 0 ? 'bg-gradient-to-br from-rose-500 to-rose-700' : 'bg-gradient-to-br from-emerald-500 to-emerald-700'}`}>
              <div className="text-sm text-white/80">Total outstanding</div><div className="text-3xl font-bold">{money(totalDue)}</div><div className="text-xs text-white/70">{open.length} open invoice(s)</div>
            </motion.div>
            {data.student.concessions?.length > 0 && <div className="mt-4 rounded-xl bg-sky-50 p-3 text-xs text-sky-800">Concession: {data.student.concessions.map((c) => `${c.reason} (${c.type === 'PERCENT' ? c.value + '%' : money(c.value)})`).join(', ')}</div>}
          </Card>
          <Card title="Invoices" pad={false} className="lg:col-span-2">
            <div className="overflow-x-auto"><table className="table-x">
              <thead><tr><th>Invoice</th><th>Period</th><th>Items</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th><th></th></tr></thead>
              <tbody>{[...data.invoices].reverse().map((i) => (
                <tr key={i.id}>
                  <td className="font-mono text-xs">{i.invoiceNo}<div className="text-[11px] text-slate-400">due {fmtDate(i.dueDate)}</div></td>
                  <td>{i.title}</td>
                  <td className="text-xs text-slate-500">{i.items.map((x) => `${x.name} ${money(x.amount)}`).join(', ')}{i.discount > 0 && <div className="text-emerald-600">− {money(i.discount)} concession</div>}</td>
                  <td>{money(i.total)}</td><td className="text-emerald-600">{money(i.paid)}</td><td className="font-bold">{money(i.total - i.paid)}</td><td><Badge status={i.status} /></td>
                  <td className="whitespace-nowrap">{['UNPAID', 'PARTIAL'].includes(i.status) ? <button className="btn-primary btn-sm" onClick={() => startPay(i)}>Collect</button> : i.payments[0] && <Link to={`/app/fees/receipt/${i.payments[i.payments.length - 1].id}`} className="btn-ghost btn-sm"><Printer size={14} /></Link>}</td>
                </tr>
              ))}</tbody>
            </table></div>
          </Card>
        </div>
      )}
      <Modal open={!!pay} onClose={() => setPay(null)} title={`Collect — ${pay?.title}`} size="sm" footer={<><button className="btn-outline" onClick={() => setPay(null)}>Cancel</button><button className="btn-primary" disabled={busy} onClick={submit}>{busy && <Loader2 size={16} className="animate-spin" />} Collect {money(Number(form.amount) || 0)}</button></>}>
        {pay && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3 text-sm">Balance due: <b>{money(pay.total - pay.paid)}</b></div>
            <Field label="Amount"><input type="number" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Late fine (optional)"><input type="number" className="input" value={form.fine} onChange={(e) => setForm({ ...form, fine: e.target.value })} /></Field>
            <Field label="Payment mode"><div className="grid grid-cols-3 gap-2">{['CASH', 'UPI', 'CARD', 'CHEQUE', 'BANK_TRANSFER', 'ONLINE'].map((m) => <button key={m} type="button" onClick={() => setForm({ ...form, method: m })} className={`rounded-lg border py-2 text-xs font-semibold ${form.method === m ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200'}`}>{m.replace('_', ' ')}</button>)}</div></Field>
            {form.method !== 'CASH' && <Field label="Reference / UTR / Cheque no."><input className="input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></Field>}
            <Field label="Remarks"><input className="input" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function Invoices() {
  const { is } = useAuth();
  const [page, setPage] = useState(1);
  const [f, setF] = useState({ status: '', period: '', sectionId: '', q: '' });
  const { data, loading, reload } = useFetch('/fees/invoices', { page, pageSize: 25, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)) });
  const [gen, setGen] = useState(false);
  const [g, setG] = useState({ period: isoDay().slice(0, 7), gradeId: '' });
  const [busy, setBusy] = useState(false);
  const { data: grades } = useFetch('/grades', { all: 1 });
  const generate = async () => {
    setBusy(true);
    try { const { data: r } = await api.post('/fees/generate', { period: g.period, gradeId: g.gradeId || undefined }); toast.success(`${r.created} invoices generated, ${r.skipped} skipped (already exist)`); setGen(false); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const cancel = async (id) => { try { await api.post(`/fees/invoices/${id}/cancel`); toast.success('Cancelled'); reload(); } catch (e) { toast.error(errMsg(e)); } };
  return (
    <div>
      <PageHeader title="Fee Invoices" subtitle={data && `${data.total} invoices • billed ${money(data.sum.total)} • collected ${money(data.sum.paid)}`} icon={FileText} actions={is('SCHOOL_ADMIN', 'PRINCIPAL', 'ACCOUNTANT') && <button className="btn-primary" onClick={() => setGen(true)}><Plus size={16} /> Generate monthly invoices</button>} />
      <Card pad={false}>
        <div className="grid gap-3 border-b p-4 md:grid-cols-4">
          <input className="input" placeholder="Search student / adm. no…" value={f.q} onChange={(e) => { setF({ ...f, q: e.target.value }); setPage(1); }} />
          <SectionSelect value={f.sectionId} onChange={(v) => { setF({ ...f, sectionId: v }); setPage(1); }} allowAll />
          <input type="month" className="input" value={f.period} onChange={(e) => { setF({ ...f, period: e.target.value }); setPage(1); }} />
          <select className="input" value={f.status} onChange={(e) => { setF({ ...f, status: e.target.value }); setPage(1); }}><option value="">All statuses</option>{['UNPAID', 'PARTIAL', 'PAID', 'CANCELLED'].map((s) => <option key={s}>{s}</option>)}</select>
        </div>
        {loading && !data ? <Spinner /> : !data?.items.length ? <Empty /> : (
          <div className="overflow-x-auto"><table className="table-x">
            <thead><tr><th>Invoice</th><th>Student</th><th>Class</th><th>Period</th><th>Due</th><th>Total</th><th>Paid</th><th>Status</th><th></th></tr></thead>
            <tbody>{data.items.map((i) => (
              <tr key={i.id}><td className="font-mono text-xs">{i.invoiceNo}</td><td><Link to={`/app/students/${i.studentId}`} className="font-medium hover:text-brand-600">{fullName(i.student)}</Link></td><td>{i.student.grade?.name}-{i.student.section?.name}</td><td>{i.title}</td><td>{fmtDate(i.dueDate)}</td><td>{money(i.total)}</td><td className="text-emerald-600">{money(i.paid)}</td><td><Badge status={i.status} /></td>
                <td className="whitespace-nowrap">{['UNPAID', 'PARTIAL'].includes(i.status) && <Link to={`/app/fees/collect?studentId=${i.studentId}`} className="btn-primary btn-sm">Collect</Link>}{i.status === 'UNPAID' && is('SCHOOL_ADMIN', 'PRINCIPAL', 'ACCOUNTANT') && <button className="btn-ghost btn-sm text-rose-600" title="Cancel" onClick={() => cancel(i.id)}><Ban size={14} /></button>}</td></tr>
            ))}</tbody>
          </table></div>
        )}
        {data && <Pagination page={page} pageSize={25} total={data.total} onPage={setPage} />}
      </Card>
      <Modal open={gen} onClose={() => setGen(false)} title="Generate monthly invoices" size="sm" footer={<><button className="btn-outline" onClick={() => setGen(false)}>Cancel</button><button className="btn-primary" disabled={busy} onClick={generate}>{busy && <Loader2 size={16} className="animate-spin" />} Generate</button></>}>
        <div className="space-y-4">
          <Field label="Month"><input type="month" className="input" value={g.period} onChange={(e) => setG({ ...g, period: e.target.value })} /></Field>
          <Field label="Class (optional)"><select className="input" value={g.gradeId} onChange={(e) => setG({ ...g, gradeId: e.target.value })}><option value="">All classes</option>{(grades?.items || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
          <p className="text-xs text-slate-500">Uses the fee structure of the current session. Monthly heads every month, quarterly heads in Apr/Jul/Oct/Jan, annual heads in April. Transport & hostel fees are added automatically; concessions are applied. Students who already have an invoice for the month are skipped.</p>
        </div>
      </Modal>
    </div>
  );
}

export function Payments() {
  const [page, setPage] = useState(1);
  const [f, setF] = useState({ from: isoDay(new Date(Date.now() - 30 * 864e5)), to: isoDay(), method: '', q: '' });
  const params = { page, pageSize: 25, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)) };
  const { data, loading } = useFetch('/fees/payments', params);
  return (
    <div>
      <PageHeader title="Payments & Receipts" subtitle={data && `${data.total} receipts • ${money(data.sum)}`} icon={ReceiptIcon} actions={<button className="btn-outline" onClick={() => download(`/fees/payments?format=csv&${new URLSearchParams(Object.fromEntries(Object.entries(f).filter(([, v]) => v)))}`, 'fee-collection.csv')}><Download size={16} /> Export</button>} />
      <Card pad={false}>
        <div className="grid gap-3 border-b p-4 md:grid-cols-4">
          <input className="input" placeholder="Receipt / student…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
          <input type="date" className="input" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
          <input type="date" className="input" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
          <select className="input" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}><option value="">All modes</option>{['CASH', 'UPI', 'CARD', 'ONLINE', 'CHEQUE', 'BANK_TRANSFER'].map((m) => <option key={m}>{m}</option>)}</select>
        </div>
        {loading && !data ? <Spinner /> : !data?.items.length ? <Empty /> : (
          <div className="overflow-x-auto"><table className="table-x">
            <thead><tr><th>Receipt</th><th>Date</th><th>Student</th><th>Class</th><th>For</th><th>Mode</th><th>Amount</th><th>By</th><th></th></tr></thead>
            <tbody>{data.items.map((p) => <tr key={p.id}><td className="font-mono text-xs">{p.receiptNo}</td><td className="text-xs">{fmtDateTime(p.paidAt)}</td><td className="font-medium">{fullName(p.student)}</td><td>{p.student.grade?.name}-{p.student.section?.name}</td><td>{p.invoice.title}</td><td><Badge>{p.method}</Badge></td><td className="font-semibold">{money(p.amount)}</td><td className="text-xs">{p.collectedBy}</td><td><Link to={`/app/fees/receipt/${p.id}`} className="btn-ghost btn-sm"><Printer size={14} /></Link></td></tr>)}</tbody>
          </table></div>
        )}
        {data && <Pagination page={page} pageSize={25} total={data.total} onPage={setPage} />}
      </Card>
    </div>
  );
}

export function ReceiptView({ r }) {
  return (
    <div className="print-area mx-auto max-w-2xl rounded-2xl border bg-white p-8 shadow-soft">
      <div className="flex items-center gap-4 border-b-2 border-dashed pb-5">
        <img src={r.school.logoUrl} alt="" className="h-16 w-16" />
        <div className="flex-1"><h2 className="font-display text-2xl font-bold text-navy-900">{r.school.name}</h2><p className="text-xs text-slate-500">{r.school.address}, {r.school.city} • {r.school.phone} • {r.school.email}</p></div>
        <div className="text-right"><div className="badge bg-emerald-100 text-emerald-700"><CheckCircle2 size={12} /> PAID</div><div className="mt-1 text-xs text-slate-500">Fee Receipt</div></div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-slate-500">Receipt no:</span> <b>{r.receiptNo}</b></div><div className="text-right"><span className="text-slate-500">Date:</span> <b>{fmtDateTime(r.paidAt)}</b></div>
        <div><span className="text-slate-500">Student:</span> <b>{fullName(r.student)}</b></div><div className="text-right"><span className="text-slate-500">Adm. no:</span> <b>{r.student.admissionNo}</b></div>
        <div><span className="text-slate-500">Class:</span> <b>{r.student.grade?.name}-{r.student.section?.name}</b></div><div className="text-right"><span className="text-slate-500">Father:</span> <b>{r.student.fatherName}</b></div>
      </div>
      <table className="mt-5 w-full text-sm">
        <thead><tr className="border-y bg-slate-50"><th className="p-2 text-left">Particulars ({r.invoice.title})</th><th className="p-2 text-right">Amount</th></tr></thead>
        <tbody>
          {r.invoice.items.map((x, k) => <tr key={k} className="border-b"><td className="p-2">{x.name}</td><td className="p-2 text-right">{money(x.amount)}</td></tr>)}
          {r.invoice.discount > 0 && <tr className="border-b text-emerald-700"><td className="p-2">Concession</td><td className="p-2 text-right">− {money(r.invoice.discount)}</td></tr>}
          {r.invoice.fine > 0 && <tr className="border-b text-rose-700"><td className="p-2">Late fine</td><td className="p-2 text-right">{money(r.invoice.fine)}</td></tr>}
          <tr className="border-b"><td className="p-2 text-slate-500">Invoice total</td><td className="p-2 text-right">{money(r.invoice.total)}</td></tr>
          <tr className="bg-navy-50 font-bold"><td className="p-2">Amount received ({r.method}{r.reference ? ` • ${r.reference}` : ''})</td><td className="p-2 text-right text-lg">{money(r.amount)}</td></tr>
        </tbody>
      </table>
      <p className="mt-3 text-sm italic text-slate-600">{amountInWords(r.amount)}</p>
      <p className="mt-1 text-xs text-slate-500">Balance on this invoice after payment: {money(Math.max(0, r.invoice.total - r.invoice.paid))}</p>
      <div className="mt-10 flex items-end justify-between text-xs text-slate-500"><span>Collected by: {r.collectedBy}</span><span className="border-t px-8 pt-1">Authorised signatory</span></div>
      <p className="mt-6 text-center text-[10px] text-slate-400">Computer-generated receipt • RnY EduSuite • Powered by RnY Groups</p>
    </div>
  );
}

export function Receipt() {
  const { id } = useParams();
  const { user } = useAuth();
  const portal = ['PARENT', 'STUDENT'].includes(user?.role);
  const { data, loading, error } = useFetch(portal ? `/portal/receipt/${id}` : `/fees/receipt/${id}`);
  if (error) return <ErrorBox error={error} />;
  if (loading || !data) return <Spinner />;
  return (
    <div>
      <div className="no-print mb-4 flex justify-end gap-2"><button className="btn-outline" onClick={() => history.back()}>Back</button><button className="btn-primary" onClick={() => window.print()}><Printer size={16} /> Print / Save PDF</button></div>
      <ReceiptView r={data} />
    </div>
  );
}

export function Accounts() {
  const [range, setRange] = useState({ from: isoDay(new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1)), to: isoDay() });
  const { data, loading } = useFetch('/fees/accounts', range);
  return (
    <div className="space-y-6">
      <PageHeader title="Income vs Expense" icon={PieIcon} actions={<><input type="date" className="input w-40" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /><input type="date" className="input w-40" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></>} />
      {loading || !data ? <Spinner /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Fee income" value={compactMoney(data.totalIncome)} icon={TrendingUp} color="emerald" />
            <Stat label="Expenses" value={compactMoney(data.totalExpense)} icon={TrendingDown} color="rose" />
            <Stat label="Net surplus" value={compactMoney(data.net)} icon={Wallet} color={data.net >= 0 ? 'navy' : 'amber'} />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="Monthly" className="lg:col-span-2"><div className="h-80"><ResponsiveContainer><BarChart data={data.monthly}><CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" /><XAxis dataKey="label" /><YAxis tickFormatter={compactMoney} width={70} /><Tooltip formatter={(v) => money(v)} /><Legend /><Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} /><Bar dataKey="expense" name="Expense" fill="#c8102e" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
            <Card title="Expenses by category"><div className="space-y-3">{data.byCategory.map((c) => { const pct = data.totalExpense ? (c.amount / data.totalExpense) * 100 : 0; return <div key={c.category}><div className="flex justify-between text-sm"><span>{c.category}</span><b>{compactMoney(c.amount)}</b></div><div className="mt-1 h-2 rounded-full bg-slate-100"><motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full rounded-full bg-gradient-to-r from-brand-500 to-gold-500" /></div></div>; })}</div></Card>
          </div>
        </>
      )}
    </div>
  );
}
