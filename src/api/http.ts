import axios from 'axios'
import { clearAuth, getToken } from './authStorage'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/** 直连本机 uvicorn 时没有网关，课程/权益等路径需带 /api/v1；线上仍走 /courses 等短路径 */
const needsLocalApiV1Prefix = (() => {
  try {
    const host = new URL(API_BASE_URL).hostname
    return host === 'localhost' || host === '127.0.0.1'
  } catch {
    return API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1')
  }
})()

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
})

http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      clearAuth()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    console.error('[API Error]', err)
    return Promise.reject(err)
  },
)

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const path = config.url ?? ''
  if (needsLocalApiV1Prefix && path.startsWith('/') && !path.startsWith('/api/v1')) {
    config.url = `/api/v1${path}`
  }
  return config
})

export default http
