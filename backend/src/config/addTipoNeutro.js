const pool = require('./database');

async function addTipoNeutro() {
  try {
    // Remover a constraint antiga
    await pool.query(`
      ALTER TABLE lancamentos 
      DROP CONSTRAINT IF EXISTS lancamentos_tipo_check;
    `);

    // Adicionar nova constraint com 'neutro'
    await pool.query(`
      ALTER TABLE lancamentos 
      ADD CONSTRAINT lancamentos_tipo_check 
      CHECK (tipo IN ('entrada', 'saida', 'neutro'));
    `);

    console.log('✅ Constraint atualizada com sucesso! Tipo "neutro" adicionado.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao atualizar constraint:', error);
    process.exit(1);
  }
}

addTipoNeutro();
