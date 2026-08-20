import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mapflow_admin_token') || sessionStorage.getItem('mapflow_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('mapflow_admin_token');
      localStorage.removeItem('mapflow_admin_user');
      sessionStorage.removeItem('mapflow_admin_token');
      sessionStorage.removeItem('mapflow_admin_user');
    }
    return Promise.reject(error);
  }
);

export default api;
