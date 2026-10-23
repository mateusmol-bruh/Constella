import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Avatar } from '../components/Artwork';
import { Sheet, searchMatches } from '../components/Social';
import { Button, Chip, Header, Notice, ResourceState, Screen, SearchField } from '../components/ui';
import { useCommunity } from '../constexts/CommunityContext';
import { useResource } from '../hooks/useResource';
import { errorMessage } from '../services/api';
import { colors, ui } from '../styles/theme';
import type { Person } from '../types/models';
import type { RootStackParamList } from '../types/navigation';

export default function ConexoesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const repo = useCommunity();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Person>();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const resource = useResource(async () => {
    const [people, accepted, sent, received] = await Promise.all([repo.people(query), repo.connections(), repo.sent(), repo.received()]);
    return { people, accepted, sent, received };
  });
  const firstSearch = useRef(true);
  useEffect(() => {
    if (firstSearch.current) { firstSearch.current = false; return; }
    const timer = setTimeout(() => { void resource.reload(true); }, 300);
    return () => clearTimeout(timer);
  }, [query, resource.reload]);
  const people = resource.data?.people.filter(item => searchMatches(item.nome, query)) ?? [];
  function connection(id: string) {
    return [...(resource.data?.accepted ?? []), ...(resource.data?.sent ?? []), ...(resource.data?.received ?? [])].find(item => item.id_user_solicit === id || item.id_user_receb === id);
  }
  async function action(key: string, work: () => Promise<void>) {
    if (busy) return;
    setBusy(key); setError('');
    try { await work(); await resource.reload(); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(''); }
  }
  async function chat(person: Person) {
    const result = await repo.startChat(person.id);
    setSelected(undefined); navigation.navigate('Chat', { id: result.id_chat, nome: person.nome, foto: person.foto });
  }
  return <Screen>
    <Header title="Conexões" /><SearchField value={query} onChangeText={setQuery} placeholder="Pesquisar usuária" />
    <Notice text={error} />
    <ResourceState {...resource} empty={!people.length && 'Nenhuma usuária encontrada.'} onRetry={() => void resource.reload()} />
    {!!resource.data?.received.length && <View style={{ gap: 10 }}>
      <Text style={ui.subtitle}>Querem se conectar</Text>
      {resource.data.received.map(item => <View key={item.id_conexao} style={ui.card}><Text style={ui.body}>{item.outra_usuaria?.nome_usr ?? 'Nova solicitação'}</Text><View style={ui.row}>
        <View style={{ flex: 1 }}><Button title="Aceitar" small loading={busy === item.id_conexao} disabled={!!busy} onPress={() => void action(item.id_conexao, () => repo.respond(item.id_conexao, true))} /></View>
        <View style={{ flex: 1 }}><Button title="Recusar" small variant="secondary" disabled={!!busy} onPress={() => void action(item.id_conexao, () => repo.respond(item.id_conexao, false))} /></View>
      </View></View>)}
    </View>}
    <View style={[ui.wrap, { gap: 14 }]}>
      {people.map(person => {
        const status = connection(person.id)?.status_conexao;
        return <View key={person.id} style={[ui.card, { width: '47%', padding: 14, gap: 10 }]}>
          <Avatar nome={person.nome} foto={person.foto} size={50} /><Text style={[ui.body, { fontSize: 19 }]}>{person.nome}</Text>
          <View style={ui.wrap}>{person.interesses.slice(0, 3).map(item => <Chip key={item.id} title={item.nome} />)}</View>
          <Button title={status === 'ACEITO' ? 'Conversar' : status === 'PENDENTE' ? 'Pendente' : 'Conectar'} variant="secondary" small disabled={!!busy || status === 'PENDENTE'} loading={busy === person.id} onPress={() => void action(person.id, () => status === 'ACEITO' ? chat(person) : repo.connect(person.id))} />
          <Pressable accessibilityRole="button" accessibilityLabel={'Mais informações sobre ' + person.nome} disabled={!!busy} onPress={() => void action('details-' + person.id, async () => setSelected(await repo.person(person.id)))} style={{ minHeight: 36, justifyContent: 'center' }}><Text style={[ui.muted, { fontSize: 11, textAlign: 'center' }]}>Mais informações...</Text></Pressable>
        </View>;
      })}
    </View>
    <Sheet visible={!!selected} title={selected?.nome ?? ''} onClose={() => setSelected(undefined)}>
      {selected && <><View style={{ alignItems: 'center' }}><Avatar nome={selected.nome} foto={selected.foto} size={96} /></View><Text style={ui.body}>Seus gostos</Text><View style={ui.wrap}>{selected.interesses.map(item => <Chip key={item.id} title={item.nome} />)}</View><Notice text={error} />
        <Button title={selected.conexao?.status === 'ACEITO' ? 'Conversar' : selected.conexao ? 'Solicitação já registrada' : 'Conectar'} disabled={!!busy || (!!selected.conexao && selected.conexao.status !== 'ACEITO')} loading={busy === 'modal'} onPress={() => void action('modal', async () => {
          if (selected.conexao?.status === 'ACEITO') await chat(selected);
          else { await repo.connect(selected.id); setSelected(await repo.person(selected.id)); }
        })} />
      </>}
    </Sheet>
  </Screen>;
}
