const EfiPay = require('sdk-node-apis-efi');
const path = require('path');
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

const options = {
  sandbox: process.env.EFI_SANDBOX === 'true',
  client_id: process.env.EFI_CLIENT_ID,
  client_secret: process.env.EFI_CLIENT_SECRET,
  certificate: path.join(__dirname, '../../', process.env.EFI_CERT_PATH)
};

const efipay = new EfiPay(options);

const generatePixCharge = async (userId, userEmail, userNome, valor) => {
  try {
    const body = {
      calendario: {
        expiracao: 3600
      },
      valor: {
        original: parseFloat(valor).toFixed(2)
      },
      chave: process.env.EFI_PIX_KEY,
      solicitacaoPagador: `Assinatura PRO - Sistema Financeiro (Usuário: ${userNome})`
    };

    // Criar cobrança imediata
    const resCharge = await efipay.pixCreateImmediateCharge({}, body);
    
    // Para gerar o QR Code, a Efí precisa do ID da localização (loc.id), não do txid
    const params = { id: resCharge.loc.id };
    const resQRCode = await efipay.pixGenerateQRCode(params);

    return {
      txid: resCharge.txid,
      locId: resCharge.loc.id,
      qrcode: resQRCode.qrcodeJson, 
      imagemQrcode: resQRCode.imagemQrcode, 
      copiaECola: resQRCode.qrcode 
    };
  } catch (error) {
    console.error('Erro na Efí (generatePixCharge):', error);
    throw error;
  }
};

const checkPixStatus = async (txid) => {
  try {
    const params = { txid: txid };
    const response = await efipay.pixDetailCharge(params);
    console.log(`Resposta bruta Efí (status):`, response.status);
    return response.status; // 'CONCLUIDA', 'ATIVA', etc.
  } catch (error) {
    console.error('Erro na Efí (checkPixStatus):', error);
    throw error;
  }
};

module.exports = {
  generatePixCharge,
  checkPixStatus
};
