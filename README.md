# University Portal

A full-stack, role-based university/college management system that brings academic administration, teaching operations, student services, parent access, and institutional communication into one platform.

The project now includes both a **production web portal** and an **Android mobile application**, sharing the same backend API and MySQL database.

## 📌 Project Overview

The **University Portal** is designed around four web roles:

- **Admin**
- **Teacher**
- **Student**
- **Parent**

The web portal provides role-specific dashboards and protected workflows for academic and administrative operations. The mobile application currently provides mobile access for:

- **Student**
- **Teacher**
- **Parent**

The **Admin portal remains web-only** in the current V1 release.

The system uses a shared backend and database, so information created or updated through one client can be consumed by the appropriate users through the other client.

---

# 🚀 V1.0.0 Release

The current V1 release has been completed and tagged as:

```text
v1.0.0
```

V1 has been tested across the deployed web portal and the Android mobile application.

### V1 status

- 🌐 Web portal — **Working**
- 📱 Android mobile application — **Working**
- 🔐 Authentication — **Working**
- 🧑‍💼 Admin web portal — **Working**
- 👨‍🏫 Teacher portal — **Working**
- 🎓 Student portal — **Working**
- 👪 Parent portal — **Working**
- 📊 Dashboards — **Working**
- 📅 Attendance — **Working**
- 📝 Marks — **Working**
- 📢 Notices — **Working**
- 💰 Fees and payments — **Working**
- 🗄️ Production database — **Working**
- ☁️ Production backend — **Working**

Future UI refinements and additional mobile capabilities are planned for **V2**.

---

# 🔐 Authentication & Authorization

- JWT-based authentication.
- Password verification using bcrypt.
- Protected role-specific routes.
- Role-based authorization.
- Separate web and mobile authentication behavior.
- Mobile login requests identify themselves using the `X-Client: mobile` header.
- Mobile JWT tokens are stored securely using Expo Secure Store.
- Admin mobile access is intentionally unavailable in V1.

The backend remains the central authentication and authorization layer for both web and mobile clients.

---

# 👨‍💼 Admin Portal

The Admin portal is currently available through the web application.

### Administration

- **Admin Dashboard**
- Student management
- Teacher management
- Parent management
- Course management
- Subject management
- Fee management
- Payment management
- Notice management
- System settings

Relevant frontend pages include:

```text
frontend/src/pages/admin/
├── AdminDashboard.jsx
├── AdminStudents.jsx
├── AdminTeachers.jsx
├── AdminParents.jsx
├── AdminCourses.jsx
├── AdminSubjects.jsx
├── AdminFees.jsx
├── AdminPayments.jsx
├── AdminNotices.jsx
└── AdminSettings.jsx
```

---

# 👨‍🏫 Teacher Portal

Teachers can manage their assigned academic responsibilities.

### Teacher features

- Teacher Dashboard
- Assigned subjects
- Attendance management
- Marks entry and grading
- Notice creation and management
- Profile/settings management

### Attendance

The attendance workflow supports:

- Student roster
- Present/Absent controls
- All Present
- All Absent
- Attendance summary
- Saving attendance records

### Marks

Teachers can:

- Select semester
- Select subject
- Select assessment type
- Open the grading sheet
- Enter student marks
- Save/update grading information

### Notices

Teachers can:

- Select an assigned class
- Create notices
- Add message content
- Upload supported attachments
- Broadcast notices
- View sent notice history
- Edit sent notices
- Delete sent notices

Supported notice attachments:

```text
PDF
DOC
DOCX
Maximum size: 5 MB
```

Relevant pages:

```text
frontend/src/pages/teacher/
├── TeacherDashboard.jsx
├── TeacherSubjects.jsx
├── TeacherAttendance.jsx
├── TeacherMarks.jsx
├── TeacherNotices.jsx
└── TeacherSettings.jsx
```

---

# 🎓 Student Portal

Students can access their academic information through the web portal and Android application.

### Student features

- Student Dashboard
- Subject information
- Attendance
- Results
- Fees
- Notices
- Profile
- Settings

### Academic Dashboard

The dashboard provides information such as:

- Upcoming classes
- Recent notices
- CGPA
- Semester
- Academic information
- Other relevant student statistics

Relevant web pages:

```text
frontend/src/pages/student/
├── StudentDashboard.jsx
├── StudentSubjects.jsx
├── StudentAttendance.jsx
├── StudentResults.jsx
├── StudentFees.jsx
├── StudentNotices.jsx
├── StudentProfile.jsx
└── StudentSettings.jsx
```

---

# 👪 Parent Portal

Parents can monitor information belonging to their linked ward.

### Parent features

- Parent Dashboard
- Ward selection
- Ward profile
- Attendance
- Results
- Fees
- Notices
- Settings

The parent dashboard uses the parent-student relationship to load the selected student's academic information.

Relevant web pages:

```text
frontend/src/pages/parent/
├── ParentDashboard.jsx
├── ParentProfile.jsx
├── ParentAttendance.jsx
├── ParentResults.jsx
├── ParentFees.jsx
├── ParentNotices.jsx
└── ParentSettings.jsx
```

---

# 📱 Android Mobile Application

The project now includes a React Native mobile application built with **Expo** and **Expo Router**.

### Mobile technology

- React Native
- Expo SDK 54
- Expo Router
- TypeScript
- Axios
- Expo Secure Store
- React Navigation
- Expo Document Picker
- Expo Sharing

### Mobile roles available in V1

```text
Student
Teacher
Parent
```

The mobile login automatically routes users according to their role.

```text
Student → /student
Teacher → /teacher
Parent  → /parent
Admin   → Web portal only
```

### Mobile application structure

```text
mobile/
├── app/
│   ├── index.tsx
│   ├── student/
│   │   ├── index.tsx
│   │   ├── subjects.tsx
│   │   ├── attendance.tsx
│   │   ├── results.tsx
│   │   ├── fees.tsx
│   │   ├── notices.tsx
│   │   ├── profile.tsx
│   │   └── settings.tsx
│   │
│   ├── teacher/
│   │   ├── index.tsx
│   │   ├── subjects.tsx
│   │   ├── attendance.tsx
│   │   ├── marks.tsx
│   │   ├── notices.tsx
│   │   └── settings.tsx
│   │
│   └── parent/
│       ├── index.tsx
│       ├── attendance.tsx
│       ├── results.tsx
│       ├── fees.tsx
│       ├── notices.tsx
│       ├── profile.tsx
│       └── settings.tsx
│
├── components/
├── context/
├── hooks/
├── services/
├── constants/
├── assets/
├── app.json
├── eas.json
└── package.json
```

### Mobile API

The mobile application communicates with the production Render backend:

```text
https://university-portal-backend-v0rw.onrender.com
```

The API service uses:

```text
/api
```

and sends:

```text
X-Client: mobile
```

for mobile authentication requests.

The mobile application no longer depends on the developer's local IP address for production builds.

### Android build

The Android application is built using Expo Application Services (EAS).

Example preview/internal build:

```bash
cd mobile
eas build --platform android --profile preview
```

The V1 Android build has been successfully generated and installed on a physical Android device.

---

# 🛠️ Technology Stack

## Backend

- Node.js
- Express.js
- MySQL
- mysql2
- JWT
- bcrypt
- Multer
- CORS
- dotenv

The backend entry point is:

```text
backend/server.js
```

## Web Frontend

- React
- Vite
- React Router
- Axios
- Tailwind CSS
- Lucide React
- Recharts
- React Hot Toast

The web frontend is located in:

```text
frontend/
```

## Mobile Frontend

- React Native
- Expo SDK 54
- Expo Router
- TypeScript
- Axios
- Expo Secure Store
- React Navigation
- Expo Document Picker
- Expo Sharing

The mobile application is located in:

```text
mobile/
```

## Database

- MySQL
- Production database hosted on Aiven

---

# 🗄️ Database

The application uses a MySQL database.

Major application areas include:

```text
Identity
├── users
├── students
├── teachers
└── parents

Relationships
├── parent_student_map
└── teacher_assignments

Academic
├── courses
├── subjects
└── daily_classes

Attendance
└── attendance

Assessment
└── marks

Finance
├── fees
└── payments

Communication
└── notices
```

The frontend and mobile application never connect directly to the database.

All database operations go through the backend API.

---

# 📁 Project Structure

```text
university-portal/
│
├── backend/
│   ├── uploads/
│   ├── seedAdmin.js
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   ├── auth/
│   │   │   ├── parent/
│   │   │   ├── student/
│   │   │   └── teacher/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── mobile/
│   ├── app/
│   │   ├── parent/
│   │   ├── student/
│   │   └── teacher/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── services/
│   ├── constants/
│   ├── assets/
│   ├── app.json
│   ├── eas.json
│   └── package.json
│
└── README.md
```

---

# ⚙️ Installation & Setup

## Prerequisites

- Node.js >= 20
- npm
- MySQL-compatible database
- Expo/EAS CLI for mobile development and builds

---

## 1. Clone the repository

```bash
git clone https://github.com/suraj-86/university-portal-.git
cd university-portal-
```

---

## 2. Backend setup

```bash
cd backend
npm install
```

Configure the required environment variables for the MySQL database and JWT secret.

Do **not** commit production database credentials or JWT secrets to Git.

Start the backend:

```bash
npm start
```

---

## 3. Web frontend setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

For a production build:

```bash
npm run build
```

---

## 4. Mobile setup

Open another terminal:

```bash
cd mobile
npm install
npx expo start
```

For Android development:

```bash
npm run android
```

For an EAS Android preview build:

```bash
eas build --platform android --profile preview
```

---

# ☁️ Production Deployment

The production system uses separate services for each major layer.

| Layer | Technology | Deployment |
|---|---|---|
| Web Frontend | React + Vite | Vercel |
| Backend API | Node.js + Express | Render |
| Database | MySQL | Aiven |
| Mobile App | React Native + Expo | EAS / Android |

### Production URLs

**Web application**

```text
https://university-portal-flax-tau.vercel.app/
```

**Backend API**

```text
https://university-portal-backend-v0rw.onrender.com/
```

The Android application communicates directly with the production Render API.

---

# 🧪 Validation & Audit Status

The project went through an audit and correction cycle before the V1 release.

### Web portal

Verified:

- Role-based authentication
- Protected routes
- Student workflows
- Teacher workflows
- Parent workflows
- Admin workflows
- Attendance
- Marks
- Fees
- Results
- Notices
- Notice attachments
- Notice editing
- Notice deletion
- Parent dashboard data
- Settings
- Production API communication

### Mobile application

Verified on Android:

- Mobile login
- Production API communication
- JWT authentication
- Student portal
- Teacher portal
- Parent portal
- Dashboard data
- Academic pages
- Attendance
- Results
- Fees
- Notices
- Profile/settings
- Role-based navigation

The mobile application was specifically tested against the **production Render backend**, not only the local development server.

---


# 👥 Team

This project was developed and is maintained by:

- **Suraj Kumar** — [GitHub](https://github.com/suraj-86)
- **Patrika** — [GitHub](https://github.com/patrika-123)

---

# 📄 License

This project is licensed under the MIT License.
