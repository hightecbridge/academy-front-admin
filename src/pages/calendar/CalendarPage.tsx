// src/pages/calendar/CalendarPage.tsx
import { useState, useRef } from 'react'
import { TopBar, Fab, useToast, Toast, Badge } from '../../components/common'
import { useDataStore } from '../../store/dataStore'
import type { CalendarEvent, EventCategory } from '../../types'

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

const CATEGORY_META: Record<EventCategory, { color: string; bg: string; tc: string; label: string }> = {
  수업: { color: '#3B82F6', bg: '#DBEAFE', tc: '#1D4ED8', label: '수업' },
  시험: { color: '#8B5CF6', bg: '#EDE9FE', tc: '#5B21B6', label: '시험' },
  휴일: { color: '#F59E0B', bg: '#FEF3C7', tc: '#92400E', label: '휴일' },
  행사: { color: '#10B981', bg: '#D1FAE5', tc: '#065F46', label: '행사' },
  상담: { color: '#EF4444', bg: '#FEE2E2', tc: '#991B1B', label: '상담' },
  기타: { color: '#64748B', bg: '#F1F5F9', tc: '#334155', label: '기타' },
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
function isInRange(date: string, start: string, end?: string) {
  if (!end || end === start) return date === start
  return date >= start && date <= end
}

export default function CalendarPage() {
  const events = useDataStore((s) => s.events)
  const addEvent = useDataStore((s) => s.addEvent)
  const updateEvent = useDataStore((s) => s.updateEvent)
  const deleteEvent = useDataStore((s) => s.deleteEvent)
  const classes = useDataStore((s) => s.classes)
  const { ref: toastRef, show: showToast } = useToast()

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(today.toISOString().slice(0, 10))
  const [view, setView] = useState<View>('calendar')
  const [detailId, setDetailId] = useState<number | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [filterCat, setFilterCat] = useState<EventCategory | 'all'>('all')

  // 폼 상태
  const [fTitle, setFTitle] = useState('')
  const [fDate, setFDate] = useState(selectedDate)
  const [fEndDate, setFEndDate] = useState('')
  const [fCategory, setFCategory] = useState<EventCategory>('수업')
  const [fTargets, setFTargets] = useState<string[]>(['전체'])
  const [fDesc, setFDesc] = useState('')
  const [fAllDay] = useState(true)

  const resetForm = () => {
    setFTitle(''); setFDate(selectedDate); setFEndDate('')
    setFCategory('수업'); setFTargets(['전체']); setFDesc('')
    setEditId(null)
  }

  const openNew = (date?: string) => {
    resetForm()
    if (date) setFDate(date)
    setView('form')
  }

  const openEdit = (ev: CalendarEvent) => {
    setFTitle(ev.title); setFDate(ev.date); setFEndDate(ev.endDate ?? '')
    setFCategory(ev.category); setFTargets(ev.targets); setFDesc(ev.description ?? '')
    setEditId(ev.id); setView('form')
  }

  const handleSave = () => {
    if (!fTitle.trim()) { alert('일정 제목을 입력하세요.'); return }
    if (!fDate) { alert('날짜를 입력하세요.'); return }
    const payload = {
      title: fTitle, date: fDate, endDate: fEndDate || undefined,
      category: fCategory, targets: fTargets,
      description: fDesc || undefined,
      color: CATEGORY_META[fCategory].color, allDay: fAllDay,
    }
    if (editId !== null) {
      updateEvent(editId, payload)
      showToast('일정이 수정되었습니다.')
    } else {
      addEvent(payload)
      showToast('일정이 등록되었습니다.')
    }
    setView('calendar')
    resetForm()
  }

  const handleDelete = (id: number) => {
    if (!window.confirm('이 일정을 삭제하시겠습니까?')) return
    deleteEvent(id)
    setView('calendar')
    showToast('삭제되었습니다.')
  }

  // 반 타깃 토글
  const toggleTarget = (name: string) => {
    if (name === '전체') { setFTargets(['전체']); return }
    setFTargets((prev) => {
      const wo = prev.filter((t) => t !== '전체')
      if (wo.includes(name)) {
        const next = wo.filter((t) => t !== name)
        return next.length === 0 ? ['전체'] : next
      }
      return [...wo, name]
    })
  }

  // 날짜별 이벤트
  const getEventsForDate = (ds: string) =>
    events.filter((e) => isInRange(ds, e.date, e.endDate))
      .filter((e) => filterCat === 'all' || e.category === filterCat)

  // 선택 날짜 일정
  const selectedEvents = getEventsForDate(selectedDate)
  const detailEvent = events.find((e) => e.id === detailId)

  // 이번달 월별 통계
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthEvents = events.filter((e) => e.date.startsWith(monthStr) || (e.endDate && e.endDate.startsWith(monthStr)))
  const catCounts = (Object.keys(CATEGORY_META) as EventCategory[]).map((cat) => ({
    cat, cnt: monthEvents.filter((e) => e.category === cat).length,
  })).filter((x) => x.cnt > 0)

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDow = getFirstDayOfWeek(year, month)

  // ── 일정 폼 ──────────────────────────────────────────────
  if (view === 'form') {
    return (
      <>
        <TopBar
          title={editId ? '일정 수정' : '일정 추가'}
          onBack={() => { setView('calendar'); resetForm() }}
          right={
            <button
              onClick={handleSave}
              style={{
                fontSize: 13, fontWeight: 600, padding: '6px 14px',
                background: 'var(--acc)', color: '#fff', border: 'none',
                borderRadius: 8, cursor: 'pointer',
              }}
            >
              {editId ? '저장' : '등록'}
            </button>
          }
        />
        <div className="page-content-body">
          <div className="sec">
            {/* 카테고리 */}
            <div className="sec-title">카테고리</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
              {(Object.entries(CATEGORY_META) as [EventCategory, typeof CATEGORY_META[EventCategory]][]).map(([cat, m]) => (
                <button
                  key={cat}
                  onClick={() => setFCategory(cat)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: fCategory === cat ? m.color : 'var(--bg2)',
                    color: fCategory === cat ? '#fff' : 'var(--slate2)',
                    border: fCategory === cat ? `1.5px solid ${m.color}` : '0.5px solid var(--border)',
                    cursor: 'pointer', transition: 'all .12s',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* 제목 */}
            <label className="input-label" style={{ marginTop: 0 }}>일정 제목 *</label>
            <input
              className="input-field"
              placeholder="예) A반 중간고사, 봄방학"
              value={fTitle}
              onChange={(e) => setFTitle(e.target.value)}
              maxLength={60}
            />

            {/* 날짜 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="input-label">시작일 *</label>
                <input className="input-field" type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} />
              </div>
              <div>
                <label className="input-label">종료일 (선택)</label>
                <input className="input-field" type="date" value={fEndDate} min={fDate}
                  onChange={(e) => setFEndDate(e.target.value)} />
              </div>
            </div>

            {/* 대상 */}
            <label className="input-label">대상 반 (중복 선택)</label>
            <div className="chip-row" style={{ marginTop: 8 }}>
              <div className={`chip${fTargets.includes('전체') ? ' active' : ''}`} onClick={() => toggleTarget('전체')}>전체</div>
              {classes.map((c) => (
                <div key={c.cid} className={`chip${fTargets.includes(c.name) ? ' active' : ''}`}
                  onClick={() => toggleTarget(c.name)}>{c.name}</div>
              ))}
            </div>
            {/* 선택된 대상 미리보기 */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
              {fTargets.map((t) => (
                <span key={t} className="badge badge-blue" style={{ fontSize: 11 }}>{t}</span>
              ))}
            </div>

            {/* 설명 */}
            <label className="input-label">설명 (선택)</label>
            <textarea
              className="input-field"
              style={{ height: 80 }}
              placeholder="추가 설명이나 메모를 입력하세요"
              value={fDesc}
              onChange={(e) => setFDesc(e.target.value)}
              maxLength={300}
            />

            {/* 미리보기 */}
            <div style={{
              marginTop: 14, padding: '12px 14px', borderRadius: 10,
              background: CATEGORY_META[fCategory].bg,
              border: `1px solid ${CATEGORY_META[fCategory].color}`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 4, height: 36, borderRadius: 2,
                background: CATEGORY_META[fCategory].color, flexShrink: 0,
              }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: CATEGORY_META[fCategory].tc }}>
                  {fTitle || '일정 제목'}
                </div>
                <div style={{ fontSize: 11, color: CATEGORY_META[fCategory].tc, opacity: 0.75, marginTop: 2 }}>
                  {fDate}{fEndDate ? ` ~ ${fEndDate}` : ''} · {fTargets.join(', ')}
                </div>
              </div>
            </div>

            <button className="btn-primary" onClick={handleSave}>
              {editId ? '일정 저장' : '일정 등록'}
            </button>
            {editId && (
              <button className="btn-danger" onClick={() => handleDelete(editId)}>일정 삭제</button>
            )}
            <button className="btn-secondary" onClick={() => { setView('calendar'); resetForm() }}>취소</button>
          </div>
        </div>
        <Toast toastRef={toastRef} />
      </>
    )
  }

  // ── 일정 상세 ────────────────────────────────────────────
  if (view === 'detail' && detailEvent) {
    const m = CATEGORY_META[detailEvent.category]
    return (
      <>
        <TopBar
          title="일정 상세"
          onBack={() => setView('calendar')}
          right={
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="icon-btn" onClick={() => openEdit(detailEvent)}>
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              </button>
              <button className="icon-btn" onClick={() => handleDelete(detailEvent.id)}>
                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
              </button>
            </div>
          }
        />
        <div className="page-content-body">
          <div className="sec">
            {/* 헤더 카드 */}
            <div style={{ background: m.bg, borderRadius: 14, padding: '20px 18px', marginBottom: 16, border: `1px solid ${m.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: m.color, color: '#fff' }}>
                  {detailEvent.category}
                </span>
                {detailEvent.targets.map((t) => (
                  <span key={t} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.6)', color: m.tc }}>{t}</span>
                ))}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: m.tc, lineHeight: 1.3, marginBottom: 8 }}>
                {detailEvent.title}
              </div>
              <div style={{ fontSize: 13, color: m.tc, opacity: 0.8 }}>
                📅 {detailEvent.date}{detailEvent.endDate ? ` ~ ${detailEvent.endDate}` : ''}
                {detailEvent.endDate && (
                  <span style={{ marginLeft: 8 }}>
                    ({Math.round((new Date(detailEvent.endDate).getTime() - new Date(detailEvent.date).getTime()) / 86400000) + 1}일간)
                  </span>
                )}
              </div>
            </div>

            {/* 정보 */}
            <div className="card">
              <div className="field-row"><span className="field-label">카테고리</span>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: m.bg, color: m.tc }}>{detailEvent.category}</span>
              </div>
              <div className="field-row"><span className="field-label">시작일</span><span className="field-value">{detailEvent.date}</span></div>
              {detailEvent.endDate && <div className="field-row"><span className="field-label">종료일</span><span className="field-value">{detailEvent.endDate}</span></div>}
              <div className="field-row"><span className="field-label">대상</span>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {detailEvent.targets.map((t) => <span key={t} className="badge badge-blue" style={{ fontSize: 11 }}>{t}</span>)}
                </div>
              </div>
              {detailEvent.description && (
                <div style={{ padding: '12px 16px', borderTop: '0.5px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--slate2)', marginBottom: 4 }}>설명</div>
                  <div style={{ fontSize: 13, color: 'var(--navy)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {detailEvent.description}
                  </div>
                </div>
              )}
            </div>

            <button className="btn-secondary" onClick={() => openEdit(detailEvent)}>일정 수정</button>
            <button className="btn-danger" onClick={() => handleDelete(detailEvent.id)}>일정 삭제</button>
          </div>
        </div>
        <Toast toastRef={toastRef} />
      </>
    )
  }

  // ── 캘린더 메인 ──────────────────────────────────────────
  return (
    <>
      <TopBar
        title={`${year}년 ${month + 1}월`}
        right={
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="icon-btn" onClick={prevMonth}>
              <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button className="icon-btn" onClick={nextMonth}>
              <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        }
      />

      <div className="page-content-body">
        {/* 카테고리 필터 */}
        <div style={{ padding: '10px 16px 0', display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          <button
            onClick={() => setFilterCat('all')}
            style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: filterCat === 'all' ? 'var(--navy)' : 'var(--bg2)',
              color: filterCat === 'all' ? '#fff' : 'var(--slate2)',
              border: filterCat === 'all' ? 'none' : '0.5px solid var(--border)',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >전체</button>
          {(Object.entries(CATEGORY_META) as [EventCategory, typeof CATEGORY_META[EventCategory]][]).map(([cat, m]) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: filterCat === cat ? m.color : 'var(--bg2)',
                color: filterCat === cat ? '#fff' : 'var(--slate2)',
                border: filterCat === cat ? 'none' : '0.5px solid var(--border)',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >{m.label}</button>
          ))}
        </div>

        {/* 캘린더 그리드 */}
        <div style={{ padding: '12px 12px 0' }}>
          {/* 요일 헤더 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
            {DAY_NAMES.map((d, i) => (
              <div key={d} style={{
                textAlign: 'center', fontSize: 11, fontWeight: 600, padding: '4px 0',
                color: i === 0 ? 'var(--err)' : i === 6 ? 'var(--acc)' : 'var(--slate2)',
              }}>{d}</div>
            ))}
          </div>

          {/* 날짜 셀 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px 1px' }}>
            {/* 빈 칸 */}
            {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
            {/* 날짜 */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1
              const ds = dateStr(year, month, d)
              const dayEvents = getEventsForDate(ds)
              const isToday = ds === today.toISOString().slice(0, 10)
              const isSelected = ds === selectedDate
              const dow = (firstDow + i) % 7
              const isSun = dow === 0, isSat = dow === 6
              // 다중일 이벤트 첫날 표시
              const startEvents = events.filter((e) => e.date === ds)
              const maxDots = 3

              return (
                <div
                  key={d}
                  onClick={() => setSelectedDate(ds)}
                  style={{
                    minHeight: 52, padding: '4px 2px',
                    borderRadius: 8, cursor: 'pointer',
                    background: isSelected ? 'var(--navy)' : isToday ? 'var(--acc2)' : 'transparent',
                    border: isToday && !isSelected ? '1.5px solid var(--acc)' : '1.5px solid transparent',
                    transition: 'background .12s',
                  }}
                >
                  {/* 날짜 숫자 */}
                  <div style={{
                    textAlign: 'center', fontSize: 13, fontWeight: isToday || isSelected ? 700 : 400,
                    color: isSelected ? '#fff' : isSun ? 'var(--err)' : isSat ? 'var(--acc)' : 'var(--navy)',
                    marginBottom: 2,
                  }}>{d}</div>

                  {/* 이벤트 도트/바 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                    {dayEvents.slice(0, maxDots).map((e, ei) => (
                      <div
                        key={e.id}
                        style={{
                          width: '85%', height: 5, borderRadius: 3,
                          background: isSelected ? 'rgba(255,255,255,0.75)' : e.color,
                          opacity: 0.9,
                        }}
                      />
                    ))}
                    {dayEvents.length > maxDots && (
                      <div style={{ fontSize: 9, color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--slate3)', fontWeight: 600 }}>
                        +{dayEvents.length - maxDots}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 이번달 통계 */}
        {catCounts.length > 0 && (
          <div style={{ padding: '12px 16px 0' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {catCounts.map(({ cat, cnt }) => (
                <div key={cat} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', borderRadius: 20,
                  background: CATEGORY_META[cat].bg, border: `0.5px solid ${CATEGORY_META[cat].color}`,
                }}>
                  <span style={{ fontSize: 11, color: CATEGORY_META[cat].tc }}>{cat}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: CATEGORY_META[cat].tc }}>{cnt}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 선택 날짜 일정 */}
        <div style={{ padding: '14px 16px 0' }}>
          <div className="row" style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>
              {month + 1}월 {parseInt(selectedDate.slice(8))}일
              <span style={{ fontSize: 11, color: 'var(--slate3)', marginLeft: 6 }}>
                ({DAY_NAMES[new Date(selectedDate).getDay()]})
              </span>
            </div>
            <button
              onClick={() => openNew(selectedDate)}
              style={{
                fontSize: 11, fontWeight: 600, padding: '4px 12px',
                background: 'var(--acc)', color: '#fff', border: 'none',
                borderRadius: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <svg style={{ width: 11, height: 11, stroke: '#fff', fill: 'none', strokeWidth: 2.5, strokeLinecap: 'round' }} viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              일정 추가
            </button>
          </div>

          {selectedEvents.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '24px 0',
              color: 'var(--slate3)', fontSize: 13,
              border: '1.5px dashed var(--border)', borderRadius: 10,
            }}>
              이날 일정이 없습니다.<br />
              <span style={{ color: 'var(--acc)', cursor: 'pointer', fontSize: 12 }} onClick={() => openNew(selectedDate)}>
                + 일정 추가하기
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedEvents.map((e) => {
                const m = CATEGORY_META[e.category]
                return (
                  <div
                    key={e.id}
                    onClick={() => { setDetailId(e.id); setView('detail') }}
                    style={{
                      display: 'flex', alignItems: 'stretch', gap: 0,
                      background: 'var(--b1, #fff)', borderRadius: 12,
                      border: '0.5px solid var(--border)',
                      cursor: 'pointer', overflow: 'hidden',
                    }}
                  >
                    {/* 카테고리 컬러 바 */}
                    <div style={{ width: 4, background: e.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, padding: '11px 13px' }}>
                      <div className="row">
                        <div style={{ flex: 1, marginRight: 8 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
                            {e.title}
                          </div>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                              background: m.bg, color: m.tc,
                            }}>{e.category}</span>
                            {e.targets.map((t) => (
                              <span key={t} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: 'var(--bg2)', color: 'var(--slate2)' }}>{t}</span>
                            ))}
                            {e.endDate && e.endDate !== e.date && (
                              <span style={{ fontSize: 10, color: 'var(--slate3)' }}>~ {e.endDate.slice(5)}</span>
                            )}
                          </div>
                          {e.description && (
                            <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 5, lineHeight: 1.5 }}>
                              {e.description.length > 40 ? e.description.slice(0, 40) + '...' : e.description}
                            </div>
                          )}
                        </div>
                        <svg style={{ width: 14, height: 14, stroke: 'var(--slate3)', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', flexShrink: 0 }} viewBox="0 0 24 24">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 이번달 전체 일정 미리보기 */}
        {monthEvents.length > 0 && (
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate2)', marginBottom: 8 }}>
              {month + 1}월 전체 일정 ({monthEvents.length}건)
            </div>
            {monthEvents
              .filter((e) => filterCat === 'all' || e.category === filterCat)
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((e) => {
                const m = CATEGORY_META[e.category]
                return (
                  <div
                    key={e.id}
                    onClick={() => {
                      setSelectedDate(e.date)
                      setDetailId(e.id); setView('detail')
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', marginBottom: 6,
                      background: 'var(--b1, #fff)', borderRadius: 10,
                      border: '0.5px solid var(--border)', cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: m.bg, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: m.tc, lineHeight: 1 }}>
                        {parseInt(e.date.slice(8))}
                      </span>
                      <span style={{ fontSize: 9, color: m.tc, opacity: 0.75 }}>
                        {DAY_NAMES[new Date(e.date).getDay()]}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.title}
                      </div>
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: m.bg, color: m.tc }}>{e.category}</span>
                        {e.targets.map((t) => (
                          <span key={t} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 8, background: 'var(--bg2)', color: 'var(--slate2)' }}>{t}</span>
                        ))}
                      </div>
                    </div>
                    <svg style={{ width: 13, height: 13, stroke: 'var(--slate3)', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', flexShrink: 0 }} viewBox="0 0 24 24">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                )
              })}
          </div>
        )}

        <div style={{ height: 20 }} />
      </div>

      <Fab onClick={() => openNew(selectedDate)} />
      <Toast toastRef={toastRef} />
    </>
  )
}
