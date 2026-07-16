import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { moduleStyles as s } from '../ui/styles';

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

const TIME_SLOTS = Array.from({ length: 22 }, (_, i) => {
  const total = 8 * 60 + i * 30; // 08:00 .. 18:30
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
  const [open, setOpen] = useState(false);
  const presets = useMemo(() => {
    const today = new Date();
    return [
      { label: 'Bugün', value: formatDateKey(today) },
      { label: 'Yarın', value: formatDateKey(addDays(today, 1)) },
      { label: '+3 gün', value: formatDateKey(addDays(today, 3)) },
      { label: '+1 hafta', value: formatDateKey(addDays(today, 7)) },
      { label: 'Ay başı', value: formatDateKey(new Date(today.getFullYear(), today.getMonth(), 1)) },
      { label: 'Ay sonu', value: formatDateKey(new Date(today.getFullYear(), today.getMonth() + 1, 0)) },
    ];
  }, []);

  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <Pressable style={s.input} onPress={() => setOpen(true)}>
        <Text style={{ color: value ? '#FFFFFF' : '#6B7F93', fontSize: 15 }}>{value || placeholder}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { maxHeight: '70%' }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)}>
                <Text style={s.modalClose}>Kapat</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled">
              <View style={s.segmentRow}>
                {presets.map((p) => (
                  <Pressable
                    key={p.label}
                    style={[s.segmentButton, value === p.value && s.segmentButtonActive]}
                    onPress={() => {
                      onChange(p.value);
                      setOpen(false);
                    }}
                  >
                    <Text style={[s.segmentButtonText, value === p.value && s.segmentButtonTextActive]}>{p.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={s.label}>Manuel (YYYY-AA-GG)</Text>
              <TextInput
                style={s.input}
                value={value}
                onChangeText={onChange}
                autoCapitalize="none"
                placeholder={placeholder}
                placeholderTextColor="#6B7F93"
              />
              <Pressable
                style={[s.primaryButton, { marginTop: 14 }]}
                onPress={() => setOpen(false)}
              >
                <Text style={s.primaryButtonText}>Tamam</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type TimeFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

export function TimeField({ label, value, onChange, placeholder = 'SS:DD' }: TimeFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <Pressable style={s.input} onPress={() => setOpen(true)}>
        <Text style={{ color: value ? '#FFFFFF' : '#6B7F93', fontSize: 15 }}>{value || placeholder}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { maxHeight: '75%' }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)}>
                <Text style={s.modalClose}>Kapat</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled">
              <View style={s.segmentRow}>
                {TIME_SLOTS.map((t) => (
                  <Pressable
                    key={t}
                    style={[s.segmentButton, value === t && s.segmentButtonActive]}
                    onPress={() => {
                      onChange(t);
                      setOpen(false);
                    }}
                  >
                    <Text style={[s.segmentButtonText, value === t && s.segmentButtonTextActive]}>{t}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={s.label}>Manuel (SS:DD)</Text>
              <TextInput
                style={s.input}
                value={value}
                onChangeText={onChange}
                autoCapitalize="none"
                placeholder={placeholder}
                placeholderTextColor="#6B7F93"
              />
              <Pressable style={[s.primaryButton, { marginTop: 14 }]} onPress={() => setOpen(false)}>
                <Text style={s.primaryButtonText}>Tamam</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
