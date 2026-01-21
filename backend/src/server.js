const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const authRoutes = require('./routes/auth');
const contasRoutes = require('./routes/contas');
const lancamentosRoutes = require('./routes/lancamentos');
const auditoriaRoutes = require('./routes/auditoria');
const categoriasRoutes = require('./routes/categorias');
const whatsappRoutes = require('./routes/whatsapp');
const { ensureOptionalColumns } = require('./config/migrations');
const { startReminderScheduler } = require('./services/reminderScheduler');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/contas', contasRoutes);
app.use('/api/lancamentos', lancamentosRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: '✅ API Financeiro está rodando!' });
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  await ensureOptionalColumns();
  startReminderScheduler();
});
