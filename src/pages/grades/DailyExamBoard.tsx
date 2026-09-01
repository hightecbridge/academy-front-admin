import type { ClassRoom, ExamItem } from '../../types'
import type { DailyCalendarDay } from '../../api/dailyExams'

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

function ymd(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function DailyProgress({ exam }: { exam: ExamItem }) {
  const entered = exam.enteredCount ?? exam.participantCount ?? 0
  const total = exam.totalStudents ?? 0
  const incomplete = total > 0 && entered < total
  const pct = total <= 0 ? 0 : Math.min(100, Math.round((entered / total) * 100))
  return (
    <div style={{ minWidth: 110 }}>
      <div style={{ height: 7, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: incomplete ? 'var(--warn)' : 'var(--ok)' }} />
      </div>
      <div style={{ fontSize: 11, fontWeight: incomplete ? 800 : 600, color: incomplete ? 'var(--warn)' : 'var(--slate2)', marginTop: 3 }}>
        {entered}/{total}명 입력
      </div>
    </div>
  )
}

export function DailyExamBoard({
  viewTab,
  onViewTab,
  year,
  month,
  selectedDate,
  calendarDays,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
  classes,
  classId,
  onSelectClass,
  exams,
  onOpen,
}: {
  viewTab: 'calendar' | 'class'
  onViewTab: (v: 'calendar' | 'class') => void
  year: number
  month: number
  selectedDate: string
  calendarDays: DailyCalendarDay[]
  onPrevMonth: () => void
  onNextMonth: () => void
  onSelectDate: (date: string) => void
  classes: ClassRoom[]
  classId: number | null
  onSelectClass: (id: number) => void
  exams: ExamItem[]
  onOpen: (id: number) => void
}) {
  const first = new Date(year, month - 1, 1)
  const firstDow = first.getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const countByDate = new Map(calendarDays.map((d) => [d.date, d.count]))
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <div className="sec">
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className={viewTab === 'calendar' ? 'btn-primary' : 'btn-secondary'} style={{ flex: 1 }} onClick={() => onViewTab('calendar')}>캘린더</button>
        <button className={viewTab === 'class' ? 'btn-primary' : 'btn-secondary'} style={{ flex: 1 }} onClick={() => onViewTab('class')}>반별</button>
      </div>

      {viewTab === 'calendar' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button className="icon-btn" type="button" onClick={onPrevMonth}>
              <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>{year}년 {month}월</div>
            <button className="icon-btn" type="button" onClick={onNextMonth}>
              <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
            {DAY_NAMES.map((d, i) => (
              <div key={d} style={{
                textAlign: 'center', fontSize: 11, fontWeight: 600, padding: '4px 0',
                color: i === 0 ? 'var(--err)' : i === 6 ? 'var(--acc)' : 'var(--slate2)',
              }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 12 }}>
            {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const ds = ymd(year, month, day)
              const count = countByDate.get(ds) ?? 0
              const selected = ds === selectedDate
              const isToday = ds === todayStr
              return (
                <div
                  key={ds}
                  onClick={() => onSelectDate(ds)}
                  style={{
                    minHeight: 52, padding: '4px 2px', borderRadius: 8, cursor: 'pointer',
                    background: selected ? 'var(--navy)' : isToday ? 'var(--acc2)' : 'transparent',
                    border: isToday && !selected ? '1.5px solid var(--acc)' : '1.5px solid transparent',
                    textAlign: 'center',
                  }}
                >
                  <div style={{
                    fontSize: 12, fontWeight: 700,
                    color: selected ? '#fff' : isToday ? 'var(--acc)' : 'var(--navy)',
                  }}>{day}</div>
                  {count > 0 && (
                    <div style={{
                      margin: '4px auto 0', minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
                      background: selected ? '#fff' : 'var(--acc)',
                      color: selected ? 'var(--navy)' : '#fff',
                      fontSize: 10, fontWeight: 800, lineHeight: '16px', display: 'inline-block',
                    }}>{count}</div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="sec-title">{selectedDate} 테스트</div>
        </>
      )}

      {viewTab === 'class' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(112px, 140px) 1fr', gap: 12, alignItems: 'start' }}>
          <div>
            <div className="sec-title" style={{ marginTop: 0 }}>반</div>
            {classes.map((c) => (
              <div
                key={c.cid}
                className={`chip${classId === c.cid ? ' active' : ''}`}
                style={{ display: 'block', marginBottom: 6, textAlign: 'center' }}
                onClick={() => onSelectClass(c.cid)}
              >
                {c.name}
              </div>
            ))}
            {classes.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--slate3)' }}>담당 반이 없습니다.</div>
            )}
          </div>
          <div>
            <div className="sec-title" style={{ marginTop: 0 }}>테스트 이력</div>
            {exams.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--slate3)', padding: '16px 0' }}>이 반의 일일테스트가 없습니다.</div>
            )}
            {exams.map((ex) => (
              <DailyExamCard key={ex.id} exam={ex} onOpen={onOpen} />
            ))}
          </div>
        </div>
      )}

      {viewTab === 'calendar' && (
        <>
          {exams.length === 0 && (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--slate3)', fontSize: 13 }}>
              이 날짜에 진행된 일일테스트가 없습니다.
            </div>
          )}
          {exams.map((ex) => (
            <DailyExamCard key={ex.id} exam={ex} onOpen={onOpen} />
          ))}
        </>
      )}
    </div>
  )
}

function DailyExamCard({ exam, onOpen }: { exam: ExamItem; onOpen: (id: number) => void }) {
  return (
    <div className="card" style={{ padding: '13px 14px', marginBottom: 8, cursor: 'pointer' }}
      onClick={() => onOpen(exam.id)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{exam.title}</div>
          <div style={{ fontSize: 11, color: 'var(--slate3)', marginTop: 4 }}>
            {exam.date} · {exam.subject || exam.subjectSummary || '과목'} · {exam.targetLabel || exam.classroomName}
          </div>
        </div>
        <DailyProgress exam={exam} />
      </div>
    </div>
  )
}
