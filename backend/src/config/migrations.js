const pool = require('./database');

async function ensureOptionalColumns() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS logs_envios (
        id SERIAL PRIMARY KEY,
        tipo VARCHAR(50) NOT NULL,
        destinatario VARCHAR(255) NOT NULL,
        assunto VARCHAR(255),
        mensagem TEXT NOT NULL,
        status VARCHAR(50) NOT NULL,
        erro TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lembretes (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        titulo VARCHAR(150) NOT NULL,
        descricao TEXT,
        data_hora TIMESTAMP NOT NULL,
        recorrencia VARCHAR(50) NOT NULL,
        ultimo_envio TIMESTAMP,
        status VARCHAR(20) DEFAULT 'ativo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

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
    
    // Garantir coluna recorrente na tabela lancamentos
    await pool.query('ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS recorrente BOOLEAN DEFAULT false');
    console.log('✅ Migração de coluna recorrente aplicada com sucesso na tabela lancamentos.');
  } catch (error) {
    console.error('Erro ao garantir colunas opcionais:', error.message);
  }
}

module.exports = { ensureOptionalColumns };

