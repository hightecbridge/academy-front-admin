import { parseYearMonth } from './paymentMonth'

/** Aligo 승인 템플릿 UH_8414 (templtContent와 동일, CRLF) */
export const TUITION_ALIMTALK_TEMPLATE_CODE = 'UH_8414'

export const TUITION_ALIMTALK_TEMPLATE =
  '[#{학원명}] 원비 납부 안내\r\n\r\n' +
  '#{보호자명}님, 안녕하세요.\r\n' +
  '#{월}월 원비 납부 안내드립니다.\r\n\r\n' +
  '- 학생명 : #{학생명}\r\n' +
  '- 납부금액 : #{납부금액}원\r\n' +
  '- 납부기한 : #{납부기한}\r\n\r\n' +
  '기한 내 납부 부탁드립니다.'

export type TuitionAlimtalkVars = {
  academyName: string
  parentName: string
  billingYearMonth: number
  studentName: string
  amount: number
}

export function formatTuitionDueDate(yearMonth: number): string {
  const { year, month } = parseYearMonth(yearMonth)
  const lastDay = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

export function buildTuitionAlimtalkMessage(vars: TuitionAlimtalkVars): string {
  const { month } = parseYearMonth(vars.billingYearMonth)
  return TUITION_ALIMTALK_TEMPLATE.replace(/#\{학원명\}/g, vars.academyName)
    .replace(/#\{보호자명\}/g, vars.parentName)
    .replace(/#\{월\}/g, String(month))
    .replace(/#\{학생명\}/g, vars.studentName)
    .replace(/#\{납부금액\}/g, String(vars.amount))
    .replace(/#\{납부기한\}/g, formatTuitionDueDate(vars.billingYearMonth))
}
