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
    console.log('Criando tabela de histórico de pagamentos...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pagamentos_assinatura (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        txid VARCHAR(255) NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        data_pagamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        validade_ate TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'CONCLUIDA'
      );
    `);
    
    console.log('Tabela pagamentos_assinatura criada com sucesso.');
    console.log('Migração concluída!');
  } catch (err) {
    console.error('Erro na migração:', err);
  } finally {
    await pool.end();
  }
}

migrate();
