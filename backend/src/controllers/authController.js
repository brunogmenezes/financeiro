const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { registrarAuditoria } = require('./auditoriaController');

// Registrar usuário
exports.register = async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    // Verifica se usuário já existe
    const userExists = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(senha, 10);

    // Inserir usuário
    const result = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING id, nome, email',
      [nome, email, hashedPassword]
    );

    // Registrar auditoria
    await registrarAuditoria(
      result.rows[0].id,
      result.rows[0].nome,
      'CRIAR',
      'usuarios',
      result.rows[0].id,
      `Novo usuário registrado: ${nome} (${email})`
    );

    res.status(201).json({ message: 'Usuário criado com sucesso', user: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Buscar usuário
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = result.rows[0];

    // Verificar senha
    const isValidPassword = await bcrypt.compare(senha, user.senha);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Gerar token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Registrar auditoria de login
    await registrarAuditoria(
      user.id,
      user.nome,
      'LOGIN',
      'usuarios',
      user.id,
      `Login realizado: ${user.email}`
    );

    res.json({
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        cor_tema: user.cor_tema || 'roxo',
        whatsapp: user.whatsapp || ''
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
};

// Obter perfil do usuário
exports.getPerfil = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nome, email, cor_tema, whatsapp, created_at FROM usuarios WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
};

// Atualizar perfil do usuário
exports.updatePerfil = async (req, res) => {
  try {
    const { nome, email, senhaAtual, novaSenha, corTema, whatsapp } = req.body;
    const userId = req.userId;

    // Buscar usuário atual
    const userResult = await pool.query('SELECT * FROM usuarios WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = userResult.rows[0];

    // Se está alterando a senha, validar senha atual
    if (novaSenha) {
      if (!senhaAtual) {
        return res.status(400).json({ error: 'Senha atual é obrigatória para alterar a senha' });
      }

      const isValidPassword = await bcrypt.compare(senhaAtual, user.senha);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Senha atual incorreta' });
      }
    }

    // Verificar se o email já está sendo usado por outro usuário
    if (email !== user.email) {
      const emailExists = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND id != $2', [email, userId]);
      if (emailExists.rows.length > 0) {
        return res.status(400).json({ error: 'Email já está sendo usado por outro usuário' });
      }
    }

    // Preparar atualização
    let query = 'UPDATE usuarios SET nome = $1, email = $2, cor_tema = $3, whatsapp = $4';
    let params = [nome, email, corTema || 'roxo', whatsapp || null];
    
    if (novaSenha) {
      const hashedPassword = await bcrypt.hash(novaSenha, 10);
      query += ', senha = $5';
      params.push(hashedPassword);
    }
    
    query += ` WHERE id = $${params.length + 1} RETURNING id, nome, email, cor_tema, whatsapp`;
    params.push(userId);

    // Atualizar usuário
    const result = await pool.query(query, params);

    // Registrar auditoria
    await registrarAuditoria(
      userId,
      user.nome,
      'EDITAR',
      'usuarios',
      userId,
      `Perfil atualizado: ${nome} (${email})${novaSenha ? ' - Senha alterada' : ''}`
    );

    res.json({ 
      message: 'Perfil atualizado com sucesso', 
      user: result.rows[0] 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
};
