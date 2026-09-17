import { createBrowserRouter } from 'react-router-dom'
import RootLayout from '../layouts/RootLayout'
import Home from '../pages/Home'
import Login from '../pages/Login'
import Signup from '../pages/auth/Signup'
import TraineeDashboard from '../pages/trainee/TraineeDashboard'
import TraineeProfile from '../pages/trainee/TraineeProfile'
import TraineeTrainingProgrammes from '../pages/trainee/TraineeTrainingProgrammes'
import TraineeProgrammeAssessments from '../pages/trainee/TraineeProgrammeAssessments'
import TraineeTakeAssessment from '../pages/trainee/TraineeTakeAssessment'
import TrainerDashboard from '../pages/trainer/TrainerDashboard'
import TrainerProfile from '../pages/trainer/TrainerProfile'
import TrainerTrainingProgrammes from '../pages/trainer/TrainerTrainingProgrammes'
import TrainerProgrammeResources from '../pages/trainer/TrainerProgrammeResources'
import TrainerProgrammeAssessments from '../pages/trainer/TrainerProgrammeAssessments'
import TrainerAssessmentBuilder from '../pages/trainer/TrainerAssessmentBuilder'
import AdminDashboard from '../pages/admin/AdminDashboard'
import AdminTrainingProgrammes from '../pages/admin/AdminTrainingProgrammes'
import PendingApproval from '../pages/auth/PendingApproval'
import AccessDenied from '../pages/auth/AccessDenied'
import NotFound from '../pages/NotFound'
import ProtectedRoute from '../components/ProtectedRoute'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'signup',
        element: <Signup />,
      },
      {
        path: 'pending-approval',
        element: (
          <ProtectedRoute>
            <PendingApproval />
          </ProtectedRoute>
        ),
      },
      {
        path: 'access-denied',
        element: <AccessDenied />,
      },
      {
        path: 'trainee/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['trainee']}>
            <TraineeDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trainee/profile',
        element: (
          <ProtectedRoute allowedRoles={['trainee']}>
            <TraineeProfile />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trainee/training-programmes',
        element: (
          <ProtectedRoute allowedRoles={['trainee']}>
            <TraineeTrainingProgrammes />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trainee/training-programmes/:programmeId/assessments',
        element: (
          <ProtectedRoute allowedRoles={['trainee']}>
            <TraineeProgrammeAssessments />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trainee/assessments/:assessmentId/take',
        element: (
          <ProtectedRoute allowedRoles={['trainee']}>
            <TraineeTakeAssessment />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trainer/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['trainer']}>
            <TrainerDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trainer/profile',
        element: (
          <ProtectedRoute allowedRoles={['trainer']}>
            <TrainerProfile />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trainer/training-programmes',
        element: (
          <ProtectedRoute allowedRoles={['trainer']}>
            <TrainerTrainingProgrammes />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trainer/training-programmes/:programmeId/resources',
        element: (
          <ProtectedRoute allowedRoles={['trainer']}>
            <TrainerProgrammeResources />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trainer/training-programmes/:programmeId/assessments',
        element: (
          <ProtectedRoute allowedRoles={['trainer']}>
            <TrainerProgrammeAssessments />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trainer/assessments/:assessmentId',
        element: (
          <ProtectedRoute allowedRoles={['trainer']}>
            <TrainerAssessmentBuilder />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/training-programmes',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminTrainingProgrammes />
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
])
