import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Vibration } from 'react-native';
import { BigRedButton } from '@/components/BigRedButton';

// Mock Vibration module
jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});
jest.spyOn(Vibration, 'cancel').mockImplementation(() => {});

jest.useFakeTimers();

describe('BigRedButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const onActivate = jest.fn();
    const { getByText } = render(<BigRedButton onActivate={onActivate} />);

    // The button shows HELP and Hold for 3 seconds
    expect(getByText('HELP')).toBeTruthy();
    expect(getByText('Hold for 3 seconds')).toBeTruthy();
    expect(getByText('Hold for 3 seconds to alert your circle')).toBeTruthy();
  });

  it('shows countdown when pressed', () => {
    const onActivate = jest.fn();
    const { getByText } = render(<BigRedButton onActivate={onActivate} />);

    const button = getByText('HELP');
    fireEvent(button, 'pressIn');

    // Shows countdown number 3 initially
    expect(getByText('3')).toBeTruthy();
  });

  it('changes to holding state when pressed', () => {
    const onActivate = jest.fn();
    const { getByText } = render(<BigRedButton onActivate={onActivate} />);

    const button = getByText('HELP');
    fireEvent(button, 'pressIn');

    // Verify the button state changed - shows countdown
    expect(getByText('3')).toBeTruthy();
    expect(getByText('Release to cancel')).toBeTruthy();
  });

  it('calls onActivate after 3 seconds hold', async () => {
    const onActivate = jest.fn();
    const { getByText } = render(<BigRedButton onActivate={onActivate} />);

    const button = getByText('HELP');
    fireEvent(button, 'pressIn');

    // Fast-forward 3 seconds
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('does not call onActivate if released early', () => {
    const onActivate = jest.fn();
    const { getByText } = render(<BigRedButton onActivate={onActivate} />);

    const button = getByText('HELP');
    fireEvent(button, 'pressIn');

    // Hold for only 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    fireEvent(button, 'pressOut');

    // Advance more time
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onActivate).not.toHaveBeenCalled();
  });

  it('resets when released early', () => {
    const onActivate = jest.fn();
    const { getByText, queryByText } = render(<BigRedButton onActivate={onActivate} />);

    const button = getByText('HELP');
    fireEvent(button, 'pressIn');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    fireEvent(button, 'pressOut');

    // Should show original text again
    expect(getByText('HELP')).toBeTruthy();
    // Countdown should be gone
    expect(queryByText('Release to cancel')).toBeNull();
  });

  it('is disabled when disabled prop is true', () => {
    const onActivate = jest.fn();
    const { getByText } = render(<BigRedButton onActivate={onActivate} disabled />);

    // Shows cooldown message when disabled
    expect(getByText('COOLDOWN ACTIVE')).toBeTruthy();
    expect(getByText('Please wait before sending another alert')).toBeTruthy();

    // Button should still render but not activate
    const button = getByText('HELP');
    fireEvent(button, 'pressIn');

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(onActivate).not.toHaveBeenCalled();
  });

  it('shows countdown numbers during hold', () => {
    const onActivate = jest.fn();
    const { getByText } = render(<BigRedButton onActivate={onActivate} />);

    const button = getByText('HELP');
    fireEvent(button, 'pressIn');

    // Should show countdown
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(getByText('3')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(getByText('2')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(getByText('1')).toBeTruthy();
  });

  it('updates progress during hold', () => {
    const onActivate = jest.fn();
    const { getByText } = render(<BigRedButton onActivate={onActivate} />);

    const button = getByText('HELP');
    fireEvent(button, 'pressIn');

    // At 33% (~1 second) - countdown should show 2
    act(() => {
      jest.advanceTimersByTime(1100);
    });

    expect(getByText('2')).toBeTruthy();
  });
});
