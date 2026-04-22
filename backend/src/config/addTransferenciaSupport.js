const pool = require('./database');

async function upgradeDatabase() {
  try {
    console.log('🔄 Iniciando atualização do banco de dados para suporte a transferências...');

    // 1. Alterar restrição de check na tabela lancamentos
    console.log('--- Atualizando tipos de lançamentos...');
    // No PostgreSQL, para alterar um CHECK constraint, precisamos removê-lo e criá-lo novamente
    
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

    // Adicionar a nova constraint com 'transferencia' e 'neutro'
    await pool.query(`
      ALTER TABLE lancamentos 
      ADD CONSTRAINT lancamentos_tipo_check 
      CHECK (tipo IN ('entrada', 'saida', 'transferencia', 'neutro'));
    `);

    // 2. Adicionar coluna conta_destino_id
    console.log('--- Adicionando coluna conta_destino_id...');
    const columnExists = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'lancamentos' AND column_name = 'conta_destino_id';
    `);

    if (columnExists.rows.length === 0) {
      await pool.query(`
        ALTER TABLE lancamentos 
        ADD COLUMN conta_destino_id INTEGER REFERENCES contas(id) ON DELETE SET NULL;
      `);
      console.log('✅ Coluna conta_destino_id adicionada!');
    } else {
      console.log('✅ Coluna conta_destino_id já existe!');
    }

    // 3. Adicionar coluna pago se não existir (vi no frontend mas quero garantir)
    console.log('--- Verificando coluna pago...');
    const pagoExists = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'lancamentos' AND column_name = 'pago';
    `);

    if (pagoExists.rows.length === 0) {
      await pool.query(`
        ALTER TABLE lancamentos 
        ADD COLUMN pago BOOLEAN DEFAULT TRUE;
      `);
      console.log('✅ Coluna pago adicionada!');
    }

    console.log('✅ Atualização concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na atualização:', error);
    process.exit(1);
  }
}

upgradeDatabase();
