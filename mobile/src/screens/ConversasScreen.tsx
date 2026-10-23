import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CollectionRow, searchMatches } from '../components/Social';
import { Button, Header, ResourceState, Screen, SearchField } from '../components/ui';
import { useCommunity } from '../constexts/CommunityContext';
import { useResource } from '../hooks/useResource';
import type { RootStackParamList } from '../types/navigation';

export default function ConversasScreen() {
  const repo = useCommunity();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState('');
  const resource = useResource(repo.conversations);
  const conversations = resource.data?.filter(item => searchMatches(item.destinataria?.nome ?? 'Conversa', query)) ?? [];
  return <Screen>
    <Header title="Conversas" /><SearchField value={query} onChangeText={setQuery} placeholder="Buscar conversa" />
    <ResourceState {...resource} empty={!conversations.length && (query ? 'Nenhuma conversa encontrada.' : 'Suas conversas aparecerão aqui. Comece por uma conexão.')} onRetry={() => void resource.reload()} />
    {conversations.map(item => <CollectionRow key={item.id_chat} title={item.destinataria?.nome ?? 'Conversa'} foto={item.destinataria?.foto} subtitle="Abrir conversa" onPress={() => navigation.navigate('Chat', { id: item.id_chat, nome: item.destinataria?.nome ?? 'Conversa', foto: item.destinataria?.foto })} />)}
    <Button title="Encontrar conexões" variant="secondary" small onPress={() => navigation.navigate('Main', { screen: 'Conexoes' })} />
  </Screen>;
}
