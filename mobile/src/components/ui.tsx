import React, { useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SpaceBackground } from './SpaceBackground';
import { Icon, type IconName } from './Icon';
import { useAuth } from '../constexts/AuthContext';
import { colors, fontFamily, space, ui } from '../styles/theme';

export function Screen({ children, scroll = true, centered = false, paper = false, waves = false, bottomSafe = false }: {
  children: ReactNode; scroll?: boolean; centered?: boolean; paper?: boolean; waves?: boolean; bottomSafe?: boolean;
}) {
  const { isGuest } = useAuth();
  const focused = useIsFocused();
  const content = <View style={[styles.content, centered && styles.centered]}>{children}</View>;
  return <SpaceBackground waves={waves}>
    {focused && <StatusBar style={paper ? 'dark' : 'light'} />}
    <SafeAreaView style={[styles.fill, paper && { backgroundColor: colors.paper }]} edges={bottomSafe ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}>
      {isGuest && <View style={styles.guest}><Text style={styles.guestText}>Visitante • entre com sua conta para participar</Text></View>}
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {scroll ? <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{content}</ScrollView> : content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  </SpaceBackground>;
}
export function Button({ title, onPress, loading = false, disabled = false, variant = 'primary', small = false, icon }: {
  title: string; onPress: () => void; loading?: boolean; disabled?: boolean; variant?: 'primary' | 'secondary' | 'ghost'; small?: boolean; icon?: IconName;
}) {
  const inactive = disabled || loading;
  const body = <View style={[styles.buttonContent, small && styles.smallButton]}>
    {loading ? <ActivityIndicator color={variant === 'primary' ? colors.paper : colors.ink} /> : <>
      {icon && <Icon name={icon} size={20} color={variant === 'primary' ? colors.paper : colors.ink} />}
      <Text style={[styles.buttonText, variant !== 'primary' && { color: colors.ink }, small && { fontSize: 13 }]}>{title}</Text>
    </>}
  </View>;
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: inactive, busy: loading }} disabled={inactive} onPress={onPress} style={({ pressed }) => [styles.button, variant === 'secondary' && { backgroundColor: colors.paper }, { opacity: inactive ? 0.5 : pressed ? 0.75 : 1 }]}>
    {variant === 'primary' ? <LinearGradient colors={[colors.pink, colors.orchid]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>{body}</LinearGradient> : body}
  </Pressable>;
}
export function Field({ label, error, icon, password = false, light = false, ...props }: TextInputProps & {
  label: string; error?: string; icon?: IconName; password?: boolean; light?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const ink = light ? colors.ink : colors.paper;
  return <View style={{ gap: 5 }}>
    <View style={[styles.field, light && styles.lightField, !!error && { borderColor: light ? '#B52E54' : colors.error }, props.multiline && { alignItems: 'flex-start' }]}>
      {icon && <View style={{ marginTop: props.multiline ? 10 : 0 }}><Icon name={icon} size={22} color={ink} /></View>}
      <TextInput {...props} accessibilityLabel={label} placeholder={props.placeholder ?? label} placeholderTextColor={light ? '#74648F' : '#DFD4EF'} secureTextEntry={password && !visible} style={[styles.input, { color: ink }, props.multiline && { minHeight: 130, textAlignVertical: 'top' }]} />
      {password && <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'} onPress={() => setVisible(value => !value)} hitSlop={8} style={{ padding: 6 }}><Icon name={visible ? 'eyeOff' : 'eye'} color={ink} size={20} /></Pressable>}
    </View>
    {error && <Text accessibilityRole="alert" style={{ color: light ? '#A62748' : colors.error, fontSize: 13 }}>{error}</Text>}
  </View>;
}
export function SearchField({ value, onChangeText, placeholder }: { value: string; onChangeText: (value: string) => void; placeholder: string }) {
  return <View style={styles.search}><Icon name="search" size={21} /><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} accessibilityLabel={placeholder} placeholderTextColor="#66538C" style={styles.searchInput} autoCorrect={false} /><View>{!!value && <Pressable accessibilityRole="button" accessibilityLabel="Limpar busca" onPress={() => onChangeText('')} hitSlop={8}><Icon name="close" size={18} /></Pressable>}</View></View>;
}
export function Header({ title, onBack, dark = false, right }: { title: string; onBack?: () => void; dark?: boolean; right?: ReactNode }) {
  return <View style={[ui.row, { marginBottom: space.sm }]}>
    {onBack && <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={onBack} hitSlop={10} style={{ paddingVertical: 10 }}><Icon name="back" color={dark ? colors.ink : colors.paper} /></Pressable>}
    <Text accessibilityRole="header" style={[ui.title, { flex: 1 }, dark && { color: colors.ink }]}>{title}</Text>{right}
  </View>;
}
export function Notice({ text, dark = false }: { text?: string; dark?: boolean }) {
  if (!text) return null;
  return <Text accessibilityRole="alert" style={{ color: dark ? '#A62748' : colors.error, lineHeight: 21, fontSize: 14 }}>{text}</Text>;
}
export function ResourceState({ loading, error, empty, onRetry, dark = false }: { loading: boolean; error: string; empty?: string | false; onRetry: () => void; dark?: boolean }) {
  if (loading) return <ActivityIndicator accessibilityLabel="Carregando" color={dark ? colors.ink : colors.paper} style={{ padding: 24 }} />;
  if (error) return <View style={{ gap: 12, paddingVertical: 12 }}><Notice text={error} dark={dark} /><Button title="Tentar novamente" variant="secondary" small onPress={onRetry} /></View>;
  if (empty) return <View style={{ alignItems: 'center', padding: 28, gap: 12 }}><Icon name="search" color={dark ? colors.ink : colors.muted} size={30} /><Text style={[ui.body, { textAlign: 'center' }, dark && { color: colors.ink }]}>{empty}</Text></View>;
  return null;
}
export function Chip({ title, selected = false, onPress }: { title: string; selected?: boolean; onPress?: () => void }) {
  return <Pressable accessibilityRole={onPress ? 'checkbox' : 'text'} accessibilityState={onPress ? { checked: selected } : undefined} disabled={!onPress} onPress={onPress} style={[styles.chip, selected && { backgroundColor: colors.orchid }]}><Text style={{ fontFamily, color: selected ? colors.white : colors.ink, fontSize: 13 }}>{title}</Text></Pressable>;
}
export function TextLink({ title, onPress }: { title: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[ui.link, { textAlign: 'center' }]}>{title}</Text></Pressable>;
}
const styles = StyleSheet.create({
  fill: { flex: 1 }, scroll: { flexGrow: 1 }, content: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center', padding: space.md, gap: space.sm },
  centered: { justifyContent: 'center', paddingVertical: space.xl, paddingHorizontal: 32 },
  guest: { backgroundColor: '#EBDCF6', paddingHorizontal: 8, paddingVertical: 5 }, guestText: { fontFamily, color: colors.ink, fontSize: 10, textAlign: 'center' },
  button: { borderRadius: 23, overflow: 'hidden' }, buttonContent: { minHeight: 54, paddingVertical: 13, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  smallButton: { minHeight: 44, paddingVertical: 9, paddingHorizontal: 13 }, buttonText: { fontFamily, color: colors.paper, fontSize: 18, fontWeight: '700', fontStyle: 'italic', textAlign: 'center' },
  field: { borderWidth: 1, borderColor: '#9483AE', borderRadius: 9, backgroundColor: '#FFFFFF1E', minHeight: 57, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 10 },
  lightField: { backgroundColor: colors.paper, borderColor: '#DECEE9' }, input: { fontFamily, flex: 1, minWidth: 0, fontSize: 15, paddingVertical: 15 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 25, backgroundColor: colors.paper, paddingHorizontal: 16, minHeight: 46, marginBottom: 10 },
  searchInput: { fontFamily, flex: 1, minWidth: 0, color: colors.ink, fontSize: 14, paddingVertical: 12 },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.paper },
});
