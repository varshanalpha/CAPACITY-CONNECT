import { Link } from 'react-router-dom'
import { ArrowRight, GraduationCap, BookOpen, Shield } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="inline-flex items-center rounded-full bg-blue-50 px-3.5 py-1 text-xs font-semibold text-blue-700 mb-6">
        Capacity Building & Organizational Learning
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
        Capacity Connect Platform
      </h1>
      <p className="mt-4 max-w-2xl text-base text-gray-600 sm:text-lg">
        Unified portal for Trainees, Trainers, and Platform Administrators. Select your designated role and sign in to get started.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          to="/login"
          className="inline-flex items-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
        >
          <span>Access Login Portal</span>
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3 max-w-4xl text-left">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="rounded-lg bg-indigo-50 p-2.5 w-fit text-indigo-600 mb-3">
            <GraduationCap className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">Trainee Access</h3>
          <p className="mt-1 text-xs text-gray-500">
            Access training courses, complete assignments, and track progress.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="rounded-lg bg-emerald-50 p-2.5 w-fit text-emerald-600 mb-3">
            <BookOpen className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">Trainer Hub</h3>
          <p className="mt-1 text-xs text-gray-500">
            Manage cohorts, deliver curriculum, and grade participant assessments.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="rounded-lg bg-slate-100 p-2.5 w-fit text-slate-800 mb-3">
            <Shield className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">Admin Console</h3>
          <p className="mt-1 text-xs text-gray-500">
            User approval workflows, role permissions, and platform settings.
          </p>
        </div>
      </div>
    </div>
  )
}
