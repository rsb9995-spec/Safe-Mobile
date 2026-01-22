
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

export interface DeviceState {
  id: string;
  name: string;
  isLocked: boolean;
  isSilent: boolean;
  isPoweredOff: boolean;
  lastLocation?: DeviceLocation;
  locationHistory: DeviceLocation[]; // New: Permanent history storage
  batteryLevel: number;
  lastActive: number;
  speed: number;
  phoneNumber: string;
  speedLimit?: number;
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
  loginHistory: LoginEntry[]; // New: Permanent login records
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
