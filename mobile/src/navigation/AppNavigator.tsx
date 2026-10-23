import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../components/Icon';
import { useAuth } from '../constexts/AuthContext';
import { colors } from '../styles/theme';
import type { RootStackParamList, ScreenProps, TabParamList } from '../types/navigation';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import CadastroScreen from '../screens/CadastroScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import SobreVoceScreen from '../screens/SobreVoceScreen';
import InteressesScreen from '../screens/InteressesScreen';
import HomeScreen from '../screens/HomeScreen';
import ConexoesScreen from '../screens/ConexoesScreen';
import PerfilScreen from '../screens/PerfilScreen';
import ConversasScreen from '../screens/ConversasScreen';
import ChatScreen from '../screens/ChatScreen';
import ForumScreen from '../screens/ForumScreen';
import ChatForumScreen from '../screens/ChatForumScreen';
import CriarForumScreen from '../screens/CriarForumScreen';
import ConteudosScreen from '../screens/ConteudosScreen';
import DetalheConteudoScreen from '../screens/DetalheConteudoScreen';
import VerificarContaScreen from '../screens/VerificarContaScreen';
import ConstellaProScreen from '../screens/ConstellaProScreen';
import DetalheProScreen from '../screens/DetalheProScreen';
import ProtectedCTA from '../components/ProtectedCTA';
import GuestHomeScreen from '../screens/GuestHomeScreen';

export type { RootStackParamList } from '../types/navigation';
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();
const icons: Record<keyof TabParamList, IconName> = { Forum: 'forum', Conversas: 'chat', Conteudos: 'content', Home: 'home', Conexoes: 'heart', Perfil: 'profile' };
function AccountRequiredScreen({ route }: ScreenProps<'ContaNecessaria'>) {
  return <ProtectedCTA title={route.params?.recurso} />;
}

function MainTabs() {
  const { isGuest } = useAuth();
  const insets = useSafeAreaInsets();
  return <Tabs.Navigator initialRouteName="Home" screenOptions={({ route }) => ({
    headerShown: false, tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: '#D976B5', tabBarInactiveTintColor: colors.ink,
    tabBarStyle: { backgroundColor: colors.paper, borderTopWidth: 0, height: 66 + insets.bottom, paddingTop: 7, paddingBottom: Math.max(insets.bottom, 6) },
    tabBarLabelStyle: { fontSize: 10, marginTop: 3 },
    tabBarIcon: ({ color }) => <Icon name={icons[route.name]} color={color} size={25} />,
    sceneStyle: { backgroundColor: colors.night },
  })}>
    <Tabs.Screen name="Forum" component={ForumScreen} options={{ title: 'Fórum' }} />
    <Tabs.Screen name="Conversas" options={{ title: 'Chat' }}>{() => isGuest ? <ProtectedCTA title="Suas conversas" /> : <ConversasScreen />}</Tabs.Screen>
    <Tabs.Screen name="Conteudos" component={ConteudosScreen} options={{ title: 'Conteúdo' }} />
    <Tabs.Screen name="Home" options={{ title: 'Home' }}>{() => isGuest ? <GuestHomeScreen /> : <HomeScreen />}</Tabs.Screen>
    <Tabs.Screen name="Conexoes" options={{ title: 'Conexões' }}>{() => isGuest ? <ProtectedCTA title="Suas conexões" /> : <ConexoesScreen />}</Tabs.Screen>
    <Tabs.Screen name="Perfil" options={{ title: 'Perfil' }}>{() => isGuest ? <ProtectedCTA title="Seu perfil" /> : <PerfilScreen />}</Tabs.Screen>
  </Tabs.Navigator>;
}
export default function AppNavigator() {
  const { user, isGuest } = useAuth();
  return <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.night }, animation: 'fade' }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Splash" component={SplashScreen} options={{ gestureEnabled: false }} />
    <Stack.Screen name="Cadastro" component={CadastroScreen} />
    {(user || isGuest) && <Stack.Group navigationKey={user?.id ?? 'guest'}>
      <Stack.Screen name="Main" component={MainTabs} options={{ gestureEnabled: false }} />
      <Stack.Screen name="ContaNecessaria" component={AccountRequiredScreen} />
      <Stack.Screen name="ConstellaPro" component={ConstellaProScreen} />
      <Stack.Screen name="DetalhePro" component={DetalheProScreen} />
      <Stack.Screen name="DetalheConteudo" component={DetalheConteudoScreen} />
    </Stack.Group>}
    {user && <Stack.Group navigationKey={`account:${user.id}`}>
      <Stack.Screen name="VerificarConta" component={VerificarContaScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="SobreVoce" component={SobreVoceScreen} />
      <Stack.Screen name="Interesses" component={InteressesScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ChatForum" component={ChatForumScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CriarForum" component={CriarForumScreen} />
    </Stack.Group>}
  </Stack.Navigator>;
}
