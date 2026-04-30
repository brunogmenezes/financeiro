const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const adminAuth = require('../middlewares/adminAuth');
const pool = require('../config/database');
const { getConnectionState, sendText } = require('../services/evolutionService');
const { sendReminder } = require('../services/reminderScheduler');

router.get('/status', auth, async (req, res) => {
  try {
    const data = await getConnectionState();
    res.json({ ok: true, data });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

router.get('/config', auth, adminAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT url, instancia, token FROM evolution_config LIMIT 1');
    if (!result.rows[0]) {
      return res.status(404).json({ ok: false, error: 'Configuração não encontrada' });
    }
    res.json({ ok: true, data: result.rows[0] });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

router.post('/config', auth, adminAuth, async (req, res) => {
  try {
    const { url, instancia, token } = req.body;
    
    if (!url || !instancia || !token) {
      return res.status(400).json({ ok: false, error: 'URL, instância e token são obrigatórios' });
    }
    
    // Verificar se já existe
    const check = await pool.query('SELECT id FROM evolution_config LIMIT 1');
    
    if (check.rows.length > 0) {
      // Atualizar
      await pool.query(
        'UPDATE evolution_config SET url = $1, instancia = $2, token = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
        [url, instancia, token, check.rows[0].id]
      );
    } else {
      // Criar
      await pool.query(
        'INSERT INTO evolution_config (url, instancia, token) VALUES ($1, $2, $3)',
        [url, instancia, token]
      );
    }
    
    res.json({ ok: true, message: 'Configuração salva com sucesso' });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

router.post('/test-message', auth, async (req, res) => {
  try {
    const { whatsapp } = req.body;
    
    if (!whatsapp) {
      return res.status(400).json({ ok: false, error: 'Número de WhatsApp é obrigatório' });
    }
    
    const user = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [req.userId]);
    const userName = user.rows[0]?.nome || 'Usuário';
    
    const testMessage = `Olá ${userName}! 🎉\n\nEsta é uma mensagem de teste da integração do Financeiro com WhatsApp.\n\nSe você está recebendo isso, tudo está funcionando corretamente! ✅\n\nData/Hora: ${new Date().toLocaleString('pt-BR')}`;
    
    await sendText(whatsapp, testMessage);
    
    res.json({ ok: true, message: 'Mensagem de teste enviada com sucesso!' });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

router.post('/send-reminders-now', auth, adminAuth, async (req, res) => {
  try {
    const now = new Date();
    
    // Enviar lembretes para hoje
    await sendReminder(now);
    console.log(`📤 Lembretes disparados manualmente para ${now.toISOString().slice(0, 10)}`);
    
    // Enviar lembretes para amanhã (D-1)
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    await sendReminder(tomorrow);
    console.log(`📤 Lembretes disparados manualmente para ${tomorrow.toISOString().slice(0, 10)}`);
    
    res.json({ ok: true, message: 'Lembretes disparados com sucesso para hoje e amanhã!' });
  } catch (error) {
    console.error('Erro ao disparar lembretes:', error);
    res.status(400).json({ ok: false, error: error.message });
  }
});

module.exports = router;
