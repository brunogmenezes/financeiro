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

module.exports.registrarLog = registrarLog;
