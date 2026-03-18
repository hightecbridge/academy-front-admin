// src/components/common/index.tsx
import { useRef } from 'react'
import type { ReactNode, RefObject } from 'react'

/* TopBar: 모바일 .top-bar + PC .pc-topbar  (CSS로 전환) */
interface TopBarProps { title: string; sub?: string; onBack?: () => void; right?: ReactNode }
export function TopBar({ title, sub, onBack, right }: TopBarProps) {
  const Back = () => onBack ? <button className="back-btn" onClick={onBack}><svg viewBox="0 0 24 24" fill="none" stroke="var(--slate2)" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg></button> : null
  const PcBack = () => onBack ? (
    <button className="pc-back-btn" onClick={onBack}>
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>뒤로
    </button>
  ) : null
  return (
    <>
      <div className="top-bar"><Back /><div style={{flex:1}}><div className="top-bar-title">{title}</div>{sub&&<div className="top-bar-sub">{sub}</div>}</div>{right&&<div style={{display:'flex',gap:7}}>{right}</div>}</div>
      <div className="pc-topbar"><PcBack /><span className="pc-page-title">{title}</span>{sub&&<span className="pc-page-sub">{sub}</span>}{right&&<div className="pc-topbar-right">{right}</div>}</div>
    </>
  )
}

/* Breadcrumb */
interface BreadItem { label: string; onClick?: () => void }
export function Breadcrumb({ items }: { items: BreadItem[] }) {
  const crumbs = items.map((it, i) => (
    <span key={i} style={{display:'flex',alignItems:'center',gap:5}}>
      {i<items.length-1?<><span className="bc-item" onClick={it.onClick}>{it.label}</span><span className="bc-sep">›</span></>:<span className="bc-active">{it.label}</span>}
    </span>
  ))
  return (<><div className="breadcrumb">{crumbs}</div><div className="pc-breadcrumb">{crumbs}</div></>)
}

/* TabBar */
interface TabBarProps { tabs: string[]; active: number; onChange: (i: number) => void }
export function TabBar({ tabs, active, onChange }: TabBarProps) {
  return (
    <>
      <div className="tab-bar">{tabs.map((t,i)=><div key={i} className={`tab-item${i===active?' active':''}`} onClick={()=>onChange(i)}>{t}</div>)}</div>
      <div className="pc-tabs">{tabs.map((t,i)=><div key={i} className={`pc-tab${i===active?' active':''}`} onClick={()=>onChange(i)}>{t}</div>)}</div>
    </>
  )
}

/* 나머지 컴포넌트 */
export function IconBtn({ onClick, children }: { onClick?: () => void; children: ReactNode }) { return <button className="icon-btn" onClick={onClick}>{children}</button> }
export function Avatar({ name, col, tc, large }: { name: string; col: string; tc: string; large?: boolean }) { return <div className={`avatar${large?' avatar-lg':''}`} style={{background:col,color:tc}}>{name[0]}</div> }
export function Badge({ cls, children }: { cls: string; children: ReactNode }) { return <span className={`badge ${cls}`}>{children}</span> }
export function ProgBar({ pct, color }: { pct: number; color: string }) { return <div className="prog-bar"><div className="prog-fill" style={{width:`${pct}%`,background:color}}/></div> }
export function ChevronRight() { return <svg style={{width:13,height:13,stroke:'var(--slate3)',fill:'none',strokeWidth:2,strokeLinecap:'round',flexShrink:0}} viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg> }
export function EditIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
export function SearchIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
export function Fab({ onClick }: { onClick: () => void }) { return <button className="fab" onClick={onClick}><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button> }
export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="toggle"><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/><div className="toggle-track"/><div className="toggle-thumb"/></label>
}

let _tt: ReturnType<typeof setTimeout>
export function useToast() {
  const ref = useRef<HTMLDivElement>(null)
  const show = (msg: string) => {
    if (!ref.current) return
    ref.current.textContent = msg; ref.current.classList.add('show')
    clearTimeout(_tt); _tt = setTimeout(()=>ref.current?.classList.remove('show'),2200)
  }
  return { ref: ref as RefObject<HTMLDivElement>, show }
}
export function Toast({ toastRef }: { toastRef: RefObject<HTMLDivElement> }) { return <div className="toast" ref={toastRef}/> }
