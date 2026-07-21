import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLayout } from '../layout';
import { colors } from '../theme';
import { TabGlyph } from './AppIcon';

export type TabId = 'overview' | 'calendar' | 'quickClose' | 'menu' | 'profile';

type Props = {
  active: TabId;
  onChange: (tab: TabId) => void;
};

const TABS: { id: TabId; label: string; icon: 'home' | 'calendar' | 'block' | 'menu' | 'profile'; danger?: boolean }[] = [
  { id: 'overview', label: 'Özet', icon: 'home' },
  { id: 'calendar', label: 'Takvim', icon: 'calendar' },
  { id: 'quickClose', label: 'Kapat', icon: 'block', danger: true },
  { id: 'menu', label: 'Menü', icon: 'menu' },
  { id: 'profile', label: 'Profil', icon: 'profile' },
];

/**
 * Edge-to-edge native tab bar (iOS/Android app shell).
 * Not a floating web card — full width, hairline top, safe-area bottom.
 */
export function TabBar({ active, onChange }: Props) {
  const L = useLayout();

  return (
    <View style={[styles.wrap, { paddingBottom: L.footerPad }]}>
      <View style={styles.hairline} />
      <View style={styles.row}>
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => onChange(tab.id)}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
            >
              <View style={[styles.iconWrap, isActive && !tab.danger && styles.iconWrapActive, isActive && tab.danger && styles.iconWrapDanger]}>
                <TabGlyph name={tab.icon} active={isActive} danger={tab.danger} />
              </View>
              <Text
                style={[
                  styles.label,
                  isActive && styles.labelActive,
                  isActive && tab.danger && styles.labelDanger,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
              {isActive ? <View style={[styles.dot, tab.danger && styles.dotDanger]} /> : <View style={styles.dotSpacer} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 0,
    // Lift slightly over content without looking like a web widget
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 14,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(15,23,42,0.1)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 6,
    paddingHorizontal: 4,
    minHeight: 52,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
    minHeight: 48,
    minWidth: 0,
  },
  itemPressed: {
    opacity: 0.72,
  },
  iconWrap: {
    width: 40,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(238,125,49,0.14)',
  },
  iconWrapDanger: {
    backgroundColor: 'rgba(193,60,44,0.12)',
  },
  label: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '600',
    color: '#8E99A8',
    letterSpacing: -0.1,
  },
  labelActive: {
    color: colors.text.heading,
    fontWeight: '700',
  },
  labelDanger: {
    color: colors.status.error,
  },
  dot: {
    marginTop: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brand.orange,
  },
  dotDanger: {
    backgroundColor: colors.status.error,
  },
  dotSpacer: {
    marginTop: 3,
    height: 4,
  },
});
