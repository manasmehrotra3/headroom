import { useState } from 'react';

import { formatDuration, parseDuration } from '@/domain/units';

import { Field } from './components';

/** Number input that keeps exactly what you type and reports a number, or null when blank. */
export function NumberField({
  label,
  value,
  onChange,
  hint,
  placeholder,
  decimal = false,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  hint?: string;
  placeholder?: string;
  decimal?: boolean;
}) {
  const [text, setText] = useState(value === null ? '' : String(value));
  return (
    <Field
      label={label}
      hint={hint}
      placeholder={placeholder}
      value={text}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      onChangeText={(next) => {
        setText(next);
        const parsed = Number(next.replace(',', '.'));
        onChange(next.trim() === '' || !Number.isFinite(parsed) ? null : parsed);
      }}
    />
  );
}

/** "mm:ss" input, e.g. a 5K time or a pace. Reports seconds, or null when blank or invalid. */
export function DurationField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number | null;
  onChange: (seconds: number | null) => void;
  hint?: string;
}) {
  const [text, setText] = useState(value === null ? '' : formatDuration(value));
  const invalid = text.trim() !== '' && parseDuration(text) === null;
  return (
    <Field
      label={label}
      placeholder="mm:ss"
      hint={invalid ? 'Use mm:ss, for example 26:30' : hint}
      value={text}
      onChangeText={(next) => {
        setText(next);
        onChange(next.trim() === '' ? null : parseDuration(next));
      }}
    />
  );
}
