const nodemailer = require('nodemailer');
const pool = require('../config/database');

async function getSmtpConfig() {
  const result = await pool.query('SELECT * FROM smtp_config LIMIT 1');
  if (!result.rows[0]) {
    throw new Error('Configuração SMTP não encontrada no banco de dados');
  }
  return result.rows[0];
}

async function logEnvio({ tipo, destinatario, assunto, mensagem, status, erro }) {
  try {
    await pool.query(
      'INSERT INTO logs_envios (tipo, destinatario, assunto, mensagem, status, erro) VALUES ($1, $2, $3, $4, $5, $6)',
      [tipo, destinatario, assunto || null, mensagem, status, erro || null]
    );
  } catch (e) {
    console.error('Erro ao salvar log de envio:', e.message);
  }
}

async function sendMail({ to, subject, text, html }) {
  const config = await getSmtpConfig();
  
  if (!config.host || !config.port || !config.username || !config.password) {
    throw new Error('Configurações de e-mail SMTP incompletas no banco de dados');
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure, // true para porta 465, false para outras
    auth: {
      user: config.username,
      pass: config.password,
    },
    tls: {
      // Necessário para evitar falhas de certificado autoassinado em alguns servidores SMTP
      rejectUnauthorized: false
    }
  });

  const systemUrl = config.system_url || 'http://localhost:3000';
  let processedHtml = html;
  let processedText = text;

  if (processedHtml) {
    processedHtml = processedHtml.replace(/http:\/\/localhost:3000/g, systemUrl);
  }
  if (processedText) {
    processedText = processedText.replace(/http:\/\/localhost:3000/g, systemUrl);
  }

  const mailOptions = {
    from: `"${config.from_name}" <${config.from_email || config.username}>`,
    to,
    subject,
    text: processedText,
    html: processedHtml,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    await logEnvio({
      tipo: 'email',
      destinatario: to,
      assunto: subject,
      mensagem: processedHtml || processedText,
      status: 'sucesso'
    });
    return info;
  } catch (error) {
    await logEnvio({
      tipo: 'email',
      destinatario: to,
      assunto: subject,
      mensagem: processedHtml || processedText,
      status: 'erro',
      erro: error.message
    });
    throw error;
  }
}

async function sendEmailTemplate({ to, templateSlug, variables }) {
  try {
    const result = await pool.query('SELECT subject, body, whatsapp_body FROM email_templates WHERE slug = $1', [templateSlug]);
    if (!result.rows[0]) {
      throw new Error(`Template de e-mail com slug '${templateSlug}' não encontrado`);
    }
    
    let { subject, body, whatsapp_body } = result.rows[0];
    
    // Obter URL do sistema
    let systemUrl = 'https://financeiro.netsolutions.com.br';
    try {
      const config = await getSmtpConfig();
      if (config.system_url) systemUrl = config.system_url;
    } catch (e) {
      if (process.env.SYSTEM_URL) systemUrl = process.env.SYSTEM_URL;
    }

    const mergedVariables = {
      url_sistema: systemUrl,
      ...variables
    };

    // Substituir as variáveis do template
    if (mergedVariables) {
      for (const [key, value] of Object.entries(mergedVariables)) {
        const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        subject = subject.replace(placeholder, value || '');
        body = body.replace(placeholder, value || '');
        if (whatsapp_body) {
          whatsapp_body = whatsapp_body.replace(placeholder, value || '');
        }
      }
    }
    
    // Enviar WhatsApp se houver whatsapp_body configurado e o usuário tiver número de WhatsApp
    if (whatsapp_body) {
      let whatsappNumber = null;
      try {
        const userResult = await pool.query('SELECT whatsapp FROM usuarios WHERE email = $1 LIMIT 1', [to]);
        whatsappNumber = userResult.rows[0]?.whatsapp;
        
        if (whatsappNumber && whatsappNumber.trim() !== '') {
          whatsapp_body = whatsapp_body.replace(/http:\/\/localhost:3000/g, systemUrl);

          const { sendText, getConnectionState } = require('./evolutionService');
          await getConnectionState();
          await sendText(whatsappNumber, whatsapp_body);
          
          await logEnvio({
            tipo: 'whatsapp',
            destinatario: whatsappNumber,
            mensagem: whatsapp_body,
            status: 'sucesso'
          });

          console.log(`✔️ WhatsApp de template '${templateSlug}' enviado com sucesso para ${whatsappNumber}`);
        }
      } catch (waError) {
        console.error(`❌ Erro ao enviar WhatsApp do template '${templateSlug}' para ${to}:`, waError.message);
        await logEnvio({
          tipo: 'whatsapp',
          destinatario: whatsappNumber || to,
          mensagem: whatsapp_body || `Template: ${templateSlug}`,
          status: 'erro',
          erro: waError.message
        });
      }
    }
    
    return await sendMail({
      to,
      subject,
      html: body,
      text: body.replace(/<[^>]*>/g, '') // Versão simples em texto plano
    });
  } catch (error) {
    console.error(`❌ Erro ao enviar e-mail de template '${templateSlug}' para ${to}:`, error.message);
    await logEnvio({
      tipo: 'email',
      destinatario: to,
      assunto: `Template: ${templateSlug}`,
      mensagem: `Erro ao renderizar template: ${templateSlug}`,
      status: 'erro',
      erro: error.message
    });
    return null; // Retorna null para evitar quebrar o cadastro ou logins se o SMTP falhar
  }
}

module.exports = {
  getSmtpConfig,
  sendMail,
  sendEmailTemplate,
  logEnvio
};
