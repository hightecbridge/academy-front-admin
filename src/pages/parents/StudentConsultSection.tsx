import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../components/common'
import { useDataStore } from '../../store/dataStore'
import type { Consultation } from '../../types'

const KIND_META: Record<string, { bg: string; tc: string }> = {
  재원생: { bg: '#EEF4FF', tc: '#1849A9' },
  신규: { bg: '#ECFDF5', tc: '#027A48' },
}
const STATUS_BADGE: Record<string, string> = {
  대기: 'badge-amber',
  확정: 'badge-blue',
  완료: 'badge-green',
  취소: 'badge-gray',
}

export function StudentConsultSection({ sid, studentName }: { sid: number; studentName: string }) {
  const navigate = useNavigate()
  const fetchStudentConsultations = useDataStore((s) => s.fetchStudentConsultations)
  const [items, setItems] = useState<Consultation[]>([])
  const [openId, setOpenId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    void fetchStudentConsultations(sid)
      .then((rows) => { if (alive) setItems(rows) })
      .catch(() => { if (alive) setItems([]) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [sid, fetchStudentConsultations])

  const monthly = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of items) {
      const key = c.date.slice(0, 7)
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([ym, count]) => ({
        ym,
        label: `${ym.slice(0, 4)}년 ${Number(ym.slice(5))}월`,
        count,
      }))
  }, [items])

  return (
    <div className="sec">
      <div className="row" style={{ marginBottom: 10 }}>
        <span className="sec-title" style={{ marginBottom: 0 }}>상담 내역</span>
        <button
          type="button"
          onClick={() => navigate(`/consult?sid=${sid}`)}
          style={{
            fontSize: 11, fontWeight: 700, padding: '4px 12px',
            background: 'var(--acc)', color: '#fff', border: 'none',
            borderRadius: 20, cursor: 'pointer',
          }}
        >
          + 상담 작성
        </button>
      </div>

      <div className="card" style={{ marginBottom: 10, padding: '12px 14px' }}>
        <div className="row">
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>월별 상담 건수</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--acc)' }}>총 {items.length}건</span>
        </div>
        {loading && <div style={{ fontSize: 12, color: 'var(--slate3)', marginTop: 8 }}>불러오는 중…</div>}
        {!loading && monthly.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--slate3)', marginTop: 8 }}>{studentName} 학생의 상담 기록이 없습니다.</div>
        )}
        {!loading && monthly.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 72, margin: '12px 0 4px' }}>
            {monthly.slice().reverse().map((m) => {
              const max = Math.max(1, ...monthly.map((x) => x.count))
              const h = Math.round((m.count / max) * 52)
              return (
                <div key={m.ym} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--acc)', marginBottom: 3 }}>{m.count}</div>
                  <div style={{ width: '70%', height: Math.max(6, h), background: 'var(--acc)', borderRadius: '4px 4px 1px 1px', opacity: 0.85 }} />
                  <div style={{ fontSize: 9, color: 'var(--slate3)', marginTop: 4, fontWeight: 600 }}>{Number(m.ym.slice(5))}월</div>
                </div>
              )
            })}
          </div>
        )}
        {!loading && monthly.map((m) => (
          <div key={m.ym} className="field-row" style={{ paddingLeft: 0, paddingRight: 0 }}>
            <span className="field-label">{m.label}</span>
            <span className="field-value" style={{ fontWeight: 700 }}>{m.count}건</span>
          </div>
        ))}
      </div>

      <div className="sec-title" style={{ marginBottom: 8 }}>상담 상세</div>
      <div className="card">
        {!loading && items.length === 0 && (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--slate3)', fontSize: 13 }}>상담 상세 내역이 없습니다.</div>
        )}
        {items.map((c) => {
          const km = KIND_META[c.kind] ?? KIND_META.재원생
          const open = openId === c.id
          return (
            <div key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="list-row" onClick={() => setOpenId(open ? null : c.id)}>
                <div style={{ flex: 1 }}>
                  <div className="row">
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
                      {c.date}{c.time ? ` ${c.time}` : ''}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: km.bg, color: km.tc }}>{c.kind}</span>
                      <Badge cls={STATUS_BADGE[c.status] ?? 'badge-gray'}>{c.status}</Badge>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 3 }}>
                    담당 {c.teacherName || '미지정'}
                    {c.content ? ` · ${c.content.slice(0, 36)}${c.content.length > 36 ? '…' : ''}` : ''}
                  </div>
                </div>
              </div>
              {open && (
                <div style={{ padding: '0 14px 12px', fontSize: 13, color: 'var(--navy)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {c.content || '작성된 내용이 없습니다.'}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
