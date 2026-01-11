import axios from 'axios';

const fallbackBase = 'http://localhost:3000';
const inferredBase =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : fallbackBase;
const baseURL = import.meta.env.VITE_API_BASE_URL || inferredBase;

const client = axios.create({ baseURL });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
