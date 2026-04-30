const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuário e verificar status PRO
    const result = await pool.query(
      'SELECT id, nome, email, is_pro, pro_expires_at, is_admin FROM usuarios WHERE id = $1', 
      [decoded.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    
    let user = result.rows[0];
    
    // Verificar se o acesso PRO expirou
    if (user.is_pro && user.pro_expires_at && !user.is_admin) {
      const now = new Date();
      if (now > new Date(user.pro_expires_at)) {
        // Expirou! Atualizar no banco e no objeto local
        await pool.query('UPDATE usuarios SET is_pro = false WHERE id = $1', [user.id]);
        user.is_pro = false;
        console.log(`Acesso PRO do usuário ${user.email} expirou.`);
      }
    }
    
    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    console.error('Erro no Auth Middleware:', error);
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

module.exports = authMiddleware;

