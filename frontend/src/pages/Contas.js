import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getContas, createConta, updateConta, deleteConta, generatePixSubscription, checkSubscriptionStatus } from '../services/api';
import Navbar from '../components/Navbar';
import './Contas.css';

function Contas() {
  const [contas, setContas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showProLimitModal, setShowProLimitModal] = useState(false);
  const [proLimitMessage, setProLimitMessage] = useState('');
  
  // Checkout PRO
  const [pixData, setPixData] = useState(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const pollingRef = useRef(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [editingConta, setEditingConta] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    saldo_inicial: 0,
    limite_total: 0,
    tipo: 'Conta Corrente'
  });
  const navigate = useNavigate();

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const handleStartSubscription = async () => {
    try {
      setIsGeneratingPix(true);
      const response = await generatePixSubscription();
      setPixData(response.data);
      setPaymentStatus('PENDING');
      startPaymentPolling(response.data.txid);
    } catch (error) {
      alert('Erro ao gerar PIX. Verifique a configuração.');
    } finally {
      setIsGeneratingPix(false);
    }
  };

  const startPaymentPolling = (txid) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const response = await checkSubscriptionStatus(txid);
        if (response.data.status === 'PAID') {
          setPaymentStatus('PAID');
          clearInterval(pollingRef.current);
          const user = JSON.parse(localStorage.getItem('user'));
          const updatedUser = { ...user, is_pro: true };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setTimeout(() => { window.location.reload(); }, 3000);
        }
      } catch (error) { console.error(error); }
    }, 5000);
  };

  useEffect(() => {
    loadContas();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  const loadContas = async () => {
    try {
      const response = await getContas();
      setContas(response.data);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
      if (error.response?.status === 401) {
        navigate('/');
      }
    }
  };

  const formatarMoeda = (valor) => {
    return Number(valor || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingConta) {
        // Na edição, não enviar saldo_inicial
        await updateConta(editingConta.id, {
          nome: formData.nome,
          descricao: formData.descricao,
          tipo: formData.tipo,
          limite_total: formData.limite_total
        });
        triggerToast('Conta atualizada com sucesso!');
      } else {
        await createConta(formData);
        triggerToast('Conta criada com sucesso!');
      }
      setShowModal(false);
      setEditingConta(null);
      setFormData({ nome: '', descricao: '', saldo_inicial: 0, limite_total: 0, tipo: 'Conta Corrente' });
      loadContas();
    } catch (error) {
      if (error.response?.status === 403) {
        setProLimitMessage(error.response?.data?.error || 'Você atingiu o limite do seu plano.');
        setShowProLimitModal(true);
        setPixData(null);
        setPaymentStatus(null);
        setShowModal(false);
      } else {
        triggerToast('Erro ao salvar conta', 'error');
      }
    }
  };

  const handleEdit = (conta) => {
    setEditingConta(conta);
    setFormData({
      nome: conta.nome,
      descricao: conta.descricao || '',
      saldo_inicial: conta.saldo_inicial,
      limite_total: conta.limite_total || 0,
      tipo: conta.tipo || 'Conta Corrente'
    });
    setShowModal(true);
  };

  const handleDelete = (conta) => {
    setItemToDelete(conta);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteConta(itemToDelete.id);
      triggerToast('Conta excluída com sucesso!');
      setShowDeleteModal(false);
      setItemToDelete(null);
      loadContas();
    } catch (error) {
      const mensagem = error.response?.data?.error || 'Erro ao excluir conta';
      triggerToast(mensagem, 'error');
      setShowDeleteModal(false);
    }
  };

  const handleNew = () => {
    setEditingConta(null);
    setFormData({ nome: '', descricao: '', saldo_inicial: 0, limite_total: 0, tipo: 'Conta Corrente' });
    setShowModal(true);
  };

  return (
    <div className="page-container">
      <Navbar />

      <div className="content">
        <div className="header">
          <h2>Contas</h2>
          <button className="btn-new" onClick={handleNew}>+ Nova Conta</button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Saldo Atual</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {contas.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{textAlign: 'center'}}>Nenhuma conta cadastrada</td>
                </tr>
              ) : (
                contas.map(conta => (
                  <tr key={conta.id}>
                    <td>{conta.nome}</td>
                    <td>
                      <span className={`badge badge-tipo badge-${conta.tipo?.toLowerCase().replace(' ', '-') || 'corrente'}`}>
                        {conta.tipo || 'Conta Corrente'}
                      </span>
                    </td>
                    <td>{conta.descricao || '-'}</td>
                    <td className={parseFloat(conta.saldo_inicial) >= 0 ? 'valor-positivo' : 'valor-negativo'}>
                      R$ {formatarMoeda(conta.saldo_inicial)}
                    </td>
                    <td className="actions-column">
                      <div className="actions-cell">
                        <button className="btn-edit" onClick={() => handleEdit(conta)}>Editar</button>
                        <button className="btn-delete" onClick={() => handleDelete(conta)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>{editingConta ? 'Editar Conta' : 'Nova Conta'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nome *</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Tipo *</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                  required
                >
                  <option value="Conta Corrente">Conta Corrente</option>
                  <option value="Conta Poupança">Conta Poupança</option>
                  <option value="Conta Investimento">Conta Investimento</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Dinheiro">Dinheiro</option>
                </select>
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>{formData.tipo === 'Cartão de Crédito' ? 'Fatura Atual' : 'Saldo Inicial'} {editingConta && '(não editável)'}</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.saldo_inicial}
                  onChange={(e) => setFormData({...formData, saldo_inicial: e.target.value})}
                  disabled={!!editingConta}
                  style={editingConta ? {backgroundColor: '#f0f0f0', cursor: 'not-allowed'} : {}}
                />
              </div>

              {formData.tipo === 'Cartão de Crédito' && (
                <div className="form-group">
                  <label>Limite Total *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.limite_total}
                    onChange={(e) => setFormData({...formData, limite_total: e.target.value})}
                    required
                  />
                </div>
              )}

              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Cancelar</button>
                <button type="submit" className="btn-save">Salvar Conta</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Exclusão */}
      {showDeleteModal && (
        <div className="modal">
          <div className="modal-content delete-modal">
            <div className="modal-icon warning">⚠️</div>
            <h3>Excluir Conta?</h3>
            <p>Deseja realmente excluir a conta <strong>{itemToDelete?.nome}</strong>?</p>
            <div className="warning-box">
              Esta ação não poderá ser desfeita. A conta só será excluída se não houver lançamentos vinculados a ela.
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
              <button className="btn-delete-confirm" onClick={confirmDelete}>Sim, Excluir</button>
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
      {/* Modal de Limite PRO / Checkout */}
      {showProLimitModal && (
        <div className="modal">
          <div className="modal-content premium-card pro-limit-modal checkout-modal">
            <button className="btn-close-modal" onClick={() => setShowProLimitModal(false)}>✕</button>
            
            {!pixData ? (
              <>
                <div className="modal-icon diamond">💎</div>
                <h3>Limite Atingido</h3>
                <div className="pro-limit-content">
                  <p>{proLimitMessage || 'Acesse recursos ilimitados e impulsione sua gestão financeira.'}</p>
                  <div className="pro-benefit-box">
                    <p><strong>Benefícios do Plano PRO:</strong></p>
                    <ul>
                      <li>✨ Contas e Lançamentos ilimitados</li>
                      <li>📊 Gráficos e análises avançadas</li>
                      <li>🏦 Gestão de múltiplas contas</li>
                    </ul>
                  </div>
                  
                  <div className="price-tag">
                    <span className="currency">R$</span>
                    <span className="amount">9,99</span>
                    <span className="period">/mês</span>
                  </div>

                  <button 
                    className="btn-save btn-upgrade-confirm" 
                    onClick={handleStartSubscription}
                    disabled={isGeneratingPix}
                  >
                    {isGeneratingPix ? 'Gerando PIX...' : 'Assinar Agora via PIX'}
                  </button>
                </div>
              </>
            ) : paymentStatus === 'PAID' ? (
              <div className="success-checkout">
                <div className="success-icon">🎉</div>
                <h3>Pagamento Confirmado!</h3>
                <p>Seu acesso PRO foi liberado. Aproveite!</p>
                <div className="loading-spinner-small"></div>
              </div>
            ) : (
              <div className="pix-checkout-area">
                <h3>Pagamento via PIX</h3>
                <p>Escaneie o QR Code ou use o Copia e Cola.</p>
                
                <div className="qrcode-container">
                  <img src={pixData.imagemQrcode} alt="QR Code PIX" />
                </div>
                
                <div className="copia-e-cola-box">
                  <div className="copy-input">
                    <input type="text" readOnly value={pixData.copiaECola} id="pix-copy-input-contas" />
                    <button onClick={() => {
                      const copyText = document.getElementById("pix-copy-input-contas");
                      copyText.select();
                      document.execCommand("copy");
                      triggerToast('Copiado!');
                    }}>Copiar</button>
                  </div>
                </div>

                <div className="polling-status">
                  <div className="spinner"></div>
                  <span>Aguardando pagamento...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Contas;
