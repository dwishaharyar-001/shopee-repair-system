import api from './api';

export const bastService = {
  // Create and submit new BAST (Coordinator Arisa)
  createBast: async (bastData) => {
    const res = await api.post('/bast/create', bastData);
    return res.data;
  },

  // Get pending BAST documents for QC SEA task queue
  getPendingSeaBasts: async (params = {}) => {
    const res = await api.get('/bast/pending-sea', { params });
    return res.data;
  },

  // Get single BAST detail
  getBastById: async (id) => {
    const res = await api.get(`/bast/${id}`);
    return res.data;
  },

  // Verify BAST document by QC SEA (Approve/Revision)
  verifyBastBySea: async (id, verificationData) => {
    const res = await api.post(`/bast/${id}/verify`, verificationData);
    return res.data;
  },

  // Get BAST history
  getBastHistory: async (params = {}) => {
    const res = await api.get('/bast/history', { params });
    return res.data;
  }
};
