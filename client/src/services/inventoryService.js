import api from './api';

export const inventoryService = {
  // Get inventory parts with filters
  getInventoryParts: async (params = {}) => {
    const response = await api.get('/parts-inventory', { params });
    return response.data;
  },

  // Get Inventory Metrics & Valuation
  getInventoryMetrics: async () => {
    const response = await api.get('/parts-inventory/metrics');
    return response.data;
  },

  // Get Harvest Logs
  getHarvestLogs: async () => {
    const response = await api.get('/parts-inventory/harvest-logs');
    return response.data;
  },

  // Add new Part
  createPart: async (data) => {
    const response = await api.post('/parts-inventory', data);
    return response.data;
  },

  // Update Part
  updatePart: async (id, data) => {
    const response = await api.put(`/parts-inventory/${id}`, data);
    return response.data;
  },

  // Harvest Part from Cannibalized Device
  harvestPart: async (data) => {
    const response = await api.post('/parts-inventory/harvest', data);
    return response.data;
  }
};
