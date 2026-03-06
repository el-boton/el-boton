import { YStack, Text, styled } from 'tamagui';

export const ScreenContainer = styled(YStack, {
  flex: 1,
  backgroundColor: '$bgPrimary',
});

export const ScreenHeader = styled(YStack, {
  paddingHorizontal: '$6',
  paddingTop: '$12',
  paddingBottom: '$5',
  borderBottomWidth: 1,
  borderBottomColor: '$borderSubtle',
  backgroundColor: '$bgDeep',
});

export const ScreenTitle = styled(Text, {
  fontSize: 24,
  fontWeight: '700',
  color: '$textPrimary',
  marginBottom: '$1',
});

export const ScreenSubtitle = styled(Text, {
  fontSize: 13,
  color: '$textTertiary',
  lineHeight: 18,
});

export const SectionLabel = styled(Text, {
  fontSize: 11,
  fontWeight: '600',
  color: '$textTertiary',
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  marginBottom: '$3',
  marginLeft: '$1',

  variants: {
    variant: {
      quiet: {
        textTransform: 'none',
        letterSpacing: 0,
        fontSize: 13,
      },
    },
  } as const,
});
