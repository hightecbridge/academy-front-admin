import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { isMenuEnabled } from '../../config/menuCatalog'

/** /exams · /grades → 사용 중인 시험 메뉴로 이동 */
export default function GradeRedirect() {
  const [params] = useSearchParams()
  const settings = useAuthStore((s) => s.user?.menuSettings)
  const q = params.toString()
  const suffix = q ? `?${q}` : ''
  if (isMenuEnabled(settings, 'examsRegular')) {
    return <Navigate to={`/exams/regular${suffix}`} replace />
  }
  if (isMenuEnabled(settings, 'examsDaily')) {
    return <Navigate to={`/exams/daily${suffix}`} replace />
  }
  return <Navigate to="/" replace />
}
