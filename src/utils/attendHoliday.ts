import type { AttendSheet, AttendStatus, CalendarEvent, Student } from '../types'
import { koreanHolidayName } from './koreanHolidays'

export type AttendHolidayEvent = Pick<CalendarEvent, 'date' | 'endDate' | 'category' | 'targets' | 'title'>

export function eventCoversDate(ev: Pick<CalendarEvent, 'date' | 'endDate'>, date: string) {
  const end = ev.endDate || ev.date
  return date >= ev.date && date <= end
}

export function eventTargetsClass(ev: Pick<CalendarEvent, 'targets'>, className?: string) {
  const targets = ev.targets ?? []
  if (targets.length === 0 || targets.includes('전체')) return true
  if (!className) return false
  return targets.includes(className)
}

export function academyHolidayName(date: string, events: AttendHolidayEvent[], className?: string) {
  const hit = events.find((ev) =>
    ev.category === '휴일' && eventCoversDate(ev, date) && eventTargetsClass(ev, className),
  )
  if (!hit) return null
  return hit.title?.trim() || '학원 휴일'
}

export function attendHolidayName(date: string, events: AttendHolidayEvent[], className?: string) {
  return koreanHolidayName(date) ?? academyHolidayName(date, events, className)
}

export function shouldSkipAttend(
  date: string,
  excludeHolidays: boolean,
  events: AttendHolidayEvent[],
  className?: string,
) {
  if (!excludeHolidays) return false
  return attendHolidayName(date, events, className) != null
}

export function isPresentDay(status: AttendStatus) {
  return status === '출석'
}

export function isAbsentDay(status: AttendStatus) {
  return status === '결석'
}

export function classSheetsForMonth(
  sheets: AttendSheet[],
  cid: number,
  ym: string,
  excludeHolidays: boolean,
  events: AttendHolidayEvent[],
  className?: string,
) {
  return sheets
    .filter((sh) => sh.cid === cid && sh.date.startsWith(ym))
    .filter((sh) => !shouldSkipAttend(sh.date, excludeHolidays, events, className))
}

export function studentMonthAttendStats(
  student: Student,
  sheets: AttendSheet[],
) {
  const present = sheets.filter((sh) => sh.records.find((r) => r.sid === student.sid && isPresentDay(r.status))).length
  const late = sheets.filter((sh) => sh.records.find((r) => r.sid === student.sid && (r.status === '지각' || r.status === '조퇴'))).length
  const absent = sheets.filter((sh) => sh.records.find((r) => r.sid === student.sid && isAbsentDay(r.status))).length
  const excused = sheets.filter((sh) => sh.records.find((r) => r.sid === student.sid && r.status === '공결')).length
  const classDays = sheets.length
  const rate = classDays > 0 ? Math.round((present / classDays) * 100) : 0
  return { classDays, present, late, absent, excused, rate }
}
