import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { CanceledError, isAxiosError, isCancel } from 'axios';
import { selectImage, uploadImage, type SelectedImage } from '../services/image.service';
import { PersonModal } from './PersonModal';
import { Sheet } from './Social';
import { chatImageWidth } from '../utils/layout';
import { Avatar } from './Artwork';
import { ForumCover } from './ForumCover';
import { ConversationImage } from './ConversationImage';
import { useFeedback } from '../constexts/FeedbackContext';
import { Icon } from './Icon';
import { Button, Notice, ResourceState, Screen } from './ui';
import { useAuth } from '../constexts/AuthContext';
import { errorMessage } from '../services/api';
import type { ReplyPreview, SendOptions } from '../types/models';
import { conversationPageSize } from '../services/social.service';
import { colors, fontFamily, ui } from '../styles/theme';

export interface ChatItem { id: string; authorId: string; author: string; foto?: string | null; text: string; image?: string | null; date: string; reply?: ReplyPreview | null; system?: boolean }
export interface ChatFeed { items: ChatItem[]; canSend: boolean; subtitle: string; canLeave?: boolean; canDelete?: boolean; title?: string; foto?: string | null; personId?: string; blocked?: boolean }
interface ChatPanelProps {
  conversationKey: string; title: string; foto?: string | null; onBack: () => void;
  loader: (signal?: AbortSignal) => Promise<ChatFeed>; send: (text: string, image?: string, options?: SendOptions) => Promise<ChatItem>;
  markRead?: (last: string, signal?: AbortSignal) => Promise<void>;
  join?: () => Promise<void>; leave?: () => Promise<void>;
  destroy?: () => Promise<void>; edit?: () => void;
  earlier?: (page: number, signal?: AbortSignal) => Promise<ChatItem[]>;
  remove?: (item: ChatItem) => Promise<void>; report?: (item: ChatItem, reason: string) => Promise<void>;
}
interface FocusRun {
  active: boolean; busy: boolean; pages: number;
  abort?: AbortController; timer?: ReturnType<typeof setTimeout>;
}
type Confirmation = { kind: 'delete' | 'report'; item: ChatItem } | { kind: 'leave' | 'deleteForum' };

function mergeItems(items: ChatItem[]) {
  return [...new Map(items.map(item => [item.id, item])).values()].sort((a, b) =>
    b.date.localeCompare(a.date) || b.id.length - a.id.length || b.id.localeCompare(a.id));
}

function deniedAccess(cause: unknown) {
  return isAxiosError(cause) && [401, 403, 404].includes(cause.response?.status ?? 0);
}

export function ChatPanel(props: ChatPanelProps) {
  const { width } = useWindowDimensions();
  const imageWidth = chatImageWidth(width);
  const { user } = useAuth();
  const notify = useFeedback();
  const callbacks = useRef(props);
  React.useLayoutEffect(() => { callbacks.current = props; });
  const run = useRef<FocusRun | null>(null);
  const list = useRef<FlatList<ChatItem>>(null);
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const attempt = useRef<{ signature: string; id: string } | null>(null);
  const scrollTarget = useRef<string | null>(null);
  const scrollRetry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const viewable = useCallback(({ viewableItems }: { viewableItems: { item: ChatItem }[] }) => {
    if (viewableItems.some(({ item }) => item.id === scrollTarget.current)) scrollTarget.current = null;
  }, []);
  const [feed, setFeed] = useState<ChatFeed>();
  const [loading, setLoading] = useState(true);
  const [reading, setReading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [syncError, setSyncError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [hasEarlier, setHasEarlier] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [reason, setReason] = useState('');
  const [image, setImage] = useState<SelectedImage | null>(null);
  const [picking, setPicking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [imageSources, setImageSources] = useState(false);
  const [forumActions, setForumActions] = useState(false);
  const [replying, setReplying] = useState<ChatItem | null>(null);
  const [messageActions, setMessageActions] = useState<ChatItem | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [sendFailed, setSendFailed] = useState(false);

  function scrollToOriginal() {
    const target = scrollTarget.current;
    const index = feed?.items.findIndex(item => item.id === target) ?? -1;
    if (index < 0) return;
    list.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
  }

  function schedule(current: FocusRun) {
    clearTimeout(current.timer);
    if (current.active && AppState.currentState !== 'background' && AppState.currentState !== 'inactive') {
      // Após a conclusão da leitura: não empilha requisições se o servidor estiver lento.
      current.timer = setTimeout(() => { void refresh(current, true); }, 2000);
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
      if ((result.canSend || result.blocked) && callbacks.current.earlier) {
        for (let page = 2; page <= current.pages && lastPageLength === conversationPageSize; page++) {
          const previous = await callbacks.current.earlier(page, current.abort.signal);
          if (!current.active) return;
          all.push(...previous); lastPageLength = previous.length; loadedPages = page;
        }
      }
      current.pages = loadedPages;
      setFeed({ ...result, items: mergeItems(all) });
      const latest = mergeItems(result.items)[0];
      if (latest && callbacks.current.markRead && AppState.currentState === 'active') {
        try { await callbacks.current.markRead(latest.id, current.abort.signal); }
        catch (cause) { if (current.active) setActionError(errorMessage(cause)); }
      }
      setHasEarlier((result.canSend || !!result.blocked) && lastPageLength === conversationPageSize);
      setLoadError('');
      setSyncError('');
    } catch (cause) {
      if (current.active) {
        // Falha transitória preserva o histórico; perda de autorização remove o conteúdo privado.
        if (deniedAccess(cause)) { setFeed(undefined); setHasEarlier(false); setLoadError(errorMessage(cause)); }
        else if (quiet) setSyncError(errorMessage(cause));
        else setLoadError(errorMessage(cause));
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
    setFeed(undefined); setText(''); setImage(null); setProfileOpen(false); setLoadError(''); setSyncError(''); setActionError(''); setNotice('');
    setHasEarlier(false); setSending(false); setPicking(false); setUploading(false); setImageSources(false); setForumActions(false); setConfirmation(null); setReason(''); setLoading(true);
    setReplying(null); setMessageActions(null); setHighlighted(null); setSendFailed(false); attempt.current = null; scrollTarget.current = null;
    if (user) void refresh(current);
    else setLoading(false);
    const subscription = AppState.addEventListener('change', state => {
      clearTimeout(current.timer);
      if (state === 'active') void refresh(current, true);
    });
    return () => {
      current.active = false;
      clearTimeout(scrollRetry.current);
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
        if (isCancel(cause)) notify('Envio da imagem cancelado.', 'info');
        else { setActionError(errorMessage(cause)); notify(errorMessage(cause), 'error'); }
        if (deniedAccess(cause)) { setFeed(undefined); setHasEarlier(false); current.pages = 1; }
      }
      return false;
    } finally {
      current.busy = false;
      if (current.active) { setSending(false); schedule(current); }
    }
  }

  async function pickImage(source: 'library' | 'camera' = 'library') {
    const current = run.current;
    if (!current?.active || sending || picking) return;
    setImageSources(false); setPicking(true); setActionError('');
    try { const selected = await selectImage(undefined, source); if (current.active && selected) setImage(selected); }
    catch (cause) { if (current.active) setActionError(errorMessage(cause)); }
    finally { if (current.active) setPicking(false); }
  }
  async function submit() {
    const value = text.trim();
    if ((!value && !image) || !feed?.canSend) return;
    const signature = JSON.stringify([value, image?.uri, replying?.id]);
    if (attempt.current?.signature !== signature) attempt.current = { signature, id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}` };
    const envio_id = attempt.current.id;
    let sent: ChatItem | undefined;
    const success = await mutate(async () => {
      const current = run.current;
      if (!current?.active) return;
      let attachment: string | undefined;
      if (image) {
        const controller = new AbortController();
        current.abort = controller; setUploading(true);
        try {
          attachment = await uploadImage(image, true, controller.signal);
          if (controller.signal.aborted || !current.active) throw new CanceledError();
          setImage({ ...image, uploadedPath: attachment });
        } finally {
          current.abort = undefined;
          if (current.active) setUploading(false);
        }
      }
      if (!current.active) return;
      sent = await callbacks.current.send(value, attachment, { envio_id, ...(replying ? { resposta_id: replying.id } : {}) });
    }, () => {
      const message = sent;
      if (message) setFeed(previous => previous ? { ...previous, items: mergeItems([...previous.items, message]) } : previous);
      setText(''); setImage(null); setReplying(null); attempt.current = null;
      list.current?.scrollToOffset({ offset: 0, animated: true });
    });
    if (run.current?.active) setSendFailed(!success);
  }

  async function membership(action?: () => Promise<void>, leaving = false) {
    if (!action) return;
    const success = await mutate(action, () => {
      setFeed(undefined); setConfirmation(null); setHasEarlier(false);
      if (run.current) run.current.pages = 1;
      notify(leaving ? 'Você saiu do fórum.' : 'Você entrou no fórum.');
      if (leaving) callbacks.current.onBack();
    });
    if (success && run.current?.active) await refresh(run.current);
  }

  async function loadEarlier() {
    const current = run.current;
    if (!current?.active || current.busy || !callbacks.current.earlier || !(feed?.canSend || feed?.blocked)) return;
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

  async function locateOriginal(id: string) {
    const current = run.current;
    if (!current?.active || current.busy) return;
    setHighlighted(id); scrollTarget.current = id;
    if (feed?.items.some(item => item.id === id)) { scrollToOriginal(); return; }
    if (!callbacks.current.earlier) return;
    current.busy = true; clearTimeout(current.timer);
    current.abort = new AbortController(); setReading(true); setActionError('');
    let found = false;
    try {
      // Carrega o histórico de forma cancelável até alcançar a mensagem citada.
      while (current.active) {
        const items = await callbacks.current.earlier(current.pages + 1, current.abort.signal);
        if (!current.active) return;
        current.pages++;
        setFeed(previous => previous ? { ...previous, items: mergeItems([...previous.items, ...items]) } : previous);
        setHasEarlier(items.length === conversationPageSize);
        found = items.some(item => item.id === id);
        if (found || items.length < conversationPageSize) break;
      }
      if (!found) { scrollTarget.current = null; setActionError('A mensagem original foi excluída ou não está mais disponível.'); }
    } catch (cause) {
      if (current.active) {
        setActionError(errorMessage(cause));
        if (deniedAccess(cause)) { setFeed(undefined); setHasEarlier(false); }
      }
    } finally {
      current.busy = false; current.abort = undefined;
      if (current.active) { setReading(false); schedule(current); }
    }
  }

  async function confirmAction() {
    const target = confirmation;
    if (!target) return;
    if (target.kind === 'leave') { await membership(callbacks.current.leave, true); return; }
    if (target.kind === 'deleteForum') {
      if (callbacks.current.destroy) await mutate(callbacks.current.destroy, () => {
        setConfirmation(null); notify('Fórum excluído.'); callbacks.current.onBack();
      });
      return;
    }
    if (target.kind === 'report' && (!reason.trim() || reason.trim().length > 255)) return;
    if (target.kind === 'delete' && callbacks.current.remove) {
      await mutate(() => callbacks.current.remove!(target.item), () => {
        setFeed(previous => previous ? { ...previous, items: previous.items.filter(item => item.id !== target.item.id) } : previous);
        setConfirmation(null); setNotice('Mensagem excluída.');
        notify('Mensagem excluída.');
      });
    } else if (target.kind === 'report' && callbacks.current.report) {
      await mutate(() => callbacks.current.report!(target.item, reason.trim()), () => {
        setConfirmation(null); setReason(''); setNotice('Denúncia enviada para análise da moderação.');
        notify('Denúncia enviada à moderação.');
      });
    }
  }

  const busy = sending || reading || picking;
  function chooseReply(item: ChatItem) {
    if (!feed?.canSend || item.system || sending) return;
    setReplying(item); setMessageActions(null); input.current?.focus();
  }
  const { title, foto, onBack, join, leave, earlier, remove, report } = props;
  return <Screen paper scroll={false} bottomSafe>
    <View style={[ui.row, { gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderColor: '#E4D9ED' }]}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Voltar" style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}><Icon name="back" /></Pressable>
      {props.conversationKey.startsWith('forum:') ? <ForumCover title={feed?.title ?? title} foto={feed?.foto} size={44} /> : <Pressable accessibilityRole="button" accessibilityLabel="Ver perfil da usuária" disabled={!feed?.personId} onPress={() => setProfileOpen(true)}><Avatar nome={title} foto={foto} size={44} /></Pressable>}
      <Pressable style={{ flex: 1 }} accessibilityRole={feed?.personId ? "button" : undefined} accessibilityLabel={feed?.personId ? "Ver perfil de " + title : undefined} disabled={!feed?.personId} onPress={() => setProfileOpen(true)}><Text numberOfLines={2} style={[ui.dark, { fontWeight: '700' }]}>{feed?.title ?? title}</Text><Text style={[ui.dark, { fontSize: 11 }]}>{feed?.subtitle ?? 'Conversa'}</Text></Pressable>
      {(feed?.canLeave || feed?.canDelete) && <Pressable accessibilityRole="button" accessibilityLabel="Opções do fórum" disabled={busy} onPress={() => setForumActions(true)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="edit" size={20} /></Pressable>}
      <Pressable accessibilityRole="button" accessibilityLabel="Atualizar mensagens" accessibilityState={{ busy, disabled: busy }} disabled={busy} onPress={() => { if (run.current) void refresh(run.current); }} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="refresh" size={21} /></Pressable>
    </View>
    <ResourceState loading={loading} error={loadError} onRetry={() => { if (run.current) void refresh(run.current); }} dark empty={!feed?.items.length && !!feed && (feed.canSend ? 'Comece a conversa com um olá.' : 'Participe do fórum para ler e enviar postagens.')} />
    <FlatList
      ref={list}
      style={{ flex: 1 }} inverted data={feed?.items ?? []} keyExtractor={item => item.id}
      onContentSizeChange={scrollToOriginal}
      onViewableItemsChanged={viewable}
      onTouchStart={() => { scrollTarget.current = null; clearTimeout(scrollRetry.current); }}
      onScrollToIndexFailed={({ index, averageItemLength }) => { list.current?.scrollToOffset({ offset: index * averageItemLength, animated: true }); clearTimeout(scrollRetry.current); scrollRetry.current = setTimeout(scrollToOriginal, 150); }}
      keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', paddingVertical: 16, gap: 12 }}
      ListFooterComponent={earlier && hasEarlier ? <Button title="Mensagens anteriores" variant="secondary" small loading={reading} disabled={sending} onPress={() => void loadEarlier()} /> : undefined}
      renderItem={({ item }) => {
        if (item.system) return <View style={{ alignSelf: 'center', backgroundColor: '#EEDFF5', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6, maxWidth: '90%' }}><Text style={{ fontFamily, color: '#7A678D', textAlign: 'center', fontSize: 12 }}>{item.text}</Text></View>;
        const mine = item.authorId === user?.id;
        return <View style={{ flexDirection: mine ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
          {!mine && <Avatar nome={item.author} foto={item.foto} size={30} />}
          <View style={{ maxWidth: '80%', gap: 4, alignItems: mine ? 'flex-end' : 'flex-start' }}>
            {!mine && <Text style={{ color: colors.ink, fontSize: 11, paddingLeft: 5 }}>{item.author}</Text>}
            <Pressable accessibilityLabel="Opções da mensagem" accessibilityRole="button" onLongPress={() => setMessageActions(item)} style={{ backgroundColor: mine ? colors.ink : '#CA7CCB', padding: 14, borderRadius: 20, borderBottomRightRadius: mine ? 4 : 20, borderBottomLeftRadius: mine ? 20 : 4, borderWidth: 2, borderColor: highlighted === item.id ? colors.orchid : 'transparent', gap: 6 }}>
              {item.reply && <Pressable accessibilityRole="button" accessibilityLabel={`Localizar mensagem de ${item.reply.autora.nome}`} onPress={() => void locateOriginal(item.reply!.id)} style={{ borderLeftWidth: 3, borderColor: '#EEDFF5', backgroundColor: '#FFFFFF22', borderRadius: 6, padding: 8 }}><Text numberOfLines={1} style={{ color: colors.paper, fontWeight: '700', fontSize: 12 }}>{item.reply.autora.nome}</Text><Text numberOfLines={2} style={{ color: colors.paper, fontSize: 12 }}>{item.reply.imagem ? 'Foto' + (item.reply.conteudo ? ' · ' : '') : ''}{item.reply.conteudo}</Text></Pressable>}
              {item.image && <ConversationImage uri={item.image} maxWidth={imageWidth} onLongPress={() => setMessageActions(item)} />}
              {!!item.text && <Text selectable style={{ fontFamily, color: colors.paper, fontSize: 15, lineHeight: 21 }}>{item.text}</Text>}
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ color: '#7A678D', fontSize: 10 }}>{new Date(item.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>
              {feed?.canSend && <Pressable accessibilityRole="button" accessibilityLabel="Responder a esta mensagem" disabled={sending} onPress={() => chooseReply(item)} style={{ minHeight: 36, justifyContent: 'center' }}><Text style={{ color: colors.purple, fontSize: 11 }}>Responder</Text></Pressable>}
              {(mine ? remove : report) && <Pressable accessibilityRole="button" accessibilityLabel={mine ? 'Excluir esta mensagem' : 'Denunciar esta mensagem'} disabled={busy} onPress={() => { setActionError(''); setReason(''); setConfirmation({ kind: mine ? 'delete' : 'report', item }); }} style={{ minHeight: 36, justifyContent: 'center' }}><Text style={{ color: colors.purple, fontSize: 11 }}>{mine ? 'Excluir' : 'Denunciar'}</Text></Pressable>}
            </View>
          </View>
        </View>;
      }}
    />
    <Notice text={actionError} dark />
    <Notice text={syncError} dark />
    {!!syncError && !loadError && <Button title="Tentar novamente" small variant="secondary" disabled={busy} onPress={() => { if (run.current) void refresh(run.current, true); }} />}
    {sendFailed && feed?.canSend && (text.trim() || image) && <Button title="Tentar enviar novamente" small variant="secondary" disabled={busy} onPress={() => void submit()} />}
    {!!notice && <Text accessibilityRole="alert" style={ui.dark}>{notice}</Text>}
    {replying && feed?.canSend && <View style={[ui.row, { backgroundColor: '#EEDFF5', borderLeftWidth: 3, borderColor: colors.purple, borderRadius: 10, padding: 10 }]}><View style={{ flex: 1 }}><Text style={[ui.dark, { fontWeight: '700', fontSize: 12 }]}>Respondendo a {replying.author}</Text><Text numberOfLines={2} style={[ui.dark, { fontSize: 12 }]}>{replying.image ? 'Foto' + (replying.text ? ' · ' : '') : ''}{replying.text}</Text></View><Button title="Cancelar resposta" small variant="secondary" disabled={sending} onPress={() => setReplying(null)} /></View>}
    {image && <View style={[ui.row, { padding: 8 }]}><Image source={{ uri: image.uri }} resizeMode="contain" accessibilityLabel="Prévia da imagem selecionada" style={{ width: 80, height: 100, borderRadius: 10 }} /><Button title="Remover imagem" small variant="secondary" disabled={sending} onPress={() => setImage(null)} /></View>}
    {uploading && <Button title="Cancelar envio da imagem" small variant="secondary" onPress={() => run.current?.abort?.abort()} />}
    {feed?.blocked && <Text style={ui.dark}>Envio indisponível por bloqueio entre as contas. Você pode consultar o perfil e o histórico.</Text>}
    {feed?.canSend ? <View style={[ui.row, { gap: 8, paddingTop: 8 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Anexar imagem" disabled={busy} onPress={() => setImageSources(true)} style={{ width: 44, height: 48, alignItems: 'center', justifyContent: 'center' }}>{picking ? <ActivityIndicator /> : <Icon name="camera" />}</Pressable>
      <TextInput ref={input} accessibilityLabel="Digite uma mensagem" placeholder="Digite uma mensagem..." placeholderTextColor="#7B6593" value={text} onChangeText={setText} multiline maxLength={1000} editable={!sending} style={{ fontFamily, flex: 1, maxHeight: 120, minHeight: 50, color: colors.ink, backgroundColor: '#EEDFF5', borderRadius: 25, paddingHorizontal: 18, paddingVertical: 14, fontSize: 14 }} />
      <Pressable accessibilityRole="button" accessibilityLabel="Enviar mensagem" accessibilityState={{ disabled: busy || (!text.trim() && !image) }} disabled={busy || (!text.trim() && !image)} onPress={() => void submit()} style={{ width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.purple, opacity: busy || (!text.trim() && !image) ? 0.5 : 1 }}>
        {sending ? <ActivityIndicator color={colors.paper} /> : <Icon name="send" color={colors.paper} size={22} />}
      </Pressable>
    </View> : join && feed ? <Button title="Participar do fórum" loading={sending} disabled={reading} onPress={() => void membership(join)} /> : null}
    {image && props.conversationKey.startsWith('forum:') && <Button title="Refazer foto" variant="secondary" small disabled={busy} onPress={() => void pickImage('camera')} />}
    <Sheet visible={messageActions !== null} title="Mensagem" onClose={() => setMessageActions(null)}>
      {feed?.canSend && <Button title="Responder" disabled={sending} onPress={() => { if (messageActions) chooseReply(messageActions); }} />}
      {messageActions && (messageActions.authorId === user?.id ? remove : report) && <Button title={messageActions.authorId === user?.id ? 'Excluir mensagem' : 'Denunciar mensagem'} variant="secondary" disabled={busy} onPress={() => { if (messageActions) { setReason(''); setConfirmation({ kind: messageActions.authorId === user?.id ? 'delete' : 'report', item: messageActions }); setMessageActions(null); } }} />}
    </Sheet>
    <Sheet visible={imageSources} title="Adicionar foto" onClose={() => setImageSources(false)}><Button title="Tirar foto" icon="camera" onPress={() => void pickImage('camera')} /><Button title="Escolher da galeria" variant="secondary" onPress={() => void pickImage('library')} /></Sheet>
    <Sheet visible={forumActions} title="Opções do fórum" onClose={() => setForumActions(false)}>
      {feed?.canLeave && leave && <Button title="Sair do fórum" variant="secondary" onPress={() => { setForumActions(false); setActionError(''); setConfirmation({ kind: 'leave' }); }} />}
      {feed?.canDelete && props.edit && <Button title="Editar fórum" variant="secondary" onPress={() => { setForumActions(false); props.edit?.(); }} />}
      {feed?.canDelete && props.destroy && <Button title="Excluir fórum" variant="secondary" onPress={() => { setForumActions(false); setActionError(''); setConfirmation({ kind: 'deleteForum' }); }} />}
    </Sheet>
    {profileOpen && feed?.personId && <PersonModal id={feed.personId} onChanged={person => setFeed(previous => previous ? { ...previous, blocked: person.interacao_bloqueada, canSend: !person.interacao_bloqueada } : previous)} onClose={() => { setProfileOpen(false); if (run.current) void refresh(run.current, true); }} />}
    <Modal visible={!!confirmation} transparent animationType="fade" onRequestClose={() => { if (!sending) setConfirmation(null); }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#150B2B99', padding: 16 }}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center' }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View style={{ width: '100%', maxWidth: 460, alignSelf: 'center', backgroundColor: colors.paper, borderRadius: 24, padding: 24, gap: 16 }}>
          <Text accessibilityRole="header" style={[ui.dark, { fontSize: 21, fontWeight: '700' }]}>{confirmation?.kind === 'report' ? 'Denunciar mensagem' : confirmation?.kind === 'leave' ? 'Sair do fórum?' : confirmation?.kind === 'deleteForum' ? 'Excluir fórum?' : 'Excluir mensagem?'}</Text>
          <Text style={ui.dark}>{confirmation?.kind === 'report' ? 'Descreva o motivo para a moderação analisar.' : confirmation?.kind === 'leave' ? 'Para ler ou publicar novamente, será necessário participar do fórum.' : confirmation?.kind === 'deleteForum' ? 'A exclusão é permanente. Fóruns com postagens não podem ser excluídos.' : 'Esta mensagem será excluída da conversa.'}</Text>
          {confirmation?.kind === 'report' && <TextInput accessibilityLabel="Motivo da denúncia" value={reason} onChangeText={setReason} placeholder="Digite o motivo" placeholderTextColor="#7B6593" multiline maxLength={255} editable={!sending} style={{ fontFamily, color: colors.ink, minHeight: 100, borderWidth: 1, borderColor: '#C0A7D4', borderRadius: 10, padding: 12, textAlignVertical: 'top' }} />}
          <Notice text={actionError} dark />
          <Button title={confirmation?.kind === 'report' ? 'Enviar denúncia' : confirmation?.kind === 'leave' ? 'Sair do fórum' : 'Excluir'} loading={sending} disabled={reading || (confirmation?.kind === 'report' && !reason.trim())} onPress={() => void confirmAction()} />
          <Button title="Cancelar" variant="secondary" disabled={sending} onPress={() => { setConfirmation(null); setActionError(''); }} />
        </View>
      </ScrollView></KeyboardAvoidingView></SafeAreaView>
    </Modal>
  </Screen>;
}
