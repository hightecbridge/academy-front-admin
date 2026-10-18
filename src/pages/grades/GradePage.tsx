import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TopBar, Fab, Breadcrumb, useToast, Toast } from '../../components/common'
import { useDataStore, studentInClass } from '../../store/dataStore'
import { useAuthStore } from '../../store/authStore'
import type { ExamItem, ExamKind, ExamScoreRow, ExamScoreSection, ExamSection, ExamStats, GradeHistory } from '../../types'
import { VALID_GRADES } from '../../utils/parentBulkImport'
import { downloadExamScoreTemplate, parseExamScoreExcel } from '../../utils/examExcel'
import { periodRange, ymd, type PeriodPreset } from '../../utils/examPeriod'
import { downloadElementPng } from '../../utils/downloadPng'
import {
  closeRegularExam,
  createRegularExam,
  deleteRegularExam,
  fetchRegularExam,
  fetchRegularExamStats,
  fetchRegularExams,
  saveRegularExamScores,
  updateRegularExam,
} from '../../api/regularExams'
import {
  createDailyExam,
  deleteDailyExam,
  fetchDailyCalendar,
  fetchDailyExam,
  fetchDailyExams,
  saveDailyExamScores,
  updateDailyExam,
} from '../../api/dailyExams'
import { RegularExamList } from './RegularExamList'
import { DailyExamBoard } from './DailyExamBoard'
import type { DailyCalendarDay } from '../../api/dailyExams'

type View = 'list' | 'write' | 'exam' | 'stats' | 'student'
type SectionMetaDraft = { key: string; id?: number; name: string; maxScore: string; weight: string }
type SectionScoreDraft = { score: string; percent: string }
type ScoreDraft = { score: string; comment: string; sections: Record<number, SectionScoreDraft> }

function emptyScoreDraft(): ScoreDraft {
  return { score: '', comment: '', sections: {} }
}

function fmtScore(v: number | null | undefined) {
  if (v == null) return '—'
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

function scorePercent(value: number | null | undefined, max: number): number | null {
  if (value == null || max <= 0) return null
  return Math.round((value * 1000) / max) / 10
}

function calcPercent(score: string, max: number): string {
  const n = Number(score)
  if (score.trim() === '' || Number.isNaN(n) || max <= 0) return ''
  const p = Math.round((n * 1000) / max) / 10
  return String(p)
}

function SectionChips({ sections }: { sections?: ExamScoreSection[] | null }) {
  if (!sections?.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {sections.map((s) => (
        <span key={s.sectionId} style={{
          fontSize: 11, color: 'var(--navy)', background: 'var(--bg2)', borderRadius: 8,
          padding: '4px 8px', fontWeight: 600,
        }}>
          {s.name} {s.score == null ? '—' : fmtScore(s.score)}/{s.maxScore}
          {s.percent != null ? ` · ${fmtScore(s.percent)}%` : ''}
        </span>
      ))}
    </div>
  )
}

function examTargetLabel(exam: Pick<ExamItem, 'targetLabel' | 'classrooms' | 'classroomName' | 'kind'>) {
  if (exam.targetLabel) return exam.targetLabel
  if (exam.kind === 'ALL') return '전체'
  const names = (exam.classrooms ?? []).map((c) => c.name).filter(Boolean)
  if (names.length) return names.join(' · ')
  return exam.classroomName || ''
}

function ClassTargetPicker({
  classes,
  classroomIds,
  onToggle,
  onSelectAll,
}: {
  classes: { cid: number; name: string }[]
  classroomIds: number[]
  onToggle: (cid: number) => void
  onSelectAll: () => void
}) {
  const allSelected = classroomIds.length === classes.length && classes.length > 0
  return (
    <>
      <label className="input-label">대상 반 * (여러 반 선택 가능)</label>
      <div className="chip-row" style={{ marginTop: 8 }}>
        <div className={`chip${allSelected ? ' active' : ''}`} onClick={onSelectAll}>
          반 전체 선택
        </div>
        {classes.map((c) => (
          <div
            key={c.cid}
            className={`chip${classroomIds.includes(c.cid) ? ' active' : ''}`}
            onClick={() => onToggle(c.cid)}
          >
            {c.name}
          </div>
        ))}
      </div>
      {classroomIds.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
          {classes.filter((c) => classroomIds.includes(c.cid)).map((c) => (
            <span key={c.cid} className="badge badge-blue" style={{ fontSize: 11 }}>{c.name}</span>
          ))}
        </div>
      )}
      {classes.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--slate3)', marginTop: 8 }}>등록된 반이 없습니다.</div>
      )}
    </>
  )
}

function sectionWeightOf(sec: { maxScore: number; weight?: number }) {
  return sec.weight && sec.weight > 0 ? sec.weight : sec.maxScore
}

function weightedSectionTotal(
  sections: Record<number, SectionScoreDraft>,
  meta: { id: number; maxScore: number; weight?: number }[],
): number | null {
  let sum = 0
  let any = false
  for (const sec of meta) {
    const t = (sections[sec.id]?.score ?? '').trim()
    if (t === '') continue
    const n = Number(t)
    if (Number.isNaN(n)) continue
    const max = sec.maxScore > 0 ? sec.maxScore : 1
    sum += n * sectionWeightOf(sec) / max
    any = true
  }
  return any ? Math.round(sum * 10) / 10 : null
}

function kindBadgeStyle(kind?: ExamKind | string) {
  return kind === 'ALL'
    ? { background: 'var(--acc2)', color: 'var(--acc)' }
    : { background: 'var(--bg2)', color: 'var(--navy)' }
}

function deltaLabel(d: number | null | undefined) {
  if (d == null) return null
  if (d > 0) return { text: `▲ ${fmtScore(d)}`, color: 'var(--ok)' }
  if (d < 0) return { text: `▼ ${fmtScore(Math.abs(d))}`, color: 'var(--err)' }
  return { text: '변동 없음', color: 'var(--slate2)' }
}

const BAR = {
  examAvg: { label: '전체평균', color: '#64748B' },
  classAvg: { label: '반평균', color: 'var(--acc)' },
  mine: { label: '내 점수', color: 'var(--ok)' },
} as const

function BarLegend({ marginBottom = 10 }: { marginBottom?: number }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom, fontSize: 11, fontWeight: 700, flexWrap: 'wrap' }}>
      {Object.values(BAR).map((b) => (
        <span key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 5, color: b.color }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: b.color }} />{b.label}
        </span>
      ))}
    </div>
  )
}

function barHeight(value: number | null | undefined, max: number, chartH: number) {
  if (value == null) return 4
  return Math.max(8, Math.round((value / max) * chartH))
}

function ImageSaveButton({
  getTarget,
  filename,
  onError,
  label = '이미지 저장',
}: {
  getTarget: () => HTMLElement | null
  filename: string
  onError: (msg: string) => void
  label?: string
}) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      data-skip-capture=""
      className="btn-secondary"
      disabled={busy}
      onClick={() => {
        void (async () => {
          const el = getTarget()
          if (!el) return
          setBusy(true)
          try {
            await downloadElementPng(el, filename)
          } catch {
            onError('이미지 저장에 실패했습니다.')
          } finally {
            setBusy(false)
          }
        })()
      }}
      style={{ width: 'auto', padding: '5px 10px', fontSize: 12, fontWeight: 700, marginTop: 0, flexShrink: 0 }}
    >
      {busy ? '저장 중...' : label}
    </button>
  )
}

function SecHead({
  title,
  getTarget,
  filename,
  onError,
}: {
  title: string
  getTarget: () => HTMLElement | null
  filename: string
  onError: (msg: string) => void
}) {
  return (
    <div className="sec-title" data-skip-capture="" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <span>{title}</span>
      <ImageSaveButton getTarget={getTarget} filename={filename} onError={onError} />
    </div>
  )
}

/** 전체평균 · 반평균 · 내 점수 3개 막대 */
function ThreeScoreBars({
  examAvg,
  classAvg,
  myScore,
  maxScore = 100,
}: {
  examAvg: number | null
  classAvg: number | null
  myScore: number | null
  maxScore?: number
}) {
  const max = Math.max(1, maxScore, examAvg ?? 0, classAvg ?? 0, myScore ?? 0)
  const chartH = 200
  const items = [
    { ...BAR.examAvg, value: examAvg },
    { ...BAR.classAvg, value: classAvg },
    { ...BAR.mine, value: myScore },
  ]
  return (
    <div>
      <BarLegend />
      <div style={{ width: '100%', padding: '8px 4px 0' }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 28,
          width: '100%',
          borderBottom: '2.5px solid #A78BFA',
        }}>
          {items.map((p) => (
            <div key={p.label} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: p.color, marginBottom: 10 }}>
                {p.value == null ? '—' : `${fmtScore(p.value)}점`}
              </div>
              <div style={{
                width: '42%', maxWidth: 96, minWidth: 48,
                height: barHeight(p.value, max, chartH),
                background: p.value == null ? 'var(--bg3)' : p.color,
                border: '2px solid #7C3AED',
                borderRadius: '10px 10px 0 0',
                opacity: p.value == null ? 0.45 : 1,
              }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 28, width: '100%', paddingTop: 10 }}>
          {items.map((p) => (
            <div key={p.label} style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>
              {p.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ScoreBars({
  points,
}: {
  points: { key: string; label: string; value: number | null; max?: number; sub?: string }[]
}) {
  const max = Math.max(1, ...points.map((p) => p.max ?? p.value ?? 0), 100)
  if (points.length === 0) {
    return <div style={{ fontSize: 13, color: 'var(--slate3)', padding: '12px 0' }}>데이터가 없습니다.</div>
  }
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, padding: '0 4px' }}>
      {points.map((p) => {
        const h = barHeight(p.value, max, 120)
        return (
          <div key={p.key} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>{p.value == null ? '—' : fmtScore(p.value)}</div>
            <div style={{
              width: '70%', maxWidth: 28, height: h,
              background: p.value == null ? 'var(--bg3)' : 'var(--acc)',
              borderRadius: '5px 5px 2px 2px', opacity: p.value == null ? 0.5 : 1,
            }} />
            <div style={{
              fontSize: 10, color: 'var(--slate2)', marginTop: 6, textAlign: 'center',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%',
            }}>
              {p.label}
            </div>
            {p.sub && <div style={{ fontSize: 9, color: 'var(--slate3)' }}>{p.sub}</div>}
          </div>
        )
      })}
    </div>
  )
}

function textEm(text: string) {
  let em = 0
  for (const ch of text) em += (ch >= '0' && ch <= '9') || ch === '.' ? 0.62 : 1
  return em || 1
}

function fitFontSize(text: string, colW: number, maxFont: number, minFont: number) {
  if (colW <= 0) return minFont
  const fitted = Math.floor((colW - 1) / textEm(text))
  return Math.max(minFont, Math.min(maxFont, fitted))
}

/** 영역 수와 가로 너비에 맞춰 막대·글자 크기를 줄여 스크롤 없이 한 줄에 맞춘다 */
function subjectChartLayout(count: number, rowWidth: number) {
  const n = Math.max(1, count)
  const gap = n >= 7 ? 10 : n >= 5 ? 12 : 16
  const innerGap = n >= 6 ? 4 : n >= 4 ? 8 : 12
  const width = rowWidth > 0 ? rowWidth : 320
  const groupW = Math.max(0, (width - gap * (n - 1)) / n)
  const chromeX = 23
  const colW = Math.max(0, (groupW - chromeX - innerGap * 2) / 3)
  const labelMode: 'full' | 'short' | 'none' = colW >= 54 ? 'full' : colW >= 28 ? 'short' : 'none'
  const chartH = groupW >= 150 ? 220 : groupW >= 96 ? 180 : 150
  return {
    gap,
    innerGap,
    colW,
    chartH,
    labelMode,
    labelFont: colW >= 54 ? 11 : 10,
    nameFont: groupW >= 120 ? 14 : groupW >= 72 ? 12 : 11,
    subFont: groupW >= 100 ? 12 : 10,
    barW: Math.max(4, Math.min(44, colW * 0.82)),
    scoreMax: colW >= 58 ? 16 : 14,
    withPoint: colW >= 42,
  }
}

function barCaption(label: string, mode: 'full' | 'short' | 'none') {
  if (mode === 'none') return ''
  if (mode === 'full') return label
  if (label === '전체평균') return '전체'
  if (label === '반평균') return '반'
  if (label === '내 점수') return '내'
  return label
}

/** 시험별·영역별로 전체평균·반평균·내 점수를 묶어서 표시 */
function ExamCompareBars({
  exams,
  size = 'compact',
}: {
  exams: {
    key: string
    label: string
    sub?: string
    myScore: number | null
    examAvg: number | null
    classAvg: number | null
    maxScore: number
    rank?: number | null
    rankedCount?: number | null
    classRank?: number | null
    classRankedCount?: number | null
  }[]
  /** large: 영역별 실제 점수를 막대 위에 적고, 너비에 맞춰 스크롤 없이 줄인다 */
  size?: 'compact' | 'large'
}) {
  const large = size === 'large'
  const rowRef = useRef<HTMLDivElement>(null)
  const [rowWidth, setRowWidth] = useState(0)
  useEffect(() => {
    const el = rowRef.current
    if (!el || !large) return
    const apply = () => setRowWidth(el.clientWidth)
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [large, exams.length])

  if (exams.length === 0) {
    return <div style={{ fontSize: 13, color: 'var(--slate3)', padding: '12px 0' }}>데이터가 없습니다.</div>
  }
  const sharedMax = Math.max(1, ...exams.flatMap((e) => [e.maxScore, e.myScore ?? 0, e.examAvg ?? 0, e.classAvg ?? 0]))
  const layout = large ? subjectChartLayout(exams.length, rowWidth) : null
  const chartH = layout?.chartH ?? 110
  return (
    <div style={{ width: '100%', minWidth: 0 }}>
      <BarLegend marginBottom={large ? 6 : 10} />
      <div
        ref={rowRef}
        style={large ? {
          display: 'grid',
          gridTemplateColumns: `repeat(${exams.length}, minmax(0, 1fr))`,
          columnGap: layout?.gap ?? 12,
          width: '100%',
          minWidth: 0,
          alignItems: 'stretch',
        } : {
          display: 'flex',
          alignItems: 'flex-end',
          gap: 10,
          height: 168,
          padding: '0 2px',
          overflowX: 'auto',
        }}
      >
        {exams.map((ex) => {
          const max = large
            ? Math.max(1, ex.maxScore, ex.myScore ?? 0, ex.examAvg ?? 0, ex.classAvg ?? 0)
            : sharedMax
          const bars = [
            { ...BAR.examAvg, value: ex.examAvg },
            { ...BAR.classAvg, value: ex.classAvg },
            { ...BAR.mine, value: ex.myScore },
          ]
          return (
            <div key={ex.key} style={{
              flex: large ? undefined : '1 0 72px',
              minWidth: large ? 0 : 72,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: large ? 'flex-start' : 'flex-end',
              overflow: 'hidden',
              ...(large ? {
                border: '2px solid #A78BFA',
                borderRadius: 12,
                background: '#F7F4FF',
                padding: '12px 10px 14px',
                boxShadow: '0 2px 8px rgba(124, 108, 255, 0.12)',
              } : {}),
            }}>
              {large && (
                <div style={{
                  width: '100%',
                  textAlign: 'center',
                  paddingBottom: 8,
                  marginBottom: 12,
                  borderBottom: '1.5px solid #DDD6FE',
                }}>
                  <div style={{
                    display: 'block',
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'linear-gradient(135deg, #7B6CFF 0%, #C084FC 100%)',
                    color: '#fff',
                    boxShadow: '0 4px 10px rgba(124, 108, 255, 0.28)',
                    fontSize: Math.max(layout?.nameFont ?? 14, 16),
                    fontWeight: 800,
                    lineHeight: 1.2,
                    letterSpacing: '-0.02em',
                    borderRadius: 8,
                    padding: '7px 8px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {ex.label}
                  </div>
                  {ex.sub && (
                    <div style={{
                      fontSize: Math.max(layout?.subFont ?? 12, 13),
                      fontWeight: 800,
                      color: 'var(--navy)',
                      marginTop: 4,
                      lineHeight: 1.35,
                      wordBreak: 'keep-all',
                    }}>{ex.sub}</div>
                  )}
                </div>
              )}
              <div style={large ? {
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                columnGap: layout?.innerGap ?? 4,
                width: '100%',
                minWidth: 0,
                alignItems: 'end',
                marginTop: 'auto',
                borderBottom: '2.5px solid #A78BFA',
              } : {
                display: 'flex',
                alignItems: 'flex-end',
                gap: 3,
                height: chartH + 22,
                width: '100%',
                justifyContent: 'center',
              }}>
                {bars.map((b) => {
                  const pct = large ? scorePercent(b.value, ex.maxScore) : null
                  const scoreLabel = large
                    ? (pct == null ? '—' : `${fmtScore(pct)}점`)
                    : (b.value == null ? '—' : fmtScore(b.value))
                  const scoreFont = layout
                    ? fitFontSize(scoreLabel, layout.colW, layout.scoreMax, 9)
                    : 10
                  const caption = layout ? barCaption(b.label, layout.labelMode) : ''
                  return (
                    <div
                      key={b.label}
                      title={large
                        ? `${b.label} ${pct == null ? '—' : `${fmtScore(pct)}점`}`
                        : `${b.label} ${b.value == null ? '—' : `${fmtScore(b.value)}점`}`}
                      style={{
                        width: large ? '100%' : 10,
                        minWidth: 0,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        overflow: 'hidden',
                      }}
                    >
                      {large && caption && (
                        <div style={{
                          fontSize: layout?.labelFont ?? 11,
                          fontWeight: 700,
                          color: b.color,
                          marginBottom: 4,
                          lineHeight: 1.15,
                          textAlign: 'center',
                          width: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {caption}
                        </div>
                      )}
                      {large && (
                        <div style={{
                          fontSize: scoreFont,
                          fontWeight: 800,
                          color: b.value == null ? 'var(--slate3)' : b.color,
                          marginBottom: 8,
                          lineHeight: 1.1,
                          textAlign: 'center',
                          width: '100%',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                        }}>
                          {scoreLabel}
                        </div>
                      )}
                      <div style={{
                        width: large ? layout?.barW : 10,
                        maxWidth: '100%',
                        height: barHeight(b.value, max, chartH),
                        background: b.value == null ? 'var(--bg3)' : b.color,
                        ...(large ? { border: '2px solid #7C3AED' } : {}),
                        borderRadius: large ? '8px 8px 0 0' : '3px 3px 1px 1px',
                        opacity: b.value == null ? 0.4 : 1,
                      }} />
                    </div>
                  )
                })}
              </div>
              {!large && (
                <div style={{
                  fontSize: 10,
                  color: 'var(--slate2)',
                  marginTop: 6,
                  textAlign: 'center',
                  width: '100%',
                  lineHeight: 1.35,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {ex.label}
                </div>
              )}
              {!large && ex.sub && (
                <div style={{
                  fontSize: 9,
                  color: 'var(--slate3)',
                  marginTop: 2,
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>{ex.sub}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function focusCell(col: number, row: number) {
  const el = document.querySelector<HTMLInputElement>(`[data-score-cell="${col}-${row}"]`)
  el?.focus()
  el?.select()
}

function TrendLine({
  points,
}: {
  points: { key: string; label: string; value: number | null; max?: number }[]
}) {
  if (points.length === 0) {
    return <div style={{ fontSize: 13, color: 'var(--slate3)', padding: '12px 0' }}>데이터가 없습니다.</div>
  }
  const w = Math.max(280, points.length * 56)
  const h = 140
  const pad = { t: 16, r: 12, b: 28, l: 28 }
  const max = Math.max(1, ...points.map((p) => p.max ?? p.value ?? 0), 100)
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  const xs = points.map((_, i) => pad.l + (points.length === 1 ? innerW / 2 : (i * innerW) / (points.length - 1)))
  const ys = points.map((p) => pad.t + innerH - ((p.value ?? 0) / max) * innerH)
  const taken = points.map((p, i) => ({ ...p, x: xs[i], y: ys[i] })).filter((p) => p.value != null)
  const d = taken.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ overflow: 'visible' }}>
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1={pad.l} x2={w - pad.r} y1={pad.t + innerH * (1 - t)} y2={pad.t + innerH * (1 - t)}
            stroke="#EFEDFF" strokeWidth={1} />
      ))}
      {d && <path d={d} fill="none" stroke="#6C63FF" strokeWidth={2.4} />}
      {taken.map((p) => (
        <circle key={p.key} cx={p.x} cy={p.y} r={4} fill="#6C63FF" />
      ))}
      {points.map((p, i) => (
        <text key={p.key} x={xs[i]} y={h - 8} textAnchor="middle" fontSize={10} fill="#9E9CB8">
          {p.label}
        </text>
      ))}
    </svg>
  )
}

export function ExamShell({ mode }: { mode: 'regular' | 'daily' }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const classes = useDataStore((s) => s.classes)
  const students = useDataStore((s) => s.students)
  const fetchStudentGrades = useDataStore((s) => s.fetchStudentGrades)
  const user = useAuthStore((s) => s.user)
  const isDirector = user?.role === 'admin'
  const { ref: toastRef, show: showToast } = useToast()

  const [mainTab, setMainTab] = useState<'exams' | 'stats'>('exams')
  const [view, setView] = useState<View>('list')
  const [examId, setExamId] = useState<number | null>(null)
  const [statsExamId, setStatsExamId] = useState<number | null>(null)
  const [studentId, setStudentId] = useState<number | null>(null)
  const [focusExamId, setFocusExamId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(ymd(new Date()))
  const [subject, setSubject] = useState('')
  const [maxScore, setMaxScore] = useState(100)
  const [classroomIds, setClassroomIds] = useState<number[]>([])
  const [presetCid, setPresetCid] = useState<number | null>(null)
  const [sectionDrafts, setSectionDrafts] = useState<SectionMetaDraft[]>([])
  const sectionKeyRef = useRef(1)
  const [editingExam, setEditingExam] = useState(false)
  const [scoreDraft, setScoreDraft] = useState<Record<number, ScoreDraft>>({})
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState<ExamStats | null>(null)
  const [history, setHistory] = useState<GradeHistory | null>(null)
  const [targetGrade, setTargetGrade] = useState('')
  const [scoreClassId, setScoreClassId] = useState<number | 'all'>('all')
  const [excelErrors, setExcelErrors] = useState<string[]>([])
  const [filterGrade, setFilterGrade] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterQ, setFilterQ] = useState('')
  const [period, setPeriod] = useState<PeriodPreset>('thisMonth')
  const [pageIdx, setPageIdx] = useState(0)
  const [dateDesc, setDateDesc] = useState(true)
  const [examList, setExamList] = useState<ExamItem[]>([])
  const [regularTotal, setRegularTotal] = useState(0)
  const [regularPages, setRegularPages] = useState(0)
  const [detailCache, setDetailCache] = useState<ExamItem | null>(null)
  const [dailyTab, setDailyTab] = useState<'calendar' | 'class'>(isDirector ? 'calendar' : 'class')
  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState(ymd(today))
  const [calendarDays, setCalendarDays] = useState<DailyCalendarDay[]>([])
  const [dailyClassId, setDailyClassId] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const statsCaptureRef = useRef<HTMLDivElement>(null)
  const studentTrendRef = useRef<HTMLDivElement>(null)
  const studentCompareRef = useRef<HTMLDivElement>(null)
  const studentExamBarsRef = useRef<HTMLDivElement>(null)
  const studentSubjectRef = useRef<HTMLDivElement>(null)
  const classAvgRef = useRef<HTMLDivElement>(null)
  const distRef = useRef<HTMLDivElement>(null)
  const rankingRef = useRef<HTMLDivElement>(null)

  const pageTitle = mode === 'regular' ? '정기고사/모의고사 관리' : '일일테스트 관리'
  const detail = examId != null
    ? (detailCache?.id === examId ? detailCache : examList.find((e) => e.id === examId) ?? null)
    : null

  const loadList = async () => {
    try {
      if (mode === 'regular') {
        const { from, to } = periodRange(period, filterFrom, filterTo)
        const page = await fetchRegularExams({
          grade: filterGrade || undefined,
          from: from || undefined,
          to: to || undefined,
          status: filterStatus || undefined,
          q: filterQ || undefined,
          page: pageIdx,
          size: 10,
          dateDesc,
        })
        setExamList(page.content)
        setRegularTotal(page.totalElements)
        setRegularPages(page.totalPages)
        return
      }
      if (dailyTab === 'calendar') {
        setCalendarDays(await fetchDailyCalendar(calYear, calMonth))
        setExamList(await fetchDailyExams({ from: selectedDate, to: selectedDate }))
        return
      }
      setExamList(await fetchDailyExams({ classroomId: dailyClassId ?? undefined }))
    } catch {
      showToast('시험 목록 조회에 실패했습니다.')
    }
  }

  useEffect(() => {
    const cidParam = searchParams.get('cid')
    const sidParam = searchParams.get('sid')
    if (cidParam) {
      setPresetCid(Number(cidParam))
      setDailyClassId(Number(cidParam))
      if (mode === 'daily') setDailyTab('class')
      setSearchParams({}, { replace: true })
    }
    if (sidParam) {
      setFocusExamId(null)
      setStudentId(Number(sidParam))
      setView('student')
    }
  }, [classes.length])

  useEffect(() => {
    if (mode !== 'daily' || dailyClassId != null || classes.length === 0) return
    const uid = Number(user?.id)
    const mine = classes.find((c) => c.teacherUserId === uid) ?? classes[0]
    setDailyClassId(mine.cid)
  }, [mode, classes, dailyClassId, user?.id])

  useEffect(() => {
    if (view !== 'list') return
    void loadList()
  }, [mode, view, filterGrade, filterStatus, filterQ, period, filterFrom, filterTo, pageIdx, dateDesc, dailyTab, calYear, calMonth, selectedDate, dailyClassId])

  useEffect(() => {
    if (mainTab !== 'stats' || mode !== 'regular') return
    const target = statsExamId ?? examList[0]?.id ?? null
    if (target == null) { setStats(null); return }
    if (statsExamId == null) setStatsExamId(target)
    void fetchRegularExamStats(target).then(setStats).catch(() => showToast('통계 조회에 실패했습니다.'))
  }, [mainTab, statsExamId, examList, mode])

  useEffect(() => {
    if (view !== 'student' || studentId == null) return
    void fetchStudentGrades(studentId).then(setHistory).catch(() => showToast('성적 조회에 실패했습니다.'))
  }, [view, studentId, fetchStudentGrades])

  const nextSectionKey = () => {
    const key = `sec-${sectionKeyRef.current}`
    sectionKeyRef.current += 1
    return key
  }

  const toggleClassroom = (cid: number) => {
    setClassroomIds((prev) => prev.includes(cid) ? prev.filter((id) => id !== cid) : [...prev, cid])
  }

  const openWrite = (exam?: ExamItem) => {
    if (exam) {
      setEditingExam(true)
      setExamId(exam.id)
      setTitle(exam.title)
      setDate(exam.date)
      setSubject(exam.subject ?? '')
      setMaxScore(exam.maxScore)
      setTargetGrade(exam.targetGrade ?? '')
      const savedIds = (exam.classrooms ?? []).map((c) => c.id)
      setClassroomIds(savedIds.length > 0 ? savedIds : (mode === 'regular' ? classes.map((c) => c.cid) : []))
      setSectionDrafts((exam.sections ?? []).map((s) => ({
        key: `id-${s.id}`,
        id: s.id,
        name: s.name,
        maxScore: String(s.maxScore),
        weight: String(s.weight && s.weight > 0 ? s.weight : s.maxScore),
      })))
    } else {
      setEditingExam(false)
      setExamId(null)
      setTitle('')
      setDate(ymd(new Date()))
      setSubject('')
      setMaxScore(100)
      setTargetGrade('')
      const initial = presetCid != null && classes.some((c) => c.cid === presetCid)
        ? [presetCid]
        : mode === 'regular'
          ? classes.map((c) => c.cid)
          : classes.length === 1 ? [classes[0].cid] : []
      setClassroomIds(initial)
      setSectionDrafts([])
    }
    setView('write')
  }

  const openExam = async (id: number) => {
    try {
      const exam = mode === 'regular' ? await fetchRegularExam(id) : await fetchDailyExam(id)
      setExamId(id)
      setDetailCache(exam)
      const draft: Record<number, ScoreDraft> = {}
      for (const row of exam.scores ?? []) {
        const sections: Record<number, SectionScoreDraft> = {}
        for (const ss of row.sectionScores ?? []) {
          const meta = (exam.sections ?? []).find((sec) => sec.id === ss.sectionId)
          const score = ss.score == null ? '' : String(ss.score)
          sections[ss.sectionId] = {
            score,
            percent: score === '' || !meta ? '' : calcPercent(score, meta.maxScore),
          }
        }
        const summed = (exam.sections ?? []).length > 0
          ? weightedSectionTotal(sections, exam.sections ?? [])
          : null
        draft[row.studentId] = {
          score: (exam.sections ?? []).length > 0
            ? (summed == null ? '' : String(Math.min(summed, exam.maxScore)))
            : (row.score == null ? '' : String(row.score)),
          comment: row.comment ?? '',
          sections,
        }
      }
      setScoreDraft(draft)
      const groups = [...new Set((exam.scores ?? []).map((r) => r.classroomId).filter((id): id is number => id != null))]
      setScoreClassId(exam.kind === 'ALL' ? 'all' : (groups[0] ?? 'all'))
      setExcelErrors([])
      setView('exam')
    } catch {
      showToast('시험 상세 조회에 실패했습니다.')
    }
  }

  const handleSaveMeta = async () => {
    const lockedKind: ExamKind = mode === 'regular' ? 'ALL' : 'CLASS'
    let examTitle = title.trim()
    if (!examTitle) {
      if (mode === 'daily') {
        const names = classes.filter((c) => classroomIds.includes(c.cid)).map((c) => c.name).join(' ')
        examTitle = `${date} ${names || ''} 테스트`.replace(/\s+/g, ' ').trim()
      } else {
        showToast('시험 제목을 입력하세요.')
        return
      }
    }
    if (classroomIds.length === 0) { showToast('대상 반을 선택하세요.'); return }
    const cleanedSections = sectionDrafts
      .map((s) => ({
        id: s.id,
        name: s.name.trim(),
        maxScore: Number(s.maxScore) || 0,
        weight: Number(s.weight) || 0,
      }))
      .filter((s) => s.name)
    if (cleanedSections.some((s) => s.maxScore < 1 || s.maxScore > 1000)) {
      showToast('과목 만점은 1~1000점 사이로 입력하세요.')
      return
    }
    if (cleanedSections.some((s) => s.weight < 0 || s.weight > 1000)) {
      showToast('과목 배점은 0~1000점 사이로 입력하세요.')
      return
    }
    const weightSum = cleanedSections.reduce((sum, s) => sum + (s.weight > 0 ? s.weight : s.maxScore), 0)
    const resolvedMax = cleanedSections.length > 0 ? weightSum : maxScore
    if (cleanedSections.length > 0 && resolvedMax < 1) {
      showToast('배점 합계가 1점 이상이어야 전체 만점이 됩니다.')
      return
    }
    const payload = {
      title: examTitle,
      date,
      subject,
      maxScore: resolvedMax,
      targetGrade: lockedKind === 'ALL' ? (targetGrade || null) : null,
      classroomIds,
      sections: cleanedSections,
    }
    try {
      setSaving(true)
      if (editingExam && examId != null) {
        const updated = mode === 'regular'
          ? await updateRegularExam(examId, payload)
          : await updateDailyExam(examId, payload)
        setDetailCache(updated)
        showToast('시험 정보가 수정되었습니다.')
        await openExam(examId)
      } else {
        const created = mode === 'regular'
          ? await createRegularExam(payload)
          : await createDailyExam(payload)
        showToast('시험이 등록되었습니다. 점수를 입력하세요.')
        await openExam(created.id)
      }
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } }
      alert(ax.response?.data?.message ?? '시험 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const examRoster = (exam: ExamItem): ExamScoreRow[] => {
    if (exam.scores && exam.scores.length > 0) return exam.scores
    return students
      .filter((s) => s.status !== '퇴원' && (
        exam.kind === 'ALL'
          ? ((!exam.targetGrade || s.grade === exam.targetGrade)
            && ((exam.classrooms ?? []).length === 0
              || (exam.classrooms ?? []).some((c) => studentInClass(s, { cid: c.id, name: c.name }))))
          : (exam.classrooms ?? []).some((c) => studentInClass(s, { cid: c.id, name: c.name }))
      ))
      .map((s) => ({
        studentId: s.sid,
        studentName: s.name,
        classroomId: s.classroomId,
        classroomName: s.cls,
        score: null,
        comment: '',
      }))
  }

  const handleSaveScores = async (saveMode: 'draft' | 'complete') => {
    if (examId == null || !detail) return
    const rosterAll = examRoster(detail)
    const classIds = [...new Set(rosterAll.map((r) => r.classroomId).filter((id): id is number => id != null))]
    const active = (detail.kind !== 'ALL' && scoreClassId === 'all' && classIds[0] != null)
      ? classIds[0]
      : scoreClassId
    const roster = rosterAll.filter((r) => active === 'all' || r.classroomId === active)
    if (roster.length === 0) {
      alert('저장할 학생이 없습니다. 대상 반에 재원 학생이 있는지 확인하세요.')
      return
    }
    try {
      const records = roster.map((r) => {
        const d = scoreDraft[r.studentId] ?? emptyScoreDraft()
        const hasSections = (detail.sections ?? []).length > 0
        let score: number | null = null
        if (!hasSections) {
          const raw = d.score.trim()
          score = raw === '' ? null : Number(raw)
          if (score != null && (Number.isNaN(score) || score < 0 || score > detail.maxScore)) {
            throw new Error(`${r.studentName}: 전체 점수는 0~${detail.maxScore}점 사이로 입력하세요.`)
          }
        }
        const sectionScores = (detail.sections ?? []).map((sec) => {
          const sd = d.sections[sec.id] ?? { score: '', percent: '' }
          const secScore = sd.score.trim() === '' ? null : Number(sd.score)
          if (secScore != null && (Number.isNaN(secScore) || secScore < 0 || secScore > sec.maxScore)) {
            throw new Error(`${r.studentName}: ${sec.name} 점수는 0~${sec.maxScore}점 사이로 입력하세요.`)
          }
          const secPercent = secScore == null ? null : Number(calcPercent(String(secScore), sec.maxScore))
          return { sectionId: sec.id, score: secScore, percent: secPercent }
        })
        if (hasSections) {
          const sum = weightedSectionTotal(d.sections, detail.sections ?? [])
          score = sum == null ? null : Math.min(sum, detail.maxScore)
        }
        return { studentId: r.studentId, score, comment: d.comment, sectionScores }
      })
      setSaving(true)
      const saved = mode === 'regular'
        ? await saveRegularExamScores(examId, records, {
            complete: saveMode === 'complete',
            classroomId: active === 'all' ? null : active,
          })
        : await saveDailyExamScores(examId, records, {
            complete: saveMode === 'complete',
            classroomId: active === 'all' ? null : active,
          })
      setDetailCache(saved)
      if (saveMode === 'complete') {
        showToast('입력을 완료했습니다.')
        setView('list')
        setMainTab('exams')
      } else {
        showToast('임시저장되었습니다. 나중에 이어서 입력할 수 있습니다.')
      }
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string }
      alert(ax.response?.data?.message ?? ax.message ?? '점수 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const applyExcelFile = async (file: File) => {
    if (!detail) return
    const buf = await file.arrayBuffer()
    const { records, errors } = parseExamScoreExcel(buf, detail, examRoster(detail))
    setExcelErrors(errors.map((e) => `${e.row}행: ${e.message}`))
    if (records.length === 0) {
      showToast('반영할 유효 행이 없습니다. 오류를 확인하세요.')
      return
    }
    setScoreDraft((prev) => {
      const next = { ...prev }
      for (const rec of records) {
        const sections: Record<number, SectionScoreDraft> = {}
        for (const ss of rec.sections) {
          const meta = (detail.sections ?? []).find((sec) => sec.id === ss.sectionId)
          const score = ss.score == null ? '' : String(ss.score)
          sections[ss.sectionId] = {
            score,
            percent: score === '' || !meta ? '' : calcPercent(score, meta.maxScore),
          }
        }
        const cur = next[rec.studentId] ?? emptyScoreDraft()
        const merged = { ...cur.sections, ...sections }
        const hasSections = (detail.sections ?? []).length > 0
        const sum = weightedSectionTotal(merged, detail.sections ?? [])
        next[rec.studentId] = {
          score: hasSections
            ? (sum == null ? '' : String(Math.min(sum, detail.maxScore)))
            : (rec.score == null ? cur.score : String(rec.score)),
          comment: rec.comment || cur.comment,
          sections: merged,
        }
      }
      return next
    })
    showToast(`${records.length}명 반영됨. 임시저장 또는 입력 완료를 누르세요.`)
  }

  if (classes.length === 0) {
    return (
      <>
        <TopBar title={pageTitle} sub="반을 먼저 등록해주세요" />
        <div className="page-content-body">
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--slate3)', fontSize: 13 }}>
            등록된 반이 없습니다.
          </div>
        </div>
      </>
    )
  }

  if (view === 'write') {
    return (
      <>
        <TopBar title={editingExam ? '시험 수정' : '시험 등록'} onBack={() => setView('list')} />
        <div className="page-content-body">
          <div className="sec">
            <label className="input-label" style={{ marginTop: 0 }}>
              {mode === 'regular' ? '시험 제목 *' : '시험 제목'}
            </label>
            <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={mode === 'regular' ? '예: 1학기 중간고사' : '비우면 날짜+반명으로 자동 생성'} maxLength={80} />
            <label className="input-label">시험일 *</label>
            <input className="input-field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <label className="input-label">시험 유형</label>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', margin: '6px 0 10px' }}>
              {mode === 'regular' ? '정기고사/모의고사' : '일일테스트'}
            </div>
            {mode === 'regular' ? (
              <>
                <label className="input-label">학년 / 과정</label>
                <select className="input-field" value={targetGrade} onChange={(e) => setTargetGrade(e.target.value)}>
                  <option value="">전학년</option>
                  {VALID_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <div style={{ fontSize: 12, color: 'var(--slate2)', margin: '6px 0 10px' }}>
                  학년을 고르면 해당 학년 학생만 포함됩니다. 아래에서 응시 반을 고르세요.
                </div>
                <ClassTargetPicker
                  classes={classes}
                  classroomIds={classroomIds}
                  onToggle={toggleClassroom}
                  onSelectAll={() => setClassroomIds(
                    classroomIds.length === classes.length ? [] : classes.map((c) => c.cid),
                  )}
                />
              </>
            ) : (
              <ClassTargetPicker
                classes={classes}
                classroomIds={classroomIds}
                onToggle={toggleClassroom}
                onSelectAll={() => setClassroomIds(
                  classroomIds.length === classes.length ? [] : classes.map((c) => c.cid),
                )}
              />
            )}
            <label className="input-label">과목 (선택)</label>
            <input className="input-field" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="예: 영어" />
            {sectionDrafts.some((s) => s.name.trim()) ? (
              <div style={{ margin: '4px 0 12px' }}>
                <div className="input-label" style={{ marginBottom: 4 }}>전체 만점</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)' }}>
                  {sectionDrafts.reduce((sum, s) => {
                    if (!s.name.trim()) return sum
                    const weight = Number(s.weight)
                    const max = Number(s.maxScore) || 0
                    return sum + (weight > 0 ? weight : max)
                  }, 0)}점
                </div>
                <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 4 }}>배점 합계로 자동 계산됩니다.</div>
              </div>
            ) : (
              <>
                <label className="input-label">전체 만점</label>
                <input className="input-field" type="number" min={1} max={1000} value={maxScore}
                  onChange={(e) => setMaxScore(Number(e.target.value) || 100)} />
                <div style={{ fontSize: 12, color: 'var(--slate2)', margin: '-4px 0 10px' }}>
                  과목을 추가하면 전체 만점은 배점 합계로 바뀝니다.
                </div>
              </>
            )}
            <label className="input-label">과목 구성</label>
            <div style={{ fontSize: 12, color: 'var(--slate2)', marginBottom: 8, lineHeight: 1.5 }}>
              독해·리딩·문법처럼 과목을 추가하면 만점과 배점을 따로 둘 수 있습니다. 배점이 비어 있으면 만점과 같게 계산됩니다.
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
                <thead>
                  <tr style={{ textAlign: 'left', fontSize: 11, color: 'var(--slate3)' }}>
                    <th style={{ padding: '6px 8px', fontWeight: 700 }}>과목명</th>
                    <th style={{ padding: '6px 8px', fontWeight: 700, width: 88 }}>만점</th>
                    <th style={{ padding: '6px 8px', fontWeight: 700, width: 88 }}>배점</th>
                    <th style={{ width: 56 }} />
                  </tr>
                </thead>
                <tbody>
                  {sectionDrafts.map((sec, idx) => (
                    <tr key={sec.key} style={{ borderTop: '1px solid var(--bg3)' }}>
                      <td style={{ padding: '6px 4px' }}>
                        <input
                          className="input-field"
                          style={{ margin: 0 }}
                          value={sec.name}
                          maxLength={40}
                          placeholder={`예: ${['독해', '리딩', '문법'][idx % 3]}`}
                          onChange={(e) => setSectionDrafts((prev) => prev.map((s) => s.key === sec.key ? { ...s, name: e.target.value } : s))}
                        />
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        <input
                          className="input-field"
                          style={{ margin: 0, textAlign: 'right' }}
                          type="number"
                          min={1}
                          max={1000}
                          value={sec.maxScore}
                          onChange={(e) => setSectionDrafts((prev) => prev.map((s) => s.key === sec.key ? { ...s, maxScore: e.target.value } : s))}
                        />
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        <input
                          className="input-field"
                          style={{ margin: 0, textAlign: 'right' }}
                          type="number"
                          min={0}
                          max={1000}
                          value={sec.weight}
                          onChange={(e) => setSectionDrafts((prev) => prev.map((s) => s.key === sec.key ? { ...s, weight: e.target.value } : s))}
                        />
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ width: 'auto', padding: '8px 10px', margin: 0 }}
                          onClick={() => setSectionDrafts((prev) => prev.filter((s) => s.key !== sec.key))}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sectionDrafts.length < 12 && (
              <button
                type="button"
                className="btn-secondary"
                style={{ marginTop: 8 }}
                onClick={() => setSectionDrafts((prev) => [...prev, { key: nextSectionKey(), name: '', maxScore: '100', weight: '100' }])}
              >
                + 과목 추가
              </button>
            )}
            {sectionDrafts.some((s) => s.name.trim()) && (
              <div style={{ fontSize: 12, color: 'var(--slate2)', margin: '8px 0 12px' }}>
                배점을 바꾸면 전체 만점도 같이 바뀝니다. 배점이 비어 있으면 그 과목 만점으로 합산됩니다.
              </div>
            )}
            <button className="btn-primary" disabled={saving} onClick={() => void handleSaveMeta()}>
              {saving ? '저장 중...' : editingExam ? '수정하고 점수 입력' : '등록하고 점수 입력'}
            </button>
            <button className="btn-secondary" onClick={() => setView('list')}>취소</button>
          </div>
        </div>
        <Toast toastRef={toastRef} />
      </>
    )
  }

  if (view === 'exam' && detail) {
    const rows = examRoster(detail)
    const classOptions = [...new Map(rows
      .filter((r) => r.classroomId != null)
      .map((r) => [r.classroomId as number, r.classroomName || '반'])).entries()]
    const isAll = detail.kind === 'ALL'
    const activeClassId = (!isAll && scoreClassId === 'all' && classOptions[0])
      ? classOptions[0][0]
      : scoreClassId
    const visible = rows.filter((r) => activeClassId === 'all' || r.classroomId === activeClassId)
    const sections = detail.sections ?? []
    const hasSections = sections.length > 0
    const commentCol = hasSections ? sections.length : 1
    const patchSection = (studentId: number, sec: ExamSection, score: string) => {
      setScoreDraft((prev) => {
        const cur = prev[studentId] ?? emptyScoreDraft()
        const nextSections = {
          ...cur.sections,
          [sec.id]: { score, percent: calcPercent(score, sec.maxScore) },
        }
        const sum = weightedSectionTotal(nextSections, sections)
        return {
          ...prev,
          [studentId]: {
            ...cur,
            score: sum == null ? '' : String(Math.min(sum, detail.maxScore)),
            sections: nextSections,
          },
        }
      })
    }
    return (
      <>
        <TopBar
          title={detail.title}
          sub={`${detail.date} · ${detail.kindLabel || (isAll ? '정기고사/모의고사' : '일일테스트')} · ${examTargetLabel(detail)} · 만점 ${detail.maxScore}점`}
          onBack={() => setView('list')}
        />
        <div className="page-content-body">
          <div className="sec">
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              {[
                { l: '응시', v: `${detail.participantCount ?? 0}명` },
                { l: '시험 평균', v: fmtScore(detail.average) },
                { l: '최고', v: fmtScore(detail.high) },
                { l: '최저', v: fmtScore(detail.low) },
              ].map((x) => (
                <div key={x.l} style={{ flex: 1, textAlign: 'center', background: 'var(--bg2)', borderRadius: 10, padding: '10px 4px' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>{x.v}</div>
                  <div style={{ fontSize: 11, color: 'var(--slate3)' }}>{x.l}</div>
                </div>
              ))}
            </div>
            {classOptions.length > 0 && (
              <>
                <label className="input-label" style={{ marginTop: 0 }}>입력할 반</label>
                <select
                  className="input-field"
                  value={activeClassId === 'all' ? 'all' : String(activeClassId)}
                  onChange={(e) => setScoreClassId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                >
                  {isAll && <option value="all">전체 학생</option>}
                  {classOptions.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>
              {isAll && (
                <div style={{ width: '100%', fontSize: 12, color: 'var(--slate2)' }}>
                  정기고사/모의고사는 엑셀로 일괄 입력하는 것을 권장합니다.
                </div>
              )}
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: 'auto', padding: '8px 12px' }}
                  onClick={() => downloadExamScoreTemplate(detail, rows, scoreDraft)}
                >
                  엑셀 템플릿 받기
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: 'auto', padding: '8px 12px' }}
                  onClick={() => fileRef.current?.click()}
                >
                  엑셀 업로드
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (f) void applyExcelFile(f)
                  }}
                />
              </div>
            {excelErrors.length > 0 && (
              <div className="card" style={{ padding: 12, marginBottom: 10, background: '#FEF2F2' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--err)', marginBottom: 6 }}>검증 오류 {excelErrors.length}건</div>
                {excelErrors.slice(0, 8).map((msg) => (
                  <div key={msg} style={{ fontSize: 12, color: 'var(--err)', lineHeight: 1.5 }}>{msg}</div>
                ))}
                {excelErrors.length > 8 && (
                  <div style={{ fontSize: 12, color: 'var(--slate3)' }}>외 {excelErrors.length - 8}건</div>
                )}
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--slate2)', margin: '8px 0' }}>
              {hasSections
                ? '영역 점수만 입력하면 백분율과 전체 점수가 자동 계산됩니다. Enter로 아래 칸으로 이동합니다.'
                : '점수만 입력하고 Enter로 아래 칸으로 이동합니다. 임시저장하면 중간에 나가도 유지됩니다.'}
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid var(--bg3)', borderRadius: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520, fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg2)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>학생</th>
                    <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>반</th>
                    <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                      전체 / {detail.maxScore}{hasSections ? ' · 자동' : ''}
                    </th>
                    {sections.map((sec) => (
                      <th key={sec.id} style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                        {sec.name} / {sec.maxScore}
                        {sectionWeightOf(sec) !== sec.maxScore ? ` · 배점 ${sectionWeightOf(sec)}` : ''}
                      </th>
                    ))}
                    <th style={{ padding: '8px 10px' }}>코멘트</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r, rowIdx) => {
                    const draft = scoreDraft[r.studentId] ?? emptyScoreDraft()
                    return (
                      <tr key={r.studentId} style={{ borderTop: '1px solid var(--bg3)' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 700, color: 'var(--navy)', whiteSpace: 'nowrap' }}>{r.studentName}</td>
                        <td style={{ padding: '6px 10px', color: 'var(--slate2)', whiteSpace: 'nowrap' }}>{r.classroomName || '—'}</td>
                        <td style={{ padding: '4px 6px' }}>
                          {hasSections ? (
                            <div style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy)', minWidth: 56, padding: '8px 4px' }}>
                              {draft.score === '' ? '—' : draft.score}
                            </div>
                          ) : (
                            <input
                              className="input-field"
                              data-score-cell={`0-${rowIdx}`}
                              style={{ margin: 0, textAlign: 'right', minWidth: 72 }}
                              inputMode="decimal"
                              placeholder="미응시"
                              value={draft.score}
                              onChange={(e) => setScoreDraft((prev) => ({
                                ...prev,
                                [r.studentId]: { ...(prev[r.studentId] ?? emptyScoreDraft()), score: e.target.value },
                              }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); focusCell(0, rowIdx + 1) } }}
                            />
                          )}
                        </td>
                        {sections.map((sec, si) => {
                          const sd = draft.sections[sec.id] ?? { score: '', percent: '' }
                          const pct = sd.score.trim() === '' ? '' : calcPercent(sd.score, sec.maxScore)
                          return (
                            <td key={sec.id} style={{ padding: '4px 6px' }}>
                              <input
                                className="input-field"
                                data-score-cell={`${si}-${rowIdx}`}
                                style={{ margin: 0, textAlign: 'right', minWidth: 72 }}
                                inputMode="decimal"
                                value={sd.score}
                                onChange={(e) => patchSection(r.studentId, sec, e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); focusCell(si, rowIdx + 1) } }}
                              />
                              <div style={{ fontSize: 11, color: 'var(--slate3)', textAlign: 'right', marginTop: 2, minHeight: 14 }}>
                                {pct === '' ? '' : `${pct}%`}
                              </div>
                            </td>
                          )
                        })}
                        <td style={{ padding: '4px 6px' }}>
                          <input
                            className="input-field"
                            data-score-cell={`${commentCol}-${rowIdx}`}
                            style={{ margin: 0, minWidth: 120 }}
                            placeholder="선택"
                            value={draft.comment}
                            onChange={(e) => setScoreDraft((prev) => ({
                              ...prev,
                              [r.studentId]: { ...(prev[r.studentId] ?? emptyScoreDraft()), comment: e.target.value },
                            }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); focusCell(commentCol, rowIdx + 1) } }}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {visible.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--slate3)', padding: '16px 0', textAlign: 'center' }}>표시할 학생이 없습니다.</div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn-secondary" disabled={saving} onClick={() => void handleSaveScores('draft')}>
                {saving ? '저장 중...' : '임시저장'}
              </button>
              <button className="btn-primary" disabled={saving} onClick={() => void handleSaveScores('complete')}>
                {saving ? '저장 중...' : '입력 완료'}
              </button>
            </div>
            <button className="btn-secondary" onClick={() => openWrite(detail)}>시험 정보 수정</button>
            {mode === 'regular' && detail.status === 'COMPLETE' && !detail.closed && (
              <button className="btn-secondary" onClick={() => {
                void closeRegularExam(detail.id).then((updated) => {
                  setDetailCache(updated)
                  showToast('시험을 마감했습니다.')
                  setView('list')
                })
              }}>마감</button>
            )}
            <button
              className="btn-danger"
              onClick={() => {
                if (!window.confirm('이 시험을 삭제하시겠습니까? 점수도 함께 삭제됩니다.')) return
                void (mode === 'regular' ? deleteRegularExam(detail.id) : deleteDailyExam(detail.id)).then(() => {
                  setView('list')
                  showToast('삭제되었습니다.')
                })
              }}
            >
              시험 삭제
            </button>
          </div>
        </div>
        <Toast toastRef={toastRef} />
      </>
    )
  }

  if (view === 'student') {
    if (!history) {
      return (
        <>
          <TopBar title="학생 성적" onBack={() => setView('list')} />
          <div className="page-content-body">
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--slate3)', fontSize: 13 }}>불러오는 중...</div>
          </div>
        </>
      )
    }
    const chrono = [...history.items].slice().reverse()
    const shown = focusExamId != null
      ? history.items.find((it) => it.examId === focusExamId) ?? null
      : history.items[0] ?? null
    const shownTitle = shown?.title
      ?? (stats?.examId === focusExamId ? stats.title : '')
    const shownMax = shown?.maxScore ?? 100
    const dlt = deltaLabel(shown?.delta)
    return (
      <>
        <TopBar title={`${history.studentName} 성적`} sub={history.classroomName} onBack={() => setView('list')} />
        <Breadcrumb items={[
          { label: pageTitle, onClick: () => setView('list') },
          { label: history.studentName },
        ]} />
        <div className="page-content-body">
          <div className="sec">
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, textAlign: 'center', background: 'var(--bg2)', borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#64748B' }}>{shown?.examAvg == null ? '—' : `${fmtScore(shown.examAvg)}점`}</div>
                <div style={{ fontSize: 11, color: 'var(--slate2)' }}>전체평균</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', background: 'var(--acc2)', borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--acc)' }}>{shown?.classAvg == null ? '—' : `${fmtScore(shown.classAvg)}점`}</div>
                <div style={{ fontSize: 11, color: 'var(--slate2)' }}>내가 속한 반평균</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', background: 'var(--bg2)', borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ok)' }}>{shown?.score == null ? '—' : `${fmtScore(shown.score)}점`}</div>
                <div style={{ fontSize: 11, color: 'var(--slate2)' }}>내 점수</div>
                {dlt && <div style={{ fontSize: 11, fontWeight: 700, color: dlt.color, marginTop: 4 }}>{dlt.text}</div>}
              </div>
            </div>
          </div>
          <div className="sec" ref={studentTrendRef}>
            <SecHead
              title="회차별 추이"
              getTarget={() => studentTrendRef.current}
              filename={`${history.studentName}_회차별추이`}
              onError={showToast}
            />
            <div className="card" style={{ padding: 14 }}>
              <TrendLine points={chrono.map((it) => ({
                key: String(it.examId),
                label: it.date.slice(5),
                value: it.score,
                max: it.maxScore,
              }))} />
            </div>
          </div>
          <div className="sec" ref={studentCompareRef}>
            <SecHead
              title="점수 비교"
              getTarget={() => studentCompareRef.current}
              filename={`${history.studentName}_점수비교`}
              onError={showToast}
            />
            <div className="card" style={{ padding: '20px 16px 16px', overflow: 'visible' }}>
              <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                {shownTitle && (
                  <div data-capture-text="" style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.6, color: 'var(--navy)' }}>{shownTitle}</div>
                )}
                <div data-capture-text="" style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.6, color: 'var(--navy)', marginTop: shownTitle ? 6 : 0 }}>
                  {[shown?.classroomName || history.classroomName, history.studentName].filter(Boolean).join(' · ') || history.studentName}
                </div>
                <div data-capture-text="" style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.6, color: 'var(--slate)', marginTop: 6 }}>
                  {shown?.rank != null && shown?.rankedCount != null
                    ? `전체 ${shown.rankedCount}명 중 ${shown.rank}등`
                    : '전체 등수 —'}
                  {' · '}
                  {shown?.classRank != null && shown?.classRankedCount != null
                    ? `해당 반 ${shown.classRankedCount}명 중 ${shown.classRank}등`
                    : '해당 반 등수 —'}
                </div>
              </div>
              <ThreeScoreBars
                examAvg={shown?.examAvg ?? null}
                classAvg={shown?.classAvg ?? null}
                myScore={shown?.score ?? null}
                maxScore={shownMax}
              />
            </div>
          </div>
          {(shown?.sectionScores?.length ?? 0) > 0 && (
            <div className="sec" ref={studentSubjectRef}>
              <SecHead
                title="과목별 점수 비교"
                getTarget={() => studentSubjectRef.current}
                filename={`${history.studentName}_과목별점수비교`}
                onError={showToast}
              />
                <div className="card" style={{ padding: '20px 16px 16px', overflow: 'visible' }}>
                <div style={{ marginBottom: 10 }}>
                  {shownTitle && (
                    <div data-capture-text="" style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.6, color: 'var(--navy)' }}>{shownTitle}</div>
                  )}
                  <div data-capture-text="" style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.6, color: 'var(--navy)', marginTop: shownTitle ? 4 : 0 }}>
                    {[shown?.classroomName || history.classroomName, history.studentName].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <ExamCompareBars
                  size="large"
                  exams={(shown?.sectionScores ?? []).map((sec) => ({
                    key: String(sec.sectionId),
                    label: sec.name,
                    sub: sec.score == null
                      ? `만점 ${fmtScore(sec.maxScore)}점`
                      : `${fmtScore(sec.score)}/${fmtScore(sec.maxScore)} - ${fmtScore(scorePercent(sec.score, sec.maxScore))}점`,
                    myScore: sec.score,
                    examAvg: sec.examAvg ?? null,
                    classAvg: sec.classAvg ?? null,
                    maxScore: sec.maxScore,
                    rank: sec.rank ?? null,
                    rankedCount: sec.rankedCount ?? null,
                    classRank: sec.classRank ?? null,
                    classRankedCount: sec.classRankedCount ?? null,
                  }))}
                />
              </div>
            </div>
          )}
          <div className="sec" ref={studentExamBarsRef}>
            <SecHead
              title="시험별 비교"
              getTarget={() => studentExamBarsRef.current}
              filename={`${history.studentName}_시험별비교`}
              onError={showToast}
            />
            <div className="card" style={{ padding: 14 }}>
              <ExamCompareBars
                exams={chrono.map((it) => ({
                  key: String(it.examId),
                  label: it.date.slice(5),
                  sub: it.title.length > 6 ? `${it.title.slice(0, 6)}…` : it.title,
                  myScore: it.score,
                  examAvg: it.examAvg ?? null,
                  classAvg: it.classAvg ?? null,
                  maxScore: it.maxScore,
                }))}
              />
            </div>
          </div>
          <div className="sec">
            <div className="sec-title">시험별 성적</div>
            {history.items.length === 0 && (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate3)', fontSize: 13 }}>아직 성적이 없습니다.</div>
            )}
            {history.items.map((it) => {
              const dd = deltaLabel(it.delta)
              return (
                <div key={it.examId} className="card" style={{ padding: '13px 16px', marginBottom: 8, cursor: 'pointer' }}
                  onClick={() => { void openExam(it.examId) }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{it.title}</span>
                        {it.kindLabel && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
                            ...kindBadgeStyle(it.kind),
                          }}>{it.kindLabel}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--slate3)', marginTop: 3 }}>{it.date}{it.subject ? ` · ${it.subject}` : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)' }}>
                        {fmtScore(it.score)}<span style={{ fontSize: 11, color: 'var(--slate3)', fontWeight: 600 }}>/{it.maxScore}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--slate2)' }}>
                        {it.rank != null ? `${it.rank}등 / ${it.rankedCount}명` : '미응시'}
                        {it.examAvg != null ? ` · 전체평균 ${fmtScore(it.examAvg)}` : ''}
                        {it.classAvg != null ? ` · 반평균 ${fmtScore(it.classAvg)}` : ''}
                      </div>
                      {dd && <div style={{ fontSize: 11, fontWeight: 700, color: dd.color }}>{dd.text}</div>}
                    </div>
                  </div>
                  <SectionChips sections={it.sectionScores} />
                </div>
              )
            })}
          </div>
        </div>
        <Toast toastRef={toastRef} />
      </>
    )
  }

  return (
    <>
      <TopBar title={pageTitle} sub={mode === 'regular' ? `${regularTotal}건` : `${examList.length}건`} />
      {mode === 'regular' && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 16px 0' }}>
          <button className={mainTab === 'exams' ? 'btn-primary' : 'btn-secondary'} style={{ flex: 1 }} onClick={() => setMainTab('exams')}>목록</button>
          <button className={mainTab === 'stats' ? 'btn-primary' : 'btn-secondary'} style={{ flex: 1 }} onClick={() => setMainTab('stats')}>통계</button>
        </div>
      )}

      <div className="page-content-body">
        {(mode === 'daily' || mainTab === 'exams') && (
          mode === 'regular' ? (
            <RegularExamList
              exams={examList}
              total={regularTotal}
              page={pageIdx}
              totalPages={regularPages}
              grade={filterGrade}
              period={period}
              customFrom={filterFrom}
              customTo={filterTo}
              status={filterStatus}
              q={filterQ}
              dateDesc={dateDesc}
              onGrade={(v) => { setPageIdx(0); setFilterGrade(v) }}
              onPeriod={(v) => { setPageIdx(0); setPeriod(v) }}
              onCustomFrom={(v) => { setPageIdx(0); setFilterFrom(v) }}
              onCustomTo={(v) => { setPageIdx(0); setFilterTo(v) }}
              onStatus={(v) => { setPageIdx(0); setFilterStatus(v) }}
              onQuery={(v) => { setPageIdx(0); setFilterQ(v) }}
              onToggleDateSort={() => { setPageIdx(0); setDateDesc((d) => !d) }}
              onOpen={(id) => void openExam(id)}
              onAction={(ex) => {
                if (ex.status === 'COMPLETE' || ex.status === 'CLOSED') {
                  setStatsExamId(ex.id)
                  setMainTab('stats')
                } else {
                  void openExam(ex.id)
                }
              }}
              onPage={setPageIdx}
            />
          ) : (
            <DailyExamBoard
              viewTab={dailyTab}
              onViewTab={setDailyTab}
              year={calYear}
              month={calMonth}
              selectedDate={selectedDate}
              calendarDays={calendarDays}
              onPrevMonth={() => {
                if (calMonth === 1) { setCalYear((y) => y - 1); setCalMonth(12) }
                else setCalMonth((m) => m - 1)
              }}
              onNextMonth={() => {
                if (calMonth === 12) { setCalYear((y) => y + 1); setCalMonth(1) }
                else setCalMonth((m) => m + 1)
              }}
              onSelectDate={setSelectedDate}
              classes={classes}
              classId={dailyClassId}
              onSelectClass={setDailyClassId}
              exams={examList}
              onOpen={(id) => void openExam(id)}
            />
          )
        )}

        {mode === 'regular' && mainTab === 'stats' && (
          <>
            <div className="sec">
              <div className="sec-title">시험 선택</div>
              {examList.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--slate3)', padding: '12px 0' }}>등록된 시험이 없습니다.</div>
              )}
              <div className="chip-row">
                {examList.map((ex) => (
                  <div
                    key={ex.id}
                    className={`chip${(statsExamId ?? examList[0]?.id) === ex.id ? ' active' : ''}`}
                    onClick={() => setStatsExamId(ex.id)}
                  >
                    {ex.title}
                  </div>
                ))}
              </div>
            </div>
            {stats && (
              <>
                <div className="sec" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <ImageSaveButton
                    getTarget={() => statsCaptureRef.current}
                    filename={`${stats.title}_통계`}
                    onError={showToast}
                    label="전체 통계 이미지 저장"
                  />
                </div>
                <div ref={statsCaptureRef}>
                <div className="sec">
                  <div style={{ background: 'var(--acc2)', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--acc)', marginBottom: 10 }}>{stats.title} 통계</div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {[
                        { l: '응시', v: `${stats.participantCount ?? 0}/${stats.totalStudents ?? 0}명` },
                        { l: '평균', v: fmtScore(stats.average) },
                        { l: '최고', v: fmtScore(stats.high) },
                        { l: '최저', v: fmtScore(stats.low) },
                      ].map((x) => (
                        <div key={x.l} style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)' }}>{x.v}</div>
                          <div style={{ fontSize: 11, color: 'var(--slate2)' }}>{x.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {(stats.classrooms?.length ?? 0) > 0 && (
                  <div className="sec" ref={classAvgRef}>
                    <SecHead
                      title="반별 평균 · 최고/최저"
                      getTarget={() => classAvgRef.current}
                      filename={`${stats.title}_반별평균`}
                      onError={showToast}
                    />
                    <div className="card" style={{ padding: 14 }}>
                      <ScoreBars points={stats.classrooms.map((c) => ({
                        key: String(c.classroomId),
                        label: c.classroomName,
                        value: c.average ?? null,
                        max: stats.maxScore || 100,
                        sub: `${fmtScore(c.low)}~${fmtScore(c.high)}`,
                      }))} />
                    </div>
                    {stats.classrooms.map((c) => (
                      <div key={c.classroomId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 2px', color: 'var(--slate2)' }}>
                        <span>{c.classroomName}</span>
                        <span>평균 {fmtScore(c.average)} · 최고 {fmtScore(c.high)} · 최저 {fmtScore(c.low)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(stats.distribution?.length ?? 0) > 0 && (
                  <div className="sec" ref={distRef}>
                    <SecHead
                      title="성적 분포"
                      getTarget={() => distRef.current}
                      filename={`${stats.title}_성적분포`}
                      onError={showToast}
                    />
                    <div className="card" style={{ padding: 14 }}>
                      <ScoreBars points={stats.distribution!.map((b) => ({
                        key: b.label,
                        label: b.label,
                        value: b.count,
                        max: Math.max(1, ...stats.distribution!.map((x) => x.count)),
                        sub: `${b.count}명`,
                      }))} />
                    </div>
                  </div>
                )}
                <div className="sec" ref={rankingRef}>
                  <SecHead
                    title="학생별 순위"
                    getTarget={() => rankingRef.current}
                    filename={`${stats.title}_학생순위`}
                    onError={showToast}
                  />
                  <div data-skip-capture="" style={{ fontSize: 12, color: 'var(--slate2)', marginBottom: 8 }}>학생을 누르면 회차별 꺾은선 그래프를 볼 수 있습니다.</div>
                  {(stats.ranking ?? []).map((r) => (
                    <div key={r.studentId} className="card" style={{ padding: '12px 14px', marginBottom: 8, cursor: 'pointer' }}
                      onClick={() => {
                        setHistory(null)
                        setFocusExamId(stats.examId ?? statsExamId)
                        setStudentId(r.studentId)
                        setView('student')
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, background: 'var(--acc2)', color: 'var(--acc)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13,
                        }}>
                          {r.rank ?? '—'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{r.studentName}</div>
                          <div style={{ fontSize: 11, color: 'var(--slate3)' }}>
                            {r.classroomName || ''}{r.score == null ? ' · 미응시' : ''}
                          </div>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>{fmtScore(r.score)}</div>
                      </div>
                    </div>
                  ))}
                </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
      {(mode === 'daily' || mainTab === 'exams') && <Fab onClick={() => openWrite()} />}
      <Toast toastRef={toastRef} />
    </>
  )
}
