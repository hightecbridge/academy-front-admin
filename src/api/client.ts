// src/api/client.ts — Axios 기반 API 클라이언트
import axios from 'axios'
import { ACADEMY_API_BASE_PATH } from '../config/apiBase'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? ACADEMY_API_BASE_PATH,
  timeout: 10000,
})

// 요청 인터셉터 — JWT 토큰 자동 첨부
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('hiacademy_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 응답 인터셉터 — 401 시 로그아웃 (로그인 시도 실패 401 은 제외: 화면에 오류 문구 표시)
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url ?? ''
    const isLoginAttempt = url.includes('/admin/auth/login')
    if (err.response?.status === 401 && !isLoginAttempt) {
      localStorage.removeItem('hiacademy_token')
      localStorage.removeItem('hiacademy_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default client
