import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Avatar, CoverArt } from '../components/Artwork';
import { Brand } from '../components/Brand';
import { Icon } from '../components/Icon';
import { UserSearch } from '../components/UserSearch';
import { PersonModal } from '../components/PersonModal';
import { mediaUrl } from '../utils/media';
import { ResourceState, Screen, SearchField } from '../components/ui';
import { useCommunity } from '../constexts/CommunityContext';
import { useResource } from '../hooks/useResource';
import { colors, ui } from '../styles/theme';
import type { RootStackParamList } from '../types/navigation';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const repo = useCommunity();
  const [query, setQuery] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string>();
  const resource = useResource(async () => {
    const [profile, people, forums] = await Promise.all([repo.profile(), repo.recommendedPeople(), repo.recommendedForums()]);
    return { profile, people, forums };
  });
  const suggestions = resource.data?.people ?? [];
  return <Screen scroll={false}>
    <View style={{ paddingVertical: 12 }}><Brand width={110} variant="compact" /></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 20, flexGrow: 1 }} style={{ backgroundColor: colors.paper, borderTopLeftRadius: 25, borderTopRightRadius: 25, marginHorizontal: 0, marginBottom: 0 }}>
      <ResourceState {...resource} onRetry={() => void resource.reload()} dark />
      {resource.data && <>
        <View style={[ui.row, { backgroundColor: colors.lavender, borderRadius: 16, padding: 16 }]}>
          <View style={{ flex: 1 }}><Text style={[ui.dark, { fontWeight: '700', fontStyle: 'italic', fontSize: 18 }]}>Olá, {resource.data.profile.nome.split(' ')[0]}!</Text><Text style={ui.dark}>Seja bem-vinda.</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Ver meu perfil" onPress={() => navigation.navigate('Main', { screen: 'Perfil' })}><Avatar nome={resource.data.profile.nome} foto={resource.data.profile.foto} /></Pressable>
        </View>
        <View style={{ gap: 8 }}><Text style={[ui.dark, { fontSize: 13, fontWeight: '700' }]}>Encontre novas conexões</Text><SearchField value={query} onChangeText={setQuery} placeholder="Buscar usuária" /></View>
        {!!query.trim() && <UserSearch query={query} onSelect={setSelectedId} />}
        <View style={{ gap: 12 }}><Text style={ui.dark}>Amizades que combinam com você</Text>
          {suggestions.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>{suggestions.slice(0, 6).map(person => <Pressable accessibilityRole="button" accessibilityLabel={'Conhecer ' + person.nome} onPress={() => setSelectedId(person.id)} key={person.id} style={[ui.row, { width: 165, padding: 12, borderRadius: 18, backgroundColor: colors.lavender }]}>
            <Avatar nome={person.nome} foto={person.foto} size={42} /><View style={{ flex: 1 }}><Text numberOfLines={1} style={[ui.dark, { fontWeight: '700', fontSize: 13 }]}>{person.nome}</Text><Text style={{ color: colors.ink, fontSize: 11 }}>ver mais...</Text></View>
          </Pressable>)}</ScrollView> : <Text style={[ui.dark, { fontSize: 13 }]}>Ainda não encontramos interesses em comum. Explore novas conexões.</Text>}
        </View>
        <View style={{ gap: 12 }}><Text style={ui.dark}>Fóruns para você</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {resource.data.forums.map((forum, index) => <Pressable accessibilityRole="button" accessibilityLabel={forum.titulo} key={forum.id_for} onPress={() => navigation.navigate('ChatForum', { id: forum.id_for, nome: forum.titulo })} style={{ width: 190, backgroundColor: colors.lavender, borderRadius: 18, overflow: 'hidden' }}>
            {forum.capa ? <Image key={forum.capa} source={{ uri: mediaUrl(forum.capa) }} style={{ width: '100%', height: 120 }} resizeMode="cover" /> : <CoverArt kind={index} />}<Text style={[ui.dark, { padding: 12, fontSize: 14 }]}>{forum.titulo}</Text>
          </Pressable>)}
        </ScrollView>{!resource.data.forums.length && <Text style={ui.dark}>Os fóruns da comunidade aparecerão aqui.</Text>}</View>
        <View style={[ui.row, { marginTop: 'auto', paddingTop: 20 }]}><Icon name="heart" size={19} /><Text style={[ui.dark, { fontSize: 12, flex: 1 }]}>O céu fica maior quando estamos juntas.</Text></View>
      </>}
    </ScrollView>
    {selectedId && <PersonModal key={selectedId} id={selectedId} onChanged={() => setQuery('')} onClose={() => { setSelectedId(undefined); void resource.reload(true); }} />}
  </Screen>;
}
