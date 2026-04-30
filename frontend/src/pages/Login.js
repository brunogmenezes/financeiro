import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register, googleLogin } from '../services/api';
import { GoogleLogin } from '@react-oauth/google';
import './Login.css';

function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: ''
  });
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const navigate = useNavigate();

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAuthSuccess = (response) => {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    
    // Aplicar tema do usuário
    const tema = response.data.user.cor_tema || 'roxo';
    document.documentElement.setAttribute('data-theme', tema);
    
    navigate('/dashboard');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isRegister) {
        await register(formData.nome, formData.email, formData.senha);
        triggerToast('Usuário registrado com sucesso! Faça login.');
        setIsRegister(false);
        setFormData({ nome: '', email: '', senha: '' });
      } else {
        const response = await login(formData.email, formData.senha);
        handleAuthSuccess(response);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao processar requisição');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await googleLogin(credentialResponse.credential);
      handleAuthSuccess(response);
    } catch (err) {
      setError('Erro ao autenticar com Google');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Prospera</h1>
        <h2>{isRegister ? 'Criar Conta' : 'Login'}</h2>

        {error && <div className="error-message">{error}</div>}

        <div className="social-login">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Falha no login com Google')}
            useOneTap
            theme="filled_blue"
            shape="pill"
            text={isRegister ? 'signup_with' : 'signin_with'}
            width="350"
          />
        </div>

        <div className="divider">
          <span>ou</span>
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label>Nome</label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                placeholder="Seu nome completo"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>{isRegister ? 'E-mail' : 'E-mail ou Usuário'}</label>
            <input
              type={isRegister ? 'email' : 'text'}
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={isRegister ? 'exemplo@email.com' : 'E-mail ou usuário admin'}
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
              placeholder="Sua senha secreta"
              required
            />
          </div>

          <button type="submit" className="btn-primary">
            {isRegister ? 'Registrar Agora' : 'Entrar na Conta'}
          </button>
        </form>

        <p className="toggle-mode">
          {isRegister ? 'Já possui uma conta?' : 'Ainda não tem conta?'}
          <button onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Fazer Login' : 'Cadastre-se grátis'}
          </button>
        </p>
      </div>

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

export default Login;
