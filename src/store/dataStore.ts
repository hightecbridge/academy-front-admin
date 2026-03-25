// src/store/dataStore.ts
import { create } from 'zustand'
import client from '../api/client'
import type {
  Parent, ClassRoom, AttendSheet, AttendRecord,
  AttendStatus, NoticeItem, CalendarEvent,
  HomeworkSheet, HomeworkRecord, SenderNumber, MessageSendLog,
} from '../types'

interface DataState {
  parents:        Parent[]
  classes:        ClassRoom[]
  attendSheets:   AttendSheet[]
  homeworkSheets: HomeworkSheet[]
  notices:        NoticeItem[]
  noticeTotal:    number
  events:         CalendarEvent[]
  senderNumbers:  SenderNumber[]
  messageSends:   MessageSendLog[]
  isLoading:      boolean

  fetchClasses:   () => Promise<void>
  fetchParents:   () => Promise<void>
  fetchAttend:    (cid: number) => Promise<void>
  fetchHomework:  (cid: number) => Promise<void>
  fetchNotices:   (page?: number, size?: number, target?: string | null, q?: string) => Promise<void>
  fetchEvents:    () => Promise<void>
  fetchSenderNumbers: () => Promise<void>
  fetchMessageSends:  () => Promise<void>
  saveMessageSendLog: (p: {
    kind: MessageSendLog['kind']
    targetLabel: string
    title: string
    bodyPreview: string
    recipientCount: number
  }) => Promise<void>

  addClass:    (cls: Omit<ClassRoom, 'cid' | 'createdAt'>) => Promise<void>
  updateClass: (cid: number, cls: Partial<Omit<ClassRoom, 'cid'>>) => Promise<void>
  deleteClass: (cid: number) => Promise<void>

  addParent:   (p: { name: string; phone: string; loginPhone?: string; loginPassword?: string; badgeColor?: string; badgeTextColor?: string }) => Promise<void>
  addStudent:  (pid: number, s: { name: string; grade: string; classroomId: number; status?: string }) => Promise<void>
  deleteParent: (pid: number) => Promise<void>

  toggleFee:   (sid: number, key: 'tuition' | 'book', paid: boolean, yearMonth?: number) => Promise<void>

  saveAttendSheet:  (cid: number, date: string, records: AttendRecord[]) => Promise<void>
  deleteAttendSheet: (sheetId: string) => Promise<void>
  saveHomeworkSheet:(cid: number, date: string, title: string, records: HomeworkRecord[]) => Promise<void>
  updateHomeworkRecord: (sheetId: string, sid: number, done: boolean, comment: string) => Promise<void>
  deleteHomeworkSheet: (sheetId: string) => Promise<void>

  addNotice:    (n: Omit<NoticeItem, 'id' | 'createdAt'>) => Promise<void>
  deleteNotice: (id: number) => Promise<void>

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
    schedule: d.schedule ?? '', capacity: d.capacity,
    tuitionFee: d.tuitionFee, bookFee: d.bookFee,
    color: d.color ?? '#DBEAFE', textColor: d.textColor ?? '#1D4ED8',
    createdAt: d.createdAt?.slice(0, 10) ?? '',
  }
}

function toParent(d: any): Parent {
  return {
    pid: d.id, name: d.name, phone: d.phone,
    col: d.badgeColor ?? '#DBEAFE', tc: d.badgeTextColor ?? '#1D4ED8',
    kakao: d.kakaoLinked ?? false,
    reg: d.createdAt?.slice(0, 10) ?? '',
    students: (d.students ?? []).map((s: any) => ({
      sid:    s.id,
      name:   s.name,
      cls:    s.classroomName ?? '',
      grade:  s.grade,
      birth:  s.birthDate ?? '',
      status: (s.status ?? '재원') as '재원' | '휴원' | '퇴원',
      fees: {
        tuition: s.fees?.find((f: any) => f.label === '수업료')
          ?? { label: '수업료', amount: 0, paid: false },
        book: s.fees?.find((f: any) => f.label === '교재비')
          ?? { label: '교재비', amount: 0, paid: false },
      },
    })),
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
    createdAt: d.createdAt?.slice(0, 10) ?? '',
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

function toNotice(d: any): NoticeItem {
  return {
    id: d.id, title: d.title, body: d.body,
    targets: d.targets ?? ['전체'],
    imageUrl: d.imageUrl, date: d.date,
    createdAt: d.createdAt?.slice(0, 10) ?? '',
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
  return {
    id: d.id,
    kind: d.kind as MessageSendLog['kind'],
    targetLabel: d.targetLabel ?? '',
    title: d.title ?? '',
    bodyPreview: d.bodyPreview ?? '',
    recipientCount: typeof d.recipientCount === 'number' ? d.recipientCount : 0,
    createdAt: d.createdAt ?? '',
  }
}

// ── Store ──────────────────────────────────────────
export const useDataStore = create<DataState>((set, get) => ({
  parents: [], classes: [], attendSheets: [],
  homeworkSheets: [], notices: [], noticeTotal: 0, events: [],
  senderNumbers: [],
  messageSends: [],
  isLoading: false,

  // ── 로드 ────────────────────────────────────────
  fetchClasses: async () => {
    try {
      const res = await client.get('/admin/classrooms')
      set({ classes: res.data.data.map(toClass) })
    } catch {}
  },

  fetchParents: async () => {
    try {
      const res = await client.get('/admin/parents')
      set({ parents: res.data.data.map(toParent) })
    } catch {}
  },

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
      // 조회 실패를 숨기면 "공지가 없음"처럼 보일 수 있어 원인 파악이 어렵다.
      console.error('공지 조회 실패:', err?.response?.data ?? err?.message ?? err)
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
      targetLabel: p.targetLabel,
      title: p.title,
      bodyPreview: p.bodyPreview,
      recipientCount: p.recipientCount,
    })
    const created = toMessageSendLog(res.data.data)
    set(s => ({ messageSends: [created, ...s.messageSends.filter(x => x.id !== created.id)] }))
  },

  // ── 반 ──────────────────────────────────────────
  addClass: async (cls) => {
    const res = await client.post('/admin/classrooms', {
      name: cls.name, subject: cls.subject, teacher: cls.teacher,
      schedule: cls.schedule, capacity: cls.capacity,
      tuitionFee: cls.tuitionFee, bookFee: cls.bookFee,
      color: cls.color, textColor: cls.textColor,
    })
    set(s => ({ classes: [...s.classes, toClass(res.data.data)] }))
  },

  updateClass: async (cid, cls) => {
    const cur = get().classes.find(c => c.cid === cid)
    if (!cur) return
    const res = await client.put(`/admin/classrooms/${cid}`, { ...cur, ...cls })
    set(s => ({ classes: s.classes.map(c => c.cid === cid ? toClass(res.data.data) : c) }))
  },

  deleteClass: async (cid) => {
    await client.delete(`/admin/classrooms/${cid}`)
    set(s => ({ classes: s.classes.filter(c => c.cid !== cid) }))
  },

  // ── 학부모/학생 ──────────────────────────────────
  addParent: async (parent) => {
    const res = await client.post('/admin/parents', {
      name:           parent.name,
      phone:          parent.phone,
      loginPhone:     parent.loginPhone    ?? parent.phone,
      loginPassword:  parent.loginPassword ?? '0000',
      badgeColor:     parent.badgeColor    ?? '#DBEAFE',
      badgeTextColor: parent.badgeTextColor ?? '#1D4ED8',
    })
    set(s => ({ parents: [toParent(res.data.data), ...s.parents] }))
  },

  addStudent: async (pid, student) => {
    await client.post(`/admin/parents/${pid}/students`, {
      name:        student.name,
      grade:       student.grade,
      classroomId: student.classroomId,
      status:      student.status ?? '재원',
    })
    // 학부모 목록 새로고침
    const pRes = await client.get('/admin/parents')
    set({ parents: pRes.data.data.map(toParent) })
  },

  deleteParent: async (pid) => {
    // API에 삭제 엔드포인트 추가 시 사용
    set(s => ({ parents: s.parents.filter(p => p.pid !== pid) }))
  },

  // ── 수납 ────────────────────────────────────────
  toggleFee: async (sid, key, paid, yearMonth) => {
    const ym = yearMonth ?? parseInt(
      new Date().toISOString().slice(0, 7).replace('-', '')
    )
    const label = key === 'tuition' ? '수업료' : '교재비'
    await client.patch(`/admin/parents/students/${sid}/fees`, { label, paid, yearMonth: ym })
    // 로컬 즉시 반영
    set(s => ({
      parents: s.parents.map(p => ({
        ...p,
        students: p.students.map(st =>
          st.sid === sid
            ? { ...st, fees: { ...st.fees, [key]: { ...st.fees[key], paid } } }
            : st
        ),
      })),
    }))
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

