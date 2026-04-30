# 🚀 Guia de Ativação: Modo Produção (Efí PIX)

Siga estes passos para começar a receber pagamentos reais com total segurança no seu sistema financeiro.

## 1. Configurações do Backend (.env)
Edite o arquivo `.env` do backend com as credenciais de produção. **Importante**: Não use as mesmas chaves de homologação.

```env
# MUDAR PARA FALSE PARA PRODUÇÃO
EFI_SANDBOX=false

# CREDENCIAIS DE PRODUÇÃO (Pegar no portal Efí)
EFI_CLIENT_ID=SEU_CLIENT_ID_PRODUCAO
EFI_CLIENT_SECRET=SEU_CLIENT_SECRET_PRODUCAO
EFI_PIX_KEY=SUA_CHAVE_PIX_PRODUCAO

# CAMINHO DO CERTIFICADO PRODUÇÃO
EFI_CERT_PATH=./certificado_efi/producao.p12
```

## 2. Preparação do Certificado
1. No portal da Efí, acesse **API > Minhas Aplicações > [Sua App]**.
2. Clique na aba **Produção** (ao lado de Homologação).
3. Clique em **Novo Certificado** e baixe o arquivo `.p12`.
4. Coloque esse arquivo na pasta `backend/src/certificado_efi/`.
5. Garanta que o nome do arquivo no `.env` (`EFI_CERT_PATH`) seja idêntico ao arquivo baixado.

## 3. Configurando o Webhook (Automático)
Para que o sistema libere o PRO sozinho sem que o usuário precise esperar, registre a URL de notificação na Efí:

1. Acesse o portal da Efí e vá em **API > Webhooks**.
2. Selecione a chave PIX que você vai usar.
3. Clique em **Configurar Webhook**.
4. A URL deve ser: `https://seu-dominio.com/api/subscription/webhook`
   *(Nota: Substitua `seu-dominio.com` pelo endereço onde seu backend está hospedado. Deve ter HTTPS)*.

## 4. Teste de Validação (Opcional mas recomendado)
1. No seu portal **Manager**, altere o preço da mensalidade temporariamente para **R$ 0,01**.
2. Tente fazer uma assinatura como um usuário comum.
3. Pague o PIX de 1 centavo com seu banco real.
4. Verifique se o sistema liberou o acesso PRO instantaneamente.
5. Se tudo estiver OK, volte o preço no Manager para o valor final.

## 5. Dicas de Servidor
- Garanta que seu servidor (Nginx/Apache) está encaminhando as requisições para a porta do Node (5000).
- Certifique-se de que o banco de dados PostgreSQL está acessível pelo backend de produção.
