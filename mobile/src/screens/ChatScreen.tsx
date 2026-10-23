import React from 'react';
import { ChatPanel, type ChatItem } from '../components/ChatPanel';
import { useAuth } from '../constexts/AuthContext';
import { socialService } from '../services/social.service';
import type { Message } from '../types/models';
import type { ScreenProps } from '../types/navigation';

export default function ChatScreen({ navigation, route }: ScreenProps<'Chat'>) {
  const { user } = useAuth();
  const { id, nome, foto } = route.params;
  const map = (item: Message): ChatItem => ({ id: item.id_msg, authorId: item.id_usr_emissor, author: item.id_usr_emissor === user?.id ? user.nome : nome, foto: item.id_usr_emissor === user?.id ? null : foto, text: item.conteudo, date: item.dt_envio });
  return <ChatPanel key={`${user?.id}:${id}`} conversationKey={`chat:${id}`} title={nome} foto={foto} onBack={() => navigation.goBack()}
    loader={async signal => ({ items: (await socialService.messages(id, 1, signal)).map(map), canSend: true, subtitle: 'Conversa privada' })}
    send={async text => map(await socialService.sendMessage(id, text))}
    earlier={async (page, signal) => (await socialService.messages(id, page, signal)).map(map)}
    remove={item => socialService.deleteMessage(id, item.id)}
    report={(item, reason) => socialService.reportMessage(item.id, reason)}
  />;
}
