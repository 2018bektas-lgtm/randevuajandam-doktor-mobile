import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { AppIcon } from '../components/AppIcon';
import { useLayout } from '../layout';
import { colors } from '../theme';

type ScreenShellProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  rightAction?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  largeTitle?: boolean;
};

/**
 * Native module shell with bold brand header — clearly not a mobile website.
 */
export function ScreenShell({
  title,
  subtitle,
  onBack,
  rightAction,
  children,
  loading = false,
  refreshing = false,
  onRefresh,
  scroll = true,
  contentStyle,
}: ScreenShellProps) {
  const L = useLayout();

  const header = (
    <LinearGradient
      colors={['#0F172A', '#1E293B']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: L.safeTop }]}
    >
      <View style={styles.navRow}>
        {onBack ? (
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
            onPress={onBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Geri"
          >
            <AppIcon name="chevronLeft" size={20} color="#FFFFFF" />
            <Text style={styles.backText}>Geri</Text>
          </Pressable>
        ) : (
          <View style={styles.backBtn} />
        )}
        <View style={styles.rightSlot}>{rightAction}</View>
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={3}>
          {subtitle}
        </Text>
      ) : null}
      <View style={styles.brandStrip} />
    </LinearGradient>
  );

  const bottomPad = L.scrollBottom + 16;

  return (
    <View style={styles.safe}>
      <StatusBar style="light" />
      {header}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            {
              paddingHorizontal: L.padX,
              paddingTop: 14,
              paddingBottom: bottomPad,
              flexGrow: 1,
            },
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={colors.brand.orange}
                colors={[colors.brand.orange]}
              />
            ) : undefined
          }
        >
          {loading ? (
            <ActivityIndicator color={colors.brand.orange} style={{ marginTop: 32 }} />
          ) : (
            children
          )}
        </ScrollView>
      ) : (
        <View style={[styles.flex, { paddingHorizontal: L.padX, paddingTop: 14, paddingBottom: bottomPad }, contentStyle]}>
          {loading ? <ActivityIndicator color={colors.brand.orange} style={{ marginTop: 32 }} /> : children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#EEF2F7',
  },
  flex: { flex: 1, minHeight: 0 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  navRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    minWidth: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  rightSlot: {
    minWidth: 76,
    alignItems: 'flex-end',
  },
  title: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '400',
  },
  brandStrip: {
    marginTop: 14,
    height: 3,
    width: 42,
    borderRadius: 2,
    backgroundColor: colors.brand.orange,
  },
});
