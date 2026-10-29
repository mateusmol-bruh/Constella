import React, { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { ProMedia } from '../components/ProMedia';
import { ContentCover } from '../components/ContentCover';
import { Icon } from '../components/Icon';
import { Button, Header, Notice, ResourceState, Screen } from '../components/ui';
import { useAuth } from '../constexts/AuthContext';
import { useResource } from '../hooks/useResource';
import { proService } from '../services/pro.service';
import { publicService } from '../services/public.service';
import ProtectedCTA from '../components/ProtectedCTA';
import { colors, ui } from '../styles/theme';
import type { ScreenProps } from '../types/navigation';
import { hasProAccess } from '../utils/pro';
import { usePro } from '../constexts/ProContext';

export default function DetalheProScreen({ navigation, route }: ScreenProps<'DetalhePro'>) {
  const { isGuest } = useAuth();
  const pro = usePro();
  const [openError, setOpenError] = useState('');
  const resource = useResource(async signal => {
    if (isGuest) {
      const presentation = await publicService.pro(signal);
      return { kind: 'guest' as const, item: presentation.catalogo.find(item => item.id === route.params.id) };
    }
    const status = await proService.status();
    pro.setData(status);
    if (!hasProAccess(status)) {
      const catalog = await proService.catalog();
      return { kind: 'locked' as const, status, item: catalog.find(item => item.id === route.params.id) };
    }
    // Mesmo após a consulta de status, a rota de material valida a permissão.
    return { kind: 'content' as const, demo: !!status.demonstracao, item: await proService.content(route.params.id) };
  }, true, 15000);
  const data = resource.error || resource.loading ? undefined : resource.data;

  async function openMaterial(url: string) {
    setOpenError('');
    try { await Linking.openURL(url); }
    catch { setOpenError('Não foi possível abrir o material. Verifique sua conexão e tente novamente.'); }
  }

  return <Screen bottomSafe>
    <Header title="Conteúdo Pro" onBack={() => navigation.goBack()} />
    <ResourceState {...resource} onRetry={() => void resource.reload()} />
    {data && !data.item && <Text style={ui.body}>Este conteúdo não está mais disponível.</Text>}
    {data?.kind === 'guest' && data.item && <View style={ui.card}>
      <ContentCover capa={data.item.capa} titulo={data.item.titulo}/><Icon name="lock" size={36} color={colors.pink} /><Text style={ui.title}>{data.item?.titulo ?? 'Conteúdo exclusivo'}</Text>
      <Text style={ui.body}>{data.item?.descricao}</Text><Text style={ui.muted}>O material exclusivo requer uma conta com assinatura validada pelo servidor.</Text>
      <ProtectedCTA embedded title="Conteúdo Pro bloqueado" />
    </View>}
    {data?.kind === 'locked' && data.item && <View style={ui.card}>
      <ContentCover capa={data.item.capa} titulo={data.item.titulo}/><Icon name="lock" size={36} color={colors.pink} />
      <Text style={ui.title}>{data.item?.titulo ?? 'Conteúdo exclusivo'}</Text>
      {!!data.item?.descricao && <Text style={ui.body}>{data.item.descricao}</Text>}
      <Text style={ui.body}>Para abrir este material, é necessária uma assinatura validada pelo servidor.</Text>
      <Text style={ui.muted}>{data.status.mensagem}</Text>
      <Button title="Conhecer o Constella Pro" onPress={() => navigation.navigate('ConstellaPro')} />
    </View>}
    {data?.kind === 'content' && <View style={ui.card}>
      <Text style={ui.subtitle}>{data.demo ? 'PRO · Demonstração' : 'Exclusivo PRO'}</Text>
      <ContentCover capa={data.item.capa} titulo={data.item.titulo}/><Text style={ui.title}>{data.item.titulo}</Text>
      <Text style={ui.body}>{data.item.descricao}</Text>
      {data.item.material && /^https?:\/\/[^\s]+$/i.test(data.item.material)
        ? <Button title="Abrir material" onPress={() => void openMaterial(data.item.material!)} />
        : <Text selectable style={ui.body}>{data.item.material || (data.item.imagem||data.item.video ? '' : 'Material ainda não disponibilizado.')}</Text>}
      {data.item.imagem&&<ProMedia key={data.item.imagem.id} file={data.item.imagem}/>}
      {data.item.video&&<ProMedia key={data.item.video.id} file={data.item.video}/>}
      {!!data.item.anexos && <Text style={ui.muted}>Anexos cadastrados: {data.item.anexos}</Text>}
    </View>}
    <Notice text={openError} />
  </Screen>;
}
