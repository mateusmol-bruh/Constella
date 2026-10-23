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
import { ImageField } from '../components/ImageField';
import { uploadImage, type SelectedImage } from '../services/image.service';
import { Sheet } from '../components/Social';
import { Button, Chip, Header, Notice, ResourceState, Screen } from '../components/ui';
import { useAuth } from '../constexts/AuthContext';
import { useCommunity } from '../constexts/CommunityContext';
import { useResource } from '../hooks/useResource';
import { errorMessage } from '../services/api';
import { emailSchema } from '../utils/validation';
import { usePro } from '../constexts/ProContext';
import { useNotifications } from '../constexts/NotificationsContext';
import { useFeedback } from '../constexts/FeedbackContext';
import { colors, ui } from '../styles/theme';
import type { RootStackParamList } from '../types/navigation';

const schema = z.object({ nome: z.string().trim().min(1, 'Informe seu nome.').max(255, 'Use até 255 caracteres.'), email: emailSchema, apresentacao: z.string().max(500, 'Use até 500 caracteres.') });
export default function PerfilScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const auth = useAuth();
  const pro = usePro();
  const notifications = useNotifications();
  const notify = useFeedback();
  const repo = useCommunity();
  const resource = useResource(repo.profile);
  const profile = resource.data;
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>();
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema), defaultValues: { nome: '', email: '', apresentacao: '' },
  });
  useEffect(() => { if (resource.data) reset({ nome: resource.data.nome, email: resource.data.email, apresentacao: resource.data.apresentacao ?? '' }); }, [resource.data, reset]);
  const save = handleSubmit(async values => {
    if (isSubmitting) return;
    setError('');
    try {
      let foto = selectedImage === undefined ? resource.data?.foto ?? null : null;
      if (selectedImage) {
        foto = await uploadImage(selectedImage);
        setSelectedImage({ ...selectedImage, uploadedPath: foto });
      }
      const saved = await repo.editProfile({ ...values, foto });
      resource.setData(saved); setEditing(false); setSuccess('Perfil atualizado.');
      notify('Perfil atualizado.');
    } catch (cause) { setError(errorMessage(cause)); }
  });
  return <Screen>
    <Brand width={110} variant="compact" /><Header title="Seu perfil" />
    <ResourceState {...resource} onRetry={() => void resource.reload()} /><Notice text={auth.notice} />
    {success ? <Text accessibilityLiveRegion="polite" style={{ color: colors.success }}>{success}</Text> : null}
    {resource.data && <>
      <View style={ui.card}>
        <View style={[ui.row, { alignItems: 'flex-start' }]}><Avatar nome={resource.data.nome} foto={resource.data.foto} size={82} /><View style={{ flex: 1, gap: 4 }}><Text style={[ui.body, { fontWeight: '700', fontStyle: 'italic', fontSize: 19 }]}>{resource.data.nome}</Text><Text style={ui.muted}>{resource.data.email}</Text><Text style={ui.body}>{resource.data.apresentacao || 'Sua apresentação ainda não foi preenchida.'}</Text></View></View>
        <Button title="Editar perfil" variant="secondary" small onPress={() => { if (!profile) return; setError(''); setSuccess(''); setSelectedImage(undefined); reset({ nome: profile.nome, email: profile.email, apresentacao: profile.apresentacao ?? '' }); setEditing(true); }} />
      </View>
      <View style={ui.section}><Text style={ui.muted}>Seus gostos</Text><View style={[ui.card, ui.wrap]}>{resource.data.interesses.map(item => <Chip key={item.id} title={item.nome} />)}{!resource.data.interesses.length && <Text style={ui.body}>Você ainda não escolheu seus interesses.</Text>}</View>
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Interesses', { editar: true })} style={{ paddingVertical: 12 }}><Text style={ui.link}>Editar interesses</Text></Pressable>
      </View>
    </>}
    <Button title={pro.access ? "Gerenciar assinatura" : "Conhecer o Constella Pro"} variant="secondary" onPress={() => navigation.navigate('ConstellaPro')} />
    <View style={ui.card}><Text style={ui.subtitle}>Notificações</Text><Text style={ui.muted}>{notifications.enabled ? 'Avisos de conversas, fóruns e conexões estão ativados neste aparelho.' : 'Receba avisos de novas mensagens e conexões, mesmo fora do aplicativo.'}</Text><Notice text={notifications.error} /><Button title={notifications.enabled ? 'Verificar permissão de notificações' : 'Ativar notificações'} small variant="secondary" loading={notifications.busy} onPress={() => void notifications.enable()} /></View>
    <View style={{ flex: 1, minHeight: 24 }} /><Button title="Sair da conta" variant="secondary" icon="logout" small onPress={() => void auth.logout()} />
    <Sheet visible={editing} title="Editar perfil" onClose={() => { if (!isSubmitting) setEditing(false); }}>
      <FormField control={control} name="nome" label="Nome" icon="profile" maxLength={255} />
      <FormField control={control} name="email" label="E-mail" icon="mail" keyboardType="email-address" autoCapitalize="none" />
      <FormField control={control} name="apresentacao" label="Sua apresentação (opcional)" multiline maxLength={500} />
      {editing && <ImageField label="Foto do perfil" current={resource.data?.foto} selected={selectedImage} onChange={setSelectedImage} disabled={isSubmitting} />}
      <Notice text={error} /><Button title="Salvar alterações" loading={isSubmitting} onPress={() => void save()} />
    </Sheet>
  </Screen>;
}
