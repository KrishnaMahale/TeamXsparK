import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { DashboardPage } from '../pages/DashboardPage'
import { SimulationSetupPage } from '../pages/SimulationSetupPage'
import { NetworkPage } from '../pages/NetworkPage'
import { ForecastsPage } from '../pages/ForecastsPage'
import { ViolationsPage } from '../pages/ViolationsPage'
import { ActionsPage } from '../pages/ActionsPage'
import { ScenariosPage } from '../pages/ScenariosPage'
import { ReportsPage } from '../pages/ReportsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'simulation', element: <SimulationSetupPage /> },
      { path: 'simulation/results', element: <DashboardPage /> },
      { path: 'network', element: <NetworkPage /> },
      { path: 'forecast', element: <ForecastsPage /> },
      { path: 'forecasts', element: <ForecastsPage /> },
      { path: 'violations', element: <ViolationsPage /> },
      { path: 'actions', element: <ActionsPage /> },
      { path: 'scenarios', element: <ScenariosPage /> },
      { path: 'reports', element: <ReportsPage /> },
    ],
  },
])
