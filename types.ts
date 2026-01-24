
export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export interface DeviceLocation {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  batteryLevel?: number;
  networkType?: string;
}

export interface LoginEntry {
  timestamp: number;
  ip?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILED';
  location?: { city?: string; country?: string };
}

export interface AuditLog {
  id: string;
  timestamp: number;
  actorId: string;
  actorEmail: string;
  action: 'USER_BLOCK' | 'USER_UNBLOCK' | 'USER_DELETE' | 'REMOTE_WIPE' | 'REMOTE_LOCK' | 'DB_EXPORT' | 'LOGIN_ATTEMPT' | 'IDENTITY_INSPECT' | 'SYSTEM_CONFIG_CHANGE' | 'SECURITY_PULSE';
  targetId?: string;
  details?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface RemoteCommand {
  id: string;
  type: 'LOCK' | 'UNLOCK' | 'SIREN' | 'WIPE' | 'MSG';
  payload?: string;
  timestamp: number;
  isExecuted: boolean;
  executedAt?: number;
}

export interface DeviceState {
  id: string;
  name: string;
  model: string;
  os: string;
  isLocked: boolean;
  isSilent: boolean;
  isPoweredOff: boolean;
  isAlarming: boolean;
  lastLocation?: DeviceLocation;
  locationHistory: DeviceLocation[];
  batteryLevel: number;
  lastActive: number;
  speed: number;
  phoneNumber: string;
  pendingCommands: RemoteCommand[];
  networkStatus: 'wifi' | 'cellular' | 'none';
  imei?: string;
  firmwareVersion?: string;
}

export interface UserMetadata {
  registrationIP?: string;
  primaryDeviceOS?: string;
  lastKnownCity?: string;
  accountStatus: 'ACTIVE' | 'FLAGGED' | 'NEUTRALIZED';
  lastSecurityReview?: number;
  totalCommandsIssued: number;
}

export interface User {
  id: string;
  email: string;
  password?: string;
  role: UserRole;
  devices: DeviceState[];
  isBlocked: boolean;
  isEmailVerified: boolean;
  createdAt: number;
  lastLogin?: number;
  loginHistory: LoginEntry[];
  metadata: UserMetadata;
}

export type ViewState = 
  | 'SPLASH' 
  | 'LANDING'
  | 'LOGIN' 
  | 'REGISTER' 
  | 'VERIFY_EMAIL'
  | 'PERMISSIONS' 
  | 'DASHBOARD' 
  | 'TRACKING' 
  | 'HELP'
  | 'ADMIN_LOGIN' 
  | 'ADMIN_DASHBOARD'
  | 'ADMIN_PAYMENTS'
  | 'ADMIN_SETTINGS';
