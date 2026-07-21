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
import { AppIcon } from '../components/AppIcon';
import { useLayout } from '../layout';
import { colors } from '../theme';

type ScreenShellProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** @deprecated Prefer chevron back — label ignored for native look */
  backLabel?: string;
  rightAction?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  /** Large title under nav (iOS app style) */
  largeTitle?: boolean;
};

/**
 * Native module shell: compact nav bar + optional large title.
 * Avoids “website page header” look (text “‹ Geri”, oversized subtitles).
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
  largeTitle = true,
}: ScreenShellProps) {
  const L = useLayout();

  const navBar = (
    <View
      style={[
        styles.navBar,
        {
          paddingTop: L.safeTop,
          paddingHorizontal: 8,
        },
      ]}
    >
      <View style={styles.navRow}>
        {onBack ? (
          <Pressable
            style={({ pressed }) => [styles.navSide, pressed && styles.pressed]}
            onPress={onBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Geri"
          >
            <AppIcon name="chevronLeft" size={22} color={colors.brand.orange} />
            <Text style={styles.backHint}>Geri</Text>
          </Pressable>
        ) : (
          <View style={styles.navSide} />
        )}

        {!largeTitle ? (
          <Text style={styles.navTitle} numberOfLines={1}>
            {title}
          </Text>
        ) : (
          <View style={styles.navTitleSpacer} />
        )}

        <View style={[styles.navSide, styles.navSideRight]}>{rightAction}</View>
      </View>
    </View>
  );

  const bodyTop = largeTitle ? (
    <View style={styles.largeTitleBlock}>
      <Text style={styles.largeTitle} numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.largeSubtitle} numberOfLines={3}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  ) : subtitle ? (
    <Text style={styles.inlineSubtitle} numberOfLines={2}>
      {subtitle}
    </Text>
  ) : null;

  const bottomPad = L.scrollBottom + 8;

  return (
    <View style={styles.safe}>
      <StatusBar style="dark" />
      {navBar}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            {
              paddingHorizontal: L.padX,
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
          {bodyTop}
          {loading ? (
            <ActivityIndicator color={colors.brand.orange} style={{ marginTop: 28 }} />
          ) : (
            children
          )}
        </ScrollView>
      ) : (
        <View style={[styles.flex, { paddingHorizontal: L.padX, paddingBottom: bottomPad }, contentStyle]}>
          {bodyTop}
          {loading ? <ActivityIndicator color={colors.brand.orange} style={{ marginTop: 28 }} /> : children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  flex: { flex: 1, minHeight: 0 },
  navBar: {
    backgroundColor: colors.background.primary,
    borderBottomWidth: 0,
    zIndex: 20,
  },
  navRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navSide: {
    minWidth: 72,
    maxWidth: 110,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  navSideRight: {
    justifyContent: 'flex-end',
  },
  backHint: {
    color: colors.brand.orange,
    fontSize: 17,
    fontWeight: '400',
    marginLeft: -2,
    letterSpacing: -0.2,
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.text.heading,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  navTitleSpacer: { flex: 1 },
  pressed: { opacity: 0.55 },
  largeTitleBlock: {
    paddingTop: 4,
    paddingBottom: 10,
  },
  largeTitle: {
    color: colors.text.heading,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  largeSubtitle: {
    marginTop: 4,
    color: colors.text.muted,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '400',
  },
  inlineSubtitle: {
    color: colors.text.muted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
});
