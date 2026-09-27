// src/types/index.ts

export interface Student {
  sid: number
  name: string
  cls: string
  classroomId?: number
  grade: string
  birth: string
  phone?: string
  parentName: string
  parentPhone: string
  col: string
  tc: string
  kakao: boolean
  reg: string
  status: '재원' | '휴원' | '퇴원'
  withdrawnAt?: string | null
  fees: {
    tuition: FeeItem
    book: FeeItem
  }
}

/** @deprecated 학부모 테이블 통합 이전 호환 — Student.parentName/parentPhone 사용 */
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

export type FeePaymentMethod = '현금' | '카드' | '계좌이체' | '제로페이' | '기타'

export interface FeeItem {
  id?: number
  label: string
  amount: number
  paid: boolean
  yearMonth?: number
  /** yyyy-MM-dd */
  paidAt?: string | null
  paymentMethod?: FeePaymentMethod | string | null
}

export type FeeItemKey = 'tuition' | 'book'

export interface FeeUpdatePayload {
  paid: boolean
  paidAt?: string
  paymentMethod?: string
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
  teacherUserId?: number
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

export interface NoticeAttachment {
  id?: number
  fileName: string
  contentType?: string
  sizeBytes?: number
  data: string
  sortOrder?: number
}

export interface NoticeItem {
  id: number
  title: string
  body: string
  targets: string[]   // ['전체'] 또는 ['A반','B반'] 처럼 복수 선택
  imageUrl?: string   // 하위호환: 첫 이미지
  files?: NoticeAttachment[]
  date: string
  createdAt: string
}

export interface SenderNumber {
  id: number
  label: string      // 예) 원장, 담당교사
  number: string     // 010-0000-0000
  isDefault: boolean
}

/** 알림톡/문자 발송 내역 (서버 저장) */
export interface MessageSendLog {
  id: number
  kind: 'CLASS' | 'ALL' | 'PAYMENT'
  provider?: 'ALIGO' | 'NHN' | null
  targetLabel: string
  title: string
  bodyPreview: string
  recipientCount: number
  messageType?: 'AT' | 'KAKAO_ALIMTALK' | 'SMS' | 'LMS' | 'MMS' | 'PAYMENT_SMS' | 'PAYMENT_NUDGE' | null
  deductedPoints?: number | null
  remainingPoints?: number | null
  createdAt: string
}

// ── 숙제 관리 ──────────────────────────────────────
export interface HomeworkRecord {
  sid: number        // 학생 ID
  done: boolean      // 완료 여부
  comment: string    // 코멘트 (선생님 메모)
}

export interface HomeworkSheet {
  id: string         // `hw_${cid}_${date}`
  cid: number
  date: string       // 'YYYY-MM-DD'
  title: string      // 숙제 제목 (예: '교재 p.34~36 풀기')
  records: HomeworkRecord[]
  createdAt: string
}

export interface ExamScoreSection {
  sectionId: number
  name: string
  maxScore: number
  score: number | null
  percent: number | null
  examAvg?: number | null
  classAvg?: number | null
}

export interface ExamSection {
  id: number
  name: string
  maxScore: number
  weight?: number
  sortOrder?: number
}

export interface ExamClassroom {
  id: number
  name: string
}

export interface ExamClassProgress {
  classroomId: number
  classroomName: string
  entered: number
  total: number
  complete: boolean
  status?: string
}

export interface ExamScoreRow {
  studentId: number
  studentName: string
  classroomId?: number | null
  classroomName?: string | null
  score: number | null
  comment?: string | null
  rank?: number | null
  rankedCount?: number | null
  sectionScores?: ExamScoreSection[]
}

export type ExamKind = 'ALL' | 'CLASS'

export interface ExamItem {
  id: number
  cid?: number | null
  classroomName?: string
  classrooms: ExamClassroom[]
  kind: ExamKind
  kindLabel: string
  targetGrade?: string | null
  targetLabel?: string
  progressLabel?: string
  completedClasses?: number
  totalClasses?: number
  classProgress?: ExamClassProgress[]
  title: string
  date: string
  subject?: string
  maxScore: number
  participantCount?: number
  absentCount?: number
  totalStudents?: number
  average?: number | null
  high?: number | null
  low?: number | null
  median?: number | null
  sections?: ExamSection[]
  scores?: ExamScoreRow[]
  createdAt: string
  status?: string
  statusLabel?: string
  subjectSummary?: string
  subjectCount?: number
  enteredCount?: number
  closed?: boolean
}

export interface GradeItem {
  examId: number
  title: string
  date: string
  subject?: string
  kind?: ExamKind
  kindLabel?: string
  classroomName?: string
  score: number | null
  maxScore: number
  examAvg?: number | null
  classAvg?: number | null
  rank?: number | null
  rankedCount?: number | null
  classRank?: number | null
  classRankedCount?: number | null
  delta?: number | null
  vsClassAvg?: number | null
  comment?: string | null
  sectionScores?: ExamScoreSection[]
}

export interface GradeHistory {
  studentId: number
  studentName: string
  classroomName?: string
  examCount: number
  average?: number | null
  latestDelta?: number | null
  items: GradeItem[]
}

export interface ExamStats {
  examId: number
  title: string
  date: string
  subject?: string
  kind?: ExamKind
  kindLabel?: string
  maxScore: number
  participantCount?: number
  totalStudents?: number
  average?: number | null
  high?: number | null
  low?: number | null
  median?: number | null
  classrooms: {
    classroomId: number
    classroomName: string
    participantCount: number
    totalStudents: number
    average?: number | null
    high?: number | null
    low?: number | null
  }[]
  distribution?: { label: string; count: number }[]
  ranking: {
    studentId: number
    studentName: string
    classroomName?: string | null
    score?: number | null
    rank?: number | null
    rankedCount?: number | null
  }[]
}

export type ConsultKind = '재원생' | '신규'
export type ConsultStatus = '대기' | '확정' | '완료' | '취소'

export interface Counselor {
  id: number
  name: string
  role: 'ADMIN' | 'TEACHER' | string
}

export interface Consultation {
  id: number
  kind: ConsultKind
  studentId?: number | null
  studentName: string
  studentStatus?: string | null
  classroomName?: string | null
  parentName?: string | null
  parentPhone?: string | null
  teacherUserId?: number | null
  teacherName?: string | null
  date: string
  time?: string | null
  status: ConsultStatus
  content?: string | null
  prospectName?: string | null
  prospectPhone?: string | null
  prospectGrade?: string | null
  prospectParentName?: string | null
  createdAt: string
}

export interface ConsultWritePayload {
  kind: ConsultKind
  date: string
  time?: string
  content: string
  teacherUserId: number
  status?: ConsultStatus
  studentId?: number
  prospectName?: string
  prospectPhone?: string
  prospectGrade?: string
  prospectParentName?: string
}

export interface DashboardMonthStat {
  month: number
  enrolled: number
  withdrawn: number
  revenue: number
  unpaid: number
}

export interface DashboardStats {
  year: number
  yearEnrolled: number
  yearWithdrawn: number
  yearRevenue: number
  yearUnpaid: number
  months: DashboardMonthStat[]
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
