// src/pages/attend/AttendListPage.tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar, TabBar, Fab, Toggle } from '../../components/common'
import { useDataStore, studentInClass } from '../../store/dataStore'
import { useAuthStore } from '../../store/authStore'
import { buildYearMonth, currentYearMonth, parseYearMonth } from '../../utils/paymentMonth'
import { localISODate } from '../../utils/koreanHolidays'
import {
  attendHolidayName,
  classSheetsForMonth,
  shouldSkipAttend,
  studentMonthAttendStats,
} from '../../utils/attendHoliday'

export default function AttendListPage() {
  const navigate = useNavigate()
  const classes = useDataStore((s) => s.classes)
  const students = useDataStore((s) => s.students)
  const attendSheets = useDataStore((s) => s.attendSheets)
  const events = useDataStore((s) => s.events)
  const fetchAttend = useDataStore((s) => s.fetchAttend)
  const fetchEvents = useDataStore((s) => s.fetchEvents)
  const user = useAuthStore((s) => s.user)
  const updateAttendSettings = useAuthStore((s) => s.updateAttendSettings)
  const refreshAttendSettings = useAuthStore((s) => s.refreshAttendSettings)
  const [tabIdx, setTabIdx] = useState(0)
  const [yearMonth, setYearMonth] = useState(currentYearMonth)
  const [savingSetting, setSavingSetting] = useState(false)
  const today = localISODate()
  const [attendDate, setAttendDate] = useState(today)

  const allStudents = students
  const tabs = classes.map((c) => c.name)
  const currentCls = classes[tabIdx]
  const excludeHolidays = !!user?.excludeHolidaysFromAttend
  const { year, month } = parseYearMonth(yearMonth)
  const ym = `${year}-${String(month).padStart(2, '0')}`

  useEffect(() => {
    void refreshAttendSettings()
    void fetchEvents()
  }, [refreshAttendSettings, fetchEvents])

  useEffect(() => {
    if (!currentCls) return
    void fetchAttend(currentCls.cid)
  }, [currentCls?.cid, fetchAttend])

  const holidayForDate = currentCls
    ? attendHolidayName(attendDate, events, currentCls.name)
    : null
  const skipSelected = shouldSkipAttend(attendDate, excludeHolidays, events, currentCls?.name)

  const stuInClass = currentCls ? allStudents.filter((s) => studentInClass(s, currentCls)) : []
  const sheetsForClass = attendSheets
    .filter((sh) => currentCls && sh.cid === currentCls.cid)
    .sort((a, b) => b.date.localeCompare(a.date))

  const monthSheets = currentCls
    ? classSheetsForMonth(attendSheets, currentCls.cid, ym, excludeHolidays, events, currentCls.name)
    : []
  const totalSlots = monthSheets.length * stuInClass.length
  const presentCount = monthSheets.reduce(
    (a, sh) => a + sh.records.filter((r) => r.status === '출석').length, 0
  )
  const monthAttendRate = totalSlots > 0 ? Math.round((presentCount / totalSlots) * 100) : 0

  const stuMonthStats = useMemo(() => {
    return stuInClass.map((stu) => ({
      ...stu,
      ...studentMonthAttendStats(stu, monthSheets),
    }))
  }, [stuInClass, monthSheets])

  const statusColor: Record<string, string> = {
    '출석': 'var(--ok)', '지각': 'var(--warn)', '조퇴': 'var(--warn)',
    '결석': 'var(--err)', '공결': 'var(--slate3)',
  }

  const goSheet = (date: string) => {
    if (!currentCls) return
    if (shouldSkipAttend(date, excludeHolidays, events, currentCls.name)) {
      const name = attendHolidayName(date, events, currentCls.name)
      alert(`공휴일(${name})에는 출석 체크를 하지 않습니다.`)
      return
    }
    navigate(`/attend/${currentCls.cid}/${date}`)
  }

  const handleToggle = async (v: boolean) => {
    setSavingSetting(true)
    const ok = await updateAttendSettings(v)
    setSavingSetting(false)
    if (!ok) alert('출석 설정 저장에 실패했습니다.')
  }

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1)
    setYearMonth(buildYearMonth(d.getFullYear(), d.getMonth() + 1))
  }

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
        <div className="sec">
          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="row" style={{ marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>공휴일 제외 출석일</div>
                <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 4, lineHeight: 1.45 }}>
                  켜면 법정 공휴일과 캘린더 휴일에는 출석 체크를 하지 않고, 수업일수에서도 빼습니다.
                </div>
              </div>
              <Toggle checked={excludeHolidays} disabled={savingSetting} onChange={(v) => void handleToggle(v)} />
            </div>
          </div>
        </div>

        <div className="sec">
          <div className="row" style={{ marginBottom: 10 }}>
            <span className="sec-title" style={{ marginBottom: 0 }}>{year}년 {month}월 요약</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="이전 달">‹</button>
              <button className="icon-btn" onClick={() => shiftMonth(1)} aria-label="다음 달">›</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div className="stat-card">
              <div className="stat-label">수업일수</div>
              <div className="stat-value" style={{ fontSize: 18 }}>{monthSheets.length}</div>
              <div className="stat-sub">{excludeHolidays ? '공휴일 제외' : '회'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">평균 출석률</div>
              <div className="stat-value" style={{ fontSize: 18, color: monthAttendRate >= 80 ? 'var(--ok)' : 'var(--warn)' }}>
                {monthAttendRate}%
              </div>
              <div className="stat-sub">{month}월</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">등록 학생</div>
              <div className="stat-value" style={{ fontSize: 18 }}>{stuInClass.length}</div>
              <div className="stat-sub">명</div>
            </div>
          </div>
        </div>

        <div className="sec">
          <div className="row" style={{ marginBottom: 10 }}>
            <span className="sec-title" style={{ marginBottom: 0 }}>학생별 {month}월 출석</span>
            <span
              style={{ fontSize: 11, color: 'var(--acc)', cursor: 'pointer' }}
              onClick={() => navigate(`/attend/${currentCls.cid}/stats`)}
            >
              상세 통계 →
            </span>
          </div>
          {stuInClass.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--slate3)', fontSize: 13 }}>
              이 반에 등록된 학생이 없습니다.
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 64px 64px 64px',
                padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--slate2)',
                background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
              }}>
                <span>학생</span>
                <span style={{ textAlign: 'right' }}>수업</span>
                <span style={{ textAlign: 'right' }}>출석</span>
                <span style={{ textAlign: 'right' }}>결석</span>
              </div>
              {stuMonthStats.map((stu) => (
                <div key={stu.sid} style={{
                  display: 'grid', gridTemplateColumns: '1fr 64px 64px 64px',
                  padding: '11px 14px', fontSize: 13, borderBottom: '1px solid var(--border)',
                  alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{stu.name}</span>
                  <span style={{ textAlign: 'right', color: 'var(--slate2)' }}>{stu.classDays}</span>
                  <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--ok)' }}>{stu.present}</span>
                  <span style={{ textAlign: 'right', fontWeight: 700, color: stu.absent > 0 ? 'var(--err)' : 'var(--slate2)' }}>{stu.absent}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sec">
          <div className="card" style={{ padding: 14 }}>
            <label className="input-label" style={{ marginTop: 0 }}>출석 날짜</label>
            <input
              className="input-field"
              type="date"
              value={attendDate}
              onChange={(e) => setAttendDate(e.target.value)}
            />
            {skipSelected && holidayForDate && (
              <div style={{
                marginTop: 8, padding: '8px 10px', borderRadius: 8, fontSize: 12,
                background: 'var(--warn2)', color: '#92400E',
              }}>
                {holidayForDate} — 공휴일에는 출석 체크를 하지 않습니다.
              </div>
            )}
            <button
              className="btn-primary"
              style={{ marginTop: 10, opacity: skipSelected ? 0.55 : 1 }}
              disabled={skipSelected}
              onClick={() => goSheet(attendDate)}
            >
              {attendDate === today ? '오늘 출석 등록 / 확인' : `${attendDate.slice(5).replace('-', '/')} 출석 등록 / 확인`}
            </button>
          </div>
        </div>

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
              아직 출석 기록이 없습니다.<br />위 버튼으로 출석을 등록해보세요.
            </div>
          )}

          {sheetsForClass.map((sh) => {
            const presentN = sh.records.filter((r) => r.status === '출석').length
            const lateN = sh.records.filter((r) => r.status === '지각' || r.status === '조퇴').length
            const absentN = sh.records.filter((r) => r.status === '결석').length
            const pct = sh.records.length > 0 ? Math.round((presentN / sh.records.length) * 100) : 0
            const dateObj = new Date(`${sh.date}T00:00:00`)
            const dayNames = ['일', '월', '화', '수', '목', '금', '토']
            const dayName = dayNames[dateObj.getDay()]
            const isToday = sh.date === today
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6
            const holidayName = attendHolidayName(sh.date, events, currentCls.name)

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
                          {holidayName && (
                            <span style={{ fontSize: 11, color: '#92400E', marginLeft: 6, fontWeight: 700 }}>{holidayName}</span>
                          )}
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

      <Fab onClick={() => goSheet(attendDate)} />
    </>
  )
}
