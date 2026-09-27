import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDataStore } from '../../store/dataStore'
import { useAuthStore } from '../../store/authStore'
import { isMenuEnabled, isRegularExamKind } from '../../config/menuCatalog'
import type { GradeHistory } from '../../types'

function fmt(v: number | null | undefined) {
  if (v == null) return '—'
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

function sectionLine(sections?: { name: string; score: number | null; percent: number | null; maxScore: number }[]) {
  if (!sections?.length) return null
  return sections.map((s) => {
    const actual = s.score == null ? '—' : `${fmt(s.score)}/${s.maxScore}`
    const pct = s.percent == null ? '' : ` (${fmt(s.percent)}%)`
    return `${s.name} ${actual}${pct}`
  }).join(' · ')
}

export function StudentGradeSection({ sid }: { sid: number; classroomId?: number }) {
  const navigate = useNavigate()
  const fetchStudentGrades = useDataStore((s) => s.fetchStudentGrades)
  const menuSettings = useAuthStore((s) => s.user?.menuSettings)
  const showRegular = isMenuEnabled(menuSettings, 'examsRegular')
  const showDaily = isMenuEnabled(menuSettings, 'examsDaily')
  const [data, setData] = useState<GradeHistory | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    void fetchStudentGrades(sid)
      .then((h) => { if (alive) setData(h) })
      .catch((e: { response?: { data?: { message?: string } } }) => {
        if (alive) setError(e.response?.data?.message ?? '성적을 불러오지 못했습니다.')
      })
    return () => { alive = false }
  }, [sid, fetchStudentGrades])

  const items = useMemo(() => {
    const list = data?.items ?? []
    return list.filter((it) => isRegularExamKind(it.kind) ? showRegular : showDaily)
  }, [data, showRegular, showDaily])

  const href = showRegular ? `/exams/regular?sid=${sid}` : `/exams/daily?sid=${sid}`

  return (
    <div className="sec">
      <div className="sec-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>성적</span>
        <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}
          onClick={() => navigate(href)}>
          전체 보기
        </button>
      </div>
      {error && <div style={{ fontSize: 13, color: 'var(--err)' }}>{error}</div>}
      {!error && !data && <div style={{ fontSize: 13, color: 'var(--slate3)' }}>불러오는 중...</div>}
      {data && items.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--slate3)', padding: '12px 0' }}>등록된 성적이 없습니다.</div>
      )}
      {items.slice(0, 5).map((it) => (
        <div key={it.examId} className="card" style={{ padding: '12px 14px', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{it.title}</span>
                {it.kindLabel && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
                    background: it.kind === 'ALL' ? 'var(--acc2)' : 'var(--bg2)',
                    color: it.kind === 'ALL' ? 'var(--acc)' : 'var(--navy)',
                  }}>{it.kindLabel}</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--slate3)', marginTop: 2 }}>{it.date}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{fmt(it.score)}<span style={{ fontSize: 11, color: 'var(--slate3)' }}>/{it.maxScore}</span></div>
              <div style={{ fontSize: 11, color: 'var(--slate2)', marginTop: 2 }}>{it.rank != null ? `${it.rank}등` : '미응시'}</div>
              {(it.examAvg != null || it.classAvg != null) && (
                <div style={{ fontSize: 11, color: 'var(--slate2)', marginTop: 2 }}>
                  {it.examAvg != null ? `전체평균 ${fmt(it.examAvg)}` : ''}
                  {it.examAvg != null && it.classAvg != null ? ' · ' : ''}
                  {it.classAvg != null ? `반평균 ${fmt(it.classAvg)}` : ''}
                </div>
              )}
            </div>
          </div>
          {sectionLine(it.sectionScores) && (
            <div style={{ fontSize: 11, color: 'var(--slate2)', marginTop: 8, lineHeight: 1.5 }}>{sectionLine(it.sectionScores)}</div>
          )}
        </div>
      ))}
    </div>
  )
}
