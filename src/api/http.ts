import axios from 'axios'
import { clearAuth, getRefreshToken, getToken, setAuth } from './authStorage'
import type { UserInfo } from '../types/user'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/** 直连本机 uvicorn 时没有网关，课程/权益等路径需带 /api/v1；线上仍走 /courses 等短路径 */
const needsLocalApiV1Prefix = (() => {
  if (API_BASE_URL.startsWith('/')) return true
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

const refreshHttp = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
})

interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
}

function unwrapApiEnvelope<T>(payload: T | ApiEnvelope<T>): T {
  if (
    payload
    && typeof payload === 'object'
    && 'code' in payload
    && 'data' in payload
  ) {
    return (payload as ApiEnvelope<T>).data
  }
  return payload as T
}

let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null
let refreshTimer: ReturnType<typeof setTimeout> | null = null

const REFRESH_BUFFER_MS = 5 * 60 * 1000

function decodeJwtExp(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

function stopAccessTokenRefresh() {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
}

function scheduleAccessTokenRefresh() {
  stopAccessTokenRefresh()
  const token = getToken()
  if (!token) return

  const exp = decodeJwtExp(token)
  if (!exp) return

  const refreshAt = exp * 1000 - REFRESH_BUFFER_MS
  const delay = Math.max(refreshAt - Date.now(), 0)

  refreshTimer = setTimeout(async () => {
    await tryRefreshToken()
    scheduleAccessTokenRefresh()
  }, delay)
}

interface AuthTokenResponse {
  access_token: string
  refresh_token: string
  user: UserInfo
}

const authRefreshPath = '/api/v1/auth/refresh'

const tryRefreshToken = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null
  try {
    const response = await refreshHttp.post<AuthTokenResponse | ApiEnvelope<AuthTokenResponse>>(authRefreshPath, {
      refresh_token: refreshToken,
    })
    const data = unwrapApiEnvelope(response.data)
    setAuth(data.access_token, data.refresh_token, data.user)
    scheduleAccessTokenRefresh()
    return data.access_token
  } catch {
    stopAccessTokenRefresh()
    clearAuth()
    return null
  }
}

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

http.interceptors.response.use(
  (res) => unwrapApiEnvelope(res.data),
  async (error) => {
    const originalRequest = error.config as { _retry?: boolean; headers?: Record<string, string>; url?: string }
    const requestUrl = String(originalRequest?.url || '')
    const isRefreshRequest = requestUrl.includes('/auth/refresh')
    if (isRefreshRequest) {
      stopAccessTokenRefresh()
      clearAuth()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }
    if (error.response?.status !== 401 || originalRequest?._retry) {
      console.error('[API Error]', error)
      if (error.response?.status === 401) {
        stopAccessTokenRefresh()
        clearAuth()
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login'
        }
      }
      return Promise.reject(error)
    }

    originalRequest._retry = true
    if (!isRefreshing) {
      isRefreshing = true
      refreshPromise = tryRefreshToken().finally(() => {
        isRefreshing = false
      })
    }
    const newToken = await refreshPromise
    if (!newToken) {
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }
    if (originalRequest.headers) {
      originalRequest.headers.Authorization = `Bearer ${newToken}`
    }
    return http(originalRequest)
  },
)

if (getToken() && getRefreshToken()) {
  scheduleAccessTokenRefresh()
}

export default http
