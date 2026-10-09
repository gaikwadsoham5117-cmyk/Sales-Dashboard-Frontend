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

export async function changeEmployeeStatusApi(employeeId, enabled) {
  try {
    const response = await axiosClient.put(`/api/employees/${employeeId}/status`, { enabled });
    return response.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Failed to update employee status.';
    throw new Error(msg);
  }
}

export async function deleteEmployeeApi(employeeId) {
  try {
    const response = await axiosClient.delete(`/api/employees/${employeeId}`);
    return response.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Failed to delete employee.';
    throw new Error(msg);
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
    const msg = err.response?.data?.message || err.response?.data || err.message || 'Failed to fetch users.';
    throw new Error(typeof msg === 'string' ? msg : 'Failed to fetch users.');
  }
}
