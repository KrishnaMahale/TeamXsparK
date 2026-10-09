import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { RouteError } from '../components/layout/RouteError'
import { HomePage } from '../pages/HomePage'
import { SimulationSetupPage } from '../pages/SimulationSetupPage'
import { NetworkPage } from '../pages/NetworkPage'
import { ForecastsPage } from '../pages/ForecastsPage'
import { ViolationsPage } from '../pages/ViolationsPage'
import { ActionsPage } from '../pages/ActionsPage'
import { ReportsPage } from '../pages/ReportsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'home', element: <HomePage /> },
      { path: 'overview', element: <Navigate to="/home" replace /> },
      { path: 'simulation', element: <SimulationSetupPage /> },
      { path: 'simulation/results', element: <Navigate to="/simulation" replace /> },
      { path: 'network', element: <NetworkPage /> },
      { path: 'forecast', element: <ForecastsPage /> },
      { path: 'forecasts', element: <ForecastsPage /> },
      { path: 'violations', element: <ViolationsPage /> },
      { path: 'actions', element: <ActionsPage /> },
      { path: 'scenarios', element: <Navigate to="/home" replace /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

