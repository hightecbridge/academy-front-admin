import type { CSSProperties } from 'react'
import type { DashboardMonthStat } from '../../types'

function fmtMan(n: number) {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  if (n >= 10000) return `${Math.round(n / 10000).toLocaleString()}만`
  return n.toLocaleString()
}

export function fmtRevenue(n: number) {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억원`
  if (n >= 10000) return `${Math.round(n / 10000).toLocaleString()}만원`
  return `${n.toLocaleString()}원`
}

type StatKey = 'enrolled' | 'withdrawn' | 'revenue' | 'unpaid'

export function GroupedBarChart({
  months,
  aKey,
  bKey,
  aColor,
  bColor,
  aLabel,
  bLabel,
  formatValue,
}: {
  months: DashboardMonthStat[]
  aKey: StatKey
  bKey?: StatKey
  aColor: string
  bColor?: string
  aLabel: string
  bLabel?: string
  formatValue?: (n: number) => string
}) {
  const max = Math.max(
    1,
    ...months.map((m) => Math.max(Number(m[aKey]), bKey ? Number(m[bKey]) : 0)),
  )
  const h = 156
  const fmt = formatValue ?? ((n: number) => String(n))

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 11, fontWeight: 700 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: aColor }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: aColor }} />{aLabel}
        </span>
        {bKey && bLabel && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: bColor }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: bColor }} />{bLabel}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: h, padding: '0 2px' }}>
        {months.map((m) => {
          const a = Number(m[aKey])
          const b = bKey ? Number(m[bKey]) : 0
          const aH = Math.round((a / max) * (h - 36))
          const bH = Math.round((b / max) * (h - 36))
          return (
            <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: h - 22, width: '100%', justifyContent: 'center' }}>
                <div
                  title={`${m.month}월 ${aLabel} ${fmt(a)}`}
                  style={{
                    width: bKey ? '42%' : '62%',
                    height: Math.max(a > 0 ? 6 : 2, aH),
                    background: aColor,
                    borderRadius: '4px 4px 1px 1px',
                    opacity: a > 0 ? 1 : 0.18,
                    position: 'relative',
                  }}
                />
                {bKey && (
                  <div
                    title={`${m.month}월 ${bLabel} ${fmt(b)}`}
                    style={{
                      width: '42%',
                      height: Math.max(b > 0 ? 6 : 2, bH),
                      background: bColor,
                      borderRadius: '4px 4px 1px 1px',
                      opacity: b > 0 ? 1 : 0.18,
                    }}
                  />
                )}
              </div>
              <div style={{ fontSize: 9, color: 'var(--slate3)', marginTop: 4, fontWeight: 700 }}>{m.month}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function MonthlyStatTable({
  months,
  year,
}: {
  months: DashboardMonthStat[]
  year: number
}) {
  return (
    <div style={{ overflowX: 'auto', marginTop: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 420 }}>
        <thead>
          <tr style={{ background: 'var(--bg2)' }}>
            <th style={th}>월</th>
            <th style={th}>입회</th>
            <th style={th}>퇴원</th>
            <th style={th}>순증감</th>
            <th style={{ ...th, textAlign: 'right' }}>매출</th>
            <th style={{ ...th, textAlign: 'right' }}>미수</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => {
            const net = m.enrolled - m.withdrawn
            return (
              <tr key={m.month}>
                <td style={td}>{year}.{String(m.month).padStart(2, '0')}</td>
                <td style={{ ...td, color: '#6C63FF', fontWeight: 700 }}>{m.enrolled}</td>
                <td style={{ ...td, color: '#F04438', fontWeight: 700 }}>{m.withdrawn}</td>
                <td style={{ ...td, fontWeight: 700, color: net > 0 ? 'var(--ok)' : net < 0 ? 'var(--err)' : 'var(--slate2)' }}>
                  {net > 0 ? `+${net}` : net}
                </td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{fmtMan(m.revenue)}</td>
                <td style={{ ...td, textAlign: 'right', color: m.unpaid > 0 ? 'var(--err)' : 'var(--slate2)' }}>{fmtMan(m.unpaid)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const th: CSSProperties = {
  textAlign: 'left',
  padding: '8px 8px',
  fontWeight: 700,
  color: 'var(--slate2)',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
}
const td: CSSProperties = {
  padding: '7px 8px',
  borderBottom: '1px solid var(--border)',
  color: 'var(--navy)',
  whiteSpace: 'nowrap',
}
