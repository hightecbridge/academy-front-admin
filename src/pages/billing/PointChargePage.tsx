// 포인트 충전 — 하이아카데미 이용 포인트 적립(스텁)
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../../api/client'
import { TopBar } from '../../components/common'

interface BillingSummary {
  smsPoints: number
}

export default function PointChargePage() {
  const navigate = useNavigate()
  const [points, setPoints] = useState('300')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [smsPoints, setSmsPoints] = useState<number>(0)

  // 현재 잔액 표시를 위해 재조회
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

  const presetButtons = useMemo(() => [100, 300, 500, 1000], [])

  const submit = async () => {
    const n = Number(points)
    if (!Number.isFinite(n) || n <= 0) {
      setErr('충전 포인트는 1 이상이어야 합니다.')
      return
    }
    if (n > 100000) {
      setErr('충전 포인트는 100,000 이하여야 합니다.')
      return
    }

    setErr('')
    setBusy(true)
    try {
      await client.post('/admin/billing/points/charge', { points: n })
      navigate('/billing', { replace: true })
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } }
      setErr(ax.response?.data?.message ?? '포인트 충전에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <TopBar title="포인트 충전하기" sub="하이아카데미 포인트 적립" />
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
            <p style={{ fontSize: 12, color: 'var(--slate2)' }}>스텁 기능입니다. PG 연동 전이라도 즉시 적립됩니다.</p>
          </div>
        </div>

        <div className="sec">
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>충전 포인트 선택</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {presetButtons.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="btn-secondary"
                  disabled={busy}
                  onClick={() => setPoints(String(p))}
                  style={{ minWidth: 92 }}
                >
                  +{p}P
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="input-field"
                inputMode="numeric"
                placeholder="충전 포인트"
                value={points}
                onChange={(e) => setPoints(e.target.value.replace(/[^\d]/g, ''))}
                style={{ flex: 1 }}
              />
              <button type="button" className="btn-primary" disabled={busy} onClick={() => void submit()}>
                결제하기
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--slate3)', marginTop: 10 }}>
              결제하기 버튼은 스텁 동작으로, 선택한 포인트만큼 즉시 적립됩니다.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

