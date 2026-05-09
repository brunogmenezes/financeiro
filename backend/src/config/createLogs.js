const pool = require('../config/database');

const createLogsTable = async () => {
  try {
    console.log('🔄 Criando tabela de logs...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        usuario_nome VARCHAR(100),
        acao VARCHAR(50) NOT NULL,
        tabela VARCHAR(50) NOT NULL,
        registro_id INTEGER,
        descricao TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Tabela de logs criada com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar tabela de logs:', error);
    process.exit(1);
  }
};

createLogsTable();
