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
  timeout: 15000,
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

      if (status === 401) {
        // Clear auth state and redirect to login
        localStorage.removeItem('tally_auth_token');
        localStorage.removeItem('tally_auth_role');
        localStorage.removeItem('tally_auth_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(
          new Error('Your session has expired. Please log in again.')
        );
      }

      if (status === 403) {
        return Promise.reject(
          new Error('You do not have permission to perform this action.')
        );
      }
    }

    if (!error.response) {
      return Promise.reject(
        new Error('Unable to connect to the server. Please try again.')
      );
    }

    return Promise.reject(error);
  }
);

export default axiosClient;