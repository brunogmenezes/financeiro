const pool = require('./database');

async function addOnboardingColumn() {
  try {
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='usuarios' AND column_name='onboarding_completed'
    `);

    if (checkColumn.rows.length === 0) {
      await pool.query('ALTER TABLE usuarios ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE');
      console.log('✅ Coluna onboarding_completed adicionada com sucesso.');
    } else {
      console.log('ℹ️ Coluna onboarding_completed já existe.');
    }
  } catch (err) {
    console.error('❌ Erro ao adicionar coluna onboarding_completed:', err);
  } finally {
    process.exit();
  }
}

addOnboardingColumn();
