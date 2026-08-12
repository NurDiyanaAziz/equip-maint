const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function getAuthHeaders() {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('equip-maint-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Equipment
  getEquipment: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/equipment?${qs}`);
  },
  getEquipmentById: (id) => request(`/equipment/${id}`),
  createEquipment: (data) => request('/equipment', { method: 'POST', body: JSON.stringify(data) }),
  updateEquipment: (id, data) => request(`/equipment/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEquipment: (id) => request(`/equipment/${id}`, { method: 'DELETE' }),
  getEquipmentStats: () => request('/equipment/stats'),
  getEquipmentCategories: () => request('/equipment/categories'),
  getUpcomingPreventive: () => request('/equipment/preventive/upcoming'),

  // Tickets
  getTickets: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/tickets?${qs}`);
  },
  getTicketById: (id) => request(`/tickets/${id}`),
  createTicket: (data) => request('/tickets', { method: 'POST', body: JSON.stringify(data) }),
  assignTicket: (id, techId) =>
    request(`/tickets/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assigned_technician_id: techId }),
    }),
  resolveTicket: (id) => request(`/tickets/${id}/resolve`, { method: 'PATCH' }),
  getTicketStats: () => request('/tickets/stats'),
  getTechnicians: () => request('/tickets/technicians'),

  // Preventive
  getPreventive: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/preventive?${qs}`);
  },
  getPreventiveById: (id) => request(`/preventive/${id}`),
  createPreventive: (data) => request('/preventive', { method: 'POST', body: JSON.stringify(data) }),
  completePreventive: (id) => request(`/preventive/${id}/complete`, { method: 'PATCH' }),
  escalateDefect: (id, data) => request(`/preventive/${id}/escalate-defect`, { method: 'POST', body: JSON.stringify(data) }),
  getPreventiveStats: () => request('/preventive/stats'),

  // Reports
  getReportKPIs: (range) => request(`/reports/kpis?range=${range}`),
  getDowntimeByCategory: (range) => request(`/reports/downtime-by-category?range=${range}`),
  getDowntimeTrends: (range) => request(`/reports/downtime-trends?range=${range}`),
  getTechnicianPerformance: (range) => request(`/reports/technician-performance?range=${range}`),
  getPriorityDistribution: (range) => request(`/reports/priority-distribution?range=${range}`),
  getWorstOffenders: (range, limit = 5) => request(`/reports/worst-offenders?range=${range}&limit=${limit}`),

  // Low-level request for custom calls
  request,

  // Auth
  login: (email, password) =>
    request('/users/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
};
