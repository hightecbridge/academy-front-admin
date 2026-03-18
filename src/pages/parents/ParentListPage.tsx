// src/pages/parents/ParentListPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar, TabBar, Avatar, Badge, ChevronRight, Fab, SearchIcon, IconBtn } from '../../components/common'
import { useDataStore, clsBdg } from '../../store/dataStore'

export function ParentListPage() {
  const navigate = useNavigate()
  const parents = useDataStore((s) => s.parents)
  const classes = useDataStore((s) => s.classes)
  const [tabIdx, setTabIdx] = useState(0)
  const [search, setSearch] = useState('')

  // 탭 목록: 전체 + 동적 반 목록
  const tabs = ['전체', ...classes.map((c) => c.name)]
  const clsFilter = tabIdx === 0 ? null : tabs[tabIdx]

  const filtered = parents.filter((p) => {
    const matchCls = !clsFilter || p.students.some((s) => s.cls === clsFilter)
    const matchSearch = !search || p.name.includes(search) || p.phone.includes(search)
    return matchCls && matchSearch
  })

  return (
    <>
      <TopBar title="학부모 관리" sub={`총 ${parents.length}명`} right={<IconBtn><SearchIcon /></IconBtn>} />
      <TabBar tabs={tabs} active={tabIdx} onChange={setTabIdx} />
      
        <div className="page-content-body">
        <div className="sec">
          <input
            className="input-field"
            style={{ marginTop: 0, marginBottom: 12 }}
            placeholder="이름·전화번호 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="card">
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--slate3)', fontSize: 13 }}>
                검색 결과가 없습니다
              </div>
            )}
            {filtered.map((p) => (
              <div key={p.pid} className="list-row" onClick={() => navigate(`/parents/${p.pid}`)}>
                <Avatar name={p.name} col={p.col} tc={p.tc} />
                <div style={{ flex: 1 }}>
                  <div className="row">
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{p.name}</span>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {p.students.map((s) => <Badge key={s.sid} cls={clsBdg(s.cls)}>{s.cls}</Badge>)}
                      {p.students.length === 0 && <Badge cls="badge-gray">학생없음</Badge>}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 3 }}>
                    {p.phone} · 학생 {p.students.length}명{!p.kakao && ' · 미연동'}
                  </div>
                </div>
                <ChevronRight />
              </div>
            ))}
          </div>
        </div>
      </div>
      <Fab onClick={() => navigate('/parents/new')} />
    </>
  )
}
