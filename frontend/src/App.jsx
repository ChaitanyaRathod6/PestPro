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
import JobDetailPage from './pages/technician/JobDetailPage'
import MyJobsPage from './pages/technician/MyJobsPage'
import AdminJobsPage from './pages/admin/AdminJobsPage'
import AdminJobDetailPage from './pages/admin/AdminJobDetailPage'
import AdminCustomersPage from './pages/admin/AdminCustomersPage'
import AdminCustomerDetailPage from './pages/admin/Admincustomersdetailpage'
import AdminTechniciansPage from './pages/admin/AdminTechinciansPage'
import AdminTechnicianDetailPage from './pages/admin/AdminStaffDetailPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import AdminAlertsPage from './pages/admin/AdminSmartAlerts'
import AdminAlertDetailPage from './pages/admin/AdminSmartAlertDetailPge'
import AdminReportsPage from './pages/admin/AdminReportsPage'
import AdminReportDetailPage from './pages/admin/AdminReportDetailPage'
import TechnicianPerformancePage from './pages/technician/PerformancePage'
import TechnicianCustomersPage from './pages/technician/TechnicianCustomerPage'
import TechnicianCustomerDetailPage from './pages/technician/TechnicianCustomerDetailPage'
import TechnicianCustomerDetailPageCombine from './pages/technician/tech'
import SupervisorJobDetailPage from './pages/supervisor/SupervisorJobDetailPage'
import CustomerJobDetail from './pages/customer/CustomerJobDetailPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Public routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/customer-login" element={<CustomerLogin />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Admin dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/jobs" element={<ProtectedRoute allowedRoles={["admin"]}><AdminJobsPage /></ProtectedRoute>} />
          <Route path="/dashboard/jobs/:id" element={<ProtectedRoute allowedRoles={["admin"]}><AdminJobDetailPage /></ProtectedRoute>} />
          <Route path="/dashboard/customers" element={<ProtectedRoute allowedRoles={["admin"]}><AdminCustomersPage /></ProtectedRoute>} />
          <Route path="/dashboard/customers/:id" element={<ProtectedRoute allowedRoles={["admin"]}><AdminCustomerDetailPage /></ProtectedRoute>} />
          <Route path="/dashboard/technicians" element={<ProtectedRoute allowedRoles={["admin"]}><AdminTechniciansPage /></ProtectedRoute>} />
          <Route path="/dashboard/technicians/:id" element={<ProtectedRoute allowedRoles={["admin"]}><AdminTechnicianDetailPage /></ProtectedRoute>} />

          {/* Shared admin + supervisor routes */}
          <Route path="/dashboard/alerts" element={<ProtectedRoute allowedRoles={["admin", "supervisor"]}><AdminAlertsPage /></ProtectedRoute>} />
          <Route path="/dashboard/alerts/:id" element={<ProtectedRoute allowedRoles={["admin", "supervisor"]}><AdminAlertDetailPage /></ProtectedRoute>} />
          <Route path="/dashboard/reports" element={<ProtectedRoute allowedRoles={["admin", "supervisor"]}><AdminReportsPage /></ProtectedRoute>} />
          <Route path="/dashboard/reports/:id" element={<ProtectedRoute allowedRoles={["admin", "supervisor"]}><AdminReportDetailPage /></ProtectedRoute>} />

          {/* Supervisor dashboard */}
          <Route path="/supervisor" element={<ProtectedRoute allowedRoles={["supervisor"]}><SupervisorDashboard /></ProtectedRoute>} />
          <Route path="/supervisor/jobs" element={<ProtectedRoute allowedRoles={["supervisor"]}><SupervisorJobDetailPage /></ProtectedRoute>} />

          {/* Technician routes */}
          <Route path="/technician" element={<ProtectedRoute allowedRoles={["technician"]}><TechnicianDashboard /></ProtectedRoute>} />
          <Route path="/technician/jobs" element={<ProtectedRoute allowedRoles={["technician"]}><MyJobsPage /></ProtectedRoute>} />
          <Route path="/technician/jobs/:id" element={<ProtectedRoute allowedRoles={["technician"]}><JobDetailPage /></ProtectedRoute>} />
          <Route path="/technician/performance" element={<ProtectedRoute allowedRoles={["technician"]}><TechnicianPerformancePage /></ProtectedRoute>} />
          <Route path="/technician/customers" element={<ProtectedRoute allowedRoles={["technician"]}><TechnicianCustomersPage /></ProtectedRoute>} />
          <Route path="/technician/customers/:id" element={<ProtectedRoute allowedRoles={["technician"]}><TechnicianCustomerDetailPage /></ProtectedRoute>} />

          {/* Customer dashboard */}
          <Route path="/customer" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerDashboard /></ProtectedRoute>} />
          <Route path="/customer/jobs/:id" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerJobDetail /></ProtectedRoute>} />

          {/* Unauthorized */}
          <Route path="/unauthorized" element={
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
              <h1 className="text-2xl">Access Denied</h1>
            </div>
          } />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App