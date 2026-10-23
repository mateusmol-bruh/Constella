import { apiUrl } from '../services/api';

export function mediaUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  return (value.startsWith('/uploads/') || value.startsWith('/api/anexos/')) ? `${apiUrl ?? ''}${value}` : value;
}
