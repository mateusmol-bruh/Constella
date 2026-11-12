# Constella  

[![Constella-logo.png](https://i.postimg.cc/hjr3SX52/Constella-logo.png)](https://postimg.cc/MMnY5pxB)

Uma plataforma digital voltada para mulheres, utilizando um algoritmo de compatibilidade para recomendar conexões entre usuárias com interesses e objetivos semelhantes, além de disponibilizar recursos relacionados a apoio, segurança e desenvolvimento pessoal e profissional.

## 🤝 Colaboradores

|   Nome do Colaborador  | Funções |
|:----------------------:|---------|
| Beatris Custódio       | - Analista de Requisitos |
| Enzo Oliveira Martins  | - Programador Back-End <br> - Scrum Master (2ª Sprint) |
| Lucca Oliveira Santana | - Administrador de Banco de Dados |
| Mateus Della Lastra Mol | - Product Owner (1ª Sprint) |
| Nathália Queiroga de Souza | - Designer de Wireframe (UX/UI)<br> - Product Owner (2ª Sprint) |
| Rafael Begali de Sá | - Scrum Master (1ª Sprint) |

## 📝 Licença

Esse projeto está sob licença. Veja o arquivo [LICENÇA](LICENSE) para mais detalhes.

# Execução local do Constella

O repositório contém três módulos independentes: `backend/`, `mobile/` e `frontend-moderadora/`. Instale as dependências dentro da pasta de cada módulo usando `npm ci`; os lockfiles correspondentes devem ser preservados.

## Configuração local

- Backend: crie `backend/.env` a partir de `backend/.env.example` e preencha os valores do ambiente local. Não sobrescreva um `.env` existente nem compartilhe credenciais.
- Mobile: dentro de `mobile/`, execute `npm run configure:api` para criar a configuração local da API quando necessário. O comando pode pedir a origem acessível pelo aparelho. Não copie variáveis secretas do backend para o aplicativo.
- Painel: `frontend-moderadora/.env.example` documenta `BACKEND_URL`. Sem configuração local, o painel usa o backend em `http://localhost:3000`.

Arquivos `.env` reais são locais e não devem ser versionados. Os arquivos `.env.example` contêm nomes e valores de referência, não credenciais de produção.

## Banco de dados e backend

1. Com PostgreSQL de desenvolvimento configurado em `backend/.env`, instale dependências com `npm ci` dentro de `backend/`.
2. Valide o schema com `npm run prisma:validate` e consulte o estado das migrations com `npm run prisma:status`.
3. Para aplicar migrations em um banco autorizado, use `npx prisma migrate deploy --config ./prisma7.config.ts` dentro de `backend/`. Confirme o banco alvo antes de executar; não use comandos de reset.
4. Inicie a API em desenvolvimento com `npm run dev`. A porta padrão é 3000; `npm start` inicia o servidor sem Nodemon.

O seed configurado do Prisma é executado por `npm run seed`. Ele exige opt-in explícito de desenvolvimento e senha local; use somente após confirmar o destino do banco. `docs/seed` é um registro legado e não substitui o seed configurado.

As migrations ativas ficam em `backend/src/prisma/migrations/`; `backend/src/prisma/schema.prisma` é o schema atual. A pasta `backend/uploads/` contém arquivos enviados e deve ser preservada junto com os dados do banco.

## Mobile

Dentro de `mobile/`, instale dependências com `npm ci`, configure a origem da API com `npm run configure:api` e inicie o Expo com `npm start`. Para desenvolvimento em rede local, consulte `mobile/README.md` e os comandos `npm run start:lan` e `npm run check:lan` definidos nesse módulo.

Verificações disponíveis: `npm run typecheck`, `npm run lint` e `npm test`. O teste de integração local é opt-in; siga as condições descritas em `mobile/README.md` antes de habilitá-lo.

## Painel da moderadora

Com a API em execução, dentro de `frontend-moderadora/`, execute `npm ci` e `npm run dev`. O painel fica em `http://localhost:3001/moderadora` e exige uma conta de moderadora já cadastrada. Para validar a compilação, execute `npm run build`; após o build, `npm start` serve a versão compilada.

## Documentação

- `mobile/README.md`: fluxo mobile, configuração da API e verificações.
- `frontend-moderadora/README.md`: painel, proxy para a API e funcionalidades disponíveis.
- `backend/contracts/`: contratos usados pelo backend.
- `backend/proposals/` e `docs/testes/`: propostas, históricos e evidências; não são substitutos das rotas, migrations ou testes atuais.

Não há um instalador de agentes, pasta `templates/` ou `COMANDOS_BACKEND.md` neste repositório. As instruções deste arquivo usam os manifests, scripts e exemplos de ambiente presentes nos módulos.

