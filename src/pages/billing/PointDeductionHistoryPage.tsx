import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../../api/client'
import { TopBar } from '../../components/common'
import { fmtKrw } from '../../config/pricingPlans'

type MessageType = 'KAKAO_ALIMTALK' | 'SMS' | 'LMS' | 'MMS' | 'PAYMENT_SMS' | 'PAYMENT_NUDGE'

interface PointDeductionRow {
  id: number
  messageType?: MessageType | null
  deductedPoints?: number | null
  remainingPoints?: number | null
  createdAt: string
}

function messageTypeLabel(type?: MessageType | null): string {
  if (type === 'KAKAO_ALIMTALK') return '카카오 알림톡'
  if (type === 'SMS' || type === 'PAYMENT_SMS' || type === 'PAYMENT_NUDGE') return 'SMS'
  if (type === 'LMS') return 'LMS'
  if (type === 'MMS') return 'MMS'
  return '-'
}

export default function PointDeductionHistoryPage() {
  const [rows, setRows] = useState<PointDeductionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setErr('')
    try {
      const res = await client.get('/admin/message-sends')
      const list = (res.data as { data?: unknown[] }).data
      const mapped = (Array.isArray(list) ? list : [])
        .map((raw): PointDeductionRow | null => {
          const row = raw as Record<string, unknown>
          const id = typeof row.id === 'number' ? row.id : NaN
          const createdAt = typeof row.createdAt === 'string' ? row.createdAt : ''
          if (!Number.isFinite(id) || !createdAt) return null
          const deductedPoints = typeof row.deductedPoints === 'number' ? row.deductedPoints : null
          if (deductedPoints == null) return null
          const messageType = typeof row.messageType === 'string' ? (row.messageType as MessageType) : null
          const remainingPoints = typeof row.remainingPoints === 'number' ? row.remainingPoints : null
          return { id, messageType, deductedPoints, remainingPoints, createdAt }
        })
        .filter((v): v is PointDeductionRow => v != null)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      setRows(mapped)
    } catch {
      setRows([])
      setErr('포인트 차감 이력을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <TopBar title="포인트 차감 이력" sub="메시지 발송 차감 내역" />
      <div className="page-content-body">
        {err && (
          <div className="sec">
            <div style={{ padding: 12, borderRadius: 10, background: 'var(--err2)', color: 'var(--err)', fontSize: 13 }}>{err}</div>
          </div>
        )}

        <div className="sec">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--slate2)', margin: 0 }}>최근 차감부터 표시됩니다.</p>
            <Link to="/billing" style={{ fontSize: 13, fontWeight: 700, color: 'var(--acc)', textDecoration: 'none' }}>
              ← 이용요금관리
            </Link>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <p style={{ padding: 24, color: 'var(--slate2)', fontSize: 13 }}>불러오는 중…</p>
            ) : rows.length === 0 ? (
              <p style={{ padding: 24, color: 'var(--slate2)', fontSize: 13 }}>아직 포인트 차감 이력이 없습니다.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg2)', textAlign: 'left', color: 'var(--slate2)' }}>
                      <th style={{ padding: '12px 14px', fontWeight: 600 }}>발송 종류</th>
                      <th style={{ padding: '12px 10px', fontWeight: 600 }}>차감 포인트</th>
                      <th style={{ padding: '12px 10px', fontWeight: 600 }}>잔여 포인트</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600 }}>차감 일시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 14px', color: 'var(--navy)', whiteSpace: 'nowrap', fontWeight: 700 }}>
                          {messageTypeLabel(r.messageType)}
                        </td>
                        <td style={{ padding: '12px 10px', color: 'var(--err)', fontWeight: 700 }}>
                          {r.deductedPoints != null ? `${fmtKrw(r.deductedPoints)}P` : '-'}
                        </td>
                        <td style={{ padding: '12px 10px', color: 'var(--navy)', fontWeight: 700 }}>
                          {r.remainingPoints != null ? `${fmtKrw(r.remainingPoints)}P` : '-'}
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--slate)', whiteSpace: 'nowrap' }}>
                          {r.createdAt.replace('T', ' ').slice(0, 16)}
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
    </>
  )
}
