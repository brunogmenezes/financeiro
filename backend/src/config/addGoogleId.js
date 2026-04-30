const pool = require('./database');

async function addGoogleIdColumn() {
  try {
    // Verificar se a coluna já existe
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='usuarios' AND column_name='google_id'
    `);

    if (checkColumn.rows.length === 0) {
      await pool.query('ALTER TABLE usuarios ADD COLUMN google_id VARCHAR(255) UNIQUE');
      console.log('✅ Coluna google_id adicionada com sucesso à tabela usuarios.');
    } else {
      console.log('ℹ️ Coluna google_id já existe.');
    }
  } catch (err) {
    console.error('❌ Erro ao adicionar coluna google_id:', err);
  } finally {
    process.exit();
  }
}

addGoogleIdColumn();
