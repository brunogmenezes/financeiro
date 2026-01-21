const pool = require('./database');

const addCorCategoria = async () => {
  try {
    // Adicionar coluna cor em categorias
    await pool.query(`
      ALTER TABLE categorias
      ADD COLUMN IF NOT EXISTS cor VARCHAR(7) DEFAULT '#7c3aed'
    `);
    console.log('✅ Coluna "cor" adicionada em categorias!');

    // Adicionar coluna cor em subcategorias
    await pool.query(`
      ALTER TABLE subcategorias
      ADD COLUMN IF NOT EXISTS cor VARCHAR(7) DEFAULT '#7c3aed'
    `);
    console.log('✅ Coluna "cor" adicionada em subcategorias!');

    console.log('✅ Migração concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    process.exit(1);
  }
};

addCorCategoria();
