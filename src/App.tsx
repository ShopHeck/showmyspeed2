import { createRootRoute, createRoute, Outlet, redirect } from '@tanstack/react-router'
import { HomePage } from './pages/HomePage'
import { DashboardPage } from './pages/DashboardPage'
import { ComparePage } from './pages/ComparePage'

const rootRoute = createRootRoute({
  component: () => <Outlet />,
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
