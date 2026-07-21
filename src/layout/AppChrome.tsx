import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLayout } from './useLayout';

type Props = {
  children: ReactNode;
  /** Header sits under status bar */
  header?: ReactNode;
  /** Footer / primary CTAs above home indicator */
  footer?: ReactNode;
  /** Bottom tab bar (dashboard) */
  bottomNav?: ReactNode;
  style?: ViewStyle;
  statusBarStyle?: 'light' | 'dark' | 'auto';
  bg?: string;
};

/**
 * Full-screen chrome: status bar safe top, optional sticky header,
 * flex body, sticky footer + bottom nav with home-indicator padding.
 */
export function AppChrome({
  children,
  header,
  footer,
  bottomNav,
  style,
  statusBarStyle = 'dark',
  bg = '#F2F4F7',
}: Props) {
  const L = useLayout();

  return (
    <View style={[styles.root, { backgroundColor: bg }, style]}>
      <StatusBar style={statusBarStyle} />
      {header ? (
        <View
          style={[
            styles.header,
            {
              paddingTop: L.safeTop,
              paddingHorizontal: L.padX,
              paddingBottom: L.space.sm,
            },
          ]}
        >
          {header}
        </View>
      ) : (
        <View style={{ height: L.safeTop }} />
      )}

      <View style={styles.body}>{children}</View>

      {footer ? (
        <View
          style={[
            styles.footer,
            {
              paddingHorizontal: L.padX,
              paddingTop: L.space.sm,
              paddingBottom: bottomNav ? L.space.xs : L.footerPad,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}

      {bottomNav ? <View style={styles.tabHost}>{bottomNav}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    zIndex: 20,
    borderBottomWidth: 0,
    backgroundColor: '#F2F4F7',
  },
  body: { flex: 1, minHeight: 0 },
  footer: {
    zIndex: 30,
    elevation: 12,
  },
  tabHost: {
    zIndex: 40,
  },
});
