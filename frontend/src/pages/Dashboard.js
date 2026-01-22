import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard, getLancamentos, deleteLancamento, updateLancamento, getContas, togglePagoLancamento } from '../services/api';
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import Navbar from '../components/Navbar';
import './Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

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
  const [filterCategoria, setFilterCategoria] = useState('TODAS');
  const [filterSubcategoria, setFilterSubcategoria] = useState('TODAS');
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  
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
    loadCategorias();
    // eslint-disable-next-line
  }, []);

  const loadCategorias = async () => {
    try {
      const response = await getLancamentos();
      const cats = [...new Set(response.data.map(l => ({ id: l.categoria_id, nome: l.categoria_nome })).filter(c => c.nome))];
      setCategorias(cats);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const handleFilterCategoriaChange = (e) => {
    const categId = e.target.value;
    setFilterCategoria(categId);
    setFilterSubcategoria('TODAS');
    
    if (categId === 'TODAS') {
      setSubcategorias([]);
    } else {
      // Extrair subcategorias da categoria selecionada sem duplicatas
      const subCatsMap = new Map();
      lancamentos
        .filter(l => l.categoria_id == categId && l.subcategoria_nome)
        .forEach(l => {
          if (!subCatsMap.has(l.subcategoria_id)) {
            subCatsMap.set(l.subcategoria_id, { id: l.subcategoria_id, nome: l.subcategoria_nome });
          }
        });
      setSubcategorias(Array.from(subCatsMap.values()));
    }
  };

  const handleFilterTipoChange = (e) => {
    setFilterTipo(e.target.value);
    setFilterCategoria('TODAS');
    setFilterSubcategoria('TODAS');
    setSubcategorias([]);
  };

  const getCategoriasDisponiveis = () => {
    let cats = lancamentos;
    
    if (filterTipo !== 'TODOS') {
      cats = cats.filter(l => l.tipo === filterTipo);
    }
    
    const categoriasSet = new Map();
    cats.forEach(l => {
      if (l.categoria_id) {
        categoriasSet.set(l.categoria_id, { id: l.categoria_id, nome: l.categoria_nome });
      }
    });
    
    return Array.from(categoriasSet.values());
  };

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

  const handleLimparFiltros = () => {
    setFilterMes(mesAtual);
    setFilterTipo('TODOS');
    setFilterCategoria('TODAS');
    setFilterSubcategoria('TODAS');
    setSubcategorias([]);
  };

  const calcularTotaisFiltrados = () => {
    let filtrados = lancamentos;

    // Aplicar filtro de mês
    if (filterMes !== 'TODOS') {
      filtrados = filtrados.filter(l => {
        const data = new Date(l.data);
        const mesLancamento = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        return mesLancamento === filterMes;
      });
    }

    // Aplicar filtro de tipo
    if (filterTipo !== 'TODOS') {
      filtrados = filtrados.filter(l => l.tipo === filterTipo);
    }

    // Aplicar filtro de categoria
    if (filterCategoria !== 'TODAS') {
      filtrados = filtrados.filter(l => l.categoria_id == filterCategoria);
    }

    // Aplicar filtro de subcategoria
    if (filterSubcategoria !== 'TODAS' && filterCategoria !== 'TODAS') {
      filtrados = filtrados.filter(l => l.subcategoria_id == filterSubcategoria);
    }

    // Calcular totais
    const totalEntradas = filtrados
      .filter(l => l.tipo === 'entrada')
      .reduce((sum, l) => sum + parseFloat(l.valor), 0);

    const totalSaidas = filtrados
      .filter(l => l.tipo === 'saida')
      .reduce((sum, l) => sum + parseFloat(l.valor), 0);

    return { totalEntradas, totalSaidas };
  };

  const formatarMoeda = (valor) => {
    return valor.toLocaleString('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
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

  // Processar dados para o gráfico de pizza (saídas por categoria do mês filtrado)
  const processPieChartData = () => {
    // Usar o mês filtrado, ou o mês atual se não houver filtro
    const mesParaGrafico = filterMes !== 'TODOS' ? filterMes : new Date().toISOString().slice(0, 7);
    const saidasPorCategoria = {};
    const coresCategoria = {}; // Mapear categoria para sua cor
    
    lancamentos
      .filter(l => l.tipo === 'saida')
      .forEach(lancamento => {
        const mesLancamento = new Date(lancamento.data).toISOString().slice(0, 7);
        if (mesLancamento === mesParaGrafico) {
          const categoria = lancamento.categoria_nome || 'Sem Categoria';
          if (!saidasPorCategoria[categoria]) {
            saidasPorCategoria[categoria] = 0;
            // Armazenar a cor da categoria (ou cinza padrão para "Sem Categoria")
            coresCategoria[categoria] = lancamento.categoria_cor || '#999999';
          }
          saidasPorCategoria[categoria] += parseFloat(lancamento.valor);
        }
      });

    const labels = Object.keys(saidasPorCategoria);
    // Usar as cores das categorias cadastradas
    const cores = labels.map(label => coresCategoria[label]);
    
    return {
      labels: labels,
      datasets: [
        {
          data: Object.values(saidasPorCategoria),
          backgroundColor: cores,
          borderColor: cores.map(cor => cor), // Mesma cor para a borda
          borderWidth: 2,
        },
      ],
    };
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        align: 'start',
        labels: {
          boxWidth: 15,
          padding: 10,
          font: {
            size: 11,
          },
          generateLabels: function(chart) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
              
              // Criar array de objetos com label, valor, cor e índice
              const items = data.labels.map((label, i) => ({
                label: label,
                value: data.datasets[0].data[i],
                color: data.datasets[0].backgroundColor[i],
                index: i
              }));
              
              // Ordenar do maior para o menor valor
              items.sort((a, b) => b.value - a.value);
              
              // Gerar labels ordenados
              return items.map(item => {
                const percentage = ((item.value / total) * 100).toFixed(1);
                return {
                  text: `${item.label}: R$ ${formatarMoeda(item.value)} (${percentage}%)`,
                  fillStyle: item.color,
                  hidden: false,
                  index: item.index
                };
              });
            }
            return [];
          }
        },
      },
      title: {
        display: true,
        text: (() => {
          if (filterMes !== 'TODOS') {
            const [ano, mes] = filterMes.split('-');
            const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            return `Distribuição de Saídas por Categoria (${meses[parseInt(mes) - 1]} ${ano})`;
          }
          return `Distribuição de Saídas por Categoria (${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())})`;
        })(),
        font: {
          size: 14,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: R$ ${formatarMoeda(value)} (${percentage}%)`;
          },
        },
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
                        R$ {formatarMoeda(Number(conta.saldo_inicial) || 0)}
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
          <div className="charts-container">
            <div className="chart-container chart-line">
              <Line data={processChartData()} options={chartOptions} />
            </div>
            
            {lancamentos.filter(l => l.tipo === 'saida').length > 0 && (
              <div className="chart-pie-section">
                <div className="chart-container chart-pie">
                  <Pie data={processPieChartData()} options={pieChartOptions} />
                </div>
                <div className="totals-cards">
                  <div className="total-card total-entradas">
                    <div className="card-label">Total de Entradas</div>
                    <div className="card-value">
                      {mostrarValores ? `R$ ${formatarMoeda(calcularTotaisFiltrados().totalEntradas)}` : 'R$ ••••••'}
                    </div>
                  </div>
                  <div className="total-card total-saidas">
                    <div className="card-label">Total de Saídas</div>
                    <div className="card-value">
                      {mostrarValores ? `R$ ${formatarMoeda(calcularTotaisFiltrados().totalSaidas)}` : 'R$ ••••••'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p>Nenhum dado encontrado. Cadastre lançamentos para visualizar o dashboard.</p>
        )}

        <div className="lancamentos-section">
          <div className="lancamentos-header">
            <h3>Lançamentos por Data</h3>
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
                onChange={handleFilterTipoChange}
                className="filter-select"
              >
                <option value="TODOS">Todos os tipos</option>
                <option value="entrada">Entradas</option>
                <option value="saida">Saídas</option>
                <option value="neutro">Neutros</option>
              </select>

              <select 
                value={filterCategoria} 
                onChange={handleFilterCategoriaChange}
                className="filter-select"
              >
                <option value="TODAS">Todas as categorias</option>
                {getCategoriasDisponiveis().map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))}
              </select>

              {filterCategoria !== 'TODAS' && subcategorias.length > 0 && (
                <select 
                  value={filterSubcategoria} 
                  onChange={(e) => setFilterSubcategoria(e.target.value)}
                  className="filter-select"
                >
                  <option value="TODAS">Todas as subcategorias</option>
                  {subcategorias.map(subCat => (
                    <option key={subCat.id} value={subCat.id}>{subCat.nome}</option>
                  ))}
                </select>
              )}

              <button 
                onClick={handleLimparFiltros}
                className="btn-limpar-filtros"
                title="Limpar todos os filtros"
              >
                ✕ Limpar filtros
              </button>
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

            if (filterCategoria !== 'TODAS') {
              filtrados = filtrados.filter(l => l.categoria_id == filterCategoria);
            }

            if (filterSubcategoria !== 'TODAS' && filterCategoria !== 'TODAS') {
              filtrados = filtrados.filter(l => l.subcategoria_id == filterSubcategoria);
            }

            // Agrupar por data
            const agrupadoPorData = {};
            filtrados.forEach(lancamento => {
              const data = new Date(lancamento.data).toLocaleDateString('pt-BR');
              if (!agrupadoPorData[data]) {
                agrupadoPorData[data] = [];
              }
              agrupadoPorData[data].push(lancamento);
            });

            // Ordenar datas em ordem decrescente
            const datasOrdenadas = Object.keys(agrupadoPorData).sort((a, b) => {
              const [diaA, mesA, anoA] = a.split('/');
              const [diaB, mesB, anoB] = b.split('/');
              return new Date(anoB, mesB - 1, diaB) - new Date(anoA, mesA - 1, diaA);
            });

            return datasOrdenadas.length > 0 ? (
              <div className="lancamentos-by-date">
                {datasOrdenadas.map(data => {
                  const lancamentosDoDay = agrupadoPorData[data];
                  const totalEntrada = lancamentosDoDay
                    .filter(l => l.tipo === 'entrada')
                    .reduce((sum, l) => sum + parseFloat(l.valor), 0);
                  const totalSaida = lancamentosDoDay
                    .filter(l => l.tipo === 'saida')
                    .reduce((sum, l) => sum + parseFloat(l.valor), 0);
                  const saldoDia = totalEntrada - totalSaida;

                  return (
                    <div key={data} className="day-group">
                      <div className="day-header">
                        <div className="day-info">
                          <span className="day-date">{data}</span>
                          <span className={`day-balance ${saldoDia >= 0 ? 'positivo' : 'negativo'}`}>
                            Saldo: R$ {formatarMoeda(Math.abs(saldoDia))}
                          </span>
                        </div>
                        <div className="day-totals">
                          <span className="entrada">↑ Entrada: R$ {formatarMoeda(totalEntrada)}</span>
                          <span className="saida">↓ Saída: R$ {formatarMoeda(totalSaida)}</span>
                        </div>
                      </div>
                      <div className="day-items">
                        {lancamentosDoDay.map(lancamento => (
                          <div key={lancamento.id} className={`lancamento-item ${lancamento.tipo}`}>
                            <div className="item-tipo">
                              <span className={`badge ${lancamento.tipo}`}>
                                {lancamento.tipo === 'entrada' ? '↑ Entrada' : lancamento.tipo === 'saida' ? '↓ Saída' : '⊝ Neutro'}
                              </span>
                            </div>
                            <div className="item-descricao">
                              <div className="descricao-text">{lancamento.descricao}</div>
                              {lancamento.categoria_nome && (
                                <div className="categoria-badges-inline">
                                  <span 
                                    className="categoria-badge-small"
                                    style={{ backgroundColor: lancamento.categoria_cor || '#7c3aed' }}
                                    title={lancamento.categoria_nome}
                                  >
                                    {lancamento.categoria_nome}
                                  </span>
                                  {lancamento.subcategoria_nome && (
                                    <span 
                                      className="subcategoria-badge-small"
                                      style={{ backgroundColor: lancamento.subcategoria_cor || '#7c3aed' }}
                                      title={lancamento.subcategoria_nome}
                                    >
                                      {lancamento.subcategoria_nome}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="item-conta">
                              <span>{lancamento.conta_nome || '-'}</span>
                            </div>
                            <div className={`item-valor ${lancamento.tipo === 'entrada' ? 'valor-positivo' : lancamento.tipo === 'saida' ? 'valor-negativo' : ''}`}>
                              {mostrarValores ? `R$ ${formatarMoeda(Number(lancamento.valor) || 0)}` : 'R$ ••••'}
                            </div>
                            {lancamento.tipo === 'saida' && (
                              <div className="item-pago">
                                <span className={`badge-pago ${lancamento.pago ? 'pago' : 'pendente'}`}>
                                  {lancamento.pago ? '✓ Pago' : '○ Não pago'}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
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
