import axiosClient from './axiosClient';

export async function getAllSubscriptionsApi() {
  try {
    const response = await axiosClient.get('/api/subscriptions/lookup/all');
    return response.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Failed to fetch subscriptions.';
    throw new Error(typeof msg === 'string' ? msg : 'Failed to fetch subscriptions.');
  }
}

export async function getSubscriptionByIdApi(id) {
  try {
    const response = await axiosClient.get(`/api/subscriptions/lookup/${id}`);
    return response.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Subscription not found.';
    throw new Error(typeof msg === 'string' ? msg : 'Subscription not found.');
  }
}

export async function createSubscriptionApi(data) {
  try {
    const response = await axiosClient.post('/api/subscriptions/Create', data);
    return response.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Failed to create subscription.';
    throw new Error(typeof msg === 'string' ? msg : 'Failed to create subscription.');
  }
}

export async function updateSubscriptionApi(id, data) {
  try {
    const response = await axiosClient.put(`/api/subscriptions/update/${id}`, data);
    return response.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Failed to update subscription.';
    throw new Error(typeof msg === 'string' ? msg : 'Failed to update subscription.');
  }
}

export async function deleteSubscriptionApi(id) {
  try {
    const response = await axiosClient.delete(`/api/subscriptions/delete/${id}`);
    return response.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Failed to delete subscription.';
    throw new Error(typeof msg === 'string' ? msg : 'Failed to delete subscription.');
  }
}
