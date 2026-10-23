import React from 'react';
import { ChatPanel, type ChatItem } from '../components/ChatPanel';
import { useAuth } from '../constexts/AuthContext';
import { socialService } from '../services/social.service';
import type { Message } from '../types/models';
import type { ScreenProps } from '../types/navigation';

export default function ChatScreen({ navigation, route }: ScreenProps<'Chat'>) {
  const { user } = useAuth();
  const { id, nome, foto } = route.params;
  const map = (item: Message): ChatItem => ({ id: item.id_msg, authorId: item.id_usr_emissor, author: item.id_usr_emissor === user?.id ? user.nome : nome, foto: item.id_usr_emissor === user?.id ? null : foto, text: item.conteudo, image: item.imagem, date: item.dt_envio });
  return <ChatPanel key={`${user?.id}:${id}`} conversationKey={`chat:${id}`} title={nome} foto={foto} onBack={() => navigation.goBack()}
    loader={async signal => {
      const [chat, messages] = await Promise.all([socialService.chat(id, signal), socialService.messages(id, 1, signal)]);
      return { items: messages.map(map), canSend: !chat.interacao_bloqueada, blocked: chat.interacao_bloqueada, personId: chat.destinataria?.id, subtitle: 'Conversa privada' };
    }}
    markRead={(last, signal) => socialService.read('chat', id, last, signal)}
    send={async (text, image) => map(await socialService.sendMessage(id, text, image))}
    earlier={async (page, signal) => (await socialService.messages(id, page, signal)).map(map)}
    remove={item => socialService.deleteMessage(id, item.id)}
    report={(item, reason) => socialService.reportMessage(item.id, reason)}
  />;
}
