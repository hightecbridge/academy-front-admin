// src/pages/parents/ParentListPage.tsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar, TabBar, Avatar, Badge, ChevronRight, Fab, SearchIcon, IconBtn } from '../../components/common'
import { ParentBulkImportModal } from '../../components/parents/ParentBulkImportModal'
import { useDataStore, clsBdg, clsCol, studentInClass } from '../../store/dataStore'

function normalizePhone(v: string) {
  return v.replace(/[^\d]/g, '')
}

export function ParentListPage() {
  const navigate = useNavigate()
  const students = useDataStore((s) => s.students)
  const classes = useDataStore((s) => s.classes)
  const [tabIdx, setTabIdx] = useState(0)
  const [search, setSearch] = useState('')
  const [showBulkImport, setShowBulkImport] = useState(false)

  const tabs = ['전체', ...classes.map((c) => c.name)]
  const selectedClass = tabIdx === 0 ? null : classes[tabIdx - 1]

  const filtered = useMemo(() => students.filter((s) => {
    const matchCls = !selectedClass || studentInClass(s, selectedClass)
    const q = search.trim()
    if (!q) return matchCls
    const nq = normalizePhone(q)
    const matchSearch =
      s.name.includes(q)
      || s.parentName.includes(q)
      || s.parentPhone.includes(q)
      || (s.phone && s.phone.includes(q))
      || (nq.length >= 4 && (
        normalizePhone(s.parentPhone).includes(nq)
        || (s.phone && normalizePhone(s.phone).includes(nq))
      ))
    return matchCls && matchSearch
  }), [students, selectedClass, search])

  return (
    <>
      <TopBar
        title="학생 관리"
        sub={`총 ${students.length}명`}
        right={
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setShowBulkImport(true)}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid var(--acc3)',
                background: 'var(--acc2)',
                color: 'var(--acc)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Excel 일괄등록
            </button>
            <IconBtn><SearchIcon /></IconBtn>
          </div>
        }
      />
      <TabBar tabs={tabs} active={tabIdx} onChange={setTabIdx} />

      <div className="page-content-body">
        <div className="sec">
          <input
            className="input-field"
            style={{ marginTop: 0, marginBottom: 12 }}
            placeholder="학생명·학부모명·전화번호 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="card">
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--slate3)', fontSize: 13 }}>
                {students.length === 0 ? '등록된 학생이 없습니다' : '검색 결과가 없습니다'}
              </div>
            )}
            {filtered.map((s) => {
              const cc = clsCol(s.cls)
              return (
                <div
                  key={s.sid}
                  className="list-row"
                  onClick={() => navigate(`/parents/${s.sid}`)}
                >
                  <Avatar name={s.name} col={cc.bg} tc={cc.tc} />
                  <div style={{ flex: 1 }}>
                    <div className="row">
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{s.name}</span>
                      <Badge cls={clsBdg(s.cls)}>{s.cls}</Badge>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 3 }}>
                      {s.grade} · 학부모 {s.parentName} ({s.parentPhone})
                      {s.phone ? ` · 학생 ${s.phone}` : ''}
                    </div>
                  </div>
                  <ChevronRight />
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <Fab onClick={() => navigate('/parents/new')} />
      {showBulkImport && <ParentBulkImportModal onClose={() => setShowBulkImport(false)} />}
    </>
  )
}
