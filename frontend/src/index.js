import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Aplicar tema salvo do usuário
const user = JSON.parse(localStorage.getItem('user') || '{}');
const tema = user.corTema || 'roxo';
document.documentElement.setAttribute('data-theme', tema);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
