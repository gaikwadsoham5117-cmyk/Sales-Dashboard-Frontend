import axiosClient from './axiosClient';

export async function getAllUsersApi(organizationId) {
  try {
    const endpoint = organizationId
      ? `/api/lookup/user/${organizationId}/organizations`
      : '/api/user/lookup/all';
    const response = await axiosClient.get(endpoint);
    return response.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || 'Failed to fetch users.');
  }
}

export async function getUsersByOrganizationApi(organizationId) {
  try {
    if (!organizationId) {
      throw new Error('Organization ID is required to fetch users.');
    }
    const response = await axiosClient.get(`/api/lookup/user/${organizationId}/organizations`);
    return response.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message || 'Failed to fetch users for organization.');
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
