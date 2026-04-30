const { generatePixCharge, checkPixStatus } = require('../services/efiService');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: false
});

const createSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Buscar dados do usuário
    const userRes = await pool.query('SELECT nome, email FROM usuarios WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    const user = userRes.rows[0];

    // Buscar preço global no banco
    const configRes = await pool.query("SELECT valor FROM configuracoes WHERE chave = 'preco_assinatura'");
    const precoAssinatura = configRes.rows.length > 0 ? configRes.rows[0].valor : '9.99';

    // Gerar cobrança na Efí
    const pixData = await generatePixCharge(userId, user.email, user.nome, precoAssinatura);
    
    // Opcional: Salvar o txid no banco para rastreio posterior
    await pool.query('UPDATE usuarios SET efi_id = $1 WHERE id = $2', [pixData.txid, userId]);

    res.json(pixData);
  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    res.status(500).json({ error: 'Erro ao gerar cobrança PIX' });
  }
};

const checkStatus = async (req, res) => {
  try {
    const { txid } = req.params;
    const status = await checkPixStatus(txid);
    
    console.log(`Verificando status TXID ${txid}: ${status}`);
    
    if (status === 'CONCLUIDA') {
      console.log(`Pagamento confirmado para TXID ${txid}. Liberando PRO...`);
      // Atualizar usuário para PRO por 30 dias
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      
      await pool.query(
        'UPDATE usuarios SET is_pro = true, pro_expires_at = $1 WHERE id = $2',
        [expiryDate, req.userId]
      );

      // Registrar no histórico de pagamentos (Evitar duplicidade com txid)
      const alreadyRecorded = await pool.query('SELECT 1 FROM pagamentos_assinatura WHERE txid = $1', [txid]);
      
      // Buscar preço global no banco para o histórico
      const configRes = await pool.query("SELECT valor FROM configuracoes WHERE chave = 'preco_assinatura'");
      const precoAssinatura = configRes.rows.length > 0 ? configRes.rows[0].valor : '9.99';

      if (alreadyRecorded.rows.length === 0) {
        await pool.query(
          'INSERT INTO pagamentos_assinatura (usuario_id, txid, valor, validade_ate) VALUES ($1, $2, $3, $4)',
          [req.userId, txid, parseFloat(precoAssinatura), expiryDate]
        );
      }

      return res.json({ status: 'PAID', message: 'Assinatura ativada com sucesso!' });
    }
    
    res.json({ status: status });
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({ error: 'Erro ao verificar status do pagamento' });
  }
};

const webhook = async (req, res) => {
  // A Efí envia um POST para este endpoint quando o status do PIX muda
  try {
    const { pix } = req.body;
    
    if (pix && pix.length > 0) {
      for (const p of pix) {
        if (p.txid) {
          console.log(`Webhook recebido para TXID: ${p.txid}`);
          
          // 1. Verificar se o pagamento já foi processado para evitar duplicidade
          const alreadyRecorded = await pool.query('SELECT 1 FROM pagamentos_assinatura WHERE txid = $1', [p.txid]);
          if (alreadyRecorded.rows.length > 0) {
            console.log(`Pagamento ${p.txid} já processado anteriormente.`);
            continue;
          }

          // 2. Buscar o usuário vinculado a este txid
          const userRes = await pool.query('SELECT id, nome FROM usuarios WHERE efi_id = $1', [p.txid]);
          if (userRes.rows.length === 0) {
            console.log(`Usuário não encontrado para o TXID ${p.txid}`);
            continue;
          }
          const user = userRes.rows[0];

          // 3. Calcular nova validade (30 dias)
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 30);

          // 4. Buscar preço global atual para registro
          const configRes = await pool.query("SELECT valor FROM configuracoes WHERE chave = 'preco_assinatura'");
          const precoAssinatura = configRes.rows.length > 0 ? configRes.rows[0].valor : p.valor;

          // 5. Atualizar Usuário e Registrar Histórico (Transação SQL)
          await pool.query('BEGIN');
          try {
            await pool.query(
              'UPDATE usuarios SET is_pro = true, pro_expires_at = $1 WHERE id = $2',
              [expiryDate, user.id]
            );

            await pool.query(
              'INSERT INTO pagamentos_assinatura (usuario_id, txid, valor, validade_ate) VALUES ($1, $2, $3, $4)',
              [user.id, p.txid, parseFloat(p.valor || precoAssinatura), expiryDate]
            );
            await pool.query('COMMIT');
            console.log(`✅ Assinatura ativada via Webhook para ${user.nome} (ID: ${user.id})`);
          } catch (e) {
            await pool.query('ROLLBACK');
            throw e;
          }
        }
      }
    }
    
    // A Efí exige resposta 200 para parar de enviar a notificação
    res.status(200).send('OK');
  } catch (error) {
    console.error('Erro crítico no Webhook Efí:', error);
    res.status(500).send('Erro');
  }
};

const getHistory = async (req, res) => {
  try {
    const history = await pool.query(
      'SELECT * FROM pagamentos_assinatura WHERE usuario_id = $1 ORDER BY data_pagamento DESC',
      [req.userId]
    );

    // Buscar data de expiração atual do usuário
    const userRes = await pool.query('SELECT pro_expires_at FROM usuarios WHERE id = $1', [req.userId]);
    const expiresAt = userRes.rows[0].pro_expires_at;

    res.json({
      history: history.rows,
      expiresAt: expiresAt
    });
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ error: 'Erro interno ao buscar histórico' });
  }
};

const getPublicConfigs = async (req, res) => {
  try {
    const result = await pool.query("SELECT valor FROM configuracoes WHERE chave = 'preco_assinatura'");
    const preco = result.rows.length > 0 ? result.rows[0].valor : '9.99';
    res.json({ preco_assinatura: preco });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar preço' });
  }
};

module.exports = {
  createSubscription,
  checkStatus,
  webhook,
  getHistory,
  getPublicConfigs
};
