const pool = require('../config/database');
const { registrarAuditoria } = require('./auditoriaController');

// Listar todas as categorias do usuário
exports.getAll = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM categorias WHERE usuario_id = $1 ORDER BY tipo, nome',
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
};

// Criar nova categoria
exports.create = async (req, res) => {
  try {
    const { nome, tipo, cor } = req.body;
    const corPadrao = cor || '#7c3aed';

    const result = await pool.query(
      'INSERT INTO categorias (nome, tipo, cor, usuario_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [nome, tipo, corPadrao, req.userId]
    );

    const user = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [req.userId]);
    await registrarAuditoria(
      req.userId,
      user.rows[0].nome,
      'CRIAR',
      'categorias',
      result.rows[0].id,
      `Categoria criada: ${nome} (${tipo})`
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
};

// Atualizar categoria
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, tipo, cor } = req.body;

    const result = await pool.query(
      'UPDATE categorias SET nome = $1, tipo = $2, cor = $3 WHERE id = $4 AND usuario_id = $5 RETURNING *',
      [nome, tipo, cor || '#7c3aed', id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    const user = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [req.userId]);
    await registrarAuditoria(
      req.userId,
      user.rows[0].nome,
      'EDITAR',
      'categorias',
      result.rows[0].id,
      `Categoria editada: ${nome}`
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
};

// Deletar categoria
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se existem subcategorias associadas
    const subcategorias = await pool.query(
      'SELECT COUNT(*) FROM subcategorias WHERE categoria_id = $1',
      [id]
    );

    if (parseInt(subcategorias.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir categoria com subcategorias associadas' 
      });
    }

    const categoria = await pool.query(
      'SELECT nome FROM categorias WHERE id = $1 AND usuario_id = $2',
      [id, req.userId]
    );

    if (categoria.rows.length === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    await pool.query(
      'DELETE FROM categorias WHERE id = $1 AND usuario_id = $2',
      [id, req.userId]
    );

    const user = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [req.userId]);
    await registrarAuditoria(
      req.userId,
      user.rows[0].nome,
      'EXCLUIR',
      'categorias',
      id,
      `Categoria excluída: ${categoria.rows[0].nome}`
    );

    res.json({ message: 'Categoria excluída com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir categoria' });
  }
};

// Listar subcategorias de uma categoria
exports.getSubcategorias = async (req, res) => {
  try {
    const { categoriaId } = req.params;

    // Verificar se a categoria pertence ao usuário
    const categoria = await pool.query(
      'SELECT * FROM categorias WHERE id = $1 AND usuario_id = $2',
      [categoriaId, req.userId]
    );

    if (categoria.rows.length === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    const result = await pool.query(
      'SELECT * FROM subcategorias WHERE categoria_id = $1 ORDER BY nome',
      [categoriaId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar subcategorias' });
  }
};

// Criar subcategoria
exports.createSubcategoria = async (req, res) => {
  try {
    const { categoriaId } = req.params;
    const { nome, cor } = req.body;
    const corPadrao = cor || '#7c3aed';

    // Verificar se a categoria pertence ao usuário
    const categoria = await pool.query(
      'SELECT * FROM categorias WHERE id = $1 AND usuario_id = $2',
      [categoriaId, req.userId]
    );

    if (categoria.rows.length === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    const result = await pool.query(
      'INSERT INTO subcategorias (nome, cor, categoria_id) VALUES ($1, $2, $3) RETURNING *',
      [nome, corPadrao, categoriaId]
    );

    const user = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [req.userId]);
    await registrarAuditoria(
      req.userId,
      user.rows[0].nome,
      'CRIAR',
      'subcategorias',
      result.rows[0].id,
      `Subcategoria criada: ${nome} (Categoria: ${categoria.rows[0].nome})`
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar subcategoria' });
  }
};

// Atualizar subcategoria
exports.updateSubcategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, cor } = req.body;

    // Verificar se a subcategoria pertence a uma categoria do usuário
    const subcategoria = await pool.query(
      `SELECT s.*, c.usuario_id 
       FROM subcategorias s 
       JOIN categorias c ON s.categoria_id = c.id 
       WHERE s.id = $1 AND c.usuario_id = $2`,
      [id, req.userId]
    );

    if (subcategoria.rows.length === 0) {
      return res.status(404).json({ error: 'Subcategoria não encontrada' });
    }

    const result = await pool.query(
      'UPDATE subcategorias SET nome = $1, cor = $2 WHERE id = $3 RETURNING *',
      [nome, cor || '#7c3aed', id]
    );

    const user = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [req.userId]);
    await registrarAuditoria(
      req.userId,
      user.rows[0].nome,
      'EDITAR',
      'subcategorias',
      result.rows[0].id,
      `Subcategoria editada: ${nome}`
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar subcategoria' });
  }
};

// Deletar subcategoria
exports.deleteSubcategoria = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a subcategoria pertence a uma categoria do usuário
    const subcategoria = await pool.query(
      `SELECT s.nome, c.usuario_id 
       FROM subcategorias s 
       JOIN categorias c ON s.categoria_id = c.id 
       WHERE s.id = $1 AND c.usuario_id = $2`,
      [id, req.userId]
    );

    if (subcategoria.rows.length === 0) {
      return res.status(404).json({ error: 'Subcategoria não encontrada' });
    }

    await pool.query('DELETE FROM subcategorias WHERE id = $1', [id]);

    const user = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [req.userId]);
    await registrarAuditoria(
      req.userId,
      user.rows[0].nome,
      'EXCLUIR',
      'subcategorias',
      id,
      `Subcategoria excluída: ${subcategoria.rows[0].nome}`
    );

    res.json({ message: 'Subcategoria excluída com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir subcategoria' });
  }
};
