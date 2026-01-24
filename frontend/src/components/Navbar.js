import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef(null);
  const profileRef = useRef(null);

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
      if (profileOpen && profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen, profileOpen]);

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <nav className="navbar">
      {menuOpen && <div className="menu-overlay" onClick={() => setMenuOpen(false)}></div>}
      
      <div className="navbar-container">
        <div className="navbar-brand">
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            <span className="hamburger-icon">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
          <div className="brand-content">
            <div className="logo-badge">CF</div>
            <h1>Controle Financeiro</h1>
          </div>
        </div>

        <div ref={menuRef} className={`nav-menu ${menuOpen ? 'active' : ''}`}>
          <div className="nav-section">
            <button 
              onClick={() => handleNavigate('/dashboard')} 
              className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}
            >
              <span className="nav-icon">📊</span>
              <span>Dashboard</span>
              {isActive('/dashboard') && <span className="active-indicator"></span>}
            </button>
            <button 
              onClick={() => handleNavigate('/lancamentos')} 
              className={`nav-item ${isActive('/lancamentos') ? 'active' : ''}`}
            >
              <span className="nav-icon">💸</span>
              <span>Lançamentos</span>
              {isActive('/lancamentos') && <span className="active-indicator"></span>}
            </button>
            <button 
              onClick={() => handleNavigate('/contas')} 
              className={`nav-item ${isActive('/contas') ? 'active' : ''}`}
            >
              <span className="nav-icon">🏦</span>
              <span>Contas</span>
              {isActive('/contas') && <span className="active-indicator"></span>}
            </button>
            <button 
              onClick={() => handleNavigate('/categorias')} 
              className={`nav-item ${isActive('/categorias') ? 'active' : ''}`}
            >
              <span className="nav-icon">📂</span>
              <span>Categorias</span>
              {isActive('/categorias') && <span className="active-indicator"></span>}
            </button>
            <button 
              onClick={() => handleNavigate('/auditoria')} 
              className={`nav-item ${isActive('/auditoria') ? 'active' : ''}`}
            >
              <span className="nav-icon">📋</span>
              <span>Auditoria</span>
              {isActive('/auditoria') && <span className="active-indicator"></span>}
            </button>
          </div>

          <div className="nav-divider"></div>

          <div className="nav-section nav-profile-section" ref={profileRef}>
            <button 
              className="nav-profile-btn" 
              onClick={() => setProfileOpen(!profileOpen)}
            >
              <div className="profile-avatar">{getInitials(user.nome)}</div>
              <div className="profile-info">
                <span className="profile-name">{user.nome || 'Usuário'}</span>
                <span className="profile-email">{user.email || ''}</span>
              </div>
              <span className={`profile-arrow ${profileOpen ? 'open' : ''}`}>▼</span>
            </button>
            
            {profileOpen && (
              <div className="profile-dropdown">
                <button 
                  onClick={() => { handleNavigate('/perfil'); setProfileOpen(false); }} 
                  className="dropdown-item"
                >
                  <span className="dropdown-icon">👤</span>
                  <span>Meu Perfil</span>
                </button>
                <div className="dropdown-divider"></div>
                <button onClick={handleLogout} className="dropdown-item logout">
                  <span className="dropdown-icon">🚪</span>
                  <span>Sair</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
