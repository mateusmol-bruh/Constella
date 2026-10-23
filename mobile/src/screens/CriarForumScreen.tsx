import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CoverArt } from '../components/Artwork';
import { FormField } from '../components/FormField';
import { Button, Header, Notice, Screen } from '../components/ui';
import { useCommunity } from '../constexts/CommunityContext';
import { errorMessage } from '../services/api';
import { forumSchema } from '../utils/validation';
import { ui } from '../styles/theme';
import type { ScreenProps } from '../types/navigation';

export default function CriarForumScreen({ navigation }: ScreenProps<'CriarForum'>) {
  const repo = useCommunity();
  const [error, setError] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<z.infer<typeof forumSchema>>({
    resolver: zodResolver(forumSchema), defaultValues: { titulo: '', descricao: '', capa: '' },
  });
  const capa = useWatch({ control, name: 'capa' });
  React.useEffect(() => setImageFailed(false), [capa]);
  const create = handleSubmit(async values => {
    if (isSubmitting) return;
    setError('');
    try {
      const forum = await repo.createForum({ ...values, capa: values.capa || null });
      navigation.replace('ChatForum', { id: forum.id_for, nome: forum.titulo });
    } catch (cause) { setError(errorMessage(cause)); }
  });
  return <Screen centered bottomSafe>
    <Header title="Novo fórum" onBack={() => navigation.goBack()} />
    <FormField control={control} name="titulo" label="Título" light maxLength={255} />
    <View style={{ padding: 12 }}>
      {/^https?:\/\//i.test(capa) && !imageFailed ? <Image source={{ uri: capa }} accessibilityLabel="Prévia da capa do fórum" style={{ height: 220, borderRadius: 20, width: '100%' }} onError={() => setImageFailed(true)} /> : <CoverArt kind={2} large />}
    </View>
    <FormField control={control} name="capa" label="URL da capa (opcional)" light keyboardType="url" autoCapitalize="none" maxLength={255} />
    <FormField control={control} name="descricao" label="Descrição (opcional)" light multiline maxLength={255} />
    <Notice text={error || (imageFailed ? 'Não foi possível carregar essa imagem. Confira a URL da capa.' : '')} />
    <View style={ui.row}><View style={{ flex: 1 }}><Button title="Criar Fórum" variant="secondary" loading={isSubmitting} onPress={() => void create()} /></View><Button title="Limpar" variant="secondary" small disabled={isSubmitting} onPress={() => { reset(); setError(''); }} /></View>
  </Screen>;
}
