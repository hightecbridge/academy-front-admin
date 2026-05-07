import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { TopBar, Toast, useToast } from '../../components/common'
import client from '../../api/client'
import { PLANS, fmtKrw, priceKrwPerMonth, type PlanId } from '../../config/pricingPlans'
import { useBillingAccessStore } from '../../store/billingAccessStore'
import { useAuthStore } from '../../store/authStore'

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
  autoBillingEnabled?: boolean
  billingKeyIssuedAt?: string | null
}

type SubscribeNotice = {
  planName: string
  cycle: string
  amountKrw?: number
  subscriptionEndsAt?: string | null
  orderId?: string
}

type ResultPopup = {
  type: 'success' | 'error'
  message: string
}

type CardForm = {
  cardNumber: string
  cardExpirationYear: string
  cardExpirationMonth: string
  customerIdentityNumber: string
  cardPassword: string
}

function isPlanId(v: string | null | undefined): v is PlanId {
  return v === 'basic' || v === 'standard' || v === 'premium' || v === 'enterprise'
}

export default function BillingPage() {
  const { ref: toastRef, show: showToast } = useToast()
  const [notice, setNotice] = useState<SubscribeNotice | null>(null)
  const [data, setData] = useState<BillingSummary | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resultPopup, setResultPopup] = useState<ResultPopup | null>(null)
  const [showCardModal, setShowCardModal] = useState(false)
  const [planId, setPlanId] = useState<PlanId>('basic')
  const [card, setCard] = useState<CardForm>({
    cardNumber: '',
    cardExpirationYear: '',
    cardExpirationMonth: '',
    customerIdentityNumber: '',
    cardPassword: '',
  })
  const cardNumberRefs = useRef<Array<HTMLInputElement | null>>([])
  const user = useAuthStore((s) => s.user)

  const digitsOnly = (value: string, max: number) => value.replace(/\D/g, '').slice(0, max)
  const cardNumberChunks = (() => {
    const raw = digitsOnly(card.cardNumber, 16)
    const chunks = raw.match(/.{1,4}/g) ?? []
    return Array.from({ length: 4 }, (_, i) => chunks[i] ?? '')
  })()
  const updateCardNumberChunk = (index: number, inputValue: string) => {
    const clean = digitsOnly(inputValue, 4)
    const next = [...cardNumberChunks]
    next[index] = clean
    setCard((prev) => ({ ...prev, cardNumber: next.join('') }))
    if (clean.length === 4 && index < 3) {
      cardNumberRefs.current[index + 1]?.focus()
    }
  }
  const cardFormCompleted = () => {
    const cardNumber = card.cardNumber.replace(/\s+/g, '')
    return (
      /^\d{12,16}$/.test(cardNumber)
      && /^\d{2,4}$/.test(card.cardExpirationYear.trim())
      && /^\d{2}$/.test(card.cardExpirationMonth.trim())
      && /^\d{6}(\d{4})?$/.test(card.customerIdentityNumber.trim())
      && /^\d{2}$/.test(card.cardPassword.trim())
    )
  }
  const validateCardForm = (): string | null => {
    const cardNumber = card.cardNumber.replace(/\s+/g, '')
    if (!/^\d{12,16}$/.test(cardNumber)) {
      return '카드 번호를 숫자만 12~16자리로 입력해 주세요.'
    }
    if (!/^\d{2,4}$/.test(card.cardExpirationYear.trim())) {
      return '카드 유효 연도를 2~4자리로 입력해 주세요.'
    }
    if (!/^\d{2}$/.test(card.cardExpirationMonth.trim())) {
      return '카드 유효 월을 2자리(MM)로 입력해 주세요.'
    }
    if (!/^\d{6}(\d{4})?$/.test(card.customerIdentityNumber.trim())) {
      return '생년월일 6자리 또는 사업자번호 10자리를 입력해 주세요.'
    }
    if (!/^\d{2}$/.test(card.cardPassword.trim())) {
      return '카드 비밀번호 앞 2자리를 입력해 주세요.'
    }
    return null
  }
  const completeCardInput = () => {
    const errorMsg = validateCardForm()
    if (errorMsg) {
      setErr(errorMsg)
      showToast(errorMsg)
      return
    }
    showToast('카드 정보가 저장되었습니다.')
    setShowCardModal(false)
  }

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
  }, [data])

  const registeredPlanId: PlanId = isPlanId(data?.billingPlanId)
    ? data.billingPlanId
    : isPlanId(data?.selectedPlanId)
      ? data.selectedPlanId
      : planId
  const registeredPlanName = PLANS.find((p) => p.id === registeredPlanId)?.name ?? '요금제'
  const registeredMonthlyKrw = priceKrwPerMonth(registeredPlanId)
  const formatBillingDate = (iso: string | null | undefined) =>
    iso ? iso.replace('T', ' ').slice(0, 16) : ''

  const finalizeSubscribe = async (
    selectedPlanId: PlanId,
    paidAmountKrw?: number,
    orderId?: string,
    customerKey?: string,
  ) => {
    setBusy(true)
    setErr('')
    try {
      const res = customerKey
        ? await client.post('/admin/billing/subscribe/auto-register', {
            planId: selectedPlanId,
            customerKey,
            paidAmountKrw,
            orderId,
            cardNumber: card.cardNumber.replace(/\s+/g, ''),
            cardExpirationYear: card.cardExpirationYear.trim(),
            cardExpirationMonth: card.cardExpirationMonth.trim(),
            customerIdentityNumber: card.customerIdentityNumber.trim(),
            cardPassword: card.cardPassword.trim(),
            customerName: user?.name || '학원 관리자',
            customerEmail: user?.email ?? undefined,
          })
        : await client.post('/admin/billing/subscribe', {
            planId: selectedPlanId,
            billingCycle: 'MONTHLY',
            paidAmountKrw,
            orderId,
          })
      const summary = (res.data as { data: BillingSummary }).data
      setData(summary)
      void useBillingAccessStore.getState().refresh()
      setPlanId(selectedPlanId)
      setNotice({
        planName: PLANS.find((p) => p.id === selectedPlanId)?.name ?? '요금제',
        cycle: '월 정기결제',
        amountKrw: paidAmountKrw,
        subscriptionEndsAt: summary.subscriptionEndsAt,
        orderId,
      })
      const successMsg = customerKey ? '정기결제가 등록되었습니다.' : '구독 결제가 완료되었습니다.'
      showToast(successMsg)
      setResultPopup({ type: 'success', message: successMsg })
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } }
      const msg = ax.response?.data?.message ?? '구독 결제 반영에 실패했습니다.'
      setErr(msg)
      showToast(msg)
      setResultPopup({ type: 'error', message: msg })
    } finally {
      setBusy(false)
    }
  }

  const subscribe = async () => {
    const amount = priceKrwPerMonth(planId)
    const validationError = validateCardForm()
    const hasAnyCardInput = Boolean(
      card.cardNumber.trim()
      || card.cardExpirationYear.trim()
      || card.cardExpirationMonth.trim()
      || card.customerIdentityNumber.trim()
      || card.cardPassword.trim(),
    )
    if (validationError && !hasAnyCardInput) {
      const msg = '카드 정보를 먼저 입력해 주세요. "카드 정보 입력하기" 버튼에서 입력할 수 있습니다.'
      setErr(msg)
      showToast(msg)
      setShowCardModal(true)
      return
    }
    if (validationError) {
      setErr(validationError)
      showToast(validationError)
      setShowCardModal(true)
      return
    }

    const customerSeed = (user?.email ?? 'admin').replace(/[^a-zA-Z0-9@._=-]/g, '')
    const customerKey = `academy-${customerSeed}-${Date.now()}`
    const orderId = `SUB-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    void finalizeSubscribe(planId, amount, orderId, customerKey)
  }

  useEffect(() => {
    if (!showCardModal) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowCardModal(false)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        completeCardInput()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showCardModal, card, showToast])

  if (loading) {
    return (
      <>
        <TopBar title="이용요금관리" sub="로딩 중…" />
        <div className="page-content-body"><p style={{ padding: 24 }}>불러오는 중…</p></div>
      </>
    )
  }

  const actual = priceKrwPerMonth(planId)
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
            {data?.autoBillingEnabled && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 10,
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)', marginBottom: 8 }}>정기결제 등록 내용</div>
                <div style={{ color: 'var(--slate2)', fontSize: 13, lineHeight: 1.65 }}>
                  <div>요금제: <strong style={{ color: 'var(--navy)' }}>{registeredPlanName}</strong></div>
                  <div>결제 주기: <strong style={{ color: 'var(--navy)' }}>월 정기결제</strong> · VAT 포함</div>
                  <div>
                    월 정기결제 금액: <strong style={{ color: 'var(--navy)' }}>{fmtKrw(registeredMonthlyKrw)}원</strong>
                  </div>
                  {data.billingKeyIssuedAt && (
                    <div>카드·빌링 등록일: <strong style={{ color: 'var(--navy)' }}>{formatBillingDate(data.billingKeyIssuedAt)}</strong></div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="sec">
          <div className="card" style={{ padding: 16 }}>
            <div className="row" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700, color: 'var(--navy)' }}>포인트 현황</div>
              <Link
                to="/billing/charge"
                className="btn-primary"
                style={{ width: 'auto', marginTop: 0, padding: '8px 12px', fontSize: 12, textDecoration: 'none' }}
              >
                포인트 충전하기
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
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', marginBottom: 2 }}>정기결제 · VAT 포함</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginBottom: 2 }}>토스페이먼츠 빌링 API로 카드정보를 등록하고 즉시 1회 결제됩니다.</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginBottom: 2 }}>등록된 카드로 매월 자동으로 결제됩니다.</div>
            <div className="billing-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 14 }}>
              {PLANS.map((plan) => {
                const selected = plan.id === planId
                const price = plan.priceM
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
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginBottom: 10 }}>/ 월 · VAT 포함</div>
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
              정기결제 금액(VAT 포함): <strong style={{ color: '#C4B5FD' }}>{fmtKrw(actual)}원</strong>
            </div>
            <button
              type="button"
              onClick={() => setShowCardModal(true)}
              style={{
                width: '100%',
                marginTop: 12,
                borderRadius: 12,
                border: '1px solid rgba(196,181,253,.35)',
                background: 'rgba(196,181,253,.14)',
                color: '#E9D5FF',
                padding: '11px 12px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              카드 정보 입력하기
            </button>
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
              {cardFormCompleted() ? (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: 999,
                    background: 'rgba(16,185,129,.2)',
                    color: '#6EE7B7',
                    border: '1px solid rgba(110,231,183,.4)',
                  }}
                >
                  카드정보 입력됨
                </span>
              ) : (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: 999,
                    background: 'rgba(248,113,113,.16)',
                    color: '#FCA5A5',
                    border: '1px solid rgba(252,165,165,.4)',
                  }}
                >
                  카드정보 미입력
                </span>
              )}
            </div>
            <button type="button" className="btn-primary" style={{ width: '100%', marginTop: 14 }} disabled={busy} onClick={() => void subscribe()}>
              {busy ? '처리 중…' : '정기결제 등록'}
            </button>
          </div>
        </div>

        <div className="sec">
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--slate2)', marginBottom: 10 }}>이력 조회</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link to="/billing/payments" style={{ fontSize: 13, fontWeight: 700, color: 'var(--acc)', textDecoration: 'none' }}>
                결제 이력 보기 →
              </Link>
              <Link to="/billing/point-deductions" style={{ fontSize: 13, fontWeight: 700, color: 'var(--acc)', textDecoration: 'none' }}>
                포인트 차감 이력 보기 →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {showCardModal && (
        <div
          role="presentation"
          onClick={() => setShowCardModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, .46)',
            backdropFilter: 'blur(4px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 12,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="billing-card-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 'min(560px, 96vw)',
              maxHeight: 'calc(100dvh - 16px)',
              borderRadius: 24,
              border: '1px solid #E5EAF3',
              background: '#FFFFFF',
              boxShadow: '0 24px 70px rgba(15,23,42,.20)',
              color: '#1F2A37',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div className="billing-card-modal-head" style={{ padding: '20px 22px 12px', borderBottom: '1px solid #EEF2F7' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>카드 결제 정보</div>
              <div style={{ marginTop: 6, fontSize: 13, color: '#6B7280' }}>
                안전한 결제를 위해 카드 정보를 입력해 주세요.
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: '#9CA3AF' }}>
                ESC: 닫기 · Enter: 입력 완료
              </div>
            </div>
            <div className="billing-card-modal-body" style={{ padding: 22, display: 'grid', gap: 14 }}>
              <div
                className="billing-amount-box"
                style={{
                  borderRadius: 14,
                  border: '1px solid #DBEAFE',
                  background: 'linear-gradient(135deg, #EFF6FF, #F8FAFF)',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: 12, color: '#64748B' }}>결제 예정 금액</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#2563EB' }}>{fmtKrw(actual)}원</div>
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>카드 번호</div>
              <div
                className="card-number-grid"
                style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
              >
                {cardNumberChunks.map((chunk, idx) => (
                  <span key={`card-number-wrap-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <input
                      key={`card-number-${idx}`}
                      ref={(el) => { cardNumberRefs.current[idx] = el }}
                      value={chunk}
                      onChange={(e) => updateCardNumberChunk(idx, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !chunk && idx > 0) {
                          cardNumberRefs.current[idx - 1]?.focus()
                        }
                      }}
                      className="input"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="0000"
                      style={{
                        width: 72,
                        height: 46,
                        textAlign: 'center',
                        fontSize: 16,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        background: '#F9FAFB',
                        border: '1px solid #D1D5DB',
                        borderRadius: 12,
                        color: '#111827',
                      }}
                    />
                    {idx < 3 && <span style={{ color: '#9CA3AF', fontWeight: 700 }}>-</span>}
                  </span>
                ))}
              </div>

              <div className="billing-meta-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>유효기간</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '72px 72px', gap: 6 }}>
                    <input
                      value={card.cardExpirationMonth}
                      onChange={(e) => setCard((prev) => ({ ...prev, cardExpirationMonth: digitsOnly(e.target.value, 2) }))}
                      className="input"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="MM"
                      style={{ height: 44, background: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: 12, color: '#111827' }}
                    />
                    <input
                      value={card.cardExpirationYear}
                      onChange={(e) => setCard((prev) => ({ ...prev, cardExpirationYear: digitsOnly(e.target.value, 4) }))}
                      className="input"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="YY"
                      style={{ height: 44, background: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: 12, color: '#111827' }}
                    />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>비밀번호 앞 2자리</div>
                  <input
                    value={card.cardPassword}
                    onChange={(e) => setCard((prev) => ({ ...prev, cardPassword: digitsOnly(e.target.value, 2) }))}
                    className="input"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="••"
                    style={{ width: 72, height: 44, background: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: 12, color: '#111827' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>생년월일 6자리 또는 사업자번호 10자리</div>
                <input
                  value={card.customerIdentityNumber}
                  onChange={(e) => setCard((prev) => ({ ...prev, customerIdentityNumber: digitsOnly(e.target.value, 10) }))}
                  className="input"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="예: 900101 또는 1234567890"
                  style={{ width: 'min(220px, 100%)', height: 44, background: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: 12, color: '#111827' }}
                />
              </div>
            </div>
            <div className="billing-card-modal-foot" style={{ padding: 16, borderTop: '1px solid #EEF2F7', display: 'flex', gap: 10, background: '#FFFFFF' }}>
              <button
                type="button"
                onClick={() => setShowCardModal(false)}
                className="btn-line"
                style={{ flex: 1, marginTop: 0, height: 44, borderRadius: 12 }}
              >
                닫기
              </button>
              <button
                type="button"
                onClick={completeCardInput}
                className="btn-primary"
                style={{ flex: 1, marginTop: 0, height: 44, borderRadius: 12, background: '#3182F6' }}
              >
                입력 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {resultPopup && (
        <div
          role="presentation"
          onClick={() => setResultPopup(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(15,23,42,.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 360,
              borderRadius: 16,
              border: '1px solid #E5EAF3',
              background: '#FFFFFF',
              boxShadow: '0 16px 36px rgba(15,23,42,.22)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 16px 8px', fontWeight: 800, fontSize: 16, color: resultPopup.type === 'success' ? '#0F9F6E' : '#DC2626' }}>
              {resultPopup.type === 'success' ? '결제 성공' : '결제 실패'}
            </div>
            <div style={{ padding: '0 16px 14px', fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
              {resultPopup.message}
            </div>
            <div style={{ padding: 12, borderTop: '1px solid #EEF2F7', background: '#FAFBFF' }}>
              <button
                type="button"
                onClick={() => setResultPopup(null)}
                className="btn-primary"
                style={{ width: '100%', marginTop: 0, height: 40, borderRadius: 10 }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .billing-pricing-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .billing-card-modal { border-radius: 16px !important; }
          .billing-card-modal-head { padding: 14px 14px 10px !important; }
          .billing-card-modal-body { padding: 14px !important; gap: 10px !important; }
          .billing-card-modal-foot { padding: 12px !important; gap: 8px !important; }
          .card-number-grid { gap: 6px !important; }
          .card-number-grid input {
            height: 42px !important;
            font-size: 14px !important;
            letter-spacing: 0.03em !important;
            padding-left: 6px !important;
            padding-right: 6px !important;
          }
        }
        @media (max-height: 820px) {
          .billing-card-modal { max-height: calc(100dvh - 8px) !important; }
          .billing-card-modal-head { padding: 12px 14px 8px !important; }
          .billing-card-modal-head > div:nth-child(1) { font-size: 16px !important; }
          .billing-card-modal-head > div:nth-child(2) { margin-top: 4px !important; font-size: 12px !important; }
          .billing-card-modal-head > div:nth-child(3) { margin-top: 4px !important; font-size: 10px !important; }
          .billing-card-modal-body { padding: 12px 14px !important; gap: 8px !important; }
          .billing-card-modal-foot { padding: 10px 12px !important; }
          .card-number-grid { gap: 6px !important; }
          .card-number-grid input { height: 40px !important; font-size: 13px !important; }
        }
        @media (max-height: 760px) {
          .billing-card-modal { max-height: calc(100dvh - 4px) !important; border-radius: 14px !important; }
          .billing-card-modal-head { padding: 9px 12px 7px !important; }
          .billing-card-modal-head > div:nth-child(1) { font-size: 15px !important; }
          .billing-card-modal-head > div:nth-child(2) { margin-top: 3px !important; font-size: 11px !important; }
          .billing-card-modal-head > div:nth-child(3) { display: none !important; }
          .billing-card-modal-body { padding: 9px 12px !important; gap: 7px !important; }
          .billing-amount-box { padding: 8px 10px !important; border-radius: 10px !important; }
          .billing-amount-box > div:nth-child(1) { font-size: 11px !important; }
          .billing-amount-box > div:nth-child(2) { font-size: 14px !important; }
          .billing-meta-grid { gap: 8px !important; }
          .billing-card-modal-body input { height: 36px !important; font-size: 12px !important; border-radius: 10px !important; }
          .card-number-grid { gap: 5px !important; }
          .card-number-grid input { font-size: 12px !important; letter-spacing: 0.02em !important; }
          .billing-card-modal-foot { padding: 8px 10px !important; gap: 8px !important; }
          .billing-card-modal-foot button { height: 36px !important; font-size: 12px !important; border-radius: 10px !important; }
        }
      `}</style>
      <Toast toastRef={toastRef} />
    </>
  )
}
