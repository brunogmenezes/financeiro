# Sistema de Controle Financeiro

Sistema completo de controle financeiro com Node.js, Express, PostgreSQL e React.

## 📋 Funcionalidades

- ✅ **Autenticação de usuários** (Login/Registro com JWT)
- ✅ **Dashboard** com gráficos de fluxo financeiro mensal
- ✅ **Visualização de contas** com saldos e opção de ocultar valores
- ✅ **CRUD de Contas** (Criar, Visualizar, Editar, Excluir)
- ✅ **CRUD de Lançamentos** financeiros (Entrada/Saída/Neutro)
- ✅ **Categorias e Subcategorias** para organização dos lançamentos
- ✅ **Lançamentos Parcelados** com criação automática de parcelas
- ✅ **Controle de Pagamento** - lançamentos de saída podem ser marcados como pago/não pago
- ✅ **Auditoria** completa de todas as ações (criação, edição, exclusão)
- ✅ **Personalização de Tema** - 6 cores diferentes (Roxo, Azul, Verde, Laranja, Rosa, Vermelho)
- ✅ **Filtros** por mês e tipo de lançamento
- ✅ **Privacidade** - opção de ocultar valores sensíveis

## 🚀 Tecnologias

### Backend
- Node.js v25+
- Express 4.18.2
- PostgreSQL
- JWT (autenticação)
- bcryptjs (criptografia de senhas)
- CORS

### Frontend
- React 18.2.0
- React Router 6.20.1
- Axios 1.6.2
- Chart.js 4.4.1
- react-chartjs-2 5.2.0

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
# JWT_SECRET=seu_secret_aqui

# Criar banco de dados manualmente no PostgreSQL:
# CREATE DATABASE financeiro;

# Criar tabelas e executar migrações
npm run setup

# OU executar manualmente:
node src/config/init-db.js
node src/config/createAuditoria.js
node src/config/createCategorias.js
node src/config/addCorTema.js
node src/config/addTipoNeutro.js
node src/config/addPagoColumn.js
```

### 3. Iniciar os Servidores

#### Opção 1: Usando PM2 (Recomendado)

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar backend
cd backend
pm2 start src/server.js --name "financeiro-backend"

# Iniciar frontend
cd ../frontend
pm2 start start.js --name "financeiro-frontend"

# Comandos úteis do PM2:
pm2 list              # Ver processos rodando
pm2 logs              # Ver logs em tempo real
pm2 restart all       # Reiniciar todos
pm2 stop all          # Parar todos
pm2 save              # Salvar configuração
pm2 resurrect         # Restaurar processos salvos
```

Ou simplesmente clique duas vezes no arquivo `start-servers.bat` na raiz do projeto!

#### Opção 2: Manualmente

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm start
```

## 📊 Estrutura do Projeto

```
financeiro/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuração do banco e migrações
│   │   │   ├── database.js
│   │   │   ├── init-db.js
│   │   │   ├── createAuditoria.js
│   │   │   ├── createCategorias.js
│   │   │   ├── addCorTema.js
│   │   │   ├── addTipoNeutro.js
│   │   │   └── addPagoColumn.js
│   │   ├── controllers/    # Lógica de negócio
│   │   │   ├── authController.js
│   │   │   ├── contasController.js
│   │   │   ├── lancamentosController.js
│   │   │   ├── categoriasController.js
│   │   │   └── auditoriaController.js
│   │   ├── middlewares/    # Autenticação JWT
│   │   │   └── auth.js
│   │   ├── routes/         # Rotas da API
│   │   │   ├── auth.js
│   │   │   ├── contas.js
│   │   │   ├── lancamentos.js
│   │   │   ├── categorias.js
│   │   │   └── auditoria.js
│   │   └── server.js       # Servidor Express
│   ├── .env                # Variáveis de ambiente
│   └── package.json
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── components/     # Componentes reutilizáveis
    │   │   ├── Navbar.js
    │   │   └── Navbar.css
    │   ├── pages/          # Páginas da aplicação
    │   │   ├── Login.js
    │   │   ├── Dashboard.js
    │   │   ├── Contas.js
    │   │   ├── Lancamentos.js
    │   │   ├── Categorias.js
    │   │   ├── Auditoria.js
    │   │   └── Perfil.js
    │   ├── services/       # API calls
    │   │   └── api.js
    │   ├── App.js
    │   ├── index.js
    │   └── index.css       # Temas (6 cores)
    ├── start.js            # Script para PM2
    └── package.json
```

## 🔐 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Login de usuário
- `GET /api/auth/perfil` - Obter perfil do usuário (autenticado)
- `PUT /api/auth/perfil` - Atualizar perfil (autenticado)

### Contas (requer autenticação)
- `GET /api/contas` - Listar contas do usuário
- `GET /api/contas/:id` - Buscar conta específica
- `POST /api/contas` - Criar nova conta
- `PUT /api/contas/:id` - Atualizar conta
- `DELETE /api/contas/:id` - Deletar conta

### Lançamentos (requer autenticação)
- `GET /api/lancamentos` - Listar lançamentos do usuário
- `GET /api/lancamentos/dashboard` - Dados do dashboard (resumo mensal)
- `GET /api/lancamentos/:id` - Buscar lançamento específico
- `POST /api/lancamentos` - Criar lançamento (suporta parcelado)
- `PUT /api/lancamentos/:id` - Atualizar lançamento
- `DELETE /api/lancamentos/:id` - Deletar lançamento
- `PATCH /api/lancamentos/:id/toggle-pago` - Alternar status de pagamento

### Categorias (requer autenticação)
- `GET /api/categorias` - Listar categorias do usuário
- `GET /api/categorias/:id` - Buscar categoria específica
- `POST /api/categorias` - Criar categoria
- `PUT /api/categorias/:id` - Atualizar categoria
- `DELETE /api/categorias/:id` - Deletar categoria
- `GET /api/categorias/:id/subcategorias` - Listar subcategorias de uma categoria
- `POST /api/categorias/:id/subcategorias` - Criar subcategoria
- `PUT /api/categorias/:categoriaId/subcategorias/:id` - Atualizar subcategoria
- `DELETE /api/categorias/:categoriaId/subcategorias/:id` - Deletar subcategoria

### Auditoria (requer autenticação)
- `GET /api/auditoria` - Listar logs de auditoria do usuário

## 📝 Próximos Passos

1. **Criar banco de dados no PostgreSQL**:
   ```sql
   CREATE DATABASE financeiro;
   ```

2. **Configurar credenciais** no arquivo `backend/.env`:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=financeiro
   DB_USER=postgres
   DB_PASSWORD=sua_senha
   JWT_SECRET=seu_secret_super_secreto
   PORT=5000
   ```

3. **Instalar dependências**:
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

4. **Criar tabelas**: 
   ```bash
   cd backend
   npm run setup
   ```

5. **Iniciar servidores**:
   ```bash
   # Opção 1: Com PM2 (recomendado)
   npm install -g pm2
   cd backend
   pm2 start src/server.js --name "financeiro-backend"
   cd ../frontend
   pm2 start start.js --name "financeiro-frontend"

   # Opção 2: Manualmente (2 terminais)
   # Terminal 1
   cd backend
   npm start

   # Terminal 2
   cd frontend
   npm start
   ```

6. **Acessar**: 
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000

## 🎯 Uso

1. **Registro e Login**
   - Registre um novo usuário na tela de login
   - Faça login com suas credenciais

2. **Personalização**
   - Acesse "Perfil" para escolher entre 6 temas de cores
   - Configure sua preferência de visualização

3. **Contas**
   - Cadastre suas contas bancárias, carteiras, cartões
   - O saldo inicial é protegido após a criação
   - Visualize o saldo atualizado automaticamente

4. **Categorias**
   - Crie categorias para organizar seus lançamentos (Entrada, Saída ou Neutro)
   - Adicione subcategorias para maior detalhamento

5. **Lançamentos**
   - Cadastre lançamentos do tipo:
     - **Entrada**: Aumenta o saldo da conta
     - **Saída**: Diminui o saldo (apenas quando marcado como "pago")
     - **Neutro**: Não afeta o saldo
   - Marque lançamentos de saída como "pago" ou "não pago"
   - Crie lançamentos parcelados (parcelas são criadas automaticamente)
   - Adicione categoria e subcategoria aos lançamentos

6. **Dashboard**
   - Visualize o fluxo financeiro mensal em gráfico
   - Veja seus saldos por conta
   - Filtre lançamentos por mês e tipo
   - Use o botão "ocultar valores" para privacidade
   - Marque/desmarque lançamentos de saída como pagos

7. **Auditoria**
   - Acompanhe todas as ações realizadas no sistema
   - Filtre por descrição, tabela, ação ou usuário
   - Configure quantos registros ver por página (5/10/25/50/100)

## 🔒 Segurança

- Autenticação via JWT (JSON Web Tokens)
- Senhas criptografadas com bcryptjs
- Cada usuário vê apenas seus próprios dados
- Auditoria completa de todas as ações
- Proteção de rotas no backend e frontend

## 🎨 Temas Disponíveis

- 🟣 Roxo (padrão)
- 🔵 Azul
- 🟢 Verde
- 🟠 Laranja
- 🩷 Rosa
- 🔴 Vermelho

## 📦 Database Schema

**Tabelas:**
- `usuarios` - Dados dos usuários (id, nome, email, senha, cor_tema)
- `contas` - Contas bancárias/carteiras (id, usuario_id, nome, saldo_inicial, descricao)
- `categorias` - Categorias de lançamentos (id, usuario_id, nome, tipo)
- `subcategorias` - Subcategorias (id, categoria_id, nome)
- `lancamentos` - Lançamentos financeiros (id, usuario_id, conta_id, categoria_id, subcategoria_id, descricao, valor, tipo, data, parcelado, num_parcelas, pago)
- `auditoria` - Log de auditoria (id, usuario_id, usuario_nome, acao, tabela, registro_id, descricao, created_at)

---

Desenvolvido com ❤️ usando Node.js e React