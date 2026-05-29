// src/pages/attend/AttendSheetPage.tsx
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TopBar, Breadcrumb, useToast, Toast } from '../../components/common'
import { useDataStore } from '../../store/dataStore'
import { useAuthStore } from '../../store/authStore'
import type { AttendRecord, AttendStatus } from '../../types'

const STATUS_LIST: AttendStatus[] = ['출석', '지각', '조퇴', '결석']

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
  const user = useAuthStore((s) => s.user)
  const classes = useDataStore((s) => s.classes)
  const parents = useDataStore((s) => s.parents)
  const attendSheets = useDataStore((s) => s.attendSheets)
  const fetchAttend = useDataStore((s) => s.fetchAttend)
  const senderNumbers = useDataStore((s) => s.senderNumbers)
  const fetchSenderNumbers = useDataStore((s) => s.fetchSenderNumbers)
  const saveMessageSendLog = useDataStore((s) => s.saveMessageSendLog)
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
  const [showNotifyModal, setShowNotifyModal] = useState(false)
  const [notifyMessage, setNotifyMessage] = useState('')
  const [sendingNotify, setSendingNotify] = useState(false)

  useEffect(() => {
    if (!cid) return
    void fetchAttend(Number(cid))
  }, [cid, fetchAttend])

  useEffect(() => {
    void fetchSenderNumbers()
  }, [fetchSenderNumbers])

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

  const ownerPhone = user?.phone?.trim()
  const ownerSender = ownerPhone ? { id: -1, label: '원장', number: ownerPhone, isDefault: true } : null
  const senderOptions = ownerSender
    ? [ownerSender, ...senderNumbers.filter((s) => s.number !== ownerPhone)]
    : senderNumbers
  const defaultSender = senderOptions.find((s) => s.isDefault) ?? senderOptions[0]
  const [selectedSenderId, setSelectedSenderId] = useState<number>(defaultSender?.id ?? 0)
  const normalizePhone = (v: string) => v.replace(/[^\d]/g, '')

  useEffect(() => {
    if (senderOptions.length === 0) {
      setSelectedSenderId(0)
      return
    }
    if (!senderOptions.some((s) => s.id === selectedSenderId)) {
      setSelectedSenderId(defaultSender?.id ?? senderOptions[0].id)
    }
  }, [senderOptions, selectedSenderId, defaultSender])

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

  const handleSave = async () => {
    const finalRecords: AttendRecord[] = records.map((r) => ({
      ...r,
      note: notes[r.sid] || undefined,
    }))
    try {
      setSaved(false)
      await saveAttendSheet(Number(cid), date, finalRecords)
      setSaved(true)
      showToast('출석부가 저장되었습니다.')
    } catch (e: any) {
      setSaved(false)
      const msg = e?.response?.data?.message ?? e?.message ?? '출석부 저장에 실패했습니다.'
      alert(msg)
    }
  }

  const handleAllPresent = () => {
    setRecords(stuInClass.map((s) => ({ sid: s.sid, status: '출석' as AttendStatus })))
    setSaved(false)
    showToast('전체 출석으로 설정했습니다.')
  }

  const handleDelete = async () => {
    if (!window.confirm('이 날짜의 출석 기록을 삭제하시겠습니까?')) return
    await deleteAttendSheet(sheetId)
    navigate(`/attend`)
  }

  const presentN = records.filter((r) => r.status === '출석').length
  const lateN = records.filter((r) => r.status === '지각' || r.status === '조퇴').length
  const absentN = records.filter((r) => r.status === '결석' || r.status === '공결').length
  const pct = records.length > 0 ? Math.round((presentN / records.length) * 100) : 0

  const attendanceNoticeTemplate = () => {
    return `[#{학원명}] 등원 안내

#{보호자명}님, #{학생명} 학생이 등원하였습니다.
등원시간 : #{등원일시}`
  }

  const formatAttendAppliedAt = (isoLike?: string) => {
    if (!isoLike) return ''
    const d = new Date(isoLike)
    if (Number.isNaN(d.getTime())) return isoLike.replace('T', ' ').slice(0, 16)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const resolveFirstNotifyTarget = () => {
    const presentStudentIds = new Set(
      records
        .filter((r) => r.status === '출석')
        .map((r) => r.sid),
    )
    const candidates = stuInClass.filter((s) => presentStudentIds.has(s.sid))
    const firstStudent = candidates[0] ?? stuInClass[0]
    if (!firstStudent) return null
    const parent = parents.find((p) => p.students.some((s) => s.sid === firstStudent.sid))
    return {
      academyName: user?.academyName?.trim() || cls?.name || '',
      parentName: parent?.name ?? '보호자',
      studentName: firstStudent.name,
      attendDateTime: formatAttendAppliedAt(existing?.createdAt) || formatAttendAppliedAt(new Date().toISOString()),
    }
  }

  const applyNoticeTemplate = (template: string, vars: { academyName: string; parentName: string; studentName: string; attendDateTime: string }) => {
    return template
      .replace(/#\{학원명\}/g, vars.academyName)
      .replace(/#\{보호자명\}/g, vars.parentName)
      .replace(/#\{학생명\}/g, vars.studentName)
      .replace(/#\{등원일시\}/g, vars.attendDateTime)
  }

  const openNotifyModal = () => {
    const template = attendanceNoticeTemplate()
    const firstTarget = resolveFirstNotifyTarget()
    setNotifyMessage(firstTarget ? applyNoticeTemplate(template, firstTarget) : template)
    setShowNotifyModal(true)
  }

  const sendAttendanceNotice = async () => {
    if (!cls) return
    if (!existing?.createdAt) {
      alert('출석부를 먼저 저장한 뒤 알림톡을 발송해주세요.')
      return
    }
    const senderNo = normalizePhone(senderOptions.find((s) => s.id === selectedSenderId)?.number ?? '')
    if (!senderNo) {
      alert('발신 번호를 선택해주세요.')
      return
    }
    const presentStudentIds = new Set(
      records
        .filter((r) => r.status === '출석')
        .map((r) => r.sid),
    )
    const presentStudents = stuInClass.filter((s) => presentStudentIds.has(s.sid))
    const academyName = user?.academyName?.trim() || cls.name
    const requestDateTime = formatAttendAppliedAt(existing.createdAt)
    const template = notifyMessage.trim()
    const buildBody = (vars: { parentName: string; studentName: string }) =>
      applyNoticeTemplate(template, {
        academyName,
        parentName: vars.parentName,
        studentName: vars.studentName,
        attendDateTime: requestDateTime,
      })

    const noticeTargets = presentStudents
      .map((student) => {
        const parent = parents.find((p) => p.students.some((s) => s.sid === student.sid))
        const phone = normalizePhone(parent?.phone ?? '')
        return {
          studentName: student.name,
          parentName: parent?.name ?? '보호자',
          phone,
        }
      })
      .filter((t) => t.phone.length > 0)

    if (noticeTargets.length === 0) {
      alert('출석 처리된 학생의 발송 대상 전화번호가 없습니다.')
      return
    }
    if (!notifyMessage.trim()) {
      alert('메시지 내용을 입력해주세요.')
      return
    }
    setSendingNotify(true)
    try {
      let successCount = 0
      const failedTargets: string[] = []

      for (const target of noticeTargets) {
        const body = buildBody({ parentName: target.parentName, studentName: target.studentName })
        try {
          await saveMessageSendLog({
            kind: 'CLASS',
            provider: 'ALIGO',
            targetLabel: `${cls.name} 출석`,
            title: `[출석] ${target.studentName} ${date}`,
            bodyPreview: body.slice(0, 500),
            recipientCount: 1,
            messageType: 'KAKAO_ALIMTALK',
            templateCode: 'UH_8400',
            sendNo: senderNo,
            body,
            recipientPhones: [target.phone],
          })
          successCount += 1
        } catch {
          failedTargets.push(`${target.parentName}(${target.studentName})`)
        }
      }

      if (successCount > 0) {
        showToast(`출석 알림톡 ${successCount}명 발송 완료`)
      }
      if (failedTargets.length > 0) {
        alert(`일부 발송에 실패했습니다.\n실패 대상: ${failedTargets.join(', ')}`)
      }
      if (successCount === noticeTargets.length) {
        setShowNotifyModal(false)
      }
    } catch (e: any) {
      alert(e?.response?.data?.message ?? e?.message ?? '출석 알림톡 발송에 실패했습니다.')
    } finally {
      setSendingNotify(false)
    }
  }

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
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              {[['출석', presentN], ['지각/조퇴', lateN], ['결석', absentN]].map(([label, cnt]) =>
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
          <button
            className="btn-secondary"
            onClick={openNotifyModal}
            style={{ marginTop: 8 }}
          >
            출석 카카오 알림톡 보내기
          </button>
          {!isToday && (
            <div style={{ fontSize: 12, color: 'var(--slate3)', textAlign: 'center', marginTop: 8 }}>
              과거 날짜의 출석부를 수정 중입니다.
            </div>
          )}
        </div>
      </div>
      {showNotifyModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(16,24,40,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => {
            if (!sendingNotify) setShowNotifyModal(false)
          }}
        >
          <div
            className="card"
            style={{ width: 'min(620px, 96vw)', maxHeight: '88vh', overflow: 'auto', padding: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row" style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>출석 카카오 알림톡 발송</div>
              <button
                type="button"
                onClick={() => {
                  if (!sendingNotify) setShowNotifyModal(false)
                }}
                style={{ border: 'none', background: 'none', fontSize: 22, color: 'var(--slate3)', cursor: 'pointer', lineHeight: 1 }}
              >
                ×
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--slate2)', marginBottom: 8 }}>
              대상: {cls.name} 학부모 {Array.from(new Set(stuInClass.map((s) => parents.find((p) => p.students.some((ps) => ps.sid === s.sid))?.pid))).filter(Boolean).length}명
            </div>
            <label className="input-label" style={{ marginTop: 0 }}>발신 번호</label>
            <select
              className="input-field"
              value={selectedSenderId}
              onChange={(e) => setSelectedSenderId(Number(e.target.value))}
            >
              {senderOptions.length === 0 ? (
                <option value={0}>등록된 발신번호 없음</option>
              ) : (
                senderOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} ({s.number}){s.isDefault ? ' ★' : ''}
                  </option>
                ))
              )}
            </select>
            <label className="input-label">메시지 내용</label>
            <textarea
              className="input-field"
              value={notifyMessage}
              onChange={(e) => setNotifyMessage(e.target.value)}
              maxLength={1000}
              placeholder="출석 안내 내용을 입력하세요."
              style={{ minHeight: 180 }}
            />
            <div style={{ fontSize: 11, color: 'var(--slate3)', textAlign: 'right', marginTop: 4 }}>
              {notifyMessage.length}/1000
            </div>
            <button
              className="btn-primary"
              onClick={() => void sendAttendanceNotice()}
              disabled={sendingNotify || senderOptions.length === 0 || notifyMessage.trim().length === 0}
              style={{ opacity: (sendingNotify || senderOptions.length === 0 || notifyMessage.trim().length === 0) ? 0.55 : 1 }}
            >
              {sendingNotify ? '발송 중…' : '카카오 알림톡 발송'}
            </button>
          </div>
        </div>
      )}
      <Toast toastRef={toastRef} />
    </>
  )
}
