const pool = require('./database');

const migrate = async () => {
  try {
    console.log('🔄 Iniciando migração para Categorias Globais...');

    // 1. Criar tabela para armazenar os limites (metas) por usuário
    await pool.query(`
      CREATE TABLE IF NOT EXISTS limites_usuarios (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        categoria_id INTEGER REFERENCES categorias(id) ON DELETE CASCADE,
        subcategoria_id INTEGER REFERENCES subcategorias(id) ON DELETE CASCADE,
        valor_limite DECIMAL(10, 2) DEFAULT 0,
        UNIQUE(usuario_id, categoria_id),
        UNIQUE(usuario_id, subcategoria_id)
      );
    `);
    console.log('✅ Tabela limites_usuarios criada.');

    // 2. Migrar limites atuais (metas) para a nova tabela antes de remover as colunas
    // Nota: Isso preserva as metas que os usuários já tinham configurado
    await pool.query(`
      INSERT INTO limites_usuarios (usuario_id, categoria_id, valor_limite)
      SELECT usuario_id, id, meta_mensal FROM categorias WHERE meta_mensal > 0
      ON CONFLICT DO NOTHING;
    `);
    
    await pool.query(`
      INSERT INTO limites_usuarios (usuario_id, subcategoria_id, valor_limite)
      SELECT c.usuario_id, s.id, s.meta_mensal 
      FROM subcategorias s
      JOIN categorias c ON s.categoria_id = c.id
      WHERE s.meta_mensal > 0
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Metas migradas para limites_usuarios.');

    // 3. Tornar categorias globais (remover usuario_id e meta_mensal das tabelas originais)
    // Primeiro, removemos as restrições que dependem dessas colunas se necessário, 
    // mas aqui apenas alteraremos a lógica no código. No DB, vamos apenas remover a obrigatoriedade.
    await pool.query(`
      ALTER TABLE categorias ALTER COLUMN usuario_id DROP NOT NULL;
      ALTER TABLE categorias DROP COLUMN IF EXISTS meta_mensal;
      ALTER TABLE subcategorias DROP COLUMN IF EXISTS meta_mensal;
    `);
    
    // Opcional: Atribuir categorias órfãs (sem usuario_id) como globais
    await pool.query('UPDATE categorias SET usuario_id = NULL');

    console.log('✅ Categorias agora são globais!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração de categorias:', error);
    process.exit(1);
  }
};

migrate();
