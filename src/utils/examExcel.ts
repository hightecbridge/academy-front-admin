import * as XLSX from 'xlsx'
import type { ExamItem, ExamScoreRow } from '../types'

export type ExamExcelRecord = {
  studentId: number
  score: number | null
  comment: string
  sections: { sectionId: number; score: number | null; percent: number | null }[]
}

export type ExamExcelIssue = {
  row: number
  message: string
}

function cellStr(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

function cellNum(v: unknown): { ok: boolean; empty: boolean; value: number | null } {
  const s = cellStr(v)
  if (s === '') return { ok: true, empty: true, value: null }
  const n = Number(s)
  if (Number.isNaN(n)) return { ok: false, empty: false, value: null }
  return { ok: true, empty: false, value: n }
}

function headersFor(exam: ExamItem): string[] {
  const cols = ['학생ID', '학생명', '반', '학년', '전체점수']
  for (const sec of exam.sections ?? []) {
    cols.push(sec.name)
    cols.push(`${sec.name}백분율`)
  }
  cols.push('코멘트')
  return cols
}

export function downloadExamScoreTemplate(exam: ExamItem, rows: ExamScoreRow[], drafts?: Record<number, {
  score: string
  comment: string
  sections: Record<number, { score: string; percent: string }>
}>) {
  const headers = headersFor(exam)
  const data: (string | number)[][] = [headers]
  for (const row of rows) {
    const draft = drafts?.[row.studentId]
    const line: (string | number)[] = [
      row.studentId,
      row.studentName,
      row.classroomName ?? '',
      '',
      draft?.score ?? (row.score == null ? '' : row.score),
    ]
    for (const sec of exam.sections ?? []) {
      const sd = draft?.sections[sec.id]
      const saved = row.sectionScores?.find((s) => s.sectionId === sec.id)
      line.push(sd?.score ?? (saved?.score == null ? '' : saved.score))
      line.push(sd?.percent ?? (saved?.percent == null ? '' : saved.percent))
    }
    line.push(draft?.comment ?? row.comment ?? '')
    data.push(line)
  }
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(10, h.length + 2) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '성적입력')
  const guide = XLSX.utils.aoa_to_sheet([
    ['안내'],
    ['학생ID는 수정하지 마세요. 이름·반으로 매칭하지 않고 ID로 반영됩니다.'],
    ['전체점수·과목 점수를 숫자로 입력하세요. 비워 두면 미응시/미입력입니다.'],
    ['과목 실제 점수만 넣으면 백분율은 비워도 됩니다.'],
    [`전체 만점: ${exam.maxScore}점`],
  ])
  XLSX.utils.book_append_sheet(wb, guide, '안내')
  XLSX.writeFile(wb, `${exam.title || '시험'}_성적양식.xlsx`)
}

export function parseExamScoreExcel(
  file: ArrayBuffer,
  exam: ExamItem,
  roster: ExamScoreRow[],
): { records: ExamExcelRecord[]; errors: ExamExcelIssue[] } {
  const wb = XLSX.read(file, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) return { records: [], errors: [{ row: 1, message: '시트를 읽을 수 없습니다.' }] }
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1, defval: '' })
  if (rows.length < 2) return { records: [], errors: [{ row: 1, message: '데이터가 없습니다.' }] }

  const header = (rows[0] ?? []).map((h) => cellStr(h))
  const idIdx = header.findIndex((h) => h.replace(/\s/g, '') === '학생ID' || h === '학생ID')
  if (idIdx < 0) return { records: [], errors: [{ row: 1, message: '학생ID 열이 없습니다. 템플릿을 다시 내려받으세요.' }] }
  const scoreIdx = header.findIndex((h) => h.replace(/\s/g, '') === '전체점수')
  const commentIdx = header.findIndex((h) => h === '코멘트' || h === '메모')
  const byId = new Map(roster.map((r) => [r.studentId, r]))
  const seen = new Set<number>()
  const records: ExamExcelRecord[] = []
  const errors: ExamExcelIssue[] = []

  for (let i = 1; i < rows.length; i++) {
    const line = rows[i] ?? []
    const rowNum = i + 1
    const idRaw = cellStr(line[idIdx])
    if (!idRaw && line.every((c) => cellStr(c) === '')) continue
    const studentId = Number(idRaw)
    if (!idRaw || Number.isNaN(studentId) || !byId.has(studentId)) {
      errors.push({ row: rowNum, message: '대상 학생 ID가 아니거나 비어 있습니다.' })
      continue
    }
    if (seen.has(studentId)) {
      errors.push({ row: rowNum, message: '같은 학생이 중복되었습니다.' })
      continue
    }
    seen.add(studentId)
    const student = byId.get(studentId)!
    let score: number | null = null
    if (scoreIdx >= 0) {
      const parsed = cellNum(line[scoreIdx])
      if (!parsed.ok) {
        errors.push({ row: rowNum, message: `${student.studentName}: 전체점수가 숫자가 아닙니다.` })
        continue
      }
      if (!parsed.empty) {
        if (parsed.value! < 0 || parsed.value! > exam.maxScore) {
          errors.push({ row: rowNum, message: `${student.studentName}: 전체점수는 0~${exam.maxScore}점입니다.` })
          continue
        }
        score = parsed.value
      }
    }
    const sections: ExamExcelRecord['sections'] = []
    let sectionError = false
    for (const sec of exam.sections ?? []) {
      const sIdx = header.findIndex((h) => h === sec.name)
      const pIdx = header.findIndex((h) => h === `${sec.name}백분율` || h === `${sec.name}_백분율`)
      const sParsed = sIdx >= 0 ? cellNum(line[sIdx]) : { ok: true, empty: true, value: null as number | null }
      const pParsed = pIdx >= 0 ? cellNum(line[pIdx]) : { ok: true, empty: true, value: null as number | null }
      if (!sParsed.ok) {
        errors.push({ row: rowNum, message: `${student.studentName}: ${sec.name} 점수가 숫자가 아닙니다.` })
        sectionError = true
        break
      }
      if (!pParsed.ok) {
        errors.push({ row: rowNum, message: `${student.studentName}: ${sec.name} 백분율이 숫자가 아닙니다.` })
        sectionError = true
        break
      }
      if (!sParsed.empty && (sParsed.value! < 0 || sParsed.value! > sec.maxScore)) {
        errors.push({ row: rowNum, message: `${student.studentName}: ${sec.name} 점수는 0~${sec.maxScore}점입니다.` })
        sectionError = true
        break
      }
      if (!pParsed.empty && (pParsed.value! < 0 || pParsed.value! > 100)) {
        errors.push({ row: rowNum, message: `${student.studentName}: ${sec.name} 백분율은 0~100입니다.` })
        sectionError = true
        break
      }
      sections.push({
        sectionId: sec.id,
        score: sParsed.empty ? null : sParsed.value,
        percent: pParsed.empty ? null : pParsed.value,
      })
    }
    if (sectionError) continue
    records.push({
      studentId,
      score,
      comment: commentIdx >= 0 ? cellStr(line[commentIdx]) : '',
      sections,
    })
  }
  return { records, errors }
}
