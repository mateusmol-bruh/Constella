import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField } from '../components/FormField';
import { Button, Header, Notice, Screen, TextLink } from '../components/ui';
import { useAuth } from '../constexts/AuthContext';
import { errorMessage } from '../services/api';
import { registerSchema } from '../utils/validation';
import { ui } from '../styles/theme';
import type { ScreenProps } from '../types/navigation';

export default function CadastroScreen({ navigation }: ScreenProps<'Cadastro'>) {
  const auth = useAuth();
  const [error, setError] = useState('');
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema), defaultValues: { nome: '', email: '', cpf: '', senha: '', confirmarSenha: '' },
  });
  useEffect(() => {
    if (auth.user) navigation.reset({ index: 0, routes: [{ name: auth.needsOnboarding === null ? 'VerificarConta' : auth.needsOnboarding ? 'Onboarding' : 'Main' }] });
  }, [auth.user, auth.needsOnboarding, navigation]);
  const submit = handleSubmit(async ({ confirmarSenha, ...values }) => {
    if (isSubmitting) return;
    setError('');
    try { await auth.register({ ...values, cpf: values.cpf.replace(/\D/g, '') }); } catch (cause) { setError(errorMessage(cause)); }
  });
  return <Screen centered bottomSafe>
    <Header title="Cadastro" onBack={() => navigation.goBack()} />
    <Text style={[ui.body, { marginBottom: 12 }]}><Text style={{ fontWeight: '700', fontStyle: 'italic' }}>Vamos começar? </Text>Preencha os campos para criar sua conta.</Text>
    <FormField control={control} name="nome" label="Nome" icon="profile" autoComplete="name" maxLength={255} />
    <FormField control={control} name="email" label="E-mail" icon="mail" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
    <FormField control={control} name="cpf" label="CPF" icon="shield" keyboardType="number-pad" maxLength={14} />
    <FormField control={control} name="senha" label="Senha" icon="lock" password autoCapitalize="none" autoComplete="new-password" />
    <FormField control={control} name="confirmarSenha" label="Confirmar senha" icon="lock" password autoCapitalize="none" autoComplete="new-password" />
    <Notice text={error} />
    <Button title="Registrar" loading={isSubmitting} onPress={() => void submit()} />
    <TextLink title="Já possui uma conta? Faça login" onPress={() => navigation.goBack()} />
  </Screen>;
}
