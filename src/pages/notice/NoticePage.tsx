// src/pages/notice/NoticePage.tsx
import React, { useState, useRef } from 'react'
import { TopBar, TabBar, Badge, Fab, useToast, Toast } from '../../components/common'
import { useDataStore } from '../../store/dataStore'

type View = 'list' | 'write' | 'detail'

export default function NoticePage() {
  const classes = useDataStore((s) => s.classes)
  const notices = useDataStore((s) => s.notices)
  const addNotice = useDataStore((s) => s.addNotice)
  const deleteNotice = useDataStore((s) => s.deleteNotice)
  const { ref: toastRef, show: showToast } = useToast()

  const [view, setView] = useState<View>('list')
  const [tabIdx, setTabIdx] = useState(0)
  const [detailId, setDetailId] = useState<number | null>(null)

  // 작성 폼 상태
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [targets, setTargets] = useState<string[]>(['전체'])
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const tabs = ['전체', ...classes.map((c) => c.name)]
  const filter = tabIdx === 0 ? null : tabs[tabIdx]

  // 공지 필터 — targets 배열에 filter 값이 포함되어 있거나 '전체' 포함
  const filtered = filter
    ? notices.filter((n) => n.targets.includes(filter) || n.targets.includes('전체'))
    : notices

  const clsBadge = (target: string) => {
    if (target === '전체') return 'badge-gray'
    const cls = classes.find((c) => c.name === target)
    if (!cls) return 'badge-gray'
    if (cls.color === '#DBEAFE') return 'badge-blue'
    if (cls.color === '#D1FAE5') return 'badge-green'
    if (cls.color === '#EDE9FE') return 'badge-purple'
    if (cls.color === '#FEE2E2') return 'badge-red'
    if (cls.color === '#FEF3C7') return 'badge-amber'
    return 'badge-gray'
  }

  // 반 대상 토글 (중복 선택 가능)
  const toggleTarget = (name: string) => {
    if (name === '전체') {
      setTargets(['전체'])
      return
    }
    setTargets((prev) => {
      const without전체 = prev.filter((t) => t !== '전체')
      if (without전체.includes(name)) {
        const next = without전체.filter((t) => t !== name)
        return next.length === 0 ? ['전체'] : next
      }
      return [...without전체, name]
    })
  }

  // 이미지 선택
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('5MB 이하 이미지만 첨부 가능합니다.')
      return
    }
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleWrite = () => {
    if (!title.trim()) { alert('제목을 입력하세요.'); return }
    if (!body.trim()) { alert('내용을 입력하세요.'); return }
    addNotice({
      title, body, targets,
      imageUrl: imagePreview ?? undefined,
      date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace('.', ''),
    })
    // 초기화
    setTitle(''); setBody(''); setTargets(['전체'])
    setImagePreview(null); setImageFile(null)
    setView('list')
    showToast('공지사항이 등록되었습니다.')
  }

  const openDetail = (id: number) => { setDetailId(id); setView('detail') }
  const detailNotice = notices.find((n) => n.id === detailId)

  // ── 공지 작성 화면 ──────────────────────────────────────
  if (view === 'write') {
    return (
      <>
        <TopBar
          title="공지 작성"
          onBack={() => setView('list')}
          right={
            <button
              onClick={handleWrite}
              style={{
                fontSize: 13, fontWeight: 600, padding: '6px 14px',
                background: 'var(--acc)', color: '#fff', border: 'none',
                borderRadius: 8, cursor: 'pointer',
              }}
            >
              등록
            </button>
          }
        />
        <div className="page-content-body">
          <div className="sec">

            {/* 대상 반 선택 — 중복 선택 */}
            <div className="sec-title">발송 대상 (중복 선택 가능)</div>
            <div className="chip-row" style={{ marginTop: 0 }}>
              <div
                className={`chip${targets.includes('전체') ? ' active' : ''}`}
                onClick={() => toggleTarget('전체')}
              >
                전체
              </div>
              {classes.map((c) => (
                <div
                  key={c.cid}
                  className={`chip${targets.includes(c.name) ? ' active' : ''}`}
                  onClick={() => toggleTarget(c.name)}
                >
                  {c.name}
                </div>
              ))}
            </div>
            {/* 선택된 대상 미리보기 */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
              {targets.map((t) => (
                <span key={t} className={`badge ${clsBadge(t)}`}>{t}</span>
              ))}
              <span style={{ fontSize: 12, color: 'var(--slate2)', alignSelf: 'center' }}>에게 발송됩니다</span>
            </div>

            <div className="divider" />

            {/* 제목 */}
            <label className="input-label" style={{ marginTop: 0 }}>제목 *</label>
            <input
              className="input-field"
              placeholder="공지사항 제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--slate3)', marginTop: 3 }}>
              {title.length}/100
            </div>

            {/* 내용 */}
            <label className="input-label">내용 *</label>
            <textarea
              className="input-field"
              style={{ height: 140 }}
              placeholder="공지 내용을 입력하세요"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={1000}
            />
            <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--slate3)', marginTop: 3 }}>
              {body.length}/1000
            </div>

            {/* 이미지 첨부 */}
            <label className="input-label">이미지 첨부 (선택)</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageSelect}
            />

            {imagePreview ? (
              <div style={{ marginTop: 8, position: 'relative' }}>
                <img
                  src={imagePreview}
                  alt="첨부 이미지"
                  style={{
                    width: '100%', borderRadius: 10, border: '0.5px solid var(--border)',
                    maxHeight: 200, objectFit: 'cover',
                  }}
                />
                <button
                  onClick={() => { setImagePreview(null); setImageFile(null); if (fileRef.current) fileRef.current.value = '' }}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.55)', border: 'none',
                    color: '#fff', fontSize: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ×
                </button>
                <div style={{ fontSize: 11, color: 'var(--slate3)', marginTop: 4 }}>
                  {imageFile?.name} · {imageFile ? (imageFile.size / 1024).toFixed(0) : 0}KB
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  marginTop: 8, width: '100%', padding: '14px 0',
                  border: '1.5px dashed var(--border)', borderRadius: 10,
                  background: 'var(--bg2)', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <svg style={{ width: 24, height: 24, stroke: 'var(--slate3)', fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round' }} viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span style={{ fontSize: 13, color: 'var(--slate3)' }}>이미지 선택 (최대 5MB)</span>
              </button>
            )}

            <button className="btn-primary" onClick={handleWrite}>공지 등록하기</button>
            <button className="btn-secondary" onClick={() => setView('list')}>취소</button>
          </div>
        </div>
        <Toast toastRef={toastRef} />
      </>
    )
  }

  // ── 공지 상세 화면 ──────────────────────────────────────
  if (view === 'detail' && detailNotice) {
    return (
      <>
        <TopBar
          title="공지 상세"
          onBack={() => setView('list')}
          right={
            <button
              className="icon-btn"
              onClick={() => {
                if (window.confirm('이 공지사항을 삭제하시겠습니까?')) {
                  deleteNotice(detailNotice.id)
                  setView('list')
                  showToast('삭제되었습니다.')
                }
              }}
            >
              <svg viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
              </svg>
            </button>
          }
        />
        <div className="page-content-body">
          <div className="sec">
            {/* 대상 뱃지 */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
              {detailNotice.targets.map((t) => (
                <span key={t} className={`badge ${clsBadge(t)}`}>{t}</span>
              ))}
              <span style={{ fontSize: 11, color: 'var(--slate3)', alignSelf: 'center' }}>· {detailNotice.date}</span>
            </div>
            {/* 제목 */}
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 12, lineHeight: 1.4 }}>
              {detailNotice.title}
            </div>
            {/* 내용 */}
            <div style={{
              fontSize: 14, color: 'var(--slate)', lineHeight: 1.8,
              whiteSpace: 'pre-wrap', marginBottom: 16,
            }}>
              {detailNotice.body}
            </div>
            {/* 이미지 */}
            {detailNotice.imageUrl && (
              <img
                src={detailNotice.imageUrl}
                alt="공지 이미지"
                style={{ width: '100%', borderRadius: 10, border: '0.5px solid var(--border)' }}
              />
            )}
          </div>
        </div>
        <Toast toastRef={toastRef} />
      </>
    )
  }

  // ── 공지 목록 화면 ──────────────────────────────────────
  return (
    <>
      <TopBar title="공지사항" sub={`총 ${notices.length}건`} />
      <TabBar tabs={tabs} active={tabIdx} onChange={setTabIdx} />
      
        <div className="page-content-body">
        <div className="sec">
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--slate3)', fontSize: 13 }}>
              공지사항이 없습니다
            </div>
          )}
          {filtered.map((n) => (
            <div
              key={n.id}
              className="card"
              style={{ marginBottom: 8, cursor: 'pointer' }}
              onClick={() => openDetail(n.id)}
            >
              {/* 이미지 썸네일 */}
              {n.imageUrl && (
                <img
                  src={n.imageUrl}
                  alt=""
                  style={{
                    width: '100%', height: 120, objectFit: 'cover',
                    borderRadius: '14px 14px 0 0',
                  }}
                />
              )}
              <div style={{ padding: '13px 16px' }}>
                {/* 대상 뱃지 + 날짜 */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 7, alignItems: 'center' }}>
                  {n.targets.map((t) => (
                    <span key={t} className={`badge ${clsBadge(t)}`} style={{ fontSize: 10 }}>{t}</span>
                  ))}
                  <span style={{ fontSize: 11, color: 'var(--slate3)', marginLeft: 'auto' }}>{n.date}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 5, lineHeight: 1.4 }}>
                  {n.title}
                </div>
                <div style={{
                  fontSize: 12, color: 'var(--slate2)', lineHeight: 1.6,
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {n.body}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Fab onClick={() => { setTitle(''); setBody(''); setTargets(['전체']); setImagePreview(null); setView('write') }} />
      <Toast toastRef={toastRef} />
    </>
  )
}
