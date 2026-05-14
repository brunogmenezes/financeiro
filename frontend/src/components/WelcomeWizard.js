import React, { useState } from 'react';
import { updatePerfil, createConta, createEntradasProjetivasBulk, completeOnboarding } from '../services/api';
import './WelcomeWizard.css';

function WelcomeWizard({ onFinish }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Passo 1: WhatsApp
  const [whatsapp, setWhatsapp] = useState('');
  
  // Passo 2: Conta
  const [conta, setConta] = useState({ nome: '' });
  
  // Passo 3: Entrada Projetiva
  const [projetivas, setProjetivas] = useState([{ descricao: 'Salário Mensal', valor: '', dia_vencimento: '5' }]);

  const nextStep = () => {
    setError('');
    setStep(step + 1);
  };
  const prevStep = () => {
    setError('');
    setStep(step - 1);
  };

  const handleFinishStep1 = async () => {
    if (!whatsapp) return nextStep(); // Opcional
    setLoading(true);
    try {
      let finalWhatsapp = whatsapp;
      // Se tiver 10 ou 11 dígitos, provavelmente é DDD + Número sem o 55
      if (whatsapp.length === 10 || whatsapp.length === 11) {
        if (!whatsapp.startsWith('55')) {
          finalWhatsapp = '55' + whatsapp;
        }
      }
      await updatePerfil({ whatsapp: finalWhatsapp });
      nextStep();
    } catch (err) {
      const serverError = err.response?.data?.error || 'Erro ao salvar WhatsApp';
      setError(serverError);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishStep2 = async () => {
    if (!conta.nome) return setError('Dê um nome para sua conta (ex: Carteira, Banco X)');
    setLoading(true);
    try {
      await createConta({ ...conta, tipo: 'Conta Corrente', cor: '#7c3aed', saldo_inicial: 0 });
      nextStep();
    } catch (err) {
      const serverError = err.response?.data?.error || 'Erro ao criar conta';
      setError(serverError);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProjetiva = () => {
    setProjetivas([...projetivas, { descricao: '', valor: '', dia_vencimento: '5' }]);
  };

  const handleRemoveProjetiva = (index) => {
    const newProjetivas = projetivas.filter((_, i) => i !== index);
    setProjetivas(newProjetivas);
  };

  const handleProjetivaChange = (index, field, value) => {
    const newProjetivas = [...projetivas];
    newProjetivas[index][field] = value;
    setProjetivas(newProjetivas);
  };

  const handleFinishStep3 = async () => {
    const validProjetivas = projetivas.filter(p => p.valor && p.descricao);
    if (validProjetivas.length === 0) return nextStep(); // Opcional

    setLoading(true);
    try {
      const hoje = new Date();
      const ano = hoje.getFullYear();
      const mes = String(hoje.getMonth() + 1).padStart(2, '0');

      const payloads = validProjetivas.map(p => {
        const dia = String(p.dia_vencimento || '05').padStart(2, '0');
        const dataCompleta = `${ano}-${mes}-${dia}`;
        return {
          descricao: p.descricao,
          valor: p.valor,
          data: dataCompleta
        };
      });

      await createEntradasProjetivasBulk(payloads);
      nextStep();
    } catch (err) {
      const serverError = err.response?.data?.error || 'Erro ao criar entradas projetivas';
      setError(serverError);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    setLoading(true);
    try {
      await completeOnboarding();
      onFinish();
    } catch (err) {
      setError('Erro ao finalizar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wizard-overlay">
      <div className="wizard-card premium-card animate-pop">
        <div className="wizard-progress">
          <div className="progress-bar" style={{ width: `${(step / 4) * 100}%` }}></div>
          <div className="progress-steps">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`step-dot ${s <= step ? 'active' : ''}`}>{s}</div>
            ))}
          </div>
        </div>

        {error && <div className="wizard-error">{error}</div>}

        {step === 1 && (
          <div className="wizard-step">
            <div className="step-icon">📱</div>
            <h2>Boas-vindas! Vamos começar?</h2>
            <p>Primeiro, informe seu WhatsApp para receber lembretes de contas que estão vencendo. Assim você nunca mais esquece de pagar nada!</p>
            <div className="form-group">
              <label>Seu WhatsApp (com DDD)</label>
              <input 
                type="tel" 
                placeholder="Ex: 11999999999" 
                value={whatsapp} 
                maxLength={13}
                onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
              />
              <small className="input-tip">Informe apenas o DDD + Número. O sistema cuidará do resto!</small>
            </div>
            <div className="wizard-actions">
              <button className="btn-wizard-next" onClick={handleFinishStep1} disabled={loading}>
                {loading ? 'Salvando...' : 'Próximo Passo →'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="wizard-step">
            <div className="step-icon">🏦</div>
            <h2>Onde está seu dinheiro?</h2>
            <p>Cadastre sua primeira conta (pode ser sua Carteira, Banco ou Poupança). Precisamos dela para organizar seus lançamentos.</p>
            <div className="form-group">
              <label>Nome da Conta</label>
              <input 
                type="text" 
                placeholder="Ex: Nubank, Bradesco, Dinheiro Vivo" 
                value={conta.nome} 
                onChange={(e) => setConta({...conta, nome: e.target.value})}
              />
            </div>
            <div className="wizard-actions">
              <button className="btn-wizard-back" onClick={prevStep}>Voltar</button>
              <button className="btn-wizard-next" onClick={handleFinishStep2} disabled={loading}>
                {loading ? 'Criando...' : 'Próximo Passo →'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="wizard-step">
            <div className="step-icon">📈</div>
            <h2>Previsão de Receita</h2>
            <p>O que você costuma receber todo mês? Adicione uma ou mais previsões para ajudarmos a prever seu saldo futuro.</p>
            
            <div className="projetivas-list">
              {projetivas.map((p, index) => (
                <div key={index} className="projetiva-item">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Descrição</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Salário"
                        value={p.descricao} 
                        onChange={(e) => handleProjetivaChange(index, 'descricao', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Valor (R$)</label>
                      <input 
                        type="number" 
                        placeholder="0.00"
                        value={p.valor} 
                        onChange={(e) => handleProjetivaChange(index, 'valor', e.target.value)}
                      />
                    </div>
                    <div className="form-group group-day">
                      <label>Dia</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="31"
                        value={p.dia_vencimento} 
                        onChange={(e) => handleProjetivaChange(index, 'dia_vencimento', e.target.value)}
                      />
                    </div>
                    {projetivas.length > 1 && (
                      <button className="btn-remove-projetiva" onClick={() => handleRemoveProjetiva(index)}>×</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button className="btn-add-projetiva" onClick={handleAddProjetiva}>
              <span>+ Adicionar outra receita</span>
            </button>

            <div className="wizard-actions">
              <button className="btn-wizard-back" onClick={prevStep}>Voltar</button>
              <button className="btn-wizard-next" onClick={handleFinishStep3} disabled={loading}>
                {loading ? 'Salvando...' : 'Próximo Passo →'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="wizard-step">
            <div className="step-icon">✨</div>
            <h2>Tudo Pronto!</h2>
            <p>Você configurou o básico para ter o controle total da sua vida financeira. Agora, o Dashboard é todo seu!</p>
            <div className="congratulations-box">
              <p>✅ WhatsApp Configurado</p>
              <p>✅ Primeira Conta Criada</p>
              <p>✅ Previsão de Receita Definida</p>
            </div>
            <div className="wizard-actions">
              <button className="btn-wizard-finish" onClick={handleFinalize} disabled={loading}>
                {loading ? 'Finalizando...' : 'Começar a usar agora! 🚀'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WelcomeWizard;
