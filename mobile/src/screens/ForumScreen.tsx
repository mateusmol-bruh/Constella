import React, { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CollectionRow, searchMatches } from '../components/Social';
import { Button, Chip, Header, Notice, ResourceState, Screen, SearchField } from '../components/ui';
import { useAuth } from '../constexts/AuthContext';
import { socialService } from '../services/social.service';
import { Icon } from '../components/Icon';
import { publicService } from '../services/public.service';
import { useResource } from '../hooks/useResource';
import { colors, ui } from '../styles/theme';
import type { RootStackParamList } from '../types/navigation';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { errorMessage } from '../services/api';
import { useNotifications } from '../constexts/NotificationsContext';
import type { Forum } from '../types/models';

const mergeForums = (left: Forum[], right: Forum[]) => [...new Map([...left, ...right].map(forum => [forum.id_for, forum])).values()];

export default function ForumScreen() {
  const { isGuest } = useAuth();
  const { enabled: pushEnabled } = useNotifications();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'mine' | 'all'>('all');
  const search = useDebouncedValue(query.trim());
  const pages = React.useRef(1);
  const key = tab + ':' + search;
  const previousKey = React.useRef(key);
  const epoch = React.useRef(0);
  const [moreBusy, setMoreBusy] = useState(false);
  const [moreError, setMoreError] = useState('');
  useFocusEffect(React.useCallback(() => {
    if (previousKey.current !== key) { pages.current = 1; previousKey.current = key; }
    epoch.current++;
    setMoreBusy(false); setMoreError('');
    return () => { epoch.current++; };
  }, [key]));
  const resource = useResource(async signal => {
    if (isGuest) return { foruns: (await publicService.forums(signal)).filter(item => searchMatches(item.titulo, search)), pagina: 1, tem_mais: false };
    const first = await socialService.forumPage(tab === 'all' ? 'explorar' : 'meus', search, 1, signal);
    let result = first;
    for (let page = 2; page <= pages.current && result.tem_mais; page++) {
      const next = await socialService.forumPage(tab === 'all' ? 'explorar' : 'meus', search, page, signal);
      result = { ...next, foruns: mergeForums(result.foruns, next.foruns) };
    }
    return result;
  }, true, pushEnabled ? 0 : 5000, key);
  const forums = resource.data?.foruns ?? [];
  async function more() {
    if (moreBusy || !resource.data?.tem_mais) return;
    const version = epoch.current, page = resource.data.pagina + 1;
    setMoreBusy(true); setMoreError('');
    try {
      const next = await socialService.forumPage(tab === 'all' ? 'explorar' : 'meus', search, page);
      if (epoch.current !== version) return;
      pages.current = page;
      resource.setData(previous => previous && previous.pagina === page - 1 ? { ...next, foruns: mergeForums(previous.foruns, next.foruns) } : previous);
    } catch (cause) { if (epoch.current === version) setMoreError(errorMessage(cause)); }
    finally { if (epoch.current === version) setMoreBusy(false); }
  }
  return <Screen scroll={false}>
    <Header title="Fóruns" right={<Pressable accessibilityRole="button" accessibilityLabel="Criar fórum" onPress={() => isGuest ? navigation.navigate('ContaNecessaria', { recurso: 'Criar um fórum' }) : navigation.navigate('CriarForum')} style={{ minWidth: 44, minHeight: 44, borderRadius: 22, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" /></Pressable>} />
    {!isGuest && <View style={ui.wrap}>
      <Chip title="Meus fóruns" selected={tab === 'mine'} onPress={() => setTab('mine')} />
      <Chip title="Explorar" selected={tab === 'all'} onPress={() => setTab('all')} />
    </View>}
    <SearchField value={query} onChangeText={setQuery} placeholder="Buscar fórum" />
    <FlatList style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 16 }} data={resource.error ? [] : forums} keyExtractor={item => item.id_for} keyboardShouldPersistTaps="handled"
      ListHeaderComponent={<ResourceState {...resource} empty={!forums.length && (search ? 'Nenhum fórum encontrado.' : tab === 'mine' && !isGuest ? 'Você ainda não participa de fóruns. Encontre um em Explorar ou crie o seu.' : 'Nenhum fórum disponível. Crie o primeiro!')} onRetry={() => void resource.reload()} />}
      renderItem={({ item }) => <CollectionRow title={item.titulo} foto={item.capa} variant="forum" subtitle={item.descricao || 'Venha participar desta conversa.'} trailing={!!item.nao_lidas ? <Text accessibilityLabel={item.nao_lidas + ' postagens não lidas'} style={{ color: colors.ink, backgroundColor: colors.lavender, padding: 8, borderRadius: 18 }}>{item.nao_lidas}</Text> : undefined} onPress={() => isGuest ? navigation.navigate('ContaNecessaria', { recurso: 'Participar de um fórum' }) : navigation.navigate('ChatForum', { id: item.id_for, nome: item.titulo })} />}
      ListFooterComponent={<View style={{ gap: 8 }}><Notice text={moreError} />{resource.data?.tem_mais && <Button title="Carregar mais fóruns" small variant="secondary" loading={moreBusy} onPress={() => void more()} />}</View>}
    />
  </Screen>;
}
