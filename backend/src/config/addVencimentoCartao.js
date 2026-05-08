const pool = require('./database');

async function upgradeContas() {
  try {
    console.log('🔄 Iniciando atualização da tabela contas para adicionar dia de vencimento...');

    const columnExists = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contas' AND column_name = 'dia_vencimento';
    `);

    if (columnExists.rows.length === 0) {
      await pool.query(`
        ALTER TABLE contas 
        ADD COLUMN dia_vencimento INTEGER;
      `);
      console.log('✅ Coluna dia_vencimento adicionada!');
    } else {
      console.log('✅ Coluna dia_vencimento já existe!');
    }

    console.log('✅ Atualização concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na atualização:', error);
    process.exit(1);
  }
}

upgradeContas();
