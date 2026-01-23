
import { User, DeviceState, DeviceLocation, LoginEntry } from '../types';

export const STORAGE_KEY = 'SAFE_MOBILE_PRO_DB';
const HISTORY_LIMIT = 200; // Prevent localStorage quota crashes
const DB_VERSION = '1.2.0';

interface DB {
  version: string;
  users: User[];
  currentUser: User | null;
  lastBackup?: number;
}

const hashPassword = (password: string): string => {
  // Simple XOR with salt for demonstration of "vault" security
  const salt = "SAFE_SALT_2025";
  const salted = password + salt;
  return btoa(salted.split('').map((char, i) => 
    String.fromCharCode(char.charCodeAt(0) ^ (i % 13))
  ).join(''));
};

const initialDB: DB = {
  version: DB_VERSION,
  users: [
    {
      id: 'ADM-001',
      email: 'admin@safe.mobile',
      password: hashPassword('admin'),
      role: 'SUPER_ADMIN',
      devices: [],
      isBlocked: false,
      isEmailVerified: true,
      createdAt: Date.now(),
      lastLogin: Date.now(),
      loginHistory: [{ timestamp: Date.now(), status: 'SUCCESS' }]
    }
  ],
  currentUser: null
};

export const dbService = {
  delay: (ms: number = 400) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Retrieves and migrates the database to current version
   */
  getRawDB: (): DB => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return initialDB;
    try {
      const parsed = JSON.parse(data) as DB;
      
      // Perform Data Pruning/Migration
      let modified = false;
      parsed.users.forEach((u: User) => {
        // Ensure arrays exist
        if (!u.loginHistory) { u.loginHistory = []; modified = true; }
        
        // Cap Login History
        if (u.loginHistory.length > HISTORY_LIMIT) {
          u.loginHistory = u.loginHistory.slice(-HISTORY_LIMIT);
          modified = true;
        }

        u.devices?.forEach(d => {
          if (!d.locationHistory) { d.locationHistory = []; modified = true; }
          // Cap Location History
          if (d.locationHistory.length > HISTORY_LIMIT) {
            d.locationHistory = d.locationHistory.slice(-HISTORY_LIMIT);
            modified = true;
          }
        });
      });

      if (modified) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
      
      return parsed;
    } catch (e) {
      console.error("Critical DB Load Error:", e);
      return initialDB;
    }
  },

  saveDB: (db: DB) => {
    db.version = DB_VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  },

  findUserByEmail: async (email: string): Promise<User | undefined> => {
    await dbService.delay();
    const db = dbService.getRawDB();
    return db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  authenticate: async (email: string, pass: string): Promise<User | null> => {
    await dbService.delay(800);
    const db = dbService.getRawDB();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    const hashed = hashPassword(pass);
    if (user && user.password === hashed) {
      const loginEntry: LoginEntry = { timestamp: Date.now(), status: 'SUCCESS' };
      user.loginHistory.push(loginEntry);
      user.lastLogin = loginEntry.timestamp;
      db.currentUser = user;
      dbService.saveDB(db);
      return user;
    } else if (user) {
      user.loginHistory.push({ timestamp: Date.now(), status: 'FAILED' });
      dbService.saveDB(db);
    }
    return null;
  },

  getCurrentUser: async (): Promise<User | null> => {
    const db = dbService.getRawDB();
    return db.currentUser;
  },

  setCurrentUser: async (user: User | null) => {
    const db = dbService.getRawDB();
    db.currentUser = user;
    dbService.saveDB(db);
  },

  updateUser: async (updatedUser: User): Promise<void> => {
    const db = dbService.getRawDB();
    const index = db.users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      db.users[index] = updatedUser;
      if (db.currentUser?.id === updatedUser.id) {
        db.currentUser = updatedUser;
      }
      dbService.saveDB(db);
    }
  },

  addUser: async (user: User): Promise<void> => {
    await dbService.delay(600);
    const db = dbService.getRawDB();
    if (user.password) {
      user.password = hashPassword(user.password);
    }
    db.users.push(user);
    dbService.saveDB(db);
  },

  updateDevice: async (userId: string, device: DeviceState): Promise<void> => {
    const db = dbService.getRawDB();
    const user = db.users.find(u => u.id === userId);
    if (user) {
      const devIndex = user.devices.findIndex(d => d.id === device.id);
      
      // Permanent History Management
      if (device.lastLocation) {
        if (!device.locationHistory) device.locationHistory = [];
        const lastInHistory = device.locationHistory[device.locationHistory.length - 1];
        
        // Add if significant change or first record
        if (!lastInHistory || (
          lastInHistory.lat !== device.lastLocation.lat || 
          lastInHistory.lng !== device.lastLocation.lng
        )) {
          device.locationHistory.push(device.lastLocation);
          // Prune history if it exceeds limit
          if (device.locationHistory.length > HISTORY_LIMIT) {
            device.locationHistory.shift(); 
          }
        }
      }

      if (devIndex !== -1) {
        user.devices[devIndex] = device;
      } else {
        user.devices.push(device);
      }
      
      // Keep currentUser in sync
      if (db.currentUser?.id === userId) {
        db.currentUser = user;
      }
      
      dbService.saveDB(db);
    }
  },

  getAllUsers: async (): Promise<User[]> => {
    return dbService.getRawDB().users;
  },

  exportDatabase: () => {
    const db = dbService.getRawDB();
    db.lastBackup = Date.now();
    dbService.saveDB(db);
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safe-mobile-vault-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importDatabase: (jsonContent: string): boolean => {
    try {
      const parsed = JSON.parse(jsonContent);
      if (parsed.users && Array.isArray(parsed.users)) {
        localStorage.setItem(STORAGE_KEY, jsonContent);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Import failed:", e);
      return false;
    }
  },

  wipeDatabase: () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }
};
