// src/pages/consult/ConsultPage.tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { TopBar, Badge, Fab, useToast, Toast, Avatar } from '../../components/common'
import { useDataStore, clsCol, statusBdgCls } from '../../store/dataStore'
import { useAuthStore } from '../../store/authStore'
import type { ConsultKind, ConsultStatus, Consultation, ConsultWritePayload } from '../../types'

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']
const GRADES = ['초등 1','초등 2','초등 3','초등 4','초등 5','초등 6','중등 1','중등 2','중등 3','고등 1','고등 2','고등 3']
const KIND_META: Record<ConsultKind, { bg: string; tc: string; color: string }> = {
  재원생: { bg: '#EEF4FF', tc: '#1849A9', color: '#3B82F6' },
  신규: { bg: '#ECFDF5', tc: '#027A48', color: '#10B981' },
}
const STATUS_BADGE: Record<ConsultStatus, string> = {
  대기: 'badge-amber',
  확정: 'badge-blue',
  완료: 'badge-green',
  취소: 'badge-gray',
}

type View = 'calendar' | 'form' | 'detail'

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}
function dateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function formatPhone(v?: string | null) {
  const d = (v ?? '').replace(/\D/g, '')
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  return v || ''
}

export default function ConsultPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const students = useDataStore((s) => s.students)
  const counselors = useDataStore((s) => s.counselors)
  const consultations = useDataStore((s) => s.consultations)
  const fetchConsultations = useDataStore((s) => s.fetchConsultations)
  const searchConsultations = useDataStore((s) => s.searchConsultations)
  const fetchCounselors = useDataStore((s) => s.fetchCounselors)
  const addConsultation = useDataStore((s) => s.addConsultation)
  const updateConsultation = useDataStore((s) => s.updateConsultation)
  const deleteConsultation = useDataStore((s) => s.deleteConsultation)
  const user = useAuthStore((s) => s.user)
  const { ref: toastRef, show: showToast } = useToast()

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(today.toISOString().slice(0, 10))
  const [filterKind, setFilterKind] = useState<ConsultKind | 'all'>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Consultation[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [view, setView] = useState<View>('calendar')
  const [detailId, setDetailId] = useState<number | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const [kind, setKind] = useState<ConsultKind>('재원생')
  const [studentId, setStudentId] = useState<number | ''>('')
  const [studentQ, setStudentQ] = useState('')
  const [teacherUserId, setTeacherUserId] = useState<number | ''>('')
  const [date, setDate] = useState(selectedDate)
  const [time, setTime] = useState('')
  const [status, setStatus] = useState<ConsultStatus>('완료')
  const [content, setContent] = useState('')
  const [prospectName, setProspectName] = useState('')
  const [prospectPhone, setProspectPhone] = useState('')
  const [prospectGrade, setProspectGrade] = useState('초등 6')
  const [prospectParentName, setProspectParentName] = useState('')

  useEffect(() => {
    void fetchConsultations(year, month + 1)
    void fetchCounselors()
  }, [year, month, fetchConsultations, fetchCounselors])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (!debouncedSearch) {
      setSearchResults(null)
      setSearching(false)
      return
    }
    let alive = true
    setSearching(true)
    void searchConsultations(debouncedSearch, filterKind)
      .then((rows) => { if (alive) setSearchResults(rows) })
      .catch(() => { if (alive) setSearchResults([]) })
      .finally(() => { if (alive) setSearching(false) })
    return () => { alive = false }
  }, [debouncedSearch, filterKind, searchConsultations])

  useEffect(() => {
    const sid = Number(searchParams.get('sid') ?? '')
    const d = searchParams.get('date')
    if (!sid && !d) return
    if (d) {
      setSelectedDate(d)
      setDate(d)
    }
    if (sid) {
      setKind('재원생')
      setStudentId(sid)
      const stu = students.find((s) => s.sid === sid)
      setStudentQ(stu?.name ?? '')
      setView('form')
    }
    setSearchParams({}, { replace: true })
  }, [])

  useEffect(() => {
    if (!studentId || studentQ) return
    const stu = students.find((s) => s.sid === Number(studentId))
    if (stu) setStudentQ(stu.name)
  }, [students, studentId, studentQ])

  const filtered = useMemo(
    () => consultations.filter((c) => filterKind === 'all' || c.kind === filterKind),
    [consultations, filterKind],
  )

  const dayItems = useMemo(
    () => filtered.filter((c) => c.date === selectedDate),
    [filtered, selectedDate],
  )

  const stats = useMemo(() => {
    const byTeacher = new Map<string, { name: string; count: number }>()
    const byStudent = new Map<string, { name: string; count: number }>()
    for (const c of filtered) {
      const tKey = c.teacherUserId != null ? String(c.teacherUserId) : 'none'
      const tName = c.teacherName || '미지정'
      const t = byTeacher.get(tKey) ?? { name: tName, count: 0 }
      t.count += 1
      byTeacher.set(tKey, t)
      const sKey = c.studentId != null ? `s:${c.studentId}` : `p:${c.studentName}`
      const s = byStudent.get(sKey) ?? { name: c.studentName, count: 0 }
      s.count += 1
      byStudent.set(sKey, s)
    }
    return {
      total: filtered.length,
      enrolled: filtered.filter((c) => c.kind === '재원생').length,
      prospect: filtered.filter((c) => c.kind === '신규').length,
      byTeacher: [...byTeacher.values()].sort((a, b) => b.count - a.count),
      byStudent: [...byStudent.values()].sort((a, b) => b.count - a.count),
    }
  }, [filtered])

  const studentOptions = useMemo(() => {
    const q = studentQ.trim()
    const digits = q.replace(/\D/g, '')
    return students
      .filter((s) => {
        if (!q) return true
        if (s.name.includes(q) || s.parentName.includes(q)) return true
        if (digits.length < 3) return false
        return s.parentPhone.replace(/\D/g, '').includes(digits)
          || (!!s.phone && s.phone.replace(/\D/g, '').includes(digits))
      })
      .slice(0, 30)
  }, [students, studentQ])

  const detail = consultations.find((c) => c.id === detailId)
    ?? searchResults?.find((c) => c.id === detailId)

  const resetForm = () => {
    setKind('재원생')
    setStudentId('')
    setStudentQ('')
    setTeacherUserId(user?.id ? Number(user.id) : '')
    setDate(selectedDate)
    setTime('')
    setStatus('완료')
    setContent('')
    setProspectName('')
    setProspectPhone('')
    setProspectGrade('초등 6')
    setProspectParentName('')
    setEditId(null)
  }

  const openNew = (ds?: string) => {
    resetForm()
    if (ds) setDate(ds)
    if (user?.id) setTeacherUserId(Number(user.id))
    setView('form')
  }

  const openEdit = (c: Consultation) => {
    setKind(c.kind)
    setStudentId(c.studentId ?? '')
    setStudentQ(c.studentName)
    setTeacherUserId(c.teacherUserId ?? '')
    setDate(c.date)
    setTime(c.time ?? '')
    setStatus(c.status)
    setContent(c.content ?? '')
    setProspectName(c.prospectName ?? c.studentName)
    setProspectPhone(c.prospectPhone ?? '')
    setProspectGrade(c.prospectGrade ?? '초등 6')
    setProspectParentName(c.prospectParentName ?? '')
    setEditId(c.id)
    setView('form')
  }

  const handleSave = async () => {
    if (!teacherUserId) { alert('담당 상담교사를 지정해 주세요.'); return }
    if (!date) { alert('상담일을 선택해 주세요.'); return }
    if (!content.trim()) { alert('상담 내용을 작성해 주세요.'); return }
    if (kind === '재원생' && !studentId) { alert('상담 대상 학생을 선택해 주세요.'); return }
    if (kind === '신규' && !prospectName.trim()) { alert('신규 상담 대상 이름을 입력해 주세요.'); return }

    const payload: ConsultWritePayload = {
      kind,
      date,
      time: time || undefined,
      content: content.trim(),
      teacherUserId: Number(teacherUserId),
      status,
      studentId: kind === '재원생' ? Number(studentId) : undefined,
      prospectName: kind === '신규' ? prospectName.trim() : undefined,
      prospectPhone: kind === '신규' ? prospectPhone.trim() || undefined : undefined,
      prospectGrade: kind === '신규' ? prospectGrade : undefined,
      prospectParentName: kind === '신규' ? prospectParentName.trim() || undefined : undefined,
    }
    setSaving(true)
    try {
      if (editId != null) await updateConsultation(editId, payload)
      else await addConsultation(payload)
      await fetchConsultations(year, month + 1)
      showToast(editId != null ? '상담이 수정되었습니다.' : '상담이 등록되었습니다.')
      setView('calendar')
      resetForm()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      alert(err?.response?.data?.message ?? err?.message ?? '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('이 상담 기록을 삭제하시겠습니까?')) return
    try {
      await deleteConsultation(id)
      showToast('삭제되었습니다.')
      setView('calendar')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      alert(err?.response?.data?.message ?? err?.message ?? '삭제에 실패했습니다.')
    }
  }

  const prevMonth = () => { if (month === 0) { setYear((y) => y - 1); setMonth(11) } else setMonth((m) => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear((y) => y + 1); setMonth(0) } else setMonth((m) => m + 1) }
  const daysInMonth = getDaysInMonth(year, month)
  const firstDow = getFirstDayOfWeek(year, month)
  const todayStr = today.toISOString().slice(0, 10)

  if (view === 'form') {
    const selectedStudent = students.find((s) => s.sid === Number(studentId))
    return (
      <>
        <TopBar
          title={editId ? '상담 수정' : '상담 작성'}
          onBack={() => { setView('calendar'); resetForm() }}
        />
        <div className="page-content-body">
          <div className="sec">
            <div className="sec-title">상담 구분</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {(['재원생', '신규'] as ConsultKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700,
                    background: kind === k ? KIND_META[k].color : 'var(--bg2)',
                    color: kind === k ? '#fff' : 'var(--slate2)',
                    border: kind === k ? 'none' : '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  {k} 상담
                </button>
              ))}
            </div>

            <label className="input-label">담당 상담교사 *</label>
            <select
              className="input-field"
              value={teacherUserId}
              onChange={(e) => setTeacherUserId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">교사를 선택하세요</option>
              {counselors.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.role === 'ADMIN' ? ' (원장)' : ''}
                </option>
              ))}
            </select>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="input-label">상담일 *</label>
                <input className="input-field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className="input-label">시간</label>
                <input className="input-field" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>

            <label className="input-label">상태</label>
            <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value as ConsultStatus)}>
              <option>대기</option>
              <option>확정</option>
              <option>완료</option>
              <option>취소</option>
            </select>

            {kind === '재원생' ? (
              <>
                <label className="input-label">대상 학생 *</label>
                <input
                  className="input-field"
                  placeholder="학생명·학부모명·전화번호 검색"
                  value={studentQ}
                  onChange={(e) => setStudentQ(e.target.value)}
                />
                <div className="card" style={{ maxHeight: 180, overflowY: 'auto', marginTop: 8 }}>
                  {studentOptions.length === 0 && (
                    <div style={{ padding: 14, textAlign: 'center', color: 'var(--slate3)', fontSize: 13 }}>검색 결과가 없습니다</div>
                  )}
                  {studentOptions.map((s) => {
                    const cc = clsCol(s.cls)
                    const active = Number(studentId) === s.sid
                    return (
                      <div
                        key={s.sid}
                        className="list-row"
                        onClick={() => { setStudentId(s.sid); setStudentQ(s.name) }}
                        style={{ background: active ? 'var(--acc2)' : undefined }}
                      >
                        <Avatar name={s.name} col={cc.bg} tc={cc.tc} />
                        <div style={{ flex: 1 }}>
                          <div className="row">
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{s.name}</span>
                            <Badge cls={statusBdgCls(s)}>{s.status}</Badge>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--slate2)', marginTop: 2 }}>
                            {s.cls} · {s.grade}
                            {s.parentPhone ? ` · ${formatPhone(s.parentPhone)}` : ''}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {selectedStudent && (
                  <div style={{ fontSize: 12, color: 'var(--acc)', marginTop: 6 }}>
                    선택: {selectedStudent.name} ({selectedStudent.cls} · {selectedStudent.status})
                  </div>
                )}
              </>
            ) : (
              <>
                <label className="input-label">대상 이름 *</label>
                <input className="input-field" placeholder="예) 김민서" value={prospectName} onChange={(e) => setProspectName(e.target.value)} />
                <label className="input-label">학부모 이름</label>
                <input className="input-field" placeholder="학부모 성함" value={prospectParentName} onChange={(e) => setProspectParentName(e.target.value)} />
                <label className="input-label">연락처</label>
                <input className="input-field" type="tel" placeholder="010-0000-0000" value={prospectPhone} onChange={(e) => setProspectPhone(e.target.value)} />
                <label className="input-label">학년</label>
                <select className="input-field" value={prospectGrade} onChange={(e) => setProspectGrade(e.target.value)}>
                  {GRADES.map((g) => <option key={g}>{g}</option>)}
                </select>
              </>
            )}

            <label className="input-label">상담 내용 *</label>
            <textarea
              className="input-field"
              style={{ height: 140, resize: 'vertical' }}
              placeholder="상담 내용을 작성하세요"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            <button className="btn-primary" disabled={saving} onClick={() => void handleSave()}>
              {saving ? '저장 중…' : (editId ? '상담 저장' : '상담 등록')}
            </button>
            {editId != null && (
              <button className="btn-danger" onClick={() => void handleDelete(editId)}>상담 삭제</button>
            )}
            <button className="btn-secondary" onClick={() => { setView('calendar'); resetForm() }}>취소</button>
          </div>
        </div>
        <Toast toastRef={toastRef} />
      </>
    )
  }

  if (view === 'detail' && detail) {
    const km = KIND_META[detail.kind]
    return (
      <>
        <TopBar
          title="상담 상세"
          onBack={() => setView('calendar')}
          right={
            <button className="icon-btn" onClick={() => openEdit(detail)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          }
        />
        <div className="page-content-body">
          <div className="sec">
            <div className="card" style={{ padding: 16 }}>
              <div className="row" style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)' }}>{detail.studentName}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 10, background: km.bg, color: km.tc }}>{detail.kind}</span>
                  <Badge cls={STATUS_BADGE[detail.status]}>{detail.status}</Badge>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--slate2)', lineHeight: 1.7 }}>
                <div>상담일 {detail.date}{detail.time ? ` ${detail.time}` : ''}</div>
                <div>담당교사 {detail.teacherName || '미지정'}</div>
                {detail.kind === '재원생' && (
                  <div>
                    {detail.classroomName ?? ''} {detail.studentStatus ? `· ${detail.studentStatus}` : ''}
                    {detail.parentPhone ? ` · ${formatPhone(detail.parentPhone)}` : ''}
                    {detail.studentId ? (
                      <span
                        style={{ color: 'var(--acc)', marginLeft: 8, cursor: 'pointer' }}
                        onClick={() => navigate(`/parents/${detail.studentId}`)}
                      >
                        학생 카드 →
                      </span>
                    ) : null}
                  </div>
                )}
                {detail.kind === '신규' && (
                  <div>
                    {detail.prospectGrade ?? ''}
                    {detail.prospectParentName ? ` · 학부모 ${detail.prospectParentName}` : ''}
                    {detail.prospectPhone ? ` · ${detail.prospectPhone}` : ''}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="sec">
            <div className="sec-title">상담 내용</div>
            <div className="card" style={{ padding: 16, fontSize: 14, color: 'var(--navy)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {detail.content || '작성된 내용이 없습니다.'}
            </div>
          </div>
          <div className="sec">
            <button className="btn-secondary" onClick={() => openEdit(detail)}>상담 수정</button>
            <button className="btn-danger" onClick={() => void handleDelete(detail.id)}>상담 삭제</button>
          </div>
        </div>
        <Toast toastRef={toastRef} />
      </>
    )
  }

  return (
    <>
      <TopBar
        title="상담 관리"
        sub={debouncedSearch
          ? `검색 · ${searchResults?.length ?? 0}건`
          : `${year}년 ${month + 1}월 · ${stats.total}건`}
        right={
          debouncedSearch ? undefined : (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="icon-btn" onClick={prevMonth}>
              <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button className="icon-btn" onClick={nextMonth}>
              <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
          )
        }
      />

      <div className="page-content-body">
        <div style={{ padding: '10px 16px 0', display: 'flex', gap: 6 }}>
          {([{ id: 'all', label: '전체' }, { id: '재원생', label: '재원생' }, { id: '신규', label: '신규' }] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterKind(t.id)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                background: filterKind === t.id ? 'var(--navy)' : 'var(--bg2)',
                color: filterKind === t.id ? '#fff' : 'var(--slate2)',
                border: filterKind === t.id ? 'none' : '0.5px solid var(--border)',
                cursor: 'pointer',
              }}
            >{t.label}</button>
          ))}
        </div>

        <div className="sec" style={{ paddingBottom: 0 }}>
          <input
            className="input-field"
            style={{ marginTop: 8, marginBottom: 0 }}
            placeholder="학생명·학부모명·전화번호로 상담내역 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {debouncedSearch ? (
          <div className="sec">
            <div className="row" style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
                {searching ? '검색 중…' : `검색 결과 ${searchResults?.length ?? 0}건`}
              </div>
            </div>
            {(searchResults ?? []).length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '22px 0', color: 'var(--slate3)', fontSize: 13,
                border: '1.5px dashed var(--border)', borderRadius: 10,
              }}>
                {searching ? '상담내역을 찾고 있습니다.' : '이름 또는 전화번호와 맞는 상담내역이 없습니다.'}
              </div>
            ) : (
              <div className="card">
                {(searchResults ?? []).map((c) => {
                  const phone = formatPhone(c.parentPhone || c.prospectPhone)
                  return (
                    <div key={c.id} className="list-row" onClick={() => { setDetailId(c.id); setView('detail') }}>
                      <div style={{ width: 4, alignSelf: 'stretch', background: KIND_META[c.kind].color, borderRadius: 2 }} />
                      <div style={{ flex: 1 }}>
                        <div className="row">
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{c.studentName}</span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: KIND_META[c.kind].bg, color: KIND_META[c.kind].tc }}>{c.kind}</span>
                            <Badge cls={STATUS_BADGE[c.status]}>{c.status}</Badge>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 3 }}>
                          {c.date}{c.time ? ` ${c.time}` : ''}
                          {c.classroomName ? ` · ${c.classroomName}` : ''}
                          {phone ? ` · ${phone}` : ''}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--slate3)', marginTop: 2 }}>
                          담당 {c.teacherName || '미지정'}
                          {c.parentName ? ` · 학부모 ${c.parentName}` : ''}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
        <>
        <div className="sec">
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">이번달 상담</div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-sub">건</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">재원생</div>
              <div className="stat-value">{stats.enrolled}</div>
              <div className="stat-sub">건</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">신규</div>
              <div className="stat-value">{stats.prospect}</div>
              <div className="stat-sub">건</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
            {DAY_NAMES.map((d, i) => (
              <div key={d} style={{
                textAlign: 'center', fontSize: 11, fontWeight: 600, padding: '4px 0',
                color: i === 0 ? 'var(--err)' : i === 6 ? 'var(--acc)' : 'var(--slate2)',
              }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px 1px' }}>
            {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1
              const ds = dateStr(year, month, d)
              const items = filtered.filter((c) => c.date === ds)
              const isToday = ds === todayStr
              const isSelected = ds === selectedDate
              const dow = (firstDow + i) % 7
              return (
                <div
                  key={d}
                  onClick={() => setSelectedDate(ds)}
                  style={{
                    minHeight: 58, padding: '4px 2px', borderRadius: 8, cursor: 'pointer',
                    background: isSelected ? 'var(--navy)' : isToday ? 'var(--acc2)' : 'transparent',
                    border: isToday && !isSelected ? '1.5px solid var(--acc)' : '1.5px solid transparent',
                  }}
                >
                  <div style={{
                    textAlign: 'center', fontSize: 13, fontWeight: isToday || isSelected ? 700 : 400,
                    color: isSelected ? '#fff' : dow === 0 ? 'var(--err)' : dow === 6 ? 'var(--acc)' : 'var(--navy)',
                  }}>{d}</div>
                  {items.length > 0 && (
                    <div style={{
                      textAlign: 'center', fontSize: 10, fontWeight: 700, marginTop: 2,
                      color: isSelected ? 'rgba(255,255,255,.9)' : 'var(--acc)',
                    }}>
                      {items.length}건
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2, flexWrap: 'wrap' }}>
                    {items.slice(0, 2).map((c) => (
                      <div key={c.id} style={{
                        width: 5, height: 5, borderRadius: 99,
                        background: isSelected ? '#fff' : KIND_META[c.kind].color,
                      }} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="sec">
          <div className="row" style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
              {month + 1}월 {parseInt(selectedDate.slice(8), 10)}일 상담
            </div>
            <button
              onClick={() => openNew(selectedDate)}
              style={{
                fontSize: 11, fontWeight: 700, padding: '4px 12px',
                background: 'var(--acc)', color: '#fff', border: 'none',
                borderRadius: 20, cursor: 'pointer',
              }}
            >+ 상담 작성</button>
          </div>
          {dayItems.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '22px 0', color: 'var(--slate3)', fontSize: 13,
              border: '1.5px dashed var(--border)', borderRadius: 10,
            }}>
              이날 상담 기록이 없습니다.
            </div>
          ) : (
            <div className="card">
              {dayItems.map((c) => (
                <div key={c.id} className="list-row" onClick={() => { setDetailId(c.id); setView('detail') }}>
                  <div style={{ width: 4, alignSelf: 'stretch', background: KIND_META[c.kind].color, borderRadius: 2 }} />
                  <div style={{ flex: 1 }}>
                    <div className="row">
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{c.studentName}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: KIND_META[c.kind].bg, color: KIND_META[c.kind].tc }}>{c.kind}</span>
                        <Badge cls={STATUS_BADGE[c.status]}>{c.status}</Badge>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 3 }}>
                      {c.time ? `${c.time} · ` : ''}담당 {c.teacherName || '미지정'}
                      {c.classroomName ? ` · ${c.classroomName}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sec">
          <div className="sec-title">교사별 상담 건수</div>
          <div className="card">
            {stats.byTeacher.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--slate3)', fontSize: 13 }}>이번달 상담이 없습니다</div>
            )}
            {stats.byTeacher.map((t) => (
              <div key={t.name} className="field-row">
                <span className="field-label">{t.name}</span>
                <span className="field-value" style={{ fontWeight: 700 }}>{t.count}건</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sec">
          <div className="sec-title">학생별 상담 건수</div>
          <div className="card">
            {stats.byStudent.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--slate3)', fontSize: 13 }}>이번달 상담이 없습니다</div>
            )}
            {stats.byStudent.map((s) => (
              <div key={s.name} className="field-row">
                <span className="field-label">{s.name}</span>
                <span className="field-value" style={{ fontWeight: 700 }}>{s.count}건</span>
              </div>
            ))}
          </div>
        </div>
        </>
        )}
        <div style={{ height: 24 }} />
      </div>
      <Fab onClick={() => openNew(selectedDate)} />
      <Toast toastRef={toastRef} />
    </>
  )
}
