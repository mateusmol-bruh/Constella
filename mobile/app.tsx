import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/constexts/AuthContext';
import { CommunityProvider } from './src/constexts/CommunityContext';
import { colors } from './src/styles/theme';

const navigationTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: colors.orchid, background: colors.night, card: colors.paper, text: colors.ink, border: colors.lavender } };
export default function App() {
  return <SafeAreaProvider><AuthProvider><CommunityProvider>
    <StatusBar style="light" />
    <NavigationContainer theme={navigationTheme}><AppNavigator /></NavigationContainer>
  </CommunityProvider></AuthProvider></SafeAreaProvider>;
}
