import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard, getLancamentos, deleteLancamento, updateLancamento, getContas, togglePagoLancamento } from '../services/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import Navbar from '../components/Navbar';
import './Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function Dashboard() {
  const [dashboardData, setDashboardData] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [contas, setContas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingLancamento, setEditingLancamento] = useState(null);
  const [mostrarValores, setMostrarValores] = useState(true);
  
  // Define o mês atual como filtro padrão (YYYY-MM)
  const mesAtual = new Date().toISOString().slice(0, 7);
  const [filterMes, setFilterMes] = useState(mesAtual);
  const [filterTipo, setFilterTipo] = useState('TODOS');
  
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    tipo: 'saida',
    data: new Date().toISOString().split('T')[0],
    conta_id: ''
  });
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadDashboard();
    loadLancamentos();
    loadContas();
    // eslint-disable-next-line
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await getDashboard();
      setDashboardData(response.data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      if (error.response?.status === 401) {
        navigate('/');
      }
    }
  };

  const loadLancamentos = async () => {
    try {
      const response = await getLancamentos();
      setLancamentos(response.data);
    } catch (error) {
      console.error('Erro ao carregar lançamentos:', error);
    }
  };

  const loadContas = async () => {
    try {
      const response = await getContas();
      setContas(response.data);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    }
  };

  const handleEdit = (lancamento) => {
    setEditingLancamento(lancamento);
    setFormData({
      descricao: lancamento.descricao,
      valor: lancamento.valor,
      tipo: lancamento.tipo,
      data: lancamento.data.split('T')[0], // Pega apenas a parte da data (YYYY-MM-DD)
      conta_id: lancamento.conta_id
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Deseja realmente excluir este lançamento?')) {
      try {
        await deleteLancamento(id);
        loadLancamentos();
        loadDashboard();
      } catch (error) {
        alert('Erro ao excluir lançamento');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateLancamento(editingLancamento.id, formData);
      setShowModal(false);
      setEditingLancamento(null);
      setFormData({
        descricao: '',
        valor: '',
        tipo: 'saida',
        data: new Date().toISOString().split('T')[0],
        conta_id: ''
      });
      loadLancamentos();
      loadDashboard();
    } catch (error) {
      alert('Erro ao atualizar lançamento');
    }
  };

  const handleTogglePago = async (lancamento) => {
    try {
      await togglePagoLancamento(lancamento.id);
      loadLancamentos();
      loadDashboard();
      loadContas();
    } catch (error) {
      alert('Erro ao atualizar status de pagamento');
    }
  };

  // Processar dados para o gráfico
  const processChartData = () => {
    const meses = [...new Set(dashboardData.map(item => item.mes))].sort();
    
    const entradas = meses.map(mes => {
      const item = dashboardData.find(d => d.mes === mes && d.tipo === 'entrada');
      return item ? parseFloat(item.total) : 0;
    });

    const saidas = meses.map(mes => {
      const item = dashboardData.find(d => d.mes === mes && d.tipo === 'saida');
      return item ? parseFloat(item.total) : 0;
    });

    return {
      labels: meses.map(mes => {
        const [ano, mesNum] = mes.split('-');
        return `${mesNum}/${ano}`;
      }),
      datasets: [
        {
          label: 'Entradas',
          data: entradas,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.3,
        },
        {
          label: 'Saídas',
          data: saidas,
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.3,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Fluxo Financeiro Mensal',
      },
    },
  };

  return (
    <div className="dashboard-container">
      <Navbar />

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h2>Dashboard</h2>
          <button 
            className="btn-toggle-valores"
            onClick={() => setMostrarValores(!mostrarValores)}
            title={mostrarValores ? 'Ocultar valores' : 'Mostrar valores'}
          >
            {mostrarValores ? '👁️ Ocultar valores' : '🙈 Mostrar valores'}
          </button>
        </div>

        {/* Seção de Contas */}
        <div className="contas-section">
          <h3>💳 Minhas Contas</h3>
          <div className="contas-grid">
            {contas.map(conta => (
              <div key={conta.id} className="conta-card">
                <div className="conta-header">
                  <span className="conta-nome">{conta.nome}</span>
                </div>
                <div className="conta-saldo">
                  {mostrarValores ? (
                    <>
                      <span className="label">Saldo:</span>
                      <span className={`valor ${parseFloat(conta.saldo_inicial) >= 0 ? 'positivo' : 'negativo'}`}>
                        R$ {parseFloat(conta.saldo_inicial).toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="valor-oculto">R$ ••••••</span>
                  )}
                </div>
                {conta.descricao && (
                  <div className="conta-descricao">{conta.descricao}</div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {dashboardData.length > 0 ? (
          <div className="chart-container">
            <Line data={processChartData()} options={chartOptions} />
          </div>
        ) : (
          <p>Nenhum dado encontrado. Cadastre lançamentos para visualizar o dashboard.</p>
        )}

        <div className="lancamentos-section">
          <div className="lancamentos-header">
            <h3>Lançamentos Recentes</h3>
            <div className="filters">
              <select 
                value={filterMes} 
                onChange={(e) => setFilterMes(e.target.value)}
                className="filter-select"
              >
                <option value="TODOS">Todos os meses</option>
                {[...new Set(lancamentos.map(l => {
                  const data = new Date(l.data);
                  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
                }))].sort().reverse().map(mes => {
                  const [ano, mesNum] = mes.split('-');
                  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                  return <option key={mes} value={mes}>{meses[parseInt(mesNum) - 1]}/{ano}</option>;
                })}
              </select>
              
              <select 
                value={filterTipo} 
                onChange={(e) => setFilterTipo(e.target.value)}
                className="filter-select"
              >
                <option value="TODOS">Todos os tipos</option>
                <option value="entrada">Entradas</option>
                <option value="saida">Saídas</option>
                <option value="neutro">Neutros</option>
              </select>
            </div>
          </div>
          
          {(() => {
            let filtrados = lancamentos;
            
            if (filterMes !== 'TODOS') {
              filtrados = filtrados.filter(l => {
                const data = new Date(l.data);
                const mesLancamento = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
                return mesLancamento === filterMes;
              });
            }
            
            if (filterTipo !== 'TODOS') {
              filtrados = filtrados.filter(l => l.tipo === filterTipo);
            }
            
            return filtrados.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Conta</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Pago</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(lancamento => (
                    <tr key={lancamento.id}>
                      <td>{new Date(lancamento.data).toLocaleDateString('pt-BR')}</td>
                      <td>{lancamento.descricao}</td>
                      <td>{lancamento.conta_nome || '-'}</td>
                      <td>
                        <span className={`badge ${lancamento.tipo}`}>
                          {lancamento.tipo === 'entrada' ? '↑ Entrada' : lancamento.tipo === 'saida' ? '↓ Saída' : '⊝ Neutro'}
                        </span>
                      </td>
                      <td className={lancamento.tipo === 'entrada' ? 'valor-positivo' : lancamento.tipo === 'saida' ? 'valor-negativo' : ''}>
                        {mostrarValores ? `R$ ${parseFloat(lancamento.valor).toFixed(2)}` : 'R$ ••••'}
                      </td>
                      <td>
                        {lancamento.tipo === 'saida' ? (
                          <>
                            <span className={`badge-pago ${lancamento.pago ? 'pago' : 'pendente'}`}>
                              {lancamento.pago ? 'Pago' : 'Não pago'}
                            </span>
                            <button 
                              className="btn-toggle-pago" 
                              onClick={() => handleTogglePago(lancamento)}
                              title={lancamento.pago ? 'Marcar como não pago' : 'Marcar como pago'}
                            >
                              {lancamento.pago ? '✓' : '○'}
                            </button>
                          </>
                        ) : '-'}
                      </td>
                      <td>
                        <button className="btn-edit" onClick={() => handleEdit(lancamento)}>Editar</button>
                        <button className="btn-delete" onClick={() => handleDelete(lancamento.id)}>Excluir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Nenhum lançamento encontrado com os filtros selecionados.</p>
          );
          })()}
        </div>
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Editar Lançamento</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Descrição *</label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Valor *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) => setFormData({...formData, valor: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Data *</label>
                  <input
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({...formData, data: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Tipo *</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                  required
                >
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </div>

              <div className="form-group">
                <label>Conta *</label>
                <select
                  value={formData.conta_id}
                  onChange={(e) => setFormData({...formData, conta_id: e.target.value})}
                  required
                >
                  <option value="">Selecione uma conta</option>
                  {contas.map(conta => (
                    <option key={conta.id} value={conta.id}>{conta.nome}</option>
                  ))}
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
    </div>
  );
}

export default Dashboard;
