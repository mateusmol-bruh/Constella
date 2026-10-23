import React from 'react';
import { Linking, Text, View } from 'react-native';
import { CoverArt } from '../components/Artwork';
import { Button, Chip, Header, Notice, ResourceState, Screen } from '../components/ui';
import { useAuth } from '../constexts/AuthContext';
import { useResource } from '../hooks/useResource';
import { contentsService } from '../services/contents.service';
import { publicService } from '../services/public.service';
import { ui } from '../styles/theme';
import type { ScreenProps } from '../types/navigation';

export default function DetalheConteudoScreen({ navigation, route }: ScreenProps<'DetalheConteudo'>) {
  const { isGuest } = useAuth();
  const resource = useResource(signal => isGuest ? publicService.content(route.params.id, signal) : contentsService.detail(route.params.id));
  const [error, setError] = React.useState('');
  const material = resource.data?.material ?? '';
  const isUrl = /^https?:\/\/[^\s]+$/i.test(material);
  return <Screen bottomSafe>
    <Header title="Conteúdo" onBack={() => navigation.goBack()} />
    <ResourceState {...resource} onRetry={() => void resource.reload()} />
    {resource.data && !resource.error && !resource.loading && <View style={{ gap: 18 }}><CoverArt kind={2} large /><Text style={ui.title}>{resource.data.titulo}</Text><Text style={ui.body}>{resource.data.descricao}</Text><View style={ui.wrap}>{resource.data.interesses.map(item => <Chip key={item.id} title={item.nome} />)}</View>
      {isUrl ? <Button title="Abrir material" variant="secondary" onPress={() => void Linking.openURL(material).catch(() => setError('Não foi possível abrir o material.'))} /> : <Text selectable style={[ui.body, { lineHeight: 27 }]}>{material || 'O material deste conteúdo ainda não foi disponibilizado.'}</Text>}
      <Notice text={error} />
    </View>}
  </Screen>;
}
