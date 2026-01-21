const pool = require('./database');

async function ensureOptionalColumns() {
  try {
    await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cor_tema VARCHAR(50) DEFAULT \'roxo\'');
    await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(30)');
    await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS evolution_instance_name VARCHAR(100)');
    await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS evolution_instance_token VARCHAR(255)');
  } catch (error) {
    console.error('Erro ao garantir colunas opcionais:', error.message);
  }
}

module.exports = { ensureOptionalColumns };
