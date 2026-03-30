import { createRootRoute, createRoute, Outlet, redirect } from '@tanstack/react-router'
import { Toaster } from 'react-hot-toast'
import { Navbar } from './components/Navbar'
import { HomePage } from './pages/HomePage'
import { DashboardPage } from './pages/DashboardPage'
import { ComparePage } from './pages/ComparePage'

function RootLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'hsl(220 18% 10%)',
            color: 'hsl(210 40% 96%)',
            border: '1px solid hsl(220 16% 18%)',
            borderRadius: '12px',
            fontSize: '13px',
          },
        }}
      />
      <Outlet />
    </div>
  )
}

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: DashboardPage,
})

const compareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/compare',
  component: ComparePage,
})

const compareSelectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/compare/select',
  component: ComparePage,
})

const resultsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/results',
  beforeLoad: () => { throw redirect({ to: '/' }) },
  component: HomePage,
})

export const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  compareRoute,
  compareSelectRoute,
  resultsRoute,
])
