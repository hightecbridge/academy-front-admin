// src/pages/payment/PaymentPage.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar, TabBar, Avatar, Badge, ProgBar, ChevronRight, useToast, Toast } from '../../components/common'
import FeePaymentRow from '../../components/payment/FeePaymentRow'
import PaymentYearMonthSelect from '../../components/payment/PaymentYearMonthSelect'
import { useDataStore, totalFee, paidFee, isFullPaid, isPartPaid, payPct, barCol, statusBdgCls, statusBdgTxt, clsBdg, studentInClass } from '../../store/dataStore'
import { formatYearMonthLabel } from '../../utils/paymentMonth'
import { formatPaidMeta } from '../../utils/feePayment'
import { downloadPaymentStatusExcel } from '../../utils/paymentExport'
import type { FeeItemKey } from '../../types'

export default function PaymentPage() {
  const navigate = useNavigate()
  const students = useDataStore((s) => s.students)
  const classes = useDataStore((s) => s.classes)
  const paymentYearMonth = useDataStore((s) => s.paymentYearMonth)
  const fetchStudents = useDataStore((s) => s.fetchStudents)
  const setPaymentYearMonth = useDataStore((s) => s.setPaymentYearMonth)
  const updateFee = useDataStore((s) => s.updateFee)
  const { ref: toastRef, show: showToast } = useToast()
  const [tabIdx, setTabIdx] = useState(0)
  const [q, setQ] = useState('')
  const [monthLoading, setMonthLoading] = useState(false)

  useEffect(() => {
    void fetchStudents(paymentYearMonth)
  }, [])

  const onYearMonthChange = async (ym: number) => {
    if (ym === paymentYearMonth) return
    setPaymentYearMonth(ym)
    setMonthLoading(true)
    try {
      await fetchStudents(ym)
    } finally {
      setMonthLoading(false)
    }
  }

  const allStu = students
  const qNorm = q.trim().toLowerCase()
  const filtered = allStu
    .filter((s) => tabIdx === 1 ? !isFullPaid(s) : tabIdx === 2 ? isFullPaid(s) : true)
    .filter((s) => {
      if (!qNorm) return true
      return s.name.toLowerCase().includes(qNorm) || s.parentName.toLowerCase().includes(qNorm)
    })

  const tAmt = allStu.reduce((a, s) => a + totalFee(s), 0)
  const pAmt = allStu.reduce((a, s) => a + paidFee(s), 0)
  const fullCnt = allStu.filter(isFullPaid).length
  const partCnt = allStu.filter(isPartPaid).length
  const noneCnt = allStu.filter((s) => !isFullPaid(s) && !isPartPaid(s)).length
  const totalPct = tAmt > 0 ? Math.round((pAmt / tAmt) * 100) : 0

  const COLORS = ['var(--acc)', 'var(--ok)', 'var(--purple)', 'var(--warn)', 'var(--err)']
  const clsStats = classes.map((cls, ci) => {
    const cs = allStu.filter((s) => studentInClass(s, cls))
    const cp = cs.reduce((a, s) => a + paidFee(s), 0)
    const ct = cs.reduce((a, s) => a + totalFee(s), 0)
    return { c: cls.name, pct: ct > 0 ? Math.round((cp / ct) * 100) : 0, col: COLORS[ci % COLORS.length] }
  })

  const handleExcelDownload = () => {
    try {
      downloadPaymentStatusExcel(students, paymentYearMonth)
      showToast('엑셀 파일을 다운로드했습니다.')
    } catch {
      showToast('엑셀 다운로드에 실패했습니다.')
    }
  }

  const saveFee = async (
    sid: number,
    key: FeeItemKey,
    label: string,
    sname: string,
    payload: { paid: boolean; paidAt?: string; paymentMethod?: string },
  ) => {
    try {
      await updateFee(sid, key, payload)
      const msg = payload.paid
        ? `${sname} ${label} 완납 저장 (${payload.paidAt ?? ''} ${payload.paymentMethod ?? ''})`.trim()
        : `${sname} ${label} 미납 저장`
      showToast(msg)
    } catch {
      showToast('수납 상태 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  return (
    <>
      <TopBar
        title="수납현황"
        sub={formatYearMonthLabel(paymentYearMonth)}
        right={
          <button
            type="button"
            onClick={handleExcelDownload}
            disabled={monthLoading || allStu.length === 0}
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid var(--acc3)',
              background: 'var(--acc2)',
              color: 'var(--acc)',
              cursor: monthLoading || allStu.length === 0 ? 'not-allowed' : 'pointer',
              opacity: monthLoading || allStu.length === 0 ? 0.5 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            Excel 다운로드
          </button>
        }
      />
      <TabBar tabs={['전체', '미납·일부납', '완납']} active={tabIdx} onChange={setTabIdx} />

      <div className="page-content-body">

        <div className="sec">
          <PaymentYearMonthSelect
            value={paymentYearMonth}
            onChange={(ym) => void onYearMonthChange(ym)}
            disabled={monthLoading}
          />
        </div>

        <div className="sec">
          <div className="stat-grid-3">
            <div className="stat-card">
              <div className="stat-label">완납</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ok)' }}>{fullCnt}</div>
              <div className="stat-sub">명</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">일부납</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--warn)' }}>{partCnt}</div>
              <div className="stat-sub">명</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">미납</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--err)' }}>{noneCnt}</div>
              <div className="stat-sub">명</div>
            </div>
          </div>
        </div>

        <div className="sec">
          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="row" style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>전체 수납률</span>
              <span style={{ fontSize: 13, color: 'var(--acc)', fontWeight: 600 }}>{totalPct}%</span>
            </div>
            <div style={{ display: 'flex', gap: 2, height: 7, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ flex: pAmt, background: 'var(--ok)' }} />
              <div style={{ flex: tAmt - pAmt, background: 'var(--err2)' }} />
            </div>
            <div className="row" style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--slate2)' }}>납부 {pAmt.toLocaleString()}원</span>
              <span style={{ fontSize: 11, color: 'var(--slate3)' }}>미납 {(tAmt - pAmt).toLocaleString()}원</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              {clsStats.map((cs, i) => (
                <div key={cs.c} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < clsStats.length - 1 ? 8 : 0 }}>
                  <span style={{ fontSize: 12, color: 'var(--slate2)', minWidth: 28 }}>{cs.c}</span>
                  <div style={{ flex: 1 }}><ProgBar pct={cs.pct} color={cs.col} /></div>
                  <span style={{ fontSize: 12, color: 'var(--slate2)', minWidth: 28, textAlign: 'right' }}>{cs.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sec">
          <div style={{ marginBottom: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              className="input-field"
              placeholder="학생명/학부모명 검색"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ flex: 1, minWidth: 160 }}
            />
            <button
              type="button"
              className="btn-secondary"
              style={{ marginTop: 0, whiteSpace: 'nowrap' }}
              disabled={monthLoading || allStu.length === 0}
              onClick={handleExcelDownload}
            >
              Excel 다운로드
            </button>
          </div>
          <div className="sec-title">
            {filtered.length}명 — 미납/완납 선택 후 저장
            {allStu.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--slate3)', marginLeft: 6 }}>
                (엑셀: {formatYearMonthLabel(paymentYearMonth)} 전체 {allStu.length}명)
              </span>
            )}
          </div>
          {filtered.map((s) => (
            <div key={s.sid} className="pay-card">
              <div className="pay-head" onClick={() => navigate(`/payment/${s.sid}`)}>
                <Avatar name={s.parentName} col={s.col} tc={s.tc} />
                <div style={{ flex: 1 }}>
                  <div className="row">
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{s.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--slate2)', marginLeft: 6 }}>{s.parentName}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Badge cls={statusBdgCls(s)}>{statusBdgTxt(s)}</Badge>
                      <Badge cls={clsBdg(s.cls)}>{s.cls}</Badge>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                    <div style={{ flex: 1 }}><ProgBar pct={payPct(s)} color={barCol(s)} /></div>
                    <span style={{ fontSize: 11, color: 'var(--slate3)', minWidth: 28, textAlign: 'right' }}>{payPct(s)}%</span>
                  </div>
                </div>
                <ChevronRight />
              </div>
              <div className="pay-body" style={{ padding: '0 12px 12px' }}>
                {(['tuition', 'book'] as FeeItemKey[]).map((k) => {
                  const f = s.fees[k]
                  const meta = formatPaidMeta(f)
                  return (
                    <div key={k}>
                      {meta && (
                        <div style={{ fontSize: 11, color: 'var(--ok)', marginTop: 8, fontWeight: 600 }}>{meta}</div>
                      )}
                      <FeePaymentRow
                        compact
                        fee={f}
                        onSave={(payload) => saveFee(s.sid, k, f.label, s.name, payload)}
                      />
                    </div>
                  )
                })}
                <div className="pay-row" style={{ background: 'var(--bg2)', marginTop: 8, borderRadius: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>납부 합계</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ok)' }}>{paidFee(s).toLocaleString()}원</span>
                </div>
              </div>
            </div>
          ))}
          {filtered.some((s) => !isFullPaid(s)) && (
            <button
              className="btn-red"
              onClick={() => navigate('/message?tab=payment')}
            >
              미납자 수업료 안내 문자 일괄 발송
            </button>
          )}
        </div>

      </div>
      <Toast toastRef={toastRef} />
    </>
  )
}
