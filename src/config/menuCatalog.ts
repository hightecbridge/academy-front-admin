export type MenuFlag = {
  enabled: boolean
  parentVisible: boolean
}

export type MenuSettingsMap = Record<string, MenuFlag>

export type MenuCatalogItem = {
  key: string
  label: string
  group: '관리' | '운영'
  parentLabel: string | null
  hint: string
}

export const MENU_CATALOG: MenuCatalogItem[] = [
  { key: 'parents', label: '학생관리', group: '관리', parentLabel: null, hint: '학생 등록·조회·상태 관리' },
  { key: 'consult', label: '상담관리', group: '관리', parentLabel: '상담', hint: '상담 일정·내역 관리' },
  { key: 'class', label: '클래스', group: '관리', parentLabel: null, hint: '반 구성·수업 정보 관리' },
  { key: 'notice', label: '공지사항', group: '관리', parentLabel: '공지', hint: '학원 전체 공지' },
  { key: 'classNotice', label: '클래스 알림장', group: '관리', parentLabel: '알림장', hint: '반별 알림장' },
  { key: 'message', label: '메시지', group: '관리', parentLabel: null, hint: '학부모 문자·알림톡 발송' },
  { key: 'attend', label: '출석', group: '관리', parentLabel: '출석·숙제', hint: '출석 체크·현황' },
  { key: 'homework', label: '숙제관리', group: '관리', parentLabel: '출석·숙제', hint: '숙제 등록·검사' },
  { key: 'examsRegular', label: '정기고사/모의고사', group: '관리', parentLabel: '성적', hint: '정기·모의고사 성적' },
  { key: 'examsDaily', label: '일일테스트', group: '관리', parentLabel: '성적', hint: '일일테스트 성적' },
  { key: 'calendar', label: '캘린더', group: '운영', parentLabel: '일정', hint: '학원 일정·휴원 안내' },
  { key: 'payment', label: '수납', group: '운영', parentLabel: null, hint: '수업료·교재비 수납' },
  { key: 'paymentMessage', label: '결제메시지', group: '운영', parentLabel: null, hint: '수납 안내 문자 발송' },
]

export function resolveMenuSettings(raw?: MenuSettingsMap | null): MenuSettingsMap {
  const source: MenuSettingsMap = { ...(raw ?? {}) }
  if (raw?.exams) {
    if (!raw.examsRegular) source.examsRegular = raw.exams
    if (!raw.examsDaily) source.examsDaily = raw.exams
  }
  const out: MenuSettingsMap = {}
  for (const item of MENU_CATALOG) {
    const flag = source[item.key]
    out[item.key] = {
      enabled: flag?.enabled !== false,
      parentVisible: item.parentLabel ? flag?.parentVisible !== false : false,
    }
  }
  return out
}

export function isMenuEnabled(settings: MenuSettingsMap | undefined | null, key: string): boolean {
  if (!settings?.[key]) return true
  return settings[key].enabled !== false
}

export function isParentMenuVisible(settings: MenuSettingsMap | undefined | null, key: string): boolean {
  const item = MENU_CATALOG.find((m) => m.key === key)
  if (!item?.parentLabel) return false
  if (!isMenuEnabled(settings, key)) return false
  if (!settings?.[key]) return true
  return settings[key].parentVisible !== false
}

export function menuKeyForPath(pathname: string): string | null {
  const p = pathname.split('?')[0]
  if (p.startsWith('/payment-message')) return 'paymentMessage'
  if (p.startsWith('/payment')) return 'payment'
  if (p.startsWith('/parents')) return 'parents'
  if (p.startsWith('/consult')) return 'consult'
  if (p.startsWith('/class-notice')) return 'classNotice'
  if (p.startsWith('/class')) return 'class'
  if (p.startsWith('/notice')) return 'notice'
  if (p.startsWith('/message')) return 'message'
  if (p.startsWith('/attend')) return 'attend'
  if (p.startsWith('/homework')) return 'homework'
  if (p.startsWith('/exams/regular')) return 'examsRegular'
  if (p.startsWith('/exams/daily')) return 'examsDaily'
  if (p.startsWith('/calendar')) return 'calendar'
  return null
}

export function isRegularExamKind(kind?: string | null): boolean {
  return kind === 'ALL'
}
