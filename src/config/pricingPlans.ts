export type PlanId = 'basic' | 'standard' | 'premium' | 'enterprise'

export interface PricingPlan {
  id: PlanId
  name: string
  desc: string
  studentLimit: number
  priceM: number
  popular?: boolean
}

/** 퇴원 제외 학생 상한 (백엔드 BillingPlanLimits 와 동일) */
export function studentMaxForPlan(planId: PlanId | string | null | undefined): number | null {
  const id = (planId ?? 'basic').toLowerCase()
  switch (id) {
    case 'basic':
      return 50
    case 'standard':
      return 100
    case 'premium':
      return 200
    case 'enterprise':
      return 500
    default:
      return 50
  }
}

export const PLANS: PricingPlan[] = [
  { id: 'basic', name: '베이직', desc: '학생 최대 50명', studentLimit: 50, priceM: 4400 },
  { id: 'standard', name: '스탠다드', desc: '학생 최대 100명', studentLimit: 100, priceM: 8800, popular: true },
  { id: 'premium', name: '프리미엄', desc: '학생 최대 200명', studentLimit: 200, priceM: 16500 },
  { id: 'enterprise', name: '엔터프라이즈', desc: '학생 최대 500명', studentLimit: 500, priceM: 33000 },
]

export function priceKrwPerMonth(planId: PlanId): number {
  const found = PLANS.find((p) => p.id === planId) ?? PLANS[0]
  return found.priceM
}

export function fmtKrw(n: number): string {
  return n.toLocaleString('ko-KR')
}

/** 월 자동결제 금액은 VAT 포함가를 사용합니다. */
