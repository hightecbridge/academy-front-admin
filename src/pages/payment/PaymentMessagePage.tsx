import { useEffect, useMemo, useState } from 'react'
import { TopBar, useToast, Toast } from '../../components/common'
import { useDataStore, isFullPaid } from '../../store/dataStore'
import { useAuthStore } from '../../store/authStore'
import client from '../../api/client'

export default function PaymentMessagePage() {
  const parents = useDataStore((s) => s.parents)
  const senderNumbers = useDataStore((s) => s.senderNumbers)
  const fetchSenderNumbers = useDataStore((s) => s.fetchSenderNumbers)
  const saveMessageSendLog = useDataStore((s) => s.saveMessageSendLog)
  const { ref: toastRef, show: showToast } = useToast()
  const user = useAuthStore((s) => s.user)
  const [selectedParentIds, setSelectedParentIds] = useState<Set<number>>(new Set())
  const [message, setMessage] = useState('안녕하세요. 결제 예정 내역이 있어 안내드립니다. 자세한 금액은 학원으로 문의 부탁드립니다.')
  const [sending, setSending] = useState(false)
  const [currentPoints, setCurrentPoints] = useState(0)
  const [perCost, setPerCost] = useState(0)

  const ownerPhone = user?.phone?.trim()
  const ownerSender = ownerPhone ? { id: -1, label: '원장', number: ownerPhone, isDefault: true } : null
  const senderOptions = ownerSender
    ? [ownerSender, ...senderNumbers.filter((s) => s.number !== ownerPhone)]
    : senderNumbers
  const defaultSenderId = senderOptions.find((s) => s.isDefault)?.id ?? senderOptions[0]?.id ?? 0
  const [selectedSenderId, setSelectedSenderId] = useState<number>(defaultSenderId)

  const unpaidParents = useMemo(() => {
    return parents.filter((p) => p.students.some((s) => !isFullPaid(s)))
  }, [parents])

  const selectedTargets = unpaidParents.filter((p) => selectedParentIds.has(p.pid))
  const recipientPhones = Array.from(
    new Set(
      selectedTargets
        .map((p) => p.phone.replace(/[^\d]/g, ''))
        .filter((n) => n.length > 0),
    ),
  )
  const totalCost = recipientPhones.length * perCost
  const insufficient = totalCost > currentPoints

  useEffect(() => {
    void fetchSenderNumbers()
    void (async () => {
      try {
        const res = await client.get('/admin/billing')
        const data = (res.data as { data?: { smsPoints?: number; smsCostPaymentNudge?: number } }).data
        setCurrentPoints(typeof data?.smsPoints === 'number' ? data.smsPoints : 0)
        setPerCost(typeof data?.smsCostPaymentNudge === 'number' ? data.smsCostPaymentNudge : 0)
      } catch {
        setCurrentPoints(0)
        setPerCost(0)
      }
    })()
  }, [fetchSenderNumbers])

  useEffect(() => {
    if (senderOptions.length === 0) return
    if (!senderOptions.some((s) => s.id === selectedSenderId)) {
      setSelectedSenderId(defaultSenderId)
    }
  }, [senderOptions, selectedSenderId, defaultSenderId])

  const toggleParent = (pid: number) => {
    setSelectedParentIds((prev) => {
      const next = new Set(prev)
      if (next.has(pid)) next.delete(pid)
      else next.add(pid)
      return next
    })
  }

  const selectAll = () => setSelectedParentIds(new Set(unpaidParents.map((p) => p.pid)))
  const clearAll = () => setSelectedParentIds(new Set())

  const senderNo = senderOptions.find((s) => s.id === selectedSenderId)?.number.replace(/[^\d]/g, '') ?? ''

  const sendPaymentMessage = async () => {
    if (sending) return
    if (!senderNo) {
      showToast('발신 번호를 선택해 주세요.')
      return
    }
    if (recipientPhones.length === 0) {
      showToast('발송 대상을 선택해 주세요.')
      return
    }
    if (!message.trim()) {
      showToast('메시지 내용을 입력해 주세요.')
      return
    }
    if (insufficient) {
      showToast('포인트가 부족합니다.')
      return
    }
    setSending(true)
    try {
      await saveMessageSendLog({
        kind: 'PAYMENT',
        targetLabel: '결제메시지',
        title: '결제 안내 문자',
        bodyPreview: message.trim().slice(0, 500),
        recipientCount: recipientPhones.length,
        messageType: 'PAYMENT_SMS',
        sendNo: senderNo,
        body: message.trim(),
        recipientPhones,
      })
      setCurrentPoints((prev) => Math.max(0, prev - totalCost))
      showToast(`${recipientPhones.length}명에게 결제 메시지를 발송했습니다.`)
      clearAll()
    } catch (e: any) {
      alert(e?.response?.data?.message ?? e?.message ?? '결제 메시지 발송에 실패했습니다.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <TopBar title="결제메시지" sub="결제선생 API연동(파트너) 기준 발송" />
      <div className="page-content-body">
        <div className="sec">
          <div className="card" style={{ padding: 14, border: '1px solid var(--acc3)', background: 'var(--acc2)' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)', marginBottom: 6 }}>결제선생 연동 안내</div>
            <div style={{ fontSize: 12, color: 'var(--slate2)', lineHeight: 1.7 }}>
              1) 결제선생 가입 및 파트너 연동 설정
              <br />
              2) 우리 시스템과 결제선생 API 연결
              <br />
              3) 결제문자 발송 요청 자동 처리
              <br />
              4) 발송 결과/상태를 자동으로 수신하여 반영
            </div>
          </div>
        </div>

        <div className="sec">
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>자동 처리 범위</div>
            <div style={{ fontSize: 12, color: 'var(--slate2)', lineHeight: 1.7 }}>
              결제선생 API 연동 완료 시, 고객은 별도 설정 없이 이 화면에서 발송만 진행하면 됩니다.
              <br />
              발송 요청, 발송 결과 확인, 이력 반영까지 자동으로 처리됩니다.
            </div>
          </div>
        </div>

        <div className="sec">
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--slate2)', lineHeight: 1.7 }}>
              현재 잔여 포인트: <strong style={{ color: 'var(--navy)' }}>{currentPoints}P</strong> ·
              건당 차감: <strong style={{ color: 'var(--navy)' }}>{perCost}P</strong> ·
              대상: <strong style={{ color: 'var(--navy)' }}>{recipientPhones.length}명</strong> ·
              총 차감: <strong style={{ color: 'var(--err)' }}>{totalCost}P</strong>
            </div>
          </div>
        </div>

        <div className="sec">
          <div className="row" style={{ marginBottom: 8 }}>
            <div className="sec-title" style={{ marginBottom: 0 }}>발신 번호</div>
          </div>
          <select
            className="input-field"
            value={selectedSenderId}
            onChange={(e) => setSelectedSenderId(Number(e.target.value))}
          >
            {senderOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.label} ({s.number})</option>
            ))}
          </select>
        </div>

        <div className="sec">
          <div className="row" style={{ marginBottom: 8 }}>
            <div className="sec-title" style={{ marginBottom: 0 }}>미납 학부모 선택 ({unpaidParents.length}명)</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={selectAll} className="btn-secondary" style={{ padding: '6px 10px' }}>전체 선택</button>
              <button type="button" onClick={clearAll} className="btn-secondary" style={{ padding: '6px 10px' }}>전체 해제</button>
            </div>
          </div>
          <div className="card">
            {unpaidParents.map((p) => {
              const checked = selectedParentIds.has(p.pid)
              return (
                <label key={p.pid} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleParent(p.pid)} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--slate2)' }}>{p.phone}</div>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        <div className="sec">
          <div className="sec-title">결제 안내 메시지</div>
          <textarea
            className="input-field"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            placeholder="결제 안내 문구를 입력하세요."
          />
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--slate3)', textAlign: 'right' }}>{message.length}/500</div>
          {insufficient && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--err)' }}>포인트가 부족합니다. 충전 후 발송해 주세요.</div>
          )}
          <button type="button" className="btn-red" style={{ marginTop: 12, opacity: sending || insufficient ? 0.6 : 1 }} onClick={() => void sendPaymentMessage()} disabled={sending || insufficient}>
            {sending ? '발송 중…' : `결제 메시지 발송 (${recipientPhones.length}명)`}
          </button>
        </div>
      </div>
      <Toast toastRef={toastRef} />
    </>
  )
}
