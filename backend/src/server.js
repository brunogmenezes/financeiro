const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const contasRoutes = require('./routes/contas');
const lancamentosRoutes = require('./routes/lancamentos');
const auditoriaRoutes = require('./routes/auditoria');
const categoriasRoutes = require('./routes/categorias');

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

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: '✅ API Financeiro está rodando!' });
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
