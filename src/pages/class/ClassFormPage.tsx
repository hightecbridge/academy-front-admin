// src/pages/class/ClassFormPage.tsx
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TopBar, Breadcrumb } from '../../components/common'
import { useDataStore } from '../../store/dataStore'

const COLOR_PRESETS = [
  { color: '#DBEAFE', textColor: '#1D4ED8', label: '파랑' },
  { color: '#D1FAE5', textColor: '#065F46', label: '초록' },
  { color: '#EDE9FE', textColor: '#5B21B6', label: '보라' },
  { color: '#FEE2E2', textColor: '#991B1B', label: '빨강' },
  { color: '#FEF3C7', textColor: '#92400E', label: '노랑' },
  { color: '#FCE7F3', textColor: '#9D174D', label: '분홍' },
  { color: '#E0F2FE', textColor: '#0369A1', label: '하늘' },
  { color: '#ECFDF5', textColor: '#065F46', label: '민트' },
]

export default function ClassFormPage({ mode }: { mode: 'add' | 'edit' }) {
  const { cid } = useParams()
  const navigate = useNavigate()
  const classes = useDataStore((s) => s.classes)
  const addClass = useDataStore((s) => s.addClass)
  const updateClass = useDataStore((s) => s.updateClass)

  const existing = mode === 'edit' ? classes.find((c) => c.cid === Number(cid)) : undefined

  const [name, setName] = useState(existing?.name ?? '')
  const [subject, setSubject] = useState(existing?.subject ?? '')
  const [teacher, setTeacher] = useState(existing?.teacher ?? '')
  const [schedule, setSchedule] = useState(existing?.schedule ?? '')
  const [capacity, setCapacity] = useState(String(existing?.capacity ?? 15))
  const [tuitionFee, setTuitionFee] = useState(String(existing?.tuitionFee ?? 280000))
  const [bookFee, setBookFee] = useState(String(existing?.bookFee ?? 45000))
  const [color, setColor] = useState(existing?.color ?? '#DBEAFE')
  const [textColor, setTextColor] = useState(existing?.textColor ?? '#1D4ED8')

  const handleSubmit = () => {
    if (!name.trim()) { alert('반 이름을 입력하세요.'); return }
    if (!subject.trim()) { alert('과목을 입력하세요.'); return }
    if (!teacher.trim()) { alert('담당 교사를 입력하세요.'); return }
    if (!schedule.trim()) { alert('수업 일정을 입력하세요.'); return }

    const payload = {
      name, subject, teacher, schedule,
      capacity: Number(capacity),
      tuitionFee: Number(tuitionFee),
      bookFee: Number(bookFee),
      color, textColor,
    }

    if (mode === 'add') {
      addClass(payload)
      alert('반이 추가되었습니다.')
      navigate('/class')
    } else if (existing) {
      updateClass(existing.cid, payload)
      alert('저장되었습니다.')
      navigate(`/class/${existing.cid}`)
    }
  }

  const title = mode === 'add' ? '반 추가' : '반 수정'

  return (
    <>
      <TopBar
        title={title}
        sub={mode === 'edit' ? existing?.name : '새 반 등록'}
        onBack={() => navigate(mode === 'add' ? '/class' : `/class/${cid}`)}
      />
      <Breadcrumb items={[
        { label: '클래스 관리', onClick: () => navigate('/class') },
        ...(mode === 'edit' && existing ? [{ label: existing.name, onClick: () => navigate(`/class/${cid}`) }] : []),
        { label: title },
      ]} />

      <div className="page-content-body">
        <div className="sec">
          {/* 미리보기 */}
          <div style={{
            background: color, borderRadius: 12,
            padding: '14px 18px', marginBottom: 20,
            border: `0.5px solid ${color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: textColor }}>
                {name || '반 이름'}
              </div>
              <div style={{ fontSize: 12, color: textColor, opacity: 0.75, marginTop: 2 }}>
                {subject || '과목'}
              </div>
            </div>
            <div style={{ fontSize: 11, color: textColor, opacity: 0.6 }}>미리보기</div>
          </div>

          {/* 색상 선택 */}
          <div className="sec-title" style={{ marginBottom: 10 }}>카드 색상</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.color}
                onClick={() => { setColor(preset.color); setTextColor(preset.textColor) }}
                style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: preset.color,
                  border: color === preset.color
                    ? `2.5px solid ${preset.textColor}`
                    : '1.5px solid rgba(0,0,0,0.08)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {color === preset.color && (
                  <svg style={{ width: 14, height: 14, stroke: preset.textColor, fill: 'none', strokeWidth: 2.5, strokeLinecap: 'round' }} viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          {/* 기본 정보 */}
          <div className="divider" />
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 4, marginTop: 4 }}>기본 정보</div>

          <label className="input-label">반 이름 *</label>
          <input
            className="input-field"
            placeholder="예) A반, 월수금반"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label className="input-label">과목 *</label>
          <input
            className="input-field"
            placeholder="예) 초등 수학, 중등 영어"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          <label className="input-label">담당 교사 *</label>
          <input
            className="input-field"
            placeholder="예) 이수진"
            value={teacher}
            onChange={(e) => setTeacher(e.target.value)}
          />

          <label className="input-label">수업 일정 *</label>
          <input
            className="input-field"
            placeholder="예) 월·수·금 오후 4시"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
          />

          <label className="input-label">정원</label>
          <input
            className="input-field"
            type="number"
            placeholder="15"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />

          {/* 수강료 */}
          <div className="divider" />
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 4, marginTop: 4 }}>수강료</div>

          <label className="input-label">월 수업료 (원)</label>
          <input
            className="input-field"
            type="number"
            placeholder="280000"
            value={tuitionFee}
            onChange={(e) => setTuitionFee(e.target.value)}
          />

          <label className="input-label">월 교재비 (원)</label>
          <input
            className="input-field"
            type="number"
            placeholder="45000"
            value={bookFee}
            onChange={(e) => setBookFee(e.target.value)}
          />

          {/* 합계 미리보기 */}
          {(tuitionFee || bookFee) && (
            <div style={{
              marginTop: 10, padding: '10px 14px',
              background: 'var(--bg2)', borderRadius: 8,
              border: '0.5px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 13, color: 'var(--slate2)' }}>월 합계</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>
                {(Number(tuitionFee || 0) + Number(bookFee || 0)).toLocaleString()}원
              </span>
            </div>
          )}

          <button className="btn-primary" onClick={handleSubmit}>
            {mode === 'add' ? '반 추가 완료' : '저장'}
          </button>
          <button
            className="btn-secondary"
            onClick={() => navigate(mode === 'add' ? '/class' : `/class/${cid}`)}
          >
            취소
          </button>
        </div>
      </div>
    </>
  )
}
