import api from './axiosConfig';

export const roomAPI = {
    // Lấy tất cả phòng
    getAll: () => api.get('/rooms'),
    
    // Lấy phòng trống
    getAvailable: () => api.get('/rooms/available'),
    
    // Lấy phòng theo ID
    getById: (id) => api.get(`/rooms/${id}`),
    
    // Tạo phòng mới
    create: (data) => api.post('/rooms', data),
    
    // Cập nhật phòng
    update: (id, data) => api.put(`/rooms/${id}`, data),
    
    // Xóa phòng
    delete: (id) => api.delete(`/rooms/${id}`),
    
    // Lấy phòng theo trạng thái
    getByStatus: (status) => api.get(`/rooms/status/${status}`),
    
    // Lấy phòng theo loại
    getByType: (roomType) => api.get(`/rooms/type/${roomType}`),
    
    // Cập nhật trạng thái phòng
    updateStatus: (id, status) => api.patch(`/rooms/${id}/status?status=${status}`)
};