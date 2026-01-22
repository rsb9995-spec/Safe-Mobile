
import { User, DeviceState, DeviceLocation, LoginEntry } from '../types';

// Exported for visibility in settings/audit screens
export const STORAGE_KEY = 'SAFE_MOBILE_PRO_DB';

interface DB {
  users: User[];
  currentUser: User | null;
}

const hashPassword = (password: string): string => {
  return btoa(password.split('').map((char, i) => 
    String.fromCharCode(char.charCodeAt(0) ^ (i % 10))
  ).join(''));
};

const initialDB: DB = {
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

  getRawDB: (): DB => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return initialDB;
    try {
      const parsed = JSON.parse(data);
      // Data migration/check: Ensure history arrays exist
      parsed.users.forEach((u: User) => {
        if (!u.loginHistory) u.loginHistory = [];
        u.devices?.forEach(d => {
          if (!d.locationHistory) d.locationHistory = [];
        });
      });
      return parsed;
    } catch (e) {
      return initialDB;
    }
  },

  saveDB: (db: DB) => {
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
    
    if (user && user.password === hashPassword(pass)) {
      const loginEntry: LoginEntry = { timestamp: Date.now(), status: 'SUCCESS' };
      user.loginHistory.push(loginEntry);
      user.lastLogin = loginEntry.timestamp;
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
    await dbService.delay();
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
    if (!user.loginHistory) user.loginHistory = [];
    db.users.push(user);
    dbService.saveDB(db);
  },

  updateDevice: async (userId: string, device: DeviceState): Promise<void> => {
    const db = dbService.getRawDB();
    const user = db.users.find(u => u.id === userId);
    if (user) {
      const devIndex = user.devices.findIndex(d => d.id === device.id);
      
      // If we have a new location, push it to history permanently
      if (device.lastLocation) {
        const lastInHistory = device.locationHistory[device.locationHistory.length - 1];
        // Only push if it's different or significant time passed (avoid duplicates)
        if (!lastInHistory || lastInHistory.timestamp !== device.lastLocation.timestamp) {
          device.locationHistory.push(device.lastLocation);
        }
      }

      if (devIndex !== -1) {
        user.devices[devIndex] = device;
      } else {
        user.devices.push(device);
      }
      dbService.saveDB(db);
    }
  },

  getAllUsers: async (): Promise<User[]> => {
    await dbService.delay();
    return dbService.getRawDB().users;
  },

  exportDatabase: () => {
    const db = dbService.getRawDB();
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safe-mobile-vault-backup-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};
