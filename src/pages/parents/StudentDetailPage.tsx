// src/pages/parents/StudentDetailPage.tsx
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TopBar, Breadcrumb, Avatar, Badge, Toggle, ProgBar, EditIcon, IconBtn } from '../../components/common'
import { useDataStore, clsBdg, clsCol, statusBdgCls, statusBdgTxt, totalFee, paidFee, payPct, barCol, isFullPaid } from '../../store/dataStore'

const GRADES = ['초등 1','초등 2','초등 3','초등 4','초등 5','초등 6','중등 1','중등 2','중등 3','고등 1','고등 2','고등 3']

/* ─── 학생 상세 ─────────────────────────────────────── */
export function StudentDetailPage() {
  const { pid, sid } = useParams()
  const navigate = useNavigate()
  const parents = useDataStore((s) => s.parents)
  const toggleFee = useDataStore((s) => s.toggleFee)
  const p = parents.find((x) => x.pid === Number(pid))
  const s = p?.students.find((x) => x.sid === Number(sid))
  if (!p || !s) return <div className="sec">학생을 찾을 수 없습니다.</div>

  const cc = clsCol(s.cls)
  const total = totalFee(s)
  const paid = paidFee(s)
  const remain = total - paid

  return (
    <>
      <TopBar
        title={s.name}
        sub={`${s.cls} · ${s.grade}`}
        onBack={() => navigate(`/parents/${p.pid}`)}
        right={
          <IconBtn onClick={() => navigate(`/parents/${p.pid}/student/${s.sid}/edit`)}>
            <EditIcon />
          </IconBtn>
        }
      />
      <Breadcrumb items={[
        { label: '학부모 목록', onClick: () => navigate('/parents') },
        { label: p.name, onClick: () => navigate(`/parents/${p.pid}`) },
        { label: s.name },
      ]} />

      <div className="page-content-body">
        <div className="sec">
          <div className="hero-card">
            <Avatar name={s.name} col={cc.bg} tc={cc.tc} large />
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--navy)' }}>{s.name}</div>
              <div style={{ fontSize: 13, color: 'var(--slate2)', marginTop: 2 }}>{p.name} 자녀</div>
              <div style={{ marginTop: 6, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                <Badge cls={clsBdg(s.cls)}>{s.cls}</Badge>
                <Badge cls="badge-green">{s.status}</Badge>
                <Badge cls={statusBdgCls(s)}>{statusBdgTxt(s)}</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="sec">
          <div className="sec-title">학생 정보</div>
          <div className="card">
            <div className="field-row"><span className="field-label">학년</span><span className="field-value">{s.grade}</span></div>
            <div className="field-row"><span className="field-label">생년월일</span><span className="field-value">{s.birth}</span></div>
            <div className="field-row">
              <span className="field-label">소속 반</span>
              <Badge cls={clsBdg(s.cls)}>{s.cls}</Badge>
            </div>
            <div className="field-row">
              <span className="field-label">재원 상태</span>
              <Badge cls="badge-green">{s.status}</Badge>
            </div>
          </div>
        </div>

        <div className="sec">
          <div className="sec-title">수납 정보 (토글로 변경)</div>
          <div className="card">
            {(Object.entries(s.fees) as [string, { label: string; amount: number; paid: boolean }][]).map(([k, f]) => (
              <div key={k} className="pay-row">
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{f.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 2 }}>{f.amount.toLocaleString()}원</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: f.paid ? 'var(--ok)' : 'var(--err)' }}>
                    {f.paid ? '완납' : '미납'}
                  </span>
                  <Toggle
                    checked={f.paid}
                    onChange={(v) => toggleFee(s.sid, k as 'tuition' | 'book', v)}
                  />
                </div>
              </div>
            ))}
            <div className="pay-row" style={{ background: 'var(--bg2)' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>납부 합계</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ok)' }}>{paid.toLocaleString()}원</div>
                <div style={{ fontSize: 11, color: 'var(--slate3)', marginTop: 2 }}>잔액 {remain.toLocaleString()}원</div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <ProgBar pct={payPct(s)} color={barCol(s)} />
          </div>
        </div>

        <div className="sec">
          <button
            className="btn-secondary"
            onClick={() => navigate(`/parents/${p.pid}/student/${s.sid}/edit`)}
          >
            학생 정보 수정
          </button>
          <button className="btn-danger">학생 삭제</button>
        </div>
      </div>
    </>
  )
}

/* ─── 학생 추가/수정 폼 ─────────────────────────────── */
export function StudentFormPage({ mode }: { mode: 'add' | 'edit' }) {
  const { pid, sid } = useParams()
  const navigate = useNavigate()
  const parents = useDataStore((s) => s.parents)
  const classes = useDataStore((s) => s.classes)   // 동적 반 목록
  const addStudent = useDataStore((s) => s.addStudent)

  const p = parents.find((x) => x.pid === Number(pid))
  const s = mode === 'edit' ? p?.students.find((x) => x.sid === Number(sid)) : undefined

  // 반 선택 시 해당 반의 수업료·교재비 자동 채우기
  const defaultCls = s?.cls ?? (classes[0]?.name ?? 'A반')
  const defaultClsData = classes.find((c) => c.name === defaultCls)

  const [name, setName] = useState(s?.name ?? '')
  const [birth, setBirth] = useState(s?.birth ?? '')
  const [grade, setGrade] = useState(s?.grade ?? '초등 6')
  const [cls, setCls] = useState(defaultCls)
  const [status, setStatus] = useState<'재원' | '휴원' | '퇴원'>(s?.status ?? '재원')
  const [tuition, setTuition] = useState(String(s?.fees.tuition.amount ?? defaultClsData?.tuitionFee ?? 280000))
  const [book, setBook] = useState(String(s?.fees.book.amount ?? defaultClsData?.bookFee ?? 45000))

  // 반 변경 시 해당 반의 기본 수업료·교재비 자동 반영
  const handleClsChange = (newCls: string) => {
    setCls(newCls)
    const clsData = classes.find((c) => c.name === newCls)
    if (clsData && mode === 'add') {
      setTuition(String(clsData.tuitionFee))
      setBook(String(clsData.bookFee))
    }
  }

  const handleSubmit = () => {
    if (!name.trim()) { alert('학생 이름을 입력하세요.'); return }
    if (mode === 'add' && p) {
      addStudent(p.pid, {
        name, birth, grade, cls, status,
        fees: {
          tuition: { label: '수업료', amount: Number(tuition), paid: false },
          book: { label: '교재비', amount: Number(book), paid: false },
        },
      })
    }
    alert(mode === 'add' ? '학생이 추가되었습니다.' : '저장되었습니다.')
    navigate(`/parents/${pid}`)
  }

  const title = mode === 'add' ? '학생 추가' : '학생 수정'

  return (
    <>
      <TopBar
        title={title}
        sub={p?.name}
        onBack={() =>
          navigate(mode === 'add' ? `/parents/${pid}` : `/parents/${pid}/student/${sid}`)
        }
      />
      <Breadcrumb items={[
        { label: '학부모 목록', onClick: () => navigate('/parents') },
        { label: p?.name ?? '', onClick: () => navigate(`/parents/${pid}`) },
        ...(mode === 'edit' && s ? [{ label: s.name, onClick: () => navigate(`/parents/${pid}/student/${sid}`) }] : []),
        { label: title },
      ]} />

      <div className="page-content-body">
        <div className="sec">
          {mode === 'add' && (
            <>
              <label className="input-label">학부모</label>
              <select className="input-field" defaultValue={p?.pid}>
                {parents.map((par) => (
                  <option key={par.pid} value={par.pid}>
                    {par.name} ({par.phone})
                  </option>
                ))}
              </select>
            </>
          )}

          <label className="input-label">학생 이름</label>
          <input className="input-field" placeholder="예) 김민서" value={name} onChange={(e) => setName(e.target.value)} />

          <label className="input-label">생년월일</label>
          <input className="input-field" placeholder="2012-03-15" value={birth} onChange={(e) => setBirth(e.target.value)} />

          <label className="input-label">학년</label>
          <select className="input-field" value={grade} onChange={(e) => setGrade(e.target.value)}>
            {GRADES.map((g) => <option key={g}>{g}</option>)}
          </select>

          <label className="input-label">반 배정</label>
          <select className="input-field" value={cls} onChange={(e) => handleClsChange(e.target.value)}>
            {classes.map((c) => <option key={c.cid} value={c.name}>{c.name} ({c.subject})</option>)}
          </select>

          {mode === 'edit' && (
            <>
              <label className="input-label">재원 상태</label>
              <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value as '재원' | '휴원' | '퇴원')}>
                <option>재원</option>
                <option>휴원</option>
                <option>퇴원</option>
              </select>
            </>
          )}

          <label className="input-label">월 수업료 (원)</label>
          <input className="input-field" type="number" value={tuition} onChange={(e) => setTuition(e.target.value)} />

          <label className="input-label">월 교재비 (원)</label>
          <input className="input-field" type="number" value={book} onChange={(e) => setBook(e.target.value)} />

          <button className="btn-primary" onClick={handleSubmit}>
            {mode === 'add' ? '추가 완료' : '저장'}
          </button>
          <button
            className="btn-secondary"
            onClick={() =>
              navigate(mode === 'add' ? `/parents/${pid}` : `/parents/${pid}/student/${sid}`)
            }
          >
            취소
          </button>
        </div>
      </div>
    </>
  )
}

/* ─── 학부모 등록/수정 폼 ─────────────────────────────── */
export function ParentFormPage({ mode }: { mode: 'add' | 'edit' }) {
  const { pid } = useParams()
  const navigate = useNavigate()
  const parents = useDataStore((s) => s.parents)
  const classes = useDataStore((s) => s.classes)
  const p = mode === 'edit' ? parents.find((x) => x.pid === Number(pid)) : undefined

  const [name, setName] = useState(p?.name ?? '')
  const [phone, setPhone] = useState(p?.phone ?? '')
  const [kakaoVal, setKakaoVal] = useState(p?.kakao ?? true)
  const [stuName, setStuName] = useState('')
  const [stuGrade, setStuGrade] = useState('선택 안함')
  const [stuCls, setStuCls] = useState('선택 안함')

  const title = mode === 'add' ? '학부모 등록' : '학부모 수정'

  return (
    <>
      <TopBar
        title={title}
        sub={mode === 'add' ? '신규' : p?.name}
        onBack={() => navigate(mode === 'add' ? '/parents' : `/parents/${pid}`)}
      />
      <Breadcrumb items={[
        { label: '학부모 목록', onClick: () => navigate('/parents') },
        ...(mode === 'edit' && p ? [{ label: p.name, onClick: () => navigate(`/parents/${pid}`) }] : []),
        { label: title },
      ]} />

      <div className="page-content-body">
        <div className="sec">
          <label className="input-label">학부모 이름</label>
          <input className="input-field" placeholder="홍길동" value={name} onChange={(e) => setName(e.target.value)} />

          <label className="input-label">전화번호</label>
          <input className="input-field" type="tel" placeholder="010-0000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />

          <label className="input-label">카카오톡 연동</label>
          <select
            className="input-field"
            value={kakaoVal ? '연동 요청 발송' : '미연동'}
            onChange={(e) => setKakaoVal(e.target.value !== '미연동')}
          >
            <option>연동 요청 발송</option>
            <option>미연동</option>
          </select>

          {mode === 'add' && (
            <>
              <div className="divider" />
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 12 }}>
                첫 번째 학생 등록 (선택)
              </div>

              <label className="input-label">학생 이름</label>
              <input className="input-field" placeholder="홍민서" value={stuName} onChange={(e) => setStuName(e.target.value)} />

              <label className="input-label">학년</label>
              <select className="input-field" value={stuGrade} onChange={(e) => setStuGrade(e.target.value)}>
                <option>선택 안함</option>
                {GRADES.map((g) => <option key={g}>{g}</option>)}
              </select>

              <label className="input-label">반 배정</label>
              <select className="input-field" value={stuCls} onChange={(e) => setStuCls(e.target.value)}>
                <option value="선택 안함">선택 안함</option>
                {classes.map((c) => <option key={c.cid} value={c.name}>{c.name} ({c.subject})</option>)}
              </select>
            </>
          )}

          <button
            className="btn-primary"
            onClick={() => {
              alert(mode === 'add' ? '등록되었습니다.' : '저장되었습니다.')
              navigate('/parents')
            }}
          >
            {mode === 'add' ? '등록 완료' : '저장'}
          </button>
          {mode === 'edit' && (
            <button className="btn-danger" onClick={() => alert('삭제 확인')}>
              학부모 삭제
            </button>
          )}
          <button
            className="btn-secondary"
            onClick={() => navigate(mode === 'add' ? '/parents' : `/parents/${pid}`)}
          >
            취소
          </button>
        </div>
      </div>
    </>
  )
}
