// src/pages/notice/NoticePage.tsx
import React, { useEffect, useState, useRef } from 'react'
import { TopBar, TabBar, Fab, useToast, Toast } from '../../components/common'
import { useDataStore } from '../../store/dataStore'
import { useAuthStore } from '../../store/authStore'
import type { NoticeAttachment } from '../../types'

type View = 'list' | 'write' | 'detail'

const MAX_FILES = 10
const MAX_FILE_BYTES = 5 * 1024 * 1024

type DraftFile = NoticeAttachment & { localId: string }

function isImageFile(f: { contentType?: string; fileName?: string; data?: string }) {
  if (f.contentType?.startsWith('image/')) return true
  if (f.data?.startsWith('data:image/')) return true
  const name = (f.fileName ?? '').toLowerCase()
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)
}

function fmtSize(bytes?: number) {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('파일 읽기 실패'))
    reader.readAsDataURL(file)
  })
}

export default function NoticePage() {
  const classes = useDataStore((s) => s.classes)
  const notices = useDataStore((s) => s.notices)
  const noticeTotal = useDataStore((s) => s.noticeTotal)
  const addNotice = useDataStore((s) => s.addNotice)
  const deleteNotice = useDataStore((s) => s.deleteNotice)
  const fetchNotices = useDataStore((s) => s.fetchNotices)
  const isDirector = useAuthStore((s) => s.user?.role === 'admin')
  const { ref: toastRef, show: showToast } = useToast()

  const [view, setView] = useState<View>('list')
  const [tabIdx, setTabIdx] = useState(0)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [q, setQ] = useState('')
  const PAGE_SIZE = 10
  const [pageIdx, setPageIdx] = useState(0)

  useEffect(() => {
    ;(async () => {
      try {
        await fetchNotices(pageIdx, PAGE_SIZE, tabIdx === 0 ? null : tabs[tabIdx], q)
      } catch {
        showToast('공지 목록 조회에 실패했습니다.')
      }
    })()
  }, [fetchNotices, pageIdx, tabIdx, q])

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [targets, setTargets] = useState<string[]>(['전체'])
  const [draftFiles, setDraftFiles] = useState<DraftFile[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const tabs = ['전체', ...classes.map((c) => c.name)]
  const filtered = notices
  const totalPages = Math.max(1, Math.ceil(noticeTotal / PAGE_SIZE))
  const safePageIdx = Math.min(pageIdx, totalPages - 1)
  const pageItems = filtered

  useEffect(() => {
    if (pageIdx !== safePageIdx) setPageIdx(safePageIdx)
  }, [safePageIdx])

  useEffect(() => {
    setPageIdx(0)
  }, [tabIdx, q])

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

  const resetWriteForm = () => {
    setTitle('')
    setBody('')
    setTargets(['전체'])
    setDraftFiles([])
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (picked.length === 0) return

    const remain = MAX_FILES - draftFiles.length
    if (remain <= 0) {
      alert(`첨부파일은 최대 ${MAX_FILES}개까지 등록할 수 있습니다.`)
      return
    }

    const accepted = picked.slice(0, remain)
    if (picked.length > remain) {
      alert(`최대 ${MAX_FILES}개까지 첨부할 수 있어 ${accepted.length}개만 추가합니다.`)
    }

    const next: DraftFile[] = []
    for (const file of accepted) {
      if (file.size > MAX_FILE_BYTES) {
        alert(`"${file.name}"은(는) 5MB를 초과해 제외되었습니다.`)
        continue
      }
      try {
        const data = await readFileAsDataUrl(file)
        next.push({
          localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          fileName: file.name,
          contentType: file.type || undefined,
          sizeBytes: file.size,
          data,
        })
      } catch {
        alert(`"${file.name}" 읽기에 실패했습니다.`)
      }
    }
    if (next.length > 0) setDraftFiles((prev) => [...prev, ...next].slice(0, MAX_FILES))
  }

  const removeDraft = (localId: string) => {
    setDraftFiles((prev) => prev.filter((f) => f.localId !== localId))
  }

  const handleWrite = async () => {
    if (isSaving) return
    if (!title.trim()) { alert('제목을 입력하세요.'); return }
    if (!body.trim()) { alert('내용을 입력하세요.'); return }
    if (draftFiles.length > MAX_FILES) {
      alert(`첨부파일은 최대 ${MAX_FILES}개까지 등록할 수 있습니다.`)
      return
    }
    try {
      setIsSaving(true)
      const files = draftFiles.map((f, i) => ({
        fileName: f.fileName,
        contentType: f.contentType,
        sizeBytes: f.sizeBytes,
        data: f.data,
        sortOrder: i,
      }))
      const firstImage = files.find((f) => isImageFile(f))
      await addNotice({
        title, body, targets,
        files,
        imageUrl: firstImage?.data,
        date: new Date().toISOString().slice(0, 10),
      })
      resetWriteForm()
      setView('list')
      showToast('공지사항이 등록되었습니다.')
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } }
      const msg = ax.response?.data?.message
      alert(msg ?? '공지 저장에 실패했습니다. API 서버를 확인해주세요.')
    } finally {
      setIsSaving(false)
    }
  }

  const openDetail = (id: number) => { setDetailId(id); setView('detail') }
  const detailNotice = notices.find((n) => n.id === detailId)
  const detailFiles = detailNotice?.files?.length
    ? detailNotice.files
    : (detailNotice?.imageUrl
      ? [{ fileName: 'image', contentType: 'image/*', data: detailNotice.imageUrl }]
      : [])

  if (view === 'write') {
    return (
      <>
        <TopBar
          title="공지 작성"
          onBack={() => { resetWriteForm(); setView('list') }}
          right={
            <button
              onClick={() => void handleWrite()}
              disabled={isSaving}
              style={{
                fontSize: 13, fontWeight: 600, padding: '6px 14px',
                background: 'var(--acc)', color: '#fff', border: 'none',
                borderRadius: 8, cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.6 : 1,
              }}
            >
              {isSaving ? '등록 중...' : '등록'}
            </button>
          }
        />
        <div className="page-content-body">
          <div className="sec">
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
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
              {targets.map((t) => (
                <span key={t} className={`badge ${clsBadge(t)}`}>{t}</span>
              ))}
              <span style={{ fontSize: 12, color: 'var(--slate2)', alignSelf: 'center' }}>에게 발송됩니다</span>
            </div>

            <div className="divider" />

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

            <label className="input-label">파일 첨부 (최대 {MAX_FILES}개)</label>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx,.txt,.zip"
              style={{ display: 'none' }}
              onChange={(e) => void handleFilesSelect(e)}
            />

            {draftFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {draftFiles.map((f) => (
                  <div
                    key={f.localId}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 10,
                      border: '1px solid var(--border)', background: 'var(--bg1)',
                    }}
                  >
                    {isImageFile(f) ? (
                      <img
                        src={f.data}
                        alt=""
                        style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{
                        width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                        background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800, color: 'var(--slate2)',
                      }}>
                        FILE
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: 'var(--navy)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {f.fileName}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--slate3)', marginTop: 2 }}>
                        {fmtSize(f.sizeBytes)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDraft(f.localId)}
                      style={{
                        width: 28, height: 28, borderRadius: 8, border: 'none',
                        background: 'var(--bg2)', color: 'var(--err)', fontWeight: 800, cursor: 'pointer',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {draftFiles.length < MAX_FILES ? (
              <button
                type="button"
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
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                <span style={{ fontSize: 13, color: 'var(--slate3)' }}>
                  파일 추가 ({draftFiles.length}/{MAX_FILES}) · 개당 최대 5MB
                </span>
              </button>
            ) : (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--slate2)', textAlign: 'center' }}>
                첨부 한도 {MAX_FILES}개에 도달했습니다.
              </div>
            )}

            <button className="btn-primary" onClick={() => void handleWrite()} disabled={isSaving} style={{ opacity: isSaving ? 0.6 : 1 }}>
              {isSaving ? '등록 중...' : '공지 등록하기'}
            </button>
            <button className="btn-secondary" onClick={() => { resetWriteForm(); setView('list') }}>취소</button>
          </div>
        </div>
        <Toast toastRef={toastRef} />
      </>
    )
  }

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
                  void deleteNotice(detailNotice.id)
                  void fetchNotices()
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
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
              {detailNotice.targets.map((t) => (
                <span key={t} className={`badge ${clsBadge(t)}`}>{t}</span>
              ))}
              <span style={{ fontSize: 11, color: 'var(--slate3)', alignSelf: 'center' }}>· {detailNotice.date}</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 12, lineHeight: 1.4 }}>
              {detailNotice.title}
            </div>
            <div style={{
              fontSize: 14, color: 'var(--slate)', lineHeight: 1.8,
              whiteSpace: 'pre-wrap', marginBottom: 16,
            }}>
              {detailNotice.body}
            </div>

            {detailFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
                  첨부파일 {detailFiles.length}개
                </div>
                {detailFiles.map((f, i) => (
                  <div key={f.id ?? `${f.fileName}-${i}`}>
                    {isImageFile(f) ? (
                      <img
                        src={f.data}
                        alt={f.fileName}
                        style={{ width: '100%', borderRadius: 10, border: '0.5px solid var(--border)' }}
                      />
                    ) : (
                      <a
                        href={f.data}
                        download={f.fileName}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '12px 14px', borderRadius: 10,
                          border: '1px solid var(--border)', background: 'var(--bg1)',
                          textDecoration: 'none', color: 'var(--navy)',
                        }}
                      >
                        <span style={{
                          width: 36, height: 36, borderRadius: 8, background: 'var(--acc2)',
                          color: 'var(--acc)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 800,
                        }}>
                          FILE
                        </span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{f.fileName}</span>
                        <span style={{ fontSize: 11, color: 'var(--slate3)' }}>{fmtSize(f.sizeBytes)}</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <Toast toastRef={toastRef} />
      </>
    )
  }

  return (
    <>
      <TopBar title="공지사항" sub={`총 ${noticeTotal}건`} />
      <TabBar tabs={tabs} active={tabIdx} onChange={setTabIdx} />

      <div className="page-content-body">
        <div className="sec">
          <input
            className="input-field"
            placeholder="제목/내용/대상 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--slate3)', fontSize: 13 }}>
              {noticeTotal === 0 ? '공지사항이 없습니다' : '현재 페이지에 표시할 공지가 없습니다'}
            </div>
          )}
          {pageItems.map((n) => {
            const files = n.files?.length
              ? n.files
              : (n.imageUrl ? [{ fileName: 'image', data: n.imageUrl, contentType: 'image/*' }] : [])
            const thumb = files.find((f) => isImageFile(f))
            return (
              <div
                key={n.id}
                className="card"
                style={{ marginBottom: 8, cursor: 'pointer' }}
                onClick={() => openDetail(n.id)}
              >
                {thumb?.data && (
                  <img
                    src={thumb.data}
                    alt=""
                    style={{
                      width: '100%', height: 120, objectFit: 'cover',
                      borderRadius: '14px 14px 0 0',
                    }}
                  />
                )}
                <div style={{ padding: '13px 16px' }}>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 7, alignItems: 'center' }}>
                    {n.targets.map((t) => (
                      <span key={t} className={`badge ${clsBadge(t)}`} style={{ fontSize: 10 }}>{t}</span>
                    ))}
                    {files.length > 0 && (
                      <span className="badge badge-gray" style={{ fontSize: 10 }}>첨부 {files.length}</span>
                    )}
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
            )
          })}

          {noticeTotal > 0 && totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14, alignItems: 'center' }}>
              <button
                className="btn-secondary"
                onClick={() => setPageIdx((p) => Math.max(0, p - 1))}
                disabled={safePageIdx === 0}
                style={{ opacity: safePageIdx === 0 ? 0.6 : 1 }}
              >
                이전
              </button>

              {(() => {
                const windowSize = 5
                let start = Math.max(0, safePageIdx - Math.floor(windowSize / 2))
                let end = Math.min(totalPages - 1, start + windowSize - 1)
                start = Math.max(0, end - windowSize + 1)

                const pages: number[] = []
                for (let i = start; i <= end; i++) pages.push(i)

                return (
                  <>
                    {start > 0 && (
                      <>
                        <button
                          className="btn-secondary"
                          onClick={() => setPageIdx(0)}
                          style={{ opacity: safePageIdx === 0 ? 0.65 : 1, minWidth: 38 }}
                        >
                          1
                        </button>
                        {start > 1 && <span style={{ color: 'var(--slate3)', padding: '0 6px' }}>…</span>}
                      </>
                    )}

                    {pages.map((p) => (
                      <button
                        key={p}
                        className={p === safePageIdx ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => setPageIdx(p)}
                        style={{ minWidth: 38, opacity: p === safePageIdx ? 1 : 0.9 }}
                      >
                        {p + 1}
                      </button>
                    ))}

                    {end < totalPages - 1 && (
                      <>
                        {end < totalPages - 2 && <span style={{ color: 'var(--slate3)', padding: '0 6px' }}>…</span>}
                        <button
                          className="btn-secondary"
                          onClick={() => setPageIdx(totalPages - 1)}
                          style={{ opacity: safePageIdx === totalPages - 1 ? 0.65 : 1, minWidth: 38 }}
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </>
                )
              })()}

              <button
                className="btn-secondary"
                onClick={() => setPageIdx((p) => Math.min(totalPages - 1, p + 1))}
                disabled={safePageIdx >= totalPages - 1}
                style={{ opacity: safePageIdx >= totalPages - 1 ? 0.6 : 1 }}
              >
                다음
              </button>
            </div>
          )}
        </div>
      </div>
      {isDirector && <Fab onClick={() => { resetWriteForm(); setView('write') }} />}
      <Toast toastRef={toastRef} />
    </>
  )
}
