import { Outlet, Link, useNavigate } from 'react-router-dom'
import { LogIn, LogOut, Layers } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getDashboardPath } from '../services/authService'

export default function RootLayout() {
  const navigate = useNavigate()
  const { profile, logout, isAuthenticated, isApproved, isPending } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const dashboardPath = isPending
    ? '/pending-approval'
    : isApproved && profile?.role
    ? getDashboardPath(profile.role)
    : '/login'

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col justify-between">
      <div>
        <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
            <Link to="/" className="flex items-center space-x-2.5">
              <div className="rounded-lg bg-blue-600 p-1.5 text-white">
                <Layers className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-gray-900">
                Capacity Connect
              </span>
            </Link>

            <nav className="flex items-center space-x-3">
              <Link
                to="/"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
              >
                Home
              </Link>

              {isAuthenticated ? (
                <div className="flex items-center space-x-3 pl-2 border-l border-gray-200">
                  <Link
                    to={dashboardPath}
                    className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition capitalize"
                  >
                    {isPending ? 'Pending Approval' : `${profile?.role || 'My'} Dashboard`}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    <LogOut className="mr-1 h-3.5 w-3.5" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
                >
                  <LogIn className="mr-1.5 h-3.5 w-3.5" />
                  Sign In
                </Link>
              )}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-500">
        <p>© {new Date().getFullYear()} Capacity Connect. Organizational Learning & Capacity Building Platform.</p>
      </footer>
    </div>
  )
}
