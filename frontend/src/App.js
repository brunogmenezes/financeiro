import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Contas from './pages/Contas';
import Lancamentos from './pages/Lancamentos';
import Auditoria from './pages/Auditoria';
import Categorias from './pages/Categorias';
import Manager from './pages/Manager';
import Assinatura from './pages/Assinatura';

function App() {
  const isAuthenticated = () => {
    return localStorage.getItem('token') !== null;
  };

  const isAdmin = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.is_admin === true;
  };

  const PrivateRoute = ({ children }) => {
    return isAuthenticated() ? children : <Navigate to="/" />;
  };

  const AdminRoute = ({ children }) => {
    return isAuthenticated() && isAdmin() ? children : <Navigate to="/dashboard" />;
  };

  const UserRoute = ({ children }) => {
    return isAuthenticated() && !isAdmin() ? children : <Navigate to="/manager" />;
  };

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={
          <UserRoute>
            <Dashboard />
          </UserRoute>
        } />
        <Route path="/contas" element={
          <UserRoute>
            <Contas />
          </UserRoute>
        } />
        <Route path="/lancamentos" element={
          <UserRoute>
            <Lancamentos />
          </UserRoute>
        } />
        <Route path="/auditoria" element={
          <PrivateRoute>
            <Auditoria />
          </PrivateRoute>
        } />

        <Route path="/categorias" element={
          <PrivateRoute>
            <Categorias />
          </PrivateRoute>
        } />
        <Route path="/manager" element={
          <AdminRoute>
            <Manager />
          </AdminRoute>
        } />
        <Route path="/assinatura" element={
          <UserRoute>
            <Assinatura />
          </UserRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
