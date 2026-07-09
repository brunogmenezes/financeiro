const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const auth = require('../middlewares/auth');

// Listar todos os lembretes do usuário
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM lembretes WHERE usuario_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json({ ok: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Criar um novo lembrete
router.post('/', auth, async (req, res) => {
  try {
    const { titulo, descricao, data_hora, recorrencia } = req.body;

    if (!titulo || !data_hora || !recorrencia) {
      return res.status(400).json({ ok: false, error: 'Título, data/hora e recorrência são obrigatórios' });
    }

    // Verificar se o usuário é PRO
    const userResult = await pool.query('SELECT is_pro FROM usuarios WHERE id = $1', [req.userId]);
    const isPro = userResult.rows[0]?.is_pro;
    if (!isPro) {
      return res.status(403).json({ ok: false, error: 'Apenas usuários PRO podem criar lembretes personalizados.' });
    }

    const result = await pool.query(
      `INSERT INTO lembretes (usuario_id, titulo, descricao, data_hora, recorrencia, status) 
       VALUES ($1, $2, $3, $4, $5, 'ativo') 
       RETURNING *`,
      [req.userId, titulo, descricao || null, data_hora, recorrencia]
    );

    res.status(201).json({ ok: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Atualizar um lembrete existente
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descricao, data_hora, recorrencia, status } = req.body;

    if (!titulo || !data_hora || !recorrencia) {
      return res.status(400).json({ ok: false, error: 'Título, data/hora e recorrência são obrigatórios' });
    }

    // Verificar se o usuário é PRO
    const userResult = await pool.query('SELECT is_pro FROM usuarios WHERE id = $1', [req.userId]);
    const isPro = userResult.rows[0]?.is_pro;
    if (!isPro) {
      return res.status(403).json({ ok: false, error: 'Apenas usuários PRO podem gerenciar lembretes personalizados.' });
    }

    // Verificar propriedade
    const checkOwner = await pool.query('SELECT id FROM lembretes WHERE id = $1 AND usuario_id = $2', [id, req.userId]);
    if (checkOwner.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Lembrete não encontrado ou não pertence a você' });
    }

    const result = await pool.query(
      `UPDATE lembretes 
       SET titulo = $1, descricao = $2, data_hora = $3, recorrencia = $4, status = COALESCE($5, status) 
       WHERE id = $6 AND usuario_id = $7 
       RETURNING *`,
      [titulo, descricao || null, data_hora, recorrencia, status, id, req.userId]
    );

    res.json({ ok: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Excluir um lembrete
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar propriedade
    const checkOwner = await pool.query('SELECT id FROM lembretes WHERE id = $1 AND usuario_id = $2', [id, req.userId]);
    if (checkOwner.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Lembrete não encontrado ou não pertence a você' });
    }

    await pool.query('DELETE FROM lembretes WHERE id = $1 AND usuario_id = $2', [id, req.userId]);
    res.json({ ok: true, message: 'Lembrete excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
