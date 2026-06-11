const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const adminAuth = require('../middlewares/adminAuth');
const pool = require('../config/database');
const { sendMail } = require('../services/emailService');

// Todas as rotas de e-mail requerem autenticação e privilégios de administrador
router.use(auth, adminAuth);

router.get('/config', async (req, res) => {
  try {
    const result = await pool.query('SELECT host, port, username, secure, from_email, from_name, password, system_url FROM smtp_config LIMIT 1');
    if (!result.rows[0]) {
      return res.status(404).json({ ok: false, error: 'Configuração SMTP não encontrada' });
    }
    
    const config = result.rows[0];
    // Mascarar senha
    const maskedConfig = {
      ...config,
      password: config.password ? '********' : ''
    };
    
    res.json({ ok: true, data: maskedConfig });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

router.post('/config', async (req, res) => {
  try {
    const { host, port, username, password, secure, from_email, from_name, system_url } = req.body;
    
    if (!host || !port || !username || !from_email || !from_name) {
      return res.status(400).json({ ok: false, error: 'Servidor, porta, usuário, e-mail do remetente e nome do remetente são obrigatórios' });
    }
    
    // Verificar se já existe
    const check = await pool.query('SELECT id, password FROM smtp_config LIMIT 1');
    
    let finalPassword = password;
    if (check.rows.length > 0) {
      // Se a senha vier como mascarada ou vazia, mantém a existente
      if (password === '********' || !password) {
        finalPassword = check.rows[0].password;
      }
      
      // Atualizar
      await pool.query(
        'UPDATE smtp_config SET host = $1, port = $2, username = $3, password = $4, secure = $5, from_email = $6, from_name = $7, system_url = $8, updated_at = CURRENT_TIMESTAMP WHERE id = $9',
        [host, port, username, finalPassword, secure, from_email, from_name, system_url, check.rows[0].id]
      );
    } else {
      // Criar
      await pool.query(
        'INSERT INTO smtp_config (host, port, username, password, secure, from_email, from_name, system_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [host, port, username, finalPassword, secure, from_email, from_name, system_url]
      );
    }
    
    res.json({ ok: true, message: 'Configuração de e-mail salva com sucesso' });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

// Obter todos os templates
router.get('/templates', async (req, res) => {
  try {
    const result = await pool.query('SELECT slug, name, subject, body, variables FROM email_templates ORDER BY slug;');
    res.json({ ok: true, data: result.rows });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

// Atualizar um template
router.put('/templates/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { subject, body } = req.body;
    
    if (!subject || !body) {
      return res.status(400).json({ ok: false, error: 'Assunto e corpo do e-mail são obrigatórios' });
    }
    
    const result = await pool.query(
      'UPDATE email_templates SET subject = $1, body = $2, updated_at = CURRENT_TIMESTAMP WHERE slug = $3 RETURNING *;',
      [subject, body, slug]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Template não encontrado' });
    }
    
    res.json({ ok: true, message: 'Template atualizado com sucesso', data: result.rows[0] });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

router.post('/test-email', async (req, res) => {
  try {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({ ok: false, error: 'E-mail de destino é obrigatório' });
    }
    
    // Obter o nome do administrador logado
    const adminUser = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [req.userId]);
    const adminName = adminUser.rows[0]?.nome || 'Administrador';
    
    // Obter template de teste do banco
    const templateResult = await pool.query("SELECT subject, body FROM email_templates WHERE slug = 'test';");
    
    let subject = 'Teste de Configuração SMTP 📩';
    let html = '';
    const dataHoraStr = new Date().toLocaleString('pt-BR');
    
    if (templateResult.rows.length > 0) {
      subject = templateResult.rows[0].subject;
      html = templateResult.rows[0].body;
      
      // Substituir variáveis dinâmicas
      html = html.replace(/\{\{nome\}\}/g, adminName);
      html = html.replace(/\{\{data_hora\}\}/g, dataHoraStr);
      
      // Também substituir no assunto se aplicável
      subject = subject.replace(/\{\{nome\}\}/g, adminName);
      subject = subject.replace(/\{\{data_hora\}\}/g, dataHoraStr);
    } else {
      // Fallback padrão se por algum motivo não houver o template no banco
      html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #6a1b9a; text-align: center;">Conexão SMTP Estabelecida!</h2>
        <p>Olá, <strong>${adminName}</strong>. Este é o fallback do e-mail de teste.</p>
        <p>Data/Hora: ${dataHoraStr}</p>
      </div>`;
    }
    
    const text = `Olá!\n\nEste é um e-mail de teste enviado para validar as configurações SMTP no seu portal Manager.\n\nData/Hora: ${dataHoraStr}`;
    
    await sendMail({ to, subject, text, html });
    
    res.json({ ok: true, message: 'E-mail de teste enviado com sucesso!' });
  } catch (error) {
    res.status(400).json({ ok: false, error: `Falha ao enviar e-mail: ${error.message}` });
  }
});

module.exports = router;
