import axios from 'axios';

// Empty baseURL uses Vite proxy (/api -> http://localhost:8082)
const axiosClient = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to ALWAYS attach Authorization header with Bearer token
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('tally_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to catch 403 Forbidden / 401 Unauthorized
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 403) {
        return Promise.reject(
          new Error('Access Forbidden (403): Backend requires valid JWT authorization. Please log in with valid credentials.')
        );
      }
      if (status === 401) {
        return Promise.reject(
          new Error('Unauthorized (401): Invalid or expired JWT token. Please sign in again.')
        );
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
