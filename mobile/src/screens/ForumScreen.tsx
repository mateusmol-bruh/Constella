import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CollectionRow, searchMatches } from '../components/Social';
import { Button, Header, ResourceState, Screen, SearchField } from '../components/ui';
import { useAuth } from '../constexts/AuthContext';
import { communityService } from '../services/community.service';
import { publicService } from '../services/public.service';
import { useResource } from '../hooks/useResource';
import { ui } from '../styles/theme';
import type { RootStackParamList } from '../types/navigation';

export default function ForumScreen() {
  const { isGuest } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState('');
  const resource = useResource(signal => isGuest ? publicService.forums(signal) : communityService.forums());
  const forums = resource.data?.filter(item => searchMatches(item.titulo, query)) ?? [];
  return <Screen>
    <Header title="Fórum" /><SearchField value={query} onChangeText={setQuery} placeholder="Buscar fórum" />
    <ResourceState {...resource} empty={!forums.length && (query ? 'Nenhum fórum encontrado.' : 'A comunidade está começando. Crie o primeiro fórum!')} onRetry={() => void resource.reload()} />
    {isGuest && <Text style={ui.body}>Entre com sua conta para ler as postagens e participar de um fórum.</Text>}
    {!resource.error && forums.map(item => <CollectionRow key={item.id_for} title={item.titulo} foto={item.capa} subtitle={item.descricao || 'Venha participar desta conversa.'} trailing={item.participando ? <Text style={[ui.muted, { fontSize: 11 }]}>Participando</Text> : undefined} onPress={() => isGuest ? navigation.navigate('ContaNecessaria', { recurso: 'Participar de um fórum' }) : navigation.navigate('ChatForum', { id: item.id_for, nome: item.titulo })} />)}
    <View style={{ flex: 1, minHeight: 30 }} /><Button title="Criar Fórum" variant="secondary" onPress={() => isGuest ? navigation.navigate('ContaNecessaria', { recurso: 'Criar um fórum' }) : navigation.navigate('CriarForum')} />
  </Screen>;
}
