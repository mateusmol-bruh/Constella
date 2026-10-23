import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Avatar } from '../components/Artwork';
import { Brand } from '../components/Brand';
import { FormField } from '../components/FormField';
import { Sheet } from '../components/Social';
import { Button, Chip, Header, Notice, ResourceState, Screen } from '../components/ui';
import { useAuth } from '../constexts/AuthContext';
import { useCommunity } from '../constexts/CommunityContext';
import { useResource } from '../hooks/useResource';
import { errorMessage } from '../services/api';
import { emailSchema } from '../utils/validation';
import { colors, ui } from '../styles/theme';
import type { RootStackParamList } from '../types/navigation';

const schema = z.object({ nome: z.string().trim().min(1, 'Informe seu nome.').max(255, 'Use até 255 caracteres.'), email: emailSchema, apresentacao: z.string().max(500, 'Use até 500 caracteres.'), foto: z.string().trim().max(500, 'Use até 500 caracteres.').refine(value => !value || /^https?:\/\/[^\s]+$/i.test(value), 'Informe uma URL http ou https.') });
export default function PerfilScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const auth = useAuth();
  const repo = useCommunity();
  const resource = useResource(repo.profile);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema), defaultValues: { nome: '', email: '', apresentacao: '', foto: '' },
  });
  useEffect(() => { if (resource.data) reset({ nome: resource.data.nome, email: resource.data.email, apresentacao: resource.data.apresentacao ?? '', foto: resource.data.foto ?? '' }); }, [resource.data, reset]);
  const save = handleSubmit(async values => {
    if (isSubmitting) return;
    setError('');
    try {
      const saved = await repo.editProfile({ ...values, foto: values.foto || null });
      resource.setData(saved); setEditing(false); setSuccess('Perfil atualizado.');
    } catch (cause) { setError(errorMessage(cause)); }
  });
  return <Screen>
    <Brand width={110} variant="compact" /><Header title="Seu perfil" />
    <ResourceState {...resource} onRetry={() => void resource.reload()} /><Notice text={auth.notice} />
    {success ? <Text accessibilityLiveRegion="polite" style={{ color: colors.success }}>{success}</Text> : null}
    {resource.data && <>
      <View style={ui.card}>
        <View style={[ui.row, { alignItems: 'flex-start' }]}><Avatar nome={resource.data.nome} foto={resource.data.foto} size={82} /><View style={{ flex: 1, gap: 4 }}><Text style={[ui.body, { fontWeight: '700', fontStyle: 'italic', fontSize: 19 }]}>{resource.data.nome}</Text><Text style={ui.muted}>{resource.data.email}</Text><Text style={ui.body}>{resource.data.apresentacao || 'Sua apresentação ainda não foi preenchida.'}</Text></View></View>
        <Button title="Editar perfil" variant="secondary" small onPress={() => { setError(''); setEditing(true); }} />
      </View>
      <View style={ui.section}><Text style={ui.muted}>Seus gostos</Text><View style={[ui.card, ui.wrap]}>{resource.data.interesses.map(item => <Chip key={item.id} title={item.nome} />)}{!resource.data.interesses.length && <Text style={ui.body}>Você ainda não escolheu seus interesses.</Text>}</View>
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Interesses', { editar: true })} style={{ paddingVertical: 12 }}><Text style={ui.link}>Editar interesses</Text></Pressable>
      </View>
    </>}
    <Button title="Conhecer o Constella Pro" variant="secondary" onPress={() => navigation.navigate('ConstellaPro')} />
    <View style={{ flex: 1, minHeight: 24 }} /><Button title="Sair da conta" variant="secondary" icon="logout" small onPress={() => void auth.logout()} />
    <Sheet visible={editing} title="Editar perfil" onClose={() => { if (!isSubmitting) setEditing(false); }}>
      <FormField control={control} name="nome" label="Nome" icon="profile" maxLength={255} />
      <FormField control={control} name="email" label="E-mail" icon="mail" keyboardType="email-address" autoCapitalize="none" />
      <FormField control={control} name="apresentacao" label="Sua apresentação (opcional)" multiline maxLength={500} />
      <FormField control={control} name="foto" label="URL da foto (opcional)" keyboardType="url" autoCapitalize="none" maxLength={500} />
      <Notice text={error} /><Button title="Salvar alterações" loading={isSubmitting} onPress={() => void save()} />
    </Sheet>
  </Screen>;
}
