const pool = require('../config/database');

const entradasProjetivasController = {
  // Listar todas as entradas projetivas do usuário
  async listar(req, res) {
    try {
      const result = await pool.query(
        'SELECT * FROM entradas_projetivas WHERE usuario_id = $1 ORDER BY data DESC',
        [req.userId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Erro ao listar entradas projetivas:', error);
      res.status(500).json({ error: 'Erro ao listar entradas projetivas' });
    }
  },

  // Criar uma nova entrada projetiva
  async criar(req, res) {
    try {
      const { descricao, valor, data } = req.body;
      const valorNumerico = parseFloat(String(valor).replace(',', '.')) || 0;
      const result = await pool.query(
        'INSERT INTO entradas_projetivas (descricao, valor, data, usuario_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [descricao, valorNumerico, data, req.userId]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Erro ao criar entrada projetiva:', error);
      res.status(500).json({ error: 'Erro ao criar entrada projetiva' });
    }
  },

  // Criar múltiplas entradas projetivas de uma vez (bulk insert)
  async criarMultiplos(req, res) {
    try {
      const items = req.body; // Array de { descricao, valor, data }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Lista de itens inválida ou vazia.' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const insertedItems = [];
        
        for (const item of items) {
          const valorNumerico = parseFloat(String(item.valor).replace(',', '.')) || 0;
          const result = await client.query(
            'INSERT INTO entradas_projetivas (descricao, valor, data, usuario_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [item.descricao, valorNumerico, item.data, req.userId]
          );
          insertedItems.push(result.rows[0]);
        }
        
        await client.query('COMMIT');
        res.status(201).json(insertedItems);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Erro ao criar múltiplas entradas projetivas:', error);
      res.status(500).json({ error: 'Erro ao criar múltiplas entradas projetivas: ' + error.message });
    }
  },

  // Atualizar uma entrada projetiva
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const { descricao, valor, data } = req.body;
      const result = await pool.query(
        'UPDATE entradas_projetivas SET descricao = $1, valor = $2, data = $3 WHERE id = $4 AND usuario_id = $5 RETURNING *',
        [descricao, valor, data, id, req.userId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Entrada projetiva não encontrada' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Erro ao atualizar entrada projetiva:', error);
      res.status(500).json({ error: 'Erro ao atualizar entrada projetiva' });
    }
  },

  // Deletar uma entrada projetiva
  async deletar(req, res) {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'DELETE FROM entradas_projetivas WHERE id = $1 AND usuario_id = $2 RETURNING *',
        [id, req.userId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Entrada projetiva não encontrada' });
      }
      
      res.json({ message: 'Entrada projetiva deletada com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar entrada projetiva:', error);
      res.status(500).json({ error: 'Erro ao deletar entrada projetiva' });
    }
  }
};

module.exports = entradasProjetivasController;
