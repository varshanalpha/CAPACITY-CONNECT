import { createBrowserRouter } from 'react-router-dom'
import RootLayout from '../layouts/RootLayout'
import Home from '../pages/Home'
import Login from '../pages/Login'
import Signup from '../pages/auth/Signup'
import TraineeDashboard from '../pages/trainee/TraineeDashboard'
import TrainerDashboard from '../pages/trainer/TrainerDashboard'
import AdminDashboard from '../pages/admin/AdminDashboard'
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
        path: 'trainer/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['trainer']}>
            <TrainerDashboard />
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
        path: '*',
        element: <NotFound />,
      },
    ],
  },
])
