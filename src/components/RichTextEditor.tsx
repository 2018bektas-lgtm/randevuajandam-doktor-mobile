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
  /** Wrap selected text, or insert if empty */
  wrap?: [string, string];
  /** Line-prefix insert */
  linePrefix?: string;
  /** Block insert */
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

/** Lightweight markdown preview (no HTML). */
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
 * Richer markdown editor: wrap helpers, line tools, live preview toggle.
 */
export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder = 'Metin yazın…',
  minHeight = 140,
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
      // Insert at line start of caret
      const lineStart = before.lastIndexOf('\n') + 1;
      const newVal = value.slice(0, lineStart) + tool.linePrefix + value.slice(lineStart);
      onChange(newVal);
      return;
    }
    if (tool.wrap) {
      const [a, b] = tool.wrap;
      const inner = selected || (tool.key === 'link' ? 'metin' : tool.key === 'b' ? 'kalın' : 'metin');
      onChange(before + a + inner + b + after);
      return;
    }
  }

  return (
    <View style={style}>
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
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolsScroll}>
            <View style={styles.tools}>
              {TOOLS.map((t) => (
                <Pressable key={t.key} style={styles.tool} onPress={() => applyTool(t)}>
                  <Text style={[styles.toolText, t.key === 'b' && { fontWeight: '900' }, t.key === 'i' && { fontStyle: 'italic' }]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <TextInput
            style={[styles.input, { minHeight }]}
            value={value}
            onChangeText={onChange}
            onSelectionChange={(e) => setSel(e.nativeEvent.selection)}
            placeholder={placeholder}
            placeholderTextColor="#6B7F93"
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.hint}>Markdown: **kalın** _italik_ ## başlık - liste [link](url)</Text>
        </>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: { color: '#94A7B9', fontSize: 12, fontWeight: '700' },
  modeRow: { flexDirection: 'row', gap: 6 },
  modeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(148,167,185,0.12)',
  },
  modeBtnOn: { backgroundColor: 'rgba(245,138,69,0.2)' },
  modeText: { color: '#94A7B9', fontSize: 11, fontWeight: '700' },
  modeTextOn: { color: '#F3A26B' },
  toolsScroll: { marginBottom: 8 },
  tools: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  tool: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(245,138,69,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245,138,69,0.28)',
  },
  toolText: { color: '#F3A26B', fontSize: 12, fontWeight: '800' },
  input: {
    borderWidth: 1,
    borderColor: '#2B4055',
    backgroundColor: '#0F2133',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  hint: { color: '#6B7F93', fontSize: 11, marginTop: 6 },
  previewBox: {
    borderWidth: 1,
    borderColor: '#2B4055',
    backgroundColor: '#0F2133',
    borderRadius: 12,
    padding: 14,
  },
  previewEmpty: { color: '#6B7F93', fontSize: 13 },
  previewP: { color: '#B7C4D3', fontSize: 14, lineHeight: 21, marginBottom: 4 },
  previewH1: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginTop: 6, marginBottom: 8 },
  previewH2: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', marginTop: 6, marginBottom: 6 },
  previewH3: { color: '#E8EEF5', fontSize: 15, fontWeight: '800', marginTop: 4, marginBottom: 4 },
  previewQuote: {
    color: '#94A7B9',
    fontStyle: 'italic',
    borderLeftWidth: 3,
    borderLeftColor: '#F58A45',
    paddingLeft: 10,
  },
  previewLi: { color: '#B7C4D3', paddingLeft: 4 },
  hr: {
    height: 1,
    backgroundColor: '#2B4055',
    marginVertical: 10,
  },
});
