import client from './client'
import { mapExam } from '../store/dataStore'
import type { ExamItem } from '../types'

export type ExamWritePayload = {
  title: string
  date: string
  subject?: string
  maxScore?: number
  targetGrade?: string | null
  classroomIds: number[]
  sections?: { id?: number; name: string; maxScore: number; weight?: number }[]
}

export type ExamScoreRecord = {
  studentId: number
  score: number | null
  comment?: string
  sectionScores?: { sectionId: number; score: number | null; percent: number | null }[]
}

export type RegularExamQuery = {
  grade?: string
  from?: string
  to?: string
  status?: string
  q?: string
  page?: number
  size?: number
  dateDesc?: boolean
}

export type RegularExamPage = {
  content: ExamItem[]
  totalElements: number
  totalPages: number
  page: number
  size: number
}

export async function fetchRegularExams(query: RegularExamQuery = {}): Promise<RegularExamPage> {
  const res = await client.get('/admin/exams/regular', { params: query })
  const d = res.data?.data ?? {}
  return {
    content: Array.isArray(d.content) ? d.content.map(mapExam) : [],
    totalElements: d.totalElements ?? 0,
    totalPages: d.totalPages ?? 0,
    page: d.page ?? 0,
    size: d.size ?? 10,
  }
}

export async function fetchRegularExam(examId: number): Promise<ExamItem> {
  const res = await client.get(`/admin/exams/regular/${examId}`)
  return mapExam(res.data.data)
}

export async function createRegularExam(p: ExamWritePayload): Promise<ExamItem> {
  const res = await client.post('/admin/exams/regular', { ...p, kind: 'ALL' })
  return mapExam(res.data.data)
}

export async function updateRegularExam(examId: number, p: ExamWritePayload): Promise<ExamItem> {
  const res = await client.put(`/admin/exams/regular/${examId}`, { ...p, kind: 'ALL' })
  return mapExam(res.data.data)
}

export async function deleteRegularExam(examId: number): Promise<void> {
  await client.delete(`/admin/exams/regular/${examId}`)
}

export async function saveRegularExamScores(
  examId: number,
  records: ExamScoreRecord[],
  opts?: { complete?: boolean; classroomId?: number | null },
): Promise<ExamItem> {
  const res = await client.put(`/admin/exams/regular/${examId}/scores`, {
    records,
    complete: opts?.complete ?? false,
    classroomId: opts?.classroomId ?? null,
  })
  return mapExam(res.data.data)
}

export async function closeRegularExam(examId: number): Promise<ExamItem> {
  const res = await client.post(`/admin/exams/regular/${examId}/close`)
  return mapExam(res.data.data)
}

export async function fetchRegularExamStats(examId: number) {
  const res = await client.get(`/admin/exams/regular/${examId}/stats`)
  return res.data.data
}
