import axiosClient from './axiosClient';

export async function getAllOrganizationsApi() {
  try {
    const response = await axiosClient.get('/api/organizations/lookup/all');
    return response.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Failed to fetch organizations.';
    throw new Error(typeof msg === 'string' ? msg : 'Failed to fetch organizations.');
  }
}

export async function getOrganizationByIdApi(id) {
  try {
    const response = await axiosClient.get(`/api/organizations/lookup/${id}`);
    return response.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Organization not found.';
    throw new Error(typeof msg === 'string' ? msg : 'Organization not found.');
  }
}

export async function createOrganizationApi(data) {
  try {
    const response = await axiosClient.post('/api/organizations/create', data);
    return response.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Failed to create organization.';
    throw new Error(typeof msg === 'string' ? msg : 'Failed to create organization.');
  }
}

export async function updateOrganizationApi(id, data) {
  try {
    const response = await axiosClient.put(`/api/organizations/update/${id}`, data);
    return response.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Failed to update organization.';
    throw new Error(typeof msg === 'string' ? msg : 'Failed to update organization.');
  }
}

export async function deleteOrganizationApi(id) {
  try {
    const response = await axiosClient.delete(`/api/organizations/delete/${id}`);
    return response.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Failed to delete organization.';
    throw new Error(typeof msg === 'string' ? msg : 'Failed to delete organization.');
  }
}
