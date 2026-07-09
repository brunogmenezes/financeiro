import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLogsEnvios } from '../services/api';
import './LogsEnvios.css';

function LogsEnvios() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, pages: 1 });
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null); // For detail view modal

  const navigate = useNavigate();

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line
  }, [currentPage, itemsPerPage, tipoFilter, statusFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await getLogsEnvios({
        page: currentPage,
        limit: itemsPerPage,
        tipo: tipoFilter,
        status: statusFilter,
        search: searchTerm
      });
      if (response.data?.ok) {
        setLogs(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Erro ao carregar logs de envios:', error);
      if (error.response?.status === 401) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadLogs();
  };

  const getTipoStyle = (tipo) => {
    return tipo === 'email' ? 'tipo-email' : 'tipo-whatsapp';
  };

  const getTipoIcon = (tipo) => {
    return tipo === 'email' ? '✉️ E-mail' : '💬 WhatsApp';
  };

  const getStatusStyle = (status) => {
    return status === 'sucesso' ? 'status-sucesso' : 'status-erro';
  };

  const formatMessageText = (text) => {
    if (!text) return '';
    // Strip HTML tags for preview snippet
    const clean = text.replace(/<[^>]*>/g, '');
    if (clean.length > 80) {
      return clean.substring(0, 80) + '...';
    }
    return clean;
  };

  // Reset page to 1 when filters change
  const handleFilterChange = (filterType, val) => {
    setCurrentPage(1);
    if (filterType === 'tipo') setTipoFilter(val);
    if (filterType === 'status') setStatusFilter(val);
  };

  const startIndex = (pagination.page - 1) * pagination.limit;
  const endIndex = Math.min(startIndex + pagination.limit, pagination.total);

  return (
    <div className="page-container">
      <div className="content">
        <div className="header">
          <h2>📨 Logs de Envios (Notificações)</h2>
          
          <div className="filter-buttons">
            <button 
              className={tipoFilter === 'todos' ? 'active' : ''} 
              onClick={() => handleFilterChange('tipo', 'todos')}
            >
              Todos
            </button>
            <button 
              className={tipoFilter === 'email' ? 'active tipo-email-btn' : ''} 
              onClick={() => handleFilterChange('tipo', 'email')}
            >
              ✉️ E-mails
            </button>
            <button 
              className={tipoFilter === 'whatsapp' ? 'active tipo-whatsapp-btn' : ''} 
              onClick={() => handleFilterChange('tipo', 'whatsapp')}
            >
              💬 WhatsApp
            </button>
          </div>
        </div>

        {/* Barra de busca e filtros */}
        <div className="logs-envios-controls">
          <form onSubmit={handleSearchSubmit} className="search-form">
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Buscar destinatário, assunto ou mensagem..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="btn-search">Buscar</button>
          </form>

          <div className="filters-right">
            <div className="filter-group">
              <label>Status:</label>
              <select 
                value={statusFilter} 
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="sucesso">Sucesso ✅</option>
                <option value="erro">Erro ❌</option>
              </select>
            </div>

            <div className="items-per-page">
              <label>Mostrar:</label>
              <select 
                value={itemsPerPage} 
                onChange={(e) => {
                  setCurrentPage(1);
                  setItemsPerPage(Number(e.target.value));
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Carregando logs de envios...</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Canal</th>
                  <th>Destinatário</th>
                  <th>Assunto / Tópico</th>
                  <th>Mensagem</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>
                      Nenhum registro de envio encontrado.
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id}>
                      <td className="log-date">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td>
                        <span className={`badge-tipo ${getTipoStyle(log.tipo)}`}>
                          {getTipoIcon(log.tipo)}
                        </span>
                      </td>
                      <td className="log-destinatario">
                        {log.destinatario}
                      </td>
                      <td className="log-assunto">
                        {log.assunto || <span className="null-indicator">-</span>}
                      </td>
                      <td className="log-message-preview">
                        {formatMessageText(log.mensagem)}
                      </td>
                      <td>
                        <span className={`badge-status ${getStatusStyle(log.status)}`}>
                          {log.status === 'sucesso' ? '✅ Sucesso' : '❌ Falha'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn-details" 
                          onClick={() => setSelectedLog(log)}
                          title="Visualizar Mensagem Completa"
                        >
                          👁️ Detalhes
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginação */}
        {!loading && pagination.total > 0 && (
          <div className="pagination">
            <div className="pagination-info">
              Mostrando {startIndex + 1} a {endIndex} de {pagination.total} registros
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
                Página {currentPage} de {pagination.pages}
              </span>
              <button 
                onClick={() => setCurrentPage(currentPage + 1)} 
                disabled={currentPage === pagination.pages}
                title="Próxima página"
              >
                ▶️
              </button>
              <button 
                onClick={() => setCurrentPage(pagination.pages)} 
                disabled={currentPage === pagination.pages}
                title="Última página"
              >
                ⏭️
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalhes do Log */}
      {selectedLog && (
        <div className="modal">
          <div className="modal-content premium-card log-detail-modal">
            <div className="modal-header">
              <h3>Detalhes do Envio</h3>
              <button className="btn-close" onClick={() => setSelectedLog(null)}>✕</button>
            </div>
            <div className="log-detail-body">
              <div className="detail-row">
                <strong>Destinatário:</strong>
                <span>{selectedLog.destinatario}</span>
              </div>
              <div className="detail-row">
                <strong>Canal:</strong>
                <span className={`badge-tipo ${getTipoStyle(selectedLog.tipo)}`}>
                  {getTipoIcon(selectedLog.tipo)}
                </span>
              </div>
              <div className="detail-row">
                <strong>Data de Envio:</strong>
                <span>{new Date(selectedLog.created_at).toLocaleString('pt-BR')}</span>
              </div>
              {selectedLog.assunto && (
                <div className="detail-row">
                  <strong>Assunto:</strong>
                  <span>{selectedLog.assunto}</span>
                </div>
              )}
              <div className="detail-row">
                <strong>Status:</strong>
                <span className={`badge-status ${getStatusStyle(selectedLog.status)}`}>
                  {selectedLog.status === 'sucesso' ? '✅ Enviado com Sucesso' : '❌ Falha no Envio'}
                </span>
              </div>
              
              {selectedLog.erro && (
                <div className="error-detail-pane">
                  <strong>Mensagem de Erro:</strong>
                  <pre>{selectedLog.erro}</pre>
                </div>
              )}

              <div className="message-content-pane">
                <strong>Conteúdo da Mensagem:</strong>
                {selectedLog.tipo === 'email' ? (
                  <div 
                    className="email-rendered-preview"
                    dangerouslySetInnerHTML={{ __html: selectedLog.mensagem }}
                  />
                ) : (
                  <pre className="whatsapp-rendered-preview">
                    {selectedLog.mensagem}
                  </pre>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setSelectedLog(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LogsEnvios;
