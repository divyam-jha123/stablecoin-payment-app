import { router, usePathname, type Href } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { AppIcon, colors, ScanIcon, ui } from './payment-ui';

const tabs = [
  { label: 'Home', href: '/home', icon: 'home' },
  { label: 'Payments', href: '/payments', icon: 'wallet' },
  { label: 'Scan', href: '/scanner', icon: null },
  { label: 'Activity', href: '/activity', icon: 'activity' },
  { label: 'Profile', href: '/profile', icon: 'person' },
] as const;

export function DashboardNav({
  disabled = false,
  floating = false,
}: {
  disabled?: boolean;
  floating?: boolean;
}) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const scanSize = Math.min(72, (Math.min(width, 600) - 24) / 5);
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, floating && styles.floatingBar]}
    >
      {tabs.map((tab) => {
        const selected = pathname === tab.href;
        return (
          <Pressable
            key={tab.label}
            accessibilityRole="tab"
            accessibilityLabel={tab.icon ? tab.label : 'Scan and pay'}
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() =>
              tab.icon
                ? router.replace(tab.href as Href)
                : router.push('/scanner')
            }
            style={({ pressed }) => [
              styles.item,
              !tab.icon && styles.scanItem,
              disabled && ui.disabled,
              pressed && ui.pressed,
            ]}
          >
            {tab.icon ? (
              <>
                <AppIcon
                  name={tab.icon}
                  color={selected ? colors.accent : '#37445c'}
                  size={30}
                />
                <Text style={[styles.label, selected && styles.active]}>
                  {tab.label}
                </Text>
              </>
            ) : (
              <View
                style={[
                  styles.scan,
                  {
                    width: scanSize,
                    height: scanSize,
                    borderRadius: scanSize / 2,
                  },
                ]}
              >
                <ScanIcon color="#fff" size={32} />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 600,
    minHeight: 80,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  floatingBar: {
    borderRadius: 20,
    minHeight: 66,
    paddingVertical: 4,
  },
  item: {
    flex: 1,
    minWidth: 0,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  label: { color: '#37445c', fontSize: 12, textAlign: 'center' },
  active: { color: colors.accent },
  scanItem: { alignSelf: 'flex-start', marginTop: -18 },
  scan: {
    backgroundColor: '#0075ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
