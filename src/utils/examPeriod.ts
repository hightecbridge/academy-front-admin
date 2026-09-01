export type PeriodPreset = 'thisMonth' | 'lastMonth' | 'semester' | 'custom'

export function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export function ymd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function semesterRange(base = new Date()): { from: string; to: string } {
  const y = base.getFullYear()
  const m = base.getMonth() + 1
  if (m >= 3 && m <= 8) {
    return { from: `${y}-03-01`, to: `${y}-08-31` }
  }
  if (m >= 9) {
    return { from: `${y}-09-01`, to: `${y + 1}-02-28` }
  }
  return { from: `${y - 1}-09-01`, to: `${y}-02-28` }
}

export function periodRange(preset: PeriodPreset, customFrom = '', customTo = ''): { from: string; to: string } {
  const now = new Date()
  if (preset === 'custom') return { from: customFrom, to: customTo }
  if (preset === 'thisMonth') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { from: ymd(from), to: ymd(to) }
  }
  if (preset === 'lastMonth') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const to = new Date(now.getFullYear(), now.getMonth(), 0)
    return { from: ymd(from), to: ymd(to) }
  }
  return semesterRange(now)
}

export function examStatusStyle(status?: string) {
  if (status === 'COMPLETE') return { background: 'var(--ok2)', color: 'var(--ok)' }
  if (status === 'IN_PROGRESS') return { background: 'var(--warn2)', color: 'var(--warn)' }
  if (status === 'CLOSED') return { background: 'var(--bg3)', color: 'var(--slate2)' }
  if (status === 'SCHEDULED') return { background: 'var(--bg2)', color: 'var(--slate3)' }
  return { background: 'var(--bg2)', color: 'var(--slate3)' }
}
