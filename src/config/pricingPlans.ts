export type PlanId = 'standard' | 'premium' | 'enterprise'
export type BillingMode = 'm' | 'y'

export interface PricingPlan {
  id: PlanId
  name: string
  desc: string
  priceM: number
  priceY: number
  popular?: boolean
}

/** 퇴원 제외 학생 상한 (백엔드 BillingPlanLimits 와 동일) */
export function studentMaxForPlan(planId: PlanId | string | null | undefined): number | null {
  const id = (planId ?? 'standard').toLowerCase()
  switch (id) {
    case 'standard':
      return 50
    case 'premium':
      return 100
    case 'enterprise':
      return null
    default:
      return 50
  }
}

export const PLANS: PricingPlan[] = [
  { id: 'standard', name: '스탠다드', desc: '성장하는 중형 학원. 학생 최대 50명.', priceM: 10000, priceY: 8000, popular: true },
  { id: 'premium', name: '프리미엄', desc: '대형 학원. 학생 최대 100명.', priceM: 20000, priceY: 16000 },
  { id: 'enterprise', name: '엔터프라이즈', desc: '학생 수 무제한 · 맞춤 지원.', priceM: 50000, priceY: 40000 },
]

export function priceKrwPerMonth(planId: PlanId, mode: BillingMode): number {
  const found = PLANS.find((p) => p.id === planId) ?? PLANS[0]
  return mode === 'm' ? found.priceM : found.priceY
}

export function fmtKrw(n: number): string {
  return n.toLocaleString('ko-KR')
}

/** 공급가(부가세 별도) → 부가세 10% 포함 결제 금액(원 단위 반올림). */
export function krwWithVat10(supplyKrw: number): number {
  return Math.round(supplyKrw * 1.1)
}
