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

import { HeaderIconButton } from '../components/ContentUI';

type ScreenShellProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  rightAction?: ReactNode;
  onNotificationPress?: () => void;
  unreadCount?: number;
  children: ReactNode;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  largeTitle?: boolean;
};

/**
 * Native module shell with compact, clean 48px top bar.
 */
export function ScreenShell({
  title,
  subtitle,
  onBack,
  rightAction,
  onNotificationPress,
  unreadCount,
  children,
  loading = false,
  refreshing = false,
  onRefresh,
  scroll = true,
  contentStyle,
}: ScreenShellProps) {
  const L = useLayout();

  const header = (
    <View style={[styles.header, { paddingTop: L.safeTop + 4 }]}>
      <StatusBar style="dark" />
      <View style={styles.navRow}>
        {onBack ? (
          <Pressable
            style={({ pressed }) => [styles.backCircleBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }]}
            onPress={onBack}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Geri"
          >
            <AppIcon name="chevronLeft" size={20} color="#0F172A" />
          </Pressable>
        ) : (
          <View style={styles.backCircleBtnPlaceholder} />
        )}

        <View style={styles.titleCenterSlot}>
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitleText} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.rightSlot}>
          {rightAction ?? (onNotificationPress ? (
            <HeaderIconButton name="bell" color="#0F172A" badge={unreadCount} onPress={onNotificationPress} />
          ) : null)}
        </View>
      </View>
    </View>
  );

  const bottomPad = L.scrollBottom + 16;

  return (
    <View style={styles.safe}>
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
    backgroundColor: '#F8FAFC',
  },
  flex: { flex: 1, minHeight: 0 },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  navRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  backCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backCircleBtnPlaceholder: {
    width: 36,
    height: 36,
  },
  titleCenterSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  titleText: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subtitleText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
    textAlign: 'center',
  },
  rightSlot: {
    minWidth: 36,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
