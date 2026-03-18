// src/pages/payment/PaymentPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar, TabBar, Avatar, Badge, Toggle, ProgBar, ChevronRight, useToast, Toast } from '../../components/common'
import { useDataStore, totalFee, paidFee, isFullPaid, isPartPaid, payPct, barCol, statusBdgCls, statusBdgTxt, clsBdg } from '../../store/dataStore'

export default function PaymentPage() {
  const navigate = useNavigate()
  const parents = useDataStore((s) => s.parents)
  const classes = useDataStore((s) => s.classes)
  const toggleFee = useDataStore((s) => s.toggleFee)
  const { ref: toastRef, show: showToast } = useToast()
  const [tabIdx, setTabIdx] = useState(0)

  const allStu = parents.flatMap((p) => p.students.map((s) => ({
    ...s, pid: p.pid, pname: p.name, pcol: p.col, ptc: p.tc,
  })))
  const filtered = tabIdx === 1 ? allStu.filter((s) => !isFullPaid(s))
    : tabIdx === 2 ? allStu.filter((s) => isFullPaid(s))
    : allStu

  const tAmt = allStu.reduce((a, s) => a + totalFee(s), 0)
  const pAmt = allStu.reduce((a, s) => a + paidFee(s), 0)
  const fullCnt = allStu.filter(isFullPaid).length
  const partCnt = allStu.filter(isPartPaid).length
  const noneCnt = allStu.filter((s) => !isFullPaid(s) && !isPartPaid(s)).length
  const totalPct = tAmt > 0 ? Math.round((pAmt / tAmt) * 100) : 0

  const COLORS = ['var(--acc)', 'var(--ok)', 'var(--purple)', 'var(--warn)', 'var(--err)']
  const clsStats = classes.map((cls, ci) => {
    const cs = allStu.filter((s) => s.cls === cls.name)
    const cp = cs.reduce((a, s) => a + paidFee(s), 0)
    const ct = cs.reduce((a, s) => a + totalFee(s), 0)
    return { c: cls.name, pct: ct > 0 ? Math.round((cp / ct) * 100) : 0, col: COLORS[ci % COLORS.length] }
  })

  const handleToggle = (sid: number, key: 'tuition' | 'book', v: boolean, label: string, sname: string) => {
    toggleFee(sid, key, v)
    showToast(`${sname} ${label} ${v ? '완납' : '미납'} 변경`)
  }

  return (
    <>
      <TopBar title="수납현황" sub="2024년 3월" />
      <TabBar tabs={['전체', '미납·일부납', '완납']} active={tabIdx} onChange={setTabIdx} />

      <div className="page-content-body">

        {/* 상단 요약 */}
        <div className="sec">
          <div className="stat-grid-3">
            <div className="stat-card">
              <div className="stat-label">완납</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ok)' }}>{fullCnt}</div>
              <div className="stat-sub">명</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">일부납</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--warn)' }}>{partCnt}</div>
              <div className="stat-sub">명</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">미납</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--err)' }}>{noneCnt}</div>
              <div className="stat-sub">명</div>
            </div>
          </div>
        </div>

        {/* 전체 수납률 요약 */}
        <div className="sec">
          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="row" style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>전체 수납률</span>
              <span style={{ fontSize: 13, color: 'var(--acc)', fontWeight: 600 }}>{totalPct}%</span>
            </div>
            <div style={{ display: 'flex', gap: 2, height: 7, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ flex: pAmt, background: 'var(--ok)' }} />
              <div style={{ flex: tAmt - pAmt, background: 'var(--err2)' }} />
            </div>
            <div className="row" style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--slate2)' }}>납부 {pAmt.toLocaleString()}원</span>
              <span style={{ fontSize: 11, color: 'var(--slate3)' }}>미납 {(tAmt - pAmt).toLocaleString()}원</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              {clsStats.map((cs, i) => (
                <div key={cs.c} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < clsStats.length - 1 ? 8 : 0 }}>
                  <span style={{ fontSize: 12, color: 'var(--slate2)', minWidth: 28 }}>{cs.c}</span>
                  <div style={{ flex: 1 }}><ProgBar pct={cs.pct} color={cs.col} /></div>
                  <span style={{ fontSize: 12, color: 'var(--slate2)', minWidth: 28, textAlign: 'right' }}>{cs.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 학생 목록 */}
        <div className="sec">
          <div className="sec-title">{filtered.length}명 — 토글로 납부 상태 변경</div>
          {filtered.map((s) => (
            <div key={s.sid} className="pay-card">
              <div className="pay-head" onClick={() => navigate(`/payment/${s.sid}`)}>
                <Avatar name={s.pname} col={s.pcol} tc={s.ptc} />
                <div style={{ flex: 1 }}>
                  <div className="row">
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{s.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--slate2)', marginLeft: 6 }}>{s.pname}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Badge cls={statusBdgCls(s)}>{statusBdgTxt(s)}</Badge>
                      <Badge cls={clsBdg(s.cls)}>{s.cls}</Badge>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                    <div style={{ flex: 1 }}><ProgBar pct={payPct(s)} color={barCol(s)} /></div>
                    <span style={{ fontSize: 11, color: 'var(--slate3)', minWidth: 28, textAlign: 'right' }}>{payPct(s)}%</span>
                  </div>
                </div>
                <ChevronRight />
              </div>
              <div className="pay-body">
                {(Object.entries(s.fees) as [string, { label: string; amount: number; paid: boolean }][]).map(([k, f]) => (
                  <div key={k} className="pay-row">
                    <span className="pay-label">{f.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="pay-value">{f.amount.toLocaleString()}원</span>
                      <Toggle checked={f.paid} onChange={(v) => handleToggle(s.sid, k as 'tuition' | 'book', v, f.label, s.name)} />
                    </div>
                  </div>
                ))}
                <div className="pay-row" style={{ background: 'var(--bg2)' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>납부 합계</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ok)' }}>{paidFee(s).toLocaleString()}원</span>
                </div>
              </div>
            </div>
          ))}
          {filtered.some((s) => !isFullPaid(s)) && (
            <button className="btn-red">미납자 카드결제 문자 일괄 발송</button>
          )}
        </div>

      </div>
      <Toast toastRef={toastRef} />
    </>
  )
}
