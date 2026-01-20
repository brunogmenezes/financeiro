import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../services/api';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function Dashboard() {
  const [dashboardData, setDashboardData] = useState([]);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadDashboard();
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
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
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
        },
        {
          label: 'Saídas',
          data: saidas,
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
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
      <nav className="navbar">
        <h1>💰 Controle Financeiro</h1>
        <div className="nav-links">
          <span>Olá, {user.nome}</span>
          <button onClick={() => navigate('/contas')}>Contas</button>
          <button onClick={() => navigate('/lancamentos')}>Lançamentos</button>
          <button onClick={handleLogout} className="btn-logout">Sair</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <h2>Dashboard</h2>
        
        {dashboardData.length > 0 ? (
          <div className="chart-container">
            <Bar data={processChartData()} options={chartOptions} />
          </div>
        ) : (
          <p>Nenhum dado encontrado. Cadastre lançamentos para visualizar o dashboard.</p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
