import React from 'react';
import { ChatPanel, type ChatItem } from '../components/ChatPanel';
import { useAuth } from '../constexts/AuthContext';
import { socialService, type SocialForum } from '../services/social.service';
import type { Post } from '../types/models';
import type { ScreenProps } from '../types/navigation';

export default function ChatForumScreen({ navigation, route }: ScreenProps<'ChatForum'>) {
  const { user } = useAuth();
  const { id, nome } = route.params;
  const map = (item: Post): ChatItem => ({ id: item.id_post, authorId: item.autora?.id ?? '', author: item.autora?.nome ?? 'Participante', foto: item.autora?.foto, text: item.conteudo, image: item.imagem, date: item.dt_post, reply: item.resposta, system: item.tipo === 'sistema' });
  return <ChatPanel key={`${user?.id}:${id}`} conversationKey={`forum:${id}`} title={nome} onBack={() => navigation.goBack()}
    loader={async signal => {
      // Metadados permitem entrar. Postagens só são solicitadas após confirmar a participação.
      const forum: SocialForum = await socialService.forum(id, signal);
      const posts = forum.participando ? await socialService.posts(id, 1, signal) : [];
      return { items: posts.map(map), title: forum.titulo, foto: forum.capa, canSend: !!forum.participando, canDelete: forum.criadora?.id === user?.id, canLeave: !!forum.participando && !!forum.criadora && forum.criadora.id !== user?.id, subtitle: forum.quantidade_membros === undefined ? 'Comunidade' : forum.quantidade_membros + ' membros' };
    }}
    send={async (text, image, options) => map(await socialService.sendPost(id, text, image, options))}
    markRead={(last, signal) => socialService.read('forum', id, last, signal)}
    join={() => socialService.joinForum(id)}
    earlier={async (page, signal) => (await socialService.posts(id, page, signal)).map(map)}
    leave={() => socialService.leaveForum(id)}
    destroy={() => socialService.deleteForum(id)}
    edit={() => navigation.navigate('CriarForum', { id })}
    remove={item => socialService.deletePost(item.id)}
    report={(item, reason) => socialService.reportPost(item.id, reason)}
  />;
}
