// src/pages/attend/AttendStatsPage.tsx
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TopBar, Breadcrumb, TabBar, ProgBar } from '../../components/common'
import { useDataStore } from '../../store/dataStore'
import type { AttendStatus } from '../../types'

const STATUS_COLOR: Record<AttendStatus, string> = {
  출석: 'var(--ok)', 지각: 'var(--warn)', 조퇴: 'var(--warn)',
  결석: 'var(--err)', 공결: 'var(--slate3)',
}
const STATUS_BG: Record<AttendStatus, string> = {
  출석: 'var(--ok2)', 지각: 'var(--warn2)', 조퇴: 'var(--warn2)',
  결석: 'var(--err2)', 공결: 'var(--bg3)',
}
const STATUS_TC: Record<AttendStatus, string> = {
  출석: '#027A48', 지각: '#B54708', 조퇴: '#B54708',
  결석: '#B42318', 공결: 'var(--slate2)',
}

export default function AttendStatsPage() {
  const { cid } = useParams<{ cid: string }>()
  const navigate = useNavigate()
  const classes = useDataStore((s) => s.classes)
  const parents = useDataStore((s) => s.parents)
  const attendSheets = useDataStore((s) => s.attendSheets)
  const [period, setPeriod] = useState<'month' | 'all'>('month')
  const [sortBy, setSortBy] = useState<'name' | 'rate'>('name')

  const cls = classes.find((c) => c.cid === Number(cid))
  const allStudents = parents.flatMap((p) =>
    p.students.map((s) => ({ ...s, pname: p.name, pcol: p.col, ptc: p.tc }))
  )
  const stuInClass = allStudents.filter((s) => s.cls === cls?.name)
  const today = new Date()
  const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  const sheets = attendSheets
    .filter((sh) => sh.cid === Number(cid))
    .filter((sh) => period === 'month' ? sh.date.startsWith(ym) : true)

  if (!cls) return <div className="sec">반 정보를 찾을 수 없습니다.</div>

  const stuStats = stuInClass.map((stu) => {
    const totalSessions = sheets.length
    const present  = sheets.filter((sh) => sh.records.find((r) => r.sid === stu.sid && r.status === '출석')).length
    const late     = sheets.filter((sh) => sh.records.find((r) => r.sid === stu.sid && (r.status === '지각' || r.status === '조퇴'))).length
    const absent   = sheets.filter((sh) => sh.records.find((r) => r.sid === stu.sid && r.status === '결석')).length
    const excused  = sheets.filter((sh) => sh.records.find((r) => r.sid === stu.sid && r.status === '공결')).length
    const noRecord = totalSessions - present - late - absent - excused
    const rate = totalSessions > 0 ? Math.round((present / totalSessions) * 100) : 0
    return { ...stu, totalSessions, present, late, absent, excused, noRecord, rate }
  })

  const sorted = [...stuStats].sort((a, b) =>
    sortBy === 'name' ? a.name.localeCompare(b.name) : b.rate - a.rate
  )

  const avgRate = stuStats.length > 0
    ? Math.round(stuStats.reduce((a, s) => a + s.rate, 0) / stuStats.length)
    : 0

  const recentSheets = [...sheets]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)
    .reverse()

  const DAY = ['일','월','화','수','목','금','토']

  return (
    <>
      <TopBar
        title="출석 통계"
        sub={`${cls.name} · ${cls.subject}`}
        onBack={() => navigate('/attend')}
      />
      <Breadcrumb items={[
        { label: '출석 관리', onClick: () => navigate('/attend') },
        { label: `${cls.name} 통계` },
      ]} />
      <TabBar
        tabs={['이번달', '전체 기간']}
        active={period === 'month' ? 0 : 1}
        onChange={(i) => setPeriod(i === 0 ? 'month' : 'all')}
      />

      {/* ── 콘텐츠 ── */}
      <div className="page-content-body">

        {/* 전체 요약 */}
        <div className="sec">
          <div style={{ background: cls.color, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: cls.textColor, marginBottom: 10 }}>
              {period === 'month' ? `${today.getMonth() + 1}월` : '전체'} 출석 현황 — {sheets.length}회 수업
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { label: '평균 출석률', value: `${avgRate}%` },
                { label: '등록 학생',   value: `${stuInClass.length}명` },
                { label: '수업 횟수',   value: `${sheets.length}회` },
              ].map(({ label, value }) => (
                <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: cls.textColor }}>{value}</div>
                  <div style={{ fontSize: 11, color: cls.textColor, opacity: 0.7 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 최근 수업별 출석률 */}
        {recentSheets.length > 0 && (
          <div className="sec">
            <div className="sec-title">최근 수업별 출석률</div>
            <div className="card" style={{ padding: '14px 16px' }}>
              {recentSheets.map((sh) => {
                const presentN = sh.records.filter((r) => r.status === '출석').length
                const totalN = stuInClass.length
                const pct = totalN > 0 ? Math.round((presentN / totalN) * 100) : 0
                const dObj = new Date(sh.date)
                return (
                  <div key={sh.id} style={{ marginBottom: 10, cursor: 'pointer' }}
                    onClick={() => navigate(`/attend/${cls.cid}/${sh.date}`)}>
                    <div className="row" style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--slate2)' }}>
                        {sh.date.slice(5).replace('-', '/')} ({DAY[dObj.getDay()]})
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: pct >= 80 ? 'var(--ok)' : 'var(--warn)' }}>
                        {presentN}/{totalN}명 {pct}%
                      </span>
                    </div>
                    <ProgBar pct={pct} color={pct >= 80 ? 'var(--ok)' : pct >= 60 ? 'var(--warn)' : 'var(--err)'} />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 학생별 통계 */}
        <div className="sec">
          <div className="row" style={{ marginBottom: 10 }}>
            <span className="sec-title" style={{ marginBottom: 0 }}>학생별 출석 현황</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['이름순', 'name'], ['출석률순', 'rate']].map(([label, key]) => (
                <button key={key} onClick={() => setSortBy(key as 'name' | 'rate')}
                  style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 20,
                    background: sortBy === key ? 'var(--acc)' : 'var(--bg2)',
                    color: sortBy === key ? '#fff' : 'var(--slate2)',
                    border: `1px solid ${sortBy === key ? 'var(--acc)' : 'var(--border)'}`,
                    cursor: 'pointer',
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {sheets.length === 0 && (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--slate3)', fontSize: 13 }}>
              {period === 'month' ? '이번달' : '전체 기간'} 출석 기록이 없습니다.
            </div>
          )}

          {sorted.map((stu) => (
            <div key={stu.sid} className="card" style={{ marginBottom: 8 }}>
              <div style={{ padding: '13px 14px' }}>
                {/* 이름 + 출석률 */}
                <div className="row" style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar" style={{ background: stu.pcol, color: stu.ptc, width: 34, height: 34, fontSize: 13 }}>
                      {stu.name[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{stu.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--slate2)', marginTop: 1 }}>{stu.grade} · {stu.pname}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: stu.rate >= 80 ? 'var(--ok)' : stu.rate >= 60 ? 'var(--warn)' : 'var(--err)' }}>
                      {stu.rate}%
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--slate3)' }}>{stu.present}/{stu.totalSessions}회</div>
                  </div>
                </div>

                {/* 출석 비율 바 */}
                <div style={{ display: 'flex', gap: 2, height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                  {stu.present  > 0 && <div style={{ flex: stu.present,  background: 'var(--ok)'     }} />}
                  {stu.late     > 0 && <div style={{ flex: stu.late,     background: 'var(--warn)'   }} />}
                  {stu.absent   > 0 && <div style={{ flex: stu.absent,   background: 'var(--err)'    }} />}
                  {stu.excused  > 0 && <div style={{ flex: stu.excused,  background: 'var(--slate3)' }} />}
                  {stu.noRecord > 0 && <div style={{ flex: stu.noRecord, background: 'var(--bg3)'    }} />}
                </div>

                {/* 상세 수치 뱃지 */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {([
                    { label: '출석', cnt: stu.present  },
                    { label: '지각', cnt: stu.late     },
                    { label: '결석', cnt: stu.absent   },
                    { label: '공결', cnt: stu.excused  },
                  ] as { label: AttendStatus; cnt: number }[]).map(({ label, cnt }) => (
                    <div key={label} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: STATUS_BG[label], borderRadius: 6, padding: '3px 8px',
                    }}>
                      <span style={{ fontSize: 11, color: STATUS_TC[label] }}>{label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_TC[label] }}>{cnt}</span>
                    </div>
                  ))}
                  {stu.absent >= 3 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: 'var(--err2)', borderRadius: 6, padding: '3px 8px',
                      border: '1px solid var(--err)',
                    }}>
                      <span style={{ fontSize: 11, color: 'var(--err)', fontWeight: 700 }}>⚠ 결석 주의</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>{/* /page-content-body */}
    </>
  )
}
