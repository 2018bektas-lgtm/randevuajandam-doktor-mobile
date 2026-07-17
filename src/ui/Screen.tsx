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
import { useLayout } from '../layout';

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
};

/**
 * Module screen shell: header under status bar, body scrolls,
 * bottom padding clears home indicator + floating bottom nav.
 */
export function ScreenShell({
  title,
  subtitle,
  onBack,
  backLabel = '‹  Geri',
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
    <View
      style={[
        styles.headerBlock,
        {
          paddingTop: L.safeTop,
          paddingHorizontal: L.padX,
          paddingBottom: L.space.sm,
        },
      ]}
    >
      <View style={styles.headerRow}>
        {onBack ? (
          <Pressable style={styles.backButton} onPress={onBack} hitSlop={12}>
            <Text style={[styles.backText, { fontSize: L.font.sm }]}>{backLabel}</Text>
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
      </View>
      <Text style={[styles.title, { fontSize: L.font.xl }]} numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { fontSize: L.font.sm }]} numberOfLines={3}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );

  const bottomPad = L.scrollBottom;

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
              paddingBottom: bottomPad,
              flexGrow: 1,
            },
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor="#F58A45"
                colors={['#F58A45']}
              />
            ) : undefined
          }
        >
          {loading ? (
            <ActivityIndicator color="#F58A45" style={{ marginTop: L.space.xl }} />
          ) : (
            children
          )}
        </ScrollView>
      ) : (
        <View style={[styles.flex, { paddingHorizontal: L.padX, paddingBottom: bottomPad }, contentStyle]}>
          {loading ? <ActivityIndicator color="#F58A45" style={{ marginTop: L.space.xl }} /> : children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0D1B2A' },
  flex: { flex: 1, minHeight: 0 },
  headerBlock: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0D1B2A',
    zIndex: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 12,
    minWidth: 72,
  },
  backPlaceholder: { minWidth: 72 },
  backText: { color: '#F3A26B', fontWeight: '700' },
  rightAction: { marginLeft: 'auto' },
  title: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 6,
  },
  subtitle: {
    color: '#94A7B9',
    marginTop: 4,
    lineHeight: 18,
    fontWeight: '500',
  },
});
