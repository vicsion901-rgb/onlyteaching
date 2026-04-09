import axios from 'axios';

const fallbackBase = 'http://localhost:3000';

function resolveBaseURL() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  if (typeof window === 'undefined') {
    return fallbackBase;
  }

  const { hostname, origin } = window.location;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLocalhost) {
    return fallbackBase;
  }

  // Vercel 설정상 모든 경로가 api/index.ts(NestJS)로 rewrite 되므로
  // /api 프리픽스 없이 원 경로 그대로 호출
  return origin;
}

const client = axios.create({
  baseURL: resolveBaseURL(),
  timeout: 15000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 학교/관공서 방화벽이 첫 요청을 끊는 케이스 자동 재시도
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);
    config.__retryCount = config.__retryCount || 0;

    const isNetworkErr =
      error.code === 'ECONNABORTED' ||
      error.message === 'Network Error' ||
      !error.response;

    if (isNetworkErr && config.__retryCount < 2) {
      config.__retryCount += 1;
      await new Promise((r) => setTimeout(r, 600 * config.__retryCount));
      return client(config);
    }
    return Promise.reject(error);
  },
);

// 백엔드 prewarm — 페이지 로드 시 즉시 ping
export function prewarmBackend() {
  client.get('/health').catch(() => {});
}

if (typeof window !== 'undefined') {
  prewarmBackend();
}

export default client;
