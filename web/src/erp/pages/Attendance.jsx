import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { ClipboardCheck, Save, Loader2, CheckCheck, Briefcase, CalendarRange } from 'lucide-react';
import { api, errMsg } from '../../lib/api';
import { isoDay, fullName } from '../../lib/format';
import { PageHeader, Card, Spinner, Empty, useFetch, Field, Avatar, ErrorBox } from '../components/ui';
import { SectionSelect } from './Students';

const ST = [
  ['PRESENT', 'P', 'bg-emerald-500'], ['ABSENT', 'A', 'bg-rose-500'], ['LATE', 'L', 'bg-amber-500'], ['HALF_DAY', 'H', 'bg-sky-500'], ['LEAVE', 'Lv', 'bg-violet-500'],
];
const COLOR = Object.fromEntries(ST.map(([k, , c]) => [k, c]));
const SHORT = Object.fromEntries(ST.map(([k, s]) => [k, s]));

function StatusPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {ST.map(([k, s, c]) => (
        <button key={k} type="button" onClick={() => onChange(k)} title={k} className={`relative h-9 w-10 rounded-lg text-xs font-bold transition ${value === k ? `${c} text-white shadow` : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
          {value === k && <motion.span layoutId={undefined} initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="absolute inset-0 rounded-lg ring-2 ring-white/40" />}
          {s}
        </button>
      ))}
    </div>
  );
}

export function MarkAttendance() {
  const [sectionId, setSection] = useState('');
  const [date, setDate] = useState(isoDay());
  const { data, loading, error } = useFetch(sectionId ? '/attendance/students' : null, { sectionId, date });
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setRows(data.students.map((s) => ({ ...s, status: s.status || 'PRESENT' }))); }, [data]);
  const setAll = (st) => setRows(rows.map((r) => ({ ...r, status: st })));
  const save = async () => {
    setBusy(true);
    try { const { data: r } = await api.post('/attendance/students', { sectionId, date, records: rows.map((x) => ({ studentId: x.id, status: x.status, remarks: x.remarks })) }); toast.success(`Attendance saved for ${r.saved} students`); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const counts = ST.map(([k, s, c]) => [k, s, c, rows.filter((r) => r.status === k).length]);
  return (
    <div>
      <PageHeader title="Mark Attendance" subtitle="Tap a status for each student, then save" icon={ClipboardCheck} />
      <Card>
        <div className="grid gap-4 md:grid-cols-[1fr_200px_auto]">
          <Field label="Class & section"><SectionSelect value={sectionId} onChange={setSection} /></Field>
          <Field label="Date"><input type="date" className="input" value={date} max={isoDay()} onChange={(e) => setDate(e.target.value)} /></Field>
          <div className="flex items-end gap-2"><button className="btn-outline" disabled={!rows.length} onClick={() => setAll('PRESENT')}><CheckCheck size={16} /> All present</button></div>
        </div>
      </Card>
      {!sectionId ? <Card className="mt-6"><Empty text="Select a class to begin" icon={ClipboardCheck} /></Card> : loading ? <Spinner /> : error ? <ErrorBox error={error} /> : (
        <div className="mt-6 space-y-4">
          {data?.holiday && <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">📅 {data.holiday.title} — this date is marked as a holiday in the calendar.</div>}
          {data?.marked && <div className="rounded-xl bg-sky-50 p-3 text-sm text-sky-800">Attendance already marked for this date — you are editing it.</div>}
          <div className="flex flex-wrap gap-2">{counts.map(([k, s, c, n]) => <span key={k} className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm shadow-sm"><span className={`h-2.5 w-2.5 rounded-full ${c}`} />{k.replace('_', ' ')}: <b>{n}</b></span>)}</div>
          <Card pad={false}>
            {!rows.length ? <Empty text="No students in this section" /> : (
              <div className="divide-y">
                {rows.map((r, k) => (
                  <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: k * 0.015 }} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center">
                    <div className="flex flex-1 items-center gap-3"><span className="w-8 text-sm text-slate-400">{r.rollNo}</span><Avatar name={fullName(r)} src={r.photoUrl} size={34} /><div><div className="font-medium">{fullName(r)}</div><div className="text-xs text-slate-400">{r.admissionNo}</div></div></div>
                    <StatusPicker value={r.status} onChange={(st) => setRows(rows.map((x) => (x.id === r.id ? { ...x, status: st } : x)))} />
                    <input className="input sm:w-48" placeholder="Remarks" value={r.remarks || ''} onChange={(e) => setRows(rows.map((x) => (x.id === r.id ? { ...x, remarks: e.target.value } : x)))} />
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
          {rows.length > 0 && <div className="sticky bottom-4 flex justify-end"><button className="btn-primary px-8 py-3 shadow-glow" disabled={busy} onClick={save}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save attendance</button></div>}
        </div>
      )}
    </div>
  );
}

export function AttendanceReport() {
  const [sectionId, setSection] = useState('');
  const [month, setMonth] = useState(isoDay().slice(0, 7));
  const { data, loading } = useFetch(sectionId ? '/attendance/students/report' : null, { sectionId, month });
  return (
    <div>
      <PageHeader title="Monthly Attendance Register" icon={CalendarRange} />
      <Card><div className="grid gap-4 md:grid-cols-[1fr_200px]"><Field label="Class & section"><SectionSelect value={sectionId} onChange={setSection} /></Field><Field label="Month"><input type="month" className="input" value={month} onChange={(e) => setMonth(e.target.value)} /></Field></div></Card>
      {!sectionId ? <Card className="mt-6"><Empty text="Select a class" /></Card> : loading ? <Spinner /> : data && <Register data={data} />}
    </div>
  );
}

function Register({ data, nameKey = (r) => `${r.rollNo ?? ''}. ${fullName(r)}` }) {
  const days = Array.from({ length: data.days }, (_, i) => i + 1);
  return (
    <Card className="mt-6" pad={false}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="bg-slate-50"><th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left">Name</th>{days.map((d) => <th key={d} className="w-7 px-0.5 py-2 text-center font-medium text-slate-500">{d}</th>)}<th className="px-3">%</th></tr></thead>
          <tbody>{data.rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-1.5 font-medium">{nameKey(r)}</td>
              {days.map((d) => <td key={d} className="px-0.5 py-1 text-center">{r.days[d] ? <span className={`inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold text-white ${COLOR[r.days[d]]}`}>{SHORT[r.days[d]]}</span> : <span className="text-slate-200">·</span>}</td>)}
              <td className={`px-3 text-center font-bold ${r.percent == null ? 'text-slate-300' : r.percent < 75 ? 'text-rose-600' : 'text-emerald-600'}`}>{r.percent ?? (r.present != null && r.absent != null ? `${r.present}/${r.present + r.absent + r.leave}` : '—')}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-3 border-t p-4 text-xs">{ST.map(([k, s, c]) => <span key={k} className="flex items-center gap-1.5"><span className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white ${c}`}>{s}</span>{k.replace('_', ' ')}</span>)}<span className="ml-auto text-rose-600">Below 75% shown in red</span></div>
    </Card>
  );
}

export function StaffAttendance() {
  const [date, setDate] = useState(isoDay());
  const [month, setMonth] = useState(isoDay().slice(0, 7));
  const { data, loading } = useFetch('/attendance/staff', { date });
  const { data: report } = useFetch('/attendance/staff/report', { month });
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setRows(data.staff.map((s) => ({ ...s, status: s.status || 'PRESENT', inTime: s.inTime || '08:00', outTime: s.outTime || '14:30' }))); }, [data]);
  const save = async () => {
    setBusy(true);
    try { await api.post('/attendance/staff', { date, records: rows.map((r) => ({ staffId: r.id, status: r.status, inTime: r.inTime, outTime: r.outTime })) }); toast.success('Staff attendance saved'); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-6">
      <PageHeader title="Staff Attendance" icon={Briefcase} actions={<><input type="date" className="input w-44" value={date} max={isoDay()} onChange={(e) => setDate(e.target.value)} /><button className="btn-primary" disabled={busy} onClick={save}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save</button></>} />
      {loading ? <Spinner /> : (
        <Card pad={false}>
          <div className="divide-y">{rows.map((r) => (
            <div key={r.id} className="flex flex-col gap-3 px-5 py-3 lg:flex-row lg:items-center">
              <div className="flex flex-1 items-center gap-3"><Avatar name={fullName(r)} size={34} /><div><div className="font-medium">{fullName(r)}</div><div className="text-xs text-slate-400">{r.employeeId} • {r.designation}</div></div></div>
              <StatusPicker value={r.status} onChange={(st) => setRows(rows.map((x) => (x.id === r.id ? { ...x, status: st } : x)))} />
              <div className="flex gap-2"><input type="time" className="input w-28" value={r.inTime} onChange={(e) => setRows(rows.map((x) => (x.id === r.id ? { ...x, inTime: e.target.value } : x)))} /><input type="time" className="input w-28" value={r.outTime} onChange={(e) => setRows(rows.map((x) => (x.id === r.id ? { ...x, outTime: e.target.value } : x)))} /></div>
            </div>
          ))}</div>
        </Card>
      )}
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-navy-900">Monthly register</h2><input type="month" className="input w-44" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
      {report && <Register data={report} nameKey={(r) => fullName(r)} />}
    </div>
  );
}
