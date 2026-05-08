const pool = require('./database');

async function upgradeDatabase() {
  try {
    console.log('🔄 Iniciando atualização do banco de dados para suporte a Pagamento de Fatura...');

    // 1. Alterar restrição de check na tabela lancamentos
    console.log('--- Atualizando tipos de lançamentos...');
    
    // Primeiro tentamos encontrar o nome da constraint
    const constraintResult = await pool.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'lancamentos'::regclass AND contype = 'c';
    `);

    for (let row of constraintResult.rows) {
      if (row.conname.includes('tipo')) {
        await pool.query(`ALTER TABLE lancamentos DROP CONSTRAINT ${row.conname}`);
      }
    }

    // Adicionar a nova constraint com 'pagamento_fatura'
    await pool.query(`
      ALTER TABLE lancamentos 
      ADD CONSTRAINT lancamentos_tipo_check 
      CHECK (tipo IN ('entrada', 'saida', 'transferencia', 'neutro', 'pagamento_fatura'));
    `);

    console.log('✅ Atualização concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na atualização:', error);
    process.exit(1);
  }
}

upgradeDatabase();
