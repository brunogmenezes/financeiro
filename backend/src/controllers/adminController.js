const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { registrarAuditoria } = require('./auditoriaController');

// Listar usuários do controle financeiro (não-admins) com filtro de busca
exports.listUsers = async (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT 
        id, 
        nome, 
        email, 
        username,
        is_admin, 
        is_pro,
        pro_expires_at,
        ultimo_login, 
        ultima_atividade,
        (ultima_atividade > NOW() - INTERVAL '5 minutes') as is_online,
        created_at
      FROM usuarios
      WHERE is_admin = false
    `;
    
    const params = [];
    if (search) {
      query += ` AND (email ILIKE $1 OR nome ILIKE $1)`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY id ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
};

// Resetar senha de um usuário
exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { novaSenha } = req.body;

    if (!novaSenha) {
      return res.status(400).json({ error: 'Nova senha é obrigatória' });
    }

    const hashedPassword = await bcrypt.hash(novaSenha, 10);
    
    const userResult = await pool.query('SELECT nome, email FROM usuarios WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    await pool.query('UPDATE usuarios SET senha = $1 WHERE id = $2', [hashedPassword, id]);

    // Auditoria
    await registrarAuditoria(
      req.userId,
      'Admin',
      'EDITAR',
      'usuarios',
      id,
      `Senha do usuário ${userResult.rows[0].email} resetada pelo administrador.`
    );

    res.json({ message: 'Senha resetada com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao resetar senha' });
  }
};

// Alternar status de administrador
exports.toggleAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { isAdmin } = req.body;

    // Impedir que o admin remova seus próprios privilégios (segurança básica)
    if (parseInt(id) === req.userId && !isAdmin) {
      return res.status(400).json({ error: 'Você não pode remover seus próprios privilégios de administrador.' });
    }

    await pool.query('UPDATE usuarios SET is_admin = $1 WHERE id = $2', [isAdmin, id]);

    res.json({ message: 'Status de administrador atualizado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar status de administrador' });
  }
};

// Alternar status PRO
exports.togglePro = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPro } = req.body;

    // Se o admin ativar o PRO manualmente, definimos 30 dias de validade por padrão
    let expiryDate = null;
    if (isPro) {
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
    }

    await pool.query(
      'UPDATE usuarios SET is_pro = $1, pro_expires_at = $2 WHERE id = $3', 
      [isPro, expiryDate, id]
    );

    res.json({ message: `Status PRO ${isPro ? 'ativado' : 'desativado'} com sucesso` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar status PRO' });
  }
};

// Deletar usuário
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.userId) {
      return res.status(400).json({ error: 'Você não pode deletar sua própria conta através do painel admin.' });
    }

    await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);

    res.json({ message: 'Usuário removido com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao deletar usuário' });
  }
};

// Buscar histórico de pagamentos de um usuário específico
exports.getUserPaymentHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM pagamentos_assinatura WHERE usuario_id = $1 ORDER BY data_pagamento DESC',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar histórico do usuário' });
  }
};

// Obter configurações globais
exports.getConfigs = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM configuracoes');
    const configs = {};
    result.rows.forEach(row => {
      configs[row.chave] = row.valor;
    });
    res.json(configs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
};

// Atualizar configuração global
exports.updateConfig = async (req, res) => {
  try {
    const { chave, valor } = req.body;
    await pool.query(
      'UPDATE configuracoes SET valor = $1, updated_at = NOW() WHERE chave = $2',
      [valor, chave]
    );
    res.json({ message: 'Configuração atualizada com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar configuração' });
  }
};
