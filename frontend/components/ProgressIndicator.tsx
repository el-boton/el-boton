import React from 'react';
import { XStack, YStack } from 'tamagui';

type Props = {
  currentStep: number;
  totalSteps: number;
};

export function ProgressIndicator({ currentStep, totalSteps }: Props) {
  return (
    <XStack justifyContent="center" gap="$2" marginBottom="$6">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <YStack
          key={i}
          width={i + 1 === currentStep ? 24 : 8}
          height={8}
          borderRadius={4}
          backgroundColor={i + 1 <= currentStep ? '$signal' : '$borderSubtle'}
        />
      ))}
    </XStack>
  );
}
