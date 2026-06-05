import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { ArchivePage } from '../../features/archives/pages/ArchivePage'
import { ClassDetailsPage } from '../../features/classes/pages/ClassDetailsPage'
import { AnalyticsDashboardPage } from '../../features/analytics/pages/AnalyticsDashboardPage'
import { ProfessorClassesPage } from '../../features/classes/pages/ProfessorClassesPage'
import { StudentClassesPage } from '../../features/classes/pages/StudentClassesPage'
import { ForgotPasswordPage } from '../../features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '../../features/auth/pages/LoginPage'
import { RegisterPage } from '../../features/auth/pages/RegisterPage'
import { ResetPasswordPage } from '../../features/auth/pages/ResetPasswordPage'
import { RoleRedirectPage } from '../../features/auth/pages/RoleRedirectPage'
import { LandingPage } from '../../features/marketing/pages/LandingPage'
import { USER_ROLES } from '../../features/auth/constants/roles'
import { GroupsPage } from '../../features/groups/pages/GroupsPage'
import { StudentGroupDetailsPage } from '../../features/groups/pages/StudentGroupDetailsPage'
import { ContributionsPage } from '../../features/contributions/pages/ContributionsPage'
import { CurriculumDetailsPage } from '../../features/curriculum/pages/CurriculumDetailsPage'
import { CurriculumManagementPage } from '../../features/curriculum/pages/CurriculumManagementPage'
import { MessagesPage } from '../../features/messages/pages/MessagesPage'
import { NotificationCenterPage } from '../../features/notifications/pages/NotificationCenterPage'
import { ProjectHealthDashboardPage } from '../../features/health/pages/ProjectHealthDashboardPage'
import { ProfessorDashboardPage } from '../../features/profiles/pages/ProfessorDashboardPage'
import { ProfilePage } from '../../features/profiles/pages/ProfilePage'
import { ProgressDashboardPage } from '../../features/progress/pages/ProgressDashboardPage'
import { ProjectDetailsPage } from '../../features/projects/pages/ProjectDetailsPage'
import { ProjectValidationPage } from '../../features/validations/pages/ProjectValidationPage'
import { ProjectsPage } from '../../features/projects/pages/ProjectsPage'
import { ReassignmentsPage } from '../../features/reassignments/pages/ReassignmentsPage'
import { StudentDashboardPage } from '../../features/profiles/pages/StudentDashboardPage'
import { SyllabusManagementPage } from '../../features/syllabus/pages/SyllabusManagementPage'
import { TasksPage } from '../../features/tasks/pages/TasksPage'
import { TaskDetailsPage } from '../../features/tasks/pages/TaskDetailsPage'
import { TaskGenerationPage } from '../../features/planning/pages/TaskGenerationPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<RoleRedirectPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute allowedRoles={[USER_ROLES.STUDENT]} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/notifications" element={<NotificationCenterPage />} />
            <Route path="/student/dashboard" element={<StudentDashboardPage />} />
            <Route path="/student/profile" element={<ProfilePage />} />
            <Route path="/student/classes" element={<StudentClassesPage />} />
            <Route path="/student/classes/:id" element={<ClassDetailsPage />} />
            <Route path="/student/projects" element={<ProjectsPage />} />
            <Route path="/student/projects/:id" element={<ProjectDetailsPage />} />
            <Route path="/student/groups" element={<GroupsPage />} />
            <Route path="/student/groups/:groupId" element={<StudentGroupDetailsPage />} />
            <Route path="/student/tasks" element={<TasksPage />} />
            <Route path="/student/tasks/ai-planner" element={<TaskGenerationPage />} />
            <Route path="/student/tasks/:taskId" element={<TaskDetailsPage />} />
            <Route path="/student/submissions" element={<Navigate to="/student/tasks" replace />} />
            <Route path="/student/progress" element={<ProgressDashboardPage />} />
            <Route path="/student/health" element={<ProjectHealthDashboardPage />} />
            <Route path="/student/contributions" element={<ContributionsPage />} />
            <Route path="/student/reassignments" element={<ReassignmentsPage />} />
            <Route path="/student/messages" element={<MessagesPage />} />
            <Route path="/student/analytics" element={<Navigate to="/student/dashboard" replace />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[USER_ROLES.PROFESSOR]} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/professor/notifications" element={<NotificationCenterPage />} />
            <Route path="/professor/dashboard" element={<ProfessorDashboardPage />} />
            <Route path="/professor/profile" element={<ProfilePage />} />
            <Route path="/professor/classes" element={<ProfessorClassesPage />} />
            <Route path="/professor/classes/:id" element={<ClassDetailsPage />} />
            <Route path="/professor/projects" element={<ProjectsPage />} />
            <Route path="/professor/projects/:id" element={<ProjectDetailsPage />} />
            <Route path="/professor/projects/:id/validation" element={<ProjectValidationPage />} />
            <Route path="/professor/groups" element={<GroupsPage />} />
            <Route path="/professor/groups/:groupId" element={<StudentGroupDetailsPage />} />
            <Route path="/professor/tasks" element={<TasksPage />} />
            <Route path="/professor/tasks/ai-planner" element={<TaskGenerationPage />} />
            <Route path="/professor/tasks/:taskId" element={<TaskDetailsPage />} />
            <Route path="/professor/archive" element={<ArchivePage />} />
            <Route path="/professor/submissions" element={<Navigate to="/professor/tasks" replace />} />
            <Route path="/professor/progress" element={<ProgressDashboardPage />} />
            <Route path="/professor/health" element={<ProjectHealthDashboardPage />} />
            <Route path="/professor/contributions" element={<ContributionsPage />} />
            <Route path="/professor/reassignments" element={<ReassignmentsPage />} />
            <Route path="/professor/messages" element={<MessagesPage />} />
            <Route path="/professor/curriculum" element={<CurriculumManagementPage />} />
            <Route path="/professor/curriculum/:id" element={<CurriculumDetailsPage />} />
            <Route path="/professor/syllabi" element={<SyllabusManagementPage />} />
            <Route path="/professor/analytics" element={<AnalyticsDashboardPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
