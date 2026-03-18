// src/pages/home/HomePage.tsx
import { useNavigate } from 'react-router-dom'
import { TopBar, Avatar, Badge, ProgBar } from '../../components/common'
import { useDataStore, totalFee, paidFee, isFullPaid } from '../../store/dataStore'

export default function HomePage() {
  const navigate = useNavigate()
  const parents = useDataStore((s) => s.parents)
  const classes = useDataStore((s) => s.classes)
  const attendSheets = useDataStore((s) => s.attendSheets)
  const events = useDataStore((s) => s.events)

  const allStudents = parents.flatMap((p) =>
    p.students.map((s) => ({ ...s, pid: p.pid, pname: p.name, pcol: p.col, ptc: p.tc }))
  )
  const tAmt = allStudents.reduce((a, s) => a + totalFee(s), 0)
  const pAmt = allStudents.reduce((a, s) => a + paidFee(s), 0)
  const unpaidCnt = allStudents.filter((s) => !isFullPaid(s)).length
  const pctTotal = tAmt > 0 ? Math.round((pAmt / tAmt) * 100) : 0

  const todayStr = new Date().toISOString().slice(0, 10)
  const todaySheets = attendSheets.filter((sh) => sh.date === todayStr)
  const todayPresent = todaySheets.reduce((a, sh) => a + sh.records.filter((r) => r.status === '출석').length, 0)
  const todayTotal = todaySheets.reduce((a, sh) => a + sh.records.length, 0)
  const todayAttendRate = todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 100) : null

  const upcomingEvents = events
    .filter((e) => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)

  const CAT_BG: Record<string, string> = { 수업: '#EEF4FF', 시험: '#F4F3FF', 휴일: '#FFFAEB', 행사: '#ECFDF5', 상담: '#FEF3F2', 기타: '#F9FAFB' }
  const CAT_TC: Record<string, string> = { 수업: '#1849A9', 시험: '#5925DC', 휴일: '#B54708', 행사: '#027A48', 상담: '#B42318', 기타: '#344054' }
  const DAY = ['일', '월', '화', '수', '목', '금', '토']

  const classStats = classes.map((cls) => {
    const cs = allStudents.filter((s) => s.cls === cls.name)
    const cp = cs.reduce((a, s) => a + paidFee(s), 0)
    const ct = cs.reduce((a, s) => a + totalFee(s), 0)
    return {
      cid: cls.cid, name: cls.name, color: cls.color, textColor: cls.textColor,
      pct: ct > 0 ? Math.round((cp / ct) * 100) : 0,
    }
  })

  const consultations = [
    { pid: 1, name: '김지원', cls: 'A반', time: '3/20 오후 2시' },
    { pid: 2, name: '박영수', cls: 'B반', time: '3/18 오전 10시' },
    { pid: 3, name: '이수현', cls: 'C반', time: '3/22 오후 4시' },
  ]

  return (
    <>
      <TopBar
        title="대시보드"
        sub="2024년 3월"
        right={
          <button className="icon-btn">
            <svg viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
        }
      />

      <div className="page-content-body">

        {/* 통계 카드 */}
        <div className="sec">
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">전체 학생</div>
              <div className="stat-value">{allStudents.length}</div>
              <div className="stat-sub">{classes.length}개 반</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">수납률</div>
              <div className="stat-value">{pctTotal}%</div>
              <div className="stat-sub">미납 {unpaidCnt}명</div>
            </div>
            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/attend')}>
              <div className="stat-label">오늘 출석</div>
              <div className="stat-value" style={{ color: todayAttendRate !== null ? (todayAttendRate >= 80 ? 'var(--ok)' : 'var(--warn)') : 'var(--slate3)' }}>
                {todayAttendRate !== null ? `${todayAttendRate}%` : '-'}
              </div>
              <div className="stat-sub">{todayTotal > 0 ? `${todayPresent}/${todayTotal}명` : '미등록'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">학부모 수</div>
              <div className="stat-value">{parents.length}</div>
              <div className="stat-sub">등록</div>
            </div>
          </div>
        </div>

        {/* 반별 수납률 + 최근 상담 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 0 }}>
          <div className="sec">
            <div className="row" style={{ marginBottom: 10 }}>
              <span className="sec-title" style={{ marginBottom: 0 }}>반별 수납률</span>
              <span style={{ fontSize: 11, color: 'var(--acc)', cursor: 'pointer' }} onClick={() => navigate('/class')}>클래스 관리 →</span>
            </div>
            <div className="card" style={{ padding: '14px 16px' }}>
              {classStats.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--slate3)', fontSize: 13, padding: '8px 0' }}>등록된 반이 없습니다</div>
              )}
              {classStats.map((cs, i) => (
                <div key={cs.cid} style={{ marginBottom: i < classStats.length - 1 ? 14 : 0, cursor: 'pointer' }} onClick={() => navigate(`/class/${cs.cid}`)}>
                  <div className="row" style={{ marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: cs.color, border: `1px solid ${cs.textColor}` }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{cs.name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: cs.pct >= 90 ? 'var(--ok)' : cs.pct >= 70 ? 'var(--warn)' : 'var(--err)' }}>{cs.pct}%</span>
                  </div>
                  <ProgBar pct={cs.pct} color={cs.pct >= 90 ? 'var(--ok)' : cs.pct >= 70 ? 'var(--warn)' : 'var(--err)'} />
                </div>
              ))}
            </div>
          </div>

          <div className="sec">
            <div className="sec-title">최근 상담 신청</div>
            <div className="card">
              {consultations.map((c) => {
                const p = parents.find((x) => x.pid === c.pid)
                if (!p) return null
                return (
                  <div key={c.pid} className="list-row" onClick={() => navigate(`/parents/${c.pid}`)}>
                    <Avatar name={p.name} col={p.col} tc={p.tc} />
                    <div style={{ flex: 1 }}>
                      <div className="row">
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{c.name}</span>
                        <Badge cls="badge-amber">대기</Badge>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 2 }}>{c.cls} · {c.time}</div>
                    </div>
                    <svg style={{ width: 13, height: 13, stroke: 'var(--slate3)', fill: 'none', strokeWidth: 2, strokeLinecap: 'round' }} viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 다가오는 일정 */}
        {upcomingEvents.length > 0 && (
          <div className="sec">
            <div className="row" style={{ marginBottom: 10 }}>
              <span className="sec-title" style={{ marginBottom: 0 }}>다가오는 일정</span>
              <span style={{ fontSize: 11, color: 'var(--acc)', cursor: 'pointer' }} onClick={() => navigate('/calendar')}>전체보기 →</span>
            </div>
            <div className="card">
              {upcomingEvents.map((e, i) => (
                <div key={e.id} onClick={() => navigate('/calendar')}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: i < upcomingEvents.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: CAT_BG[e.category] ?? 'var(--bg3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: CAT_TC[e.category] ?? 'var(--slate)', lineHeight: 1 }}>{parseInt(e.date.slice(8))}</span>
                    <span style={{ fontSize: 9, color: CAT_TC[e.category] ?? 'var(--slate)', opacity: 0.7 }}>{DAY[new Date(e.date).getDay()]}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: CAT_BG[e.category] ?? 'var(--bg3)', color: CAT_TC[e.category] ?? 'var(--slate)' }}>{e.category}</span>
                      {e.targets.map((t) => <span key={t} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 8, background: 'var(--bg3)', color: 'var(--slate2)' }}>{t}</span>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  )
}
