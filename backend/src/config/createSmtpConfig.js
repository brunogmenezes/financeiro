require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const pool = require('./database');

async function createSmtpConfig() {
  try {
    // Criar tabela smtp_config
    await pool.query(`
      CREATE TABLE IF NOT EXISTS smtp_config (
        id SERIAL PRIMARY KEY,
        host VARCHAR(255) NOT NULL,
        port INTEGER NOT NULL,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        secure BOOLEAN DEFAULT TRUE,
        from_email VARCHAR(255) NOT NULL,
        from_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✔️ Tabela smtp_config criada com sucesso!');
    
    // Inserir configuração padrão se não existir
    const checkConfig = await pool.query('SELECT * FROM smtp_config LIMIT 1');
    
    if (checkConfig.rows.length === 0) {
      const host = 'smtp.titan.email';
      const port = 465;
      const username = '';
      const password = '';
      const secure = true;
      const from_email = '';
      const from_name = 'Controle Financeiro';
      
      await pool.query(
        'INSERT INTO smtp_config (host, port, username, password, secure, from_email, from_name) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [host, port, username, password, secure, from_email, from_name]
      );
      
      console.log('✔️ Configuração SMTP inicial inserida com sucesso!');
    } else {
      console.log('✔️ Configuração SMTP já existe no banco');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar configuração SMTP:', error);
    process.exit(1);
  }
}

createSmtpConfig();
