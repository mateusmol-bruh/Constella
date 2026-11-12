import React from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Brand } from './Brand';
import { Icon } from './Icon';
import { Button, Screen } from './ui';
import { ui } from '../styles/theme';
import type { RootStackParamList } from '../types/navigation';

export default function ProtectedCTA({ title = 'Participe do Constella', embedded = false }: { title?: string; embedded?: boolean }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const content = <View style={{ gap: 18 }}>
    <Brand variant="compact" width={140} />
    <Icon name="lock" size={32} />
    <Text style={ui.title}>{title}</Text>
    <Text style={ui.body}>Entre ou crie sua conta para conversar, se conectar e participar dos fóruns.</Text>
    <Button title="Entrar" onPress={() => navigation.navigate('Login')} />
    <Button title="Criar conta" variant="secondary" onPress={() => navigation.navigate('Cadastro')} />
  </View>;
  return embedded ? content : <Screen centered>{content}</Screen>;
}
