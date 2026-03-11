import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

export const appointmentAPI = {
  getAll: (params) => api.get('/appointments', { params }),
  getById: (id) => api.get(`/appointments/${id}`),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  verifyPayment: (data) => api.post('/appointments/verify-payment', data),
  getToday: () => api.get('/appointments/today'),
  getSlots: (doctorId, date) => api.get(`/appointments/slots/${doctorId}/${date}`),
};

export const doctorAPI = {
  getAll: () => api.get('/doctors'),
  getById: (id) => api.get(`/doctors/${id}`),
};

export const patientAPI = {
  getAll: (params) => api.get('/patients', { params }),
  getById: (id) => api.get(`/patients/${id}`),
  update: (id, data) => api.put(`/patients/${id}`, data),
  getAnalytics: () => api.get('/patients/analytics'),
};

export const moodAPI = {
  getEntries: (days) => api.get('/mood', { params: { days } }),
  create: (data) => api.post('/mood', data),
  delete: (id) => api.delete(`/mood/${id}`),
};

export const messageAPI = {
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (userId, params) => api.get(`/messages/${userId}`, { params }),
  send: (data) => api.post('/messages', data),
  markAsRead: (senderId) => api.put(`/messages/read/${senderId}`),
};

export const sessionAPI = {
  createNote: (data) => api.post('/sessions/notes', data),
  getNotes: (patientId) => api.get(`/sessions/notes/${patientId}`),
  updateNote: (id, data) => api.put(`/sessions/notes/${id}`, data),
  getTemplates: () => api.get('/sessions/questionnaires'),
  createTemplate: (data) => api.post('/sessions/questionnaires', data),
  updateTemplate: (id, data) => api.put(`/sessions/questionnaires/${id}`, data),
  deleteTemplate: (id) => api.delete(`/sessions/questionnaires/${id}`),
  submitResponse: (data) => api.post('/sessions/questionnaires/respond', data),
  getResponses: (appointmentId) => api.get(`/sessions/questionnaires/responses/${appointmentId}`),
  getByDisease: (diseaseName) => api.get(`/sessions/questionnaires/by-disease/${encodeURIComponent(diseaseName)}`),
  getDiseases: () => api.get('/sessions/questionnaires/diseases'),
  getSessionDetail: (appointmentId) => api.get(`/sessions/detail/${appointmentId}`),
  // ✅ NEW: fetches all sessions with notes + questionnaire responses for logged-in patient
  getMyHistory: () => api.get('/sessions/my-history'),
};

export const uploadAPI = {
  uploadImage: (formData) => api.post('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

export default api;