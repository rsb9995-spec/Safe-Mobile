import { DeviceLocation, RemoteCommand, User } from '../types';

const API_BASE = '/api'; // Maps to your PHP backend folder

export const apiService = {
  login: async (email: string, pass: string) => {
    const res = await fetch(`${API_BASE}/login.php`, {
      method: 'POST',
      body: JSON.stringify({ email, password: pass })
    });
    return res.json();
  },

  getLatestLocation: async (token: string): Promise<DeviceLocation | null> => {
    const res = await fetch(`${API_BASE}/get_location.php?token=${token}`);
    const data = await res.json();
    if (data.status === 'success') {
      return {
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lng),
        accuracy: parseFloat(data.accuracy),
        timestamp: parseInt(data.timestamp),
        speed: parseFloat(data.speed),
        batteryLevel: parseInt(data.battery)
      };
    }
    return null;
  },

  sendCommand: async (token: string, command: string) => {
    const res = await fetch(`${API_BASE}/send_command.php`, {
      method: 'POST',
      body: JSON.stringify({ token, command })
    });
    return res.json();
  }
};