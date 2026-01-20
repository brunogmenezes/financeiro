const pool = require('./database');

const createTables = async () => {
  try {
    console.log('🔄 Criando tabelas...');

    // Tabela de usuários
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabela de contas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        descricao TEXT,
        saldo_inicial DECIMAL(10, 2) DEFAULT 0,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabela de lançamentos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lancamentos (
        id SERIAL PRIMARY KEY,
        descricao VARCHAR(255) NOT NULL,
        valor DECIMAL(10, 2) NOT NULL,
        tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
        data DATE NOT NULL,
        conta_id INTEGER REFERENCES contas(id) ON DELETE CASCADE,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Tabelas criadas com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
    process.exit(1);
  }
};

createTables();
