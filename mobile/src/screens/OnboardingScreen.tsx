import React from 'react';
import { ImageBackground, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Button } from '../components/ui';
import { colors, ui } from '../styles/theme';
import type { ScreenProps } from '../types/navigation';

export default function OnboardingScreen({ navigation }: ScreenProps<'Onboarding'>) {
  const { height } = useWindowDimensions();
  return <ImageBackground source={require('../../assets/images/onboarding-garotas.png')} resizeMode="cover" imageStyle={{ width: '100%', height: '100%' }} style={styles.fill} accessibilityLabel="Duas amigas em um cenário espacial">
    <StatusBar style="light" />
    <LinearGradient pointerEvents="none" colors={['#100D3250', '#100D3220', '#58328BCC', colors.purple]} locations={[0, 0.4, 0.7, 0.88]} style={StyleSheet.absoluteFill} />
    <SafeAreaView style={{ flex: 1 }}>
      <View style={[styles.content, { paddingBottom: Math.max(32, height * 0.1) }]}>
        <Text style={[ui.title, styles.title]}>Queremos te{ '\n' }conhecer melhor...</Text>
        <Button title="Próximo" variant="secondary" onPress={() => navigation.navigate('SobreVoce')} />
      </View>
    </SafeAreaView>
  </ImageBackground>;
}
const styles = StyleSheet.create({
  fill: { flex: 1, width: '100%', overflow: 'hidden', backgroundColor: colors.night },
  content: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 32, width: '100%', maxWidth: 520, alignSelf: 'center', gap: 20 },
  title: { textAlign: 'center', fontSize: 30, lineHeight: 37 },
});
