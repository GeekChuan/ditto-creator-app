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
import CreatorProfilePage from '../pages/CreatorProfilePage'
import LearnerAdminPage from '../pages/LearnerAdminPage'
import LessonJsonDesignPage from '../pages/LessonJsonDesignPage'
import LessonJsonDesignV2Page from '../pages/lesson-json-design-v2/LessonJsonDesignV2Page'
import CourseAgentStudioPage from '../pages/course-agent-studio/CourseAgentStudioPage'
import BenefitsPage from '../pages/BenefitsPage'
import ImageCreativePage from '../pages/ImageCreativePage'
import LessonImageGenPage from '../pages/LessonImageGenPage'
import LessonImageGenV2Page from '../pages/lesson-image-gen-v2/LessonImageGenV2Page'
import SubtitleTimingPage from '../pages/SubtitleTimingPage'
import VoiceClonePage from '../pages/VoiceClonePage'
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
          <Route path="creator-profile" element={<CreatorProfilePage />} />
          <Route path="benefits" element={<BenefitsPage />} />
          <Route path="lexicon" element={<LexiconPage />} />
          <Route path="image-creative" element={<ImageCreativePage />} />
          <Route path="subtitle-timing" element={<SubtitleTimingPage />} />
          <Route element={<ProtectedRoute requireSuperAdmin />}>
            <Route path="lesson-image-gen" element={<LessonImageGenPage />} />
            <Route path="lesson-image-gen-v2" element={<LessonImageGenV2Page />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="learner-admin" element={<LearnerAdminPage />} />
            <Route path="lesson-json-design" element={<LessonJsonDesignPage />} />
            <Route path="lesson-json-design-v2" element={<LessonJsonDesignV2Page />} />
            <Route path="tools" element={<ToolsPage />} />
            <Route path="tools/:toolId" element={<ToolDetailPage />} />
            <Route path="agents/:agentId" element={<AgentDetailPage />} />
            <Route path="course-agent-studio" element={<CourseAgentStudioPage />} />
            <Route path="voice-clone" element={<VoiceClonePage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
