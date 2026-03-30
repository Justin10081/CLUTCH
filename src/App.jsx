import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import ClutchMode from './pages/ClutchMode'
import GPASimulator from './pages/GPASimulator'
import Deadlines from './pages/Deadlines'
import NotFound from './pages/NotFound'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="relative">
        <div className="w-10 h-10 rounded-full border-2 border-accent-500/20" />
        <div className="w-10 h-10 rounded-full border-2 border-transparent border-t-accent-500 animate-spin absolute inset-0" />
      </div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <Signup />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clutch" element={<ClutchMode />} />
        <Route path="/gpa" element={<GPASimulator />} />
        <Route path="/deadlines" element={<Deadlines />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
