import React from 'react'
import { G } from '../constants/theme'
import { haptic } from '../utils/haptic'

interface CardProps {
  children: React.ReactNode
  style?: React.CSSProperties
}

export const Card: React.FC<CardProps> = ({ children, style }) => (
  <div className="glass-panel" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, borderRadius: 14, ...style }}>
    {children}
  </div>
)

interface CardTitleProps {
  children: React.ReactNode
  color?: string
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, color = G.or }) => (
  <div className="title-font" style={{ fontSize: 17, fontWeight: 700, color, letterSpacing: 0.5, marginBottom: 10 }}>
    {children}
  </div>
)

export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, color: G.t2, letterSpacing: 0.5, marginBottom: 5 }}>
    {children}
  </div>
)

export const FormRow: React.FC<{ label?: string, children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <Label>{label}</Label>}
    {children}
  </div>
)

interface ChipProps {
  children: React.ReactNode
  bg?: string
  color?: string
  bd?: string
  style?: React.CSSProperties
}

export const Chip: React.FC<ChipProps> = ({ children, bg = 'rgba(255,255,255,0.1)', color = '#fff', bd = 'transparent', style }) => (
  <span style={{
    background: bg,
    color,
    border: `1px solid ${bd}`,
    padding: '2px 8px',
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "'Barlow Condensed',sans-serif",
    letterSpacing: 0.5,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    ...style
  }}>
    {children}
  </span>
)

interface TypeTabsProps {
  types: { id: string, name: string, color?: string }[]
  active: string
  onSelect: (id: string) => void
}

export const TypeTabs: React.FC<TypeTabsProps> = ({ types, active, onSelect }) => (
  <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '2px 0 8px', scrollbarWidth: 'none' }}>
    {types.map(t => (
      <button
        key={t.id}
        onClick={() => { haptic(40); onSelect(t.id); }}
        style={{
          flex: '0 0 auto', padding: '8px 14px', borderRadius: 10,
          background: active === t.id ? (t.color || G.or) : G.card,
          color: active === t.id ? (t.color === G.yw ? '#000' : '#fff') : G.t2,
          border: `1px solid ${active === t.id ? 'transparent' : G.b1}`,
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 0.5, cursor: 'pointer', transition: '.2s'
        }}
      >
        {t.name}
      </button>
    ))}
  </div>
)

interface QtySelectorProps {
  value: number
  onChange: (val: number) => void
  min?: number
  max?: number
}

export const QtySelector: React.FC<QtySelectorProps> = ({ value, onChange, min = 0, max = 999 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: G.b1, padding: 4, borderRadius: 10, border: `1px solid ${G.b2}` }}>
    <button 
      disabled={value <= min}
      onClick={() => { haptic(40); onChange(Math.max(min, value - 1)); }}
      style={{ width: 34, height: 34, borderRadius: 8, background: G.card, color: G.t1, fontSize: 18, border: 'none', cursor: 'pointer', opacity: value <= min ? 0.3 : 1 }}
    >-</button>
    <span className="mono-font" style={{ fontSize: 16, fontWeight: 700, width: 24, textAlign: 'center' }}>{value}</span>
    <button 
      disabled={value >= max}
      onClick={() => { haptic(40); onChange(Math.min(max, value + 1)); }}
      style={{ width: 34, height: 34, borderRadius: 8, background: G.card, color: G.t1, fontSize: 18, border: 'none', cursor: 'pointer', opacity: value >= max ? 0.3 : 1 }}
    >+</button>
  </div>
)

interface QtyBtnProps {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}

export const QtyBtn: React.FC<QtyBtnProps> = ({ onClick, disabled = false, children }) => (
  <button 
    disabled={disabled}
    onClick={() => { haptic(40); onClick(); }}
    style={{ 
      width: 44, height: 44, borderRadius: 12, background: G.b1, color: G.t1, 
      fontSize: 22, border: `1px solid ${G.b2}`, cursor: 'pointer', opacity: disabled ? 0.3 : 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}
  >
    {children}
  </button>
)

interface SubmitBtnProps {
  children: React.ReactNode
  onClick: (e: React.MouseEvent) => void
  color?: string
  disabled?: boolean
  busy?: boolean
}

export const SubmitBtn: React.FC<SubmitBtnProps> = ({ children, onClick, color = G.or, disabled = false, busy = false }) => (
  <button 
    onClick={(e) => { haptic(60); onClick(e); }} 
    disabled={disabled || busy}
    style={{ 
      width: '100%', padding: '15px 0', background: (disabled || busy) ? G.b1 : color, 
      color: (disabled || busy) ? G.t2 : (color === G.yw ? '#000' : '#fff'), 
      border: 'none', borderRadius: 14, fontFamily: "'Barlow Condensed',sans-serif", 
      fontSize: 15, fontWeight: 700, letterSpacing: 0.5, marginTop: 10, 
      cursor: (disabled || busy) ? 'not-allowed' : 'pointer', opacity: (disabled || busy) ? 0.5 : 1, transition: '.15s',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
    }}
  >
    {busy && (
      <div style={{ 
        width: 14, height: 14, border: `2px solid currentColor`, 
        borderTopColor: 'transparent', borderRadius: '50%', 
        animation: 'pulse 1s infinite linear' 
      }} />
    )}
    {children}
  </button>
)

interface ModalProps {
  children: React.ReactNode
  onClose: () => void
  isOpen: boolean
  title?: string
}

export const Modal: React.FC<ModalProps> = ({ children, onClose, isOpen, title }) => {
  if (!isOpen) return null
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 500, padding: `0 0 env(safe-area-inset-bottom,0)` }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.card, border: `1px solid ${G.b1}`, borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', animation: 'fadeIn 0.25s ease' }}>
        <div style={{ width: 40, height: 4, background: G.b2, borderRadius: 2, margin: '0 auto 20px' }} />
        {title && <div className="title-font" style={{ fontSize: 18, fontWeight: 700, marginBottom: 18, color: G.t1 }}>{title}</div>}
        {children}
      </div>
    </div>
  )
}

interface ConfirmModalProps {
  title: string
  body: string
  onYes: () => void
  onNo: () => void
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ title, body, onYes, onNo }) => (
  <Modal onClose={onNo} isOpen={true}>
    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 19, fontWeight: 700, marginBottom: 10, color: G.t1 }}>{title}</div>
    <div style={{ color: G.t2, fontSize: 13, lineHeight: 1.7, marginBottom: 18 }}>{body}</div>
    <div style={{ display: 'flex', gap: 10 }}>
      <button onClick={onNo} style={{ flex: 1, padding: 14, background: G.b1, color: G.t2, border: `1px solid ${G.b2}`, borderRadius: 12, fontFamily: "'Fira Code',monospace", fontSize: 14, cursor: 'pointer' }}>✕ Скасувати</button>
      <button onClick={() => { haptic(80); onYes(); }} style={{ flex: 1, padding: 14, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 12, fontFamily: "'Fira Code',monospace", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>✓ Підтвердити</button>
    </div>
  </Modal>
)
