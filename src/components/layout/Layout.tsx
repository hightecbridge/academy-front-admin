// src/components/layout/Layout.tsx
import type { ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const GROUPS = [
  { label: '관리', items: [
    { path: '/',         label: '홈',      icon: 'grid' },
    { path: '/parents',  label: '학부모',   icon: 'people' },
    { path: '/class',    label: '클래스',   icon: 'book' },
    { path: '/attend',   label: '출석',    icon: 'check' },
  ]},
  { label: '운영', items: [
    { path: '/calendar', label: '캘린더',   icon: 'cal' },
    { path: '/payment',  label: '수납',    icon: 'money' },
    { path: '/notice',   label: '공지사항', icon: 'doc' },
    { path: '/message',  label: '메시지',   icon: 'msg', badge: true },
  ]},
]
const ALL = GROUPS.flatMap(g => g.items)

function Icon({ name, active }: { name: string; active: boolean }) {
  const s = active ? 'var(--acc)' : 'currentColor'
  const p: Record<string, ReactNode> = {
    grid:   <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    people: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    book:   <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></>,
    check:  <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,
    cal:    <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    money:  <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
    doc:    <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></>,
    msg:    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>,
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{p[name]}</svg>
}

export default function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const base = '/' + pathname.split('/')[1]

  return (
    <div className="app-shell">
      {/* ── PC 사이드바 ── */}
      <aside className="sidebar">
        {/* 로고 */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            {/* HiClass 'H' 모양 아이콘 */}
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5v14M4 12h16M20 5v14"/>
            </svg>
          </div>
          <div>
            <div className="sidebar-logo-text">HiClass</div>
            <div className="sidebar-logo-sub">학원 관리 시스템</div>
          </div>
        </div>

        {/* 네비게이션 */}
        <nav className="sidebar-nav">
          {GROUPS.map(g => (
            <div key={g.label}>
              <div className="sidebar-section-label">{g.label}</div>
              {g.items.map(item => {
                const active = base === item.path
                return (
                  <div key={item.path} className={`sidebar-nav-item${active ? ' active' : ''}`} onClick={() => navigate(item.path)}>
                    <Icon name={item.icon} active={active}/>
                    <span className="sidebar-nav-label">{item.label}</span>
                    {item.badge && <div className="sidebar-nav-badge"/>}
                  </div>
                )
              })}
            </div>
          ))}
        </nav>

        {/* 푸터 */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(167,139,250,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg style={{ width: 14, height: 14, stroke: 'rgba(255,255,255,.7)', fill: 'none', strokeWidth: 2, strokeLinecap: 'round' }} viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <div className="sidebar-footer-name">관리자</div>
              <div className="sidebar-footer-sub">HiClass v1.0</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── 메인 영역 ── */}
      <main className="main-content">
        {/* 모바일 상태바 */}
        <div className="status-bar">
          <span>9:41</span>
          <span style={{ fontWeight: 800, letterSpacing: '-0.3px' }}>HiClass</span>
          <span>100%</span>
        </div>

        {/* 페이지 컨텐츠 */}
        {children}

        {/* 모바일 하단 탭 */}
        <div className="bottom-nav">
          {ALL.map(item => {
            const active = base === item.path
            return (
              <div key={item.path} className={`nav-item${active ? ' active' : ''}`} onClick={() => navigate(item.path)}>
                <Icon name={item.icon} active={active}/>
                <span style={{ color: active ? 'var(--acc)' : 'var(--slate3)', fontSize: 8, fontWeight: active ? 700 : 400 }}>
                  {item.label}
                </span>
                {item.badge && <div className="nav-badge"/>}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
