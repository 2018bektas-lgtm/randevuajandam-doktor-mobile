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
 * Module screen shell — kompakt header, sıkı dikey ritim.
 */
export function ScreenShell({
  title,
  subtitle,
  onBack,
  backLabel = '‹ Geri',
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
          <Pressable style={styles.backButton} onPress={onBack} hitSlop={10}>
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
        <Text style={[styles.subtitle, { fontSize: L.font.sm }]} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );

  const bottomPad = L.scrollBottom;

  return (
    <View style={styles.safe}>
      <StatusBar style="dark" />
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
                tintColor="#EE7D31"
                colors={['#EE7D31']}
              />
            ) : undefined
          }
        >
          {loading ? (
            <ActivityIndicator color="#EE7D31" style={{ marginTop: L.space.lg }} />
          ) : (
            children
          )}
        </ScrollView>
      ) : (
        <View style={[styles.flex, { paddingHorizontal: L.padX, paddingBottom: bottomPad }, contentStyle]}>
          {loading ? <ActivityIndicator color="#EE7D31" style={{ marginTop: L.space.lg }} /> : children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6F9' },
  flex: { flex: 1, minHeight: 0 },
  headerBlock: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(16,33,51,0.07)',
    backgroundColor: '#FFFFFF',
    zIndex: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 8,
    minWidth: 56,
  },
  backPlaceholder: { minWidth: 56 },
  backText: { color: '#C96A2B', fontWeight: '600' },
  rightAction: { marginLeft: 'auto' },
  title: {
    color: '#102133',
    fontWeight: '700',
    letterSpacing: -0.25,
    marginTop: 2,
  },
  subtitle: {
    color: '#6D7D8E',
    marginTop: 2,
    lineHeight: 16,
    fontWeight: '500',
  },
});
