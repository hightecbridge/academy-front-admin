// src/pages/payment/PaymentDetailPage.tsx
import { useParams, useNavigate } from 'react-router-dom'
import { TopBar, Breadcrumb, Avatar, Badge, Toggle, ProgBar, EditIcon, IconBtn, useToast, Toast } from '../../components/common'
import { useDataStore, clsBdg, statusBdgCls, statusBdgTxt, totalFee, paidFee, payPct, barCol, isFullPaid } from '../../store/dataStore'
import type { Parent, Student } from '../../types'

export default function PaymentDetailPage() {
  const { sid } = useParams()
  const navigate = useNavigate()
  const parents = useDataStore((s) => s.parents)
  const toggleFee = useDataStore((s) => s.toggleFee)
  const { ref: toastRef, show: showToast } = useToast()

  let s: Student | null = null
  let p: Parent | null = null
  parents.forEach((par) => par.students.forEach((st) => {
    if (st.sid === Number(sid)) { s = st; p = par }
  }))
  if (!s || !p) return <div className="sec">수납 정보를 찾을 수 없습니다.</div>

  const student = s as Student
  const parent = p as Parent
  const total = totalFee(student)
  const paid2 = paidFee(student)
  const remain = total - paid2
  const pct2 = payPct(student)
  const bc = barCol(student)

  const handleToggle = (key: 'tuition' | 'book', v: boolean) => {
    toggleFee(student.sid, key, v)
    showToast(`${student.fees[key].label} ${v ? '완납' : '미납'} 변경`)
  }

  return (
    <>
      <TopBar
        title={student.name}
        sub={`${student.cls} · ${student.grade}`}
        onBack={() => navigate('/payment')}
        right={
          <IconBtn onClick={() => navigate(`/parents/${parent.pid}/student/${student.sid}/edit`)}>
            <EditIcon />
          </IconBtn>
        }
      />
      <Breadcrumb items={[
        { label: '수납현황', onClick: () => navigate('/payment') },
        { label: student.name },
      ]} />

      <div className="page-content-body">

        {/* 학생 정보 */}
        <div className="sec">
          <div className="hero-card">
            <Avatar name={parent.name} col={parent.col} tc={parent.tc} large />
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--navy)' }}>{student.name}</div>
              <div style={{ fontSize: 13, color: 'var(--slate2)', marginTop: 2 }}>{parent.name} · {student.grade}</div>
              <div style={{ marginTop: 6, display: 'flex', gap: 5 }}>
                <Badge cls={clsBdg(student.cls)}>{student.cls}</Badge>
                <Badge cls={statusBdgCls(student)}>{statusBdgTxt(student)}</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* 납부 현황 토글 */}
        <div className="sec">
          <div className="sec-title">항목별 납부 현황</div>
          <div className="card">
            {(Object.entries(student.fees) as [string, { label: string; amount: number; paid: boolean }][]).map(([k, f]) => (
              <div key={k} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                <div className="row" style={{ marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{f.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 2 }}>{f.amount.toLocaleString()}원</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: f.paid ? 'var(--ok)' : 'var(--err)' }}>
                      {f.paid ? '완납' : '미납'}
                    </span>
                    <Toggle checked={f.paid} onChange={(v) => handleToggle(k as 'tuition' | 'book', v)} />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--slate3)' }}>
                  {f.paid ? '납부 완료' : '미납 상태 — 토글로 납부 처리'}
                </div>
              </div>
            ))}
            <div style={{ padding: '14px 16px', background: 'var(--bg2)' }}>
              <div className="row" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>청구 합계</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{total.toLocaleString()}원</span>
              </div>
              <div className="row" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--ok)' }}>납부 완료</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ok)' }}>{paid2.toLocaleString()}원</span>
              </div>
              <div className="row">
                <span style={{ fontSize: 13, color: 'var(--err)' }}>미납 잔액</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--err)' }}>{remain.toLocaleString()}원</span>
              </div>
              <div style={{ marginTop: 10 }}>
                <ProgBar pct={pct2} color={bc} />
              </div>
              <div className="row" style={{ marginTop: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--slate3)' }}>수납률</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: bc }}>{pct2}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 카드결제 문자 */}
        {!isFullPaid(student) && (
          <div className="sec">
            <button className="btn-red" onClick={() => showToast('카드결제 문자 발송')}>
              카드결제 문자 발송
            </button>
          </div>
        )}

      </div>
      <Toast toastRef={toastRef} />
    </>
  )
}
