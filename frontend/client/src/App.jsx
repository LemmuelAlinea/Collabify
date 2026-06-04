import { AuthProvider } from './features/auth/context/AuthContext'
import { AppRouter } from './app/router/AppRouter'
import { AnalyticsProvider } from './features/analytics/context/AnalyticsContext'
import { NotificationProvider } from './features/notifications/context/NotificationContext'
import { ThemeProvider } from './app/providers/ThemeProvider'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <AnalyticsProvider>
            <AppRouter />
          </AnalyticsProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
