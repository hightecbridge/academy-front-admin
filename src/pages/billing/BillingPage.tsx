// 이용요금관리 — 체험 · 구독(요금제 선택) · 하이아카데미 포인트
import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TopBar } from '../../components/common'
import client from '../../api/client'
import {
  PLANS,
  fmtKrw,
  priceKrwPerMonth,
  type PlanId,
  type BillingMode,
} from '@shared/pricingPlans'

interface BillingSummary {
  trialEndsAt: string | null
  trialDaysRemaining: number
  trialActive: boolean
  paymentRequired: boolean
  billingStatus: string
  smsPoints: number
  monthlyPriceKrw: number
  selectedPlanId?: string | null
  selectedBillingCycle?: string | null
}

function isPlanId(s: string | null | undefined): s is PlanId {
  return s === 'starter' || s === 'standard' || s === 'premium'
}

export default function BillingPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<BillingSummary | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<BillingMode>('m')
  const [planId, setPlanId] = useState<PlanId>('standard')

  const load = useCallback(async () => {
    setErr('')
    try {
      const res = await client.get('/admin/billing')
      setData((res.data as { data: BillingSummary }).data)
    } catch {
      setErr('요금 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!data) return
    const sid = data.selectedPlanId
    if (isPlanId(sid)) setPlanId(sid)
    const bc = data.selectedBillingCycle
    if (bc === 'YEARLY') setMode('y')
    else if (bc === 'MONTHLY') setMode('m')
  }, [data])

  const subscribe = async () => {
    const plan = PLANS.find((p) => p.id === planId)
    const label = plan?.name ?? planId
    const amt = priceKrwPerMonth(planId, mode)
    if (
      !window.confirm(
        `${label} · ${mode === 'm' ? '월간' : '연간(월 환산)'} 결제로 진행합니다.\n월 ${fmtKrw(amt)}원 (부가세 별도)\n\nPG 연동 전에는 구독·요금제만 저장됩니다.`,
      )
    ) {
      return
    }
    setBusy(true)
    setErr('')
    try {
      const res = await client.post('/admin/billing/subscribe', {
        planId,
        billingCycle: mode === 'm' ? 'MONTHLY' : 'YEARLY',
      })
      setData((res.data as { data: BillingSummary }).data)
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } }
      setErr(ax.response?.data?.message ?? '처리에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <>
        <TopBar title="이용요금관리" sub="로딩 중…" />
        <div className="page-content-body"><p style={{ padding: 24 }}>불러오는 중…</p></div>
      </>
    )
  }

  const previewKrw = priceKrwPerMonth(planId, mode)

  return (
    <>
      <TopBar title="이용요금관리" sub="체험 · 구독 · 하이아카데미 포인트" />
      <div className="page-content-body">
        {err && (
          <div className="sec">
            <div style={{ padding: 12, borderRadius: 10, background: 'var(--err2)', color: 'var(--err)', fontSize: 13 }}>{err}</div>
          </div>
        )}

        <div className="sec">
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 10 }}>구독 · 결제 상태</div>
            <p style={{ fontSize: 13, color: 'var(--slate2)', marginBottom: 8 }}>
              선택 요금제:{' '}
              <strong style={{ color: 'var(--navy)' }}>
                {PLANS.find((p) => p.id === planId)?.name ?? '스탠다드'}
              </strong>
              {' · '}
              <strong style={{ color: 'var(--navy)' }}>{mode === 'm' ? '월간 결제' : '연간 결제'}</strong>
            </p>
            {data?.billingStatus === 'ACTIVE' && (
              <p style={{ fontSize: 14, color: 'var(--ok)' }}>이용 중 · 정상 결제됨</p>
            )}
            {data?.trialActive && (
              <p style={{ fontSize: 14, color: 'var(--navy)' }}>
                무료 체험 남은 기간: <strong>{data.trialDaysRemaining}</strong>일
                {data.trialEndsAt && (
                  <span style={{ color: 'var(--slate2)', fontSize: 12 }}> (종료: {data.trialEndsAt.replace('T', ' ').slice(0, 16)})</span>
                )}
              </p>
            )}
            {data?.paymentRequired && (
              <p style={{ fontSize: 14, color: 'var(--err)', marginTop: 10 }}>체험이 종료되어 결제가 필요합니다. 아래에서 요금제를 선택한 뒤 구독 결제를 진행해 주세요.</p>
            )}
            {!data?.paymentRequired && data?.billingStatus === 'TRIAL' && data?.trialActive && (
              <p style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 8 }}>체험 중에도 요금제를 선택해 두고 결제할 수 있습니다.</p>
            )}
          </div>
        </div>

        <div className="sec">
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>하이아카데미 포인트</div>
            <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--acc)', marginBottom: 4 }}>{data?.smsPoints ?? 0} <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate2)' }}>P</span></p>
            <p style={{ fontSize: 12, color: 'var(--slate2)' }}>서비스 이용 시 포인트가 차감될 수 있습니다.</p>
            <button
              type="button"
              className="btn-primary"
              style={{ marginTop: 12 }}
              onClick={() => navigate('/billing/charge')}
            >
              포인트 충전하기
            </button>
            <div style={{ marginTop: 10 }}>
              <Link to="/message" style={{ fontSize: 12, fontWeight: 700, color: 'var(--acc)', textDecoration: 'none' }}>
                포인트 사용이력보기 →
              </Link>
            </div>
          </div>
        </div>

        <div className="sec">
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>요금제 선택</div>
            <p style={{ fontSize: 12, color: 'var(--slate2)', marginBottom: 14 }}>랜딩 페이지와 동일한 요금입니다. 월간 / 연간(20% 할인)을 선택한 뒤 플랜을 고르세요.</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg2)', borderRadius: 999, padding: 5, marginBottom: 16, border: '1px solid var(--border)' }}>
              {(
                [
                  ['m', '월간 결제'],
                  ['y', '연간 결제'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key as BillingMode)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: mode === key ? '#fff' : 'transparent',
                    color: mode === key ? 'var(--navy)' : 'var(--slate2)',
                    boxShadow: mode === key ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                  }}
                >
                  {label}
                  {key === 'y' && <span style={{ color: '#B45309', fontSize: 10, marginLeft: 4 }}>20% 할인</span>}
                </button>
              ))}
            </div>

            <div className="billing-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
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
                      padding: 14,
                      borderRadius: 14,
                      border: selected ? '2px solid var(--acc)' : '1px solid var(--border)',
                      background: selected ? 'rgba(108,99,255,.06)' : 'var(--bg2)',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                  >
                    {plan.popular && (
                      <div style={{ position: 'absolute', top: -8, right: 8, fontSize: 10, fontWeight: 700, color: 'var(--acc)' }}>인기</div>
                    )}
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{plan.name}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', lineHeight: 1.2 }}>
                      {fmtKrw(price)}<span style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate2)' }}>원</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--slate3)', marginBottom: 8 }}>/ 월 · 부가세 별도</div>
                    <div style={{ fontSize: 12, color: 'var(--slate)', lineHeight: 1.45, minHeight: 36 }}>{plan.desc}</div>
                  </button>
                )
              })}
            </div>

            <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: 'var(--g1)', fontSize: 13, color: 'var(--navy)' }}>
              선택 요약: <strong>{PLANS.find((p) => p.id === planId)?.name}</strong> · {mode === 'm' ? '월간' : '연간(월 환산)'} · 월{' '}
              <strong style={{ color: 'var(--acc)' }}>{fmtKrw(previewKrw)}원</strong>
              {data?.monthlyPriceKrw != null && data.billingStatus === 'ACTIVE' && (
                <span style={{ color: 'var(--slate2)', fontSize: 12, marginLeft: 8 }}>(현재 적용: 월 {fmtKrw(data.monthlyPriceKrw)}원)</span>
              )}
            </div>

            <button type="button" className="btn-primary" style={{ width: '100%', marginTop: 16, padding: '14px 16px', fontSize: 15, fontWeight: 700 }} disabled={busy} onClick={() => void subscribe()}>
              {busy ? '처리 중…' : '구독 결제하기'}
            </button>
            <p style={{ fontSize: 11, color: 'var(--slate3)', marginTop: 10 }}>PG 연동 전까지는 버튼 클릭 시 선택 요금제가 저장되고 구독이 활성화됩니다.</p>
          </div>
        </div>

      </div>
      <style>{`
        @media (max-width: 900px) {
          .billing-pricing-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
