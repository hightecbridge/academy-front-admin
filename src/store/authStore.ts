// src/store/authStore.ts
import { create } from 'zustand'

export interface AuthUser {
  id: string
  name: string
  email: string
  academyName: string
  phone: string
  role: 'admin' | 'teacher'
  createdAt: string
  // 프로필 & 학원 이미지
  profileImage?: string   // base64 또는 URL
  academyLogo?: string    // base64 — 학부모 앱에 표시
  academyAddress?: string
  academyDesc?: string    // 학원 소개
}

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<boolean>
  signup: (data: SignupData) => Promise<boolean>
  logout: () => void
  clearError: () => void
  updateProfile: (data: Partial<AuthUser>) => void
  changePassword: (current: string, next: string) => Promise<boolean>
}

export interface SignupData {
  name: string
  email: string
  password: string
  academyName: string
  phone: string
}

const MOCK_ACCOUNTS: Array<AuthUser & { password: string }> = [
  {
    id: '1',
    name: '김원장',
    email: 'admin@hiacademy.kr',
    password: '1234',
    academyName: 'Hi Academy 학원',
    phone: '010-1234-5678',
    role: 'admin',
    createdAt: '2024.01.01',
    academyAddress: '서울시 강남구 테헤란로 123',
    academyDesc: '수학 전문 학원입니다. 초등~고등 전 과정을 지도합니다.',
    profileImage: undefined,
    academyLogo: undefined,
  },
]

const SAVE_KEY = 'hiacademy_user'

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    await new Promise(r => setTimeout(r, 600))
    const account = MOCK_ACCOUNTS.find(a => a.email === email && a.password === password)
    if (account) {
      const { password: _, ...user } = account
      set({ user, isLoading: false })
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(user)) } catch {}
      return true
    }
    set({ isLoading: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' })
    return false
  },

  signup: async (data) => {
    set({ isLoading: true, error: null })
    await new Promise(r => setTimeout(r, 800))
    if (MOCK_ACCOUNTS.find(a => a.email === data.email)) {
      set({ isLoading: false, error: '이미 사용 중인 이메일입니다.' })
      return false
    }
    const newUser: AuthUser = {
      id: String(Date.now()),
      name: data.name, email: data.email,
      academyName: data.academyName, phone: data.phone,
      role: 'admin',
      createdAt: new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, ''),
    }
    MOCK_ACCOUNTS.push({ ...newUser, password: data.password })
    set({ user: newUser, isLoading: false })
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(newUser)) } catch {}
    return true
  },

  logout: () => {
    set({ user: null, error: null })
    try { localStorage.removeItem(SAVE_KEY) } catch {}
  },

  clearError: () => set({ error: null }),

  // 회원정보 업데이트
  updateProfile: (data) => {
    const current = get().user
    if (!current) return
    const updated = { ...current, ...data }
    // MOCK_ACCOUNTS도 동기화
    const idx = MOCK_ACCOUNTS.findIndex(a => a.id === current.id)
    if (idx !== -1) Object.assign(MOCK_ACCOUNTS[idx], data)
    set({ user: updated })
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(updated)) } catch {}
  },

  // 비밀번호 변경
  changePassword: async (current, next) => {
    await new Promise(r => setTimeout(r, 500))
    const user = get().user
    if (!user) return false
    const account = MOCK_ACCOUNTS.find(a => a.id === user.id)
    if (!account || account.password !== current) return false
    account.password = next
    return true
  },
}))

export function restoreSession() {
  try {
    const saved = localStorage.getItem(SAVE_KEY)
    if (saved) useAuthStore.setState({ user: JSON.parse(saved) as AuthUser })
  } catch {}
}
