import client from './client'
import { mapExam } from '../store/dataStore'
import type { ExamItem } from '../types'
import type { ExamScoreRecord, ExamWritePayload } from './regularExams'

export type DailyExamQuery = {
  classroomId?: number
  from?: string
  to?: string
}

export type DailyCalendarDay = {
  date: string
  count: number
}

export async function fetchDailyExams(query: DailyExamQuery = {}): Promise<ExamItem[]> {
  const res = await client.get('/admin/exams/daily', { params: query })
  return (res.data?.data ?? []).map(mapExam)
}

export async function fetchDailyCalendar(year: number, month: number): Promise<DailyCalendarDay[]> {
  const res = await client.get('/admin/exams/daily/calendar', { params: { year, month } })
  return Array.isArray(res.data?.data?.days) ? res.data.data.days : []
}

export async function fetchDailyExam(examId: number): Promise<ExamItem> {
  const res = await client.get(`/admin/exams/daily/${examId}`)
  return mapExam(res.data.data)
}

export async function createDailyExam(p: ExamWritePayload): Promise<ExamItem> {
  const res = await client.post('/admin/exams/daily', { ...p, kind: 'CLASS' })
  return mapExam(res.data.data)
}

export async function updateDailyExam(examId: number, p: ExamWritePayload): Promise<ExamItem> {
  const res = await client.put(`/admin/exams/daily/${examId}`, { ...p, kind: 'CLASS' })
  return mapExam(res.data.data)
}

export async function deleteDailyExam(examId: number): Promise<void> {
  await client.delete(`/admin/exams/daily/${examId}`)
}

export async function saveDailyExamScores(
  examId: number,
  records: ExamScoreRecord[],
  opts?: { complete?: boolean; classroomId?: number | null },
): Promise<ExamItem> {
  const res = await client.put(`/admin/exams/daily/${examId}/scores`, {
    records,
    complete: opts?.complete ?? false,
    classroomId: opts?.classroomId ?? null,
  })
  return mapExam(res.data.data)
}
