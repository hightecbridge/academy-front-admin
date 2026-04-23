// src/pages/message/MessagePage.tsx
import React, { useState, useRef } from 'react'
import { TopBar, TabBar, Badge, useToast, Toast } from '../../components/common'
import { useDataStore, isFullPaid } from '../../store/dataStore'
import { useAuthStore } from '../../store/authStore'

export default function MessagePage() {
  const [tabIdx, setTabIdx] = useState(0)
  const [msg, setMsg] = useState('')
  const user = useAuthStore((s) => s.user)
  const parents = useDataStore((s) => s.parents)
  const classes = useDataStore((s) => s.classes)
  const senderNumbers = useDataStore((s) => s.senderNumbers)
  const fetchSenderNumbers = useDataStore((s) => s.fetchSenderNumbers)
  const messageSends = useDataStore((s) => s.messageSends)
  const fetchMessageSends = useDataStore((s) => s.fetchMessageSends)
  const saveMessageSendLog = useDataStore((s) => s.saveMessageSendLog)
  const addSenderNumber = useDataStore((s) => s.addSenderNumber)
  const deleteSenderNumber = useDataStore((s) => s.deleteSenderNumber)
  const setDefaultSender = useDataStore((s) => s.setDefaultSender)
  const { ref: toastRef, show: showToast } = useToast()

  const allStu = parents.flatMap((p) => p.students.map((s) => ({
    ...s, pid: p.pid, pname: p.name, pcol: p.col, ptc: p.tc,
  })))
  const unpaid = allStu.filter((s) => !isFullPaid(s))

  const [chips, setChips] = useState<boolean[]>(() => classes.map((_, i) => i === 0))
  const clsCounts = classes.map((c) => ({ cid: c.cid, name: c.name, n: allStu.filter((s) => s.cls === c.name).length }))
  const selectedClasses = clsCounts.filter((_, i) => chips[i])
  const selectedCount = selectedClasses.reduce((a, c) => a + c.n, 0)

  // 회원정보(원장) 전화번호는 기본 발신번호로 우선 노출
  const ownerPhone = user?.phone?.trim()
  const ownerSender = ownerPhone
    ? { id: -1, label: '원장', number: ownerPhone, isDefault: true }
    : null

  const senderOptions = ownerSender
    ? [ownerSender, ...senderNumbers.filter((s) => s.number !== ownerPhone)]
    : senderNumbers

  const defaultSender = senderOptions.find((s) => s.isDefault) ?? senderOptions[0]
  const [selectedSenderId, setSelectedSenderId] = useState<number>(defaultSender?.id ?? 0)
  React.useEffect(() => {
    if (senderOptions.length === 0) {
      setSelectedSenderId(0)
      return
    }
    if (!senderOptions.some((s) => s.id === selectedSenderId)) {
      setSelectedSenderId(defaultSender?.id ?? senderOptions[0].id)
    }
  }, [senderOptions, selectedSenderId, defaultSender])
  const [showSenderMgmt, setShowSenderMgmt] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newNumber, setNewNumber] = useState('')

  React.useEffect(() => {
    void fetchSenderNumbers()
    void fetchMessageSends()
  }, [fetchSenderNumbers, fetchMessageSends])

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

  const normalizePhone = (v: string) => v.replace(/[^\d]/g, '')
  const senderNo = normalizePhone(senderOptions.find((s) => s.id === selectedSenderId)?.number ?? '')

  const uniqueRecipientPhones = (phones: string[]) =>
    Array.from(new Set(phones.map(normalizePhone).filter((p) => p.length > 0)))

  const resolveMessageType = (text: string, hasImage: boolean): 'SMS' | 'LMS' | 'MMS' => {
    if (hasImage) return 'MMS'
    const bytes = new TextEncoder().encode(text).length
    return bytes <= 90 ? 'SMS' : 'LMS'
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

  const providerBadge = (provider?: string | null) => {
    if (provider === 'NHN') return 'badge-gray'
    return 'badge-blue'
  }

  const histClass = messageSends.filter((h) => h.kind === 'CLASS')
  const histAll = messageSends.filter((h) => h.kind === 'ALL')
  const histPay = messageSends.filter((h) => h.kind === 'PAYMENT')

  // 발신번호 바텀시트
  const newNumberInputRef = useRef<HTMLInputElement>(null)
  const senderMgmtUI = (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,40,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', zIndex: 500 }}>
      <div style={{ background: 'var(--bg1)', borderRadius: '20px 20px 0 0', padding: '20px 16px 32px', maxHeight: '75%', overflowY: 'auto' }}>
        <div className="row" style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--navy)' }}>발신번호 관리</span>
          <button
            onClick={() => setShowSenderMgmt(false)}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--slate3)', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
        {senderNumbers.map((s) => (
          <div
            key={s.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              marginBottom: 8,
              background: 'var(--bg2)',
              borderRadius: 10,
              border: s.isDefault ? '1.5px solid var(--acc)' : '1px solid var(--border)',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{s.label}</div>
              <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 1 }}>{s.number}</div>
            </div>
            {s.isDefault
              ? <span className="badge badge-blue">기본</span>
              : s.id !== -1
                ? <button onClick={() => void setDefaultSender(s.id).catch(() => {})} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'var(--bg3)', color: 'var(--slate2)', border: '1px solid var(--border)', cursor: 'pointer' }}>기본 설정</button>
                : null}
            {!s.isDefault && s.id !== -1 && (
              <button onClick={() => void deleteSenderNumber(s.id).catch(() => {})} style={{ background: 'none', border: 'none', color: 'var(--err)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
            )}
          </div>
        ))}
        <div style={{ marginTop: 14, padding: 14, background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate2)', marginBottom: 8 }}>새 발신번호 추가</div>
          <input
            className="input-field"
            style={{ marginTop: 0 }}
            placeholder="구분 (예: 원장, 담당교사)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <input
            ref={newNumberInputRef}
            className="input-field"
            type="tel"
            placeholder="010-0000-0000"
            value={newNumber}
            onChange={(e) => setNewNumber(e.target.value)}
          />
          <button
            className="btn-primary"
            onClick={async () => {
              if (!newLabel.trim() || !newNumber.trim()) { alert('구분과 번호를 모두 입력하세요.'); return }
              try {
                await addSenderNumber({ label: newLabel, number: newNumber, isDefault: false })
                setNewLabel('')
                setNewNumber('')
                showToast('발신번호가 추가되었습니다.')
                // 연속 입력을 위해 다시 커서 복귀
                setTimeout(() => newNumberInputRef.current?.focus(), 0)
              } catch (e: any) {
                alert(e?.response?.data?.message ?? e?.message ?? '발신번호 저장에 실패했습니다.')
              }
            }}
          >
            추가
          </button>
        </div>
      </div>
    </div>
  )

  // 발신번호 선택 UI
  const SenderRow = () => (
    <div className="sec">
      <div className="sec-title">발신 번호</div>
      <div style={{ background: 'var(--bg2)', borderRadius: 10, border: '1px solid var(--border)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          {senderOptions.length === 0
            ? <span style={{ fontSize: 13, color: 'var(--slate3)' }}>등록된 발신번호 없음</span>
            : (
              <select style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 600, color: 'var(--navy)', cursor: 'pointer', outline: 'none' }}
                value={selectedSenderId} onChange={(e) => setSelectedSenderId(Number(e.target.value))}>
                {senderOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.label} ({s.number}){s.isDefault ? ' ★' : ''}</option>
                ))}
              </select>
            )}
        </div>
        <button onClick={() => setShowSenderMgmt(true)}
          style={{ fontSize: 11, padding: '5px 11px', borderRadius: 6, background: 'var(--acc2)', color: 'var(--acc)', border: '1px solid var(--acc3)', cursor: 'pointer' }}>
          번호 관리
        </button>
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

  return (
    <>
      <TopBar title="메시지 발송" sub="알림톡·전체·반별" />
      <TabBar tabs={['반별 발송', '전체 발송', '카드결제']} active={tabIdx} onChange={setTabIdx} />

      <div className="page-content-body">

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
                  <span style={{ fontSize: 12, color: 'var(--acc)' }}>→ 총 {selectedCount}명</span>
                </div>
              )}
            </div>
            <SenderRow />
            <div className="sec">
              <label className="input-label" style={{ marginTop: 0 }}>메시지 내용</label>
              <textarea className="input-field" placeholder={'학부모님께 전달할 내용을 입력하세요.\n카카오 알림톡으로 발송됩니다.'} value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={500} />
              <div style={{ fontSize: 11, color: 'var(--slate3)', marginTop: 3, textAlign: 'right' }}>{msg.length}/500</div>
              <ImageAttach />
              <button className="btn-primary"
                disabled={selectedCount === 0 || msg.trim().length === 0}
                style={{ opacity: (selectedCount === 0 || msg.trim().length === 0) ? 0.5 : 1 }}
                onClick={async () => {
                  const targetLabel = selectedClasses.map((c) => c.name).join('·')
                  if (!senderNo) { alert('발신 번호를 선택해주세요.'); return }
                  try {
                    const selectedClassNames = new Set(selectedClasses.map((c) => c.name))
                    const selectedParentIds = new Set(
                      allStu.filter((s) => selectedClassNames.has(s.cls)).map((s) => s.pid),
                    )
                    const recipientPhones = uniqueRecipientPhones(
                      parents.filter((p) => selectedParentIds.has(p.pid)).map((p) => p.phone),
                    )
                    const messageType = resolveMessageType(msg.trim(), !!imageFile)
                    const attachFiles = await imageToAttachFiles()
                    await saveMessageSendLog({
                      kind: 'CLASS',
                      targetLabel,
                      title: msgTitle(msg),
                      bodyPreview: msg.trim().slice(0, 500),
                      recipientCount: recipientPhones.length,
                      messageType,
                      sendNo: senderNo,
                      body: msg.trim(),
                      recipientPhones,
                      attachFiles,
                    })
                    showToast(`${targetLabel} ${recipientPhones.length}명에게 발송 완료`)
                    setMsg('')
                    setImagePreview(null)
                    setImageFile(null)
                    await fetchMessageSends()
                  } catch (e: any) {
                    alert(e?.response?.data?.message ?? e?.message ?? '발송 내역 저장에 실패했습니다.')
                  }
                }}>
                알림톡 발송 ({selectedCount}명)
              </button>
            </div>
            <div className="sec">
              <div className="sec-title">최근 발송 내역</div>
              <div className="card">
                {histClass.length === 0 ? (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--slate3)', fontSize: 13 }}>발송 내역이 없습니다</div>
                ) : (
                  histClass.map((h) => (
                    <div key={h.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      <div className="row"><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{h.title}</span><div style={{ display: 'flex', gap: 6 }}><Badge cls={providerBadge(h.provider)}>{h.provider ?? 'ALIGO'}</Badge><Badge cls={kindBadge(h.kind)}>{h.targetLabel}</Badge></div></div>
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
            <SenderRow />
            <div className="sec">
              <label className="input-label" style={{ marginTop: 0 }}>메시지 내용</label>
              <textarea className="input-field" placeholder="전체 학부모에게 전달할 내용을 입력하세요." value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={500} />
              <div style={{ fontSize: 11, color: 'var(--slate3)', marginTop: 3, textAlign: 'right' }}>{msg.length}/500</div>
              <ImageAttach />
              <button className="btn-primary"
                disabled={msg.trim().length === 0}
                style={{ opacity: msg.trim().length === 0 ? 0.5 : 1 }}
                onClick={async () => {
                  if (!senderNo) { alert('발신 번호를 선택해주세요.'); return }
                  try {
                    const recipientPhones = uniqueRecipientPhones(parents.map((p) => p.phone))
                    const messageType = resolveMessageType(msg.trim(), !!imageFile)
                    const attachFiles = await imageToAttachFiles()
                    await saveMessageSendLog({
                      kind: 'ALL',
                      targetLabel: '전체',
                      title: msgTitle(msg),
                      bodyPreview: msg.trim().slice(0, 500),
                      recipientCount: recipientPhones.length,
                      messageType,
                      sendNo: senderNo,
                      body: msg.trim(),
                      recipientPhones,
                      attachFiles,
                    })
                    showToast(`전체 ${recipientPhones.length}명에게 발송 완료`)
                    setMsg('')
                    setImagePreview(null)
                    setImageFile(null)
                    await fetchMessageSends()
                  } catch (e: any) {
                    alert(e?.response?.data?.message ?? e?.message ?? '발송 내역 저장에 실패했습니다.')
                  }
                }}>
                전체 발송 ({parents.length}명)
              </button>
            </div>
            <div className="sec">
              <div className="sec-title">최근 발송 내역</div>
              <div className="card">
                {histAll.length === 0 ? (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--slate3)', fontSize: 13 }}>발송 내역이 없습니다</div>
                ) : (
                  histAll.map((h) => (
                    <div key={h.id} style={{ padding: '12px 16px' }}>
                      <div className="row"><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{h.title}</span><div style={{ display: 'flex', gap: 6 }}><Badge cls={providerBadge(h.provider)}>{h.provider ?? 'ALIGO'}</Badge><Badge cls={kindBadge(h.kind)}>{h.targetLabel}</Badge></div></div>
                      <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 3 }}>{h.recipientCount}명 · {formatLogDate(h.createdAt)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 카드결제 문자 ── */}
        {tabIdx === 2 && (
          <div>
            <SenderRow />
            <div className="sec">
              <div className="row" style={{ marginBottom: 10 }}>
                <span className="sec-title" style={{ marginBottom: 0 }}>미납 학부모 선택 ({unpaid.length}명)</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setCheckedUnpaid(new Set(unpaid.map((s) => s.sid)))}
                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'var(--ok2)', color: '#027A48', border: 'none', cursor: 'pointer' }}>전체 선택</button>
                  <button onClick={() => setCheckedUnpaid(new Set())}
                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'var(--bg2)', color: 'var(--slate2)', border: '1px solid var(--border)', cursor: 'pointer' }}>전체 해제</button>
                </div>
              </div>
              {unpaid.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--slate3)', fontSize: 13 }}>미납 학생이 없습니다</div>
              ) : (
                <div className="card">
                  {unpaid.map((s) => {
                    const labels = Object.values(s.fees).filter((f) => !f.paid).map((f) => f.label).join('·')
                    const checked = checkedUnpaid.has(s.sid)
                    return (
                      <div key={s.sid} onClick={() => toggleUnpaid(s.sid)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: checked ? 'var(--err2)' : 'transparent', transition: 'background .12s' }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleUnpaid(s.sid)} style={{ width: 16, height: 16, accentColor: 'var(--err)', flexShrink: 0 }} />
                        <div className="avatar" style={{ background: s.pcol, color: s.ptc, width: 32, height: 32, fontSize: 12 }}>{s.pname[0]}</div>
                        <div style={{ flex: 1 }}>
                          <div className="row">
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{s.pname}</span>
                            <Badge cls="badge-red">미납</Badge>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--slate2)', marginTop: 1 }}>{s.name} · {labels}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {checkedUnpaid.size > 0 && (
                <button className="btn-red" style={{ marginTop: 14 }}
                  onClick={async () => {
                    const n = checkedUnpaid.size
                    if (!senderNo) { alert('발신 번호를 선택해주세요.'); return }
                    try {
                      const selectedParentIds = new Set(
                        unpaid.filter((s) => checkedUnpaid.has(s.sid)).map((s) => s.pid),
                      )
                      const recipientPhones = uniqueRecipientPhones(
                        parents.filter((p) => selectedParentIds.has(p.pid)).map((p) => p.phone),
                      )
                      const paymentBody = `안녕하세요. 미납 결제 내역이 있어 안내드립니다. 자세한 금액은 학원으로 문의 부탁드립니다.`
                      const messageType = resolveMessageType(paymentBody, !!imageFile)
                      const attachFiles = await imageToAttachFiles()
                      await saveMessageSendLog({
                        kind: 'PAYMENT',
                        targetLabel: '결제',
                        title: '카드결제 문자',
                        bodyPreview: `미납 학부모 ${n}명 대상`,
                        recipientCount: recipientPhones.length,
                        messageType,
                        sendNo: senderNo,
                        body: paymentBody,
                        recipientPhones,
                        attachFiles,
                      })
                      showToast(`${recipientPhones.length}명에게 카드결제 문자 발송 완료`)
                      setCheckedUnpaid(new Set())
                      setImagePreview(null)
                      setImageFile(null)
                      await fetchMessageSends()
                    } catch (e: any) {
                      alert(e?.response?.data?.message ?? e?.message ?? '발송 내역 저장에 실패했습니다.')
                    }
                  }}>
                  선택 {checkedUnpaid.size}명에게 카드결제 문자 발송
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
                    <div key={h.id} style={{ padding: '12px 16px' }}>
                      <div className="row"><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{h.title}</span><div style={{ display: 'flex', gap: 6 }}><Badge cls={providerBadge(h.provider)}>{h.provider ?? 'ALIGO'}</Badge><Badge cls={kindBadge(h.kind)}>{h.targetLabel}</Badge></div></div>
                      <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 3 }}>{h.recipientCount}명 · {formatLogDate(h.createdAt)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {showSenderMgmt && senderMgmtUI}
      <Toast toastRef={toastRef} />
    </>
  )
}
