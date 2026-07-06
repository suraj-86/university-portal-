import { Navigate, useRoutes } from 'react-router-dom'
import Login from '../pages/auth/Login.jsx'

// Admin Pages
import AdminDashboard from '../pages/admin/AdminDashboard.jsx'
import AdminStudents from '../pages/admin/AdminStudents.jsx'
import AdminTeachers from '../pages/admin/AdminTeachers.jsx'
import AdminParents from '../pages/admin/AdminParents.jsx' // <-- Added
import AdminCourses from '../pages/admin/AdminCourses.jsx'
import AdminSubjects from '../pages/admin/AdminSubjects.jsx'
import AdminFees from '../pages/admin/AdminFees.jsx'
import AdminPayments from '../pages/admin/AdminPayments.jsx'
import AdminNotices from '../pages/admin/AdminNotices.jsx'
import AdminSettings from '../pages/admin/AdminSettings.jsx';

// Teacher Pages
import TeacherDashboard from '../pages/teacher/TeacherDashboard.jsx'
import TeacherSubjects from '../pages/teacher/TeacherSubjects.jsx'
import TeacherAttendance from '../pages/teacher/TeacherAttendance.jsx'
import TeacherMarks from '../pages/teacher/TeacherMarks.jsx'
import TeacherNotices from '../pages/teacher/TeacherNotices.jsx'
import TeacherSettings from '../pages/teacher/TeacherSettings.jsx';

// Student Pages
import StudentDashboard from '../pages/student/StudentDashboard.jsx'
import StudentSubjects from '../pages/student/StudentSubjects.jsx'
import StudentAttendance from '../pages/student/StudentAttendance.jsx'
import StudentProfile from '../pages/student/StudentProfile.jsx'
import StudentResults from '../pages/student/StudentResults.jsx'
import StudentFees from '../pages/student/StudentFees.jsx'
import StudentNotices from '../pages/student/StudentNotices.jsx'
import StudentSettings from '../pages/student/StudentSettings.jsx';

// Parent Pages (NEW)
import ParentDashboard from '../pages/parent/ParentDashboard.jsx'
import ParentProfile from '../pages/parent/ParentProfile.jsx' // ADDED THIS LINE
import ParentFees from '../pages/parent/ParentFees.jsx'
import ParentResults from '../pages/parent/ParentResults.jsx'
import ParentNotices from '../pages/parent/ParentNotices.jsx'
import ParentSettings from '../pages/parent/ParentSettings.jsx';

// Layout & Core
import NotFound from '../pages/NotFound.jsx'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'

const AppRoutes = () => {
  const routes = [
    { path: '/', element: <Navigate to="/login" replace /> },
    { path: '/login', element: <Login /> },

    // --- ADMIN ROUTES ---
    {
      path: '/admin',
      element: (
        <ProtectedRoute role="admin">
          <DashboardLayout role="admin">
            <AdminDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/admin/students',
      element: (
        <ProtectedRoute role="admin">
          <DashboardLayout role="admin">
            <AdminStudents />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/admin/teachers',
      element: (
        <ProtectedRoute role="admin">
          <DashboardLayout role="admin">
            <AdminTeachers />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/admin/parents',
      element: (
        <ProtectedRoute role="admin">
          <DashboardLayout role="admin">
            <AdminParents />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/admin/courses',
      element: (
        <ProtectedRoute role="admin">
          <DashboardLayout role="admin">
            <AdminCourses />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/admin/subjects',
      element: (
        <ProtectedRoute role="admin">
          <DashboardLayout role="admin">
            <AdminSubjects />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/admin/fees',
      element: (
        <ProtectedRoute role="admin">
          <DashboardLayout role="admin">
            <AdminFees />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/admin/settings',
      element: (
        <ProtectedRoute role="admin">
          <DashboardLayout role="admin">
            <AdminSettings />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/admin/payments',
      element: (
        <ProtectedRoute role="admin">
          <DashboardLayout role="admin">
            <AdminPayments />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/admin/notices',
      element: (
        <ProtectedRoute role="admin">
          <DashboardLayout role="admin">
            <AdminNotices />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },

    // --- TEACHER ROUTES ---
    {
      path: '/teacher',
      element: (
        <ProtectedRoute role="teacher">
          <DashboardLayout role="teacher">
            <TeacherDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/teacher/subjects',
      element: (
        <ProtectedRoute role="teacher">
          <DashboardLayout role="teacher">
            <TeacherSubjects />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/teacher/attendance',
      element: (
        <ProtectedRoute role="teacher">
          <DashboardLayout role="teacher">
            <TeacherAttendance />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/teacher/marks-entry',
      element: (
        <ProtectedRoute role="teacher">
          <DashboardLayout role="teacher">
            <TeacherMarks />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/teacher/notices',
      element: (
        <ProtectedRoute role="teacher">
          <DashboardLayout role="teacher">
            <TeacherNotices />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/teacher/settings',
      element: (
        <ProtectedRoute role="teacher">
          <DashboardLayout role="teacher">
            <TeacherSettings />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },

    // --- STUDENT ROUTES ---
    {
      path: '/student',
      element: (
        <ProtectedRoute role="student">
          <DashboardLayout role="student">
            <StudentDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/student/subjects',
      element: (
        <ProtectedRoute role="student">
          <DashboardLayout role="student">
            <StudentSubjects />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/student/attendance',
      element: (
        <ProtectedRoute role="student">
          <DashboardLayout role="student">
            <StudentAttendance />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/student/profile',
      element: (
        <ProtectedRoute role="student">
          <DashboardLayout role="student">
            <StudentProfile />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/student/results',
      element: (
        <ProtectedRoute role="student">
          <DashboardLayout role="student">
            <StudentResults />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/student/fees',
      element: (
        <ProtectedRoute role="student">
          <DashboardLayout role="student">
            <StudentFees />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/student/notices',
      element: (
        <ProtectedRoute role="student">
          <DashboardLayout role="student">
            <StudentNotices />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/student/settings',
      element: (
        <ProtectedRoute role="student">
          <DashboardLayout role="student">
            <StudentSettings />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },

    // --- PARENT ROUTES ---
    {
      path: '/parent-dashboard',
      element: (
        <ProtectedRoute role="parent">
          <DashboardLayout role="parent">
            <ParentDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/parent/fees',
      element: (
        <ProtectedRoute role="parent">
          <DashboardLayout role="parent">
            <ParentFees />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/parent/results',
      element: (
        <ProtectedRoute role="parent">
          <DashboardLayout role="parent">
            <ParentResults />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/parent/notices',
      element: (
        <ProtectedRoute role="parent">
          <DashboardLayout role="parent">
            <ParentNotices />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/parent/profile',
      element: (
        <ProtectedRoute role="parent">
          <DashboardLayout role="parent">
            <ParentProfile />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },
    {
      path: '/parent/settings',
      element: (
        <ProtectedRoute role="parent">
          <DashboardLayout role="parent">
            <ParentSettings />
          </DashboardLayout>
        </ProtectedRoute>
      ),
    },

    // --- CATCH-ALL ---
    { path: '*', element: <NotFound /> },
  ]

  return useRoutes(routes)
}

export default AppRoutes