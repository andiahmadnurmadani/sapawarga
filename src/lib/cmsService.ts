/**
 * cmsService.ts - Menggunakan REST API backend (MySQL) menggantikan Firestore
 */
import api from './api';
import { CMSHero, CMSVision, CMSGalleryItem, CMSTestimonial, InfoRT } from '../types';

export const cmsService = {
  // Hero - polling sederhana (tidak ada realtime seperti Firestore)
  subscribeHero(callback: (data: CMSHero | null) => void) {
    api.get<CMSHero>('/cms/hero').then(callback).catch(() => callback(null));
    // Return dummy unsubscribe function
    return () => {};
  },

  async getHero(): Promise<CMSHero | null> {
    try { return await api.get<CMSHero>('/cms/hero'); } catch { return null; }
  },

  async updateHero(data: CMSHero): Promise<void> {
    await api.put('/cms/hero', data);
  },

  // Vision
  subscribeVision(callback: (data: CMSVision | null) => void) {
    api.get<CMSVision>('/cms/vision').then(callback).catch(() => callback(null));
    return () => {};
  },

  async getVision(): Promise<CMSVision | null> {
    try { return await api.get<CMSVision>('/cms/vision'); } catch { return null; }
  },

  async updateVision(data: CMSVision): Promise<void> {
    await api.put('/cms/vision', data);
  },

  // Gallery
  subscribeGallery(callback: (items: CMSGalleryItem[]) => void) {
    api.get<CMSGalleryItem[]>('/cms/gallery').then(callback).catch(() => callback([]));
    return () => {};
  },

  async getGallery(): Promise<CMSGalleryItem[]> {
    try { return await api.get<CMSGalleryItem[]>('/cms/gallery'); } catch { return []; }
  },

  async addGalleryItem(item: Omit<CMSGalleryItem, 'id'>): Promise<string | undefined> {
    const res = await api.post<{ id: string }>('/cms/gallery', item);
    return res.id;
  },

  async updateGalleryItem(id: string, item: Partial<CMSGalleryItem>): Promise<void> {
    await api.put(`/cms/gallery/${id}`, item);
  },

  async deleteGalleryItem(id: string): Promise<void> {
    await api.delete(`/cms/gallery/${id}`);
  },

  // Testimonials
  subscribeTestimonials(callback: (items: CMSTestimonial[]) => void) {
    api.get<CMSTestimonial[]>('/cms/testimonials').then(callback).catch(() => callback([]));
    return () => {};
  },

  async getTestimonials(): Promise<CMSTestimonial[]> {
    try { return await api.get<CMSTestimonial[]>('/cms/testimonials'); } catch { return []; }
  },

  async addTestimonial(item: Omit<CMSTestimonial, 'id'>): Promise<string | undefined> {
    const res = await api.post<{ id: string }>('/cms/testimonials', item);
    return res.id;
  },

  async deleteTestimonial(id: string): Promise<void> {
    await api.delete(`/cms/testimonials/${id}`);
  },

  // Info RT
  subscribeInfo(callback: (items: InfoRT[]) => void) {
    api.get<InfoRT[]>('/info').then(callback).catch(() => callback([]));
    return () => {};
  },

  async getInfo(): Promise<InfoRT[]> {
    try { return await api.get<InfoRT[]>('/info'); } catch { return []; }
  },

  async saveInfo(info: Omit<InfoRT, 'id'>): Promise<string | undefined> {
    const res = await api.post<{ id: string }>('/info', info);
    return res.id;
  },

  async updateInfo(id: string, info: Partial<InfoRT>): Promise<void> {
    await api.put(`/info/${id}`, info);
  },

  async deleteInfo(id: string): Promise<void> {
    await api.delete(`/info/${id}`);
  },

  // CMS Content sections (stats, features, steps, cta, problem_solution)
  async getContent<T = unknown>(section: string): Promise<T | null> {
    try { return await api.get<T>(`/cms/content/${section}`); } catch { return null; }
  },

  async getAllContent(): Promise<Record<string, unknown>> {
    try { return await api.get<Record<string, unknown>>('/cms/content'); } catch { return {}; }
  },

  async updateContent(section: string, data: unknown): Promise<void> {
    await api.put(`/cms/content/${section}`, { data });
  },

  // User sync (no-op, handled by backend)
  async syncUser(_user: unknown): Promise<void> {}
};
