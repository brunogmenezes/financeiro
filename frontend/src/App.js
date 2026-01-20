import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Contas from './pages/Contas';
import Lancamentos from './pages/Lancamentos';
import Auditoria from './pages/Auditoria';
import Perfil from './pages/Perfil';
import Categorias from './pages/Categorias';

function App() {
  const isAuthenticated = () => {
    return localStorage.getItem('token') !== null;
  };

  const PrivateRoute = ({ children }) => {
    return isAuthenticated() ? children : <Navigate to="/" />;
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />
        <Route path="/contas" element={
          <PrivateRoute>
            <Contas />
          </PrivateRoute>
        } />
        <Route path="/lancamentos" element={
          <PrivateRoute>
            <Lancamentos />
          </PrivateRoute>
        } />
        <Route path="/auditoria" element={
          <PrivateRoute>
            <Auditoria />
          </PrivateRoute>
        } />
        <Route path="/perfil" element={
          <PrivateRoute>
            <Perfil />
          </PrivateRoute>
        } />
        <Route path="/categorias" element={
          <PrivateRoute>
            <Categorias />
          </PrivateRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
