import { User, DeviceState, DeviceLocation, LoginEntry, AuditLog, RemoteCommand, UserMetadata } from '../types';

export const STORAGE_KEY = 'SAFE_MOBILE_LOCAL_VAULT_V3';
const HISTORY_LIMIT = 1000;
const DB_VERSION = '3.5.0';

export class VaultError extends Error {
  constructor(public message: string, public code?: string) {
    super(message);
    this.name = 'VaultError';
  }
}

interface DB {
  version: string;
  users: User[];
  auditLogs: AuditLog[];
  currentUser: User | null;
  systemHealth: 'OPTIMAL' | 'SECURE';
  lastLocalSync: number;
}

const hashPassword = (password: string): string => {
  const salt = "LOCAL_ONLY_SAFE_SALT_2025";
  const salted = password + salt;
  return btoa(salted.split('').map((char, i) => 
    String.fromCharCode(char.charCodeAt(0) ^ (i % 17))
  ).join(''));
};

const initialDB: DB = {
  version: DB_VERSION,
  users: [
    {
      id: 'LOCAL-ADMIN',
      email: 'admin@local.safe',
      password: hashPassword('admin123'),
      role: 'ADMIN',
      devices: [],
      isBlocked: false,
      isEmailVerified: true,
      createdAt: Date.now(),
      lastLogin: Date.now(),
      loginHistory: [{ timestamp: Date.now(), status: 'SUCCESS', userAgent: 'Local Admin Node' }],
      metadata: { 
        accountStatus: 'ACTIVE', 
        primaryDeviceOS: 'Internal',
        totalCommandsIssued: 0,
        lastKnownCity: 'Local Vault'
      }
    }
  ],
  auditLogs: [],
  currentUser: null,
  systemHealth: 'OPTIMAL',
  lastLocalSync: Date.now()
};

export const dbService = {
  getRawDB: (): DB => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return initialDB;
      return JSON.parse(data) as DB;
    } catch (e) {
      return initialDB;
    }
  },

  saveDB: (db: DB) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      db.lastLocalSync = Date.now();
    } catch (e) {
      throw new VaultError("Local storage quota exceeded.", "QUOTA_EXCEEDED");
    }
  },

  authenticate: async (email: string, pass: string): Promise<User | null> => {
    const db = dbService.getRawDB();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) throw new VaultError("Local identity record not found.", "AUTH_NOT_FOUND");
    if (user.isBlocked) throw new VaultError("Identity administratively neutralized.", "AUTH_BLOCKED");

    const hashed = hashPassword(pass);
    const success = user.password === hashed;
    
    const entry: LoginEntry = { 
      timestamp: Date.now(), 
      status: success ? 'SUCCESS' : 'FAILED',
      userAgent: navigator.userAgent
    };

    user.loginHistory.unshift(entry);
    if (success) {
      user.lastLogin = entry.timestamp;
      db.currentUser = user;
      dbService.saveDB(db);
      return user;
    } else {
      dbService.saveDB(db);
      throw new VaultError("Invalid credentials.", "AUTH_WRONG_PASS");
    }
  },

  getCurrentUser: async (): Promise<User | null> => dbService.getRawDB().currentUser,

  setCurrentUser: async (user: User | null) => {
    const db = dbService.getRawDB();
    db.currentUser = user;
    dbService.saveDB(db);
  },

  addUser: async (user: User): Promise<void> => {
    const db = dbService.getRawDB();
    if (db.users.some(u => u.email.toLowerCase() === user.email.toLowerCase())) {
      throw new VaultError("Identity already exists in local vault.", "USER_EXISTS");
    }
    if (user.password) user.password = hashPassword(user.password);
    db.users.push(user);
    dbService.saveDB(db);
  },

  updateDevice: async (userId: string, device: DeviceState): Promise<void> => {
    const db = dbService.getRawDB();
    const user = db.users.find(u => u.id === userId);
    if (!user) return;
    
    const devIdx = user.devices.findIndex(d => d.id === device.id);
    if (devIdx !== -1) {
      user.devices[devIdx] = { ...device };
    } else {
      user.devices.push(device);
    }
    
    if (db.currentUser?.id === userId) db.currentUser = user;
    dbService.saveDB(db);
  },

  // Added fix: Implementation for updating user metadata
  updateUserMetadata: async (userId: string, metadata: Partial<UserMetadata>): Promise<void> => {
    const db = dbService.getRawDB();
    const userIdx = db.users.findIndex(u => u.id === userId);
    if (userIdx === -1) return;
    
    db.users[userIdx].metadata = { ...db.users[userIdx].metadata, ...metadata };
    if (db.currentUser?.id === userId) db.currentUser = db.users[userIdx];
    dbService.saveDB(db);
  },

  // Added fix: Implementation for updating user (admin action)
  updateUser: async (updatedUser: User, actor: User): Promise<void> => {
    const db = dbService.getRawDB();
    const idx = db.users.findIndex(u => u.id === updatedUser.id);
    if (idx === -1) return;
    
    const oldUser = db.users[idx];
    const action: AuditLog['action'] = updatedUser.isBlocked !== oldUser.isBlocked 
      ? (updatedUser.isBlocked ? 'USER_BLOCK' : 'USER_UNBLOCK')
      : 'SYSTEM_CONFIG_CHANGE';

    db.users[idx] = updatedUser;
    
    const log: AuditLog = {
      id: Math.random().toString(36).substring(7).toUpperCase(),
      timestamp: Date.now(),
      actorId: actor.id,
      actorEmail: actor.email,
      action,
      targetId: updatedUser.id,
      severity: 'MEDIUM'
    };
    db.auditLogs.unshift(log);

    if (db.currentUser?.id === updatedUser.id) db.currentUser = updatedUser;
    dbService.saveDB(db);
  },

  // Added fix: Implementation for deleting user (admin action)
  deleteUser: async (userId: string, actor: User): Promise<void> => {
    const db = dbService.getRawDB();
    const user = db.users.find(u => u.id === userId);
    if (!user) return;

    db.users = db.users.filter(u => u.id !== userId);
    
    const log: AuditLog = {
      id: Math.random().toString(36).substring(7).toUpperCase(),
      timestamp: Date.now(),
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'USER_DELETE',
      targetId: userId,
      severity: 'HIGH'
    };
    db.auditLogs.unshift(log);

    if (db.currentUser?.id === userId) db.currentUser = null;
    dbService.saveDB(db);
  },

  // Added fix: Implementation for database export
  exportDatabase: (actor: User): void => {
    const db = dbService.getRawDB();
    const dataStr = JSON.stringify(db, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `safe-mobile-export-${Date.now()}.json`;
    link.click();
    
    const log: AuditLog = {
      id: Math.random().toString(36).substring(7).toUpperCase(),
      timestamp: Date.now(),
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'DB_EXPORT',
      severity: 'CRITICAL'
    };
    db.auditLogs.unshift(log);
    dbService.saveDB(db);
  },

  getAllUsers: async (): Promise<User[]> => dbService.getRawDB().users,
  getAuditLogs: async (): Promise<AuditLog[]> => dbService.getRawDB().auditLogs,
  
  getGlobalTelemetry: () => {
    const db = dbService.getRawDB();
    const allDevices = db.users.flatMap(u => u.devices.map(d => ({ ...d, ownerEmail: u.email })));
    return {
      totalUsers: db.users.length,
      activeDevices: allDevices.filter(d => Date.now() - d.lastActive < 300000).length,
      lockedDevices: allDevices.filter(d => d.isLocked).length,
      allDevices,
      lastSync: db.lastLocalSync
    };
  }
};