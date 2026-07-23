// src/pages/class/ClassDetailPage.tsx
import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { TopBar, Breadcrumb, TabBar, Badge, EditIcon, IconBtn, ChevronRight, Fab } from '../../components/common'
import { useDataStore, statusBdgCls, statusBdgTxt, studentInClass } from '../../store/dataStore'

export default function ClassDetailPage() {
  const { cid } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const classes = useDataStore((s) => s.classes)
  const students = useDataStore((s) => s.students)
  const deleteClass = useDataStore((s) => s.deleteClass)
  const initialTab = (location.state as { tabIdx?: number } | null)?.tabIdx ?? 0
  const [tabIdx, setTabIdx] = useState(initialTab)

  const cls = classes.find((c) => c.cid === Number(cid))
  if (!cls) return <div className="sec" style={{ padding: 20 }}>반 정보를 찾을 수 없습니다.</div>

  const allStudents = students.filter((s) => studentInClass(s, cls))

  const handleDelete = () => {
    if (allStudents.length > 0) {
      alert(`${cls.name}에 학생 ${allStudents.length}명이 배정되어 있어 삭제할 수 없습니다.\n학생을 먼저 다른 반으로 이동하거나 삭제해 주세요.`)
      return
    }
    if (window.confirm(`${cls.name}을 삭제하시겠습니까?`)) {
      deleteClass(cls.cid)
      navigate('/class')
    }
  }

  return (
    <>
      <TopBar
        title={cls.name}
        sub={cls.subject}
        onBack={() => navigate('/class')}
        right={
          <IconBtn onClick={() => navigate(`/class/${cls.cid}/edit`)}>
            <EditIcon />
          </IconBtn>
        }
      />
      <Breadcrumb items={[
        { label: '클래스 관리', onClick: () => navigate('/class') },
        { label: cls.name },
      ]} />
      <TabBar
        tabs={['기본정보', `학생 ${allStudents.length}명`]}
        active={tabIdx}
        onChange={setTabIdx}
      />

      <div className="page-content-body">
        {tabIdx === 0 && (
          <>
            <div className="sec">
              <div style={{
                background: cls.color, borderRadius: 14,
                padding: '20px 20px 16px', marginBottom: 14,
                border: `0.5px solid ${cls.color}`,
              }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: cls.textColor }}>{cls.name}</div>
                <div style={{ fontSize: 14, color: cls.textColor, opacity: 0.8, marginTop: 4 }}>{cls.subject}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.35)', borderRadius: 10,
                    padding: '8px 14px', flex: 1, textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: cls.textColor }}>{allStudents.length}</div>
                    <div style={{ fontSize: 10, color: cls.textColor, opacity: 0.75 }}>현재 학생</div>
                  </div>
                  <div style={{
                    background: 'rgba(255,255,255,0.35)', borderRadius: 10,
                    padding: '8px 14px', flex: 1, textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: cls.textColor }}>{cls.capacity}</div>
                    <div style={{ fontSize: 10, color: cls.textColor, opacity: 0.75 }}>정원</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sec">
              <div className="sec-title">수업 정보</div>
              <div className="card">
                <div className="field-row">
                  <span className="field-label">반 이름</span>
                  <span className="field-value">{cls.name}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">과목</span>
                  <span className="field-value">{cls.subject}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">담당 교사</span>
                  <span className="field-value" style={{ color: 'var(--acc)' }}>{cls.teacher}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">수업 일정</span>
                  <span className="field-value">{cls.schedule}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">정원</span>
                  <span className="field-value">{cls.capacity}명</span>
                </div>
                <div className="field-row">
                  <span className="field-label">개설일</span>
                  <span className="field-value">{cls.createdAt}</span>
                </div>
              </div>
            </div>

            <div className="sec">
              <div className="sec-title">수강료 정보</div>
              <div className="card">
                <div className="field-row">
                  <span className="field-label">월 수업료</span>
                  <span className="field-value">{cls.tuitionFee.toLocaleString()}원</span>
                </div>
                <div className="field-row">
                  <span className="field-label">월 교재비</span>
                  <span className="field-value">{cls.bookFee.toLocaleString()}원</span>
                </div>
                <div className="field-row" style={{ background: 'var(--bg2)' }}>
                  <span className="field-label" style={{ fontWeight: 600, color: 'var(--navy)' }}>월 합계</span>
                  <span className="field-value" style={{ fontWeight: 700, color: 'var(--navy)' }}>
                    {(cls.tuitionFee + cls.bookFee).toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>

            <div className="sec">
              <button className="btn-secondary" onClick={() => navigate(`/class/${cls.cid}/edit`)}>
                반 정보 수정
              </button>
              <button className="btn-danger" onClick={handleDelete}>
                반 삭제
              </button>
            </div>
          </>
        )}

        {tabIdx === 1 && (
          <div className="sec">
            {allStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--slate3)', fontSize: 13 }}>
                이 반에 배정된 학생이 없습니다.
                <div style={{ marginTop: 16 }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ width: 'auto', display: 'inline-block', padding: '10px 20px' }}
                    onClick={() => navigate(`/class/${cls.cid}/student/new`)}
                  >
                    학생 추가
                  </button>
                </div>
              </div>
            ) : (
              <div className="card">
                {allStudents.map((s) => (
                  <div
                    key={s.sid}
                    className="list-row"
                    onClick={() => navigate(`/parents/${s.sid}`)}
                  >
                    <div
                      className="avatar"
                      style={{ background: s.col, color: s.tc }}
                    >
                      {s.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="row">
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{s.name}</span>
                        <Badge cls={statusBdgCls(s)}>{statusBdgTxt(s)}</Badge>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 2 }}>
                        {s.parentName} · {s.grade}
                      </div>
                    </div>
                    <ChevronRight />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <Fab onClick={() => navigate(`/class/${cls.cid}/student/new`)} />
    </>
  )
}
