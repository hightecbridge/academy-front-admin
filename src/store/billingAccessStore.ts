import { create } from 'zustand'
import client from '../api/client'

/** 이용 기간 만료 등으로 결제가 필요할 때 다른 메뉴 접근을 막기 위한 상태 */
export const useBillingAccessStore = create<{
  ready: boolean
  paymentRequired: boolean
  /** /billing 도착 후 만료 안내 알럿 1회 표시 */
  pendingExpiredAlertOnBilling: boolean
  refresh: () => Promise<void>
  requestExpiredAlertOnBilling: () => void
  consumeExpiredAlertOnBilling: () => boolean
  reset: () => void
}>((set, get) => ({
  ready: false,
  paymentRequired: false,
  pendingExpiredAlertOnBilling: false,
  refresh: async () => {
    try {
      const res = await client.get('/admin/billing')
      const d = (res.data as { data: { paymentRequired?: boolean } }).data
      set({ paymentRequired: Boolean(d?.paymentRequired), ready: true })
    } catch {
      set({ paymentRequired: false, ready: true })
    }
  },
  requestExpiredAlertOnBilling: () => set({ pendingExpiredAlertOnBilling: true }),
  consumeExpiredAlertOnBilling: () => {
    if (!get().pendingExpiredAlertOnBilling) return false
    set({ pendingExpiredAlertOnBilling: false })
    return true
  },
  reset: () => set({ ready: false, paymentRequired: false, pendingExpiredAlertOnBilling: false }),
}))
