import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { EntitiesPage } from './pages/EntitiesPage'
import { WatchlistPage } from './pages/WatchlistPage'
import { NotesPage } from './pages/NotesPage'
import { PasswordResetPage } from './pages/PasswordResetPage'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/password-reset" element={<PasswordResetPage />} />
        <Route path="/entities" element={<EntitiesPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/notes" element={<NotesPage />} />
      </Routes>
    </Layout>
  )
}

export default App
