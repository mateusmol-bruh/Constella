import React, { useRef, useState } from 'react';
import { Text } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField } from '../../components/FormField';
import { Button, Header, Notice, Screen } from '../../components/ui';
import {
  usePasswordRecovery,
  useRecoveryActive,
  type RecoveryProps,
} from '../../constexts/PasswordRecoveryContext';
import { passwordRecoveryService } from '../../services/password-recovery.service';
import { errorMessage } from '../../services/api';
import { recoveryPasswordSchema } from '../../utils/password-recovery';
import { ui } from '../../styles/theme';
export default function NovaSenhaScreen({
  navigation,
}: RecoveryProps<'NovaSenha'>) {
  const active = useRecoveryActive(),
    flow = usePasswordRecovery(),
    busy = useRef(false),
    [error, setError] = useState('');
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(recoveryPasswordSchema),
    defaultValues: { novaSenha: '', confirmarSenha: '' },
  });
  const submitForm = handleSubmit(async (v) => {
    setError('');
    try {
      await passwordRecoveryService.reset(flow.email, flow.codigo, v.novaSenha);
      if (!active.current) return;
      reset();
      flow.success();
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
  return (
    <Screen centered bottomSafe>
      <Header
        title="Nova senha"
        onBack={() => {
          if (!busy.current) navigation.goBack();
        }}
      />
      <Text style={ui.body}>
        Escolha uma senha diferente da atual, com pelo menos 8 caracteres.
      </Text>
      <FormField
        control={control}
        name="novaSenha"
        label="Nova senha"
        icon="lock"
        password
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!isSubmitting}
      />
      <FormField
        control={control}
        name="confirmarSenha"
        label="Confirmar nova senha"
        icon="lock"
        password
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!isSubmitting}
        onSubmitEditing={submit}
        returnKeyType="done"
      />
      <Notice text={error} />
      <Button
        title="Redefinir senha"
        loading={isSubmitting}
        onPress={submit}
      />
      <Button
        title="Informar outro código"
        variant="secondary"
        disabled={isSubmitting}
        onPress={() => navigation.goBack()}
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
