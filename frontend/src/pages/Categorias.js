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
  deleteSubcategoria,
  saveLimiteCategoria,
  saveLimiteSubcategoria
} from '../services/api';
import Navbar from '../components/Navbar';
import './Categorias.css';

function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteSubModal, setShowDeleteSubModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [editingCategoria, setEditingCategoria] = useState(null);
  const [editingSubcategoria, setEditingSubcategoria] = useState(null);
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [targetForLimit, setTargetForLimit] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.is_admin === true;

  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'saida',
    cor: '#7c3aed'
  });
  const [subFormData, setSubFormData] = useState({
    nome: '',
    cor: '#7c3aed'
  });
  const [limitValue, setLimitValue] = useState('');

  const navigate = useNavigate();

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

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
    if (!isAdmin) return;
    try {
      if (editingCategoria) {
        await updateCategoria(editingCategoria.id, formData);
        triggerToast('Categoria atualizada com sucesso!');
      } else {
        await createCategoria(formData);
        triggerToast('Categoria criada com sucesso!');
      }
      setShowModal(false);
      setEditingCategoria(null);
      setFormData({ nome: '', tipo: 'saida', cor: '#7c3aed' });
      loadCategorias();
    } catch (error) {
      triggerToast('Erro ao salvar categoria', 'error');
    }
  };

  const handleSubSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      if (editingSubcategoria) {
        await updateSubcategoria(editingSubcategoria.id, subFormData);
        triggerToast('Subcategoria atualizada com sucesso!');
      } else {
        await createSubcategoria(selectedCategoria.id, subFormData);
        triggerToast('Subcategoria criada com sucesso!');
      }
      setShowSubModal(false);
      setEditingSubcategoria(null);
      setSubFormData({ nome: '', cor: '#7c3aed' });
      loadSubcategorias(selectedCategoria.id);
    } catch (error) {
      triggerToast('Erro ao salvar subcategoria', 'error');
    }
  };

  const handleSaveLimit = async (e) => {
    e.preventDefault();
    try {
      if (targetForLimit.type === 'cat') {
        await saveLimiteCategoria(targetForLimit.item.id, limitValue);
      } else {
        await saveLimiteSubcategoria(targetForLimit.item.id, limitValue);
        loadSubcategorias(selectedCategoria.id);
      }
      triggerToast('Limite atualizado com sucesso! 🎯');
      loadCategorias();
      setShowLimitModal(false);
      setLimitValue('');
    } catch (error) {
      triggerToast('Erro ao salvar limite', 'error');
    }
  };

  const handleDelete = (categoria) => {
    setItemToDelete(categoria);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteCategoria(itemToDelete.id);
      triggerToast('Categoria removida com sucesso');
      setShowDeleteModal(false);
      setItemToDelete(null);
      if (selectedCategoria?.id === itemToDelete.id) setSelectedCategoria(null);
      loadCategorias();
    } catch (error) {
      const mensagem = error.response?.data?.error || 'Erro ao excluir categoria';
      triggerToast(mensagem, 'error');
      setShowDeleteModal(false);
    }
  };

  const handleDeleteSub = (sub) => {
    setItemToDelete(sub);
    setShowDeleteSubModal(true);
  };

  const confirmDeleteSub = async () => {
    try {
      await deleteSubcategoria(itemToDelete.id);
      triggerToast('Subcategoria removida com sucesso');
      setShowDeleteSubModal(false);
      setItemToDelete(null);
      loadSubcategorias(selectedCategoria.id);
    } catch (error) {
      const mensagem = error.response?.data?.error || 'Erro ao excluir subcategoria';
      triggerToast(mensagem, 'error');
      setShowDeleteSubModal(false);
    }
  };

  const handleEdit = (categoria) => {
    setEditingCategoria(categoria);
    setFormData({
      nome: categoria.nome,
      tipo: categoria.tipo,
      cor: categoria.cor || '#7c3aed'
    });
    setShowModal(true);
  };

  const handleEditSub = (subcategoria) => {
    setEditingSubcategoria(subcategoria);
    setSubFormData({ 
      nome: subcategoria.nome,
      cor: subcategoria.cor || '#7c3aed'
    });
    setShowSubModal(true);
  };

  const handleOpenLimitModal = (type, item) => {
    setTargetForLimit({ type, item });
    setLimitValue(item.meta_mensal || '');
    setShowLimitModal(true);
  };

  const handleViewSubs = (categoria) => {
    setSelectedCategoria(categoria);
    loadSubcategorias(categoria.id);
  };

  const handleNew = () => {
    setEditingCategoria(null);
    setFormData({ nome: '', tipo: 'saida', cor: '#7c3aed' });
    setShowModal(true);
  };

  const handleNewSub = () => {
    setEditingSubcategoria(null);
    setSubFormData({ nome: '', cor: '#7c3aed' });
    setShowSubModal(true);
  };

  return (
    <div className="page-container">
      <Navbar />

      <div className="content">
        <div className="categorias-layout">
          {/* Coluna de Categorias */}
          <div className="categorias-col">
            <div className="header">
              <h2>Categorias</h2>
              {isAdmin && (
                <button className="btn-new" onClick={handleNew}>+ Nova Categoria</button>
              )}
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
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className={`badge ${categoria.tipo}`}>
                          {categoria.tipo === 'entrada' ? '↑ Entrada' : categoria.tipo === 'saida' ? '↓ Saída' : '⊝ Neutro'}
                        </span>
                        {categoria.meta_mensal && categoria.tipo === 'saida' && (
                          <span className="badge-meta" style={{display: 'inline-block', marginLeft: '8px', fontSize: '0.75rem', background: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '8px', fontWeight: 'bold', whiteSpace: 'nowrap'}}>
                            🎯 R$ {Number(categoria.meta_mensal).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                          </span>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {isAdmin ? (
                          <div className="action-buttons">
                            <button className="btn-edit" onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(categoria);
                            }} title="Editar Categoria">✏️</button>
                            <button className="btn-delete" onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(categoria);
                            }} title="Excluir Categoria">🗑️</button>
                          </div>
                        ) : (
                          categoria.tipo === 'saida' && (
                            <button className="btn-limit" onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLimitModal('cat', categoria);
                            }}>🎯 Limite</button>
                          )
                        )}
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
              {selectedCategoria && isAdmin && (
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
                        <td>
                          {sub.nome}
                          {sub.meta_mensal && (
                            <span className="badge-meta" style={{display: 'inline-block', marginLeft: '8px', fontSize: '0.75rem', background: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '8px', fontWeight: 'bold', whiteSpace: 'nowrap'}}>
                              🎯 R$ {Number(sub.meta_mensal).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                            </span>
                          )}
                        </td>
                        <td>
                          {isAdmin ? (
                            <div className="action-buttons">
                              <button className="btn-edit" onClick={() => handleEditSub(sub)} title="Editar Subcategoria">✏️</button>
                              <button className="btn-delete" onClick={() => handleDeleteSub(sub)} title="Excluir Subcategoria">🗑️</button>
                            </div>
                          ) : (
                            selectedCategoria.tipo === 'saida' && (
                              <button className="btn-limit" onClick={() => handleOpenLimitModal('sub', sub)}>🎯 Limite</button>
                            )
                          )}
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

      {/* Modal de Categoria (Apenas Admin) */}
      {showModal && isAdmin && (
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
                  <option value="neutro">Neutro</option>
                </select>
              </div>

              <div className="form-group">
                <label>Cor *</label>
                <div className="color-picker-wrapper">
                  <input
                    type="color"
                    value={formData.cor}
                    onChange={(e) => setFormData({...formData, cor: e.target.value})}
                    className="color-picker"
                  />
                  <span className="color-value">{formData.cor}</span>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar Categoria</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Subcategoria (Apenas Admin) */}
      {showSubModal && isAdmin && (
        <div className="modal">
          <div className="modal-content">
            <h3>{editingSubcategoria ? 'Editar Subcategoria' : 'Nova Subcategoria'}</h3>
            <form onSubmit={handleSubSubmit}>
              <div className="form-group">
                <label>Nome *</label>
                <input
                  type="text"
                  value={subFormData.nome}
                  onChange={(e) => setSubFormData({...subFormData, nome: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Cor *</label>
                <div className="color-picker-wrapper">
                  <input
                    type="color"
                    value={subFormData.cor}
                    onChange={(e) => setSubFormData({...subFormData, cor: e.target.value})}
                    className="color-picker"
                  />
                  <span className="color-value">{subFormData.cor}</span>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowSubModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar Subcategoria</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Definição de Limite (Para Usuário) */}
      {showLimitModal && (
        <div className="modal">
          <div className="modal-content premium-card">
            <div className="modal-icon">🎯</div>
            <h3>Definir Limite Mensal</h3>
            <p>Defina seu limite de gastos para: <strong>{targetForLimit.item.nome}</strong></p>
            
            <form onSubmit={handleSaveLimit}>
              <div className="form-group" style={{ marginTop: '20px' }}>
                <label>Valor do Limite (R$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  value={limitValue} 
                  onChange={(e) => setLimitValue(e.target.value)} 
                  placeholder="Ex: 500.00"
                  autoFocus
                />
                <small style={{ color: '#64748b', marginTop: '8px', display: 'block' }}>
                  Este limite é individual e servirá para controlar seus gastos nesta categoria.
                </small>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowLimitModal(false)}>Cancelar</button>
                <button type="submit" className="btn-save">Salvar Limite</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Exclusão Categoria */}
      {showDeleteModal && (
        <div className="modal">
          <div className="modal-content premium-card delete-modal">
            <div className="modal-icon warning">⚠️</div>
            <h3>Excluir Categoria?</h3>
            <p>Você está prestes a excluir permanentemente a categoria <strong>{itemToDelete?.nome}</strong>.</p>
            <div className="warning-box">
              Isso removerá a estrutura global desta categoria. Certifique-se de que não haja subcategorias vinculadas antes de prosseguir.
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
              <button className="btn-delete-confirm" onClick={confirmDelete}>Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exclusão Subcategoria */}
      {showDeleteSubModal && (
        <div className="modal">
          <div className="modal-content premium-card delete-modal">
            <div className="modal-icon warning">⚠️</div>
            <h3>Excluir Subcategoria?</h3>
            <p>Deseja realmente excluir a subcategoria <strong>{itemToDelete?.nome}</strong>?</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteSubModal(false)}>Cancelar</button>
              <button className="btn-delete-confirm" onClick={confirmDeleteSub}>Excluir Agora</button>
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
    </div>
  );
}

export default Categorias;
