import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { EntitiesPage } from './pages/EntitiesPage'
import { WatchlistPage } from './pages/WatchlistPage'
import { NotesPage } from './pages/NotesPage'
import { PaperTradingPage } from './pages/PaperTradingPage'
import { CalendarPage } from './pages/CalendarPage'
import { EntityDetailPage } from './pages/EntityDetailPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/entities" element={<EntitiesPage />} />
          <Route path="/entities/:symbol" element={<EntityDetailPage />} />
          <Route
            path="/watchlist"
            element={
              <ProtectedRoute>
                <WatchlistPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/paper-trading"
            element={
              <ProtectedRoute>
                <PaperTradingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <CalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes"
            element={
              <ProtectedRoute>
                <NotesPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </AuthProvider>
  )
}

export default App
