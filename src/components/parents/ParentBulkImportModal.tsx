import { useRef, useState } from 'react'
import { useDataStore } from '../../store/dataStore'
import {
  downloadParentImportTemplate,
  parseParentImportFile,
  executeParentBulkImport,
  type BulkImportRow,
  type BulkImportResult,
} from '../../utils/parentBulkImport'

type Step = 'guide' | 'preview' | 'done'

export function ParentBulkImportModal({ onClose }: { onClose: () => void }) {
  const students = useDataStore((s) => s.students)
  const classes = useDataStore((s) => s.classes)
  const createStudent = useDataStore((s) => s.createStudent)
  const fetchStudents = useDataStore((s) => s.fetchStudents)

  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('guide')
  const [rows, setRows] = useState<BulkImportRow[]>([])
  const [parseError, setParseError] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<BulkImportResult | null>(null)

  const classNames = classes.map((c) => c.name)
  const errorRows = rows.filter((r) => r.errors.length > 0)
  const okRows = rows.filter((r) => r.errors.length === 0)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setParseError('')
    try {
      const parsed = await parseParentImportFile(file, classes)
      if (parsed.length === 0) {
        setParseError('입력된 데이터 행이 없습니다. 2행부터 작성해 주세요.')
        return
      }
      setRows(parsed)
      setStep('preview')
    } catch (e: unknown) {
      const err = e as Error
      setParseError(err.message ?? '파일을 해석할 수 없습니다.')
    }
  }

  const handleImport = async () => {
    if (okRows.length === 0) return
    setImporting(true)
    try {
      const res = await executeParentBulkImport(okRows, {
        classes,
        createStudent,
      })
      await fetchStudents()
      setResult(res)
      setStep('done')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: 'min(640px, 100%)',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: 18,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>
            학생 Excel 일괄 등록
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'none', fontSize: 22, color: 'var(--slate3)', cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {step === 'guide' && (
          <>
            <div
              style={{
                fontSize: 13,
                color: 'var(--slate)',
                lineHeight: 1.7,
                marginBottom: 14,
                padding: 14,
                borderRadius: 10,
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--navy)' }}>등록 가이드</div>
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                <li><strong>양식 다운로드</strong>로 Excel 파일을 받습니다. (「작성가이드」 시트 참고)</li>
                <li><strong>등록양식</strong> 시트 2행부터 데이터를 입력합니다.</li>
                <li><strong>필수</strong>: 학부모이름, 학부모연락처</li>
                <li><strong>학생 등록</strong> 시: 학생이름·학년·반을 모두 입력합니다.</li>
                <li><strong>학생연락처</strong>는 선택 입력입니다.</li>
                <li><strong>반 이름</strong>은 클래스 메뉴에 등록한 이름과 <strong>완전히 동일</strong>해야 합니다.</li>
                <li><strong>같은 연락처</strong>로 여러 행을 넣으면 한 학부모에 학생이 여러 명 등록됩니다.</li>
                <li>이미 등록된 연락처는 <strong>기존 학부모</strong>에 학생만 추가됩니다.</li>
                <li>재원상태: 재원 / 휴원 / 퇴원 (비우면 재원)</li>
                <li>학년 예: 초등 6, 중등 1, 고등 2</li>
                <li>앱 로그인 초기 비밀번호는 <strong>0000</strong>입니다.</li>
              </ol>
              {classNames.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--slate2)' }}>
                  등록 가능한 반: {classNames.join(', ')}
                </div>
              )}
              {classNames.length === 0 && (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--warn)' }}>
                  반을 먼저 클래스 메뉴에서 등록해 주세요.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1, minWidth: 140 }}
                onClick={() => downloadParentImportTemplate(classNames)}
              >
                양식 다운로드 (.xlsx)
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ flex: 1, minWidth: 140 }}
                onClick={() => fileRef.current?.click()}
              >
                Excel 파일 선택
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={(e) => {
                  void handleFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </div>
            {parseError && (
              <div style={{ fontSize: 12, color: 'var(--err)', marginBottom: 8 }}>{parseError}</div>
            )}
          </>
        )}

        {step === 'preview' && (
          <>
            <div style={{ fontSize: 13, color: 'var(--slate2)', marginBottom: 10 }}>
              총 {rows.length}행 · 등록 가능 {okRows.length}행
              {errorRows.length > 0 && (
                <span style={{ color: 'var(--err)', marginLeft: 8 }}>오류 {errorRows.length}행</span>
              )}
            </div>
            <div style={{ maxHeight: 280, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 12 }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg2)', position: 'sticky', top: 0 }}>
                    {['행', '학부모', '학부모연락처', '학생', '학생연락처', '학년', '반', '상태', '결과'].map((h) => (
                      <th key={h} style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.rowNum} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px' }}>{r.rowNum}</td>
                      <td style={{ padding: '6px' }}>{r.parentName}</td>
                      <td style={{ padding: '6px' }}>{r.phone}</td>
                      <td style={{ padding: '6px' }}>{r.studentName || '—'}</td>
                      <td style={{ padding: '6px' }}>{r.studentPhone || '—'}</td>
                      <td style={{ padding: '6px' }}>{r.grade || '—'}</td>
                      <td style={{ padding: '6px' }}>{r.className || '—'}</td>
                      <td style={{ padding: '6px' }}>{r.status || '재원'}</td>
                      <td style={{ padding: '6px', color: r.errors.length ? 'var(--err)' : 'var(--ok)' }}>
                        {r.errors.length ? r.errors.join(' / ') : 'OK'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => { setStep('guide'); setRows([]) }}>
                다시 선택
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ flex: 2, opacity: okRows.length === 0 || importing ? 0.5 : 1 }}
                disabled={okRows.length === 0 || importing}
                onClick={() => void handleImport()}
              >
                {importing ? '등록 중…' : `${okRows.length}건 등록하기`}
              </button>
            </div>
          </>
        )}

        {step === 'done' && result && (
          <>
            <div
              style={{
                padding: 14,
                borderRadius: 10,
                background: 'var(--ok2)',
                border: '1px solid var(--ok)',
                fontSize: 13,
                lineHeight: 1.7,
                marginBottom: 12,
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>등록이 완료되었습니다</div>
              <div>등록 학생: <strong>{result.studentsCreated}</strong>명</div>
              {result.skipped > 0 && <div>건너뜀(오류 행): {result.skipped}건</div>}
              {result.failures.length > 0 && (
                <div style={{ marginTop: 8, color: 'var(--err)' }}>
                  실패 {result.failures.length}건:
                  <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                    {result.failures.map((f) => (
                      <li key={f.rowNum}>{f.rowNum}행: {f.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button type="button" className="btn-primary" onClick={onClose}>
              확인
            </button>
          </>
        )}
      </div>
    </div>
  )
}
