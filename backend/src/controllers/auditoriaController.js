const pool = require('../config/database');

// Função auxiliar para registrar ação
const registrarAuditoria = async (usuarioId, usuarioNome, acao, tabela, registroId, descricao) => {
  try {
    await pool.query(
      'INSERT INTO auditoria (usuario_id, usuario_nome, acao, tabela, registro_id, descricao) VALUES ($1, $2, $3, $4, $5, $6)',
      [usuarioId, usuarioNome, acao, tabela, registroId, descricao]
    );
  } catch (error) {
    console.error('Erro ao registrar auditoria:', error);
  }
};

// Listar todos os logs de auditoria
exports.getAll = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM auditoria ORDER BY created_at DESC LIMIT 500'
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar logs de auditoria' });
  }
};

// Buscar logs por usuário
exports.getByUsuario = async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const result = await pool.query(
      'SELECT * FROM auditoria WHERE usuario_id = $1 ORDER BY created_at DESC',
      [usuarioId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar logs do usuário' });
  }
};

module.exports.registrarAuditoria = registrarAuditoria;
