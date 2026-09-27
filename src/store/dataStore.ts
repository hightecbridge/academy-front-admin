// src/store/dataStore.ts
import { create } from 'zustand'
import client from '../api/client'
import type {
  Student, ClassRoom, AttendSheet, AttendRecord,
  AttendStatus, NoticeItem, CalendarEvent,
  HomeworkSheet, HomeworkRecord, SenderNumber, MessageSendLog,
  FeeItem,
  FeeItemKey,
  FeeUpdatePayload,
  Consultation,
  ConsultKind,
  Counselor,
  ConsultWritePayload,
  DashboardStats,
  ExamItem, GradeHistory, ExamStats, ExamSection, ExamScoreSection,
} from '../types'
import { currentYearMonth } from '../utils/paymentMonth'

interface DataState {
  students:       Student[]
  /** 수납현황에서 조회·저장하는 기준 연월 (YYYYMM) */
  paymentYearMonth: number
  classes:        ClassRoom[]
  attendSheets:   AttendSheet[]
  homeworkSheets: HomeworkSheet[]
  exams:          ExamItem[]
  notices:        NoticeItem[]
  noticeTotal:    number
  classNotices:   NoticeItem[]
  classNoticeTotal: number
  events:         CalendarEvent[]
  senderNumbers:  SenderNumber[]
  messageSends:   MessageSendLog[]
  consultations:  Consultation[]
  counselors:     Counselor[]
  dashboardStats: DashboardStats | null
  isLoading:      boolean

  fetchClasses:   () => Promise<void>
  fetchStudents:  (yearMonth?: number) => Promise<void>
  /** @deprecated fetchStudents 사용 */
  fetchParents:   (yearMonth?: number) => Promise<void>
  setPaymentYearMonth: (yearMonth: number) => void
  fetchAttend:    (cid: number) => Promise<void>
  fetchHomework:  (cid: number) => Promise<void>
  fetchExams:     () => Promise<void>
  fetchExam:      (examId: number) => Promise<ExamItem>
  createExam:     (p: { title: string; date: string; subject?: string; maxScore?: number; kind: 'ALL' | 'CLASS'; targetGrade?: string | null; classroomIds: number[]; sections?: { id?: number; name: string; maxScore: number; weight?: number }[] }) => Promise<ExamItem>
  updateExam:     (examId: number, p: { title: string; date: string; subject?: string; maxScore?: number; kind: 'ALL' | 'CLASS'; targetGrade?: string | null; classroomIds: number[]; sections?: { id?: number; name: string; maxScore: number; weight?: number }[] }) => Promise<ExamItem>
  deleteExam:     (examId: number) => Promise<void>
  saveExamScores: (examId: number, records: { studentId: number; score: number | null; comment?: string; sectionScores?: { sectionId: number; score: number | null; percent: number | null }[] }[], opts?: { complete?: boolean; classroomId?: number | null }) => Promise<ExamItem>
  fetchExamStats: (examId: number) => Promise<ExamStats>
  fetchStudentGrades: (sid: number) => Promise<GradeHistory>
  fetchNotices:   (page?: number, size?: number, target?: string | null, q?: string) => Promise<void>
  fetchClassNotices: (page?: number, size?: number, target?: string | null, q?: string) => Promise<void>
  fetchEvents:    () => Promise<void>
  fetchSenderNumbers: () => Promise<void>
  fetchMessageSends:  () => Promise<void>
  fetchConsultations: (year?: number, month?: number, kind?: ConsultKind | 'all') => Promise<void>
  searchConsultations: (q: string, kind?: ConsultKind | 'all') => Promise<Consultation[]>
  fetchCounselors: () => Promise<void>
  fetchStudentConsultations: (sid: number) => Promise<Consultation[]>
  addConsultation: (payload: ConsultWritePayload) => Promise<Consultation>
  updateConsultation: (id: number, payload: ConsultWritePayload) => Promise<Consultation>
  deleteConsultation: (id: number) => Promise<void>
  fetchDashboardStats: (year?: number) => Promise<void>
  saveMessageSendLog: (p: {
    kind: MessageSendLog['kind']
    provider?: MessageSendLog['provider']
    targetLabel: string
    title: string
    bodyPreview: string
    recipientCount: number
    messageType?: 'KAKAO_ALIMTALK' | 'SMS' | 'LMS' | 'MMS' | 'PAYMENT_SMS' | 'PAYMENT_NUDGE'
    templateCode?: string
    sendNo?: string
    body?: string
    recipientPhones?: string[]
    attachFileIdList?: number[]
    attachFiles?: { fileName: string; fileBodyBase64: string }[]
  }) => Promise<void>

  addClass:    (cls: Omit<ClassRoom, 'cid' | 'createdAt'>) => Promise<void>
  updateClass: (cid: number, cls: Partial<Omit<ClassRoom, 'cid'>>) => Promise<void>
  deleteClass: (cid: number) => Promise<void>

  createStudent: (s: {
    name: string
    grade: string
    classroomId: number
    parentName: string
    parentPhone: string
    status?: string
    phone?: string
    birthDate?: string
    loginPhone?: string
    loginPassword?: string
    badgeColor?: string
    badgeTextColor?: string
    kakaoLinked?: boolean
  }) => Promise<Student>
  updateStudent: (sid: number, s: {
    name: string
    grade: string
    classroomId: number
    parentName: string
    parentPhone: string
    status?: string
    phone?: string
    birthDate?: string
    kakaoLinked?: boolean
  }) => Promise<Student>
  deleteStudent: (sid: number) => Promise<void>
  withdrawStudent: (sid: number) => Promise<void>
  updateStudentStatus: (sid: number, status: Student['status']) => Promise<void>

  updateFee:   (sid: number, key: FeeItemKey, payload: FeeUpdatePayload, yearMonth?: number) => Promise<void>

  saveAttendSheet:  (cid: number, date: string, records: AttendRecord[]) => Promise<void>
  deleteAttendSheet: (sheetId: string) => Promise<void>
  saveHomeworkSheet:(cid: number, date: string, title: string, records: HomeworkRecord[]) => Promise<void>
  updateHomeworkRecord: (sheetId: string, sid: number, done: boolean, comment: string) => Promise<void>
  deleteHomeworkSheet: (sheetId: string) => Promise<void>

  addNotice:    (n: Omit<NoticeItem, 'id' | 'createdAt'>) => Promise<void>
  deleteNotice: (id: number) => Promise<void>
  addClassNotice:    (n: Omit<NoticeItem, 'id' | 'createdAt'>) => Promise<void>
  deleteClassNotice: (id: number) => Promise<void>

  addEvent:    (e: Omit<CalendarEvent, 'id' | 'createdAt'>) => Promise<void>
  updateEvent: (id: number, e: Partial<Omit<CalendarEvent, 'id'>>) => Promise<void>
  deleteEvent: (id: number) => Promise<void>

  // 발신번호
  addSenderNumber:    (s: Omit<SenderNumber, 'id'>) => Promise<void>
  deleteSenderNumber: (id: number) => Promise<void>
  setDefaultSender:   (id: number) => Promise<void>
}

// ── 변환 헬퍼 ──────────────────────────────────────
function toClass(d: any): ClassRoom {
  return {
    cid: d.id, name: d.name, subject: d.subject, teacher: d.teacher,
    teacherUserId: d.teacherUserId ?? undefined,
    schedule: d.schedule ?? '', capacity: d.capacity,
    tuitionFee: d.tuitionFee, bookFee: d.bookFee,
    color: d.color ?? '#DBEAFE', textColor: d.textColor ?? '#1D4ED8',
    createdAt: d.createdAt?.slice(0, 10) ?? '',
  }
}

function toFeeItem(fees: any[] | undefined, label: string, ym: number): FeeItem {
  const list = fees ?? []
  const cur = list.find((f: any) => f.label === label && f.yearMonth === ym)
  if (cur) {
    return {
      id: cur.id,
      label: cur.label,
      amount: cur.amount ?? 0,
      paid: !!cur.paid,
      yearMonth: cur.yearMonth ?? ym,
      paidAt: cur.paidAt ?? null,
      paymentMethod: cur.paymentMethod ?? null,
    }
  }
  const latest = list
    .filter((f: any) => f.label === label)
    .sort((a: any, b: any) => (b.yearMonth ?? 0) - (a.yearMonth ?? 0))[0]
  if (latest) {
    return {
      label: latest.label,
      amount: latest.amount ?? 0,
      paid: false,
      yearMonth: ym,
      paidAt: null,
      paymentMethod: null,
    }
  }
  return { label, amount: 0, paid: false, yearMonth: ym, paidAt: null, paymentMethod: null }
}

function toStudent(d: any, yearMonth: number): Student {
  const ym = yearMonth
  return {
    sid: d.id,
    name: d.name,
    cls: d.classroomName ?? '',
    classroomId: d.classroomId ?? undefined,
    grade: d.grade,
    birth: d.birthDate ?? '',
    phone: d.phone ?? '',
    parentName: d.parentName ?? '',
    parentPhone: d.parentPhone ?? '',
    col: d.badgeColor ?? '#DBEAFE',
    tc: d.badgeTextColor ?? '#1D4ED8',
    kakao: d.kakaoLinked ?? false,
    reg: d.createdAt?.slice(0, 10) ?? '',
    status: (d.status ?? '재원') as '재원' | '휴원' | '퇴원',
    withdrawnAt: d.withdrawnAt ?? null,
    fees: {
      tuition: toFeeItem(d.fees, '수업료', ym),
      book: toFeeItem(d.fees, '교재비', ym),
    },
  }
}

function toAttendSheet(d: any): AttendSheet {
  return {
    id:  `${d.classroomId}_${d.date}`,
    cid: d.classroomId,
    date: d.date,
    records: (d.records ?? []).map((r: any) => ({
      sid: r.studentId, status: r.status as AttendStatus, note: r.note ?? '',
    })),
    createdAt: d.createdAt ?? '',
  }
}

function toHwSheet(d: any): HomeworkSheet {
  return {
    id:  d.id ? String(d.id) : `hw_${d.classroomId}_${d.date}`,
    cid: d.classroomId,
    date: d.date, title: d.title,
    records: (d.records ?? []).map((r: any) => ({
      sid: Number(r.studentId),
      done: !!r.done,
      comment: r.comment ?? '',
    })),
    createdAt: d.createdAt?.slice(0, 10) ?? '',
  }
}

function toExamSection(s: any): ExamSection {
  return {
    id: s.id,
    name: s.name ?? '',
    maxScore: typeof s.maxScore === 'number' ? s.maxScore : 100,
    weight: typeof s.weight === 'number' ? s.weight : 0,
    sortOrder: typeof s.sortOrder === 'number' ? s.sortOrder : 0,
  }
}

function toExamScoreSection(s: any): ExamScoreSection {
  return {
    sectionId: s.sectionId,
    name: s.name ?? '',
    maxScore: typeof s.maxScore === 'number' ? s.maxScore : 100,
    score: s.score ?? null,
    percent: s.percent ?? null,
    examAvg: s.examAvg ?? null,
    classAvg: s.classAvg ?? null,
  }
}

function toExam(d: any): ExamItem {
  const classrooms = Array.isArray(d.classrooms)
    ? d.classrooms.map((c: any) => ({ id: c.id, name: c.name ?? '' }))
    : (d.classroomId ? [{ id: d.classroomId, name: d.classroomName ?? '' }] : [])
  return {
    id: d.id,
    cid: d.classroomId ?? classrooms[0]?.id ?? null,
    classroomName: d.classroomName ?? classrooms[0]?.name ?? '',
    classrooms,
    kind: d.kind === 'ALL' ? 'ALL' : 'CLASS',
    kindLabel: d.kindLabel ?? (d.kind === 'ALL' ? '정기고사/모의고사' : '일일테스트'),
    targetGrade: d.targetGrade ?? null,
    targetLabel: d.targetLabel ?? '',
    progressLabel: d.progressLabel ?? '',
    completedClasses: d.completedClasses ?? 0,
    totalClasses: d.totalClasses ?? 0,
    classProgress: Array.isArray(d.classProgress)
      ? d.classProgress.map((p: any) => ({
          classroomId: p.classroomId,
          classroomName: p.classroomName ?? '',
          entered: p.entered ?? 0,
          total: p.total ?? 0,
          complete: !!p.complete,
          status: p.status ?? '',
        }))
      : [],
    title: d.title,
    date: d.date,
    subject: d.subject ?? '',
    maxScore: typeof d.maxScore === 'number' ? d.maxScore : 100,
    participantCount: d.participantCount ?? 0,
    absentCount: d.absentCount ?? 0,
    totalStudents: d.totalStudents ?? 0,
    average: d.average ?? null,
    high: d.high ?? null,
    low: d.low ?? null,
    median: d.median ?? null,
    sections: Array.isArray(d.sections) ? d.sections.map(toExamSection) : [],
    scores: Array.isArray(d.scores)
      ? d.scores.map((s: any) => ({
          studentId: s.studentId,
          studentName: s.studentName ?? '',
          classroomId: s.classroomId ?? null,
          classroomName: s.classroomName ?? '',
          score: s.score ?? null,
          comment: s.comment ?? '',
          rank: s.rank ?? null,
          rankedCount: s.rankedCount ?? null,
          sectionScores: Array.isArray(s.sectionScores) ? s.sectionScores.map(toExamScoreSection) : [],
        }))
      : undefined,
    createdAt: d.createdAt ?? '',
    status: d.status ?? '',
    statusLabel: d.statusLabel ?? '',
    subjectSummary: d.subjectSummary ?? '',
    subjectCount: d.subjectCount ?? 0,
    enteredCount: d.enteredCount ?? d.participantCount ?? 0,
    closed: !!d.closed,
  }
}

export function mapExam(d: any): ExamItem {
  return toExam(d)
}

function toGradeHistory(d: any): GradeHistory {
  return {
    studentId: d.studentId,
    studentName: d.studentName ?? '',
    classroomName: d.classroomName ?? '',
    examCount: d.examCount ?? 0,
    average: d.average ?? null,
    latestDelta: d.latestDelta ?? null,
    items: Array.isArray(d.items)
      ? d.items.map((it: any) => ({
          examId: it.examId,
          title: it.title,
          date: it.date,
          subject: it.subject ?? '',
          kind: it.kind === 'ALL' ? 'ALL' : 'CLASS',
          kindLabel: it.kindLabel ?? (it.kind === 'ALL' ? '정기고사/모의고사' : '일일테스트'),
          classroomName: it.classroomName ?? '',
          score: it.score ?? null,
          maxScore: typeof it.maxScore === 'number' ? it.maxScore : 100,
          examAvg: it.examAvg ?? null,
          classAvg: it.classAvg ?? null,
          rank: it.rank ?? null,
          rankedCount: it.rankedCount ?? null,
          classRank: it.classRank ?? null,
          classRankedCount: it.classRankedCount ?? null,
          delta: it.delta ?? null,
          vsClassAvg: it.vsClassAvg ?? null,
          comment: it.comment ?? '',
          sectionScores: Array.isArray(it.sectionScores) ? it.sectionScores.map(toExamScoreSection) : [],
        }))
      : [],
  }
}

function toExamStats(d: any): ExamStats {
  return {
    examId: d.examId,
    title: d.title ?? '',
    date: d.date ?? '',
    subject: d.subject ?? '',
    kind: d.kind === 'ALL' ? 'ALL' : 'CLASS',
    kindLabel: d.kindLabel ?? (d.kind === 'ALL' ? '정기고사/모의고사' : '일일테스트'),
    maxScore: typeof d.maxScore === 'number' ? d.maxScore : 100,
    participantCount: d.participantCount ?? 0,
    totalStudents: d.totalStudents ?? 0,
    average: d.average ?? null,
    high: d.high ?? null,
    low: d.low ?? null,
    median: d.median ?? null,
    classrooms: Array.isArray(d.classrooms)
      ? d.classrooms.map((c: any) => ({
          classroomId: c.classroomId,
          classroomName: c.classroomName ?? '',
          participantCount: c.participantCount ?? 0,
          totalStudents: c.totalStudents ?? 0,
          average: c.average ?? null,
          high: c.high ?? null,
          low: c.low ?? null,
        }))
      : [],
    distribution: Array.isArray(d.distribution)
      ? d.distribution.map((b: any) => ({ label: b.label ?? '', count: b.count ?? 0 }))
      : [],
    ranking: Array.isArray(d.ranking)
      ? d.ranking.map((r: any) => ({
          studentId: r.studentId,
          studentName: r.studentName ?? '',
          classroomName: r.classroomName ?? '',
          score: r.score ?? null,
          rank: r.rank ?? null,
          rankedCount: r.rankedCount ?? 0,
        }))
      : [],
  }
}

function toNotice(d: any): NoticeItem {
  const files = Array.isArray(d.files)
    ? d.files.map((f: any, i: number) => ({
        id: f.id,
        fileName: f.fileName ?? `file-${i + 1}`,
        contentType: f.contentType ?? undefined,
        sizeBytes: typeof f.sizeBytes === 'number' ? f.sizeBytes : undefined,
        data: f.data ?? '',
        sortOrder: typeof f.sortOrder === 'number' ? f.sortOrder : i,
      })).filter((f: { data: string }) => !!f.data)
    : []
  return {
    id: d.id, title: d.title, body: d.body,
    targets: d.targets ?? ['전체'],
    imageUrl: d.imageUrl,
    files,
    date: d.date,
    createdAt: d.createdAt?.slice(0, 10) ?? '',
  }
}

function matchesConsultSearch(c: Consultation, q: string, students: Student[]) {
  const nq = q.trim()
  if (!nq) return true
  const digits = nq.replace(/\D/g, '')
  const stu = c.studentId != null ? students.find((s) => s.sid === c.studentId) : undefined
  const names = [
    c.studentName,
    c.parentName,
    c.prospectName,
    c.prospectParentName,
    stu?.name,
    stu?.parentName,
  ]
  if (names.some((n) => n && n.includes(nq))) return true
  if (digits.length < 3) return false
  const phones = [c.parentPhone, c.prospectPhone, stu?.parentPhone, stu?.phone]
  return phones.some((p) => p && p.replace(/\D/g, '').includes(digits))
}

function toConsult(d: any): Consultation {
  return {
    id: d.id,
    kind: (d.kind === '신규' ? '신규' : '재원생') as ConsultKind,
    studentId: d.studentId ?? null,
    studentName: d.studentName ?? d.prospectName ?? '',
    studentStatus: d.studentStatus ?? null,
    classroomName: d.classroomName ?? null,
    parentName: d.parentName ?? null,
    parentPhone: d.parentPhone ?? null,
    teacherUserId: d.teacherUserId ?? null,
    teacherName: d.teacherName ?? null,
    date: d.date ?? '',
    time: d.time ?? null,
    status: (d.status ?? '완료') as Consultation['status'],
    content: d.content ?? '',
    prospectName: d.prospectName ?? null,
    prospectPhone: d.prospectPhone ?? null,
    prospectGrade: d.prospectGrade ?? null,
    prospectParentName: d.prospectParentName ?? null,
    createdAt: d.createdAt ?? '',
  }
}

function toEvent(d: any): CalendarEvent {
  return {
    id: d.id, title: d.title,
    date: d.date, endDate: d.endDate,
    category: (d.category ?? '기타') as CalendarEvent['category'],
    targets: d.targets ?? ['전체'],
    description: d.description,
    color: d.color ?? '#3B82F6',
    allDay: d.allDay ?? true,
    createdAt: d.createdAt?.slice(0, 10) ?? '',
  }
}

function toSenderNumber(d: any): SenderNumber {
  return {
    id: d.id,
    label: d.label,
    number: d.number,
    isDefault: !!d.isDefault,
  }
}

function toMessageSendLog(d: any): MessageSendLog {
  const messageType =
    typeof d.messageType === 'string' && d.messageType.trim().length > 0
      ? d.messageType
      : null
  const deductedPoints = typeof d.deductedPoints === 'number' ? d.deductedPoints : null
  const remainingPoints = typeof d.remainingPoints === 'number' ? d.remainingPoints : null
  return {
    id: d.id,
    kind: d.kind as MessageSendLog['kind'],
    provider: (d.provider ?? null) as MessageSendLog['provider'],
    targetLabel: d.targetLabel ?? '',
    title: d.title ?? '',
    bodyPreview: d.bodyPreview ?? '',
    recipientCount: typeof d.recipientCount === 'number' ? d.recipientCount : 0,
    messageType: messageType as MessageSendLog['messageType'],
    deductedPoints,
    remainingPoints,
    createdAt: d.createdAt ?? '',
  }
}

// ── Store ──────────────────────────────────────────
export const useDataStore = create<DataState>((set, get) => ({
  students: [],
  paymentYearMonth: currentYearMonth(),
  classes: [], attendSheets: [],
  homeworkSheets: [], exams: [], notices: [], noticeTotal: 0, classNotices: [], classNoticeTotal: 0, events: [],
  senderNumbers: [],
  messageSends: [],
  consultations: [],
  counselors: [],
  dashboardStats: null,
  isLoading: false,

  // ── 로드 ────────────────────────────────────────
  fetchClasses: async () => {
    try {
      const res = await client.get('/admin/classrooms')
      set({ classes: res.data.data.map(toClass) })
    } catch {}
  },

  setPaymentYearMonth: (yearMonth) => set({ paymentYearMonth: yearMonth }),

  fetchStudents: async (yearMonth) => {
    const ym = yearMonth ?? get().paymentYearMonth
    try {
      const res = await client.get('/admin/students', { params: { yearMonth: ym } })
      set({ students: res.data.data.map((s: any) => toStudent(s, ym)), paymentYearMonth: ym })
    } catch {}
  },

  fetchParents: async (yearMonth) => get().fetchStudents(yearMonth),

  fetchAttend: async (cid) => {
    try {
      const res = await client.get(`/admin/classrooms/${cid}/attend`)
      const sheets: AttendSheet[] = res.data.data.map(toAttendSheet)
      set(s => ({
        attendSheets: [
          ...s.attendSheets.filter(a => a.cid !== cid),
          ...sheets,
        ],
      }))
    } catch {}
  },

  fetchHomework: async (cid) => {
    try {
      const res = await client.get(`/admin/classrooms/${cid}/homework`)
      const sheets: HomeworkSheet[] = res.data.data.map(toHwSheet)
      set(s => ({
        homeworkSheets: [
          ...s.homeworkSheets.filter(h => h.cid !== cid),
          ...sheets,
        ],
      }))
    } catch {}
  },

  fetchExams: async () => {
    const res = await client.get('/admin/exams')
    const list: ExamItem[] = (res.data?.data ?? []).map(toExam)
    set({ exams: list })
  },

  fetchExam: async (examId) => {
    const res = await client.get(`/admin/exams/${examId}`)
    const exam = toExam(res.data.data)
    set(s => ({
      exams: [exam, ...s.exams.filter(e => e.id !== exam.id)],
    }))
    return exam
  },

  createExam: async (p) => {
    const res = await client.post('/admin/exams', {
      title: p.title,
      date: p.date,
      subject: p.subject,
      maxScore: p.maxScore ?? 100,
      kind: p.kind,
      targetGrade: p.targetGrade ?? null,
      classroomIds: p.classroomIds,
      sections: p.sections ?? [],
    })
    const created = toExam(res.data.data)
    set(s => ({ exams: [created, ...s.exams.filter(e => e.id !== created.id)] }))
    return created
  },

  updateExam: async (examId, p) => {
    const res = await client.put(`/admin/exams/${examId}`, {
      title: p.title,
      date: p.date,
      subject: p.subject,
      maxScore: p.maxScore ?? 100,
      kind: p.kind,
      targetGrade: p.targetGrade ?? null,
      classroomIds: p.classroomIds,
      sections: p.sections ?? [],
    })
    const updated = toExam(res.data.data)
    set(s => ({ exams: s.exams.map(e => e.id === examId ? { ...e, ...updated, scores: updated.scores ?? e.scores } : e) }))
    return updated
  },

  deleteExam: async (examId) => {
    await client.delete(`/admin/exams/${examId}`)
    set(s => ({ exams: s.exams.filter(e => e.id !== examId) }))
  },

  saveExamScores: async (examId, records, opts) => {
    const res = await client.put(`/admin/exams/${examId}/scores`, {
      records,
      complete: opts?.complete ?? false,
      classroomId: opts?.classroomId ?? null,
    })
    const updated = toExam(res.data.data)
    set(s => ({ exams: s.exams.map(e => e.id === examId ? updated : e) }))
    return updated
  },

  fetchExamStats: async (examId) => {
    const res = await client.get(`/admin/exams/${examId}/stats`)
    return toExamStats(res.data.data)
  },

  fetchStudentGrades: async (sid) => {
    const res = await client.get(`/admin/students/${sid}/grades`)
    return toGradeHistory(res.data.data)
  },

  fetchNotices: async (page = 0, size = 10, target = null, q = '') => {
    try {
      const params: Record<string, any> = { page, size }
      if (target) params.target = target
      if (q && q.trim()) params.q = q.trim()

      const res = await client.get('/admin/notices', { params })
      const api = res.data
      const payload = api?.data
      const content = Array.isArray(payload?.content) ? payload.content : []

      if (api?.success !== true) {
        console.warn('[front] fetchNotices api reported failure:', api?.message, api)
      }

      const totalElements = typeof payload?.totalElements === 'number' ? payload.totalElements : 0
      const mapped = content.map(toNotice)
      console.log('[front] fetchNotices page=', page, 'size=', size, 'mappedLen=', mapped.length, 'totalElements=', totalElements)
      set({ notices: mapped, noticeTotal: totalElements })
    } catch (err: any) {
      console.error('공지 조회 실패:', err?.response?.data ?? err?.message ?? err)
    }
  },

  fetchClassNotices: async (page = 0, size = 10, target = null, q = '') => {
    try {
      const params: Record<string, any> = { page, size }
      if (target) params.target = target
      if (q && q.trim()) params.q = q.trim()

      const res = await client.get('/admin/class-notices', { params })
      const api = res.data
      const payload = api?.data
      const content = Array.isArray(payload?.content) ? payload.content : []

      if (api?.success !== true) {
        console.warn('[front] fetchClassNotices api reported failure:', api?.message, api)
      }

      const totalElements = typeof payload?.totalElements === 'number' ? payload.totalElements : 0
      const mapped = content.map(toNotice)
      set({ classNotices: mapped, classNoticeTotal: totalElements })
    } catch (err: any) {
      console.error('클래스 알림장 조회 실패:', err?.response?.data ?? err?.message ?? err)
    }
  },

  fetchEvents: async () => {
    try {
      const res = await client.get('/admin/events')
      set({ events: res.data.data.map(toEvent) })
    } catch {}
  },

  fetchSenderNumbers: async () => {
    try {
      const res = await client.get('/admin/sender-numbers')
      const list = res.data?.data ?? []
      const mapped = Array.isArray(list) ? list.map(toSenderNumber) : []
      set({ senderNumbers: mapped })
    } catch (e) {
      console.error('발신번호 목록 조회 실패:', e)
    }
  },

  fetchMessageSends: async () => {
    try {
      const res = await client.get('/admin/message-sends')
      const list = res.data?.data ?? []
      const mapped = Array.isArray(list) ? list.map(toMessageSendLog) : []
      set({ messageSends: mapped })
    } catch (e) {
      console.error('발송 내역 조회 실패:', e)
    }
  },

  saveMessageSendLog: async (p) => {
    const res = await client.post('/admin/message-sends', {
      kind: p.kind,
      provider: p.provider,
      targetLabel: p.targetLabel,
      title: p.title,
      bodyPreview: p.bodyPreview,
      recipientCount: p.recipientCount,
      messageType: p.messageType,
      templateCode: p.templateCode,
      sendNo: p.sendNo,
      body: p.body,
      recipientPhones: p.recipientPhones,
      attachFileIdList: p.attachFileIdList,
      attachFiles: p.attachFiles,
    })
    const created = toMessageSendLog(res.data.data)
    set(s => ({ messageSends: [created, ...s.messageSends.filter(x => x.id !== created.id)] }))
  },

  // ── 반 ──────────────────────────────────────────
  addClass: async (cls) => {
    const res = await client.post('/admin/classrooms', {
      name: cls.name, subject: cls.subject, teacher: cls.teacher,
      teacherUserId: cls.teacherUserId ?? null,
      schedule: cls.schedule, capacity: cls.capacity,
      tuitionFee: cls.tuitionFee, bookFee: cls.bookFee,
      color: cls.color, textColor: cls.textColor,
    })
    set(s => ({ classes: [...s.classes, toClass(res.data.data)] }))
  },

  updateClass: async (cid, cls) => {
    const cur = get().classes.find(c => c.cid === cid)
    if (!cur) throw new Error('반 정보를 찾을 수 없습니다.')
    const body = {
      name: cls.name ?? cur.name,
      subject: cls.subject ?? cur.subject,
      teacher: cls.teacher ?? cur.teacher,
      teacherUserId: cls.teacherUserId !== undefined ? cls.teacherUserId : cur.teacherUserId,
      schedule: cls.schedule ?? cur.schedule,
      capacity: cls.capacity ?? cur.capacity,
      tuitionFee: cls.tuitionFee ?? cur.tuitionFee,
      bookFee: cls.bookFee ?? cur.bookFee,
      color: cls.color ?? cur.color,
      textColor: cls.textColor ?? cur.textColor,
    }
    const res = await client.put(`/admin/classrooms/${cid}`, body)
    const updated = toClass(res.data.data)
    const nameChanged = cur.name !== updated.name
    set(s => ({
      classes: s.classes.map(c => c.cid === cid ? updated : c),
      students: nameChanged
        ? s.students.map(stu =>
            (stu.classroomId === cid || (!stu.classroomId && stu.cls === cur.name))
              ? { ...stu, cls: updated.name, classroomId: cid }
              : stu
          )
        : s.students,
    }))
    if (nameChanged) {
      await get().fetchStudents(get().paymentYearMonth)
    }
  },

  deleteClass: async (cid) => {
    await client.delete(`/admin/classrooms/${cid}`)
    set(s => ({ classes: s.classes.filter(c => c.cid !== cid) }))
  },

  // ── 학생 ──────────────────────────────────────────
  createStudent: async (student) => {
    const res = await client.post('/admin/students', {
      name: student.name,
      grade: student.grade,
      classroomId: student.classroomId,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      status: student.status ?? '재원',
      phone: student.phone?.trim() || undefined,
      birthDate: student.birthDate?.trim() || undefined,
      loginPhone: student.loginPhone ?? student.parentPhone,
      loginPassword: student.loginPassword ?? '0000',
      badgeColor: student.badgeColor ?? '#DBEAFE',
      badgeTextColor: student.badgeTextColor ?? '#1D4ED8',
      kakaoLinked: student.kakaoLinked ?? false,
    })
    const ym = get().paymentYearMonth
    const created = toStudent(res.data.data, ym)
    set(s => ({ students: [created, ...s.students] }))
    return created
  },

  updateStudent: async (sid, student) => {
    const res = await client.put(`/admin/students/${sid}`, {
      name: student.name,
      grade: student.grade,
      classroomId: student.classroomId,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      status: student.status,
      phone: student.phone?.trim() || undefined,
      birthDate: student.birthDate?.trim() || undefined,
      kakaoLinked: student.kakaoLinked ?? false,
    })
    await get().fetchStudents(get().paymentYearMonth)
    if (student.status != null) {
      const y = get().dashboardStats?.year
      await get().fetchDashboardStats(y)
    }
    const ym = get().paymentYearMonth
    return get().students.find((stu) => stu.sid === sid) ?? toStudent(res.data.data, ym)
  },

  deleteStudent: async (sid) => {
    await get().withdrawStudent(sid)
  },

  withdrawStudent: async (sid) => {
    await get().updateStudentStatus(sid, '퇴원')
  },

  updateStudentStatus: async (sid, status) => {
    await client.patch(`/admin/students/${sid}/status`, { status })
    await get().fetchStudents()
    const y = get().dashboardStats?.year
    await get().fetchDashboardStats(y)
  },

  fetchConsultations: async (year, month, kind) => {
    try {
      const params: Record<string, string | number> = {}
      if (year != null) params.year = year
      if (month != null) params.month = month
      if (kind && kind !== 'all') params.kind = kind
      const res = await client.get('/admin/consultations', { params })
      const list = res.data?.data ?? []
      set({ consultations: Array.isArray(list) ? list.map(toConsult) : [] })
    } catch (e) {
      console.error('상담 목록 조회 실패:', e)
    }
  },

  searchConsultations: async (q, kind) => {
    const query = q.trim()
    if (!query) return []
    const params: Record<string, string> = { q: query }
    if (kind && kind !== 'all') params.kind = kind
    const res = await client.get('/admin/consultations', { params })
    const list = res.data?.data ?? []
    const rows = Array.isArray(list) ? list.map(toConsult) : []
    return rows.filter((c: Consultation) => matchesConsultSearch(c, query, get().students))
  },

  fetchCounselors: async () => {
    try {
      const res = await client.get('/admin/consultations/counselors')
      const list = res.data?.data ?? []
      set({
        counselors: Array.isArray(list)
          ? list.map((t: any) => ({ id: t.id, name: t.name ?? '', role: t.role ?? 'TEACHER' }))
          : [],
      })
    } catch (e) {
      console.error('상담교사 목록 조회 실패:', e)
    }
  },

  fetchStudentConsultations: async (sid) => {
    const res = await client.get(`/admin/consultations/students/${sid}`)
    const list = res.data?.data ?? []
    return Array.isArray(list) ? list.map(toConsult) : []
  },

  addConsultation: async (payload) => {
    const res = await client.post('/admin/consultations', payload)
    const created = toConsult(res.data.data)
    set((s) => ({ consultations: [created, ...s.consultations.filter((c) => c.id !== created.id)] }))
    return created
  },

  updateConsultation: async (id, payload) => {
    const res = await client.put(`/admin/consultations/${id}`, payload)
    const updated = toConsult(res.data.data)
    set((s) => ({ consultations: s.consultations.map((c) => c.id === id ? updated : c) }))
    return updated
  },

  deleteConsultation: async (id) => {
    await client.delete(`/admin/consultations/${id}`)
    set((s) => ({ consultations: s.consultations.filter((c) => c.id !== id) }))
  },

  fetchDashboardStats: async (year) => {
    try {
      const res = await client.get('/admin/dashboard/stats', { params: year != null ? { year } : undefined })
      const d = res.data?.data
      if (!d) {
        set({ dashboardStats: null })
        return
      }
      set({
        dashboardStats: {
          year: d.year,
          yearEnrolled: d.yearEnrolled ?? 0,
          yearWithdrawn: d.yearWithdrawn ?? 0,
          yearRevenue: d.yearRevenue ?? 0,
          yearUnpaid: d.yearUnpaid ?? 0,
          months: Array.isArray(d.months)
            ? d.months.map((m: any) => ({
                month: m.month,
                enrolled: m.enrolled ?? 0,
                withdrawn: m.withdrawn ?? 0,
                revenue: m.revenue ?? 0,
                unpaid: m.unpaid ?? 0,
              }))
            : [],
        },
      })
    } catch (e) {
      console.error('대시보드 통계 조회 실패:', e)
    }
  },

  // ── 수납 ────────────────────────────────────────
  updateFee: async (sid, key, payload, yearMonth) => {
    const st = get().students.find((s) => s.sid === sid)
    const ym = yearMonth ?? st?.fees[key]?.yearMonth ?? get().paymentYearMonth
    const label = key === 'tuition' ? '수업료' : '교재비'
    await client.patch(`/admin/students/${sid}/fees`, {
      label,
      paid: payload.paid,
      yearMonth: ym,
      paidAt: payload.paid ? payload.paidAt : undefined,
      paymentMethod: payload.paid ? payload.paymentMethod : undefined,
    })
    await get().fetchStudents(ym)
  },

  // ── 출석 ────────────────────────────────────────
  saveAttendSheet: async (cid, date, records) => {
    const res = await client.post(`/admin/classrooms/${cid}/attend`, {
      date,
      records: records.map(r => ({
        studentId: r.sid, status: r.status, note: r.note ?? '',
      })),
    })
    const sheet = toAttendSheet(res.data.data)
    set(s => {
      const filtered = s.attendSheets.filter(a => !(a.cid === cid && a.date === date))
      return { attendSheets: [...filtered, sheet] }
    })
  },

  deleteAttendSheet: async (sheetId) => {
    const u = sheetId.indexOf('_')
    if (u < 0) throw new Error('Invalid attend sheet id')
    const cid = Number(sheetId.slice(0, u))
    const date = sheetId.slice(u + 1)
    await client.delete(`/admin/classrooms/${cid}/attend`, { params: { date } })
    set(s => ({ attendSheets: s.attendSheets.filter(a => a.id !== sheetId) }))
  },

  // ── 숙제 ────────────────────────────────────────
  saveHomeworkSheet: async (cid, date, title, records) => {
    const res = await client.post(`/admin/classrooms/${cid}/homework`, {
      date, title,
      records: records.map(r => ({
        studentId: r.sid, done: r.done, comment: r.comment ?? '',
      })),
    })
    const sheet = toHwSheet(res.data.data)
    set(s => {
      const filtered = s.homeworkSheets.filter(h => !(h.cid === cid && h.date === date))
      return { homeworkSheets: [...filtered, sheet] }
    })
  },

  updateHomeworkRecord: async (sheetId, sid, done, comment) => {
    const idKey = String(sheetId)
    const sidNum = Number(sid)
    const sheet = get().homeworkSheets.find(h => String(h.id) === idKey)
    if (!sheet) {
      console.error('[updateHomeworkRecord] sheet not found:', sheetId)
      throw new Error('숙제 시트를 찾을 수 없습니다.')
    }
    await client.patch(
      `/admin/classrooms/${sheet.cid}/homework/${idKey}/students/${sidNum}`,
      { done, comment }
    )
    set(s => ({
      homeworkSheets: s.homeworkSheets.map(h =>
        String(h.id) === idKey
          ? { ...h, records: h.records.map(r => Number(r.sid) === sidNum ? { ...r, done, comment } : r) }
          : h
      ),
    }))
  },

  deleteHomeworkSheet: async (sheetId) => {
    const idKey = String(sheetId)
    const sheet = get().homeworkSheets.find(h => String(h.id) === idKey)
    if (!sheet) return
    await client.delete(`/admin/classrooms/${sheet.cid}/homework/${idKey}`)
    set(s => ({
      homeworkSheets: s.homeworkSheets.filter(h => String(h.id) !== idKey),
    }))
  },

  // ── 공지 ────────────────────────────────────────
  addNotice: async (n) => {
    try {
      // date 포맷을 YYYY-MM-DD 로 변환 (API 요구사항)
      const apiDate = n.date
        ? n.date.replace(/\./g, '-').replace(/\.$/, '').replace(/(\d{4})-(\d{1,2})-(\d{1,2})/, (_, y, m, d) =>
            `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`)
        : new Date().toISOString().slice(0, 10)

      const res = await client.post('/admin/notices', {
        title:    n.title,
        body:     n.body,
        targets:  n.targets,
        date:     apiDate,
        imageUrl: n.imageUrl,
        files: (n.files ?? []).map((f) => ({
          fileName: f.fileName,
          contentType: f.contentType,
          sizeBytes: f.sizeBytes,
          data: f.data,
        })),
      })
      // 저장 성공 즉시 로컬 반영 (재조회 실패 시에도 UI에 보이도록)
      const created = toNotice(res.data.data)
      set(s => ({ notices: [created, ...s.notices.filter((x) => x.id !== created.id)] }))

      // 서버 기준으로 한 번 더 동기화 (best-effort, UI 대기하지 않음)
      void get().fetchNotices().catch((e) => {
        console.warn('[front] addNotice: fetchNotices sync failed (non-blocking):', e?.message ?? e)
      })
    } catch (err: any) {
      console.error('공지 저장 실패:', err.response?.data ?? err.message)
      throw err
    }
  },

  deleteNotice: async (id) => {
    await client.delete(`/admin/notices/${id}`)
    await get().fetchNotices()
  },

  addClassNotice: async (n) => {
    try {
      const apiDate = n.date
        ? n.date.replace(/\./g, '-').replace(/\.$/, '').replace(/(\d{4})-(\d{1,2})-(\d{1,2})/, (_, y, m, d) =>
            `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`)
        : new Date().toISOString().slice(0, 10)

      const res = await client.post('/admin/class-notices', {
        title:    n.title,
        body:     n.body,
        targets:  n.targets,
        date:     apiDate,
        imageUrl: n.imageUrl,
        files: (n.files ?? []).map((f) => ({
          fileName: f.fileName,
          contentType: f.contentType,
          sizeBytes: f.sizeBytes,
          data: f.data,
        })),
      })
      const created = toNotice(res.data.data)
      set(s => ({ classNotices: [created, ...s.classNotices.filter((x) => x.id !== created.id)] }))
      void get().fetchClassNotices().catch((e) => {
        console.warn('[front] addClassNotice: fetchClassNotices sync failed (non-blocking):', e?.message ?? e)
      })
    } catch (err: any) {
      console.error('클래스 알림장 저장 실패:', err.response?.data ?? err.message)
      throw err
    }
  },

  deleteClassNotice: async (id) => {
    await client.delete(`/admin/class-notices/${id}`)
    await get().fetchClassNotices()
  },

  // ── 일정 ────────────────────────────────────────
  addEvent: async (e) => {
    const res = await client.post('/admin/events', {
      title: e.title, date: e.date, endDate: e.endDate,
      category: e.category, targets: e.targets,
      description: e.description, color: e.color,
      allDay: e.allDay ?? true,
    })
    set(s => ({ events: [...s.events, toEvent(res.data.data)] }))
  },

  updateEvent: async (id, e) => {
    const cur = get().events.find(ev => ev.id === id)
    if (!cur) return
    const res = await client.put(`/admin/events/${id}`, { ...cur, ...e })
    set(s => ({ events: s.events.map(ev => ev.id === id ? toEvent(res.data.data) : ev) }))
  },

  deleteEvent: async (id) => {
    await client.delete(`/admin/events/${id}`)
    set(s => ({ events: s.events.filter(ev => ev.id !== id) }))
  },

  // ── 발신번호 (로컬 상태) ────────────────────────────
  addSenderNumber: async (sender) => {
    const res = await client.post('/admin/sender-numbers', {
      label: sender.label,
      number: sender.number,
    })
    const created = toSenderNumber(res.data.data)
    set(s => ({ senderNumbers: [created, ...s.senderNumbers] }))
  },

  deleteSenderNumber: async (id) => {
    await client.delete(`/admin/sender-numbers/${id}`)
    set(s => ({ senderNumbers: s.senderNumbers.filter(n => n.id !== id) }))
  },

  setDefaultSender: async (id) => {
    const res = await client.patch(`/admin/sender-numbers/${id}/default`)
    const updated = toSenderNumber(res.data.data)
    set(s => ({
      senderNumbers: s.senderNumbers.map(n => ({
        ...n,
        isDefault: n.id === updated.id,
      })),
    }))
  },
}))

// ── 편의 헬퍼 (기존 코드 호환) ──────────────────────

type FeeStudent = {
  fees: {
    tuition: { amount: number; paid: boolean }
    book:    { amount: number; paid: boolean }
  }
}
type StatusStudent = { status: string }

export function totalFee(s: FeeStudent) {
  return s.fees.tuition.amount + s.fees.book.amount
}

export function paidFee(s: FeeStudent) {
  return (s.fees.tuition.paid ? s.fees.tuition.amount : 0)
       + (s.fees.book.paid    ? s.fees.book.amount    : 0)
}

export function isFullPaid(s: FeeStudent) {
  return s.fees.tuition.paid && s.fees.book.paid
}

export function isPartPaid(s: FeeStudent) {
  return !isFullPaid(s) && paidFee(s) > 0
}

export function payPct(s: FeeStudent) {
  const t = totalFee(s)
  return t > 0 ? Math.round((paidFee(s) / t) * 100) : 0
}

export function barCol(s: FeeStudent) {
  const pct = payPct(s)
  if (pct >= 100) return 'var(--ok)'
  if (pct > 0)    return 'var(--warn)'
  return 'var(--err)'
}

export function statusBdgCls(s: StatusStudent) {
  switch (s.status) {
    case '재원': return 'badge-green'
    case '휴원': return 'badge-amber'
    case '퇴원': return 'badge-red'
    default:     return 'badge-gray'
  }
}

export function statusBdgTxt(s: StatusStudent) {
  return s.status ?? '재원'
}

// 반 이름 기반 배지 색상
const CLS_COLORS: Record<string, { bg: string; color: string }> = {
  'A반': { bg: '#DBEAFE', color: '#1D4ED8' },
  'B반': { bg: '#D1FAE5', color: '#065F46' },
  'C반': { bg: '#EDE9FE', color: '#5B21B6' },
  'D반': { bg: '#FEF3C7', color: '#92400E' },
  'E반': { bg: '#FCE7F3', color: '#9D174D' },
  'F반': { bg: '#E0F2FE', color: '#0369A1' },
}
const DEFAULT_CLS = { bg: '#F0EEFF', color: '#6C63FF' }

export function clsCol(clsName: string): { bg: string; color: string; tc: string } {
  const c = CLS_COLORS[clsName] ?? DEFAULT_CLS
  return { ...c, tc: c.color }
}

export function clsBdg(_clsName: string) {
  return 'badge-purple'
}

/** 반 소속 학생 매칭 — classroomId 우선, 없으면 반명(cls)으로 폴백 */
export function studentInClass(
  student: { cls: string; classroomId?: number },
  cls: { cid: number; name: string },
) {
  if (student.classroomId != null) return student.classroomId === cls.cid
  return student.cls === cls.name
}

/** 반별 학생 목록 (출석·수납·학생관리 등 공통) */
export function studentsInClass<T extends { cls: string; classroomId?: number }>(
  students: T[],
  cls: { cid: number; name: string },
): T[] {
  return students.filter((s) => studentInClass(s, cls))
}

