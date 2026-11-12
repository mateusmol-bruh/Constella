import React, { useEffect, useRef, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Button, Notice } from './ui';
import { selectImage, type SelectedImage } from '../services/image.service';
import { mediaUrl } from '../utils/media';
import { errorMessage } from '../services/api';
import { ui } from '../styles/theme';

export function ImageField({ label, current, selected, onChange, disabled, aspect = [1, 1] }: {
  label: string; current?: string | null; selected: SelectedImage | null | undefined;
  onChange: (image: SelectedImage | null) => void; disabled: boolean; aspect?: [number, number];
}) {
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const uri = selected === undefined ? mediaUrl(current) : selected?.uri;
  async function choose(source: 'library' | 'camera') {
    if (disabled || picking) return;
    setPicking(true); setError('');
    try { const image = await selectImage(aspect, source); if (mounted.current && image) onChange(image); }
    catch (cause) { if (mounted.current) setError(errorMessage(cause)); }
    finally { if (mounted.current) setPicking(false); }
  }
  return <View style={{ gap: 12 }}>
    <Text style={ui.body}>{label}</Text>
    {!!uri && <Image key={uri} source={{ uri }} accessibilityLabel={label} style={{ width: '100%', height: 180, borderRadius: 16 }} resizeMode="contain" />}
    <Button title={uri ? 'Trocar imagem da galeria' : 'Escolher imagem da galeria'} small variant="secondary" disabled={disabled} loading={picking} onPress={() => void choose('library')} />
    <Button title="Tirar foto" icon="camera" small variant="secondary" disabled={disabled || picking} onPress={() => void choose('camera')} />
    {!!uri && <Button title="Remover imagem" small variant="secondary" disabled={disabled || picking} onPress={() => { onChange(null); setError(''); }} />}
    <Notice text={error} />
    <Text style={ui.muted}>Imagem JPG ou PNG de até 2 MB. Ela será enviada ao salvar.</Text>
  </View>;
}
