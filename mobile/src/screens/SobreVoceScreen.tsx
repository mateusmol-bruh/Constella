import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Brand } from '../components/Brand';
import { Button, Field, Header, Screen } from '../components/ui';
import { useAuth } from '../constexts/AuthContext';
import { colors, ui } from '../styles/theme';
import type { ScreenProps } from '../types/navigation';

export default function SobreVoceScreen({ navigation }: ScreenProps<'SobreVoce'>) {
  const { about, setAbout } = useAuth();
  return <Screen centered bottomSafe>
    <Header title="" onBack={() => navigation.goBack()} />
    <View style={{ alignItems: 'center', marginBottom: 24 }}><Brand width={280} /></View>
    <View style={ui.paper}>
      <Text style={[ui.subtitle, { color: colors.ink, textAlign: 'center' }]}>Fale mais{ '\n' }sobre você:</Text>
      <LinearGradient colors={[colors.pink, colors.orchid]} style={{ borderRadius: 24, padding: 12 }}>
        <Field label="Digite aqui" value={about} onChangeText={setAbout} multiline maxLength={500} />
      </LinearGradient>
      <Text style={[ui.dark, { fontSize: 12 }]}>Você pode continuar sem preencher. Sua apresentação será salva ao finalizar.</Text>
    </View>
    <View style={{ marginTop: 24 }}><Button title="Continuar" onPress={() => navigation.navigate('Interesses')} /></View>
  </Screen>;
}
