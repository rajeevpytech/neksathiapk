export type NotifyPrefs = {
  whatsapp: boolean;
  email: boolean;
  push: boolean;
  incident_alerts: boolean;
  speed_alerts: boolean;
  marketing: boolean;
  ringtone: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  is_admin: boolean;
  is_dealer: boolean;
  is_org: boolean;
  notify_prefs: NotifyPrefs;
  avatar_base64: string | null;
};

export type EmergencyContact = {
  id: string;
  name: string;
  phone: string;
  relation: string | null;
  is_primary: boolean;
  created_at: string;
};

export type SosEvent = {
  id: string;
  latitude: number | null;
  longitude: number | null;
  message: string | null;
  notified: number;
  channels: string[];
  has_photo: boolean;
  acknowledged: boolean;
  escalated: boolean;
  created_at: string;
};

export type SafeZone = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_m: number;
  notify: boolean;
  last_inside: boolean | null;
  created_at: string;
};

export type LiveShare = {
  id: string;
  token: string;
  label: string | null;
  active: boolean;
  expires_at: string;
  created_at: string;
};

export type Vehicle = {
  id: string;
  owner_id: string;
  number_plate: string;
  vehicle_type: string;
  make_model: string | null;
  color: string | null;
  photo_base64: string | null;
  qr_id: string;
  speed_limit_kmh: number;
  lost_mode: boolean;
  created_at: string;
};

export type VehicleContact = {
  id: string;
  name: string;
  phone: string;
};

export type TrackPoint = {
  latitude: number;
  longitude: number;
  speed_kmh?: number;
  heading?: number;
  created_at: string;
};

export type Alert = {
  id: string;
  type?: string;
  title?: string;
  message?: string;
  action_url?: string;
  created_at: string;
  [k: string]: any;
};

export type FamilyMember = {
  member_id: string;
  user_id: string;
  name: string;
  role: string;
  is_me: boolean;
  share_location: boolean;
  share_activity: boolean;
  latitude: number | null;
  longitude: number | null;
  battery: number | null;
  last_seen: string | null;
};

export type Family = {
  in_family: boolean;
  id?: string;
  name?: string;
  is_guardian?: boolean;
  invite_code?: string;
  max_members?: number;
  members?: FamilyMember[];
};

export type Device = {
  id: string;
  name: string;
  platform: string;
  lock_threshold?: number;
  super_admin_alerts?: boolean;
  locked?: boolean;
  siren_active?: boolean;
  created_at?: string;
};
