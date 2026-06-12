import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getLancamentos, 
  createLancamento, 
  updateLancamento, 
  deleteLancamento, 
  getContas,
  getCategorias,
  getSubcategorias,
  togglePagoLancamento,
  generatePixSubscription,
  checkSubscriptionStatus,
  deleteAllLancamentos
} from '../services/api';
import { useRef } from 'react';
import './Lancamentos.css';

function Lancamentos() {
  const [lancamentos, setLancamentos] = useState([]);
  const [contas, setContas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showProLimitModal, setShowProLimitModal] = useState(false);
  const [proLimitMessage, setProLimitMessage] = useState('');
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  
  // Checkout PRO
  const [pixData, setPixData] = useState(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const pollingRef = useRef(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [editingLancamento, setEditingLancamento] = useState(null);
  const [filterMes, setFilterMes] = useState('TODOS');
  const [filterCategoria, setFilterCategoria] = useState('TODAS');
  const [filterSubcategoria, setFilterSubcategoria] = useState('TODAS');
  const [filterTipo, setFilterTipo] = useState('TODOS');
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    tipo: 'saida',
    data: new Date().toLocaleDateString('en-CA'),
    conta_id: '',
    categoria_id: '',
    subcategoria_id: '',
    parcelado: false,
    recorrente: false,
    num_parcelas: 1,
    pago: false
  });
  const navigate = useNavigate();

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingLancamento(null);
    setFormData({
      descricao: '',
      valor: '',
      tipo: 'saida',
      data: new Date().toLocaleDateString('en-CA'),
      conta_id: '',
      categoria_id: '',
      subcategoria_id: '',
      parcelado: false,
      recorrente: false,
      num_parcelas: 1,
      pago: false
    });
    setSubcategorias([]);
  };

  useEffect(() => {
    loadLancamentos();
    loadContas();
    loadCategorias();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    // eslint-disable-next-line
  }, []);

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

  const loadLancamentos = async () => {
    try {
      const response = await getLancamentos();
      setLancamentos(response.data);
    } catch (error) {
      console.error('Erro ao carregar lançamentos:', error);
      if (error.response?.status === 401) {
        navigate('/');
      }
    }
  };

  const loadContas = async () => {
    try {
      const response = await getContas();
      setContas(response.data);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    }
  };

  const loadCategorias = async () => {
    try {
      const response = await getCategorias();
      setCategorias(response.data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const loadSubcategoriasPorCategoria = async (categoriaId) => {
    if (!categoriaId) {
      setSubcategorias([]);
      return;
    }
    try {
      const response = await getSubcategorias(categoriaId);
      setSubcategorias(response.data);
    } catch (error) {
      console.error('Erro ao carregar subcategorias:', error);
      setSubcategorias([]);
    }
  };

  const formatarMoeda = (valor) => {
    return Number(valor || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handleFilterCategoriaChange = (e) => {
    const categId = e.target.value;
    setFilterCategoria(categId);
    setFilterSubcategoria('TODAS');
    
    if (categId === 'TODAS') {
      setSubcategorias([]);
    } else {
      // Extrair subcategorias da categoria selecionada sem duplicatas
      const subCatsMap = new Map();
      lancamentos
        .filter(l => String(l.categoria_id) === String(categId) && l.subcategoria_nome)
        .forEach(l => {
          if (!subCatsMap.has(l.subcategoria_id)) {
            subCatsMap.set(l.subcategoria_id, { id: l.subcategoria_id, nome: l.subcategoria_nome });
          }
        });
      setSubcategorias(Array.from(subCatsMap.values()));
    }
  };

  const handleFilterTipoChange = (e) => {
    setFilterTipo(e.target.value);
    setFilterCategoria('TODAS');
    setFilterSubcategoria('TODAS');
    setSubcategorias([]);
  };

  const getCategoriasDisponiveis = () => {
    let cats = lancamentos;
    
    if (filterTipo !== 'TODOS') {
      cats = cats.filter(l => l.tipo === filterTipo);
    }
    
    const categoriasSet = new Map();
    cats.forEach(l => {
      if (l.categoria_id) {
        categoriasSet.set(l.categoria_id, { id: l.categoria_id, nome: l.categoria_nome });
      }
    });
    
    return Array.from(categoriasSet.values());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLancamento) {
        await updateLancamento(editingLancamento.id, formData);
      } else {
        await createLancamento(formData);
      }
      handleCloseModal();
      loadLancamentos();
      triggerToast(editingLancamento ? 'Lançamento atualizado!' : 'Lançamento criado!');
    } catch (error) {
      if (error.response?.status === 403) {
        setProLimitMessage(error.response?.data?.error || 'Limite de lançamentos atingido.');
        setShowProLimitModal(true);
        setPixData(null);
        setPaymentStatus(null);
        setShowModal(false);
      } else {
        console.error('Erro completo:', error);
        triggerToast(error.response?.data?.error || 'Erro ao salvar lançamento', 'error');
      }
    }
  };

  const handleEdit = (lancamento) => {
    setEditingLancamento(lancamento);
    
    // Carregar subcategorias antes de setar o formData
    if (lancamento.categoria_id) {
      loadSubcategoriasPorCategoria(lancamento.categoria_id);
    } else {
      setSubcategorias([]);
    }
    
    setFormData({
      descricao: lancamento.descricao,
      valor: lancamento.valor,
      tipo: lancamento.tipo,
      data: lancamento.data.split('T')[0],
      conta_id: lancamento.conta_id,
      categoria_id: lancamento.categoria_id || '',
      subcategoria_id: lancamento.subcategoria_id || '',
      parcelado: false,
      num_parcelas: 1,
      pago: lancamento.pago !== undefined ? lancamento.pago : false,
    });
    
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setItemToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteLancamento(itemToDelete);
      triggerToast('Lançamento excluído com sucesso!');
      setShowDeleteModal(false);
      setItemToDelete(null);
      loadLancamentos();
    } catch (error) {
      triggerToast('Erro ao excluir lançamento', 'error');
      setShowDeleteModal(false);
    }
  };

  const handleTogglePago = async (lancamento) => {
    try {
      await togglePagoLancamento(lancamento.id);
      triggerToast(`Lançamento marcado como ${!lancamento.pago ? 'pago' : 'não pago'}!`);
      loadLancamentos();
    } catch (error) {
      triggerToast('Erro ao alterar status de pagamento', 'error');
    }
  };

  const confirmDeleteAll = async () => {
    try {
      await deleteAllLancamentos();
      triggerToast('Todos os lançamentos foram apagados!');
      setShowDeleteAllModal(false);
      loadLancamentos();
    } catch (error) {
      triggerToast('Erro ao apagar lançamentos', 'error');
    }
  };

  const handleNew = () => {
    setEditingLancamento(null);
    setFormData({
      descricao: '',
      valor: '',
      tipo: 'saida',
      data: new Date().toLocaleDateString('en-CA'),
      conta_id: contas.length > 0 ? contas[0].id : '',
      categoria_id: '',
      subcategoria_id: '',
      parcelado: false,
      recorrente: false,
      num_parcelas: 1,
      pago: false
    });
    setSubcategorias([]);
    setShowModal(true);
  };

  return (
    <div className="page-container lancamentos-page-container">

      <div className="content">
        <div className="header">
          <h2>Lançamentos</h2>
          <div className="header-actions">
            <button className="btn-delete-all-outline" onClick={() => setShowDeleteAllModal(true)}>
              🗑️ Limpar Tudo
            </button>
            <button className="btn-new" onClick={handleNew}>+ Novo Lançamento</button>
          </div>
        </div>

        <div className="filters-section">
          <select 
            value={filterMes} 
            onChange={(e) => setFilterMes(e.target.value)}
            className="filter-select"
          >
            <option value="TODOS">Todos os meses</option>
            {[...new Set(lancamentos.map(l => {
              const data = new Date(l.data);
              return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
            }))].sort().reverse().map(mes => {
              const [ano, mesNum] = mes.split('-');
              const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
              return <option key={mes} value={mes}>{meses[parseInt(mesNum) - 1]}/{ano}</option>;
            })}
          </select>

          <select 
            value={filterTipo} 
            onChange={handleFilterTipoChange}
            className="filter-select"
          >
            <option value="TODOS">Todos os tipos</option>
            <option value="entrada">Entradas</option>
            <option value="estorno">Estornos</option>
            <option value="neutro">Neutros</option>
            <option value="saida">Saídas</option>
          </select>

          <select 
            value={filterCategoria} 
            onChange={handleFilterCategoriaChange}
            className="filter-select"
          >
            <option value="TODAS">Todas as categorias</option>
            {[...getCategoriasDisponiveis()].sort((a, b) => a.nome.localeCompare(b.nome)).map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nome}</option>
            ))}
          </select>

          {filterCategoria !== 'TODAS' && subcategorias.length > 0 && (
            <select 
              value={filterSubcategoria} 
              onChange={(e) => setFilterSubcategoria(e.target.value)}
              className="filter-select"
            >
              <option value="TODAS">Todas as subcategorias</option>
              {[...subcategorias].sort((a, b) => a.nome.localeCompare(b.nome)).map(subCat => (
                <option key={subCat.id} value={subCat.id}>{subCat.nome}</option>
              ))}
            </select>
          )}
        </div>

        <div className="lancamentos-main-area">
          {(() => {
            let filtrados = lancamentos;

            if (filterMes !== 'TODOS') {
              filtrados = filtrados.filter(l => {
                const data = new Date(l.data);
                const mesLancamento = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
                return mesLancamento === filterMes;
              });
            }

            if (filterTipo !== 'TODOS') {
              filtrados = filtrados.filter(l => l.tipo === filterTipo);
            }

            if (filterCategoria !== 'TODAS') {
              filtrados = filtrados.filter(l => String(l.categoria_id) === String(filterCategoria));
            }

            if (filterSubcategoria !== 'TODAS' && filterCategoria !== 'TODAS') {
              filtrados = filtrados.filter(l => String(l.subcategoria_id) === String(filterSubcategoria));
            }

            // Agrupar por data
            const agrupadoPorData = {};
            filtrados.forEach(lancamento => {
              const data = new Date(lancamento.data).toLocaleDateString('pt-BR');
              if (!agrupadoPorData[data]) {
                agrupadoPorData[data] = [];
              }
              agrupadoPorData[data].push(lancamento);
            });

            // Ordenar datas decrescente
            const datasOrdenadas = Object.keys(agrupadoPorData).sort((a, b) => {
              const [diaA, mesA, anoA] = a.split('/');
              const [diaB, mesB, anoB] = b.split('/');
              return new Date(anoB, mesB - 1, diaB) - new Date(anoA, mesA - 1, diaA);
            });

            return datasOrdenadas.length > 0 ? (
              <div className="lancamentos-by-date">
                <div className="lancamentos-list-header">
                  <div className="header-col">Tipo</div>
                  <div className="header-col">Descrição</div>
                  <div className="header-col">Conta</div>
                  <div className="header-col">Valor</div>
                  <div className="header-col">Status</div>
                  <div className="header-col">Ações</div>
                </div>
                
                <div className="lancamentos-list-content">
                  {datasOrdenadas.map(data => {
                    const lancamentosDoDay = agrupadoPorData[data];
                    const totalEntrada = lancamentosDoDay
                      .filter(l => l.tipo === 'entrada' || l.tipo === 'estorno')
                      .reduce((sum, l) => sum + parseFloat(l.valor), 0);
                    const totalSaida = lancamentosDoDay
                      .filter(l => l.tipo === 'saida')
                      .reduce((sum, l) => sum + parseFloat(l.valor), 0) -
                      lancamentosDoDay
                      .filter(l => l.tipo === 'estorno')
                      .reduce((sum, l) => sum + parseFloat(l.valor), 0);
                    const saldoDia = totalEntrada - totalSaida;

                    return (
                      <div key={data} className="day-group">
                        <div className="day-header">
                          <div className="day-info">
                            <span className="day-date">{data}</span>
                            <span className={`day-balance ${saldoDia >= 0 ? 'positivo' : 'negativo'}`}>
                              Saldo: R$ {formatarMoeda(Math.abs(saldoDia))}
                            </span>
                          </div>
                          <div className="day-totals">
                            <span className="entrada">↑ Entrada/Estorno: R$ {formatarMoeda(totalEntrada)}</span>
                            <span className="saida">↓ Saída: R$ {formatarMoeda(totalSaida)}</span>
                          </div>
                        </div>
                        <div className="day-items">
                          {lancamentosDoDay.map(lancamento => (
                            <div key={lancamento.id} className={`lancamento-item ${lancamento.tipo}`}>
                              <div className="item-tipo">
                                <span className={`badge ${lancamento.tipo}`}>
                                  {lancamento.tipo === 'entrada' ? '↑ Entrada' : 
                                   lancamento.tipo === 'saida' ? '↓ Saída' : 
                                   lancamento.tipo === 'transferencia' ? '⇄ Transfer' : 
                                   lancamento.tipo === 'pagamento_fatura' ? '💳 Pagar Fatura' : 
                                   lancamento.tipo === 'estorno' ? '↺ Estorno' : '⊝ Neutro'}
                                </span>
                              </div>
                              <div className="item-descricao">
                                <div className="descricao-text">
                                  {lancamento.descricao}
                                  {(lancamento.tipo === 'transferencia' || lancamento.tipo === 'pagamento_fatura') && (
                                    <span className="transfer-info-small">
                                      ({lancamento.conta_nome} → {contas.find(c => Number(c.id) === Number(lancamento.conta_destino_id))?.nome || 'Conta Destino'})
                                    </span>
                                  )}
                                </div>
                                {lancamento.categoria_nome && (
                                  <div className="categoria-badges-inline">
                                    <span 
                                      className="categoria-badge-small"
                                      style={{ backgroundColor: lancamento.categoria_cor || '#7c3aed' }}
                                    >
                                      {lancamento.categoria_nome}
                                    </span>
                                    {lancamento.subcategoria_nome && (
                                      <span 
                                        className="subcategoria-badge-small"
                                        style={{ backgroundColor: lancamento.subcategoria_cor || '#7c3aed' }}
                                      >
                                        {lancamento.subcategoria_nome}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="item-conta">
                                <div className="conta-pill">
                                  <span className="conta-icon">🏦</span>
                                  <span className="conta-nome">{lancamento.conta_nome || '-'}</span>
                                </div>
                              </div>
                              <div className={`item-valor ${lancamento.tipo === 'entrada' || lancamento.tipo === 'estorno' ? 'valor-positivo' : lancamento.tipo === 'saida' ? 'valor-negativo' : ''}`}>
                                R$ {formatarMoeda(Number(lancamento.valor) || 0)}
                              </div>
                              <div className="item-pago">
                                {lancamento.tipo === 'saida' && lancamento.conta_tipo !== 'Cartão de Crédito' && (
                                  <button 
                                    className={`btn-toggle-pago-item ${lancamento.pago ? 'pago' : 'pendente'}`}
                                    onClick={() => handleTogglePago(lancamento)}
                                  >
                                    <span className={`badge-pago ${lancamento.pago ? 'pago' : 'pendente'}`}>
                                      {lancamento.pago ? (
                                        <>
                                          <span className="status-dot pago"></span>
                                          Pago
                                        </>
                                      ) : (
                                        <>
                                          <span className="status-dot pendente"></span>
                                          Não pago
                                        </>
                                      )}
                                    </span>
                                  </button>
                                )}
                                {lancamento.conta_tipo === 'Cartão de Crédito' && (
                                  <span className="badge-pago card-cc-badge">
                                    💳 Cartão
                                  </span>
                                )}
                              </div>
                              <div className="item-actions">
                                <button className="btn-action-edit" onClick={() => handleEdit(lancamento)} title="Editar">✏️</button>
                                <button className="btn-action-delete" onClick={() => handleDelete(lancamento.id)} title="Excluir">🗑️</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="empty-state-card" style={{ marginTop: '20px' }}>
                <div className="empty-state-icon">🔍</div>
                <p>Nenhum lançamento encontrado com os filtros aplicados.</p>
              </div>
            );
          })()}
        </div>
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content modal-lancamento">
            <button className="btn-close-modal" onClick={handleCloseModal}>✕</button>
            <div className="modal-body">
              <h3>{editingLancamento ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
            <form onSubmit={handleSubmit}>
              {/* Direção do lançamento */}
              <div className="form-group col-span-2">
                <label>Direção do lançamento *</label>
                <div className="btn-group">
                  <button
                    type="button"
                    className={formData.tipo === 'entrada' ? 'active' : ''}
                    onClick={() => setFormData({...formData, tipo: 'entrada', categoria_id: '', subcategoria_id: '', pago: false})}
                  >
                    Entrada
                  </button>
                  <button
                    type="button"
                    className={formData.tipo === 'saida' ? 'active' : ''}
                    onClick={() => setFormData({...formData, tipo: 'saida', categoria_id: '', subcategoria_id: ''})}
                  >
                    Saída
                  </button>
                  <button
                    type="button"
                    className={formData.tipo === 'neutro' ? 'active' : ''}
                    onClick={() => setFormData({...formData, tipo: 'neutro', categoria_id: '', subcategoria_id: '', pago: false})}
                  >
                    Neutro
                  </button>
                  <button
                    type="button"
                    className={formData.tipo === 'estorno' ? 'active' : ''}
                    onClick={() => {
                      const firstCard = contas.find(c => c.tipo === 'Cartão de Crédito');
                      setFormData({
                        ...formData,
                        tipo: 'estorno',
                        categoria_id: '',
                        subcategoria_id: '',
                        conta_id: firstCard ? firstCard.id.toString() : '',
                        pago: false
                      });
                    }}
                    style={{ backgroundColor: formData.tipo === 'estorno' ? '#7c3aed' : '', color: formData.tipo === 'estorno' ? 'white' : '' }}
                  >
                    Estorno
                  </button>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{formData.parcelado ? 'Valor Total (R$) *' : 'Valor *'}</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="R$ 0,00"
                    value={formData.valor}
                    onChange={(e) => setFormData({...formData, valor: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Data *</label>
                  <input
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({...formData, data: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* Pago (somente para saída) */}
              {formData.tipo === 'saida' && (
                <div className="form-group">
                  <label>Pagamento</label>
                  <div className="btn-group">
                    <button
                      type="button"
                      className={formData.pago ? 'active' : ''}
                      onClick={() => setFormData({...formData, pago: true})}
                    >
                      Pago
                    </button>
                    <button
                      type="button"
                      className={!formData.pago ? 'active' : ''}
                      onClick={() => setFormData({...formData, pago: false})}
                    >
                      Não pago
                    </button>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Descrição *</label>
                <input
                  type="text"
                  placeholder="Digite sua descrição"
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Conta *</label>
                <select
                  value={formData.conta_id}
                  onChange={(e) => setFormData({...formData, conta_id: e.target.value})}
                  required
                >
                  <option value="">Selecione a conta</option>
                  {contas
                    .filter(c => formData.tipo === 'estorno' ? c.tipo === 'Cartão de Crédito' : true)
                    .map(conta => (
                      <option key={conta.id} value={conta.id}>{conta.nome}</option>
                    ))}
                </select>
              </div>

              {/* Repetição do lançamento */}
              {(formData.tipo === 'saida' || formData.tipo === 'entrada' || formData.tipo === 'neutro') && (
                <div className="form-group">
                  <label>Repetição</label>
                  <div className="btn-group">
                    <button
                      type="button"
                      className={(!formData.parcelado && !formData.recorrente) ? 'active' : ''}
                      onClick={() => setFormData({...formData, parcelado: false, recorrente: false, num_parcelas: 1})}
                    >
                      Único
                    </button>
                    {formData.tipo === 'saida' && (
                      <button
                        type="button"
                        className={formData.parcelado ? 'active' : ''}
                        onClick={() => setFormData({...formData, parcelado: true, recorrente: false, num_parcelas: parseInt(formData.num_parcelas) > 1 ? formData.num_parcelas : 2})}
                      >
                        Parcelado
                      </button>
                    )}
                    <button
                      type="button"
                      className={formData.recorrente ? 'active' : ''}
                      onClick={() => setFormData({...formData, recorrente: true, parcelado: false, num_parcelas: 1})}
                    >
                      Fixo/Recorrente
                    </button>
                  </div>
                </div>
              )}

              {formData.parcelado && (
                <div className="form-group col-span-2">
                  <label>Número de parcelas *</label>
                  <input
                    type="number"
                    min="2"
                    max="120"
                    step="1"
                    placeholder="Número de parcelas"
                    value={formData.num_parcelas}
                    onChange={(e) => {
                      let val = e.target.value;
                      // Remover zeros à esquerda e caracteres não numéricos
                      val = val.replace(/^0+/, '');
                      if (val === '' || (!val.includes('.') && !val.includes(','))) {
                        setFormData({...formData, num_parcelas: val});
                      }
                    }}
                    required={formData.parcelado}
                  />
                  {parseInt(formData.num_parcelas) > 1 && (
                    <small className="help-text" style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                      O valor total (R$ {formData.valor || '0,00'}) será dividido em {formData.num_parcelas} parcelas de R$ {(Math.floor((parseFloat(formData.valor || 0) / (parseInt(formData.num_parcelas) || 1)) * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
                    </small>
                  )}
                  {(!formData.num_parcelas || parseInt(formData.num_parcelas) < 2) && (
                    <small className="help-text" style={{ display: 'block', marginTop: '5px', color: '#dc2626' }}>
                      ⚠️ Mínimo de 2 parcelas.
                    </small>
                  )}
                </div>
              )}

              {/* Classificação (Categorias) */}
              <div className="form-group col-span-2">
                <label>Classificação</label>
                <div className="categoria-buttons">
                  {categorias
                    .filter(cat => formData.tipo === 'estorno' ? cat.tipo === 'saida' : cat.tipo === formData.tipo)
                    .map(categoria => (
                      <button
                        key={categoria.id}
                        type="button"
                        className={String(formData.categoria_id) === String(categoria.id) ? 'active' : ''}
                        onClick={() => {
                          setFormData({...formData, categoria_id: categoria.id.toString(), subcategoria_id: ''});
                          loadSubcategoriasPorCategoria(categoria.id);
                        }}
                      >
                        {categoria.nome}
                      </button>
                    ))}
                </div>
              </div>

              {/* Subcategorias */}
              {formData.categoria_id && subcategorias.length > 0 && (
                <div className="form-group col-span-2">
                  <label>Subcategoria</label>
                  <select
                    value={formData.subcategoria_id}
                    onChange={(e) => setFormData({...formData, subcategoria_id: e.target.value})}
                  >
                    <option value="">Nenhuma</option>
                    {subcategorias.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.nome}</option>
                    ))}
                  </select>
                </div>
              )}

               <div className="modal-actions">
                <button type="button" onClick={handleCloseModal} className="btn-cancel">Cancelar</button>
                <button type="submit" className="btn-save">Salvar Lançamento</button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exclusão */}
      {showDeleteModal && (
        <div className="modal">
          <div className="modal-content delete-modal">
            <button className="btn-close-modal" onClick={() => setShowDeleteModal(false)}>✕</button>
            <div className="modal-body">
              <div className="modal-icon warning">⚠️</div>
              <h3>Excluir Lançamento?</h3>
              <p>Deseja realmente excluir este lançamento permanentemente?</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
              <button className="btn-delete-confirm" onClick={confirmDelete}>Sim, Excluir</button>
            </div>
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
            <div className="modal-body">
              {!pixData ? (
                <>
                  <div className="modal-icon diamond">💎</div>
                  <h3>Limite Atingido</h3>
                <div className="pro-limit-content">
                  <p>{proLimitMessage || 'Acesse recursos ilimitados e impulsione sua gestão financeira.'}</p>
                  <div className="pro-benefit-box">
                    <p><strong>Benefícios do Plano PRO:</strong></p>
                    <ul>
                      <li>✨ Lançamentos e Contas ilimitados</li>
                      <li>📊 Gráficos e análises avançadas</li>
                      <li>🏦 Gestão completa de fluxo</li>
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
                    <input type="text" readOnly value={pixData.copiaECola} id="pix-copy-input-lancamentos" />
                    <button onClick={() => {
                      const copyText = document.getElementById("pix-copy-input-lancamentos");
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
        </div>
      )}

      {/* Modal de Exclusão de Tudo */}
      {showDeleteAllModal && (
        <div className="modal">
          <div className="modal-content delete-modal">
            <button className="btn-close-modal" onClick={() => setShowDeleteAllModal(false)}>✕</button>
            <div className="modal-body">
              <div className="modal-icon danger">🛑</div>
              <h3 style={{ color: '#dc2626' }}>Apagar Tudo?</h3>
              <p><strong>Atenção!</strong> Esta ação irá remover <b>TODOS</b> os seus lançamentos permanentemente.</p>
              <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '10px' }}>
                Este processo não poderá ser desfeito. Os saldos das contas não serão alterados automaticamente.
              </p>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowDeleteAllModal(false)}>Cancelar</button>
                <button className="btn-delete-confirm" style={{ backgroundColor: '#dc2626' }} onClick={confirmDeleteAll}>
                  Sim, Apagar Tudo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Lancamentos;

