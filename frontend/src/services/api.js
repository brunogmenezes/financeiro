import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const login = (email, senha) => api.post('/auth/login', { email, senha });
export const register = (nome, email, senha) => api.post('/auth/register', { nome, email, senha });
export const googleLogin = (token) => api.post('/auth/google', { token });
export const getPerfil = () => api.get('/auth/perfil');
export const updatePerfil = (data) => api.put('/auth/perfil', data);

// Contas
export const getContas = () => api.get('/contas');
export const getConta = (id) => api.get(`/contas/${id}`);
export const createConta = (data) => api.post('/contas', data);
export const updateConta = (id, data) => api.put(`/contas/${id}`, data);
export const deleteConta = (id) => api.delete(`/contas/${id}`);

// Lançamentos
export const getLancamentos = () => api.get('/lancamentos');
export const getLancamento = (id) => api.get(`/lancamentos/${id}`);
export const createLancamento = (data) => api.post('/lancamentos', data);
export const updateLancamento = (id, data) => api.put(`/lancamentos/${id}`, data);
export const deleteLancamento = (id) => api.delete(`/lancamentos/${id}`);
export const togglePagoLancamento = (id) => api.patch(`/lancamentos/${id}/toggle-pago`);
export const getDashboard = () => api.get('/lancamentos/dashboard');

// Auditoria
export const getAuditoria = () => api.get('/auditoria');

// Categorias
export const getCategorias = () => api.get('/categorias');
export const createCategoria = (data) => api.post('/categorias', data);
export const updateCategoria = (id, data) => api.put(`/categorias/${id}`, data);
export const deleteCategoria = (id) => api.delete(`/categorias/${id}`);
export const getSubcategorias = (categoriaId) => api.get(`/categorias/${categoriaId}/subcategorias`);
export const createSubcategoria = (categoriaId, data) => api.post(`/categorias/${categoriaId}/subcategorias`, data);
export const updateSubcategoria = (id, data) => api.put(`/categorias/subcategorias/${id}`, data);
export const deleteSubcategoria = (id) => api.delete(`/categorias/subcategorias/${id}`);
export const saveLimiteCategoria = (id, valor_limite) => api.post(`/categorias/${id}/limite`, { valor_limite });
export const saveLimiteSubcategoria = (id, valor_limite) => api.post(`/categorias/subcategorias/${id}/limite`, { valor_limite });

// WhatsApp / Evolution
export const getWhatsappStatus = () => api.get('/whatsapp/status');
export const getEvolutionConfig = () => api.get('/whatsapp/config');
export const updateEvolutionConfig = (data) => api.post('/whatsapp/config', data);
export const sendTestMessage = (whatsapp) => api.post('/whatsapp/test-message', { whatsapp });
export const sendRemindersNow = () => api.post('/whatsapp/send-reminders-now');

// Entradas Projetivas
export const getEntradasProjetivas = () => api.get('/entradas-projetivas');
export const createEntradaProjetiva = (data) => api.post('/entradas-projetivas', data);
export const createEntradasProjetivasBulk = (data) => api.post('/entradas-projetivas/bulk', data);
export const updateEntradaProjetiva = (id, data) => api.put(`/entradas-projetivas/${id}`, data);
export const deleteEntradaProjetiva = (id) => api.delete(`/entradas-projetivas/${id}`);


// Admin
export const adminGetUsers = () => api.get('/admin/users');
export const adminResetPassword = (id, novaSenha) => api.post(`/admin/users/${id}/reset-password`, { novaSenha });
export const adminToggleAdmin = (id, isAdmin) => api.patch(`/admin/users/${id}/toggle-admin`, { isAdmin });
export const adminTogglePro = (id, isPro) => api.patch(`/admin/users/${id}/toggle-pro`, { isPro });
export const adminDeleteUser = (id) => api.delete(`/admin/users/${id}`);

export default api;
