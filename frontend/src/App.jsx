import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import CreateJob from './pages/CreateJob';
import JobDetails from './pages/JobDetails';
import Inventory from './pages/Inventory';
import PurchaseOrders from './pages/PurchaseOrders';
import CreatePO from './pages/CreatePO';
import PurchaseOrderDetails from './pages/PurchaseOrderDetails';
import PartsCatalog from './pages/PartsCatalog';
import Users from './pages/Users';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import Invoices from './pages/Invoices';
import InvoiceDetails from './pages/InvoiceDetails';
import Customers from './pages/Customers';
import CustomerDetails from './pages/CustomerDetails';
import Suppliers from './pages/Suppliers';
import UseParts from './pages/UseParts';
import UsageLogs from './pages/UsageLogs';
import AdminLayout from './components/AdminLayout';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user && !localStorage.getItem('token')) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <ToastContainer theme="colored" position="bottom-right" />
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />

            {/* Technician Accessible Routes */}
            <Route path="jobs" element={<Jobs />} />
            <Route path="jobs/new" element={<CreateJob />} />
            <Route path="jobs/:id" element={<JobDetails />} />
            <Route path="use-parts" element={<UseParts />} />
            <Route path="usage-logs" element={<UsageLogs />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="parts" element={<PartsCatalog />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="invoices/:id" element={<InvoiceDetails />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:id" element={<CustomerDetails />} />
            <Route path="suppliers" element={<Suppliers />} />

            {/* Admin/Manager Only Routes */}
            <Route path="pos" element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}><PurchaseOrders /></ProtectedRoute>
            } />
            <Route path="pos/new" element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}><CreatePO /></ProtectedRoute>
            } />
            <Route path="pos/:id" element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}><PurchaseOrderDetails /></ProtectedRoute>
            } />
            <Route path="reports" element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}><Reports /></ProtectedRoute>
            } />

            {/* Admin Only Routes */}
            <Route path="users" element={
              <ProtectedRoute allowedRoles={['admin']}><Users /></ProtectedRoute>
            } />
            <Route path="audit-logs" element={
              <ProtectedRoute allowedRoles={['admin']}><AuditLogs /></ProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
