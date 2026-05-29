/** 정기결제 등록 카드 표시용 (뒤 4자리·카드사·유효기간) */

export function formatMaskedCardNumber(last4: string | null | undefined): string | null {
  const digits = (last4 ?? '').replace(/\D/g, '')
  if (digits.length < 4) return null
  return `•••• •••• •••• ${digits.slice(-4)}`
}

export function formatCardCompanyLabel(company: string | null | undefined): string | null {
  const name = (company ?? '').trim()
  if (!name) return null
  return name.endsWith('카드') ? name : `${name}카드`
}

export function formatCardExpiry(
  month: string | null | undefined,
  year: string | null | undefined,
): string | null {
  const m = (month ?? '').replace(/\D/g, '')
  const y = (year ?? '').replace(/\D/g, '')
  if (!m || !y) return null
  const mm = m.padStart(2, '0').slice(-2)
  const yy = y.length >= 4 ? y.slice(-2) : y.padStart(2, '0').slice(-2)
  return `${mm}/${yy}`
}

export type RegisteredCardSummary = {
  billingCardLast4?: string | null
  billingCardCompany?: string | null
  billingCardExpMonth?: string | null
  billingCardExpYear?: string | null
}

export function hasRegisteredCardInfo(data: RegisteredCardSummary | null | undefined): boolean {
  return Boolean(formatMaskedCardNumber(data?.billingCardLast4))
}
