import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <h1>💰 Controle Financeiro</h1>
      <div className="nav-links">
        <span>Olá, {user.nome}</span>
        <button onClick={() => navigate('/dashboard')}>Dashboard</button>
        <button onClick={() => navigate('/contas')}>Contas</button>
        <button onClick={() => navigate('/lancamentos')}>Lançamentos</button>
        <button onClick={() => navigate('/categorias')}>📂 Categorias</button>
        <button onClick={() => navigate('/auditoria')}>📋 Auditoria</button>
        <button onClick={() => navigate('/perfil')}>👤 Perfil</button>
        <button onClick={handleLogout} className="btn-logout">Sair</button>
      </div>
    </nav>
  );
}

export default Navbar;
