const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: false
});

async function migrate() {
  try {
    console.log('Criando tabela de configurações globais...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        id SERIAL PRIMARY KEY,
        chave VARCHAR(100) UNIQUE NOT NULL,
        valor TEXT NOT NULL,
        descricao TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Inserir preço padrão inicial se não existir
    await pool.query(`
      INSERT INTO configuracoes (chave, valor, descricao)
      VALUES ('preco_assinatura', '9.99', 'Preço da mensalidade do plano PRO')
      ON CONFLICT (chave) DO NOTHING;
    `);
    
    console.log('Tabela configuracoes criada e preço inicial definido.');
    console.log('Migração concluída!');
  } catch (err) {
    console.error('Erro na migração:', err);
  } finally {
    await pool.end();
  }
}

migrate();
