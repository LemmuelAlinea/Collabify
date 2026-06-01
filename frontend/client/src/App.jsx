import { AuthProvider } from './features/auth/context/AuthContext'
import { AppRouter } from './app/router/AppRouter'
import { AnalyticsProvider } from './features/analytics/context/AnalyticsContext'
import { NotificationProvider } from './features/notifications/context/NotificationContext'

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AnalyticsProvider>
          <AppRouter />
        </AnalyticsProvider>
      </NotificationProvider>
    </AuthProvider>
  )
}

export default App
