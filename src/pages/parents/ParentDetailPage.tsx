// src/pages/parents/ParentDetailPage.tsx
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TopBar, TabBar, Breadcrumb, Avatar, Badge, Toggle, ProgBar, Fab, EditIcon, IconBtn, ChevronRight } from '../../components/common'
import { useDataStore, clsBdg, clsCol, statusBdgCls, statusBdgTxt, totalFee, paidFee, isFullPaid, payPct, barCol } from '../../store/dataStore'

export function ParentDetailPage() {
  const { pid } = useParams()
  const navigate = useNavigate()
  const parents = useDataStore((s) => s.parents)
  const toggleFee = useDataStore((s) => s.toggleFee)
  const [tabIdx, setTabIdx] = useState(0)

  const p = parents.find((x) => x.pid === Number(pid))
  if (!p) return <div className="sec">학부모를 찾을 수 없습니다.</div>

  const totalAmt = p.students.reduce((a, s) => a + totalFee(s), 0)
  const paidAmt  = p.students.reduce((a, s) => a + paidFee(s), 0)

  return (
    <>
      <TopBar
        title={p.name}
        sub={p.phone}
        onBack={() => navigate('/parents')}
        right={
          <IconBtn onClick={() => navigate(`/parents/${p.pid}/edit`)}>
            <EditIcon />
          </IconBtn>
        }
      />
      <Breadcrumb items={[
        { label: '학부모 목록', onClick: () => navigate('/parents') },
        { label: p.name },
      ]} />
      <TabBar
        tabs={['기본정보', `학생 ${p.students.length}명`, '수납현황']}
        active={tabIdx}
        onChange={setTabIdx}
      />
      <Fab onClick={() => navigate(`/parents/${p.pid}/student/new`)} />

      <div className="page-content-body">

        {/* ── 탭 0: 기본정보 ── */}
        {tabIdx === 0 && (
          <div>
            <div className="sec">
              <div className="hero-card">
                <Avatar name={p.name} col={p.col} tc={p.tc} large />
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--navy)' }}>{p.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--slate2)', marginTop: 3 }}>{p.phone}</div>
                  <div style={{ marginTop: 7, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {p.students.map((s) => (
                      <Badge key={s.sid} cls={clsBdg(s.cls)}>{s.name}·{s.cls}</Badge>
                    ))}
                    {p.students.length === 0 && <Badge cls="badge-gray">학생없음</Badge>}
                  </div>
                </div>
              </div>
            </div>
            <div className="sec">
              <div className="sec-title">연락처 정보</div>
              <div className="card">
                <div className="field-row"><span className="field-label">이름</span><span className="field-value">{p.name}</span></div>
                <div className="field-row"><span className="field-label">전화번호</span><span className="field-value" style={{ color: 'var(--acc)' }}>{p.phone}</span></div>
                <div className="field-row">
                  <span className="field-label">카카오톡</span>
                  <Badge cls={p.kakao ? 'badge-green' : 'badge-red'}>{p.kakao ? '연동됨' : '미연동'}</Badge>
                </div>
                <div className="field-row"><span className="field-label">등록일</span><span className="field-value">{p.reg}</span></div>
                <div className="field-row"><span className="field-label">등록 학생</span><span className="field-value">{p.students.length}명</span></div>
              </div>
            </div>
            <div className="sec">
              <button className="btn-secondary">카카오 알림톡 발송</button>
              <button className="btn-danger">학부모 삭제</button>
            </div>
          </div>
        )}

        {/* ── 탭 1: 학생 ── */}
        {tabIdx === 1 && (
          <div>
            <div className="sec">
              <div className="row" style={{ marginBottom: 12 }}>
                <span className="sec-title" style={{ marginBottom: 0 }}>학생 {p.students.length}명</span>
                <button
                  onClick={() => navigate(`/parents/${p.pid}/student/new`)}
                  style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, background: 'var(--acc)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                >
                  <svg style={{ width: 11, height: 11, stroke: '#fff', fill: 'none', strokeWidth: 2.5, strokeLinecap: 'round' }} viewBox="0 0 24 24">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  학생 추가
                </button>
              </div>
              {p.students.length === 0 && (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate3)', fontSize: 13 }}>
                  등록된 학생이 없습니다
                </div>
              )}
              {p.students.map((s) => {
                const cc = clsCol(s.cls)
                return (
                  <div key={s.sid} className="student-card">
                    <div className="student-head" onClick={() => navigate(`/parents/${p.pid}/student/${s.sid}`)}>
                      <Avatar name={s.name} col={cc.bg} tc={cc.tc} />
                      <div style={{ flex: 1 }}>
                        <div className="row">
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{s.name}</span>
                          <Badge cls={clsBdg(s.cls)}>{s.cls}</Badge>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 2 }}>
                          {s.grade} · <span className={`badge ${statusBdgCls(s)}`} style={{ padding: '1px 6px' }}>{statusBdgTxt(s)}</span>
                        </div>
                      </div>
                      <ChevronRight />
                    </div>
                    <div className="student-body">
                      <div className="field-row">
                        <span className="field-label">수업료</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span className="field-value">{s.fees.tuition.amount.toLocaleString()}원</span>
                          <Badge cls={s.fees.tuition.paid ? 'badge-green' : 'badge-red'}>
                            {s.fees.tuition.paid ? '완납' : '미납'}
                          </Badge>
                        </span>
                      </div>
                      <div className="field-row">
                        <span className="field-label">교재비</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span className="field-value">{s.fees.book.amount.toLocaleString()}원</span>
                          <Badge cls={s.fees.book.paid ? 'badge-green' : 'badge-red'}>
                            {s.fees.book.paid ? '완납' : '미납'}
                          </Badge>
                        </span>
                      </div>
                      <div className="field-row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                        <button onClick={() => navigate(`/parents/${p.pid}/student/${s.sid}`)}
                          style={{ fontSize: 12, padding: '5px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--navy)', cursor: 'pointer' }}>상세</button>
                        <button onClick={() => navigate(`/parents/${p.pid}/student/${s.sid}/edit`)}
                          style={{ fontSize: 12, padding: '5px 11px', borderRadius: 8, border: '1px solid var(--acc)', background: 'var(--acc2)', color: 'var(--acc)', cursor: 'pointer' }}>수정</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── 탭 2: 수납 ── */}
        {tabIdx === 2 && (
          <div>
            <div className="sec">
              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-label">청구금액</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>{totalAmt.toLocaleString()}원</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">납부금액</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ok)' }}>{paidAmt.toLocaleString()}원</div>
                </div>
              </div>
            </div>
            <div className="sec">
              <div className="sec-title">학생별 수납 (토글로 변경)</div>
              {p.students.map((s) => (
                <div key={s.sid} className="pay-card">
                  <div className="pay-head" onClick={() => navigate(`/payment/${s.sid}`)}>
                    <Avatar name={s.name} col={clsCol(s.cls).bg} tc={clsCol(s.cls).tc} />
                    <div style={{ flex: 1 }}>
                      <div className="row">
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{s.name}</span>
                        <Badge cls={statusBdgCls(s)}>{statusBdgTxt(s)}</Badge>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <div style={{ flex: 1 }}>
                          <ProgBar pct={payPct(s)} color={barCol(s)} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--slate3)', minWidth: 28, textAlign: 'right' }}>{payPct(s)}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="pay-body">
                    {(Object.entries(s.fees) as [string, { label: string; amount: number; paid: boolean }][]).map(([k, f]) => (
                      <div key={k} className="pay-row">
                        <span className="pay-label">{f.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className="pay-value">{f.amount.toLocaleString()}원</span>
                          <Toggle checked={f.paid} onChange={(v) => toggleFee(s.sid, k as 'tuition' | 'book', v)} />
                        </div>
                      </div>
                    ))}
                    <div className="pay-row" style={{ background: 'var(--bg2)' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>납부 합계</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ok)' }}>{paidFee(s).toLocaleString()}원</span>
                    </div>
                  </div>
                </div>
              ))}
              {p.students.some((s) => !isFullPaid(s)) && (
                <button className="btn-red">미납 카드결제 문자 발송</button>
              )}
            </div>
          </div>
        )}

      </div>
    </>
  )
}
