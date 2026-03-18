// src/pages/attend/AttendSheetPage.tsx
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TopBar, Breadcrumb, useToast, Toast } from '../../components/common'
import { useDataStore } from '../../store/dataStore'
import type { AttendRecord, AttendStatus } from '../../types'

const STATUS_LIST: AttendStatus[] = ['출석', '지각', '조퇴', '결석', '공결']

const STATUS_STYLE: Record<AttendStatus, { bg: string; tc: string; border: string }> = {
  출석: { bg: '#D1FAE5', tc: '#065F46', border: '#10B981' },
  지각: { bg: '#FEF3C7', tc: '#92400E', border: '#F59E0B' },
  조퇴: { bg: '#FEF9C3', tc: '#854D0E', border: '#EAB308' },
  결석: { bg: '#FEE2E2', tc: '#991B1B', border: '#EF4444' },
  공결: { bg: '#F1F5F9', tc: '#475569', border: '#94A3B8' },
}

export default function AttendSheetPage() {
  const { cid, date } = useParams<{ cid: string; date: string }>()
  const navigate = useNavigate()
  const classes = useDataStore((s) => s.classes)
  const parents = useDataStore((s) => s.parents)
  const attendSheets = useDataStore((s) => s.attendSheets)
  const saveAttendSheet = useDataStore((s) => s.saveAttendSheet)
  const deleteAttendSheet = useDataStore((s) => s.deleteAttendSheet)
  const { ref: toastRef, show: showToast } = useToast()

  const cls = classes.find((c) => c.cid === Number(cid))
  const allStudents = parents.flatMap((p) => p.students)
  const stuInClass = allStudents.filter((s) => s.cls === cls?.name)

  const sheetId = `${cid}_${date}`
  const existing = attendSheets.find((s) => s.id === sheetId)

  // 초기 레코드: 기존 있으면 불러오고, 없으면 전체 '출석'
  const [records, setRecords] = useState<AttendRecord[]>(() =>
    existing
      ? existing.records
      : stuInClass.map((s) => ({ sid: s.sid, status: '출석' as AttendStatus }))
  )
  const [notes, setNotes] = useState<Record<number, string>>(() => {
    const m: Record<number, string> = {}
    if (existing) existing.records.forEach((r) => { if (r.note) m[r.sid] = r.note })
    return m
  })
  const [showNoteFor, setShowNoteFor] = useState<number | null>(null)
  const [saved, setSaved] = useState(!!existing)

  // 학생 목록이 업데이트되면 기존 records에 없는 학생 추가
  useEffect(() => {
    setRecords((prev) => {
      const prevSids = new Set(prev.map((r) => r.sid))
      const newEntries = stuInClass
        .filter((s) => !prevSids.has(s.sid))
        .map((s) => ({ sid: s.sid, status: '출석' as AttendStatus }))
      return [...prev, ...newEntries]
    })
  }, [stuInClass.length])

  if (!cls || !date) return <div className="sec">정보를 찾을 수 없습니다.</div>

  const dateObj = new Date(date)
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  const dateLabel = `${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 (${dayNames[dateObj.getDay()]})`
  const today = new Date().toISOString().slice(0, 10)
  const isToday = date === today

  const setStatus = (sid: number, status: AttendStatus) => {
    setRecords((prev) => prev.map((r) => r.sid === sid ? { ...r, status } : r))
    setSaved(false)
  }

  const setNote = (sid: number, note: string) => {
    setNotes((prev) => ({ ...prev, [sid]: note }))
    setSaved(false)
  }

  const handleSave = () => {
    const finalRecords: AttendRecord[] = records.map((r) => ({
      ...r,
      note: notes[r.sid] || undefined,
    }))
    saveAttendSheet(Number(cid), date, finalRecords)
    setSaved(true)
    showToast('출석부가 저장되었습니다.')
  }

  const handleAllPresent = () => {
    setRecords(stuInClass.map((s) => ({ sid: s.sid, status: '출석' as AttendStatus })))
    setSaved(false)
    showToast('전체 출석으로 설정했습니다.')
  }

  const handleDelete = () => {
    if (!window.confirm('이 날짜의 출석 기록을 삭제하시겠습니까?')) return
    deleteAttendSheet(sheetId)
    navigate(`/attend`)
  }

  const presentN = records.filter((r) => r.status === '출석').length
  const lateN = records.filter((r) => r.status === '지각' || r.status === '조퇴').length
  const absentN = records.filter((r) => r.status === '결석').length
  const excusedN = records.filter((r) => r.status === '공결').length
  const pct = records.length > 0 ? Math.round((presentN / records.length) * 100) : 0

  return (
    <>
      <TopBar
        title={dateLabel}
        sub={`${cls.name} · ${cls.subject}`}
        onBack={() => navigate('/attend')}
        right={
          <div style={{ display: 'flex', gap: 7 }}>
            {existing && (
              <button className="icon-btn" onClick={handleDelete}>
                <svg viewBox="0 0 24 24">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
              </button>
            )}
          </div>
        }
      />
      <Breadcrumb items={[
        { label: '출석 관리', onClick: () => navigate('/attend') },
        { label: `${cls.name} ${dateLabel}` },
      ]} />

      <div className="page-content-body">
        {/* 요약 */}
        <div className="sec">
          <div style={{ background: cls.color, borderRadius: 12, padding: '12px 16px', marginBottom: 0 }}>
            <div className="row" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: cls.textColor }}>{dateLabel} 출석 현황</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: cls.textColor }}>{pct}%</span>
            </div>
            <div style={{ display: 'flex', gap: 2, height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
              {presentN > 0 && <div style={{ flex: presentN, background: 'rgba(255,255,255,0.8)' }} />}
              {lateN > 0 && <div style={{ flex: lateN, background: 'rgba(255,255,255,0.45)' }} />}
              {absentN > 0 && <div style={{ flex: absentN, background: 'rgba(0,0,0,0.2)' }} />}
              {excusedN > 0 && <div style={{ flex: excusedN, background: 'rgba(0,0,0,0.1)' }} />}
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              {[['출석', presentN], ['지각/조퇴', lateN], ['결석', absentN], ['공결', excusedN]].map(([label, cnt]) =>
                Number(cnt) > 0 ? (
                  <span key={String(label)} style={{ fontSize: 11, color: cls.textColor, opacity: 0.85 }}>
                    {label} {cnt}
                  </span>
                ) : null
              )}
            </div>
          </div>
        </div>

        {/* 일괄 설정 */}
        <div className="sec">
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleAllPresent}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: STATUS_STYLE['출석'].bg, color: STATUS_STYLE['출석'].tc,
                border: `0.5px solid ${STATUS_STYLE['출석'].border}`, cursor: 'pointer',
              }}
            >
              전체 출석
            </button>
            {STATUS_LIST.filter((s) => s !== '출석').map((st) => (
              <button
                key={st}
                onClick={() => {
                  setRecords(stuInClass.map((s) => ({ sid: s.sid, status: st })))
                  setSaved(false)
                }}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: STATUS_STYLE[st].bg, color: STATUS_STYLE[st].tc,
                  border: `0.5px solid ${STATUS_STYLE[st].border}`, cursor: 'pointer',
                }}
              >
                전체 {st}
              </button>
            ))}
          </div>
        </div>

        {/* 학생별 출석 입력 */}
        <div className="sec">
          <div className="sec-title">학생별 출석 ({stuInClass.length}명)</div>

          {stuInClass.length === 0 && (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--slate3)', fontSize: 13 }}>
              이 반에 등록된 학생이 없습니다.
            </div>
          )}

          {stuInClass.map((stu) => {
            const rec = records.find((r) => r.sid === stu.sid)
            const curStatus: AttendStatus = rec?.status ?? '출석'
            const style = STATUS_STYLE[curStatus]
            const isNoteOpen = showNoteFor === stu.sid
            const parentInfo = parents.find((p) => p.students.some((s) => s.sid === stu.sid))

            return (
              <div
                key={stu.sid}
                className="card"
                style={{ marginBottom: 8, border: `0.5px solid ${style.border}` }}
              >
                {/* 학생 행 */}
                <div style={{ padding: '12px 14px' }}>
                  <div className="row" style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        className="avatar"
                        style={{ background: style.bg, color: style.tc, width: 34, height: 34, fontSize: 13 }}
                      >
                        {stu.name[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{stu.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--slate2)', marginTop: 1 }}>
                          {stu.grade} · {parentInfo?.name ?? ''}
                          {notes[stu.sid] && (
                            <span style={{ color: 'var(--warn)', marginLeft: 6 }}>📝 {notes[stu.sid]}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* 현재 상태 표시 */}
                    <span style={{
                      fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                      background: style.bg, color: style.tc, border: `1px solid ${style.border}`,
                    }}>
                      {curStatus}
                    </span>
                  </div>

                  {/* 상태 선택 버튼 */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {STATUS_LIST.map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatus(stu.sid, st)}
                        style={{
                          flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 11, fontWeight: 600,
                          background: curStatus === st ? STATUS_STYLE[st].bg : 'var(--bg2)',
                          color: curStatus === st ? STATUS_STYLE[st].tc : 'var(--slate3)',
                          border: curStatus === st
                            ? `1.5px solid ${STATUS_STYLE[st].border}`
                            : '0.5px solid var(--border)',
                          cursor: 'pointer',
                          transition: 'all .12s',
                        }}
                      >
                        {st}
                      </button>
                    ))}
                    {/* 메모 버튼 */}
                    <button
                      onClick={() => setShowNoteFor(isNoteOpen ? null : stu.sid)}
                      style={{
                        width: 36, padding: '7px 0', borderRadius: 8, fontSize: 11,
                        background: notes[stu.sid] ? 'var(--warn2)' : 'var(--bg2)',
                        color: notes[stu.sid] ? '#92400E' : 'var(--slate3)',
                        border: notes[stu.sid] ? '0.5px solid var(--warn)' : '0.5px solid var(--border)',
                        cursor: 'pointer',
                      }}
                    >
                      📝
                    </button>
                  </div>

                  {/* 메모 입력 */}
                  {isNoteOpen && (
                    <input
                      className="input-field"
                      style={{ marginTop: 8, fontSize: 13 }}
                      placeholder="사유 또는 메모 입력..."
                      value={notes[stu.sid] ?? ''}
                      onChange={(e) => setNote(stu.sid, e.target.value)}
                      autoFocus
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* 저장 버튼 */}
        <div className="sec">
          <button
            className="btn-primary"
            onClick={handleSave}
            style={{ marginTop: 0, opacity: saved ? 0.6 : 1 }}
          >
            {saved ? '✓ 저장됨' : '출석부 저장'}
          </button>
          {!isToday && (
            <div style={{ fontSize: 12, color: 'var(--slate3)', textAlign: 'center', marginTop: 8 }}>
              과거 날짜의 출석부를 수정 중입니다.
            </div>
          )}
        </div>
      </div>
      <Toast toastRef={toastRef} />
    </>
  )
}
