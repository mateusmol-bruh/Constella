import { Platform, StyleSheet } from 'react-native';
export const fontFamily = Platform.OS === 'web' ? 'Arial' : Platform.OS === 'android' ? 'sans-serif' : 'System';

export const colors = {
  night: '#100D32', purple: '#58328B', ink: '#35256B', card: '#403777',
  paper: '#F9F2FF', lavender: '#EEDFF5', muted: '#D4C4E9', pink: '#F3A0B5',
  orchid: '#A34FD3', white: '#FFFFFF', error: '#FFD5DF', success: '#A9E6D1',
};
export const space = { xs: 6, sm: 12, md: 20, lg: 28, xl: 40 };
export const ui = StyleSheet.create({
  title: { fontFamily, color: colors.paper, fontSize: 30, fontWeight: '700', fontStyle: 'italic' },
  subtitle: { fontFamily, color: colors.paper, fontSize: 18, fontWeight: '700', fontStyle: 'italic' },
  body: { fontFamily, color: colors.paper, fontSize: 15, lineHeight: 22 },
  muted: { fontFamily, color: colors.muted, fontSize: 13, lineHeight: 19 },
  dark: { fontFamily, color: colors.ink, fontSize: 15, lineHeight: 22 },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: space.md, gap: space.sm },
  paper: { backgroundColor: colors.paper, borderRadius: 22, padding: space.md, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  section: { gap: space.sm, marginTop: space.md },
  center: { alignItems: 'center', justifyContent: 'center' },
  link: { fontFamily, color: colors.paper, fontSize: 14, textDecorationLine: 'underline' },
});
