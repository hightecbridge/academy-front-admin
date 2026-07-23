import * as XLSX from 'xlsx'
import type { Student } from '../types'
import { isFullPaid, isPartPaid, paidFee, payPct, totalFee } from '../store/dataStore'
import { formatYearMonthLabel, parseYearMonth } from './paymentMonth'

const HEADERS = [
  '수납년월',
  '학생명',
  '학부모명',
  '연락처',
  '반',
  '학년',
  '재원상태',
  '수납상태',
  '수납률(%)',
  '수업료(원)',
  '수업료상태',
  '수업료납부일',
  '수업료납부방법',
  '교재비(원)',
  '교재비상태',
  '교재비납부일',
  '교재비납부방법',
  '청구합계(원)',
  '납부합계(원)',
  '미납합계(원)',
] as const

function paymentStatusLabel(s: Student): string {
  if (isFullPaid(s)) return '완납'
  if (isPartPaid(s)) return '일부납'
  return '미납'
}

function feeStatusLabel(paid: boolean): string {
  return paid ? '완납' : '미납'
}

function rowFromStudent(s: Student, ymLabel: string): (string | number)[] {
  const total = totalFee(s)
  const paid = paidFee(s)
  const tuition = s.fees.tuition
  const book = s.fees.book
  return [
    ymLabel,
    s.name,
    s.parentName,
    s.parentPhone,
    s.cls,
    s.grade,
    s.status,
    paymentStatusLabel(s),
    payPct(s),
    tuition.amount,
    feeStatusLabel(tuition.paid),
    tuition.paid ? (tuition.paidAt?.slice(0, 10) ?? '') : '',
    tuition.paid ? String(tuition.paymentMethod ?? '') : '',
    book.amount,
    feeStatusLabel(book.paid),
    book.paid ? (book.paidAt?.slice(0, 10) ?? '') : '',
    book.paid ? String(book.paymentMethod ?? '') : '',
    total,
    paid,
    total - paid,
  ]
}

function sortStudents(students: Student[]): Student[] {
  return [...students].sort((a, b) => {
    const byCls = a.cls.localeCompare(b.cls, 'ko')
    if (byCls !== 0) return byCls
    return a.name.localeCompare(b.name, 'ko')
  })
}

export function downloadPaymentStatusExcel(students: Student[], yearMonth: number) {
  const ymLabel = formatYearMonthLabel(yearMonth)
  const { year, month } = parseYearMonth(yearMonth)
  const rows = sortStudents(students)
  const dataRows = rows.map((s) => rowFromStudent(s, ymLabel))

  const wb = XLSX.utils.book_new()

  const ws = XLSX.utils.aoa_to_sheet([[...HEADERS], ...dataRows])
  ws['!cols'] = [
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 8 }, { wch: 8 },
    { wch: 8 }, { wch: 8 }, { wch: 8 },
    { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 14 },
    { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 14 },
    { wch: 12 }, { wch: 12 }, { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, '수납현황')

  const tAmt = rows.reduce((a, s) => a + totalFee(s), 0)
  const pAmt = rows.reduce((a, s) => a + paidFee(s), 0)
  const fullCnt = rows.filter(isFullPaid).length
  const partCnt = rows.filter(isPartPaid).length
  const noneCnt = rows.length - fullCnt - partCnt
  const summaryWs = XLSX.utils.aoa_to_sheet([
    ['수납년월', ymLabel],
    ['학생 수', rows.length],
    ['완납', fullCnt],
    ['일부납', partCnt],
    ['미납', noneCnt],
    ['청구 합계(원)', tAmt],
    ['납부 합계(원)', pAmt],
    ['미납 합계(원)', tAmt - pAmt],
    ['수납률(%)', tAmt > 0 ? Math.round((pAmt / tAmt) * 100) : 0],
  ])
  summaryWs['!cols'] = [{ wch: 16 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, summaryWs, '요약')

  XLSX.writeFile(wb, `수납현황_${year}년${month}월.xlsx`)
}
