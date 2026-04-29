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
          <Route
  path="/dashboard"
  element={
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminDashboard />
    </ProtectedRoute>
  }
/>
          {/* Admin Jobs */}
<Route
  path="/dashboard/jobs"
  element={
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminJobsPage />
    </ProtectedRoute>
  }
/>

{/* <Route
  path="/admin/jobs/:id"
  element={
    <ProtectedRoute allowedRoles={["admin"]}>
      <JobDetailPage />
    </ProtectedRoute>
  }
/> */}
<Route
  path="/dashboard/jobs/:id"
  element={
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminJobDetailPage />
    </ProtectedRoute>
  }
/>



<Route
  path="/dashboard/customers"
  element={
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminCustomersPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/dashboard/customers/:id"
  element={
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminCustomerDetailPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/dashboard/technicians/:id"
  element={
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminTechnicianDetailPage />
    </ProtectedRoute>
  }
/>

          {/* Supervisor dashboard */}
          <Route path="/supervisor" element={<ProtectedRoute allowedRoles={["supervisor"]}><SupervisorDashboard/></ProtectedRoute>} />

          {/* Technician dashboard */}
          <Route path="/technician" element={<ProtectedRoute allowedRoles={["technician"]}><TechnicianDashboard/></ProtectedRoute>} />
          <Route
  path="/technician/jobs"
  element={
    <ProtectedRoute allowedRoles={["technician"]}>
      <MyJobsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/technician/jobs/:id"
  element={
    <ProtectedRoute allowedRoles={["technician"]}>
      <JobDetailPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/dashboard/technicians"
  element={
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminTechniciansPage />
    </ProtectedRoute>
  }
/>
      

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
