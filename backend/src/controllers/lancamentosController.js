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
    const { descricao, valor, tipo, data, conta_id, parcelado, num_parcelas, pago } = req.body;
    const pagoStatus = pago !== undefined ? pago : true;

    // Se for parcelado, criar múltiplos lançamentos
    if (parcelado && num_parcelas > 1) {
      const lancamentosCriados = [];
      const dataInicial = new Date(data);
      
      for (let i = 0; i < num_parcelas; i++) {
        const dataLancamento = new Date(dataInicial);
        dataLancamento.setMonth(dataLancamento.getMonth() + i);
        
        const descricaoParcelada = `${descricao} (${i + 1}/${num_parcelas})`;
        
        const result = await pool.query(
          'INSERT INTO lancamentos (descricao, valor, tipo, data, conta_id, usuario_id, pago) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
          [descricaoParcelada, valor, tipo, dataLancamento.toISOString().split('T')[0], conta_id, req.userId, pagoStatus]
        );
        
        // Atualizar saldo da conta (exceto se for neutro ou se for saida não paga)
        if (tipo === 'entrada') {
          await pool.query(
            'UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2',
            [valor, conta_id]
          );
        } else if (tipo === 'saida' && pagoStatus) {
          await pool.query(
            'UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2',
            [valor, conta_id]
          );
        }
        
        lancamentosCriados.push(result.rows[0]);
      }
      
      const user = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [req.userId]);
      await registrarAuditoria(
        req.userId,
        user.rows[0]?.nome || 'Usuário',
        'CRIAR',
        'lancamentos',
        null,
        `Lançamento parcelado "${descricao}" criado (${num_parcelas}x de R$ ${valor})`
      );
      
      return res.status(201).json({ message: `${num_parcelas} lançamentos criados com sucesso`, lancamentos: lancamentosCriados });
    }

    // Lançamento único (não parcelado)
    const result = await pool.query(
      'INSERT INTO lancamentos (descricao, valor, tipo, data, conta_id, usuario_id, pago) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [descricao, valor, tipo, data, conta_id, req.userId, pagoStatus]
    );

    // Atualizar saldo da conta (exceto se for neutro ou se for saida não paga)
    if (tipo === 'entrada') {
      await pool.query(
        'UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2',
        [valor, conta_id]
      );
    } else if (tipo === 'saida' && pagoStatus) {
      await pool.query(
        'UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2',
        [valor, conta_id]
      );
    }
    // Se tipo === 'neutro' ou saida não paga, não altera o saldo

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
    const { descricao, valor, tipo, data, conta_id, pago } = req.body;
    const pagoStatus = pago !== undefined ? pago : true;

    // Buscar lançamento antigo
    const lancamentoAntigo = await pool.query(
      'SELECT * FROM lancamentos WHERE id = $1 AND usuario_id = $2',
      [id, req.userId]
    );

    if (lancamentoAntigo.rows.length === 0) {
      return res.status(404).json({ error: 'Lançamento não encontrado' });
    }

    const antigo = lancamentoAntigo.rows[0];

    // Reverter o valor do lançamento antigo na conta antiga (exceto se for neutro ou saida não paga)
    if (antigo.tipo === 'entrada') {
      await pool.query(
        'UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2',
        [antigo.valor, antigo.conta_id]
      );
    } else if (antigo.tipo === 'saida' && antigo.pago) {
      await pool.query(
        'UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2',
        [antigo.valor, antigo.conta_id]
      );
    }
    // Se antigo.tipo === 'neutro' ou saida não paga, não reverte nada

    // Atualizar lançamento
    const result = await pool.query(
      'UPDATE lancamentos SET descricao = $1, valor = $2, tipo = $3, data = $4, conta_id = $5, pago = $6 WHERE id = $7 AND usuario_id = $8 RETURNING *',
      [descricao, valor, tipo, data, conta_id, pagoStatus, id, req.userId]
    );

    // Aplicar o novo valor na nova conta (exceto se for neutro ou saida não paga)
    if (tipo === 'entrada') {
      await pool.query(
        'UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2',
        [valor, conta_id]
      );
    } else if (tipo === 'saida' && pagoStatus) {
      await pool.query(
        'UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2',
        [valor, conta_id]
      );
    }
    // Se tipo === 'neutro', não aplica alteração

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

    // Reverter o valor do lançamento na conta (exceto se for neutro ou saida não paga)
    if (lancamento.tipo === 'entrada') {
      await pool.query(
        'UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2',
        [lancamento.valor, lancamento.conta_id]
      );
    } else if (lancamento.tipo === 'saida' && lancamento.pago) {
      await pool.query(
        'UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2',
        [lancamento.valor, lancamento.conta_id]
      );
    }
    // Se lancamento.tipo === 'neutro', não reverte nada

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

// Alternar status de pago
exports.togglePago = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar lançamento atual
    const lancamentoResult = await pool.query(
      'SELECT * FROM lancamentos WHERE id = $1 AND usuario_id = $2',
      [id, req.userId]
    );

    if (lancamentoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lançamento não encontrado' });
    }

    const lancamento = lancamentoResult.rows[0];

    // Só permitir alternar pago para lançamentos do tipo saida
    if (lancamento.tipo !== 'saida') {
      return res.status(400).json({ error: 'Apenas lançamentos de saída podem ter status de pagamento' });
    }

    const novoPago = !lancamento.pago;

    // Se está marcando como pago, subtrai da conta
    // Se está desmarcando como pago, devolve para a conta
    if (novoPago) {
      await pool.query(
        'UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2',
        [lancamento.valor, lancamento.conta_id]
      );
    } else {
      await pool.query(
        'UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2',
        [lancamento.valor, lancamento.conta_id]
      );
    }

    // Atualizar status do lançamento
    const result = await pool.query(
      'UPDATE lancamentos SET pago = $1 WHERE id = $2 AND usuario_id = $3 RETURNING *',
      [novoPago, id, req.userId]
    );

    const user = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [req.userId]);
    await registrarAuditoria(
      req.userId,
      user.rows[0]?.nome || 'Usuário',
      'EDITAR',
      'lancamentos',
      id,
      `Status de pagamento alterado para ${novoPago ? 'PAGO' : 'NÃO PAGO'} - "${lancamento.descricao}"`
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao alternar status de pagamento' });
  }
};
