import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPerfil, updatePerfil, getWhatsappStatus, getEvolutionConfig, updateEvolutionConfig, sendTestMessage, sendRemindersNow } from '../services/api';
import Navbar from '../components/Navbar';
import './Perfil.css';

function Perfil() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [waStatus, setWaStatus] = useState({ state: 'desconhecido', message: '' });
  const [waLoading, setWaLoading] = useState(false);
  const [evolutionConfig, setEvolutionConfig] = useState({
    url: '',
    instancia: '',
    token: ''
  });
  const [configLoading, setConfigLoading] = useState(false);
  const [testMessageLoading, setTestMessageLoading] = useState(false);
  const [remindersLoading, setRemindersLoading] = useState(false);
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
    fetchPerfil();
    fetchWhatsappStatus();
    fetchEvolutionConfig();
  }, []);

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
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
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
      setWaStatus({ state: 'Erro ❌', message: error.response?.data?.error || 'Não foi possível obter o status' });
    }
  };

  const fetchEvolutionConfig = async () => {
    try {
      const response = await getEvolutionConfig();
      setEvolutionConfig(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar config Evolution:', error);
    }
  };

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setEvolutionConfig({ ...evolutionConfig, [name]: value });
  };

  const handleSaveConfig = async () => {
    setConfigLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await updateEvolutionConfig(evolutionConfig);
      setMessage({ type: 'success', text: 'Configuração salva com sucesso!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Erro ao salvar configuração' });
    } finally {
      setConfigLoading(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!formData.whatsapp) {
      setMessage({ type: 'error', text: 'Informe seu número de WhatsApp primeiro!' });
      return;
    }

    setTestMessageLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await sendTestMessage(formData.whatsapp);
      setMessage({ type: 'success', text: 'Mensagem de teste enviada com sucesso! Verifique seu WhatsApp.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Erro ao enviar mensagem de teste' });
    } finally {
      setTestMessageLoading(false);
    }
  };

  const handleSendRemindersNow = async () => {
    setRemindersLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await sendRemindersNow();
      setMessage({ type: 'success', text: 'Lembretes disparados com sucesso! Verifique seu WhatsApp para mensagens de hoje e amanhã.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 6000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Erro ao disparar lembretes' });
    } finally {
      setRemindersLoading(false);
    }
  };


  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // Validações
    if (!formData.nome || !formData.email) {
      setMessage({ type: 'error', text: 'Nome e email são obrigatórios' });
      return;
    }

    // Se está tentando alterar a senha
    if (formData.novaSenha || formData.confirmarSenha || formData.senhaAtual) {
      if (!formData.senhaAtual) {
        setMessage({ type: 'error', text: 'Informe a senha atual para alterá-la' });
        return;
      }
      if (!formData.novaSenha) {
        setMessage({ type: 'error', text: 'Informe a nova senha' });
        return;
      }
      if (formData.novaSenha.length < 6) {
        setMessage({ type: 'error', text: 'A nova senha deve ter no mínimo 6 caracteres' });
        return;
      }
      if (formData.novaSenha !== formData.confirmarSenha) {
        setMessage({ type: 'error', text: 'As senhas não coincidem' });
        return;
      }
    }

    try {
      const data = {
        nome: formData.nome,
        email: formData.email,
        whatsapp: formData.whatsapp,
        corTema: formData.corTema
      };

      if (formData.novaSenha) {
        data.senhaAtual = formData.senhaAtual;
        data.novaSenha = formData.novaSenha;
      }

      const response = await updatePerfil(data);
      
      // Atualizar localStorage com novos dados
      const user = JSON.parse(localStorage.getItem('user'));
      user.nome = response.data.user.nome;
      user.email = response.data.user.email;
      user.corTema = response.data.user.cor_tema;
      user.whatsapp = response.data.user.whatsapp || '';
      localStorage.setItem('user', JSON.stringify(user));

      // Aplicar tema imediatamente
      document.documentElement.setAttribute('data-theme', formData.corTema);

      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      
      // Limpar campos de senha
      setFormData({
        ...formData,
        senhaAtual: '',
        novaSenha: '',
        confirmarSenha: ''
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Erro ao atualizar perfil' 
      });
    }
  };

  if (loading) {
    return <div className="perfil-container">Carregando...</div>;
  }

  return (
    <>
      <Navbar />
      <div className="perfil-container">
        <div className="perfil-card">
          <div className="perfil-header">
            <h1>Meu Perfil</h1>
          </div>

          {message.text && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="perfil-form">
          <div className="form-section">
            <h2>Dados Pessoais</h2>
            
            <div className="form-group">
              <label htmlFor="nome">Nome Completo</label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                placeholder="Seu nome completo"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">E-mail</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="seu@email.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="whatsapp">WhatsApp (com DDD e país)</label>
              <input
                type="text"
                id="whatsapp"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                placeholder="Ex: 5511999999999"
              />
            </div>
          </div>

          <div className="form-section">
            <h2>WhatsApp</h2>
            <p className="section-description">
              Informe seu número com DDI e DDD para receber lembretes automáticos (D-1 e no dia) de saídas não pagas.
            </p>
            <div className="wa-status-row">
              <div className={`wa-badge ${waStatus.state}`}>
                Status da instância: {waStatus.state}
              </div>
              <button
                type="button"
                className="btn-wa-connect"
                onClick={fetchWhatsappStatus}
                disabled={waLoading}
              >
                {waLoading ? 'Verificando...' : 'Atualizar status'}
              </button>
            </div>
            <button
              type="button"
              className="btn-test-message"
              onClick={handleSendTestMessage}
              disabled={testMessageLoading || !formData.whatsapp}
            >
              {testMessageLoading ? 'Enviando...' : '📱 Enviar mensagem de teste'}
            </button>
          </div>

          <div className="form-section">
            <h2>Configuração da API Evolution</h2>
            <p className="section-description">
              Configure a URL, instância e token da API Evolution para WhatsApp.
            </p>
            
            <div className="form-group">
              <label htmlFor="url">URL da API</label>
              <input
                type="text"
                id="url"
                name="url"
                value={evolutionConfig.url}
                onChange={handleConfigChange}
                placeholder="https://netconnect.netsolutions.com.br"
              />
            </div>

            <div className="form-group">
              <label htmlFor="instancia">Instância</label>
              <input
                type="text"
                id="instancia"
                name="instancia"
                value={evolutionConfig.instancia}
                onChange={handleConfigChange}
                placeholder="financeiro"
              />
            </div>

            <div className="form-group">
              <label htmlFor="token">Token / API Key</label>
              <input
                type="password"
                id="token"
                name="token"
                value={evolutionConfig.token}
                onChange={handleConfigChange}
                placeholder="Cole aqui seu token da API Evolution"
              />
            </div>

            <button
              type="button"
              className="btn-save-config"
              onClick={handleSaveConfig}
              disabled={configLoading}
            >
              {configLoading ? 'Salvando...' : 'Salvar Configuração'}
            </button>
          </div>

          <div className="form-section">
            <h2>Teste de Lembretes Automáticos</h2>
            <p className="section-description">
              Dispare os lembretes de D-1 e D0 manualmente para testar a integração.
            </p>
            <p className="section-info">
              ℹ️ Certifique-se de que:
            </p>
            <ul className="reminder-checklist">
              <li>Sua instância Evolution está <strong>conectada</strong> ✅</li>
              <li>Seu <strong>número de WhatsApp</strong> está preenchido</li>
              <li>Você tem <strong>lançamentos não pagos</strong> cadastrados para hoje e/ou amanhã</li>
            </ul>
            <button
              type="button"
              className="btn-send-reminders"
              onClick={handleSendRemindersNow}
              disabled={remindersLoading}
            >
              {remindersLoading ? 'Disparando...' : '🚀 Disparar Lembretes Agora'}
            </button>
          </div>

          <div className="form-section">
            <h2>Aparência</h2>
            <p className="section-description">
              Escolha a cor do tema do sistema
            </p>

            <div className="theme-selector">
              <div 
                className={`theme-option roxo ${formData.corTema === 'roxo' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, corTema: 'roxo'})}
              >
                <div className="theme-preview" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}></div>
                <span>Roxo</span>
              </div>

              <div 
                className={`theme-option azul ${formData.corTema === 'azul' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, corTema: 'azul'})}
              >
                <div className="theme-preview" style={{background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)'}}></div>
                <span>Azul</span>
              </div>

              <div 
                className={`theme-option verde ${formData.corTema === 'verde' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, corTema: 'verde'})}
              >
                <div className="theme-preview" style={{background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'}}></div>
                <span>Verde</span>
              </div>

              <div 
                className={`theme-option laranja ${formData.corTema === 'laranja' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, corTema: 'laranja'})}
              >
                <div className="theme-preview" style={{background: 'linear-gradient(135deg, #f46b45 0%, #eea849 100%)'}}></div>
                <span>Laranja</span>
              </div>

              <div 
                className={`theme-option rosa ${formData.corTema === 'rosa' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, corTema: 'rosa'})}
              >
                <div className="theme-preview" style={{background: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)'}}></div>
                <span>Rosa</span>
              </div>

              <div 
                className={`theme-option vermelho ${formData.corTema === 'vermelho' ? 'active' : ''}`}
                onClick={() => setFormData({...formData, corTema: 'vermelho'})}
              >
                <div className="theme-preview" style={{background: 'linear-gradient(135deg, #cb2d3e 0%, #ef473a 100%)'}}></div>
                <span>Vermelho</span>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Alterar Senha</h2>
            <p className="section-description">
              Deixe em branco se não deseja alterar a senha
            </p>

            <div className="form-group">
              <label htmlFor="senhaAtual">Senha Atual</label>
              <input
                type="password"
                id="senhaAtual"
                name="senhaAtual"
                value={formData.senhaAtual}
                onChange={handleChange}
                placeholder="Digite sua senha atual"
              />
            </div>

            <div className="form-group">
              <label htmlFor="novaSenha">Nova Senha</label>
              <input
                type="password"
                id="novaSenha"
                name="novaSenha"
                value={formData.novaSenha}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmarSenha">Confirmar Nova Senha</label>
              <input
                type="password"
                id="confirmarSenha"
                name="confirmarSenha"
                value={formData.confirmarSenha}
                onChange={handleChange}
                placeholder="Digite novamente a nova senha"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-salvar">
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}

export default Perfil;
