import axiosClient from './axiosClient';

export async function loginApi({ email, password }) {
  try {
    const response = await axiosClient.post('/api/user/login', { email, password });
    return response.data; // { token, role }
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data || err.message || 'Login failed. Please check your credentials or server connectivity.';
    throw typeof msg === 'string' ? msg : 'Login failed. Please check credentials.';
  }
}

export async function registerApi(userData) {
  try {
    const response = await axiosClient.post('/api/user/register', userData);
    return response.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data || err.message || 'Registration failed. Please check details.';
    throw new Error(typeof msg === 'string' ? msg : 'Registration failed.');
  }
}

export async function forgotPasswordApi(email) {
  try {
    const response = await axiosClient.get(`/api/user/forgot-password?email=${encodeURIComponent(email)}`);
    return response.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data || err.message || 'Failed to request reset code.';
    throw new Error(typeof msg === 'string' ? msg : 'Failed to request reset code.');
  }
}

export async function resetPasswordApi(payload) {
  try {
    const response = await axiosClient.post('/api/user/reset-password', payload);
    return response.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data || err.message || 'Password reset failed.';
    throw new Error(typeof msg === 'string' ? msg : 'Password reset failed.');
  }
}
