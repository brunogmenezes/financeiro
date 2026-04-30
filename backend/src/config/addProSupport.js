const pool = require('./database');

const migrate = async () => {
  try {
    console.log('🔄 Adicionando coluna is_pro à tabela de usuários...');

    await pool.query(`
      ALTER TABLE usuarios 
      ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE;
    `);

    console.log('✅ Migração is_pro concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração is_pro:', error);
    process.exit(1);
  }
};

migrate();
