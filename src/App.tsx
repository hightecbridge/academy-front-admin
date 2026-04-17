// src/App.tsx
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from './components/layout/Layout'
import HomePage from './pages/home/HomePage'
import { ParentListPage } from './pages/parents/ParentListPage'
import { ParentDetailPage } from './pages/parents/ParentDetailPage'
import { StudentDetailPage, StudentFormPage, ParentFormPage } from './pages/parents/StudentDetailPage'
import ClassListPage from './pages/class/ClassListPage'
import ClassDetailPage from './pages/class/ClassDetailPage'
import ClassFormPage from './pages/class/ClassFormPage'
import NoticePage from './pages/notice/NoticePage'
import PaymentPage from './pages/payment/PaymentPage'
import PaymentDetailPage from './pages/payment/PaymentDetailPage'
import MessagePage from './pages/message/MessagePage'
import CalendarPage from './pages/calendar/CalendarPage'
import AttendListPage from './pages/attend/AttendListPage'
import AttendSheetPage from './pages/attend/AttendSheetPage'
import AttendStatsPage from './pages/attend/AttendStatsPage'
import HomeworkPage from './pages/attend/HomeworkPage'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import ProfilePage from './pages/auth/ProfilePage'
import BillingPage from './pages/billing/BillingPage'
import PointChargePage from './pages/billing/PointChargePage'
import PaymentHistoryPage from './pages/billing/PaymentHistoryPage'
import { useAuthStore } from './store/authStore'
import { useBillingAccessStore } from './store/billingAccessStore'

function AuthSplash() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg2)' }}>
      <div style={{ color: 'var(--slate2)', fontSize: 14 }}>세션 확인 중…</div>
    </div>
  )
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function BillingSplash() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg2)' }}>
      <div style={{ color: 'var(--slate2)', fontSize: 14 }}>이용 요금 확인 중…</div>
    </div>
  )
}

/** 체험·구독 만료 등 결제 필요 시 /billing 만 허용하고 나머지 경로는 결제 페이지로 보냄 */
function BillingGate({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { ready, paymentRequired } = useBillingAccessStore()

  useEffect(() => {
    void useBillingAccessStore.getState().refresh()
  }, [])

  if (!ready) return <BillingSplash />
  if (paymentRequired && !location.pathname.startsWith('/billing')) {
    return <Navigate to="/billing" replace />
  }
  return <>{children}</>
}

export default function App() {
  const { user, authReady } = useAuthStore()

  useEffect(() => {
    void useAuthStore.getState().bootstrap()
  }, [])

  if (!authReady) return <AuthSplash />

  return (
    <Routes>
      {/* 인증 페이지 (Layout 없음) */}
      <Route path="/login"  element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/signup" element={user ? <Navigate to="/" replace /> : <SignupPage />} />

      {/* 관리자 페이지 (Layout + 인증 필요) */}
      <Route path="/*" element={
        <PrivateRoute>
          <BillingGate>
          <Layout>
            <Routes>
              <Route path="/"  element={<HomePage />} />

              {/* 학부모 */}
              <Route path="/parents"                            element={<ParentListPage />} />
              <Route path="/parents/new"                        element={<ParentFormPage mode="add" />} />
              <Route path="/parents/:pid"                       element={<ParentDetailPage />} />
              <Route path="/parents/:pid/edit"                  element={<ParentFormPage mode="edit" />} />
              <Route path="/parents/:pid/student/new"           element={<StudentFormPage mode="add" />} />
              <Route path="/parents/:pid/student/:sid"          element={<StudentDetailPage />} />
              <Route path="/parents/:pid/student/:sid/edit"     element={<StudentFormPage mode="edit" />} />

              {/* 클래스 */}
              <Route path="/class"          element={<ClassListPage />} />
              <Route path="/class/new"      element={<ClassFormPage mode="add" />} />
              <Route path="/class/:cid"     element={<ClassDetailPage />} />
              <Route path="/class/:cid/edit" element={<ClassFormPage mode="edit" />} />

              {/* 기타 */}
              <Route path="/notice"          element={<NoticePage />} />
              <Route path="/payment"         element={<PaymentPage />} />
              <Route path="/payment/:sid"    element={<PaymentDetailPage />} />
              <Route path="/calendar"        element={<CalendarPage />} />
              <Route path="/attend"          element={<AttendListPage />} />
              <Route path="/attend/:cid/:date" element={<AttendSheetPage />} />
              <Route path="/attend/:cid/stats" element={<AttendStatsPage />} />
              <Route path="/attend/:cid/homework" element={<HomeworkPage />} />
              <Route path="/message"         element={<MessagePage />} />
              <Route path="/billing"         element={<BillingPage />} />
              <Route path="/billing/charge" element={<PointChargePage />} />
              <Route path="/billing/payments" element={<PaymentHistoryPage />} />
              <Route path="/profile"         element={<ProfilePage />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
          </BillingGate>
        </PrivateRoute>
      } />
    </Routes>
  )
}
