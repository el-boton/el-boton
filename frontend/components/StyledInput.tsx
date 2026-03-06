import React from 'react';
import { Input, styled, GetProps } from 'tamagui';

const BaseInput = styled(Input, {
  backgroundColor: '$bgInput',
  borderColor: '$borderSubtle',
  borderWidth: 1,
  borderRadius: '$3',
  height: 56,
  color: '$textPrimary',
  paddingHorizontal: '$4',

  focusStyle: {
    borderColor: '$signal',
    backgroundColor: '$bgCard',
  },
});

type BaseProps = GetProps<typeof BaseInput>;

type StyledInputProps = Omit<BaseProps, 'onChangeText'> & {
  onChangeText?: (text: string) => void;
};

export function StyledInput({ onChangeText, ...props }: StyledInputProps) {
  return <BaseInput {...props} onChangeText={onChangeText as any} />;
}
