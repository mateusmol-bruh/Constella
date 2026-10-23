# Instalação dos agentes no projeto Constella

1. Abra a **raiz Constella**, não só `mobile`, no VS Code, para permitir que Codex leia backend e mobile.
2. Copie a pasta `.codex/agents/` deste pacote para `Constella/.codex/agents/`.
3. Mantenha seu `mobile/AGENTS.md` já criado. Coloque o `AGENTS.md` deste pacote em `Constella/AGENTS.md`, mesclando instruções se já existir um arquivo com esse nome.
4. Crie `backend/.env` com base no `.env.example` verdadeiro do projeto, use `templates/backend/.env.example` apenas como referência. Não substitua `.env` já existente.
5. Crie `mobile/.env.local` a partir de `templates/mobile/.env.local.example` ajustando o IP/URL acessível pelo dispositivo. Adicione `.env.local` e `.env` ao `.gitignore` correspondente.
6. Leia `COMANDOS_BACKEND.md` para iniciar backend e Expo em terminais distintos.
7. Cole `PROMPT_MESTRE.md` no chat Codex (com imagens do Figma anexadas) em modo LOCAL com escrita no workspace. As imagens deste chat não são automaticamente arquivos locais no VS Code.
8. Os novos TOMLs são subagentes; peça ao Codex para delegar tarefas aos nomes definidos. Subagentes custam tokens adicionais, então priorize uso sequencial e revisão pontual.
9. Arquivos `.env` dentro de `templates/` são somente PLACEHOLDERS, não possuem credenciais válidas.
