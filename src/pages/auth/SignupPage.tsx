// src/pages/auth/SignupPage.tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import type { SignupData } from '../../store/authStore'

const STEPS = ['기본 정보', '학원 정보', '완료']

export default function SignupPage() {
  const navigate = useNavigate()
  const { signup, isLoading, error, clearError } = useAuthStore()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<SignupData>({
    name: '', email: '', password: '', academyName: '', phone: '',
  })
  const [pwConfirm, setPwConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const set = (key: keyof SignupData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    setFieldErrors(fe => { const n = { ...fe }; delete n[key]; return n })
    clearError()
  }

  const validateStep0 = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = '이름을 입력해주세요.'
    if (!form.email.trim()) errs.email = '이메일을 입력해주세요.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = '올바른 이메일 형식이 아닙니다.'
    if (!form.password) errs.password = '비밀번호를 입력해주세요.'
    else if (form.password.length < 4) errs.password = '비밀번호는 4자 이상이어야 합니다.'
    if (form.password !== pwConfirm) errs.pwConfirm = '비밀번호가 일치하지 않습니다.'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateStep1 = () => {
    const errs: Record<string, string> = {}
    if (!form.academyName.trim()) errs.academyName = '학원명을 입력해주세요.'
    if (!form.phone.trim()) errs.phone = '연락처를 입력해주세요.'
    if (!agreed) errs.agree = '이용약관에 동의해주세요.'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleNext = async () => {
    if (step === 0) { if (validateStep0()) setStep(1) }
    else if (step === 1) {
      if (!validateStep1()) return
      const ok = await signup(form)
      if (ok) setStep(2)
    }
  }

  const EyeIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--slate3)" strokeWidth="1.8" strokeLinecap="round" style={{ width: 16, height: 16 }}>
      {showPw
        ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
        : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
      }
    </svg>
  )

  return (
    <div style={s.page}>
      <div style={s.bgDeco} />

      <div style={s.container}>
        {/* 로고 */}
        <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={s.logoIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" style={{ width: 22, height: 22 }}>
              <path d="M4 5v14M4 12h16M20 5v14"/>
            </svg>
          </div>
          <span style={s.logoText}>Hi<span style={{ color: '#A78BFA' }}>Academy</span></span>
        </Link>

        <div style={s.card}>
          {/* 스텝 표시 */}
          <div style={s.stepRow}>
            {STEPS.map((label, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  ...s.stepDot,
                  background: i <= step ? 'var(--acc)' : 'var(--bg3)',
                  color: i <= step ? '#fff' : 'var(--slate3)',
                  border: i <= step ? 'none' : '1px solid var(--border)',
                }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 11, color: i <= step ? 'var(--acc)' : 'var(--slate3)', fontWeight: i === step ? 700 : 400 }}>
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 24, height: 1, background: i < step ? 'var(--acc3)' : 'var(--border)', margin: '0 4px' }} />
                )}
              </div>
            ))}
          </div>

          {step < 2 && <h2 style={s.title}>{step === 0 ? '계정 만들기' : '학원 정보 입력'}</h2>}

          {/* 에러 */}
          {error && (
            <div style={s.errorBox}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* ── STEP 0: 기본 정보 ── */}
          {step === 0 && (
            <div>
              <Field label="이름" icon="person" error={fieldErrors.name}>
                <input style={inp(fieldErrors.name)} placeholder="홍길동" value={form.name} onChange={set('name')} autoComplete="name" />
              </Field>
              <Field label="이메일" icon="mail" error={fieldErrors.email}>
                <input style={inp(fieldErrors.email)} type="email" placeholder="admin@hiacademy.kr" value={form.email} onChange={set('email')} autoComplete="email" />
              </Field>
              <Field label="비밀번호" icon="lock" error={fieldErrors.password}
                right={<button type="button" onClick={() => setShowPw(!showPw)} style={s.eyeBtn}><EyeIcon /></button>}>
                <input style={inp(fieldErrors.password)} type={showPw ? 'text' : 'password'} placeholder="4자 이상 입력" value={form.password} onChange={set('password')} autoComplete="new-password" />
              </Field>
              <Field label="비밀번호 확인" icon="lock" error={fieldErrors.pwConfirm}>
                <input style={inp(fieldErrors.pwConfirm)} type={showPw ? 'text' : 'password'} placeholder="비밀번호 재입력"
                  value={pwConfirm} onChange={e => { setPwConfirm(e.target.value); setFieldErrors(fe => { const n={...fe}; delete n.pwConfirm; return n }) }}
                  autoComplete="new-password" />
              </Field>
            </div>
          )}

          {/* ── STEP 1: 학원 정보 ── */}
          {step === 1 && (
            <div>
              <Field label="학원명" icon="school" error={fieldErrors.academyName}>
                <input style={inp(fieldErrors.academyName)} placeholder="Hi Academy" value={form.academyName} onChange={set('academyName')} />
              </Field>
              <Field label="연락처" icon="phone" error={fieldErrors.phone}>
                <input style={inp(fieldErrors.phone)} type="tel" placeholder="010-0000-0000" value={form.phone} onChange={set('phone')} />
              </Field>

              {/* 요금제 선택 */}
              <div style={{ marginBottom: 16 }}>
                <label style={s.label}>요금제</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { label: '무료', desc: '학생 30명 이하', price: '₩0' },
                    { label: '스탠다드', desc: '학생 무제한', price: '₩29,000', popular: true },
                  ].map(plan => (
                    <div key={plan.label} style={{
                      flex: 1, borderRadius: 12, padding: '12px',
                      border: plan.popular ? '2px solid var(--acc)' : '1.5px solid var(--border)',
                      background: plan.popular ? 'var(--acc2)' : 'var(--bg1)',
                      cursor: 'pointer', position: 'relative',
                    }}>
                      {plan.popular && (
                        <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'var(--acc)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>인기</div>
                      )}
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 3 }}>{plan.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--slate2)', marginBottom: 6 }}>{plan.desc}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: plan.popular ? 'var(--acc)' : 'var(--navy)' }}>{plan.price}<span style={{ fontSize: 10, fontWeight: 400 }}>/월</span></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 약관 동의 */}
              <div style={{ borderRadius: 12, background: 'var(--bg3)', padding: '12px 14px', marginBottom: 16, border: fieldErrors.agree ? '1.5px solid var(--err)' : '1px solid var(--border)' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={agreed} onChange={e => { setAgreed(e.target.checked); setFieldErrors(fe => { const n={...fe}; delete n.agree; return n }) }}
                    style={{ accentColor: 'var(--acc)', marginTop: 2, width: 15, height: 15, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--slate2)', lineHeight: 1.6 }}>
                    <span style={{ color: 'var(--acc)', fontWeight: 700 }}>이용약관</span> 및{' '}
                    <span style={{ color: 'var(--acc)', fontWeight: 700 }}>개인정보 처리방침</span>에 동의합니다.
                    서비스 이용을 위해 필수 항목에 동의해주세요.
                  </span>
                </label>
                {fieldErrors.agree && <p style={{ fontSize: 11, color: 'var(--err)', marginTop: 6 }}>{fieldErrors.agree}</p>}
              </div>
            </div>
          )}

          {/* ── STEP 2: 완료 ── */}
          {step === 2 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>가입 완료!</h2>
              <p style={{ fontSize: 14, color: 'var(--slate2)', lineHeight: 1.7, marginBottom: 8 }}>
                <strong style={{ color: 'var(--navy)' }}>{form.academyName}</strong>의<br />
                관리자 계정이 생성되었습니다.
              </p>
              <div style={{ background: 'var(--acc2)', borderRadius: 12, padding: '12px 16px', marginBottom: 24, border: '1px solid var(--acc3)' }}>
                <div style={{ fontSize: 12, color: 'var(--acc)', fontWeight: 600, marginBottom: 4 }}>가입 정보</div>
                <div style={{ fontSize: 13, color: 'var(--navy)' }}>{form.name} · {form.email}</div>
              </div>
              <button onClick={() => navigate('/', { replace: true })} style={{ ...s.submitBtn, width: '100%' }}>
                대시보드 시작하기 →
              </button>
            </div>
          )}

          {/* 버튼 */}
          {step < 2 && (
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              {step > 0 && (
                <button onClick={() => setStep(s => s - 1)} style={s.backBtn}>
                  ← 이전
                </button>
              )}
              <button onClick={handleNext} style={{ ...s.submitBtn, flex: 1 }} disabled={isLoading}>
                {isLoading
                  ? <span style={s.spinner} />
                  : step === 1 ? '가입 완료' : '다음 →'
                }
              </button>
            </div>
          )}

          {step === 0 && (
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--slate2)', marginTop: 20 }}>
              이미 계정이 있으신가요?{' '}
              <Link to="/login" style={{ color: 'var(--acc)', fontWeight: 700, textDecoration: 'none' }}>로그인</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// 헬퍼: 필드 컴포넌트
function Field({ label, icon, error, right, children }: {
  label: string; icon: string; error?: string; right?: React.ReactNode; children: React.ReactNode
}) {
  const iconPaths: Record<string, React.ReactNode> = {
    person: <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>,
    mail: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    school: <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></>,
    phone: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></>,
  }
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
        <label style={s.label}>{label}</label>
        {right}
      </div>
      <div style={{ position: 'relative' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--slate3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, pointerEvents: 'none' }}>
          {iconPaths[icon]}
        </svg>
        {children}
      </div>
      {error && <p style={{ fontSize: 11, color: 'var(--err)', marginTop: 5 }}>{error}</p>}
    </div>
  )
}

const inp = (err?: string): React.CSSProperties => ({
  width: '100%', height: 46,
  border: `1.5px solid ${err ? 'var(--err)' : 'var(--border)'}`,
  borderRadius: 10, paddingLeft: 42, paddingRight: 16,
  fontSize: 14, color: 'var(--navy)', background: 'var(--bg2)',
  outline: 'none', fontFamily: 'inherit',
  boxShadow: err ? '0 0 0 3px rgba(240,68,56,0.1)' : 'none',
})

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', background: 'var(--bg2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px 16px', position: 'relative', overflow: 'hidden',
  },
  bgDeco: {
    position: 'absolute', top: -150, right: -100,
    width: 500, height: 500, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(108,99,255,0.1) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  container: {
    width: '100%', maxWidth: 480,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
    position: 'relative', zIndex: 1,
  },
  logoIcon: {
    width: 40, height: 40, borderRadius: 12,
    background: 'linear-gradient(135deg, #8B7FFF, #6C63FF)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(108,99,255,0.35)',
  },
  logoText: { fontSize: 20, fontWeight: 800, color: 'var(--navy)' },
  card: {
    width: '100%', background: 'var(--bg1)',
    borderRadius: 20, padding: '28px 24px',
    border: '1px solid var(--border)',
    boxShadow: '0 8px 32px rgba(108,99,255,0.08)',
  },
  stepRow: {
    display: 'flex', alignItems: 'center', marginBottom: 24,
    flexWrap: 'wrap', gap: 4,
  },
  stepDot: {
    width: 24, height: 24, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700, flexShrink: 0,
  },
  title: { fontSize: 20, fontWeight: 800, color: 'var(--navy)', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: 600, color: 'var(--slate2)' },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'var(--err2)', color: 'var(--err)',
    borderRadius: 10, padding: '10px 14px',
    fontSize: 13, marginBottom: 16,
    border: '1px solid rgba(240,68,56,0.2)',
  },
  eyeBtn: {
    position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', padding: 0,
  },
  submitBtn: {
    height: 48, background: 'linear-gradient(135deg, #8B7FFF, #6C63FF)',
    color: '#fff', border: 'none', borderRadius: 12,
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(108,99,255,0.3)',
  },
  backBtn: {
    height: 48, width: 90, background: 'var(--bg2)',
    color: 'var(--slate2)', border: '1.5px solid var(--border)',
    borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  spinner: {
    width: 20, height: 20,
    border: '2.5px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff', borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.8s linear infinite',
  },
}
