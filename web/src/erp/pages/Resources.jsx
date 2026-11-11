// Module pages built on the generic ResourcePage.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { GraduationCap, BookOpen, Users, CalendarDays, CalendarClock, BookMarked, ListChecks, Tags, Layers, Percent, Receipt, UserPlus, Megaphone, NotebookPen, Bus, Truck, BedDouble, KeyRound, Library, Boxes, FileText, Image, Globe, Star, Phone, ShieldCheck, Award, Sparkles, LayoutTemplate, ArrowDownUp, Plus } from 'lucide-react';
import ResourcePage from '../components/ResourcePage';
import { Badge, Modal, Field, Card, useFetch } from '../components/ui';
import { api, errMsg } from '../../lib/api';
import { fmtDate, money, fullName, pretty } from '../../lib/format';

const ADMIN = ['SCHOOL_ADMIN', 'PRINCIPAL'];
const ACC = [...ADMIN, 'ACCOUNTANT'];
const FRONT = [...ADMIN, 'RECEPTIONIST'];
const gradeOpt = { url: '/grades', map: (g) => [g.id, g.name] };
const sectionOpt = { url: '/sections', map: (s) => [s.id, `${s.grade.name} - ${s.name}`] };
const subjectOpt = { url: '/subjects', map: (s) => [s.id, s.name] };
const staffOpt = { url: '/staff', map: (s) => [s.id, `${s.firstName} ${s.lastName || ''} (${s.designation})`] };
const yearOpt = { url: '/academic-years', map: (y) => [y.id, y.name] };
const studentOpt = { url: '/students', map: (s) => [s.id, `${fullName(s)} • ${s.admissionNo} • ${s.grade?.name}-${s.section?.name}`] };

// ── Academics
export const Classes = () => (
  <div className="space-y-8">
    <ResourcePage title="Classes" icon={GraduationCap} endpoint="/grades" writeRoles={ADMIN} pageSize={50}
      columns={[{ key: 'order', label: '#' }, { key: 'name', label: 'Class' }, { label: 'Sections', render: (g) => g.sections.map((s) => s.name).join(', ') }, { label: 'Students', render: (g) => g._count.students }]}
      fields={[{ name: 'name', label: 'Class name', required: true }, { name: 'order', label: 'Display order', type: 'number' }]} />
    <ResourcePage title="Sections" icon={Layers} endpoint="/sections" writeRoles={ADMIN} pageSize={50} filters={[{ name: 'gradeId', label: 'Class', optionsFrom: gradeOpt }]} searchable={false}
      columns={[{ label: 'Class', render: (s) => s.grade.name }, { key: 'name', label: 'Section' }, { key: 'room', label: 'Room' }, { key: 'capacity', label: 'Capacity' }, { label: 'Students', render: (s) => s._count.students }, { label: 'Class teacher', render: (s) => (s.classTeacher ? fullName(s.classTeacher) : '—') }]}
      fields={[{ name: 'gradeId', label: 'Class', type: 'select', optionsFrom: gradeOpt, required: true }, { name: 'name', label: 'Section name', required: true }, { name: 'room', label: 'Room' }, { name: 'capacity', label: 'Capacity', type: 'number' }, { name: 'classTeacherId', label: 'Class teacher', type: 'select', optionsFrom: staffOpt }]} />
  </div>
);

export const Subjects = () => (
  <ResourcePage title="Subjects" icon={BookOpen} endpoint="/subjects" writeRoles={ADMIN} pageSize={50}
    columns={[{ key: 'name', label: 'Subject' }, { key: 'code', label: 'Code' }, { key: 'type', label: 'Type', type: 'status' }]}
    fields={[{ name: 'name', label: 'Name', required: true }, { name: 'code', label: 'Code' }, { name: 'type', label: 'Type', type: 'select', options: ['THEORY', 'PRACTICAL', 'ACTIVITY'] }]} />
);

export const SectionSubjects = () => (
  <ResourcePage title="Subject Teachers" subtitle="Assign subjects and teachers to every section" icon={Users} endpoint="/section-subjects" writeRoles={ADMIN} pageSize={50} searchable={false}
    filters={[{ name: 'sectionId', label: 'Section', optionsFrom: sectionOpt }, { name: 'teacherId', label: 'Teacher', optionsFrom: staffOpt }]}
    columns={[{ label: 'Class', render: (r) => `${r.section.grade.name}-${r.section.name}` }, { label: 'Subject', render: (r) => r.subject.name }, { label: 'Teacher', render: (r) => (r.teacher ? fullName(r.teacher) : <Badge status="PENDING">Not assigned</Badge>) }]}
    fields={[{ name: 'sectionId', label: 'Section', type: 'select', optionsFrom: sectionOpt, required: true }, { name: 'subjectId', label: 'Subject', type: 'select', optionsFrom: subjectOpt, required: true }, { name: 'teacherId', label: 'Teacher', type: 'select', optionsFrom: staffOpt }]} />
);

export const AcademicYears = () => (
  <ResourcePage title="Academic Years" icon={CalendarClock} endpoint="/academic-years" writeRoles={ADMIN} searchable={false}
    columns={[{ key: 'name', label: 'Session' }, { key: 'startDate', label: 'Start', type: 'date' }, { key: 'endDate', label: 'End', type: 'date' }, { key: 'isCurrent', label: 'Current', type: 'bool' }]}
    fields={[{ name: 'name', label: 'Name (e.g. 2027-28)', required: true }, { name: 'startDate', label: 'Start date', type: 'date', required: true }, { name: 'endDate', label: 'End date', type: 'date', required: true }, { name: 'isCurrent', label: 'Current session', type: 'bool' }]} />
);

export const Events = () => (
  <ResourcePage title="Academic Calendar" subtitle="Events, holidays, exams and PTMs — public ones appear on the website" icon={CalendarDays} endpoint="/events" writeRoles={FRONT} filters={[{ name: 'type', label: 'Type', options: ['EVENT', 'HOLIDAY', 'EXAM', 'PTM', 'ACTIVITY'] }]}
    columns={[{ key: 'title', label: 'Title' }, { key: 'titleHi', label: 'Title (Hindi)' }, { key: 'type', label: 'Type', type: 'status' }, { key: 'startDate', label: 'From', type: 'date' }, { key: 'endDate', label: 'To', type: 'date' }, { key: 'isPublic', label: 'On website', type: 'bool' }]}
    fields={[{ name: 'title', label: 'Title', required: true }, { name: 'titleHi', label: 'Title (Hindi)' }, { name: 'type', label: 'Type', type: 'select', options: ['EVENT', 'HOLIDAY', 'EXAM', 'PTM', 'ACTIVITY'], required: true }, { name: 'startDate', label: 'Start date', type: 'date', required: true }, { name: 'endDate', label: 'End date', type: 'date' }, { name: 'isPublic', label: 'Show on website', type: 'bool', default: true }, { name: 'description', label: 'Description', type: 'textarea' }]} />
);

// ── Exams
export const Exams = () => (
  <ResourcePage title="Exams" icon={BookMarked} endpoint="/exams" writeRoles={ADMIN} searchable={false}
    columns={[{ key: 'name', label: 'Exam' }, { key: 'type', label: 'Type', type: 'status' }, { label: 'Session', render: (e) => e.academicYear?.name }, { key: 'startDate', label: 'Start', type: 'date' }, { key: 'endDate', label: 'End', type: 'date' }, { label: 'Results', render: (e) => (e.isPublished ? <Badge status="PAID">Published</Badge> : <Badge status="PENDING">Draft</Badge>) }]}
    fields={[{ name: 'name', label: 'Exam name', required: true }, { name: 'type', label: 'Type', type: 'select', options: ['UNIT_TEST', 'TERM', 'HALF_YEARLY', 'ANNUAL', 'PRE_BOARD'] }, { name: 'academicYearId', label: 'Session', type: 'select', optionsFrom: yearOpt, required: true }, { name: 'startDate', label: 'Start date', type: 'date', required: true }, { name: 'endDate', label: 'End date', type: 'date', required: true }, { name: 'isPublished', label: 'Publish results to parents', type: 'bool' }]}
    rowActions={(e, reload) => <button className="btn-ghost btn-sm" onClick={async () => { await api.put(`/exams/${e.id}`, { isPublished: !e.isPublished }); toast.success(e.isPublished ? 'Unpublished' : 'Results published to parent portal'); reload(); }}>{e.isPublished ? 'Unpublish' : 'Publish'}</button>} />
);

export const ExamSchedules = () => (
  <ResourcePage title="Exam Schedule" icon={ListChecks} endpoint="/exam-schedules" writeRoles={ADMIN} searchable={false} pageSize={50}
    filters={[{ name: 'examId', label: 'Exam', optionsFrom: { url: '/exams', map: (e) => [e.id, e.name] } }, { name: 'gradeId', label: 'Class', optionsFrom: gradeOpt }]}
    columns={[{ label: 'Exam', render: (r) => r.exam.name }, { label: 'Class', render: (r) => r.grade.name }, { label: 'Subject', render: (r) => r.subject.name }, { key: 'date', label: 'Date', type: 'date' }, { key: 'startTime', label: 'Time' }, { key: 'maxMarks', label: 'Max' }, { key: 'passMarks', label: 'Pass' }]}
    fields={[{ name: 'examId', label: 'Exam', type: 'select', optionsFrom: { url: '/exams', map: (e) => [e.id, e.name] }, required: true }, { name: 'gradeId', label: 'Class', type: 'select', optionsFrom: gradeOpt, required: true }, { name: 'subjectId', label: 'Subject', type: 'select', optionsFrom: subjectOpt, required: true }, { name: 'date', label: 'Date', type: 'date', required: true }, { name: 'startTime', label: 'Start time', type: 'time' }, { name: 'maxMarks', label: 'Max marks', type: 'number', default: 100 }, { name: 'passMarks', label: 'Pass marks', type: 'number', default: 33 }]} />
);

// ── Fees setup
export const FeeHeads = () => (
  <ResourcePage title="Fee Heads" icon={Tags} endpoint="/fee-heads" writeRoles={ACC} searchable={false}
    columns={[{ key: 'name', label: 'Fee head' }, { key: 'frequency', label: 'Frequency', type: 'status' }, { key: 'isOptional', label: 'Optional', type: 'bool' }, { key: 'description', label: 'Description' }]}
    fields={[{ name: 'name', label: 'Name', required: true }, { name: 'frequency', label: 'Frequency', type: 'select', options: ['MONTHLY', 'QUARTERLY', 'ANNUAL', 'ONE_TIME'], required: true }, { name: 'isOptional', label: 'Optional (transport/hostel)', type: 'bool' }, { name: 'description', label: 'Description', type: 'textarea' }]} />
);

export const FeeStructure = () => (
  <ResourcePage title="Fee Structure" subtitle="Amount per fee head per class for each session" icon={Layers} endpoint="/fee-structures" writeRoles={ACC} searchable={false} pageSize={100}
    filters={[{ name: 'gradeId', label: 'Class', optionsFrom: gradeOpt }, { name: 'academicYearId', label: 'Session', optionsFrom: yearOpt }]}
    columns={[{ label: 'Session', render: (r) => r.academicYear.name }, { label: 'Class', render: (r) => r.grade.name }, { label: 'Fee head', render: (r) => r.feeHead.name }, { label: 'Frequency', render: (r) => <Badge>{pretty(r.feeHead.frequency)}</Badge> }, { key: 'amount', label: 'Amount', type: 'money' }]}
    fields={[{ name: 'academicYearId', label: 'Session', type: 'select', optionsFrom: yearOpt, required: true }, { name: 'gradeId', label: 'Class', type: 'select', optionsFrom: gradeOpt, required: true }, { name: 'feeHeadId', label: 'Fee head', type: 'select', optionsFrom: { url: '/fee-heads', map: (h) => [h.id, h.name] }, required: true }, { name: 'amount', label: 'Amount (₹)', type: 'number', required: true }]} />
);

export const Concessions = () => (
  <ResourcePage title="Concessions & Scholarships" icon={Percent} endpoint="/concessions" writeRoles={ACC} searchable={false}
    columns={[{ label: 'Student', render: (c) => <Link to={`/app/students/${c.studentId}`} className="font-medium hover:text-brand-600">{fullName(c.student)}</Link> }, { label: 'Class', render: (c) => `${c.student.grade?.name}-${c.student.section?.name}` }, { label: 'On', render: (c) => c.feeHead?.name || 'All fees' }, { label: 'Value', render: (c) => (c.type === 'PERCENT' ? `${c.value}%` : money(c.value)) }, { key: 'reason', label: 'Reason' }, { key: 'isActive', label: 'Active', type: 'bool' }]}
    fields={[{ name: 'studentId', label: 'Student', type: 'select', optionsFrom: studentOpt, required: true, full: true }, { name: 'feeHeadId', label: 'Fee head (blank = all)', type: 'select', optionsFrom: { url: '/fee-heads', map: (h) => [h.id, h.name] } }, { name: 'type', label: 'Type', type: 'select', options: ['PERCENT', 'FLAT'], required: true }, { name: 'value', label: 'Value', type: 'number', required: true }, { name: 'reason', label: 'Reason' }, { name: 'isActive', label: 'Active', type: 'bool', default: true }]} />
);

export const Expenses = () => (
  <ResourcePage title="Expenses" icon={Receipt} endpoint="/expenses" writeRoles={ACC} filters={[{ name: 'method', label: 'Mode', options: ['CASH', 'UPI', 'CHEQUE', 'BANK_TRANSFER'] }]}
    columns={[{ key: 'date', label: 'Date', type: 'date' }, { key: 'category', label: 'Category' }, { key: 'paidTo', label: 'Paid to' }, { key: 'description', label: 'Description' }, { key: 'method', label: 'Mode', type: 'status' }, { key: 'amount', label: 'Amount', type: 'money' }, { key: 'billUrl', label: 'Bill', render: (e) => (e.billUrl ? <a href={e.billUrl} target="_blank" rel="noreferrer" className="text-brand-600 underline">View</a> : '—') }]}
    fields={[{ name: 'date', label: 'Date', type: 'date', required: true }, { name: 'category', label: 'Category', type: 'select', options: ['Electricity', 'Maintenance & Repairs', 'Stationery & Printing', 'Transport Fuel', 'Events & Functions', 'Internet & Software', 'Housekeeping', 'Hostel Mess', 'Sports Equipment', 'Salaries', 'Other'], required: true }, { name: 'amount', label: 'Amount (₹)', type: 'number', required: true }, { name: 'method', label: 'Mode', type: 'select', options: ['CASH', 'UPI', 'CHEQUE', 'BANK_TRANSFER'] }, { name: 'paidTo', label: 'Paid to' }, { name: 'description', label: 'Description', type: 'textarea' }, { name: 'billUrl', label: 'Bill / invoice', type: 'file' }]} />
);

// ── Admissions & communication
export const Enquiries = () => (
  <ResourcePage title="Admission Enquiries" icon={UserPlus} endpoint="/enquiries" writeRoles={FRONT}
    filters={[{ name: 'status', label: 'Status', options: ['NEW', 'CONTACTED', 'VISITED', 'CONVERTED', 'CLOSED'] }, { name: 'source', label: 'Source', options: ['WEBSITE', 'WALK_IN', 'PHONE', 'REFERRAL', 'SOCIAL'] }]}
    columns={[{ key: 'createdAt', label: 'Date', type: 'date' }, { key: 'name', label: 'Name' }, { key: 'phone', label: 'Phone', render: (e) => <a href={`tel:${e.phone}`} className="text-brand-600">{e.phone}</a> }, { key: 'gradeSought', label: 'Class' }, { key: 'source', label: 'Source', type: 'status' }, { key: 'message', label: 'Message', className: 'max-w-xs truncate' }, { key: 'followUpDate', label: 'Follow-up', type: 'date' }, { key: 'status', label: 'Status', type: 'status' }]}
    fields={[{ name: 'name', label: 'Name', required: true }, { name: 'phone', label: 'Phone', required: true }, { name: 'email', label: 'Email' }, { name: 'gradeSought', label: 'Class sought' }, { name: 'source', label: 'Source', type: 'select', options: ['WEBSITE', 'WALK_IN', 'PHONE', 'REFERRAL', 'SOCIAL'] }, { name: 'status', label: 'Status', type: 'select', options: ['NEW', 'CONTACTED', 'VISITED', 'CONVERTED', 'CLOSED'] }, { name: 'followUpDate', label: 'Follow-up date', type: 'date' }, { name: 'message', label: 'Message', type: 'textarea' }, { name: 'notes', label: 'Internal notes', type: 'textarea' }]} />
);

export const Notices = () => (
  <ResourcePage title="Notices & Circulars" subtitle="Public notices show on the website; all show in parent portal" icon={Megaphone} endpoint="/notices" writeRoles={FRONT}
    filters={[{ name: 'category', label: 'Category', options: ['NOTICE', 'CIRCULAR', 'NEWS', 'ACHIEVEMENT'] }, { name: 'audience', label: 'Audience', options: ['ALL', 'PARENTS', 'STUDENTS', 'STAFF'] }]}
    columns={[{ key: 'publishDate', label: 'Date', type: 'date' }, { key: 'title', label: 'Title' }, { key: 'category', label: 'Category', type: 'status' }, { key: 'audience', label: 'Audience' }, { key: 'isPublic', label: 'Website', type: 'bool' }, { key: 'isPinned', label: 'Pinned', type: 'bool' }]}
    fields={[{ name: 'title', label: 'Title (English)', required: true, full: true }, { name: 'titleHi', label: 'Title (Hindi)', full: true }, { name: 'body', label: 'Content (English)', type: 'textarea', required: true }, { name: 'bodyHi', label: 'Content (Hindi)', type: 'textarea' }, { name: 'category', label: 'Category', type: 'select', options: ['NOTICE', 'CIRCULAR', 'NEWS', 'ACHIEVEMENT'] }, { name: 'audience', label: 'Audience', type: 'select', options: ['ALL', 'PARENTS', 'STUDENTS', 'STAFF'] }, { name: 'publishDate', label: 'Publish date', type: 'date' }, { name: 'isPublic', label: 'Show on website', type: 'bool', default: true }, { name: 'isPinned', label: 'Pin to top', type: 'bool' }, { name: 'attachmentUrl', label: 'Attachment', type: 'file' }]} />
);

export const Homework = () => (
  <ResourcePage title="Homework" icon={NotebookPen} endpoint="/homework" writeRoles={[...ADMIN, 'TEACHER']}
    filters={[{ name: 'sectionId', label: 'Section', optionsFrom: sectionOpt }, { name: 'subjectId', label: 'Subject', optionsFrom: subjectOpt }]}
    columns={[{ key: 'assignedDate', label: 'Assigned', type: 'date' }, { label: 'Class', render: (h) => `${h.section.grade.name}-${h.section.name}` }, { label: 'Subject', render: (h) => h.subject.name }, { key: 'title', label: 'Title' }, { key: 'dueDate', label: 'Due', type: 'date' }, { label: 'Teacher', render: (h) => (h.teacher ? fullName(h.teacher) : '—') }]}
    fields={[{ name: 'sectionId', label: 'Section', type: 'select', optionsFrom: sectionOpt, required: true }, { name: 'subjectId', label: 'Subject', type: 'select', optionsFrom: subjectOpt, required: true }, { name: 'title', label: 'Title', required: true, full: true }, { name: 'description', label: 'Description', type: 'textarea' }, { name: 'dueDate', label: 'Due date', type: 'date', required: true }, { name: 'attachmentUrl', label: 'Attachment', type: 'file' }]} />
);

export const TCs = () => (
  <ResourcePage title="Transfer Certificates" subtitle="Issued TCs are verifiable on the public website" icon={FileText} endpoint="/tcs" writeRoles={FRONT}
    columns={[{ key: 'tcNo', label: 'TC No.' }, { key: 'studentName', label: 'Student' }, { key: 'fatherName', label: 'Father' }, { key: 'admissionNo', label: 'Adm. No' }, { key: 'className', label: 'Class' }, { key: 'leavingDate', label: 'Leaving', type: 'date' }, { key: 'issueDate', label: 'Issued', type: 'date' }, { key: 'conduct', label: 'Conduct' }]}
    fields={[{ name: 'tcNo', label: 'TC number', required: true }, { name: 'studentName', label: 'Student name', required: true }, { name: 'fatherName', label: "Father's name" }, { name: 'admissionNo', label: 'Admission no.' }, { name: 'className', label: 'Class' }, { name: 'dob', label: 'Date of birth', type: 'date' }, { name: 'leavingDate', label: 'Leaving date', type: 'date' }, { name: 'issueDate', label: 'Issue date', type: 'date' }, { name: 'reason', label: 'Reason' }, { name: 'conduct', label: 'Conduct' }, { name: 'fileUrl', label: 'Scanned TC (PDF)', type: 'file' }]} />
);

// ── Transport
export const Vehicles = () => (
  <ResourcePage title="Vehicles" icon={Truck} endpoint="/vehicles" writeRoles={ADMIN}
    columns={[{ key: 'number', label: 'Number' }, { key: 'model', label: 'Model' }, { key: 'capacity', label: 'Seats' }, { key: 'driverName', label: 'Driver' }, { key: 'driverPhone', label: 'Driver phone' }, { key: 'insuranceExp', label: 'Insurance till', type: 'date' }, { key: 'fitnessExp', label: 'Fitness till', type: 'date' }]}
    fields={[{ name: 'number', label: 'Registration no.', required: true }, { name: 'model', label: 'Model' }, { name: 'capacity', label: 'Seating capacity', type: 'number' }, { name: 'driverName', label: 'Driver name' }, { name: 'driverPhone', label: 'Driver phone' }, { name: 'helperName', label: 'Attendant' }, { name: 'insuranceExp', label: 'Insurance expiry', type: 'date' }, { name: 'fitnessExp', label: 'Fitness expiry', type: 'date' }]} />
);

export function RoutesPage() {
  const [stopsFor, setStopsFor] = useState(null);
  return (
    <>
      <ResourcePage title="Transport Routes" icon={Bus} endpoint="/routes" writeRoles={ADMIN}
        columns={[{ key: 'name', label: 'Route' }, { label: 'Vehicle', render: (r) => r.vehicle ? `${r.vehicle.number} • ${r.vehicle.driverName || ''}` : '—' }, { key: 'monthlyFee', label: 'Monthly fee', type: 'money' }, { label: 'Stops', render: (r) => r.stops.map((s) => s.name).join(' → ') }, { label: 'Students', render: (r) => r.stops.reduce((a, s) => a + s._count.students, 0) }]}
        fields={[{ name: 'name', label: 'Route name', required: true, full: true }, { name: 'vehicleId', label: 'Vehicle', type: 'select', optionsFrom: { url: '/vehicles', map: (v) => [v.id, v.number] } }, { name: 'monthlyFee', label: 'Monthly fee (₹)', type: 'number' }]}
        rowActions={(r) => <button className="btn-outline btn-sm" onClick={() => setStopsFor(r)}>Stops</button>} />
      <Modal open={!!stopsFor} onClose={() => setStopsFor(null)} title={`Stops — ${stopsFor?.name}`} size="lg">
        {stopsFor && <ResourcePage title="Stops" endpoint="/route-stops" writeRoles={ADMIN} defaultParams={{ routeId: stopsFor.id }} searchable={false}
          columns={[{ key: 'order', label: '#' }, { key: 'name', label: 'Stop' }, { key: 'pickupTime', label: 'Pickup' }, { key: 'dropTime', label: 'Drop' }, { label: 'Students', render: (s) => s._count.students }]}
          fields={[{ name: 'routeId', label: 'Route', type: 'select', options: [[stopsFor.id, stopsFor.name]], default: stopsFor.id, required: true }, { name: 'name', label: 'Stop name', required: true }, { name: 'order', label: 'Order', type: 'number' }, { name: 'pickupTime', label: 'Pickup time', type: 'time' }, { name: 'dropTime', label: 'Drop time', type: 'time' }]} />}
      </Modal>
    </>
  );
}

// ── Hostel
export function Hostels() {
  const [roomsFor, setRoomsFor] = useState(null);
  return (
    <>
      <ResourcePage title="Hostels" icon={BedDouble} endpoint="/hostels" writeRoles={ADMIN} searchable={false}
        columns={[{ key: 'name', label: 'Hostel' }, { key: 'type', label: 'Type', type: 'status' }, { key: 'wardenName', label: 'Warden' }, { key: 'wardenPhone', label: 'Phone' }, { label: 'Rooms', render: (h) => h.rooms.length }, { label: 'Occupancy', render: (h) => { const cap = h.rooms.reduce((a, r) => a + r.capacity, 0); const occ = h.rooms.reduce((a, r) => a + r._count.allocations, 0); return <span><b>{occ}</b>/{cap} beds</span>; } }]}
        fields={[{ name: 'name', label: 'Name', required: true }, { name: 'type', label: 'Type', type: 'select', options: ['BOYS', 'GIRLS'], required: true }, { name: 'wardenName', label: 'Warden name' }, { name: 'wardenPhone', label: 'Warden phone' }, { name: 'address', label: 'Location' }]}
        rowActions={(h) => <button className="btn-outline btn-sm" onClick={() => setRoomsFor(h)}>Rooms</button>} />
      <Modal open={!!roomsFor} onClose={() => setRoomsFor(null)} title={`Rooms — ${roomsFor?.name}`} size="xl">
        {roomsFor && <ResourcePage title="Rooms" endpoint="/hostel-rooms" writeRoles={ADMIN} defaultParams={{ hostelId: roomsFor.id }} searchable={false} pageSize={50}
          columns={[{ key: 'roomNo', label: 'Room' }, { key: 'floor', label: 'Floor' }, { key: 'capacity', label: 'Beds' }, { key: 'monthlyFee', label: 'Fee / month', type: 'money' }, { label: 'Occupants', render: (r) => r.allocations.map((a) => `${a.student.firstName} (${a.student.grade?.name})`).join(', ') || '—' }]}
          fields={[{ name: 'hostelId', label: 'Hostel', type: 'select', options: [[roomsFor.id, roomsFor.name]], default: roomsFor.id, required: true }, { name: 'roomNo', label: 'Room no.', required: true }, { name: 'floor', label: 'Floor', type: 'number' }, { name: 'capacity', label: 'Beds', type: 'number' }, { name: 'monthlyFee', label: 'Monthly fee', type: 'number' }]} />}
      </Modal>
    </>
  );
}

export const HostelAllocations = () => (
  <ResourcePage title="Hostel Allocations" icon={KeyRound} endpoint="/hostel-allocations" writeRoles={ADMIN} searchable={false} filters={[{ name: 'isActive', label: 'Active', options: [['true', 'Active'], ['false', 'Vacated']] }]}
    columns={[{ label: 'Student', render: (a) => <Link to={`/app/students/${a.studentId}`} className="font-medium hover:text-brand-600">{fullName(a.student)}</Link> }, { label: 'Class', render: (a) => `${a.student.grade?.name}-${a.student.section?.name}` }, { label: 'Hostel', render: (a) => a.room.hostel.name }, { label: 'Room', render: (a) => a.room.roomNo }, { key: 'fromDate', label: 'From', type: 'date' }, { key: 'toDate', label: 'To', type: 'date' }, { key: 'isActive', label: 'Active', type: 'bool' }]}
    fields={[{ name: 'studentId', label: 'Student', type: 'select', optionsFrom: studentOpt, required: true, full: true }, { name: 'roomId', label: 'Room', type: 'select', optionsFrom: { url: '/hostel-rooms', map: (r) => [r.id, `${r.hostel.name} • ${r.roomNo} (${r.allocations.length}/${r.capacity})`] }, required: true }, { name: 'fromDate', label: 'From', type: 'date' }, { name: 'toDate', label: 'To (when vacating)', type: 'date' }, { name: 'isActive', label: 'Active', type: 'bool', default: true }]} />
);

// ── Library catalogue & inventory
export const Books = () => (
  <ResourcePage title="Book Catalogue" icon={Library} endpoint="/books" writeRoles={[...ADMIN, 'LIBRARIAN']}
    columns={[{ key: 'title', label: 'Title' }, { key: 'author', label: 'Author' }, { key: 'category', label: 'Category' }, { key: 'isbn', label: 'ISBN' }, { key: 'rack', label: 'Rack' }, { label: 'Available', render: (b) => <span className={b.available ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>{b.available}/{b.copies}</span> }]}
    fields={[{ name: 'title', label: 'Title', required: true, full: true }, { name: 'author', label: 'Author' }, { name: 'publisher', label: 'Publisher' }, { name: 'isbn', label: 'ISBN' }, { name: 'category', label: 'Category' }, { name: 'rack', label: 'Rack / shelf' }, { name: 'copies', label: 'Total copies', type: 'number', default: 1 }]} />
);

export function Inventory() {
  const [txFor, setTxFor] = useState(null);
  const [tx, setTx] = useState({ type: 'IN', qty: 1, note: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const submit = async () => {
    try { await api.post(`/inventory/${txFor.id}/txns`, tx); toast.success('Stock updated'); setTxFor(null); setReloadKey((k) => k + 1); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <>
      <ResourcePage key={reloadKey} title="Inventory" icon={Boxes} endpoint="/inventory-items" writeRoles={ADMIN}
        columns={[{ key: 'name', label: 'Item' }, { key: 'category', label: 'Category' }, { key: 'location', label: 'Location' }, { label: 'Stock', render: (i) => <span className={i.quantity <= i.minQuantity ? 'font-bold text-rose-600' : 'font-semibold'}>{i.quantity} {i.unit}{i.quantity <= i.minQuantity && ' ⚠'}</span> }, { key: 'minQuantity', label: 'Reorder at' }, { key: 'unitPrice', label: 'Unit price', type: 'money' }, { label: 'Value', render: (i) => money(i.quantity * i.unitPrice) }]}
        fields={[{ name: 'name', label: 'Item name', required: true }, { name: 'category', label: 'Category' }, { name: 'unit', label: 'Unit', default: 'pcs' }, { name: 'quantity', label: 'Opening quantity', type: 'number' }, { name: 'minQuantity', label: 'Reorder level', type: 'number' }, { name: 'unitPrice', label: 'Unit price (₹)', type: 'number' }, { name: 'location', label: 'Location' }]}
        rowActions={(i) => <button className="btn-outline btn-sm" onClick={() => { setTxFor(i); setTx({ type: 'IN', qty: 1, note: '' }); }}><ArrowDownUp size={13} /> Stock</button>} />
      <Modal open={!!txFor} onClose={() => setTxFor(null)} title={`Stock movement — ${txFor?.name}`} size="sm" footer={<><button className="btn-outline" onClick={() => setTxFor(null)}>Cancel</button><button className="btn-primary" onClick={submit}>Save</button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">{['IN', 'OUT'].map((t) => <button key={t} onClick={() => setTx({ ...tx, type: t })} className={`rounded-xl border py-2.5 font-semibold ${tx.type === t ? (t === 'IN' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-rose-500 bg-rose-50 text-rose-700') : ''}`}>{t === 'IN' ? 'Stock in (purchase)' : 'Stock out (issue)'}</button>)}</div>
          <Field label="Quantity"><input type="number" min={1} className="input" value={tx.qty} onChange={(e) => setTx({ ...tx, qty: e.target.value })} /></Field>
          <Field label="Note"><input className="input" value={tx.note} onChange={(e) => setTx({ ...tx, note: e.target.value })} /></Field>
          <p className="text-xs text-slate-500">Current stock: {txFor?.quantity} {txFor?.unit}</p>
        </div>
      </Modal>
    </>
  );
}

// ── Website CMS
const order = { name: 'order', label: 'Display order', type: 'number' };
export const CmsBanners = () => (
  <ResourcePage title="Hero Banners" subtitle="Slides on the website home page" icon={Image} endpoint="/banners" writeRoles={ADMIN} searchable={false}
    columns={[{ key: 'imageUrl', label: 'Image', type: 'image' }, { key: 'titleEn', label: 'Title' }, { key: 'titleHi', label: 'Title (Hindi)' }, { key: 'order', label: 'Order' }, { key: 'isActive', label: 'Active', type: 'bool' }]}
    fields={[{ name: 'imageUrl', label: 'Image', type: 'image', required: true }, { name: 'titleEn', label: 'Title (English)' }, { name: 'titleHi', label: 'Title (Hindi)' }, { name: 'subtitleEn', label: 'Subtitle (English)' }, { name: 'subtitleHi', label: 'Subtitle (Hindi)' }, order, { name: 'isActive', label: 'Active', type: 'bool', default: true }]} />
);
export const CmsContent = () => (
  <ResourcePage title="Site Texts" subtitle="Every paragraph on the website in English and Hindi" icon={LayoutTemplate} endpoint="/site-content" writeRoles={ADMIN} pageSize={50}
    columns={[{ key: 'key', label: 'Key', className: 'font-mono text-xs' }, { key: 'valueEn', label: 'English', className: 'max-w-md truncate' }, { key: 'valueHi', label: 'Hindi', className: 'max-w-md truncate' }]}
    fields={[{ name: 'key', label: 'Key', required: true, full: true }, { name: 'valueEn', label: 'English', type: 'textarea', rows: 5, required: true }, { name: 'valueHi', label: 'Hindi', type: 'textarea', rows: 5 }]} />
);
export const CmsLeaders = () => (
  <ResourcePage title="Leadership" icon={Users} endpoint="/leaders" writeRoles={ADMIN} searchable={false}
    columns={[{ key: 'photoUrl', label: 'Photo', type: 'image' }, { key: 'name', label: 'Name' }, { key: 'role', label: 'Role' }, { key: 'quoteEn', label: 'Quote', className: 'max-w-sm truncate' }, { key: 'order', label: 'Order' }]}
    fields={[{ name: 'photoUrl', label: 'Photo', type: 'image' }, { name: 'name', label: 'Name', required: true }, { name: 'nameHi', label: 'Name (Hindi)' }, { name: 'role', label: 'Role', required: true }, { name: 'roleHi', label: 'Role (Hindi)' }, { name: 'quoteEn', label: 'Quote (English)', type: 'textarea' }, { name: 'quoteHi', label: 'Quote (Hindi)', type: 'textarea' }, { name: 'messageEn', label: 'Message (English)', type: 'textarea' }, { name: 'messageHi', label: 'Message (Hindi)', type: 'textarea' }, order]} />
);
export const CmsGallery = () => (
  <ResourcePage title="Gallery" icon={Image} endpoint="/gallery" writeRoles={ADMIN} filters={[{ name: 'category', label: 'Category', options: ['Achievements', 'Events', 'Campus', 'Labs', 'Sports', 'Activities'] }]}
    columns={[{ key: 'imageUrl', label: 'Image', type: 'image' }, { key: 'titleEn', label: 'Title' }, { key: 'titleHi', label: 'Title (Hindi)' }, { key: 'category', label: 'Category' }, { key: 'order', label: 'Order' }]}
    fields={[{ name: 'imageUrl', label: 'Image', type: 'image', required: true }, { name: 'titleEn', label: 'Title (English)', required: true }, { name: 'titleHi', label: 'Title (Hindi)' }, { name: 'category', label: 'Category', type: 'select', options: ['Achievements', 'Events', 'Campus', 'Labs', 'Sports', 'Activities'] }, order]} />
);
export const CmsStats = () => (
  <ResourcePage title="Highlights / Stats" subtitle="Animated counters on the home page" icon={Sparkles} endpoint="/stats" writeRoles={ADMIN} searchable={false}
    columns={[{ key: 'labelEn', label: 'Label' }, { key: 'labelHi', label: 'Label (Hindi)' }, { key: 'value', label: 'Value' }, { key: 'suffix', label: 'Suffix' }, { key: 'icon', label: 'Icon' }, { key: 'order', label: 'Order' }]}
    fields={[{ name: 'labelEn', label: 'Label (English)', required: true }, { name: 'labelHi', label: 'Label (Hindi)' }, { name: 'value', label: 'Value', type: 'number', required: true }, { name: 'suffix', label: 'Suffix (+, %, :1)' }, { name: 'icon', label: 'Icon', type: 'select', options: ['award', 'monitor', 'users', 'flask', 'sparkles', 'scale', 'languages', 'handshake', 'globe', 'heart', 'book', 'trophy'] }, order]} />
);
export const CmsFacilities = () => (
  <ResourcePage title="Facilities" icon={Building} endpoint="/facilities" writeRoles={ADMIN} searchable={false}
    columns={[{ key: 'imageUrl', label: 'Image', type: 'image' }, { key: 'titleEn', label: 'Title' }, { key: 'titleHi', label: 'Title (Hindi)' }, { key: 'order', label: 'Order' }]}
    fields={[{ name: 'imageUrl', label: 'Image', type: 'image' }, { name: 'titleEn', label: 'Title (English)', required: true }, { name: 'titleHi', label: 'Title (Hindi)' }, { name: 'descEn', label: 'Description (English)', type: 'textarea' }, { name: 'descHi', label: 'Description (Hindi)', type: 'textarea' }, { name: 'icon', label: 'Icon', type: 'select', options: ['monitor', 'atom', 'flask', 'cpu', 'trophy', 'dribbble', 'library', 'bed', 'bus', 'heart'] }, order]} />
);
function Building(props) { return <Globe {...props} />; }
export const CmsTestimonials = () => (
  <ResourcePage title="Testimonials" icon={Star} endpoint="/testimonials" writeRoles={ADMIN} searchable={false}
    columns={[{ key: 'name', label: 'Name' }, { key: 'relation', label: 'Relation' }, { key: 'textEn', label: 'Text', className: 'max-w-md truncate' }, { key: 'rating', label: 'Rating' }]}
    fields={[{ name: 'name', label: 'Name', required: true }, { name: 'relation', label: 'Relation (e.g. Parent of Class V)' }, { name: 'textEn', label: 'Text (English)', type: 'textarea', required: true }, { name: 'textHi', label: 'Text (Hindi)', type: 'textarea' }, { name: 'rating', label: 'Rating (1-5)', type: 'number', default: 5 }, order]} />
);
export const CmsContacts = () => (
  <ResourcePage title="Contact Directory" icon={Phone} endpoint="/contact-persons" writeRoles={ADMIN} searchable={false}
    columns={[{ key: 'purposeEn', label: 'Purpose' }, { key: 'purposeHi', label: 'Purpose (Hindi)' }, { key: 'officer', label: 'Officer' }, { key: 'phone', label: 'Mobile' }, { key: 'order', label: 'Order' }]}
    fields={[{ name: 'purposeEn', label: 'Purpose (English)', required: true }, { name: 'purposeHi', label: 'Purpose (Hindi)' }, { name: 'officer', label: 'Officer', required: true }, { name: 'phone', label: 'Mobile', required: true }, order]} />
);
export const CmsDisclosure = () => (
  <ResourcePage title="Mandatory Disclosure" subtitle="CBSE public disclosure — upload PDFs for documents" icon={ShieldCheck} endpoint="/disclosures" writeRoles={ADMIN} pageSize={100} filters={[{ name: 'section', label: 'Section', options: ['GENERAL', 'STAFF', 'INFRASTRUCTURE', 'DOCUMENTS'] }]}
    columns={[{ key: 'section', label: 'Section', type: 'status' }, { key: 'label', label: 'Item' }, { key: 'value', label: 'Value', className: 'max-w-xs truncate' }, { key: 'fileUrl', label: 'File', render: (d) => (d.fileUrl ? <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-brand-600 underline">PDF</a> : '—') }]}
    fields={[{ name: 'section', label: 'Section', type: 'select', options: ['GENERAL', 'STAFF', 'INFRASTRUCTURE', 'DOCUMENTS'], required: true }, { name: 'label', label: 'Label', required: true, full: true }, { name: 'value', label: 'Value' }, { name: 'fileUrl', label: 'Document (PDF)', type: 'file' }, order]} />
);
export const CmsResults = () => (
  <ResourcePage title="Board Results" icon={Award} endpoint="/board-results" writeRoles={ADMIN} searchable={false}
    columns={[{ key: 'className', label: 'Class' }, { key: 'year', label: 'Year' }, { key: 'registered', label: 'Registered' }, { key: 'passed', label: 'Passed' }, { key: 'percent', label: 'Pass %' }]}
    fields={[{ name: 'className', label: 'Class', type: 'select', options: ['X', 'XII'], required: true }, { name: 'year', label: 'Year', type: 'number', required: true }, { name: 'registered', label: 'Registered', type: 'number', required: true }, { name: 'passed', label: 'Passed', type: 'number', required: true }, { name: 'percent', label: 'Pass %', type: 'number', required: true }, { name: 'remarks', label: 'Remarks' }]} />
);
