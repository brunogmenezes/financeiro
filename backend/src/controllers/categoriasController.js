const pool = require('../config/database');
const { registrarAuditoria } = require('./auditoriaController');

// Listar todas as categorias (Globais)
exports.getAll = async (req, res) => {
  try {
    // Busca categorias e o limite específico do usuário logado
    const result = await pool.query(`
      SELECT c.*, l.valor_limite as meta_mensal
      FROM categorias c
      LEFT JOIN limites_usuarios l ON c.id = l.categoria_id AND l.usuario_id = $1
      ORDER BY c.tipo, c.nome
    `, [req.userId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
};

// Criar nova categoria (Apenas Admin)
exports.create = async (req, res) => {
  try {
    const { nome, tipo, cor } = req.body;
    const corPadrao = cor || '#7c3aed';

    const result = await pool.query(
      'INSERT INTO categorias (nome, tipo, cor) VALUES ($1, $2, $3) RETURNING *',
      [nome, tipo, corPadrao]
    );

    await registrarAuditoria(
      req.userId,
      'Admin',
      'CRIAR',
      'categorias',
      result.rows[0].id,
      `Categoria GLOBAL criada: ${nome} (${tipo})`
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
};

// Atualizar categoria (Apenas Admin)
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, tipo, cor } = req.body;

    const result = await pool.query(
      'UPDATE categorias SET nome = $1, tipo = $2, cor = $3 WHERE id = $4 RETURNING *',
      [nome, tipo, cor || '#7c3aed', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    await registrarAuditoria(
      req.userId,
      'Admin',
      'EDITAR',
      'categorias',
      id,
      `Categoria GLOBAL editada: ${nome}`
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
};

// Deletar categoria (Apenas Admin)
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const subcategorias = await pool.query(
      'SELECT COUNT(*) FROM subcategorias WHERE categoria_id = $1',
      [id]
    );

    if (parseInt(subcategorias.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir categoria com subcategorias associadas' 
      });
    }

    const lancamentos = await pool.query(
      'SELECT COUNT(*) FROM lancamentos WHERE categoria_id = $1',
      [id]
    );

    if (parseInt(lancamentos.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir esta categoria pois existem lançamentos vinculados a ela.' 
      });
    }

    const categoria = await pool.query('SELECT nome FROM categorias WHERE id = $1', [id]);
    if (categoria.rows.length === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    await pool.query('DELETE FROM categorias WHERE id = $1', [id]);

    await registrarAuditoria(req.userId, 'Admin', 'EXCLUIR', 'categorias', id, `Categoria GLOBAL excluída: ${categoria.rows[0].nome}`);

    res.json({ message: 'Categoria excluída com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir categoria' });
  }
};

// Salvar limite de categoria do usuário
exports.saveLimiteCategoria = async (req, res) => {
  try {
    const { id } = req.params; // id da categoria
    const { valor_limite } = req.body;
    const usuarioId = req.userId;

    await pool.query(`
      INSERT INTO limites_usuarios (usuario_id, categoria_id, valor_limite)
      VALUES ($1, $2, $3)
      ON CONFLICT (usuario_id, categoria_id) 
      DO UPDATE SET valor_limite = EXCLUDED.valor_limite
    `, [usuarioId, id, valor_limite]);

    res.json({ message: 'Limite atualizado com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao salvar limite' });
  }
};

// --- Subcategorias ---

// Listar subcategorias de uma categoria
exports.getSubcategorias = async (req, res) => {
  try {
    const { categoriaId } = req.params;

    const result = await pool.query(`
      SELECT s.*, l.valor_limite as meta_mensal
      FROM subcategorias s
      LEFT JOIN limites_usuarios l ON s.id = l.subcategoria_id AND l.usuario_id = $1
      WHERE s.categoria_id = $2
      ORDER BY s.nome
    `, [req.userId, categoriaId]);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar subcategorias' });
  }
};

// Criar subcategoria (Apenas Admin)
exports.createSubcategoria = async (req, res) => {
  try {
    const { categoriaId } = req.params;
    const { nome, cor } = req.body;

    const result = await pool.query(
      'INSERT INTO subcategorias (nome, cor, categoria_id) VALUES ($1, $2, $3) RETURNING *',
      [nome, cor || '#7c3aed', categoriaId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar subcategoria' });
  }
};

// Atualizar subcategoria (Apenas Admin)
exports.updateSubcategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, cor } = req.body;

    const result = await pool.query(
      'UPDATE subcategorias SET nome = $1, cor = $2 WHERE id = $3 RETURNING *',
      [nome, cor || '#7c3aed', id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar subcategoria' });
  }
};

// Deletar subcategoria (Apenas Admin)
exports.deleteSubcategoria = async (req, res) => {
  try {
    const { id } = req.params;

    const lancamentos = await pool.query(
      'SELECT COUNT(*) FROM lancamentos WHERE subcategoria_id = $1',
      [id]
    );

    if (parseInt(lancamentos.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir esta subcategoria pois existem lançamentos vinculados a ela.' 
      });
    }

    await pool.query('DELETE FROM subcategorias WHERE id = $1', [id]);
    res.json({ message: 'Subcategoria excluída com sucesso' });
  } catch (error) {
    console.error(error);
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ error: 'Esta subcategoria possui registros vinculados e não pode ser excluída.' });
    }
    res.status(500).json({ error: 'Erro ao excluir subcategoria' });
  }
};

// Salvar limite de subcategoria do usuário
exports.saveLimiteSubcategoria = async (req, res) => {
  try {
    const { id } = req.params; // id da subcategoria
    const { valor_limite } = req.body;
    const usuarioId = req.userId;

    await pool.query(`
      INSERT INTO limites_usuarios (usuario_id, subcategoria_id, valor_limite)
      VALUES ($1, $2, $3)
      ON CONFLICT (usuario_id, subcategoria_id) 
      DO UPDATE SET valor_limite = EXCLUDED.valor_limite
    `, [usuarioId, id, valor_limite]);

    res.json({ message: 'Limite atualizado com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao salvar limite' });
  }
};
