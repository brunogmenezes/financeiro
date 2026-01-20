import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLancamentos, createLancamento, updateLancamento, deleteLancamento, getContas } from '../services/api';
import './Lancamentos.css';

function Lancamentos() {
  const [lancamentos, setLancamentos] = useState([]);
  const [contas, setContas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingLancamento, setEditingLancamento] = useState(null);
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    tipo: 'saida',
    data: new Date().toISOString().split('T')[0],
    conta_id: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadLancamentos();
    loadContas();
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
        conta_id: ''
      });
      loadLancamentos();
    } catch (error) {
      alert('Erro ao salvar lançamento');
    }
  };

  const handleEdit = (lancamento) => {
    setEditingLancamento(lancamento);
    setFormData({
      descricao: lancamento.descricao,
      valor: lancamento.valor,
      tipo: lancamento.tipo,
      data: lancamento.data,
      conta_id: lancamento.conta_id
    });
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

  const handleNew = () => {
    setEditingLancamento(null);
    setFormData({
      descricao: '',
      valor: '',
      tipo: 'saida',
      data: new Date().toISOString().split('T')[0],
      conta_id: contas.length > 0 ? contas[0].id : ''
    });
    setShowModal(true);
  };

  return (
    <div className="page-container">
      <nav className="navbar">
        <h1>💰 Controle Financeiro</h1>
        <div className="nav-links">
          <button onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button onClick={() => navigate('/contas')}>Contas</button>
          <button onClick={() => {
            localStorage.clear();
            navigate('/');
          }}>Sair</button>
        </div>
      </nav>

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
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {lancamentos.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{textAlign: 'center'}}>Nenhum lançamento cadastrado</td>
                </tr>
              ) : (
                lancamentos.map(lancamento => (
                  <tr key={lancamento.id}>
                    <td>{new Date(lancamento.data).toLocaleDateString('pt-BR')}</td>
                    <td>{lancamento.descricao}</td>
                    <td>{lancamento.conta_nome || '-'}</td>
                    <td>
                      <span className={`badge ${lancamento.tipo}`}>
                        {lancamento.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                      </span>
                    </td>
                    <td className={lancamento.tipo === 'entrada' ? 'valor-positivo' : 'valor-negativo'}>
                      R$ {parseFloat(lancamento.valor).toFixed(2)}
                    </td>
                    <td>
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
          <div className="modal-content">
            <h3>{editingLancamento ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Descrição *</label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Valor *</label>
                  <input
                    type="number"
                    step="0.01"
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

              <div className="form-group">
                <label>Tipo *</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                  required
                >
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </div>

              <div className="form-group">
                <label>Conta *</label>
                <select
                  value={formData.conta_id}
                  onChange={(e) => setFormData({...formData, conta_id: e.target.value})}
                  required
                >
                  <option value="">Selecione uma conta</option>
                  {contas.map(conta => (
                    <option key={conta.id} value={conta.id}>{conta.nome}</option>
                  ))}
                </select>
              </div>

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
