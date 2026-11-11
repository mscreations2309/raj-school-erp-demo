import { useState } from 'react';
import toast from 'react-hot-toast';
import { Briefcase, KeyRound, CalendarDays, Check, X, Wallet, Printer, Loader2, Plus, UserCog, Download } from 'lucide-react';
import ResourcePage from '../components/ResourcePage';
import { api, errMsg, download } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDate, money, fullName, isoDay, amountInWords, pretty } from '../../lib/format';
import { PageHeader, Card, Spinner, Empty, useFetch, Field, Badge, Stat, Modal, ErrorBox } from '../components/ui';

const ADMIN = ['SCHOOL_ADMIN', 'PRINCIPAL'];
const LOGIN_ROLES = ['TEACHER', 'PRINCIPAL', 'ACCOUNTANT', 'RECEPTIONIST', 'LIBRARIAN', 'SCHOOL_ADMIN'];

export function Staff() {
  const [loginFor, setLoginFor] = useState(null);
  const [role, setRole] = useState('TEACHER');
  const [result, setResult] = useState(null);
  const create = async () => {
    try { setResult((await api.post(`/staff/${loginFor.id}/login`, { role })).data); toast.success('Login ready'); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <>
      <ResourcePage title="Staff Directory" icon={Briefcase} endpoint="/staff" writeRoles={ADMIN}
        headerActions={<button className="btn-outline" onClick={() => download('/staff/export', 'staff.csv')}><Download size={16} /> Full CSV</button>}
        filters={[{ name: 'staffType', label: 'Type', options: ['TEACHING', 'NON_TEACHING'] }, { name: 'status', label: 'Status', options: ['ACTIVE', 'ON_LEAVE', 'RESIGNED'] }]}
        columns={[{ key: 'employeeId', label: 'Emp ID', className: 'font-mono text-xs' }, { label: 'Name', render: (s) => <div><div className="font-semibold">{fullName(s)}</div><div className="text-xs text-slate-400">{s.qualification}</div></div> }, { key: 'designation', label: 'Designation' }, { key: 'department', label: 'Department' }, { key: 'phone', label: 'Phone' }, { key: 'joiningDate', label: 'Joined', type: 'date' }, { label: 'Login', render: (s) => (s.user ? <Badge status="ACTIVE">{pretty(s.user.role)}</Badge> : <span className="text-xs text-slate-400">No login</span>) }, { key: 'status', label: 'Status', type: 'status' }]}
        fields={[
          { name: 'firstName', label: 'First name', required: true }, { name: 'lastName', label: 'Last name' }, { name: 'gender', label: 'Gender', type: 'select', options: ['MALE', 'FEMALE', 'OTHER'] }, { name: 'dob', label: 'Date of birth', type: 'date' },
          { name: 'designation', label: 'Designation', required: true }, { name: 'department', label: 'Department' }, { name: 'staffType', label: 'Type', type: 'select', options: ['TEACHING', 'NON_TEACHING'] }, { name: 'qualification', label: 'Qualification' },
          { name: 'phone', label: 'Mobile' }, { name: 'email', label: 'Email' }, { name: 'joiningDate', label: 'Joining date', type: 'date' }, { name: 'experience', label: 'Experience (yrs)', type: 'number' },
          { name: 'basicSalary', label: 'Basic salary (₹)', type: 'number' }, { name: 'allowances', label: 'Allowances (₹)', type: 'number' }, { name: 'deductions', label: 'Deductions (PF/TDS ₹)', type: 'number' }, { name: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'ON_LEAVE', 'RESIGNED'] },
          { name: 'bankAccount', label: 'Bank account' }, { name: 'ifsc', label: 'IFSC' }, { name: 'pan', label: 'PAN' }, { name: 'employeeId', label: 'Employee ID (auto if blank)' },
          { name: 'address', label: 'Address', type: 'textarea' },
        ]}
        rowActions={(s) => <button className="btn-outline btn-sm" onClick={() => { setLoginFor(s); setRole(s.user?.role || (s.staffType === 'TEACHING' ? 'TEACHER' : 'RECEPTIONIST')); setResult(null); }}><KeyRound size={13} /> Login</button>} />
      <Modal open={!!loginFor} onClose={() => setLoginFor(null)} title={`ERP login — ${loginFor && fullName(loginFor)}`} size="sm" footer={!result && <><button className="btn-outline" onClick={() => setLoginFor(null)}>Cancel</button><button className="btn-primary" onClick={create}>{loginFor?.user ? 'Reset password' : 'Create login'}</button></>}>
        {result ? <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">Login: <b>{result.email}</b>{result.phone && <> or <b>{result.phone}</b></>}<br />Password: <b>{result.password}</b><br />Role: <b>{pretty(result.role)}</b></div> : (
          <Field label="Role"><select className="input" value={role} onChange={(e) => setRole(e.target.value)}>{LOGIN_ROLES.map((r) => <option key={r} value={r}>{pretty(r)}</option>)}</select></Field>
        )}
      </Modal>
    </>
  );
}

export function Users() {
  return (
    <ResourcePage title="User Logins" subtitle="Everyone who can sign in to the ERP. Deleting a login blocks sign-in immediately (restorable from Recycle Bin)." icon={UserCog} endpoint="/users" writeRoles={ADMIN}
      filters={[{ name: 'role', label: 'Role', options: ['SCHOOL_ADMIN', 'PRINCIPAL', 'TEACHER', 'ACCOUNTANT', 'RECEPTIONIST', 'LIBRARIAN', 'PARENT', 'STUDENT'] }]}
      columns={[{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Mobile' }, { key: 'role', label: 'Role', type: 'status' }, { key: 'lastLoginAt', label: 'Last login', type: 'date' }, { key: 'isActive', label: 'Active', type: 'bool' }]}
      fields={[{ name: 'name', label: 'Name', required: true }, { name: 'email', label: 'Email', required: true }, { name: 'phone', label: 'Mobile' }, { name: 'role', label: 'Role', type: 'select', options: LOGIN_ROLES, required: true }, { name: 'password', label: 'Password (set / reset)', inputType: 'password' }, { name: 'isActive', label: 'Active', type: 'bool', default: true }]} />
  );
}

export function Leaves() {
  const { is } = useAuth();
  const admin = is(...ADMIN);
  const [status, setStatus] = useState('');
  const { data, loading, reload } = useFetch('/leaves', { status: status || undefined });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ type: 'CASUAL', fromDate: isoDay(), toDate: isoDay(), reason: '' });
  const review = async (id, st) => { try { await api.put(`/leaves/${id}/review`, { status: st }); toast.success(`Leave ${st.toLowerCase()}`); reload(); } catch (e) { toast.error(errMsg(e)); } };
  const apply = async () => { try { await api.post('/leaves', f); toast.success('Leave request submitted'); setOpen(false); reload(); } catch (e) { toast.error(errMsg(e)); } };
  return (
    <div>
      <PageHeader title="Leave Requests" icon={CalendarDays} actions={<><select className="input w-40" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option><option>PENDING</option><option>APPROVED</option><option>REJECTED</option></select><button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Apply for leave</button></>} />
      <Card pad={false}>
        {loading ? <Spinner /> : !data?.items.length ? <Empty /> : (
          <div className="overflow-x-auto"><table className="table-x">
            <thead><tr><th>Applicant</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th>{admin && <th></th>}</tr></thead>
            <tbody>{data.items.map((l) => (
              <tr key={l.id}>
                <td><div className="font-medium">{l.staff ? fullName(l.staff) : fullName(l.student)}</div><div className="text-xs text-slate-400">{l.staff ? l.staff.designation : `Student • ${l.student?.admissionNo}`}</div></td>
                <td><Badge>{l.type}</Badge></td><td>{fmtDate(l.fromDate)}</td><td>{fmtDate(l.toDate)}</td><td>{Math.round((new Date(l.toDate) - new Date(l.fromDate)) / 864e5) + 1}</td><td className="max-w-xs truncate">{l.reason}</td><td><Badge status={l.status} /></td>
                {admin && <td className="whitespace-nowrap">{l.status === 'PENDING' && <><button className="btn-success btn-sm" onClick={() => review(l.id, 'APPROVED')}><Check size={14} /></button> <button className="btn-danger btn-sm" onClick={() => review(l.id, 'REJECTED')}><X size={14} /></button></>}</td>}
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Apply for leave" size="sm" footer={<><button className="btn-outline" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" onClick={apply}>Submit</button></>}>
        <div className="space-y-4">
          <Field label="Type"><select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{['CASUAL', 'SICK', 'EARNED', 'OTHER'].map((t) => <option key={t}>{t}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="From"><input type="date" className="input" value={f.fromDate} onChange={(e) => setF({ ...f, fromDate: e.target.value })} /></Field><Field label="To"><input type="date" className="input" value={f.toDate} onChange={(e) => setF({ ...f, toDate: e.target.value })} /></Field></div>
          <Field label="Reason"><textarea className="input" rows={3} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

export function Payroll() {
  const [month, setMonth] = useState(isoDay(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)).slice(0, 7));
  const { data, loading, reload } = useFetch('/payroll', { month });
  const [busy, setBusy] = useState('');
  const [slip, setSlip] = useState(null);
  const run = async (url, body, msg) => {
    setBusy(url);
    try { await api.post(url, body); toast.success(msg); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(''); }
  };
  return (
    <div className="space-y-6">
      <PageHeader title="Payroll" subtitle="Salary is calculated from staff master; unpaid absences are deducted automatically" icon={Wallet} actions={<>
        <input type="month" className="input w-44" value={month} onChange={(e) => setMonth(e.target.value)} />
        <button className="btn-outline" disabled={!!busy} onClick={() => run('/payroll/generate', { month }, 'Payslips generated')}>{busy === '/payroll/generate' && <Loader2 size={16} className="animate-spin" />} Generate payslips</button>
        <button className="btn-primary" disabled={!!busy || !data?.items.some((p) => p.status !== 'PAID')} onClick={() => run('/payroll/pay-all', { month }, 'All salaries marked paid')}>Pay all</button>
      </>} />
      {loading || !data ? <Spinner /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Stat label="Gross" value={money(data.totals.gross)} color="navy" icon={Wallet} />
            <Stat label="Deductions" value={money(data.totals.deductions)} color="rose" icon={Wallet} />
            <Stat label="Net payable" value={money(data.totals.net)} color="brand" icon={Wallet} />
            <Stat label="Paid" value={money(data.totals.paid)} color="emerald" icon={Check} />
          </div>
          <Card pad={false}>
            {!data.items.length ? <Empty text="No payslips for this month — click Generate payslips" /> : (
              <div className="overflow-x-auto"><table className="table-x">
                <thead><tr><th>Employee</th><th>Basic</th><th>Allowances</th><th>Deductions</th><th>Absence cut</th><th>Net</th><th>Status</th><th></th></tr></thead>
                <tbody>{data.items.map((p) => (
                  <tr key={p.id}><td><div className="font-medium">{fullName(p.staff)}</div><div className="text-xs text-slate-400">{p.staff.employeeId} • {p.staff.designation}</div></td><td>{money(p.basic)}</td><td>{money(p.allowances)}</td><td>{money(p.deductions)}</td><td className={p.leaveDeduction ? 'text-rose-600' : ''}>{money(p.leaveDeduction)}</td><td className="font-bold">{money(p.net)}</td><td><Badge status={p.status} /></td>
                    <td className="whitespace-nowrap">{p.status !== 'PAID' && <button className="btn-success btn-sm" onClick={() => run(`/payroll/${p.id}/pay`, {}, 'Marked paid')}>Pay</button>} <button className="btn-ghost btn-sm" onClick={async () => setSlip((await api.get(`/payroll/${p.id}`)).data)}><Printer size={14} /></button></td></tr>
                ))}</tbody>
              </table></div>
            )}
          </Card>
        </>
      )}
      <Modal open={!!slip} onClose={() => setSlip(null)} title="Payslip" size="lg" footer={<button className="btn-primary" onClick={() => window.print()}><Printer size={16} /> Print</button>}>
        {slip && (
          <div className="print-area rounded-xl border p-6">
            <div className="flex items-center gap-4 border-b pb-4"><img src={slip.school.logoUrl} alt="" className="h-14 w-14" /><div><h2 className="text-xl font-bold text-navy-900">{slip.school.name}</h2><p className="text-sm text-slate-500">Salary slip for {new Date(`${slip.month}-01`).toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</p></div></div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm"><div>Employee: <b>{fullName(slip.staff)}</b></div><div>Emp ID: <b>{slip.staff.employeeId}</b></div><div>Designation: <b>{slip.staff.designation}</b></div><div>Bank A/c: <b>{slip.staff.bankAccount || '—'}</b> ({slip.staff.ifsc})</div><div>PAN: <b>{slip.staff.pan || '—'}</b></div><div>Status: <b>{slip.status}</b> {slip.paidAt && `on ${fmtDate(slip.paidAt)}`}</div></div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <table className="w-full border"><thead className="bg-slate-50"><tr><th className="p-2 text-left">Earnings</th><th className="p-2 text-right">₹</th></tr></thead><tbody><tr className="border-t"><td className="p-2">Basic</td><td className="p-2 text-right">{money(slip.basic)}</td></tr><tr className="border-t"><td className="p-2">Allowances</td><td className="p-2 text-right">{money(slip.allowances)}</td></tr></tbody></table>
              <table className="w-full border"><thead className="bg-slate-50"><tr><th className="p-2 text-left">Deductions</th><th className="p-2 text-right">₹</th></tr></thead><tbody><tr className="border-t"><td className="p-2">PF / TDS / Other</td><td className="p-2 text-right">{money(slip.deductions)}</td></tr><tr className="border-t"><td className="p-2">Unpaid absence</td><td className="p-2 text-right">{money(slip.leaveDeduction)}</td></tr></tbody></table>
            </div>
            <div className="mt-4 rounded-lg bg-navy-50 p-3 text-right font-bold">Net pay: {money(slip.net)}<div className="text-xs font-normal italic text-slate-600">{amountInWords(slip.net)}</div></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
