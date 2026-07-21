import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

export type SelectOption<T extends string | number = string | number> = {
  label: string;
  value: T;
  subtitle?: string;
  disabled?: boolean;
};

type SingleProps<T extends string | number> = {
  label?: string;
  placeholder?: string;
  options: SelectOption<T>[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  multiple?: false;
  searchable?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  /** Allow clearing selection */
  clearable?: boolean;
};

type MultiProps<T extends string | number> = {
  label?: string;
  placeholder?: string;
  options: SelectOption<T>[];
  value: T[];
  onChange: (value: T[]) => void;
  multiple: true;
  searchable?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  clearable?: boolean;
};

export type SelectFieldProps<T extends string | number = string | number> =
  | SingleProps<T>
  | MultiProps<T>;

/**
 * Closed select control — opens a modal list (single or multi).
 * Replaces long open chip/option lists that clutter forms.
 */
export function SelectField<T extends string | number = string | number>(props: SelectFieldProps<T>) {
  const {
    label,
    placeholder = 'Seçin…',
    options,
    searchable: searchableProp,
    disabled,
    style,
    clearable,
  } = props;
  const multiple = props.multiple === true;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const searchable = searchableProp ?? options.length > 8;

  const selectedLabel = useMemo(() => {
    if (multiple) {
      const vals = props.value as T[];
      if (!vals?.length) return null;
      const labels = options
        .filter((o) => vals.includes(o.value))
        .map((o) => o.label);
      if (labels.length === 0) return `${vals.length} seçili`;
      if (labels.length <= 2) return labels.join(', ');
      return `${labels[0]}, ${labels[1]} +${labels.length - 2}`;
    }
    const v = props.value as T | null | undefined;
    if (v == null || v === '') return null;
    return options.find((o) => o.value === v)?.label ?? String(v);
  }, [multiple, options, props.value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLocaleLowerCase('tr-TR').includes(q)
        || (o.subtitle && o.subtitle.toLocaleLowerCase('tr-TR').includes(q))
        || String(o.value).toLocaleLowerCase('tr-TR').includes(q),
    );
  }, [options, query]);

  function isSelected(v: T): boolean {
    if (multiple) {
      return (props.value as T[]).includes(v);
    }
    return props.value === v;
  }

  function toggle(v: T) {
    if (multiple) {
      const cur = props.value as T[];
      const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      (props.onChange as (value: T[]) => void)(next);
      return;
    }
    (props.onChange as (value: T) => void)(v);
    setOpen(false);
    setQuery('');
  }

  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        disabled={disabled}
        onPress={() => {
          if (disabled) return;
          setQuery('');
          setOpen(true);
        }}
      >
        <Text
          style={[styles.triggerText, !selectedLabel && styles.triggerPlaceholder]}
          numberOfLines={1}
        >
          {selectedLabel || placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={1}>
                {label || 'Seçim'}
              </Text>
              <View style={styles.headerActions}>
                {clearable && selectedLabel ? (
                  <Pressable
                    onPress={() => {
                      if (multiple) {
                        (props.onChange as (value: T[]) => void)([]);
                      } else {
                        // no-op for single without null support — leave value
                      }
                      if (multiple) setOpen(false);
                    }}
                    style={{ marginRight: 14 }}
                  >
                    <Text style={styles.clear}>Temizle</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => {
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <Text style={styles.done}>{multiple ? 'Tamam' : 'Kapat'}</Text>
                </Pressable>
              </View>
            </View>

            {searchable ? (
              <TextInput
                style={styles.search}
                value={query}
                onChangeText={setQuery}
                placeholder="Ara…"
                placeholderTextColor="#6B7F93"
                autoCapitalize="none"
              />
            ) : null}

            {multiple ? (
              <Text style={styles.multiHint}>
                {(props.value as T[]).length} seçili · birden fazla seçebilirsiniz
              </Text>
            ) : null}

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.list}
            >
              {filtered.length === 0 ? (
                <Text style={styles.empty}>Sonuç yok</Text>
              ) : (
                filtered.map((opt) => {
                  const on = isSelected(opt.value);
                  return (
                    <Pressable
                      key={String(opt.value)}
                      style={[
                        styles.option,
                        on && styles.optionOn,
                        opt.disabled && styles.optionDisabled,
                      ]}
                      disabled={opt.disabled}
                      onPress={() => toggle(opt.value)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.optionLabel, on && styles.optionLabelOn]}>
                          {opt.label}
                        </Text>
                        {opt.subtitle ? (
                          <Text style={styles.optionSub}>{opt.subtitle}</Text>
                        ) : null}
                      </View>
                      <Text style={[styles.check, on && styles.checkOn]}>
                        {multiple ? (on ? '☑' : '☐') : on ? '✓' : ''}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: '#8A98A8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  trigger: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E6ED',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  triggerDisabled: { opacity: 0.5 },
  triggerText: {
    color: '#102133',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  triggerPlaceholder: { color: '#6B7F93', fontWeight: '500' },
  chevron: { color: '#C96A2B', fontSize: 16, fontWeight: '700' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 33, 51, 0.42)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#E1E6ED',
    maxHeight: '82%',
    minHeight: '42%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF3',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  title: {
    color: '#102133',
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
    marginRight: 12,
  },
  done: { color: '#C96A2B', fontSize: 14, fontWeight: '800' },
  clear: { color: '#7A8B9C', fontSize: 13, fontWeight: '700' },
  search: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E6ED',
    backgroundColor: '#FFFFFF',
    color: '#102133',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  multiHint: {
    color: '#8093A7',
    fontSize: 12,
    marginHorizontal: 18,
    marginTop: 10,
  },
  list: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 28,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E6ED',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginTop: 8,
  },
  optionOn: {
    borderColor: 'rgba(245,138,69,0.55)',
    backgroundColor: 'rgba(245,138,69,0.12)',
  },
  optionDisabled: { opacity: 0.4 },
  optionLabel: { color: '#E8F0F7', fontSize: 14, fontWeight: '700' },
  optionLabelOn: { color: '#102133' },
  optionSub: { color: '#7A8B9C', fontSize: 12, marginTop: 3 },
  check: { color: '#5A7085', fontSize: 16, fontWeight: '700', minWidth: 22, textAlign: 'right' },
  checkOn: { color: '#C96A2B' },
  empty: {
    color: '#7A8B9C',
    textAlign: 'center',
    marginTop: 28,
    fontSize: 14,
  },
});
