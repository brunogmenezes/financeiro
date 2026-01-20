import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Contas from './pages/Contas';
import Lancamentos from './pages/Lancamentos';

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
      </Routes>
    </Router>
  );
}

export default App;
