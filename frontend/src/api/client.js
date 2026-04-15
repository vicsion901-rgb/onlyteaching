import axios from 'axios';

const fallbackBase = 'http://localhost:3000';
// 프로덕션 백엔드 (Vercel 프로젝트: onlyteaching)
// 프론트엔드는 별도 프로젝트(onlyteaching-fpnx, www.onlyteaching.kr)로
// 배포되므로 same-origin 호출이 불가 — 백엔드 도메인을 직접 지정한다.
const productionBackendBase = 'https://api.onlyteaching.kr';

function resolveBaseURL() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  if (typeof window === 'undefined') {
    return fallbackBase;
  }

  const { hostname } = window.location;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLocalhost) {
    return fallbackBase;
  }

  return productionBackendBase;
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

// 백엔드 prewarm — 페이지 로드 시 1회만 ping
export function prewarmBackend() {
  client.get('/health').catch(() => {});
}

if (typeof window !== 'undefined') {
  prewarmBackend();
}

export default client;
