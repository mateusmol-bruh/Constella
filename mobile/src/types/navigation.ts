import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type TabParamList = {
  Forum: undefined; Conversas: undefined; Conteudos: undefined;
  Home: undefined; Conexoes: { aba?: 'requests'; evento?: string } | undefined; Perfil: undefined;
};
export type RootStackParamList = {
  Splash: undefined; Login: undefined; Cadastro: undefined; VerificarConta: undefined;
  ConstellaPro: undefined; DetalhePro: { id: string };
  ContaNecessaria: { recurso?: string } | undefined;
  Onboarding: undefined; SobreVoce: undefined; Interesses: { editar?: boolean } | undefined;
  Main: NavigatorScreenParams<TabParamList> | undefined;
  Chat: { id: string; nome: string; foto?: string | null };
  ChatForum: { id: string; nome: string };
  CriarForum: { id: string } | undefined;
  RecuperarSenha: undefined;
  DetalheConteudo: { id: string };
};
export type ScreenProps<K extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, K>;
