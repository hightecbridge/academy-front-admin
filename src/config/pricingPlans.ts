export type PlanId = 'starter' | 'standard' | 'premium'
export type BillingMode = 'm' | 'y'

export interface PricingPlan {
  id: PlanId
  name: string
  desc: string
  priceM: number
  priceY: number
  popular?: boolean
}

export const PLANS: PricingPlan[] = [
  { id: 'starter', name: '스타터', desc: '소규모 학원의 첫 디지털 전환.', priceM: 10000, priceY: 8000 },
  { id: 'standard', name: '스탠다드', desc: '성장하는 중형 학원을 위한 완전한 솔루션.', priceM: 20000, priceY: 16000, popular: true },
  { id: 'premium', name: '프리미엄', desc: '대형 학원 & 프랜차이즈를 위한 엔터프라이즈.', priceM: 50000, priceY: 40000 },
]

export function priceKrwPerMonth(planId: PlanId, mode: BillingMode): number {
  const found = PLANS.find((p) => p.id === planId) ?? PLANS[1]
  return mode === 'm' ? found.priceM : found.priceY
}

export function fmtKrw(n: number): string {
  return n.toLocaleString('ko-KR')
}
