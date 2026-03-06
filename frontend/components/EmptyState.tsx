import React from 'react';
import { YStack, Text, Button, XStack, styled } from 'tamagui';

const EmptyContainer = styled(YStack, {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  padding: '$8',
});

const EmptyIconBox = styled(YStack, {
  width: 72,
  height: 72,
  borderRadius: '$4',
  backgroundColor: '$bgCard',
  borderWidth: 1,
  borderColor: '$borderSubtle',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '$5',
});

type Props = {
  icon: React.ReactNode;
  title: string;
  hint: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, hint, actionLabel, onAction }: Props) {
  return (
    <EmptyContainer>
      <EmptyIconBox>{icon}</EmptyIconBox>
      <Text color="$textSecondary" fontSize={16} fontWeight="500" textAlign="center">
        {title}
      </Text>
      <Text color="$textTertiary" fontSize={14} textAlign="center" marginTop="$2" lineHeight={20}>
        {hint}
      </Text>
      {actionLabel && onAction && (
        <Button
          marginTop="$5"
          backgroundColor="$signal"
          borderRadius="$3"
          height={44}
          paddingHorizontal="$5"
          pressStyle={{ backgroundColor: '$signalDark' }}
          onPress={onAction}
        >
          <Text color="white" fontWeight="600" fontSize={14}>{actionLabel}</Text>
        </Button>
      )}
    </EmptyContainer>
  );
}
