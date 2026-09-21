import axiosClient from './axiosClient';

export async function registerOwnerApi(data) {
  try {
    const response = await axiosClient.post('/api/owners/register', data);
    return response.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data || err.message || 'Failed to register owner.';
    throw new Error(typeof msg === 'string' ? msg : 'Failed to register owner.');
  }
}
