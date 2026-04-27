import { useEffect, useState } from 'react'
import client from '../api/client'

export type MessageCostType = 'KAKAO_ALIMTALK' | 'SMS' | 'LMS' | 'MMS'

type CostByType = Record<MessageCostType, number>

const DEFAULT_COST: CostByType = {
  KAKAO_ALIMTALK: 0,
  SMS: 0,
  LMS: 0,
  MMS: 0,
}

type BillingSummary = {
  smsCostGeneral?: number
  smsCostKakaoAlimtalk?: number
  smsCostSms?: number
  smsCostLms?: number
  smsCostMms?: number
}

export function usePointCosts() {
  const [costByType, setCostByType] = useState<CostByType>(DEFAULT_COST)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await client.get('/admin/billing')
        const summary = (res.data as { data?: BillingSummary }).data
        const kakaoAlimtalk = summary?.smsCostKakaoAlimtalk
        const sms = summary?.smsCostSms ?? summary?.smsCostGeneral
        const lms = summary?.smsCostLms
        const mms = summary?.smsCostMms
        const isPositive = (v: number | undefined): v is number => typeof v === 'number' && v > 0
        if (!isPositive(kakaoAlimtalk) || !isPositive(sms) || !isPositive(lms) || !isPositive(mms)) {
          throw new Error('invalid message point costs')
        }
        const nextCost: CostByType = {
          KAKAO_ALIMTALK: kakaoAlimtalk,
          SMS: sms,
          LMS: lms,
          MMS: mms,
        }
        if (!cancelled) {
          setCostByType(nextCost)
          setError('')
        }
      } catch {
        if (!cancelled) {
          setCostByType(DEFAULT_COST)
          setError('문자 단가 정보를 불러오지 못했습니다. 단가 설정을 확인해 주세요.')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return { costByType, error }
}
