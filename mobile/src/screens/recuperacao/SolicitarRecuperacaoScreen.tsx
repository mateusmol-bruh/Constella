import React, { useRef, useState } from 'react';
import { Text } from 'react-native';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField } from '../../components/FormField';
import { Button, Header, Notice, Screen } from '../../components/ui';
import {
  usePasswordRecovery,
  useRecoveryActive,
  useRecoveryWait,
  type RecoveryProps,
} from '../../constexts/PasswordRecoveryContext';
import { passwordRecoveryService } from '../../services/password-recovery.service';
import { errorMessage } from '../../services/api';
import { recoveryEmailSchema } from '../../utils/password-recovery';
import { ui } from '../../styles/theme';
export default function SolicitarRecuperacaoScreen({
  navigation,
}: RecoveryProps<'Solicitar'>) {
  const active = useRecoveryActive(),
    flow = usePasswordRecovery(),
    wait = useRecoveryWait(),
    busy = useRef(false),
    [error, setError] = useState('');
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(recoveryEmailSchema),
    defaultValues: { email: '' },
  });
  const email = useWatch({ control, name: 'email' });
  const blocked =
    wait > 0 && email.trim().toLowerCase() === flow.email;
  const submitForm = handleSubmit(async (v) => {
    if (blocked) return;
    setError('');
    try {
      await passwordRecoveryService.request(v.email);
      if (!active.current) return;
      flow.requested(v.email.trim().toLowerCase());
      navigation.navigate('Verificar');
    } catch (e) {
      if (active.current) setError(errorMessage(e));
    }
  });
  function submit() {
    if (busy.current || blocked) return;
    busy.current = true;
    void submitForm().finally(() => {
      busy.current = false;
    });
  }
  return (
    <Screen centered bottomSafe>
      <Header title="Esqueci minha senha" onBack={flow.login} />
      <Text style={ui.body}>
        Informe o e-mail da sua conta para receber um código de recuperação.
      </Text>
      <FormField
        control={control}
        name="email"
        label="E-mail"
        icon="mail"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isSubmitting}
        onSubmitEditing={submit}
        returnKeyType="send"
      />
      <Notice text={error} />
      <Button
        title={
          blocked ? 'Aguarde ' + wait + ' s para reenviar' : 'Enviar código'
        }
        disabled={blocked}
        loading={isSubmitting}
        onPress={submit}
      />
      <Button
        title="Voltar ao login"
        variant="secondary"
        disabled={isSubmitting}
        onPress={flow.login}
      />
    </Screen>
  );
}
