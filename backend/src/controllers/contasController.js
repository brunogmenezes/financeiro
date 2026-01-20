const pool = require('../config/database');

// Listar todas as contas do usuário
exports.getAll = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM contas WHERE usuario_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar contas' });
  }
};

// Buscar uma conta específica
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM contas WHERE id = $1 AND usuario_id = $2',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar conta' });
  }
};

// Criar nova conta
exports.create = async (req, res) => {
  try {
    const { nome, descricao, saldo_inicial } = req.body;

    const result = await pool.query(
      'INSERT INTO contas (nome, descricao, saldo_inicial, usuario_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [nome, descricao || null, saldo_inicial || 0, req.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
};

// Atualizar conta
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, saldo_inicial } = req.body;

    const result = await pool.query(
      'UPDATE contas SET nome = $1, descricao = $2, saldo_inicial = $3 WHERE id = $4 AND usuario_id = $5 RETURNING *',
      [nome, descricao, saldo_inicial, id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar conta' });
  }
};

// Deletar conta
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM contas WHERE id = $1 AND usuario_id = $2 RETURNING *',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    res.json({ message: 'Conta deletada com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao deletar conta' });
  }
};
