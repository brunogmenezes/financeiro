const pool = require('../config/database');
const { registrarAuditoria } = require('./auditoriaController');

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
    const { nome, descricao, saldo_inicial, tipo, limite_total } = req.body;

    // Verificar se o usuário é PRO ou ADMIN
    const userResult = await pool.query('SELECT is_pro, is_admin FROM usuarios WHERE id = $1', [req.userId]);
    const { is_pro, is_admin } = userResult.rows[0];

    if (!is_pro && !is_admin) {
      const contasCount = await pool.query('SELECT COUNT(*) FROM contas WHERE usuario_id = $1', [req.userId]);
      if (parseInt(contasCount.rows[0].count) >= 1) {
        return res.status(403).json({ error: 'Usuários não PRO podem criar apenas 1 conta. Adquira o plano PRO para criar contas ilimitadas!' });
      }
    }

    const result = await pool.query(
      'INSERT INTO contas (nome, descricao, saldo_inicial, tipo, limite_total, usuario_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [nome, descricao || null, saldo_inicial || 0, tipo || 'Conta Corrente', limite_total || 0, req.userId]
    );

    // Buscar nome do usuário
    const user = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [req.userId]);
    await registrarAuditoria(
      req.userId,
      user.rows[0]?.nome || 'Usuário',
      'CRIAR',
      'contas',
      result.rows[0].id,
      `Conta "${nome}" criada`
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
    const { nome, descricao, tipo, limite_total } = req.body;

    // Não permitir alteração de saldo_inicial
    const result = await pool.query(
      'UPDATE contas SET nome = $1, descricao = $2, tipo = $3, limite_total = $4 WHERE id = $5 AND usuario_id = $6 RETURNING *',
      [nome, descricao, tipo || 'Conta Corrente', limite_total || 0, id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    // Buscar nome do usuário
    const user = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [req.userId]);
    await registrarAuditoria(
      req.userId,
      user.rows[0].nome,
      'EDITAR',
      'contas',
      result.rows[0].id,
      `Conta editada: ${nome}`
    );

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

    // Verificar se existem lançamentos associados a esta conta
    const lancamentos = await pool.query(
      'SELECT COUNT(*) FROM lancamentos WHERE conta_id = $1',
      [id]
    );

    if (parseInt(lancamentos.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir esta conta pois existem lançamentos associados a ela. Exclua os lançamentos primeiro.' 
      });
    }

    const result = await pool.query(
      'DELETE FROM contas WHERE id = $1 AND usuario_id = $2 RETURNING *',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    // Buscar nome do usuário
    const user = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [req.userId]);
    await registrarAuditoria(
      req.userId,
      user.rows[0]?.nome || 'Usuário',
      'EXCLUIR',
      'contas',
      id,
      `Conta "${result.rows[0].nome}" excluída`
    );

    res.json({ message: 'Conta deletada com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao deletar conta' });
  }
};
