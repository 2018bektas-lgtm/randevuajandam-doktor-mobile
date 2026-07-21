import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

type Props = {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  minHeight?: number;
  style?: ViewStyle;
};

type Tool = {
  key: string;
  label: string;
  wrap?: [string, string];
  linePrefix?: string;
  block?: string;
};

const TOOLS: Tool[] = [
  { key: 'b', label: 'B', wrap: ['**', '**'] },
  { key: 'i', label: 'I', wrap: ['_', '_'] },
  { key: 's', label: 'S', wrap: ['~~', '~~'] },
  { key: 'h2', label: 'H2', linePrefix: '## ' },
  { key: 'h3', label: 'H3', linePrefix: '### ' },
  { key: 'ul', label: '•', linePrefix: '- ' },
  { key: 'ol', label: '1.', linePrefix: '1. ' },
  { key: 'q', label: '❝', linePrefix: '> ' },
  { key: 'code', label: '</>', wrap: ['`', '`'] },
  { key: 'link', label: '🔗', wrap: ['[', '](https://)'] },
  { key: 'hr', label: '―', block: '\n---\n' },
  { key: 'p', label: '¶', block: '\n\n' },
];

function previewLines(md: string): { type: string; text: string }[] {
  const lines = (md || '').split('\n');
  return lines.map((line) => {
    if (line.startsWith('### ')) return { type: 'h3', text: line.slice(4) };
    if (line.startsWith('## ')) return { type: 'h2', text: line.slice(3) };
    if (line.startsWith('# ')) return { type: 'h1', text: line.slice(2) };
    if (line.startsWith('> ')) return { type: 'quote', text: line.slice(2) };
    if (line.startsWith('- ') || line.startsWith('* ')) return { type: 'li', text: '• ' + line.slice(2) };
    if (/^\d+\.\s/.test(line)) return { type: 'li', text: line };
    if (line.trim() === '---') return { type: 'hr', text: '' };
    return { type: 'p', text: line };
  });
}

function applyInlineMarks(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\((.+?)\)/g, '$1');
}

/**
 * Kompakt markdown editör — kalın / liste / başlık araç çubuğu + önizleme.
 * Hizmet, blog ve eğitim açıklamalarında kullanılır.
 */
export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder = 'Metin yazın…',
  minHeight = 120,
  style,
}: Props) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [sel, setSel] = useState({ start: 0, end: 0 });

  const preview = useMemo(() => previewLines(value), [value]);

  function applyTool(tool: Tool) {
    const start = sel.start ?? value.length;
    const end = sel.end ?? value.length;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);

    if (tool.block) {
      const needsNl = before.length > 0 && !before.endsWith('\n');
      onChange(before + (needsNl ? '\n' : '') + tool.block + after);
      return;
    }
    if (tool.linePrefix) {
      const lineStart = before.lastIndexOf('\n') + 1;
      onChange(value.slice(0, lineStart) + tool.linePrefix + value.slice(lineStart));
      return;
    }
    if (tool.wrap) {
      const [a, b] = tool.wrap;
      const inner =
        selected || (tool.key === 'link' ? 'metin' : tool.key === 'b' ? 'kalın' : 'metin');
      onChange(before + a + inner + b + after);
    }
  }

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.headerRow}>
        {label ? <Text style={styles.label}>{label}</Text> : <View />}
        <View style={styles.modeRow}>
          <Pressable
            style={[styles.modeBtn, mode === 'edit' && styles.modeBtnOn]}
            onPress={() => setMode('edit')}
          >
            <Text style={[styles.modeText, mode === 'edit' && styles.modeTextOn]}>Düzenle</Text>
          </Pressable>
          <Pressable
            style={[styles.modeBtn, mode === 'preview' && styles.modeBtnOn]}
            onPress={() => setMode('preview')}
          >
            <Text style={[styles.modeText, mode === 'preview' && styles.modeTextOn]}>Önizle</Text>
          </Pressable>
        </View>
      </View>

      {mode === 'edit' ? (
        <View style={styles.editorShell}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.toolsScroll}
            contentContainerStyle={styles.tools}
          >
            {TOOLS.map((t) => (
              <Pressable key={t.key} style={styles.tool} onPress={() => applyTool(t)}>
                <Text
                  style={[
                    styles.toolText,
                    t.key === 'b' && { fontWeight: '900' },
                    t.key === 'i' && { fontStyle: 'italic' },
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <TextInput
            style={[styles.input, { minHeight }]}
            value={value}
            onChangeText={onChange}
            onSelectionChange={(e) => setSel(e.nativeEvent.selection)}
            placeholder={placeholder}
            placeholderTextColor="#95A2B5"
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.hint}>**kalın**  _italik_  ## başlık  - liste  [link](url)</Text>
        </View>
      ) : (
        <View style={[styles.previewBox, { minHeight }]}>
          {(value || '').trim() === '' ? (
            <Text style={styles.previewEmpty}>Önizlenecek metin yok.</Text>
          ) : (
            preview.map((line, i) => {
              if (line.type === 'hr') {
                return <View key={i} style={styles.hr} />;
              }
              const text = applyInlineMarks(line.text);
              return (
                <Text
                  key={i}
                  style={[
                    styles.previewP,
                    line.type === 'h1' && styles.previewH1,
                    line.type === 'h2' && styles.previewH2,
                    line.type === 'h3' && styles.previewH3,
                    line.type === 'quote' && styles.previewQuote,
                    line.type === 'li' && styles.previewLi,
                  ]}
                >
                  {text || ' '}
                </Text>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: { color: '#6D7D8E', fontSize: 11, fontWeight: '600' },
  modeRow: { flexDirection: 'row', gap: 4 },
  modeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#EEF2F7',
  },
  modeBtnOn: { backgroundColor: 'rgba(238,125,49,0.14)' },
  modeText: { color: '#6D7D8E', fontSize: 11, fontWeight: '600' },
  modeTextOn: { color: '#C96A2B' },
  editorShell: {
    borderWidth: 1,
    borderColor: '#E1E6ED',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  toolsScroll: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8EDF3',
    backgroundColor: '#F8FAFC',
  },
  tools: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tool: {
    minWidth: 30,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E6ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolText: { color: '#102133', fontSize: 12, fontWeight: '700' },
  input: {
    color: '#102133',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  hint: {
    color: '#95A2B5',
    fontSize: 10,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  previewBox: {
    borderWidth: 1,
    borderColor: '#E1E6ED',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  previewEmpty: { color: '#95A2B5', fontSize: 13 },
  previewP: { color: '#39495B', fontSize: 13, lineHeight: 19, marginBottom: 4 },
  previewH1: { color: '#102133', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  previewH2: { color: '#102133', fontSize: 16, fontWeight: '700', marginBottom: 5 },
  previewH3: { color: '#102133', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  previewQuote: {
    color: '#6D7D8E',
    fontStyle: 'italic',
    borderLeftWidth: 2,
    borderLeftColor: '#EE7D31',
    paddingLeft: 8,
  },
  previewLi: { color: '#39495B', marginLeft: 4 },
  hr: {
    height: 1,
    backgroundColor: '#E1E6ED',
    marginVertical: 8,
  },
});
