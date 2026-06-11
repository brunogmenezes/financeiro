const nodemailer = require('nodemailer');
const pool = require('../config/database');

async function getSmtpConfig() {
  const result = await pool.query('SELECT * FROM smtp_config LIMIT 1');
  if (!result.rows[0]) {
    throw new Error('Configuração SMTP não encontrada no banco de dados');
  }
  return result.rows[0];
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

  const info = await transporter.sendMail(mailOptions);
  return info;
}

async function sendEmailTemplate({ to, templateSlug, variables }) {
  try {
    const result = await pool.query('SELECT subject, body FROM email_templates WHERE slug = $1', [templateSlug]);
    if (!result.rows[0]) {
      throw new Error(`Template de e-mail com slug '${templateSlug}' não encontrado`);
    }
    
    let { subject, body } = result.rows[0];
    
    // Substituir as variáveis do template
    if (variables) {
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        subject = subject.replace(placeholder, value || '');
        body = body.replace(placeholder, value || '');
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
    return null; // Retorna null para evitar quebrar o cadastro ou logins se o SMTP falhar
  }
}

module.exports = {
  getSmtpConfig,
  sendMail,
  sendEmailTemplate
};
