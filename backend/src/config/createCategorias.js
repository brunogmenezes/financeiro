const pool = require('./database');

async function createCategorias() {
  try {
    // Criar tabela de categorias
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        tipo VARCHAR(10) CHECK (tipo IN ('entrada', 'saida')) NOT NULL,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tabela categorias criada com sucesso!');

    // Criar tabela de subcategorias
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subcategorias (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        categoria_id INTEGER REFERENCES categorias(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tabela subcategorias criada com sucesso!');

    // Adicionar colunas categoria_id e subcategoria_id na tabela lancamentos
    await pool.query(`
      ALTER TABLE lancamentos 
      ADD COLUMN IF NOT EXISTS categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS subcategoria_id INTEGER REFERENCES subcategorias(id) ON DELETE SET NULL
    `);

    console.log('✅ Colunas categoria_id e subcategoria_id adicionadas em lancamentos!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
    process.exit(1);
  }
}

createCategorias();
