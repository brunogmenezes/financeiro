import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { adminGetUsers, adminResetPassword, adminToggleAdmin, adminTogglePro, adminDeleteUser } from '../services/api';
import './Manager.css';

function Manager() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    loadUsers();
    // Atualizar a cada 30 segundos para ver status online
    const interval = setInterval(loadUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const loadUsers = async () => {
    try {
      const response = await adminGetUsers();
      setUsers(response.data);
    } catch (err) {
      setError('Erro ao carregar usuários. Verifique se você tem permissão.');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) return triggerToast('Digite a nova senha', 'error');
    try {
      await adminResetPassword(selectedUser.id, newPassword);
      triggerToast('Senha resetada com sucesso! 🔑');
      setShowResetModal(false);
      setNewPassword('');
    } catch (err) {
      triggerToast('Erro ao resetar senha', 'error');
    }
  };

  const handleToggleAdmin = async (user) => {
    try {
      await adminToggleAdmin(user.id, !user.is_admin);
      triggerToast('Status de administrador alterado!');
      loadUsers();
    } catch (err) {
      triggerToast(err.response?.data?.error || 'Erro ao alterar status de admin', 'error');
    }
  };

  const handleTogglePro = async (user) => {
    try {
      await adminTogglePro(user.id, !user.is_pro);
      triggerToast(`Usuário ${user.nome} agora é ${!user.is_pro ? 'PRO! 💎' : 'padrão.'}`);
      loadUsers();
    } catch (err) {
      triggerToast(err.response?.data?.error || 'Erro ao alterar status PRO', 'error');
    }
  };

  const confirmDelete = async () => {
    try {
      await adminDeleteUser(selectedUser.id);
      setShowDeleteModal(false);
      triggerToast('Usuário removido com sucesso 🗑️');
      loadUsers();
    } catch (err) {
      triggerToast(err.response?.data?.error || 'Erro ao deletar usuário', 'error');
    }
  };

  const formatarData = (data) => {
    if (!data) return 'Nunca';
    return new Date(data).toLocaleString('pt-BR');
  };

  return (
    <div className="manager-container">
      <Navbar />
      <div className="manager-content">
        <div className="manager-header">
          <h1>Painel de Gerenciamento</h1>
          <p>Gerencie os usuários e monitore o status do sistema.</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="users-list-card premium-card">
          <div className="table-header">
            <h2>Usuários Cadastrados</h2>
            <button className="btn-refresh" onClick={loadUsers}>🔄 Atualizar</button>
          </div>

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>ID</th>
                  <th>Nome / Usuário</th>
                  <th>E-mail</th>
                  <th>Último Login</th>
                  <th>Pro?</th>
                  <th>Admin?</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className={user.is_online ? 'online-row' : ''}>
                    <td>
                      <span className={`status-pill ${user.is_online ? 'online' : 'offline'}`}>
                        {user.is_online ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td>{user.id}</td>
                    <td>
                      <div className="user-info">
                        <span className="user-name">{user.nome}</span>
                        <span className="user-username">@{user.username || 'n/a'}</span>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>{formatarData(user.ultimo_login)}</td>
                    <td>
                      <div className="pro-toggle">
                        <input 
                          type="checkbox" 
                          id={`pro-${user.id}`}
                          checked={user.is_pro} 
                          onChange={() => handleTogglePro(user)}
                        />
                        <label htmlFor={`pro-${user.id}`} className={user.is_pro ? 'pro-active' : ''}>
                          {user.is_pro ? '💎 PRO' : 'Não'}
                        </label>
                      </div>
                    </td>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={user.is_admin} 
                        onChange={() => handleToggleAdmin(user)}
                        title="Alternar privilégios de Admin"
                      />
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-reset" onClick={() => { setSelectedUser(user); setShowResetModal(true); }} title="Resetar Senha">🔑</button>
                        <button className="btn-delete" onClick={() => { setSelectedUser(user); setShowDeleteModal(true); }} title="Excluir Usuário">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Reset de Senha */}
      {showResetModal && (
        <div className="modal">
          <div className="modal-content premium-card">
            <div className="modal-icon">🔑</div>
            <h3>Resetar Senha</h3>
            <p>Defina uma nova senha para <strong>{selectedUser.nome}</strong></p>
            <div className="form-group" style={{ marginTop: '20px' }}>
              <input 
                type="text" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="Digite a nova senha segura"
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowResetModal(false)}>Cancelar</button>
              <button className="btn-save" onClick={handleResetPassword}>Atualizar Senha</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exclusão (Personalizado) */}
      {showDeleteModal && (
        <div className="modal">
          <div className="modal-content premium-card delete-modal">
            <div className="modal-icon warning">⚠️</div>
            <h3>Excluir Usuário?</h3>
            <p>Você está prestes a excluir permanentemente <strong>{selectedUser.nome}</strong>.</p>
            <div className="warning-box">
              Esta ação não pode ser desfeita. Todos os lançamentos, contas e dados vinculados a este usuário serão removidos do sistema.
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
              <button className="btn-delete-confirm" onClick={confirmDelete}>Sim, Excluir Agora</button>
            </div>
          </div>
        </div>
      )}

      {/* Notificação Toast */}
      {toast.show && (
        <div className={`toast ${toast.type}`}>
          <div className="toast-content">
            <span className="toast-icon">{toast.type === 'success' ? '✅' : '❌'}</span>
            <span className="toast-message">{toast.message}</span>
          </div>
          <div className="toast-progress"></div>
        </div>
      )}
    </div>
  );
}

export default Manager;
