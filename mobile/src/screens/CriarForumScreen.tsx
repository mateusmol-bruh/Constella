import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ImageField } from '../components/ImageField';
import { uploadImage, type SelectedImage } from '../services/image.service';
import { FormField } from '../components/FormField';
import { Button, Header, Notice, ResourceState, Screen } from '../components/ui';
import { useResource } from '../hooks/useResource';
import { useFeedback } from '../constexts/FeedbackContext';
import { socialService } from '../services/social.service';
import { useCommunity } from '../constexts/CommunityContext';
import { errorMessage } from '../services/api';
import { forumSchema } from '../utils/validation';
import { ui } from '../styles/theme';
import type { ScreenProps } from '../types/navigation';
import { usePro } from '../constexts/ProContext';
import { isAxiosError } from 'axios';

export default function CriarForumScreen(props: ScreenProps<'CriarForum'>) {
  return <ForumForm key={props.route.params?.id ?? props.route.key} {...props} />;
}
function ForumForm({ navigation, route }: ScreenProps<'CriarForum'>) {
  const repo = useCommunity();
  const notify = useFeedback();
  const pro = usePro();
  const editingId = route.params?.id;
  const existing = useResource(() => repo.forum(editingId ?? ''), !!editingId);
  const limits = useResource(socialService.forumLimits, !editingId, 0, String(pro.access));
  const [limitReached, setLimitReached] = useState(false);
  const blocked = !editingId && !pro.access && (limitReached || limits.data?.pode_criar === false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>();
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<z.infer<typeof forumSchema>>({
    resolver: zodResolver(forumSchema), defaultValues: { titulo: '', descricao: '', capa: '' },
  });
  useEffect(() => {
    if (existing.data) reset({ titulo: existing.data.titulo, descricao: existing.data.descricao ?? '', capa: '' });
  }, [existing.data, reset]);
  const create = handleSubmit(async values => {
    if (isSubmitting || blocked) return;
    setError('');
    try {
      let capa: string | null = selectedImage === undefined ? existing.data?.capa ?? null : null;
      if (selectedImage) {
        capa = await uploadImage(selectedImage);
        setSelectedImage({ ...selectedImage, uploadedPath: capa });
      }
      const forum = editingId ? await socialService.editForum(editingId, { ...values, capa }) : await repo.createForum({ ...values, capa });
      notify(editingId ? 'Fórum atualizado.' : 'Fórum criado.');
      if (editingId) navigation.goBack();
      else navigation.replace('ChatForum', { id: forum.id_for, nome: forum.titulo });
    } catch (cause) {
      setError(errorMessage(cause));
      if (isAxiosError<{ codigo?: string }>(cause) && cause.response?.data.codigo === 'LIMITE_FORUNS_GRATUITO') {
        setLimitReached(true); notify('Você atingiu o limite de fóruns da conta gratuita.', 'warning');
      } else notify('Não foi possível salvar o fórum. Tente novamente.', 'error');
    }
  });
  return <Screen centered bottomSafe>
    <Header title={editingId ? 'Editar fórum' : 'Novo fórum'} onBack={() => navigation.goBack()} />
    {editingId && <ResourceState {...existing} onRetry={() => void existing.reload()} />}
    {!editingId && <ResourceState {...limits} onRetry={() => void limits.reload()} />}
    {blocked && <View style={ui.card}><Text style={ui.subtitle}>Seu espaço já está criado</Text><Text style={ui.body}>A conta gratuita permite criar um fórum. Você pode continuar participando de outros ou conhecer o PRO para criar mais.</Text><Button title="Conhecer o PRO" small variant="secondary" onPress={() => navigation.navigate('ConstellaPro')} /></View>}
    <FormField control={control} name="titulo" label="Título" light maxLength={255} />
    <ImageField label="Capa do fórum (opcional)" current={existing.data?.capa} selected={selectedImage} onChange={setSelectedImage} disabled={isSubmitting || (!!editingId && existing.loading)} aspect={[4, 3]} />
    <FormField control={control} name="descricao" label="Descrição (opcional)" light multiline maxLength={255} />
    <Notice text={error} />
    <View style={[ui.row, { flexWrap: 'wrap' }]}><View style={{ flex: 1, minWidth: 150 }}><Button title={editingId ? 'Salvar fórum' : 'Criar fórum'} variant="secondary" loading={isSubmitting} disabled={blocked || (!editingId && (limits.loading || !!limits.error)) || (!!editingId && (existing.loading || !!existing.error || !existing.data))} onPress={() => void create()} /></View>{!editingId && <Button title="Limpar" variant="secondary" small disabled={isSubmitting} onPress={() => { reset(); setSelectedImage(undefined); setError(''); }} />}</View>
  </Screen>;
}
