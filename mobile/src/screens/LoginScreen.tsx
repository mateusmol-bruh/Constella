import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Brand } from '../components/Brand';
import { FormField } from '../components/FormField';
import { Button, Notice, Screen, TextLink } from '../components/ui';
import { useAuth } from '../constexts/AuthContext';
import { errorMessage } from '../services/api';
import { loginSchema } from '../utils/validation';
import { colors, ui } from '../styles/theme';
import type { ScreenProps } from '../types/navigation';

export default function LoginScreen({ navigation }: ScreenProps<'Login'>) {
  const auth = useAuth();
  const [error, setError] = useState('');
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema), defaultValues: { email: '', senha: '' },
  });
  useEffect(() => {
    if (auth.user && !auth.restoring) navigation.reset({ index: 0, routes: [{ name: auth.needsOnboarding === null ? 'VerificarConta' : auth.needsOnboarding ? 'Onboarding' : 'Main' }] });
  }, [auth.user, auth.restoring, auth.needsOnboarding, navigation]);
  const submit = handleSubmit(async values => {
    if (isSubmitting) return;
    setError('');
    try { await auth.login(values.email, values.senha); } catch (cause) { setError(errorMessage(cause)); }
  });
  return <Screen centered bottomSafe>
    <View style={{ alignItems: 'center', marginBottom: 26, gap: 24 }}>
      <Text style={{ color: colors.paper, fontSize: 28 }}>✦</Text><Brand width={280} />
      <View style={{ alignItems: 'center' }}><Text style={ui.subtitle}>Bem-vinda!</Text><Text style={ui.body}>Faça login com suas credenciais</Text></View>
    </View>
    {auth.restoring ? <ActivityIndicator accessibilityLabel="Recuperando sessão" color={colors.paper} /> : <>
      <FormField control={control} name="email" label="E-mail" icon="mail" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
      <FormField control={control} name="senha" label="Senha" icon="lock" password autoCapitalize="none" autoComplete="current-password" onSubmitEditing={() => void submit()} returnKeyType="go" />
      <TextLink title="Esqueceu sua senha?" onPress={() => navigation.navigate('RecuperarSenha')} />
      <Notice text={error || auth.notice} />
      {auth.restoreFailed && <Button title="Tentar recuperar sessão" variant="secondary" loading={auth.restoring} onPress={() => void auth.retrySession()} />}
      <Button title="Entrar" loading={isSubmitting} onPress={() => void submit()} />
      <TextLink title="Ainda não possui uma conta? Registre-se" onPress={() => navigation.navigate('Cadastro')} />
    </>}
  </Screen>;
}
