
export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export interface DeviceLocation {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy: number;
}

export interface LoginEntry {
  timestamp: number;
  ip?: string;
  status: 'SUCCESS' | 'FAILED';
}

export interface RemoteCommand {
  id: string;
  type: 'LOCK' | 'UNLOCK' | 'SIREN' | 'WIPE' | 'MSG';
  payload?: string;
  timestamp: number;
  isExecuted: boolean;
}

export interface DeviceState {
  id: string;
  name: string;
  isLocked: boolean;
  isSilent: boolean;
  isPoweredOff: boolean;
  isAlarming: boolean; // Real-time alarm state
  lastLocation?: DeviceLocation;
  locationHistory: DeviceLocation[];
  batteryLevel: number;
  lastActive: number;
  speed: number;
  phoneNumber: string;
  pendingCommands: RemoteCommand[];
  networkStatus: 'wifi' | 'cellular' | 'none';
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
  | 'ADMIN_LOGIN' 
  | 'ADMIN_DASHBOARD'
  | 'ADMIN_PAYMENTS'
  | 'ADMIN_SETTINGS';
