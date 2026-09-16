import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { useAuthStore } from './store/useAuthStore'

export default function App() {
  const initAuth = useAuthStore((state) => state.initAuth)

  useEffect(() => {
    const cleanupPromise = initAuth()
    return () => {
      if (typeof cleanupPromise === 'function') {
        cleanupPromise()
      } else if (cleanupPromise && typeof cleanupPromise.then === 'function') {
        cleanupPromise.then((unsub) => {
          if (typeof unsub === 'function') unsub()
        })
      }
    }
  }, [initAuth])

  return <RouterProvider router={router} />
}
