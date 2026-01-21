require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const pool = require('./database');

async function createEvolutionConfig() {
  try {
    // Criar tabela evolution_config
    await pool.query(`
      CREATE TABLE IF NOT EXISTS evolution_config (
        id SERIAL PRIMARY KEY,
        url VARCHAR(255) NOT NULL,
        instancia VARCHAR(100) NOT NULL,
        token VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✔️ Tabela evolution_config criada com sucesso!');
    
    // Inserir configuração padrão se não existir
    const checkConfig = await pool.query('SELECT * FROM evolution_config LIMIT 1');
    
    if (checkConfig.rows.length === 0) {
      const url = process.env.EVOLUTION_BASE_URL;
      const instancia = process.env.EVOLUTION_INSTANCE;
      const token = process.env.EVOLUTION_API_KEY;
      
      await pool.query(
        'INSERT INTO evolution_config (url, instancia, token) VALUES ($1, $2, $3)',
        [url, instancia, token]
      );
      
      console.log('✔️ Configuração Evolution inserida com sucesso!');
      console.log(`   URL: ${url}`);
      console.log(`   Instância: ${instancia}`);
    } else {
      console.log('✔️ Configuração Evolution já existe no banco');
    }
    
    // Remover colunas antigas da tabela usuarios
    await pool.query(`
      ALTER TABLE usuarios 
      DROP COLUMN IF EXISTS evolution_instance_name,
      DROP COLUMN IF EXISTS evolution_instance_token
    `);
    
    console.log('✔️ Colunas antigas removidas da tabela usuarios');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar configuração Evolution:', error);
    process.exit(1);
  }
}

createEvolutionConfig();
