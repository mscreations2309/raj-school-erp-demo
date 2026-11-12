# RnY EduSuite — School ERP SaaS + Animated School Website

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/mscreations2309/raj-school-erp-demo)

**Live demo:** https://raj-school-erp-demo.onrender.com  
**Powered by RnY Groups.** Demo tenant: **Raj English School, Sarnath, Varanasi** (all real content and photos captured from rajschoolvns.edu.in).

## Run it (Windows / Mac / Linux, Node 20+)

```bash
npm run setup     # first time only: installs everything, creates the database, loads demo data (~2 min)
npm run dev       # starts API (http://localhost:5000) + website/ERP (http://localhost:5174)
```

Open **http://localhost:5174** (fixed port, so it never clashes with other apps on 5173).

| Login | Email / mobile | Password |
|---|---|---|
| RnY Super Admin (SaaS console) | admin@rnygroups.com | Admin@123 |
| School Admin | admin@rajschool.in | Admin@123 |
| Principal | principal@rajschool.in | Principal@123 |
| Teacher | teacher@rajschool.in | Teacher@123 |
| Accountant | accounts@rajschool.in | Accounts@123 |
| Reception / Admissions | reception@rajschool.in | Reception@123 |
| Librarian | library@rajschool.in | Library@123 |
| Parent (2 children) | 9876543210 | 9876543210 |
| Student | student@rajschool.in | Student@123 |

The login page also has one-click demo buttons for every role.

## What's inside

**Public website (English / हिंदी toggle, animated):** Home (Ken-Burns hero slider, notice ticker, President-of-India achievement, animated counters, leadership, facilities, board-result charts, gallery, testimonials, events), About, Academics, Facilities, Gallery (filter + lightbox), News & Events, Contact (enquiry form + directory + map), Online Admissions (5-step form, document upload, demo payment, status tracking), CBSE Mandatory Disclosure, TC verification. Every text and image is editable from the ERP's **Website CMS**.

**ERP modules:** Dashboard • Students (admission, 360° profile, documents, siblings, parent login, promotion, TC) • Admissions (online applications pipeline → enrol, enquiries CRM) • Academics (classes, sections, subjects, subject teachers, clash-free timetable, calendar, sessions) • Attendance (one-tap marking, monthly register, staff attendance) • Exams (schedule, marks entry, auto CBSE grades, tabulation with rank, printable report cards, publish to parents) • Fees (structure, auto monthly invoices incl. transport/hostel, concessions, counter collection, receipts, dues/defaulters, CSV) • Accounts (expenses, income vs expense) • HR (staff, logins, leave approval, payroll with absence deduction, payslips) • Communication (notices EN/HI, messages, homework) • Transport • Hostel • Library (circulation, fines) • Inventory (stock in/out, low-stock alerts) • Settings, branding, grading scale, activity log.

**Portals:** Parent/Student (attendance calendar, online fee payment + receipt, report cards, homework, timetable, transport, notices, leave application) and Teacher (today's classes, class attendance status, subjects).

**SaaS (multi-tenant):** every record is isolated by `schoolId`; RnY super-admin console to onboard schools in one click (auto-provisions classes, subjects, fee heads, website), plans with module gating (Starter / Growth / Enterprise), subscriptions & invoices, suspend/reactivate, "open ERP as school", per-school websites via subdomain, custom domain or `/?school=<slug>`.

## Homework workflow
1. **Student login** — Students → select a class → "Student logins for class" (or "Student login" on a profile). Students sign in with their **admission number** (default password = admission number).
2. **Student submits** text and/or photos/PDF; late submissions are flagged; they can re-submit until checked.
3. **Teacher checks** (Communication → Homework → "Check work"): marks, grade, feedback, checked copy, or "Ask to redo".
4. **Publish** — results stay hidden until published; student and parent get an in-app message.
5. **Parent acknowledges** from the parent portal (optional note); the teacher sees who acknowledged and when.

## Checking homework: annotate + Claude AI
- **Check work** opens each student's photos/PDF pages straight into an annotation board (pen, highlighter, tick, cross, text, eraser, undo, zoom). Marks **autosave to the cloud**; on Save/Publish the marked-up pages automatically become the student's checked copy.
- **Evaluate with Claude AI** reads the question, the optional *answer key / marking scheme* and the student's typed + handwritten work, then suggests marks, grade, per-question verdicts, strengths, improvements and student feedback (plus private notes for the teacher). The teacher reviews/edits and only then publishes. Students and parents never see the AI draft or the answer key.
- **Enable AI:** add `ANTHROPIC_API_KEY` (from console.anthropic.com) in Render → raj-school-erp-demo → Environment. Model: Claude Opus 5.5. Pay-per-use (roughly ₹2–10 per evaluation depending on pages).

## Data safety — nothing is ever erased
- **Every Delete = Move to Recycle Bin** with a mandatory reason. The record *and everything linked to it* (e.g. a student's fees, attendance, marks, documents) is stored as a complete copy with the employee's name, role, employee ID, date/time and reason.
- **Restore** puts everything back exactly (same IDs, same links) and unlocks any logins.
- **Remove from my bin** never erases: it moves the item to the next manager's bin — Teacher/Accountant/Receptionist/Librarian → Principal → School Admin → RnY Super Admin → Archive (kept forever, still restorable). Every step is kept in the item's history.
- **Visibility:** the person who deleted + everyone above them.
- **Deleted people can't log in:** deleting a staff member, student (and parent with no other child) or a login blocks sign-in immediately; restoring unlocks it.
- **Remove all demo data:** School Admin → Settings → "Remove all demo data" (button only — never automatic). It goes to the Recycle Bin as one entry and can be restored in one click.

## Tech
- **API:** Node.js, Express, Prisma ORM, JWT auth, role-based access, Zod validation, Multer uploads, audit log — `server/`
- **Web:** React 18, Vite, Tailwind CSS, Framer Motion, Recharts, i18next — `web/`
- **Database:** SQLite for local demo (zero install). For production change `provider = "postgresql"` in `server/prisma/schema.prisma` and set `DATABASE_URL` in `server/.env`, then `npx prisma db push`.

## Useful commands
```bash
npm run reset-db   # wipe and reload demo data
npm run test:api   # 95+ API checks incl. tenant isolation & permissions (API must be running)
npm run test:ui    # opens every page in headless Chrome as each role (needs both servers)
npm run build && npm start   # production: API serves the built website on http://localhost:5000
```

## Before going live (production checklist)
- Set a strong `JWT_SECRET` and change all demo passwords.
- Switch to PostgreSQL; store uploads on S3/Cloud storage.
- Replace the demo payment gateway with Razorpay (keys in Settings → Integrations).
- Connect an SMS/WhatsApp provider for messages.
- Get a high-resolution logo from the school (the captured one is 85 px).
- Leader messages beyond their quotes, testimonials and teacher/student records are **sample data** — replace with real data.
