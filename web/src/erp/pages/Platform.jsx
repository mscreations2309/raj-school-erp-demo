import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { School, Building2, Users, IndianRupee, Plus, LogIn, Loader2, Receipt, CheckCircle2, TrendingUp, KeyRound, Globe, Ban, Play } from 'lucide-react';
import { api, errMsg } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { compactMoney, fmtDate, money, num, pretty } from '../../lib/format';
import { PageHeader, Card, Spinner, Empty, useFetch, Badge, Stat, Modal, Field, Pagination, ErrorBox } from '../components/ui';

export function PlatformHome() {
  const { data: d, loading } = useFetch('/platform/stats');
  if (loading || !d) return <Spinner />;
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-navy-950 via-navy-900 to-brand-900 p-8 text-white">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-gold-400/20 blur-3xl" />
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold-300">RnY Groups</p>
        <h1 className="mt-2 text-3xl font-bold">EduSuite SaaS Control Center</h1>
        <p className="mt-2 text-white/70">Manage every school on the platform — onboarding, plans, billing and support.</p>
        <Link to="/platform/schools?new=1" className="btn-primary mt-6"><Plus size={16} /> Onboard a new school</Link>
      </motion.div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Schools" value={d.schools} icon={School} color="navy" sub={Object.entries(d.byStatus).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(' • ')} />
        <Stat label="Students on platform" value={num(d.students)} icon={Users} color="emerald" sub={`${num(d.staff)} staff • ${num(d.users)} logins`} />
        <Stat label="ARR" value={compactMoney(d.arr)} icon={TrendingUp} color="brand" sub={`MRR ${compactMoney(d.mrr)}`} />
        <Stat label="Outstanding invoices" value={compactMoney(d.outstanding)} icon={Receipt} color="amber" sub={`${d.outstandingCount} unpaid • collected ${compactMoney(d.collected)}`} />
      </div>
      <Card title="Recently onboarded" pad={false}>
        <table className="table-x"><thead><tr><th>School</th><th>Slug / URL</th><th>Plan</th><th>Status</th><th>Since</th></tr></thead>
          <tbody>{d.recent.map((s) => <tr key={s.id}><td className="font-medium"><Link to={`/platform/schools/${s.id}`} className="hover:text-brand-600">{s.name}</Link></td><td className="font-mono text-xs">{s.slug}</td><td>{s.plan?.name}</td><td><Badge status={s.status} /></td><td>{fmtDate(s.createdAt)}</td></tr>)}</tbody></table>
      </Card>
    </div>
  );
}

const EMPTY = { name: '', slug: '', board: 'CBSE', city: '', state: 'Uttar Pradesh', phone: '', email: '', affiliationNo: '', planCode: 'GROWTH', status: 'TRIAL', adminName: '', adminEmail: '', adminPassword: '', adminPhone: '' };

export function PlatformSchools() {
  const nav = useNavigate();
  const { actAsSchool } = useAuth();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const { data, loading, reload } = useFetch('/platform/schools', { page, q: q || undefined });
  const { data: plans } = useFetch('/platform/plans');
  const [open, setOpen] = useState(() => new URLSearchParams(location.search).get('new') === '1');
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { const { data: r } = await api.post('/platform/schools', f); toast.success(`${r.school.name} is live!`); setOpen(false); setF(EMPTY); reload(); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };
  const enter = async (s) => { await actAsSchool(s.id); nav('/app'); };
  return (
    <div>
      <PageHeader title="Schools (Tenants)" subtitle="Each school has isolated data, its own website and its own ERP" icon={School} actions={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Onboard school</button>} />
      <Card pad={false}>
        <div className="border-b p-4"><input className="input" placeholder="Search schools…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {loading && !data ? <Spinner /> : !data?.items.length ? <Empty /> : (
          <div className="overflow-x-auto"><table className="table-x">
            <thead><tr><th>School</th><th>City</th><th>Plan</th><th>Students</th><th>Staff</th><th>Logins</th><th>Status</th><th></th></tr></thead>
            <tbody>{data.items.map((s) => (
              <tr key={s.id}>
                <td><Link to={`/platform/schools/${s.id}`} className="flex items-center gap-3"><img src={s.logoUrl || '/favicon.png'} alt="" className="h-9 w-9 rounded-lg border object-contain" /><div><div className="font-semibold hover:text-brand-600">{s.name}</div><div className="font-mono text-xs text-slate-400">{s.slug}</div></div></Link></td>
                <td>{s.city}</td><td>{s.plan?.name}</td><td>{s._count.students}</td><td>{s._count.staff}</td><td>{s._count.users}</td><td><Badge status={s.status} /></td>
                <td className="whitespace-nowrap"><button className="btn-outline btn-sm" onClick={() => enter(s)}><LogIn size={13} /> Open ERP</button> <a className="btn-ghost btn-sm" href={`/?school=${s.slug}`} target="_blank" rel="noreferrer"><Globe size={13} /></a></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        {data && <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Onboard a new school" size="lg">
        <form onSubmit={submit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="School name *"><input className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: f.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })} /></Field>
            <Field label="Slug (subdomain) *" hint={`${f.slug || 'school'}.rnyedusuite.in`}><input className="input" required value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase() })} /></Field>
            <Field label="Board"><select className="input" value={f.board} onChange={(e) => setF({ ...f, board: e.target.value })}>{['CBSE', 'ICSE', 'UP Board', 'State Board', 'IB'].map((b) => <option key={b}>{b}</option>)}</select></Field>
            <Field label="Affiliation no."><input className="input" value={f.affiliationNo} onChange={(e) => setF({ ...f, affiliationNo: e.target.value })} /></Field>
            <Field label="City"><input className="input" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
            <Field label="State"><input className="input" value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} /></Field>
            <Field label="Phone"><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
            <Field label="Email"><input type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <Field label="Plan"><select className="input" value={f.planCode} onChange={(e) => setF({ ...f, planCode: e.target.value })}>{(plans?.items || []).map((p) => <option key={p.id} value={p.code}>{p.name} — {money(p.priceYearly)}/yr</option>)}</select></Field>
            <Field label="Status"><select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="TRIAL">30-day trial</option><option value="ACTIVE">Active (paid)</option></select></Field>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="mb-3 font-semibold text-navy-900">School administrator login</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name *"><input className="input" required value={f.adminName} onChange={(e) => setF({ ...f, adminName: e.target.value })} /></Field>
              <Field label="Mobile"><input className="input" value={f.adminPhone} onChange={(e) => setF({ ...f, adminPhone: e.target.value })} /></Field>
              <Field label="Email *"><input type="email" className="input" required value={f.adminEmail} onChange={(e) => setF({ ...f, adminEmail: e.target.value })} /></Field>
              <Field label="Password *"><input className="input" required minLength={6} value={f.adminPassword} onChange={(e) => setF({ ...f, adminPassword: e.target.value })} /></Field>
            </div>
          </div>
          <p className="text-xs text-slate-500">The school is provisioned instantly with an academic session, classes Play Group – XII (sections A & B), 18 subjects, fee heads and a starter website.</p>
          <ErrorBox error={err} />
          <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />} Create school</button></div>
        </form>
      </Modal>
    </div>
  );
}

export function PlatformSchoolDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { actAsSchool } = useAuth();
  const { data: s, loading, reload, error } = useFetch(`/platform/schools/${id}`);
  const { data: plans } = useFetch('/platform/plans');
  const [sub, setSub] = useState(null);
  const [pwd, setPwd] = useState('');
  if (error) return <ErrorBox error={error} />;
  if (loading || !s) return <Spinner />;
  const setStatus = async (status) => { try { await api.put(`/platform/schools/${id}`, { status }); toast.success(`School ${status.toLowerCase()}`); reload(); } catch (e) { toast.error(errMsg(e)); } };
  const subscribe = async () => { try { await api.post(`/platform/schools/${id}/subscribe`, sub); toast.success('Subscription created & invoice raised'); setSub(null); reload(); } catch (e) { toast.error(errMsg(e)); } };
  const resetPwd = async () => { try { const { data } = await api.post(`/platform/schools/${id}/reset-admin-password`, { password: pwd }); toast.success(`Password reset for ${data.email}`); setPwd(''); } catch (e) { toast.error(errMsg(e)); } };
  const markPaid = async (inv) => { await api.post(`/platform/invoices/${inv}/mark-paid`); toast.success('Marked paid'); reload(); };
  return (
    <div className="space-y-6">
      <PageHeader title={s.name} subtitle={`${s.slug} • ${s.city || ''} • ${s.board}`} icon={School} actions={<>
        <button className="btn-outline" onClick={async () => { await actAsSchool(s.id); nav('/app'); }}><LogIn size={16} /> Open ERP as admin</button>
        {s.status === 'SUSPENDED' ? <button className="btn-success" onClick={() => setStatus('ACTIVE')}><Play size={16} /> Reactivate</button> : <button className="btn-danger" onClick={() => setStatus('SUSPENDED')}><Ban size={16} /> Suspend</button>}
      </>} />
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Status" value={<Badge status={s.status} />} icon={CheckCircle2} color="navy" sub={s.trialEndsAt && `Trial ends ${fmtDate(s.trialEndsAt)}`} />
        <Stat label="Plan" value={s.plan?.name || '—'} icon={Building2} color="brand" />
        <Stat label="Students" value={s._count.students} icon={Users} color="emerald" sub={`${s._count.staff} staff • ${s._count.users} logins`} />
        <Stat label="Fee receipts" value={num(s._count.feePayments)} icon={IndianRupee} color="amber" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Subscriptions" actions={<button className="btn-primary btn-sm" onClick={() => setSub({ planId: s.planId || plans?.items[0]?.id, billingCycle: 'YEARLY' })}><Plus size={14} /> New / renew</button>} pad={false}>
          <table className="table-x"><thead><tr><th>Plan</th><th>Cycle</th><th>Amount</th><th>Period</th><th>Status</th></tr></thead><tbody>{s.subscriptions.map((x) => <tr key={x.id}><td>{x.plan.name}</td><td>{x.billingCycle}</td><td>{money(x.amount)}</td><td className="text-xs">{fmtDate(x.startDate)} → {fmtDate(x.endDate)}</td><td><Badge status={x.status} /></td></tr>)}</tbody></table>
        </Card>
        <Card title="SaaS invoices" pad={false}>
          {!s.saasInvoices.length ? <Empty /> : <table className="table-x"><thead><tr><th>Invoice</th><th>Amount</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>{s.saasInvoices.map((i) => <tr key={i.id}><td className="font-mono text-xs">{i.invoiceNo}</td><td>{money(i.amount)}</td><td>{fmtDate(i.dueDate)}</td><td><Badge status={i.status} /></td><td>{i.status === 'UNPAID' && <button className="btn-success btn-sm" onClick={() => markPaid(i.id)}>Mark paid</button>}</td></tr>)}</tbody></table>}
        </Card>
        <Card title="School admins">
          {s.users.map((u) => <div key={u.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0"><div><b>{u.name}</b><div className="text-xs text-slate-500">{u.email} • {pretty(u.role)}</div></div><span className="text-xs text-slate-400">Last login {fmtDate(u.lastLoginAt)}</span></div>)}
          <div className="mt-4 flex gap-2"><input className="input" placeholder="New admin password" value={pwd} onChange={(e) => setPwd(e.target.value)} /><button className="btn-outline" disabled={pwd.length < 6} onClick={resetPwd}><KeyRound size={15} /> Reset</button></div>
        </Card>
        <Card title="Website">
          <div className="space-y-2 text-sm"><div>Public site: <a className="text-brand-600 underline" href={`/?school=${s.slug}`} target="_blank" rel="noreferrer">/?school={s.slug}</a></div><div>Subdomain: <b>{s.slug}.rnyedusuite.in</b></div><div>Custom domain: <b>{s.customDomain || 'not set'}</b></div></div>
        </Card>
      </div>
      <Modal open={!!sub} onClose={() => setSub(null)} title="Create / renew subscription" size="sm" footer={<><button className="btn-outline" onClick={() => setSub(null)}>Cancel</button><button className="btn-primary" onClick={subscribe}>Create & invoice</button></>}>
        {sub && <div className="space-y-4"><Field label="Plan"><select className="input" value={sub.planId} onChange={(e) => setSub({ ...sub, planId: e.target.value })}>{(plans?.items || []).map((p) => <option key={p.id} value={p.id}>{p.name} — {money(p.priceMonthly)}/mo • {money(p.priceYearly)}/yr</option>)}</select></Field><Field label="Billing"><select className="input" value={sub.billingCycle} onChange={(e) => setSub({ ...sub, billingCycle: e.target.value })}><option value="YEARLY">Yearly</option><option value="MONTHLY">Monthly</option></select></Field></div>}
      </Modal>
    </div>
  );
}

const MODULES = ['students', 'staff', 'academics', 'attendance', 'exams', 'fees', 'accounts', 'payroll', 'admissions', 'communication', 'homework', 'transport', 'hostel', 'library', 'inventory', 'website', 'reports'];
export function PlatformPlans() {
  const { data, loading, reload } = useFetch('/platform/plans');
  const [edit, setEdit] = useState(null);
  const save = async () => {
    try { const body = { ...edit, modules: edit.modules }; if (edit.id) await api.put(`/platform/plans/${edit.id}`, body); else await api.post('/platform/plans', body); toast.success('Plan saved'); setEdit(null); reload(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div>
      <PageHeader title="Plans & Pricing" subtitle="Modules included in each plan are enforced across the API and UI" icon={Building2} actions={<button className="btn-primary" onClick={() => setEdit({ code: '', name: '', priceMonthly: 0, priceYearly: 0, maxStudents: 500, maxStaff: 50, modules: ['students', 'staff', 'academics', 'attendance', 'fees', 'website'], isActive: true })}><Plus size={16} /> New plan</button>} />
      {loading ? <Spinner /> : (
        <div className="grid gap-6 lg:grid-cols-3">
          {data.items.map((p, k) => { const mods = JSON.parse(p.modules || '[]'); return (
            <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.08 }} className={`card relative overflow-hidden p-6 ${k === 1 ? 'ring-2 ring-brand-500' : ''}`}>
              {k === 1 && <span className="absolute right-4 top-4 badge bg-brand-600 text-white">Popular</span>}
              <h3 className="text-xl font-bold text-navy-900">{p.name}</h3><p className="text-sm text-slate-500">{p.description}</p>
              <div className="mt-4"><span className="text-3xl font-bold">{money(p.priceYearly)}</span><span className="text-slate-500">/year</span></div><div className="text-sm text-slate-500">or {money(p.priceMonthly)}/month</div>
              <div className="mt-3 text-sm">Up to <b>{num(p.maxStudents)}</b> students • <b>{p.maxStaff}</b> staff</div>
              <div className="mt-4 flex flex-wrap gap-1.5">{mods.map((m) => <span key={m} className="badge bg-slate-100 text-slate-600">{m}</span>)}</div>
              <div className="mt-5 flex items-center justify-between border-t pt-4 text-sm"><span>{p._count.schools} school(s)</span><button className="btn-outline btn-sm" onClick={() => setEdit({ ...p, modules: mods })}>Edit</button></div>
            </motion.div>
          ); })}
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? `Edit ${edit.name}` : 'New plan'} size="lg" footer={<><button className="btn-outline" onClick={() => setEdit(null)}>Cancel</button><button className="btn-primary" onClick={save}>Save plan</button></>}>
        {edit && <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">{[['code', 'Code'], ['name', 'Name'], ['description', 'Description'], ['priceMonthly', 'Price / month', 'number'], ['priceYearly', 'Price / year', 'number'], ['maxStudents', 'Max students', 'number']].map(([k, l, t]) => <Field key={k} label={l}><input type={t || 'text'} className="input" value={edit[k] ?? ''} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></Field>)}</div>
          <Field label="Modules included"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{MODULES.map((m) => <label key={m} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><input type="checkbox" className="accent-brand-600" checked={edit.modules.includes(m)} onChange={(e) => setEdit({ ...edit, modules: e.target.checked ? [...edit.modules, m] : edit.modules.filter((x) => x !== m) })} />{m}</label>)}</div></Field>
        </div>}
      </Modal>
    </div>
  );
}

export function PlatformBilling() {
  const { data, loading, reload } = useFetch('/platform/invoices');
  const markPaid = async (id) => { await api.post(`/platform/invoices/${id}/mark-paid`); toast.success('Marked paid'); reload(); };
  return (
    <div>
      <PageHeader title="Billing" subtitle="Subscription invoices raised to schools" icon={Receipt} />
      <Card pad={false}>
        {loading ? <Spinner /> : !data?.items.length ? <Empty text="No invoices yet — create a subscription from a school's page" /> : (
          <table className="table-x"><thead><tr><th>Invoice</th><th>School</th><th>Period</th><th>Amount</th><th>Due</th><th>Status</th><th></th></tr></thead>
            <tbody>{data.items.map((i) => <tr key={i.id}><td className="font-mono text-xs">{i.invoiceNo}</td><td>{i.school.name}</td><td className="text-xs">{i.period}</td><td className="font-semibold">{money(i.amount)}</td><td>{fmtDate(i.dueDate)}</td><td><Badge status={i.status} /></td><td>{i.status === 'UNPAID' && <button className="btn-success btn-sm" onClick={() => markPaid(i.id)}>Mark paid</button>}</td></tr>)}</tbody></table>
        )}
      </Card>
    </div>
  );
}
