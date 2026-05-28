import axios from 'axios'
import { clearAuth, getToken } from './authStorage'

const http = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
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
  return config
})

export default http
