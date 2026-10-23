import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Brand } from '../components/Brand';
import { Button, Header, Notice, ResourceState, Screen } from '../components/ui';
import { useCommunity } from '../constexts/CommunityContext';
import { useAuth } from '../constexts/AuthContext';
import { useFeedback } from '../constexts/FeedbackContext';
import { useResource } from '../hooks/useResource';
import { errorMessage } from '../services/api';
import { colors, ui } from '../styles/theme';
import type { ScreenProps } from '../types/navigation';

export default function InteressesScreen({ navigation, route }: ScreenProps<'Interesses'>) {
  const repo = useCommunity();
  const { finishOnboarding } = useAuth();
  const notify = useFeedback();
  const resource = useResource(async () => ({ available: await repo.interests(), mine: route.params?.editar ? await repo.myInterests() : [] }));
  const [selection, setSelection] = useState<{ source: typeof resource.data; ids: string[] }>();
  const selected = selection && selection.source === resource.data ? selection.ids : resource.data?.mine.map(item => item.id) ?? [];
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  function toggle(id: string) {
    setSelection({ source: resource.data, ids: selected.includes(id) ? selected.filter(item => item !== id) : selected.length < 10 ? [...selected, id] : selected });
  }
  async function finish() {
    if (saving) return;
    setSaving(true); setError('');
    try {
      if (route.params?.editar) { await repo.saveInterests(selected); notify('Interesses salvos. Suas recomendações serão atualizadas.'); navigation.goBack(); }
      else {
        await finishOnboarding(selected);
        notify('Configuração inicial concluída.');
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      }
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setSaving(false); }
  }
  return <Screen centered bottomSafe>
    <Header title="" onBack={() => navigation.goBack()} />
    <View style={{ alignItems: 'center', gap: 18, marginBottom: 12 }}><Brand width={280} /><Text style={ui.subtitle}>Diga seus gostos...</Text></View>
    <View style={ui.paper}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={[ui.dark, { flex: 1, fontSize: 13, fontWeight: '700' }]}>Escolha até dez (opcional)</Text><Text style={ui.dark}>{selected.length}/10</Text></View>
      <ResourceState {...resource} onRetry={() => void resource.reload()} dark empty={resource.data?.available.length === 0 && 'Nenhum interesse disponível.'} />
      <View style={[ui.wrap, { justifyContent: 'space-between' }]}>
        {resource.data?.available.map(item => <Pressable key={item.id} disabled={saving} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(item.id), disabled: saving }} onPress={() => toggle(item.id)} style={{ flexBasis: '45%', flexGrow: 1, minWidth: 110, minHeight: 44, borderRadius: 25, backgroundColor: selected.includes(item.id) ? colors.orchid : colors.ink, padding: 10, alignItems: 'center', borderWidth: 2, borderColor: selected.includes(item.id) ? colors.pink : colors.ink }}>
          <Text style={{ color: colors.paper, fontWeight: '700', textAlign: 'center' }}>{selected.includes(item.id) ? '✓ ' : ''}{item.nome}</Text>
        </Pressable>)}
      </View>
    </View>
    <Notice text={error} />
    <Button title={route.params?.editar ? 'Salvar interesses' : 'Finalizar'} disabled={resource.loading || !!resource.error} loading={saving} onPress={() => void finish()} />
  </Screen>;
}
