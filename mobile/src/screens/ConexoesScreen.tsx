import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { CollectionRow, searchMatches } from '../components/Social';
import { PersonModal } from '../components/PersonModal';
import { Button, Chip, Header, Notice, ResourceState, Screen, SearchField } from '../components/ui';
import { useCommunity } from '../constexts/CommunityContext';
import { useResource } from '../hooks/useResource';
import { errorMessage } from '../services/api';
import { ui } from '../styles/theme';
import { useFeedback } from '../constexts/FeedbackContext';
import { socialService } from '../services/social.service';

export default function ConexoesScreen() {
  const repo = useCommunity();
  const notify = useFeedback();
  const recommendations = useResource(repo.recommendedPeople, true, 15000);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'mine' | 'requests' | 'discover' | 'blocked'>('mine');
  const blocked = useResource(socialService.blocked, true, 15000);
  const [selectedId, setSelectedId] = useState<string>();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const resource = useResource(async () => {
    const [people, accepted, sent, received] = await Promise.all([repo.people(query), repo.connections(), repo.sent(), repo.received()]);
    return { people, accepted, sent, received };
  }, true, 5000);
  const reload = resource.reload;
  useEffect(() => {
    const timer = setTimeout(() => void reload(true), 300);
    return () => clearTimeout(timer);
  }, [query, reload]);
  const linked = new Set([...(resource.data?.accepted ?? []), ...(resource.data?.sent ?? []), ...(resource.data?.received ?? [])].flatMap(item => [item.id_user_solicit, item.id_user_receb]));
  const people = resource.data?.people.filter(person => !linked.has(person.id) && searchMatches(person.nome, query)) ?? [];
  const accepted = resource.data?.accepted.filter(item => searchMatches(item.outra_usuaria?.nome_usr ?? '', query)) ?? [];
  const received = resource.data?.received.filter(item => searchMatches(item.outra_usuaria?.nome_usr ?? '', query)) ?? [];
  const sent = resource.data?.sent.filter(item => searchMatches(item.outra_usuaria?.nome_usr ?? '', query)) ?? [];
  const recommended = recommendations.data?.filter(person => person.interesses.length > 0 && !linked.has(person.id) && searchMatches(person.nome, query)) ?? [];
  const suggestedIds = new Set(recommended.map(person => person.id));
  async function respond(id: string, accept: boolean) {
    if (busy) return;
    setBusy(id); setError('');
    try { await repo.respond(id, accept); notify(accept ? 'Conexão aceita.' : 'Solicitação recusada.'); await reload(true); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(''); }
  }
  return <Screen>
    <Header title="Conexões" />
    <View style={ui.wrap}>
      <Chip title="Minhas conexões" selected={tab === 'mine'} onPress={() => setTab('mine')} />
      <Chip title={`Solicitações${resource.data?.received.length ? ` (${resource.data.received.length})` : ''}`} selected={tab === 'requests'} onPress={() => setTab('requests')} />
      <Chip title="Descobrir" selected={tab === 'discover'} onPress={() => setTab('discover')} />
      <Chip title="Bloqueadas" selected={tab === 'blocked'} onPress={() => setTab('blocked')} />
    </View>
    <SearchField value={query} onChangeText={setQuery} placeholder="Pesquisar usuária" />
    <Notice text={error} /><ResourceState {...resource} onRetry={() => void reload()} />
    {tab === 'blocked' && <>
      <ResourceState {...blocked} empty={!blocked.data?.length && 'Você não bloqueou nenhuma usuária.'} onRetry={() => void blocked.reload()} />
      {!blocked.error && blocked.data?.filter(person => searchMatches(person.nome, query)).map(person => <CollectionRow key={person.id} title={person.nome} foto={person.foto} subtitle="Ver perfil e desbloquear" onPress={() => setSelectedId(person.id)} />)}
    </>}
    {resource.data && <>
      {tab === 'mine' && <>
        {!accepted.length && <Text style={ui.body}>{query ? 'Nenhuma conexão encontrada.' : 'Suas conexões aceitas aparecerão aqui. Conheça pessoas em Descobrir.'}</Text>}
        {accepted.map(item => item.outra_usuaria && <CollectionRow key={item.id_conexao} title={item.outra_usuaria.nome_usr} foto={item.outra_usuaria.foto_usr} subtitle="Ver perfil e conversar" onPress={() => setSelectedId(item.outra_usuaria!.id_usr)} />)}
      </>}
      {tab === 'requests' && <>
        <Text style={ui.subtitle}>Recebidas</Text>
        {!received.length && <Text style={ui.body}>Nenhuma solicitação recebida.</Text>}
        {received.map(item => <View key={item.id_conexao} style={ui.card}>
          <Text style={ui.body}>{item.outra_usuaria?.nome_usr ?? 'Solicitação de conexão'}</Text>
          <View style={ui.row}><View style={{ flex: 1 }}><Button title="Aceitar" small disabled={!!busy} loading={busy === item.id_conexao} onPress={() => void respond(item.id_conexao, true)} /></View><View style={{ flex: 1 }}><Button title="Recusar" variant="secondary" small disabled={!!busy} onPress={() => void respond(item.id_conexao, false)} /></View></View>
        </View>)}
        <Text style={ui.subtitle}>Enviadas</Text>
        {!sent.length && <Text style={ui.body}>Nenhuma solicitação enviada.</Text>}
        {sent.map(item => item.outra_usuaria && <CollectionRow key={item.id_conexao} title={item.outra_usuaria.nome_usr} foto={item.outra_usuaria.foto_usr} subtitle="Aguardando resposta" onPress={() => setSelectedId(item.outra_usuaria!.id_usr)} />)}
      </>}
      {tab === 'discover' && <>
        <Text style={ui.subtitle}>Usuárias recomendadas</Text>
        <ResourceState {...recommendations} empty={!recommended.length && 'Nenhuma recomendação por interesses em comum no momento.'} onRetry={() => void recommendations.reload()} />
        {recommended.map(person => <CollectionRow key={`recommended:${person.id}`} title={person.nome} foto={person.foto} subtitle={`Em comum: ${person.interesses.map(item => item.nome).join(', ')}`} onPress={() => setSelectedId(person.id)} />)}
        <Text style={ui.subtitle}>Mais usuárias</Text>
        {!people.length && <Text style={ui.body}>Nenhuma nova usuária encontrada.</Text>}
        {people.filter(person => !suggestedIds.has(person.id)).map(person => <CollectionRow key={person.id} title={person.nome} foto={person.foto} subtitle="Conhecer perfil" onPress={() => setSelectedId(person.id)} />)}
      </>}
    </>}
    {selectedId && <PersonModal key={selectedId} id={selectedId} onClose={() => { setSelectedId(undefined); void reload(true); void recommendations.reload(true); void blocked.reload(true); }} />}
  </Screen>;
}
