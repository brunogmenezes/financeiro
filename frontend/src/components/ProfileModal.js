import React, { useEffect, useState } from 'react';
import { getPerfil, updatePerfil, getWhatsappStatus, sendTestMessage } from '../services/api';
import './ProfileModal.css';

function ProfileModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [waStatus, setWaStatus] = useState({ state: 'desconhecido', message: '' });
  const [testMessageLoading, setTestMessageLoading] = useState(false);
  const [isGoogle, setIsGoogle] = useState(false);
  const [activeTab, setActiveTab] = useState('dados');
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    whatsapp: '',
    corTema: 'roxo',
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchPerfil();
      fetchWhatsappStatus();
      setActiveTab('dados');
      setMessage({ type: '', text: '' });
    }
  }, [isOpen]);

  const fetchPerfil = async () => {
    try {
      const response = await getPerfil();
      setFormData({
        nome: response.data.nome,
        email: response.data.email,
        whatsapp: response.data.whatsapp || '',
        corTema: response.data.cor_tema || 'roxo',
        senhaAtual: '',
        novaSenha: '',
        confirmarSenha: ''
      });
      setIsGoogle(response.data.is_google);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      setLoading(false);
    }
  };

  const fetchWhatsappStatus = async () => {
    try {
      const response = await getWhatsappStatus();
      const state = response.data?.data?.state || response.data?.data?.connectionStatus || 'desconhecido';
      const isConnected = state === 'open' || response.data?.data?.isConnected === true;
      setWaStatus({ 
        state: isConnected ? 'Conectado ✅' : state,
        message: isConnected ? 'Instância operacional' : 'Aguardando conexão...'
      });
    } catch (error) {
      setWaStatus({ state: 'Erro ❌', message: 'Não foi possível obter o status' });
    }
  };

  const handleSendTestMessage = async () => {
    if (!formData.whatsapp) {
      setMessage({ type: 'error', text: 'Informe seu número de WhatsApp primeiro!' });
      return;
    }
    setTestMessageLoading(true);
    try {
      await sendTestMessage(formData.whatsapp);
      setMessage({ type: 'success', text: 'Mensagem de teste enviada!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao enviar mensagem' });
    } finally {
      setTestMessageLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const data = {
        nome: formData.nome,
        email: formData.email,
        whatsapp: formData.whatsapp,
        corTema: formData.corTema
      };

      if (formData.novaSenha) {
        if (!formData.senhaAtual) throw new Error('Informe a senha atual');
        if (formData.novaSenha !== formData.confirmarSenha) throw new Error('Senhas não coincidem');
        data.senhaAtual = formData.senhaAtual;
        data.novaSenha = formData.novaSenha;
      }

      const response = await updatePerfil(data);
      
      const user = JSON.parse(localStorage.getItem('user'));
      user.nome = response.data.user.nome;
      user.email = response.data.user.email;
      user.corTema = response.data.user.cor_tema;
      user.whatsapp = response.data.user.whatsapp || '';
      localStorage.setItem('user', JSON.stringify(user));

      document.documentElement.setAttribute('data-theme', formData.corTema);
      setMessage({ type: 'success', text: 'Perfil atualizado!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      
      setFormData({ ...formData, senhaAtual: '', novaSenha: '', confirmarSenha: '' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Erro ao atualizar' });
    } finally {
      setSaveLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay profile-modal-overlay">
      <div className="modal-content profile-modal-content premium-card">
        <button className="modal-close" onClick={onClose}>&times;</button>
        
        <div className="profile-modal-header">
          <h2>Configurações de Perfil</h2>
        </div>

        <div className="profile-tabs">
          <button className={`tab-btn ${activeTab === 'dados' ? 'active' : ''}`} onClick={() => setActiveTab('dados')}>Dados</button>
          <button className={`tab-btn ${activeTab === 'whatsapp' ? 'active' : ''}`} onClick={() => setActiveTab('whatsapp')}>WhatsApp</button>
          {!isGoogle && <button className={`tab-btn ${activeTab === 'senha' ? 'active' : ''}`} onClick={() => setActiveTab('senha')}>Segurança</button>}
          <button className={`tab-btn ${activeTab === 'aparencia' ? 'active' : ''}`} onClick={() => setActiveTab('aparencia')}>Aparência</button>
        </div>

        {message.text && <div className={`profile-message ${message.type}`}>{message.text}</div>}

        <div className="profile-tab-content">
          {loading ? (
            <div className="profile-loading">Carregando...</div>
          ) : (
            <form onSubmit={handleSubmit}>
              {activeTab === 'dados' && (
                <div className="tab-pane">
                  <div className="form-group">
                    <label>Nome Completo</label>
                    <input type="text" name="nome" value={formData.nome} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>E-mail</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                  </div>
                </div>
              )}

              {activeTab === 'whatsapp' && (
                <div className="tab-pane">
                  <div className="form-group">
                    <label>WhatsApp (DDI + DDD + Número)</label>
                    <input 
                      type="tel" 
                      value={formData.whatsapp} 
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value.replace(/\D/g, '') })} 
                      placeholder="Ex: 5511999999999" 
                    />
                    <small className="input-tip">Formato: 55 + DDD + Número</small>
                  </div>
                  <div className="wa-status-box">
                    <div className={`wa-status-dot ${waStatus.state.includes('Conectado') ? 'online' : 'offline'}`}></div>
                    <span>{waStatus.state}</span>
                    <button type="button" onClick={fetchWhatsappStatus} className="btn-icon-refresh">🔄</button>
                  </div>
                  <button 
                    type="button" 
                    className="btn-test-wa" 
                    onClick={handleSendTestMessage} 
                    disabled={testMessageLoading || !formData.whatsapp}
                  >
                    {testMessageLoading ? 'Enviando...' : '📱 Enviar Teste'}
                  </button>
                </div>
              )}

              {activeTab === 'senha' && (
                <div className="tab-pane">
                  <div className="form-group">
                    <label>Senha Atual</label>
                    <input type="password" name="senhaAtual" value={formData.senhaAtual} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Nova Senha</label>
                    <input type="password" name="novaSenha" value={formData.novaSenha} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Confirmar Nova Senha</label>
                    <input type="password" name="confirmarSenha" value={formData.confirmarSenha} onChange={handleChange} />
                  </div>
                </div>
              )}

              {activeTab === 'aparencia' && (
                <div className="tab-pane">
                  <div className="theme-grid">
                    {['roxo', 'azul', 'verde', 'laranja', 'rosa'].map(theme => (
                      <div 
                        key={theme}
                        className={`theme-box ${theme} ${formData.corTema === theme ? 'active' : ''}`}
                        onClick={() => setFormData({ ...formData, corTema: theme })}
                      >
                        <div className="theme-dot"></div>
                        <span>{theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="profile-modal-footer">
                <button type="submit" className="btn-save-profile" disabled={saveLoading}>
                  {saveLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileModal;
