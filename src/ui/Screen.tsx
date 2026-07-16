import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

/** Extra top inset so back/title clear status bar (clock, wifi, notch). */
const TOP_PAD =
  Platform.OS === 'android'
    ? (RNStatusBar.currentHeight ?? 24) + 14
    : 18;

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
  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.headerRow}>
        {onBack ? (
          <Pressable style={styles.backButton} onPress={onBack} hitSlop={10}>
            <Text style={styles.backText}>{backLabel}</Text>
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor="#F58A45"
              />
            ) : undefined
          }
        >
          {header}
          {loading ? (
            <ActivityIndicator color="#F58A45" style={styles.loader} />
          ) : (
            children
          )}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.staticContent, contentStyle]}>
          {header}
          {loading ? (
            <ActivityIndicator color="#F58A45" style={styles.loader} />
          ) : (
            children
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0D1B2A',
  },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: TOP_PAD,
    paddingBottom: 110,
  },
  staticContent: {
    paddingHorizontal: 20,
    paddingTop: TOP_PAD,
    paddingBottom: 110,
  },
  headerBlock: {
    marginBottom: 8,
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  backPlaceholder: { height: 40 },
  backText: {
    color: '#F3A26B',
    fontSize: 15,
    fontWeight: '800',
  },
  rightAction: {
    marginLeft: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 10,
  },
  subtitle: {
    color: '#AEBECD',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  loader: {
    marginTop: 48,
  },
});
