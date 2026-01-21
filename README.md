# Sistema de Controle Financeiro com WhatsApp

Sistema completo de controle financeiro com Node.js, Express, PostgreSQL e React, com integração WhatsApp para lembretes automáticos de pagamentos via Evolution API.

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
- ✨ **WhatsApp Integration** - Lembretes automáticos de pagamentos via Evolution API
  - Avisos D-1 (um dia antes) e D0 (no dia do vencimento)
  - Horário configurável (padrão 09:00 em São Paulo)
  - Teste manual de lembretes
  - Mensagem de teste para validar configuração

## 🚀 Tecnologias

### Backend
- Node.js v25+
- Express 4.18.2
- PostgreSQL
- JWT (autenticação)
- bcryptjs (criptografia de senhas)
- CORS
- node-fetch 3.3.2 (chamadas HTTP para Evolution API)
- uuid 9.0.0 (geração de IDs únicos)

### Frontend
- React 18.2.0
- React Router 6.20.1
- Axios 1.6.2
- Chart.js 4.4.1
- react-chartjs-2 5.2.0

### Integrações Externas
- **Evolution API v2.2.2** - Integração WhatsApp para envio de mensagens
  - Base URL: https://netconnect.netsolutions.com.br
  - Endpoints: `/instance/connectionState`, `/message/sendText`

## 🚀 Início Rápido

### 1. Clonar o Repositório

```bash
# Clone o repositório do GitHub
git clone https://github.com/brunogmenezes/financeiro.git

# Entre na pasta do projeto
cd financeiro
```

### 2. Pré-requisitos

Certifique-se de ter instalado:
- **Node.js** v25+ ([Download](https://nodejs.org/))
- **PostgreSQL** 12+ ([Download](https://www.postgresql.org/download/))
- **Git** ([Download](https://git-scm.com/))
- **(Opcional)** PM2 para gerenciar processos: `npm install -g pm2`

### 3. Configurar Banco de Dados

```sql
-- No PostgreSQL, crie o banco de dados
CREATE DATABASE financeiro;
```

### 4. Configurar Backend

```bash
# Entre na pasta backend
cd backend

# Instale as dependências
npm install

# Copie o arquivo .env.example e configure
# Ou crie manualmente o arquivo .env com:
```

Crie o arquivo `backend/.env`:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=financeiro
DB_USER=postgres
DB_PASSWORD=sua_senha_postgres
JWT_SECRET=seu_secret_jwt_super_secreto

# Opcional: Integração WhatsApp (Evolution API)
EVOLUTION_BASE_URL=https://netconnect.netsolutions.com.br
EVOLUTION_API_KEY=sua_api_key
EVOLUTION_INSTANCE=nome_da_instancia
REMINDER_TZ=America/Sao_Paulo
REMINDER_HOUR=09:00
```

```bash
# Execute as migrações do banco
npm run setup

# Isso executará:
# - Criação de todas as tabelas
# - Estrutura de auditoria
# - Categorias padrão
# - Configurações iniciais
```

### 5. Configurar Frontend

```bash
# Volte para a raiz e entre no frontend
cd ../frontend

# Instale as dependências
npm install
```

### 6. Iniciar o Projeto

**Opção A: Com PM2 (Recomendado para produção)**

```bash
# Na raiz do projeto
cd backend
pm2 start src/server.js --name "financeiro-backend"

cd ../frontend
pm2 start start.js --name "financeiro-frontend"

# Ver status
pm2 list

# Ver logs em tempo real
pm2 logs

# Reiniciar
pm2 restart all

# Parar
pm2 stop all
```

**Opção B: Modo Desenvolvimento (2 terminais)**

```bash
# Terminal 1 - Backend
cd backend
npm start
# Backend rodando em http://localhost:5000

# Terminal 2 - Frontend
cd frontend
npm start
# Frontend rodando em http://localhost:3000
```

### 7. Acessar o Sistema

Abra seu navegador em: **http://localhost:3000**

1. Clique em "Registrar"
2. Crie sua conta
3. Faça login
4. Comece a usar! 🎉



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
│   │   │   ├── addPagoColumn.js
│   │   │   └── createEvolutionConfig.js
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
│   │   │   ├── auditoria.js
│   │   │   └── whatsapp.js (novo)
│   │   ├── services/       # Serviços
│   │   │   ├── evolutionService.js (novo)
│   │   │   └── reminderScheduler.js (novo)
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
    │   │   └── Perfil.js (melhorado com WhatsApp)
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

### WhatsApp / Evolution (requer autenticação)
- `GET /api/whatsapp/status` - Verificar status da conexão Evolution
- `GET /api/whatsapp/config` - Obter configuração da API Evolution
- `POST /api/whatsapp/config` - Salvar/atualizar configuração Evolution
- `POST /api/whatsapp/test-message` - Enviar mensagem de teste para WhatsApp
- `POST /api/whatsapp/send-reminders-now` - Disparar lembretes manualmente (teste)

## 📱 Integração WhatsApp

### Configuração

1. **Obter credenciais da Evolution API**:
   - Acesse https://netconnect.netsolutions.com.br
   - Crie uma instância WhatsApp
   - Copie a URL, Nome da instância e Token/API Key

2. **No Perfil do usuário**:
   - Vá até a seção "Configuração da API Evolution"
   - Preencha: URL, Instância e Token
   - Clique em "Salvar Configuração"

3. **Verificar conexão**:
   - Clique em "Atualizar status"
   - Deve exibir "Conectado ✅"

4. **Cadastrar número WhatsApp**:
   - Vá até a seção "WhatsApp"
   - Preencha seu número com DDI + DDD (ex: 5511999999999)
   - Salve as alterações

### Enviando Mensagens

#### Teste Manual
1. Na seção "WhatsApp", clique em "📱 Enviar mensagem de teste"
2. Uma mensagem será enviada para seu número

#### Lembretes Automáticos
1. Crie lançamentos de **saída** com data para **hoje** e **amanhã**
2. Deixe marcados como **não pago**
3. Acesse a seção "Teste de Lembretes Automáticos"
4. Clique em "🚀 Disparar Lembretes Agora"
5. Você receberá mensagens para:
   - Lançamentos vencidos hoje (D0)
   - Lançamentos vencidos amanhã (D-1)

#### Agendamento Automático
- O sistema envia lembretes automaticamente todos os dias no horário configurado (padrão: 09:00)
- Configure a hora em `REMINDER_HOUR` no arquivo `.env`
- Configure o timezone em `REMINDER_TZ` no arquivo `.env` (padrão: `America/Sao_Paulo`)

### Formato das Mensagens

**Exemplo de lembrete automático:**
```
Oi João!
Lembrete: Conta de água
Valor: R$ 150,00
Vencimento: 22/01/2026
Conta: Banco do Brasil
Status: não pago

Marque como pago no Financeiro se já quitou.
```

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
   EVOLUTION_BASE_URL=https://netconnect.netsolutions.com.br
   EVOLUTION_API_KEY=sua_api_key
   EVOLUTION_INSTANCE=nome_instancia
   REMINDER_TZ=America/Sao_Paulo
   REMINDER_HOUR=09:00
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

8. **WhatsApp (Novo!)**
   - Configure sua instância Evolution no Perfil
   - Informe seu número de WhatsApp
   - Teste a integração enviando mensagem de teste
   - Receba lembretes automáticos de pagamentos D-1 e D0

## 🔒 Segurança

- Autenticação via JWT (JSON Web Tokens)
- Senhas criptografadas com bcryptjs
- Cada usuário vê apenas seus próprios dados
- Auditoria completa de todas as ações
- Proteção de rotas no backend e frontend
- API Evolution usa token seguro via header apikey

## 🎨 Temas Disponíveis

- 🟣 Roxo (padrão)
- 🔵 Azul
- 🟢 Verde
- 🟠 Laranja
- 🩷 Rosa
- 🔴 Vermelho

## 📦 Database Schema

**Tabelas:**
- `usuarios` - Dados dos usuários (id, nome, email, senha, cor_tema, whatsapp)
- `contas` - Contas bancárias/carteiras (id, usuario_id, nome, saldo_inicial, descricao)
- `categorias` - Categorias de lançamentos (id, usuario_id, nome, tipo)
- `subcategorias` - Subcategorias (id, categoria_id, nome)
- `lancamentos` - Lançamentos financeiros (id, usuario_id, conta_id, categoria_id, subcategoria_id, descricao, valor, tipo, data, parcelado, num_parcelas, pago)
- `auditoria` - Log de auditoria (id, usuario_id, usuario_nome, acao, tabela, registro_id, descricao, created_at)
- `evolution_config` - Configuração da API Evolution (url, instancia, token)

## 🐛 Troubleshooting

### Lembretes não são enviados
- Verifique se a instância Evolution está conectada (status deve ser "Conectado ✅")
- Confirme que o número de WhatsApp está preenchido com DDI + DDD
- Verifique os logs do backend: `pm2 logs financeiro-backend`
- Certifique-se de que existem lançamentos não pagos para hoje/amanhã

### Erro ao salvar configuração Evolution
- Verifique se todos os campos (URL, Instância, Token) estão preenchidos
- Confirme que a URL é válida e acessível
- Verifique o token/API Key da sua instância

### Status "Desconhecido"
- Acione o botão "Atualizar status" para refrescar
- Confira se a instância está conectada na Evolution API
- Verifique os logs do backend para mais detalhes

---

Desenvolvido com ❤️ usando Node.js e React
