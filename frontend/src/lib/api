const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
}

export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export function getUser(): { role: string; userId: string } | null {
  const t = getToken();
  if (!t) return null;
  try {
    const payload = JSON.parse(atob(t.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) return null;
    return { role: payload.role, userId: payload.sub };
  } catch { return null; }
}

async function request(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const headers: any = { 'Content-Type': 'application/json', ...opts.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...opts, headers });

  if (res.status === 401 && token) {
    const refresh = localStorage.getItem('refreshToken');
    if (refresh) {
      const r2 = await fetch(`${API}/api/auth/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (r2.ok) {
        const data = await r2.json();
        setTokens(data.accessToken, data.refreshToken);
        headers['Authorization'] = `Bearer ${data.accessToken}`;
        return fetch(`${API}${path}`, { ...opts, headers });
      } else {
        clearTokens();
        window.location.href = '/login';
      }
    }
  }
  return res;
}

export const api = {
  get: (path: string) => request(path).then(r => r.json()),
  post: (path: string, body?: any) => request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }).then(r => r.json()),
  put: (path: string, body?: any) => request(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }).then(r => r.json()),
  delete: (path: string) => request(path, { method: 'DELETE' }).then(r => r.json()),
};

// Auth
export const auth = {
  register: (email: string, password: string, role: string, phone?: string) =>
    api.post('/api/auth/register', { email, password, role, phone }),
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  logout: () => {
    const rt = localStorage.getItem('refreshToken');
    clearTokens();
    if (rt) return api.post('/api/auth/logout', { refreshToken: rt });
  },
};

// Listings
export const listings = {
  search: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get(`/api/listings${qs}`);
  },
  get: (id: string) => api.get(`/api/listings/${id}`),
  create: (data: any) => api.post('/api/listings', data),
  update: (id: string, data: any) => api.put(`/api/listings/${id}`, data),
  moderate: (id: string, status: string, reason?: string) => api.post(`/api/listings/${id}/moderate`, { status, reason }),
};

// Profiles
export const profiles = {
  me: () => api.get('/api/profiles/me'),
  create: (data: any) => api.post('/api/profiles', data),
  update: (data: any) => api.put('/api/profiles', data),
  stats: () => api.get('/api/profiles/me/stats'),
  toggleOnline: () => api.post('/api/profiles/me/toggle-online'),
  contact: (profileId: string) => api.post(`/api/profiles/${profileId}/contact`),
};

// Favorites
export const favorites = {
  list: () => api.get('/api/favorites'),
  toggle: (profileId: string) => api.post(`/api/favorites/${profileId}/toggle`),
};

// Payments
export const payments = {
  pricing: () => api.get('/api/payments/pricing'),
  checkout: (promotionType: string) => api.post('/api/payments/checkout', { promotionType }),
  history: () => api.get('/api/payments/history'),
};

// Admin
export const admin = {
  dashboard: () => api.get('/api/admin/dashboard'),
  pendingListings: (page?: number) => api.get(`/api/admin/listings/pending?page=${page || 1}`),
  users: (page?: number, role?: string) => api.get(`/api/admin/users?page=${page || 1}${role ? '&role=' + role : ''}`),
  ban: (id: string, reason: string) => api.post(`/api/admin/users/${id}/ban`, { reason }),
  unban: (id: string) => api.post(`/api/admin/users/${id}/unban`),
  deleteUser: (id: string) => api.delete(`/api/admin/users/${id}`),
  logs: (page?: number) => api.get(`/api/admin/audit-logs?page=${page || 1}`),
  reports: (page?: number) => api.get(`/api/admin/reports?page=${page || 1}`),
  categories: () => api.get('/api/admin/categories'),
  services: () => api.get('/api/admin/services'),
  cities: () => api.get('/api/admin/cities'),
};

// Reports
export const reports = {
  create: (listingId: string, reason: string, description?: string) =>
    api.post('/api/reports', { listingId, reason, description }),
};
