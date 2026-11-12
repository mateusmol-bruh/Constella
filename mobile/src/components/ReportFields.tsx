import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { Chip } from './ui';
import { ui } from '../styles/theme';
const reasons = ['Assédio ou ofensa', 'Discurso de ódio', 'Spam', 'Outro'];
export function ReportFields({
  reason,
  onReason,
  description,
  onDescription,
  busy = false,
  dark = false,
}: {
  reason: string;
  onReason: (value: string) => void;
  description: string;
  onDescription: (value: string) => void;
  busy?: boolean;
  dark?: boolean;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={dark ? ui.dark : ui.body}>Motivo da denúncia</Text>
      <View style={ui.wrap}>
        {reasons.map((value) => (
          <Chip
            key={value}
            title={value}
            selected={reason === value}
            onPress={() => {
              if (!busy) onReason(value);
            }}
          />
        ))}
      </View>
      <TextInput
        accessibilityLabel="Motivo da denúncia"
        placeholder="Informe o motivo"
        placeholderTextColor="#9885AC"
        value={reason}
        onChangeText={onReason}
        editable={!busy}
        maxLength={255}
        style={[
          dark ? ui.dark : ui.body,
          { borderWidth: 1, borderColor: '#C0A7D4', borderRadius: 10, padding: 12 },
        ]}
      />
      <TextInput
        accessibilityLabel="Descrição da denúncia (opcional)"
        placeholder="Descrição opcional"
        placeholderTextColor="#9885AC"
        value={description}
        onChangeText={onDescription}
        multiline
        editable={!busy}
        maxLength={2000}
        style={[
          dark ? ui.dark : ui.body,
          {
            minHeight: 80,
            borderWidth: 1,
            borderColor: '#C0A7D4',
            borderRadius: 10,
            padding: 12,
            textAlignVertical: 'top',
          },
        ]}
      />
    </View>
  );
}
