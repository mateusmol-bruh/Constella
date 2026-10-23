import type { Connection, Conversation } from '../types/models';

export interface ChatEntry { key: string; chatId?: string; personId?: string; nome: string; foto?: string | null; lastMessage?: string; lastDate?: string; unread?: number }
export function chatEntries(chats: Conversation[], connections: Connection[]): ChatEntry[] {
  const entries: ChatEntry[] = chats.map(chat => ({ key: `chat:${chat.id_chat}`, chatId: chat.id_chat, personId: chat.destinataria?.id, nome: chat.destinataria?.nome ?? 'Conversa', foto: chat.destinataria?.foto, lastMessage: chat.ultima_mensagem?.conteudo || (chat.ultima_mensagem?.imagem ? "📷 Imagem" : undefined), lastDate: chat.ultima_mensagem?.dt_envio, unread: chat.nao_lidas }));
  const present = new Set(entries.map(item => item.personId));
  for (const connection of connections) {
    const person = connection.outra_usuaria;
    if (connection.status_conexao !== 'ACEITO' || !person || present.has(person.id_usr)) continue;
    present.add(person.id_usr);
    entries.push({ key: `person:${person.id_usr}`, personId: person.id_usr, nome: person.nome_usr, foto: person.foto_usr });
  }
  return entries;
}
