import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLembretes, createLembrete, updateLembrete, deleteLembrete } from '../services/api';
import './Lembretes.css';

function Lembretes() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isPro = user.is_pro === true;

  const [lembretes, setLembretes] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataHora, setDataHora] = useState('');
  const [recorrencia, setRecorrencia] = useState('unico');
  
  const [showFormModal, setShowFormModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    if (isPro) {
      loadLembretes();
    }
    // eslint-disable-next-line
  }, []);

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const loadLembretes = async () => {
    setLoading(true);
    try {
      const response = await getLembretes();
      if (response.data?.ok) {
        setLembretes(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar lembretes:', error);
      if (error.response?.status === 401) {
        navigate('/');
      } else {
        triggerToast('Erro ao carregar lembretes', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titulo || !dataHora || !recorrencia) {
      return triggerToast('Preencha os campos obrigatórios', 'error');
    }

    const payload = { titulo, descricao, data_hora: dataHora, recorrencia };

    try {
      if (editingId) {
        const response = await updateLembrete(editingId, payload);
        if (response.data?.ok) {
          triggerToast('Lembrete atualizado com sucesso! 🔔');
          setLembretes(prev => prev.map(l => l.id === editingId ? response.data.data : l));
        }
      } else {
        const response = await createLembrete(payload);
        if (response.data?.ok) {
          triggerToast('Lembrete criado com sucesso! 🔔');
          setLembretes(prev => [response.data.data, ...prev]);
        }
      }
      closeForm();
    } catch (error) {
      console.error('Erro ao salvar lembrete:', error);
      triggerToast(error.response?.data?.error || 'Erro ao salvar lembrete', 'error');
    }
  };

  const handleToggleStatus = async (lembrete) => {
    const newStatus = lembrete.status === 'ativo' ? 'inativo' : 'ativo';
    try {
      const response = await updateLembrete(lembrete.id, {
        titulo: lembrete.titulo,
        descricao: lembrete.descricao,
        data_hora: lembrete.data_hora,
        recorrencia: lembrete.recorrencia,
        status: newStatus
      });
      if (response.data?.ok) {
        triggerToast(newStatus === 'ativo' ? 'Lembrete reativado!' : 'Lembrete pausado!');
        setLembretes(prev => prev.map(l => l.id === lembrete.id ? response.data.data : l));
      }
    } catch (error) {
      console.error('Erro ao alternar status do lembrete:', error);
      triggerToast('Erro ao alternar status do lembrete', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja realmente excluir este lembrete?')) return;
    try {
      await deleteLembrete(id);
      triggerToast('Lembrete excluído com sucesso!');
      setLembretes(prev => prev.filter(l => l.id !== id));
    } catch (error) {
      console.error('Erro ao excluir lembrete:', error);
      triggerToast('Erro ao excluir lembrete', 'error');
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setTitulo('');
    setDescricao('');
    
    // Set default datetime value to local current time + 1 hour formatted for datetime-local
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    const formatted = now.toISOString().slice(0, 16);
    
    setDataHora(formatted);
    setRecorrencia('unico');
    setShowFormModal(true);
  };

  const openEditModal = (lembrete) => {
    setEditingId(lembrete.id);
    setTitulo(lembrete.titulo);
    setDescricao(lembrete.descricao || '');
    
    // Format date string for datetime-local input
    const formattedDate = new Date(lembrete.data_hora).toISOString().slice(0, 16);
    setDataHora(formattedDate);
    setRecorrencia(lembrete.recorrencia);
    setShowFormModal(true);
  };

  const closeForm = () => {
    setShowFormModal(false);
    setEditingId(null);
    setTitulo('');
    setDescricao('');
    setDataHora('');
    setRecorrencia('unico');
  };

  const getRecorrenciaLabel = (rec) => {
    const labels = {
      'unico': 'Único (Não repete)',
      'diario': 'Diário',
      'semanal': 'Semanal',
      'mensal': 'Mensal',
      'anual': 'Anual'
    };
    return labels[rec] || rec;
  };

  const getRecorrenciaEmoji = (rec) => {
    const emojis = {
      'unico': '📍',
      'diario': '🔄',
      'semanal': '📅',
      'mensal': '🗓️',
      'anual': '⏳'
    };
    return emojis[rec] || '🔔';
  };

  // If user is not PRO, render the upgrade screen
  if (!isPro) {
    return (
      <div className="page-container">
        <div className="content paywall-wrapper">
          <div className="paywall-card premium-card">
            <div className="paywall-badge">RECURSO EXCLUSIVO PRO 💎</div>
            <div className="paywall-icon">🔔</div>
            <h2>Lembretes Personalizados por WhatsApp & E-mail</h2>
            <p className="paywall-tagline">
              Crie notificações personalizadas com recorrência (diária, mensal, etc.) e receba avisos automáticos diretamente no seu celular e caixa de entrada na data e hora marcadas!
            </p>
            
            <div className="benefits-grid">
              <div className="benefit-item">
                <span className="benefit-icon">💬</span>
                <div>
                  <h4>Notificação no WhatsApp</h4>
                  <p>Chega direto no seu celular cadastrado no sistema via Evolution API.</p>
                </div>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✉️</span>
                <div>
                  <h4>E-mail de Backup</h4>
                  <p>Garantia de que você será avisado onde quer que esteja.</p>
                </div>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">🔄</span>
                <div>
                  <h4>Recorrências Flexíveis</h4>
                  <p>Agende lembretes únicos ou repetitivos: diário, semanal, mensal ou anual.</p>
                </div>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">💼</span>
                <div>
                  <h4>Foco em Organização</h4>
                  <p>Nunca mais esqueça de conciliar contas, pagar faturas avulsas ou cobrar clientes.</p>
                </div>
              </div>
            </div>

            <div className="paywall-action-pane">
              <button className="btn-paywall-upgrade" onClick={() => navigate('/assinatura')}>
                Adquirir Plano PRO por R$ 9.90/mês 🚀
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="content">
        <div className="header">
          <h2>🔔 Lembretes Inteligentes (PRO)</h2>
          <button className="btn-create-lembrete" onClick={openCreateModal}>
            ➕ Criar Novo Lembrete
          </button>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Carregando seus lembretes...</p>
          </div>
        ) : (
          <div className="lembretes-grid">
            {lembretes.length === 0 ? (
              <div className="empty-lembretes-card">
                <div className="empty-icon">🔔</div>
                <h3>Nenhum lembrete cadastrado</h3>
                <p>Crie lembretes personalizados para ser avisado por WhatsApp e E-mail nas datas e horários que definir.</p>
                <button className="btn-create-lembrete-empty" onClick={openCreateModal}>
                  Criar Primeiro Lembrete
                </button>
              </div>
            ) : (
              lembretes.map(l => (
                <div key={l.id} className={`lembrete-card premium-card ${l.status === 'inativo' ? 'paused' : ''} ${l.status === 'concluido' ? 'completed' : ''}`}>
                  <div className="lembrete-card-header">
                    <span className="recorrencia-badge" title={`Recorrência: ${getRecorrenciaLabel(l.recorrencia)}`}>
                      {getRecorrenciaEmoji(l.recorrencia)} {getRecorrenciaLabel(l.recorrencia)}
                    </span>
                    <span className={`status-badge status-${l.status}`}>
                      {l.status === 'ativo' ? 'Ativo ✅' : l.status === 'inativo' ? 'Pausado ⏸️' : 'Concluído 🏁'}
                    </span>
                  </div>

                  <h3 className="lembrete-title">{l.titulo}</h3>
                  {l.descricao && <p className="lembrete-desc">{l.descricao}</p>}
                  
                  <div className="lembrete-time-info">
                    <div className="time-item">
                      <span className="time-label">Próximo Envio:</span>
                      <span className="time-value">
                        {l.status === 'concluido' ? 'Concluído' : new Date(l.data_hora).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    {l.ultimo_envio && (
                      <div className="time-item">
                        <span className="time-label">Último Envio:</span>
                        <span className="time-value">{new Date(l.ultimo_envio).toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                  </div>

                  <div className="lembrete-card-actions">
                    {l.status !== 'concluido' && (
                      <button 
                        className={`btn-card-action btn-toggle-status ${l.status === 'ativo' ? 'pause' : 'resume'}`}
                        onClick={() => handleToggleStatus(l)}
                        title={l.status === 'ativo' ? 'Pausar Lembrete' : 'Reativar Lembrete'}
                      >
                        {l.status === 'ativo' ? '⏸️ Pausar' : '▶️ Ativar'}
                      </button>
                    )}
                    <button 
                      className="btn-card-action btn-edit" 
                      onClick={() => openEditModal(l)}
                      title="Editar Lembrete"
                    >
                      ✏️ Editar
                    </button>
                    <button 
                      className="btn-card-action btn-delete" 
                      onClick={() => handleDelete(l.id)}
                      title="Excluir Lembrete"
                    >
                      🗑️ Excluir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showFormModal && (
        <div className="modal">
          <div className="modal-content premium-card lembrete-form-modal">
            <div className="modal-header">
              <h3>{editingId ? 'Editar Lembrete 🔔' : 'Criar Lembrete 🔔'}</h3>
              <button className="btn-close" onClick={closeForm}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="lembrete-form">
              <div className="form-group">
                <label className="required-field">Título / Tópico</label>
                <input 
                  type="text" 
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Conciliar lançamentos de ontem"
                  maxLength={150}
                  required
                />
              </div>

              <div className="form-group">
                <label>Descrição (opcional)</label>
                <textarea 
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Entrar no banco XP e conferir se todos os pix bateram com as entradas."
                  rows={3}
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="required-field">Data e Hora</label>
                  <input 
                    type="datetime-local" 
                    value={dataHora}
                    onChange={(e) => setDataHora(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="required-field">Recorrência</label>
                  <select 
                    value={recorrencia}
                    onChange={(e) => setRecorrencia(e.target.value)}
                    required
                  >
                    <option value="unico">Único (Não repete)</option>
                    <option value="diario">Diário</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              </div>

              <div className="notification-warning-box">
                <p>💡 <strong>Aviso:</strong> A mensagem será enviada automaticamente para seu <strong>E-mail</strong> e <strong>WhatsApp</strong> ({user.whatsapp || 'celular não cadastrado'}) no dia e hora agendados.</p>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={closeForm}>Cancelar</button>
                <button type="submit" className="btn-save">{editingId ? 'Salvar Alterações' : 'Criar Lembrete'}</button>
              </div>
            </form>
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

export default Lembretes;
