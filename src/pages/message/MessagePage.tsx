// src/pages/message/MessagePage.tsx
import React, { useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { TopBar, TabBar, Badge, useToast, Toast } from '../../components/common'
import { useDataStore, isFullPaid, studentInClass } from '../../store/dataStore'
import { useAuthStore } from '../../store/authStore'
import { usePointCosts, type MessageCostType } from '../../hooks/usePointCosts'
import client from '../../api/client'
import { buildTuitionAlimtalkMessage, TUITION_ALIMTALK_TEMPLATE_CODE } from '../../utils/tuitionAlimtalk'

type MessageRecipient = {
  key: string
  name: string
  phone: string
  phoneDigits: string
  col: string
  tc: string
  subLabel: string
}

function recipientsFromStudents(students: {
  parentName: string
  parentPhone: string
  col: string
  tc: string
  name: string
  cls: string
}[]): MessageRecipient[] {
  const byKey = new Map<string, MessageRecipient>()
  for (const s of students) {
    const phoneDigits = normalizePhone(s.parentPhone)
    if (!phoneDigits) continue
    const label = `${s.name}(${s.cls})`
    const existing = byKey.get(phoneDigits)
    if (existing) {
      existing.subLabel = `${existing.subLabel}, ${label}`
    } else {
      byKey.set(phoneDigits, {
        key: phoneDigits,
        name: s.parentName,
        phone: s.parentPhone,
        phoneDigits,
        col: s.col,
        tc: s.tc,
        subLabel: label,
      })
    }
  }
  return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}

function formatSenderPhoneDisplay(digits: string) {
  if (digits.length === 11 && digits.startsWith('010')) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10 && digits.startsWith('02')) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }
  return digits
}

function normalizePhone(v: string) {
  return v.replace(/[^\d]/g, '')
}

function RecipientPicker({
  recipients,
  checkedIds,
  onToggle,
  onSelectAll,
  onClearAll,
  onSelectKeys,
  onDeselectKeys,
  emptyText,
}: {
  recipients: MessageRecipient[]
  checkedIds: Set<string>
  onToggle: (key: string) => void
  onSelectAll: () => void
  onClearAll: () => void
  onSelectKeys: (keys: string[]) => void
  onDeselectKeys: (keys: string[]) => void
  emptyText: string
}) {
  const [search, setSearch] = React.useState('')

  const filtered = React.useMemo(() => {
    const q = search.trim()
    if (!q) return recipients
    const nq = normalizePhone(q)
    const lower = q.toLowerCase()
    return recipients.filter((r) => {
      if (r.name.toLowerCase().includes(lower)) return true
      if (r.subLabel.toLowerCase().includes(lower)) return true
      if (r.phone.includes(q)) return true
      if (nq.length >= 3 && r.phoneDigits.includes(nq)) return true
      return false
    })
  }, [recipients, search])

  const searching = search.trim().length > 0
  const filteredKeys = filtered.filter((r) => r.phoneDigits.length > 0).map((r) => r.key)

  return (
    <div className="sec">
      <div className="row" style={{ marginBottom: 10 }}>
        <span className="sec-title" style={{ marginBottom: 0 }}>
          발송 대상 ({checkedIds.size}/{recipients.length}명)
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={searching ? () => onSelectKeys(filteredKeys) : onSelectAll}
            style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'var(--ok2)', color: '#027A48', border: 'none', cursor: 'pointer' }}
          >
            {searching ? '검색결과 선택' : '전체 선택'}
          </button>
          <button
            type="button"
            onClick={searching ? () => onDeselectKeys(filteredKeys) : onClearAll}
            style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'var(--bg2)', color: 'var(--slate2)', border: '1px solid var(--border)', cursor: 'pointer' }}
          >
            {searching ? '검색결과 해제' : '전체 해제'}
          </button>
        </div>
      </div>
      <input
        className="input-field"
        style={{ marginTop: 0, marginBottom: 10 }}
        placeholder="학생명·학부모명·전화번호로 검색..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {recipients.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--slate3)', fontSize: 13 }}>
          {emptyText}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--slate3)', fontSize: 13 }}>
          검색 결과가 없습니다
        </div>
      ) : (
        <div className="card">
          {filtered.map((r) => {
            const checked = checkedIds.has(r.key)
            const noPhone = r.phoneDigits.length === 0
            return (
              <div
                key={r.key}
                onClick={() => !noPhone && onToggle(r.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--border)',
                  cursor: noPhone ? 'not-allowed' : 'pointer',
                  background: checked && !noPhone ? 'var(--acc2)' : 'transparent',
                  opacity: noPhone ? 0.55 : 1,
                  transition: 'background .12s',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked && !noPhone}
                  disabled={noPhone}
                  onChange={() => onToggle(r.key)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: 16, height: 16, accentColor: 'var(--acc)', flexShrink: 0 }}
                />
                <div className="avatar" style={{ background: r.col, color: r.tc, width: 32, height: 32, fontSize: 12 }}>
                  {r.subLabel[0] || r.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row">
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{r.subLabel}</span>
                    {noPhone && <Badge cls="badge-red">번호 없음</Badge>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--slate2)', marginTop: 2 }}>
                    학부모 {r.name} · {r.phone || '연락처 미등록'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function MessagePage() {
  const location = useLocation()
  const initialTabIdx = React.useMemo(() => {
    const qp = new URLSearchParams(location.search).get('tab')
    return qp === 'payment' ? 2 : 0
  }, [location.search])
  const { costByType, error: pointCostError } = usePointCosts()
  const [currentPoints, setCurrentPoints] = useState(0)
  const [senderInfo, setSenderInfo] = useState<{
    senderNumber: string
    sourceLabel: string
  } | null>(null)
  const [senderInfoError, setSenderInfoError] = useState<string | null>(null)
  const [selectedHistory, setSelectedHistory] = useState<null | {
    title: string
    bodyPreview: string
    targetLabel: string
    recipientCount: number
    createdAt: string
  }>(null)

  const [tabIdx, setTabIdx] = useState(initialTabIdx)
  React.useEffect(() => {
    setTabIdx(initialTabIdx)
  }, [initialTabIdx])

  const [msg, setMsg] = useState('')
  const user = useAuthStore((s) => s.user)
  const students = useDataStore((s) => s.students)
  const paymentYearMonth = useDataStore((s) => s.paymentYearMonth)
  const classes = useDataStore((s) => s.classes)
  const messageSends = useDataStore((s) => s.messageSends)
  const fetchMessageSends = useDataStore((s) => s.fetchMessageSends)
  const saveMessageSendLog = useDataStore((s) => s.saveMessageSendLog)
  const { ref: toastRef, show: showToast } = useToast()

  const allStu = students
  const unpaid = allStu.filter((s) => !isFullPaid(s))

  const [chips, setChips] = useState<boolean[]>(() => classes.map((_, i) => i === 0))
  React.useEffect(() => {
    setChips((prev) => {
      if (classes.length === 0) return []
      if (prev.length === classes.length) return prev
      const next = classes.map((_, i) => prev[i] ?? false)
      if (!next.some(Boolean)) next[0] = true
      return next
    })
  }, [classes])
  const clsCounts = classes.map((c) => ({
    cid: c.cid,
    name: c.name,
    n: allStu.filter((s) => studentInClass(s, c)).length,
  }))
  const selectedClassItems = classes.filter((_, i) => chips[i])
  const selectedClasses = clsCounts.filter((_, i) => chips[i])

  const buildClassRecipients = React.useCallback((): MessageRecipient[] => {
    if (selectedClassItems.length === 0) return []
    const matched = students.filter((s) =>
      selectedClassItems.some((cls) => studentInClass(s, cls)),
    )
    return recipientsFromStudents(matched)
  }, [students, selectedClassItems])

  const buildAllRecipients = React.useCallback((): MessageRecipient[] => {
    return recipientsFromStudents(students)
  }, [students])

  const classRecipients = React.useMemo(() => buildClassRecipients(), [buildClassRecipients])
  const allRecipients = React.useMemo(() => buildAllRecipients(), [buildAllRecipients])
  const classRecipientKey = React.useMemo(
    () => classRecipients.map((r) => r.key).join(','),
    [classRecipients],
  )
  const studentKey = React.useMemo(
    () => students.map((s) => s.sid).join(','),
    [students],
  )

  const [checkedClassParentIds, setCheckedClassParentIds] = useState<Set<string>>(new Set())
  const [checkedAllParentIds, setCheckedAllParentIds] = useState<Set<string>>(new Set())

  React.useEffect(() => {
    setCheckedClassParentIds(new Set(classRecipients.map((r) => r.key)))
  }, [classRecipientKey])

  React.useEffect(() => {
    setCheckedAllParentIds(new Set(allRecipients.map((r) => r.key)))
  }, [studentKey, allRecipients])

  const toggleClassParent = (key: string) => {
    setCheckedClassParentIds((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleAllParent = (key: string) => {
    setCheckedAllParentIds((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectAllClassParents = () => {
    setCheckedClassParentIds(new Set(classRecipients.map((r) => r.key)))
  }

  const clearClassParents = () => setCheckedClassParentIds(new Set())

  const selectClassParentKeys = (keys: string[]) => {
    setCheckedClassParentIds((prev) => {
      const next = new Set(prev)
      keys.forEach((k) => next.add(k))
      return next
    })
  }

  const deselectClassParentKeys = (keys: string[]) => {
    setCheckedClassParentIds((prev) => {
      const next = new Set(prev)
      keys.forEach((k) => next.delete(k))
      return next
    })
  }

  const selectAllParents = () => {
    setCheckedAllParentIds(new Set(allRecipients.map((r) => r.key)))
  }

  const clearAllParents = () => setCheckedAllParentIds(new Set())

  const selectAllParentKeys = (keys: string[]) => {
    setCheckedAllParentIds((prev) => {
      const next = new Set(prev)
      keys.forEach((k) => next.add(k))
      return next
    })
  }

  const deselectAllParentKeys = (keys: string[]) => {
    setCheckedAllParentIds((prev) => {
      const next = new Set(prev)
      keys.forEach((k) => next.delete(k))
      return next
    })
  }

  React.useEffect(() => {
    void fetchMessageSends()
  }, [fetchMessageSends])

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await client.get('/admin/message-sends/sender')
        const data = (res.data as { data?: { senderNumber?: string; sourceLabel?: string } }).data
        if (data?.senderNumber) {
          setSenderInfo({
            senderNumber: data.senderNumber,
            sourceLabel: data.sourceLabel ?? '발신번호',
          })
          setSenderInfoError(null)
        } else {
          setSenderInfo(null)
          setSenderInfoError('발신번호를 불러오지 못했습니다.')
        }
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } }; message?: string }
        setSenderInfo(null)
        setSenderInfoError(err?.response?.data?.message ?? err?.message ?? '발신번호를 불러오지 못했습니다.')
      }
    })()
  }, [])

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await client.get('/admin/billing')
        const summary = (res.data as { data?: { smsPoints?: number } }).data
        setCurrentPoints(typeof summary?.smsPoints === 'number' ? summary.smsPoints : 0)
      } catch {
        setCurrentPoints(0)
      }
    })()
  }, [])

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const lower = file.name.toLowerCase()
    if (!(lower.endsWith('.jpg') || lower.endsWith('.jpeg'))) {
      alert('MMS 첨부는 JPG/JPEG만 가능합니다.')
      return
    }
    if (file.size > 300 * 1024) { alert('MMS 첨부는 300KB 이하만 가능합니다.'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string)
      setImageFile(file)
    }
    reader.readAsDataURL(file)
  }

  const [checkedUnpaid, setCheckedUnpaid] = useState<Set<number>>(() => new Set(unpaid.map((s) => s.sid)))
  const [unpaidSearch, setUnpaidSearch] = useState('')
  const filteredUnpaid = React.useMemo(() => {
    const q = unpaidSearch.trim()
    if (!q) return unpaid
    const nq = normalizePhone(q)
    const lower = q.toLowerCase()
    return unpaid.filter((s) => {
      if (s.name.toLowerCase().includes(lower)) return true
      if (s.parentName.toLowerCase().includes(lower)) return true
      if (s.parentPhone.includes(q)) return true
      if (nq.length >= 3 && normalizePhone(s.parentPhone).includes(nq)) return true
      return false
    })
  }, [unpaid, unpaidSearch])
  const toggleUnpaid = (sid: number) => {
    setCheckedUnpaid((prev) => {
      const next = new Set(prev)
      next.has(sid) ? next.delete(sid) : next.add(sid)
      return next
    })
  }

  const msgTitle = (text: string) => {
    const t = text.trim()
    if (!t) return '(내용 없음)'
    const line = t.split(/\r?\n/)[0]?.trim() ?? ''
    return line.length > 80 ? `${line.slice(0, 80)}…` : line
  }
  const academyPrefix = user?.academyName?.trim()
    ? `[${user.academyName.trim()}]`
    : ''
  const withDefaultPrefix = (text: string) => {
    const t = text.trim()
    if (!t) return ''
    if (!academyPrefix) return t
    if (t.startsWith(academyPrefix)) return t
    return `${academyPrefix}\n${t}`
  }

  const uniqueRecipientPhones = (phones: string[]) =>
    Array.from(new Set(phones.map(normalizePhone).filter((p) => p.length > 0)))

  const resolveMessageType = (text: string, hasImage: boolean): 'SMS' | 'LMS' | 'MMS' => {
    if (hasImage) return 'MMS'
    const bytes = new TextEncoder().encode(text).length
    return bytes <= 90 ? 'SMS' : 'LMS'
  }

  const messageTypeLabel = (type: MessageCostType) => {
    if (type === 'KAKAO_ALIMTALK') return '카카오 알림톡'
    if (type === 'SMS') return 'SMS 단문'
    if (type === 'LMS') return 'LMS'
    return 'MMS'
  }

  const imageToAttachFiles = async () => {
    if (!imagePreview || !imageFile) return undefined
    const base64 = imagePreview.includes(',') ? imagePreview.split(',')[1] : imagePreview
    if (!base64) return undefined
    return [{ fileName: imageFile.name || 'attachment.jpg', fileBodyBase64: base64 }]
  }

  const formatLogDate = (iso: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const kindBadge = (kind: string) => {
    if (kind === 'CLASS') return 'badge-blue'
    if (kind === 'ALL') return 'badge-gray'
    return 'badge-amber'
  }

  const historyDetailModal = selectedHistory ? (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(16,24,40,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={() => setSelectedHistory(null)}
    >
      <div
        className="card"
        style={{ width: 'min(560px, 92vw)', maxHeight: '80vh', overflow: 'auto', padding: 18 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row" style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>메시지 상세</div>
          <button
            type="button"
            onClick={() => setSelectedHistory(null)}
            style={{ border: 'none', background: 'none', fontSize: 22, color: 'var(--slate3)', cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
        <div style={{ fontSize: 13, color: 'var(--slate2)', lineHeight: 1.8 }}>
          <div><b style={{ color: 'var(--navy)' }}>제목:</b> {selectedHistory.title}</div>
          <div><b style={{ color: 'var(--navy)' }}>대상:</b> {selectedHistory.targetLabel}</div>
          <div><b style={{ color: 'var(--navy)' }}>발송건수:</b> {selectedHistory.recipientCount}명</div>
          <div><b style={{ color: 'var(--navy)' }}>발송일시:</b> {formatLogDate(selectedHistory.createdAt)}</div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate2)', marginBottom: 6 }}>메시지 내용</div>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, color: 'var(--slate)', lineHeight: 1.6, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
            {selectedHistory.bodyPreview || '(내용 없음)'}
          </div>
          <button
            type="button"
            className="btn-secondary"
            style={{ marginTop: 10 }}
            onClick={async () => {
              const text = selectedHistory.bodyPreview || ''
              if (!text) {
                showToast('복사할 메시지 내용이 없습니다.')
                return
              }
              try {
                await navigator.clipboard.writeText(text)
                showToast('메시지 내용을 복사했습니다.')
              } catch {
                showToast('복사에 실패했습니다.')
              }
            }}
          >
            메시지 내용 복사
          </button>
        </div>
      </div>
    </div>
  ) : null

  const histClass = messageSends.filter((h) => h.kind === 'CLASS')
  const histAll = messageSends.filter((h) => h.kind === 'ALL')
  const histPay = messageSends.filter((h) => h.kind === 'PAYMENT')

  const SenderInfoBar = () => (
    <div className="sec">
      <div
        className="card"
        style={{
          padding: '12px 16px',
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>발신 번호</div>
          {senderInfo ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--acc)', letterSpacing: '0.02em' }}>
                {formatSenderPhoneDisplay(senderInfo.senderNumber)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--slate3)', marginTop: 4 }}>
                {senderInfo.sourceLabel} · 발송 시 자동 적용
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: senderInfoError ? 'var(--err)' : 'var(--slate3)' }}>
              {senderInfoError ?? '발신번호 확인 중…'}
            </div>
          )}
        </div>
        <span className="badge badge-gray" style={{ flexShrink: 0 }}>자동</span>
      </div>
    </div>
  )

  // 이미지 첨부 UI
  const ImageAttach = () => (
    <div>
      <label className="input-label">이미지 첨부 (선택)</label>
      <input ref={fileRef} type="file" accept=".jpg,.jpeg,image/jpeg" style={{ display: 'none' }} onChange={handleImageSelect} />
      {imagePreview ? (
        <div style={{ marginTop: 8, position: 'relative' }}>
          <img src={imagePreview} alt="첨부" style={{ width: '100%', borderRadius: 8, maxHeight: 160, objectFit: 'cover', border: '1px solid var(--border)' }} />
          <button onClick={() => { setImagePreview(null); setImageFile(null); if (fileRef.current) fileRef.current.value = '' }}
            style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 14, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()}
          style={{ marginTop: 8, width: '100%', padding: '11px 0', border: '1.5px dashed var(--border)', borderRadius: 8, background: 'var(--bg2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <svg style={{ width: 18, height: 18, stroke: 'var(--slate3)', fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round' }} viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
          <span style={{ fontSize: 12, color: 'var(--slate3)' }}>이미지 첨부 (JPG/JPEG, 최대 300KB)</span>
        </button>
      )}
    </div>
  )

  const classSelectedRecipients = classRecipients.filter(
    (r) => checkedClassParentIds.has(r.key) && r.phoneDigits.length > 0,
  )
  const allSelectedRecipients = allRecipients.filter(
    (r) => checkedAllParentIds.has(r.key) && r.phoneDigits.length > 0,
  )

  const classRecipientPhones = uniqueRecipientPhones(
    classSelectedRecipients.map((r) => r.phoneDigits),
  )
  const classMessageType = resolveMessageType(withDefaultPrefix(msg), !!imageFile)
  const classPerCost = costByType[classMessageType]
  const classTotalCost = classRecipientPhones.length * classPerCost
  const classInsufficient = classTotalCost > currentPoints

  const allRecipientPhones = uniqueRecipientPhones(
    allSelectedRecipients.map((r) => r.phoneDigits),
  )
  const allMessageType = resolveMessageType(withDefaultPrefix(msg), !!imageFile)
  const allPerCost = costByType[allMessageType]
  const allTotalCost = allRecipientPhones.length * allPerCost
  const allInsufficient = allTotalCost > currentPoints

  const paymentTargets = unpaid
    .filter((s) => checkedUnpaid.has(s.sid))
    .map((s) => {
      const phone = normalizePhone(s.parentPhone ?? '')
      if (!phone) return null
      const unpaidFees = Object.values(s.fees).filter((f) => !f.paid)
      const amount = unpaidFees.reduce((sum, fee) => sum + (Number(fee.amount) || 0), 0)
      return {
        phone,
        parentName: s.parentName,
        studentName: s.name,
        amount,
      }
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)
  const paymentRecipientCount = paymentTargets.length
  const paymentPerCost = costByType.KAKAO_ALIMTALK
  const paymentTotalCost = paymentRecipientCount * paymentPerCost
  const paymentInsufficient = paymentTotalCost > currentPoints
  const actualMessage = withDefaultPrefix(msg)

  return (
    <>
      <TopBar title="메시지 발송" sub="알림톡·전체·반별" />
      <TabBar tabs={['반별 발송', '전체 발송', '수업료 안내']} active={tabIdx} onChange={setTabIdx} />

      <div className="page-content-body">
        {pointCostError && (
          <div className="sec">
            <div style={{ padding: 12, borderRadius: 10, background: 'var(--err2)', color: 'var(--err)', fontSize: 13 }}>
              {pointCostError}
            </div>
          </div>
        )}

        <SenderInfoBar />

        {/* ── 반별 발송 ── */}
        {tabIdx === 0 && (
          <div>
            <div className="sec">
              <div className="sec-title">발송 대상 반 (중복 선택 가능)</div>
              <div className="chip-row" style={{ marginTop: 0 }}>
                {clsCounts.map((cc, i) => (
                  <div key={cc.cid} className={`chip${chips[i] ? ' active' : ''}`}
                    onClick={() => setChips((prev) => prev.map((v, j) => j === i ? !v : v))}>
                    {cc.name} ({cc.n}명)
                  </div>
                ))}
              </div>
              {selectedClasses.length > 0 && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                  {selectedClasses.map((c) => <span key={c.cid} className="badge badge-blue">{c.name}</span>)}
                  <span style={{ fontSize: 12, color: 'var(--acc)' }}>→ 학부모 {classRecipients.length}명</span>
                </div>
              )}
            </div>
            <RecipientPicker
              recipients={classRecipients}
              checkedIds={checkedClassParentIds}
              onToggle={toggleClassParent}
              onSelectAll={selectAllClassParents}
              onClearAll={clearClassParents}
              onSelectKeys={selectClassParentKeys}
              onDeselectKeys={deselectClassParentKeys}
              emptyText="선택한 반에 해당하는 학부모가 없습니다"
            />
            <div className="sec">
              <div
                className="card"
                style={{ padding: 12, marginBottom: 10, background: 'var(--bg2)', border: '1px solid var(--border)' }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>문자 차감 기준</div>
                <div style={{ fontSize: 12, color: 'var(--slate2)', lineHeight: 1.6 }}>
                  SMS 단문 {costByType.SMS}P · LMS {costByType.LMS}P · MMS {costByType.MMS}P (건당)
                </div>
              </div>
              <label className="input-label" style={{ marginTop: 0 }}>메시지 내용</label>
              {academyPrefix && (
                <input
                  className="input-field"
                  value={academyPrefix}
                  readOnly
                  style={{ marginBottom: 8, background: 'var(--bg2)', color: 'var(--slate2)' }}
                />
              )}
              <textarea className="input-field" placeholder={'학부모님께 전달할 내용을 입력하세요.\n문자 메시지로 발송 됩니다.'} value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={500} />
              <div style={{ fontSize: 11, color: 'var(--slate3)', marginTop: 3, textAlign: 'right' }}>{msg.length}/500</div>
              <div style={{ marginTop: 8, padding: 10, borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>실제 발송 메시지</div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--slate)', lineHeight: 1.6 }}>
                  {actualMessage || '(내용 없음)'}
                </div>
              </div>
              <ImageAttach />
              <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--slate2)', lineHeight: 1.6 }}>
                현재 잔액: <b style={{ color: 'var(--navy)' }}>{currentPoints}P</b> ·
                서비스: <b style={{ color: 'var(--navy)' }}>{messageTypeLabel(classMessageType)}</b> ·
                {' '}건당 차감: <b style={{ color: 'var(--navy)' }}>{classPerCost}P</b> ·
                {' '}대상: <b style={{ color: 'var(--navy)' }}>{classRecipientPhones.length}명</b> ·
                {' '}총 차감: <b style={{ color: 'var(--err)' }}>{classTotalCost}P</b>
              </div>
              {classInsufficient && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--err)' }}>
                  포인트가 부족합니다. 충전 후 발송해 주세요.
                </div>
              )}
              <button className="btn-primary"
                disabled={classRecipientPhones.length === 0 || msg.trim().length === 0 || classInsufficient}
                style={{ opacity: (classRecipientPhones.length === 0 || msg.trim().length === 0 || classInsufficient) ? 0.5 : 1 }}
                onClick={async () => {
                  const targetLabel = selectedClasses.map((c) => c.name).join('·')
                  try {
                    const body = withDefaultPrefix(msg)
                    const recipientPhones = classRecipientPhones
                    const messageType = classMessageType
                    const attachFiles = await imageToAttachFiles()
                    await saveMessageSendLog({
                      kind: 'CLASS',
                      targetLabel,
                      title: msgTitle(body),
                      bodyPreview: body.slice(0, 500),
                      recipientCount: recipientPhones.length,
                      messageType,
                      body,
                      recipientPhones,
                      attachFiles,
                    })
                    showToast(`${targetLabel} ${recipientPhones.length}명에게 발송 완료`)
                    setCurrentPoints((p) => Math.max(0, p - classTotalCost))
                    setMsg('')
                    setImagePreview(null)
                    setImageFile(null)
                    await fetchMessageSends()
                  } catch (e: any) {
                    alert(e?.response?.data?.message ?? e?.message ?? '발송 내역 저장에 실패했습니다.')
                  }
                }}>
                메시지 발송 ({classRecipientPhones.length}명)
              </button>
            </div>
            <div className="sec">
              <div className="sec-title">최근 발송 내역</div>
              <div className="card">
                {histClass.length === 0 ? (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--slate3)', fontSize: 13 }}>발송 내역이 없습니다</div>
                ) : (
                  histClass.map((h) => (
                    <div
                      key={h.id}
                      style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                      onClick={() => setSelectedHistory({
                        title: h.title,
                        bodyPreview: h.bodyPreview,
                        targetLabel: h.targetLabel,
                        recipientCount: h.recipientCount,
                        createdAt: h.createdAt,
                      })}
                    >
                      <div className="row"><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{h.title}</span><div style={{ display: 'flex', gap: 6 }}><Badge cls={kindBadge(h.kind)}>{h.targetLabel}</Badge></div></div>
                      <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 3 }}>{h.recipientCount}명 · {formatLogDate(h.createdAt)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 전체 발송 ── */}
        {tabIdx === 1 && (
          <div>
            <RecipientPicker
              recipients={allRecipients}
              checkedIds={checkedAllParentIds}
              onToggle={toggleAllParent}
              onSelectAll={selectAllParents}
              onClearAll={clearAllParents}
              onSelectKeys={selectAllParentKeys}
              onDeselectKeys={deselectAllParentKeys}
              emptyText="등록된 학부모가 없습니다"
            />
            <div className="sec">
              <div
                className="card"
                style={{ padding: 12, marginBottom: 10, background: 'var(--bg2)', border: '1px solid var(--border)' }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>문자 차감 기준</div>
                <div style={{ fontSize: 12, color: 'var(--slate2)', lineHeight: 1.6 }}>
                  SMS 단문 {costByType.SMS}P · LMS {costByType.LMS}P · MMS {costByType.MMS}P (건당)
                </div>
              </div>
              <label className="input-label" style={{ marginTop: 0 }}>메시지 내용</label>
              {academyPrefix && (
                <input
                  className="input-field"
                  value={academyPrefix}
                  readOnly
                  style={{ marginBottom: 8, background: 'var(--bg2)', color: 'var(--slate2)' }}
                />
              )}
              <textarea className="input-field" placeholder="전체 학부모에게 전달할 내용을 입력하세요." value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={500} />
              <div style={{ fontSize: 11, color: 'var(--slate3)', marginTop: 3, textAlign: 'right' }}>{msg.length}/500</div>
              <div style={{ marginTop: 8, padding: 10, borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>실제 발송 메시지</div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--slate)', lineHeight: 1.6 }}>
                  {actualMessage || '(내용 없음)'}
                </div>
              </div>
              <ImageAttach />
              <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--slate2)', lineHeight: 1.6 }}>
                현재 잔액: <b style={{ color: 'var(--navy)' }}>{currentPoints}P</b> ·
                서비스: <b style={{ color: 'var(--navy)' }}>{messageTypeLabel(allMessageType)}</b> ·
                {' '}건당 차감: <b style={{ color: 'var(--navy)' }}>{allPerCost}P</b> ·
                {' '}대상: <b style={{ color: 'var(--navy)' }}>{allRecipientPhones.length}명</b> ·
                {' '}총 차감: <b style={{ color: 'var(--err)' }}>{allTotalCost}P</b>
              </div>
              {allInsufficient && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--err)' }}>
                  포인트가 부족합니다. 충전 후 발송해 주세요.
                </div>
              )}
              <button className="btn-primary"
                disabled={allRecipientPhones.length === 0 || msg.trim().length === 0 || allInsufficient}
                style={{ opacity: (allRecipientPhones.length === 0 || msg.trim().length === 0 || allInsufficient) ? 0.5 : 1 }}
                onClick={async () => {
                  try {
                    const body = withDefaultPrefix(msg)
                    const recipientPhones = allRecipientPhones
                    const messageType = allMessageType
                    const attachFiles = await imageToAttachFiles()
                    await saveMessageSendLog({
                      kind: 'ALL',
                      targetLabel: '전체',
                      title: msgTitle(body),
                      bodyPreview: body.slice(0, 500),
                      recipientCount: recipientPhones.length,
                      messageType,
                      body,
                      recipientPhones,
                      attachFiles,
                    })
                    showToast(`전체 ${recipientPhones.length}명에게 발송 완료`)
                    setCurrentPoints((p) => Math.max(0, p - allTotalCost))
                    setMsg('')
                    setImagePreview(null)
                    setImageFile(null)
                    await fetchMessageSends()
                  } catch (e: any) {
                    alert(e?.response?.data?.message ?? e?.message ?? '발송 내역 저장에 실패했습니다.')
                  }
                }}>
                전체 발송 ({allRecipientPhones.length}명)
              </button>
            </div>
            <div className="sec">
              <div className="sec-title">최근 발송 내역</div>
              <div className="card">
                {histAll.length === 0 ? (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--slate3)', fontSize: 13 }}>발송 내역이 없습니다</div>
                ) : (
                  histAll.map((h) => (
                    <div
                      key={h.id}
                      style={{ padding: '12px 16px', cursor: 'pointer' }}
                      onClick={() => setSelectedHistory({
                        title: h.title,
                        bodyPreview: h.bodyPreview,
                        targetLabel: h.targetLabel,
                        recipientCount: h.recipientCount,
                        createdAt: h.createdAt,
                      })}
                    >
                      <div className="row"><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{h.title}</span><div style={{ display: 'flex', gap: 6 }}><Badge cls={kindBadge(h.kind)}>{h.targetLabel}</Badge></div></div>
                      <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 3 }}>{h.recipientCount}명 · {formatLogDate(h.createdAt)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 수납 안내 문자 ── */}
        {tabIdx === 2 && (
          <div>
            <div className="sec">
              <div
                className="card"
                style={{ padding: 12, marginBottom: 10, background: 'var(--bg2)', border: '1px solid var(--border)' }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>문자 차감 기준</div>
                <div style={{ fontSize: 12, color: 'var(--slate2)', lineHeight: 1.6 }}>
                  SMS 단문 {costByType.SMS}P · LMS {costByType.LMS}P · MMS {costByType.MMS}P (건당)
                </div>
              </div>
              <div className="row" style={{ marginBottom: 10 }}>
                <span className="sec-title" style={{ marginBottom: 0 }}>미납 학부모 선택 ({checkedUnpaid.size}/{unpaid.length}명)</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => {
                    if (unpaidSearch.trim()) {
                      setCheckedUnpaid((prev) => {
                        const next = new Set(prev)
                        filteredUnpaid.forEach((s) => next.add(s.sid))
                        return next
                      })
                    } else {
                      setCheckedUnpaid(new Set(unpaid.map((s) => s.sid)))
                    }
                  }}
                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'var(--ok2)', color: '#027A48', border: 'none', cursor: 'pointer' }}>
                    {unpaidSearch.trim() ? '검색결과 선택' : '전체 선택'}
                  </button>
                  <button onClick={() => {
                    if (unpaidSearch.trim()) {
                      setCheckedUnpaid((prev) => {
                        const next = new Set(prev)
                        filteredUnpaid.forEach((s) => next.delete(s.sid))
                        return next
                      })
                    } else {
                      setCheckedUnpaid(new Set())
                    }
                  }}
                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'var(--bg2)', color: 'var(--slate2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                    {unpaidSearch.trim() ? '검색결과 해제' : '전체 해제'}
                  </button>
                </div>
              </div>
              <input
                className="input-field"
                style={{ marginTop: 0, marginBottom: 10 }}
                placeholder="학생명·학부모명·전화번호로 검색..."
                value={unpaidSearch}
                onChange={(e) => setUnpaidSearch(e.target.value)}
              />
              {unpaid.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--slate3)', fontSize: 13 }}>미납 학생이 없습니다</div>
              ) : filteredUnpaid.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--slate3)', fontSize: 13 }}>검색 결과가 없습니다</div>
              ) : (
                <div className="card">
                  {filteredUnpaid.map((s) => {
                    const labels = Object.values(s.fees).filter((f) => !f.paid).map((f) => f.label).join('·')
                    const checked = checkedUnpaid.has(s.sid)
                    return (
                      <div key={s.sid} onClick={() => toggleUnpaid(s.sid)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: checked ? 'var(--err2)' : 'transparent', transition: 'background .12s' }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleUnpaid(s.sid)} onClick={(e) => e.stopPropagation()} style={{ width: 16, height: 16, accentColor: 'var(--err)', flexShrink: 0 }} />
                        <div className="avatar" style={{ background: s.col, color: s.tc, width: 32, height: 32, fontSize: 12 }}>{s.name[0]}</div>
                        <div style={{ flex: 1 }}>
                          <div className="row">
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{s.name}</span>
                            <Badge cls="badge-red">미납</Badge>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--slate2)', marginTop: 1 }}>학부모 {s.parentName} · {labels}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {checkedUnpaid.size > 0 && (
                <div style={{ marginBottom: 10, padding: 10, borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--slate2)', lineHeight: 1.6 }}>
                  현재 잔액: <b style={{ color: 'var(--navy)' }}>{currentPoints}P</b> ·
                  서비스: <b style={{ color: 'var(--navy)' }}>카카오 알림톡</b> ·
                  {' '}건당 차감: <b style={{ color: 'var(--navy)' }}>{paymentPerCost}P</b> ·
                  {' '}대상: <b style={{ color: 'var(--navy)' }}>{paymentRecipientCount}명</b> ·
                  {' '}총 차감: <b style={{ color: 'var(--err)' }}>{paymentTotalCost}P</b>
                </div>
              )}
              {checkedUnpaid.size > 0 && paymentInsufficient && (
                <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--err)' }}>
                  포인트가 부족합니다. 충전 후 발송해 주세요.
                </div>
              )}
              {checkedUnpaid.size > 0 && (
                <button className="btn-red" style={{ marginTop: 14, opacity: paymentInsufficient ? 0.5 : 1 }} disabled={paymentInsufficient}
                  onClick={async () => {
                    const n = checkedUnpaid.size
                    try {
                      const academyName = user?.academyName?.trim() || '학원'
                      let successCount = 0
                      const failedTargets: string[] = []

                      for (const target of paymentTargets) {
                        const body = buildTuitionAlimtalkMessage({
                          academyName,
                          parentName: target.parentName,
                          billingYearMonth: paymentYearMonth,
                          studentName: target.studentName,
                          amount: target.amount,
                        })
                        try {
                          await saveMessageSendLog({
                            kind: 'PAYMENT',
                            targetLabel: '수납',
                            title: `[수업료] ${target.studentName}`,
                            bodyPreview: body.slice(0, 500),
                            recipientCount: 1,
                            messageType: 'PAYMENT_SMS',
                            templateCode: TUITION_ALIMTALK_TEMPLATE_CODE,
                            body,
                            recipientPhones: [target.phone],
                          })
                          successCount += 1
                        } catch {
                          failedTargets.push(`${target.parentName}(${target.studentName})`)
                        }
                      }

                      if (successCount > 0) {
                        showToast(`${successCount}명에게 수업료 안내 문자 발송 완료`)
                        setCurrentPoints((p) => Math.max(0, p - successCount * paymentPerCost))
                      }
                      if (failedTargets.length > 0) {
                        alert(`일부 발송에 실패했습니다.\n실패 대상: ${failedTargets.join(', ')}`)
                      }
                      setCheckedUnpaid(new Set())
                      setImagePreview(null)
                      setImageFile(null)
                      await fetchMessageSends()
                    } catch (e: any) {
                      alert(e?.response?.data?.message ?? e?.message ?? '발송 내역 저장에 실패했습니다.')
                    }
                  }}>
                  선택 {checkedUnpaid.size}명에게 수업료 안내 문자 발송
                </button>
              )}
            </div>
            <div className="sec">
              <div className="sec-title">최근 발송 내역</div>
              <div className="card">
                {histPay.length === 0 ? (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--slate3)', fontSize: 13 }}>발송 내역이 없습니다</div>
                ) : (
                  histPay.map((h) => (
                    <div
                      key={h.id}
                      style={{ padding: '12px 16px', cursor: 'pointer' }}
                      onClick={() => setSelectedHistory({
                        title: h.title,
                        bodyPreview: h.bodyPreview,
                        targetLabel: h.targetLabel,
                        recipientCount: h.recipientCount,
                        createdAt: h.createdAt,
                      })}
                    >
                      <div className="row"><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{h.title}</span><div style={{ display: 'flex', gap: 6 }}><Badge cls={kindBadge(h.kind)}>{h.targetLabel}</Badge></div></div>
                      <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 3 }}>{h.recipientCount}명 · {formatLogDate(h.createdAt)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {historyDetailModal}
      <Toast toastRef={toastRef} />
    </>
  )
}
