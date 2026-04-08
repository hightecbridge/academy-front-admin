// src/pages/auth/ProfilePage.tsx
import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar, Breadcrumb, useToast, Toast } from '../../components/common'
import { useAuthStore } from '../../store/authStore'

function formatCreatedAt(value?: string) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}시`
}

// ── 이미지 압축 헬퍼 ─────────────────────────────────
function compressImage(file: File, maxSize = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        if (width > maxSize || height > maxSize) {
          if (width > height) { height = Math.round((height * maxSize) / width); width = maxSize }
          else { width = Math.round((width * maxSize) / height); height = maxSize }
        }
        canvas.width = width; canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ── 이미지 업로드 박스 컴포넌트 ──────────────────────
function ImageUploadBox({
  value, onChange, label, hint, size = 120, circle = false,
}: {
  value?: string; onChange: (v: string) => void
  label: string; hint: string; size?: number; circle?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { alert('이미지 파일만 업로드 가능합니다.'); return }
    if (file.size > 5 * 1024 * 1024) { alert('5MB 이하 이미지만 업로드 가능합니다.'); return }
    const compressed = await compressImage(file, circle ? 400 : 800)
    onChange(compressed)
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <label style={s.label}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        {/* 미리보기 */}
        <div
          onClick={() => ref.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          style={{
            width: size, height: size,
            borderRadius: circle ? '50%' : 14,
            border: dragging ? '2px solid var(--acc)' : '2px dashed var(--border)',
            background: dragging ? 'var(--acc2)' : value ? 'transparent' : 'var(--bg3)',
            cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
        >
          {value ? (
            <img src={value} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ textAlign: 'center', padding: 8 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--slate3)" strokeWidth="1.5" strokeLinecap="round" style={{ width: 28, height: 28, marginBottom: 4 }}>
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <div style={{ fontSize: 10, color: 'var(--slate3)', lineHeight: 1.4 }}>클릭 또는<br/>드래그</div>
            </div>
          )}
        </div>

        {/* 버튼 + 안내 */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--slate2)', lineHeight: 1.7, marginBottom: 10 }}>{hint}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => ref.current?.click()}
              style={s.uploadBtn}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 13, height: 13 }}>
                <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
              이미지 선택
            </button>
            {value && (
              <button type="button" onClick={() => onChange('')} style={s.removeBtn}>삭제</button>
            )}
          </div>
          <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════
// 메인 프로필 페이지
// ════════════════════════════════════════════════════
export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, updateProfile, changePassword } = useAuthStore()
  const { ref: toastRef, show: showToast } = useToast()

  const [tab, setTab] = useState<'info' | 'academy' | 'password'>('info')

  // 기본 정보
  const [name, setName]     = useState(user?.name ?? '')
  const [phone, setPhone]   = useState(user?.phone ?? '')
  const [profileImage, setProfileImage] = useState(user?.profileImage ?? '')

  // 학원 정보
  const [academyName,    setAcademyName]    = useState(user?.academyName ?? '')
  const [academyLogo,    setAcademyLogo]    = useState(user?.academyLogo ?? '')
  const [academyAddress, setAcademyAddress] = useState(user?.academyAddress ?? '')
  const [academyDesc,    setAcademyDesc]    = useState(user?.academyDesc ?? '')

  // 비밀번호
  const [curPw,  setCurPw]  = useState('')
  const [newPw,  setNewPw]  = useState('')
  const [newPw2, setNewPw2] = useState('')
  const [pwErr,  setPwErr]  = useState('')

  // user 상태 변경 시 폼 동기화 (저장 후 반영)
  React.useEffect(() => {
    if (!user) return
    setName(user.name ?? '')
    setPhone(user.phone ?? '')
    setProfileImage(user.profileImage ?? '')
    setAcademyName(user.academyName ?? '')
    setAcademyLogo(user.academyLogo ?? '')
    setAcademyAddress(user.academyAddress ?? '')
    setAcademyDesc(user.academyDesc ?? '')
  }, [user])

  if (!user) { navigate('/login'); return null }

  // ── 기본정보 저장 ──
  const handleSaveInfo = async () => {
    if (!name.trim()) { showToast('이름을 입력해주세요.'); return }
    const ok = await updateProfile({
      name,
      phone,
      profileImage: profileImage || undefined,
    })
    if (ok) {
      showToast('기본 정보가 저장되었습니다.')
    } else {
      showToast('저장에 실패했습니다. 다시 시도해주세요.')
    }
  }

  // ── 학원정보 저장 ──
  const handleSaveAcademy = async () => {
    if (!academyName.trim()) { showToast('학원명을 입력해주세요.'); return }
    const ok = await updateProfile({
      academyName,
      academyLogo: academyLogo || undefined,
      academyAddress,
      academyDesc,
    })
    if (ok) {
      showToast('학원 정보가 저장되었습니다. 학부모 앱에 즉시 반영됩니다.')
    } else {
      showToast('저장에 실패했습니다. 다시 시도해주세요.')
    }
  }

  // ── 비밀번호 변경 ──
  const handleChangePw = async () => {
    setPwErr('')
    if (!curPw || !newPw || !newPw2) { setPwErr('모든 항목을 입력해주세요.'); return }
    if (newPw.length < 4) { setPwErr('새 비밀번호는 4자 이상이어야 합니다.'); return }
    if (newPw !== newPw2) { setPwErr('새 비밀번호가 일치하지 않습니다.'); return }
    const ok = await changePassword(curPw, newPw)
    if (ok) {
      showToast('비밀번호가 변경되었습니다.')
      setCurPw(''); setNewPw(''); setNewPw2('')
    } else {
      setPwErr('현재 비밀번호가 올바르지 않습니다.')
    }
  }

  const TABS = [
    { key: 'info',     label: '기본 정보', icon: '👤' },
    { key: 'academy',  label: '학원 정보', icon: '🏫' },
    { key: 'password', label: '비밀번호',  icon: '🔒' },
  ] as const

  return (
    <>
      <TopBar title="회원정보 관리" onBack={() => navigate('/')} />
      <Breadcrumb items={[{ label: '홈', onClick: () => navigate('/') }, { label: '회원정보 관리' }]} />

      <div className="page-content-body">

        <div className="sec" style={{ marginBottom: 8 }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ width: '100%', justifyContent: 'space-between', display: 'flex', alignItems: 'center', padding: '14px 16px' }}
            onClick={() => navigate('/billing')}
          >
            <span style={{ fontWeight: 700, color: 'var(--navy)' }}>이용 요금 · 문자 포인트</span>
            <span style={{ color: 'var(--acc)', fontWeight: 700 }}>이용요금관리 →</span>
          </button>
        </div>

        {/* 프로필 헤더 */}
        <div className="sec">
          <div style={{
            background: 'linear-gradient(135deg, var(--navy) 0%, #2D2A6E 100%)',
            borderRadius: 16, padding: '24px 20px',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
              background: 'linear-gradient(135deg,#A78BFA,#6C63FF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '3px solid rgba(255,255,255,0.2)',
            }}>
              {profileImage
                ? <img src={profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{user.name[0]}</span>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 3 }}>{user.name}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>{user.email}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {academyLogo
                  ? <img src={academyLogo} alt="" style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)' }} />
                  : <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(167,139,250,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 12 }}>🏫</span>
                    </div>
                }
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{user.academyName}</span>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.12)', padding: '5px 11px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.15)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                {user.role === 'admin' ? '원장' : '선생님'}
              </span>
            </div>
          </div>
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 0, background: 'var(--bg1)', borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: '12px 8px', border: 'none', cursor: 'pointer', background: 'none',
                borderBottom: tab === t.key ? '2.5px solid var(--acc)' : '2.5px solid transparent',
                color: tab === t.key ? 'var(--acc)' : 'var(--slate2)',
                fontWeight: tab === t.key ? 700 : 400,
                fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              <span style={{ fontSize: 14 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ background: 'var(--bg1)', borderRadius: '0 0 12px 12px', padding: '20px 16px', border: '1px solid var(--border)', borderTop: 'none', marginBottom: 16 }}>

          {/* ── 탭: 기본 정보 ── */}
          {tab === 'info' && (
            <div>
              <ImageUploadBox
                label="프로필 사진"
                hint="원장님 또는 담당자 프로필 사진입니다. JPG, PNG 권장 (최대 5MB)"
                value={profileImage}
                onChange={setProfileImage}
                size={100}
                circle
              />

              <label style={s.label}>이름 *</label>
              <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" />

              <label style={s.label}>이메일</label>
              <input className="input-field" value={user.email} disabled
                style={{ opacity: 0.55, cursor: 'not-allowed' }} />
              <p style={{ fontSize: 11, color: 'var(--slate3)', marginTop: 4 }}>이메일은 변경할 수 없습니다.</p>

              <label style={s.label}>연락처</label>
              <input className="input-field" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" />

              <label style={s.label}>가입일</label>
              <input className="input-field" value={formatCreatedAt(user.createdAt)} disabled style={{ opacity: 0.55, cursor: 'not-allowed' }} />

              <button className="btn-primary" onClick={handleSaveInfo}>기본 정보 저장</button>
            </div>
          )}

          {/* ── 탭: 학원 정보 ── */}
          {tab === 'academy' && (
            <div>
              <ImageUploadBox
                label="학원 로고"
                hint={
                  `학부모 앱 상단에 표시되는 학원 로고입니다.\n정사각형 이미지(1:1 비율) 권장 · JPG, PNG · 최대 5MB\n등록하면 학부모 앱 홈/마이페이지에 즉시 반영됩니다.`
                }
                value={academyLogo}
                onChange={setAcademyLogo}
                size={120}
              />

              {/* 미리보기 */}
              {academyLogo && (
                <div style={{
                  background: 'var(--bg3)', borderRadius: 12, padding: '12px 14px',
                  marginBottom: 16, border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate2)', marginBottom: 8 }}>
                    📱 학부모 앱 미리보기
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {/* 앱 홈 헤더 미리보기 */}
                    <div style={{
                      background: 'var(--navy)', borderRadius: 12, padding: '10px 14px',
                      display: 'flex', alignItems: 'center', gap: 10, flex: 1,
                    }}>
                      <img src={academyLogo} alt="" style={{ width: 36, height: 36, borderRadius: 9, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)' }} />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{academyName || user.academyName}</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>학부모 앱</div>
                      </div>
                    </div>
                    {/* 마이페이지 미리보기 */}
                    <div style={{
                      background: 'var(--bg1)', borderRadius: 12, padding: '10px 14px',
                      display: 'flex', alignItems: 'center', gap: 8,
                      border: '1px solid var(--border)', flex: 1,
                    }}>
                      <img src={academyLogo} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} />
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--navy)' }}>{academyName || user.academyName}</div>
                        <div style={{ fontSize: 9, color: 'var(--slate3)' }}>마이페이지</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <label style={s.label}>학원명 *</label>
              <input className="input-field" value={academyName} onChange={e => setAcademyName(e.target.value)} placeholder="Hi Academy 학원" />

              <label style={s.label}>학원 주소</label>
              <input className="input-field" value={academyAddress} onChange={e => setAcademyAddress(e.target.value)} placeholder="서울시 강남구 테헤란로 123" />

              <label style={s.label}>학원 소개</label>
              <textarea className="input-field" value={academyDesc} onChange={e => setAcademyDesc(e.target.value)}
                placeholder="학원 소개를 입력하세요. 학부모 앱 마이페이지에 표시됩니다."
                style={{ height: 100 }} />

              <div style={{ background: 'var(--ok2)', borderRadius: 10, padding: '10px 14px', marginTop: 8, marginBottom: 4, border: '1px solid rgba(11,171,100,0.2)' }}>
                <p style={{ fontSize: 12, color: 'var(--ok)', fontWeight: 600 }}>
                  ✓ 저장 후 학부모 앱에 즉시 반영됩니다
                </p>
                <p style={{ fontSize: 11, color: 'var(--ok)', opacity: 0.8, marginTop: 2 }}>
                  학원 로고는 학부모 앱 홈 헤더, 마이페이지, 알림에 표시됩니다.
                </p>
              </div>

              <button className="btn-primary" onClick={handleSaveAcademy}>학원 정보 저장</button>
            </div>
          )}

          {/* ── 탭: 비밀번호 ── */}
          {tab === 'password' && (
            <div>
              <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: '12px 14px', marginBottom: 20, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12, color: 'var(--slate2)', lineHeight: 1.7 }}>
                  🔒 비밀번호는 4자 이상으로 설정해주세요.<br />
                  주기적으로 변경하면 계정 보안을 높일 수 있습니다.
                </p>
              </div>

              {pwErr && (
                <div style={{ background: 'var(--err2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, border: '1px solid rgba(240,68,56,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>⚠️</span>
                  <span style={{ fontSize: 13, color: 'var(--err)' }}>{pwErr}</span>
                </div>
              )}

              <label style={s.label}>현재 비밀번호</label>
              <input className="input-field" type="password" value={curPw} onChange={e => { setCurPw(e.target.value); setPwErr('') }} placeholder="현재 비밀번호 입력" />

              <label style={s.label}>새 비밀번호</label>
              <input className="input-field" type="password" value={newPw} onChange={e => { setNewPw(e.target.value); setPwErr('') }} placeholder="새 비밀번호 (4자 이상)" />

              <label style={s.label}>새 비밀번호 확인</label>
              <input className="input-field" type="password" value={newPw2} onChange={e => { setNewPw2(e.target.value); setPwErr('') }} placeholder="새 비밀번호 재입력" />

              <button className="btn-primary" onClick={handleChangePw}>비밀번호 변경</button>
            </div>
          )}

        </div>

        {/* 계정 삭제 */}
        <div className="sec" style={{ paddingTop: 0 }}>
          <div style={{ background: 'var(--bg1)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate)', marginBottom: 4 }}>계정 탈퇴</div>
            <div style={{ fontSize: 12, color: 'var(--slate3)', marginBottom: 12, lineHeight: 1.6 }}>
              계정을 삭제하면 모든 학원 데이터가 영구적으로 삭제됩니다.
            </div>
            <button
              onClick={() => { if (window.confirm('정말로 계정을 삭제하시겠습니까?\n\n모든 데이터가 복구 불가능하게 삭제됩니다.')) showToast('계정 삭제는 실제 API 연동 후 처리됩니다.') }}
              className="btn-danger"
              style={{ width: 'auto', padding: '8px 18px' }}
            >
              계정 삭제
            </button>
          </div>
        </div>

      </div>
      <Toast toastRef={toastRef} />
    </>
  )
}

const s: Record<string, React.CSSProperties> = {
  label: {
    display: 'block', fontSize: 13, fontWeight: 600,
    color: 'var(--slate2)', marginTop: 14, marginBottom: 6,
  },
  uploadBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 9,
    background: 'var(--acc2)', color: 'var(--acc)',
    border: '1.5px solid var(--acc3)', fontSize: 12, fontWeight: 600,
    cursor: 'pointer',
  },
  removeBtn: {
    padding: '8px 14px', borderRadius: 9,
    background: 'var(--err2)', color: 'var(--err)',
    border: '1px solid rgba(240,68,56,0.2)', fontSize: 12,
    cursor: 'pointer',
  },
}
