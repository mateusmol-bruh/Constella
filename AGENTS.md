# Constella — regras gerais para Codex

## Escopo e organização
- Abrir o workspace na raiz `Constella/` para integrar `mobile/` e `backend/`.
- Responder em português brasileiro; referir-se sempre a **o Constella**.
- Cumprir também `mobile/AGENTS.md`, caso exista. Em conflitos, privilegiar as regras mais restritivas e informar.
- `mobile/`: React Native, Expo SDK 58, TypeScript e React Navigation (NÃO usar Expo Router).
- `backend/`: Node.js, Express, Prisma 7, PostgreSQL, JWT. Versões reais devem ser consultadas em `package.json`.
- `docs/`: documentação e contratos; não tratar planos como funções já entregues.

## Trabalho seguro e verificável
- Antes de editar: consultar `git status --short`, localizar arquivos relevantes, ler os contratos realmente usados e identificar lacunas.
- Nunca inventar rotas, campos, dados reais, preços, credenciais, pagamentos ou resultados de testes.
- Nunca realizar `git reset --hard`, `git clean -fd`, `prisma migrate reset`, `prisma db push --force-reset`, `npm audit fix --force`, apagar pastas ou publicar/commitar sem pedido explícito.
- Não sobrescrever `.env`, segredos nem alterações não versionadas do usuário. Não exibir credenciais em logs, prompts ou relatórios.
- Ao modificar schema/banco: apresentar proposta e risco, validar em banco de desenvolvimento e obter autorização explícita ANTES de aplicar migração.
- Pagamentos reais só via provedor homologado e validação pelo servidor (assinatura real, recibo, expiração, cancelamento e webhook). Nunca liberar Pro apenas com valor enviado pelo aplicativo.
- Garantir autenticação e autorização para mensagens, fóruns e conteúdo Pro. Não confiar em IDs arbitrários do cliente.
- Se o backend ou contrato estiver indisponível, implementar UI sem fingir integração real e registrar pendência.

## Eficiência
- Não varrer `node_modules`, `.git`, `.expo` ou a base inteira. Trabalhar por fluxo, arquivos e símbolos relevantes.
- Evitar que agentes editem os mesmos arquivos em paralelo; executar sequencialmente quando houver sobreposição.
- Após mudanças: rodar verificações proporcionais, corrigir erros introduzidos e comunicar resultado real.
- Resposta curta: Feito; arquivos; validação; pendências. Não colar fontes completas salvo solicitado.

## Critérios funcionais
- Onboarding visual e escolha inicial de interesses ocorrem uma vez por conta após conclusão, persistidos no backend; troca de dispositivo e logout/login não repetem fluxo.
- Não inferir conclusão do onboarding somente por `interesses.length > 0`, pois zero interesses pode ser uma escolha legítima.
- Inputs de apresentação pessoal e interesses selecionáveis começam vazios, sem conteúdo pré-escrito, mantendo placeholders apenas informativos.
- Substituir arte improvisada do onboarding pela imagem verdadeira encontrada em `mobile/assets/images`; usar a logo menor oficial onde fizer sentido, sem distorcer.
- Fóruns têm fluxo de listagem, entrada, postagens exibidas como conversa quando apropriado, envio e moderação; chats individuais continuam separados.
- Pro tem apresentação, bloqueios visuais e status real da assinatura; compra efetiva NÃO pode ser simulada como concluída.
