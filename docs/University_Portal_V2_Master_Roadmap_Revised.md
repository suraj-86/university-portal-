# University Portal — V2 Master Roadmap (Revised & Scope-Locked)

## 1. Product Direction

University Portal V2 will evolve the stable V1.0.0 system into an **authorized digital university campus management platform** for:

- Admin
- Teacher
- Student
- Parent

The product remains primarily an authenticated university-management system. It is **not** being redesigned as a public university website.

The V2 objective is to extend the existing V1 system with practical academic, communication, information, reporting, bulk-data, administrative, security, and mobile capabilities while reusing working V1 functionality wherever possible.

---

# 2. V1 Baseline

V1.0.0 is the stable rollback checkpoint.

Current V1 functionality includes:

- Web portals for Admin, Teacher, Student, and Parent
- Android mobile application for Student, Teacher, and Parent
- JWT authentication and bcrypt password verification
- Role-based authorization
- Student, Teacher, Parent, and Admin dashboards
- Courses and subjects
- Teacher subject assignments
- Attendance
- Marks and results
- Fees and payments
- Payment receipts
- Notices and attachments
- Parent–student relationships
- Teacher academic workflows
- Daily scheduled classes shown through dashboard data
- Production web deployment
- Production backend deployment
- MySQL production database
- Expo/EAS Android application

V2 must extend this baseline rather than rebuild working V1 functionality unnecessarily.

---

# 3. V2 Development Principles

## 3.1 Source of truth

The latest actual repository/codebase is the source of truth.

Before implementing any feature:

> Inspect actual source → understand existing behavior → design the smallest correct extension → implement → test

No assumptions about existing APIs, tables, routes, or UI should be made without inspecting the source first.

## 3.2 Preserve V1 stability

V1.0.0 remains the rollback checkpoint. V2 changes must not unnecessarily break existing workflows.

## 3.3 Reuse before creating

If a feature already exists in the backend or database, V2 should expose, improve, or reorganize it instead of creating duplicate infrastructure.

Examples:

- Daily Classes already exists → add a dedicated frontend menu.
- Results/marks already exist → add Report Card presentation instead of creating another academic-data system.
- Existing student/parent/teacher contact fields → expose them through controlled Contact views instead of duplicating contact records.
- Existing notices → extend the communication model where appropriate instead of creating unrelated systems.

## 3.4 Backend is the source of truth

Important rules must be enforced by the backend, not only by web/mobile UI.

This includes:

- Authorization
- Attendance editing restrictions
- Marks editing rules
- Message recipients
- Bulk-import permissions
- Password reset validation
- Hostel access
- Audit records

## 3.5 Shared backend, separate clients

Web and mobile use the same backend capabilities where possible, but web and mobile interfaces are separate implementations.

A backend feature does not automatically create a mobile feature.

## 3.6 Incremental implementation

Each feature will be completed in a focused cycle:

1. Inspect source
2. Design
3. Backend/database changes if required
4. API testing
5. Web implementation
6. Web testing
7. Mobile implementation where applicable
8. Mobile testing
9. Production deployment
10. Production verification
11. Documentation update
12. Git commit
13. Git push

## 3.7 Documentation

Documentation is updated after meaningful feature completion, not after every tiny edit.

---

# 4. Priority System

### P0 — Core
Required for the main V2 objective, security, data integrity, or major administrative workflow.

### P1 — Important
Strongly recommended for a complete V2 campus-management experience.

### P2 — Enhancement
Useful improvements after the main V2 system is stable.

---

# 5. Scope Decision Summary

| Area | Decision | V2 treatment |
|---|---|---|
| Daily Scheduled Classes | KEEP + EXTEND | Dedicated frontend menu using existing data |
| Academic Calendar | NEW | Admin-managed data; other roles view |
| Holidays | NEW | Admin-managed data; other roles view |
| Timetable | EXTEND | Proper Daily/Weekly frontend module using existing scheduling foundation |
| Attendance | EXTEND | Confirmation + editing restrictions + audit |
| Marks | EXTEND | Confirmation + assessment naming + modification history/audit |
| Results | KEEP + EXTEND | Better presentation, graphs, report-card integration |
| Performance / CGPA | EXTEND | Semester/subject trends and graphs |
| Fees | KEEP + EXTEND | Better fee details/statement presentation |
| Notices | EXTEND | Targeted recipients and improved communication |
| Announcements | NEW/EXTEND | Broader institutional communication separated conceptually from notices |
| Messaging | NEW/EXTEND | Separate menu; teacher ↔ student/parent individual or batch messaging |
| Contacts | EXTEND | Role-specific controlled contact visibility |
| Queries | SIMPLIFY | Static university/admin/office contact information; no ticketing system |
| Appointments | DROP | Messaging is sufficient for V2 |
| Exam Attendance | DROP | Not required because existing attendance/results/reporting cover the needed academic workflow |
| Hostel | NEW | Simple hostel allocation/information module |
| Report Card | EXTEND | New Student/Parent menu using existing marks/results data |
| Excel/CSV Import | NEW / P0 | Proper validated bulk-data workflow |
| Audit System | NEW / P0 | System-wide audit trail for sensitive actions |
| Notifications | NEW | In-app first; mobile push after foundation is stable |
| Global Search | NEW | Admin-only initially |
| Assignments | DEFERRED | Not part of the current locked V2 core scope; revisit later if required |
| Mobile 2.0 | EXTEND | Add V2 features to Android after backend/web features stabilize |
| Performance/Accessibility | P1/P2 | Final hardening and UX pass |

---

# 6. V2-A — Authentication & Account Security [P0]

## A1. Forgot Password

Implement a secure recovery workflow for web and mobile.

Requirements:

- Forgot Password entry point
- Username/User ID and registered email verification as appropriate
- Secure reset token or OTP
- Expiration
- Single-use reset credentials
- New password and confirmation
- Invalid/expired handling
- Generic responses that do not reveal whether an account exists
- Rate limiting/abuse protection
- Success confirmation

Acceptance:

- Legitimate users can recover their accounts.
- Reset credentials cannot be reused.
- Expired credentials cannot be used.
- Account existence is not unnecessarily disclosed.

## A2. Account Security

Improve:

- Password strength validation
- Session/token expiry handling
- Invalid-session handling
- Account active/inactive enforcement
- Logout behavior
- Security audit events

## A3. Security Hardening

Review:

- Role authorization
- API authorization
- Request validation
- File upload validation
- Rate limiting
- JWT handling
- CORS
- Production environment configuration
- SQL/query safety
- Sensitive logging
- Error-information leakage

Deliverable:

- V2 security checklist
- Security test results
- Final security audit record

---

# 7. V2-B — Academic Information & Schedule [P0/P1]

## B1. Daily Scheduled Classes [P1]

The backend/data already supports daily classes.

V2 does **not** create a duplicate scheduling system.

Add a dedicated menu for:

- Today's classes
- Relevant upcoming classes where available
- Subject
- Teacher
- Room/class information where available
- Schedule details

Role coverage:

- Student
- Teacher
- Parent where useful for ward information

The dashboard can continue showing a summary while the new menu provides the complete view.

## B2. Timetable [P1]

Create a proper Timetable menu using the existing scheduling foundation.

Views:

- Daily
- Weekly

Display:

- Time
- Subject
- Teacher
- Room/class
- Relevant course/semester information

The same backend timetable data should be reusable by:

- Dashboard
- Daily Classes
- Timetable
- Mobile
- Notifications where later applicable

## B3. Academic Calendar [P1]

Admin manages university academic-calendar entries.

Possible data:

- Semester start
- Semester end
- Examination periods
- Result dates
- University events
- Academic activities
- Important deadlines

Admin capabilities:

- Add
- Edit
- Delete
- Bulk upload
- View/manage calendar

Student/Teacher/Parent capabilities:

- View relevant calendar information

## B4. Holidays [P1]

Admin manages the university holiday list.

Capabilities:

- Add/edit/delete holidays
- Bulk Excel/CSV upload
- View holiday list/calendar

Other roles:

- View holidays

Academic Calendar and Holidays should reuse the same general data/import infrastructure where practical.

---

# 8. V2-C — Academic Performance, Marks & Results [P0]

## C1. Semester-wise Performance

Student/Parent:

- Semester-wise marks
- SGPA/GPA where applicable
- CGPA
- Overall percentage
- Subject-wise performance
- Improvement/trend visualization

Teacher:

- Subject performance overview
- Class statistics
- Assessment statistics where supported

Admin:

- Academic overview
- Semester/course/subject summaries

Academic values must ultimately come from authoritative backend/database values.

## C2. Performance Graphs

Provide useful visualizations such as:

- CGPA by semester
- Subject performance
- Attendance percentage
- Improvement/trend
- Marks distribution where useful

Existing chart infrastructure should be reused where possible.

## C3. Marks Entry Improvements [P0]

Before saving marks:

- Confirmation step
- Summary of affected assessment/class
- Clear warning before final save

Assessment naming:

- Teacher can create/edit assessment names where appropriate
- Multiple assessments of the same type must be distinguishable
- Example: Viva 1, Viva 2, Viva 3

## C4. Marks Modification History [P0]

When marks are modified after initial entry, record:

- Who changed it
- When it changed
- Old value
- New value
- Assessment
- Student
- Subject
- Reason where required

The system should allow authorized users to understand what changed without exposing unnecessary administrative information to students/parents.

## C5. Results

Keep existing results functionality and improve its presentation using the new academic-performance infrastructure.

---

# 9. V2-D — Attendance 2.0 [P0]

## D1. Save Confirmation

Before saving attendance, show a confirmation/warning step.

The confirmation should identify the relevant:

- Subject/class
- Date
- Number of students

## D2. Same-Day / Allowed-Period Editing

Attendance editing must be enforced by the backend.

The teacher should only be able to edit attendance within the permitted period for that class/day.

After the allowed period expires:

- Normal teacher editing is blocked.
- The backend rejects unauthorized edits.

The exact allowed period should be determined from the existing scheduling/data model during implementation rather than invented in the UI.

## D3. Attendance Analytics

Student/Parent:

- Overall attendance percentage
- Subject-wise attendance
- Attendance graph
- Shortage warning

Teacher:

- Class attendance overview
- Subject attendance
- History

## D4. Attendance Audit

Sensitive attendance modifications should be recorded with:

- Actor
- Student
- Subject/class
- Date
- Old value
- New value
- Timestamp
- Reason where required

---

# 10. V2-E — Fees & Financial Information [P1]

Existing fee/payment functionality remains the foundation.

Improve user-facing presentation with:

- Fee details
- Fee statement
- Payment history
- Outstanding amount
- Payment status
- Receipts

Student/Parent should have a clear financial summary.

Admin continues to manage fees and payments.

Any financial modification that is considered sensitive should be included in audit logging.

---

# 11. V2-F — Communication: Notices, Announcements & Messages [P0]

## F1. Notices

Upgrade the existing notice system to support controlled targeting.

Recipients may include:

- Individual student
- Individual parent
- Multiple selected students
- Multiple selected parents
- Student + parent
- Batch/course/semester where supported

Features:

- Attachments
- Priority
- Read/unread state
- Filtering
- Notice history

Existing notice functionality should remain working.

## F2. Announcements

Announcements represent broader institutional information, while Notices remain targeted/operational communication.

Examples:

- University announcement
- Department announcement
- Academic announcement
- Event announcement
- Important campus information

Targeting can include:

- All relevant users
- Department/course/semester/batch
- Teachers
- Students
- Parents

## F3. One-to-One / Batch Messaging

Create a dedicated Messages menu.

The system is an **academic communication system, not a WhatsApp/social clone**.

Teacher capabilities:

- Message an individual student
- Message an individual parent
- Select multiple students/parents
- Send a controlled batch message
- View conversation/history

Student/Parent capabilities:

- View received messages
- Reply where permitted
- View read/unread state
- View timestamps

Core message data:

- Sender
- Recipient
- Message
- Timestamp
- Read/unread
- Conversation/thread relationship

Attachments can be considered only where genuinely required.

## F4. Communication Permissions

The backend must control who can contact whom.

Examples:

- Teacher → assigned student
- Teacher → relevant parent
- Student → authorized teacher where allowed
- Parent → relevant teacher where allowed

No unrestricted directory-based messaging.

---

# 12. V2-G — Contacts & University Information [P1]

## G1. University/Office Contacts

Provide hard-written/configured institutional information such as:

- University office
- Administration
- Academic section
- Department office
- Important faculty/official contacts
- Phone/mobile
- WhatsApp where officially appropriate
- Email
- Office location/hours where applicable

This is intentionally **not** a ticket/query-management system.

## G2. Parent Contact View

Parents should be able to see appropriate university/faculty/office contacts.

## G3. Teacher Contact View

Teachers should be able to see authorized contact information for relevant:

- Students
- Parents

The data should come from information already managed by Admin when users are created/authorized.

Privacy rule:

Teachers must not automatically receive every parent's/student's personal information. Visibility must be role- and relationship-controlled.

---

# 13. V2-H — Queries / Help Information [P1]

The professor's requested "Queries" feature is intentionally simplified.

There will be **no ticketing/helpdesk workflow in the current V2 scope**.

The page will contain university-provided information such as:

- Administrative office contact
- Academic office contact
- Admission/department contact where relevant
- Technical/support contact
- Official email
- Phone/WhatsApp where applicable
- Office hours/location where appropriate

This can initially be hard-written/configured.

---

# 14. V2-I — Hostel Information [P1]

Hostel is a genuinely new data module.

## I1. Hostel Allocation

Create a relationship between a student and hostel allocation data.

Possible fields:

- Student
- Hostel name
- Block
- Room number
- Semester/session
- Warden name
- Warden contact
- Hostel contact
- Allocation status

## I2. Student View

If allotted:

- Hostel
- Block
- Room
- Semester/session
- Warden
- Warden contact

If not allotted:

> No hostel has been allotted.

## I3. Parent View

Parent can view the ward's hostel information.

## I4. Admin

Admin can manage hostel allocation data, either through normal forms or the bulk-import system.

Future hostel ERP features are out of scope for current V2.

---

# 15. V2-J — Report Card [P1]

Report Card is primarily a new presentation layer over existing academic data.

No duplicate marks/result database should be created.

## Student / Parent

Dedicated sidebar menu:

- Student information
- Semester
- Subjects
- Assessment/marks
- Total/maximum marks
- Grades where applicable
- SGPA
- CGPA
- Percentage
- Attendance summary
- Academic status where applicable

The UI should resemble a formal university report card rather than a normal marks-entry table.

Future enhancement:

- Printable report card
- PDF report card

---

# 16. V2-K — Excel / CSV Bulk Import [P0]

This is one of the most important new V2 administrative features.

The system must support safe bulk data entry for Admin and authorized Teachers.

## K1. Supported Data Types

Initial candidates:

- Students
- Teachers where appropriate
- Parents where appropriate
- Subjects/courses where appropriate
- Marks
- Attendance
- Fees where appropriate
- Holidays
- Academic Calendar
- Timetable
- Hostel Allocation

Only datasets that are approved for a given role should be available to that role.

## K2. Import Workflow

Never directly insert uploaded spreadsheet rows.

Required flow:

```text
Upload Excel/CSV
        ↓
Detect import type
        ↓
Validate file/type
        ↓
Validate columns
        ↓
Preview rows
        ↓
Validate values & relationships
        ↓
Show errors/warnings
        ↓
User confirms
        ↓
Transactional/batch import
        ↓
Import summary
        ↓
Audit record
```

## K3. Validation

Validate:

- Required columns
- Data types
- Dates
- Numeric ranges
- Student IDs
- Teacher IDs
- Subject/course codes
- Duplicate rows
- Existing records
- Foreign-key relationships
- Marks against maximum marks
- Attendance states
- Invalid semesters/batches
- Unknown classes

## K4. Preview

Before confirmation show:

- Total rows
- Valid rows
- Invalid rows
- Warnings
- New records
- Updates

The user must explicitly confirm the import.

## K5. Error Reporting

Examples:

```text
Row 14 — Invalid Student ID
Row 27 — Marks greater than maximum
Row 42 — Unknown Subject Code
```

Errors should be visible and, where practical, downloadable.

## K6. Safety

- Role-based import permissions
- File size/type restrictions
- Safe parsing
- Transactional import where possible
- No silent partial failure
- Clear success/failure summary
- Audit record

## K7. Templates

Provide templates for supported datasets, including:

- Student
- Marks
- Attendance
- Holiday
- Academic Calendar
- Timetable
- Fee
- Hostel Allocation

Templates should be based on the actual database/API structure after inspection.

---

# 17. V2-L — Audit & Activity System [P0]

Create a reusable audit mechanism rather than implementing separate history logic for every module.

## L1. Audit Record

Record where appropriate:

- Actor/user
- Role
- Action
- Target entity
- Target ID
- Old value
- New value
- Timestamp
- Reason where required
- Relevant request/import context

## L2. Priority Audit Areas

Especially:

- Marks changes
- Attendance changes
- Fees/payment administration
- User/account changes
- Notices
- Messages where administrative traceability is required
- Bulk imports
- Hostel allocation changes

## L3. Admin Audit View

Admin should eventually be able to:

- Search/filter activity
- View actor
- View action
- View date/time
- View affected record
- Inspect relevant old/new values

Audit logs should not expose unnecessary sensitive information to normal users.

---

# 18. V2-M — Notifications [P1]

Build a central notification system that can receive events from major modules.

Initial events may include:

- New notice
- New announcement
- New message
- Marks updated
- Result published
- Attendance shortage
- Fee due
- Fee payment confirmation
- Academic calendar update
- Important university information

## M1. Initial Channel

Start with:

- In-app notifications

## M2. Mobile Push

After the notification backend is stable:

- Android push notifications
- Notification deep links to relevant screens

Push implementation should not block the initial V2 communication system.

---

# 19. V2-N — Admin Global Search [P1]

Initially Admin-only.

Search across permitted entities such as:

- Students
- Teachers
- Parents
- Courses
- Subjects
- Notices
- Relevant contact records
- Fees where appropriate

Search results must respect authorization and must not expose protected information unnecessarily.

The first implementation can use optimized database queries rather than a dedicated search engine.

---

# 20. V2-O — Admin Analytics & Administration [P1]

Improve the Admin dashboard with useful institutional summaries.

## O1. User Statistics

- Students
- Teachers
- Parents
- Active/inactive accounts

## O2. Academic Statistics

- Attendance
- Marks/results
- Performance
- Courses/subjects

## O3. Financial Statistics

- Fees
- Payments
- Outstanding amounts

## O4. Operational Statistics

- Notices
- Messages
- Recent activity
- Bulk imports

Analytics should use authoritative backend values.

---

# 21. V2-P — Reports & Export [P1]

Reports can be developed after the underlying modules stabilize.

Potential reports:

- Attendance reports
- Marks reports
- Results
- Fee statements
- Student reports
- Teacher reports
- Bulk-import summaries
- Report cards
- Audit reports for Admin

Formats where appropriate:

- PDF
- CSV
- Excel

Report generation should reuse existing data rather than duplicate business logic.

---

# 22. V2-Q — Mobile 2.0 [P0/P1]

Mobile must be updated after corresponding backend functionality is stable.

## Student

Relevant V2 menus may include:

- Dashboard
- Daily Classes
- Timetable
- Subjects
- Attendance + graph
- Marks + graphs
- Results
- Academic Performance
- Report Card
- Fees / Fee Statement
- Academic Calendar
- Holidays
- Hostel
- Announcements
- Notices
- Messages
- Contacts
- University/Help Information
- Profile
- Settings

## Parent

Relevant V2 menus may include:

- Dashboard
- Ward Profile
- Daily Classes / Ward Schedule where useful
- Timetable
- Attendance + graph
- Results
- Report Card
- Fees / Fee Statement
- Academic Calendar
- Holidays
- Hostel
- Announcements
- Notices
- Messages
- Contacts
- University/Help Information
- Settings

## Teacher

Relevant V2 menus may include:

- Dashboard
- Daily Classes
- Timetable
- Subjects
- Attendance
- Marks
- Notices
- Announcements
- Messages
- Student/Parent Contacts
- Academic Calendar
- Holidays
- Profile/Settings

Mobile-specific requirements:

- Loading states
- Empty states
- Error states
- Offline/network failure handling where practical
- Responsive layouts
- Appropriate navigation
- Physical-device testing

Mobile source changes require a new EAS build when applicable.

---

# 23. V2-R — UX, Accessibility & Production Hardening [P1/P2]

After major functionality is stable:

## UX

- Consistent page layouts
- Consistent forms
- Clear confirmations
- Clear errors
- Empty states
- Loading states
- Better mobile navigation
- Reduced unnecessary duplication

## Accessibility

- Keyboard accessibility on web
- Clear labels
- Sufficient contrast
- Semantic controls
- Useful error messages
- Accessible tables/charts where practical

## Performance

- API optimization
- Database query review
- Pagination for large datasets
- Efficient imports
- Avoid unnecessary frontend requests
- Mobile performance review

## Production

- Environment configuration
- Logging review
- Error monitoring strategy
- Backup/recovery considerations
- Deployment verification

---

# 24. Explicitly Out of Scope for Current V2

The following are intentionally removed/deferred to keep V2 practical:

### Exam Attendance
Not required. Existing attendance + marks + results/report-card workflows are sufficient for the current project objective.

### Appointment System
Not required. Controlled one-to-one/batch messaging provides the needed teacher-parent/student communication mechanism.

### Query Ticketing System
Not required. The Queries/Help page will provide official university/admin/office contact information.

### Full Hostel ERP
Not required. V2 only needs hostel allocation/information.

### Social/WhatsApp-style Messaging
Not required. Messaging is an academic communication tool with controlled recipients.

### Assignment Management
Deferred from the current locked V2 scope. It can be reconsidered as a future V2.x/V3 feature if the university actually requires it.

### Public University Website
Not the main objective. Any public-facing campus information remains limited and authorized/approved as appropriate.

---

# 25. Recommended V2 Implementation Order

The implementation order should follow dependencies and actual repository inspection.

```text
V1.0.0 Stable Baseline
        │
        ▼
Phase 1 — V2 Foundation & Inspection
        │
        ├── Existing schema/API review
        ├── Existing route/menu review
        ├── Permission matrix
        └── V2 database design decisions
        │
        ▼
Phase 2 — Authentication & Security
        │
        ├── Forgot Password
        └── Security hardening
        │
        ▼
Phase 3 — Academic Navigation & Information
        │
        ├── Daily Classes menu
        ├── Timetable
        ├── Academic Calendar
        └── Holidays
        │
        ▼
Phase 4 — Marks & Attendance 2.0
        │
        ├── Confirmation
        ├── Editing restrictions
        ├── Assessment naming
        ├── Modification history
        └── Academic graphs
        │
        ▼
Phase 5 — Report Card & Academic Presentation
        │
        ├── Report Card
        ├── CGPA/percentage
        └── Performance views
        │
        ▼
Phase 6 — Communication
        │
        ├── Notices 2.0
        ├── Announcements
        ├── Messaging
        └── Contacts / Help information
        │
        ▼
Phase 7 — Hostel
        │
        └── Hostel allocation + views
        │
        ▼
Phase 8 — Bulk Excel/CSV Import
        │
        ├── Import engine
        ├── Validation
        ├── Preview
        ├── Templates
        └── Transactional import
        │
        ▼
Phase 9 — Audit System
        │
        ├── Audit infrastructure
        ├── Marks/attendance history
        └── Admin audit view
        │
        ▼
Phase 10 — Notifications
        │
        ├── In-app notifications
        └── Mobile push
        │
        ▼
Phase 11 — Admin Search & Analytics
        │
        ├── Global Search
        └── Admin Analytics
        │
        ▼
Phase 12 — Reports & Export
        │
        ├── Report Card export
        ├── Academic reports
        ├── Fee reports
        └── Audit/import reports
        │
        ▼
Phase 13 — Mobile 2.0
        │
        ├── Student
        ├── Teacher
        └── Parent
        │
        ▼
Phase 14 — UX / Accessibility / Performance / Security
        │
        ▼
V2 Release Candidate
        │
        ▼
v2.0.0
```

The exact order can be adjusted after inspecting dependencies in the actual source code.

---

# 26. Feature Completion Workflow

For every meaningful feature:

### Step 1 — Inspect

Inspect the actual current code, database queries, routes, components, and existing behavior.

### Step 2 — Design

Decide:

- Reuse existing table/API?
- Modify existing table/API?
- New table required?
- New backend route?
- Web pages?
- Mobile pages?
- Permission rules?

### Step 3 — Implement

Make the smallest focused change that solves the requirement without unnecessarily rewriting V1.

### Step 4 — Test locally

Test:

- Happy path
- Validation
- Authorization
- Error cases
- Existing V1 regression

### Step 5 — Deploy

Deploy backend/web as required.

### Step 6 — Production test

Verify the deployed version against the real production backend/database environment.

### Step 7 — Mobile

Only implement/rebuild mobile when the feature requires mobile changes.

### Step 8 — Documentation

Update relevant documentation.

### Step 9 — Git checkpoint

Commit and push the completed feature.

---

# 27. Definition of Done

A V2 feature is not complete merely because its screen exists.

It is complete when applicable:

- Database changes are stable
- Backend logic is implemented
- Authorization is enforced
- API behavior is tested
- Web UI is implemented
- Mobile UI is implemented where required
- Validation is handled
- Error states are handled
- Existing V1 behavior still works
- Production deployment is verified
- Documentation is updated
- Git commit is created
- Changes are pushed

For marks, attendance, fees, account changes, and bulk imports, auditability is part of completion where specified.

---

# 28. V2 Final Feature Inventory

The current scope contains these major areas:

1. Authentication & account security
2. Daily Scheduled Classes
3. Timetable
4. Academic Calendar
5. Holidays
6. Academic performance / CGPA / percentage / graphs
7. Attendance 2.0
8. Marks 2.0
9. Results improvements
10. Fees and fee statement improvements
11. Notices 2.0
12. Announcements
13. Academic messaging
14. University/faculty/parent/student contacts
15. University/office help information
16. Hostel information
17. Report Card
18. Excel/CSV bulk import
19. Audit & activity system
20. Notifications
21. Admin Global Search
22. Admin Analytics
23. Reports & Export
24. Mobile 2.0
25. UX/accessibility/performance/security hardening

Explicitly removed from current scope:

- Exam Attendance
- Appointments
- Ticket-style Queries
- Full Hostel ERP
- Social/WhatsApp-style messaging
- Assignment Management (deferred)

---

# 29. Current Status

**V1:** Complete and stable at `v1.0.0`.

**V2:** Scope reviewed and revised. This document represents the current intended V2 scope and implementation direction.

**Next engineering step:** V2 Foundation — inspect and document the actual existing database relationships, backend APIs, authorization model, frontend navigation, mobile navigation, and reusable upload infrastructure before making V2 code changes.

---

## V2 Guiding Principle

> **Build V2 as a controlled evolution of the stable V1 system — reuse what already works, add only what is actually needed, and keep every important rule enforced by the backend.**
