// 이용요금관리 — 30일 체험 후 결제, 문자 포인트
import { useEffect, useState, useCallback } from 'react'
import { TopBar } from '../../components/common'
import client from '../../api/client'

interface BillingSummary {
  trialEndsAt: string | null
  trialDaysRemaining: number
  trialActive: boolean
  paymentRequired: boolean
  billingStatus: string
  smsPoints: number
  smsCostGeneral: number
  smsCostPaymentNudge: number
  monthlyPriceKrw: number
}

export default function BillingPage() {
  const [data, setData] = useState<BillingSummary | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [phone, setPhone] = useState('')

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

  const subscribe = async () => {
    if (!window.confirm('월 구독 결제를 진행합니다. (연동 전에는 즉시 활성화만 됩니다)')) return
    setBusy(true)
    try {
      const res = await client.post('/admin/billing/subscribe')
      setData((res.data as { data: BillingSummary }).data)
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } }
      setErr(ax.response?.data?.message ?? '처리에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const sendSms = async (type: 'GENERAL' | 'PAYMENT_NUDGE') => {
    setBusy(true)
    setErr('')
    try {
      const res = await client.post('/admin/billing/sms', {
        type,
        targetPhone: phone.trim() || undefined,
      })
      setData((res.data as { data: BillingSummary }).data)
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } }
      setErr(ax.response?.data?.message ?? '발송 처리에 실패했습니다.')
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

  return (
    <>
      <TopBar title="이용요금관리" sub="체험 · 구독 · 문자 포인트" />
      <div className="page-content-body">
        {err && (
          <div className="sec">
            <div style={{ padding: 12, borderRadius: 10, background: 'var(--err2)', color: 'var(--err)', fontSize: 13 }}>{err}</div>
          </div>
        )}

        <div className="sec">
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 10 }}>구독 · 결제 상태</div>
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
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 14, color: 'var(--err)', marginBottom: 10 }}>체험이 종료되어 결제가 필요합니다.</p>
                <button type="button" className="btn-primary" disabled={busy} onClick={() => void subscribe()}>
                  {busy ? '처리 중…' : `결제하기 · 월 ${data.monthlyPriceKrw.toLocaleString()}원`}
                </button>
                <p style={{ fontSize: 11, color: 'var(--slate3)', marginTop: 8 }}>PG 연동 전까지는 버튼 클릭 시 구독 상태만 활성화됩니다.</p>
              </div>
            )}
            {!data?.paymentRequired && data?.billingStatus === 'TRIAL' && data?.trialActive && (
              <p style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 8 }}>체험 종료 후 이 화면에서 월 구독 결제를 진행할 수 있습니다.</p>
            )}
          </div>
        </div>

        <div className="sec">
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>문자 발송 포인트</div>
            <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--acc)', marginBottom: 4 }}>{data?.smsPoints ?? 0} <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate2)' }}>P</span></p>
            <p style={{ fontSize: 12, color: 'var(--slate2)', marginBottom: 14 }}>
              일반 문자 {data?.smsCostGeneral ?? 1}P · 결제 안내 문자 {data?.smsCostPaymentNudge ?? 2}P 차감 (실제 SMS 연동 시 발송)
            </p>
            <label style={{ fontSize: 12, color: 'var(--slate2)', display: 'block', marginBottom: 6 }}>수신 번호 (선택, 로그용)</label>
            <input
              className="input-field"
              style={{ marginBottom: 12 }}
              placeholder="010-0000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" className="btn-secondary" disabled={busy} onClick={() => void sendSms('GENERAL')}>
                일반 문자 발송 ({data?.smsCostGeneral ?? 1}P)
              </button>
              <button type="button" className="btn-secondary" disabled={busy} onClick={() => void sendSms('PAYMENT_NUDGE')}>
                결제 안내 문자 ({data?.smsCostPaymentNudge ?? 2}P)
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
