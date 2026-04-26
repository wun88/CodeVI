import api from './api';

export const usersService = {
  getUsers: async (page = 1, limit = 5) => {
    const res = await api.get(`/api/users?page=${page}&limit=${limit}`);
    return res.data;
  },

  getUserById: async (id: number) => {
    const res = await api.get(`/api/users/${id}`);
    return res.data;
  },

  updateUser: async (id: number, data: any) => {
    const res = await api.put(`/api/users/${id}`, data);
    return res.data;
  },

  deleteUser: async (id: number) => {
    const res = await api.delete(`/api/users/${id}`);
    return res.data;
  },
};
