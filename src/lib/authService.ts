/**
 * authService.ts - Layanan autentikasi via REST API (menggantikan Firebase Auth)
 */
import api from './api';
import { User } from '../types';

interface AuthResponse {
  token: string;
  user: User;
}

export const authService = {
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const data = await api.post<AuthResponse>('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    return data;
  },

  async register(payload: {
    email: string;
    password: string;
    name: string;
    nik?: string;
    noKK?: string;
    alamat?: string;
    noHp?: string;
    tempatLahir?: string;
    tglLahir?: string;
    jenisKelamin?: string;
    agama?: string;
    statusPernikahan?: string;
    pekerjaan?: string;
  }): Promise<{ token: string; user: User }> {
    const data = await api.post<AuthResponse>('/auth/register', payload);
    localStorage.setItem('token', data.token);
    return data;
  },

  async getMe(): Promise<User | null> {
    try {
      return await api.get<User>('/auth/me');
    } catch {
      return null;
    }
  },

  async updateProfile(payload: Partial<User>): Promise<void> {
    await api.put('/auth/profile', payload);
  },

  logout() {
    localStorage.removeItem('token');
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }
};
