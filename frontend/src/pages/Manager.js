import React, { useState, useEffect } from 'react';
import { 
  adminGetUsers, 
  adminResetPassword, 
  adminTogglePro, 
  adminDeleteUser,
  adminGetConfigs,
  adminUpdateConfig,
  adminGetUserPayments,
  getEvolutionConfig,
  updateEvolutionConfig,
  getWhatsappStatus,
  sendRemindersNow,
  getSmtpConfig,
  updateSmtpConfig,
  sendTestEmail,
  getEmailTemplates,
  updateEmailTemplate,
  adminSendEmailBatch,
  sendTestMessage
} from '../services/api';
import './Manager.css';

const formatWhatsAppPreview = (text, systemUrl = 'https://financeiro.netsolutions.com.br') => {
  if (!text) return '';
  
  let formatted = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  formatted = formatted.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/_(.*?)_/g, '<em>$1</em>');
  formatted = formatted.replace(/```([\s\S]*?)```/g, '<code>$1</code>');
  formatted = formatted.replace(/~(.*?)~/g, '<del>$1</del>');
  formatted = formatted.replace(/\n/g, '<br />');

  formatted = formatted
    .replace(/\{\{nome\}\}/g, 'Fulano de Tal')
    .replace(/\{\{data_hora\}\}/g, new Date().toLocaleString('pt-BR'))
    .replace(/\{\{data_vencimento\}\}/g, new Date(Date.now() + 3*24*60*60*1000).toLocaleDateString('pt-BR'))
    .replace(/\{\{dias_restantes\}\}/g, '3')
    .replace(/\{\{dias_inativo\}\}/g, '15')
    .replace(/\{\{email\}\}/g, 'cliente@exemplo.com')
    .replace(/\{\{url_sistema\}\}/g, systemUrl);

  return formatted;
};

function Manager() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [configs, setConfigs] = useState({ preco_assinatura: '9.99' });
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  
  // WhatsApp / Evolution
  const [evolutionConfig, setEvolutionConfig] = useState({ url: '', instancia: '', token: '' });
  const [waStatus, setWaStatus] = useState({ state: 'desconhecido', message: '' });
  const [configLoading, setConfigLoading] = useState(false);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [testDdi, setTestDdi] = useState('+55');
  const [testWaNum, setTestWaNum] = useState('');
  const [testWaLoading, setTestWaLoading] = useState(false);

  // SMTP / Email Config
  const [smtpConfig, setSmtpConfig] = useState({ host: '', port: 465, username: '', password: '', secure: true, from_email: '', from_name: '', system_url: '' });
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [testEmailDest, setTestEmailDest] = useState('');
  const [testEmailLoading, setTestEmailLoading] = useState(false);

  // Templates de E-mail
  const [templates, setTemplates] = useState([]);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [activeTemplateTab, setActiveTemplateTab] = useState('');
  const [activeWorkTab, setActiveWorkTab] = useState('edit');
  const [activeChannelTab, setActiveChannelTab] = useState('email');
  const [editingTemplate, setEditingTemplate] = useState({ subject: '', body: '', whatsapp_body: '' });
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const textareaRef = React.useRef(null);

  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [userHistory, setUserHistory] = useState([]);
  const [newPassword, setNewPassword] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Novas variáveis de estado para envio manual de e-mail em lote
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [emailBatchLoading, setEmailBatchLoading] = useState(false);
  const [activeUserDropdown, setActiveUserDropdown] = useState(null);

  // Fechar dropdowns de e-mail ao clicar fora
  useEffect(() => {
    const handleDocumentClick = () => {
      setActiveUserDropdown(null);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  const handleSendEmails = async (templateSlug, userIdsToTarget = null) => {
    const targets = userIdsToTarget || selectedUserIds;
    if (targets.length === 0) {
      return triggerToast('Selecione pelo menos um usuário', 'error');
    }

    setEmailBatchLoading(true);
    try {
      const response = await adminSendEmailBatch(targets, templateSlug);
      const { successCount, failCount, errors } = response.data;
      
      if (failCount === 0) {
        triggerToast(`Sucesso! ${successCount} e-mail(s) enviado(s). ✉️`);
      } else {
        triggerToast(`Enviados: ${successCount}. Falhas: ${failCount}.`, 'error');
        if (errors && errors.length > 0) {
          console.error('Erros no disparo de e-mail:', errors);
        }
      }
      
      if (!userIdsToTarget) {
        setSelectedUserIds([]);
      }
      setActiveUserDropdown(null);
    } catch (error) {
      triggerToast(error.response?.data?.error || 'Erro ao disparar e-mails', 'error');
    } finally {
      setEmailBatchLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUserIds(users.map(u => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([loadUsers(), loadConfigs(), loadEvolutionConfig(), fetchWhatsappStatus(), loadSmtpConfig()]);
    };
    loadInitialData();
    // eslint-disable-next-line
  }, []);

  const loadEvolutionConfig = async () => {
    try {
      const response = await getEvolutionConfig();
      setEvolutionConfig(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar config Evolution:', error);
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

  const handleSaveEvolutionConfig = async () => {
    setConfigLoading(true);
    try {
      await updateEvolutionConfig(evolutionConfig);
      triggerToast('Configuração Evolution salva! 📱');
    } catch (error) {
      triggerToast('Erro ao salvar configuração', 'error');
    } finally {
      setConfigLoading(false);
    }
  };

  const handleSendRemindersNow = async () => {
    setRemindersLoading(true);
    try {
      await sendRemindersNow();
      triggerToast('Lembretes disparados com sucesso! 🚀');
    } catch (error) {
      triggerToast('Erro ao disparar lembretes', 'error');
    } finally {
      setRemindersLoading(false);
    }
  };

  const handleSendTestWhatsApp = async () => {
    if (!testWaNum) {
      return triggerToast('Informe o número de celular para o teste', 'error');
    }
    const cleanNum = testWaNum.replace(/\D/g, '');
    if (cleanNum.length < 8) {
      return triggerToast('Número de celular inválido', 'error');
    }
    const cleanDdi = testDdi.replace(/\+/g, '');
    const fullNumber = `${cleanDdi}${cleanNum}`;

    setTestWaLoading(true);
    try {
      await sendTestMessage(fullNumber);
      triggerToast('WhatsApp de teste enviado com sucesso! 📱');
    } catch (error) {
      triggerToast(error.response?.data?.error || 'Erro ao enviar WhatsApp de teste', 'error');
    } finally {
      setTestWaLoading(false);
    }
  };

  const loadSmtpConfig = async () => {
    try {
      const response = await getSmtpConfig();
      if (response.data?.data) {
        setSmtpConfig(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar config SMTP:', error);
    }
  };

  const handleSaveSmtpConfig = async () => {
    setSmtpLoading(true);
    try {
      await updateSmtpConfig(smtpConfig);
      triggerToast('Configuração de e-mail salva! 📧');
    } catch (error) {
      triggerToast(error.response?.data?.error || 'Erro ao salvar configuração de e-mail', 'error');
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailDest) {
      return triggerToast('Informe o e-mail de destino para o teste', 'error');
    }
    setTestEmailLoading(true);
    try {
      await sendTestEmail(testEmailDest);
      triggerToast('E-mail de teste enviado! Verifique sua caixa de entrada 📩');
    } catch (error) {
      triggerToast(error.response?.data?.error || 'Erro ao enviar e-mail de teste', 'error');
    } finally {
      setTestEmailLoading(false);
    }
  };

  const handleOpenTemplatesModal = async () => {
    setTemplatesLoading(true);
    try {
      const response = await getEmailTemplates();
      if (response.data?.data) {
        setTemplates(response.data.data);
        const first = response.data.data[0];
        if (first) {
          setActiveTemplateTab(first.slug);
          setEditingTemplate({ 
            subject: first.subject, 
            body: first.body,
            whatsapp_body: first.whatsapp_body || ''
          });
        }
      }
      setActiveChannelTab('email');
      setShowTemplatesModal(true);
    } catch (error) {
      triggerToast('Erro ao carregar modelos', 'error');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleSwitchTemplateTab = (slug) => {
    const found = templates.find(t => t.slug === slug);
    if (found) {
      setActiveTemplateTab(slug);
      setEditingTemplate({ 
        subject: found.subject, 
        body: found.body,
        whatsapp_body: found.whatsapp_body || ''
      });
      setActiveWorkTab('edit');
      setActiveChannelTab('email');
    }
  };

  const handleSaveTemplate = async () => {
    try {
      const response = await updateEmailTemplate(activeTemplateTab, {
        subject: editingTemplate.subject,
        body: editingTemplate.body,
        whatsapp_body: editingTemplate.whatsapp_body
      });
      if (response.data?.ok) {
        triggerToast('Modelo atualizado com sucesso! 💾');
        setTemplates(prev => prev.map(t => t.slug === activeTemplateTab ? { 
          ...t, 
          subject: editingTemplate.subject, 
          body: editingTemplate.body,
          whatsapp_body: editingTemplate.whatsapp_body
        } : t));
      }
    } catch (error) {
      triggerToast('Erro ao salvar modelo', 'error');
    }
  };

  const insertAtCursor = (textToInsert) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = editingTemplate.body;
    
    const newText = currentText.substring(0, start) + textToInsert + currentText.substring(end);
    
    setEditingTemplate({
      ...editingTemplate,
      body: newText
    });

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
    }, 50);
  };

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
      <div className="manager-content">
        <div className="manager-header-v2">
          <div className="header-text">
            <h1>Gestão de Clientes</h1>
            <p>Administração exclusiva do Controle Financeiro</p>
          </div>
        </div>

        <div className="manager-configs-container">
          <div className="configs-left-column">
            <div className="config-card premium-card price-config-card">
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

            <div className="config-card premium-card evolution-config-section">
              <div className="config-header-row">
                <h3>WhatsApp / API Evolution</h3>
                <div className={`wa-status-badge ${waStatus.state === 'Conectado ✅' ? 'active' : 'inactive'}`}>
                  {waStatus.state}
                </div>
              </div>
              
              <div className="evolution-grid">
                <div className="form-group-mini">
                  <label>URL da API</label>
                  <input 
                    type="text" 
                    value={evolutionConfig.url} 
                    onChange={(e) => setEvolutionConfig({...evolutionConfig, url: e.target.value})}
                    placeholder="https://sua-api.com"
                  />
                </div>
                <div className="form-group-mini">
                  <label>Instância</label>
                  <input 
                    type="text" 
                    value={evolutionConfig.instancia} 
                    onChange={(e) => setEvolutionConfig({...evolutionConfig, instancia: e.target.value})}
                    placeholder="nome-instancia"
                  />
                </div>
                <div className="form-group-mini">
                  <label>Token</label>
                  <input 
                    type="password" 
                    value={evolutionConfig.token} 
                    onChange={(e) => setEvolutionConfig({...evolutionConfig, token: e.target.value})}
                    placeholder="API Key"
                  />
                </div>
              </div>

              <div className="whatsapp-test-row">
                <select 
                  value={testDdi} 
                  onChange={(e) => setTestDdi(e.target.value)}
                >
                  <option value="+55">🇧🇷 +55</option>
                  <option value="+351">🇵🇹 +351</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+34">🇪🇸 +34</option>
                  <option value="+44">🇬🇧 +44</option>
                </select>
                <input 
                  type="text" 
                  placeholder="Celular de teste..." 
                  value={testWaNum} 
                  onChange={(e) => setTestWaNum(e.target.value)}
                />
                <button 
                  className="btn-test-whatsapp" 
                  onClick={handleSendTestWhatsApp} 
                  disabled={testWaLoading}
                >
                  {testWaLoading ? 'Enviando...' : '📱 Testar Envios'}
                </button>
              </div>

              <div className="evolution-actions">
                <button className="btn-refresh-mini" onClick={fetchWhatsappStatus}>🔄 Status</button>
                <button className="btn-save-mini" onClick={handleSaveEvolutionConfig} disabled={configLoading}>
                  {configLoading ? 'Salvando...' : 'Salvar Config'}
                </button>
                <button className="btn-reminders-mini" onClick={handleSendRemindersNow} disabled={remindersLoading}>
                  {remindersLoading ? 'Disparando...' : '🚀 Disparar Lembretes'}
                </button>
              </div>
            </div>
          </div>

          <div className="configs-right-column">
            <div className="config-card premium-card email-config-section">
              <div className="config-header-row">
                <h3>Servidor de E-mail (SMTP)</h3>
                <span className="info-badge">Hostgator Titan / Outros</span>
              </div>
              
              <div className="evolution-grid">
                <div className="form-group-mini">
                  <label>Servidor SMTP (Host)</label>
                  <input 
                    type="text" 
                    value={smtpConfig.host} 
                    onChange={(e) => setSmtpConfig({...smtpConfig, host: e.target.value})}
                    placeholder="smtp.titan.email"
                  />
                </div>
                <div className="form-group-mini">
                  <label>Porta</label>
                  <input 
                    type="number" 
                    value={smtpConfig.port} 
                    onChange={(e) => setSmtpConfig({...smtpConfig, port: parseInt(e.target.value) || 0})}
                    placeholder="465"
                  />
                </div>
                <div className="form-group-mini">
                  <label>Conexão Segura (SSL/TLS)</label>
                  <div className="toggle-container-mini">
                    <input 
                      type="checkbox" 
                      id="smtp-secure"
                      checked={smtpConfig.secure} 
                      onChange={(e) => setSmtpConfig({...smtpConfig, secure: e.target.checked})}
                    />
                    <label htmlFor="smtp-secure">{smtpConfig.secure ? 'SSL Ativo' : 'Desativado'}</label>
                  </div>
                </div>
                <div className="form-group-mini">
                  <label>Usuário (E-mail)</label>
                  <input 
                    type="email" 
                    value={smtpConfig.username} 
                    onChange={(e) => setSmtpConfig({...smtpConfig, username: e.target.value})}
                    placeholder="exemplo@dominio.com.br"
                  />
                </div>
                <div className="form-group-mini">
                  <label>Senha</label>
                  <input 
                    type="password" 
                    value={smtpConfig.password} 
                    onChange={(e) => setSmtpConfig({...smtpConfig, password: e.target.value})}
                    placeholder="Sua senha de e-mail"
                  />
                </div>
                <div className="form-group-mini">
                  <label>Nome do Remetente</label>
                  <input 
                    type="text" 
                    value={smtpConfig.from_name} 
                    onChange={(e) => setSmtpConfig({...smtpConfig, from_name: e.target.value})}
                    placeholder="Controle Financeiro"
                  />
                </div>
                <div className="form-group-mini">
                  <label>E-mail do Remetente</label>
                  <input 
                    type="email" 
                    value={smtpConfig.from_email} 
                    onChange={(e) => setSmtpConfig({...smtpConfig, from_email: e.target.value})}
                    placeholder="exemplo@dominio.com.br"
                  />
                </div>
                <div className="form-group-mini" style={{ gridColumn: 'span 2' }}>
                  <label>URL do Sistema (Usada nos links dos e-mails)</label>
                  <input 
                    type="text" 
                    value={smtpConfig.system_url || ''} 
                    onChange={(e) => setSmtpConfig({...smtpConfig, system_url: e.target.value})}
                    placeholder="http://localhost:3000"
                  />
                </div>
              </div>

              <div className="email-test-row">
                <input 
                  type="email" 
                  placeholder="Enviar e-mail de teste para..." 
                  value={testEmailDest} 
                  onChange={(e) => setTestEmailDest(e.target.value)}
                />
                <button className="btn-test-email" onClick={handleSendTestEmail} disabled={testEmailLoading}>
                  {testEmailLoading ? 'Enviando...' : '✉️ Testar Envios'}
                </button>
              </div>

              <div className="evolution-actions email-actions-row">
                <button type="button" className="btn-edit-templates" onClick={handleOpenTemplatesModal} disabled={templatesLoading}>
                  {templatesLoading ? 'Carregando...' : '✏️ Modelos de Notificação'}
                </button>
                <button className="btn-save-mini" onClick={handleSaveSmtpConfig} disabled={smtpLoading}>
                  {smtpLoading ? 'Salvando...' : 'Salvar Config'}
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

          {/* Barra de Ações em Lote */}
          {selectedUserIds.length > 0 && (
            <div className="batch-actions-bar">
              <div className="batch-info">
                <span className="batch-count">{selectedUserIds.length}</span> {selectedUserIds.length === 1 ? 'usuário selecionado' : 'usuários selecionados'}
              </div>
              <div className="batch-buttons">
                <button 
                  className="btn-batch welcome" 
                  disabled={emailBatchLoading}
                  onClick={() => handleSendEmails('welcome')}
                >
                  {emailBatchLoading ? '...' : '✉️ Boas-vindas'}
                </button>
                <button 
                  className="btn-batch inactivity" 
                  disabled={emailBatchLoading}
                  onClick={() => handleSendEmails('inactivity')}
                >
                  {emailBatchLoading ? '...' : '💤 Inatividade'}
                </button>
                <button 
                  className="btn-batch expiration" 
                  disabled={emailBatchLoading}
                  onClick={() => handleSendEmails('expiration')}
                >
                  {emailBatchLoading ? '...' : '📅 Vencimento'}
                </button>
                <button 
                  className="btn-batch-clear" 
                  onClick={() => setSelectedUserIds([])}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll} 
                      checked={users.length > 0 && selectedUserIds.length === users.length}
                    />
                  </th>
                  <th>Status</th>
                  <th>Nome / E-mail</th>
                  <th>Assinatura / Vencimento</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className={`${user.is_online ? 'online-row' : ''} ${selectedUserIds.includes(user.id) ? 'selected-row' : ''}`}>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                      />
                    </td>
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
                      <div className="action-buttons-v2" style={{ position: 'relative' }}>
                        <button 
                          className={`btn-action email ${activeUserDropdown === user.id ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveUserDropdown(activeUserDropdown === user.id ? null : user.id);
                          }} 
                          title="Enviar E-mail Manual"
                        >
                          ✉️
                        </button>
                        
                        {activeUserDropdown === user.id && (
                          <div className="user-email-dropdown">
                            <button onClick={() => handleSendEmails('welcome', [user.id])}>Boas-vindas</button>
                            <button onClick={() => handleSendEmails('inactivity', [user.id])}>Inatividade</button>
                            <button onClick={() => handleSendEmails('expiration', [user.id])}>Vencimento</button>
                          </div>
                        )}

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

      {/* Modal de Modelos de E-mail & WhatsApp */}
      {showTemplatesModal && (
        <div className="modal email-templates-modal-wrapper">
          <div className="modal-content templates-modal premium-card">
            <div className="modal-header">
              <h3>Modelos de Notificação (E-mail & WhatsApp)</h3>
              <button className="btn-close" onClick={() => setShowTemplatesModal(false)}>✕</button>
            </div>

            {/* Abas dos templates */}
            <div className="templates-tabs-bar">
              {templates.length === 0 && (
                <div style={{ padding: '15px 10px', color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  Carregando abas...
                </div>
              )}
              {templates.map(t => (
                <button 
                  key={t.slug} 
                  type="button"
                  className={`template-tab-btn ${activeTemplateTab === t.slug ? 'active' : ''}`}
                  onClick={() => handleSwitchTemplateTab(t.slug)}
                >
                  {t.name}
                </button>
              ))}
            </div>

            {/* Abas de Canais (E-mail / WhatsApp) */}
            <div className="channel-tabs-bar" style={{ display: 'flex', gap: '8px', padding: '10px 30px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <button 
                type="button"
                className={`channel-tab-btn ${activeChannelTab === 'email' ? 'active' : ''}`}
                onClick={() => setActiveChannelTab('email')}
                style={{
                  background: activeChannelTab === 'email' ? '#7c3aed' : 'white',
                  color: activeChannelTab === 'email' ? 'white' : '#475569',
                  border: '1px solid ' + (activeChannelTab === 'email' ? '#7c3aed' : '#e2e8f0'),
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                ✉️ Canal E-mail
              </button>
              <button 
                type="button"
                className={`channel-tab-btn ${activeChannelTab === 'whatsapp' ? 'active' : ''}`}
                onClick={() => setActiveChannelTab('whatsapp')}
                style={{
                  background: activeChannelTab === 'whatsapp' ? '#16a34a' : 'white',
                  color: activeChannelTab === 'whatsapp' ? 'white' : '#475569',
                  border: '1px solid ' + (activeChannelTab === 'whatsapp' ? '#16a34a' : '#e2e8f0'),
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                💬 Canal WhatsApp
              </button>
            </div>

            {/* Corpo do editor */}
            <div className="templates-editor-body">
              {activeChannelTab === 'email' ? (
                <>
                  <div className="form-group">
                    <label className="editor-label">Assunto do E-mail</label>
                    <input 
                      type="text" 
                      className="template-subject-input"
                      value={editingTemplate.subject} 
                      onChange={(e) => setEditingTemplate({...editingTemplate, subject: e.target.value})}
                      placeholder="Assunto do e-mail..."
                    />
                  </div>

                  {/* Sub-abas: Editar / Visualizar */}
                  <div className="editor-work-tabs">
                    <button 
                      type="button"
                      className={`work-tab-btn ${activeWorkTab === 'edit' ? 'active' : ''}`}
                      onClick={() => setActiveWorkTab('edit')}
                    >
                      📝 Editar HTML
                    </button>
                    <button 
                      type="button"
                      className={`work-tab-btn ${activeWorkTab === 'preview' ? 'active' : ''}`}
                      onClick={() => setActiveWorkTab('preview')}
                    >
                      👁️ Visualizar Preview
                    </button>
                  </div>

                  {activeWorkTab === 'edit' ? (
                    <div className="editor-edit-pane">
                      {/* Barra de Formatação */}
                      <div className="html-toolbar">
                        <button type="button" onClick={() => insertAtCursor('<strong>Negrito</strong>')} title="Negrito"><b>B</b></button>
                        <button type="button" onClick={() => insertAtCursor('<em>Itálico</em>')} title="Itálico"><i>I</i></button>
                        <button type="button" onClick={() => insertAtCursor('<h2>Título</h2>')} title="Título">H2</button>
                        <button type="button" onClick={() => insertAtCursor('<p>Parágrafo</p>')} title="Parágrafo">P</button>
                        <button type="button" onClick={() => insertAtCursor('<a href="https://..." style="color: #7c3aed; font-weight: bold; text-decoration: underline;">Link</a>')} title="Link">Link</button>
                        <button type="button" onClick={() => insertAtCursor('<br />')} title="Quebra de Linha">Quebra</button>
                        
                        <span className="toolbar-divider">|</span>
                        
                        <span className="variables-label">Tags:</span>
                        {(() => {
                          const activeObj = templates.find(t => t.slug === activeTemplateTab);
                          const vars = activeObj?.variables || [];
                          return vars.map(v => (
                            <button 
                              key={v}
                              type="button" 
                              className="var-badge-btn"
                              onClick={() => insertAtCursor(`{{${v}}}`)}
                              title={`Inserir tag dinâmica {{${v}}}`}
                            >
                              {`{{${v}}}`}
                            </button>
                          ));
                        })()}
                      </div>

                      <textarea 
                        ref={textareaRef}
                        className="template-html-textarea"
                        value={editingTemplate.body}
                        onChange={(e) => setEditingTemplate({...editingTemplate, body: e.target.value})}
                        placeholder="Escreva seu código HTML aqui..."
                        spellCheck="false"
                      />
                    </div>
                  ) : (
                    <div className="editor-preview-pane">
                      <div className="preview-subject-header">
                        <strong>Assunto:</strong> {editingTemplate.subject || '(Sem assunto)'}
                      </div>
                      <div 
                        className="preview-html-content"
                        dangerouslySetInnerHTML={{ 
                          __html: editingTemplate.body 
                            ? editingTemplate.body
                                .replace(/\{\{nome\}\}/g, 'Fulano de Tal')
                                .replace(/\{\{data_hora\}\}/g, new Date().toLocaleString('pt-BR'))
                                .replace(/\{\{data_vencimento\}\}/g, new Date(Date.now() + 7*24*60*60*1000).toLocaleDateString('pt-BR'))
                                .replace(/\{\{dias_restantes\}\}/g, '7')
                                .replace(/\{\{dias_inativo\}\}/g, '15')
                                .replace(/\{\{email\}\}/g, 'usuario@exemplo.com')
                            : '<p style="color: #888; text-align: center; padding: 20px;">Escreva algum HTML na aba Editar para ver o preview.</p>' 
                        }}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="whatsapp-editor-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="whatsapp-editor-left">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label className="editor-label" style={{ marginBottom: 0 }}>Mensagem do WhatsApp (Evolution API)</label>
                      <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 'bold' }}>⚡ Envio automático ativo</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 10px 0' }}>
                      Escreva a mensagem que será enviada para o WhatsApp do cliente. Use <code>*texto*</code> para negrito, <code>_texto_</code> para itálico, <code>~texto~</code> para riscado e <code>```texto```</code> para monospace.
                    </p>
                    <div className="html-toolbar" style={{ borderBottom: '1px solid #e2e8f0', borderRadius: '10px 10px 0 0' }}>
                      <span className="variables-label">Tags:</span>
                      {(() => {
                        const activeObj = templates.find(t => t.slug === activeTemplateTab);
                        const vars = activeObj?.variables || [];
                        return vars.map(v => (
                          <button 
                            key={v}
                            type="button" 
                            className="var-badge-btn"
                            onClick={() => {
                              const waTextarea = document.getElementById('whatsapp-template-textarea');
                              if (waTextarea) {
                                const start = waTextarea.selectionStart;
                                const end = waTextarea.selectionEnd;
                                const currentVal = editingTemplate.whatsapp_body || '';
                                const newVal = currentVal.substring(0, start) + `{{${v}}}` + currentVal.substring(end);
                                setEditingTemplate({
                                  ...editingTemplate,
                                  whatsapp_body: newVal
                                });
                                setTimeout(() => {
                                  waTextarea.focus();
                                  waTextarea.selectionStart = waTextarea.selectionEnd = start + v.length + 4;
                                }, 50);
                              }
                            }}
                            title={`Inserir tag dinâmica {{${v}}}`}
                          >
                            {`{{${v}}}`}
                          </button>
                        ));
                      })()}
                    </div>
                    <textarea 
                      id="whatsapp-template-textarea"
                      style={{
                        width: '100%',
                        height: '240px',
                        border: '1px solid #e2e8f0',
                        borderTop: 'none',
                        borderRadius: '0 0 10px 10px',
                        padding: '12px 15px',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        lineHeight: '1.5',
                        color: '#0f172a',
                        background: '#fafafa',
                        resize: 'none',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                      value={editingTemplate.whatsapp_body || ''}
                      onChange={(e) => setEditingTemplate({...editingTemplate, whatsapp_body: e.target.value})}
                      placeholder="Escreva a mensagem do WhatsApp..."
                    />
                  </div>

                  <div className="whatsapp-editor-right" style={{ display: 'flex', flexDirection: 'column' }}>
                    <label className="editor-label">Preview Visual (Simulador WhatsApp)</label>
                    <div className="whatsapp-phone-mockup" style={{
                      background: '#efeae2',
                      backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                      backgroundSize: 'cover',
                      borderRadius: '12px',
                      padding: '15px',
                      border: '1px solid #cbd5e1',
                      height: '280px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      boxSizing: 'border-box'
                    }}>
                      <div className="whatsapp-chat-bubble" style={{
                        background: '#d9fdd3',
                        borderRadius: '8px',
                        borderTopLeftRadius: '0',
                        padding: '8px 12px',
                        maxWidth: '85%',
                        boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
                        alignSelf: 'flex-start',
                        position: 'relative',
                        fontSize: '0.82rem',
                        lineHeight: '1.4',
                        color: '#111b21',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        boxSizing: 'border-box'
                      }}>
                        <div dangerouslySetInnerHTML={{ __html: formatWhatsAppPreview(editingTemplate.whatsapp_body, smtpConfig.system_url) || '<span style="color:#8696a0">Escreva sua mensagem ao lado para ver o preview...</span>' }} />
                        <span style={{
                          float: 'right',
                          fontSize: '0.62rem',
                          color: '#667781',
                          marginTop: '4px',
                          marginLeft: '8px',
                          display: 'block'
                        }}>
                          {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowTemplatesModal(false)}>Fechar</button>
              <button type="button" className="btn-save" onClick={handleSaveTemplate}>Salvar Modelo</button>
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
