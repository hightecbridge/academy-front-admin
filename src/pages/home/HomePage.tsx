// src/pages/home/HomePage.tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar, Avatar, Badge, ProgBar } from '../../components/common'
import { GroupedBarChart, MonthlyStatTable, fmtRevenue } from '../../components/dashboard/DashboardCharts'
import { useDataStore, totalFee, paidFee, isFullPaid, studentInClass } from '../../store/dataStore'
import { useAuthStore } from '../../store/authStore'
import { listSelectableYears } from '../../utils/paymentMonth'
import { isMenuEnabled } from '../../config/menuCatalog'

export default function HomePage() {
  const navigate = useNavigate()
  const students = useDataStore((s) => s.students)
  const classes = useDataStore((s) => s.classes)
  const attendSheets = useDataStore((s) => s.attendSheets)
  const events = useDataStore((s) => s.events)
  const consultations = useDataStore((s) => s.consultations)
  const dashboardStats = useDataStore((s) => s.dashboardStats)
  const fetchConsultations = useDataStore((s) => s.fetchConsultations)
  const fetchDashboardStats = useDataStore((s) => s.fetchDashboardStats)
  const menuSettings = useAuthStore((s) => s.user?.menuSettings)
  const showPayment = isMenuEnabled(menuSettings, 'payment')
  const showAttend = isMenuEnabled(menuSettings, 'attend')
  const showConsult = isMenuEnabled(menuSettings, 'consult')
  const showClass = isMenuEnabled(menuSettings, 'class')
  const showCalendar = isMenuEnabled(menuSettings, 'calendar')

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [statsLoading, setStatsLoading] = useState(false)
  const years = useMemo(() => listSelectableYears(5, 1), [])

  useEffect(() => {
    void fetchConsultations(now.getFullYear(), now.getMonth() + 1)
  }, [fetchConsultations])

  useEffect(() => {
    setStatsLoading(true)
    void fetchDashboardStats(year).finally(() => setStatsLoading(false))
  }, [year, fetchDashboardStats])

  const allStudents = students.filter((s) => s.status !== '퇴원')
  const tAmt = allStudents.reduce((a, s) => a + totalFee(s), 0)
  const pAmt = allStudents.reduce((a, s) => a + paidFee(s), 0)
  const unpaidCnt = allStudents.filter((s) => !isFullPaid(s)).length
  const pctTotal = tAmt > 0 ? Math.round((pAmt / tAmt) * 100) : 0

  const todayStr = now.toISOString().slice(0, 10)
  const todaySheets = attendSheets.filter((sh) => sh.date === todayStr)
  const todayPresent = todaySheets.reduce((a, sh) => a + sh.records.filter((r) => r.status === '출석').length, 0)
  const todayTotal = todaySheets.reduce((a, sh) => a + sh.records.length, 0)
  const todayAttendRate = todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 100) : null

  const upcomingEvents = events
    .filter((e) => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)

  const CAT_BG: Record<string, string> = { 수업: '#EEF4FF', 시험: '#F4F3FF', 휴일: '#FFFAEB', 행사: '#ECFDF5', 상담: '#FEF3F2', 기타: '#F9FAFB' }
  const CAT_TC: Record<string, string> = { 수업: '#1849A9', 시험: '#5925DC', 휴일: '#B54708', 행사: '#027A48', 상담: '#B42318', 기타: '#344054' }
  const DAY = ['일', '월', '화', '수', '목', '금', '토']

  const classStats = classes.map((cls) => {
    const cs = allStudents.filter((s) => studentInClass(s, cls))
    const cp = cs.reduce((a, s) => a + paidFee(s), 0)
    const ct = cs.reduce((a, s) => a + totalFee(s), 0)
    return {
      cid: cls.cid, name: cls.name, color: cls.color, textColor: cls.textColor,
      pct: ct > 0 ? Math.round((cp / ct) * 100) : 0,
    }
  })

  const recentConsults = [...consultations]
    .sort((a, b) => (b.date + (b.time ?? '')).localeCompare(a.date + (a.time ?? '')))
    .slice(0, 5)

  const thisMonth = dashboardStats?.months.find((m) => m.month === now.getMonth() + 1 && year === now.getFullYear())
  const months = dashboardStats?.months ?? Array.from({ length: 12 }, (_, i) => ({
    month: i + 1, enrolled: 0, withdrawn: 0, revenue: 0, unpaid: 0,
  }))

  return (
    <>
      <TopBar
        title="대시보드"
        sub={`${now.getFullYear()}년 ${now.getMonth() + 1}월`}
      />

      <div className="page-content-body">

        <div className="sec">
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">재원 학생</div>
              <div className="stat-value">{allStudents.length}</div>
              <div className="stat-sub">{classes.length}개 반</div>
            </div>
            {showPayment && (
            <div className="stat-card">
              <div className="stat-label">수납률</div>
              <div className="stat-value">{pctTotal}%</div>
              <div className="stat-sub">미납 {unpaidCnt}명</div>
            </div>
            )}
            {showAttend && (
            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/attend')}>
              <div className="stat-label">오늘 출석</div>
              <div className="stat-value" style={{ color: todayAttendRate !== null ? (todayAttendRate >= 80 ? 'var(--ok)' : 'var(--warn)') : 'var(--slate3)' }}>
                {todayAttendRate !== null ? `${todayAttendRate}%` : '-'}
              </div>
              <div className="stat-sub">{todayTotal > 0 ? `${todayPresent}/${todayTotal}명` : '미등록'}</div>
            </div>
            )}
            <div className="stat-card">
              <div className="stat-label">이번달 입회/퇴원</div>
              <div className="stat-value">
                {thisMonth ? thisMonth.enrolled : '-'}
                <span style={{ fontSize: 14, color: 'var(--slate3)', fontWeight: 600 }}> / </span>
                <span style={{ color: 'var(--err)', fontSize: 20 }}>{thisMonth ? thisMonth.withdrawn : '-'}</span>
              </div>
              <div className="stat-sub">입회 / 퇴원</div>
            </div>
          </div>
        </div>

        <div className="sec">
          <div className="row" style={{ marginBottom: 10 }}>
            <span className="sec-title" style={{ marginBottom: 0 }}>월별 · 연도별 현황</span>
            <select
              className="input-field"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              style={{ width: 110, padding: '6px 10px', fontSize: 13, marginTop: 0 }}
              aria-label="통계 연도"
            >
              {years.map((y) => <option key={y} value={y}>{y}년</option>)}
            </select>
          </div>

          {statsLoading && (
            <div style={{ fontSize: 12, color: 'var(--slate3)', marginBottom: 8 }}>통계를 불러오는 중…</div>
          )}

          <div className="stat-grid" style={{ marginBottom: 12 }}>
            <div className="stat-card">
              <div className="stat-label">{year}년 입회</div>
              <div className="stat-value" style={{ color: '#6C63FF' }}>{dashboardStats?.yearEnrolled ?? 0}</div>
              <div className="stat-sub">명</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{year}년 퇴원</div>
              <div className="stat-value" style={{ color: 'var(--err)' }}>{dashboardStats?.yearWithdrawn ?? 0}</div>
              <div className="stat-sub">명</div>
            </div>
            {showPayment && (
            <div className="stat-card">
              <div className="stat-label">{year}년 매출</div>
              <div className="stat-value" style={{ fontSize: 18, color: 'var(--ok)' }}>{fmtRevenue(dashboardStats?.yearRevenue ?? 0)}</div>
              <div className="stat-sub">완납 합계</div>
            </div>
            )}
            {showPayment && (
            <div className="stat-card">
              <div className="stat-label">{year}년 미수</div>
              <div className="stat-value" style={{ fontSize: 18, color: 'var(--err)' }}>{fmtRevenue(dashboardStats?.yearUnpaid ?? 0)}</div>
              <div className="stat-sub">미납 합계</div>
            </div>
            )}
          </div>

          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <div className="row" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>수강생 입회 · 퇴원</span>
              <span style={{ fontSize: 12, color: 'var(--slate2)' }}>
                순증감 {(dashboardStats?.yearEnrolled ?? 0) - (dashboardStats?.yearWithdrawn ?? 0)}명
              </span>
            </div>
            <GroupedBarChart
              months={months}
              aKey="enrolled"
              bKey="withdrawn"
              aColor="#6C63FF"
              bColor="#F04438"
              aLabel="입회"
              bLabel="퇴원"
            />
          </div>

          {showPayment && (
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <div className="row" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>학원 월별 매출</span>
              <span
                style={{ fontSize: 12, color: 'var(--acc)', fontWeight: 700, cursor: 'pointer' }}
                onClick={() => navigate('/payment')}
              >
                수납 관리 →
              </span>
            </div>
            <GroupedBarChart
              months={months}
              aKey="revenue"
              bKey="unpaid"
              aColor="#0BAB64"
              bColor="#F79009"
              aLabel="완납 매출"
              bLabel="미수금"
              formatValue={fmtRevenue}
            />
          </div>
          )}

          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)', margin: '4px 4px 0' }}>
              {year}년 월별 상세
            </div>
            <MonthlyStatTable months={months} year={year} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 0 }}>
          {showPayment && showClass && (
          <div className="sec">
            <div className="row" style={{ marginBottom: 10 }}>
              <span className="sec-title" style={{ marginBottom: 0 }}>반별 수납률</span>
              <span style={{ fontSize: 11, color: 'var(--acc)', cursor: 'pointer' }} onClick={() => navigate('/class')}>클래스 관리 →</span>
            </div>
            <div className="card" style={{ padding: '14px 16px' }}>
              {classStats.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--slate3)', fontSize: 13, padding: '8px 0' }}>등록된 반이 없습니다</div>
              )}
              {classStats.map((cs, i) => (
                <div key={cs.cid} style={{ marginBottom: i < classStats.length - 1 ? 14 : 0, cursor: 'pointer' }} onClick={() => navigate(`/class/${cs.cid}`)}>
                  <div className="row" style={{ marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: cs.color, border: `1px solid ${cs.textColor}` }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{cs.name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: cs.pct >= 90 ? 'var(--ok)' : cs.pct >= 70 ? 'var(--warn)' : 'var(--err)' }}>{cs.pct}%</span>
                  </div>
                  <ProgBar pct={cs.pct} color={cs.pct >= 90 ? 'var(--ok)' : cs.pct >= 70 ? 'var(--warn)' : 'var(--err)'} />
                </div>
              ))}
            </div>
          </div>
          )}

          {showConsult && (
          <div className="sec">
            <div className="row" style={{ marginBottom: 10 }}>
              <span className="sec-title" style={{ marginBottom: 0 }}>최근 상담</span>
              <span style={{ fontSize: 11, color: 'var(--acc)', cursor: 'pointer' }} onClick={() => navigate('/consult')}>상담관리 →</span>
            </div>
            <div className="card">
              {recentConsults.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--slate3)', fontSize: 13, padding: '12px 0' }}>이번달 상담 기록이 없습니다</div>
              )}
              {recentConsults.map((c) => (
                <div
                  key={c.id}
                  className="list-row"
                  onClick={() => c.studentId ? navigate(`/parents/${c.studentId}`) : navigate('/consult')}
                >
                  <Avatar name={c.studentName} col="#EEF4FF" tc="#1849A9" />
                  <div style={{ flex: 1 }}>
                    <div className="row">
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{c.studentName}</span>
                      <Badge cls={c.kind === '신규' ? 'badge-green' : 'badge-blue'}>{c.kind}</Badge>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 2 }}>
                      {c.date}{c.time ? ` ${c.time}` : ''} · {c.teacherName || '미지정'}
                    </div>
                  </div>
                  <svg style={{ width: 13, height: 13, stroke: 'var(--slate3)', fill: 'none', strokeWidth: 2, strokeLinecap: 'round' }} viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>

        {showCalendar && upcomingEvents.length > 0 && (
          <div className="sec">
            <div className="row" style={{ marginBottom: 10 }}>
              <span className="sec-title" style={{ marginBottom: 0 }}>다가오는 일정</span>
              <span style={{ fontSize: 11, color: 'var(--acc)', cursor: 'pointer' }} onClick={() => navigate('/calendar')}>전체보기 →</span>
            </div>
            <div className="card">
              {upcomingEvents.map((e, i) => (
                <div key={e.id} onClick={() => navigate('/calendar')}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: i < upcomingEvents.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: CAT_BG[e.category] ?? 'var(--bg3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: CAT_TC[e.category] ?? 'var(--slate)', lineHeight: 1 }}>{parseInt(e.date.slice(8))}</span>
                    <span style={{ fontSize: 9, color: CAT_TC[e.category] ?? 'var(--slate)', opacity: 0.7 }}>{DAY[new Date(e.date).getDay()]}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: CAT_BG[e.category] ?? 'var(--bg3)', color: CAT_TC[e.category] ?? 'var(--slate)' }}>{e.category}</span>
                      {e.targets.map((t) => <span key={t} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 8, background: 'var(--bg3)', color: 'var(--slate2)' }}>{t}</span>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  )
}
