const pool = require('../config/database');

// Função auxiliar para registrar ação
const registrarLog = async (usuarioId, usuarioNome, acao, tabela, registroId, descricao) => {
  try {
    await pool.query(
      'INSERT INTO logs (usuario_id, usuario_nome, acao, tabela, registro_id, descricao) VALUES ($1, $2, $3, $4, $5, $6)',
      [usuarioId, usuarioNome, acao, tabela, registroId, descricao]
    );
  } catch (error) {
    console.error('Erro ao registrar log:', error);
  }
};

// Listar todos os logs
exports.getAll = async (req, res) => {
  try {
    const usuarioId = req.userId;

    // Verificar se o usuário é administrador
    const userResult = await pool.query('SELECT is_admin FROM usuarios WHERE id = $1', [usuarioId]);
    const isAdmin = userResult.rows[0]?.is_admin || false;

    let query;
    let params = [];

    if (isAdmin) {
      // Admin vê tudo
      query = 'SELECT * FROM logs ORDER BY created_at DESC LIMIT 1000';
    } else {
      // Usuário comum vê apenas o seu
      query = 'SELECT * FROM logs WHERE usuario_id = $1 ORDER BY created_at DESC LIMIT 500';
      params.push(usuarioId);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar logs' });
  }
};

// Buscar logs por usuário
exports.getByUsuario = async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const result = await pool.query(
      'SELECT * FROM logs WHERE usuario_id = $1 ORDER BY created_at DESC',
      [usuarioId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar logs do usuário' });
  }
};

// Buscar logs de envios (Email e WhatsApp) com paginação e filtros
exports.getEnvios = async (req, res) => {
  try {
    const { page = 1, limit = 20, tipo, status, search } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const limitInt = parseInt(limit, 10);

    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    if (tipo && tipo !== 'todos') {
      whereClauses.push(`tipo = $${paramIndex++}`);
      params.push(tipo);
    }

    if (status && status !== 'todos') {
      whereClauses.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (search && search.trim() !== '') {
      whereClauses.push(`(destinatario ILIKE $${paramIndex} OR assunto ILIKE $${paramIndex} OR mensagem ILIKE $${paramIndex})`);
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Contagem total
    const countQuery = `SELECT COUNT(*) FROM logs_envios ${whereSql}`;
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    // Registros paginados
    const selectParams = [...params, limitInt, offset];
    const selectQuery = `
      SELECT * FROM logs_envios 
      ${whereSql} 
      ORDER BY created_at DESC 
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    const result = await pool.query(selectQuery, selectParams);

    res.json({
      ok: true,
      data: result.rows,
      pagination: {
        total: totalCount,
        page: parseInt(page, 10),
        limit: limitInt,
        pages: Math.ceil(totalCount / limitInt)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar logs de envios:', error);
    res.status(500).json({ error: 'Erro ao buscar logs de envios' });
  }
};

module.exports.registrarLog = registrarLog;
