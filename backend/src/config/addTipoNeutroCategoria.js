const pool = require('./database');

async function addTipoNeutroCategoria() {
  try {
    // Remover a constraint antiga da tabela categorias
    await pool.query(`
      ALTER TABLE categorias 
      DROP CONSTRAINT IF EXISTS categorias_tipo_check;
    `);

    console.log('✅ Constraint antiga removida.');

    // Adicionar nova constraint com 'neutro'
    await pool.query(`
      ALTER TABLE categorias 
      ADD CONSTRAINT categorias_tipo_check 
      CHECK (tipo IN ('entrada', 'saida', 'neutro'));
    `);

    console.log('✅ Constraint atualizada com sucesso! Tipo "neutro" adicionado às categorias.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao atualizar constraint:', error);
    process.exit(1);
  }
}

addTipoNeutroCategoria();
