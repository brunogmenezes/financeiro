import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getContas, createConta, updateConta, deleteConta } from '../services/api';
import Navbar from '../components/Navbar';
import './Contas.css';

function Contas() {
  const [contas, setContas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingConta, setEditingConta] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    saldo_inicial: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadContas();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingConta) {
        // Na edição, não enviar saldo_inicial
        await updateConta(editingConta.id, {
          nome: formData.nome,
          descricao: formData.descricao
        });
      } else {
        await createConta(formData);
      }
      setShowModal(false);
      setEditingConta(null);
      setFormData({ nome: '', descricao: '', saldo_inicial: 0 });
      loadContas();
    } catch (error) {
      alert('Erro ao salvar conta');
    }
  };

  const handleEdit = (conta) => {
    setEditingConta(conta);
    setFormData({
      nome: conta.nome,
      descricao: conta.descricao || '',
      saldo_inicial: conta.saldo_inicial
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Deseja realmente excluir esta conta?')) {
      try {
        await deleteConta(id);
        loadContas();
      } catch (error) {
        const mensagem = error.response?.data?.error || 'Erro ao excluir conta';
        alert(mensagem);
      }
    }
  };

  const handleNew = () => {
    setEditingConta(null);
    setFormData({ nome: '', descricao: '', saldo_inicial: 0 });
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
                <th>Descrição</th>
                <th>Saldo Atual</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {contas.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{textAlign: 'center'}}>Nenhuma conta cadastrada</td>
                </tr>
              ) : (
                contas.map(conta => (
                  <tr key={conta.id}>
                    <td>{conta.nome}</td>
                    <td>{conta.descricao || '-'}</td>
                    <td className={parseFloat(conta.saldo_inicial) >= 0 ? 'valor-positivo' : 'valor-negativo'}>
                      R$ {parseFloat(conta.saldo_inicial).toFixed(2)}
                    </td>
                    <td>
                      <button className="btn-edit" onClick={() => handleEdit(conta)}>Editar</button>
                      <button className="btn-delete" onClick={() => handleDelete(conta.id)}>Excluir</button>
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
                <label>Descrição</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Saldo Inicial {editingConta && '(não editável)'}</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.saldo_inicial}
                  onChange={(e) => setFormData({...formData, saldo_inicial: e.target.value})}
                  disabled={!!editingConta}
                  style={editingConta ? {backgroundColor: '#f0f0f0', cursor: 'not-allowed'} : {}}
                />
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

export default Contas;
