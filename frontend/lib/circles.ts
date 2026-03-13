import {
  createCircle as createCircleRequest,
  deleteCircle as deleteCircleRequest,
  joinCircle as joinCircleRequest,
  leaveCircle as leaveCircleRequest,
  listCircleMembers,
  listCircles,
  removeCircleMember,
  sendTestAlert as sendTestAlertRequest,
} from '@/lib/api/circles';
import {
  CircleMemberWithProfile,
  CircleWithRole,
} from '@/lib/api/circles';
import { ApiError } from '@/lib/api/http';

export type { CircleMemberWithProfile, CircleWithRole };

function mapCircleError(error: unknown): string {
  if (error instanceof ApiError && error.code) {
    switch (error.code) {
      case 'owner_cannot_leave':
        return 'ownerCannotLeave';
      case 'not_owner':
        return 'notOwner';
      case 'cannot_remove_self':
        return 'cannotRemoveSelf';
      case 'already_member':
        return 'alreadyMember';
      case 'test_alert_rate_limited':
        return 'testAlertRateLimit';
      default:
        return error.code;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'unknown';
}

export async function getCirclesWithRole(_userId: string): Promise<CircleWithRole[]> {
  try {
    return await listCircles();
  } catch {
    return [];
  }
}

export async function getCircleMembers(
  circleId: string
): Promise<CircleMemberWithProfile[]> {
  try {
    return await listCircleMembers(circleId);
  } catch {
    return [];
  }
}

export async function createCircle(
  name: string
): Promise<{ success: boolean; circle?: CircleWithRole; error?: string }> {
  try {
    const circle = await createCircleRequest(name);
    return { success: true, circle };
  } catch (error) {
    return { success: false, error: mapCircleError(error) };
  }
}

export async function joinCircle(
  inviteCode: string
): Promise<{ success: boolean; circle?: CircleWithRole; error?: string }> {
  try {
    const circle = await joinCircleRequest(inviteCode);
    return { success: true, circle };
  } catch (error) {
    return { success: false, error: mapCircleError(error) };
  }
}

export async function leaveCircle(
  circleId: string,
  _userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await leaveCircleRequest(circleId);
    return { success: true };
  } catch (error) {
    return { success: false, error: mapCircleError(error) };
  }
}

export async function removeMember(
  circleId: string,
  memberUserId: string,
  _requestingUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await removeCircleMember(circleId, memberUserId);
    return { success: true };
  } catch (error) {
    return { success: false, error: mapCircleError(error) };
  }
}

export async function deleteCircle(
  circleId: string,
  _userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteCircleRequest(circleId);
    return { success: true };
  } catch (error) {
    return { success: false, error: mapCircleError(error) };
  }
}

export async function sendTestAlert(
  circleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await sendTestAlertRequest(circleId);
    return { success: true };
  } catch (error) {
    return { success: false, error: mapCircleError(error) };
  }
}
