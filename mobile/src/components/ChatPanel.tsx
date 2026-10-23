import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { Avatar } from './Artwork';
import { Icon } from './Icon';
import { Button, Notice, ResourceState, Screen } from './ui';
import { useAuth } from '../constexts/AuthContext';
import { errorMessage } from '../services/api';
import { conversationPageSize } from '../services/social.service';
import { colors, fontFamily, ui } from '../styles/theme';

export interface ChatItem { id: string; authorId: string; author: string; foto?: string | null; text: string; date: string }
export interface ChatFeed { items: ChatItem[]; canSend: boolean; subtitle: string; canLeave?: boolean }
interface ChatPanelProps {
  conversationKey: string; title: string; foto?: string | null; onBack: () => void;
  loader: (signal?: AbortSignal) => Promise<ChatFeed>; send: (text: string) => Promise<ChatItem>;
  join?: () => Promise<void>; leave?: () => Promise<void>;
  earlier?: (page: number, signal?: AbortSignal) => Promise<ChatItem[]>;
  remove?: (item: ChatItem) => Promise<void>; report?: (item: ChatItem, reason: string) => Promise<void>;
}
interface FocusRun {
  active: boolean; busy: boolean; pages: number;
  abort?: AbortController; timer?: ReturnType<typeof setTimeout>;
}
type Confirmation = { kind: 'delete' | 'report'; item: ChatItem } | { kind: 'leave' };

function mergeItems(items: ChatItem[]) {
  return [...new Map(items.map(item => [item.id, item])).values()].sort((a, b) =>
    b.date.localeCompare(a.date) || b.id.length - a.id.length || b.id.localeCompare(a.id));
}

function deniedAccess(cause: unknown) {
  return axios.isAxiosError(cause) && [401, 403, 404].includes(cause.response?.status ?? 0);
}

export function ChatPanel(props: ChatPanelProps) {
  const { user } = useAuth();
  const callbacks = useRef(props);
  callbacks.current = props;
  const run = useRef<FocusRun | null>(null);
  const [feed, setFeed] = useState<ChatFeed>();
  const [loading, setLoading] = useState(true);
  const [reading, setReading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [hasEarlier, setHasEarlier] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [reason, setReason] = useState('');

  function schedule(current: FocusRun) {
    clearTimeout(current.timer);
    if (current.active && AppState.currentState !== 'background' && AppState.currentState !== 'inactive') {
      // Após a conclusão da leitura: não empilha requisições se o servidor estiver lento.
      current.timer = setTimeout(() => { void refresh(current, true); }, 10000 * current.pages);
    }
  }

  async function refresh(current: FocusRun, quiet = false) {
    if (!current.active || current.busy) return;
    clearTimeout(current.timer);
    current.busy = true;
    current.abort = new AbortController();
    setReading(true);
    if (!quiet) setLoading(true);
    try {
      const result = await callbacks.current.loader(current.abort.signal);
      if (!current.active) return;
      const all = [...result.items];
      let lastPageLength = result.items.length;
      let loadedPages = 1;
      // Revalida também o histórico visível para refletir exclusões e perda de participação.
      if (result.canSend && callbacks.current.earlier) {
        for (let page = 2; page <= current.pages && lastPageLength === conversationPageSize; page++) {
          const previous = await callbacks.current.earlier(page, current.abort.signal);
          if (!current.active) return;
          all.push(...previous); lastPageLength = previous.length; loadedPages = page;
        }
      }
      current.pages = loadedPages;
      setFeed({ ...result, items: result.canSend ? mergeItems(all) : [] });
      setHasEarlier(result.canSend && lastPageLength === conversationPageSize);
      setLoadError('');
    } catch (cause) {
      if (current.active) {
        // Não mantém conteúdo privado visível após o servidor negar o acesso.
        setFeed(undefined); setHasEarlier(false); setLoadError(errorMessage(cause));
      }
    } finally {
      current.busy = false;
      current.abort = undefined;
      if (current.active) { setLoading(false); setReading(false); schedule(current); }
    }
  }

  useFocusEffect(useCallback(() => {
    const current: FocusRun = { active: !!user, busy: false, pages: 1 };
    run.current = current;
    setFeed(undefined); setText(''); setLoadError(''); setActionError(''); setNotice('');
    setHasEarlier(false); setSending(false); setConfirmation(null); setReason(''); setLoading(true);
    if (user) void refresh(current);
    else setLoading(false);
    const subscription = AppState.addEventListener('change', state => {
      clearTimeout(current.timer);
      if (state === 'active') void refresh(current, true);
    });
    return () => {
      current.active = false;
      clearTimeout(current.timer); current.abort?.abort(); subscription.remove();
    };
    // Callbacks ficam em ref; somente uma conversa/conta diferente reinicia o ciclo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.conversationKey, user?.id]));

  async function mutate(action: () => Promise<void>, success: () => void) {
    const current = run.current;
    if (!current?.active || current.busy) return false;
    current.busy = true; clearTimeout(current.timer);
    setSending(true); setActionError(''); setNotice('');
    try {
      await action();
      if (!current.active) return false;
      success(); return true;
    } catch (cause) {
      if (current.active) {
        setActionError(errorMessage(cause));
        if (deniedAccess(cause)) { setFeed(undefined); setHasEarlier(false); current.pages = 1; }
      }
      return false;
    } finally {
      current.busy = false;
      if (current.active) { setSending(false); schedule(current); }
    }
  }

  async function submit() {
    const value = text.trim();
    if (!value || !feed?.canSend) return;
    let sent: ChatItem | undefined;
    await mutate(async () => { sent = await callbacks.current.send(value); }, () => {
      const message = sent;
      if (message) setFeed(previous => previous ? { ...previous, items: mergeItems([...previous.items, message]) } : previous);
      setText('');
    });
  }

  async function membership(action?: () => Promise<void>) {
    if (!action) return;
    const success = await mutate(action, () => {
      setFeed(undefined); setConfirmation(null); setHasEarlier(false);
      if (run.current) run.current.pages = 1;
    });
    if (success && run.current?.active) await refresh(run.current);
  }

  async function loadEarlier() {
    const current = run.current;
    if (!current?.active || current.busy || !callbacks.current.earlier || !feed?.canSend) return;
    current.busy = true; clearTimeout(current.timer);
    current.abort = new AbortController(); setReading(true); setActionError('');
    try {
      const result = await callbacks.current.earlier(current.pages + 1, current.abort.signal);
      if (!current.active) return;
      current.pages++;
      setFeed(previous => previous ? { ...previous, items: mergeItems([...previous.items, ...result]) } : previous);
      setHasEarlier(result.length === conversationPageSize);
    } catch (cause) {
      if (current.active) {
        setActionError(errorMessage(cause));
        if (deniedAccess(cause)) { setFeed(undefined); setHasEarlier(false); current.pages = 1; }
      }
    }
    finally {
      current.busy = false; current.abort = undefined;
      if (current.active) { setReading(false); schedule(current); }
    }
  }

  async function confirmAction() {
    const target = confirmation;
    if (!target) return;
    if (target.kind === 'leave') { await membership(callbacks.current.leave); return; }
    if (target.kind === 'report' && (!reason.trim() || reason.trim().length > 255)) return;
    if (target.kind === 'delete' && callbacks.current.remove) {
      await mutate(() => callbacks.current.remove!(target.item), () => {
        setFeed(previous => previous ? { ...previous, items: previous.items.filter(item => item.id !== target.item.id) } : previous);
        setConfirmation(null); setNotice('Mensagem excluída.');
      });
    } else if (target.kind === 'report' && callbacks.current.report) {
      await mutate(() => callbacks.current.report!(target.item, reason.trim()), () => {
        setConfirmation(null); setReason(''); setNotice('Denúncia enviada para análise da moderação.');
      });
    }
  }

  const busy = sending || reading;
  const { title, foto, onBack, join, leave, earlier, remove, report } = props;
  return <Screen paper scroll={false} bottomSafe>
    <View style={[ui.row, { paddingBottom: 12, borderBottomWidth: 1, borderColor: '#E4D9ED' }]}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={10} style={{ paddingVertical: 10 }}><Icon name="back" /></Pressable>
      <Avatar nome={title} foto={foto} size={44} />
      <View style={{ flex: 1 }}><Text numberOfLines={2} style={[ui.dark, { fontWeight: '700' }]}>{title}</Text><Text style={[ui.dark, { fontSize: 11 }]}>{feed?.subtitle ?? 'Conversa'}</Text></View>
      {feed?.canLeave && leave && <Pressable accessibilityRole="button" accessibilityLabel="Sair do fórum" disabled={busy} onPress={() => { setActionError(''); setConfirmation({ kind: 'leave' }); }} style={{ padding: 8 }}><Text style={ui.dark}>Sair</Text></Pressable>}
      <Pressable accessibilityRole="button" accessibilityLabel="Atualizar mensagens" accessibilityState={{ busy, disabled: busy }} disabled={busy} onPress={() => { if (run.current) void refresh(run.current); }} hitSlop={8}><Icon name="chat" size={21} /></Pressable>
    </View>
    <ResourceState loading={loading} error={loadError} onRetry={() => { if (run.current) void refresh(run.current); }} dark empty={!feed?.items.length && !!feed && (feed.canSend ? 'Comece a conversa com um olá.' : 'Participe do fórum para ler e enviar postagens.')} />
    <FlatList
      style={{ flex: 1 }} inverted data={feed?.items ?? []} keyExtractor={item => item.id}
      keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', paddingVertical: 16, gap: 20 }}
      ListFooterComponent={earlier && hasEarlier ? <Button title="Mensagens anteriores" variant="secondary" small loading={reading} disabled={sending} onPress={() => void loadEarlier()} /> : undefined}
      renderItem={({ item }) => {
        const mine = item.authorId === user?.id;
        return <View style={{ flexDirection: mine ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
          {!mine && <Avatar nome={item.author} foto={item.foto} size={30} />}
          <View style={{ maxWidth: '80%', gap: 4, alignItems: mine ? 'flex-end' : 'flex-start' }}>
            {!mine && <Text style={{ color: colors.ink, fontSize: 11, paddingLeft: 5 }}>{item.author}</Text>}
            <View style={{ backgroundColor: mine ? colors.ink : '#CA7CCB', padding: 14, borderRadius: 20, borderBottomRightRadius: mine ? 4 : 20, borderBottomLeftRadius: mine ? 20 : 4 }}>
              <Text selectable style={{ fontFamily, color: colors.paper, fontSize: 15, lineHeight: 21 }}>{item.text}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ color: '#7A678D', fontSize: 10 }}>{new Date(item.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>
              {(mine ? remove : report) && <Pressable accessibilityRole="button" accessibilityLabel={mine ? 'Excluir esta mensagem' : 'Denunciar esta mensagem'} disabled={busy} onPress={() => { setActionError(''); setReason(''); setConfirmation({ kind: mine ? 'delete' : 'report', item }); }} style={{ minHeight: 36, justifyContent: 'center' }}><Text style={{ color: colors.purple, fontSize: 11 }}>{mine ? 'Excluir' : 'Denunciar'}</Text></Pressable>}
            </View>
          </View>
        </View>;
      }}
    />
    <Notice text={actionError} dark />
    {!!notice && <Text accessibilityRole="alert" style={ui.dark}>{notice}</Text>}
    {feed?.canSend ? <View style={[ui.row, { gap: 8, paddingTop: 8 }]}>
      <TextInput accessibilityLabel="Digite uma mensagem" placeholder="Digite uma mensagem..." placeholderTextColor="#7B6593" value={text} onChangeText={setText} multiline maxLength={1000} editable={!sending} style={{ fontFamily, flex: 1, maxHeight: 120, minHeight: 50, color: colors.ink, backgroundColor: '#EEDFF5', borderRadius: 25, paddingHorizontal: 18, paddingVertical: 14, fontSize: 14 }} />
      <Pressable accessibilityRole="button" accessibilityLabel="Enviar mensagem" accessibilityState={{ disabled: busy || !text.trim() }} disabled={busy || !text.trim()} onPress={() => void submit()} style={{ width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.purple, opacity: busy || !text.trim() ? 0.5 : 1 }}>
        {sending ? <ActivityIndicator color={colors.paper} /> : <Icon name="send" color={colors.paper} size={22} />}
      </Pressable>
    </View> : join && feed ? <Button title="Participar do fórum" loading={sending} disabled={reading} onPress={() => void membership(join)} /> : null}
    <Modal visible={!!confirmation} transparent animationType="fade" onRequestClose={() => { if (!sending) setConfirmation(null); }}>
      <View style={{ flex: 1, backgroundColor: '#150B2B99', justifyContent: 'center', padding: 24 }}>
        <View style={{ width: '100%', maxWidth: 460, alignSelf: 'center', backgroundColor: colors.paper, borderRadius: 24, padding: 24, gap: 16 }}>
          <Text accessibilityRole="header" style={[ui.dark, { fontSize: 21, fontWeight: '700' }]}>{confirmation?.kind === 'report' ? 'Denunciar mensagem' : confirmation?.kind === 'leave' ? 'Sair do fórum?' : 'Excluir mensagem?'}</Text>
          <Text style={ui.dark}>{confirmation?.kind === 'report' ? 'Descreva o motivo para a moderação analisar.' : confirmation?.kind === 'leave' ? 'Para ler ou publicar novamente, será necessário participar do fórum.' : 'Esta mensagem será excluída da conversa.'}</Text>
          {confirmation?.kind === 'report' && <TextInput accessibilityLabel="Motivo da denúncia" value={reason} onChangeText={setReason} placeholder="Digite o motivo" placeholderTextColor="#7B6593" multiline maxLength={255} editable={!sending} style={{ fontFamily, color: colors.ink, minHeight: 100, borderWidth: 1, borderColor: '#C0A7D4', borderRadius: 10, padding: 12, textAlignVertical: 'top' }} />}
          <Notice text={actionError} dark />
          <Button title={confirmation?.kind === 'report' ? 'Enviar denúncia' : confirmation?.kind === 'leave' ? 'Sair do fórum' : 'Excluir'} loading={sending} disabled={reading || (confirmation?.kind === 'report' && !reason.trim())} onPress={() => void confirmAction()} />
          <Button title="Cancelar" variant="secondary" disabled={sending} onPress={() => { setConfirmation(null); setActionError(''); }} />
        </View>
      </View>
    </Modal>
  </Screen>;
}
