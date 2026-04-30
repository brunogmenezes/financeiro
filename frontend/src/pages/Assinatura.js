import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubscriptionHistory } from '../services/api';
import Navbar from '../components/Navbar';
import './Assinatura.css';

function Assinatura() {
  const [history, setHistory] = useState([]);
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionPrice, setSubscriptionPrice] = useState('9.99');
  const navigate = useNavigate();

  useEffect(() => {
    const loggedUser = JSON.parse(localStorage.getItem('user'));
    if (!loggedUser) {
      navigate('/');
      return;
    }
    loadHistory();
    loadSubPrice();
    // eslint-disable-next-line
  }, []);

  const loadSubPrice = async () => {
    try {
      const { getPublicSubscriptionConfig } = await import('../services/api');
      const response = await getPublicSubscriptionConfig();
      setSubscriptionPrice(response.data.preco_assinatura);
    } catch (e) {
      console.error('Erro ao carregar preço:', e);
    }
  };

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await getSubscriptionHistory();
      setHistory(response.data.history);
      setExpiresAt(response.data.expiresAt);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysRemaining = () => {
    if (!expiresAt) return 0;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const formatarData = (dataStr) => {
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Carregando informações da assinatura...</p>
        </div>
      </div>
    );
  }

  const daysRemaining = calculateDaysRemaining();

  return (
    <div className="page-container">
      <Navbar />

      <div className="content subscription-page">
        <div className="header-subscription">
          <h2>Minha Assinatura</h2>
          <span className="plan-badge-v2">Plano PRO</span>
        </div>

        <div className="subscription-summary">
          <div className="summary-card status-card">
            <div className="card-icon">💎</div>
            <div className="card-info">
              <h3>Status da Conta</h3>
              <p className={daysRemaining > 0 ? 'status-active' : 'status-expired'}>
                {daysRemaining > 0 ? 'Ativa' : 'Expirada'}
              </p>
            </div>
          </div>

          <div className="summary-card days-card">
            <div className="card-icon">⏳</div>
            <div className="card-info">
              <h3>Dias Restantes</h3>
              <p className="days-count">{daysRemaining} dias</p>
              {expiresAt && (
                <span className="expiry-date">Expira em: {new Date(expiresAt).toLocaleDateString('pt-BR')}</span>
              )}
            </div>
          </div>

          <div className="summary-card info-card">
            <div className="card-icon">💳</div>
            <div className="card-info">
              <h3>Valor Mensal</h3>
              <p className="price">R$ {parseFloat(subscriptionPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <span className="billing-type">Pagamento via PIX</span>
            </div>
          </div>
        </div>

        <div className="history-section">
          <h3>Histórico de Pagamentos</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Data do Pagamento</th>
                  <th>Valor</th>
                  <th>ID da Transação (TXID)</th>
                  <th>Válido até</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-history">Nenhum pagamento registrado ainda.</td>
                  </tr>
                ) : (
                  history.map((pay) => (
                    <tr key={pay.id}>
                      <td>{formatarData(pay.data_pagamento)}</td>
                      <td>R$ {parseFloat(pay.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="txid-cell" title={pay.txid}>{pay.txid.substring(0, 15)}...</td>
                      <td>{new Date(pay.validate_ate || pay.validade_ate).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <span className="badge-pago pago">Confirmado</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Assinatura;
