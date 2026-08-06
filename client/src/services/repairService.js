import api from './api';

export const repairService = {
  // Get Work Queue for Technicians
  getWorkQueue: async (params = {}) => {
    const response = await api.get('/repairs/queue', { params });
    return response.data;
  },

  // Get Spare Parts Catalog
  getPartsCatalog: async () => {
    const response = await api.get('/repairs/parts-catalog');
    return response.data;
  },

  // Start Repair Timer
  startTimer: async (orderId) => {
    const response = await api.post(`/repairs/orders/${orderId}/start`);
    return response.data;
  },

  // Save Diagnostics & Repair Categories
  saveDiagnostics: async (orderId, data) => {
    const response = await api.put(`/repairs/orders/${orderId}/diagnostics`, data);
    return response.data;
  },

  // Stop Repair Timer
  stopTimer: async (orderId, data) => {
    const payload = typeof data === 'string' ? { action_taken: data } : data;
    const response = await api.post(`/repairs/orders/${orderId}/stop`, payload);
    return response.data;
  },

  // Request Spare Part
  requestPart: async (orderId, part_id, quantity) => {
    const response = await api.post(`/repairs/orders/${orderId}/request-part`, { part_id, quantity });
    return response.data;
  },

  // Remove Consumed Spare Part (Kurangi Spare Part)
  removePartConsumed: async (orderId, partConsumedId) => {
    const response = await api.delete(`/repairs/orders/${orderId}/parts/${partConsumedId}`);
    return response.data;
  },

  // Submit to QC1 Arisa
  submitToQC1: async (orderId, action_taken) => {
    const response = await api.post(`/repairs/orders/${orderId}/submit-qc1`, { action_taken });
    return response.data;
  }
};
