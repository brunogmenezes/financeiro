const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const pool = require('../config/database');

async function getEvolutionConfig() {
  const result = await pool.query('SELECT * FROM evolution_config LIMIT 1');
  if (!result.rows[0]) {
    throw new Error('Configuração Evolution não encontrada no banco de dados');
  }
  return result.rows[0];
}

function headers(token) {
  return {
    'Content-Type': 'application/json',
    apikey: token,
  };
}

async function getConnectionState() {
  const config = await getEvolutionConfig();
  const url = `${config.url}/instance/connectionState/${config.instancia}`;
  
  try {
    const response = await fetch(url, { method: 'GET', headers: headers(config.token) });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data?.message || 'Erro ao consultar estado da instância');
    }
    
    // Retornar com o estado normalizado
    return {
      state: data?.instance?.state || data?.state || 'unknown',
      instance: data?.instance || data,
      isConnected: data?.instance?.state === 'open' || data?.state === 'open'
    };
  } catch (error) {
    // Se houver erro, retornar estado desconectado
    return {
      state: 'disconnected',
      error: error.message,
      isConnected: false
    };
  }
}

async function sendText(number, text) {
  const config = await getEvolutionConfig();
  const url = `${config.url}/message/sendText/${config.instancia}`;
  const body = { number, text };
  const response = await fetch(url, { method: 'POST', headers: headers(config.token), body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) {
    const message = data?.message || 'Erro ao enviar mensagem';
    throw new Error(message);
  }
  return data;
}

module.exports = {
  getConnectionState,
  sendText,
  getEvolutionConfig
};
