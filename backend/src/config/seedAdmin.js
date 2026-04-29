const pool = require('./database');
const bcrypt = require('bcryptjs');

const seedAdmin = async () => {
  try {
    const username = 'admin';
    const rawPassword = '123@Mudar';
    const email = 'admin@local.com'; // Email fictício obrigatório
    const nome = 'Administrador';

    console.log(`🚀 Criando usuário ${username}...`);

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Verifica se já existe
    const exists = await pool.query('SELECT id FROM usuarios WHERE username = $1 OR email = $2', [username, email]);
    
    if (exists.rows.length > 0) {
      console.log('⚠️ Usuário admin ou email já existe. Atualizando dados...');
      await pool.query(
        'UPDATE usuarios SET senha = $1, is_admin = TRUE WHERE username = $2',
        [hashedPassword, username]
      );
    } else {
      await pool.query(
        'INSERT INTO usuarios (nome, email, senha, username, is_admin) VALUES ($1, $2, $3, $4, $5)',
        [nome, email, hashedPassword, username, true]
      );
    }

    console.log('✅ Admin configurado com sucesso!');
    console.log(`👤 Usuário: ${username}`);
    console.log(`🔑 Senha: ${rawPassword}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error);
    process.exit(1);
  }
};

seedAdmin();
