/** 수납 현황 기준 연월 (YYYYMM) */
export function currentYearMonth(): number {
  const now = new Date()
  return now.getFullYear() * 100 + (now.getMonth() + 1)
}

export function buildYearMonth(year: number, month: number): number {
  return year * 100 + month
}

export function parseYearMonth(ym: number): { year: number; month: number } {
  return { year: Math.floor(ym / 100), month: ym % 100 }
}

export function formatYearMonthLabel(ym: number = currentYearMonth()): string {
  const { year, month } = parseYearMonth(ym)
  return `${year}년 ${month}월`
}

/** 수납 연월 선택 목록 (최신순) */
export function listSelectableYearMonths(pastMonths = 24, futureMonths = 1): number[] {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth() + futureMonths, 1)
  const start = new Date(now.getFullYear(), now.getMonth() - pastMonths, 1)
  const items: number[] = []
  const cur = new Date(start)
  while (cur <= end) {
    items.push(buildYearMonth(cur.getFullYear(), cur.getMonth() + 1))
    cur.setMonth(cur.getMonth() + 1)
  }
  return items.reverse()
}

export function listSelectableYears(pastYears = 3, futureYears = 1): number[] {
  const y = new Date().getFullYear()
  const years: number[] = []
  for (let i = y - pastYears; i <= y + futureYears; i += 1) {
    years.push(i)
  }
  return years
}
