// src/pages/payment/PaymentDetailPage.tsx
import { useParams, useNavigate } from 'react-router-dom'
import { TopBar, Breadcrumb, Avatar, Badge, ProgBar, EditIcon, IconBtn, useToast, Toast } from '../../components/common'
import FeePaymentRow from '../../components/payment/FeePaymentRow'
import { useDataStore, clsBdg, statusBdgCls, statusBdgTxt, totalFee, paidFee, payPct, barCol, isFullPaid } from '../../store/dataStore'
import { formatPaidMeta } from '../../utils/feePayment'
import { formatYearMonthLabel } from '../../utils/paymentMonth'
import type { FeeItemKey, Student } from '../../types'

export default function PaymentDetailPage() {
  const { sid } = useParams()
  const navigate = useNavigate()
  const students = useDataStore((s) => s.students)
  const paymentYearMonth = useDataStore((s) => s.paymentYearMonth)
  const updateFee = useDataStore((s) => s.updateFee)
  const { ref: toastRef, show: showToast } = useToast()

  const student = students.find((st) => st.sid === Number(sid)) ?? null
  if (!student) return <div className="sec">수납 정보를 찾을 수 없습니다.</div>
  const total = totalFee(student)
  const paid2 = paidFee(student)
  const remain = total - paid2
  const pct2 = payPct(student)
  const bc = barCol(student)

  const saveFee = async (
    key: FeeItemKey,
    payload: { paid: boolean; paidAt?: string; paymentMethod?: string },
  ) => {
    const label = student.fees[key].label
    try {
      await updateFee(student.sid, key, payload)
      const msg = payload.paid
        ? `${label} 완납 저장 (${payload.paidAt ?? ''} ${payload.paymentMethod ?? ''})`.trim()
        : `${label} 미납 저장`
      showToast(msg)
    } catch {
      showToast('수납 상태 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  return (
    <>
      <TopBar
        title={student.name}
        sub={`${formatYearMonthLabel(paymentYearMonth)} · ${student.cls} · ${student.grade}`}
        onBack={() => navigate('/payment')}
        right={
          <IconBtn onClick={() => navigate(`/parents/${student.sid}/edit`)}>
            <EditIcon />
          </IconBtn>
        }
      />
      <Breadcrumb items={[
        { label: '수납현황', onClick: () => navigate('/payment') },
        { label: student.name },
      ]} />

      <div className="page-content-body">

        <div className="sec">
          <div className="hero-card">
            <Avatar name={student.parentName} col={student.col} tc={student.tc} large />
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--navy)' }}>{student.name}</div>
              <div style={{ fontSize: 13, color: 'var(--slate2)', marginTop: 2 }}>{student.parentName} · {student.grade}</div>
              <div style={{ marginTop: 6, display: 'flex', gap: 5 }}>
                <Badge cls={clsBdg(student.cls)}>{student.cls}</Badge>
                <Badge cls={statusBdgCls(student)}>{statusBdgTxt(student)}</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="sec">
          <div className="sec-title">항목별 납부 등록</div>
          <div className="card">
            {(['tuition', 'book'] as FeeItemKey[]).map((k) => {
              const f = student.fees[k]
              const meta = formatPaidMeta(f)
              return (
                <div key={k}>
                  {meta && (
                    <div style={{ padding: '10px 16px 0', fontSize: 12, color: 'var(--ok)', fontWeight: 600 }}>
                      등록 정보: {meta}
                    </div>
                  )}
                  <FeePaymentRow fee={f} onSave={(payload) => saveFee(k, payload)} />
                </div>
              )
            })}
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
