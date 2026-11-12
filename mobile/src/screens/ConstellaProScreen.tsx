import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Brand } from '../components/Brand';
import { Icon } from '../components/Icon';
import { PaymentSimulation } from '../components/PaymentSimulation';
import { Button, Header, Notice, ResourceState, Screen } from '../components/ui';
import { errorMessage } from '../services/api';
import { useFeedback } from '../constexts/FeedbackContext';
import { useAuth } from '../constexts/AuthContext';
import { useResource } from '../hooks/useResource';
import { proService } from '../services/pro.service';
import { publicService } from '../services/public.service';
import ProtectedCTA from '../components/ProtectedCTA';
import { colors, ui } from '../styles/theme';
import type { ScreenProps } from '../types/navigation';
import { usePro } from '../constexts/ProContext';
import { hasProAccess, proStatusLabel } from '../utils/pro';

export default function ConstellaProScreen({ navigation }: ScreenProps<'ConstellaPro'>) {
  const { isGuest } = useAuth();
  return isGuest ? <GuestProPresentation navigation={navigation} /> : <AccountProPresentation navigation={navigation} />;
}

function GuestProPresentation({ navigation }: Pick<ScreenProps<'ConstellaPro'>, 'navigation'>) {
  const resource = useResource(signal => publicService.pro(signal));
  return <Screen bottomSafe>
    <Brand variant="compact" width={140} /><Header title="Constella Pro" onBack={() => navigation.goBack()} />
    <ResourceState {...resource} onRetry={() => void resource.reload()} />
    {!resource.loading && !resource.error && resource.data && <>
      <Text style={ui.body}>{resource.data.mensagem}</Text>
      {resource.data.beneficios.map(benefit => <Text key={benefit} style={ui.body}>• {benefit}</Text>)}
      <Text style={ui.muted}>A contratação ainda não está disponível. Nenhuma assinatura é ativada nesta tela.</Text>
      <Text style={ui.subtitle}>Conteúdos exclusivos</Text>
      {!resource.data.catalogo.length && <Text style={ui.body}>Nenhum conteúdo exclusivo publicado por enquanto.</Text>}
      {resource.data.catalogo.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={'Ver detalhes de conteúdo bloqueado: ' + item.titulo} onPress={() => navigation.navigate('DetalhePro', { id: item.id })} style={ui.card}>
        <View style={ui.row}><Icon name="lock" color={colors.pink} /><Text style={[ui.subtitle, { flex: 1 }]}>{item.titulo}</Text></View>
        <Text style={ui.body}>{item.descricao}</Text><Text style={ui.muted}>Exclusivo Pro • requer assinatura validada</Text>
      </Pressable>)}
    </>}
    <ProtectedCTA embedded title="Consulte sua assinatura" />
  </Screen>;
}

function AccountProPresentation({ navigation }: Pick<ScreenProps<'ConstellaPro'>, 'navigation'>) {
  const [demoBusy, setDemoBusy] = React.useState(false);
  const [demoError, setDemoError] = React.useState('');
  const notify = useFeedback();
  const status = usePro();
  const catalog = useResource(() => proService.catalog());
  const subscription = status.data;
  const access = !!subscription && !status.error && !status.loading && hasProAccess(subscription);
  async function toggleDemo() {
    if (demoBusy || !subscription) return;
    setDemoBusy(true); setDemoError('');
    try {
      const saved = await proService.demo(!subscription.demonstracao);
      status.setData(saved);
      notify(saved.demonstracao ? 'PRO de demonstração ativado. Nenhuma cobrança realizada.' : 'Demonstração PRO encerrada.');
    } catch (cause) { setDemoError(errorMessage(cause)); }
    finally { setDemoBusy(false); }
  }

  return <Screen bottomSafe>
    <Brand variant="compact" width={140} />
    <Header title="Constella Pro" onBack={() => navigation.goBack()} />
    <Text style={ui.body}>Conheça o catálogo de conteúdos exclusivos do Constella.</Text>
    <>
      <ResourceState {...status} onRetry={() => void status.reload()} />
      {subscription && !status.error && !status.loading && <>
        <View style={ui.card}>
          <View style={ui.row}><Icon name="shield" color={colors.pink} /><Text style={ui.subtitle}>{proStatusLabel(subscription)}</Text></View>
          <Text style={ui.body}>{subscription.mensagem}</Text>
          {subscription.assinatura?.expira_em && <Text style={ui.muted}>Válida até {new Date(subscription.assinatura.expira_em).toLocaleDateString('pt-BR')}</Text>}
          <Button title="Atualizar status" variant="secondary" small onPress={() => void status.reload()} />
          <Text style={ui.muted}>Demonstração temporária para apresentação do projeto. Não é uma assinatura paga.</Text>
          <Notice text={demoError} />
          <Button title={subscription.demonstracao ? 'Encerrar demonstração PRO' : 'Ativar demonstração PRO'} variant="secondary" loading={demoBusy} onPress={() => void toggleDemo()} />
        </View>
        <View style={ui.card}>
          <Text style={ui.subtitle}>O que está incluído</Text>
          {subscription.beneficios.map(benefit => <View key={benefit} style={ui.row}><Icon name="check" size={18} color={colors.pink} /><Text style={[ui.body, { flex: 1 }]}>{benefit}</Text></View>)}
          {subscription.provedor_disponivel ? <>
            <Text style={ui.muted}>{subscription.plano?.preco_formatado ?? 'Consulte as condições do plano.'}</Text>
            <Text style={ui.muted}>{subscription.plano?.periodicidade}</Text>
            <Text style={ui.body}>O gerenciamento da assinatura ainda não está disponível neste aplicativo.</Text>
          </> : <>
            <Text style={ui.subtitle}>Assinaturas em breve</Text>
            <Text style={ui.body}>A contratação do Constella Pro ainda não foi lançada. Os planos e as formas de pagamento aparecerão aqui quando estiverem disponíveis.</Text>
            <PaymentSimulation />
          </>}
        </View>
      </>}
      <Text style={ui.subtitle}>Conteúdos exclusivos</Text>
      <ResourceState {...catalog} empty={!catalog.data?.length && 'Nenhum conteúdo exclusivo publicado por enquanto.'} onRetry={() => void catalog.reload()} />
      {!catalog.error && catalog.data?.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={(access ? 'Ler ' : 'Ver detalhes de conteúdo bloqueado: ') + item.titulo} onPress={() => navigation.navigate('DetalhePro', { id: item.id })} style={({ pressed }) => [ui.card, { opacity: pressed ? 0.75 : 1 }]}>
        <View style={ui.row}><Icon name={access ? 'content' : 'lock'} color={colors.pink} /><Text style={[ui.subtitle, { flex: 1 }]}>{item.titulo}</Text></View>
        {!!item.descricao && <Text style={ui.body} numberOfLines={3}>{item.descricao}</Text>}
        <Text style={ui.muted}>{access ? 'Abrir conteúdo →' : 'Exclusivo Pro • acesso sujeito à validação'}</Text>
      </Pressable>)}
    </>
  </Screen>;
}
