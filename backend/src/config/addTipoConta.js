const pool = require('./database');

async function addTipoConta() {
  try {
    console.log('🔄 Adicionando coluna tipo na tabela contas...');

    // Verificar se a coluna já existe
    const columnExists = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contas' AND column_name = 'tipo';
    `);

    if (columnExists.rows.length === 0) {
      // Adicionar coluna tipo
      await pool.query(`
        ALTER TABLE contas 
        ADD COLUMN tipo VARCHAR(50) DEFAULT 'Conta Corrente' 
        CHECK (tipo IN ('Conta Corrente', 'Conta Poupança', 'Conta Investimento'));
      `);

      // Atualizar contas existentes para ter tipo padrão
      await pool.query(`
        UPDATE contas 
        SET tipo = 'Conta Corrente' 
        WHERE tipo IS NULL;
      `);

      console.log('✅ Coluna tipo adicionada com sucesso na tabela contas!');
    } else {
      console.log('✅ Coluna tipo já existe na tabela contas!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna tipo:', error);
    process.exit(1);
  }
}

addTipoConta();
