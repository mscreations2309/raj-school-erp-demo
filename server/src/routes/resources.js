// Generic tenant-scoped CRUD endpoints for simple entities.
import { Router } from 'express';
import { crudRouter } from '../lib/crud.js';
import { prisma } from '../lib/prisma.js';
import { badRequest } from '../lib/http.js';
import { ADMINS, STAFF_ROLES, ALL_SCHOOL_ROLES } from '../lib/auth.js';

const r = Router();
const ACC = [...ADMINS, 'ACCOUNTANT'];
const FRONT = [...ADMINS, 'RECEPTIONIST'];
const LIB = [...ADMINS, 'LIBRARIAN'];
const TEACH = [...ADMINS, 'TEACHER'];

// ── Academics
r.use('/academic-years', crudRouter('AcademicYear', {
  module: 'academics', read: ALL_SCHOOL_ROLES, orderBy: { startDate: 'desc' },
  async afterSave(item) {
    if (item.isCurrent) await prisma.academicYear.updateMany({ where: { schoolId: item.schoolId, id: { not: item.id } }, data: { isCurrent: false } });
  },
}));
r.use('/grades', crudRouter('Grade', {
  module: 'academics', search: ['name'], orderBy: { order: 'asc' },
  include: { sections: { orderBy: { name: 'asc' } }, _count: { select: { students: true } } },
}));
r.use('/sections', crudRouter('Section', {
  module: 'academics', filters: ['gradeId'], orderBy: [{ grade: { order: 'asc' } }, { name: 'asc' }],
  include: { grade: true, classTeacher: true, _count: { select: { students: true } } },
}));
r.use('/subjects', crudRouter('Subject', { module: 'academics', search: ['name', 'code'], orderBy: { name: 'asc' } }));
r.use('/section-subjects', crudRouter('SectionSubject', {
  module: 'academics', filters: ['sectionId', 'teacherId'], orderBy: { id: 'asc' },
  include: { subject: true, teacher: true, section: { include: { grade: true } } },
}));
r.use('/events', crudRouter('Event', {
  read: ALL_SCHOOL_ROLES, write: FRONT, search: ['title'], filters: ['type', 'isPublic'], orderBy: { startDate: 'asc' },
}));

// ── Exams
r.use('/exams', crudRouter('Exam', {
  module: 'exams', read: ALL_SCHOOL_ROLES, filters: ['academicYearId', 'isPublished'], orderBy: { startDate: 'desc' },
  include: { academicYear: true },
}));
r.use('/exam-schedules', crudRouter('ExamSchedule', {
  module: 'exams', read: ALL_SCHOOL_ROLES, filters: ['examId', 'gradeId'], orderBy: { date: 'asc' },
  include: { subject: true, grade: true, exam: true },
}));

// ── Fees & accounts
r.use('/fee-heads', crudRouter('FeeHead', { module: 'fees', write: ACC, orderBy: { name: 'asc' } }));
r.use('/fee-structures', crudRouter('FeeStructure', {
  module: 'fees', write: ACC, filters: ['gradeId', 'academicYearId'], orderBy: { grade: { order: 'asc' } },
  include: { grade: true, feeHead: true, academicYear: true },
}));
r.use('/concessions', crudRouter('Concession', {
  module: 'fees', write: ACC, filters: ['studentId'], include: { student: { include: { grade: true, section: true } }, feeHead: true },
}));
r.use('/expenses', crudRouter('Expense', {
  module: 'accounts', read: ACC, write: ACC, search: ['category', 'paidTo', 'description'], filters: ['category', 'method'],
  orderBy: { date: 'desc' },
}));

// ── Admissions
r.use('/enquiries', crudRouter('Enquiry', {
  module: 'admissions', read: FRONT, write: FRONT, search: ['name', 'phone', 'email'], filters: ['status', 'source'],
  orderBy: { createdAt: 'desc' },
}));

// ── Communication
r.use('/notices', crudRouter('Notice', {
  module: 'communication', write: FRONT, search: ['title', 'body'], filters: ['category', 'audience', 'isPublic'],
  orderBy: [{ isPinned: 'desc' }, { publishDate: 'desc' }],
}));
r.use('/homework', crudRouter('Homework', {
  module: 'homework', write: TEACH, filters: ['sectionId', 'subjectId', 'teacherId'], search: ['title'],
  orderBy: { assignedDate: 'desc' }, include: { section: { include: { grade: true } }, subject: true, teacher: true, _count: { select: { submissions: true } } },
  async beforeSave(data, req) {
    if (req.user.role === 'TEACHER' && !data.teacherId) {
      const staff = await prisma.staff.findFirst({ where: { userId: req.user.id } });
      data.teacherId = staff?.id;
    }
    return data;
  },
}));

// ── Transport
r.use('/vehicles', crudRouter('Vehicle', { module: 'transport', search: ['number', 'driverName'], orderBy: { number: 'asc' } }));
r.use('/routes', crudRouter('TransportRoute', {
  module: 'transport', search: ['name'], orderBy: { name: 'asc' },
  include: { vehicle: true, stops: { orderBy: { order: 'asc' }, include: { _count: { select: { students: true } } } } },
}));
r.use('/route-stops', crudRouter('RouteStop', {
  module: 'transport', filters: ['routeId'], orderBy: { order: 'asc' }, include: { route: true, _count: { select: { students: true } } },
}));

// ── Hostel
r.use('/hostels', crudRouter('Hostel', {
  module: 'hostel', orderBy: { name: 'asc' },
  include: { rooms: { include: { _count: { select: { allocations: { where: { isActive: true } } } } } } },
}));
r.use('/hostel-rooms', crudRouter('HostelRoom', {
  module: 'hostel', filters: ['hostelId'], orderBy: { roomNo: 'asc' },
  include: { hostel: true, allocations: { where: { isActive: true }, include: { student: { include: { grade: true } } } } },
}));
r.use('/hostel-allocations', crudRouter('HostelAllocation', {
  module: 'hostel', filters: ['roomId', 'studentId', 'isActive'], orderBy: { fromDate: 'desc' },
  include: { room: { include: { hostel: true } }, student: { include: { grade: true, section: true } } },
  async beforeSave(data, req, existing) {
    const roomId = data.roomId || existing?.roomId;
    if (!existing && roomId) {
      const room = await prisma.hostelRoom.findUnique({ where: { id: roomId }, include: { _count: { select: { allocations: { where: { isActive: true } } } } } });
      if (room && room._count.allocations >= room.capacity) throw badRequest('This room is already full');
      const dup = await prisma.hostelAllocation.findFirst({ where: { studentId: data.studentId, isActive: true } });
      if (dup) throw badRequest('Student already has an active hostel allocation');
    }
    return data;
  },
  async afterSave(item) {
    await prisma.student.update({ where: { id: item.studentId }, data: { isHosteller: item.isActive } });
  },
}));

// ── Library & inventory master data
r.use('/books', crudRouter('Book', {
  module: 'library', read: [...STAFF_ROLES], write: LIB, search: ['title', 'author', 'isbn', 'category'], filters: ['category'],
  orderBy: { title: 'asc' },
  async beforeSave(data, _req, existing) {
    if (!existing && data.available == null) data.available = data.copies ?? 1;
    if (existing && data.copies != null && data.available == null) {
      data.available = Math.max(0, existing.available + (data.copies - existing.copies));
    }
    return data;
  },
}));
r.use('/inventory-items', crudRouter('InventoryItem', {
  module: 'inventory', search: ['name', 'category', 'location'], filters: ['category'], orderBy: { name: 'asc' },
}));

// ── Website CMS
const cms = { module: 'website', read: ADMINS, write: ADMINS };
r.use('/site-content', crudRouter('SiteContent', { ...cms, search: ['key', 'valueEn'], orderBy: { key: 'asc' } }));
r.use('/banners', crudRouter('Banner', { ...cms, orderBy: { order: 'asc' } }));
r.use('/leaders', crudRouter('Leader', { ...cms, orderBy: { order: 'asc' } }));
r.use('/gallery', crudRouter('GalleryItem', { ...cms, search: ['titleEn', 'category'], filters: ['category'], orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] }));
r.use('/stats', crudRouter('Stat', { ...cms, orderBy: { order: 'asc' } }));
r.use('/facilities', crudRouter('Facility', { ...cms, orderBy: { order: 'asc' } }));
r.use('/testimonials', crudRouter('Testimonial', { ...cms, orderBy: { order: 'asc' } }));
r.use('/contact-persons', crudRouter('ContactPerson', { ...cms, orderBy: { order: 'asc' } }));
r.use('/disclosures', crudRouter('DisclosureItem', { ...cms, filters: ['section'], orderBy: [{ section: 'asc' }, { order: 'asc' }] }));
r.use('/board-results', crudRouter('BoardResult', { ...cms, filters: ['className'], orderBy: [{ className: 'asc' }, { year: 'desc' }] }));
r.use('/tcs', crudRouter('TransferCertificate', {
  module: 'students', write: FRONT, search: ['tcNo', 'studentName', 'admissionNo'], orderBy: { issueDate: 'desc' },
}));

export default r;
