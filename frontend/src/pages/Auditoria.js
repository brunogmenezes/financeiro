import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuditoria } from '../services/api';
import './Auditoria.css';

function Auditoria() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('TODOS');
  const navigate = useNavigate();

  useEffect(() => {
    loadAuditoria();
    // eslint-disable-next-line
  }, []);

  const loadAuditoria = async () => {
    try {
      const response = await getAuditoria();
      setLogs(response.data);
    } catch (error) {
      console.error('Erro ao carregar auditoria:', error);
      if (error.response?.status === 401) {
        navigate('/');
      }
    }
  };

  const getAcaoStyle = (acao) => {
    const styles = {
      'CRIAR': 'acao-criar',
      'EDITAR': 'acao-editar',
      'EXCLUIR': 'acao-excluir'
    };
    return styles[acao] || '';
  };

  const getAcaoIcon = (acao) => {
    const icons = {
      'CRIAR': '➕',
      'EDITAR': '✏️',
      'EXCLUIR': '🗑️'
    };
    return icons[acao] || '📝';
  };

  const filteredLogs = filter === 'TODOS' 
    ? logs 
    : logs.filter(log => log.acao === filter);

  return (
    <div className="page-container">
      <nav className="navbar">
        <h1>💰 Controle Financeiro</h1>
        <div className="nav-links">
          <button onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button onClick={() => navigate('/contas')}>Contas</button>
          <button onClick={() => navigate('/lancamentos')}>Lançamentos</button>
          <button onClick={() => {
            localStorage.clear();
            navigate('/');
          }}>Sair</button>
        </div>
      </nav>

      <div className="content">
        <div className="header">
          <h2>📋 Auditoria</h2>
          <div className="filter-buttons">
            <button 
              className={filter === 'TODOS' ? 'active' : ''} 
              onClick={() => setFilter('TODOS')}
            >
              Todos
            </button>
            <button 
              className={filter === 'CRIAR' ? 'active acao-criar' : ''} 
              onClick={() => setFilter('CRIAR')}
            >
              Criar
            </button>
            <button 
              className={filter === 'EDITAR' ? 'active acao-editar' : ''} 
              onClick={() => setFilter('EDITAR')}
            >
              Editar
            </button>
            <button 
              className={filter === 'EXCLUIR' ? 'active acao-excluir' : ''} 
              onClick={() => setFilter('EXCLUIR')}
            >
              Excluir
            </button>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Tabela</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{textAlign: 'center'}}>
                    Nenhum registro de auditoria encontrado
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id}>
                    <td>
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td>{log.usuario_nome}</td>
                    <td>
                      <span className={`badge-acao ${getAcaoStyle(log.acao)}`}>
                        {getAcaoIcon(log.acao)} {log.acao}
                      </span>
                    </td>
                    <td className="tabela-nome">{log.tabela}</td>
                    <td>{log.descricao}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Auditoria;
