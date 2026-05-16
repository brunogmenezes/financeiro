const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Service to interact with Google Gemini AI for invoice processing
 */
class GeminiService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("ERRO: GEMINI_API_KEY não configurada no arquivo .env");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Algumas chaves exigem o prefixo 'models/'
    this.model = this.genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });
  }

  /**
   * Extracts transactions from an invoice file (PDF, Image or Text)
   * @param {Buffer} fileBuffer - The file content
   * @param {string} mimeType - The file mime type
   * @returns {Promise<Array>} - List of extracted transactions
   */
  async extractTransactions(fileBuffer, mimeType) {
    // Lista atualizada para os modelos disponíveis em 2026
    const modelsToTry = [
      "gemini-2.5-flash", 
      "gemini-3.1-flash",
      "gemini-2.5-pro"
    ];
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Tentando extração com o modelo: ${modelName}...`);
        
        const isText = mimeType.includes('text') || mimeType.includes('csv') || mimeType.includes('ofx') || mimeType.includes('xml');
        
        // Se for imagem e estivermos tentando o gemini-pro (que é só texto), pulamos
        if (!isText && modelName === "gemini-pro") continue;

        const model = this.genAI.getGenerativeModel({ model: modelName });
        
        const prompt = `Analise esta fatura de cartão de crédito e extraia INDIVIDUALMENTE cada compra/lançamento da fatura ATUAL.
        O arquivo está no formato ${isText ? 'texto estruturado (CSV/OFX)' : 'documento visual (PDF/Imagem)'}.
        
        REGRAS DE OURO PARA PRECISÃO:
        1. VALOR ALVO: Procure no início o texto "fatura de [MÊS], no valor de R$ [VALOR]". A soma dos itens extraídos DEVE bater com esse [VALOR].
        2. SEÇÕES PROIBIDAS: Ignore COMPLETAMENTE itens em "Histórico", "Faturas anteriores" ou "Lançamentos futuros".
        3. FORMATO: Retorne APENAS o JSON: [{"data": "YYYY-MM-DD", "descricao": "string", "valor": number}]
        4. PAGAMENTOS: Ignore "Pagamento em...", "Pagamento antecipado" ou "Pagamento de fatura".
        5. ESTORNOS: Devem ter VALOR NEGATIVO.
        
        Extraia apenas os lançamentos que compõem o total da fatura indicada.`;

        let parts = [prompt];

        if (isText) {
          parts.push(fileBuffer.toString('utf-8'));
        } else {
          parts.push({
            inlineData: {
              data: fileBuffer.toString("base64"),
              mimeType: mimeType,
            },
          });
        }

        const result = await model.generateContent(parts);
        const response = await result.response;
        const text = response.text();
        
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            const data = JSON.parse(jsonMatch[0]);
            console.log(`Sucesso com o modelo ${modelName}!`);
            return data;
          } catch (parseError) {
            console.error(`Erro ao parsear JSON do modelo ${modelName}:`, text);
            continue;
          }
        }
        return [];
      } catch (error) {
        lastError = error;
        console.warn(`Modelo ${modelName} falhou:`, error.message);
        if (error.message.includes('404') || error.message.includes('not found') || error.message.includes('supported')) {
          continue;
        }
        throw error;
      }
    }

    throw lastError || new Error("Nenhum modelo do Gemini disponível para processar esta fatura.");
  }
}

module.exports = new GeminiService();
