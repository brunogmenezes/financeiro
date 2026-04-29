const pool = require('./database');

const runMigration = async () => {
  try {
    console.log('🔄 Criando tabela entradas_projetivas...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS entradas_projetivas (
        id SERIAL PRIMARY KEY,
        descricao VARCHAR(255) NOT NULL,
        valor DECIMAL(10, 2) NOT NULL,
        data DATE NOT NULL,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Tabela entradas_projetivas criada/verificada com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar tabela entradas_projetivas:', error);
    process.exit(1);
  }
};

runMigration();
