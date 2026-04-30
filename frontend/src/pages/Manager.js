import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { 
  adminGetUsers, 
  adminResetPassword, 
  adminTogglePro, 
  adminDeleteUser,
  adminGetConfigs,
  adminUpdateConfig,
  adminGetUserPayments
} from '../services/api';
import './Manager.css';

function Manager() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [configs, setConfigs] = useState({ preco_assinatura: '9.99' });
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [userHistory, setUserHistory] = useState([]);
  const [newPassword, setNewPassword] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([loadUsers(), loadConfigs()]);
    };
    loadInitialData();
    // eslint-disable-next-line
  }, []);

  const loadUsers = async (search = '') => {
    try {
      const response = await adminGetUsers(search);
      setUsers(response.data);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    }
  };

  const loadConfigs = async () => {
    try {
      const response = await adminGetConfigs();
      setConfigs(response.data);
    } catch (err) {
      console.error('Erro ao carregar configs:', err);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    loadUsers(value);
  };

  const updateGlobalPrice = async () => {
    try {
      setIsUpdatingPrice(true);
      await adminUpdateConfig('preco_assinatura', configs.preco_assinatura);
      triggerToast('Preço da mensalidade atualizado! 💸');
    } catch (err) {
      triggerToast('Erro ao atualizar preço', 'error');
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const viewUserHistory = async (user) => {
    try {
      setSelectedUser(user);
      const response = await adminGetUserPayments(user.id);
      setUserHistory(response.data);
      setShowHistoryModal(true);
    } catch (err) {
      triggerToast('Erro ao carregar histórico do usuário', 'error');
    }
  };

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
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

  const handleTogglePro = async (user) => {
    try {
      await adminTogglePro(user.id, !user.is_pro);
      triggerToast(`Status PRO alterado para ${user.nome}`);
      loadUsers(searchTerm);
    } catch (err) {
      triggerToast('Erro ao alterar status PRO', 'error');
    }
  };

  const confirmDelete = async () => {
    try {
      await adminDeleteUser(selectedUser.id);
      setShowDeleteModal(false);
      triggerToast('Usuário removido 🗑️');
      loadUsers(searchTerm);
    } catch (err) {
      triggerToast('Erro ao deletar usuário', 'error');
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
        <div className="manager-header-v2">
          <div className="header-text">
            <h1>Gestão de Clientes</h1>
            <p>Administração exclusiva do Controle Financeiro</p>
          </div>
          
          <div className="config-card premium-card">
            <div className="config-item">
              <label>Preço da Mensalidade (Global)</label>
              <div className="price-input-group">
                <span>R$</span>
                <input 
                  type="number" 
                  step="0.01" 
                  value={configs.preco_assinatura} 
                  onChange={(e) => setConfigs({...configs, preco_assinatura: e.target.value})}
                />
                <button 
                  onClick={updateGlobalPrice} 
                  disabled={isUpdatingPrice}
                  className="btn-save-config"
                >
                  {isUpdatingPrice ? '...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="manager-stats">
          <div className="stat-card">
            <span className="stat-label">Total de Clientes</span>
            <span className="stat-value">{users.length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Usuários PRO</span>
            <span className="stat-value pro">{users.filter(u => u.is_pro).length}</span>
          </div>
        </div>

        <div className="users-list-card premium-card">
          <div className="table-header-v2">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                placeholder="Filtrar por e-mail ou nome..." 
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
            <button className="btn-refresh" onClick={() => loadUsers(searchTerm)}>
              <span className="refresh-icon">🔄</span> Atualizar
            </button>
          </div>

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Nome / E-mail</th>
                  <th>Assinatura / Vencimento</th>
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
                    <td>
                      <div className="user-info-v2">
                        <span className="user-name">{user.nome}</span>
                        <span className="user-email">{user.email}</span>
                      </div>
                    </td>
                    <td>
                      <div className="subscription-info-admin">
                        <div className="pro-toggle-admin">
                          <input 
                            type="checkbox" 
                            id={`pro-${user.id}`}
                            checked={user.is_pro} 
                            onChange={() => handleTogglePro(user)}
                          />
                          <label htmlFor={`pro-${user.id}`} className={user.is_pro ? 'pro-active' : ''}>
                            {user.is_pro ? '💎 PRO' : 'Padrão'}
                          </label>
                        </div>
                        {user.is_pro && user.pro_expires_at && (
                          <div className="expiry-details-admin">
                            <span className="expiry-date-label">Vence: {new Date(user.pro_expires_at).toLocaleDateString('pt-BR')}</span>
                            {(() => {
                              const days = Math.ceil((new Date(user.pro_expires_at) - new Date()) / (1000 * 60 * 60 * 24));
                              return (
                                <span className={`days-badge-admin ${days <= 5 ? 'urgent' : ''}`}>
                                  {days > 0 ? `${days} dias` : 'Expirado'}
                                </span>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons-v2">
                        <button className="btn-action history" onClick={() => viewUserHistory(user)} title="Histórico de Pagamentos">📜</button>
                        <button className="btn-action reset" onClick={() => { setSelectedUser(user); setShowResetModal(true); }} title="Resetar Senha">🔑</button>
                        <button className="btn-action delete" onClick={() => { setSelectedUser(user); setShowDeleteModal(true); }} title="Excluir">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Histórico de Pagamentos */}
      {showHistoryModal && (
        <div className="modal">
          <div className="modal-content history-modal premium-card">
            <div className="modal-header">
              <h3>Histórico: {selectedUser?.nome}</h3>
              <button className="btn-close" onClick={() => setShowHistoryModal(false)}>✕</button>
            </div>
            <div className="history-table-container">
              {userHistory.length === 0 ? (
                <p className="empty-msg">Nenhum pagamento registrado para este usuário.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Valor</th>
                      <th>TXID</th>
                      <th>Vencimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userHistory.map(pay => (
                      <tr key={pay.id}>
                        <td>{new Date(pay.data_pagamento).toLocaleDateString('pt-BR')}</td>
                        <td>R$ {parseFloat(pay.valor).toFixed(2)}</td>
                        <td className="txid-mini">{pay.txid.substring(0, 10)}...</td>
                        <td>{new Date(pay.validade_ate).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reset de Senha */}
      {showResetModal && (
        <div className="modal">
          <div className="modal-content premium-card">
            <h3>Resetar Senha</h3>
            <p>Nova senha para <strong>{selectedUser.nome}</strong></p>
            <input 
              type="text" 
              className="modal-input"
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              placeholder="Senha temporária..."
            />
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowResetModal(false)}>Cancelar</button>
              <button className="btn-save" onClick={handleResetPassword}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exclusão */}
      {showDeleteModal && (
        <div className="modal">
          <div className="modal-content premium-card delete-modal">
            <h3>Excluir Usuário</h3>
            <p>Deseja realmente excluir <strong>{selectedUser.nome}</strong>?</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>Não</button>
              <button className="btn-delete-confirm" onClick={confirmDelete}>Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default Manager;
