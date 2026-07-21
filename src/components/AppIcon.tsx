import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme';

export type AppIconName =
  | 'home'
  | 'calendar'
  | 'block'
  | 'menu'
  | 'profile'
  | 'bell'
  | 'chevronLeft'
  | 'chevronRight'
  | 'plus'
  | 'check'
  | 'close';

type Props = {
  name: AppIconName;
  size?: number;
  color?: string;
  style?: ViewStyle;
};

/**
 * Lightweight geometric icons — no icon font dependency.
 * Reads as native glyph shapes, not emoji/web symbols.
 */
export function AppIcon({ name, size = 22, color = colors.text.muted, style }: Props) {
  const stroke = Math.max(1.5, size * 0.09);

  if (name === 'home') {
    return (
      <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }, style]}>
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: size * 0.38,
            borderRightWidth: size * 0.38,
            borderBottomWidth: size * 0.32,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: color,
            marginBottom: -1,
          }}
        />
        <View
          style={{
            width: size * 0.58,
            height: size * 0.4,
            borderWidth: stroke,
            borderTopWidth: 0,
            borderColor: color,
            borderBottomLeftRadius: 2,
            borderBottomRightRadius: 2,
          }}
        />
      </View>
    );
  }

  if (name === 'calendar') {
    return (
      <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
        <View
          style={{
            width: size * 0.78,
            height: size * 0.72,
            borderWidth: stroke,
            borderColor: color,
            borderRadius: size * 0.12,
            marginTop: size * 0.08,
          }}
        >
          <View style={{ height: size * 0.18, borderBottomWidth: stroke, borderBottomColor: color }} />
          <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', padding: size * 0.08, gap: size * 0.06 }}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  width: size * 0.12,
                  height: size * 0.12,
                  borderRadius: 1,
                  backgroundColor: color,
                  opacity: 0.85,
                }}
              />
            ))}
          </View>
        </View>
        <View
          style={{
            position: 'absolute',
            top: size * 0.04,
            left: size * 0.28,
            width: stroke * 1.2,
            height: size * 0.18,
            borderRadius: 1,
            backgroundColor: color,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: size * 0.04,
            right: size * 0.28,
            width: stroke * 1.2,
            height: size * 0.18,
            borderRadius: 1,
            backgroundColor: color,
          }}
        />
      </View>
    );
  }

  if (name === 'block') {
    return (
      <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
        <View
          style={{
            width: size * 0.78,
            height: size * 0.78,
            borderRadius: size * 0.39,
            borderWidth: stroke * 1.15,
            borderColor: color,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: size * 0.48,
              height: stroke * 1.2,
              backgroundColor: color,
              borderRadius: 2,
              transform: [{ rotate: '-28deg' }],
            }}
          />
        </View>
      </View>
    );
  }

  if (name === 'menu') {
    return (
      <View style={[{ width: size, height: size, justifyContent: 'center', gap: size * 0.14, paddingHorizontal: size * 0.12 }, style]}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              height: stroke * 1.15,
              borderRadius: 2,
              backgroundColor: color,
              width: i === 1 ? '78%' : '100%',
            }}
          />
        ))}
      </View>
    );
  }

  if (name === 'profile') {
    return (
      <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }, style]}>
        <View
          style={{
            width: size * 0.36,
            height: size * 0.36,
            borderRadius: size * 0.18,
            borderWidth: stroke,
            borderColor: color,
            marginBottom: size * 0.06,
          }}
        />
        <View
          style={{
            width: size * 0.62,
            height: size * 0.28,
            borderTopLeftRadius: size * 0.28,
            borderTopRightRadius: size * 0.28,
            borderWidth: stroke,
            borderBottomWidth: 0,
            borderColor: color,
          }}
        />
      </View>
    );
  }

  if (name === 'bell') {
    return (
      <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
        <View
          style={{
            width: size * 0.52,
            height: size * 0.48,
            borderWidth: stroke,
            borderColor: color,
            borderTopLeftRadius: size * 0.28,
            borderTopRightRadius: size * 0.28,
            borderBottomLeftRadius: 3,
            borderBottomRightRadius: 3,
            marginTop: size * 0.06,
          }}
        />
        <View
          style={{
            width: size * 0.64,
            height: stroke * 1.1,
            backgroundColor: color,
            borderRadius: 2,
            marginTop: 1,
          }}
        />
        <View
          style={{
            width: size * 0.14,
            height: size * 0.1,
            borderBottomLeftRadius: 6,
            borderBottomRightRadius: 6,
            borderWidth: stroke,
            borderTopWidth: 0,
            borderColor: color,
            marginTop: 1,
          }}
        />
      </View>
    );
  }

  if (name === 'chevronLeft' || name === 'chevronRight') {
    const flip = name === 'chevronRight';
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
            transform: flip ? [{ scaleX: -1 }] : undefined,
          },
          style,
        ]}
      >
        <View
          style={{
            width: size * 0.38,
            height: size * 0.38,
            borderLeftWidth: stroke * 1.35,
            borderBottomWidth: stroke * 1.35,
            borderColor: color,
            transform: [{ rotate: '45deg' }],
            marginLeft: size * 0.12,
          }}
        />
      </View>
    );
  }

  if (name === 'plus') {
    return (
      <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
        <View style={{ position: 'absolute', width: size * 0.55, height: stroke * 1.3, backgroundColor: color, borderRadius: 2 }} />
        <View style={{ position: 'absolute', width: stroke * 1.3, height: size * 0.55, backgroundColor: color, borderRadius: 2 }} />
      </View>
    );
  }

  if (name === 'check') {
    return (
      <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
        <View
          style={{
            width: size * 0.42,
            height: size * 0.22,
            borderLeftWidth: stroke * 1.3,
            borderBottomWidth: stroke * 1.3,
            borderColor: color,
            transform: [{ rotate: '-45deg' }, { translateY: -size * 0.04 }],
          }}
        />
      </View>
    );
  }

  // close
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <View style={{ position: 'absolute', width: size * 0.55, height: stroke * 1.2, backgroundColor: color, borderRadius: 2, transform: [{ rotate: '45deg' }] }} />
      <View style={{ position: 'absolute', width: size * 0.55, height: stroke * 1.2, backgroundColor: color, borderRadius: 2, transform: [{ rotate: '-45deg' }] }} />
    </View>
  );
}

export function TabGlyph({
  name,
  active,
  danger,
  forceColor,
}: {
  name: 'home' | 'calendar' | 'block' | 'menu' | 'profile';
  active?: boolean;
  danger?: boolean;
  forceColor?: string;
}) {
  const color =
    forceColor ??
    (danger
      ? active
        ? colors.status.error
        : '#A0AEC0'
      : active
        ? colors.brand.orange
        : '#8E99A8');
  return <AppIcon name={name} size={22} color={color} />;
}

const styles = StyleSheet.create({});
