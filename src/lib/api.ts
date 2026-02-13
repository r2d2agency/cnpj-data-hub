const API_BASE = '/api/v1';

function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string) {
  localStorage.setItem('token', token);
}

export function clearToken() {
  localStorage.removeItem('token');
}

export function getStoredUser(): { id: string; name: string; email: string; role: string } | null {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export function setStoredUser(user: { id: string; name: string; email: string; role: string }) {
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearStoredUser() {
  localStorage.removeItem('user');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    clearStoredUser();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error || 'Request failed');
  }

  return res.json();
}

// Auth
export async function login(email: string, password: string) {
  const data = await request<{ token: string; user: { id: string; name: string; email: string; role: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  setStoredUser(data.user);
  return data;
}

// Users CRUD
export function fetchUsers() {
  return request<{ data: any[] }>('/users').then(r => r.data);
}

export function createUser(data: { name: string; email: string; password: string; role: string; max_concurrent_queries: number }) {
  return request<any>('/users', { method: 'POST', body: JSON.stringify(data) });
}

export function updateUser(id: string, data: { name?: string; email?: string; role?: string; status?: string; max_concurrent_queries?: number }) {
  return request<any>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function changeUserPassword(id: string, password: string) {
  return request<any>(`/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ password }) });
}

export function deleteUser(id: string) {
  return request<any>(`/users/${id}`, { method: 'DELETE' });
}

// Dashboard
export function fetchDashboardStats() {
  return request<any>('/ingestion/stats');
}

// Credentials
export function fetchCredentials() {
  return request<{ data: any[] }>('/credentials').then(r => r.data);
}

export function createCredential(data: { user_id: string; system_name: string; permissions: string[]; rate_limit: number }) {
  return request<any>('/credentials', { method: 'POST', body: JSON.stringify(data) });
}

export function revokeCredential(id: string) {
  return request<any>(`/credentials/${id}/revoke`, { method: 'PUT' });
}

export function regenerateCredential(id: string) {
  return request<any>(`/credentials/${id}/regenerate`, { method: 'PUT' });
}

// Ingestion
export function fetchIngestionJobs() {
  return request<{ data: any[] }>('/ingestion/jobs').then(r => r.data);
}

export function startIngestion(url: string, month: string) {
  return request<any>('/ingestion/start-from-link', { method: 'POST', body: JSON.stringify({ url, month, skip_completed: true }) });
}

export async function uploadIngestionZip(file: File, fileType: string) {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('file_type', fileType);

  const res = await fetch(`${API_BASE}/ingestion/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(body.error || 'Upload failed');
  }
  return res.json();
}

export function clearIngestionJobs(status?: string) {
  const qs = status ? `?status=${status}` : '';
  return request<any>(`/ingestion/jobs${qs}`, { method: 'DELETE' });
}

// Ingestion Logs
export function fetchIngestionLogs(params?: { job_id?: string; level?: string; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.job_id) qs.set('job_id', params.job_id);
  if (params?.level) qs.set('level', params.level);
  if (params?.limit) qs.set('limit', String(params.limit));
  const q = qs.toString();
  return request<{ data: any[] }>(`/ingestion/logs${q ? `?${q}` : ''}`).then(r => r.data);
}

export function clearIngestionLogs(jobId?: string) {
  const qs = jobId ? `?job_id=${jobId}` : '';
  return request<any>(`/ingestion/logs${qs}`, { method: 'DELETE' });
}

// Search (admin panel - uses JWT)
export function searchEmpresas(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return request<any>(`/search/admin?${qs}`);
}

// Settings
export function fetchSettings() {
  return fetch(`${API_BASE}/settings`).then(r => r.json()).then(r => r.data as Record<string, string>);
}

export function updateSettings(settings: Record<string, string>) {
  return request<any>('/settings', { method: 'PUT', body: JSON.stringify({ settings }) });
}
