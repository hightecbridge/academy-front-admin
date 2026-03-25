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
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<boolean>
  signup: (data: SignupData) => Promise<boolean>
  logout: () => void
  clearError: () => void
  updateProfile: (data: Partial<AuthUser>) => Promise<boolean>
  changePassword: (current: string, next: string) => Promise<boolean>
}

const TOKEN_KEY = 'hiacademy_token'
const USER_KEY  = 'hiacademy_user'

const MSG_CREDENTIALS = '이메일 또는 비밀번호가 올바르지 않습니다.'
const MSG_SERVER_UNAVAILABLE =
  '서버에 연결할 수 없습니다. API 서버가 켜져 있는지, 네트워크 연결을 확인한 뒤 다시 시도해 주세요.'
const MSG_SERVER_ERROR = '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
const MSG_TIMEOUT = '서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.'

/** 로그인 요청: 네트워크/서버 장애 vs 인증 실패 문구 분리 */
function loginErrorMessage(err: unknown): string {
  const e = err as { response?: { status?: number; data?: { message?: string } }; code?: string; message?: string }
  const status = e.response?.status
  const apiMsg = e.response?.data?.message

  // 응답 자체가 없음 = 네트워크 끊김, CORS, 서버 다운, DNS 등
  if (!e.response) {
    if (e.code === 'ECONNABORTED') return MSG_TIMEOUT
    if (e.message === 'Network Error' || e.code === 'ERR_NETWORK') return MSG_SERVER_UNAVAILABLE
    return MSG_SERVER_UNAVAILABLE
  }

  if (status != null && status >= 500) return apiMsg?.trim() ? apiMsg : MSG_SERVER_ERROR
  if (status === 502 || status === 503 || status === 504) return MSG_SERVER_UNAVAILABLE

  // 401/403: 일반적으로 아이디·비밀번호 오류
  if (status === 401 || status === 403) return apiMsg?.trim() ? apiMsg : MSG_CREDENTIALS

  if (apiMsg?.trim()) return apiMsg
  return MSG_CREDENTIALS
}

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveUser(user: AuthUser, token: string) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

function toUser(d: any): AuthUser {
  return {
    id:             String(d.id),
    name:           d.name ?? '',
    email:          d.email ?? '',
    role:           d.role?.toLowerCase() === 'admin' ? 'admin' : 'teacher',
    createdAt:      d.createdAt ?? '',
    // user.phone 우선, 없으면 academy.phone
    phone:          d.phone ?? d.academy?.phone ?? '',
    academyName:    d.academy?.name ?? '',
    academyAddress: d.academy?.address ?? '',
    academyDesc:    d.academy?.desc ?? '',
    // 이미지 필드 매핑
    profileImage:   d.profileImageBase64 ?? d.profileImage ?? undefined,
    academyLogo:    d.academy?.logoBase64 ?? undefined,
    academyId:      d.academy?.id,
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user:      loadUser(),
  isLoading: false,
  error:     null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const res = await client.post('/admin/auth/login', { email, password })
      const { token, ...rest } = res.data.data
      const user = toUser(rest)
      saveUser(user, token)
      set({ user, isLoading: false })
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
        email:          data.email,
        password:       data.password,
        name:           data.name,
        phone:          data.phone,
        academyName:    data.academyName,
        academyAddress: data.academyAddress ?? '',
      })
      const { token, ...rest } = res.data.data
      const user = toUser(rest)
      saveUser(user, token)
      set({ user, isLoading: false })
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
    set({ user: null })
  },

  clearError: () => set({ error: null }),

  updateProfile: async (data) => {
    try {
      const p: Record<string, string> = {}
      if (data.name)           p.name               = data.name
      if (data.phone)          p.phone              = data.phone
      if (data.profileImage !== undefined)
                               p.profileImageBase64 = data.profileImage ?? ''
      if (data.academyName)    p.academyName        = data.academyName
      if (data.academyAddress) p.academyAddress     = data.academyAddress
      if (data.academyDesc)    p.academyDesc        = data.academyDesc
      if (data.academyLogo !== undefined)
                               p.academyLogoBase64  = data.academyLogo ?? ''

      const res = await client.put('/admin/auth/profile', p)
      const apiData = res.data.data
      // 기존 user 상태와 병합 — API가 이미지를 그대로 돌려주지 않을 수 있으므로
      const currentUser = useAuthStore.getState().user
      const user = toUser(apiData)
      // API 응답에 이미지가 없으면 요청에서 보낸 값 유지
      if (!user.profileImage && data.profileImage) user.profileImage = data.profileImage
      if (!user.academyLogo  && data.academyLogo)  user.academyLogo  = data.academyLogo
      // phone도 요청값 우선
      if (data.phone) user.phone = data.phone
      // token 갱신 (응답에 포함된 경우)
      if (apiData.token) localStorage.setItem(TOKEN_KEY, apiData.token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      set({ user })
      return true
    } catch { return false }
  },

  changePassword: async (current, next) => {
    try {
      await client.patch('/admin/auth/password', {
        currentPassword: current,
        newPassword:     next,
      })
      return true
    } catch { return false }
  },
}))

// App.tsx 에서 호출 — 새로고침 시 토큰 유효성 유지 (별도 검증 없이 로컬 스토리지 복원)
export function restoreSession() {
  // loadUser()는 이미 store 초기값에서 처리됨
  // 필요 시 서버에 /me 엔드포인트 추가 후 검증 가능
}
