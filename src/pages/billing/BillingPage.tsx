import { loadTossPayments } from '@tosspayments/tosspayments-sdk'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { TopBar, Toast, useToast } from '../../components/common'
import client from '../../api/client'
import { PLANS, fmtKrw, krwWithVat10, priceKrwPerMonth, type BillingMode, type PlanId } from '../../config/pricingPlans'
import { useBillingAccessStore } from '../../store/billingAccessStore'

interface BillingSummary {
  trialEndsAt: string | null
  trialDaysRemaining: number
  trialActive: boolean
  subscriptionEndsAt: string | null
  subscriptionDaysRemaining: number
  paymentRequired: boolean
  billingStatus: string
  smsPoints: number
  billingPlanId?: string | null
  studentCount: number
  studentLimit: number
  selectedPlanId?: string | null
  selectedBillingCycle?: string | null
  smsCostGeneral?: number
  smsCostKakaoAlimtalk?: number
  smsCostSms?: number
  smsCostLms?: number
  smsCostMms?: number
}

type SubscribeNotice = {
  planName: string
  cycle: string
  amountKrw?: number
  subscriptionEndsAt?: string | null
  orderId?: string
}

function isPlanId(v: string | null | undefined): v is PlanId {
  return v === 'standard' || v === 'premium' || v === 'enterprise'
}

export default function BillingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { ref: toastRef, show: showToast } = useToast()
  const [notice, setNotice] = useState<SubscribeNotice | null>(null)
  const [data, setData] = useState<BillingSummary | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<BillingMode>('m')
  const [planId, setPlanId] = useState<PlanId>('standard')
  const processingRef = useRef(false)
  const customerKeyRef = useRef<string>(`academy-admin-subscription-${Date.now()}`)
  const tossClientKey = import.meta.env.VITE_TOSS_PAYMENTS_CLIENT_KEY as string | undefined
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

  const load = useCallback(async () => {
    setErr('')
    try {
      const billingRes = await client.get('/admin/billing')
      const billingData = (billingRes.data as { data: BillingSummary }).data
      setData(billingData)
      void useBillingAccessStore.getState().refresh()
    } catch {
      setErr('요금 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!data) return
    const sid = data.billingPlanId ?? data.selectedPlanId
    if (isPlanId(sid)) setPlanId(sid)
    const bc = data.selectedBillingCycle
    if (bc === 'YEARLY') setMode('y')
    else if (bc === 'MONTHLY') setMode('m')
  }, [data])

  const finalizeSubscribe = async (selectedPlanId: PlanId, selectedMode: BillingMode, paidAmountKrw?: number, orderId?: string) => {
    setBusy(true)
    setErr('')
    try {
      const res = await client.post('/admin/billing/subscribe', {
        planId: selectedPlanId,
        billingCycle: selectedMode === 'm' ? 'MONTHLY' : 'YEARLY',
        paidAmountKrw,
        orderId,
      })
      const summary = (res.data as { data: BillingSummary }).data
      setData(summary)
      void useBillingAccessStore.getState().refresh()
      setPlanId(selectedPlanId)
      setMode(selectedMode)
      setNotice({
        planName: PLANS.find((p) => p.id === selectedPlanId)?.name ?? '요금제',
        cycle: selectedMode === 'm' ? '월간' : '연간',
        amountKrw: paidAmountKrw,
        subscriptionEndsAt: summary.subscriptionEndsAt,
        orderId,
      })
      showToast('구독 결제가 완료되었습니다.')
      navigate('/billing', { replace: true })
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } }
      setErr(ax.response?.data?.message ?? '구독 결제 반영에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const subscribe = async () => {
    const plan = PLANS.find((p) => p.id === planId)
    const label = plan?.name ?? planId
    const supply = mode === 'm' ? priceKrwPerMonth(planId, mode) : priceKrwPerMonth(planId, mode) * 12
    const amount = krwWithVat10(supply)
    if (!window.confirm(`${label} ${mode === 'm' ? '월간' : '연간'} 결제로 진행합니다.\n실 결제 금액 ${fmtKrw(amount)}원 (부가세 포함)`)) return

    if (!tossClientKey) {
      const msg = '토스 결제 키가 설정되지 않았습니다.'
      setErr(msg)
      window.alert(msg)
      return
    }

    setBusy(true)
    setErr('')
    try {
      const orderId = `SUB-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      const billingCycle = mode === 'm' ? 'MONTHLY' : 'YEARLY'
      const orderName = `하이아카데미 ${label} ${mode === 'm' ? '월간' : '연간'} 구독`
      const successUrl = `${window.location.origin}/billing?toss=success&planId=${planId}&billingCycle=${billingCycle}&amount=${amount}&orderId=${encodeURIComponent(orderId)}`
      const failUrl = `${window.location.origin}/billing?toss=fail`

      if (tossClientKey.includes('_gck_')) {
        setWidgetPayload({ amount, orderId, orderName, successUrl, failUrl })
        setWidgetRenderKey((v) => v + 1)
        setWidgetReady(false)
        setWidgetOpen(true)
        return
      }

      const tossPayments = await loadTossPayments(tossClientKey)
      const payment = tossPayments.payment({ customerKey: customerKeyRef.current })
      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: amount },
        orderId,
        orderName,
        successUrl,
        failUrl,
        customerName: '학원 관리자',
        windowTarget: 'self',
      })
    } catch (e: unknown) {
      const ex = e as { message?: string }
      setErr(ex.message ?? '결제창 실행 중 오류가 발생했습니다.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!widgetOpen || !widgetPayload || !tossClientKey?.includes('_gck_')) return
    let cancelled = false
    void (async () => {
      try {
        const tossPayments = await loadTossPayments(tossClientKey)
        const widgets = tossPayments.widgets({ customerKey: customerKeyRef.current })
        widgetsRef.current = widgets
        await widgets.setAmount({ currency: 'KRW', value: widgetPayload.amount })
        await widgets.renderPaymentMethods({ selector: `#billing-widget-methods-${widgetRenderKey}` })
        await widgets.renderAgreement({ selector: `#billing-widget-agreement-${widgetRenderKey}` })
        if (!cancelled) setWidgetReady(true)
      } catch (e: unknown) {
        const ex = e as { message?: string }
        setErr(ex.message ?? '결제 위젯을 불러오지 못했습니다.')
        setWidgetOpen(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [widgetOpen, widgetPayload, widgetRenderKey, tossClientKey])

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
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const toss = searchParams.get('toss')
    if (!toss || processingRef.current) return
    if (toss === 'fail') {
      setErr(searchParams.get('message') || '결제가 취소되었거나 실패했습니다.')
      return
    }
    if (toss !== 'success') return
    const selectedPlan = searchParams.get('planId')
    const cycle = searchParams.get('billingCycle')
    const amountRaw = searchParams.get('amount')
    const orderId = searchParams.get('orderId') || undefined
    const paid = amountRaw ? Number(amountRaw) : NaN
    const paidAmountKrw = Number.isFinite(paid) && paid > 0 ? paid : undefined
    const nextPlan: PlanId = isPlanId(selectedPlan) ? selectedPlan : planId
    const nextMode: BillingMode = cycle === 'YEARLY' ? 'y' : 'm'
    processingRef.current = true
    void finalizeSubscribe(nextPlan, nextMode, paidAmountKrw, orderId)
  }, [searchParams, planId])

  if (loading) {
    return (
      <>
        <TopBar title="이용요금관리" sub="로딩 중…" />
        <div className="page-content-body"><p style={{ padding: 24 }}>불러오는 중…</p></div>
      </>
    )
  }

  const preview = priceKrwPerMonth(planId, mode)
  const actual = krwWithVat10(mode === 'm' ? preview : preview * 12)
  return (
    <>
      <TopBar title="이용요금관리" sub="체험 · 구독 · 하이아카데미 포인트" />
      <div className="page-content-body">
        {err && <div className="sec"><div style={{ padding: 12, borderRadius: 10, background: 'var(--err2)', color: 'var(--err)' }}>{err}</div></div>}

        {notice && (
          <div className="sec">
            <div style={{ padding: 16, borderRadius: 12, background: 'var(--ok2)', border: '1px solid rgba(11,171,100,.25)' }}>
              <div style={{ fontWeight: 800, color: 'var(--ok)', marginBottom: 8 }}>결제 성공 · 구독 반영 완료</div>
              <div style={{ fontSize: 14 }}>요금제: <strong>{notice.planName}</strong> · <strong>{notice.cycle}</strong></div>
              {notice.amountKrw != null && <div style={{ fontSize: 14, marginTop: 4 }}>결제 금액: <strong>{fmtKrw(notice.amountKrw)}원</strong></div>}
              {notice.subscriptionEndsAt && <div style={{ fontSize: 14, marginTop: 4 }}>이용 만료: <strong>{notice.subscriptionEndsAt.replace('T', ' ').slice(0, 16)}</strong></div>}
            </div>
          </div>
        )}

        <div className="sec">
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>구독 상태</div>
            <div style={{ color: 'var(--slate2)', fontSize: 13 }}>요금제: {PLANS.find((p) => p.id === planId)?.name}</div>
            <div style={{ color: 'var(--slate2)', fontSize: 13, marginTop: 4 }}>학생 수: {data?.studentCount ?? 0}{data?.studentLimit && data.studentLimit > 0 ? ` / ${data.studentLimit}` : ' (무제한)'}</div>
            {data?.subscriptionEndsAt && <div style={{ color: 'var(--slate2)', fontSize: 13, marginTop: 4 }}>이용 만료: {data.subscriptionEndsAt.replace('T', ' ').slice(0, 16)}</div>}
          </div>
        </div>

        <div className="sec">
          <div className="card" style={{ padding: 16 }}>
            <div className="row" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700, color: 'var(--navy)' }}>포인트 현황</div>
              <Link to="/billing/point-deductions" style={{ fontSize: 12, fontWeight: 700, color: 'var(--acc)', textDecoration: 'none' }}>
                포인트 차감 이력 보기 →
              </Link>
            </div>
            <div style={{ fontSize: 14, color: 'var(--slate2)' }}>
              현재 잔여 포인트: <strong style={{ color: 'var(--navy)' }}>{fmtKrw(data?.smsPoints ?? 0)}P</strong>
            </div>
          </div>
        </div>

        <div className="sec">
          <div
            className="card"
            style={{
              padding: 20,
              background: 'linear-gradient(135deg, #111827, #312e81)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,.12)',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6, color: 'rgba(255,255,255,.7)', fontSize: 12 }}>요금제 선택</div>
            <div style={{ display: 'inline-flex', gap: 8, background: 'rgba(255,255,255,.08)', borderRadius: 999, padding: 5, border: '1px solid rgba(255,255,255,.15)' }}>
              <button type="button" onClick={() => setMode('m')} style={{ padding: '7px 16px', borderRadius: 999, border: 'none', background: mode === 'm' ? '#fff' : 'transparent' }}>월간</button>
              <button type="button" onClick={() => setMode('y')} style={{ padding: '7px 16px', borderRadius: 999, border: 'none', background: mode === 'y' ? '#fff' : 'transparent' }}>연간</button>
            </div>
            <div className="billing-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 14 }}>
              {PLANS.map((plan) => {
                const selected = plan.id === planId
                const price = mode === 'm' ? plan.priceM : plan.priceY
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setPlanId(plan.id)}
                    style={{
                      textAlign: 'left',
                      padding: 18,
                      borderRadius: 16,
                      border: selected ? '1px solid rgba(167,139,250,.9)' : '1px solid rgba(255,255,255,.18)',
                      background: selected ? 'rgba(108,99,255,.20)' : 'rgba(255,255,255,.05)',
                      color: '#fff',
                      position: 'relative',
                      transform: selected ? 'translateY(-2px)' : 'none',
                      boxShadow: selected ? '0 8px 24px rgba(108,99,255,.35)' : 'none',
                    }}
                  >
                    {plan.popular && (
                      <div
                        style={{
                          position: 'absolute',
                          top: -10,
                          right: 10,
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#fff',
                          background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
                          padding: '4px 8px',
                          borderRadius: 999,
                        }}
                      >
                        인기
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.72)', marginBottom: 8 }}>{plan.name}</div>
                    <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, marginBottom: 6 }}>
                      {fmtKrw(price)}
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,.72)' }}>원</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginBottom: 10 }}>/ 월 · 부가세 별도</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.78)', lineHeight: 1.5 }}>{plan.desc}</div>
                  </button>
                )
              })}
            </div>
            <div
              style={{
                marginTop: 14,
                fontSize: 13,
                padding: 12,
                borderRadius: 10,
                background: 'rgba(255,255,255,.08)',
                border: '1px solid rgba(255,255,255,.12)',
                color: 'rgba(255,255,255,.9)',
              }}
            >
              실 결제 금액(부가세 포함): <strong style={{ color: '#C4B5FD' }}>{fmtKrw(actual)}원</strong>
            </div>
            <button type="button" className="btn-primary" style={{ width: '100%', marginTop: 14 }} disabled={busy} onClick={() => void subscribe()}>
              {busy ? '처리 중…' : '구독 결제하기'}
            </button>
            <div style={{ marginTop: 10, display: 'flex', gap: 12 }}>
              <Link to="/billing/charge" style={{ fontSize: 12, fontWeight: 700, color: 'var(--acc)', textDecoration: 'none' }}>포인트 충전하기 →</Link>
              <Link to="/billing/payments" style={{ fontSize: 12, fontWeight: 700, color: 'var(--acc)', textDecoration: 'none' }}>결제 이력 보기 →</Link>
              <Link to="/billing/point-deductions" style={{ fontSize: 12, fontWeight: 700, color: 'var(--acc)', textDecoration: 'none' }}>포인트 차감 이력 보기 →</Link>
            </div>
          </div>
        </div>
      </div>

      {widgetOpen && widgetPayload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: 'min(680px, 92vw)', maxHeight: '85vh', overflow: 'auto', padding: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)', marginBottom: 10 }}>토스 테스트 결제 위젯</div>
            <div id={`billing-widget-methods-${widgetRenderKey}`} />
            <div id={`billing-widget-agreement-${widgetRenderKey}`} style={{ marginTop: 12 }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button type="button" className="btn-secondary" onClick={() => setWidgetOpen(false)} disabled={busy}>닫기</button>
              <button type="button" className="btn-primary" onClick={() => void requestWidgetPayment()} disabled={!widgetReady || busy}>
                {busy ? '처리 중…' : '위젯으로 결제하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@media (max-width: 900px) { .billing-pricing-grid { grid-template-columns: 1fr !important; } }`}</style>
      <Toast toastRef={toastRef} />
    </>
  )
}
