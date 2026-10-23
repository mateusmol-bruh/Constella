import React, { useState } from 'react';
import { Text } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField } from '../components/FormField';
import { Button, Header, Notice, Screen } from '../components/ui';
import { emailSchema } from '../utils/validation';
import { ui } from '../styles/theme';
import type { ScreenProps } from '../types/navigation';

const schema = z.object({ email: emailSchema });
export default function RecuperarSenhaScreen({ navigation }: ScreenProps<'RecuperarSenha'>) {
  const [notice, setNotice] = useState('');
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema), defaultValues: { email: '' },
  });
  const submit = handleSubmit(() => {
    // Não há endpoint de recuperação no backend. Nunca confirmar envio fictício.
    setNotice('A recuperação de senha ainda não está disponível. Entre em contato com a equipe do Constella para recuperar seu acesso. Nenhum e-mail foi enviado.');
  });
  return <Screen centered bottomSafe>
    <Header title="Recuperar senha" onBack={() => navigation.goBack()} />
    <Text style={ui.body}>Informe o e-mail da sua conta.</Text>
    <FormField control={control} name="email" label="E-mail" icon="mail" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
    <Notice text={notice} />
    <Button title="Continuar" loading={isSubmitting} onPress={() => void submit()} />
    <Button title="Voltar ao login" variant="secondary" onPress={() => navigation.goBack()} />
  </Screen>;
}
