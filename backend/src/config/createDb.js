const { Client } = require('pg');
require('dotenv').config();

const createDatabase = async () => {
  // Conectar ao banco postgres padrão
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: 'postgres', // Conecta ao banco padrão
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('🔄 Verificando se o banco de dados existe...');

    // Verificar se o banco já existe
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [process.env.DB_NAME]
    );

    if (result.rows.length === 0) {
      // Criar o banco de dados
      await client.query(`CREATE DATABASE ${process.env.DB_NAME}`);
      console.log(`✅ Banco de dados '${process.env.DB_NAME}' criado com sucesso!`);
    } else {
      console.log(`✅ Banco de dados '${process.env.DB_NAME}' já existe!`);
    }

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar banco de dados:', error.message);
    await client.end();
    process.exit(1);
  }
};

createDatabase();
