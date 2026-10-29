export interface PushDestination { tipo: 'chat' | 'forum' | 'conexao'; id: string; destinataria: string; evento: string }
export function pushDestination(value: unknown): PushDestination | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const positive = (id: unknown): id is string => typeof id === 'string' && /^[1-9]\d{0,18}$/.test(id) && BigInt(id) <= 9223372036854775807n;
  if (!['chat', 'forum', 'conexao'].includes(String(data.tipo)) || !positive(data.id) || !positive(data.destinataria) || !positive(data.evento)) return null;
  return { tipo: data.tipo as PushDestination['tipo'], id: data.id, destinataria: data.destinataria, evento: data.evento };
}
