import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import CirclesScreen from '@/app/(tabs)/circles';
import * as circles from '@/lib/circles';

jest.mock('@/contexts/AuthContext', () => ({
  ...jest.requireActual('@/contexts/AuthContext'),
  useAuth: () => ({
    user: { id: 'test-user-id' },
    loading: false,
  }),
}));

jest.mock('@/lib/circles', () => ({
  getCirclesWithRole: jest.fn(),
  getCircleMembers: jest.fn(),
  createCircle: jest.fn(),
  joinCircle: jest.fn(),
  leaveCircle: jest.fn(),
  removeMember: jest.fn(),
  deleteCircle: jest.fn(),
}));

const mockGetCirclesWithRole =
  circles.getCirclesWithRole as jest.MockedFunction<
    typeof circles.getCirclesWithRole
  >;
const mockGetCircleMembers = circles.getCircleMembers as jest.MockedFunction<
  typeof circles.getCircleMembers
>;
const mockCreateCircle = circles.createCircle as jest.MockedFunction<
  typeof circles.createCircle
>;

describe('Circles Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCirclesWithRole.mockResolvedValue([]);
    mockGetCircleMembers.mockResolvedValue([]);
    mockCreateCircle.mockResolvedValue({
      success: true,
      circle: {
        id: 'new-circle',
        name: 'Test Circle',
        created_by: 'test-user-id',
        invite_code: 'NEW123',
        created_at: '2025-01-01T00:00:00.000Z',
        role: 'owner',
        memberCount: 1,
      },
    });
  });

  it('loads circles for the current user', async () => {
    render(<CirclesScreen />);

    await waitFor(() => {
      expect(mockGetCirclesWithRole).toHaveBeenCalledWith('test-user-id');
    });
  });

  it('shows empty state when there are no circles', async () => {
    const { findByText } = render(<CirclesScreen />);

    expect(await findByText('No circles yet')).toBeTruthy();
  });

  it('opens the create circle modal', async () => {
    const { getAllByText, getByPlaceholderText } = render(<CirclesScreen />);

    await waitFor(() => {
      expect(getAllByText('Create').length).toBeGreaterThan(0);
    });

    fireEvent.press(getAllByText('Create')[0]);

    expect(
      getByPlaceholderText('e.g., Family, Neighbors, Friends')
    ).toBeTruthy();
  });

  it('creates a new circle', async () => {
    const { getAllByText, getByPlaceholderText } = render(<CirclesScreen />);

    await waitFor(() => {
      expect(getAllByText('Create').length).toBeGreaterThan(0);
    });

    fireEvent.press(getAllByText('Create')[0]);
    fireEvent.changeText(
      getByPlaceholderText('e.g., Family, Neighbors, Friends'),
      'Test Circle'
    );

    await act(async () => {
      fireEvent.press(getAllByText('Create').slice(-1)[0]);
    });

    expect(mockCreateCircle).toHaveBeenCalledWith('Test Circle');
  });

  it('opens the join circle modal', async () => {
    const { getAllByText, getByPlaceholderText } = render(<CirclesScreen />);

    await waitFor(() => {
      expect(getAllByText('Join').length).toBeGreaterThan(0);
    });

    fireEvent.press(getAllByText('Join')[0]);

    expect(getByPlaceholderText('ABC123')).toBeTruthy();
  });

  it('shows action buttons', async () => {
    const { getAllByText } = render(<CirclesScreen />);

    await waitFor(() => {
      expect(getAllByText('Create').length).toBeGreaterThan(0);
      expect(getAllByText('Join').length).toBeGreaterThan(0);
    });
  });
});
