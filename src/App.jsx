import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import TicketForm from './components/TicketForm'
import AdminDashboard from './components/AdminDashboard'
import Login from './pages/Login'
import NotificationManager from './components/NotificationManager'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LogOut } from 'lucide-react'
import iconPetroleum from './assets/branding/icon_petroleum.png'

function PrivateRoute({ children, requiredRole }) {
  const { user, role, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div>Carregando...</div>
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" replace />
  }

  return children
}

function NavBar() {
  const { user, role, signOut } = useAuth()
  
  if (!user) return null

  return (
    <nav className="bg-[#367588] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
                <img className="h-8 w-8 mr-2" src={iconPetroleum} alt="Logo" />
                <span className="text-white font-bold text-xl">Suporte Interno</span>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link to="/" className="text-white hover:bg-white/20 px-3 py-2 rounded-md text-sm font-medium">Novo Chamado</Link>
                {role === 'ti' && (
                  <Link to="/admin" className="text-white hover:bg-white/20 px-3 py-2 rounded-md text-sm font-medium">Área Administrativa</Link>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center">
              <span className="text-white text-sm mr-4 hidden md:block">Olá, {user.email}</span>
              <button 
                onClick={signOut}
                className="text-white hover:bg-white/20 p-2 rounded-full"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <NavBar />
          <NotificationManager />
          <main className="flex-grow py-10">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <PrivateRoute>
                  <TicketForm />
                </PrivateRoute>
              } />
              <Route path="/admin" element={
                <PrivateRoute requiredRole="ti">
                  <AdminDashboard />
                </PrivateRoute>
              } />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
