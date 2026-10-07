import { colors } from '../components/payment-ui';

/** Shared foundation for the Home sections, in React Native logical pixels. */
export const homeTheme = {
  colors: {
    background: '#ffffff',
    surface: '#ffffff',
    text: colors.ink,
    muted: '#526584',
    primary: colors.accent,
    border: '#dce7f7',
    unread: '#ef3434',
    balanceTop: '#0065ee',
    balanceBottom: '#001c57',
    onBalance: '#ffffff',
    balanceMuted: '#d9e9ff',
    balanceOutline: '#58a3ff',
    actionSurface: '#d5eaff',
    positive: '#07835f',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, section: 20 },
  radius: { sm: 8, surface: 16, pill: 999 },
  typography: {
    greeting: { fontSize: 16, lineHeight: 22, fontWeight: '700' as const },
    body: { fontSize: 14, lineHeight: 20 },
    caption: { fontSize: 12, lineHeight: 17 },
    amount: { fontSize: 30, lineHeight: 36, fontWeight: '700' as const },
  },
  layout: { pageGutter: 16, maxWidth: 600, touchTarget: 48, avatar: 36 },
} as const;
