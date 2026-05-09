import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuditoria } from '../services/api';
import './Auditoria.css';

function Auditoria() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
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

  // Filtrar por ação
  let filteredLogs = filter === 'TODOS' 
    ? logs 
    : logs.filter(log => log.acao === filter);

  // Filtrar por busca
  if (searchTerm) {
    filteredLogs = filteredLogs.filter(log => 
      log.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.tabela.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.acao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.usuario_nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Paginação
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  // Reset página quando mudar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm, itemsPerPage]);

  return (
    <div className="page-container">

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

        {/* Barra de busca e controles */}
        <div className="auditoria-controls">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Buscar por descrição, tabela, ação ou usuário..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="items-per-page">
            <label>Mostrar:</label>
            <select 
              value={itemsPerPage} 
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>registros</span>
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
              {currentLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{textAlign: 'center'}}>
                    Nenhum registro de auditoria encontrado
                  </td>
                </tr>
              ) : (
                currentLogs.map(log => (
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

        {/* Paginação */}
        {filteredLogs.length > 0 && (
          <div className="pagination">
            <div className="pagination-info">
              Mostrando {startIndex + 1} a {Math.min(endIndex, filteredLogs.length)} de {filteredLogs.length} registros
            </div>
            <div className="pagination-buttons">
              <button 
                onClick={() => setCurrentPage(1)} 
                disabled={currentPage === 1}
                title="Primeira página"
              >
                ⏮️
              </button>
              <button 
                onClick={() => setCurrentPage(currentPage - 1)} 
                disabled={currentPage === 1}
                title="Página anterior"
              >
                ◀️
              </button>
              <span className="page-info">
                Página {currentPage} de {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(currentPage + 1)} 
                disabled={currentPage === totalPages}
                title="Próxima página"
              >
                ▶️
              </button>
              <button 
                onClick={() => setCurrentPage(totalPages)} 
                disabled={currentPage === totalPages}
                title="Última página"
              >
                ⏭️
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Auditoria;
