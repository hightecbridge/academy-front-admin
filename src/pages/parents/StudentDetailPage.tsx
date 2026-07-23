// src/pages/parents/StudentDetailPage.tsx
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TopBar, Breadcrumb, Avatar, Badge, Toggle, ProgBar, EditIcon, IconBtn, useToast, Toast } from '../../components/common'
import { useDataStore, clsBdg, clsCol, statusBdgCls, statusBdgTxt, totalFee, paidFee, payPct, barCol } from '../../store/dataStore'
import type { FeeItemKey } from '../../types'

const GRADES = ['초등 1','초등 2','초등 3','초등 4','초등 5','초등 6','중등 1','중등 2','중등 3','고등 1','고등 2','고등 3']

function normalizePhone(v: string) {
  return v.replace(/[^\d]/g, '')
}

function isValidPhone(v: string) {
  const digits = normalizePhone(v)
  return digits.length >= 10 && digits.length <= 11
}

export function StudentDetailPage() {
  const { sid } = useParams()
  const navigate = useNavigate()
  const students = useDataStore((s) => s.students)
  const updateFee = useDataStore((s) => s.updateFee)
  const deleteStudent = useDataStore((s) => s.deleteStudent)
  const { ref: toastRef, show: showToast } = useToast()
  const [deleting, setDeleting] = useState(false)
  const s = students.find((x) => x.sid === Number(sid))
  if (!s) return <div className="sec">학생을 찾을 수 없습니다.</div>

  const handleDelete = async () => {
    if (!window.confirm(
      `${s.name} 학생을 삭제하시겠습니까?\n\n수납·출석·숙제 기록도 함께 삭제되며 되돌릴 수 없습니다.`,
    )) return
    setDeleting(true)
    try {
      await deleteStudent(s.sid)
      showToast('학생이 삭제되었습니다.')
      navigate('/parents')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      alert(err?.response?.data?.message ?? err?.message ?? '삭제에 실패했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  const cc = clsCol(s.cls)
  const total = totalFee(s)
  const paid = paidFee(s)
  const remain = total - paid

  return (
    <>
      <TopBar
        title={s.name}
        sub={`${s.cls} · ${s.grade}`}
        onBack={() => navigate('/parents')}
        right={
          <IconBtn onClick={() => navigate(`/parents/${s.sid}/edit`)}>
            <EditIcon />
          </IconBtn>
        }
      />
      <Breadcrumb items={[
        { label: '학생 관리', onClick: () => navigate('/parents') },
        { label: s.name },
      ]} />

      <div className="page-content-body">
        <div className="sec">
          <div className="hero-card">
            <Avatar name={s.name} col={cc.bg} tc={cc.tc} large />
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--navy)' }}>{s.name}</div>
              <div style={{ fontSize: 13, color: 'var(--slate2)', marginTop: 2 }}>학부모 {s.parentName}</div>
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
            <div className="field-row"><span className="field-label">생년월일</span><span className="field-value">{s.birth || '-'}</span></div>
            <div className="field-row"><span className="field-label">학생 연락처</span><span className="field-value">{s.phone || '미등록'}</span></div>
            <div className="field-row"><span className="field-label">학부모</span><span className="field-value">{s.parentName}</span></div>
            <div className="field-row"><span className="field-label">학부모 연락처</span><span className="field-value" style={{ color: 'var(--acc)' }}>{s.parentPhone}</span></div>
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
                    onChange={(v) => updateFee(s.sid, k as FeeItemKey, v ? { paid: true, paidAt: new Date().toISOString().slice(0, 10) } : { paid: false })}
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
          <button className="btn-secondary" onClick={() => navigate(`/parents/${s.sid}/edit`)}>
            학생 정보 수정
          </button>
          <button
            type="button"
            className="btn-danger"
            disabled={deleting}
            style={{ opacity: deleting ? 0.6 : 1 }}
            onClick={() => void handleDelete()}
          >
            {deleting ? '삭제 중…' : '학생 삭제'}
          </button>
        </div>
      </div>
      <Toast toastRef={toastRef} />
    </>
  )
}

export function StudentFormPage({ mode }: { mode: 'add' | 'edit' }) {
  const { sid, cid: classCidParam } = useParams()
  const navigate = useNavigate()
  const students = useDataStore((s) => s.students)
  const classes = useDataStore((s) => s.classes)
  const createStudent = useDataStore((s) => s.createStudent)

  const s = mode === 'edit' ? students.find((x) => x.sid === Number(sid)) : undefined
  const fixedClass = classCidParam
    ? classes.find((c) => c.cid === Number(classCidParam))
    : undefined
  const defaultCls = s?.cls ?? fixedClass?.name ?? (classes[0]?.name ?? 'A반')
  const classLocked = mode === 'add' && !!fixedClass

  const [parentName, setParentName] = useState(s?.parentName ?? '')
  const [parentPhone, setParentPhone] = useState(s?.parentPhone ?? '')
  const [name, setName] = useState(s?.name ?? '')
  const [birth, setBirth] = useState(s?.birth ?? '')
  const [grade, setGrade] = useState(s?.grade ?? '초등 6')
  const [cls, setCls] = useState(defaultCls)
  const [phone, setPhone] = useState(s?.phone ?? '')
  const [status, setStatus] = useState<'재원' | '휴원' | '퇴원'>(s?.status ?? '재원')
  const [kakaoVal, setKakaoVal] = useState(s?.kakao ?? true)

  const handleSubmit = async () => {
    if (!parentName.trim()) { alert('학부모 이름을 입력하세요.'); return }
    if (!parentPhone.trim()) { alert('학부모 전화번호를 입력하세요.'); return }
    if (!isValidPhone(parentPhone)) {
      alert('학부모 전화번호는 10~11자리 숫자로 입력해 주세요.')
      return
    }
    if (!name.trim()) { alert('학생 이름을 입력하세요.'); return }
    if (phone.trim() && !isValidPhone(phone)) {
      alert('학생 연락처는 10~11자리 숫자로 입력해 주세요.')
      return
    }
    if (mode === 'add') {
      const clsData = fixedClass ?? classes.find((c) => c.name === cls)
      if (!clsData) {
        alert('반 정보를 찾을 수 없습니다. 반을 다시 선택해주세요.')
        return
      }
      try {
        await createStudent({
          parentName: parentName.trim(),
          parentPhone: parentPhone.trim(),
          name: name.trim(),
          grade,
          classroomId: clsData.cid,
          status,
          phone: phone.trim() || undefined,
          birthDate: birth.trim() || undefined,
          loginPhone: parentPhone.trim(),
          loginPassword: '0000',
          kakaoLinked: kakaoVal,
        })
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } }; message?: string }
        alert(err?.response?.data?.message ?? err?.message ?? '학생 등록에 실패했습니다.')
        return
      }
    } else {
      alert('수정 기능은 아직 준비 중입니다.')
      return
    }
    alert(mode === 'add' ? '학생이 등록되었습니다.' : '저장되었습니다.')
    if (fixedClass) {
      navigate(`/class/${fixedClass.cid}`, { state: { tabIdx: 1 } })
    } else {
      navigate('/parents')
    }
  }

  const title = mode === 'add' ? '학생 등록' : '학생 수정'
  const cancelPath = mode === 'add'
    ? (fixedClass ? `/class/${fixedClass.cid}` : '/parents')
    : `/parents/${sid}`

  return (
    <>
      <TopBar
        title={title}
        sub={mode === 'add' ? (fixedClass ? fixedClass.name : '신규') : s?.name}
        onBack={() => navigate(cancelPath, fixedClass ? { state: { tabIdx: 1 } } : undefined)}
      />
      <Breadcrumb items={[
        ...(fixedClass
          ? [
              { label: '클래스 관리', onClick: () => navigate('/class') },
              { label: fixedClass.name, onClick: () => navigate(`/class/${fixedClass.cid}`, { state: { tabIdx: 1 } }) },
            ]
          : [{ label: '학생 관리', onClick: () => navigate('/parents') }]),
        ...(mode === 'edit' && s ? [{ label: s.name, onClick: () => navigate(`/parents/${sid}`) }] : []),
        { label: title },
      ]} />

      <div className="page-content-body">
        <div className="sec">
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>학부모 정보</div>

          <label className="input-label">학부모 이름 <span style={{ color: 'var(--err)' }}>*</span></label>
          <input className="input-field" placeholder="홍길동" value={parentName} onChange={(e) => setParentName(e.target.value)} required />

          <label className="input-label">학부모 전화번호 <span style={{ color: 'var(--err)' }}>*</span></label>
          <input className="input-field" type="tel" placeholder="010-0000-0000" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} required />

          <label className="input-label">카카오톡 연동</label>
          <select
            className="input-field"
            value={kakaoVal ? '연동 요청 발송' : '미연동'}
            onChange={(e) => setKakaoVal(e.target.value !== '미연동')}
          >
            <option>연동 요청 발송</option>
            <option>미연동</option>
          </select>

          <div className="divider" />
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 12 }}>학생 정보</div>

          <label className="input-label">학생 이름 <span style={{ color: 'var(--err)' }}>*</span></label>
          <input className="input-field" placeholder="예) 김민서" value={name} onChange={(e) => setName(e.target.value)} required />

          <label className="input-label">학생 연락처 (선택)</label>
          <input className="input-field" type="tel" placeholder="010-0000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />

          <label className="input-label">생년월일</label>
          <input className="input-field" placeholder="2012-03-15" value={birth} onChange={(e) => setBirth(e.target.value)} />

          <label className="input-label">학년</label>
          <select className="input-field" value={grade} onChange={(e) => setGrade(e.target.value)}>
            {GRADES.map((g) => <option key={g}>{g}</option>)}
          </select>

          <label className="input-label">반 배정</label>
          {classLocked && fixedClass ? (
            <input className="input-field" value={`${fixedClass.name} (${fixedClass.subject})`} readOnly />
          ) : (
            <select className="input-field" value={cls} onChange={(e) => setCls(e.target.value)}>
              {classes.map((c) => <option key={c.cid} value={c.name}>{c.name} ({c.subject})</option>)}
            </select>
          )}

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

          <button className="btn-primary" onClick={() => void handleSubmit()}>
            {mode === 'add' ? '등록 완료' : '저장'}
          </button>
          <button className="btn-secondary" onClick={() => navigate(cancelPath, fixedClass ? { state: { tabIdx: 1 } } : undefined)}>
            취소
          </button>
        </div>
      </div>
    </>
  )
}

export function ParentFormPage({ mode }: { mode: 'add' | 'edit' }) {
  return <StudentFormPage mode={mode} />
}
