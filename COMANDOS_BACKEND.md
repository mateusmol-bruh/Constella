# PowerShell — Back-end Constella

Abra VS Code em `Constella/` e use um terminal separado para cada processo.

## Configurar e checar (não altera banco automaticamente)
```powershell
cd .\backend
node -v
npm ci
if (!(Test-Path .\.env)) { Copy-Item .\.env.example .\.env }
# Edite backend/.env com URL REAL do PostgreSQL e JWT_SECRET próprio.
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copie o segredo impresso APENAS para o JWT_SECRET do .env; não cole em chats.
npx prisma validate --config .\prisma7.config.ts
npx prisma generate --config .\prisma7.config.ts
npx prisma migrate status --config .\prisma7.config.ts
npm run dev
```

Observações: `npm ci` exige package-lock.json; caso não exista, use `npm install`. Se o config não existir na sua branch, localize o arquivo real antes de rodar Prisma. O `migrate status` é diagnóstico, não migração; se relatar pendências, revisar com responsável antes de aplicar.

## Testar a API (outro terminal)
```powershell
Invoke-RestMethod http://localhost:3000/
```
Resposta esperada segundo backend/server.js: `{ "mensagem": "API Constella funcionando!" }`.

## Mobile (outro terminal)
```powershell
cd .\mobile
npx tsc --noEmit
npx expo-doctor
npx expo start --tunnel --clear
```

A API deve ser alcançável separadamente pelo dispositivo; `localhost:3000` funciona no PC, não no celular. O IP Wi-Fi anterior do usuário foi `10.106.152.116`, mas pode mudar e a rede institucional pode bloquear conexões entre aparelhos. Para produção/uso fora da rede local, é necessária uma URL HTTPS autenticada. Nunca exponha banco/segredos publicamente.

## Banco de dados
- Verificar credenciais e autorização do proprietário do banco antes de conectar.
- Nunca executar `prisma migrate reset`, `prisma db push` ou `prisma migrate dev` sem análise e aprovação quando houver dados reais.
- O schema atual está em backend/src/prisma/schema.prisma e a configuração em backend/prisma7.config.ts, conforme branch dev verificada em 2026-10-22.
