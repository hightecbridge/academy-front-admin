// src/pages/class/ClassListPage.tsx
import { useNavigate } from 'react-router-dom'
import { TopBar, Fab, ProgBar } from '../../components/common'
import { useDataStore, totalFee, paidFee } from '../../store/dataStore'

export default function ClassListPage() {
  const navigate = useNavigate()
  const classes = useDataStore((s) => s.classes)
  const parents = useDataStore((s) => s.parents)
  const allStudents = parents.flatMap((p) => p.students)

  return (
    <>
      <TopBar
        title="클래스 관리"
        sub={`총 ${classes.length}개 반`}
        right={
          <button className="icon-btn" onClick={() => navigate('/class/new')}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
        }
      />

      <div className="page-content-body">

        {/* 전체 요약 */}
        <div className="sec">
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">운영 중인 반</div>
              <div className="stat-value">{classes.length}</div>
              <div className="stat-sub">개 반</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">전체 학생</div>
              <div className="stat-value">{allStudents.length}</div>
              <div className="stat-sub">명 등록</div>
            </div>
          </div>
        </div>

        {/* 반 카드 목록 */}
        <div className="sec">
          <div className="sec-title">반 목록</div>
          {classes.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--slate3)', fontSize: 13 }}>
              등록된 반이 없습니다.<br />우측 상단 + 버튼으로 반을 추가하세요.
            </div>
          )}
          {classes.map((cls) => {
            const stuInClass = allStudents.filter((s) => s.cls === cls.name)
            const paidAmt = stuInClass.reduce((a, s) => a + paidFee(s), 0)
            const totalAmt = stuInClass.reduce((a, s) => a + totalFee(s), 0)
            const payPct = totalAmt > 0 ? Math.round((paidAmt / totalAmt) * 100) : 0
            const occupancy = cls.capacity > 0 ? Math.round((stuInClass.length / cls.capacity) * 100) : 0
            const payCol = payPct >= 90 ? 'var(--ok)' : payPct >= 70 ? 'var(--warn)' : 'var(--err)'

            return (
              <div key={cls.cid} className="card" style={{ marginBottom: 12, cursor: 'pointer' }} onClick={() => navigate(`/class/${cls.cid}`)}>
                {/* 헤더 */}
                <div style={{ background: cls.color, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: cls.textColor }}>{cls.name}</div>
                    <div style={{ fontSize: 12, color: cls.textColor, opacity: 0.75, marginTop: 2 }}>{cls.subject}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: cls.textColor }}>{stuInClass.length}</div>
                    <div style={{ fontSize: 11, color: cls.textColor, opacity: 0.75 }}>/ {cls.capacity}명</div>
                  </div>
                </div>

                {/* 바디 */}
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: 'var(--slate3)', marginBottom: 3 }}>담당 교사</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{cls.teacher}</div>
                    </div>
                    <div style={{ flex: 2 }}>
                      <div style={{ fontSize: 11, color: 'var(--slate3)', marginBottom: 3 }}>수업 일정</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{cls.schedule}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {[
                      { label: '수업료', value: cls.tuitionFee },
                      { label: '교재비', value: cls.bookFee },
                      { label: '합계', value: cls.tuitionFee + cls.bookFee },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ flex: 1, background: 'var(--bg2)', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 10, color: 'var(--slate3)', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{value.toLocaleString()}원</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div className="row" style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--slate3)' }}>정원 현황</span>
                      <span style={{ fontSize: 11, color: 'var(--slate2)' }}>{stuInClass.length}/{cls.capacity}명 ({occupancy}%)</span>
                    </div>
                    <ProgBar pct={occupancy} color={occupancy >= 90 ? 'var(--err)' : occupancy >= 70 ? 'var(--warn)' : 'var(--ok)'} />
                  </div>
                  {stuInClass.length > 0 && (
                    <div>
                      <div className="row" style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--slate3)' }}>이번달 수납률</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: payCol }}>{payPct}%</span>
                      </div>
                      <ProgBar pct={payPct} color={payCol} />
                    </div>
                  )}
                </div>

                {/* 액션 */}
                <div style={{ borderTop: '1px solid var(--border)', padding: '10px 16px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/class/${cls.cid}/edit`) }}
                    style={{ fontSize: 12, padding: '5px 14px', borderRadius: 8, border: '1px solid var(--acc)', background: 'var(--acc2)', color: 'var(--acc)', cursor: 'pointer' }}>
                    수정
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/class/${cls.cid}`) }}
                    style={{ fontSize: 12, padding: '5px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--navy)', cursor: 'pointer' }}>
                    상세보기
                  </button>
                </div>
              </div>
            )
          })}
        </div>

      </div>
      <Fab onClick={() => navigate('/class/new')} />
    </>
  )
}
