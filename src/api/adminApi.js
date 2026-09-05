import axiosClient from './axiosClient';

export async function getAllUsersApi() {
  try {
    const response = await axiosClient.get('/api/user/lookup/all');
    return response.data;
  } catch (err) {
    console.error('Backend user lookup failed:', err);
    throw new Error(err.response?.data?.message || err.message || 'Failed to fetch users from backend server.');
  }
}

export async function getUserByIdApi(userId) {
  try {
    const response = await axiosClient.get(`/api/user/lookup/all/users/${userId}`);
    return response.data;
  } catch (err) {
    console.error(`Backend user lookup failed for ID ${userId}:`, err);
    throw new Error(err.response?.data?.message || err.message || 'User not found on backend server.');
  }
}
