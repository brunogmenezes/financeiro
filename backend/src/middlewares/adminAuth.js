const pool = require('../config/database');

const adminAuth = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT is_admin FROM usuarios WHERE id = $1', [req.userId]);
    
    if (result.rows.length === 0 || !result.rows[0].is_admin) {
      return res.status(403).json({ error: 'Acesso negado. Requer privilégios de administrador.' });
    }

    next();
  } catch (error) {
    console.error('Erro no adminAuth:', error);
    res.status(500).json({ error: 'Erro interno na verificação de administrador' });
  }
};

module.exports = adminAuth;
