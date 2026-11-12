import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  PasswordRecoveryContext,
  type RecoveryStackParams,
} from '../constexts/PasswordRecoveryContext';
import Solicitar from './recuperacao/SolicitarRecuperacaoScreen';
import Verificar from './recuperacao/VerificarCodigoScreen';
import NovaSenha from './recuperacao/NovaSenhaScreen';
import { colors } from '../styles/theme';
import type { ScreenProps } from '../types/navigation';

const Stack = createNativeStackNavigator<RecoveryStackParams>();
export default function RecuperarSenhaScreen({
  navigation,
}: ScreenProps<'RecuperarSenha'>) {
  const [email, setEmail] = useState(''),
    [codigo, setCodigo] = useState(''),
    [lastRequest, setLastRequest] = useState(0);
  // Código somente na memória deste fluxo; nunca em URL, parâmetros ou storage.
  const login = () =>
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  return (
    <PasswordRecoveryContext.Provider
      value={{
        email,
        codigo,
        lastRequest,
        requested: (value) => {
          setEmail(value);
          setCodigo('');
          setLastRequest(Date.now());
        },
        verified: setCodigo,
        login,
        success: () => {
          setCodigo('');
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login', params: { senhaRedefinida: true } }],
          });
        },
      }}
    >
      <Stack.Navigator
        initialRouteName="Solicitar"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.night },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="Solicitar" component={Solicitar} />
        <Stack.Screen name="Verificar" component={Verificar} />
        <Stack.Screen name="NovaSenha" component={NovaSenha} />
      </Stack.Navigator>
    </PasswordRecoveryContext.Provider>
  );
}
