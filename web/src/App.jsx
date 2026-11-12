import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { SiteProvider } from './site/SiteContext';
import SiteLayout from './site/SiteLayout';
import Home from './site/pages/Home';
import { useAuth, homeFor } from './lib/auth';

const About = lazy(() => import('./site/pages/About'));
const Academics = lazy(() => import('./site/pages/Academics'));
const Facilities = lazy(() => import('./site/pages/Facilities'));
const Gallery = lazy(() => import('./site/pages/Gallery'));
const Notices = lazy(() => import('./site/pages/Notices'));
const Contact = lazy(() => import('./site/pages/Contact'));
const Admissions = lazy(() => import('./site/pages/Admissions'));
const Disclosure = lazy(() => import('./site/pages/Disclosure'));
const TC = lazy(() => import('./site/pages/TC'));

const ErpLayout = lazy(() => import('./erp/ErpLayout'));
const Login = lazy(() => import('./erp/pages/Login'));
const Dashboard = lazy(() => import('./erp/pages/Dashboard'));
const L = (fn, name) => lazy(() => fn().then((m) => ({ default: m[name] })));
const S = () => import('./erp/pages/Students');
const A = () => import('./erp/pages/Attendance');
const E = () => import('./erp/pages/Exams');
const F = () => import('./erp/pages/Fees');
const R = () => import('./erp/pages/Resources');
const H = () => import('./erp/pages/Hr');
const O = () => import('./erp/pages/Ops');
const P = () => import('./erp/pages/Portal');
const PL = () => import('./erp/pages/Platform');
const RecycleBin = lazy(() => import('./erp/pages/RecycleBin'));
const HomeworkReview = lazy(() => import('./erp/pages/HomeworkReview'));

const pages = {
  StudentsList: L(S, 'StudentsList'), StudentForm: L(S, 'StudentForm'), StudentProfile: L(S, 'StudentProfile'), PromoteStudents: L(S, 'PromoteStudents'),
  MarkAttendance: L(A, 'MarkAttendance'), AttendanceReport: L(A, 'AttendanceReport'), StaffAttendance: L(A, 'StaffAttendance'),
  MarksEntry: L(E, 'MarksEntry'), Results: L(E, 'Results'), ReportCard: L(E, 'ReportCard'),
  FeeDashboard: L(F, 'FeeDashboard'), CollectFee: L(F, 'CollectFee'), Invoices: L(F, 'Invoices'), Payments: L(F, 'Payments'), Dues: L(F, 'Dues'), Receipt: L(F, 'Receipt'), Accounts: L(F, 'Accounts'),
  Classes: L(R, 'Classes'), Subjects: L(R, 'Subjects'), SectionSubjects: L(R, 'SectionSubjects'), AcademicYears: L(R, 'AcademicYears'), Events: L(R, 'Events'), Exams: L(R, 'Exams'), ExamSchedules: L(R, 'ExamSchedules'),
  FeeHeads: L(R, 'FeeHeads'), FeeStructure: L(R, 'FeeStructure'), Concessions: L(R, 'Concessions'), Expenses: L(R, 'Expenses'), Enquiries: L(R, 'Enquiries'), Notices: L(R, 'Notices'), Homework: L(R, 'Homework'), TCs: L(R, 'TCs'),
  Vehicles: L(R, 'Vehicles'), RoutesPage: L(R, 'RoutesPage'), Hostels: L(R, 'Hostels'), HostelAllocations: L(R, 'HostelAllocations'), Books: L(R, 'Books'), Inventory: L(R, 'Inventory'),
  CmsBanners: L(R, 'CmsBanners'), CmsContent: L(R, 'CmsContent'), CmsLeaders: L(R, 'CmsLeaders'), CmsGallery: L(R, 'CmsGallery'), CmsStats: L(R, 'CmsStats'), CmsFacilities: L(R, 'CmsFacilities'), CmsTestimonials: L(R, 'CmsTestimonials'), CmsContacts: L(R, 'CmsContacts'), CmsDisclosure: L(R, 'CmsDisclosure'), CmsResults: L(R, 'CmsResults'),
  Staff: L(H, 'Staff'), Users: L(H, 'Users'), Leaves: L(H, 'Leaves'), Payroll: L(H, 'Payroll'),
  Applications: L(O, 'Applications'), Messages: L(O, 'Messages'), Timetable: L(O, 'Timetable'), LibraryCirculation: L(O, 'LibraryCirculation'), Settings: L(O, 'Settings'), AuditLog: L(O, 'AuditLog'),
  ParentPortal: L(P, 'ParentPortal'), TeacherHome: L(P, 'TeacherHome'),
  PlatformHome: L(PL, 'PlatformHome'), PlatformSchools: L(PL, 'PlatformSchools'), PlatformSchoolDetail: L(PL, 'PlatformSchoolDetail'), PlatformPlans: L(PL, 'PlatformPlans'), PlatformBilling: L(PL, 'PlatformBilling'),
};

const Fallback = () => <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-brand-600" size={32} /></div>;

function AppHome() {
  const { user, school } = useAuth();
  const target = homeFor(user, school);
  if (target !== '/app') return <Navigate to={target} replace />;
  return <Dashboard />;
}

export default function App() {
  const p = pages;
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route element={<SiteProvider><SiteLayout /></SiteProvider>}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="academics" element={<Academics />} />
          <Route path="facilities" element={<Facilities />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="notices" element={<Notices />} />
          <Route path="contact" element={<Contact />} />
          <Route path="admissions" element={<Admissions />} />
          <Route path="disclosure" element={<Disclosure />} />
          <Route path="tc" element={<TC />} />
        </Route>
        <Route path="login" element={<Login />} />

        <Route path="app" element={<ErpLayout />}>
          <Route index element={<AppHome />} />
          <Route path="teacher" element={<p.TeacherHome />} />
          <Route path="portal" element={<p.ParentPortal />} />
          <Route path="receipt/:id" element={<p.Receipt />} />
          <Route path="students" element={<p.StudentsList />} />
          <Route path="students/new" element={<p.StudentForm />} />
          <Route path="students/promote" element={<p.PromoteStudents />} />
          <Route path="students/:id" element={<p.StudentProfile />} />
          <Route path="students/:id/edit" element={<p.StudentForm />} />
          <Route path="tcs" element={<p.TCs />} />
          <Route path="applications" element={<p.Applications />} />
          <Route path="enquiries" element={<p.Enquiries />} />
          <Route path="classes" element={<p.Classes />} />
          <Route path="subjects" element={<p.Subjects />} />
          <Route path="section-subjects" element={<p.SectionSubjects />} />
          <Route path="timetable" element={<p.Timetable />} />
          <Route path="events" element={<p.Events />} />
          <Route path="academic-years" element={<p.AcademicYears />} />
          <Route path="attendance" element={<p.MarkAttendance />} />
          <Route path="attendance/report" element={<p.AttendanceReport />} />
          <Route path="attendance/staff" element={<p.StaffAttendance />} />
          <Route path="exams" element={<p.Exams />} />
          <Route path="exam-schedules" element={<p.ExamSchedules />} />
          <Route path="marks" element={<p.MarksEntry />} />
          <Route path="results" element={<p.Results />} />
          <Route path="report-card" element={<p.ReportCard />} />
          <Route path="fees" element={<p.FeeDashboard />} />
          <Route path="fees/collect" element={<p.CollectFee />} />
          <Route path="fees/invoices" element={<p.Invoices />} />
          <Route path="fees/payments" element={<p.Payments />} />
          <Route path="fees/dues" element={<p.Dues />} />
          <Route path="fees/receipt/:id" element={<p.Receipt />} />
          <Route path="fees/structure" element={<p.FeeStructure />} />
          <Route path="fees/heads" element={<p.FeeHeads />} />
          <Route path="fees/concessions" element={<p.Concessions />} />
          <Route path="accounts" element={<p.Accounts />} />
          <Route path="expenses" element={<p.Expenses />} />
          <Route path="staff" element={<p.Staff />} />
          <Route path="leaves" element={<p.Leaves />} />
          <Route path="payroll" element={<p.Payroll />} />
          <Route path="users" element={<p.Users />} />
          <Route path="notices" element={<p.Notices />} />
          <Route path="messages" element={<p.Messages />} />
          <Route path="homework" element={<p.Homework />} />
          <Route path="homework/:id" element={<HomeworkReview />} />
          <Route path="routes" element={<p.RoutesPage />} />
          <Route path="vehicles" element={<p.Vehicles />} />
          <Route path="hostels" element={<p.Hostels />} />
          <Route path="hostel-allocations" element={<p.HostelAllocations />} />
          <Route path="library" element={<p.LibraryCirculation />} />
          <Route path="books" element={<p.Books />} />
          <Route path="inventory" element={<p.Inventory />} />
          <Route path="cms/banners" element={<p.CmsBanners />} />
          <Route path="cms/content" element={<p.CmsContent />} />
          <Route path="cms/leaders" element={<p.CmsLeaders />} />
          <Route path="cms/gallery" element={<p.CmsGallery />} />
          <Route path="cms/stats" element={<p.CmsStats />} />
          <Route path="cms/facilities" element={<p.CmsFacilities />} />
          <Route path="cms/testimonials" element={<p.CmsTestimonials />} />
          <Route path="cms/contacts" element={<p.CmsContacts />} />
          <Route path="cms/disclosure" element={<p.CmsDisclosure />} />
          <Route path="cms/results" element={<p.CmsResults />} />
          <Route path="settings" element={<p.Settings />} />
          <Route path="audit" element={<p.AuditLog />} />
          <Route path="recycle-bin" element={<RecycleBin />} />
          <Route path="*" element={<div className="py-20 text-center text-slate-500">Page not found</div>} />
        </Route>

        <Route path="platform" element={<ErpLayout platform />}>
          <Route index element={<p.PlatformHome />} />
          <Route path="schools" element={<p.PlatformSchools />} />
          <Route path="schools/:id" element={<p.PlatformSchoolDetail />} />
          <Route path="plans" element={<p.PlatformPlans />} />
          <Route path="billing" element={<p.PlatformBilling />} />
          <Route path="audit" element={<p.AuditLog platform />} />
          <Route path="recycle-bin" element={<RecycleBin platform />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
