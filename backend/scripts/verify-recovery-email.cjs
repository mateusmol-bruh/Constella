require('dotenv').config({ quiet: true });
(async () => {
  try {
    require('../src/utils/recuperacao-config').configured();
  } catch {
    console.error(
      'Configuração de recuperação ausente ou inválida. Revise EMAIL_USER, EMAIL_APP_PASSWORD, EMAIL_FROM_NAME e PASSWORD_RESET_SECRET; os valores foram omitidos.',
    );
    process.exitCode = 1;
    return;
  }
  try {
    await require('../src/services/email.service').verificarConexao();
    console.log(
      'Conexão TLS e autenticação Gmail verificadas. Nenhum e-mail foi enviado.',
    );
  } catch (error) {
    console.error(
      error.code === 'EAUTH'
        ? 'Autenticação Gmail recusada. Confira a conta remetente e a senha de aplicativo.'
        : 'Não foi possível conectar ao Gmail por SMTP. Confira rede, porta 465 e acesso TLS.',
    );
    process.exitCode = 1;
  }
})().catch(() => {
  console.error('Falha na verificação SMTP; detalhes privados omitidos.');
  process.exitCode = 1;
});
