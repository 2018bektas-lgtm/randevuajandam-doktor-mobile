import { useMemo } from 'react';
import { TextInput, View } from 'react-native';
import { moduleStyles as s } from '../ui/styles';
import { SelectField } from './SelectField';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

const TIME_SLOTS = Array.from({ length: 28 }, (_, i) => {
  // 07:00 .. 20:30 step 30
  const total = 7 * 60 + i * 30;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${pad(h)}:${pad(m)}`;
});

type DateFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

export function DateField({ label, value, onChange, placeholder = 'YYYY-AA-GG' }: DateFieldProps) {
  const presets = useMemo(() => {
    const today = new Date();
    const opts = [
      { label: 'Bugün', value: formatDateKey(today) },
      { label: 'Yarın', value: formatDateKey(addDays(today, 1)) },
      { label: '+3 gün', value: formatDateKey(addDays(today, 3)) },
      { label: '+1 hafta', value: formatDateKey(addDays(today, 7)) },
      { label: 'Ay başı', value: formatDateKey(new Date(today.getFullYear(), today.getMonth(), 1)) },
      { label: 'Ay sonu', value: formatDateKey(new Date(today.getFullYear(), today.getMonth() + 1, 0)) },
    ];
    // next 14 days as selectable options
    for (let i = 0; i < 14; i++) {
      const d = addDays(today, i);
      const key = formatDateKey(d);
      if (!opts.some((o) => o.value === key)) {
        opts.push({
          label: d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' }),
          value: key,
        });
      }
    }
    return opts;
  }, []);

  return (
    <View>
      <SelectField
        label={label}
        placeholder={placeholder}
        options={presets}
        value={value || null}
        onChange={onChange}
        searchable
      />
      <TextInput
        style={[s.input, { marginTop: 8 }]}
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        placeholder={`Manuel: ${placeholder}`}
        placeholderTextColor="#6B7F93"
      />
    </View>
  );
}

type TimeFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  slots?: string[];
};

export function TimeField({
  label,
  value,
  onChange,
  placeholder = 'SS:DD',
  slots,
}: TimeFieldProps) {
  const options = useMemo(() => {
    const list = slots && slots.length > 0 ? slots : TIME_SLOTS;
    return list.map((t) => ({ label: t, value: t }));
  }, [slots]);

  return (
    <View>
      <SelectField
        label={label}
        placeholder={placeholder}
        options={options}
        value={value || null}
        onChange={onChange}
        searchable={options.length > 8}
      />
      <TextInput
        style={[s.input, { marginTop: 8 }]}
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        placeholder={`Manuel: ${placeholder}`}
        placeholderTextColor="#6B7F93"
      />
    </View>
  );
}
