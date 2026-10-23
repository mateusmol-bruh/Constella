import type { Interest } from './models';

export interface RecommendedContent {
  id: string;
  titulo: string;
  descricao: string | null;
  duracao: number | null;
  data_publicacao: string;
  interesses_compativeis: Interest[];
  score: number;
}
