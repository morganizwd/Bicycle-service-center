// src/api/axiosConfig.js
import axios from 'axios';

const instance = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
    withCredentials: false,
});

// Достаём любой доступный токен (пользовательский или центра)
function getAuthToken() {
    return (
        localStorage.getItem('userToken') ||
        localStorage.getItem('serviceCenterToken') ||
        localStorage.getItem('centerToken') ||
        localStorage.getItem('token') // на случай, если вы уже где-то так сохранили
    );
}

instance.interceptors.request.use(
    (config) => {
        const token = getAuthToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

export default instance;
