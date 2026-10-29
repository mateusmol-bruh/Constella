import React, { useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usePro } from '../constexts/ProContext';
import { proService } from '../services/pro.service';
import { Icon } from '../components/Icon';
import { CoverArt } from '../components/Artwork';
import { contentColumns } from '../utils/layout';
import { searchMatches } from '../components/Social';
import { Button, Header, ResourceState, Screen, SearchField } from '../components/ui';
import { useAuth } from '../constexts/AuthContext';
import { useResource } from '../hooks/useResource';
import { contentsService } from '../services/contents.service';
import { publicService } from '../services/public.service';
import { colors, ui } from '../styles/theme';
import type { RootStackParamList } from '../types/navigation';
import type { Content } from '../types/models';

export default function ConteudosScreen() {
  const { isGuest } = useAuth();
  const pro = usePro();
  const { width, fontScale } = useWindowDimensions();
  const columns = contentColumns(width, fontScale);
  const catalog = useResource(async signal => isGuest ? (await publicService.pro(signal)).catalogo : proService.catalog());
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const resource = useResource<Omit<Content, 'material'>[]>(signal => isGuest ? publicService.contents(signal) : contentsService.list());
  const recommendations = useResource(() => contentsService.recommended(), !isGuest);
  const [query, setQuery] = useState('');
  const items = resource.data?.filter(item => searchMatches(item.titulo + ' ' + (item.descricao ?? ''), query)) ?? [];
  const recommended = recommendations.data?.filter(item => item.score > 0).slice(0, 3) ?? [];
  return <Screen>
    <Header title="Conteúdos" /><SearchField value={query} onChangeText={setQuery} placeholder="Buscar conteúdos" />
    {(isGuest || (!pro.loading && !pro.error && !pro.access)) && <View style={ui.card}><Text style={ui.subtitle}>Constella Pro</Text><Text style={ui.body}>Conheça o catálogo exclusivo e consulte o status da sua assinatura.</Text><Button small title="Conhecer o Pro" variant="secondary" onPress={() => navigation.navigate('ConstellaPro')} /></View>}
    {!isGuest && !query && <View style={ui.section}>
      <Text style={ui.subtitle}>Gratuitos para você</Text>
      <ResourceState {...recommendations} empty={!recommended.length && 'Ainda não há recomendações por interesse.'} onRetry={() => void recommendations.reload()} />
      {!recommendations.error && recommended.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={'Ler ' + item.titulo} style={({ pressed }) => [ui.card, { opacity: pressed ? 0.75 : 1 }]} onPress={() => navigation.navigate('DetalheConteudo', { id: item.id })}>
        <Text style={ui.subtitle}>{item.titulo}</Text><Text style={ui.muted} numberOfLines={2}>{item.descricao}</Text>
        <Text style={ui.muted}>Interesses em comum: {item.interesses_compativeis.map(interest => interest.nome).join(', ')}</Text>
      </Pressable>)}
    </View>}
    <View style={ui.section}><Text style={ui.subtitle}>Conteúdos gratuitos</Text><Text style={ui.muted}>Leituras disponíveis para todas.</Text></View>
    <ResourceState {...resource} empty={!items.length && (query ? 'Nenhum conteúdo encontrado.' : 'Novos conteúdos aparecerão aqui.')} onRetry={() => void resource.reload()} />
    <View style={ui.wrap}>
      {!resource.error && items.map((item, index) => <Pressable accessibilityRole="button" accessibilityLabel={'Ler ' + item.titulo} key={item.id} onPress={() => navigation.navigate('DetalheConteudo', { id: item.id })} style={({ pressed }) => ({ width: columns === 1 || index === 0 ? '100%' : '48%', backgroundColor: colors.card, padding: 12, borderRadius: 20, gap: 8, opacity: pressed ? 0.75 : 1 })}>
        <CoverArt kind={index + 2} large={index === 0} /><Text style={[ui.body, { fontWeight: '700' }]}>{item.titulo}</Text>
        <Text style={ui.muted} numberOfLines={3}>{item.descricao}</Text><Text style={[ui.muted, { fontSize: 11 }]}>{item.duracao ? item.duracao + ' min • ' : ''}Ler conteúdo →</Text>
      </Pressable>)}
    </View>
    <View style={ui.section}><View style={ui.row}><Icon name="shield" color={colors.pink} /><Text style={ui.subtitle}>Conteúdos PRO</Text></View><Text style={ui.muted}>{pro.access ? 'Seu acesso exclusivo está liberado.' : 'Uma seleção exclusiva para ir além.'}</Text></View>
    <ResourceState {...catalog} empty={!catalog.data?.length && 'Novos conteúdos exclusivos aparecerão aqui.'} onRetry={() => void catalog.reload()} />
    {!catalog.error && catalog.data?.filter(item => searchMatches(item.titulo + ' ' + (item.descricao ?? ''), query)).map(item => <Pressable key={'pro:' + item.id} accessibilityRole="button" accessibilityLabel={(pro.access ? 'Ler ' : 'Conteúdo PRO bloqueado: ') + item.titulo} onPress={() => navigation.navigate('DetalhePro', { id: item.id })} style={ui.card}>
      <CoverArt kind={4} /><View style={ui.row}><Icon name={pro.access ? 'content' : 'lock'} color={colors.pink} /><Text style={[ui.subtitle, { flex: 1 }]}>{item.titulo}</Text></View>
      <Text style={ui.muted}>{item.descricao}</Text><Text style={ui.muted}>{pro.access ? 'Exclusivo PRO · Abrir conteúdo' : 'Exclusivo PRO · Conheça o plano para acessar'}</Text>
    </Pressable>)}
  </Screen>;
}
