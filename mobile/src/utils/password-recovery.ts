import { z } from 'zod';
import { emailSchema, passwordSchema } from './validation';
export const recoveryEmailSchema = z.object({ email: emailSchema });
export const recoveryCodeSchema = z.object({
  codigo: z.string().regex(/^\d{6}$/, 'Informe os seis dígitos do código.'),
});
export const recoveryPasswordSchema = z
  .object({
    novaSenha: passwordSchema,
    confirmarSenha: z.string().min(1, 'Confirme sua nova senha.'),
  })
  .refine((v) => v.novaSenha === v.confirmarSenha, {
    path: ['confirmarSenha'],
    message: 'As senhas precisam ser iguais.',
  });
export function recoveryCooldown(last: number, now = Date.now()) {
  return Math.max(0, Math.ceil((last + 60000 - now) / 1000));
}
