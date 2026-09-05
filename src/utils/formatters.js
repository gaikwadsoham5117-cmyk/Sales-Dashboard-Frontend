// Format number into INR currency format
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

// Format currency into Lakhs (e.g. ₹13.79 L) or formatted INR
export function formatLakhs(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  if (Math.abs(amount) >= 100000) {
    const lakhs = (amount / 100000).toFixed(2);
    return `₹${lakhs} L`;
  }
  return formatCurrency(amount);
}

// Convert YYYYMMDD string (e.g. "20260401") to Date object
export function parseTallyDate(dateStr) {
  if (!dateStr || dateStr.length !== 8) return null;
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10) - 1;
  const day = parseInt(dateStr.substring(6, 8), 10);
  return new Date(year, month, day);
}

// Format YYYYMMDD string to human readable format "01 Apr 2026"
export function formatReadableDate(dateStr) {
  const d = parseTallyDate(dateStr);
  if (!d || isNaN(d.getTime())) return dateStr || '-';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

// Format YYYYMMDD string to "YYYY-MM-DD" format for HTML date inputs
export function formatISOShortDate(dateStr) {
  if (!dateStr || dateStr.length !== 8) return '';
  return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
}

// Parse JWT payload safely
export function parseJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}
