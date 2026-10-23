import React from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { type TextInputProps } from 'react-native';
import { Field } from './ui';
import type { IconName } from './Icon';

export function FormField<T extends FieldValues>({ control, name, label, icon, password, light, ...props }: TextInputProps & {
  control: Control<T>; name: FieldPath<T>; label: string; icon?: IconName; password?: boolean; light?: boolean;
}) {
  return <Controller control={control} name={name} render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => <Field {...props} label={label} icon={icon} password={password} light={light} value={String(value ?? '')} onChangeText={onChange} onBlur={onBlur} error={error?.message} />} />;
}
