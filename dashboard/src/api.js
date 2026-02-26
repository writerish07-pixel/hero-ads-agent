import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Request interceptor to add JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  register: (data) => api.post('/api/auth/register', data),
};

export const campaignsAPI = {
  list: () => api.get('/api/campaigns'),
  create: (data) => api.post('/api/campaigns', data),
  pause: (id) => api.post(`/api/campaigns/${id}/pause`),
  resume: (id) => api.post(`/api/campaigns/${id}/resume`),
};

export const analyticsAPI = {
  metrics: () => api.get('/api/analytics/metrics'),
  performance: () => api.get('/api/analytics/performance'),
  locations: () => api.get('/api/analytics/locations'),
};

export const keywordsAPI = {
  list: () => api.get('/api/keywords'),
  suggestions: () => api.get('/api/keywords/suggestions'),
  add: (data) => api.post('/api/keywords', data),
  addNegative: (data) => api.post('/api/keywords/negative', data),
};

export const adCreatorAPI = {
  generate: (context) => api.post('/api/ads/generate', context),
};

export const controlsAPI = {
  pauseAll: () => api.post('/api/controls/pause-all'),
  stopAll: () => api.post('/api/controls/stop-all'),
  resumeAll: () => api.post('/api/controls/resume-all'),
};

export default api;
