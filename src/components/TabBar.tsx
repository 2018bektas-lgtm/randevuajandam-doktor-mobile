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
 * Clean native bottom tab navigation bar.
 */
export function TabBar({ active, onChange }: Props) {
  const L = useLayout();

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(L.footerPad, 6) }]}>
      <View style={styles.tabContainer}>
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          const isDanger = tab.danger;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => onChange(tab.id)}
              style={({ pressed }) => [
                styles.tabItem,
                isActive && (isDanger ? styles.tabItemActiveDanger : styles.tabItemActive),
                pressed && styles.tabItemPressed,
              ]}
            >
              <TabGlyph
                name={tab.icon}
                active={isActive}
                danger={isDanger}
                forceColor={
                  isActive
                    ? isDanger
                      ? '#DC2626'
                      : colors.brand.orange
                    : isDanger
                      ? '#EF4444'
                      : '#64748B'
                }
              />
              <Text
                style={[
                  styles.label,
                  isActive && (isDanger ? styles.labelDangerActive : styles.labelActive),
                  !isActive && isDanger && styles.labelDangerIdle,
                ]}
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
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.08)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 2,
    minHeight: 50,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  tabItemActive: {
    backgroundColor: 'rgba(238,125,49,0.1)',
  },
  tabItemActiveDanger: {
    backgroundColor: '#FEF2F2',
  },
  tabItemPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: -0.1,
  },
  labelActive: {
    color: colors.brand.orangeSoft,
    fontWeight: '700',
  },
  labelDangerActive: {
    color: '#DC2626',
    fontWeight: '700',
  },
  labelDangerIdle: {
    color: '#EF4444',
  },
});
