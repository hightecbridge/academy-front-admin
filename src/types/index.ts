// src/types/index.ts

export interface Parent {
  pid: number
  name: string
  phone: string
  col: string
  tc: string
  kakao: boolean
  reg: string
  students: Student[]
}

export interface Student {
  sid: number
  name: string
  cls: string
  grade: string
  birth: string
  status: '재원' | '휴원' | '퇴원'
  fees: {
    tuition: FeeItem
    book: FeeItem
  }
}

export interface FeeItem {
  label: string
  amount: number
  paid: boolean
}

export interface Notice {
  id: number
  title: string
  body: string
  cls: string
  date: string
}


export type NavTab = 'home' | 'parents' | 'notice' | 'payment' | 'message' | 'class'

export interface ClassRoom {
  cid: number
  name: string
  subject: string
  teacher: string
  schedule: string
  capacity: number
  tuitionFee: number
  bookFee: number
  color: string
  textColor: string
  createdAt: string
}

export type AttendStatus = '출석' | '결석' | '지각' | '조퇴' | '공결'

export interface AttendRecord {
  sid: number        // 학생 ID
  status: AttendStatus
  note?: string      // 메모 (사유 등)
}

export interface AttendSheet {
  id: string         // `${cid}_${date}` 형태
  cid: number        // 반 ID
  date: string       // 'YYYY-MM-DD'
  records: AttendRecord[]
  createdAt: string
}

export interface NoticeItem {
  id: number
  title: string
  body: string
  targets: string[]   // ['전체'] 또는 ['A반','B반'] 처럼 복수 선택
  imageUrl?: string   // base64 또는 미리보기 URL
  date: string
  createdAt: string
}

export interface SenderNumber {
  id: number
  label: string      // 예) 원장, 담당교사
  number: string     // 010-0000-0000
  isDefault: boolean
}

export type EventCategory = '수업' | '시험' | '휴일' | '행사' | '상담' | '기타'

export interface CalendarEvent {
  id: number
  title: string
  date: string        // 'YYYY-MM-DD' 시작일
  endDate?: string    // 'YYYY-MM-DD' 종료일 (없으면 하루)
  category: EventCategory
  targets: string[]   // ['전체'] 또는 ['A반','B반']
  description?: string
  color: string       // 카테고리 색상
  allDay: boolean
  createdAt: string
}
