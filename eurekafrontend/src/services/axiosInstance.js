import axios from "axios";

const API = (__API_BASE_URL__ || "https://YOUR_BACKEND_API_URL").replace(/\/+$/, "");

// --- Tracking stato globale delle richieste ---
let pendingRequests = 0;
let isRetrying = false;
let cachedState = { loading: false, retrying: false };
const listeners = new Set();

export const apiLoadingState = {
  subscribe(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },
  getState() {
    return cachedState;
  },
};

function notify() {
  const newLoading = pendingRequests > 0;
  const newRetrying = isRetrying;
  if (cachedState.loading !== newLoading || cachedState.retrying !== newRetrying) {
    cachedState = { loading: newLoading, retrying: newRetrying };
  }
  listeners.forEach((cb) => cb(cachedState));
}

// --- Istanza axios condivisa ---
const apiClient = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor: aggiunge token JWT e traccia le richieste pendenti
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (!config._retryCount) {
    pendingRequests++;
    notify();
  }
  return config;
});

// Response interceptor: retry su 503 con backoff esponenziale, redirect su 401
apiClient.interceptors.response.use(
  (response) => {
    pendingRequests = Math.max(0, pendingRequests - 1);
    notify();
    return response;
  },
  async (error) => {
    const config = error.config;

    // Gestione 401: token scaduto o non valido -> redirect al login
    if (error.response?.status === 401) {
      pendingRequests = Math.max(0, pendingRequests - 1);
      notify();
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      const path = window.location.pathname;
      if (!path.endsWith("/3dxrstudio/") && !path.endsWith("/3dxrstudio")) {
        window.location.href = "/eureka3dxr/3dxrstudio/";
      }
      return Promise.reject(error);
    }

    // Retry su 503 (Service Unavailable), 429 (Too Many Requests) e errori di rete
    const isRetryable =
      error.response?.status === 503 ||
      error.response?.status === 429 ||
      (!error.response && error.code !== "ERR_CANCELED");

    if (!isRetryable) {
      pendingRequests = Math.max(0, pendingRequests - 1);
      notify();
      return Promise.reject(error);
    }

    config._retryCount = config._retryCount || 0;
    const maxRetries = 3;

    if (config._retryCount >= maxRetries) {
      pendingRequests = Math.max(0, pendingRequests - 1);
      isRetrying = false;
      notify();
      return Promise.reject(error);
    }

    config._retryCount += 1;
    isRetrying = true;
    notify();

    // Backoff esponenziale: 1s, 2s, 4s
    const delay = Math.pow(2, config._retryCount - 1) * 1000;
    console.warn(
      `[apiClient] Retry ${config._retryCount}/${maxRetries} per ${config.url} dopo ${delay}ms (status: ${error.response?.status || "network error"})`
    );

    await new Promise((resolve) => setTimeout(resolve, delay));
    return apiClient(config);
  }
);

export default apiClient;
export { API };
