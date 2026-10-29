import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from './Artwork';
import { ResourceState } from './ui';
import { useResource } from '../hooks/useResource';
import { useCommunity } from '../constexts/CommunityContext';
import { colors, ui } from '../styles/theme';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

export function UserSearch({ query, onSelect }: { query: string; onSelect: (id: string) => void }) {
  const repo = useCommunity();
  const search = useDebouncedValue(query.trim());
  const resource = useResource(() => repo.people(search), !!search, 0, search);
  return <View style={{ gap: 8 }}>
    <ResourceState {...resource} dark empty={!resource.data?.length && 'Nenhuma usuária encontrada.'} onRetry={() => void resource.reload()} />
    {!resource.error && resource.data?.map(person => <Pressable key={person.id} accessibilityRole="button" accessibilityLabel={'Conhecer ' + person.nome} onPress={() => onSelect(person.id)} style={[ui.row, { backgroundColor: colors.lavender, borderRadius: 14, padding: 12 }]}>
      <Avatar nome={person.nome} foto={person.foto} size={42} /><Text style={ui.dark}>{person.nome}</Text>
    </Pressable>)}
  </View>;
}
