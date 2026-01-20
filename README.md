# Sistema de Controle Financeiro

Sistema completo de controle financeiro com Node.js, Express, PostgreSQL e React.

## 📋 Funcionalidades

- ✅ **Autenticação de usuários** (Login/Registro)
- ✅ **Dashboard** com gráficos de fluxo financeiro mensal
- ✅ **CRUD de Contas** (Criar, Visualizar, Editar, Excluir)
- ✅ **CRUD de Lançamentos** financeiros (Entradas e Saídas)
- ✅ **Visualização mensal** de entradas e saídas

## 🚀 Tecnologias

### Backend
- Node.js
- Express
- PostgreSQL
- JWT (autenticação)
- bcryptjs (criptografia de senhas)

### Frontend
- React
- React Router
- Axios
- Chart.js (gráficos)

## ⚙️ Configuração

### 1. PostgreSQL

Certifique-se de ter o PostgreSQL instalado e rodando. Configure as credenciais no arquivo `.env` do backend.

### 2. Backend

```bash
cd backend
npm install

# Configure o arquivo .env com suas credenciais do PostgreSQL
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=financeiro
# DB_USER=postgres
# DB_PASSWORD=sua_senha

# Criar banco de dados (você precisa fazer isso manualmente no PostgreSQL)
# CREATE DATABASE financeiro;

# Criar tabelas
npm run init-db

# Iniciar servidor
npm run dev
```

O backend estará rodando em: `http://localhost:5000`

### 3. Frontend

```bash
cd frontend
npm install

# Iniciar aplicação
npm start
```

O frontend estará rodando em: `http://localhost:3000`

## 📊 Estrutura do Projeto

```
financeiro/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuração do banco
│   │   ├── controllers/    # Lógica de negócio
│   │   ├── middlewares/    # Autenticação
│   │   ├── routes/         # Rotas da API
│   │   └── server.js       # Servidor Express
│   ├── .env                # Variáveis de ambiente
│   └── package.json
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── components/
    │   ├── pages/          # Login, Dashboard, Contas, Lançamentos
    │   ├── services/       # API calls
    │   ├── App.js
    │   └── index.js
    └── package.json
```

## 🔐 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login

### Contas (requer autenticação)
- `GET /api/contas` - Listar contas
- `GET /api/contas/:id` - Buscar conta
- `POST /api/contas` - Criar conta
- `PUT /api/contas/:id` - Atualizar conta
- `DELETE /api/contas/:id` - Deletar conta

### Lançamentos (requer autenticação)
- `GET /api/lancamentos` - Listar lançamentos
- `GET /api/lancamentos/dashboard` - Dados do dashboard
- `GET /api/lancamentos/:id` - Buscar lançamento
- `POST /api/lancamentos` - Criar lançamento
- `PUT /api/lancamentos/:id` - Atualizar lançamento
- `DELETE /api/lancamentos/:id` - Deletar lançamento

## 📝 Próximos Passos

1. **Criar banco de dados no PostgreSQL**:
   ```sql
   CREATE DATABASE financeiro;
   ```

2. **Configurar credenciais** no arquivo `backend/.env`

3. **Criar tabelas**: `cd backend && npm run init-db`

4. **Iniciar backend**: `cd backend && npm run dev`

5. **Iniciar frontend**: `cd frontend && npm start`

6. **Acessar**: http://localhost:3000

## 🎯 Uso

1. Registre um novo usuário na tela de login
2. Faça login com suas credenciais
3. Cadastre contas bancárias/carteiras
4. Cadastre lançamentos (entradas e saídas)
5. Visualize o dashboard com o fluxo financeiro mensal

---

Desenvolvido com ❤️ usando Node.js e React