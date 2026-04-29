const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { registrarAuditoria } = require('./auditoriaController');

// Listar todos os usuários com status online/offline
exports.listUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        nome, 
        email, 
        username,
        is_admin, 
        ultimo_login, 
        ultima_atividade,
        (ultima_atividade > NOW() - INTERVAL '5 minutes') as is_online,
        created_at
      FROM usuarios
      ORDER BY id ASC
    `);

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
