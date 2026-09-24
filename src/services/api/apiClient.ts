import axios, { AxiosInstance } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
export const IS_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false'
export const MOCK_LATENCY = Number(import.meta.env.VITE_MOCK_LATENCY_MS) || 250

/**
 * Production-ready Axios instance pre-configured for future FastAPI backend.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 10000,
})

// Request interceptor for optional authentication token injection
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('grid_twin_auth_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for centralized error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API Client Error]:', error?.response?.data || error.message)
    return Promise.reject(error)
  }
)

/**
 * Utility helper to simulate network latency in mock mode.
 */
export const simulateLatency = (ms: number = MOCK_LATENCY): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))
