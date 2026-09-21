import axiosClient from './axiosClient';

export async function getAllUsersApi() {
  try {
    const response = await axiosClient.get('/api/user/lookup/all');
    return response.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || 'Failed to fetch users.');
  }
}

export async function getUserByIdApi(userId) {
  try {
    const response = await axiosClient.get(`/api/user/${userId}/lookup`);
    return response.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || 'User not found.');
  }
}

export async function updateUserApi(userId, data) {
  try {
    const response = await axiosClient.put(`/api/user/${userId}/update/allfields`, data);
    return response.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || 'Failed to update user.');
  }
}
