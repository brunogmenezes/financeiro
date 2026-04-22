const pool = require('./database');

async function upgradeContas() {
  try {
    console.log('🔄 Iniciando atualização da tabela contas para suporte a Cartão de Crédito...');

    // 1. Alterar restrição de check na tabela contas
    console.log('--- Atualizando tipos de contas...');
    const constraintResult = await pool.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'contas'::regclass AND contype = 'c';
    `);

    for (let row of constraintResult.rows) {
      if (row.conname.includes('tipo')) {
        await pool.query(`ALTER TABLE contas DROP CONSTRAINT ${row.conname}`);
      }
    }

    await pool.query(`
      ALTER TABLE contas 
      ADD CONSTRAINT contas_tipo_check 
      CHECK (tipo IN ('Conta Corrente', 'Conta Poupança', 'Conta Investimento', 'Cartão de Crédito', 'Dinheiro'));
    `);

    // 2. Adicionar coluna limite_total
    console.log('--- Adicionando coluna limite_total...');
    const columnExists = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contas' AND column_name = 'limite_total';
    `);

    if (columnExists.rows.length === 0) {
      await pool.query(`
        ALTER TABLE contas 
        ADD COLUMN limite_total DECIMAL(10, 2) DEFAULT 0;
      `);
      console.log('✅ Coluna limite_total adicionada!');
    } else {
      console.log('✅ Coluna limite_total já existe!');
    }

    console.log('✅ Atualização concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na atualização:', error);
    process.exit(1);
  }
}

upgradeContas();
