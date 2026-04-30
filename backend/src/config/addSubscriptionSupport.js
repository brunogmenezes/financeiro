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
    console.log('Iniciando migração para suporte a assinaturas...');
    
    // Adicionar colunas pro_expires_at e efi_id
    await pool.query(`
      ALTER TABLE usuarios 
      ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS efi_id VARCHAR(255);
    `);
    
    console.log('Colunas pro_expires_at e efi_id adicionadas com sucesso.');
    
    // Opcional: Atualizar usuários admin para terem expiração infinita (ex: ano 2099)
    await pool.query(`
      UPDATE usuarios 
      SET pro_expires_at = '2099-12-31 23:59:59' 
      WHERE is_admin = true;
    `);
    
    console.log('Usuários administradores atualizados com expiração vitalícia.');
    console.log('Migração concluída!');
  } catch (err) {
    console.error('Erro na migração:', err);
  } finally {
    await pool.end();
  }
}

migrate();
