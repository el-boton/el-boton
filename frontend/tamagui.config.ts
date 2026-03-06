import { createTamagui, createTokens } from 'tamagui';
import { shorthands } from '@tamagui/shorthands';
import { createAnimations } from '@tamagui/animations-react-native';

/**
 * El Boton Design System: "Deep Ink & Copper"
 *
 * True neutral blacks with warm copper signal color.
 * Emergency red reserved exclusively for the panic button.
 */

const animations = createAnimations({
  fast: {
    type: 'spring',
    damping: 22,
    stiffness: 300,
    mass: 0.9,
  },
  medium: {
    type: 'spring',
    damping: 18,
    stiffness: 180,
  },
  slow: {
    type: 'spring',
    damping: 14,
    stiffness: 120,
  },
  precise: {
    type: 'spring',
    damping: 26,
    stiffness: 400,
    mass: 0.8,
  },
  pulse: {
    type: 'timing',
    duration: 2000,
  },
});

const tokens = createTokens({
  size: {
    0: 0,
    0.5: 2,
    1: 4,
    1.5: 6,
    2: 8,
    2.5: 10,
    3: 12,
    3.5: 14,
    4: 16,
    4.5: 18,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    11: 44,
    12: 48,
    13: 52,
    14: 56,
    15: 60,
    16: 64,
    17: 68,
    18: 72,
    19: 76,
    20: 80,
    true: 16,
  },
  space: {
    0: 0,
    0.5: 2,
    1: 4,
    1.5: 6,
    2: 8,
    2.5: 10,
    3: 12,
    3.5: 14,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    11: 44,
    12: 48,
    14: 56,
    16: 64,
    20: 80,
    true: 16,
    '-0.5': -2,
    '-1': -4,
    '-1.5': -6,
    '-2': -8,
    '-2.5': -10,
    '-3': -12,
    '-4': -16,
    '-5': -20,
    '-6': -24,
  },
  radius: {
    0: 0,
    1: 3,
    2: 6,
    3: 9,
    4: 12,
    5: 16,
    6: 20,
    7: 24,
    8: 28,
    9: 32,
    10: 9999,
    true: 9,
  },
  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
  },
  color: {
    // === BACKGROUNDS (true neutral black) ===
    bgDeep: '#080808',
    bgPrimary: '#0E0E0E',
    bgElevated: '#1A1A1A',
    bgCard: '#212121',
    bgCardHover: '#2A2A2A',
    bgInput: '#141414',
    bgOverlay: 'rgba(8, 8, 8, 0.92)',

    // === SIGNAL COPPER (primary UI accent) ===
    signal: '#D4734A',
    signalBright: '#E8946C',
    signalCore: '#C06038',
    signalDark: '#A85A38',
    signalMuted: '#6B3A25',
    signalGlow: '#F0B89C',
    signalSubtle: 'rgba(212, 115, 74, 0.10)',
    signalBorder: 'rgba(212, 115, 74, 0.25)',

    // === EMERGENCY RED (panic button only) ===
    emergency: '#DC3030',
    emergencyBright: '#EF4040',
    emergencyDark: '#A82020',
    emergencySubtle: 'rgba(220, 48, 48, 0.12)',
    emergencyBorder: 'rgba(220, 48, 48, 0.25)',

    // === SAGE (success/safe states) ===
    sage: '#5C8A6E',
    sageBright: '#7AAE8C',
    sageDark: '#3D6B50',
    sageMuted: '#2A4A38',
    sageSubtle: 'rgba(92, 138, 110, 0.12)',

    // === AMBER (warning/caution) ===
    amber: '#D4913B',
    amberBright: '#E8A85C',
    amberDark: '#B07828',
    amberMuted: '#5C3D18',
    amberSubtle: 'rgba(212, 145, 59, 0.10)',
    warning: '#D4913B',

    // === TEXT (warm-toned) ===
    textPrimary: '#E8E4E0',
    textSecondary: '#8A8580',
    textTertiary: '#5C5955',
    textDisabled: '#3D3A38',
    textInverse: '#0E0E0E',

    // === BORDERS (neutral) ===
    borderSubtle: '#252525',
    borderDefault: '#383838',
    borderStrong: '#4A4A4A',
    borderFocus: '#D4734A',

    // === UTILITY ===
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',

    // === STATUS ===
    statusActive: '#DC3030',
    statusSafe: '#5C8A6E',
    statusWarning: '#D4913B',
    statusMuted: '#5C5955',
  },
});

const tacticalDark = {
  // Backgrounds
  background: tokens.color.bgPrimary,
  backgroundHover: tokens.color.bgElevated,
  backgroundPress: tokens.color.bgCard,
  backgroundFocus: tokens.color.bgCard,
  backgroundStrong: tokens.color.bgDeep,
  backgroundTransparent: 'transparent',

  // Text
  color: tokens.color.textPrimary,
  colorHover: tokens.color.textPrimary,
  colorPress: tokens.color.textSecondary,
  colorFocus: tokens.color.textPrimary,
  colorTransparent: 'transparent',

  // Borders
  borderColor: tokens.color.borderSubtle,
  borderColorHover: tokens.color.borderDefault,
  borderColorFocus: tokens.color.signal,
  borderColorPress: tokens.color.borderDefault,

  // Placeholder
  placeholderColor: tokens.color.textTertiary,

  // Semantic mappings
  blue1: tokens.color.sage,
  blue2: tokens.color.sageMuted,
  green1: tokens.color.sage,
  green2: tokens.color.sageMuted,
  red1: tokens.color.emergency,
  red2: tokens.color.emergencyDark,
  yellow1: tokens.color.amber,
  yellow2: tokens.color.amberMuted,

  // Shadows
  shadowColor: tokens.color.black,
  shadowColorHover: tokens.color.black,
  shadowColorPress: tokens.color.black,
  shadowColorFocus: tokens.color.signal,
};

export const config = createTamagui({
  animations,
  defaultTheme: 'dark',
  shouldAddPrefersColorThemes: false,
  themeClassNameOnRoot: false,
  shorthands,
  fonts: {
    heading: {
      family: 'System',
      weight: {
        1: '400',
        2: '500',
        3: '600',
        4: '700',
        5: '800',
        6: '900',
      },
      size: {
        1: 11,
        2: 12,
        3: 13,
        4: 14,
        5: 16,
        6: 18,
        7: 20,
        8: 24,
        9: 30,
        10: 36,
        11: 44,
        12: 56,
      },
      lineHeight: {
        1: 14,
        2: 16,
        3: 18,
        4: 20,
        5: 22,
        6: 24,
        7: 28,
        8: 32,
        9: 38,
        10: 44,
        11: 52,
        12: 64,
      },
      letterSpacing: {
        1: 0,
        2: 0,
        3: 0,
        4: -0.2,
        5: -0.3,
        6: -0.4,
        7: -0.5,
        8: -0.6,
        9: -0.8,
        10: -1,
        11: -1.2,
        12: -1.5,
      },
    },
    body: {
      family: 'System',
      weight: {
        1: '400',
        2: '500',
        3: '600',
        4: '700',
      },
      size: {
        1: 11,
        2: 12,
        3: 13,
        4: 14,
        5: 15,
        6: 16,
        7: 18,
        8: 20,
      },
      lineHeight: {
        1: 16,
        2: 18,
        3: 20,
        4: 22,
        5: 24,
        6: 26,
        7: 28,
        8: 32,
      },
      letterSpacing: {
        1: 0.2,
        2: 0.1,
        3: 0,
        4: 0,
        5: -0.1,
        6: -0.2,
        7: -0.3,
        8: -0.4,
      },
    },
    mono: {
      family: 'SpaceMono',
      weight: {
        1: '400',
      },
      size: {
        1: 11,
        2: 12,
        3: 13,
        4: 14,
        5: 15,
      },
      lineHeight: {
        1: 16,
        2: 18,
        3: 20,
        4: 22,
        5: 24,
      },
      letterSpacing: {
        1: 0.5,
        2: 0.5,
        3: 0.5,
        4: 0.5,
        5: 0.5,
      },
    },
  },
  tokens,
  themes: {
    dark: tacticalDark,
  },
  media: {
    xs: { maxWidth: 660 },
    sm: { maxWidth: 800 },
    md: { maxWidth: 1020 },
    lg: { maxWidth: 1280 },
    xl: { maxWidth: 1420 },
    xxl: { maxWidth: 1600 },
    short: { maxHeight: 820 },
    tall: { minHeight: 820 },
    hoverNone: { hover: 'none' },
    pointerCoarse: { pointer: 'coarse' },
  },
});

export type AppConfig = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}
