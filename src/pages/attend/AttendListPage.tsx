// src/pages/attend/AttendListPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar, TabBar, Fab, ProgBar } from '../../components/common'
import { useDataStore } from '../../store/dataStore'

export default function AttendListPage() {
  const navigate = useNavigate()
  const classes = useDataStore((s) => s.classes)
  const parents = useDataStore((s) => s.parents)
  const attendSheets = useDataStore((s) => s.attendSheets)
  const [tabIdx, setTabIdx] = useState(0)

  const allStudents = parents.flatMap((p) => p.students)
  const tabs = classes.map((c) => c.name)
  const currentCls = classes[tabIdx]

  if (!currentCls) {
    return (
      <>
        <TopBar title="출석 관리" sub="반을 먼저 등록해주세요" />
      <div className="page-content-body">
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--slate3)', fontSize: 13 }}>
            등록된 반이 없습니다.<br />클래스 관리에서 반을 추가하세요.
            <br /><br />
            <button
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 24px' }}
              onClick={() => navigate('/class/new')}
            >
              반 추가하기
            </button>
          </div>
        </div>
      </>
    )
  }

  const stuInClass = allStudents.filter((s) => s.cls === currentCls.name)
  const sheetsForClass = attendSheets
    .filter((sh) => sh.cid === currentCls.cid)
    .sort((a, b) => b.date.localeCompare(a.date))

  // 이번달 출석 통계
  const today = new Date()
  const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const monthSheets = sheetsForClass.filter((sh) => sh.date.startsWith(ym))
  const totalSlots = monthSheets.length * stuInClass.length
  const presentCount = monthSheets.reduce(
    (a, sh) => a + sh.records.filter((r) => r.status === '출석').length, 0
  )
  const monthAttendRate = totalSlots > 0 ? Math.round((presentCount / totalSlots) * 100) : 0

  const statusColor: Record<string, string> = {
    '출석': 'var(--ok)', '지각': 'var(--warn)', '조퇴': 'var(--warn)',
    '결석': 'var(--err)', '공결': 'var(--slate3)',
  }
  const statusBg: Record<string, string> = {
    '출석': 'var(--ok2)', '지각': 'var(--warn2)', '조퇴': 'var(--warn2)',
    '결석': 'var(--err2)', '공결': 'var(--bg3)',
  }
  const statusTc: Record<string, string> = {
    '출석': '#065F46', '지각': '#92400E', '조퇴': '#92400E',
    '결석': '#991B1B', '공결': 'var(--slate2)',
  }

  return (
    <>
      <TopBar
        title="출석 관리"
        sub={`${currentCls.name} · ${stuInClass.length}명`}
      />
      {tabs.length > 0 && (
        <TabBar tabs={tabs} active={tabIdx} onChange={setTabIdx} />
      )}

      <div className="page-content-body">
        {/* 이번달 요약 */}
        <div className="sec">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div className="stat-card">
              <div className="stat-label">이번달 수업</div>
              <div className="stat-value" style={{ fontSize: 18 }}>{monthSheets.length}</div>
              <div className="stat-sub">회</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">평균 출석률</div>
              <div className="stat-value" style={{ fontSize: 18, color: monthAttendRate >= 80 ? 'var(--ok)' : 'var(--warn)' }}>
                {monthAttendRate}%
              </div>
              <div className="stat-sub">이번달</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">등록 학생</div>
              <div className="stat-value" style={{ fontSize: 18 }}>{stuInClass.length}</div>
              <div className="stat-sub">명</div>
            </div>
          </div>
        </div>

        {/* 오늘 출석 등록 버튼 */}
        <div className="sec">
          <button
            className="btn-primary"
            style={{ marginTop: 0 }}
            onClick={() => {
              const d = today.toISOString().slice(0, 10)
              navigate(`/attend/${currentCls.cid}/${d}`)
            }}
          >
            오늘 출석 등록 / 확인
          </button>
          <button
            className="btn-secondary"
            style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
            onClick={() => navigate(`/attend/${currentCls.cid}/homework`)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="9" y1="13" x2="15" y2="13"/>
              <line x1="9" y1="17" x2="15" y2="17"/>
              <polyline points="9 9 9.01 9"/>
            </svg>
            📝 숙제 관리
          </button>
        </div>

        {/* 날짜별 출석부 목록 */}
        <div className="sec">
          <div className="row" style={{ marginBottom: 10 }}>
            <span className="sec-title" style={{ marginBottom: 0 }}>출석부 목록</span>
            <span
              style={{ fontSize: 11, color: 'var(--acc)', cursor: 'pointer' }}
              onClick={() => navigate(`/attend/${currentCls.cid}/stats`)}
            >
              학생별 통계 →
            </span>
          </div>

          {sheetsForClass.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--slate3)', fontSize: 13 }}>
              아직 출석 기록이 없습니다.<br />위 버튼으로 오늘 출석을 등록해보세요.
            </div>
          )}

          {sheetsForClass.map((sh) => {
            const presentN = sh.records.filter((r) => r.status === '출석').length
            const lateN = sh.records.filter((r) => r.status === '지각' || r.status === '조퇴').length
            const absentN = sh.records.filter((r) => r.status === '결석').length
            const pct = sh.records.length > 0 ? Math.round((presentN / sh.records.length) * 100) : 0
            const dateObj = new Date(sh.date)
            const dayNames = ['일', '월', '화', '수', '목', '금', '토']
            const dayName = dayNames[dateObj.getDay()]
            const isToday = sh.date === today.toISOString().slice(0, 10)
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6

            return (
              <div
                key={sh.id}
                className="card"
                style={{ marginBottom: 8, cursor: 'pointer' }}
                onClick={() => navigate(`/attend/${currentCls.cid}/${sh.date}`)}
              >
                <div style={{ padding: '13px 16px' }}>
                  <div className="row" style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: isToday ? currentCls.color : 'var(--bg2)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        border: isToday ? `1.5px solid ${currentCls.textColor}` : '0.5px solid var(--border)',
                      }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: isToday ? currentCls.textColor : isWeekend ? 'var(--err)' : 'var(--navy)', lineHeight: 1 }}>
                          {sh.date.slice(8)}
                        </span>
                        <span style={{ fontSize: 9, color: isToday ? currentCls.textColor : isWeekend ? 'var(--err)' : 'var(--slate3)', marginTop: 1 }}>
                          {dayName}
                        </span>
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>
                          {sh.date.slice(0, 7).replace('-', '.')} 수업
                          {isToday && <span style={{ fontSize: 11, color: currentCls.textColor, marginLeft: 6, fontWeight: 700 }}>오늘</span>}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 2 }}>
                          {sh.records.length}명 기록
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: pct >= 80 ? 'var(--ok)' : 'var(--warn)' }}>{pct}%</span>
                    </div>
                  </div>

                  {/* 출석 현황 바 */}
                  {sh.records.length > 0 && (
                    <>
                      <div style={{ display: 'flex', gap: 2, height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                        {presentN > 0 && <div style={{ flex: presentN, background: 'var(--ok)' }} />}
                        {lateN > 0 && <div style={{ flex: lateN, background: 'var(--warn)' }} />}
                        {absentN > 0 && <div style={{ flex: absentN, background: 'var(--err)' }} />}
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        {[['출석', presentN, statusColor['출석']], ['지각/조퇴', lateN, statusColor['지각']], ['결석', absentN, statusColor['결석']]].map(([label, cnt, col]) => (
                          Number(cnt) > 0 && (
                            <span key={String(label)} style={{ fontSize: 11, color: String(col) }}>
                              {label} {cnt}명
                            </span>
                          )
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Fab onClick={() => {
        const d = today.toISOString().slice(0, 10)
        navigate(`/attend/${currentCls.cid}/${d}`)
      }} />
    </>
  )
}
