const fs = require('node:fs'),
  path = require('node:path'),
  nodemailer = require('nodemailer');
const { emailConfig } = require('../utils/recuperacao-config');
const { template, LOGO_CID } = require('../templates/recuperacao-senha');
const logoPath = path.resolve(
  __dirname,
  '../../assets/email/constella-logo.png',
);
function createEmailService({
  createTransport = (options) => nodemailer.createTransport(options),
  logo = () => fs.readFileSync(logoPath),
} = {}) {
  function message(to, code) {
    const { from } = emailConfig();
    return {
      from,
      to: { address: to },
      ...template(code),
      attachments: [
        {
          filename: 'constella-logo.png',
          content: logo(),
          contentType: 'image/png',
          contentDisposition: 'inline',
          cid: LOGO_CID,
        },
      ],
    };
  }
  async function enviarCodigo(to, code) {
    const sender = createTransport(emailConfig().transport);
    try {
      const info = await sender.sendMail(message(to, code));
      if (!info.accepted?.length)
        throw new Error('O servidor SMTP não aceitou a mensagem.');
    } finally {
      sender.close?.();
    }
  }
  async function verificarConexao() {
    const sender = createTransport(emailConfig().transport);
    try {
      await sender.verify();
    } finally {
      sender.close?.();
    }
  }
  return { message, enviarCodigo, verificarConexao };
}
module.exports = { ...createEmailService(), createEmailService, logoPath };
