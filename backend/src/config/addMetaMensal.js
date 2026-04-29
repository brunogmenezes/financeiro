const pool = require('./database');

const runMigration = async () => {
  try {
    console.log('🔄 Adicionando coluna meta_mensal à tabela categorias...');

    await pool.query(`
      ALTER TABLE categorias 
      ADD COLUMN IF NOT EXISTS meta_mensal DECIMAL(10, 2) DEFAULT NULL;
    `);

    console.log('✅ Coluna meta_mensal adicionada com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao executar migração:', error);
    process.exit(1);
  }
};

runMigration();
