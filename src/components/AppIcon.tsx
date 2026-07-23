import { ComponentProps } from 'react';
import { StyleProp, TextStyle, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

export type AppIconName =
  | 'home'
  | 'calendar'
  | 'block'
  | 'menu'
  | 'profile'
  | 'bell'
  | 'bellOutline'
  | 'chevronLeft'
  | 'chevronRight'
  | 'plus'
  | 'check'
  | 'close'
  | 'people'
  | 'time'
  | 'requests'
  | 'waitlist'
  | 'finance'
  | 'clinic'
  | 'settings'
  | 'document'
  | 'camera'
  | 'call'
  | 'mail'
  | 'search'
  | 'star'
  | 'gallery'
  | 'blog'
  | 'education'
  | 'lock'
  | 'globe'
  | 'package'
  | 'referral'
  | 'warning'
  | 'flash'
  | 'list'
  | 'chevronUp'
  | 'chevronDown'
  | 'image'
  | 'edit';

const MAP: Record<AppIconName, ComponentProps<typeof Ionicons>['name']> = {
  home: 'home',
  calendar: 'calendar',
  block: 'ban',
  menu: 'grid',
  profile: 'person',
  bell: 'notifications',
  bellOutline: 'notifications-outline',
  chevronLeft: 'chevron-back',
  chevronRight: 'chevron-forward',
  plus: 'add',
  check: 'checkmark',
  close: 'close',
  people: 'people',
  time: 'time',
  requests: 'file-tray',
  waitlist: 'hourglass',
  finance: 'wallet',
  clinic: 'business',
  settings: 'settings',
  document: 'document-text',
  camera: 'camera',
  call: 'call',
  mail: 'mail',
  search: 'search',
  star: 'star',
  gallery: 'images',
  blog: 'newspaper',
  education: 'school',
  lock: 'lock-closed',
  globe: 'globe',
  package: 'cube',
  referral: 'gift',
  warning: 'warning',
  flash: 'flash',
  list: 'list',
  chevronUp: 'chevron-up',
  chevronDown: 'chevron-down',
  image: 'image',
  edit: 'pencil',
};

type Props = {
  name: AppIconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle | ViewStyle>;
};

/** Real Ionicons glyphs — not emoji, not crude shapes. */
export function AppIcon({ name, size = 22, color = colors.text.muted, style }: Props) {
  return <Ionicons name={MAP[name]} size={size} color={color} style={style as TextStyle} />;
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
        ? '#FFFFFF'
        : '#FCA5A5'
      : active
        ? '#FFFFFF'
        : 'rgba(255,255,255,0.55)');
  return <AppIcon name={name} size={18} color={color} />;
}

/** Circular icon badge used inside content cards / rows */
export function IconBadge({
  name,
  color = colors.brand.orange,
  bg,
  size = 40,
  iconSize = 20,
}: {
  name: AppIconName;
  color?: string;
  bg?: string;
  size?: number;
  iconSize?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2.4,
        backgroundColor: bg ?? 'rgba(238,125,49,0.14)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={MAP[name]} size={iconSize} color={color} />
    </View>
  );
}
