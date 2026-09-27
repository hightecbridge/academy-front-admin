/** 대한민국 법정 공휴일 (설·추석·석가는 2020–2035 음력 대조). */

const SEOLLAL: Record<number, string> = {
  2020: '2020-01-25', 2021: '2021-02-12', 2022: '2022-02-01', 2023: '2023-01-22',
  2024: '2024-02-10', 2025: '2025-01-29', 2026: '2026-02-17', 2027: '2027-02-06',
  2028: '2028-01-26', 2029: '2029-02-13', 2030: '2030-02-03', 2031: '2031-01-23',
  2032: '2032-02-11', 2033: '2033-01-31', 2034: '2034-02-19', 2035: '2035-02-08',
}

const CHUSEOK: Record<number, string> = {
  2020: '2020-10-01', 2021: '2021-09-21', 2022: '2022-09-10', 2023: '2023-09-29',
  2024: '2024-09-17', 2025: '2025-10-06', 2026: '2026-09-25', 2027: '2027-09-15',
  2028: '2028-10-03', 2029: '2029-09-22', 2030: '2030-09-12', 2031: '2031-10-01',
  2032: '2032-09-19', 2033: '2033-09-08', 2034: '2034-09-28', 2035: '2035-09-17',
}

const BUDDHA: Record<number, string> = {
  2020: '2020-04-30', 2021: '2021-05-19', 2022: '2022-05-08', 2023: '2023-05-27',
  2024: '2024-05-15', 2025: '2025-05-05', 2026: '2026-05-24', 2027: '2027-05-13',
  2028: '2028-05-02', 2029: '2029-05-20', 2030: '2030-05-09', 2031: '2031-05-28',
  2032: '2032-05-16', 2033: '2033-05-05', 2034: '2034-05-25', 2035: '2035-05-13',
}

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d + days)
  return ymd(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())
}

function dow(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

function holidaysOf(year: number): Map<string, string> {
  const named = new Map<string, string>()
  const put = (date: string, name: string) => {
    if (!named.has(date)) named.set(date, name)
  }
  put(ymd(year, 1, 1), '신정')
  put(ymd(year, 3, 1), '삼일절')
  put(ymd(year, 5, 5), '어린이날')
  put(ymd(year, 6, 6), '현충일')
  put(ymd(year, 8, 15), '광복절')
  put(ymd(year, 10, 3), '개천절')
  put(ymd(year, 10, 9), '한글날')
  put(ymd(year, 12, 25), '성탄절')

  const seollal = SEOLLAL[year]
  if (seollal) {
    put(addDays(seollal, -1), '설날 연휴')
    put(seollal, '설날')
    put(addDays(seollal, 1), '설날 연휴')
  }
  const chuseok = CHUSEOK[year]
  if (chuseok) {
    put(addDays(chuseok, -1), '추석 연휴')
    put(chuseok, '추석')
    put(addDays(chuseok, 1), '추석 연휴')
  }
  const buddha = BUDDHA[year]
  if (buddha) put(buddha, '부처님오신날')

  const addNextOpen = (from: string, name: string) => {
    let cand = addDays(from, 1)
    while (named.has(cand) || dow(cand) === 0 || dow(cand) === 6) {
      cand = addDays(cand, 1)
    }
    put(cand, name)
  }
  const addSubstitute = (holiday: string) => {
    const d = dow(holiday)
    if (d !== 0 && d !== 6) return
    addNextOpen(holiday, '대체공휴일')
  }

  addSubstitute(ymd(year, 3, 1))
  addSubstitute(ymd(year, 5, 5))
  addSubstitute(ymd(year, 8, 15))
  addSubstitute(ymd(year, 10, 3))
  addSubstitute(ymd(year, 10, 9))
  if (seollal) {
    addSubstitute(addDays(seollal, -1))
    addSubstitute(seollal)
    addSubstitute(addDays(seollal, 1))
  }
  if (chuseok) {
    addSubstitute(addDays(chuseok, -1))
    addSubstitute(chuseok)
    addSubstitute(addDays(chuseok, 1))
  }
  if (buddha && named.get(buddha) !== '부처님오신날') {
    addNextOpen(buddha, '대체공휴일')
  }
  return named
}

const cache = new Map<number, Map<string, string>>()

function yearMap(year: number) {
  let m = cache.get(year)
  if (!m) {
    m = holidaysOf(year)
    cache.set(year, m)
  }
  return m
}

export function koreanHolidayName(date: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const year = Number(date.slice(0, 4))
  return yearMap(year).get(date) ?? null
}

export function isKoreanHoliday(date: string) {
  return koreanHolidayName(date) != null
}

export function localISODate(d = new Date()) {
  return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate())
}
