import axios from 'axios';

const fallbackBase = 'http://localhost:3000';
const productionBackendBase = 'https://api.onlyteaching.kr';

function resolveBaseURL() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window === 'undefined') return fallbackBase;
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return fallbackBase;
  return productionBackendBase;
}

const client = axios.create({
  baseURL: resolveBaseURL(),
  timeout: 10000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    const status = error.response?.status;
    const isCorsOrAbort = !error.response && error.message === 'Network Error';
    const isTimeout = error.code === 'ECONNABORTED';

    if (isCorsOrAbort) return Promise.reject(error);

    config.__retryCount = config.__retryCount || 0;
    if (isTimeout && config.__retryCount < 1) {
      config.__retryCount += 1;
      await new Promise((r) => setTimeout(r, 800));
      return client(config);
    }

    return Promise.reject(error);
  },
);

export default client;
