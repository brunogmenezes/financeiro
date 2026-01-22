# Configuração do Sistema Financeiro - Debian

## 1. No servidor Debian, ajuste as variáveis de ambiente:

### Backend (.env)
```bash
cd /var/www/html/financeiro/backend
nano .env
```

Configuração de exemplo:
```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=financeiro
DB_USER=postgres
DB_PASSWORD=sua_senha_aqui
JWT_SECRET=chave_secreta_complexa_aqui
EVOLUTION_BASE_URL=https://netconnect.netsolutions.com.br/
EVOLUTION_API_KEY=sua_chave_aqui
EVOLUTION_INSTANCE=financeiro
REMINDER_TZ=America/Sao_Paulo
REMINDER_HOUR=09:00
```

### Frontend (.env)
```bash
cd /var/www/html/financeiro/frontend
nano .env
```

**IMPORTANTE**: Configure a URL da API:
```
# Se usar Nginx com proxy reverso para /api (RECOMENDADO):
REACT_APP_API_URL=https://financeiro.netsolutions.com.br/api

# Ou se expor backend diretamente:
# REACT_APP_API_URL=https://financeiro.netsolutions.com.br:5000/api
```

## 2. Configuração Nginx (Proxy Reverso):

Atualize `/etc/nginx/sites-enabled/financeiro.conf`:

```nginx
server {
    server_name financeiro.netsolutions.com.br;

    # Frontend React
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:5000/api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (se necessário)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    listen [::]:443 ssl;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/financeiro.netsolutions.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/financeiro.netsolutions.com.br/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = financeiro.netsolutions.com.br) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    listen [::]:80;
    server_name financeiro.netsolutions.com.br;
    return 404;
}
```

Depois, recarregue o Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 3. Rebuild do frontend:
```bash
cd /var/www/html/financeiro/frontend
npm run build
pm2 restart financeiro-frontend
```

## 4. Reinicie os serviços:
```bash
pm2 restart all
pm2 logs
```

## 5. Verifique CORS no backend:
O backend já está configurado com `cors()` aberto. Se tiver problemas, force a origem:
```javascript
// backend/src/server.js
app.use(cors({
  origin: ['https://financeiro.netsolutions.com.br'],
  credentials: true
}));
```

## 6. Firewall (se necessário):
```bash
# Liberar HTTPS (porta 443)
sudo ufw allow 443/tcp
# Liberar HTTP para redirect (porta 80)
sudo ufw allow 80/tcp
# Portas internas 3000/5000 NÃO precisam estar abertas externamente
```

## Troubleshooting:
- **Erro "Erro ao processar requisição"**: Frontend não conecta no backend
  1. Verifique `.env` do frontend: `REACT_APP_API_URL=https://financeiro.netsolutions.com.br/api`
  2. Rebuild: `cd frontend && npm run build && pm2 restart financeiro-frontend`
  3. Teste backend direto: `curl http://localhost:5000` (deve retornar JSON)
  4. Verifique Nginx: `sudo nginx -t && sudo systemctl status nginx`
  5. Logs: `pm2 logs financeiro-backend`

- **CORS error**: 
  - Adicione origem no backend (cors config)
  - Verifique se Nginx está passando headers corretos

- **502/504 Gateway**: 
  - Backend não está respondendo: `pm2 list`
  - Verifique logs: `pm2 logs financeiro-backend --lines 50`
  - PostgreSQL rodando: `sudo systemctl status postgresql`

- **Login não funciona**:
  - Verifique JWT_SECRET no `.env` do backend
  - Teste rota: `curl http://localhost:5000/api/auth/login -d '{"email":"test@test.com","senha":"123"}' -H "Content-Type: application/json"`
  
- **Frontend mostra página em branco**:
  - Erro no build ou variável de ambiente não carregada
  - Delete `frontend/build` e rode `npm run build` novamente
  - Verifique console do navegador (F12)
