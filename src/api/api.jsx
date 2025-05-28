import axios from 'axios';

const API_BASE = 'https://localhost:44333/api';

const axiosInstance = axios.create({
  baseURL: API_BASE,
});

// Interceptor để tự động thêm Authorization header
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Các hàm API sử dụng axiosInstance
export const getAvailableBots = () => axiosInstance.get('/chat/availableBots');
export const getSessions = (chatbot, userId) => axiosInstance.get('/chat/sessions', { params: { chatbot, userId } });
export const getChatHistory = (sessionId) => axiosInstance.get('/chat/history', { params: { sessionId } });
export const sendMessage = (message) => axiosInstance.post('/chat/send', { sessionId: message.sessionId, userId: message.userId,text: message.text, files: message.files});
export const googleLogin = (token) => axiosInstance.post('/user/google-login', { token });
export const createSession = (chatbot, userId) =>
  axiosInstance.post('/chat/sessions', {
    chatbot,
    userId,
    name: `New Chat ${Date.now()}`
  });
