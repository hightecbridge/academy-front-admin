// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
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

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />

        {/* 학부모 관리 */}
        <Route path="/parents" element={<ParentListPage />} />
        <Route path="/parents/new" element={<ParentFormPage mode="add" />} />
        <Route path="/parents/:pid" element={<ParentDetailPage />} />
        <Route path="/parents/:pid/edit" element={<ParentFormPage mode="edit" />} />
        <Route path="/parents/:pid/student/new" element={<StudentFormPage mode="add" />} />
        <Route path="/parents/:pid/student/:sid" element={<StudentDetailPage />} />
        <Route path="/parents/:pid/student/:sid/edit" element={<StudentFormPage mode="edit" />} />

        {/* 클래스 관리 */}
        <Route path="/class" element={<ClassListPage />} />
        <Route path="/class/new" element={<ClassFormPage mode="add" />} />
        <Route path="/class/:cid" element={<ClassDetailPage />} />
        <Route path="/class/:cid/edit" element={<ClassFormPage mode="edit" />} />

        {/* 공지·수납·메시지 */}
        <Route path="/notice" element={<NoticePage />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/payment/:sid" element={<PaymentDetailPage />} />
        {/* 캘린더 */}
        <Route path="/calendar" element={<CalendarPage />} />

        {/* 출석 관리 */}
        <Route path="/attend" element={<AttendListPage />} />
        <Route path="/attend/:cid/:date" element={<AttendSheetPage />} />
        <Route path="/attend/:cid/stats" element={<AttendStatsPage />} />

        <Route path="/message" element={<MessagePage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
