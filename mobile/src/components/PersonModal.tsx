import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ReportFields } from './ReportFields';
import { Sheet } from './Social';
import { Avatar } from './Artwork';
import { Button, Chip, Notice, ResourceState } from './ui';
import { useCommunity } from '../constexts/CommunityContext';
import { useResource } from '../hooks/useResource';
import { errorMessage } from '../services/api';
import { ui } from '../styles/theme';
import { useFeedback } from '../constexts/FeedbackContext';
import { socialService } from '../services/social.service';
import type { RootStackParamList } from '../types/navigation';
import type { Person } from '../types/models';

export function PersonModal({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged?: (person: Person) => void }) {
  const repo = useCommunity();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const resource = useResource(() => repo.person(id));
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [reason, setReason] = useState('');
  const [description,setDescription]=useState('');
  const [info, setInfo] = useState('');
  const notify = useFeedback();
  const person = resource.data;
  const status = person?.conexao?.status;
  const received = status === 'PENDENTE' && !person?.conexao?.enviada_por_mim;
  async function act() {
    if (!person || pending.current) return;
    pending.current = true;
    setBusy(true); setError('');
    try {
      if (status === 'ACEITO') {
        const chat = await repo.startChat(person.id);
        onClose();
        navigation.navigate('Chat', { id: chat.id_chat, nome: person.nome, foto: person.foto });
      } else {
        if (received && person.conexao) await repo.respond(person.conexao.id, true);
        else await repo.connect(person.id);
        notify(received ? 'Conexão aceita.' : 'Solicitação de conexão enviada.');
        await resource.reload(true);
      }
    } catch (cause) { setError(errorMessage(cause)); }
    finally { pending.current = false; setBusy(false); }
  }
  async function block() {
    if (!person || pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try {
      const result = await socialService.block(id, !person.bloqueada);
      resource.setData({ ...person, ...result });
      onChanged?.({ ...person, ...result });
      const message = result.bloqueada ? 'Usuária bloqueada.' : 'Usuária desbloqueada.';
      setInfo(message); notify(message, 'info');
    } catch (cause) { setError(errorMessage(cause)); }
    finally { pending.current = false; setBusy(false); }
  }
  async function report() {
    if (pending.current || reported || !reason.trim() || reason.trim().length > 255) return;
    pending.current = true;
    setBusy(true); setError('');
    try {
      await socialService.reportPerson(id, reason.trim(), description.trim());
      setReported(true); setReporting(false); setReason(''); setDescription('');
      notify('Denúncia enviada à moderação.'); setInfo('Sua denúncia foi enviada para análise.');
    } catch (cause) { setError(errorMessage(cause)); }
    finally { pending.current = false; setBusy(false); }
  }
  return <Sheet visible title={person?.nome ?? 'Perfil'} onClose={() => { if (!busy) onClose(); }}>
    <ResourceState {...resource} onRetry={() => void resource.reload()} />
    {person && <>
      <View style={{ alignItems: 'center' }}><Avatar nome={person.nome} foto={person.foto} size={96} /></View>
      {!!person.apresentacao && <Text style={ui.body}>{person.apresentacao}</Text>}
      <Text style={ui.subtitle}>Interesses</Text>
      <View style={ui.wrap}>{person.interesses.map(item => <Chip key={item.id} title={item.nome} />)}</View>
      {!person.interesses.length && <Text style={ui.body}>Nenhum interesse informado.</Text>}
      <Notice text={error} />
      {!!info && <Text accessibilityRole="alert" style={ui.body}>{info}</Text>}
      <Button title={status === 'ACEITO' ? 'Conversar' : received ? 'Aceitar conexão' : status === 'PENDENTE' ? 'Solicitação enviada' : person.conexao ? 'Conexão indisponível' : 'Conectar'} loading={busy} disabled={!!person.interacao_bloqueada || (!!person.conexao && status !== 'ACEITO' && !received)} onPress={() => void act()} />
      {reporting ? <View style={{ gap: 12 }}>
        <Text style={ui.body}>Denunciar {person.nome}? Explique o motivo para a moderação analisar.</Text>
        <ReportFields reason={reason} onReason={setReason} description={description} onDescription={setDescription} busy={busy}/>
        <Button title="Confirmar denúncia" loading={busy} disabled={!reason.trim()} onPress={() => void report()} />
        <Button title="Cancelar denúncia" variant="secondary" disabled={busy} onPress={() => setReporting(false)} />
      </View> : <Button title={reported ? 'Denúncia enviada' : 'Denunciar usuária'} variant="secondary" disabled={busy || reported} onPress={() => { setError(''); setReporting(true); }} />}
      <Button title={person.bloqueada ? "Desbloquear usuária" : "Bloquear usuária"} variant="secondary" disabled={busy} onPress={() => void block()} />
    </>}
  </Sheet>;
}
