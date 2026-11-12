import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { colors, ui } from '../styles/theme';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CollectionRow, searchMatches } from '../components/Social';
import { Button, Header, Notice, ResourceState, Screen, SearchField } from '../components/ui';
import { useCommunity } from '../constexts/CommunityContext';
import { useResource } from '../hooks/useResource';
import { errorMessage } from '../services/api';
import { chatEntries, type ChatEntry } from '../utils/conversations';
import type { RootStackParamList } from '../types/navigation';

export default function ConversasScreen() {
  const repo = useCommunity();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState('');
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');
  const resource = useResource(async () => {
    const [chats, connections] = await Promise.all([repo.conversations(), repo.connections()]);
    return chatEntries(chats, connections);
  }, true, 5000);
  const conversations = resource.data?.filter(item => searchMatches(item.nome, query)) ?? [];
  async function open(item: ChatEntry) {
    if (opening) return;
    setOpening(true); setError('');
    try {
      const chatId = item.chatId ?? (item.personId ? (await repo.startChat(item.personId)).id_chat : undefined);
      if (!chatId) throw new Error('Conversa indisponível.');
      navigation.navigate('Chat', { id: chatId, nome: item.nome, foto: item.foto });
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setOpening(false); }
  }
  return <Screen>
    <Header title="Conversas" /><SearchField value={query} onChangeText={setQuery} placeholder="Buscar conversa" />
    <Notice text={error} />
    <ResourceState {...resource} empty={!conversations.length && (query ? 'Nenhuma conversa encontrada.' : 'Suas conexões aceitas aparecerão aqui para conversar.')} onRetry={() => void resource.reload()} />
    {conversations.map(item => <CollectionRow key={item.key} title={item.nome} foto={item.foto} subtitle={item.lastMessage ?? 'Diga olá para começar a conversa'} trailing={<View style={{ alignItems: 'flex-end', gap: 6 }}>
      {item.lastDate && <Text style={[ui.muted, { fontSize: 10 }]}>{new Date(item.lastDate).toDateString() === new Date().toDateString() ? new Date(item.lastDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : new Date(item.lastDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</Text>}
      {!!item.unread && <Text accessibilityLabel={item.unread + ' mensagens não lidas'} style={{ color: colors.ink, backgroundColor: colors.lavender, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 15 }}>{item.unread}</Text>}
    </View>} onPress={() => void open(item)} />)}
    <Button title="Encontrar conexões" variant="secondary" small onPress={() => navigation.navigate('Main', { screen: 'Conexoes' })} />
  </Screen>;
}
