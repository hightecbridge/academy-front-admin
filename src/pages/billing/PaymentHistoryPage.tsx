// 결제 이력 — 구독·포인트 충전 기록
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import client from '../../api/client'
import { TopBar, Toast, useToast } from '../../components/common'
import { fmtKrw } from '../../config/pricingPlans'

export interface BillingPaymentRow {
  id: number
  paymentType: string
  amountKrw: number
  orderId: string | null
  summary: string
  paidAt: string
}

export type PointPaymentNotice = {
  type: 'points'
  pointsAdded: number
  newBalance?: number
  orderId?: string | null
}

function typeLabel(t: string): string {
  if (t === 'SUBSCRIPTION') return '구독'
  if (t === 'POINT_CHARGE') return '포인트 충전'
  return t
}

export default function PaymentHistoryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { ref: toastRef, show: showToast } = useToast()
  const [rows, setRows] = useState<BillingPaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [pointBanner, setPointBanner] = useState<PointPaymentNotice | null>(null)

  const load = useCallback(async () => {
    setErr('')
    try {
      const res = await client.get('/admin/billing/payments')
      const list = (res.data as { data: BillingPaymentRow[] }).data
      setRows(Array.isArray(list) ? list : [])
    } catch {
      setErr('결제 이력을 불러오지 못했습니다.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const st = location.state as { paymentNotice?: PointPaymentNotice } | null
    const n = st?.paymentNotice
    if (n?.type === 'points') {
      setPointBanner(n)
      showToast('포인트 충전이 완료되었습니다.')
      navigate(location.pathname, { replace: true, state: undefined })
    }
  }, [location.state, location.pathname, navigate, showToast])

  return (
    <>
      <TopBar title="결제 이력" sub="구독 · 포인트 충전" />
      <div className="page-content-body">
        {err && (
          <div className="sec">
            <div style={{ padding: 12, borderRadius: 10, background: 'var(--err2)', color: 'var(--err)', fontSize: 13 }}>{err}</div>
          </div>
        )}

        {pointBanner && (
          <div className="sec">
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                background: 'var(--ok2)',
                border: '1px solid rgba(11,171,100,0.25)',
                color: 'var(--navy)',
                fontSize: 14,
              }}
            >
              <div style={{ fontWeight: 800, color: 'var(--ok)', marginBottom: 8 }}>결제 성공 · 적용 완료</div>
              <p style={{ margin: 0, lineHeight: 1.6 }}>
                <strong>{fmtKrw(pointBanner.pointsAdded)}P</strong>가 충전되었습니다.
                {pointBanner.newBalance != null && (
                  <>
                    {' '}
                    현재 잔액 <strong>{fmtKrw(pointBanner.newBalance)}P</strong>입니다.
                  </>
                )}
              </p>
              {pointBanner.orderId && (
                <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--slate2)' }}>주문번호: {pointBanner.orderId}</p>
              )}
              <button
                type="button"
                className="btn-secondary"
                style={{ marginTop: 12 }}
                onClick={() => setPointBanner(null)}
              >
                닫기
              </button>
            </div>
          </div>
        )}

        <div className="sec">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--slate2)', margin: 0 }}>최근 결제부터 표시됩니다.</p>
            <Link to="/billing" style={{ fontSize: 13, fontWeight: 700, color: 'var(--acc)', textDecoration: 'none' }}>
              ← 이용요금관리
            </Link>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <p style={{ padding: 24, color: 'var(--slate2)', fontSize: 13 }}>불러오는 중…</p>
            ) : rows.length === 0 ? (
              <p style={{ padding: 24, color: 'var(--slate2)', fontSize: 13 }}>아직 결제 이력이 없습니다.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg2)', textAlign: 'left', color: 'var(--slate2)' }}>
                      <th style={{ padding: '12px 14px', fontWeight: 600 }}>일시</th>
                      <th style={{ padding: '12px 10px', fontWeight: 600 }}>구분</th>
                      <th style={{ padding: '12px 10px', fontWeight: 600 }}>금액</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600, minWidth: 200 }}>내용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 14px', color: 'var(--navy)', whiteSpace: 'nowrap' }}>
                          {r.paidAt.replace('T', ' ').slice(0, 16)}
                        </td>
                        <td style={{ padding: '12px 10px', color: 'var(--slate)' }}>{typeLabel(r.paymentType)}</td>
                        <td style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--navy)' }}>
                          {fmtKrw(r.amountKrw)}원
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--slate)', lineHeight: 1.45 }}>
                          {r.summary}
                          {r.orderId && (
                            <span style={{ display: 'block', fontSize: 11, color: 'var(--slate3)', marginTop: 4 }}>
                              주문 {r.orderId}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      <Toast toastRef={toastRef} />
    </>
  )
}
