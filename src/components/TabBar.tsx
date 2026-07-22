import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLayout } from '../layout';
import { colors } from '../theme';
import { TabGlyph } from './AppIcon';

export type TabId = 'overview' | 'calendar' | 'quickClose' | 'menu' | 'profile';

type Props = {
  active: TabId;
  onChange: (tab: TabId) => void;
};

const TABS: {
  id: TabId;
  label: string;
  icon: 'home' | 'calendar' | 'block' | 'menu' | 'profile';
  danger?: boolean;
}[] = [
  { id: 'overview', label: 'Özet', icon: 'home' },
  { id: 'calendar', label: 'Takvim', icon: 'calendar' },
  { id: 'quickClose', label: 'Kapat', icon: 'block', danger: true },
  { id: 'menu', label: 'Menü', icon: 'menu' },
  { id: 'profile', label: 'Profil', icon: 'profile' },
];

/**
 * High-contrast floating dock tab bar — unmistakably native, not web.
 */
export function TabBar({ active, onChange }: Props) {
  const L = useLayout();

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(L.footerPad - 4, 8) }]}>
      <View style={styles.dock}>
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => onChange(tab.id)}
              style={({ pressed }) => [
                styles.item,
                isActive && (tab.danger ? styles.itemActiveDanger : styles.itemActive),
                pressed && styles.itemPressed,
              ]}
            >
              <TabGlyph
                name={tab.icon}
                active={isActive}
                danger={tab.danger}
                forceColor={isActive ? '#FFFFFF' : tab.danger ? '#FCA5A5' : 'rgba(255,255,255,0.55)'}
              />
              <Text
                style={[styles.label, isActive && styles.labelActive, !isActive && tab.danger && styles.labelDangerIdle]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 10,
    paddingTop: 4,
    backgroundColor: 'transparent',
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minHeight: 52,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOpacity: 0.22,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 44,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  itemActive: {
    backgroundColor: colors.brand.orange,
  },
  itemActiveDanger: {
    backgroundColor: '#DC2626',
  },
  itemPressed: {
    opacity: 0.88,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: -0.1,
  },
  labelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  labelDangerIdle: {
    color: 'rgba(252,165,165,0.85)',
  },
});
