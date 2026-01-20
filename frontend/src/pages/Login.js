import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../services/api';
import './Login.css';

function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isRegister) {
        await register(formData.nome, formData.email, formData.senha);
        alert('Usuário registrado com sucesso! Faça login.');
        setIsRegister(false);
        setFormData({ nome: '', email: '', senha: '' });
      } else {
        const response = await login(formData.email, formData.senha);
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Aplicar tema do usuário
        const tema = response.data.user.cor_tema || 'roxo';
        document.documentElement.setAttribute('data-theme', tema);
        
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao processar requisição');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>💰 Controle Financeiro</h1>
        <h2>{isRegister ? 'Criar Conta' : 'Login'}</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label>Nome</label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Senha</label>
            <input
              type="password"
              name="senha"
              value={formData.senha}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="btn-primary">
            {isRegister ? 'Registrar' : 'Entrar'}
          </button>
        </form>

        <p className="toggle-mode">
          {isRegister ? 'Já tem conta?' : 'Não tem conta?'}
          <button onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Fazer Login' : 'Registrar'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;
