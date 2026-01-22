import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const handleNavigate = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <nav className="navbar">
      {menuOpen && <div className="menu-overlay" onClick={() => setMenuOpen(false)}></div>}
      
      <div className="navbar-container">
        <div className="navbar-brand">
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? '✕' : '☰'}
          </button>
          <h1>💰 Controle Financeiro</h1>
          <span className="user-greeting">Olá, {user.nome}</span>
        </div>

        <div ref={menuRef} className={`nav-menu ${menuOpen ? 'active' : ''}`}>
          <div className="nav-section">
            <button onClick={() => handleNavigate('/dashboard')} className="nav-item">
              <span className="nav-icon">📊</span>
              <span>Dashboard</span>
            </button>
            <button onClick={() => handleNavigate('/lancamentos')} className="nav-item">
              <span className="nav-icon">💸</span>
              <span>Lançamentos</span>
            </button>
            <button onClick={() => handleNavigate('/contas')} className="nav-item">
              <span className="nav-icon">🏦</span>
              <span>Contas</span>
            </button>
            <button onClick={() => handleNavigate('/categorias')} className="nav-item">
              <span className="nav-icon">📂</span>
              <span>Categorias</span>
            </button>
          </div>

          <div className="nav-divider"></div>

          <div className="nav-section">
            <button onClick={() => handleNavigate('/auditoria')} className="nav-item">
              <span className="nav-icon">📋</span>
              <span>Auditoria</span>
            </button>
            <button onClick={() => handleNavigate('/perfil')} className="nav-item">
              <span className="nav-icon">👤</span>
              <span>Perfil</span>
            </button>
            <button onClick={handleLogout} className="nav-item btn-logout">
              <span className="nav-icon">🚪</span>
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
