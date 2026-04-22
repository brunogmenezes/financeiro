const pool = require('./database');

async function fixColumnLength() {
  try {
    console.log('🔄 Aumentando tamanho da coluna tipo na tabela lancamentos...');

    // Alterar tipo da coluna para VARCHAR(20) para suportar 'transferencia'
    await pool.query(`
      ALTER TABLE lancamentos 
      ALTER COLUMN tipo TYPE VARCHAR(20);
    `);

    console.log('✅ Tamanho da coluna atualizado com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao atualizar coluna:', error);
    process.exit(1);
  }
}

fixColumnLength();
