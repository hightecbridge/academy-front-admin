// src/store/dataStore.ts
import { create } from 'zustand'
import type { Parent, ClassRoom, AttendSheet, AttendRecord, AttendStatus, NoticeItem, SenderNumber, CalendarEvent } from '../types'

interface DataState {
  parents: Parent[]
  classes: ClassRoom[]
  toggleFee: (sid: number, key: 'tuition' | 'book', paid: boolean) => void
  addStudent: (pid: number, student: Omit<import('../types').Student, 'sid'>) => void
  deleteStudent: (pid: number, sid: number) => void
  addClass: (cls: Omit<ClassRoom, 'cid' | 'createdAt'>) => void
  updateClass: (cid: number, cls: Partial<Omit<ClassRoom, 'cid'>>) => void
  deleteClass: (cid: number) => void
  // 캘린더
  events: CalendarEvent[]
  addEvent: (e: Omit<CalendarEvent, 'id' | 'createdAt'>) => void
  updateEvent: (id: number, e: Partial<Omit<CalendarEvent, 'id'>>) => void
  deleteEvent: (id: number) => void
  // 공지사항
  notices: NoticeItem[]
  addNotice: (n: Omit<NoticeItem, 'id' | 'createdAt'>) => void
  deleteNotice: (id: number) => void
  // 발신번호
  senderNumbers: SenderNumber[]
  addSenderNumber: (s: Omit<SenderNumber, 'id'>) => void
  updateSenderNumber: (id: number, s: Partial<Omit<SenderNumber, 'id'>>) => void
  deleteSenderNumber: (id: number) => void
  setDefaultSender: (id: number) => void
  // 출석
  attendSheets: AttendSheet[]
  saveAttendSheet: (cid: number, date: string, records: AttendRecord[]) => void
  deleteAttendSheet: (sheetId: string) => void
}

const initClasses: ClassRoom[] = [
  {
    cid: 1, name: 'A반', subject: '초등 수학', teacher: '이수진',
    schedule: '월·수·금 오후 4시', capacity: 15,
    tuitionFee: 280000, bookFee: 45000,
    color: '#DBEAFE', textColor: '#1D4ED8', createdAt: '2024.01.01',
  },
  {
    cid: 2, name: 'B반', subject: '중등 수학', teacher: '박준호',
    schedule: '화·목 오후 5시', capacity: 15,
    tuitionFee: 320000, bookFee: 38000,
    color: '#D1FAE5', textColor: '#065F46', createdAt: '2024.01.01',
  },
  {
    cid: 3, name: 'C반', subject: '고등 수학', teacher: '최민아',
    schedule: '월·수·금 오후 6시', capacity: 12,
    tuitionFee: 380000, bookFee: 52000,
    color: '#EDE9FE', textColor: '#5B21B6', createdAt: '2024.01.01',
  },
]

const initParents: Parent[] = [
  {
    pid: 1, name: '김지원', phone: '010-1234-5678',
    col: '#DBEAFE', tc: '#1D4ED8', kakao: true, reg: '2024.01.15',
    students: [
      { sid: 0, name: '김민서', cls: 'A반', grade: '초등 6', birth: '2012-03-15', status: '재원',
        fees: { tuition: { label: '수업료', amount: 280000, paid: true }, book: { label: '교재비', amount: 45000, paid: true } } },
      { sid: 1, name: '김민준', cls: 'B반', grade: '중등 2', birth: '2009-07-22', status: '재원',
        fees: { tuition: { label: '수업료', amount: 320000, paid: false }, book: { label: '교재비', amount: 38000, paid: false } } },
    ],
  },
  {
    pid: 2, name: '박영수', phone: '010-9876-5432',
    col: '#D1FAE5', tc: '#065F46', kakao: true, reg: '2024.02.03',
    students: [
      { sid: 2, name: '박서연', cls: 'B반', grade: '중등 1', birth: '2010-11-05', status: '재원',
        fees: { tuition: { label: '수업료', amount: 320000, paid: true }, book: { label: '교재비', amount: 38000, paid: false } } },
    ],
  },
  {
    pid: 3, name: '이수현', phone: '010-5555-1234',
    col: '#FEE2E2', tc: '#991B1B', kakao: false, reg: '2024.01.28',
    students: [
      { sid: 3, name: '이도현', cls: 'C반', grade: '고등 1', birth: '2007-04-18', status: '재원',
        fees: { tuition: { label: '수업료', amount: 380000, paid: true }, book: { label: '교재비', amount: 52000, paid: true } } },
    ],
  },
  {
    pid: 4, name: '최영희', phone: '010-3333-7890',
    col: '#EDE9FE', tc: '#5B21B6', kakao: true, reg: '2024.03.01',
    students: [
      { sid: 4, name: '최준혁', cls: 'A반', grade: '초등 5', birth: '2013-09-01', status: '재원',
        fees: { tuition: { label: '수업료', amount: 280000, paid: false }, book: { label: '교재비', amount: 45000, paid: true } } },
    ],
  },
  {
    pid: 5, name: '정가람', phone: '010-7777-2222',
    col: '#FCE7F3', tc: '#9D174D', kakao: false, reg: '2024.03.10',
    students: [
      { sid: 5, name: '정예린', cls: 'C반', grade: '고등 2', birth: '2005-05-12', status: '재원',
        fees: { tuition: { label: '수업료', amount: 380000, paid: true }, book: { label: '교재비', amount: 52000, paid: false } } },
    ],
  },
]

export const useDataStore = create<DataState>((set) => ({
  parents: initParents,
  classes: initClasses,

  toggleFee: (sid, key, paid) =>
    set((state) => ({
      parents: state.parents.map((p) => ({
        ...p,
        students: p.students.map((s) =>
          s.sid === sid ? { ...s, fees: { ...s.fees, [key]: { ...s.fees[key], paid } } } : s
        ),
      })),
    })),

  addStudent: (pid, student) =>
    set((state) => {
      const maxSid = Math.max(0, ...state.parents.flatMap((p) => p.students.map((s) => s.sid)))
      return {
        parents: state.parents.map((p) =>
          p.pid === pid ? { ...p, students: [...p.students, { ...student, sid: maxSid + 1 }] } : p
        ),
      }
    }),

  deleteStudent: (pid, sid) =>
    set((state) => ({
      parents: state.parents.map((p) =>
        p.pid === pid ? { ...p, students: p.students.filter((s) => s.sid !== sid) } : p
      ),
    })),

  addClass: (cls) =>
    set((state) => {
      const maxCid = Math.max(0, ...state.classes.map((c) => c.cid))
      const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace('.', '')
      return {
        classes: [...state.classes, { ...cls, cid: maxCid + 1, createdAt: today }],
      }
    }),

  updateClass: (cid, cls) =>
    set((state) => ({
      classes: state.classes.map((c) => c.cid === cid ? { ...c, ...cls } : c),
    })),

  events: [
    { id: 1, title: '3월 개강', date: '2024-03-04', category: '수업', targets: ['전체'], color: '#3B82F6', allDay: true, createdAt: '2024-02-20' },
    { id: 2, title: 'A반 모의고사', date: '2024-03-15', category: '시험', targets: ['A반'], color: '#8B5CF6', allDay: true, createdAt: '2024-03-01' },
    { id: 3, title: '봄방학', date: '2024-03-25', endDate: '2024-03-29', category: '휴일', targets: ['전체'], color: '#F59E0B', allDay: true, createdAt: '2024-03-01' },
    { id: 4, title: 'B·C반 교재 배포', date: '2024-03-18', category: '행사', targets: ['B반', 'C반'], color: '#10B981', allDay: true, createdAt: '2024-03-10' },
    { id: 5, title: '학부모 상담 주간', date: '2024-03-20', endDate: '2024-03-22', category: '상담', targets: ['전체'], color: '#EF4444', allDay: true, createdAt: '2024-03-10' },
  ],

  addEvent: (e) =>
    set((state) => {
      const maxId = Math.max(0, ...state.events.map((x) => x.id))
      const today = new Date().toISOString().slice(0, 10)
      return { events: [...state.events, { ...e, id: maxId + 1, createdAt: today }] }
    }),

  updateEvent: (id, e) =>
    set((state) => ({ events: state.events.map((x) => x.id === id ? { ...x, ...e } : x) })),

  deleteEvent: (id) =>
    set((state) => ({ events: state.events.filter((x) => x.id !== id) })),

  notices: [
    { id: 1, title: '3월 수업료 안내', body: '이번 달 수업료 납부 기한은 3월 10일까지입니다.', targets: ['전체'], date: '2024.03.01', createdAt: '2024-03-01' },
    { id: 2, title: 'A반 모의고사 일정', body: '3월 15일 토요일 오전 10시 모의고사가 진행됩니다.', targets: ['A반'], date: '2024.03.05', createdAt: '2024-03-05' },
    { id: 3, title: 'B반·C반 교재 변경 안내', body: '4월부터 새 교재로 변경됩니다. 구매 방법은 추후 안내 예정입니다.', targets: ['B반', 'C반'], date: '2024.03.08', createdAt: '2024-03-08' },
  ],

  addNotice: (n) =>
    set((state) => {
      const maxId = Math.max(0, ...state.notices.map((x) => x.id))
      const today = new Date().toISOString().slice(0, 10)
      return { notices: [{ ...n, id: maxId + 1, createdAt: today }, ...state.notices] }
    }),

  deleteNotice: (id) =>
    set((state) => ({ notices: state.notices.filter((n) => n.id !== id) })),

  senderNumbers: [
    { id: 1, label: '원장', number: '010-1234-5678', isDefault: true },
    { id: 2, label: '담당교사', number: '010-9999-8888', isDefault: false },
  ],

  addSenderNumber: (s) =>
    set((state) => {
      const maxId = Math.max(0, ...state.senderNumbers.map((x) => x.id))
      const numbers = s.isDefault
        ? state.senderNumbers.map((x) => ({ ...x, isDefault: false }))
        : state.senderNumbers
      return { senderNumbers: [...numbers, { ...s, id: maxId + 1 }] }
    }),

  updateSenderNumber: (id, s) =>
    set((state) => ({ senderNumbers: state.senderNumbers.map((x) => x.id === id ? { ...x, ...s } : x) })),

  deleteSenderNumber: (id) =>
    set((state) => ({ senderNumbers: state.senderNumbers.filter((x) => x.id !== id) })),

  setDefaultSender: (id) =>
    set((state) => ({
      senderNumbers: state.senderNumbers.map((x) => ({ ...x, isDefault: x.id === id })),
    })),

  attendSheets: [],

  saveAttendSheet: (cid, date, records) =>
    set((state) => {
      const id = `${cid}_${date}`
      const now = new Date().toISOString().slice(0, 10)
      const existing = state.attendSheets.find((s) => s.id === id)
      if (existing) {
        return { attendSheets: state.attendSheets.map((s) => s.id === id ? { ...s, records } : s) }
      }
      return { attendSheets: [...state.attendSheets, { id, cid, date, records, createdAt: now }] }
    }),

  deleteAttendSheet: (sheetId) =>
    set((state) => ({ attendSheets: state.attendSheets.filter((s) => s.id !== sheetId) })),

  deleteClass: (cid) =>
    set((state) => ({
      classes: state.classes.filter((c) => c.cid !== cid),
    })),
}))

// 유틸 함수
export const totalFee = (s: { fees: { tuition: { amount: number }; book: { amount: number } } }) =>
  s.fees.tuition.amount + s.fees.book.amount

export const paidFee = (s: { fees: { tuition: { amount: number; paid: boolean }; book: { amount: number; paid: boolean } } }) =>
  (s.fees.tuition.paid ? s.fees.tuition.amount : 0) + (s.fees.book.paid ? s.fees.book.amount : 0)

export const isFullPaid = (s: { fees: { tuition: { paid: boolean }; book: { paid: boolean } } }) =>
  s.fees.tuition.paid && s.fees.book.paid

export const isPartPaid = (s: { fees: { tuition: { paid: boolean }; book: { paid: boolean } } }) =>
  (s.fees.tuition.paid || s.fees.book.paid) && !(s.fees.tuition.paid && s.fees.book.paid)

export const payPct = (s: Parameters<typeof totalFee>[0] & Parameters<typeof paidFee>[0]) => {
  const t = totalFee(s)
  return t > 0 ? Math.round((paidFee(s) / t) * 100) : 0
}

export const clsBdg = (c: string) =>
  c === 'A반' ? 'badge-blue' : c === 'B반' ? 'badge-green' : c === 'C반' ? 'badge-purple' : 'badge-gray'

export const clsCol = (c: string) =>
  c === 'A반' ? { bg: '#DBEAFE', tc: '#1D4ED8' }
  : c === 'B반' ? { bg: '#D1FAE5', tc: '#065F46' }
  : { bg: '#F3E8FF', tc: '#5B21B6' }

export const barCol = (s: Parameters<typeof isFullPaid>[0]) =>
  isFullPaid(s) ? 'var(--ok)' : isPartPaid(s) ? 'var(--warn)' : 'var(--err)'

export const statusBdgCls = (s: Parameters<typeof isFullPaid>[0]) =>
  isFullPaid(s) ? 'badge-green' : isPartPaid(s) ? 'badge-amber' : 'badge-red'

export const statusBdgTxt = (s: Parameters<typeof isFullPaid>[0]) =>
  isFullPaid(s) ? '완납' : isPartPaid(s) ? '일부납' : '미납'
