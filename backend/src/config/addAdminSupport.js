const pool = require('./database');

const migrate = async () => {
  try {
    console.log('🔄 Adicionando suporte administrativo à tabela de usuários...');

    await pool.query(`
      ALTER TABLE usuarios 
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMP,
      ADD COLUMN IF NOT EXISTS ultima_atividade TIMESTAMP,
      ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;
    `);

    // Definir o primeiro usuário como admin (opcional, para facilitar o teste inicial)
    // await pool.query('UPDATE usuarios SET is_admin = TRUE WHERE id = (SELECT id FROM usuarios ORDER BY id ASC LIMIT 1)');

    console.log('✅ Migração concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
};

migrate();
