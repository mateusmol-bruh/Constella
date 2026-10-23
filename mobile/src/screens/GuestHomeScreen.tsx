import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Brand } from '../components/Brand';
import { Button, Header, ResourceState, Screen } from '../components/ui';
import { publicService } from '../services/public.service';
import { useResource } from '../hooks/useResource';
import { ui } from '../styles/theme';
import type { RootStackParamList } from '../types/navigation';

export default function GuestHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const resource = useResource(async signal => {
    const [contents, forums] = await Promise.all([publicService.contents(signal), publicService.forums(signal)]);
    return { contents, forums };
  });
  return <Screen>
    <Brand width={110} variant="compact" /><Header title="Bem-vinda ao Constella" />
    <Text style={ui.body}>Conheça os conteúdos e os espaços da comunidade. Crie sua conta para participar das conversas.</Text>
    <Button title="Criar conta" onPress={() => navigation.navigate('Cadastro')} />
    <Button title="Entrar" variant="secondary" small onPress={() => navigation.navigate('Login')} />
    <ResourceState {...resource} onRetry={() => void resource.reload()} />
    {!resource.loading && !resource.error && resource.data && <>
      <Text style={ui.subtitle}>Conteúdos para explorar</Text>
      {resource.data.contents.slice(0, 3).map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={'Ler ' + item.titulo} style={ui.card} onPress={() => navigation.navigate('DetalheConteudo', { id: item.id })}>
        <Text style={ui.subtitle}>{item.titulo}</Text><Text style={ui.body}>{item.descricao}</Text>
      </Pressable>)}
      {!resource.data.contents.length && <Text style={ui.body}>Nenhum conteúdo publicado por enquanto.</Text>}
      <Button title="Ver todos os conteúdos" variant="secondary" small onPress={() => navigation.navigate('Main', { screen: 'Conteudos' })} />
      <Text style={ui.subtitle}>Fóruns da comunidade</Text>
      {resource.data.forums.slice(0, 3).map(item => <View key={item.id_for} style={ui.card}><Text style={ui.subtitle}>{item.titulo}</Text><Text style={ui.body}>{item.descricao}</Text><Text style={ui.muted}>{item.quantidade_membros ?? 0} participantes • entre com sua conta para participar</Text></View>)}
      {!resource.data.forums.length && <Text style={ui.body}>Nenhum fórum publicado por enquanto.</Text>}
      <Button title="Conhecer os fóruns" variant="secondary" small onPress={() => navigation.navigate('Main', { screen: 'Forum' })} />
    </>}
    <Button title="Conhecer o Constella Pro" variant="secondary" onPress={() => navigation.navigate('ConstellaPro')} />
  </Screen>;
}
