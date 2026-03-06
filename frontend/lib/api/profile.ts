import { Profile } from '@/lib/types';

import { authenticatedRequest } from './auth';
import { ApiError } from './http';

type ProfilePatch = Partial<
  Pick<Profile, 'display_name' | 'push_token' | 'location_geohash' | 'location_updated_at'>
>;

export async function getMyProfile(): Promise<Profile | null> {
  try {
    return await authenticatedRequest<Profile>('/me/profile');
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function updateMyProfile(patch: ProfilePatch): Promise<Profile> {
  return authenticatedRequest<Profile>('/me/profile', {
    method: 'PATCH',
    body: patch,
  });
}

export async function updateMyLocation(
  latitude: number,
  longitude: number
): Promise<Profile> {
  return authenticatedRequest<Profile>('/me/location', {
    method: 'PUT',
    body: {
      latitude,
      longitude,
    },
  });
}
