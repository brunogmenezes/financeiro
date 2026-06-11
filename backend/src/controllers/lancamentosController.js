const pool = require('../config/database');
const { registrarLog } = require('./logsController');
const geminiService = require('../services/geminiService');

// Listar todos os lançamentos do usuário
exports.getAll = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, c.nome as conta_nome, c.tipo as conta_tipo, c.dia_vencimento as conta_dia_vencimento,
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
      `SELECT l.*, c.nome as conta_nome, c.tipo as conta_tipo, c.dia_vencimento as conta_dia_vencimento,
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

    // Verificar se a conta é Cartão de Crédito para ajustar a data
    const contaInfo = await pool.query('SELECT tipo, dia_vencimento FROM contas WHERE id = $1', [conta_id]);
    const contaObj = contaInfo.rows[0];
    
    let dataFinal = data;
    const isCartao = contaObj?.tipo === 'Cartão de Crédito';

    // Se for saída ou estorno no cartão, a data sempre será o dia de vencimento do cartão naquele mês/ano
    if ((tipo === 'saida' || tipo === 'estorno') && isCartao && contaObj?.dia_vencimento) {
      const d = new Date(data);
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth();
      // Criar a data no dia do vencimento (usando UTC para evitar problemas de timezone)
      const novaData = new Date(Date.UTC(year, month, contaObj.dia_vencimento));
      dataFinal = novaData.toISOString().split('T')[0];
    }

    // Verificar se o usuário é PRO ou ADMIN
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
      const totalValue = parseFloat(valor);
      const installmentValue = Math.floor((totalValue / num_parcelas) * 100) / 100;
      const lastInstallmentValue = (totalValue - (installmentValue * (num_parcelas - 1))).toFixed(2);
      
      for (let i = 0; i < num_parcelas; i++) {
        let dataLancamentoStr;
        
        if (tipo === 'saida' && isCartao && contaObj?.dia_vencimento) {
          // Para cada parcela, mantemos o dia de vencimento mas incrementamos o mês
          const dBase = new Date(data);
          const year = dBase.getUTCFullYear();
          const month = dBase.getUTCMonth() + i;
          const novaData = new Date(Date.UTC(year, month, contaObj.dia_vencimento));
          dataLancamentoStr = novaData.toISOString().split('T')[0];
        } else {
          const d = new Date(data);
          d.setMonth(d.getMonth() + i);
          dataLancamentoStr = d.toISOString().split('T')[0];
        }
        
        const currentInstallmentValue = (i === num_parcelas - 1) ? lastInstallmentValue : installmentValue.toFixed(2);
        const descricaoParcelada = `${descricao} (${i + 1}/${num_parcelas})`;
        
        const result = await pool.query(
          'INSERT INTO lancamentos (descricao, valor, tipo, data, conta_id, categoria_id, subcategoria_id, usuario_id, pago, parcelado, num_parcelas, parcela_atual) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
          [descricaoParcelada, currentInstallmentValue, tipo, dataLancamentoStr, conta_id, categoria_id || null, subcategoria_id || null, req.userId, pagoStatus, true, num_parcelas, i + 1]
        );
        
        // Atualizar saldo da conta
        if (tipo === 'entrada') {
          await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [currentInstallmentValue, conta_id]);
        } else if (tipo === 'saida') {
          if (isCartao) {
            await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [currentInstallmentValue, conta_id]);
          } else if (pagoStatus) {
            await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [currentInstallmentValue, conta_id]);
          }
        }
        
        lancamentosCriados.push(result.rows[0]);
      }
      
      const user = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [req.userId]);
      await registrarLog(req.userId, user.rows[0]?.nome || 'Usuário', 'CRIAR', 'lancamentos', null, `Lançamento parcelado "${descricao}" criado (${num_parcelas}x)`);
      
      return res.status(201).json({ message: `${num_parcelas} lançamentos criados`, lancamentos: lancamentosCriados });
    }

    // Lançamento único
    const result = await pool.query(
      'INSERT INTO lancamentos (descricao, valor, tipo, data, conta_id, conta_destino_id, categoria_id, subcategoria_id, usuario_id, pago, parcelado, num_parcelas, parcela_atual) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *',
      [descricao, valor, tipo, dataFinal, conta_id, req.body.conta_destino_id || null, categoria_id || null, subcategoria_id || null, req.userId, pagoStatus, parcelado || false, num_parcelas || 1, req.body.parcela_atual || 1]
    );

    // Atualizar saldo
    if (tipo === 'entrada') {
      await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [valor, conta_id]);
    } else if (tipo === 'pagamento_fatura') {
      const { conta_destino_id } = req.body;
      await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [valor, conta_id]);
      await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [valor, conta_destino_id]);
    } else if (tipo === 'saida') {
      if (isCartao) {
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [valor, conta_id]);
      } else if (pagoStatus) {
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [valor, conta_id]);
      }
    } else if (tipo === 'transferencia') {
      const { conta_destino_id } = req.body;
      await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [valor, conta_id]);
      await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [valor, conta_destino_id]);
    } else if (tipo === 'estorno') {
      await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [valor, conta_id]);
    }

    const user = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [req.userId]);
    await registrarLog(req.userId, user.rows[0]?.nome || 'Usuário', 'CRIAR', 'lancamentos', result.rows[0].id, `Lançamento "${descricao}" criado`);

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
    const { descricao, valor, tipo, data, conta_id, categoria_id, subcategoria_id, pago, parcelado, num_parcelas } = req.body;

    // Buscar lançamento antigo
    const lancamentoAntigo = await pool.query(
      'SELECT * FROM lancamentos WHERE id = $1 AND usuario_id = $2',
      [id, req.userId]
    );

    if (lancamentoAntigo.rows.length === 0) {
      return res.status(404).json({ error: 'Lançamento não encontrado' });
    }

    const antigo = lancamentoAntigo.rows[0];
    const pagoStatus = pago !== undefined ? pago : antigo.pago;

    // Buscar info da nova conta para possível ajuste de data
    const contaInfo = await pool.query('SELECT tipo, dia_vencimento FROM contas WHERE id = $1', [conta_id]);
    const contaObj = contaInfo.rows[0];
    const isCartaoNovo = contaObj?.tipo === 'Cartão de Crédito';
    
    let dataFinal = data;
    if ((tipo === 'saida' || tipo === 'estorno') && isCartaoNovo && contaObj?.dia_vencimento) {
      const d = new Date(data);
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth();
      const novaData = new Date(Date.UTC(year, month, contaObj.dia_vencimento));
      dataFinal = novaData.toISOString().split('T')[0];
    }

    // Reverter o valor do lançamento antigo
    const contaAntigaResult = await pool.query('SELECT tipo FROM contas WHERE id = $1', [antigo.conta_id]);
    const isCartaoAntigo = contaAntigaResult.rows[0]?.tipo === 'Cartão de Crédito';

    if (antigo.tipo === 'entrada') {
      await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [antigo.valor, antigo.conta_id]);
    } else if (antigo.tipo === 'pagamento_fatura') {
      await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [antigo.valor, antigo.conta_id]);
      if (antigo.conta_destino_id) {
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [antigo.valor, antigo.conta_destino_id]);
      }
    } else if (antigo.tipo === 'saida') {
      if (isCartaoAntigo || antigo.pago) {
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [antigo.valor, antigo.conta_id]);
      }
    } else if (antigo.tipo === 'transferencia') {
      await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [antigo.valor, antigo.conta_id]);
      if (antigo.conta_destino_id) {
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [antigo.valor, antigo.conta_destino_id]);
      }
    } else if (antigo.tipo === 'estorno') {
      await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [antigo.valor, antigo.conta_id]);
    }

    // Calcular novo valor (dividir se for parcelado)
    const totalValue = parseFloat(valor);
    const numParcelasInt = parseInt(num_parcelas) || 1;
    const isConvertingToParcelado = parcelado && numParcelasInt > 1 && !antigo.parcelado;
    
    let currentVal = totalValue;
    let installmentValue = totalValue;
    let lastInstallmentValue = totalValue;

    if (parcelado && numParcelasInt > 1) {
      installmentValue = Math.floor((totalValue / numParcelasInt) * 100) / 100;
      lastInstallmentValue = parseFloat((totalValue - (installmentValue * (numParcelasInt - 1))).toFixed(2));
      currentVal = installmentValue;
    }

    // Atualizar lançamento atual
    const result = await pool.query(
      'UPDATE lancamentos SET descricao = $1, valor = $2, tipo = $3, data = $4, conta_id = $5, conta_destino_id = $6, categoria_id = $7, subcategoria_id = $8, pago = $9, parcelado = $10, num_parcelas = $11, parcela_atual = $12 WHERE id = $13 AND usuario_id = $14 RETURNING *',
      [descricao, currentVal, tipo, dataFinal, conta_id, req.body.conta_destino_id || null, categoria_id || null, subcategoria_id || null, pagoStatus, parcelado || false, numParcelasInt, req.body.parcela_atual || 1, id, req.userId]
    );

    // Aplicar o novo valor ao saldo da conta
    if (tipo === 'entrada') {
      await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [currentVal, conta_id]);
    } else if (tipo === 'pagamento_fatura') {
      const { conta_destino_id } = req.body;
      await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [currentVal, conta_id]);
      if (conta_destino_id) {
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [currentVal, conta_destino_id]);
      }
    } else if (tipo === 'saida') {
      if (isCartaoNovo || pagoStatus) {
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [currentVal, conta_id]);
      }
    } else if (tipo === 'transferencia') {
      const { conta_destino_id } = req.body;
      await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [currentVal, conta_id]);
      if (conta_destino_id) {
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [currentVal, conta_destino_id]);
      }
    } else if (tipo === 'estorno') {
      await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [currentVal, conta_id]);
    }

    // Se estiver convertendo para parcelado, criar as demais parcelas
    if (isConvertingToParcelado) {
      const { is_pro, is_admin } = req.user;
      if (!is_pro && !is_admin) {
        const lancamentosCount = await pool.query('SELECT COUNT(*) FROM lancamentos WHERE usuario_id = $1', [req.userId]);
        if (parseInt(lancamentosCount.rows[0].count) + numParcelasInt - 1 > 10) {
          return res.status(403).json({ error: 'Limite PRO: A conversão excederia o limite de 10 lançamentos.' });
        }
      }

      // Ajustar descrição do primeiro (já atualizado acima)
      await pool.query('UPDATE lancamentos SET descricao = $1 WHERE id = $2', [`${descricao} (1/${numParcelasInt})`, id]);

      for (let i = 1; i < numParcelasInt; i++) {
        let dataParcelaStr;
        if (tipo === 'saida' && isCartaoNovo && contaObj?.dia_vencimento) {
          const dBase = new Date(data);
          const year = dBase.getUTCFullYear();
          const month = dBase.getUTCMonth() + i;
          const novaData = new Date(Date.UTC(year, month, contaObj.dia_vencimento));
          dataParcelaStr = novaData.toISOString().split('T')[0];
        } else {
          const d = new Date(data);
          d.setMonth(d.getMonth() + i);
          dataParcelaStr = d.toISOString().split('T')[0];
        }
        
        const valParcela = (i === numParcelasInt - 1) ? lastInstallmentValue : installmentValue;
        
        await pool.query(
          'INSERT INTO lancamentos (descricao, valor, tipo, data, conta_id, categoria_id, subcategoria_id, usuario_id, pago, parcelado, num_parcelas, parcela_atual) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
          [`${descricao} (${i + 1}/${numParcelasInt})`, valParcela, tipo, dataParcelaStr, conta_id, categoria_id || null, subcategoria_id || null, req.userId, pagoStatus, true, numParcelasInt, i + 1]
        );

        if (tipo === 'entrada') {
          await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [valParcela, conta_id]);
        } else if (tipo === 'saida') {
          if (isCartaoNovo || pagoStatus) {
            await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [valParcela, conta_id]);
          }
        }
      }
    }

    const userRes = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [req.userId]);
    await registrarLog(req.userId, userRes.rows[0]?.nome || 'Usuário', 'EDITAR', 'lancamentos', id, `Lançamento "${descricao}" atualizado`);

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
      await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [lancamento.valor, lancamento.conta_id]);
    } else if (lancamento.tipo === 'pagamento_fatura') {
      // Devolve para a origem
      await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [lancamento.valor, lancamento.conta_id]);
      // Retira do destino (Cartão)
      if (lancamento.conta_destino_id) {
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [lancamento.valor, lancamento.conta_destino_id]);
      }
    } else if (lancamento.tipo === 'saida') {
      if (isCartao) {
        // Reverte saída no cartão (devolve ao saldo)
        await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial + $1 WHERE id = $2', [lancamento.valor, lancamento.conta_id]);
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
    } else if (lancamento.tipo === 'estorno') {
      await pool.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [lancamento.valor, lancamento.conta_id]);
    }

    const user = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [req.userId]);
    await registrarLog(
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
    await registrarLog(
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

// Analisar fatura com IA
exports.analyzeInvoice = async (req, res) => {
  try {
    const { conta_id } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    if (!conta_id) {
      return res.status(400).json({ error: 'ID da conta não informado' });
    }

    // Extrair dados com Gemini
    const extractedTransactions = await geminiService.extractTransactions(file.buffer, file.mimetype);

    if (extractedTransactions.length === 0) {
      return res.json({ message: 'Nenhum lançamento encontrado na fatura.', transactions: [], summary: { total: 0, new: 0, duplicates: 0 } });
    }

    // Buscar lançamentos existentes para esta conta para comparação
    const existingResult = await pool.query(
      'SELECT descricao, valor, data FROM lancamentos WHERE usuario_id = $1 AND conta_id = $2',
      [req.userId, conta_id]
    );
    const existing = existingResult.rows;

    // Lógica de comparação simplificada
    const results = extractedTransactions.map(extracted => {
      const dataExtraida = extracted.data;
      const valorExtraido = parseFloat(extracted.valor);

      const isDuplicate = existing.some(ex => {
        const dataEx = new Date(ex.data).toISOString().split('T')[0];
        const valorEx = parseFloat(ex.valor);
        
        const sameValue = Math.abs(valorEx - valorExtraido) < 0.01;
        const sameDate = dataEx === dataExtraida;
        const similarDesc = ex.descricao.toLowerCase().includes(extracted.descricao.toLowerCase()) || 
                            extracted.descricao.toLowerCase().includes(ex.descricao.toLowerCase());

        return sameValue && (sameDate || similarDesc);
      });

      return {
        ...extracted,
        isDuplicate
      };
    });

    res.json({
      transactions: results,
      summary: {
        total: results.length,
        new: results.filter(r => !r.isDuplicate).length,
        duplicates: results.filter(r => r.isDuplicate).length
      }
    });

  } catch (error) {
    console.error('Erro ao analisar fatura:', error);
    res.status(500).json({ error: error.message || 'Erro ao analisar fatura com IA' });
  }
};

// Confirmar importação em massa
exports.confirmImport = async (req, res) => {
  const client = await pool.connect();
  try {
    const { transactions, conta_id, target_month } = req.body;

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'Nenhum lançamento para importar' });
    }

    // Buscar informações da conta para verificar se é cartão e pegar o vencimento
    const contaRes = await client.query('SELECT tipo, dia_vencimento FROM contas WHERE id = $1', [conta_id]);
    const contaObj = contaRes.rows[0];
    const isCartao = contaObj?.tipo === 'Cartão de Crédito';

    await client.query('BEGIN');

    const created = [];
    for (const t of transactions) {
      let dataFinal = t.data;
      const originalDate = new Date(t.data);
      
      let year = originalDate.getUTCFullYear();
      let month = originalDate.getUTCMonth();
      let day = originalDate.getUTCDate();

      // Se o usuário informou um mês de referência (YYYY-MM), sobrescrevemos ano e mês
      if (target_month) {
        const [targetYear, targetMonthNum] = target_month.split('-').map(Number);
        year = targetYear;
        month = targetMonthNum - 1; // JS months are 0-11
      }

      // Se for cartão, o dia sempre será o dia do vencimento
      if (isCartao && contaObj?.dia_vencimento) {
        day = contaObj.dia_vencimento;
      }

      const novaData = new Date(Date.UTC(year, month, day));
      dataFinal = novaData.toISOString().split('T')[0];

      // Inserir lançamento
      const result = await client.query(
        'INSERT INTO lancamentos (descricao, valor, tipo, data, conta_id, usuario_id, pago) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [t.descricao, t.valor, 'saida', dataFinal, conta_id, req.userId, false]
      );
      
      // Atualizar saldo da conta
      await client.query('UPDATE contas SET saldo_inicial = saldo_inicial - $1 WHERE id = $2', [t.valor, conta_id]);
      
      created.push(result.rows[0]);
    }

    await client.query('COMMIT');

    const userRes = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [req.userId]);
    await registrarLog(req.userId, userRes.rows[0]?.nome || 'Usuário', 'CRIAR', 'lancamentos', null, `${created.length} lançamentos importados via fatura IA`);

    res.status(201).json({ message: `${created.length} lançamentos importados com sucesso`, transactions: created });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao importar faturas:', error);
    res.status(500).json({ error: 'Erro ao importar lançamentos' });
  } finally {
    client.release();
  }
};

// Apagar todos os lançamentos do usuário
exports.deleteAll = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Apagar todos os lançamentos
    await client.query('DELETE FROM lancamentos WHERE usuario_id = $1', [req.userId]);

    // 2. Resetar o saldo de todas as contas do usuário para zero
    await client.query('UPDATE contas SET saldo_inicial = 0 WHERE usuario_id = $1', [req.userId]);

    await client.query('COMMIT');

    const userRes = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [req.userId]);
    await registrarLog(req.userId, userRes.rows[0]?.nome || 'Usuário', 'EXCLUIR', 'lancamentos', null, 'Todos os lançamentos foram apagados pelo usuário');

    res.json({ message: 'Todos os lançamentos foram removidos com sucesso.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao apagar todos os lançamentos:', error);
    res.status(500).json({ error: 'Erro ao apagar todos os lançamentos' });
  } finally {
    client.release();
  }
};
