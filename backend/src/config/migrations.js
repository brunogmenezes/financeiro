const pool = require('./database');

async function ensureOptionalColumns() {
  try {
    await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cor_tema VARCHAR(50) DEFAULT \'roxo\'');
    await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(30)');
    await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS evolution_instance_name VARCHAR(100)');
    await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS evolution_instance_token VARCHAR(255)');
    await pool.query('ALTER TABLE contas ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT \'Conta Corrente\'');
    
    // Atualizar check constraint de tipo na tabela lancamentos para incluir 'estorno'
    const constraintResult = await pool.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'lancamentos'::regclass AND contype = 'c';
    `);

    for (let row of constraintResult.rows) {
      if (row.conname.includes('tipo')) {
        await pool.query(`ALTER TABLE lancamentos DROP CONSTRAINT IF EXISTS ${row.conname}`);
      }
    }

    // Atualizar lançamentos de reembolso existentes se houver (sem a restrição temporariamente)
    await pool.query("UPDATE lancamentos SET tipo = 'estorno' WHERE tipo = 'reembolso'");

    await pool.query(`
      ALTER TABLE lancamentos 
      ADD CONSTRAINT lancamentos_tipo_check 
      CHECK (tipo IN ('entrada', 'saida', 'transferencia', 'neutro', 'pagamento_fatura', 'estorno'));
    `);
    
    console.log('✅ Migração de tipo estorno aplicada com sucesso na tabela lancamentos.');
  } catch (error) {
    console.error('Erro ao garantir colunas opcionais:', error.message);
  }
}

module.exports = { ensureOptionalColumns };

