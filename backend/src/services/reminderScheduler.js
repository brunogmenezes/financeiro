const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const pool = require('../config/database');
const { sendText, getConnectionState } = require('./evolutionService');
const { logEnvio } = require('./emailService');

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
       AND u.whatsapp <> ''
       AND (c.tipo IS NULL OR c.tipo <> 'Cartão de Crédito')`,
    [targetDateISO]
  );
  return result.rows;
}

async function fetchOverdueCreditCards(reminderDate) {
  const result = await pool.query(
    `SELECT c.id, c.nome as conta_nome, c.dia_vencimento, u.id as usuario_id, u.nome as usuario_nome, u.whatsapp
     FROM contas c
     JOIN usuarios u ON u.id = c.usuario_id
     WHERE c.tipo = 'Cartão de Crédito'
       AND c.dia_vencimento = $1
       AND u.whatsapp IS NOT NULL
       AND u.whatsapp <> ''`,
    [reminderDate.getDate()]
  );
  
  const overdueCards = [];
  for (const card of result.rows) {
    const lancs = await pool.query(
      `SELECT l.tipo, l.valor, l.conta_id, l.conta_destino_id
       FROM lancamentos l
       WHERE (l.conta_id = $1 OR (l.tipo = 'pagamento_fatura' AND l.conta_destino_id = $1))
         AND EXTRACT(YEAR FROM l.data) = $2
         AND EXTRACT(MONTH FROM l.data) = $3`,
      [card.id, reminderDate.getFullYear(), reminderDate.getMonth() + 1]
    );

    let totalGasto = 0;
    let totalPago = 0;

    for (const l of lancs.rows) {
      const valor = parseFloat(l.valor);
      if (l.tipo === 'saida' && Number(l.conta_id) === Number(card.id)) {
        totalGasto += valor;
      } else if (l.tipo === 'estorno' && Number(l.conta_id) === Number(card.id)) {
        totalGasto -= valor;
      } else if (l.tipo === 'entrada' && Number(l.conta_id) === Number(card.id)) {
        totalPago += valor;
      } else if (l.tipo === 'pagamento_fatura' && Number(l.conta_destino_id) === Number(card.id)) {
        totalPago += valor;
      }
    }

    const saldoRestante = Math.round((totalGasto - totalPago) * 100) / 100;
    if (saldoRestante > 0.01) {
      overdueCards.push({
        ...card,
        totalGasto,
        totalPago,
        saldoRestante
      });
    }
  }

  return overdueCards;
}

async function sendReminder(reminderDate) {
  const isoDate = reminderDate.toISOString().slice(0, 10);
  const pendentes = await fetchPending(isoDate);
  const creditCards = await fetchOverdueCreditCards(reminderDate);

  if (!pendentes.length && !creditCards.length) return;

  // Verificar conexão uma vez antes de enviar
  try {
    await getConnectionState();
  } catch (error) {
    console.error(`Erro ao verificar conexão Evolution:`, error.message);
    return;
  }

  const today = nowInTZ();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = reminderDate.getDate() === today.getDate() &&
                  reminderDate.getMonth() === today.getMonth() &&
                  reminderDate.getFullYear() === today.getFullYear();

  const isTomorrow = reminderDate.getDate() === tomorrow.getDate() &&
                     reminderDate.getMonth() === tomorrow.getMonth() &&
                     reminderDate.getFullYear() === tomorrow.getFullYear();

  let statusVencimento = formatDateBR(reminderDate);
  if (isToday) statusVencimento = 'Hoje';
  else if (isTomorrow) statusVencimento = 'Amanhã';

  const emojiVencimento = isToday ? '⚠️' : '⏰';
  const systemUrl = process.env.SYSTEM_URL || 'https://financeiro.netsolutions.com.br';

  // Enviar lembretes individuais (não-cartões)
  for (const lanc of pendentes) {
    let message = '';
    try {
      const saudacao = lanc.usuario_nome ? `Olá, *${lanc.usuario_nome}*! 👋` : 'Olá! 👋';
      message = [
        saudacao,
        '',
        `*Lembrete de Vencimento (${statusVencimento})* ${emojiVencimento}`,
        `📌 *Descrição:* ${lanc.descricao}`,
        `💰 *Valor:* ${formatMoney(lanc.valor)}`,
        `📅 *Vencimento:* ${formatDateBR(new Date(lanc.data))}`,
        lanc.conta_nome ? `🏦 *Conta:* ${lanc.conta_nome}` : null,
        `🔴 *Status:* Não pago`,
        '',
        `Marque como pago no sistema se já quitou:`,
        `🔗 ${systemUrl}`
      ].filter(Boolean).join('\n');

      await sendText(lanc.whatsapp, message);
      await logEnvio({
        tipo: 'whatsapp',
        destinatario: lanc.whatsapp,
        mensagem: message,
        status: 'sucesso'
      });
      console.log(`✔️ Lembrete enviado para ${lanc.whatsapp} (lançamento ${lanc.id})`);
    } catch (error) {
      await logEnvio({
        tipo: 'whatsapp',
        destinatario: lanc.whatsapp,
        mensagem: message || `Lembrete: ${lanc.descricao}`,
        status: 'erro',
        erro: error.message
      });
      console.error(`Erro ao enviar lembrete para ${lanc.whatsapp}:`, error.message);
    }
  }

  // Enviar lembretes consolidados de cartão de crédito
  for (const card of creditCards) {
    let message = '';
    try {
      const saudacao = card.usuario_nome ? `Olá, *${card.usuario_nome}*! 👋` : 'Olá! 👋';
      const vencimentoDate = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), card.dia_vencimento);
      message = [
        saudacao,
        '',
        `*Vencimento do Cartão (${statusVencimento})* ${emojiVencimento}`,
        `💳 *Cartão:* ${card.conta_nome}`,
        `📅 *Vencimento:* ${formatDateBR(vencimentoDate)}`,
        `💰 *Valor Total da Fatura:* ${formatMoney(card.totalGasto)}`,
        `✅ *Valor Já Pago:* ${formatMoney(card.totalPago)}`,
        `💵 *Saldo em Aberto (A Pagar):* *${formatMoney(card.saldoRestante)}*`,
        '',
        `Marque o pagamento da fatura no sistema se já quitou:`,
        `🔗 ${systemUrl}`
      ].join('\n');

      await sendText(card.whatsapp, message);
      await logEnvio({
        tipo: 'whatsapp',
        destinatario: card.whatsapp,
        mensagem: message,
        status: 'sucesso'
      });
      console.log(`✔️ Lembrete de cartão enviado para ${card.whatsapp} (cartão ${card.id})`);
    } catch (error) {
      await logEnvio({
        tipo: 'whatsapp',
        destinatario: card.whatsapp,
        mensagem: message || `Cartão: ${card.conta_nome}`,
        status: 'erro',
        erro: error.message
      });
      console.error(`Erro ao enviar lembrete de cartão para ${card.whatsapp}:`, error.message);
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
