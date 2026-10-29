# Painel de moderação do Constella

Interface Next.js exclusiva para moderadoras. Compartilha a API Express e o PostgreSQL usados pelo mobile.

## Iniciar

No backend: npm start (porta 3000). Neste diretório: npm ci e npm run dev (porta 3001).
Acesse http://localhost:3001/moderadora com uma conta de moderadora já cadastrada.
A URL interna padrão do Express é http://localhost:3000; para alterá-la, defina BACKEND_URL no ambiente do processo ou em .env.local. O proxy é configurado ao iniciar/compilar o Next.

Não há login de demonstração nem dados simulados no fluxo. Falhas reais aparecem na interface.
O navegador não recebe JWT em JSON nem o armazena em localStorage/sessionStorage. O backend fornece cookie HttpOnly, SameSite=Strict; CSRF fica em memória. O reload restaura a sessão pela API, e o logout a revoga no PostgreSQL.

A migração 20261029000100_moderacao_sessoes foi aplicada em desenvolvimento com autorização. Em outro banco, a aplicação dessa migração depende da autorização do responsável.

## Funcionalidades

Dashboard com contagens do banco; conteúdos gratuitos/PRO com rascunho, publicação, edição, categoria e capa; denúncias com análise e decisão auditada; consulta/edição de fóruns; consulta limitada de usuárias; relatórios próprios e histórico.

Capas usam o upload validado do Express (JPG/PNG, até 2 MB). O arquivo fica em backend/uploads, e o banco guarda caminho relativo. Não usar Cloudinary unsigned para materiais protegidos. Upload de vídeo/arquivos PRO exige infraestrutura privada e não é oferecido por este editor.

Use NODE_ENV=development no backend para HTTP local. Em produção, cookie Secure exige HTTPS. CORS_ALLOWED_ORIGINS no backend deve conter a origem completa do painel quando não for http://localhost:3001 ou http://127.0.0.1:3001. Usuárias comuns e assinantes PRO não são moderadoras.

Build: npm run build. Iniciar build: npm start. Relatório e testes: ../docs/INTEGRACAO_FINAL_MODERACAO.md.
