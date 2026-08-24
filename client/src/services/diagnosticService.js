import api from './api';

export const diagnosticService = {
  // Technician submits diagnostic plan & requested parts proposal
  submitDiagnosticPlan: async (orderId, planData) => {
    const res = await api.post(`/diagnostics/${orderId}/submit-plan`, planData);
    return res.data;
  },

  // QC SEA gets queue of pending diagnostic & budget approvals
  getPendingDiagnosticApprovals: async () => {
    const res = await api.get('/diagnostics/pending-approvals');
    return res.data;
  },

  // QC SEA processes approval decision (Full_Approve, Partial_Approve, Not_Approve_Harvest, Revision_Requested)
  processSeaApproval: async (orderId, approvalData) => {
    const res = await api.post(`/diagnostics/${orderId}/process-approval`, approvalData);
    return res.data;
  }
};
