// src/pages/attend/AttendStatsPage.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TopBar, Breadcrumb, TabBar, ProgBar } from '../../components/common'
import { useDataStore, studentInClass } from '../../store/dataStore'
import { useAuthStore } from '../../store/authStore'
import type { AttendStatus } from '../../types'
import { buildYearMonth, currentYearMonth, parseYearMonth } from '../../utils/paymentMonth'
import { classSheetsForMonth, shouldSkipAttend, studentMonthAttendStats } from '../../utils/attendHoliday'

const STATUS_BG: Record<AttendStatus, string> = {
  출석: 'var(--ok2)', 지각: 'var(--warn2)', 조퇴: 'var(--warn2)',
  결석: 'var(--err2)', 공결: 'var(--bg3)',
}
const STATUS_TC: Record<AttendStatus, string> = {
  출석: '#027A48', 지각: '#B54708', 조퇴: '#B54708',
  결석: '#B42318', 공결: 'var(--slate2)',
}

export default function AttendStatsPage() {
  const { cid } = useParams<{ cid: string }>()
  const navigate = useNavigate()
  const classes = useDataStore((s) => s.classes)
  const students = useDataStore((s) => s.students)
  const attendSheets = useDataStore((s) => s.attendSheets)
  const events = useDataStore((s) => s.events)
  const fetchAttend = useDataStore((s) => s.fetchAttend)
  const fetchEvents = useDataStore((s) => s.fetchEvents)
  const excludeHolidays = !!useAuthStore((s) => s.user?.excludeHolidaysFromAttend)
  const refreshAttendSettings = useAuthStore((s) => s.refreshAttendSettings)
  const [period, setPeriod] = useState<'month' | 'all'>('month')
  const [yearMonth, setYearMonth] = useState(currentYearMonth)
  const [sortBy, setSortBy] = useState<'name' | 'rate'>('name')

  const cls = classes.find((c) => c.cid === Number(cid))
  const allStudents = students
  const stuInClass = cls ? allStudents.filter((s) => studentInClass(s, cls)) : []
  const { year, month } = parseYearMonth(yearMonth)
  const ym = `${year}-${String(month).padStart(2, '0')}`

  useEffect(() => {
    void refreshAttendSettings()
    void fetchEvents()
  }, [refreshAttendSettings, fetchEvents])

  useEffect(() => {
    if (!cid) return
    void fetchAttend(Number(cid))
  }, [cid, fetchAttend])

  const sheets = !cls ? [] : period === 'month'
    ? classSheetsForMonth(attendSheets, cls.cid, ym, excludeHolidays, events, cls.name)
    : attendSheets.filter((sh) => sh.cid === cls.cid && !shouldSkipAttend(sh.date, excludeHolidays, events, cls.name))

  if (!cls) return <div className="sec">반 정보를 찾을 수 없습니다.</div>

  const stuStats = stuInClass.map((stu) => {
    const stats = studentMonthAttendStats(stu, sheets)
    return { ...stu, ...stats, totalSessions: stats.classDays }
  })

  const sorted = [...stuStats].sort((a, b) =>
    sortBy === 'name' ? a.name.localeCompare(b.name) : b.rate - a.rate
  )

  const avgRate = stuStats.length > 0
    ? Math.round(stuStats.reduce((a, s) => a + s.rate, 0) / stuStats.length)
    : 0

  const recentSheets = [...sheets]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)
    .reverse()

  const DAY = ['일','월','화','수','목','금','토']
  const shiftMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1)
    setYearMonth(buildYearMonth(d.getFullYear(), d.getMonth() + 1))
    setPeriod('month')
  }

  return (
    <>
      <TopBar
        title="출석 통계"
        sub={`${cls.name} · ${cls.subject}`}
        onBack={() => navigate('/attend')}
      />
      <Breadcrumb items={[
        { label: '출석 관리', onClick: () => navigate('/attend') },
        { label: `${cls.name} 통계` },
      ]} />
      <TabBar
        tabs={['월별', '전체 기간']}
        active={period === 'month' ? 0 : 1}
        onChange={(i) => setPeriod(i === 0 ? 'month' : 'all')}
      />

      <div className="page-content-body">
        {period === 'month' && (
          <div className="sec">
            <div className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="이전 달">‹</button>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>{year}년 {month}월</div>
              <button className="icon-btn" onClick={() => shiftMonth(1)} aria-label="다음 달">›</button>
            </div>
          </div>
        )}

        <div className="sec">
          <div style={{ background: cls.color, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: cls.textColor, marginBottom: 10 }}>
              {period === 'month' ? `${month}월` : '전체'} 출석 현황 — 수업 {sheets.length}일
              {excludeHolidays ? ' · 공휴일 제외' : ''}
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { label: '평균 출석률', value: `${avgRate}%` },
                { label: '등록 학생',   value: `${stuInClass.length}명` },
                { label: '수업일수',   value: `${sheets.length}일` },
              ].map(({ label, value }) => (
                <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: cls.textColor }}>{value}</div>
                  <div style={{ fontSize: 11, color: cls.textColor, opacity: 0.7 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {recentSheets.length > 0 && (
          <div className="sec">
            <div className="sec-title">최근 수업별 출석률</div>
            <div className="card" style={{ padding: '14px 16px' }}>
              {recentSheets.map((sh) => {
                const presentN = sh.records.filter((r) => r.status === '출석').length
                const totalN = stuInClass.length
                const pct = totalN > 0 ? Math.round((presentN / totalN) * 100) : 0
                const dObj = new Date(`${sh.date}T00:00:00`)
                return (
                  <div key={sh.id} style={{ marginBottom: 10, cursor: 'pointer' }}
                    onClick={() => navigate(`/attend/${cls.cid}/${sh.date}`)}>
                    <div className="row" style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--slate2)' }}>
                        {sh.date.slice(5).replace('-', '/')} ({DAY[dObj.getDay()]})
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: pct >= 80 ? 'var(--ok)' : 'var(--warn)' }}>
                        {presentN}/{totalN}명 {pct}%
                      </span>
                    </div>
                    <ProgBar pct={pct} color={pct >= 80 ? 'var(--ok)' : pct >= 60 ? 'var(--warn)' : 'var(--err)'} />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="sec">
          <div className="row" style={{ marginBottom: 10 }}>
            <span className="sec-title" style={{ marginBottom: 0 }}>
              학생별 {period === 'month' ? `${month}월` : '전체'} 출석·결석
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['이름순', 'name'], ['출석률순', 'rate']].map(([label, key]) => (
                <button key={key} onClick={() => setSortBy(key as 'name' | 'rate')}
                  style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 20,
                    background: sortBy === key ? 'var(--acc)' : 'var(--bg2)',
                    color: sortBy === key ? '#fff' : 'var(--slate2)',
                    border: `1px solid ${sortBy === key ? 'var(--acc)' : 'var(--border)'}`,
                    cursor: 'pointer',
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {sheets.length === 0 && (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--slate3)', fontSize: 13 }}>
              {period === 'month' ? `${month}월` : '전체 기간'} 출석 기록이 없습니다.
            </div>
          )}

          {sorted.length > 0 && (
            <div className="card" style={{ overflow: 'hidden', marginBottom: 12 }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 58px 64px 64px 52px',
                padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--slate2)',
                background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
              }}>
                <span>학생</span>
                <span style={{ textAlign: 'right' }}>수업</span>
                <span style={{ textAlign: 'right' }}>출석일</span>
                <span style={{ textAlign: 'right' }}>결석일</span>
                <span style={{ textAlign: 'right' }}>출석률</span>
              </div>
              {sorted.map((stu) => (
                <div key={stu.sid} style={{
                  display: 'grid', gridTemplateColumns: '1fr 58px 64px 64px 52px',
                  padding: '11px 14px', fontSize: 13, borderBottom: '1px solid var(--border)',
                  alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{stu.name}</span>
                  <span style={{ textAlign: 'right', color: 'var(--slate2)' }}>{stu.classDays}</span>
                  <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--ok)' }}>{stu.present}</span>
                  <span style={{ textAlign: 'right', fontWeight: 700, color: stu.absent > 0 ? 'var(--err)' : 'var(--slate2)' }}>{stu.absent}</span>
                  <span style={{ textAlign: 'right', fontWeight: 700, color: stu.rate >= 80 ? 'var(--ok)' : stu.rate >= 60 ? 'var(--warn)' : 'var(--err)' }}>{stu.rate}%</span>
                </div>
              ))}
            </div>
          )}

          {sorted.map((stu) => (
            <div key={stu.sid} className="card" style={{ marginBottom: 8 }}>
              <div style={{ padding: '13px 14px' }}>
                <div className="row" style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar" style={{ background: stu.col, color: stu.tc, width: 34, height: 34, fontSize: 13 }}>
                      {stu.name[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{stu.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--slate2)', marginTop: 1 }}>{stu.grade} · {stu.parentName}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: stu.rate >= 80 ? 'var(--ok)' : stu.rate >= 60 ? 'var(--warn)' : 'var(--err)' }}>
                      {stu.rate}%
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--slate3)' }}>출석 {stu.present} / 수업 {stu.classDays}일</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 2, height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                  {stu.present  > 0 && <div style={{ flex: stu.present,  background: 'var(--ok)'     }} />}
                  {stu.late     > 0 && <div style={{ flex: stu.late,     background: 'var(--warn)'   }} />}
                  {stu.absent   > 0 && <div style={{ flex: stu.absent,   background: 'var(--err)'    }} />}
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {([
                    { label: '출석', cnt: stu.present  },
                    { label: '지각', cnt: stu.late     },
                    { label: '결석', cnt: stu.absent   },
                  ] as { label: AttendStatus; cnt: number }[]).map(({ label, cnt }) => (
                    <div key={label} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: STATUS_BG[label], borderRadius: 6, padding: '3px 8px',
                    }}>
                      <span style={{ fontSize: 11, color: STATUS_TC[label] }}>{label === '출석' ? '출석일수' : label === '결석' ? '결석일수' : label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_TC[label] }}>{cnt}</span>
                    </div>
                  ))}
                  {stu.absent >= 3 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: 'var(--err2)', borderRadius: 6, padding: '3px 8px',
                      border: '1px solid var(--err)',
                    }}>
                      <span style={{ fontSize: 11, color: 'var(--err)', fontWeight: 700 }}>⚠ 결석 주의</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </>
  )
}
