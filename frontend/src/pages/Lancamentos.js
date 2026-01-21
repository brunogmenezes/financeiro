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
  togglePagoLancamento
} from '../services/api';
import Navbar from '../components/Navbar';
import './Lancamentos.css';

function Lancamentos() {
  const [lancamentos, setLancamentos] = useState([]);
  const [contas, setContas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingLancamento, setEditingLancamento] = useState(null);
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    tipo: 'saida',
    data: new Date().toISOString().split('T')[0],
    conta_id: '',
    categoria_id: '',
    subcategoria_id: '',
    parcelado: false,
    num_parcelas: 1,
    pago: true
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadLancamentos();
    loadContas();
    loadCategorias();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLancamento) {
        await updateLancamento(editingLancamento.id, formData);
      } else {
        await createLancamento(formData);
      }
      setShowModal(false);
      setEditingLancamento(null);
      setFormData({
        descricao: '',
        valor: '',
        tipo: 'saida',
        data: new Date().toISOString().split('T')[0],
        conta_id: '',
        categoria_id: '',
        subcategoria_id: '',
        parcelado: false,
        num_parcelas: 1,
        pago: true
      });
      setSubcategorias([]);
      loadLancamentos();
    } catch (error) {
      console.error('Erro completo:', error);
      console.error('Resposta do erro:', error.response?.data);
      alert(error.response?.data?.error || 'Erro ao salvar lançamento');
    }
  };

  const handleEdit = (lancamento) => {
    setEditingLancamento(lancamento);
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
      pago: lancamento.pago !== undefined ? lancamento.pago : true,
    });
    if (lancamento.categoria_id) {
      loadSubcategoriasPorCategoria(lancamento.categoria_id);
    }
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Deseja realmente excluir este lançamento?')) {
      try {
        await deleteLancamento(id);
        loadLancamentos();
      } catch (error) {
        alert('Erro ao excluir lançamento');
      }
    }
  };

  const handleTogglePago = async (lancamento) => {
    try {
      await togglePagoLancamento(lancamento.id);
      loadLancamentos();
    } catch (error) {
      alert('Erro ao alterar status de pagamento');
    }
  };

  const handleNew = () => {
    setEditingLancamento(null);
    setFormData({
      descricao: '',
      valor: '',
      tipo: 'saida',
      data: new Date().toISOString().split('T')[0],
      conta_id: contas.length > 0 ? contas[0].id : '',
      categoria_id: '',
      subcategoria_id: '',
      parcelado: false,
      num_parcelas: 1,
      pago: true
    });
    setSubcategorias([]);
    setShowModal(true);
  };

  return (
    <div className="page-container">
      <Navbar />

      <div className="content">
        <div className="header">
          <h2>Lançamentos</h2>
          <button className="btn-new" onClick={handleNew}>+ Novo Lançamento</button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Conta</th>
                <th>Tipo</th>
                <th>Pago</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {lancamentos.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{textAlign: 'center'}}>Nenhum lançamento cadastrado</td>
                </tr>
              ) : (
                lancamentos.map(lancamento => (
                  <tr key={lancamento.id}>
                    <td>{new Date(lancamento.data).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <div>
                        <div>{lancamento.descricao}</div>
                        {lancamento.categoria_nome && (
                          <div className="categoria-badges-inline">
                            <span 
                              className="categoria-badge-small"
                              style={{ backgroundColor: lancamento.categoria_cor || '#7c3aed' }}
                              title={lancamento.categoria_nome}
                            >
                              {lancamento.categoria_nome}
                            </span>
                            {lancamento.subcategoria_nome && (
                              <span 
                                className="subcategoria-badge-small"
                                style={{ backgroundColor: lancamento.subcategoria_cor || '#7c3aed' }}
                                title={lancamento.subcategoria_nome}
                              >
                                {lancamento.subcategoria_nome}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{lancamento.conta_nome || '-'}</td>
                    <td>
                      <span className={`badge ${lancamento.tipo}`}>
                        {lancamento.tipo === 'entrada' ? '↑ Entrada' : lancamento.tipo === 'saida' ? '↓ Saída' : '⊝ Neutro'}
                      </span>
                    </td>
                    <td>
                      {lancamento.tipo === 'saida' ? (
                        <span className={`badge-pago ${lancamento.pago ? 'pago' : 'pendente'}`}>
                          {lancamento.pago ? 'Pago' : 'Não pago'}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className={lancamento.tipo === 'entrada' ? 'valor-positivo' : lancamento.tipo === 'saida' ? 'valor-negativo' : ''}>
                      R$ {parseFloat(lancamento.valor).toFixed(2)}
                    </td>
                    <td>
                      {lancamento.tipo === 'saida' && (
                        <button 
                          className="btn-toggle-pago"
                          onClick={() => handleTogglePago(lancamento)}
                        >
                          {lancamento.pago ? 'Marcar não pago' : 'Marcar pago'}
                        </button>
                      )}
                      <button className="btn-edit" onClick={() => handleEdit(lancamento)}>Editar</button>
                      <button className="btn-delete" onClick={() => handleDelete(lancamento.id)}>Excluir</button>
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
          <div className="modal-content modal-lancamento">
            <h3>{editingLancamento ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
            <form onSubmit={handleSubmit}>
              {/* Direção do lançamento */}
              <div className="form-group">
                <label>Direção do lançamento *</label>
                <div className="btn-group">
                  <button
                    type="button"
                    className={formData.tipo === 'entrada' ? 'active' : ''}
                    onClick={() => setFormData({...formData, tipo: 'entrada', categoria_id: '', subcategoria_id: '', pago: true})}
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
                    onClick={() => setFormData({...formData, tipo: 'neutro', categoria_id: '', subcategoria_id: '', pago: true})}
                  >
                    Neutro
                  </button>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{formData.parcelado ? 'Valor da parcela *' : 'Valor *'}</label>
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
                  {contas.map(conta => (
                    <option key={conta.id} value={conta.id}>{conta.nome}</option>
                  ))}
                </select>
              </div>

              {/* Lançamento parcelado */}
              <div className="form-group">
                <label>Lançamento parcelado</label>
                <div className="btn-group">
                  <button
                    type="button"
                    className={!formData.parcelado ? 'active' : ''}
                    onClick={() => setFormData({...formData, parcelado: false, num_parcelas: 1})}
                  >
                    Não
                  </button>
                  <button
                    type="button"
                    className={formData.parcelado ? 'active' : ''}
                    onClick={() => setFormData({...formData, parcelado: true})}
                  >
                    Sim
                  </button>
                </div>
              </div>

              {formData.parcelado && (
                <div className="form-group">
                  <label>Número de parcelas *</label>
                  <input
                    type="number"
                    min="2"
                    max="120"
                    placeholder="Número de parcelas"
                    value={formData.num_parcelas}
                    onChange={(e) => setFormData({...formData, num_parcelas: e.target.value})}
                    required={formData.parcelado}
                  />
                </div>
              )}

              {/* Classificação (Categorias) */}
              <div className="form-group">
                <label>Classificação</label>
                <div className="categoria-buttons">
                  {categorias
                    .filter(cat => cat.tipo === formData.tipo)
                    .map(categoria => (
                      <button
                        key={categoria.id}
                        type="button"
                        className={formData.categoria_id === categoria.id.toString() ? 'active' : ''}
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
                <div className="form-group">
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
                <button type="button" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Lancamentos;
