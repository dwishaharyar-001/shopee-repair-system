import api from './api';

export const deviceService = {
  // Get Customers
  getCustomers: async () => {
    const response = await api.get('/devices/customers');
    return response.data;
  },

  // Create Customer
  createCustomer: async (customerData) => {
    const response = await api.post('/devices/customers', customerData);
    return response.data;
  },

  // Get Service Orders with search & filter params
  getServiceOrders: async (params = {}) => {
    const response = await api.get('/devices/service-orders', { params });
    return response.data;
  },

  // Get Service Order Detail
  getServiceOrderById: async (id) => {
    const response = await api.get(`/devices/service-orders/${id}`);
    return response.data;
  },

  // Create new Intake Order
  createIntake: async (data) => {
    const response = await api.post('/devices/service-orders/intake', data);
    return response.data;
  },

  // Update Service Order
  updateServiceOrder: async (id, data) => {
    const response = await api.put(`/devices/service-orders/${id}`, data);
    return response.data;
  },

  // Get Master Devices
  getMasterDevices: async () => {
    const response = await api.get('/devices/master');
    return response.data;
  }
};
