import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import Dashboard from '../pages/Dashboard'
import AssetsPage from '../pages/AssetsPage'
import LoginPage from '../pages/LoginPage'
import UserManagementPage from '../pages/UserManagementPage'
import ToolsPage from '../pages/ToolsPage'
import ToolDetailPage from '../pages/ToolDetailPage'
import LexiconPage from '../pages/LexiconPage'
import AgentDetailPage from '../pages/AgentDetailPage'
import CoursesPage from '../pages/CoursesPage'
import CourseDetailPage from '../pages/CourseDetailPage'
import LearnerAdminPage from '../pages/LearnerAdminPage'
import LessonJsonDesignPage from '../pages/LessonJsonDesignPage'
import CourseAgentStudioPage from '../pages/course-agent-studio/CourseAgentStudioPage'
import ProtectedRoute from '../auth/ProtectedRoute'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="courses/:courseId" element={<CourseDetailPage />} />
          <Route path="lexicon" element={<LexiconPage />} />
          <Route element={<ProtectedRoute requireSuperAdmin />}>
            <Route path="users" element={<UserManagementPage />} />
            <Route path="learner-admin" element={<LearnerAdminPage />} />
            <Route path="lesson-json-design" element={<LessonJsonDesignPage />} />
            <Route path="tools" element={<ToolsPage />} />
            <Route path="tools/:toolId" element={<ToolDetailPage />} />
            <Route path="agents/:agentId" element={<AgentDetailPage />} />
            <Route path="course-agent-studio" element={<CourseAgentStudioPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
