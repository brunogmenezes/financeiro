const pool = require('./database');

async function upgradeDatabase() {
  try {
    console.log('🔄 Adicionando colunas de parcelamento à tabela lancamentos...');

    // Adicionar colunas se não existirem
    await pool.query(`
      ALTER TABLE lancamentos 
      ADD COLUMN IF NOT EXISTS parcelado BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS num_parcelas INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS parcela_atual INTEGER DEFAULT 1;
    `);

    console.log('✅ Colunas de parcelamento adicionadas com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

upgradeDatabase();
