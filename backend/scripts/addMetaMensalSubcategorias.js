const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function runMigration() {
  try {
    await pool.query('ALTER TABLE subcategorias ADD COLUMN IF NOT EXISTS meta_mensal DECIMAL(10,2) DEFAULT NULL');
    console.log('Coluna meta_mensal adicionada com sucesso à tabela subcategorias!');
  } catch (err) {
    console.error('Erro ao rodar migração:', err);
  } finally {
    await pool.end();
  }
}

runMigration();
