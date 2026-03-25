// src/components/layout/Layout.tsx
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useDataStore } from '../../store/dataStore'

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
  const { user, logout } = useAuthStore()
  const { fetchClasses, fetchParents, fetchNotices, fetchEvents } = useDataStore()
  const base = '/' + pathname.split('/')[1]

  // 로그인 후 첫 마운트 시 전체 데이터 로드
  useEffect(() => {
    fetchClasses()
    fetchParents()
    fetchNotices()
    fetchEvents()
  }, [])

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      logout()
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="app-shell">
      {/* ── PC 사이드바 ── */}
      <aside className="sidebar">
        {/* 로고 */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            {/* Hi Academy 'H' 모양 아이콘 */}
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5v14M4 12h16M20 5v14"/>
            </svg>
          </div>
          <div>
            <div className="sidebar-logo-text">Hi<span style={{color:"#A78BFA"}}>Academy</span></div>
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

        {/* 푸터 — 사용자 정보 + 로그아웃 */}
        <div className="sidebar-footer">
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer', borderRadius: 10, padding: '6px 4px', transition: 'background .12s' }}
            onClick={() => navigate('/profile')}
            title="회원정보 관리"
          >
            {/* 프로필 아바타 or 이미지 */}
            <div style={{ width: 34, height: 34, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg,#A78BFA,#6C63FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.15)' }}>
              {user?.profileImage
                ? <img src={user.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>{(user?.name ?? '관')[0]}</span>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-footer-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name ?? '관리자'}
              </div>
              {/* 학원 로고 + 학원명 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                {user?.academyLogo && (
                  <img src={user.academyLogo} alt="" style={{ width: 14, height: 14, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }} />
                )}
                <div className="sidebar-footer-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.academyName ?? 'Hi Academy'}
                </div>
              </div>
            </div>
            {/* 설정 아이콘 */}
            <svg style={{ width: 14, height: 14, stroke: 'rgba(255,255,255,.3)', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', flexShrink: 0 }} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '7px 0', borderRadius: 8,
              background: 'rgba(240,68,56,0.12)', color: '#F87171',
              border: '1px solid rgba(240,68,56,0.2)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <svg style={{ width: 13, height: 13, stroke: '#F87171', fill: 'none', strokeWidth: 2, strokeLinecap: 'round' }} viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            로그아웃
          </button>
        </div>
      </aside>

      {/* ── 메인 영역 ── */}
      <main className="main-content">
        {/* 모바일 상태바 */}
        <div className="status-bar">
          <span>9:41</span>
          <span style={{ fontWeight: 800, letterSpacing: '-0.3px' }}>Hi<span style={{color:"#A78BFA"}}>Academy</span></span>
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
