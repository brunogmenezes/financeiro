import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

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
export const getDashboard = () => api.get('/lancamentos/dashboard');

export default api;
