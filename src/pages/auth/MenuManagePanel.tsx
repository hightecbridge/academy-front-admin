import { useEffect, useState } from 'react'
import client from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { Toggle } from '../../components/common'
import {
  MENU_CATALOG,
  resolveMenuSettings,
  type MenuSettingsMap,
} from '../../config/menuCatalog'

export default function MenuManagePanel({ onToast }: { onToast: (msg: string) => void }) {
  const user = useAuthStore((s) => s.user)
  const updateMenuSettings = useAuthStore((s) => s.updateMenuSettings)
  const [menus, setMenus] = useState<MenuSettingsMap>(() => resolveMenuSettings(user?.menuSettings))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    void client.get('/admin/menu-settings')
      .then((res) => {
        if (cancelled) return
        setMenus(resolveMenuSettings(res.data.data))
      })
      .catch(() => {
        if (!cancelled) setMenus(resolveMenuSettings(user?.menuSettings))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [user?.menuSettings])

  const setFlag = (key: string, patch: Partial<{ enabled: boolean; parentVisible: boolean }>) => {
    setMenus((prev) => {
      const current = prev[key] ?? { enabled: true, parentVisible: false }
      const next = { ...current, ...patch }
      if (next.enabled === false) next.parentVisible = current.parentVisible
      return { ...prev, [key]: next }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    const ok = await updateMenuSettings(menus)
    setSaving(false)
    onToast(ok ? '메뉴 설정이 저장되었습니다. 관리자·학부모 화면에 바로 반영됩니다.' : '저장에 실패했습니다. 다시 시도해주세요.')
  }

  if (loading) {
    return <div style={{ fontSize: 13, color: 'var(--slate3)', padding: '12px 0' }}>메뉴 설정을 불러오는 중…</div>
  }

  const groups = ['관리', '운영'] as const

  return (
    <div>
      <div style={{
        background: 'var(--bg3)', borderRadius: 12, padding: '12px 14px',
        marginBottom: 16, border: '1px solid var(--border)',
      }}>
        <p style={{ fontSize: 12, color: 'var(--slate2)', lineHeight: 1.7 }}>
          미사용으로 두면 관리자 사이트와 학부모 앱에서 해당 메뉴가 보이지 않습니다.<br />
          사용 중이더라도 학부모 노출을 끄면 학부모 앱에만 숨겨집니다.
        </p>
      </div>

      {groups.map((group) => (
        <div key={group} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate2)', marginBottom: 8 }}>{group}</div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 72px 88px',
              gap: 8,
              padding: '8px 14px',
              background: 'var(--bg3)',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--slate3)',
            }}>
              <span>메뉴 / 기능</span>
              <span style={{ textAlign: 'center' }}>사용</span>
              <span style={{ textAlign: 'center' }}>학부모 노출</span>
            </div>
            {MENU_CATALOG.filter((item) => item.group === group).map((item, i) => {
              const flag = menus[item.key] ?? { enabled: true, parentVisible: !!item.parentLabel }
              const unused = !flag.enabled
              return (
                <div
                  key={item.key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 72px 88px',
                    gap: 8,
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                    background: unused ? 'var(--bg2)' : 'var(--bg1)',
                    opacity: unused ? 0.72 : 1,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--slate3)', marginTop: 2, lineHeight: 1.5 }}>
                      {item.hint}
                      {item.parentLabel ? ` · 학부모: ${item.parentLabel}` : ' · 관리자 전용'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Toggle checked={flag.enabled} onChange={(v) => setFlag(item.key, { enabled: v })} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', opacity: !item.parentLabel || unused ? 0.35 : 1 }}>
                    {item.parentLabel ? (
                      <Toggle
                        checked={flag.enabled && flag.parentVisible}
                        onChange={(v) => {
                          if (!flag.enabled) return
                          setFlag(item.key, { parentVisible: v })
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--slate3)' }}>-</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <button className="btn-primary" onClick={() => void handleSave()} disabled={saving}>
        {saving ? '저장 중…' : '메뉴 설정 저장'}
      </button>
    </div>
  )
}
