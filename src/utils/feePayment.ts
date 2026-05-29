import type { FeeItem, FeePaymentMethod } from '../types'

export const FEE_PAYMENT_METHODS: FeePaymentMethod[] = ['현금', '카드', '계좌이체', '제로페이', '기타']

const PRESET_SET = new Set<string>(FEE_PAYMENT_METHODS)

export function isPresetPaymentMethod(m: string | null | undefined): m is FeePaymentMethod {
  return !!m && PRESET_SET.has(m)
}

export function resolveMethodFromFee(fee: FeeItem): {
  method: FeePaymentMethod
  otherText: string
} {
  const raw = (fee.paymentMethod ?? '').trim()
  if (!raw) return { method: '현금', otherText: '' }
  if (isPresetPaymentMethod(raw) && raw !== '기타') {
    return { method: raw, otherText: '' }
  }
  if (raw === '기타') {
    return { method: '기타', otherText: '' }
  }
  return { method: '기타', otherText: raw }
}

export function paymentMethodForSave(method: FeePaymentMethod, otherText: string): string {
  if (method === '기타') {
    return otherText.trim() || '기타'
  }
  return method
}

export function todayDateInput(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function draftFromFeeItem(fee: FeeItem): {
  status: 'unpaid' | 'paid'
  paidAt: string
  method: FeePaymentMethod
  otherText: string
} {
  const { method, otherText } = resolveMethodFromFee(fee)
  return {
    status: fee.paid ? 'paid' : 'unpaid',
    paidAt: fee.paidAt?.slice(0, 10) || todayDateInput(),
    method,
    otherText,
  }
}

export function formatPaidMeta(fee: FeeItem): string | null {
  if (!fee.paid) return null
  const parts: string[] = ['완납']
  if (fee.paidAt) parts.push(fee.paidAt.slice(0, 10))
  if (fee.paymentMethod) parts.push(String(fee.paymentMethod))
  return parts.join(' · ')
}
