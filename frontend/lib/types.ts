export type Profile = {
  id: string;
  display_name: string | null;
  phone: string | null;
  push_token: string | null;
  location_geohash: string | null;
  location_updated_at: string | null;
  created_at: string;
};

export type Circle = {
  id: string;
  name: string;
  created_by: string;
  invite_code: string;
  created_at: string;
};

export type CircleMember = {
  circle_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
};

export type Alert = {
  id: string;
  sender_id: string;
  latitude: number;
  longitude: number;
  geohash: string;
  status: 'active' | 'resolved' | 'cancelled';
  expand_to_nearby: boolean;
  created_at: string;
  resolved_at: string | null;
};

export type AlertResponse = {
  alert_id: string;
  responder_id: string;
  status: 'acknowledged' | 'en_route' | 'arrived';
  responded_at: string;
};

export type AlertMessage = {
  id: string;
  alert_id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

export type AuthUser = {
  id: string;
  phone: string | null;
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: AuthUser;
};

export type AuthChangeEvent =
  | 'INITIAL_SESSION'
  | 'SIGNED_IN'
  | 'TOKEN_REFRESHED'
  | 'SIGNED_OUT';
