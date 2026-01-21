const pool = require('./database');

async function addPagoColumn() {
  try {
    // Adicionar coluna pago com valor padrão true (para manter comportamento antigo)
    await pool.query(`
      ALTER TABLE lancamentos 
      ADD COLUMN IF NOT EXISTS pago BOOLEAN DEFAULT true;
    `);

    console.log('✅ Coluna "pago" adicionada com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna:', error);
    process.exit(1);
  }
}

addPagoColumn();
