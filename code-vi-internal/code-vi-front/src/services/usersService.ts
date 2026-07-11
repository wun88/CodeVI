// DEAD CODE (2026-07-11): 어떤 컴포넌트/훅에서도 import되지 않음.
// 대상 백엔드 GET /api/users, GET /api/users/:id 도 User 엔티티에 없는
// classRegistrations 관계를 조회해 현재 500 반환 — 연결해도 동작 불가.
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
