import axiosClient from './axiosClient';

// Fetch the list of companies loaded in Tally: GET /api/company/all
export async function getAllCompaniesApi() {
  try {
    const response = await axiosClient.get('/api/company/all');
    const list = response.data?.data || [];
    // API returns [{ name: "DemoWithout Allocation" }, ...] -> flatten to string[]
    return list.map((c) => (typeof c === 'string' ? c : c.name)).filter(Boolean);
  } catch (e) {
    console.warn('[Tally API] Unable to fetch company list:', e?.message);
    return [];
  }
}

export async function getActiveCompanyApi() {
  try {
    const response = await axiosClient.get('/api/tally/active-company');
    const comp = response.data?.companyName || response.data?.name || response.data;
    if (comp && typeof comp === 'string') return comp.trim();
  } catch (e1) {
    try {
      const response = await axiosClient.get('/api/tally/company');
      const comp = response.data?.companyName || response.data?.name || response.data;
      if (comp && typeof comp === 'string') return comp.trim();
    } catch (e2) {
      console.warn('[Tally API] Unable to fetch active company dynamically:', e2?.message);
    }
  }
  return '';
}

export async function getSalesVouchersApi(companyName = '') {
  let cleanCompany = (companyName || '').trim();

  // If no company name passed, try fetching active company from Tally
  if (!cleanCompany) {
    cleanCompany = await getActiveCompanyApi();
  }

  if (!cleanCompany) {
    throw new Error('No active company found in Tally. Please ensure a company is open in Tally Prime.');
  }

  const encodedCompany = encodeURIComponent(cleanCompany);
  const targetUrl = `/api/tally/${encodedCompany}/sales-vouchers`;

  try {
    console.log(`[Tally API GET] Fetching: ${targetUrl}`);
    const response = await axiosClient.get(targetUrl);
    console.log(`[Tally API Success] Vouchers received for "${cleanCompany}":`, response.data);
    return response.data;
  } catch (err) {
    console.warn(`[Tally API Primary Failed] ${targetUrl}:`, err?.message);
    
    // Try fallback direct URL if proxy is bypassed
    try {
      const directUrl = `http://localhost:8082/api/tally/${encodedCompany}/sales-vouchers`;
      const directRes = await axiosClient.get(directUrl);
      return directRes.data;
    } catch (directErr) {
      console.error(`[Tally API Direct Failed] for company "${cleanCompany}":`, directErr);
      const msg = directErr.response?.data?.message || directErr.response?.data || directErr.message || `Unable to reach backend API for "${cleanCompany}".`;
      throw new Error(typeof msg === 'string' ? msg : 'Backend server unreachable. Make sure backend on port 8082 is running.');
    }
  }
}