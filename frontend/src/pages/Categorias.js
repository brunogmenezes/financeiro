import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getCategorias, 
  createCategoria, 
  updateCategoria, 
  deleteCategoria,
  getSubcategorias,
  createSubcategoria,
  updateSubcategoria,
  deleteSubcategoria
} from '../services/api';
import './Categorias.css';

function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState(null);
  const [editingSubcategoria, setEditingSubcategoria] = useState(null);
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'saida'
  });
  const [subFormData, setSubFormData] = useState({
    nome: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadCategorias();
  }, []);

  const loadCategorias = async () => {
    try {
      const response = await getCategorias();
      setCategorias(response.data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      if (error.response?.status === 401) {
        navigate('/');
      }
    }
  };

  const loadSubcategorias = async (categoriaId) => {
    try {
      const response = await getSubcategorias(categoriaId);
      setSubcategorias(response.data);
    } catch (error) {
      console.error('Erro ao carregar subcategorias:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategoria) {
        await updateCategoria(editingCategoria.id, formData);
      } else {
        await createCategoria(formData);
      }
      setShowModal(false);
      setEditingCategoria(null);
      setFormData({ nome: '', tipo: 'saida' });
      loadCategorias();
    } catch (error) {
      alert('Erro ao salvar categoria');
    }
  };

  const handleSubSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSubcategoria) {
        await updateSubcategoria(editingSubcategoria.id, subFormData);
      } else {
        await createSubcategoria(selectedCategoria.id, subFormData);
      }
      setShowSubModal(false);
      setEditingSubcategoria(null);
      setSubFormData({ nome: '' });
      loadSubcategorias(selectedCategoria.id);
    } catch (error) {
      alert('Erro ao salvar subcategoria');
    }
  };

  const handleEdit = (categoria) => {
    setEditingCategoria(categoria);
    setFormData({
      nome: categoria.nome,
      tipo: categoria.tipo
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Deseja realmente excluir esta categoria?')) {
      try {
        await deleteCategoria(id);
        loadCategorias();
      } catch (error) {
        const mensagem = error.response?.data?.error || 'Erro ao excluir categoria';
        alert(mensagem);
      }
    }
  };

  const handleEditSub = (subcategoria) => {
    setEditingSubcategoria(subcategoria);
    setSubFormData({ nome: subcategoria.nome });
    setShowSubModal(true);
  };

  const handleDeleteSub = async (id) => {
    if (window.confirm('Deseja realmente excluir esta subcategoria?')) {
      try {
        await deleteSubcategoria(id);
        loadSubcategorias(selectedCategoria.id);
      } catch (error) {
        alert('Erro ao excluir subcategoria');
      }
    }
  };

  const handleViewSubs = (categoria) => {
    setSelectedCategoria(categoria);
    loadSubcategorias(categoria.id);
  };

  const handleNew = () => {
    setEditingCategoria(null);
    setFormData({ nome: '', tipo: 'saida' });
    setShowModal(true);
  };

  const handleNewSub = () => {
    setEditingSubcategoria(null);
    setSubFormData({ nome: '' });
    setShowSubModal(true);
  };

  return (
    <div className="page-container">
      <nav className="navbar">
        <h1>💰 Controle Financeiro</h1>
        <div className="nav-links">
          <button onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button onClick={() => navigate('/contas')}>Contas</button>
          <button onClick={() => navigate('/lancamentos')}>Lançamentos</button>
          <button onClick={() => navigate('/auditoria')}>📋 Auditoria</button>
          <button onClick={() => navigate('/perfil')}>👤 Perfil</button>
          <button onClick={() => {
            localStorage.clear();
            navigate('/');
          }}>Sair</button>
        </div>
      </nav>

      <div className="content">
        <div className="categorias-layout">
          {/* Coluna de Categorias */}
          <div className="categorias-col">
            <div className="header">
              <h2>Categorias</h2>
              <button className="btn-new" onClick={handleNew}>+ Nova Categoria</button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {categorias.map(categoria => (
                    <tr 
                      key={categoria.id}
                      className={selectedCategoria?.id === categoria.id ? 'selected' : ''}
                      onClick={() => handleViewSubs(categoria)}
                      style={{cursor: 'pointer'}}
                    >
                      <td>{categoria.nome}</td>
                      <td>
                        <span className={`badge ${categoria.tipo}`}>
                          {categoria.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                        </span>
                      </td>
                      <td>
                        <button className="btn-edit" onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(categoria);
                        }}>Editar</button>
                        <button className="btn-delete" onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(categoria.id);
                        }}>Excluir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {categorias.length === 0 && (
                <p className="empty-message">Nenhuma categoria cadastrada</p>
              )}
            </div>
          </div>

          {/* Coluna de Subcategorias */}
          <div className="subcategorias-col">
            <div className="header">
              <h2>Subcategorias</h2>
              {selectedCategoria && (
                <button className="btn-new" onClick={handleNewSub}>+ Nova Subcategoria</button>
              )}
            </div>

            {selectedCategoria ? (
              <div className="table-container">
                <div className="categoria-info">
                  <strong>Categoria:</strong> {selectedCategoria.nome}
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subcategorias.map(sub => (
                      <tr key={sub.id}>
                        <td>{sub.nome}</td>
                        <td>
                          <button className="btn-edit" onClick={() => handleEditSub(sub)}>Editar</button>
                          <button className="btn-delete" onClick={() => handleDeleteSub(sub.id)}>Excluir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {subcategorias.length === 0 && (
                  <p className="empty-message">Nenhuma subcategoria cadastrada</p>
                )}
              </div>
            ) : (
              <div className="select-message">
                <p>← Selecione uma categoria para ver suas subcategorias</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Categoria */}
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>{editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}</h3>
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
                  <option value="saida">Saída</option>
                  <option value="entrada">Entrada</option>
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

      {/* Modal de Subcategoria */}
      {showSubModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>{editingSubcategoria ? 'Editar Subcategoria' : 'Nova Subcategoria'}</h3>
            <form onSubmit={handleSubSubmit}>
              <div className="form-group">
                <label>Nome *</label>
                <input
                  type="text"
                  value={subFormData.nome}
                  onChange={(e) => setSubFormData({nome: e.target.value})}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowSubModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Categorias;
