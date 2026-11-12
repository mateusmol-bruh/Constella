import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brand } from '../components/Brand';
import { SpaceBackground } from '../components/SpaceBackground';
import { colors } from '../styles/theme';
import type { ScreenProps } from '../types/navigation';

export default function SplashScreen({ navigation }: ScreenProps<'Splash'>) {
  useEffect(() => {
    const timer = setTimeout(() => navigation.replace('Login'), 2000);
    return () => clearTimeout(timer);
  }, [navigation]);
  return <SpaceBackground waves><SafeAreaView style={styles.screen} pointerEvents="none">
    <Text style={[styles.star, { top: '12%', left: '20%', fontSize: 42 }]}>✦</Text>
    <Text style={[styles.star, { top: '23%', right: '17%', fontSize: 25 }]}>✦</Text>
    <Text style={[styles.star, { top: '32%', left: '30%', fontSize: 17 }]}>✦</Text>
    <View style={styles.brand}><Brand width={300} /><Text style={styles.tagline}>O céu fica maior quando{ '\n' }estamos juntas.</Text></View>
  </SafeAreaView></SpaceBackground>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  brand: { alignItems: 'center', width: '100%', gap: 14 },
  star: { position: 'absolute', color: colors.paper, textShadowColor: '#F9EFFF', textShadowRadius: 14 },
  tagline: { color: colors.paper, fontSize: 21, fontWeight: '700', fontStyle: 'italic', textAlign: 'center' },
});
