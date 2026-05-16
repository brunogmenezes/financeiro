import React, { useState, useEffect } from 'react';
import { analyzeInvoice, confirmInvoiceImport, getContas } from '../services/api';
import './InvoiceImportModal.css';

const InvoiceImportModal = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState('upload'); // 'upload', 'analyzing', 'review'
  const [file, setFile] = useState(null);
  const [contas, setContas] = useState([]);
  const [selectedConta, setSelectedConta] = useState('');
  const [targetMonth, setTargetMonth] = useState('');
  const [extractedData, setExtractedData] = useState([]);
  const [summary, setSummary] = useState({ total: 0, new: 0, duplicates: 0 });
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadContas();
      resetModal();
      // Definir mês atual como padrão
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setTargetMonth(currentMonth);
    }
  }, [isOpen]);

  const loadContas = async () => {
    try {
      const response = await getContas();
      // Filtrar apenas cartões de crédito para importação de fatura
      const cartoes = response.data.filter(c => c.tipo === 'Cartão de Crédito');
      setContas(cartoes);
      if (cartoes.length > 0) setSelectedConta(cartoes[0].id);
    } catch (err) {
      setError('Erro ao carregar contas');
    }
  };

  const resetModal = () => {
    setStep('upload');
    setFile(null);
    setExtractedData([]);
    setSelectedItems([]);
    setError('');
    setLoading(false);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleStartAnalysis = async () => {
    if (!file || !selectedConta) return;

    setLoading(true);
    setStep('analyzing');
    setError('');

    const formData = new FormData();
    formData.append('invoice', file);
    formData.append('conta_id', selectedConta);

    try {
      const response = await analyzeInvoice(formData);
      setExtractedData(response.data.transactions);
      setSummary(response.data.summary);
      
      // Pré-selecionar apenas os que não são duplicatas
      const newItems = response.data.transactions
        .filter(t => !t.isDuplicate)
        .map((_, index) => index);
      setSelectedItems(newItems);
      
      setStep('review');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao analisar fatura. Verifique se a sua API Key do Gemini está configurada corretamente.');
      setStep('upload');
    } finally {
      setLoading(false);
    }
  };

  const toggleItemSelection = (index) => {
    if (selectedItems.includes(index)) {
      setSelectedItems(selectedItems.filter(i => i !== index));
    } else {
      setSelectedItems([...selectedItems, index]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === extractedData.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(extractedData.map((_, index) => index));
    }
  };

  const handleConfirmImport = async () => {
    if (loading) return; // Proteção extra contra clique duplo

    const toImport = extractedData.filter((_, index) => selectedItems.includes(index));
    if (toImport.length === 0) return;

    setLoading(true);
    try {
      await confirmInvoiceImport({
        transactions: toImport,
        conta_id: selectedConta,
        target_month: targetMonth // Enviando o mês escolhido
      });
      onSuccess(`${toImport.length} lançamentos importados!`);
      onClose();
    } catch (err) {
      setError('Erro ao importar lançamentos');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalSelected = () => {
    return extractedData
      .filter((_, index) => selectedItems.includes(index))
      .reduce((sum, t) => sum + t.valor, 0);
  };

  if (!isOpen) return null;

  return (
    <div className="invoice-modal-overlay">
      <div className={`invoice-modal-content ${step === 'review' ? 'review-mode' : ''}`}>
        <button className="modal-close" onClick={onClose}>✕</button>
        
        <div className="invoice-modal-header">
          <h2>Analisar Fatura com IA 🤖</h2>
          <p>Anexe sua fatura (PDF ou Imagem) e deixe a IA identificar os gastos para você.</p>
        </div>

        {error && <div className="invoice-error">{error}</div>}

        {step === 'upload' && (
          <div className="upload-step">
            <div className="form-group">
              <label>Mês de Referência (Opcional)</label>
              <input 
                type="month" 
                className="invoice-select" 
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                disabled={loading}
              />
              <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                Define em qual fatura/mês os lançamentos serão registrados.
              </small>
            </div>

            <div className="form-group">
              <label>Selecione o Cartão de Crédito</label>
              <select 
                value={selectedConta} 
                onChange={(e) => setSelectedConta(e.target.value)}
                className="invoice-select"
              >
                {contas.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            <div className="file-drop-area">
              <input type="file" onChange={handleFileChange} accept="image/*,application/pdf,.csv,.ofx" id="invoice-file" />
              <label htmlFor="invoice-file">
                <div className="upload-icon">📁</div>
                <span>{file ? file.name : 'Clique para selecionar ou arraste a fatura'}</span>
                <small>PDF, PNG, JPG, CSV ou OFX</small>
              </label>
            </div>

            <button 
              className="btn-analyze" 
              onClick={handleStartAnalysis}
              disabled={!file || !selectedConta || loading}
            >
              {loading ? 'Analisando...' : 'Analisar com IA'}
            </button>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="analyzing-step">
            <div className="ai-loader">
              <div className="ai-circles">
                <div></div><div></div><div></div>
              </div>
              <h3>Processando Arquivo...</h3>
              <p>Aguarde enquanto a IA identifica os lançamentos para você.</p>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="review-step">
            <div className="import-summary">
              <div className="summary-card">
                <span className="count">{summary.new}</span>
                <span className="label">Novos</span>
              </div>
              <div className="summary-card duplicate">
                <span className="count">{summary.duplicates}</span>
                <span className="label">Já existem</span>
              </div>
              <div className="summary-card total-value">
                <span className="count">R$ {calculateTotalSelected().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="label">Total Selecionado</span>
              </div>
            </div>

            <div className="transactions-review-list">
              <table>
                <thead>
                  <tr>
                    <th>
                      <input 
                        type="checkbox" 
                        checked={selectedItems.length === extractedData.length && extractedData.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedData.map((t, index) => (
                    <tr key={index} className={t.isDuplicate ? 'is-duplicate' : ''}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedItems.includes(index)}
                          onChange={() => toggleItemSelection(index)}
                        />
                      </td>
                      <td>{new Date(t.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                      <td>
                        <div className="desc-cell">
                          {t.descricao}
                          {t.isDuplicate && <span className="duplicate-badge">Possível Duplicado</span>}
                        </div>
                      </td>
                      <td>R$ {t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="review-footer">
              <button className="btn-cancel" onClick={resetModal} disabled={loading}>Voltar</button>
              <button 
                className="btn-confirm" 
                onClick={handleConfirmImport}
                disabled={selectedItems.length === 0 || loading}
              >
                {loading ? 'Importando...' : `Importar ${selectedItems.length} Lançamentos`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceImportModal;
