import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getDashboard, 
  getLancamentos, 
  deleteLancamento, 
  updateLancamento, 
  createLancamento, 
  getContas, 
  togglePagoLancamento,
  getCategorias,
  getSubcategorias,
  getEntradasProjetivas,
  createEntradaProjetiva,
  createEntradasProjetivasBulk,
  updateEntradaProjetiva,
  deleteEntradaProjetiva
} from '../services/api';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import Navbar from '../components/Navbar';
import './Dashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function Dashboard() {
  const [dashboardData, setDashboardData] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [contas, setContas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingLancamento, setEditingLancamento] = useState(null);
  const [mostrarValores, setMostrarValores] = useState(true);
  const [entradasProjetivas, setEntradasProjetivas] = useState([]);
  const [showModalProjetivas, setShowModalProjetivas] = useState(false);
  const [modoGraficoProjetivo, setModoGraficoProjetivo] = useState(false);
  const [projetivasList, setProjetivasList] = useState([{ data: new Date().toISOString().split('T')[0], valor: '', descricao: '' }]);
  
  const totalProjetivas = entradasProjetivas.reduce((sum, p) => sum + parseFloat(p.valor || 0), 0);
  
  // Define o mês atual como filtro padrão (YYYY-MM)
  const mesAtual = new Date().toISOString().slice(0, 7);
  const [filterMes, setFilterMes] = useState(mesAtual);
  const [filterTipo, setFilterTipo] = useState('TODOS');
  const [filterCategoria, setFilterCategoria] = useState('TODAS');
  const [filterSubcategoria, setFilterSubcategoria] = useState('TODAS');
  const [filterConta, setFilterConta] = useState('TODAS');
  const [filterAtraso, setFilterAtraso] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    tipo: 'saida',
    data: new Date().toISOString().split('T')[0],
    conta_id: '',
    conta_destino_id: '',
    categoria_id: '',
    subcategoria_id: '',
    pago: false,
    parcelado: false,
    num_parcelas: 1
  });
  const [quickAddType, setQuickAddType] = useState(null); // 'entrada' ou 'saida'
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadDashboard();
    loadLancamentos();
    loadContas();
    loadCategorias();
    loadEntradasProjetivas();
    // eslint-disable-next-line
  }, []);

  const loadEntradasProjetivas = async () => {
    try {
      const response = await getEntradasProjetivas();
      setEntradasProjetivas(response.data);
    } catch (error) {
      console.error('Erro ao carregar entradas projetivas:', error);
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

  const loadCategorias = async () => {
    try {
      const response = await getCategorias();
      setCategorias(response.data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const loadSubcategoriasPorCategoria = async (categoriaId) => {
    if (!categoriaId) {
      setSubcategorias([]);
      return;
    }
    try {
      const response = await getSubcategorias(categoriaId);
      setSubcategorias(response.data);
    } catch (error) {
      console.error('Erro ao carregar subcategorias:', error);
      setSubcategorias([]);
    }
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
    
    if (lancamento.categoria_id) {
      loadSubcategoriasPorCategoria(lancamento.categoria_id);
    } else {
      setSubcategorias([]);
    }

    setFormData({
      descricao: lancamento.descricao,
      valor: lancamento.valor,
      tipo: lancamento.tipo,
      data: lancamento.data.split('T')[0],
      conta_id: lancamento.conta_id,
      conta_destino_id: lancamento.conta_destino_id || '',
      categoria_id: lancamento.categoria_id || '',
      subcategoria_id: lancamento.subcategoria_id || ''
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

  const handleTogglePago = async (lancamento) => {
    try {
      await togglePagoLancamento(lancamento.id);
      loadLancamentos();
      loadDashboard();
      loadContas();
    } catch (error) {
      alert('Erro ao alterar status de pagamento');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLancamento) {
        await updateLancamento(editingLancamento.id, formData);
      } else {
        await createLancamento(formData);
      }
      
      setShowModal(false);
      setEditingLancamento(null);
      setFormData({
        descricao: '',
        valor: '',
        tipo: 'saida',
        data: new Date().toISOString().split('T')[0],
        conta_id: '',
        conta_destino_id: '',
        categoria_id: '',
        subcategoria_id: ''
      });
      loadLancamentos();
      loadDashboard();
      loadContas();
    } catch (error) {
      console.error(error);
      alert(editingLancamento ? 'Erro ao atualizar lançamento' : 'Erro ao criar lançamento');
    }
  };

  // Handlers para Entradas Projetivas
  const handleAddProjetivaRow = () => {
    setProjetivasList([...projetivasList, { data: new Date().toISOString().split('T')[0], valor: '', descricao: '' }]);
  };
  
  const handleRemoveProjetivaRow = (index) => {
    const list = [...projetivasList];
    list.splice(index, 1);
    setProjetivasList(list);
  };

  const handleProjetivaChange = (index, field, value) => {
    const list = [...projetivasList];
    list[index][field] = value;
    setProjetivasList(list);
  };
  
  const handleSaveProjetivas = async () => {
    try {
      const validItems = projetivasList.filter(item => item.descricao && item.valor && item.data);
      if (validItems.length > 0) {
        await createEntradasProjetivasBulk(validItems);
        loadEntradasProjetivas();
      }
      setShowModalProjetivas(false);
      setProjetivasList([{ data: new Date().toISOString().split('T')[0], valor: '', descricao: '' }]);
    } catch (e) {
      alert('Erro ao salvar entradas projetivas');
    }
  };

  const handleDeleteProjetivaDb = async (id) => {
    if (window.confirm('Deseja realmente excluir esta entrada projetiva?')) {
      try {
        await deleteEntradaProjetiva(id);
        loadEntradasProjetivas();
      } catch (e) {
        alert('Erro ao excluir entrada projetiva');
      }
    }
  };


  const handleLimparFiltros = () => {
    setFilterMes(mesAtual);
    setFilterTipo('TODOS');
    setFilterCategoria('TODAS');
    setFilterSubcategoria('TODAS');
    setFilterConta('TODAS');
    setFilterAtraso(false);
    setSubcategorias([]);
  };

  const calcularFaturaMes = (contaId) => {
    const mesParaFiltro = filterMes !== 'TODOS' ? filterMes : new Date().toISOString().slice(0, 7);
    return lancamentos
      .filter(l => l.conta_id === contaId)
      .filter(l => {
        const data = new Date(l.data);
        const mesLancamento = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        return mesLancamento === mesParaFiltro;
      })
      .reduce((total, l) => {
        // Agora somamos o valor absoluto das saídas (gastos) no mês
        if (l.tipo === 'saida') return total + parseFloat(l.valor);
        if (l.tipo === 'entrada') return total - parseFloat(l.valor);
        return total;
      }, 0);
  };

  const calcularSaldoTotal = () => {
    return contas.reduce((total, conta) => {
      // Cartão de crédito é passivo/dívida, não entra no cálculo de patrimônio líquido/disponível neste dashboard
      if (conta.tipo === 'Cartão de Crédito') {
        return total;
      }
      return total + (Number(conta.saldo_inicial) || 0);
    }, 0);
  };

  const calcularSaldosPorTipo = () => {
    const tipos = {
      'Conta Corrente': 0,
      'Conta Poupança': 0,
      'Conta Investimento': 0,
      'Cartão de Crédito': 0,
      'Dinheiro': 0
    };

    contas.forEach(conta => {
      const tipo = conta.tipo || 'Conta Corrente';
      if (tipo === 'Cartão de Crédito') {
        tipos[tipo] = (tipos[tipo] || 0) + (Number(conta.saldo_inicial) || 0);
      } else {
        tipos[tipo] = (tipos[tipo] || 0) + (Number(conta.saldo_inicial) || 0);
      }
    });

    return tipos;
  };

  const gerarCalendario = () => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const primeiroDia = new Date(ano, mes, 1).getDay();
    const ultimoDia = new Date(ano, mes + 1, 0).getDate();
    
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    const dias = [];
    
    // Dias vazios antes do primeiro dia do mês
    for (let i = 0; i < primeiroDia; i++) {
      dias.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    
    // Dias do mês
    for (let dia = 1; dia <= ultimoDia; dia++) {
      const ehHoje = dia === hoje.getDate();
      dias.push(
        <div key={dia} className={`calendar-day ${ehHoje ? 'hoje' : ''}`}>
          {dia}
        </div>
      );
    }
    
    return (
      <div className="calendar-widget">
        <div className="calendar-header">
          {meses[mes]} {ano}
        </div>
        <div className="calendar-weekdays">
          {diasSemana.map(dia => (
            <div key={dia} className="calendar-weekday">{dia}</div>
          ))}
        </div>
        <div className="calendar-days">
          {dias}
        </div>
      </div>
    );
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

  const calcularEmAtraso = () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let filtrados = lancamentos.filter(l => {
      const dataLancamento = new Date(l.data);
      return l.tipo === 'saida' && !l.pago && dataLancamento < hoje;
    });

    // Aplicar filtro de mês se não for "TODOS"
    if (filterMes !== 'TODOS') {
      filtrados = filtrados.filter(l => {
        const data = new Date(l.data);
        const mesLancamento = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        return mesLancamento === filterMes;
      });
    }

    const quantidade = filtrados.length;
    const valorTotal = filtrados.reduce((sum, l) => sum + parseFloat(l.valor), 0);

    return { quantidade, valorTotal };
  };

  const formatarMoeda = (valor) => {
    return valor.toLocaleString('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  // Calcular valores por categoria e subcategoria com base no filtro
  const calcularValoresPorCategoria = () => {
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
    } else {
      // Excluir transferências e neutros por padrão (são neutros)
      filtrados = filtrados.filter(l => l.tipo !== 'transferencia' && l.tipo !== 'neutro');
    }

    // Aplicar filtro de categoria
    if (filterCategoria !== 'TODAS') {
      filtrados = filtrados.filter(l => l.categoria_id == filterCategoria);
    }

    // Aplicar filtro de subcategoria
    if (filterSubcategoria !== 'TODAS' && filterCategoria !== 'TODAS') {
      filtrados = filtrados.filter(l => l.subcategoria_id == filterSubcategoria);
    }

    // Agrupar por categoria e subcategoria
    const grupos = {};

    filtrados.forEach(lancamento => {
      const categoriaNome = lancamento.categoria_nome || 'Sem Categoria';
      const categoriaId = lancamento.categoria_id || 'sem-categoria';
      const categoriaCor = lancamento.categoria_cor || '#999999';
      const subcategoriaNome = lancamento.subcategoria_nome || 'Sem Subcategoria';
      const subcategoriaId = lancamento.subcategoria_id || 'sem-subcategoria';

      if (!grupos[categoriaId]) {
        const catOriginal = categorias.find(c => c.id == categoriaId);
        grupos[categoriaId] = {
          nome: categoriaNome,
          cor: categoriaCor,
          total: 0,
          meta: catOriginal ? catOriginal.meta_mensal : null,
          subcategorias: {}
        };
      }

      grupos[categoriaId].total += parseFloat(lancamento.valor);

      if (!grupos[categoriaId].subcategorias[subcategoriaId]) {
        grupos[categoriaId].subcategorias[subcategoriaId] = {
          nome: subcategoriaNome,
          total: 0,
          meta: lancamento.subcategoria_meta || null
        };
      }

      grupos[categoriaId].subcategorias[subcategoriaId].total += parseFloat(lancamento.valor);
    });

    // Converter para array e ordenar por valor total
    return Object.values(grupos)
      .sort((a, b) => b.total - a.total)
      .map(categoria => ({
        ...categoria,
        subcategorias: Object.values(categoria.subcategorias)
          .sort((a, b) => b.total - a.total)
      }));
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

    const balanco = meses.map((mes, i) => entradas[i] - saidas[i]);

    return {
      labels: meses.map(mes => {
        const [ano, mesNum] = mes.split('-');
        const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${mesesNomes[parseInt(mesNum)-1]}/${ano.slice(2)}`;
      }),
      datasets: [
        {
          type: 'line',
          label: 'Saldo do Mês',
          data: balanco,
          borderColor: '#6366f1',
          borderWidth: 3,
          pointBackgroundColor: '#6366f1',
          pointRadius: 4,
          tension: 0.4,
          fill: true,
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          order: 1
        },
        {
          type: 'bar',
          label: 'Entradas',
          data: entradas,
          backgroundColor: 'rgba(34, 197, 94, 0.7)',
          borderRadius: 6,
          barThickness: 25,
          order: 2
        },
        {
          type: 'bar',
          label: 'Saídas',
          data: saidas,
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderRadius: 6,
          barThickness: 25,
          order: 2
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { size: 12, weight: '600' }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#1f2937',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: {
          callback: value => 'R$ ' + value.toLocaleString('pt-BR')
        }
      }
    }
  };

  // Processar dados para o gráfico de pizza (saídas por categoria do mês filtrado)
  const processPieChartData = () => {
    const mesParaGrafico = filterMes !== 'TODOS' ? filterMes : new Date().toISOString().slice(0, 7);
    const saidasPorCategoria = {};
    const coresCategoria = {};
    
    let filtrados = lancamentos.filter(l => l.tipo === 'saida');

    if (filterCategoria !== 'TODAS') {
      filtrados = filtrados.filter(l => l.categoria_id == filterCategoria);
    }
    if (filterSubcategoria !== 'TODAS' && filterCategoria !== 'TODAS') {
      filtrados = filtrados.filter(l => l.subcategoria_id == filterSubcategoria);
    }
    if (filterConta !== 'TODAS') {
      filtrados = filtrados.filter(l => l.conta_id == filterConta);
    }
    
    filtrados.forEach(lancamento => {
      const mesLancamento = new Date(lancamento.data).toISOString().slice(0, 7);
      if (mesLancamento === mesParaGrafico) {
        const categoria = lancamento.categoria_nome || 'Sem Categoria';
        if (!saidasPorCategoria[categoria]) {
          saidasPorCategoria[categoria] = 0;
          coresCategoria[categoria] = lancamento.categoria_cor || '#999999';
        }
        saidasPorCategoria[categoria] += parseFloat(lancamento.valor);
      }
    });

    // Ordenar categorias por valor (do maior para o menor)
    const sortedCategories = Object.keys(saidasPorCategoria).sort((a, b) => saidasPorCategoria[b] - saidasPorCategoria[a]);
    const sortedData = sortedCategories.map(cat => saidasPorCategoria[cat]);
    const sortedColors = sortedCategories.map(cat => coresCategoria[cat]);
    
    return {
      labels: sortedCategories,
      datasets: [
        {
          data: sortedData,
          backgroundColor: sortedColors,
          borderColor: 'white',
          borderWidth: 3,
          hoverOffset: 15,
          spacing: 5,
        },
      ],
    };
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        display: false // Vamos usar as barras laterais para legenda
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#1f2937',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: R$ ${value.toLocaleString('pt-BR')} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Processar dados para o gráfico de pizza (saídas por conta do mês filtrado)
  const processPieChartDataPorConta = () => {
    const mesParaGrafico = filterMes !== 'TODOS' ? filterMes : new Date().toISOString().slice(0, 7);
    const saidasPorConta = {};
    
    // Cores para as contas (já que não possuem cor definida no banco)
    const coresDisponiveis = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#0ea5e9'];
    const coresConta = {};
    let colorIndex = 0;

    let filtrados = lancamentos.filter(l => l.tipo === 'saida');

    if (filterCategoria !== 'TODAS') {
      filtrados = filtrados.filter(l => l.categoria_id == filterCategoria);
    }
    if (filterSubcategoria !== 'TODAS' && filterCategoria !== 'TODAS') {
      filtrados = filtrados.filter(l => l.subcategoria_id == filterSubcategoria);
    }
    if (filterConta !== 'TODAS') {
      filtrados = filtrados.filter(l => l.conta_id == filterConta);
    }

    filtrados.forEach(lancamento => {
      const mesLancamento = new Date(lancamento.data).toISOString().slice(0, 7);
      if (mesLancamento === mesParaGrafico) {
        const contaNome = lancamento.conta_nome || 'Sem Conta';
        if (!saidasPorConta[contaNome]) {
          saidasPorConta[contaNome] = 0;
          coresConta[contaNome] = coresDisponiveis[colorIndex % coresDisponiveis.length];
          colorIndex++;
        }
        saidasPorConta[contaNome] += parseFloat(lancamento.valor);
      }
    });

    const sortedContas = Object.keys(saidasPorConta).sort((a, b) => saidasPorConta[b] - saidasPorConta[a]);
    const sortedData = sortedContas.map(conta => saidasPorConta[conta]);
    const sortedColors = sortedContas.map(conta => coresConta[conta]);
    
    return {
      labels: sortedContas,
      datasets: [
        {
          data: sortedData,
          backgroundColor: sortedColors,
          borderColor: 'white',
          borderWidth: 3,
          hoverOffset: 15,
          spacing: 5,
        },
      ],
    };
  };

  // Processar dados para o gráfico de Área (Evolução Diária)
  const processAreaChartData = () => {
    const mesParaGrafico = filterMes !== 'TODOS' ? filterMes : new Date().toISOString().slice(0, 7);
    const [ano, mes] = mesParaGrafico.split('-');
    
    // Obter número de dias no mês
    const diasNoMes = new Date(ano, mes, 0).getDate();
    
    const labels = [];
    const saldosAcumulados = [];
    const entradasPorDia = [];
    const saidasPorDia = [];
    
    let saldoAtual = 0;
    
    const lancamentosDoMes = lancamentos.filter(l => {
        const dataLanc = new Date(l.data).toISOString().slice(0, 7);
        return dataLanc === mesParaGrafico && (l.tipo === 'entrada' || l.tipo === 'saida');
    });

    // Para as projetivas, não filtramos por mês/ano, pois elas valem para qualquer mês (apenas o dia importa)
    const entradasProjetivasGlobais = entradasProjetivas;

    for (let dia = 1; dia <= diasNoMes; dia++) {
      labels.push(`${dia}/${mes}`);
      
      const diaFormatado = `${ano}-${mes}-${String(dia).padStart(2, '0')}`;
      
      const lancamentosDoDia = lancamentosDoMes.filter(l => l.data.startsWith(diaFormatado));
      
      let entradasDia = 0;
      
      if (modoGraficoProjetivo) {
        // Filtra projetivas que coincidem com o dia do mês atual (independente de ano/mês do cadastro)
        const projetivasDoDia = entradasProjetivasGlobais.filter(l => {
          const dataProj = new Date(l.data);
          // Usamos getUTCDate ou split para pegar o dia exato da string YYYY-MM-DD
          const diaProj = parseInt(l.data.split('-')[2].substring(0, 2));
          return diaProj === dia;
        });
        entradasDia = projetivasDoDia.reduce((sum, l) => sum + parseFloat(l.valor), 0);
      } else {
        entradasDia = lancamentosDoDia
          .filter(l => l.tipo === 'entrada')
          .reduce((sum, l) => sum + parseFloat(l.valor), 0);
      }
        
      const saidasDia = lancamentosDoDia
        .filter(l => l.tipo === 'saida')
        .reduce((sum, l) => sum + parseFloat(l.valor), 0);
        
      saldoAtual += (entradasDia - saidasDia);
      saldosAcumulados.push(saldoAtual);
      entradasPorDia.push(entradasDia);
      saidasPorDia.push(saidasDia);
    }

    return {
      labels,
      datasets: [
        {
          fill: true,
          label: modoGraficoProjetivo ? 'Fluxo de Caixa (Projetivo)' : 'Fluxo de Caixa',
          data: saldosAcumulados,
          borderColor: modoGraficoProjetivo ? '#8b5cf6' : '#10b981',
          backgroundColor: modoGraficoProjetivo ? 'rgba(139, 92, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          pointRadius: 2,
          pointBackgroundColor: modoGraficoProjetivo ? '#8b5cf6' : '#10b981',
          borderWidth: 3,
          entradas: entradasPorDia,
          saidas: saidasPorDia
        }
      ]
    };
  };

  const areaChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#1f2937',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        usePointStyle: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
            }
            return label;
          },
          afterLabel: function(context) {
            const index = context.dataIndex;
            const entries = context.dataset.entradas[index];
            const exits = context.dataset.saidas[index];
            return `\nEntrada: R$ ${entries.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\nSaída: R$ ${exits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false }
      },
      y: {
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: {
          callback: value => 'R$ ' + value.toLocaleString('pt-BR')
        }
      }
    }
  };

  return (
    <div className="dashboard-container">
      <Navbar />

      <div className="dashboard-content">
        <div className="dashboard-welcome">
          <div className="welcome-text">
            <h2>Olá, {user.nome}! 👋</h2>
            <p>Aqui está o resumo da sua vida financeira hoje.</p>
          </div>
          <div className="quick-actions-btns">
            <button className="btn-quick btn-secondary-action" onClick={() => setShowModalProjetivas(true)} style={{ backgroundColor: '#8b5cf6', color: 'white' }}>
              <span>+</span> Gerenciar Entradas Projetivas
            </button>
            <button className="btn-quick btn-primary-action" onClick={() => { setQuickAddType(null); setFormData({...formData, tipo: 'saida', categoria_id: '', subcategoria_id: '', conta_destino_id: ''}); setShowModal(true); }}>
              <span>+</span> Adicionar Lançamento
            </button>
          </div>
        </div>

        {/* Seção de Contas */}
        <div className="contas-section">
          {/* Card de Saldo Total */}
          <div className="saldo-total-card">

            <div className="saldo-total-content">
            <div className="saldo-total-header">
                <div className="saldo-label-group">
                  <span className="saldo-total-label">Patrimônio Total</span>
                  <span className="saldo-total-subtitle">Soma de todas as suas contas</span>
                </div>
                <button 
                  className="btn-toggle-valores-card"
                  onClick={() => setMostrarValores(!mostrarValores)}
                  title={mostrarValores ? 'Ocultar valores' : 'Mostrar valores'}
                >
                  {mostrarValores ? '👁️' : '🙈'}
                </button>
              </div>
              {mostrarValores ? (
                <>
                  <span className={`saldo-total-valor ${calcularSaldoTotal() >= 0 ? 'positivo' : 'negativo'}`}>
                    R$ {formatarMoeda(calcularSaldoTotal())}
                  </span>
                  
                  <div className="saldo-por-tipo">
                    {Object.entries(calcularSaldosPorTipo()).map(([tipo, valor]) => (
                      <div key={tipo} className="tipo-item">
                        <span className={`tipo-badge badge-${tipo.toLowerCase().replace(' ', '-')}`}>
                          {tipo}
                        </span>
                        <span className={`tipo-valor ${valor >= 0 ? 'positivo' : 'negativo'}`}>
                          R$ {formatarMoeda(valor)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <span className="saldo-total-valor-oculto">R$ ••••••</span>
              )}
            </div>
          </div>
          
          <div className="contas-grid">
            {contas.map(conta => (
              <div key={conta.id} className="conta-card" data-tipo={conta.tipo}>
                <div className="conta-header">
                  <div className="conta-info">
                    <h4>{conta.nome}</h4>
                  </div>
                  {conta.tipo && (
                    <span className={`conta-tipo-badge badge-${conta.tipo.toLowerCase().replace(' ', '-')}`}>
                      {conta.tipo}
                    </span>
                  )}
                </div>
                <div className="conta-saldo">
                  {mostrarValores ? (
                    <>
                      <span className="label">{conta.tipo === 'Cartão de Crédito' ? 'Fatura do Mês:' : 'Saldo:'}</span>
                      <span className={`valor ${conta.tipo === 'Cartão de Crédito' ? 'valor-fatura' : (parseFloat(conta.saldo_inicial) >= 0 ? 'positivo' : 'negativo')}`}>
                        R$ {formatarMoeda(conta.tipo === 'Cartão de Crédito' ? Math.abs(calcularFaturaMes(conta.id)) : (Number(conta.saldo_inicial) || 0))}
                      </span>
                      
                      {conta.tipo === 'Cartão de Crédito' && (
                        <div className="limite-container">
                          <div className="limite-info">
                            <span>Limite: R$ {formatarMoeda(conta.limite_total)}</span>
                            <span>{((Math.abs(Number(conta.saldo_inicial)) / Number(conta.limite_total)) * 100).toFixed(1)}%</span>
                          </div>
                          <div className="limite-bar-bg">
                            <div 
                              className="limite-bar-fill" 
                              style={{ 
                                width: `${Math.min(100, (Math.abs(Number(conta.saldo_inicial)) / Number(conta.limite_total)) * 100)}%`,
                                backgroundColor: (Math.abs(Number(conta.saldo_inicial)) / Number(conta.limite_total)) > 0.8 ? '#ef4444' : '#3b82f6'
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
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
              <Bar data={processChartData()} options={chartOptions} />
            </div>
            
            {lancamentos.length > 0 && (
              <div className="chart-container chart-area">
                <div className="chart-header-compact" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4>Evolução Diária do Fluxo de Caixa {filterMes === 'TODOS' && '(Mês Atual)'}</h4>
                  <div 
                    className="toggle-projetivo-container" 
                    onClick={() => setModoGraficoProjetivo(!modoGraficoProjetivo)}
                    style={{ 
                      display: 'flex', 
                      background: '#f3f4f6', 
                      borderRadius: '20px', 
                      padding: '3px', 
                      cursor: 'pointer', 
                      position: 'relative', 
                      width: '160px',
                      height: '32px',
                      alignItems: 'center',
                      userSelect: 'none',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                    }}
                  >
                    <div 
                      className="toggle-slider" 
                      style={{ 
                        position: 'absolute', 
                        width: '78px', 
                        height: '26px', 
                        background: modoGraficoProjetivo ? '#8b5cf6' : '#10b981', 
                        borderRadius: '18px', 
                        left: modoGraficoProjetivo ? '79px' : '3px', 
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                    ></div>
                    <span style={{ 
                      flex: 1, 
                      textAlign: 'center', 
                      zIndex: 1, 
                      fontSize: '0.75rem', 
                      fontWeight: 'bold', 
                      color: !modoGraficoProjetivo ? 'white' : '#6b7280',
                      transition: 'color 0.3s'
                    }}>Real</span>
                    <span style={{ 
                      flex: 1, 
                      textAlign: 'center', 
                      zIndex: 1, 
                      fontSize: '0.75rem', 
                      fontWeight: 'bold', 
                      color: modoGraficoProjetivo ? 'white' : '#6b7280',
                      transition: 'color 0.3s'
                    }}>Projetivo</span>
                  </div>
                </div>
                <div className="chart-content-area" style={{ height: '350px' }}>
                  <Line data={processAreaChartData()} options={areaChartOptions} />
                </div>
              </div>
            )}

            {lancamentos.filter(l => l.tipo === 'saida').length > 0 && (
              <>
                <div className="chart-pie-section">
                  <div className="chart-container chart-pie">
                    <div className="chart-header-compact">
                      <h4>Distribuição de Gastos</h4>
                    </div>
                    <div className="chart-content-pie">
                      <Pie data={processPieChartData()} options={pieChartOptions} />
                      {lancamentos.filter(l => l.tipo === 'saida').length > 0 && (
                        <div className="chart-center-info">
                          <span className="center-label">Total Gasto</span>
                          <span className="center-value">R$ {formatarMoeda(calcularTotaisFiltrados().totalSaidas)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="chart-container chart-pie">
                    <div className="chart-header-compact">
                      <h4>Gastos por Conta</h4>
                    </div>
                    <div className="chart-content-pie">
                      <Pie data={processPieChartDataPorConta()} options={pieChartOptions} />
                      {lancamentos.filter(l => l.tipo === 'saida').length > 0 && (
                        <div className="chart-center-info">
                          <span className="center-label">Total Gasto</span>
                          <span className="center-value">R$ {formatarMoeda(calcularTotaisFiltrados().totalSaidas)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="right-section">
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
                      <div className="total-card total-atraso">
                        <div className="card-label">⚠️ Em Atraso</div>
                        <div className="card-count">{calcularEmAtraso().quantidade} lançamento{calcularEmAtraso().quantidade !== 1 ? 's' : ''}</div>
                        <div className="card-value">
                          {mostrarValores ? `R$ ${formatarMoeda(calcularEmAtraso().valorTotal)}` : 'R$ ••••••'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Barras horizontais por categoria e subcategoria */}
                <div className="category-bars-section">
                  <h3>📊 Valores por Categoria</h3>
                  <div className="category-bars-container">
                    {calcularValoresPorCategoria().length > 0 ? (
                      calcularValoresPorCategoria().map((categoria, idx) => {
                        const maxValor = Math.max(...calcularValoresPorCategoria().map(c => c.total));
                        
                        let percentual = 0;
                        let isOverBudget = false;
                        
                        if (categoria.meta) {
                          percentual = (categoria.total / categoria.meta) * 100;
                          if (percentual > 100) {
                            isOverBudget = true;
                            percentual = 100;
                          }
                        } else {
                          percentual = (categoria.total / maxValor) * 100;
                        }
                        
                        return (
                          <div key={idx} className="category-bar-group">
                            <div className="category-bar-main">
                              <div className="bar-label">
                                <span className="bar-categoria" style={{ color: categoria.cor }}>
                                  ● {categoria.nome}
                                  {categoria.meta && (
                                    <span title="Meta Mensal Definida" style={{ marginLeft: '6px', fontSize: '0.85rem' }}>🎯</span>
                                  )}
                                </span>
                                <span className="bar-valor">
                                  {mostrarValores ? `R$ ${formatarMoeda(categoria.total)}` : 'R$ ••••••'}
                                  {categoria.meta && mostrarValores && (
                                    <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '4px' }}>
                                      / R$ {formatarMoeda(Number(categoria.meta))}
                                    </span>
                                  )}
                                  <span className="percentage-pill" style={{ backgroundColor: isOverBudget ? '#fef2f2' : `${categoria.cor}22`, color: isOverBudget ? '#ef4444' : categoria.cor }}>
                                    {((categoria.meta ? (categoria.total / categoria.meta) * 100 : (categoria.total / maxValor) * 100)).toFixed(1)}%
                                  </span>
                                </span>
                              </div>
                              <div className="bar-container">
                                <div 
                                  className="bar-fill" 
                                  style={{ 
                                    width: `${percentual}%`,
                                    background: isOverBudget ? '#ef4444' : categoria.cor
                                  }}
                                >
                                </div>
                              </div>
                            </div>
                            
                            {/* Subcategorias */}
                            {categoria.subcategorias.length > 0 && (
                              <div className="subcategory-bars">
                                {categoria.subcategorias.map((subcategoria, subIdx) => {
                                  let subPercentual = 0;
                                  let isSubOverBudget = false;
                                  
                                  if (subcategoria.meta) {
                                    subPercentual = (subcategoria.total / subcategoria.meta) * 100;
                                    if (subPercentual > 100) {
                                      isSubOverBudget = true;
                                      subPercentual = 100;
                                    }
                                  } else {
                                    subPercentual = (subcategoria.total / categoria.total) * 100;
                                  }
                                  
                                  return (
                                    <div key={subIdx} className="subcategory-bar">
                                      <div className="bar-label subcategory-label">
                                        <span className="bar-subcategoria">
                                          └─ {subcategoria.nome}
                                          {subcategoria.meta && (
                                            <span title="Meta Mensal Definida" style={{ marginLeft: '4px', fontSize: '0.75rem' }}>🎯</span>
                                          )}
                                        </span>
                                        <span className="bar-valor">
                                          {mostrarValores ? `R$ ${formatarMoeda(subcategoria.total)}` : 'R$ ••••••'}
                                          {subcategoria.meta && mostrarValores && (
                                            <span style={{ fontSize: '0.75rem', color: '#666', marginLeft: '4px' }}>
                                              / R$ {formatarMoeda(Number(subcategoria.meta))}
                                            </span>
                                          )}
                                          <span className="percentage-pill small" style={{ backgroundColor: isSubOverBudget ? '#fef2f2' : `${categoria.cor}22`, color: isSubOverBudget ? '#ef4444' : categoria.cor }}>
                                            {((subcategoria.meta ? (subcategoria.total / subcategoria.meta) * 100 : (subcategoria.total / categoria.total) * 100)).toFixed(1)}%
                                          </span>
                                        </span>
                                      </div>
                                      <div className="bar-container subcategory-container">
                                        <div 
                                          className="bar-fill subcategory-fill" 
                                          style={{ 
                                            width: `${subPercentual}%`,
                                            background: isSubOverBudget ? '#ef4444' : `${categoria.cor}cc`
                                          }}
                                        >
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="no-data">Nenhum dado disponível para os filtros selecionados</p>
                    )}
                  </div>
                </div>
              </>
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
                <option value="transferencia">Transferências</option>
                <option value="neutro">Neutros</option>
              </select>

              <select 
                value={filterConta} 
                onChange={(e) => setFilterConta(e.target.value)}
                className="filter-select"
              >
                <option value="TODAS">Todas as contas</option>
                {contas.map(conta => (
                  <option key={conta.id} value={conta.id}>{conta.nome}</option>
                ))}
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
                className={`btn-filter-atraso ${filterAtraso ? 'active' : ''}`}
                onClick={() => setFilterAtraso(!filterAtraso)}
                title="Filtrar lançamentos em atraso"
              >
                ⚠️ {filterAtraso ? 'Exibindo em atraso' : 'Mostrar em atraso'}
              </button>

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

            if (filterConta !== 'TODAS') {
              filtrados = filtrados.filter(l => l.conta_id == filterConta || l.conta_destino_id == filterConta);
            }

            if (filterAtraso) {
              const hoje = new Date();
              hoje.setHours(0, 0, 0, 0);
              filtrados = filtrados.filter(l => {
                if (l.tipo !== 'saida' || l.pago) return false;
                const dataLancamento = new Date(l.data);
                return dataLancamento < hoje;
              });
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
                                {lancamento.tipo === 'entrada' ? '↑ Entrada' : 
                                 lancamento.tipo === 'saida' ? '↓ Saída' : 
                                 lancamento.tipo === 'transferencia' ? '⇄ Transfer' : '⊝ Neutro'}
                              </span>
                            </div>
                            <div className="item-descricao">
                              <div className="descricao-text">
                                {lancamento.descricao}
                                {lancamento.tipo === 'transferencia' && (
                                  <span className="transfer-info-small">
                                    ({lancamento.conta_nome} → {contas.find(c => c.id === lancamento.conta_destino_id)?.nome || 'Conta Destino'})
                                  </span>
                                )}
                              </div>
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
                            <div className="item-pago">
                              {lancamento.tipo === 'saida' && lancamento.conta_tipo !== 'Cartão de Crédito' && (
                                <button 
                                  className={`btn-toggle-pago-item ${lancamento.pago ? 'pago' : 'pendente'}`}
                                  onClick={() => handleTogglePago(lancamento)}
                                  title={lancamento.pago ? 'Marcar como não pago' : 'Marcar como pago'}
                                >
                                  <span className={`badge-pago ${lancamento.pago ? 'pago' : 'pendente'}`}>
                                    {lancamento.pago ? '✓ Pago' : '○ Não pago'}
                                  </span>
                                </button>
                              )}
                              {lancamento.conta_tipo === 'Cartão de Crédito' && (
                                <span className="badge-pago card-cc-badge">
                                  💳 Cartão
                                </span>
                              )}
                            </div>
                            <div className="item-actions">
                              <button className="btn-action-edit" onClick={() => handleEdit(lancamento)} title="Editar">✏️</button>
                              <button className="btn-action-delete" onClick={() => handleDelete(lancamento.id)} title="Excluir">🗑️</button>
                            </div>
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
          <div className="modal-content modal-lancamento premium-card">
            <h3>{editingLancamento ? 'Editar Lançamento' : `Nov${formData.tipo === 'entrada' ? 'a Receita' : formData.tipo === 'saida' ? 'a Despesa' : formData.tipo === 'transferencia' ? 'a Transferência' : 'o Lançamento'}`}</h3>
            <form onSubmit={handleSubmit}>
              
              <div className="form-group">
                <label>Direção do lançamento *</label>
                <div className="btn-group">
                  <button
                    type="button"
                    className={formData.tipo === 'entrada' ? 'active' : ''}
                    onClick={() => {
                      setFormData({...formData, tipo: 'entrada', categoria_id: '', subcategoria_id: '', conta_destino_id: '', pago: false});
                      setQuickAddType(null);
                    }}
                  >
                    Entrada
                  </button>
                  <button
                    type="button"
                    className={formData.tipo === 'saida' ? 'active' : ''}
                    onClick={() => {
                      setFormData({...formData, tipo: 'saida', categoria_id: '', subcategoria_id: '', conta_destino_id: ''});
                      setQuickAddType(null);
                    }}
                  >
                    Saída
                  </button>
                  <button
                    type="button"
                    className={formData.tipo === 'transferencia' ? 'active' : ''}
                    onClick={() => {
                      setFormData({...formData, tipo: 'transferencia', categoria_id: '', subcategoria_id: '', pago: false});
                      setQuickAddType(null);
                    }}
                  >
                    Transfer
                  </button>
                  <button
                    type="button"
                    className={formData.tipo === 'neutro' ? 'active' : ''}
                    onClick={() => {
                      setFormData({...formData, tipo: 'neutro', categoria_id: '', subcategoria_id: '', conta_destino_id: '', pago: false});
                      setQuickAddType(null);
                    }}
                  >
                    Neutro
                  </button>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) => setFormData({...formData, valor: e.target.value})}
                    placeholder="0,00"
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

              {formData.tipo === 'saida' && (
                <div className="form-group">
                  <label>Status de Pagamento</label>
                  <div className="btn-group">
                    <button
                      type="button"
                      className={formData.pago ? 'active' : ''}
                      onClick={() => setFormData({...formData, pago: true})}
                    >
                      Pago
                    </button>
                    <button
                      type="button"
                      className={!formData.pago ? 'active' : ''}
                      onClick={() => setFormData({...formData, pago: false})}
                    >
                      Não pago
                    </button>
                  </div>
                </div>
              )}

              {formData.tipo === 'saida' && (
                <div className="form-group">
                  <label>Forma de Pagamento</label>
                  <div className="btn-group">
                    <button
                      type="button"
                      className={!formData.parcelado ? 'active' : ''}
                      onClick={() => setFormData({...formData, parcelado: false, num_parcelas: 1})}
                    >
                      À Vista
                    </button>
                    <button
                      type="button"
                      className={formData.parcelado ? 'active' : ''}
                      onClick={() => setFormData({...formData, parcelado: true})}
                    >
                      Parcelado
                    </button>
                  </div>
                </div>
              )}

              {formData.tipo === 'saida' && formData.parcelado && (
                <div className="form-group">
                  <label>Número de Parcelas *</label>
                  <input
                    type="number"
                    min="2"
                    max="99"
                    value={formData.num_parcelas}
                    onChange={(e) => setFormData({...formData, num_parcelas: parseInt(e.target.value)})}
                    required
                  />
                  <small className="help-text" style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                    O valor informado (R$ {formData.valor || '0,00'}) será o valor de CADA parcela.
                  </small>
                </div>
              )}

              <div className="form-group">
                <label>Descrição *</label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  placeholder="Ex: Aluguel, Salário..."
                  required
                />
              </div>

              <div className="form-group">
                <label>{formData.tipo === 'transferencia' ? 'Conta de Origem *' : 'Conta *'}</label>
                <select
                  value={formData.conta_id}
                  onChange={(e) => setFormData({...formData, conta_id: e.target.value})}
                  required
                >
                  <option value="">Selecione uma conta</option>
                  {contas.map(conta => (
                    <option key={conta.id} value={conta.id}>{conta.nome} (R$ {formatarMoeda(Number(conta.saldo_inicial))})</option>
                  ))}
                </select>
              </div>

              {formData.tipo === 'transferencia' && (
                <div className="form-group">
                  <label>Conta de Destino *</label>
                  <select
                    value={formData.conta_destino_id}
                    onChange={(e) => setFormData({...formData, conta_destino_id: e.target.value})}
                    required
                  >
                    <option value="">Selecione a conta de destino</option>
                    {contas.filter(c => c.id.toString() !== formData.conta_id.toString()).map(conta => (
                      <option key={conta.id} value={conta.id}>{conta.nome} (R$ {formatarMoeda(Number(conta.saldo_inicial))})</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.tipo !== 'transferencia' && (
                <>
                  <div className="form-group">
                    <label>Classificação</label>
                    <div className="categoria-buttons">
                      {categorias
                        .filter(cat => cat.tipo === formData.tipo)
                        .map(categoria => (
                          <button
                            key={categoria.id}
                            type="button"
                            className={String(formData.categoria_id) === String(categoria.id) ? 'active' : ''}
                            onClick={() => {
                              setFormData({...formData, categoria_id: categoria.id.toString(), subcategoria_id: ''});
                              loadSubcategoriasPorCategoria(categoria.id);
                            }}
                          >
                            {categoria.nome}
                          </button>
                        ))}
                    </div>
                  </div>

                  {formData.categoria_id && subcategorias.length > 0 && (
                    <div className="form-group">
                      <label>Subcategoria</label>
                      <select
                        value={formData.subcategoria_id}
                        onChange={(e) => setFormData({...formData, subcategoria_id: e.target.value})}
                      >
                        <option value="">Nenhuma</option>
                        {subcategorias.map(sub => (
                          <option key={sub.id} value={sub.id}>{sub.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => { setShowModal(false); setEditingLancamento(null); setQuickAddType(null); }}>Cancelar</button>
                <button type="submit" className="btn-primary">
                  {editingLancamento ? 'Salvar Alterações' : 'Confirmar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showModalProjetivas && (
        <div className="modal">
          <div className="modal-content modal-projetivas premium-card" style={{ maxWidth: '800px', width: '90%' }}>
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div className="header-info">
                <h3 style={{ margin: 0 }}>Gerenciar Entradas Projetivas</h3>
                <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>Apenas o dia será considerado.</p>
              </div>
              <div className="total-badge-projetivas" style={{ background: '#f5f3ff', padding: '10px 20px', borderRadius: '12px', textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>Total Projetado:</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#5b21b6' }}>R$ {totalProjetivas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
            
            {entradasProjetivas.length > 0 && (
              <div className="projetivas-existentes" style={{ marginBottom: '20px', maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                    <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left' }}>
                      <th style={{ padding: '10px' }}>Dia</th>
                      <th style={{ padding: '10px' }}>Descrição</th>
                      <th style={{ padding: '10px' }}>Valor</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entradasProjetivas.map(proj => (
                      <tr key={proj.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px' }}>Dia {parseInt(proj.data.split('-')[2].substring(0, 2))}</td>
                        <td style={{ padding: '10px' }}>{proj.descricao}</td>
                        <td style={{ padding: '10px', color: '#10b981', fontWeight: 'bold' }}>R$ {parseFloat(proj.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <button 
                            type="button" 
                            onClick={() => handleDeleteProjetivaDb(proj.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem' }}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="projetivas-novas" style={{ background: '#f9fafb', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0 }}>Adicionar Novas Projeções</h4>
                <button type="button" className="btn-secondary" onClick={handleAddProjetivaRow} style={{ padding: '5px 12px', fontSize: '0.8rem', fontWeight: 700 }}>
                  + Linha
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {projetivasList.map((item, index) => (
                  <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input type="date" value={item.data} onChange={(e) => handleProjetivaChange(index, 'data', e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
                    <input type="text" placeholder="Descrição" value={item.descricao} onChange={(e) => handleProjetivaChange(index, 'descricao', e.target.value)} style={{ flex: 2, padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
                    <input type="number" step="0.01" placeholder="Valor" value={item.valor} onChange={(e) => handleProjetivaChange(index, 'valor', e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
                    {projetivasList.length > 1 && (
                      <button type="button" onClick={() => handleRemoveProjetivaRow(index)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer' }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="btn-cancel" onClick={() => setShowModalProjetivas(false)}>Fechar</button>
              <button type="button" className="btn-primary" onClick={handleSaveProjetivas} style={{ backgroundColor: '#8b5cf6' }}>
                Salvar Projeções
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
