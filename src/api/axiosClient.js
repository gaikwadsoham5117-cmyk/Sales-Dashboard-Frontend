import axios from 'axios';

// Local development:
// Uses Vite proxy for /api requests.
//
// Production:
// Directly calls the deployed Spring Boot backend.
const API_BASE_URL = import.meta.env.DEV
  ? ''
  : 'https://sales-dashboard-backend-lo96.onrender.com';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Attach JWT token
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

// Handle authentication errors
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;

      if (status === 403) {
        return Promise.reject(
          new Error(
            'Access Forbidden (403): Backend requires valid JWT authorization. Please log in with valid credentials.'
          )
        );
      }

      if (status === 401) {
        return Promise.reject(
          new Error(
            'Unauthorized (401): Invalid or expired JWT token. Please sign in again.'
          )
        );
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;