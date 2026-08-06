import api from './api';

export const qcService = {
  // Get pending queue (qc1 / qc2)
  getQCPendingQueue: async (type = '') => {
    const response = await api.get('/qc/pending', { params: { type } });
    return response.data;
  },

  // Get QC Audit History
  getQCHistory: async () => {
    const response = await api.get('/qc/history');
    return response.data;
  },

  // Get QC Metrics & Pass Rates
  getQCMetrics: async () => {
    const response = await api.get('/qc/metrics');
    return response.data;
  },

  // Submit QC Checkpoint 1 (Arisa)
  submitQC1: async (data) => {
    const response = await api.post('/qc/checkpoint1', data);
    return response.data;
  },

  // Submit QC Checkpoint 2 (Shopee)
  submitQC2: async (data) => {
    const response = await api.post('/qc/checkpoint2', data);
    return response.data;
  }
};
