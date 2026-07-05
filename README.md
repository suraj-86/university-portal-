# College Management System

A full-stack College/University Management System with three role-based portals — **Admin**, **Teacher**, and **Student** — for managing courses, subjects, attendance, marks, fees, and campus notices.

Built with **React (Vite)** on the frontend, **Express + MySQL** on the backend.

---

## ✨ Features

### Admin Portal
- Dashboard with live system stats (students, faculty, courses, notices)
- Student directory — add / edit / delete student records with course & password management
- Faculty management — add / edit / delete teacher records
- Course catalog management
- Subject directory — assign subjects to courses/semesters and appoint teachers
- Fee ledger overview — collection rate, outstanding dues, per-student breakdown
- Payment transaction ledger
- Campus notice board — post announcements targeted at students, teachers, or everyone

### Teacher Portal
- Dashboard with today's schedule and quick actions
- My Subjects — view assigned subjects, enrollment counts, and schedule new classes
- Attendance — mark daily attendance per session, view attendance history and past sheets
- Marks Entry — enter/edit scores per assessment type (Assignment, Sessional, End Sem), gradebook ledger
- Notices — broadcast messages to a specific class and view official/admin announcements

### Student Portal
- Dashboard — today's schedule, academic trajectory chart (CGPA), campus notices
- Profile — view and edit personal/guardian details, profile picture
- My Subjects — semester-wise subject listing with instructor info
- Attendance — subject-wise attendance breakdown with defaulter warnings
- Results — semester-wise scorecards with grade calculation
- Fees — view fee ledger, pay dues, view payment/transaction history
- Notices — searchable/filterable notice board

---

## 🛠 Tech Stack

**Frontend**
- React 19 + Vite
- React Router DOM v7
- Tailwind CSS v4
- Recharts (charts)
- Lucide React (icons)
- Axios

**Backend**
- Node.js + Express 5
- MySQL2
- CORS

**Database**
- MySQL / MariaDB (schema provided as `database/college_ms.sql`)

---

## 📁 Project Structure

```
├── backend/
│   ├── server.js            # Express API server & all routes
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI (Table, Modal, Sidebar, Navbar, etc.)
│   │   ├── context/         # AuthContext (login/logout/session)
│   │   ├── hooks/           # useAuth
│   │   ├── layouts/         # DashboardLayout (sidebar + navbar shell)
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   ├── teacher/
│   │   │   ├── student/
│   │   │   └── auth/
│   │   ├── routes/          # ProtectedRoute, AppRoutes
│   │   ├── App.jsx          # Route definitions (active)
│   │   └── main.jsx         # App entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── database/
    └── college_ms.sql       # Full MySQL schema
```

---

## ⚙️ Prerequisites

- Node.js **>= 20.0.0**
- MySQL or MariaDB (e.g. via XAMPP)
- npm

---

