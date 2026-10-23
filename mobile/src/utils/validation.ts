import { z } from 'zod';
export function validCpf(value: string): boolean {
  const cpf = value.replace(/\D/g, '');
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index++) sum += Number(cpf[index]) * (length + 1 - index);
    const result = (sum * 10) % 11;
    return result === 10 ? 0 : result;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}
export function utf8Bytes(value: string): number {
  return [...value].reduce((total, character) => {
    const point = character.codePointAt(0) ?? 0;
    return total + (point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4);
  }, 0);
}
export const emailSchema = z.string().trim().email('Informe um e-mail válido.').max(255, 'Use até 255 caracteres.');
export const loginSchema = z.object({ email: emailSchema, senha: z.string().min(1, 'Informe sua senha.') });
export const registerSchema = z.object({
  nome: z.string().trim().min(1, 'Informe seu nome.').max(255, 'Use até 255 caracteres.'),
  email: emailSchema,
  senha: z.string().min(8, 'Use pelo menos 8 caracteres.').refine(value => utf8Bytes(value) <= 72, 'A senha deve ter até 72 bytes.'),
  cpf: z.string().refine(value => /^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/.test(value) && validCpf(value), 'Informe um CPF válido.'),
  confirmarSenha: z.string(),
}).refine(value => value.senha === value.confirmarSenha, { path: ['confirmarSenha'], message: 'As senhas precisam ser iguais.' });
export const forumSchema = z.object({
  titulo: z.string().trim().min(1, 'Dê um título ao fórum.').max(255, 'Use até 255 caracteres.'),
  descricao: z.string().trim().max(255, 'Use até 255 caracteres.'),
  capa: z.string().trim().max(255, 'Use até 255 caracteres.').refine(value => !value || /^https?:\/\/[^\s]+$/i.test(value), 'Informe uma URL de imagem http ou https.'),
});
