// src/pages/class/ClassDetailPage.tsx
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TopBar, Breadcrumb, TabBar, Badge, Avatar, ProgBar, EditIcon, IconBtn, ChevronRight } from '../../components/common'
import { useDataStore, totalFee, paidFee, statusBdgCls, statusBdgTxt, payPct, barCol } from '../../store/dataStore'

export default function ClassDetailPage() {
  const { cid } = useParams()
  const navigate = useNavigate()
  const classes = useDataStore((s) => s.classes)
  const parents = useDataStore((s) => s.parents)
  const deleteClass = useDataStore((s) => s.deleteClass)
  const [tabIdx, setTabIdx] = useState(0)

  const cls = classes.find((c) => c.cid === Number(cid))
  if (!cls) return <div className="sec" style={{ padding: 20 }}>반 정보를 찾을 수 없습니다.</div>

  const allStudents = parents.flatMap((p) =>
    p.students
      .filter((s) => s.cls === cls.name)
      .map((s) => ({ ...s, pid: p.pid, pname: p.name, pcol: p.col, ptc: p.tc }))
  )

  const totalAmt = allStudents.reduce((a, s) => a + totalFee(s), 0)
  const paidAmt = allStudents.reduce((a, s) => a + paidFee(s), 0)
  const clsPayPct = totalAmt > 0 ? Math.round((paidAmt / totalAmt) * 100) : 0
  const occupancy = cls.capacity > 0 ? Math.round((allStudents.length / cls.capacity) * 100) : 0

  const handleDelete = () => {
    if (allStudents.length > 0) {
      alert(`${cls.name}에 학생 ${allStudents.length}명이 배정되어 있어 삭제할 수 없습니다.\n학생을 먼저 다른 반으로 이동하거나 삭제해 주세요.`)
      return
    }
    if (window.confirm(`${cls.name}을 삭제하시겠습니까?`)) {
      deleteClass(cls.cid)
      navigate('/class')
    }
  }

  return (
    <>
      <TopBar
        title={cls.name}
        sub={cls.subject}
        onBack={() => navigate('/class')}
        right={
          <IconBtn onClick={() => navigate(`/class/${cls.cid}/edit`)}>
            <EditIcon />
          </IconBtn>
        }
      />
      <Breadcrumb items={[
        { label: '클래스 관리', onClick: () => navigate('/class') },
        { label: cls.name },
      ]} />
      <TabBar
        tabs={['기본정보', `학생 ${allStudents.length}명`, '수납현황']}
        active={tabIdx}
        onChange={setTabIdx}
      />

      <div className="page-content-body">
        {/* ── 탭 0: 기본정보 ── */}
        {tabIdx === 0 && (
          <>
            <div className="sec">
              {/* 헤더 카드 */}
              <div style={{
                background: cls.color, borderRadius: 14,
                padding: '20px 20px 16px', marginBottom: 14,
                border: `0.5px solid ${cls.color}`,
              }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: cls.textColor }}>{cls.name}</div>
                <div style={{ fontSize: 14, color: cls.textColor, opacity: 0.8, marginTop: 4 }}>{cls.subject}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.35)', borderRadius: 10,
                    padding: '8px 14px', flex: 1, textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: cls.textColor }}>{allStudents.length}</div>
                    <div style={{ fontSize: 10, color: cls.textColor, opacity: 0.75 }}>현재 학생</div>
                  </div>
                  <div style={{
                    background: 'rgba(255,255,255,0.35)', borderRadius: 10,
                    padding: '8px 14px', flex: 1, textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: cls.textColor }}>{cls.capacity}</div>
                    <div style={{ fontSize: 10, color: cls.textColor, opacity: 0.75 }}>정원</div>
                  </div>
                  <div style={{
                    background: 'rgba(255,255,255,0.35)', borderRadius: 10,
                    padding: '8px 14px', flex: 1, textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: cls.textColor }}>{clsPayPct}%</div>
                    <div style={{ fontSize: 10, color: cls.textColor, opacity: 0.75 }}>수납률</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sec">
              <div className="sec-title">수업 정보</div>
              <div className="card">
                <div className="field-row">
                  <span className="field-label">반 이름</span>
                  <span className="field-value">{cls.name}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">과목</span>
                  <span className="field-value">{cls.subject}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">담당 교사</span>
                  <span className="field-value" style={{ color: 'var(--acc)' }}>{cls.teacher}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">수업 일정</span>
                  <span className="field-value">{cls.schedule}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">정원</span>
                  <span className="field-value">{cls.capacity}명</span>
                </div>
                <div className="field-row">
                  <span className="field-label">개설일</span>
                  <span className="field-value">{cls.createdAt}</span>
                </div>
              </div>
            </div>

            <div className="sec">
              <div className="sec-title">수강료 정보</div>
              <div className="card">
                <div className="field-row">
                  <span className="field-label">월 수업료</span>
                  <span className="field-value">{cls.tuitionFee.toLocaleString()}원</span>
                </div>
                <div className="field-row">
                  <span className="field-label">월 교재비</span>
                  <span className="field-value">{cls.bookFee.toLocaleString()}원</span>
                </div>
                <div className="field-row" style={{ background: 'var(--bg2)' }}>
                  <span className="field-label" style={{ fontWeight: 600, color: 'var(--navy)' }}>월 합계</span>
                  <span className="field-value" style={{ fontWeight: 700, color: 'var(--navy)' }}>
                    {(cls.tuitionFee + cls.bookFee).toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>

            <div className="sec">
              <div className="sec-title">정원 현황</div>
              <div className="card" style={{ padding: '14px 16px' }}>
                <div className="row" style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--slate2)' }}>
                    {allStudents.length}명 / {cls.capacity}명
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: occupancy >= 90 ? 'var(--err)' : 'var(--ok)' }}>
                    {occupancy}%
                  </span>
                </div>
                <ProgBar
                  pct={occupancy}
                  color={occupancy >= 90 ? 'var(--err)' : occupancy >= 70 ? 'var(--warn)' : 'var(--ok)'}
                />
                {occupancy >= 90 && (
                  <div style={{ fontSize: 11, color: 'var(--err)', marginTop: 6 }}>
                    정원이 거의 찼습니다. 정원 조정을 고려해 주세요.
                  </div>
                )}
              </div>
            </div>

            <div className="sec">
              <button className="btn-secondary" onClick={() => navigate(`/class/${cls.cid}/edit`)}>
                반 정보 수정
              </button>
              <button className="btn-danger" onClick={handleDelete}>
                반 삭제
              </button>
            </div>
          </>
        )}

        {/* ── 탭 1: 학생 목록 ── */}
        {tabIdx === 1 && (
          <div className="sec">
            {allStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--slate3)', fontSize: 13 }}>
                이 반에 배정된 학생이 없습니다.
              </div>
            ) : (
              <div className="card">
                {allStudents.map((s) => (
                  <div
                    key={s.sid}
                    className="list-row"
                    onClick={() => navigate(`/parents/${s.pid}/student/${s.sid}`)}
                  >
                    <div
                      className="avatar"
                      style={{ background: s.pcol, color: s.ptc }}
                    >
                      {s.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="row">
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{s.name}</span>
                        <Badge cls={statusBdgCls(s)}>{statusBdgTxt(s)}</Badge>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 2 }}>
                        {s.pname} · {s.grade}
                      </div>
                    </div>
                    <ChevronRight />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 탭 2: 수납현황 ── */}
        {tabIdx === 2 && (
          <>
            <div className="sec">
              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-label">청구 합계</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>
                    {totalAmt.toLocaleString()}원
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">납부 합계</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ok)' }}>
                    {paidAmt.toLocaleString()}원
                  </div>
                </div>
              </div>
            </div>
            <div className="sec">
              <div className="sec-title">이번달 수납률</div>
              <div className="card" style={{ padding: '14px 16px' }}>
                <div className="row" style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{cls.name} 전체</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: clsPayPct >= 90 ? 'var(--ok)' : 'var(--warn)' }}>
                    {clsPayPct}%
                  </span>
                </div>
                <ProgBar pct={clsPayPct} color={clsPayPct >= 90 ? 'var(--ok)' : 'var(--warn)'} />
              </div>
            </div>
            <div className="sec">
              <div className="sec-title">학생별 납부 현황</div>
              {allStudents.map((s) => (
                <div
                  key={s.sid}
                  className="pay-card"
                  style={{ marginBottom: 10 }}
                  onClick={() => navigate(`/payment/${s.sid}`)}
                >
                  <div className="pay-head">
                    <div className="avatar" style={{ background: s.pcol, color: s.ptc }}>{s.name[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div className="row">
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{s.name}</span>
                        <Badge cls={statusBdgCls(s)}>{statusBdgTxt(s)}</Badge>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                        <div style={{ flex: 1 }}>
                          <ProgBar pct={payPct(s)} color={barCol(s)} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--slate3)', minWidth: 28, textAlign: 'right' }}>
                          {payPct(s)}%
                        </span>
                      </div>
                    </div>
                    <ChevronRight />
                  </div>
                  <div className="pay-body">
                    <div className="pay-row">
                      <span className="pay-label">수업료</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span className="pay-value">{s.fees.tuition.amount.toLocaleString()}원</span>
                        <Badge cls={s.fees.tuition.paid ? 'badge-green' : 'badge-red'}>
                          {s.fees.tuition.paid ? '완납' : '미납'}
                        </Badge>
                      </div>
                    </div>
                    <div className="pay-row">
                      <span className="pay-label">교재비</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span className="pay-value">{s.fees.book.amount.toLocaleString()}원</span>
                        <Badge cls={s.fees.book.paid ? 'badge-green' : 'badge-red'}>
                          {s.fees.book.paid ? '완납' : '미납'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
