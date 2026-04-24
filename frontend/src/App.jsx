import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import AdminDashboard from './pages/admin/admin'
import CustomerDashboard from './pages/customer/customer'
import TechnicianDashboard from './pages/technician/technician'
import SupervisorDashboard from './pages/supervisor/supervisor'
import CustomerLogin from './pages/auth/CustomerLogin'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Public routes */}
          <Route path="/"        element={<Navigate to="/login" replace />} />
          <Route path="/login"   element={<LoginPage />} />
          <Route path="/signup"  element={<SignupPage />} />

          {/* Admin dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard/></ProtectedRoute>} />

          {/* Supervisor dashboard */}
          <Route path="/supervisor" element={<ProtectedRoute allowedRoles={["supervisor"]}><SupervisorDashboard/></ProtectedRoute>} />

          {/* Technician dashboard */}
          <Route path="/technician" element={<ProtectedRoute allowedRoles={["technician"]}><TechnicianDashboard/></ProtectedRoute>} />

          {/* Customer dashboard */}
          <Route path="/customer" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerDashboard/></ProtectedRoute>} />

          {/* Customer OTP login (public) */}
          <Route path="/customer-login" element={<CustomerLogin/>} />

          {/* Unauthorized */}
          <Route
            path="/unauthorized"
            element={
              <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <h1 className="text-2xl">Access Denied</h1>
              </div>
            }
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
