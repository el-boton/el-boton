import React from 'react';
import { Button, Spinner, styled, GetProps } from 'tamagui';

const StyledButton = styled(Button, {
  backgroundColor: '$signal',
  borderRadius: '$3',
  height: 56,

  pressStyle: {
    backgroundColor: '$signalDark',
    scale: 0.98,
  },

  disabledStyle: {
    opacity: 0.5,
  },
});

type Props = GetProps<typeof StyledButton> & {
  loading?: boolean;
};

export function PrimaryButton({ loading, children, ...props }: Props) {
  return (
    <StyledButton disabled={loading || props.disabled} {...props}>
      {loading ? <Spinner color="white" /> : children}
    </StyledButton>
  );
}
