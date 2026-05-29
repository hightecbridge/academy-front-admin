import { useEffect, useState } from 'react'
import type { FeeItem, FeePaymentMethod } from '../../types'
import {
  FEE_PAYMENT_METHODS,
  draftFromFeeItem,
  paymentMethodForSave,
} from '../../utils/feePayment'

type Props = {
  fee: FeeItem
  compact?: boolean
  saving?: boolean
  onSave: (payload: { paid: boolean; paidAt?: string; paymentMethod?: string }) => Promise<void>
}

export default function FeePaymentRow({ fee, compact, saving, onSave }: Props) {
  const [status, setStatus] = useState<'unpaid' | 'paid'>(fee.paid ? 'paid' : 'unpaid')
  const [paidAt, setPaidAt] = useState('')
  const [method, setMethod] = useState<FeePaymentMethod>('현금')
  const [otherText, setOtherText] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const d = draftFromFeeItem(fee)
    setStatus(d.status)
    setPaidAt(d.paidAt)
    setMethod(d.method)
    setOtherText(d.otherText)
    setFormError('')
  }, [fee.paid, fee.paidAt, fee.paymentMethod, fee.amount])

  const handleSave = async () => {
    setFormError('')
    if (status === 'paid' && method === '기타' && !otherText.trim()) {
      setFormError('기타를 선택한 경우 납부방법을 입력해 주세요.')
      return
    }
    setBusy(true)
    try {
      if (status === 'paid') {
        await onSave({
          paid: true,
          paidAt: paidAt || undefined,
          paymentMethod: paymentMethodForSave(method, otherText),
        })
      } else {
        await onSave({ paid: false })
      }
    } finally {
      setBusy(false)
    }
  }

  const disabled = saving || busy

  return (
    <div
      style={{
        padding: compact ? '10px 0 0' : '14px 16px',
        borderTop: compact ? '1px dashed var(--border)' : undefined,
        borderBottom: compact ? undefined : '1px solid var(--border)',
      }}
    >
      <div className="row" style={{ marginBottom: compact ? 8 : 10, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: compact ? 13 : 14, fontWeight: 600, color: 'var(--navy)' }}>{fee.label}</div>
          <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 2 }}>{fee.amount.toLocaleString()}원</div>
        </div>
        {fee.paid && !compact && (
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ok)', padding: '4px 8px', borderRadius: 6, background: 'var(--ok2)' }}>
            저장됨
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
          <input
            type="radio"
            name={`fee-status-${fee.label}-${fee.id ?? fee.amount}`}
            checked={status === 'unpaid'}
            onChange={() => setStatus('unpaid')}
            disabled={disabled}
          />
          <span style={{ color: status === 'unpaid' ? 'var(--err)' : 'var(--slate2)', fontWeight: status === 'unpaid' ? 700 : 400 }}>미납</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
          <input
            type="radio"
            name={`fee-status-${fee.label}-${fee.id ?? fee.amount}`}
            checked={status === 'paid'}
            onChange={() => setStatus('paid')}
            disabled={disabled}
          />
          <span style={{ color: status === 'paid' ? 'var(--ok)' : 'var(--slate2)', fontWeight: status === 'paid' ? 700 : 400 }}>완납</span>
        </label>
      </div>

      {status === 'paid' && (
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: compact ? '1fr' : '1fr 1fr',
              gap: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: 'var(--slate3)', marginBottom: 4 }}>납부일</div>
              <input
                type="date"
                className="input-field"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                disabled={disabled}
                style={{ padding: '8px 10px', fontSize: 13 }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--slate3)', marginBottom: 4 }}>납부방법</div>
              <select
                className="input-field"
                value={method}
                onChange={(e) => {
                  setMethod(e.target.value as FeePaymentMethod)
                  if (e.target.value !== '기타') setOtherText('')
                  setFormError('')
                }}
                disabled={disabled}
                style={{ padding: '8px 10px', fontSize: 13 }}
              >
                {FEE_PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          {method === '기타' && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--slate3)', marginBottom: 4 }}>기타 납부방법</div>
              <input
                type="text"
                className="input-field"
                placeholder="예: 상품권, 페이코 등"
                value={otherText}
                onChange={(e) => {
                  setOtherText(e.target.value)
                  setFormError('')
                }}
                disabled={disabled}
                maxLength={50}
                style={{ padding: '8px 10px', fontSize: 13 }}
              />
            </div>
          )}
        </div>
      )}

      {formError && (
        <div style={{ fontSize: 12, color: 'var(--err)', marginBottom: 8 }}>{formError}</div>
      )}

      <button
        type="button"
        className="btn-primary"
        style={{
          width: compact ? '100%' : 'auto',
          marginTop: 0,
          padding: '8px 14px',
          fontSize: 12,
          opacity: disabled ? 0.6 : 1,
        }}
        disabled={disabled}
        onClick={() => void handleSave()}
      >
        {disabled ? '저장 중…' : '저장'}
      </button>
    </div>
  )
}
