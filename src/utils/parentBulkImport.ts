import * as XLSX from 'xlsx'
import type { ClassRoom, Student } from '../types'

export const BULK_IMPORT_HEADERS = [
  '학부모이름*',
  '학부모연락처*',
  '학생이름',
  '학생연락처',
  '학년',
  '반',
  '재원상태',
] as const

export const VALID_GRADES = [
  '초등 1', '초등 2', '초등 3', '초등 4', '초등 5', '초등 6',
  '중등 1', '중등 2', '중등 3',
  '고등 1', '고등 2', '고등 3',
] as const

export const VALID_STATUSES = ['재원', '휴원', '퇴원'] as const

export type BulkImportRow = {
  rowNum: number
  parentName: string
  phone: string
  studentPhone: string
  studentName: string
  grade: string
  className: string
  status: string
  errors: string[]
}

export function normalizePhone(v: string): string {
  return String(v ?? '').replace(/[^\d]/g, '')
}

function cellStr(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'number') return String(v)
  return String(v).trim()
}

const HEADER_ALIASES: Record<string, keyof Omit<BulkImportRow, 'rowNum' | 'errors'>> = {
  '학부모이름*': 'parentName',
  '학부모이름': 'parentName',
  '학부모 이름': 'parentName',
  '보호자이름': 'parentName',
  '연락처*': 'phone',
  '연락처': 'phone',
  '학부모연락처*': 'phone',
  '학부모연락처': 'phone',
  '전화번호': 'phone',
  '휴대폰': 'phone',
  '학생연락처': 'studentPhone',
  '학생 연락처': 'studentPhone',
  '학생이름': 'studentName',
  '학생 이름': 'studentName',
  '자녀이름': 'studentName',
  '학년': 'grade',
  '반': 'className',
  '클래스': 'className',
  '소속반': 'className',
  '재원상태': 'status',
  '상태': 'status',
}

export function downloadParentImportTemplate(classNames: string[]) {
  const wb = XLSX.utils.book_new()

  const dataSheet = [
    [...BULK_IMPORT_HEADERS],
    ['홍길동', '01012345678', '홍철수', '01011112222', '초등 6', classNames[0] ?? 'A반', '재원'],
    ['김영희', '01098765432', '김민서', '', '초등 5', classNames[0] ?? 'A반', '재원'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(dataSheet)
  ws['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, ws, '등록양식')

  const guideRows = [
    ['항목', '필수', '설명'],
    ['학부모이름', 'O', '학부모(보호자) 실명'],
    ['학부모연락처', 'O', '숫자만 입력 권장 (010xxxxxxxx)'],
    ['학생이름', 'O', '학생 실명'],
    ['학생연락처', 'X', '학생 본인 연락처 (선택)'],
    ['학년', 'O', `예: ${VALID_GRADES.slice(0, 3).join(', ')} …`],
    ['반', 'O', '클래스 메뉴의 반 이름과 동일하게'],
    ['재원상태', 'X', '재원 / 휴원 / 퇴원 (비우면 재원)'],
    [],
    ['등록된 반 목록', '', classNames.length ? classNames.join(', ') : '(반을 먼저 등록하세요)'],
  ]
  const guideWs = XLSX.utils.aoa_to_sheet(guideRows)
  guideWs['!cols'] = [{ wch: 14 }, { wch: 6 }, { wch: 48 }]
  XLSX.utils.book_append_sheet(wb, guideWs, '작성가이드')

  XLSX.writeFile(wb, '학생_일괄등록_양식.xlsx')
}

function mapHeaderRow(row: string[]): Partial<Record<keyof Omit<BulkImportRow, 'rowNum' | 'errors'>, number>> {
  const map: Partial<Record<keyof Omit<BulkImportRow, 'rowNum' | 'errors'>, number>> = {}
  row.forEach((h, i) => {
    const trimmed = cellStr(h)
    const compact = trimmed.replace(/\s/g, '')
    const key =
      HEADER_ALIASES[trimmed] ??
      HEADER_ALIASES[compact] ??
      HEADER_ALIASES[trimmed.replace(/\*/g, '')] ??
      HEADER_ALIASES[compact.replace(/\*/g, '')]
    if (key) map[key] = i
  })
  return map
}

export function parseParentImportFile(
  file: File,
  classes: ClassRoom[],
): Promise<BulkImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const sheetName = wb.SheetNames.find((n) => n.includes('등록')) ?? wb.SheetNames[0]
        const sheet = wb.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1, defval: '' })
        if (rows.length < 2) {
          resolve([])
          return
        }

        const headerRow = (rows[0] as (string | number)[]).map((c) => cellStr(c))
        const colMap = mapHeaderRow(headerRow)
        if (colMap.parentName == null || colMap.phone == null) {
          reject(new Error('1행에 "학부모이름", "학부모연락처" 열이 필요합니다. 양식을 다운로드해 사용해 주세요.'))
          return
        }

        const classNames = new Set(classes.map((c) => c.name.trim()))
        const parsed: BulkImportRow[] = []

        for (let i = 1; i < rows.length; i++) {
          const raw = rows[i] as (string | number)[]
          if (!raw || raw.every((c) => cellStr(c) === '')) continue

          const row: BulkImportRow = {
            rowNum: i + 1,
            parentName: cellStr(raw[colMap.parentName!]),
            phone: cellStr(raw[colMap.phone!]),
            studentPhone: colMap.studentPhone != null ? cellStr(raw[colMap.studentPhone]) : '',
            studentName: colMap.studentName != null ? cellStr(raw[colMap.studentName]) : '',
            grade: colMap.grade != null ? cellStr(raw[colMap.grade]) : '',
            className: colMap.className != null ? cellStr(raw[colMap.className]) : '',
            status: colMap.status != null ? cellStr(raw[colMap.status]) : '',
            errors: [],
          }

          if (!row.parentName) row.errors.push('학부모이름이 비어 있습니다.')
          const ph = normalizePhone(row.phone)
          if (!ph || ph.length < 10) row.errors.push('학부모 연락처는 10자리 이상 숫자로 입력해 주세요.')
          const stuPh = normalizePhone(row.studentPhone)
          if (row.studentPhone && (!stuPh || stuPh.length < 10)) {
            row.errors.push('학생 연락처는 10자리 이상 숫자로 입력해 주세요.')
          }

          if (!row.studentName) row.errors.push('학생이름이 필요합니다.')
          if (!row.grade) row.errors.push('학년이 필요합니다.')
          else if (!VALID_GRADES.includes(row.grade as (typeof VALID_GRADES)[number])) {
            row.errors.push('학년 형식이 올바르지 않습니다. (예: 초등 6)')
          }
          if (!row.className) row.errors.push('반이 필요합니다.')
          else if (!classNames.has(row.className.trim())) {
            row.errors.push(`등록되지 않은 반입니다: "${row.className}"`)
          }

          if (row.status && !VALID_STATUSES.includes(row.status as (typeof VALID_STATUSES)[number])) {
            row.errors.push('재원상태는 재원, 휴원, 퇴원 중 하나여야 합니다.')
          }

          parsed.push(row)
        }
        resolve(parsed)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'))
    reader.readAsArrayBuffer(file)
  })
}

export type BulkImportResult = {
  studentsCreated: number
  skipped: number
  failures: { rowNum: number; message: string }[]
}

export async function executeParentBulkImport(
  rows: BulkImportRow[],
  deps: {
    classes: ClassRoom[]
    createStudent: (s: {
      name: string
      grade: string
      classroomId: number
      parentName: string
      parentPhone: string
      status?: string
      phone?: string
    }) => Promise<Student>
  },
): Promise<BulkImportResult> {
  const validRows = rows.filter((r) => r.errors.length === 0)
  const result: BulkImportResult = {
    studentsCreated: 0,
    skipped: rows.length - validRows.length,
    failures: [],
  }

  for (const row of validRows) {
    try {
      const cls = deps.classes.find((c) => c.name.trim() === row.className.trim())
      if (!cls) {
        result.failures.push({ rowNum: row.rowNum, message: '반 정보를 찾을 수 없습니다.' })
        continue
      }
      await deps.createStudent({
        parentName: row.parentName,
        parentPhone: row.phone,
        name: row.studentName,
        grade: row.grade,
        classroomId: cls.cid,
        status: row.status || '재원',
        phone: row.studentPhone || undefined,
      })
      result.studentsCreated++
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      result.failures.push({
        rowNum: row.rowNum,
        message: err?.response?.data?.message ?? err?.message ?? '등록 실패',
      })
    }
  }

  return result
}
