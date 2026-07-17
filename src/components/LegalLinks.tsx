import { Alert, Linking, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { KVKK_URL, PRIVACY_URL, TERMS_URL } from '../config/store';

export async function openExternalUrl(url: string, title = 'Bağlantı'): Promise<void> {
  const target = (url || '').trim();
  if (!target) {
    Alert.alert(title, 'Bağlantı adresi tanımlı değil.');
    return;
  }
  const withScheme = /^https?:\/\//i.test(target) ? target : `https://${target}`;
  try {
    const can = await Linking.canOpenURL(withScheme);
    if (!can) {
      Alert.alert(title, `Bu bağlantı açılamadı:\n${withScheme}`);
      return;
    }
    await Linking.openURL(withScheme);
  } catch (e) {
    Alert.alert(title, e instanceof Error ? e.message : `Açılamadı:\n${withScheme}`);
  }
}

type Props = {
  /** dark = onboarding (açık metin), light = login (koyu zemin üstü / form altı) */
  tone?: 'dark' | 'light';
  showKvkk?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Gizlilik / kullanım koşulları — her zaman tıklanabilir (hitSlop + net stil).
 */
export function LegalLinks({ tone = 'light', showKvkk = false, style }: Props) {
  const linkColor = tone === 'dark' ? '#8EB6F0' : '#1A5FA8';
  const muted = tone === 'dark' ? '#6B7F93' : '#7F8C9B';

  return (
    <View style={[styles.wrap, style]} pointerEvents="box-none">
      <View style={styles.row} pointerEvents="auto">
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Gizlilik politikası"
          hitSlop={14}
          onPress={() => void openExternalUrl(PRIVACY_URL, 'Gizlilik')}
          style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
        >
          <Text style={[styles.link, { color: linkColor }]}>Gizlilik</Text>
        </Pressable>
        <Text style={[styles.dot, { color: muted }]}>·</Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Kullanım koşulları"
          hitSlop={14}
          onPress={() => void openExternalUrl(TERMS_URL, 'Kullanım koşulları')}
          style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
        >
          <Text style={[styles.link, { color: linkColor }]}>Kullanım koşulları</Text>
        </Pressable>
        {showKvkk ? (
          <>
            <Text style={[styles.dot, { color: muted }]}>·</Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="KVKK aydınlatma metni"
              hitSlop={14}
              onPress={() => void openExternalUrl(KVKK_URL, 'KVKK')}
              style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
            >
              <Text style={[styles.link, { color: linkColor }]}>KVKK</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 20,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hit: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.55,
  },
  link: {
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  dot: {
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 2,
  },
});
