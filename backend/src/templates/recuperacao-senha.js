const LOGO_CID = 'constella-logo@constella.local';
function template(code) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code))
    throw new Error('Código de recuperação inválido.');
  return {
    subject: 'Constella | Recuperação de senha',
    text:
      'Olá!\n\nRecebemos uma solicitação para redefinir a senha da sua conta no Constella.\nPara continuar, informe o código abaixo na tela de recuperação do aplicativo.\n\n' +
      code +
      '\n\nEste código é válido por 10 minutos e poderá ser utilizado apenas uma vez para redefinir sua senha.\nSe você não solicitou esta alteração, ignore esta mensagem. Sua senha atual permanecerá a mesma. Não compartilhe o código com ninguém.\n\nAtenciosamente,\nEquipe Constella.\nMensagem automática.',
    html: `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Recuperação de senha — Constella</title></head>
<body style="margin:0;padding:0;background-color:#F0E5F7;color:#35256B;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;font-size:1px;color:#F0E5F7;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Instruções para recuperar sua conta no Constella. Código válido por 10 minutos.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F0E5F7"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#FFFFFF;border:1px solid #E1CDED;border-radius:16px;">
<tr><td align="center" bgcolor="#F9F2FF" style="padding:28px 24px;border-radius:16px 16px 0 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#58328B" style="padding:18px 26px;border-radius:14px;"><img src="cid:${LOGO_CID}" width="179" height="52" alt="Logo do Constella" style="display:block;width:179px;height:52px;max-width:100%;border:0;color:#FFFFFF;font-size:24px;"></td></tr></table>
</td></tr>
<tr><td style="padding:28px 24px 16px;"><h1 style="margin:0 0 24px;color:#58328B;font-size:25px;line-height:32px;">Recuperação de senha</h1><p style="margin:0 0 16px;font-size:16px;line-height:25px;">Olá!</p><p style="margin:0 0 16px;font-size:16px;line-height:25px;">Recebemos uma solicitação para redefinir a senha da sua conta no Constella.</p><p style="margin:0;font-size:16px;line-height:25px;">Para continuar, informe o código abaixo na tela de recuperação de senha do aplicativo.</p></td></tr>
<tr><td align="center" style="padding:12px 24px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4E4F6" style="border:1px solid #DABAE8;border-radius:12px;"><tr><td align="center" style="padding:22px 8px;color:#35256B;font-family:Consolas,'Courier New',monospace;font-size:34px;line-height:42px;letter-spacing:7px;font-weight:bold;">${code}</td></tr></table></td></tr>
<tr><td style="padding:0 24px 28px;"><p style="margin:0 0 18px;font-size:15px;line-height:24px;">Este código é válido por <strong>10 minutos</strong> e poderá ser utilizado <strong>apenas uma vez</strong> para redefinir sua senha.</p><p style="margin:0 0 20px;font-size:14px;line-height:23px;color:#66517E;">Se você não solicitou esta alteração, ignore esta mensagem. Sua senha atual permanecerá a mesma. Não compartilhe o código com ninguém.</p><p style="margin:0;font-size:15px;line-height:24px;">Atenciosamente,<br><strong>Equipe Constella</strong></p></td></tr>
<tr><td align="center" bgcolor="#F9F2FF" style="padding:20px 24px;border-top:1px solid #E1CDED;border-radius:0 0 16px 16px;"><p style="margin:0 0 6px;font-size:13px;line-height:20px;color:#66517E;">Mensagem automática. Não responda a este e-mail.</p><p style="margin:0;font-size:13px;line-height:20px;color:#58328B;">Constella · O céu fica maior quando estamos juntas.</p></td></tr>
</table></td></tr></table></body></html>`,
  };
}
module.exports = { template, LOGO_CID };
