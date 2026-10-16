/**
 * configService.ts - Menggunakan REST API backend (MySQL) menggantikan Firestore
 */
import api from './api';
import { AppConfig } from '../types';

export const configService = {
  async getConfig(): Promise<AppConfig | null> {
    try {
      return await api.get<AppConfig>('/config');
    } catch {
      return null;
    }
  },

  async updateConfig(config: AppConfig): Promise<void> {
    await api.put('/config', config);
  }
};
