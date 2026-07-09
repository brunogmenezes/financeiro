require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const pool = require('./database');

async function createEmailTemplates() {
  try {
    // Criar tabela email_templates
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        slug VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        variables JSONB NOT NULL,
        whatsapp_body TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Garantir que a coluna whatsapp_body exista caso a tabela já tenha sido criada anteriormente
    await pool.query('ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS whatsapp_body TEXT');
    
    console.log('✔️ Tabela email_templates criada/atualizada com sucesso!');
    
    // Lista de templates iniciais
    const templates = [
      {
        slug: 'test',
        name: 'E-mail de Teste',
        subject: 'Teste de Configuração SMTP 📩',
        variables: JSON.stringify(['nome', 'data_hora']),
        whatsapp_body: 'Olá, *{{nome}}*! 👋\n\nEste é uma mensagem de teste da sua integração de WhatsApp com o Financeiro. Tudo funcionando perfeitamente! ✅\n\nData/Hora: {{data_hora}}',
        body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
  <h2 style="color: #6a1b9a; text-align: center;">Conexão SMTP Estabelecida! 🎉</h2>
  <p>Olá, <strong>{{nome}}</strong>!</p>
  <p>Este é um e-mail de teste enviado para validar as configurações SMTP no seu portal Manager.</p>
  <p style="background-color: #f3e5f5; padding: 15px; border-left: 4px solid #8e24aa; border-radius: 4px; font-weight: bold; color: #4a148c; margin: 20px 0;">
    Se você recebeu esta mensagem, significa que suas configurações com a HostGator Titan estão funcionando perfeitamente! ✅
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
  <p style="font-size: 12px; color: #888; text-align: center;">
    Data/Hora do envio: {{data_hora}} <br>
    Controle Financeiro Prospera
  </p>
</div>`
      },
      {
        slug: 'expiration',
        name: 'Aviso de Vencimento de Assinatura',
        subject: 'Aviso Importante: Sua assinatura vence em breve 💎',
        variables: JSON.stringify(['nome', 'data_vencimento', 'dias_restantes']),
        whatsapp_body: 'Olá, *{{nome}}*! 👋\n\nNotamos que sua assinatura PRO está prestes a expirar. 💎\n\nDias restantes: *{{dias_restantes}}*\nData de vencimento: *{{data_vencimento}}*\n\nEvite interrupções e continue organizando suas finanças com recursos premium!\n\n🔗 http://localhost:3000',
        body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
  <h2 style="color: #e65100; text-align: center;">Sua assinatura vence em breve! ⚠️</h2>
  <p>Olá, <strong>{{nome}}</strong>,</p>
  <p>Esperamos que você esteja aproveitando ao máximo todos os recursos PRO do <strong>Controle Financeiro Prospera</strong>.</p>
  <p>Gostaríamos de lembrar que sua assinatura expira em <strong>{{dias_restantes}} dias</strong>, no dia <strong>{{data_vencimento}}</strong>.</p>
  <div style="background-color: #fff3e0; padding: 15px; border-left: 4px solid #ffb74d; border-radius: 4px; color: #e65100; margin: 20px 0; font-weight: 500;">
    Para continuar controlando suas finanças com recursos avançados de forma ininterrupta, realize o pagamento da sua fatura acessando a página de assinaturas no painel do sistema.
  </div>
  <p style="text-align: center; margin: 25px 0;">
    <a href="http://localhost:3000/assinatura" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Renovar Minha Assinatura 💎</a>
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
  <p style="font-size: 12px; color: #888; text-align: center;">
    Se você já realizou o pagamento, por favor desconsidere este aviso. <br>
    Controle Financeiro Prospera
  </p>
</div>`
      },
      {
        slug: 'inactivity',
        name: 'Aviso de Inatividade de Usuário',
        subject: 'Sentimos sua falta no Prospera! 🥺',
        variables: JSON.stringify(['nome', 'dias_inativo']),
        whatsapp_body: 'Olá, *{{nome}}*! 👋\n\nSentimos sua falta no sistema de controle financeiro. 🥺\n\nVocê não realiza novos lançamentos ou acessa o painel há *{{dias_inativo}} dias*.\n\nQue tal dedicar 5 minutinhos hoje para manter seu orçamento atualizado?\n\n🔗 http://localhost:3000',
        body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
  <h2 style="color: #7c3aed; text-align: center;">Sentimos sua falta! 💜</h2>
  <p>Olá, <strong>{{nome}}</strong>,</p>
  <p>Notamos que você não acessa o seu painel do <strong>Controle Financeiro Prospera</strong> há <strong>{{dias_inativo}} dias</strong>.</p>
  <p>Organizar suas finanças regularmente é o segredo para manter o orçamento equilibrado e alcançar seus objetivos financeiros.</p>
  <p style="background-color: #f3e5f5; padding: 15px; border-left: 4px solid #8e24aa; border-radius: 4px; color: #4a148c; margin: 20px 0;">
    Que tal reservar 5 minutinhos hoje para atualizar seus lançamentos e ver como está a sua saúde financeira este mês?
  </p>
  <p style="text-align: center; margin: 25px 0;">
    <a href="http://localhost:3000" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Acessar Meu Painel 🚀</a>
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
  <p style="font-size: 12px; color: #888; text-align: center;">
    Dúvidas ou feedbacks? Responda a este e-mail, adoraríamos ouvir você! <br>
    Controle Financeiro Prospera
  </p>
</div>`
      },
      {
        slug: 'welcome',
        name: 'Boas-vindas (Novo Usuário)',
        subject: 'Bem-vindo ao Prospera! 🚀',
        variables: JSON.stringify(['nome', 'email']),
        whatsapp_body: 'Olá, *{{nome}}*! 👋\n\nBem-vindo ao *Controle Financeiro Prospera*! 🚀\n\nA partir de agora, você tem acesso a ferramentas completas de organização, dashboards inteligentes e controle de contas.\n\nSeu e-mail cadastrado: {{email}}\n\n🔗 http://localhost:3000',
        body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
  <h2 style="color: #6a1b9a; text-align: center;">Bem-vindo ao Prospera! 🚀</h2>
  <p>Olá, <strong>{{nome}}</strong>!</p>
  <p>É uma grande alegria ter você conosco na nossa plataforma de organização e inteligência financeira.</p>
  <p>A partir de agora, você tem acesso a ferramentas incríveis para:</p>
  <ul style="color: #334155; line-height: 1.6;">
    <li>Gerenciar múltiplas contas bancárias em um único lugar.</li>
    <li>Categorizar seus lançamentos de receitas e despesas.</li>
    <li>Analisar faturas automaticamente e gerar relatórios visuais.</li>
    <li>Criar orçamentos e planejar suas metas mensais.</li>
  </ul>
  <div style="background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4caf50; border-radius: 4px; color: #1b5e20; margin: 20px 0; font-weight: bold;">
    Dica de Ouro: Cadastre suas contas hoje mesmo e faça seus primeiros lançamentos para ver a mágica do dashboard acontecer! 📊
  </div>
  <p style="text-align: center; margin: 25px 0;">
    <a href="http://localhost:3000" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Começar Agora 💸</a>
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
  <p style="font-size: 12px; color: #888; text-align: center;">
    Sua conta foi registrada com o e-mail: <strong>{{email}}</strong>. <br>
    Controle Financeiro Prospera
  </p>
</div>`
      }
    ];
    
    // Inserir cada template se não existir ou atualizar whatsapp_body se for nulo
    for (const t of templates) {
      const check = await pool.query('SELECT slug FROM email_templates WHERE slug = $1', [t.slug]);
      if (check.rows.length === 0) {
        await pool.query(
          'INSERT INTO email_templates (slug, name, subject, body, variables, whatsapp_body) VALUES ($1, $2, $3, $4, $5, $6)',
          [t.slug, t.name, t.subject, t.body, t.variables, t.whatsapp_body]
        );
        console.log(`✔️ Template "${t.slug}" inserido com sucesso!`);
      } else {
        // Se já existe mas whatsapp_body estiver nulo, atualiza com o valor padrão
        const checkWhatsapp = await pool.query('SELECT whatsapp_body FROM email_templates WHERE slug = $1', [t.slug]);
        if (!checkWhatsapp.rows[0].whatsapp_body && t.whatsapp_body) {
          await pool.query('UPDATE email_templates SET whatsapp_body = $1 WHERE slug = $2', [t.whatsapp_body, t.slug]);
          console.log(`✔️ WhatsApp body padrão atualizado para template "${t.slug}"`);
        }
        console.log(`⚠️ Template "${t.slug}" já existe.`);
      }
    }
    
    if (require.main === module) {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Erro ao criar templates de e-mail:', error);
    if (require.main === module) {
      process.exit(1);
    }
    throw error;
  }
}

if (require.main === module) {
  createEmailTemplates();
}

module.exports = { createEmailTemplates };
