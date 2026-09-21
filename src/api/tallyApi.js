import axiosClient from './axiosClient';

// Fetch the list of companies loaded in Tally: GET /api/company/all
export async function getAllCompaniesApi() {
  try {
    const response = await axiosClient.get('/api/company/all');
    const list = response.data?.data || [];
    return list.map((c) => (typeof c === 'string' ? c : c.name)).filter(Boolean);
  } catch {
    return [];
  }
}

export async function getActiveCompanyApi() {
  try {
    const response = await axiosClient.get('/api/tally/active-company');
    const comp = response.data?.companyName || response.data?.name || response.data;
    if (comp && typeof comp === 'string') return comp.trim();
  } catch {
    try {
      const response = await axiosClient.get('/api/tally/company');
      const comp = response.data?.companyName || response.data?.name || response.data;
      if (comp && typeof comp === 'string') return comp.trim();
    } catch {
      // Unable to fetch active company
    }
  }
  return '';
}

export async function getSalesVouchersApi(companyName = '') {
  let cleanCompany = (companyName || '').trim();

  if (!cleanCompany) {
    cleanCompany = await getActiveCompanyApi();
  }

  if (!cleanCompany) {
    throw new Error('No active company found in Tally. Please ensure a company is open in TallyPrime.');
  }

  const encodedCompany = encodeURIComponent(cleanCompany);
  const targetUrl = `/api/tally/${encodedCompany}/sales-vouchers`;

  try {
    const response = await axiosClient.get(targetUrl);
    return response.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data || err.message || 'Unable to connect to Tally. Please make sure the Tally Agent and TallyPrime are running.';
    throw new Error(typeof msg === 'string' ? msg : 'Unable to connect to Tally. Please make sure the Tally Agent and TallyPrime are running.');
  }
}