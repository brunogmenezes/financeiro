const pool = require('../config/database');
const { registrarAuditoria } = require('./auditoriaController');

// Listar todos os lançamentos do usuário
exports.getAll = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, c.nome as conta_nome, c.tipo as conta_tipo, 
              cat.nome as categoria_nome, cat.cor as categoria_cor, 
              subcat.nome as subcategoria_nome, subcat.cor as subcategoria_cor, 
              lim.valor_limite as subcategoria_meta
       FROM lancamentos l 
       LEFT JOIN contas c ON l.conta_id = c.id 
       LEFT JOIN categorias cat ON l.categoria_id = cat.id
       LEFT JOIN subcategorias subcat ON l.subcategoria_id = subcat.id
       LEFT JOIN limites_usuarios lim ON subcat.id = lim.subcategoria_id AND lim.usuario_id = l.usuario_id
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
      `SELECT l.*, c.nome as conta_nome, c.tipo as conta_tipo, 
              cat.nome as categoria_nome, cat.cor as categoria_cor, 
              subcat.nome as subcategoria_nome, subcat.cor as subcategoria_cor, 
              lim.valor_limite as subcategoria_meta
       FROM lancamentos l 
       LEFT JOIN contas c ON l.conta_id = c.id 
       LEFT JOIN categorias cat ON l.categoria_id = cat.id
       LEFT JOIN subcategorias subcat ON l.subcategoria_id = subcat.id
       LEFT JOIN limites_usuarios lim ON subcat.id = lim.subcategoria_id AND lim.usuario_id = l.usuario_id
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
    const { descricao, valor, tipo, data, conta_id, categoria_id, subcategoria_id, parcelado, num_parcelas, pago } = req.body;
    const pagoStatus = pago !== undefined ? pago : false;

    // Verificar se o usuário é PRO ou ADMIN (usando dados do middleware)
    const { is_pro, is_admin } = req.user;

    if (!is_pro && !is_admin) {
      const lancamentosCount = await pool.query('SELECT COUNT(*) FROM lancamentos WHERE usuario_id = $1', [req.userId]);
      const totalFuturo = parseInt(lancamentosCount.rows[0].count) + (parcelado ? parseInt(num_parcelas) : 1);
      
      if (totalFuturo > 10) {
        return res.status(403).json({ error: 'Usuários não PRO possuem limite de 10 lançamentos. Adquira o plano PRO para lançamentos ilimitados!' });
      }
    }

    // Se for parcelado, criar múltiplos lançamentos
    if (parcelado && num_parcelas > 1) {
      const lancamentosCriados = [];
      const dataInicial = new Date(data);
      
      for (let i = 0; i < num_parcelas; i++) {
        const dataLancamento = new Date(dataInicial);
        dataLancamento.setMonth(dataLancamento.getMonth() + i);
        
        const descricaoParcelada = `${descricao} (${i + 1}/${num_parcelas})`;
        
        const result = await pool.query(
          'INSERT INTO lancamentos (descricao, valor, tipo, data, conta_id, categoria_id, subcategoria_id, usuario_id, pago) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
          [descricaoParcelada, valor, tipo, dataLancamento.toISOString().split('T')[0], conta_id, categoria_id || null, subcategoria_id || null, req.userId, pagoStatus]
        );
        
        // Atualizar saldo da conta (com a nova lógica de Cartão)
        const contaResult = await pool.query('SELECT tipo FROM contas WHERE id = $1', [conta_id]);
        const isCartao = contaResult.rows[0]?.tipo === 'Cartão de Crédito';

        if (tipo === 'entrada') {
          await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [valor, conta_id]);
        } else if (tipo === 'saida') {
          if (isCartao) {
            await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [valor, conta_id]);
          } else if (pagoStatus) {
            await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [valor, conta_id]);
          }
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
      'INSERT INTO lancamentos (descricao, valor, tipo, data, conta_id, conta_destino_id, categoria_id, subcategoria_id, usuario_id, pago) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [descricao, valor, tipo, data, conta_id, req.body.conta_destino_id || null, categoria_id || null, subcategoria_id || null, req.userId, pagoStatus]
    );

    // Atualizar saldo da conta
    const contaResult = await pool.query('SELECT tipo FROM contas WHERE id = $1', [conta_id]);
    const isCartao = contaResult.rows[0]?.tipo === 'Cartão de Crédito';

    if (tipo === 'entrada') {
      // Entrada em qualquer conta (incluindo cartão) soma ao saldo
      await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [valor, conta_id]);
    } else if (tipo === 'saida') {
      if (isCartao) {
        // Compra no cartão subtrai do saldo (fica negativo) mesmo se não marcado como pago
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [valor, conta_id]);
      } else if (pagoStatus) {
        // Para outras contas, só desconta se estiver pago
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [valor, conta_id]);
      }
    } else if (tipo === 'transferencia') {
      const { conta_destino_id } = req.body;
      if (!conta_destino_id) return res.status(400).json({ error: 'Conta de destino é obrigatória' });
      
      // Origem: sempre subtrai
      await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [valor, conta_id]);
      
      // Destino: sempre soma
      await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [valor, conta_destino_id]);
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
    const { descricao, valor, tipo, data, conta_id, categoria_id, subcategoria_id, pago } = req.body;
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

    // Reverter o valor do lançamento antigo
    const contaAntigaResult = await pool.query('SELECT tipo FROM contas WHERE id = $1', [antigo.conta_id]);
    const isCartaoAntigo = contaAntigaResult.rows[0]?.tipo === 'Cartão de Crédito';

    if (antigo.tipo === 'entrada') {
      if (isCartaoAntigo) {
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [antigo.valor, antigo.conta_id]);
      } else {
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [antigo.valor, antigo.conta_id]);
      }
    } else if (antigo.tipo === 'saida') {
      if (isCartaoAntigo) {
        // Reverte aumento da fatura
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [antigo.valor, antigo.conta_id]);
      } else if (antigo.pago) {
        // Reverte desconto do saldo
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [antigo.valor, antigo.conta_id]);
      }
    } else if (antigo.tipo === 'transferencia') {
      // Devolve para a origem
      if (isCartaoAntigo) {
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [antigo.valor, antigo.conta_id]);
      } else {
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [antigo.valor, antigo.conta_id]);
      }
      // Retira do destino
      if (antigo.conta_destino_id) {
        const contaDestinoAntigaResult = await pool.query('SELECT tipo FROM contas WHERE id = $1', [antigo.conta_destino_id]);
        const isCartaoDestinoAntigo = contaDestinoAntigaResult.rows[0]?.tipo === 'Cartão de Crédito';
        if (isCartaoDestinoAntigo) {
          await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [antigo.valor, antigo.conta_destino_id]);
        } else {
          await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [antigo.valor, antigo.conta_destino_id]);
        }
      }
    }

    // Atualizar lançamento
    const result = await pool.query(
      'UPDATE lancamentos SET descricao = $1, valor = $2, tipo = $3, data = $4, conta_id = $5, conta_destino_id = $6, categoria_id = $7, subcategoria_id = $8, pago = $9 WHERE id = $10 AND usuario_id = $11 RETURNING *',
      [descricao, valor, tipo, data, conta_id, req.body.conta_destino_id || null, categoria_id || null, subcategoria_id || null, pagoStatus, id, req.userId]
    );

    // Aplicar o novo valor
    const contaNovaResult = await pool.query('SELECT tipo FROM contas WHERE id = $1', [conta_id]);
    const isCartaoNovo = contaNovaResult.rows[0]?.tipo === 'Cartão de Crédito';

    if (tipo === 'entrada') {
      if (isCartaoNovo) {
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [valor, conta_id]);
      } else {
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [valor, conta_id]);
      }
    } else if (tipo === 'saida') {
      if (isCartaoNovo) {
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [valor, conta_id]);
      } else if (pagoStatus) {
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [valor, conta_id]);
      }
    } else if (tipo === 'transferencia') {
      const { conta_destino_id } = req.body;
      // Retira da origem
      if (isCartaoNovo) {
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [valor, conta_id]);
      } else {
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [valor, conta_id]);
      }
      // Adiciona no destino
      if (conta_destino_id) {
        const contaDestinoNovaResult = await pool.query('SELECT tipo FROM contas WHERE id = $1', [conta_destino_id]);
        const isCartaoDestinoNovo = contaDestinoNovaResult.rows[0]?.tipo === 'Cartão de Crédito';
        if (isCartaoDestinoNovo) {
          await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [valor, conta_destino_id]);
        } else {
          await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [valor, conta_destino_id]);
        }
      }
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

    if (isNaN(id) || id === 'undefined') {
      return res.status(400).json({ error: 'ID do lançamento inválido' });
    }

    const result = await pool.query(
      'DELETE FROM lancamentos WHERE id = $1 AND usuario_id = $2 RETURNING *',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lançamento não encontrado' });
    }

    const lancamento = result.rows[0];

    // Reverter o valor do lançamento na conta
    const contaResult = await pool.query('SELECT tipo FROM contas WHERE id = $1', [lancamento.conta_id]);
    const isCartao = contaResult.rows[0]?.tipo === 'Cartão de Crédito';

    if (lancamento.tipo === 'entrada') {
      if (isCartao) {
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [lancamento.valor, lancamento.conta_id]);
      } else {
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [lancamento.valor, lancamento.conta_id]);
      }
    } else if (lancamento.tipo === 'saida') {
      if (isCartao) {
        // Reverte aumento da fatura
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [lancamento.valor, lancamento.conta_id]);
      } else if (lancamento.pago) {
        // Reverte desconto do saldo
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [lancamento.valor, lancamento.conta_id]);
      }
    } else if (lancamento.tipo === 'transferencia') {
      // Devolve para a origem
      if (isCartao) {
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [lancamento.valor, lancamento.conta_id]);
      } else {
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [lancamento.valor, lancamento.conta_id]);
      }
      // Retira do destino
      if (lancamento.conta_destino_id) {
        const contaDestinoResult = await pool.query('SELECT tipo FROM contas WHERE id = $1', [lancamento.conta_destino_id]);
        const isCartaoDestino = contaDestinoResult.rows[0]?.tipo === 'Cartão de Crédito';
        if (isCartaoDestino) {
          await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [lancamento.valor, lancamento.conta_destino_id]);
        } else {
          await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [lancamento.valor, lancamento.conta_destino_id]);
        }
      }
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
