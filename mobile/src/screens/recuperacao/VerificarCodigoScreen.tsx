import React, { useRef, useState } from 'react';
import { Text } from 'react-native';
import { useForm } from 'react-hook-form';
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
import { recoveryCodeSchema } from '../../utils/password-recovery';
import { ui } from '../../styles/theme';
export default function VerificarCodigoScreen({
  navigation,
}: RecoveryProps<'Verificar'>) {
  const active = useRecoveryActive(),
    flow = usePasswordRecovery(),
    wait = useRecoveryWait(),
    busy = useRef(false),
    [error, setError] = useState(''),
    [sending, setSending] = useState(false);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(recoveryCodeSchema),
    defaultValues: { codigo: '' },
  });
  const submitForm = handleSubmit(async (v) => {
    setError('');
    try {
      await passwordRecoveryService.verify(flow.email, v.codigo);
      if (!active.current) return;
      flow.verified(v.codigo);
      navigation.navigate('NovaSenha');
    } catch (e) {
      if (active.current) setError(errorMessage(e));
    }
  });
  function submit() {
    if (busy.current) return;
    busy.current = true;
    void submitForm().finally(() => {
      busy.current = false;
    });
  }
  async function resend() {
    if (busy.current || wait > 0) return;
    busy.current = true;
    setSending(true);
    setError('');
    try {
      await passwordRecoveryService.request(flow.email);
      if (!active.current) return;
      flow.requested(flow.email);
      reset();
    } catch (e) {
      if (active.current) setError(errorMessage(e));
    } finally {
      busy.current = false;
      if (active.current) setSending(false);
    }
  }
  return (
    <Screen centered bottomSafe>
      <Header
        title="Verificar código"
        onBack={() => {
          if (!busy.current) navigation.goBack();
        }}
      />
      <Text style={ui.body}>
        Se existir uma conta associada a este e-mail, você receberá as
        instruções de recuperação.
      </Text>
      <Text style={ui.muted}>
        Confira sua caixa de entrada e o spam. O código tem seis dígitos e vale
        por até 10 minutos. Um novo envio invalida o anterior.
      </Text>
      <FormField
        control={control}
        name="codigo"
        label="Código de seis dígitos"
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        autoCorrect={false}
        editable={!isSubmitting && !sending}
        onSubmitEditing={submit}
        returnKeyType="next"
      />
      <Notice text={error} />
      <Button
        title="Continuar"
        loading={isSubmitting}
        disabled={sending}
        onPress={submit}
      />
      <Button
        title={
          wait > 0 ? 'Reenviar código em ' + wait + ' s' : 'Reenviar código'
        }
        variant="secondary"
        disabled={wait > 0 || isSubmitting}
        loading={sending}
        onPress={() => void resend()}
      />
      <Button
        title="Usar outro e-mail"
        variant="secondary"
        disabled={sending || isSubmitting}
        onPress={() => navigation.goBack()}
      />
      <Button
        title="Voltar ao login"
        variant="secondary"
        disabled={sending || isSubmitting}
        onPress={flow.login}
      />
    </Screen>
  );
}
