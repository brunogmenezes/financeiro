const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const pool = require('../config/database');
const { sendText, getConnectionState } = require('./evolutionService');

const TZ = process.env.REMINDER_TZ || 'America/Sao_Paulo';
const REMINDER_HOUR = process.env.REMINDER_HOUR || '09:00';
const [HOUR, MIN] = REMINDER_HOUR.split(':').map((v) => parseInt(v, 10));

let lastRunDateKey = null;

function nowInTZ() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
}

function formatDateBR(date) {
  return date.toLocaleDateString('pt-BR');
}

function formatMoney(value) {
  return `R$ ${Number(value).toFixed(2)}`;
}

async function fetchPending(targetDateISO) {
  const result = await pool.query(
    `SELECT l.id, l.descricao, l.valor, l.data, u.whatsapp, u.nome as usuario_nome, c.nome as conta_nome
     FROM lancamentos l
     JOIN usuarios u ON u.id = l.usuario_id
     LEFT JOIN contas c ON c.id = l.conta_id
     WHERE l.tipo = 'saida' 
       AND (l.pago = false OR l.pago IS NULL)
       AND l.data = $1
       AND u.whatsapp IS NOT NULL
       AND u.whatsapp <> ''`,
    [targetDateISO]
  );
  return result.rows;
}

async function sendReminder(reminderDate) {
  const isoDate = reminderDate.toISOString().slice(0, 10);
  const pendentes = await fetchPending(isoDate);
  if (!pendentes.length) return;

  // Verificar conexão uma vez antes de enviar
  try {
    await getConnectionState();
  } catch (error) {
    console.error(`Erro ao verificar conexão Evolution:`, error.message);
    return;
  }

  for (const lanc of pendentes) {
    try {
      const message = [
        `Oi ${lanc.usuario_nome || ''}!`,
        `Lembrete: ${lanc.descricao}`,
        `Valor: ${formatMoney(lanc.valor)}`,
        `Vencimento: ${formatDateBR(new Date(lanc.data))}`,
        lanc.conta_nome ? `Conta: ${lanc.conta_nome}` : null,
        'Status: não pago',
        '',
        'Marque como pago no Financeiro se já quitou.'
      ].filter(Boolean).join('\n');

      await sendText(lanc.whatsapp, message);
      console.log(`✔️ Lembrete enviado para ${lanc.whatsapp} (lançamento ${lanc.id})`);
    } catch (error) {
      console.error(`Erro ao enviar lembrete para ${lanc.whatsapp}:`, error.message);
    }
  }
}

async function sendAutomatedEmails() {
  console.log('⏰ Iniciando verificação de e-mails automatizados diários...');
  
  // 1. E-mail de Inatividade (Exatamente 15 dias sem login/atividade)
  try {
    const inactivityResult = await pool.query(
      `SELECT nome, email FROM usuarios 
       WHERE DATE(COALESCE(ultima_atividade, created_at)) = CURRENT_DATE - INTERVAL '15 days'`
    );
    if (inactivityResult.rows.length > 0) {
      console.log(`🔍 Inatividade: ${inactivityResult.rows.length} usuário(s) elegível(is).`);
      const { sendEmailTemplate } = require('./emailService');
      for (const u of inactivityResult.rows) {
        await sendEmailTemplate({
          to: u.email,
          templateSlug: 'inactivity',
          variables: { nome: u.nome, dias_inativo: '15' }
        });
        console.log(`✉️ E-mail de inatividade enviado para ${u.email}`);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar e-mails de inatividade:', error.message);
  }
  
  // 2. E-mail de Aviso de Vencimento de Assinatura (Exatamente 3 dias antes)
  try {
    const expirationResult = await pool.query(
      `SELECT nome, email, pro_expires_at FROM usuarios 
       WHERE is_pro = true 
         AND DATE(pro_expires_at) = CURRENT_DATE + INTERVAL '3 days'`
    );
    if (expirationResult.rows.length > 0) {
      console.log(`🔍 Vencimento de Assinatura: ${expirationResult.rows.length} usuário(s) elegível(is).`);
      const { sendEmailTemplate } = require('./emailService');
      for (const u of expirationResult.rows) {
        const dataFormatada = new Date(u.pro_expires_at).toLocaleDateString('pt-BR');
        await sendEmailTemplate({
          to: u.email,
          templateSlug: 'expiration',
          variables: { 
            nome: u.nome, 
            data_vencimento: dataFormatada, 
            dias_restantes: '3' 
          }
        });
        console.log(`✉️ E-mail de aviso de vencimento enviado para ${u.email}`);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar e-mails de vencimento de assinatura:', error.message);
  }
}

function startReminderScheduler() {
  console.log(`⏰ Agendador de lembretes ativo para ${REMINDER_HOUR} (${TZ})`);
  setInterval(async () => {
    const now = nowInTZ();
    if (now.getHours() === HOUR && now.getMinutes() === MIN) {
      const todayKey = now.toISOString().slice(0, 10);
      if (lastRunDateKey === todayKey) return;
      lastRunDateKey = todayKey;

      try {
        await sendReminder(now);
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        await sendReminder(tomorrow);
        
        // Enviar e-mails diários de inatividade e vencimento
        await sendAutomatedEmails();
      } catch (error) {
        console.error('Erro no agendador de lembretes:', error.message);
      }
    }
  }, 60 * 1000);
}

module.exports = { startReminderScheduler, sendReminder, sendAutomatedEmails };
