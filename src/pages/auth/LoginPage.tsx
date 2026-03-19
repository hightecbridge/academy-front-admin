// src/pages/auth/LoginPage.tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading, error, clearError } = useAuthStore()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [showPw, setShowPw] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !pw.trim()) return
    const ok = await login(email.trim(), pw)
    if (ok) navigate('/', { replace: true })
  }

  return (
    <div style={styles.page}>
      {/* 배경 장식 */}
      <div style={styles.bgCircle1} />
      <div style={styles.bgCircle2} />

      <div style={styles.container}>
        {/* 로고 */}
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
              <path d="M4 5v14M4 12h16M20 5v14"/>
            </svg>
          </div>
          <div>
            <div style={styles.logoText}>
              Hi<span style={{ color: '#A78BFA' }}>Academy</span>
            </div>
            <div style={styles.logoSub}>학원 관리 시스템</div>
          </div>
        </div>

        {/* 카드 */}
        <div style={styles.card}>
          <h1 style={styles.title}>관리자 로그인</h1>
          <p style={styles.desc}>학원 관리 시스템에 오신 것을 환영합니다</p>

          {/* 에러 */}
          {error && (
            <div style={styles.errorBox}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
              <button onClick={clearError} style={styles.errorClose}>×</button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* 이메일 */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>이메일</label>
              <div style={styles.inputWrap}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--slate3)" strokeWidth="1.8" strokeLinecap="round" style={styles.inputIcon}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  type="email"
                  placeholder="admin@hiacademy.kr"
                  value={email}
                  onChange={e => { setEmail(e.target.value); clearError() }}
                  style={styles.input}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* 비밀번호 */}
            <div style={styles.fieldGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={styles.label}>비밀번호</label>
                <button type="button" style={styles.forgotBtn}>비밀번호 찾기</button>
              </div>
              <div style={styles.inputWrap}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--slate3)" strokeWidth="1.8" strokeLinecap="round" style={styles.inputIcon}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="비밀번호 입력"
                  value={pw}
                  onChange={e => { setPw(e.target.value); clearError() }}
                  style={styles.input}
                  autoComplete="current-password"
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={styles.eyeBtn}>
                  {showPw ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--slate3)" strokeWidth="1.8" strokeLinecap="round" style={{ width: 16, height: 16 }}>
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--slate3)" strokeWidth="1.8" strokeLinecap="round" style={{ width: 16, height: 16 }}>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* 로그인 유지 */}
            <label style={styles.checkRow}>
              <input type="checkbox" style={{ accentColor: 'var(--acc)', width: 15, height: 15 }} />
              <span style={{ fontSize: 13, color: 'var(--slate2)' }}>로그인 상태 유지</span>
            </label>

            {/* 버튼 */}
            <button type="submit" style={styles.submitBtn} disabled={isLoading}>
              {isLoading ? (
                <span style={styles.spinner} />
              ) : (
                '로그인'
              )}
            </button>
          </form>

          {/* 테스트 계정 안내 */}
          <div style={styles.demoBox}>
            <div style={styles.demoTitle}>🔑 테스트 계정</div>
            <div style={styles.demoRow}>
              <span style={styles.demoLabel}>이메일</span>
              <code style={styles.demoCode} onClick={() => setEmail('admin@hiacademy.kr')}>admin@hiacademy.kr</code>
            </div>
            <div style={styles.demoRow}>
              <span style={styles.demoLabel}>비밀번호</span>
              <code style={styles.demoCode} onClick={() => setPw('1234')}>1234</code>
            </div>
            <p style={{ fontSize: 10, color: 'var(--slate3)', marginTop: 5 }}>코드를 클릭하면 자동 입력됩니다</p>
          </div>

          <div style={styles.divider}>
            <span style={styles.dividerText}>또는</span>
          </div>

          <p style={styles.signupText}>
            계정이 없으신가요?{' '}
            <Link to="/signup" style={styles.signupLink}>무료로 시작하기 →</Link>
          </p>
        </div>

        <p style={styles.footer}>© 2024 Hi Academy. 학원 관리의 새로운 기준</p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    position: 'relative',
    overflow: 'hidden',
  },
  bgCircle1: {
    position: 'absolute', top: -120, right: -80,
    width: 400, height: 400, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  bgCircle2: {
    position: 'absolute', bottom: -100, left: -100,
    width: 350, height: 350, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  container: {
    width: '100%', maxWidth: 440,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
    position: 'relative', zIndex: 1,
  },
  logoWrap: {
    display: 'flex', alignItems: 'center', gap: 12,
  },
  logoIcon: {
    width: 44, height: 44, borderRadius: 13,
    background: 'linear-gradient(135deg, #8B7FFF, #6C63FF)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 6px 20px rgba(108,99,255,0.4)',
  },
  logoText: {
    fontSize: 22, fontWeight: 800, color: 'var(--navy)', letterSpacing: -0.5,
  },
  logoSub: {
    fontSize: 11, color: 'var(--slate3)', marginTop: 1,
  },
  card: {
    width: '100%',
    background: 'var(--bg1)',
    borderRadius: 20,
    padding: '32px 28px',
    border: '1px solid var(--border)',
    boxShadow: '0 8px 32px rgba(108,99,255,0.08)',
  },
  title: {
    fontSize: 22, fontWeight: 800, color: 'var(--navy)',
    marginBottom: 6, letterSpacing: -0.3,
  },
  desc: {
    fontSize: 13, color: 'var(--slate2)', marginBottom: 24, lineHeight: 1.5,
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'var(--err2)', color: 'var(--err)',
    borderRadius: 10, padding: '10px 14px',
    fontSize: 13, marginBottom: 18,
    border: '1px solid rgba(240,68,56,0.2)',
  },
  errorClose: {
    marginLeft: 'auto', background: 'none', border: 'none',
    color: 'var(--err)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0,
  },
  fieldGroup: { marginBottom: 16 },
  label: {
    display: 'block', fontSize: 13, fontWeight: 600,
    color: 'var(--slate2)', marginBottom: 7,
  },
  inputWrap: {
    position: 'relative', display: 'flex', alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute', left: 13, width: 16, height: 16, pointerEvents: 'none',
  },
  input: {
    width: '100%', height: 46,
    border: '1.5px solid var(--border)',
    borderRadius: 10, paddingLeft: 42, paddingRight: 42,
    fontSize: 14, color: 'var(--navy)', background: 'var(--bg2)',
    outline: 'none', fontFamily: 'inherit',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  eyeBtn: {
    position: 'absolute', right: 13,
    background: 'none', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', padding: 0,
  },
  forgotBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 12, color: 'var(--acc)', fontWeight: 600, padding: 0,
  },
  checkRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    cursor: 'pointer', marginBottom: 20,
  },
  submitBtn: {
    width: '100%', height: 48,
    background: 'linear-gradient(135deg, #8B7FFF, #6C63FF)',
    color: '#fff', border: 'none', borderRadius: 12,
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(108,99,255,0.35)',
    transition: 'opacity 0.15s',
  },
  spinner: {
    width: 20, height: 20,
    border: '2.5px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.8s linear infinite',
  },
  demoBox: {
    marginTop: 20, background: 'var(--bg3)',
    borderRadius: 12, padding: '12px 14px',
    border: '1px solid var(--border)',
  },
  demoTitle: { fontSize: 12, fontWeight: 700, color: 'var(--slate2)', marginBottom: 8 },
  demoRow: {
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5,
  },
  demoLabel: { fontSize: 11, color: 'var(--slate3)', width: 50 },
  demoCode: {
    fontSize: 12, background: 'var(--bg1)',
    padding: '3px 10px', borderRadius: 6,
    color: 'var(--acc)', cursor: 'pointer',
    border: '1px solid var(--border)',
    fontFamily: 'monospace',
  },
  divider: {
    display: 'flex', alignItems: 'center', gap: 12,
    margin: '20px 0',
  },
  dividerText: {
    fontSize: 12, color: 'var(--slate3)',
    background: 'var(--bg1)', padding: '0 8px',
    whiteSpace: 'nowrap',
    flex: 1, textAlign: 'center',
    borderTop: '1px solid var(--border)',
  },
  signupText: { textAlign: 'center', fontSize: 13, color: 'var(--slate2)' },
  signupLink: {
    color: 'var(--acc)', fontWeight: 700, textDecoration: 'none',
  },
  footer: {
    fontSize: 11, color: 'var(--slate3)', textAlign: 'center',
  },
}
