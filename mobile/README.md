# O Constella — mobile

React Native, Expo SDK 58, TypeScript e React Navigation. Layout e assets existentes preservados.

Refinamento visual, limite de fóruns e infraestrutura push: [relatório e configuração](../docs/REFINAMENTO_PUSH_2026-10-23.md). Push remoto depende de build instalado e credenciais reais; o Expo Go não valida esse fluxo.

## Desenvolvimento

Na raiz Constella, inicie/reinicie a API com `cd backend` e `npm run dev`. O reinício carrega as rotas públicas e o Prisma Client atualizado. Em outro terminal, dentro de mobile:

```powershell
npm run configure:api
npm start
```

configure:api cria .env.local somente se não existir .env ou .env.local. Detecta uma única interface privada ou aceita origem explícita: `npm run configure:api -- http://IP_DO_COMPUTADOR:3000`. Não copia credenciais do backend. Ao trocar de rede, atualize EXPO_PUBLIC_API_URL no arquivo local e recarregue o app. Celular e API precisam se alcançar; a URL do Metro não é a URL da API.

## Verificação

```powershell
npm run typecheck
npm run lint
npm test
```

No PowerShell com execução de scripts bloqueada, use npm.cmd e npx.cmd.

Teste real opt-in, usando serviços TypeScript do mobile, Axios, Express, Prisma e PostgreSQL local:

```powershell
$env:CONSTELLA_LOCAL_INTEGRATION='1'
npm run test:integration
```

Inicia e reinicia o Express existente em porta temporária. Lê a conexão do backend sem imprimir credenciais, aceita somente banco local e recusa production. Cria contas sintéticas TESTE, conexões, fórum, postagem e mensagem, que permanecem para inspeção. Não faz reset, seed, exclusão ou migração. Verifica também onboarding persistido com zero interesses e acesso público sem permissões privadas.

## Android independente

eas.json: preview gera APK interno com developmentClient false; production gera AAB. Identificador Android com.constella.app, sujeito à confirmação de disponibilidade antes de publicar. Nenhuma loja ou serviço pago acionado.

Configure EXPO_PUBLIC_API_URL com a origem HTTPS real da API nos ambientes EAS preview e production. Não coloque DATABASE_URL, JWT_SECRET ou tokens em variáveis públicas. app.config.js bloqueia distribuição sem HTTPS ou com endereços locais comuns; isso não comprova disponibilidade de hospedagem.

Após vincular o projeto à conta Expo do desenvolvedor e configurar assinatura/credenciais:

```powershell
npx eas-cli@latest build --platform android --profile preview
```

Referência: [APK com EAS](https://docs.expo.dev/build-reference/apk/). O perfil embute JavaScript e não exige Expo Go/Metro do usuário final. APK, instalação em aparelho e acesso por outra rede permanecem sem validação.

## Estado atual

Revisão mais recente: [fóruns, câmera, recomendações, PRO de demonstração e limpeza do banco](../docs/REVISAO_FUNCIONAL_2026-10-23.md). As contas anteriores foram removidas na limpeza solicitada; crie uma conta nova. Para demonstrar PRO, inicie o backend com `npm.cmd run demo` e use Ativar demonstração PRO na tela do aplicativo. Esse acesso temporário não é uma assinatura paga e é bloqueado em produção.

[Relatório da execução](../docs/INTEGRACAO_MOBILE_ATUAL.md). Os bloqueios de onboarding e visitante foram corrigidos no backend após autorização expressa: migração local existente aplicada, Client regenerado e router público registrado. Conclusão do onboarding depende do servidor, inclusive com zero interesses. Pro consulta status real; compra indisponível sem provedor homologado.
