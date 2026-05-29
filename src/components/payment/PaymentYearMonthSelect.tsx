import { useMemo } from 'react'
import {
  buildYearMonth,
  formatYearMonthLabel,
  listSelectableYears,
  parseYearMonth,
} from '../../utils/paymentMonth'

type Props = {
  value: number
  onChange: (yearMonth: number) => void
  disabled?: boolean
}

export default function PaymentYearMonthSelect({ value, onChange, disabled }: Props) {
  const { year, month } = parseYearMonth(value)
  const years = useMemo(() => listSelectableYears(), [])

  return (
    <div
      className="card"
      style={{
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>수납 연월</span>
      <select
        className="input-field"
        value={year}
        disabled={disabled}
        onChange={(e) => onChange(buildYearMonth(Number(e.target.value), month))}
        style={{ width: 108, padding: '8px 10px', fontSize: 13 }}
        aria-label="수납 연도"
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}년</option>
        ))}
      </select>
      <select
        className="input-field"
        value={month}
        disabled={disabled}
        onChange={(e) => onChange(buildYearMonth(year, Number(e.target.value)))}
        style={{ width: 88, padding: '8px 10px', fontSize: 13 }}
        aria-label="수납 월"
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <option key={m} value={m}>{m}월</option>
        ))}
      </select>
      <span style={{ fontSize: 12, color: 'var(--slate2)' }}>{formatYearMonthLabel(value)} 기준</span>
    </div>
  )
}
