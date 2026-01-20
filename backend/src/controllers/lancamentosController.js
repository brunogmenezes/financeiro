const pool = require('../config/database');
const { registrarAuditoria } = require('./auditoriaController');

// Listar todos os lançamentos do usuário
exports.getAll = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, c.nome as conta_nome 
       FROM lancamentos l 
       LEFT JOIN contas c ON l.conta_id = c.id 
       WHERE l.usuario_id = $1 
       ORDER BY l.data DESC, l.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar lançamentos' });
  }
};

// Buscar lançamento por ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT l.*, c.nome as conta_nome 
       FROM lancamentos l 
       LEFT JOIN contas c ON l.conta_id = c.id 
       WHERE l.id = $1 AND l.usuario_id = $2`,
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lançamento não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar lançamento' });
  }
};

// Criar novo lançamento
exports.create = async (req, res) => {
  try {
    const { descricao, valor, tipo, data, conta_id } = req.body;

    const result = await pool.query(
      'INSERT INTO lancamentos (descricao, valor, tipo, data, conta_id, usuario_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [descricao, valor, tipo, data, conta_id, req.userId]
    );

    // Atualizar saldo da conta
    if (tipo === 'entrada') {
      await pool.query(
        'UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2',
        [valor, conta_id]
      );
    } else if (tipo === 'saida') {
      await pool.query(
        'UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2',
        [valor, conta_id]
      );
    }

    const user = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [req.userId]);
    await registrarAuditoria(
      req.userId,
      user.rows[0]?.nome || 'Usuário',
      'CRIAR',
      'lancamentos',
      result.rows[0].id,
      `Lançamento "${descricao}" criado (${tipo.toUpperCase()}: R$ ${valor})`
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar lançamento' });
  }
};

// Atualizar lançamento
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { descricao, valor, tipo, data, conta_id } = req.body;

    // Buscar lançamento antigo
    const lancamentoAntigo = await pool.query(
      'SELECT * FROM lancamentos WHERE id = $1 AND usuario_id = $2',
      [id, req.userId]
    );

    if (lancamentoAntigo.rows.length === 0) {
      return res.status(404).json({ error: 'Lançamento não encontrado' });
    }

    const antigo = lancamentoAntigo.rows[0];

    // Reverter o valor do lançamento antigo na conta antiga
    if (antigo.tipo === 'entrada') {
      await pool.query(
        'UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2',
        [antigo.valor, antigo.conta_id]
      );
    } else if (antigo.tipo === 'saida') {
      await pool.query(
        'UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2',
        [antigo.valor, antigo.conta_id]
      );
    }

    // Atualizar lançamento
    const result = await pool.query(
      'UPDATE lancamentos SET descricao = $1, valor = $2, tipo = $3, data = $4, conta_id = $5 WHERE id = $6 AND usuario_id = $7 RETURNING *',
      [descricao, valor, tipo, data, conta_id, id, req.userId]
    );

    // Aplicar o novo valor na nova conta
    if (tipo === 'entrada') {
      await pool.query(
        'UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2',
        [valor, conta_id]
      );
    } else if (tipo === 'saida') {
      await pool.query(
        'UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2',
        [valor, conta_id]
      );
    }

    const user = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [req.userId]);
    await registrarAuditoria(
      req.userId,
      user.rows[0]?.nome || 'Usuário',
      'EDITAR',
      'lancamentos',
      id,
      `Lançamento "${descricao}" atualizado`
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar lançamento' });
  }
};

// Deletar lançamento
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM lancamentos WHERE id = $1 AND usuario_id = $2 RETURNING *',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lançamento não encontrado' });
    }

    const lancamento = result.rows[0];

    // Reverter o valor do lançamento na conta
    if (lancamento.tipo === 'entrada') {
      await pool.query(
        'UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2',
        [lancamento.valor, lancamento.conta_id]
      );
    } else if (lancamento.tipo === 'saida') {
      await pool.query(
        'UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2',
        [lancamento.valor, lancamento.conta_id]
      );
    }

    const user = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [req.userId]);
    await registrarAuditoria(
      req.userId,
      user.rows[0]?.nome || 'Usuário',
      'EXCLUIR',
      'lancamentos',
      id,
      `Lançamento "${lancamento.descricao}" excluído`
    );

    res.json({ message: 'Lançamento deletado com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao deletar lançamento' });
  }
};

// Dashboard - Resumo mensal
exports.getDashboard = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        TO_CHAR(data, 'YYYY-MM') as mes,
        tipo,
        SUM(valor) as total
       FROM lancamentos 
       WHERE usuario_id = $1 
       GROUP BY TO_CHAR(data, 'YYYY-MM'), tipo
       ORDER BY mes DESC`,
      [req.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
  }
};
