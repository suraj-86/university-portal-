import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';

// 1. Core & Layouts
import Login from './pages/auth/Login';
import DashboardLayout from './layouts/DashboardLayout';
import NotFound from './pages/NotFound';
import ProtectedRoute from './routes/ProtectedRoute';

// 2. Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentProfile from './pages/student/StudentProfile';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentFees from './pages/student/StudentFees';
import StudentNotices from './pages/student/StudentNotices';
import StudentResults from './pages/student/StudentResults';
import StudentSubjects from './pages/student/StudentSubjects';
import StudentSettings from './pages/student/StudentSettings';

// 3. Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminStudents from './pages/admin/AdminStudents';
import AdminTeachers from './pages/admin/AdminTeachers';
import AdminCourses from './pages/admin/AdminCourses';
import AdminSubjects from './pages/admin/AdminSubjects';
import AdminParents from './pages/admin/AdminParents';
import AdminSettings from './pages/admin/AdminSettings';
import AdminFees from './pages/admin/AdminFees';
import AdminPayments from './pages/admin/AdminPayments';
import AdminNotices from './pages/admin/AdminNotices';

// 4. Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherAttendance from './pages/teacher/TeacherAttendance';
import TeacherMarks from './pages/teacher/TeacherMarks';
import TeacherSubjects from './pages/teacher/TeacherSubjects';
import TeacherNotices from './pages/teacher/TeacherNotices';
import TeacherSettings from './pages/teacher/TeacherSettings';

// 5. Parent Pages
import ParentDashboard from './pages/parent/ParentDashboard';
import ParentProfile from './pages/parent/ParentProfile';
import ParentFees from './pages/parent/ParentFees';
import ParentResults from './pages/parent/ParentResults';
import ParentNotices from './pages/parent/ParentNotices';
import ParentSettings from './pages/parent/ParentSettings';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
<Toaster
  position="top-center"
  toastOptions={{
    success: {
      style: {
        background: '#ecfdf5',
        color: '#047857',
        fontWeight: 600,
        border: '1px solid #a7f3d0',
      },
      iconTheme: {
        primary: '#059669',
        secondary: '#ecfdf5',
      },
    },
    error: {
      style: {
        background: '#fef2f2',
        color: '#b91c1c',
        fontWeight: 600,
        border: '1px solid #fecaca',
      },
      iconTheme: {
        primary: '#dc2626',
        secondary: '#fef2f2',
      },
    },
  }}
/>
        <Routes>
          {/* Public Login Route */}
          <Route path="/" element={<Login />} />

          {/* Protected Portal Routes (Wrapped in the Sidebar Layout) */}
          <Route element={<DashboardLayout />}>

            {/* --- STUDENT ROUTES --- */}
            <Route path="/student-dashboard" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/profile" element={<ProtectedRoute role="student"><StudentProfile /></ProtectedRoute>} />
            <Route path="/student/attendance" element={<ProtectedRoute role="student"><StudentAttendance /></ProtectedRoute>} />
            <Route path="/student/fees" element={<ProtectedRoute role="student"><StudentFees /></ProtectedRoute>} />
            <Route path="/student/notices" element={<ProtectedRoute role="student"><StudentNotices /></ProtectedRoute>} />
            <Route path="/student/results" element={<ProtectedRoute role="student"><StudentResults /></ProtectedRoute>} />
            <Route path="/student/subjects" element={<ProtectedRoute role="student"><StudentSubjects /></ProtectedRoute>} />
            <Route path="/student/settings" element={<ProtectedRoute role="student"><StudentSettings /></ProtectedRoute>} />

            {/* --- ADMIN ROUTES --- */}
            <Route path="/admin-dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/students" element={<ProtectedRoute role="admin"><AdminStudents /></ProtectedRoute>} />
            <Route path="/admin/teachers" element={<ProtectedRoute role="admin"><AdminTeachers /></ProtectedRoute>} />
            <Route path="/admin/courses" element={<ProtectedRoute role="admin"><AdminCourses /></ProtectedRoute>} />
            <Route path="/admin/subjects" element={<ProtectedRoute role="admin"><AdminSubjects /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute role="admin"><AdminSettings /></ProtectedRoute>} />
            <Route path="/admin/fees" element={<ProtectedRoute role="admin"><AdminFees /></ProtectedRoute>} />
            <Route path="/admin/payments" element={<ProtectedRoute role="admin"><AdminPayments /></ProtectedRoute>} />
            <Route path="/admin/notices" element={<ProtectedRoute role="admin"><AdminNotices /></ProtectedRoute>} />
            <Route path="/admin/parents" element={<ProtectedRoute role="admin"><AdminParents /></ProtectedRoute>} />

            {/* --- TEACHER ROUTES --- */}
            <Route path="/teacher-dashboard" element={<ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/attendance" element={<ProtectedRoute role="teacher"><TeacherAttendance /></ProtectedRoute>} />
            <Route path="/teacher/marks" element={<ProtectedRoute role="teacher"><TeacherMarks /></ProtectedRoute>} />
            <Route path="/teacher/subjects" element={<ProtectedRoute role="teacher"><TeacherSubjects /></ProtectedRoute>} />
            <Route path="/teacher/notices" element={<ProtectedRoute role="teacher"><TeacherNotices /></ProtectedRoute>} />
            <Route path="/teacher/settings" element={<ProtectedRoute role="teacher"><TeacherSettings /></ProtectedRoute>} />

            {/* --- PARENT ROUTES --- */}
            <Route path="/parent-dashboard" element={<ProtectedRoute role="parent"><ParentDashboard /></ProtectedRoute>} />
            <Route path="/parent/profile" element={<ProtectedRoute role="parent"><ParentProfile /></ProtectedRoute>} />
            <Route path="/parent/fees" element={<ProtectedRoute role="parent"><ParentFees /></ProtectedRoute>} />
            <Route path="/parent/results" element={<ProtectedRoute role="parent"><ParentResults /></ProtectedRoute>} />
            <Route path="/parent/notices" element={<ProtectedRoute role="parent"><ParentNotices /></ProtectedRoute>} />
            <Route path="/parent/settings" element={<ProtectedRoute role="parent"><ParentSettings /></ProtectedRoute>} />

          </Route>

          {/* Catch-All 404 Route (Outside the layout so it stays full-screen!) */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;