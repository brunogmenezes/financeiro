import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ProfileModal from './ProfileModal';
import './Sidebar.css';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [profileOpen, setProfileOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const profileRef = useRef(null);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const handleNavigate = (path) => {
    navigate(path);
    setIsMobileOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileOpen && profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  const isActive = (path) => location.pathname === path;

  const getInitials = (name) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length >= 2) return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    return name[0].toUpperCase();
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        className={`mobile-toggle-btn ${isMobileOpen ? 'active' : ''}`}
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label="Toggle Menu"
      >
        <span className="hamburger-box">
          <span className="hamburger-inner"></span>
        </span>
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileOpen(false)}></div>
      )}

      <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-content">
            <div className="logo-badge">💎</div>
            <div className="brand-text">
              <h1 className="brand-name">Prospera</h1>
              <span className="brand-tagline">Gestão Inteligente</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            {!user.is_admin && (
              <>
                <button onClick={() => handleNavigate('/dashboard')} className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
                  <span className="nav-icon">📊</span>
                  <span>Home</span>
                </button>
                <button onClick={() => handleNavigate('/lancamentos')} className={`nav-item ${isActive('/lancamentos') ? 'active' : ''}`}>
                  <span className="nav-icon">⇅</span>
                  <span>Lançamentos</span>
                </button>
                <button onClick={() => handleNavigate('/contas')} className={`nav-item ${isActive('/contas') ? 'active' : ''}`}>
                  <span className="nav-icon">🏦</span>
                  <span>Contas</span>
                </button>
              </>
            )}

            <button onClick={() => handleNavigate('/categorias')} className={`nav-item ${isActive('/categorias') ? 'active' : ''}`}>
              <span className="nav-icon">📂</span>
              <span>Categorias</span>
            </button>

            {!user.is_admin && (
              <button onClick={() => handleNavigate('/assinatura')} className={`nav-item ${isActive('/assinatura') ? 'active' : ''} ${user.is_pro ? 'nav-item-pro' : ''}`}>
                <span className="nav-icon">💎</span>
                <span>Assinatura</span>
              </button>
            )}

            <button onClick={() => handleNavigate('/logs')} className={`nav-item ${isActive('/logs') ? 'active' : ''}`}>
              <span className="nav-icon">📋</span>
              <span>Logs</span>
            </button>

            {user.is_admin && (
              <button onClick={() => handleNavigate('/logs-envios')} className={`nav-item ${isActive('/logs-envios') ? 'active' : ''}`}>
                <span className="nav-icon">📨</span>
                <span>Logs de Envios</span>
              </button>
            )}

            {user.is_admin && (
              <button onClick={() => handleNavigate('/manager')} className={`nav-item ${isActive('/manager') ? 'active' : ''}`}>
                <span className="nav-icon">⚙️</span>
                <span>Manager</span>
              </button>
            )}
          </div>
        </nav>

        <div className="sidebar-footer" ref={profileRef}>
          <button className="profile-toggle" onClick={() => setProfileOpen(!profileOpen)}>
            <div className="profile-avatar">{getInitials(user.nome)}</div>
            <div className="profile-info">
              <span className="profile-name">{user.nome || 'Usuário'}</span>
              <span className="profile-role">{user.is_pro ? 'Plano PRO' : 'Plano Básico'}</span>
            </div>
            <span className={`profile-arrow ${profileOpen ? 'open' : ''}`}>▲</span>
          </button>
          
          {profileOpen && (
            <div className="profile-dropdown-up">
              <button onClick={() => { setShowProfileModal(true); setProfileOpen(false); }} className="dropdown-item">
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
      </aside>

      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </>
  );
}

export default Sidebar;
