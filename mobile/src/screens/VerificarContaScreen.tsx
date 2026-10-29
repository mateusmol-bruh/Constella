import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { Brand } from '../components/Brand';
import { Button, Notice, Screen } from '../components/ui';
import { useAuth } from '../constexts/AuthContext';
import { ui } from '../styles/theme';
import type { ScreenProps } from '../types/navigation';

export default function VerificarContaScreen({ navigation }: ScreenProps<'VerificarConta'>) {
  const auth = useAuth();
  useEffect(() => {
    if (auth.user && auth.needsOnboarding !== null) navigation.reset({ index: 0, routes: [{ name: auth.needsOnboarding ? 'Onboarding' : 'Main' }] });
  }, [auth.user, auth.needsOnboarding, navigation]);
  return <Screen centered bottomSafe><Brand width={160} variant="compact" />
    <Text style={ui.title}>Sua conta</Text>
    <Text style={ui.body}>Não foi possível confirmar sua configuração inicial. Tente novamente para continuar.</Text>
    <Notice text={auth.notice} /><Button title="Tentar novamente" loading={auth.restoring} onPress={() => void auth.retryAccount()} />
    <Button title="Sair da conta" variant="secondary" onPress={() => void auth.logout()} />
  </Screen>;
}

