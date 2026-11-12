import {
  LayoutDashboard, Users, UserPlus, GraduationCap, ClipboardCheck, BookMarked, Wallet, PieChart, Briefcase, Megaphone,
  Bus, BedDouble, Library, Boxes, Globe, Settings, School, Building2, Receipt, Home, Trash2,
} from 'lucide-react';

const ADMIN = ['SCHOOL_ADMIN', 'PRINCIPAL'];
const STAFF = [...ADMIN, 'TEACHER', 'ACCOUNTANT', 'RECEPTIONIST', 'LIBRARIAN'];
const ACC = [...ADMIN, 'ACCOUNTANT'];
const FRONT = [...ADMIN, 'RECEPTIONIST'];

/** Sidebar definition. `roles` = who sees it, `module` = plan feature gate. */
export const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/app', roles: [...ADMIN, 'ACCOUNTANT', 'RECEPTIONIST', 'LIBRARIAN'], end: true },
  { label: 'My Dashboard', icon: Home, to: '/app/teacher', roles: ['TEACHER'] },
  { label: 'My Child', icon: Home, to: '/app/portal', roles: ['PARENT'] },
  { label: 'My Dashboard', icon: Home, to: '/app/portal', roles: ['STUDENT'] },
  {
    label: 'Students', icon: Users, module: 'students', roles: [...FRONT, 'TEACHER', 'ACCOUNTANT'], children: [
      { label: 'All Students', to: '/app/students' },
      { label: 'Admit Student', to: '/app/students/new', roles: FRONT },
      { label: 'Promote / Transfer', to: '/app/students/promote', roles: ADMIN },
      { label: 'Transfer Certificates', to: '/app/tcs', roles: FRONT },
    ],
  },
  {
    label: 'Admissions', icon: UserPlus, module: 'admissions', roles: FRONT, children: [
      { label: 'Online Applications', to: '/app/applications' },
      { label: 'Enquiries', to: '/app/enquiries' },
    ],
  },
  {
    label: 'Academics', icon: GraduationCap, module: 'academics', roles: STAFF, children: [
      { label: 'Classes & Sections', to: '/app/classes', roles: ADMIN },
      { label: 'Subjects', to: '/app/subjects', roles: ADMIN },
      { label: 'Subject Teachers', to: '/app/section-subjects', roles: ADMIN },
      { label: 'Timetable', to: '/app/timetable' },
      { label: 'Academic Calendar', to: '/app/events' },
      { label: 'Academic Years', to: '/app/academic-years', roles: ADMIN },
    ],
  },
  {
    label: 'Attendance', icon: ClipboardCheck, module: 'attendance', roles: [...ADMIN, 'TEACHER'], children: [
      { label: 'Mark Attendance', to: '/app/attendance' },
      { label: 'Monthly Report', to: '/app/attendance/report' },
      { label: 'Staff Attendance', to: '/app/attendance/staff', roles: ADMIN },
    ],
  },
  {
    label: 'Examinations', icon: BookMarked, module: 'exams', roles: [...ADMIN, 'TEACHER'], children: [
      { label: 'Exams', to: '/app/exams' },
      { label: 'Exam Schedule', to: '/app/exam-schedules', roles: ADMIN },
      { label: 'Marks Entry', to: '/app/marks' },
      { label: 'Results & Report Cards', to: '/app/results' },
    ],
  },
  {
    label: 'Fees', icon: Wallet, module: 'fees', roles: [...ACC, 'RECEPTIONIST'], children: [
      { label: 'Fee Dashboard', to: '/app/fees' },
      { label: 'Collect Fee', to: '/app/fees/collect' },
      { label: 'Invoices', to: '/app/fees/invoices' },
      { label: 'Payments & Receipts', to: '/app/fees/payments' },
      { label: 'Defaulters / Dues', to: '/app/fees/dues' },
      { label: 'Fee Structure', to: '/app/fees/structure', roles: ACC },
      { label: 'Fee Heads', to: '/app/fees/heads', roles: ACC },
      { label: 'Concessions', to: '/app/fees/concessions', roles: ACC },
    ],
  },
  {
    label: 'Accounts', icon: PieChart, module: 'accounts', roles: ACC, children: [
      { label: 'Income vs Expense', to: '/app/accounts' },
      { label: 'Expenses', to: '/app/expenses' },
    ],
  },
  {
    label: 'HR & Payroll', icon: Briefcase, module: 'staff', roles: [...STAFF], children: [
      { label: 'Staff Directory', to: '/app/staff', roles: ADMIN },
      { label: 'Leave Requests', to: '/app/leaves' },
      { label: 'Payroll', to: '/app/payroll', roles: ACC },
      { label: 'User Logins', to: '/app/users', roles: ADMIN },
    ],
  },
  {
    label: 'Communication', icon: Megaphone, module: 'communication', roles: STAFF, children: [
      { label: 'Notices & Circulars', to: '/app/notices', roles: FRONT },
      { label: 'Messages', to: '/app/messages' },
      { label: 'Homework', to: '/app/homework', roles: [...ADMIN, 'TEACHER'] },
    ],
  },
  {
    label: 'Transport', icon: Bus, module: 'transport', roles: ADMIN, children: [
      { label: 'Routes & Stops', to: '/app/routes' },
      { label: 'Vehicles', to: '/app/vehicles' },
    ],
  },
  {
    label: 'Hostel', icon: BedDouble, module: 'hostel', roles: ADMIN, children: [
      { label: 'Hostels & Rooms', to: '/app/hostels' },
      { label: 'Allocations', to: '/app/hostel-allocations' },
    ],
  },
  {
    label: 'Library', icon: Library, module: 'library', roles: [...ADMIN, 'LIBRARIAN'], children: [
      { label: 'Circulation', to: '/app/library' },
      { label: 'Book Catalogue', to: '/app/books' },
    ],
  },
  { label: 'Inventory', icon: Boxes, module: 'inventory', roles: ADMIN, to: '/app/inventory' },
  {
    label: 'Website CMS', icon: Globe, module: 'website', roles: ADMIN, children: [
      { label: 'Hero Banners', to: '/app/cms/banners' },
      { label: 'Site Texts (EN/HI)', to: '/app/cms/content' },
      { label: 'Leadership', to: '/app/cms/leaders' },
      { label: 'Gallery', to: '/app/cms/gallery' },
      { label: 'Highlights / Stats', to: '/app/cms/stats' },
      { label: 'Facilities', to: '/app/cms/facilities' },
      { label: 'Testimonials', to: '/app/cms/testimonials' },
      { label: 'Contact Directory', to: '/app/cms/contacts' },
      { label: 'Mandatory Disclosure', to: '/app/cms/disclosure' },
      { label: 'Board Results', to: '/app/cms/results' },
    ],
  },
  { label: 'Recycle Bin', icon: Trash2, to: '/app/recycle-bin', roles: STAFF },
  {
    label: 'Settings', icon: Settings, roles: ADMIN, children: [
      { label: 'School Profile', to: '/app/settings' },
      { label: 'Activity Log', to: '/app/audit' },
    ],
  },
];

export const PLATFORM_NAV = [
  { label: 'Overview', icon: LayoutDashboard, to: '/platform', end: true },
  { label: 'Schools (Tenants)', icon: School, to: '/platform/schools' },
  { label: 'Plans & Pricing', icon: Building2, to: '/platform/plans' },
  { label: 'Billing', icon: Receipt, to: '/platform/billing' },
  { label: 'Recycle Bin', icon: Trash2, to: '/platform/recycle-bin' },
  { label: 'Activity Log', icon: ClipboardCheck, to: '/platform/audit' },
];
