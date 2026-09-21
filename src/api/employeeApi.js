import axiosClient from './axiosClient';

export async function createEmployeeApi(data) {
  try {
    const response = await axiosClient.post('/api/owner/employees', data);
    return response.data;
  } catch (err) {
    const raw = err.response?.data?.message || err.response?.data || err.message || '';
    // Detect subscription limit errors and show user-friendly message
    const msg = typeof raw === 'string' ? raw : 'Failed to create employee.';
    if (
      msg.toLowerCase().includes('limit') ||
      msg.toLowerCase().includes('max') ||
      msg.toLowerCase().includes('subscription')
    ) {
      throw new Error('Your current subscription has reached its maximum user limit.');
    }
    throw new Error(msg);
  }
}
