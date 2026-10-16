/**
 * API Service - Menghubungkan frontend ke backend Node.js
 * SEMUA data melalui database — tidak ada localStorage
 */

export const API_URL = import.meta.env.VITE_API_URL || 'https://api-hallowarga.kolab.top/api';

/**
 * Cek konektivitas ke backend. Return true jika /api/health respond OK.
 * Timeout 6 detik agar tidak terlalu lama menunggu.
 */
export async function checkApiHealth(timeoutMs: number = 6000): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${API_URL}/health`, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

// Helper untuk request
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request gagal');
  return data;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

// ===== Surat Types API =====
export const suratTypesApi = {
  getAll: () => api.get<import('../types').SuratType[]>('/config/surat-types'),
  create: (data: import('../types').SuratType) => api.post<{ message: string }>('/config/surat-types', data),
  update: (id: string, data: Partial<import('../types').SuratType>) => api.put<{ message: string }>(`/config/surat-types/${id}`, data),
  remove: (id: string) => api.delete<{ message: string }>(`/config/surat-types/${id}`),
};

// ===== Users API =====
export const usersApi = {
  getAll: () => api.get<import('../types').User[]>('/users'),
  getById: (id: string) => api.get<import('../types').User>(`/users/${id}`),
  create: (data: Partial<import('../types').User>) => api.post<{ id: string; message: string }>('/users', data),
  update: (id: string, data: Partial<import('../types').User>) => api.put<{ message: string }>(`/users/${id}`, data),
  remove: (id: string) => api.delete<{ message: string }>(`/users/${id}`),
  resetPassword: (id: string, password: string) => api.put<{ message: string }>(`/users/${id}/reset-password`, { password }),
};

// ===== Pengajuan Surat API =====
export const suratApi = {
  getAll: () => api.get<import('../types').PengajuanSurat[]>('/surat'),
  create: (data: { typeId: string; typeName: string; keterangan?: string; data?: Record<string, string>; blocks?: any[] }) =>
    api.post<{ id: string; message: string }>('/surat', data),
  updateStatus: (id: string, data: { status: string; rejectionReason?: string; suratContent?: string; pdfUrl?: string; blocks?: any[] }) =>
    api.put<{ message: string }>(`/surat/${id}/status`, data),
  remove: (id: string) => api.delete<{ message: string }>(`/surat/${id}`),
};

// ===== Inventory API =====
export const inventoryApi = {
  getAll: () => api.get<import('../types').Inventory[]>('/admin/inventory'),
  create: (data: Partial<import('../types').Inventory>) => api.post<{ id: string }>('/admin/inventory', data),
  update: (id: string, data: Partial<import('../types').Inventory>) => api.put<{ message: string }>(`/admin/inventory/${id}`, data),
  remove: (id: string) => api.delete<{ message: string }>(`/admin/inventory/${id}`),
};

// ===== Incident Log API =====
export const incidentApi = {
  getAll: () => api.get<import('../types').IncidentLog[]>('/admin/incidents'),
  create: (data: Partial<import('../types').IncidentLog>) => api.post<{ id: string }>('/admin/incidents', data),
  update: (id: string, data: Partial<import('../types').IncidentLog>) => api.put<{ message: string }>(`/admin/incidents/${id}`, data),
  remove: (id: string) => api.delete<{ message: string }>(`/admin/incidents/${id}`),
};

// ===== Reports API =====
export const reportsApi = {
  getAll: () => api.get<import('../types').WargaReport[]>('/admin/reports'),
  getPublic: () => api.get<import('../types').WargaReport[]>('/admin/reports/public'),
  create: (data: { title: string; content: string; type: string; isPublic: boolean; imageUrl?: string }) =>
    api.post<{ id: string }>('/admin/reports', data),
  update: (id: string, data: { title?: string; content?: string; type?: string; isPublic?: boolean; imageUrl?: string; status?: string }) =>
    api.put<{ message: string }>(`/admin/reports/${id}`, data),
  updateStatus: (id: string, status: string) => api.put<{ message: string }>(`/admin/reports/${id}`, { status }),
  updateVisibility: (id: string, isPublic: boolean) => api.put<{ message: string }>(`/admin/reports/${id}`, { isPublic }),
  remove: (id: string) => api.delete<{ message: string }>(`/admin/reports/${id}`),
};

// ===== Temp Residents API =====
export const tempResidentsApi = {
  getAll: () => api.get<import('../types').TempResident[]>('/admin/temp-residents'),
  create: (data: Partial<import('../types').TempResident>) => api.post<{ id: string }>('/admin/temp-residents', data),
  update: (id: string, data: Partial<import('../types').TempResident>) => api.put<{ message: string }>(`/admin/temp-residents/${id}`, data),
  remove: (id: string) => api.delete<{ message: string }>(`/admin/temp-residents/${id}`),
};

// ===== Notifications API =====
export const notifApi = {
  getAll: () => api.get<import('../types').AppNotification[]>('/config/notifications'),
  create: (data: { userId: string; title: string; message: string; type: string; relatedId?: string }) =>
    api.post<{ id: string }>('/config/notifications', data),
  markRead: (id: string) => api.put<{ message: string }>(`/config/notifications/${id}/read`, {}),
  markAllRead: () => api.put<{ message: string }>('/config/notifications/read-all', {}),
};

// ===== Config API =====
export const configApi = {
  get: () => api.get<import('../types').AppConfig>('/config'),
  update: (data: Partial<import('../types').AppConfig>) => api.put<{ message: string }>('/config', data),
};

// ===== Iuran API =====
export const iuranApi = {
  getConfig: () => api.get<import('../types').IuranConfig>('/iuran/config'),
  updateConfig: (data: Partial<import('../types').IuranConfig>) => api.put<{ message: string }>('/iuran/config', data),
  listPayments: () => api.get<import('../types').IuranPayment[]>('/iuran/payments'),
  createPayment: (data: {
    periodType: import('../types').IuranPeriodType;
    year: number;
    startMonth: number;
    endMonth: number;
    months?: number[];
    proofUrl: string;
    notes?: string;
  }) => api.post<{ id: string; total: number; months: number[]; message: string }>('/iuran/payments', data),
  updatePaymentStatus: (id: string, data: { status: import('../types').IuranPaymentStatus; rejectionReason?: string }) =>
    api.put<{ message: string }>(`/iuran/payments/${id}/status`, data),
  removePayment: (id: string) => api.delete<{ message: string }>(`/iuran/payments/${id}`),
  getSummary: (year: number) => api.get<import('../types').IuranSummary>(`/iuran/summary?year=${year}`),
};

export default api;
