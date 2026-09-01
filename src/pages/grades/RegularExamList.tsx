import { VALID_GRADES } from '../../utils/parentBulkImport'
import type { ExamItem } from '../../types'
import { examStatusStyle, type PeriodPreset } from '../../utils/examPeriod'

function ProgressBar({ done, total, pending }: { done: number; total: number; pending?: string[] }) {
  const pct = total <= 0 ? 0 : Math.min(100, Math.round((done / Math.max(total, 1)) * 100))
  const incomplete = total > 0 && done < total
  return (
    <div style={{ minWidth: 120 }}>
      <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: incomplete ? 'var(--warn)' : 'var(--ok)',
          transition: 'width .2s',
        }} />
      </div>
      <div style={{ fontSize: 11, fontWeight: incomplete ? 800 : 600, color: incomplete ? 'var(--warn)' : 'var(--slate2)', marginTop: 4 }}>
        {done}/{total} 반 완료
      </div>
      {pending && pending.length > 0 && (
        <div style={{ fontSize: 10, color: 'var(--err)', marginTop: 2 }}>미입력 {pending.join(', ')}</div>
      )}
    </div>
  )
}

export function RegularExamList({
  exams,
  total,
  page,
  totalPages,
  grade,
  period,
  customFrom,
  customTo,
  status,
  q,
  dateDesc,
  onGrade,
  onPeriod,
  onCustomFrom,
  onCustomTo,
  onStatus,
  onQuery,
  onToggleDateSort,
  onOpen,
  onAction,
  onPage,
}: {
  exams: ExamItem[]
  total: number
  page: number
  totalPages: number
  grade: string
  period: PeriodPreset
  customFrom: string
  customTo: string
  status: string
  q: string
  dateDesc: boolean
  onGrade: (v: string) => void
  onPeriod: (v: PeriodPreset) => void
  onCustomFrom: (v: string) => void
  onCustomTo: (v: string) => void
  onStatus: (v: string) => void
  onQuery: (v: string) => void
  onToggleDateSort: () => void
  onOpen: (id: number) => void
  onAction: (exam: ExamItem) => void
  onPage: (p: number) => void
}) {
  return (
    <div className="sec">
      <div style={{
        position: 'sticky', top: 0, zIndex: 2, background: 'var(--bg2)',
        paddingBottom: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
      }}>
        <select className="input-field" style={{ margin: 0 }} value={grade} onChange={(e) => onGrade(e.target.value)}>
          <option value="">학년/과정 전체</option>
          {VALID_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select className="input-field" style={{ margin: 0 }} value={period} onChange={(e) => onPeriod(e.target.value as PeriodPreset)}>
          <option value="thisMonth">이번달</option>
          <option value="lastMonth">지난달</option>
          <option value="semester">학기 전체</option>
          <option value="custom">직접 선택</option>
        </select>
        {period === 'custom' && (
          <>
            <input className="input-field" style={{ margin: 0 }} type="date" value={customFrom} onChange={(e) => onCustomFrom(e.target.value)} />
            <input className="input-field" style={{ margin: 0 }} type="date" value={customTo} onChange={(e) => onCustomTo(e.target.value)} />
          </>
        )}
        <select className="input-field" style={{ margin: 0 }} value={status} onChange={(e) => onStatus(e.target.value)}>
          <option value="">상태 전체</option>
          <option value="SCHEDULED">예정</option>
          <option value="IN_PROGRESS">진행중</option>
          <option value="COMPLETE">입력완료</option>
          <option value="CLOSED">마감</option>
        </select>
        <input className="input-field" style={{ margin: 0 }} placeholder="시험명 검색" value={q} onChange={(e) => onQuery(e.target.value)} />
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760, fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg2)', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px' }}>시험명</th>
              <th style={{ padding: '10px 12px' }}>응시대상</th>
              <th style={{ padding: '10px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={onToggleDateSort}>
                시행일 {dateDesc ? '↓' : '↑'}
              </th>
              <th style={{ padding: '10px 12px' }}>과목 수</th>
              <th style={{ padding: '10px 12px' }}>입력 진행률</th>
              <th style={{ padding: '10px 12px' }}>상태</th>
              <th style={{ padding: '10px 12px' }}>액션</th>
            </tr>
          </thead>
          <tbody>
            {exams.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--slate3)' }}>
                  조건에 맞는 정기고사/모의고사가 없습니다.
                </td>
              </tr>
            )}
            {exams.map((ex) => {
              const pending = (ex.classProgress ?? []).filter((p) => !p.complete).map((p) => p.classroomName)
              const result = ex.status === 'COMPLETE' || ex.status === 'CLOSED'
              return (
                <tr key={ex.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px', fontWeight: 700, color: 'var(--navy)', cursor: 'pointer' }} onClick={() => onOpen(ex.id)}>
                    {ex.title}
                  </td>
                  <td style={{ padding: '12px', color: 'var(--slate2)' }}>{ex.targetLabel || '전체'}</td>
                  <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>{ex.date}</td>
                  <td style={{ padding: '12px', color: 'var(--slate2)', whiteSpace: 'nowrap' }}>{ex.subjectSummary || '0과목'}</td>
                  <td style={{ padding: '12px' }}>
                    <ProgressBar
                      done={ex.completedClasses ?? 0}
                      total={ex.totalClasses ?? 0}
                      pending={pending}
                    />
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 8, ...examStatusStyle(ex.status) }}>
                      {ex.statusLabel || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button
                      type="button"
                      className={result ? 'btn-secondary' : 'btn-primary'}
                      style={{ width: 'auto', padding: '7px 12px', margin: 0, fontSize: 12 }}
                      onClick={() => onAction(ex)}
                    >
                      {result ? '결과보기' : '입력하기'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {total > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14, alignItems: 'center' }}>
          <button className="btn-secondary" disabled={page <= 0} onClick={() => onPage(page - 1)}
            style={{ width: 'auto', padding: '8px 14px', opacity: page <= 0 ? 0.5 : 1 }}>이전</button>
          <span style={{ fontSize: 12, color: 'var(--slate2)' }}>{page + 1} / {totalPages} · {total}건</span>
          <button className="btn-secondary" disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)}
            style={{ width: 'auto', padding: '8px 14px', opacity: page + 1 >= totalPages ? 0.5 : 1 }}>다음</button>
        </div>
      )}
    </div>
  )
}
