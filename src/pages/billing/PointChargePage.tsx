// 포인트 충전 — 토스페이먼츠 결제위젯 연동 (5,000 / 10,000 / 20,000 / 30,000원 선택)
import { loadTossPayments } from '@tosspayments/tosspayments-sdk'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import client from '../../api/client'
import { TopBar } from '../../components/common'
import { fmtKrw } from '../../config/pricingPlans'
import { useBillingAccessStore } from '../../store/billingAccessStore'

interface BillingSummary {
  smsPoints: number
}

/** 결제 금액(원, VAT 포함) = 적립 포인트(P) 1:1 */
const CHARGE_AMOUNTS_KRW = [5_000, 10_000, 20_000, 30_000] as const

/** 결제위젯 SDK는 위젯 연동 클라이언트 키(test_gck_...)만 지원. API 개별 키(test_ck_...)는 사용 불가. */
function pointChargeWidgetClientKey(): string | undefined {
  const widget = (import.meta.env.VITE_TOSS_PAYMENTS_WIDGET_CLIENT_KEY as string | undefined)?.trim()
  if (widget) return widget
  const legacy = (import.meta.env.VITE_TOSS_PAYMENTS_CLIENT_KEY as string | undefined)?.trim()
  if (legacy?.includes('gck')) return legacy
  return undefined
}

export default function PointChargePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [selectedKrw, setSelectedKrw] = useState<number>(CHARGE_AMOUNTS_KRW[0])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [smsPoints, setSmsPoints] = useState<number>(0)
  const processingRef = useRef(false)
  const tossWidgetClientKey = pointChargeWidgetClientKey()
  const customerKeyRef = useRef<string>(`academy-admin-${Date.now()}`)
  const widgetsRef = useRef<any>(null)
  const [widgetOpen, setWidgetOpen] = useState(false)
  const [widgetReady, setWidgetReady] = useState(false)
  const [widgetRenderKey, setWidgetRenderKey] = useState(0)
  const [widgetPayload, setWidgetPayload] = useState<{
    amount: number
    orderId: string
    orderName: string
    successUrl: string
    failUrl: string
  } | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await client.get('/admin/billing')
        const data = res.data as { data?: BillingSummary }
        if (data.data) setSmsPoints(data.data.smsPoints ?? 0)
      } catch {
        // 잔액 표시 실패해도 충전 기능은 진행 가능
      }
    })()
  }, [])

  const finalizeCharge = async (chargedPoints: number, orderId?: string | null) => {
    setBusy(true)
    try {
      const res = await client.post('/admin/billing/points/charge', {
        points: chargedPoints,
        orderId: orderId || undefined,
      })
      const summary = (res.data as { data: BillingSummary }).data
      void useBillingAccessStore.getState().refresh()
      navigate('/billing/payments', {
        replace: true,
        state: {
          paymentNotice: {
            type: 'points' as const,
            pointsAdded: chargedPoints,
            newBalance: summary.smsPoints,
            orderId: orderId ?? undefined,
          },
        },
      })
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } }
      setErr(ax.response?.data?.message ?? '포인트 충전에 실패했습니다.')
      setBusy(false)
    }
  }

  const submit = async () => {
    const n = selectedKrw
    if (!tossWidgetClientKey) {
      const msg =
        '포인트 결제(결제위젯)에는 위젯 연동 클라이언트 키가 필요합니다. '
        + '환경변수 VITE_TOSS_PAYMENTS_WIDGET_CLIENT_KEY에 test_gck_로 시작하는 키를 설정해 주세요. '
        + '(API 개별 연동 키 test_ck_는 결제위젯에서 지원하지 않습니다.)'
      setErr(msg)
      window.alert(msg)
      return
    }

    setErr('')
    try {
      setBusy(true)
      const orderId = `POINT-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      const orderName = `하이아카데미 포인트 ${fmtKrw(n)}원`
      const successUrl = `${window.location.origin}/billing/charge?toss=success&amount=${n}&orderId=${encodeURIComponent(orderId)}`
      const failUrl = `${window.location.origin}/billing/charge?toss=fail`

      /** 카드 결제창 직호출 없이 항상 결제위젯(토스페이먼츠 UI)에서 진행 */
      setWidgetPayload({ amount: n, orderId, orderName, successUrl, failUrl })
      setWidgetRenderKey((v) => v + 1)
      setWidgetReady(false)
      setWidgetOpen(true)
    } catch (e: unknown) {
      const ex = e as { message?: string }
      const msg = ex?.message ?? '결제 준비 중 문제가 발생했습니다.'
      setErr(msg)
      window.alert(msg)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!widgetOpen || !widgetPayload || !tossWidgetClientKey) return
    let cancelled = false

    void (async () => {
      try {
        const tossPayments = await loadTossPayments(tossWidgetClientKey)
        const widgets = tossPayments.widgets({ customerKey: customerKeyRef.current })
        widgetsRef.current = widgets
        await widgets.setAmount({ currency: 'KRW', value: widgetPayload.amount })
        await widgets.renderPaymentMethods({ selector: `#point-widget-methods-${widgetRenderKey}` })
        await widgets.renderAgreement({ selector: `#point-widget-agreement-${widgetRenderKey}` })
        if (!cancelled) setWidgetReady(true)
      } catch (e: unknown) {
        const ex = e as { message?: string }
        const msg = ex?.message ?? '결제 위젯을 불러오지 못했습니다.'
        setErr(msg)
        window.alert(msg)
        setWidgetOpen(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [widgetOpen, widgetPayload, widgetRenderKey, tossWidgetClientKey])

  const requestWidgetPayment = async () => {
    if (!widgetPayload || !widgetsRef.current) return
    try {
      setBusy(true)
      await widgetsRef.current.requestPayment({
        orderId: widgetPayload.orderId,
        orderName: widgetPayload.orderName,
        successUrl: widgetPayload.successUrl,
        failUrl: widgetPayload.failUrl,
        customerName: '학원 관리자',
      })
    } catch (e: unknown) {
      const ex = e as { message?: string }
      const msg = ex?.message ?? '위젯 결제 요청에 실패했습니다.'
      setErr(msg)
      window.alert(msg)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const tossState = searchParams.get('toss')
    if (!tossState || processingRef.current) return
    if (tossState === 'fail') {
      const message = searchParams.get('message') || '결제가 취소되었거나 실패했습니다.'
      setErr(message)
      return
    }
    if (tossState !== 'success') return

    const amountRaw = searchParams.get('amount')
    const amount = amountRaw ? Number(amountRaw) : NaN
    if (!Number.isFinite(amount) || amount <= 0) {
      setErr('결제 성공 정보를 확인할 수 없어 포인트 적립을 진행하지 못했습니다.')
      return
    }
    processingRef.current = true
    void finalizeCharge(amount, searchParams.get('orderId'))
  }, [searchParams])

  return (
    <>
      <TopBar title="포인트 충전하기" sub="온라인 결제 · VAT 포함" />
      <div className="page-content-body">
        {err && (
          <div className="sec">
            <div style={{ padding: 12, borderRadius: 10, background: 'var(--err2)', color: 'var(--err)', fontSize: 13 }}>
              {err}
            </div>
          </div>
        )}

        <div className="sec">
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>현재 잔액</div>
            <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--acc)', marginBottom: 4 }}>
              {smsPoints} <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate2)' }}>P</span>
            </p>
            <p style={{ fontSize: 12, color: 'var(--slate2)' }}>
              충전 금액(VAT 포함)을 선택한 뒤 결제를 진행합니다. (결제 원화와 동일 수치가 포인트로 적립됩니다.)
            </p>
          </div>
        </div>

        <div className="sec">
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>충전 금액 선택</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 10,
                marginBottom: 16,
              }}
              className="point-charge-amounts"
            >
              {CHARGE_AMOUNTS_KRW.map((krw) => {
                const sel = selectedKrw === krw
                return (
                  <button
                    key={krw}
                    type="button"
                    disabled={busy}
                    onClick={() => setSelectedKrw(krw)}
                    style={{
                      padding: '16px 12px',
                      borderRadius: 14,
                      border: sel ? '2px solid var(--acc)' : '1px solid var(--border)',
                      background: sel ? 'rgba(108,99,255,.08)' : 'var(--bg2)',
                      cursor: busy ? 'not-allowed' : 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)' }}>{fmtKrw(krw)}원</div>
                    <div style={{ fontSize: 11, color: 'var(--slate2)', marginTop: 4 }}>{fmtKrw(krw)}P 적립 · VAT 포함</div>
                  </button>
                )
              })}
            </div>

            <button type="button" className="btn-primary" style={{ width: '100%', padding: '14px 16px', fontSize: 15, fontWeight: 700 }} disabled={busy} onClick={() => void submit()}>
              {busy ? '처리 중…' : `${fmtKrw(selectedKrw)}원 결제하기`}
            </button>
            <p style={{ fontSize: 11, color: 'var(--slate3)', marginTop: 10 }}>
              위젯에서 결제 수단을 선택한 뒤 「결제하기」로 진행합니다. 완료 후 이 페이지로 돌아오면 포인트가 적립됩니다.
            </p>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 520px) {
          .point-charge-amounts { grid-template-columns: 1fr !important; }
        }
      `}</style>
      {widgetOpen && widgetPayload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: 'min(680px, 92vw)', maxHeight: '85vh', overflow: 'auto', padding: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)', marginBottom: 10 }}>결제하기</div>
            <div id={`point-widget-methods-${widgetRenderKey}`} />
            <div id={`point-widget-agreement-${widgetRenderKey}`} style={{ marginTop: 12 }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button type="button" className="btn-secondary" onClick={() => setWidgetOpen(false)} disabled={busy}>닫기</button>
              <button type="button" className="btn-primary" onClick={() => void requestWidgetPayment()} disabled={!widgetReady || busy}>
                {busy ? '처리 중…' : '결제하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
