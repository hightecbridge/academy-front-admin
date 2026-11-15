import * as XLSX from 'xlsx'
import { utils as styleUtils, writeFile as writeStyledFile, type CellStyle } from 'xlsx-js-style'
import type { ExamItem, ExamScoreRow, ExamStats } from '../types'

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
  const sections = exam.sections ?? []
  const cols = ['학생ID', '학생명', '반']
  if (sections.length === 0) cols.push('전체점수')
  for (const sec of sections) cols.push(sec.name)
  cols.push('코멘트')
  return cols
}

function percentOf(score: number, maxScore: number): number | null {
  if (maxScore <= 0) return null
  return Math.round((score * 1000) / maxScore) / 10
}

function excelName(name: string) {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim()
  return (cleaned || '시험').slice(0, 80)
}

function excelNum(v: number | null | undefined): number | '' {
  return v == null || Number.isNaN(v) ? '' : v
}

export function downloadRankingExcel(stats: Pick<ExamStats, 'title' | 'average' | 'ranking'>) {
  const ranking = stats.ranking ?? []
  const sections: { sectionId: number; name: string }[] = []
  const seen = new Set<number>()
  for (const row of ranking) {
    for (const sec of row.sections ?? []) {
      if (sec.sectionId == null || seen.has(sec.sectionId)) continue
      seen.add(sec.sectionId)
      sections.push({ sectionId: sec.sectionId, name: (sec.name || '영역').trim() || '영역' })
    }
  }
  const headers = ['레벨통합석차', '클래스석차', '이름', '반명', '전체평균', '클래스평균', '내점수']
  for (const sec of sections) {
    headers.push(`${sec.name} 전체평균`, `${sec.name}점수`)
  }
  const data: (string | number)[][] = [headers]
  for (const row of ranking) {
    const line: (string | number)[] = [
      excelNum(row.rank),
      excelNum(row.classRank),
      row.studentName ?? '',
      row.classroomName ?? '',
      excelNum(stats.average),
      excelNum(row.classAvg),
      excelNum(row.score),
    ]
    for (const sec of sections) {
      const found = (row.sections ?? []).find((item) => item.sectionId === sec.sectionId)
      line.push(excelNum(found?.examAvg), excelNum(found?.score))
    }
    data.push(line)
  }
  const ws = styleUtils.aoa_to_sheet(data)
  const headerStyle: CellStyle = {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center' },
  }
  headers.forEach((_, index) => {
    const cell = ws[styleUtils.encode_cell({ r: 0, c: index })]
    if (cell) cell.s = headerStyle
  })
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(12, h.length * 2 + 2) }))
  const wb = styleUtils.book_new()
  styleUtils.book_append_sheet(wb, ws, '학생별순위')
  writeStyledFile(wb, `${excelName(stats.title)}_학생순위.xlsx`)
}

export function downloadExamScoreTemplate(exam: ExamItem, rows: ExamScoreRow[], drafts?: Record<number, {
  score: string
  comment: string
  sections: Record<number, { score: string; percent: string }>
}>) {
  const headers = headersFor(exam)
  const sections = exam.sections ?? []
  const data: (string | number)[][] = [headers]
  for (const row of rows) {
    const draft = drafts?.[row.studentId]
    const line: (string | number)[] = [
      row.studentId,
      row.studentName,
      row.classroomName ?? '',
    ]
    if (sections.length === 0) {
      line.push(draft?.score ?? (row.score == null ? '' : row.score))
    }
    for (const sec of sections) {
      const sd = draft?.sections[sec.id]
      const saved = row.sectionScores?.find((s) => s.sectionId === sec.id)
      line.push(sd?.score ?? (saved?.score == null ? '' : saved.score))
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
    [(exam.sections ?? []).length > 0
      ? '영역 점수만 숫자로 입력하세요. 백분율과 전체 점수는 자동 계산됩니다. 비워 두면 미입력입니다.'
      : '전체점수를 숫자로 입력하세요. 비워 두면 미응시입니다.'],
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
  const sections = exam.sections ?? []
  const hasSections = sections.length > 0
  const idIdx = header.findIndex((h) => h.replace(/\s/g, '') === '학생ID' || h === '학생ID')
  if (idIdx < 0) return { records: [], errors: [{ row: 1, message: '학생ID 열이 없습니다. 템플릿을 다시 내려받으세요.' }] }
  if (hasSections) {
    for (const sec of sections) {
      if (!header.includes(sec.name)) {
        return { records: [], errors: [{ row: 1, message: `${sec.name} 열이 없습니다. 템플릿을 다시 내려받으세요.` }] }
      }
    }
  }
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
    if (!hasSections && scoreIdx >= 0) {
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
    const sectionRows: ExamExcelRecord['sections'] = []
    let sectionError = false
    for (const sec of sections) {
      const sIdx = header.findIndex((h) => h === sec.name)
      const sParsed = cellNum(line[sIdx])
      if (!sParsed.ok) {
        errors.push({ row: rowNum, message: `${student.studentName}: ${sec.name} 점수가 숫자가 아닙니다.` })
        sectionError = true
        break
      }
      if (!sParsed.empty && (sParsed.value! < 0 || sParsed.value! > sec.maxScore)) {
        errors.push({ row: rowNum, message: `${student.studentName}: ${sec.name} 점수는 0~${sec.maxScore}점입니다.` })
        sectionError = true
        break
      }
      sectionRows.push({
        sectionId: sec.id,
        score: sParsed.empty ? null : sParsed.value,
        percent: sParsed.empty ? null : percentOf(sParsed.value!, sec.maxScore),
      })
    }
    if (sectionError) continue
    records.push({
      studentId,
      score,
      comment: commentIdx >= 0 ? cellStr(line[commentIdx]) : '',
      sections: sectionRows,
    })
  }
  return { records, errors }
}
