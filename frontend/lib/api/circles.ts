import { Circle, CircleMember, Profile } from '@/lib/types';

import { authenticatedRequest } from './auth';

export type CircleMemberWithProfile = CircleMember & {
  profile: Pick<Profile, 'id' | 'display_name' | 'phone' | 'push_token'>;
};

export type CircleWithRole = Circle & {
  role: 'owner' | 'member';
  memberCount: number;
};

export async function listCircles(): Promise<CircleWithRole[]> {
  return authenticatedRequest<CircleWithRole[]>('/circles');
}

export async function createCircle(name: string): Promise<CircleWithRole> {
  return authenticatedRequest<CircleWithRole>('/circles', {
    method: 'POST',
    body: { name },
  });
}

export async function joinCircle(inviteCode: string): Promise<CircleWithRole> {
  return authenticatedRequest<CircleWithRole>('/circles/join', {
    method: 'POST',
    body: { invite_code: inviteCode },
  });
}

export async function listCircleMembers(
  circleId: string
): Promise<CircleMemberWithProfile[]> {
  return authenticatedRequest<CircleMemberWithProfile[]>(
    `/circles/${circleId}/members`
  );
}

export async function leaveCircle(circleId: string): Promise<void> {
  await authenticatedRequest<void>(`/circles/${circleId}/members/me`, {
    method: 'DELETE',
  });
}

export async function removeCircleMember(
  circleId: string,
  memberUserId: string
): Promise<void> {
  await authenticatedRequest<void>(`/circles/${circleId}/members/${memberUserId}`, {
    method: 'DELETE',
  });
}

export async function deleteCircle(circleId: string): Promise<void> {
  await authenticatedRequest<void>(`/circles/${circleId}`, {
    method: 'DELETE',
  });
}
