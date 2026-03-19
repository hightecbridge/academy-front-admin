// src/pages/attend/HomeworkPage.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar, TabBar, Breadcrumb, useToast, Toast } from '../../components/common'
import { useDataStore } from '../../store/dataStore'
import type { HomeworkRecord } from '../../types'

// ── 날짜 목록 생성 (최근 30일) ──────────────────────
function getRecentDates(count = 30) {
  const dates: string[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

export default function HomeworkPage() {
  const navigate = useNavigate()
  const classes    = useDataStore((s) => s.classes)
  const parents    = useDataStore((s) => s.parents)
  const homeworkSheets = useDataStore((s) => s.homeworkSheets)
  const saveHomeworkSheet   = useDataStore((s) => s.saveHomeworkSheet)
  const deleteHomeworkSheet = useDataStore((s) => s.deleteHomeworkSheet)
  const updateHomeworkRecord = useDataStore((s) => s.updateHomeworkRecord)
  const { ref: toastRef, show: showToast } = useToast()

  const [tabIdx, setTabIdx] = useState(0)
  const [view, setView] = useState<'list' | 'sheet' | 'new'>('list')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [hwTitle, setHwTitle] = useState('')
  const [editSheetId, setEditSheetId] = useState<string | null>(null)

  const allStudents = parents.flatMap((p) => p.students)
  const tabs = classes.map((c) => c.name)
  const currentCls = classes[tabIdx]

  const stuInClass = allStudents.filter((s) => s.cls === currentCls?.name ?? '')
  const clsSheets = homeworkSheets
    .filter((s) => s.cid === currentCls?.cid)
    .sort((a, b) => b.date.localeCompare(a.date))

  // 현재 열린 시트
  const currentSheet = editSheetId ? homeworkSheets.find((s) => s.id === editSheetId) : null

  // 로컬 레코드 편집 상태
  const [localRecords, setLocalRecords] = useState<HomeworkRecord[]>([])
  const [openComment, setOpenComment] = useState<number | null>(null)

  useEffect(() => {
    if (currentSheet) {
      setLocalRecords(currentSheet.records)
    }
  }, [editSheetId])

  if (!currentCls) {
    return (
      <>
        <TopBar title="숙제 관리" sub="반을 먼저 등록해주세요" onBack={() => navigate('/attend')} />
        <div className="page-content-body">
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--slate3)', fontSize: 13 }}>
            등록된 반이 없습니다.
          </div>
        </div>
      </>
    )
  }

  // ── 시트 열기 ──────────────────────────────────────
  const openSheet = (sheetId: string) => {
    const sheet = homeworkSheets.find((s) => s.id === sheetId)
    if (!sheet) return
    setEditSheetId(sheetId)
    setLocalRecords(sheet.records)
    setOpenComment(null)
    setView('sheet')
  }

  // ── 새 숙제 생성 ──────────────────────────────────
  const handleCreate = () => {
    if (!hwTitle.trim()) { showToast('숙제 제목을 입력해주세요.'); return }
    const id = `hw_${currentCls.cid}_${selectedDate}`
    if (homeworkSheets.find((s) => s.id === id)) {
      showToast('해당 날짜의 숙제가 이미 존재합니다. 기존 항목을 편집하세요.')
      return
    }
    const records: HomeworkRecord[] = stuInClass.map((s) => ({
      sid: s.sid, done: false, comment: '',
    }))
    saveHomeworkSheet(currentCls.cid, selectedDate, hwTitle, records)
    showToast('숙제가 등록되었습니다.')
    setHwTitle('')
    // 바로 시트 열기
    const newId = `hw_${currentCls.cid}_${selectedDate}`
    setEditSheetId(newId)
    setLocalRecords(records)
    setOpenComment(null)
    setView('sheet')
  }

  // ── 체크/코멘트 저장 ──────────────────────────────
  const toggleDone = (sid: number) => {
    if (!editSheetId) return
    const rec = localRecords.find((r) => r.sid === sid)
    if (!rec) return
    const next = { ...rec, done: !rec.done }
    const updated = localRecords.map((r) => r.sid === sid ? next : r)
    setLocalRecords(updated)
    updateHomeworkRecord(editSheetId, sid, next.done, next.comment)
  }

  const saveComment = (sid: number, comment: string) => {
    if (!editSheetId) return
    const updated = localRecords.map((r) => r.sid === sid ? { ...r, comment } : r)
    setLocalRecords(updated)
    updateHomeworkRecord(editSheetId, sid, localRecords.find((r) => r.sid === sid)?.done ?? false, comment)
    setOpenComment(null)
    showToast('코멘트가 저장되었습니다.')
  }

  const handleDelete = (id: string) => {
    if (!window.confirm('숙제를 삭제하시겠습니까?')) return
    deleteHomeworkSheet(id)
    showToast('삭제되었습니다.')
    setView('list')
  }

  // ── 통계 ──────────────────────────────────────────
  const getStats = (sheet: typeof homeworkSheets[0]) => {
    const done = sheet.records.filter((r) => r.done).length
    const total = sheet.records.length
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
  }

  // ── 날짜 포맷 ─────────────────────────────────────
  const fmtDate = (d: string) => {
    const obj = new Date(d)
    return `${obj.getMonth() + 1}월 ${obj.getDate()}일 (${DAY_NAMES[obj.getDay()]})`
  }

  // ═══════════════════════════════════════════════════
  // VIEW: 숙제 시트 (체크 + 코멘트)
  // ═══════════════════════════════════════════════════
  if (view === 'sheet' && currentSheet) {
    const stats = getStats(currentSheet)
    const donePct = stats.pct

    return (
      <>
        <TopBar
          title={currentSheet.title}
          sub={`${currentCls.name} · ${fmtDate(currentSheet.date)}`}
          onBack={() => { setView('list'); setEditSheetId(null) }}
          right={
            <button
              onClick={() => handleDelete(currentSheet.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2" strokeLinecap="round" style={{ width: 18, height: 18 }}>
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </button>
          }
        />
        <Breadcrumb items={[
          { label: '출석 관리', onClick: () => navigate('/attend') },
          { label: '숙제 관리', onClick: () => setView('list') },
          { label: currentSheet.title },
        ]} />

        <div className="page-content-body">
          {/* 요약 카드 */}
          <div className="sec">
            <div style={{
              background: currentCls.color, borderRadius: 14,
              padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: currentCls.textColor, marginBottom: 4, opacity: 0.8 }}>
                  완료율
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: currentCls.textColor, lineHeight: 1 }}>
                  {donePct}%
                </div>
                <div style={{ marginTop: 8, height: 6, background: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${donePct}%`, background: 'rgba(255,255,255,0.8)', borderRadius: 3, transition: 'width 0.4s ease' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                {[
                  { label: '완료', val: stats.done, color: 'var(--ok)' },
                  { label: '미완료', val: stats.total - stats.done, color: 'var(--err)' },
                  { label: '전체', val: stats.total, color: currentCls.textColor },
                ].map(item => (
                  <div key={item.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.val}</div>
                    <div style={{ fontSize: 10, color: currentCls.textColor, opacity: 0.7 }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 일괄 처리 버튼 */}
          <div className="sec" style={{ paddingTop: 0 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  if (!editSheetId) return
                  const all = localRecords.map((r) => { updateHomeworkRecord(editSheetId, r.sid, true, r.comment); return { ...r, done: true } })
                  setLocalRecords(all)
                  showToast('전체 완료 처리되었습니다.')
                }}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1.5px solid var(--ok)', background: 'var(--ok2)', color: 'var(--ok)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                ✓ 전체 완료
              </button>
              <button
                onClick={() => {
                  if (!editSheetId) return
                  const all = localRecords.map((r) => { updateHomeworkRecord(editSheetId, r.sid, false, r.comment); return { ...r, done: false } })
                  setLocalRecords(all)
                  showToast('전체 미완료 처리되었습니다.')
                }}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg2)', color: 'var(--slate2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                ✕ 전체 미완료
              </button>
            </div>
          </div>

          {/* 학생 목록 */}
          <div className="sec" style={{ paddingTop: 0 }}>
            <div className="sec-title" style={{ marginBottom: 10 }}>학생별 완료 현황</div>
            {stuInClass.map((stu, idx) => {
              const rec = localRecords.find((r) => r.sid === stu.sid) ?? { sid: stu.sid, done: false, comment: '' }
              const isCommentOpen = openComment === stu.sid
              return (
                <div
                  key={stu.sid}
                  className="card"
                  style={{
                    marginBottom: 8,
                    borderLeft: `4px solid ${rec.done ? 'var(--ok)' : 'var(--border)'}`,
                    transition: 'border-left-color 0.2s',
                  }}
                >
                  {/* 메인 행 */}
                  <div
                    style={{ padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                    onClick={() => toggleDone(stu.sid)}
                  >
                    {/* 체크박스 */}
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: rec.done ? 'var(--ok)' : 'var(--bg3)',
                      border: `2px solid ${rec.done ? 'var(--ok)' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>
                      {rec.done && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" style={{ width: 14, height: 14 }}>
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>

                    {/* 학생 아바타 + 이름 */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 18, flexShrink: 0,
                      background: 'var(--acc3)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 15, fontWeight: 700, color: 'var(--acc)',
                    }}>
                      {stu.name[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{stu.name}</span>
                        <span style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 600,
                          background: rec.done ? 'var(--ok2)' : 'var(--err2)',
                          color: rec.done ? 'var(--ok)' : 'var(--err)',
                        }}>
                          {rec.done ? '완료' : '미완료'}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--slate3)', marginTop: 2 }}>
                        {stu.grade}
                        {rec.comment && (
                          <span style={{ color: 'var(--acc)', marginLeft: 8 }}>
                            💬 {rec.comment.length > 12 ? rec.comment.slice(0, 12) + '…' : rec.comment}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 코멘트 버튼 */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenComment(isCommentOpen ? null : stu.sid) }}
                      style={{
                        flexShrink: 0, width: 34, height: 34, borderRadius: 10,
                        border: `1.5px solid ${isCommentOpen ? 'var(--acc)' : rec.comment ? 'var(--acc3)' : 'var(--border)'}`,
                        background: isCommentOpen ? 'var(--acc2)' : rec.comment ? 'var(--acc2)' : 'var(--bg2)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke={rec.comment || isCommentOpen ? 'var(--acc)' : 'var(--slate3)'} strokeWidth="2" strokeLinecap="round" style={{ width: 16, height: 16 }}>
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                    </button>
                  </div>

                  {/* 코멘트 입력창 */}
                  {isCommentOpen && (
                    <CommentEditor
                      defaultValue={rec.comment}
                      studentName={stu.name}
                      onSave={(v) => saveComment(stu.sid, v)}
                      onCancel={() => setOpenComment(null)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
        <Toast toastRef={toastRef} />
      </>
    )
  }

  // ═══════════════════════════════════════════════════
  // VIEW: 숙제 목록
  // ═══════════════════════════════════════════════════
  return (
    <>
      <TopBar
        title="숙제 관리"
        sub={`${currentCls.name} · ${clsSheets.length}개`}
        onBack={() => navigate('/attend')}
        right={
          <button
            onClick={() => setView('new')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'var(--acc)', color: '#fff', border: 'none',
              borderRadius: 8, padding: '7px 13px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" style={{ width: 13, height: 13 }}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            숙제 등록
          </button>
        }
      />
      <Breadcrumb items={[
        { label: '출석 관리', onClick: () => navigate('/attend') },
        { label: '숙제 관리' },
      ]} />
      {tabs.length > 0 && (
        <TabBar tabs={tabs} active={tabIdx} onChange={(i) => { setTabIdx(i); setView('list') }} />
      )}

      <div className="page-content-body">

        {/* 숙제 등록 폼 (인라인) */}
        {view === 'new' && (
          <div className="sec">
            <div className="card" style={{ padding: '16px', marginBottom: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>
                📝 새 숙제 등록 — {currentCls.name}
              </div>
              <label className="input-label" style={{ marginTop: 0 }}>수업 날짜</label>
              <input
                type="date"
                className="input-field"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
              />
              <label className="input-label">숙제 제목</label>
              <input
                className="input-field"
                placeholder="예) 교재 p.34~36 풀기, 단어 20개 암기"
                value={hwTitle}
                onChange={(e) => setHwTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button className="btn-primary" style={{ marginTop: 0 }} onClick={handleCreate}>
                  등록 후 체크하기
                </button>
                <button className="btn-secondary" style={{ marginTop: 0 }} onClick={() => setView('list')}>
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 월별 요약 통계 */}
        {clsSheets.length > 0 && (
          <div className="sec" style={{ paddingTop: view === 'new' ? 0 : undefined }}>
            <div className="sec-title">이번달 숙제 현황</div>
            <div className="stat-grid">
              {(() => {
                const ym = new Date().toISOString().slice(0, 7)
                const monthSheets = clsSheets.filter((s) => s.date.startsWith(ym))
                const totalAssigned = monthSheets.reduce((a, s) => a + s.records.length, 0)
                const totalDone = monthSheets.reduce((a, s) => a + s.records.filter((r) => r.done).length, 0)
                const avgPct = totalAssigned > 0 ? Math.round((totalDone / totalAssigned) * 100) : 0
                return (
                  <>
                    <div className="stat-card">
                      <div className="stat-label">숙제 수</div>
                      <div className="stat-value">{monthSheets.length}</div>
                      <div className="stat-sub">이번달</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">평균 완료율</div>
                      <div className="stat-value" style={{ color: avgPct >= 80 ? 'var(--ok)' : avgPct >= 60 ? 'var(--warn)' : 'var(--err)' }}>
                        {avgPct}%
                      </div>
                      <div className="stat-sub">이번달</div>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        )}

        {/* 숙제 목록 */}
        <div className="sec" style={{ paddingTop: 0 }}>
          <div className="sec-title">숙제 목록</div>

          {clsSheets.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--slate3)', fontSize: 13 }}>
              등록된 숙제가 없습니다.<br />
              우측 상단 <strong style={{ color: 'var(--acc)' }}>+ 숙제 등록</strong> 버튼으로 추가하세요.
            </div>
          )}

          {clsSheets.map((sheet) => {
            const stats = getStats(sheet)
            const dObj = new Date(sheet.date)
            const pctCol = stats.pct >= 80 ? 'var(--ok)' : stats.pct >= 60 ? 'var(--warn)' : 'var(--err)'
            return (
              <div
                key={sheet.id}
                className="card"
                style={{ marginBottom: 10, cursor: 'pointer' }}
                onClick={() => openSheet(sheet.id)}
              >
                <div style={{ padding: '14px 16px' }}>
                  {/* 날짜 + 타이틀 */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 11, flexShrink: 0,
                      background: currentCls.color,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: currentCls.textColor, lineHeight: 1.1 }}>{dObj.getDate()}</span>
                      <span style={{ fontSize: 9, fontWeight: 600, color: currentCls.textColor, opacity: 0.75 }}>{DAY_NAMES[dObj.getDay()]}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sheet.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--slate3)' }}>
                        {dObj.getMonth() + 1}월 {dObj.getDate()}일 ({DAY_NAMES[dObj.getDay()]}) · {stuInClass.length}명
                      </div>
                    </div>
                    {/* 완료율 */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: pctCol }}>{stats.pct}%</div>
                      <div style={{ fontSize: 10, color: 'var(--slate3)' }}>{stats.done}/{stats.total}</div>
                    </div>
                  </div>

                  {/* 진행 바 */}
                  <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', width: `${stats.pct}%`, background: pctCol, borderRadius: 3, transition: 'width 0.4s ease' }} />
                  </div>

                  {/* 학생 완료 아이콘 목록 */}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {stuInClass.map((stu) => {
                      const rec = sheet.records.find((r) => r.sid === stu.sid)
                      return (
                        <div
                          key={stu.sid}
                          title={`${stu.name}: ${rec?.done ? '완료' : '미완료'}${rec?.comment ? ` - ${rec.comment}` : ''}`}
                          style={{
                            width: 26, height: 26, borderRadius: 13,
                            background: rec?.done ? 'var(--ok)' : 'var(--bg3)',
                            border: `2px solid ${rec?.done ? 'var(--ok)' : 'var(--border)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700,
                            color: rec?.done ? '#fff' : 'var(--slate3)',
                          }}
                        >
                          {stu.name[0]}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <Toast toastRef={toastRef} />
    </>
  )
}

// ── 코멘트 에디터 컴포넌트 ──────────────────────────
function CommentEditor({
  defaultValue, studentName, onSave, onCancel,
}: {
  defaultValue: string
  studentName: string
  onSave: (v: string) => void
  onCancel: () => void
}) {
  const [val, setVal] = useState(defaultValue)

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      padding: '12px 14px',
      background: 'var(--acc2)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--acc)', marginBottom: 8 }}>
        💬 {studentName} 코멘트
      </div>
      <textarea
        className="input-field"
        style={{ height: 72, marginTop: 0, fontSize: 13 }}
        placeholder={`${studentName} 학생에 대한 코멘트 입력\n예) 오늘 숙제 꼼꼼히 잘 해왔음, 2번 문제 오답 있음`}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        autoFocus
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          onClick={() => onSave(val)}
          style={{
            flex: 1, padding: '9px 0', borderRadius: 9,
            background: 'var(--acc)', color: '#fff',
            border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          저장
        </button>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: '9px 0', borderRadius: 9,
            background: 'var(--bg2)', color: 'var(--slate2)',
            border: '1.5px solid var(--border)', fontSize: 13, cursor: 'pointer',
          }}
        >
          취소
        </button>
      </div>
    </div>
  )
}
