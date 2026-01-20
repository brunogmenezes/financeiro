const pool = require('./database');

async function addCorTema() {
  try {
    // Adicionar coluna cor_tema na tabela usuarios
    await pool.query(`
      ALTER TABLE usuarios 
      ADD COLUMN IF NOT EXISTS cor_tema VARCHAR(20) DEFAULT 'roxo'
    `);
    
    console.log('✅ Coluna cor_tema adicionada com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna:', error);
    process.exit(1);
  }
}

addCorTema();
