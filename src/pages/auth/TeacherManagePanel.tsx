import { useCallback, useEffect, useMemo, useState } from 'react'
import client from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { useDataStore } from '../../store/dataStore'

export type TeacherRow = {
  id: number
  handle: string
  loginId: string
  name: string
  phone?: string
  classrooms: { id: number; name: string }[]
  createdAt?: string
}

type FormState = {
  handle: string
  name: string
  phone: string
  password: string
  classroomIds: number[]
}

const emptyForm = (): FormState => ({
  handle: '',
  name: '',
  phone: '',
  password: '',
  classroomIds: [],
})

export default function TeacherManagePanel({ onToast }: { onToast: (msg: string) => void }) {
  const user = useAuthStore((s) => s.user)
  const classes = useDataStore((s) => s.classes)
  const fetchClasses = useDataStore((s) => s.fetchClasses)

  const [teachers, setTeachers] = useState<TeacherRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [preview, setPreview] = useState('')
  const [saving, setSaving] = useState(false)

  const suffix = useMemo(
    () => (user?.email ? user.email.trim().toLowerCase().replace('@', '.') : ''),
    [user?.email],
  )

  const loadTeachers = useCallback(async () => {
    const res = await client.get('/admin/teachers')
    setTeachers((res.data.data ?? []) as TeacherRow[])
  }, [])

  useEffect(() => {
    void fetchClasses()
    void loadTeachers().finally(() => setLoading(false))
  }, [fetchClasses, loadTeachers])

  useEffect(() => {
    const handle = form.handle.trim().toLowerCase()
    setPreview(handle && suffix ? `${handle}.${suffix}` : suffix)
  }, [form.handle, suffix])

  const openNew = () => {
    setEditingId('new')
    setForm(emptyForm())
  }

  const openEdit = (t: TeacherRow) => {
    setEditingId(t.id)
    setForm({
      handle: t.handle,
      name: t.name,
      phone: t.phone ?? '',
      password: '',
      classroomIds: t.classrooms.map((c) => c.id),
    })
  }

  const toggleClass = (cid: number) => {
    setForm((f) => ({
      ...f,
      classroomIds: f.classroomIds.includes(cid)
        ? f.classroomIds.filter((id) => id !== cid)
        : [...f.classroomIds, cid],
    }))
  }

  const save = async () => {
    if (!form.name.trim()) { onToast('교사 이름을 입력하세요.'); return }
    if (editingId === 'new' && !form.handle.trim()) { onToast('교사 아이디를 입력하세요.'); return }
    if (editingId === 'new' && form.password.length < 4) { onToast('비밀번호는 4자 이상이어야 합니다.'); return }
    if (editingId !== 'new' && form.password && form.password.length < 4) {
      onToast('비밀번호는 4자 이상이어야 합니다.')
      return
    }
    setSaving(true)
    try {
      if (editingId === 'new') {
        await client.post('/admin/teachers', {
          handle: form.handle.trim(),
          name: form.name.trim(),
          phone: form.phone.trim() || undefined,
          password: form.password,
          classroomIds: form.classroomIds,
        })
        onToast('교사 계정이 생성되었습니다.')
      } else if (typeof editingId === 'number') {
        await client.put(`/admin/teachers/${editingId}`, {
          handle: form.handle.trim() || undefined,
          name: form.name.trim(),
          phone: form.phone,
          password: form.password || undefined,
          classroomIds: form.classroomIds,
        })
        onToast('교사 정보가 저장되었습니다.')
      }
      setEditingId(null)
      await loadTeachers()
      await fetchClasses()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      onToast(err.response?.data?.message ?? '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (t: TeacherRow) => {
    if (!window.confirm(`${t.name} 교사 계정을 삭제할까요?\n담당 반은 해제되고, 로그인은 즉시 불가합니다.`)) return
    try {
      await client.delete(`/admin/teachers/${t.id}`)
      onToast('교사 계정이 삭제되었습니다.')
      if (editingId === t.id) setEditingId(null)
      await loadTeachers()
      await fetchClasses()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      onToast(err.response?.data?.message ?? '삭제에 실패했습니다.')
    }
  }

  if (loading) {
    return <p style={{ fontSize: 13, color: 'var(--slate2)' }}>교사 목록을 불러오는 중…</p>
  }

  return (
    <div>
      <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: '12px 14px', marginBottom: 16, border: '1px solid var(--border)' }}>
        <p style={{ fontSize: 12, color: 'var(--slate2)', lineHeight: 1.7 }}>
          원장이 교사 아이디·비밀번호를 만들고 담당 반을 지정합니다.<br />
          로그인 아이디는 원장 이메일에 교사 아이디를 붙입니다.
          {suffix && <> 예: <b>judy.{suffix}</b></>}
        </p>
      </div>

      {editingId == null ? (
        <>
          {teachers.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--slate3)', textAlign: 'center', padding: '24px 0' }}>
              등록된 교사가 없습니다.
            </p>
          )}
          {teachers.map((t) => (
            <div key={t.id} style={{
              border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 10,
              background: 'var(--bg1)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--acc)', marginTop: 3, wordBreak: 'break-all' }}>{t.loginId}</div>
                  {t.phone && <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 2 }}>{t.phone}</div>}
                  <div style={{ fontSize: 12, color: 'var(--slate2)', marginTop: 6 }}>
                    담당 반: {t.classrooms.length ? t.classrooms.map((c) => c.name).join(', ') : '없음'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '6px 12px' }} onClick={() => openEdit(t)}>수정</button>
                  <button type="button" className="btn-danger" style={{ width: 'auto', padding: '6px 12px' }} onClick={() => void remove(t)}>삭제</button>
                </div>
              </div>
            </div>
          ))}
          <button className="btn-primary" onClick={openNew}>교사 계정 추가</button>
        </>
      ) : (
        <div>
          <label style={labelStyle}>교사 이름 *</label>
          <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="김선생" />

          <label style={labelStyle}>교사 아이디 *</label>
          <input
            className="input-field"
            value={form.handle}
            onChange={(e) => setForm({ ...form, handle: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })}
            placeholder="judy"
            autoCapitalize="none"
          />
          <p style={{ fontSize: 11, color: 'var(--slate3)', marginTop: 4 }}>영문 소문자·숫자·하이픈. 로그인 아이디: <b>{preview || '-'}</b></p>

          <label style={labelStyle}>연락처</label>
          <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="010-0000-0000" />

          <label style={labelStyle}>{editingId === 'new' ? '비밀번호 *' : '비밀번호 재설정'}</label>
          <input
            className="input-field"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={editingId === 'new' ? '4자 이상' : '변경할 때만 입력'}
          />

          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate2)', marginTop: 16, marginBottom: 8 }}>담당 반</div>
          {classes.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--slate3)' }}>먼저 클래스를 등록하면 담당 반을 지정할 수 있습니다.</p>
          ) : (
            classes.map((cls) => {
              const checked = form.classroomIds.includes(cls.cid)
              return (
                <label key={cls.cid} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                  borderBottom: '1px solid var(--border)', cursor: 'pointer',
                }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleClass(cls.cid)} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{cls.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--slate3)' }}>{cls.subject}</span>
                </label>
              )
            })
          )}

          <button className="btn-primary" onClick={() => void save()} disabled={saving}>
            {saving ? '저장 중…' : editingId === 'new' ? '교사 생성' : '저장'}
          </button>
          <button className="btn-secondary" onClick={() => setEditingId(null)}>취소</button>
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: 'var(--slate2)', marginTop: 14, marginBottom: 6,
}
