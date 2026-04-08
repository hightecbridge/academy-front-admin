// src/store/authStore.ts
import { create } from 'zustand'
import client from '../api/client'

export interface AuthUser {
  id: string
  name: string
  email: string
  academyName: string
  phone: string
  role: 'admin' | 'teacher'
  createdAt: string
  profileImage?: string
  academyLogo?: string
  academyAddress?: string
  academyDesc?: string
  academyId?: number
}

export interface SignupData {
  name: string
  email: string
  password: string
  academyName: string
  phone: string
  academyAddress?: string
}

interface AuthState {
  user: AuthUser | null
  /** 세션 검증(서버 /me) 완료 전에는 false — 이전에 로컬만 보고 대시보드 열리지 않게 함 */
  authReady: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<boolean>
  signup: (data: SignupData) => Promise<boolean>
  logout: () => void
  clearError: () => void
  updateProfile: (data: Partial<AuthUser>) => Promise<boolean>
  changePassword: (current: string, next: string) => Promise<boolean>
  bootstrap: () => Promise<void>
}

const TOKEN_KEY = 'hiacademy_token'
const USER_KEY = 'hiacademy_user'

/** 랜딩(다른 origin) 로그인 직후 — URL 해시로 넘어온 토큰을 이쪽 localStorage에 옮김 */
const HANDOFF_PREFIX = '#hiacademy_handoff='

function consumeLandingHandoffHash(): void {
  if (typeof window === 'undefined') return
  const h = window.location.hash
  if (!h.startsWith(HANDOFF_PREFIX)) return
  const token = decodeURIComponent(h.slice(HANDOFF_PREFIX.length))
  if (token) localStorage.setItem(TOKEN_KEY, token)
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
}

const MSG_CREDENTIALS = '이메일 또는 비밀번호가 올바르지 않습니다.'
const MSG_SERVER_UNAVAILABLE =
  '서버에 연결할 수 없습니다. API 서버가 켜져 있는지, 네트워크 연결을 확인한 뒤 다시 시도해 주세요.'
const MSG_SERVER_ERROR = '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
const MSG_TIMEOUT = '서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.'

/** 백엔드 ApiResponse JSON — message 필드 */
function readApiMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined
  const m = (data as { message?: unknown }).message
  return typeof m === 'string' && m.trim() ? m.trim() : undefined
}

function loginErrorMessage(err: unknown): string {
  const e = err as {
    response?: { status?: number; data?: unknown }
    code?: string
    message?: string
  }
  const status = e.response?.status
  const body = e.response?.data
  const apiMsg = readApiMessage(body)

  if (!e.response) {
    if (e.code === 'ECONNABORTED') return MSG_TIMEOUT
    if (e.message === 'Network Error' || e.code === 'ERR_NETWORK') return MSG_SERVER_UNAVAILABLE
    return MSG_SERVER_UNAVAILABLE
  }

  // 레거시/프록시 이슈로 200 + success:false 가 온 경우
  if (
    status === 200 &&
    body &&
    typeof body === 'object' &&
    (body as { success?: boolean }).success === false &&
    apiMsg
  ) {
    return apiMsg
  }

  if (status != null && status >= 500) return apiMsg ?? MSG_SERVER_ERROR
  if (status === 502 || status === 503 || status === 504) return MSG_SERVER_UNAVAILABLE

  if (status === 401 || status === 403) return apiMsg ?? MSG_CREDENTIALS

  if (apiMsg) return apiMsg
  return MSG_CREDENTIALS
}

function saveUser(user: AuthUser, token: string) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

function toUser(d: any): AuthUser {
  return {
    id: String(d.id),
    name: d.name ?? '',
    email: d.email ?? '',
    role: d.role?.toLowerCase() === 'admin' ? 'admin' : 'teacher',
    createdAt: d.createdAt ?? '',
    phone: d.phone ?? d.academy?.phone ?? '',
    academyName: d.academy?.name ?? '',
    academyAddress: d.academy?.address ?? '',
    academyDesc: d.academy?.desc ?? '',
    profileImage: d.profileImageBase64 ?? d.profileImage ?? undefined,
    academyLogo: d.academy?.logoBase64 ?? undefined,
    academyId: d.academy?.id,
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  authReady: false,
  isLoading: false,
  error: null,

  bootstrap: async () => {
    consumeLandingHandoffHash()
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      localStorage.removeItem(USER_KEY)
      set({ user: null, authReady: true })
      return
    }
    try {
      const res = await client.get('/admin/auth/me')
      const payload = res.data.data as { token?: string } & Record<string, unknown>
      const { token: newToken, ...rest } = payload
      const user = toUser(rest)
      if (newToken) saveUser(user, newToken)
      else localStorage.setItem(USER_KEY, JSON.stringify(user))
      set({ user, authReady: true })
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      set({ user: null, authReady: true })
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const res = await client.post('/admin/auth/login', { email, password })
      const raw = res.data as { success?: boolean; message?: string; data?: unknown }
      if (raw.success === false) {
        set({ isLoading: false, error: raw.message?.trim() ? raw.message : MSG_CREDENTIALS })
        return false
      }
      const data = raw.data as { token?: string } & Record<string, unknown> | null | undefined
      if (!data?.token) {
        set({ isLoading: false, error: MSG_CREDENTIALS })
        return false
      }
      const { token, ...rest } = data
      const user = toUser(rest)
      saveUser(user, token)
      set({ user, isLoading: false, authReady: true })
      return true
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: loginErrorMessage(err),
      })
      return false
    }
  },

  signup: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const res = await client.post('/admin/auth/signup', {
        email: data.email,
        password: data.password,
        name: data.name,
        phone: data.phone,
        academyName: data.academyName,
        academyAddress: data.academyAddress ?? '',
      })
      const { token, ...rest } = res.data.data
      const user = toUser(rest)
      saveUser(user, token)
      set({ user, isLoading: false, authReady: true })
      return true
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.response?.data?.message ?? '회원가입 중 오류가 발생했습니다.',
      })
      return false
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    set({ user: null, authReady: true })
  },

  clearError: () => void set({ error: null }),

  updateProfile: async (data) => {
    try {
      const p: Record<string, string> = {}
      if (data.name) p.name = data.name
      if (data.phone) p.phone = data.phone
      if (data.profileImage !== undefined) p.profileImageBase64 = data.profileImage ?? ''
      if (data.academyName) p.academyName = data.academyName
      if (data.academyAddress) p.academyAddress = data.academyAddress
      if (data.academyDesc) p.academyDesc = data.academyDesc
      if (data.academyLogo !== undefined) p.academyLogoBase64 = data.academyLogo ?? ''

      const res = await client.put('/admin/auth/profile', p)
      const apiData = res.data.data
      const currentUser = useAuthStore.getState().user
      const user = toUser(apiData)
      if (!user.profileImage && data.profileImage) user.profileImage = data.profileImage
      if (!user.academyLogo && data.academyLogo) user.academyLogo = data.academyLogo
      if (data.phone) user.phone = data.phone
      if (apiData.token) localStorage.setItem(TOKEN_KEY, apiData.token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      set({ user })
      return true
    } catch {
      return false
    }
  },

  changePassword: async (current, next) => {
    try {
      await client.patch('/admin/auth/password', {
        currentPassword: current,
        newPassword: next,
      })
      return true
    } catch {
      return false
    }
  },
}))

/** @deprecated 내부에서 bootstrap 사용 */
export async function restoreSession() {
  await useAuthStore.getState().bootstrap()
}
