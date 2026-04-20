import React, { useState, useEffect, useCallback, useRef, useMemo, forwardRef } from 'react'
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useSwipeable } from 'react-swipeable'
import { gasCall } from './api.js'
import { useStore } from './store.js'
import AdFreeRockPlayer from './RockRadio.jsx'

// ─── Кольори ─────────────────────────────────────────────
const G = {
  bg: '#0a0f1a', card: '#111827', card2: '#0f172a',
  b1: '#1f2937', b2: '#374151', t1: '#e5e7eb', t2: '#6b7280',
  or: '#f97316', cy: '#06b6d4', gn: '#22c55e', pu: '#a78bfa',
  rd: '#f87171', yw: '#fbbf24',
}

// getWorkerColor переміщено в AppInner, щоб мати доступ до workers.color

const GLOBAL_CSS = `
* { box-sizing: border-box; }
@keyframes slideUp{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
input,select,textarea{background:#0f172a;border:1px solid #374151;color:#e5e7eb;border-radius:8px;padding:8px 12px;font-family:'Fira Code',monospace;font-size:14px;outline:none;width:100%;transition:border-color .15s}
input[type="radio"], input[type="checkbox"]{width:auto;padding:0;background:transparent;border:none}
textarea{resize:vertical;min-height:80px}
input:focus,select:focus,textarea:focus{border-color:#f97316}
select option{background:#1f2937}
html,body{height:100%;height:100dvh;margin:0;background:#0a0f1a url('/logo.jpg') center center / cover no-repeat fixed; overflow-x: hidden; width: 100%;}
#root{height:100%;height:100dvh;width: 100%; display:flex;flex-direction:column;background:rgba(10,15,26,0.88);position:relative;overflow:hidden;}
.page-scroll{flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;transition:transform 0.15s ease-out; width: 100%;}
.tab-nav::-webkit-scrollbar{display:none;}
.tab-nav{scrollbar-width:none;}
@media (min-width: 850px) { .tab-nav { justify-content: center; max-width: 100% !important; } }
`

const ADMIN_PIN = '1234'
const AUTH_KEY = 'zc_auth'

const sendTelegram = async (text) => {
  try {
    const plain = text.replace(/<[^>]*>/g, '')
    await gasCall('sendTelegram', [plain])
  } catch (e) { console.warn('TG error:', e) }
}

const todayStr = () => new Date().toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })
const nowStr = () => new Date().toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const uid = () => String(Date.now()) + String(Math.floor(Math.random() * 9999))
const num = v => parseFloat(v) || 0
const haptic = (ms = 15) => {
  try {
    if (window.navigator?.vibrate) {
      window.navigator.vibrate([ms])
    }
  } catch (e) { }
}

// ════════════════════════════════════════════════════════
//  UI АТОМИ
// ════════════════════════════════════════════════════════
const Label = ({ children }) =>
  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, color: G.t2, letterSpacing: .5, marginBottom: 5 }}>{children}</div>
const FormRow = ({ label, children }) =>
  <div style={{ marginBottom: 12 }}>{label && <Label>{label}</Label>}{children}</div>
const Card = ({ children, style = {} }) =>
  <div style={{ background: G.card, border: `1px solid ${G.b1}`, borderRadius: 14, padding: 14, marginBottom: 10, ...style }}>{children}</div>
const CardTitle = ({ children, color = G.or }) =>
  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 17, fontWeight: 700, color, letterSpacing: .5, marginBottom: 10 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {children}
      <span style={{ fontSize: 10, color: G.t2, opacity: 0.5, fontWeight: 400 }}>v1.7-final-calc</span>
    </div>
  </div>
const QtyBtn = ({ onClick, children }) =>
  <button onClick={(e) => { haptic(50); onClick(e); }} style={{ width: 38, height: 38, borderRadius: 8, background: G.b1, border: `1px solid ${G.b2}`, color: G.t1, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: 'monospace' }}>{children}</button>
const SubmitBtn = ({ children, onClick, color = G.or, disabled = false }) =>
  <button onClick={(e) => { haptic(60); onClick(e); }} disabled={disabled} style={{ width: '100%', padding: '15px 0', background: disabled ? G.b1 : color, color: disabled ? G.t2 : color === G.yw ? '#000' : '#fff', border: 'none', borderRadius: 12, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: .5, marginTop: 10, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .5 : 1, transition: '.15s' }}>{children}</button>
const TypeTabs = ({ types, active, onSelect }) =>
  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
    {types.map(t => <button key={t.id} onClick={() => { haptic(60); onSelect(t.id); }} style={{ flex: '1 1 auto', minWidth: 80, padding: '10px 6px', borderRadius: 10, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: .5, cursor: 'pointer', border: `1px solid ${t.id === active ? (t.color || G.or) : G.b2}`, background: t.id === active ? '#1c1107' : G.card, color: t.id === active ? (t.color || G.or) : G.t2, transition: '.15s' }}>{t.name}</button>)}
  </div>
const SubTabs = ({ tabs, active, onChange }) =>
  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
    {tabs.map(([k, label]) => <button key={k} onClick={() => onChange(k)} style={{ flex: '1 1 auto', minWidth: 80, padding: 9, borderRadius: 10, border: `1px solid ${k === active ? G.or : G.b2}`, background: k === active ? '#1c1917' : G.card, color: k === active ? G.or : G.t2, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: .5, cursor: 'pointer' }}>{label}</button>)}
  </div>
const Chip = ({ bg, color, bd, children, style = {} }) =>
  <span style={{ background: bg, color, border: `1px solid ${bd}`, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: .5, flexShrink: 0, ...style }}>{children}</span>
const Center = ({ children }) =>
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: G.t2, fontSize: 14 }}>{children}</div>

// StatusBadge для глобального матеріалу (без preBattery — є мін.запас)
const StockBadge = ({ m }) => {
  if (m.stock <= 0) return <Chip bg='#2e1065' color='#c084fc' bd='#4c1d95'>НЕМА</Chip>
  if (m.stock <= m.minStock) return <Chip bg='#450a0a' color={G.rd} bd='#7f1d1d'>КРИТ.</Chip>
  return <Chip bg='#052e16' color={G.gn} bd='#166534'>НОРМА</Chip>
}

function SyncBadge({ state }) {
  const cfg = {
    loading: ['⟳ завантаження...', '#1e1b4b', '#a5b4fc', '#3730a3', true],
    saving: ['⟳ збереження...', '#1e1b4b', '#a5b4fc', '#3730a3', true],
    ok: ['✓ синхр.', '#052e16', G.gn, '#166534', false],
    error: ['✕ помилка', '#450a0a', G.rd, '#7f1d1d', false],
  }[state] || ['...', G.b1, G.t2, G.b2, false]
  const backendVersion = useStore(s => s.backendVersion)
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 9px', borderRadius: 10, background: cfg[1], color: cfg[2], border: `1px solid ${cfg[3]}`, animation: cfg[4] ? 'pulse 1s infinite' : '', fontFamily: "'Fira Code',monospace" }}>
        {cfg[0]}
      </span>
      {state === 'ok' && (
        <span style={{ fontSize: 9, color: G.t2, fontFamily: 'monospace', opacity: 0.7 }}>
          GAS v{backendVersion}
        </span>
      )}
    </div>
  )
}

function BatteryIcon() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const itv = setInterval(() => setNow(new Date()), 250)
    return () => clearInterval(itv)
  }, [])

  const h = now.getHours()
  const m = now.getMinutes()
  const s = now.getSeconds()
  const t = h + m / 60

  let sections = 0
  let color = G.gn
  let pulse = false
  let charging = false

  if (t >= 7 && t < 17) {
    const pct = Math.max(0, 100 - (t - 7) * 10)
    sections = Math.ceil(pct / 20)
    if (sections <= 2) { color = G.rd; pulse = true }
  } else {
    charging = true
    sections = (Math.floor(Date.now() / 1000) % 6)
  }

  return (
    <div style={{
      width: '100%', height: 20, border: `1.5px solid ${G.t2}`, borderRadius: 5,
      position: 'relative', padding: 2, display: 'flex', gap: 1.5,
      animation: pulse ? 'pulse 1s infinite' : 'none', opacity: 0.9
    }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{
          flex: 1, height: '100%', borderRadius: 1.5,
          background: i <= sections ? color : 'transparent',
          transition: 'background 0.3s'
        }} />
      ))}
      <div style={{
        position: 'absolute', right: -5, top: 4, width: 2.5, height: 9,
        background: G.t2, borderRadius: '0 1.5px 1.5px 0'
      }} />
    </div>
  )
}

function usePersistentState(key, initialValue) {
  const [state, setState] = useState(() => localStorage.getItem(key) || initialValue)
  useEffect(() => { localStorage.setItem(key, state) }, [key, state])
  return [state, setState]
}

function Toast({ msg, type }) {
  return <div style={{ position: 'fixed', top: 14, left: 12, right: 12, zIndex: 9999, background: type === 'err' ? '#450a0a' : '#052e16', border: `1px solid ${type === 'err' ? G.rd : G.gn}`, color: type === 'err' ? '#fca5a5' : '#86efac', padding: '13px 16px', borderRadius: 12, fontSize: 13, fontFamily: "'Fira Code',monospace", boxShadow: '0 8px 32px rgba(0,0,0,.7)', animation: 'slideUp .2s ease' }}>{msg}</div>
}

function Modal({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 500, padding: `0 0 env(safe-area-inset-bottom,0)` }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.card, border: `1px solid ${G.b2}`, borderRadius: '18px 18px 0 0', padding: '20px 18px 32px', width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', animation: 'slideUp .25s ease' }}>
        <div style={{ width: 40, height: 4, background: G.b2, borderRadius: 2, margin: '0 auto 18px' }} />
        {children}
      </div>
    </div>
  )
}

function ConfirmModal({ title, body, onYes, onNo }) {
  return (
    <Modal onClose={onNo}>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 19, fontWeight: 700, marginBottom: 10 }}>{title}</div>
      <div style={{ color: G.t2, fontSize: 13, lineHeight: 1.7, marginBottom: 18 }}>{body}</div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onNo} style={{ flex: 1, padding: 14, background: G.b1, color: G.t2, border: `1px solid ${G.b2}`, borderRadius: 12, fontFamily: "'Fira Code',monospace", fontSize: 14, cursor: 'pointer' }}>✕ Скасувати</button>
        <button onClick={() => { haptic(80); onYes(); }} style={{ flex: 1, padding: 14, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 12, fontFamily: "'Fira Code',monospace", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>✓ Підтвердити</button>
      </div>
    </Modal>
  )
}

function InputModal({ title, placeholder, defaultValue = '', onConfirm, onCancel }) {
  const [val, setVal] = useState(defaultValue)
  return (
    <Modal onClose={onCancel}>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 19, fontWeight: 700, marginBottom: 14 }}>{title}</div>
      <input autoFocus value={val} onChange={e => setVal(e.target.value)} placeholder={placeholder}
        onKeyDown={e => { if (e.key === 'Enter' && val.trim()) onConfirm(val.trim()) }} style={{ marginBottom: 12 }} />
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: 14, background: G.b1, color: G.t2, border: `1px solid ${G.b2}`, borderRadius: 12, fontFamily: "'Fira Code',monospace", fontSize: 14, cursor: 'pointer' }}>✕ Скасувати</button>
        <button onClick={() => val.trim() && onConfirm(val.trim())} style={{ flex: 1, padding: 14, background: G.or, color: '#fff', border: 'none', borderRadius: 12, fontFamily: "'Fira Code',monospace", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>✓ OK</button>
      </div>
    </Modal>
  )
}

const Logo = React.forwardRef(({ size = 32 }, ref) => {
  return <img ref={ref} src="/logo.jpg" alt="ZmiyCell" style={{ width: size, height: size, objectFit: 'cover', borderRadius: '50%' }} />
})

const SnakeCubeLoader = ({ sync, logoRef }) => {
  const [show, setShow] = useState(false)
  const [segments, setSegments] = useState([]) // array of {x, y, a}
  const stateRef = useRef({ 
    headIdx: 0, 
    active: false, 
    stopAtEnd: false, 
    points: [], 
    loopRange: [0, 0] 
  })
  
  const cubeSize = 25
  const snakeLen = 7

  useEffect(() => {
    if (['loading', 'saving'].includes(sync)) {
      stateRef.current.active = true
      stateRef.current.stopAtEnd = false
      if (!show) setShow(true)
    } else if (stateRef.current.active) {
      stateRef.current.stopAtEnd = true
    }
  }, [sync, show])

  useEffect(() => {
    if (!show || !logoRef.current) return
    
    const rect = logoRef.current.getBoundingClientRect()
    const W = window.innerWidth
    const H = window.innerHeight
    const lx = rect.left + rect.width / 2
    const ly = rect.top + rect.height / 2
    
    const pts = []
    // 1. Logo -> Top
    for (let y = ly; y > 0; y -= cubeSize) pts.push({ x: lx, y, a: -90 })
    pts.push({ x: lx, y: 0, a: -90 })
    // 2. Top -> Top-Left corner
    for (let x = lx; x > 0; x -= cubeSize) pts.push({ x, y: 0, a: 180 })
    pts.push({ x: 0, y: 0, a: 180 })
    // 3. Loop: Top-Left -> Bottom-Left -> Top-Left
    const loopStartIdx = pts.length - 1
    for (let y = 0; y < H; y += cubeSize * 1.5) pts.push({ x: 0, y, a: 90 })
    pts.push({ x: 0, y: H, a: 90 })
    for (let y = H; y > 0; y -= cubeSize * 1.5) pts.push({ x: 0, y, a: -90 })
    const loopEndIdx = pts.length - 1
    // 4. Return: Top-Left -> Logo
    const returnStartIdx = pts.length
    for (let x = 0; x < lx; x += cubeSize) pts.push({ x, y: 0, a: 0 })
    pts.push({ x: lx, y: 0, a: 0 })
    for (let y = 0; y < ly; y += cubeSize) pts.push({ x: lx, y, a: 90 })
    pts.push({ x: lx, y: ly, a: 90 })
    
    stateRef.current.points = pts
    stateRef.current.loopRange = [loopStartIdx, loopEndIdx]
    
    const timer = setInterval(() => {
      const s = stateRef.current
      let next = s.headIdx + 1
      
      if (s.active && !s.stopAtEnd) {
        if (next > s.loopRange[1]) next = s.loopRange[0]
      } else if (s.stopAtEnd) {
        if (next < s.loopRange[0]) next = s.loopRange[0] // catch up if below loop
        if (next >= pts.length) {
          setShow(false)
          s.active = false
          s.headIdx = 0
          return
        }
      }
      
      s.headIdx = next
      const newSegs = []
      for (let i = 0; i < snakeLen; i++) {
        let idx = next - i
        if (idx >= 0) {
          if (s.active && !s.stopAtEnd && idx < s.loopRange[0]) {
            const len = s.loopRange[1] - s.loopRange[0] + 1
            idx = s.loopRange[1] - (s.loopRange[0] - idx - 1)
          }
          if (pts[idx]) newSegs.push(pts[idx])
        }
      }
      setSegments(newSegs)
    }, 100)
    
    return () => clearInterval(timer)
  }, [show, logoRef])

  if (!show) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9, pointerEvents: 'none' }}>
      {segments.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', left: s.x, top: s.y,
          width: i === 0 ? cubeSize + 4 : cubeSize, height: i === 0 ? cubeSize + 4 : cubeSize,
          background: i === 0 ? 'transparent' : G.or,
          borderRadius: 4, transform: `translate(-50%, -50%) rotate(${s.a}deg)`,
          opacity: 1 - (i / snakeLen) * 0.7, zIndex: 100 - i,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: i === 0 ? 'none' : '0 2px 8px rgba(0,0,0,0.3)'
        }}>
          {i === 0 && <img src="/logo.jpg" style={{ width: '100%', height: '100%', borderRadius: '50%', border: `2px solid ${G.or}`, background: G.bg }} />}
        </div>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════
//  ЕКРАН АВТОРИЗАЦІЇ
// ════════════════════════════════════════════════════════
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState(null)
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const pinInputRef = useRef(null)

  useEffect(() => { if (mode === 'admin' && pinInputRef.current) pinInputRef.current.focus() }, [mode])

  const enterPin = (d) => {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    if (next.length === 4) {
      if (next === ADMIN_PIN) { onAuth('admin') }
      else { setErr('Невірний PIN'); setTimeout(() => { setPin(''); setErr('') }, 800) }
    }
  }
  const handleKeyboard = (e) => {
    if (e.key >= '0' && e.key <= '9') enterPin(e.key)
    else if (e.key === 'Backspace') setPin(p => p.slice(0, -1))
    else if (e.key === 'Escape') { setMode(null); setPin('') }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(10,15,26,0.97)' }}>
      <Logo size={64} />
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 32, fontWeight: 800, letterSpacing: 3, marginTop: 12, marginBottom: 32, color: G.or }}>ZmiyCell</div>
      {!mode ? (
        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button onClick={() => onAuth('user')} style={{ padding: '18px 0', background: G.b1, border: `1px solid ${G.b2}`, color: G.t1, borderRadius: 14, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 700, cursor: 'pointer', letterSpacing: 1 }}>👷 УВІЙТИ ЯК ЮЗЕР</button>
          <button onClick={() => setMode('admin')} style={{ padding: '18px 0', background: '#1c1107', border: `1px solid ${G.or}`, color: G.or, borderRadius: 14, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 700, cursor: 'pointer', letterSpacing: 1 }}>🔐 АДМІН</button>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 280, textAlign: 'center' }}>
          <input ref={pinInputRef} type="tel" inputMode="numeric" value="" onChange={() => { }} onKeyDown={handleKeyboard}
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }} autoComplete="off" />
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, color: G.t2, marginBottom: 8, letterSpacing: 1 }}>ВВЕДІТЬ PIN</div>
          <div style={{ fontSize: 11, color: G.b2, marginBottom: 16 }}>або наберіть з клавіатури</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
            {[0, 1, 2, 3].map(i => <div key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: pin.length > i ? G.or : G.b2, border: `2px solid ${pin.length > i ? G.or : G.b1}`, transition: '.15s', boxShadow: pin.length > i ? `0 0 8px ${G.or}88` : 'none' }} />)}
          </div>
          {err && <div style={{ color: G.rd, fontSize: 13, marginBottom: 12, animation: 'pulse .3s ease' }}>{err}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
              <button key={d} onClick={() => { enterPin(String(d)); pinInputRef.current?.focus() }}
                style={{ padding: '18px 0', background: G.b1, border: `1px solid ${G.b2}`, color: G.t1, borderRadius: 12, fontSize: 22, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, cursor: 'pointer', transition: '.1s', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
                onTouchStart={e => e.currentTarget.style.background = G.b2} onTouchEnd={e => e.currentTarget.style.background = G.b1}>{d}</button>))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <button onClick={() => { setMode(null); setPin('') }} style={{ padding: '18px 0', background: '#450a0a', border: 'none', color: G.rd, borderRadius: 12, fontSize: 13, fontFamily: "'Fira Code',monospace", cursor: 'pointer' }}>← Назад</button>
            <button onClick={() => { enterPin('0'); pinInputRef.current?.focus() }}
              style={{ padding: '18px 0', background: G.b1, border: `1px solid ${G.b2}`, color: G.t1, borderRadius: 12, fontSize: 22, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, cursor: 'pointer' }}
              onTouchStart={e => e.currentTarget.style.background = G.b2} onTouchEnd={e => e.currentTarget.style.background = G.b1}>0</button>
            <button onClick={() => { setPin(p => p.slice(0, -1)); pinInputRef.current?.focus() }} style={{ padding: '18px 0', background: G.card, border: `1px solid ${G.b2}`, color: G.t2, borderRadius: 12, fontSize: 18, cursor: 'pointer' }}>⌫</button>
          </div>
        </div>
      )}
    </div>
  )
}
// ════════════════════════════════════════════════════════
//  PrepTab — використовує глобальні матеріали
// ════════════════════════════════════════════════════════
function PrepTab({ batteryTypes, workers, assemblies, materials, prepItems, onIssueAssembly, onIssueConsumable, onReturn, onWriteoffPrep, onChangeScope, isAdmin, getWorkerColor }) {
  const [filterWorker, setFilterWorker] = useState('')
  const [filterMat, setFilterMat] = useState('')

  const activeGrouped = useMemo(() => {
    const map = {}
    prepItems.filter(p => p.status !== 'returned').forEach(p => {
      if (filterWorker && p.workerId != filterWorker) return
      if (filterMat && p.matId != filterMat) return
      const key = `${p.workerId}_${p.matId}_${p.typeId}_${p.scope}`
      if (!map[key]) {
        map[key] = { ...p, items: [], totalQty: 0, totalReturned: 0 }
      }
      map[key].items.push(p)
      map[key].totalQty += p.qty
      map[key].totalReturned += p.returnedQty
    })
    return Object.values(map)
  }, [prepItems, assemblies, filterWorker, filterMat])

  const [wId, setWId] = useState(workers[0]?.id || '')
  const [typeId, setTypeId] = useState(batteryTypes[0]?.id || '')
  const [asmId, setAsmId] = useState(assemblies[0]?.id || '')
  const [consId, setConsId] = useState(materials[0]?.id || '')
  const [qty, setQty] = useState('1')
  const [allTypes, setAllTypes] = useState(false)

  // Update state when data loads if initial state was empty
  useEffect(() => { if (!wId && workers.length > 0) setWId(workers[0].id) }, [workers, wId])
  useEffect(() => { if (!typeId && batteryTypes.length > 0) setTypeId(batteryTypes[0].id) }, [batteryTypes, typeId])
  useEffect(() => { if (!asmId && assemblies.length > 0) setAsmId(assemblies[0].id) }, [assemblies, asmId])
  useEffect(() => { if (!consId && materials.length > 0) setConsId(materials[0].id) }, [materials, consId])

  const [forAll, setForAll] = useState(false)
  const [retVals, setRetVals] = useState({})
  const [subTab, setSubTab] = useState('active')

  const active = prepItems.filter(p => p.status !== 'returned')
  const asm = assemblies.find(a => a.id == asmId)

  const renderTotals = () => {
    const grouped = {}
    active.forEach(p => {
      const key = `${p.workerId}_${p.scope}_${p.matId}`
      if (!grouped[key]) grouped[key] = { workerName: p.workerName, matName: p.matName, unit: p.unit, amount: 0, scope: p.scope }
      grouped[key].amount += (p.qty - p.returnedQty)
    })
    const list = Object.values(grouped).filter(g => g.amount > 0).sort((a, b) => a.workerName.localeCompare(b.workerName))
    return <Card>
      <CardTitle color={G.pu}>📊 ЗАГАЛОМ НА РУКАХ</CardTitle>
      {list.length === 0 ? <div style={{ color: G.t2, fontSize: 13 }}>Пусто</div> :
        list.map((g, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${G.card2}`, fontSize: 13 }}>
          <div><span style={{ fontWeight: 600, color: getWorkerColor(g.workerName) }}>{g.workerName}</span> <span style={{ color: G.t2, fontSize: 11 }}>({g.scope === 'all' ? 'всі' : 'осб'})</span><br /><span style={{ color: G.t1 }}>{g.matName}</span></div>
          <div style={{ fontWeight: 700, color: G.pu }}>{+g.amount.toFixed(2)} {g.unit}</div>
        </div>)
      }
    </Card>
  }

  return <>
    <SubTabs tabs={[['active', 'АКТИВНІ ВИДАЧІ'], ['totals', 'ЗАГАЛОМ'], ['asm', '+ ЗБІРКИ'], ['cons', 'ВИДАЧА РОЗХІДНИКІВ']]} active={subTab} onChange={setSubTab} />

    {subTab === 'totals' && renderTotals()}

    {subTab === 'asm' && <Card>
      <CardTitle color={G.pu}>📦 ВИДАТИ ЗБІРКУ</CardTitle>
      <FormRow label="ПРАЦІВНИК">
        <select value={wId} onChange={e => setWId(e.target.value)}>
          {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </FormRow>
      <FormRow label="ТИП АКУМУЛЯТОРА">
        <select value={typeId} onChange={e => setTypeId(e.target.value)} disabled={allTypes}>
          {batteryTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </FormRow>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <input id="prep-all-types" type="checkbox" checked={allTypes} onChange={e => setAllTypes(e.target.checked)} />
        <label htmlFor="prep-all-types" style={{ fontSize: 12, color: G.t2 }}>Для всіх типів</label>
      </div>
      <FormRow label="ЗАГОТОВКА (ЗБІРКА)">
        <select value={asmId} onChange={e => setAsmId(e.target.value)}>
          <option value="">— оберіть збірку —</option>
          {assemblies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </FormRow>
      <FormRow label="КІЛЬКІСТЬ">
        <input type="number" value={qty} onChange={e => setQty(e.target.value)} min="0.01" step="0.01" />
      </FormRow>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <input id="prep-for-all" type="checkbox" checked={forAll} onChange={e => setForAll(e.target.checked)} />
        <label htmlFor="prep-for-all" style={{ fontSize: 12, color: G.t2 }}>Для всіх працівників</label>
      </div>
      {asm && asm.components.length > 0 && (
        <div style={{ background: G.b1, borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: G.t2, marginBottom: 6, fontWeight: 700 }}>КОМПОНЕНТИ (на {qty} шт)</div>
          {asm.components.map(ac => {
            const gm = materials.find(m => m.id === ac.matId)
            const need = +(ac.qty * qty).toFixed(2)
            const ok = gm && gm.stock >= need
            return <div key={ac.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0', color: ok ? G.t1 : G.rd }}>
              <span>{gm?.name || ac.matId}</span>
              <span>{need} {gm?.unit || ''} <span style={{ color: ok ? G.t2 : G.rd }}>(є: {gm?.stock ?? '?'})</span></span>
            </div>
          })}
        </div>
      )}
      <SubmitBtn color={G.pu} onClick={() => { if (asm) onIssueAssembly(wId, asmId, qty, allTypes ? 'ALL' : typeId, forAll) }}>📦 ВИДАТИ</SubmitBtn>
    </Card>}

    {subTab === 'cons' && <Card>
      <CardTitle color={G.pu}>📦 ВИДАТИ РОЗХІДНИЙ МАТЕРІАЛ</CardTitle>
      <FormRow label="ПРАЦІВНИК">
        <select value={wId} onChange={e => setWId(e.target.value)}>
          {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </FormRow>
      <FormRow label="МАТЕРІАЛ">
        <select value={consId} onChange={e => setConsId(e.target.value)}>
          {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.stock} {m.unit})</option>)}
        </select>
      </FormRow>
      <FormRow label="КІЛЬКІСТЬ">
        <input type="number" value={qty} onChange={e => setQty(e.target.value)} min="0.01" step="0.01" />
      </FormRow>
      <SubmitBtn color={G.pu} onClick={() => onIssueConsumable(wId, consId, qty)}>📦 ВИДАТИ</SubmitBtn>
    </Card>}

    {subTab === 'active' && <Card>
      <CardTitle color={G.pu}>📋 АКТИВНІ ВИДАЧІ ({activeGrouped.length})</CardTitle>
      
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select value={filterWorker} onChange={e => setFilterWorker(e.target.value)} style={{ flex: 1, minWidth: 120, fontSize: 12, padding: '6px 8px' }}>
          <option value="">👤 Всі працівники</option>
          {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select value={filterMat} onChange={e => setFilterMat(e.target.value)} style={{ flex: 2, minWidth: 180, fontSize: 12, padding: '6px 8px' }}>
          <option value="">📦 Всі матеріали та збірки</option>
          <optgroup label="ЗБІРКИ">
            {assemblies.map(a => <option key={'a' + a.id} value={a.outputMatId}>⚙️ {a.name}</option>)}
          </optgroup>
          <optgroup label="МАТЕРІАЛИ">
            {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </optgroup>
        </select>
        {(filterWorker || filterMat) && <button onClick={() => { setFilterWorker(''); setFilterMat('') }} style={{ background: G.b1, border: `1px solid ${G.b2}`, color: G.t2, borderRadius: 8, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>✕</button>}
      </div>

      {activeGrouped.length === 0
        ? <div style={{ color: G.t2, fontSize: 13, padding: '6px 0' }}>Немає активних видач</div>
        : activeGrouped.sort((a, b) => a.workerName.localeCompare(b.workerName)).map(g => {
          const avail = +(g.totalQty - g.totalReturned).toFixed(2)
          const t = g.typeId === 'ALL' ? { name: 'для всіх типів' } : batteryTypes.find(x => x.id === g.typeId)
          const gid = `${g.workerId}_${g.matId}_${g.typeId}_${g.scope}`
          return <div key={gid} style={{ background: G.card2, borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{g.matName}</div>
            <div style={{ fontSize: 12, color: getWorkerColor(g.workerName), marginTop: 2, fontWeight: 700 }}>{g.workerName}</div>
            {t && <div style={{ fontSize: 11, color: G.t2, marginTop: 2 }}>Тип: {t.name}</div>}
            <div style={{ fontSize: 12, color: G.t2, marginTop: 2 }}>Доступ: {g.scope === 'all' ? 'для всіх' : 'особисто'}</div>
            <div style={{ fontSize: 13, color: G.pu, margin: '4px 0 8px' }}>На руках: <b>{avail}</b> {g.unit}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <input type="number" placeholder="кількість" value={retVals[gid] || ''} onChange={e => setRetVals(v => ({ ...v, [gid]: e.target.value }))} style={{ width: 100 }} min="0.01" step="0.01" max={avail} />
              <button onClick={() => onReturn(g.items, false, retVals[gid])} style={{ padding: '7px 10px', background: '#1e1b4b', color: G.pu, border: `1px solid #3730a3`, borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: "'Fira Code',monospace", fontWeight: 600 }}>↩ Частково</button>
              <button onClick={() => onReturn(g.items, true)} style={{ padding: '7px 10px', background: '#052e16', color: G.gn, border: `1px solid #166534`, borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: "'Fira Code',monospace", fontWeight: 600 }}>↩↩ Все</button>
              {isAdmin && <button onClick={() => { if (confirm('Списати всю групу?')) g.items.forEach(p => onWriteoffPrep(p.id)) }} style={{ padding: '7px 10px', background: '#450a0a', color: G.rd, border: `1px solid #7f1d1d`, borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: "'Fira Code',monospace", fontWeight: 600 }}>✕ Списати</button>}
            </div>
          </div>
        })}
    </Card>}
  </>
}

// ════════════════════════════════════════════════════════
//  ГОЛОВНИЙ КОМПОНЕНТ
// ════════════════════════════════════════════════════════
export default function App() {
  const [authRole, setAuthRole] = useState(() => { try { return localStorage.getItem(AUTH_KEY) || null } catch { return null } })
  const handleAuth = (role) => { try { localStorage.setItem(AUTH_KEY, role) } catch { } setAuthRole(role) }
  const handleLogout = () => { try { localStorage.removeItem(AUTH_KEY) } catch { } setAuthRole(null) }
  if (!authRole) return <><style>{GLOBAL_CSS}</style><AuthScreen onAuth={handleAuth} /></>
  const isAdmin = authRole === 'admin'
  return <AppInner isAdmin={isAdmin} onLogout={handleLogout} />
}

function AppInner({ isAdmin, onLogout }) {
  // ── З'єднання з Zustand ──────────────────────────────────────
  const {
    materials, typeMaterials, assemblies, batteryTypes, workers, tools, log, repairLog, prepItems, payments, toolLog,
    sync, loadAll, refresh, playback, radioStations, backendVersion,
    setMaterials, setTypeMaterials, setAssemblies, setBatteryTypes, setWorkers, setLog, setPrepItems, setPayments, setTools, setToolLog, setRepairLog, setRadioStations, setPlayback, setSync
  } = useStore()

  const globalAudioRef = useRef(null)
  // Expose audio ref globally so RockRadio can control volume
  useEffect(() => { window.__zcAudio = globalAudioRef.current }, [])

  useEffect(() => {
    const audio = globalAudioRef.current
    if (!audio) return
    const currentUrl = radioStations[playback.stationIndex]?.url
    if (playback.isPlaying) {
      // Always update src when station changes (even if already playing)
      if (audio.src !== currentUrl) {
        audio.src = currentUrl
        audio.load()
      }
      audio.play().catch(e => console.error("Playback error:", e))
    } else {
      audio.pause()
    }
  }, [playback.isPlaying, playback.stationIndex, radioStations])

  const location = useLocation()
  const navigate = useNavigate()
  
  // Визначаємо поточну сторінку за URL
  const path = location.pathname.split('/')[1] || 'prod'
  const setPage = (p) => navigate('/' + (p === 'prod' ? '' : p))

  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(null)
  const [pullDist, setPullDist] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const [swipeHint, setSwipeHint] = useState(null)
  const startY = useRef(0)
  const headerLogoRef = useRef(null)

  const ALL_NAV = [
    ['prod',       '⚙️',  'ВИР.'],
    ['repair',     '🔧', 'РЕМ.'],
    ['manual',     '📖', 'МАНУАЛ'],
    ['stock',      '📦', 'СКЛАД'],
    ['calculator', '🧮', 'КАЛЬК.'],
    ['shopping',   '🛒', 'ЗАКУП.'],
    ['tools',      '🛠', 'ІНСТР.'],
    ['log',        '📋', 'ЖУРН.'],
    ['actlog',     '📜', 'ЛОГ'],
    ['backup',     '💾', 'БЕКАП'],
    ['workers',    '👷', 'КОМАН.'],
    ['radio',      '📻', 'РАДІО'],
  ]
  const ALL_NAV_GROUPS = [
    { key: 'prod',   icon: '🔋', label: 'ВИРОБН.', keys: ['prod', 'repair', 'manual'] },
    { key: 'stock',  icon: '📦', label: 'СКЛАД',   keys: ['stock', 'calculator', 'shopping', 'tools'] },
    { key: 'report', icon: '📊', label: 'ЗВІТ.',   keys: ['log', 'actlog', 'backup'] },
    { key: 'team',   icon: '👥', label: 'ІНШЕ',    keys: ['workers', 'radio'] },
  ]
  const USER_NAV = [
    ['prod',       '⚙️',  'ВИР.'],
    ['repair',     '🔧', 'РЕМ.'],
    ['manual',     '📖', 'МАНУАЛ'],
    ['stock',      '📦', 'СКЛАД'],
    ['calculator', '🧮', 'КАЛЬК.'],
    ['tools',      '🛠', 'ІНСТР.'],
    ['log',        '📋', 'ЖУРН.'],
    ['radio',      '📻', 'РАДІО'],
  ]
  const USER_NAV_GROUPS = [
    { key: 'prod',  icon: '🔋', label: 'ВИРОБН.', keys: ['prod', 'repair', 'manual'] },
    { key: 'stock', icon: '📦', label: 'СКЛАД',   keys: ['stock', 'calculator', 'tools'] },
    { key: 'other', icon: '📻', label: 'ІНШЕ',    keys: ['log', 'radio'] },
  ]
  const NAV = isAdmin ? ALL_NAV : USER_NAV
  const NAV_GROUPS = isAdmin ? ALL_NAV_GROUPS : USER_NAV_GROUPS
  const activeGroupKey = (NAV_GROUPS.find(g => g.keys.includes(path))?.key) || NAV_GROUPS[0].key
  const [openGroup, setOpenGroup] = useState(activeGroupKey)
  const _prevNavPath = React.useRef(path)
  if (_prevNavPath.current !== path) {
    _prevNavPath.current = path
    if (activeGroupKey !== openGroup) setOpenGroup(activeGroupKey)
  }

  const [prodTab, setProdTab] = useState('writeoff')
  // PageAssembly стан
  const [asmBatch, setAsmBatch] = useState([{ id: Date.now(), asmId: '', qty: 1 }])
  const [asmWorker, setAsmWorker] = usePersistentState('zc_asmWorker', '')
  const [asmDate, setAsmDate] = useState(todayStr())
  // Редактор збірок (адмін)
  const [asmTab, setAsmTab] = useState('produce') // 'produce' | 'manage'
  const [editAsmId, setEditAsmId] = useState(null) // яку збірку редагуємо
  const [editAsmComps, setEditAsmComps] = useState({})
  const [newAsmName, setNewAsmName] = useState('')
  const [newAsmOutMatId, setNewAsmOutMatId] = useState('')
  const [newAsmOutQty, setNewAsmOutQty] = useState('1')
  const [newAsmNotes, setNewAsmNotes] = useState('')
  const [newAsmDefDest, setNewAsmDefDest] = useState('stock')
  const [editAsmDefDest, setEditAsmDefDest] = useState('stock')
  const [newAsmComps, setNewAsmComps] = useState({})
  const [newAsmDefaultTypeId, setNewAsmDefaultTypeId] = useState('')
  const [newAcMatId, setNewAcMatId] = useState('')
  const [newAcQty, setNewAcQty] = useState('')
  const [repTab, setRepTab] = useState('new')
  const [stockTab, setStockTab] = useState('materials') // 'materials' | 'types'
  // PageShopping — калькулятор виробництва
  const [calcTypeId, setCalcTypeId] = useState('')
  const [calcQty, setCalcQty] = useState('10')
  const [calcPureTypeId, setCalcPureTypeId] = useState('')
  const [calcPureQty, setCalcPureQty] = useState('10')


  // ── UI стан ──────────────────────────────────────────────
  const [prodTypeId, setProdTypeId] = usePersistentState('zc_prodTypeId', '')
  const [prodWorker, setProdWorker] = usePersistentState('zc_prodWorker', '')
  const [prodQty, setProdQty] = useState(1)
  const [prodDate, setProdDate] = useState(todayStr())
  const [prodSerials, setProdSerials] = useState([])
  const [snakeAte, setSnakeAte] = useState(false)
  const [stockSearch, setStockSearch] = useState('')
  const [repairSerial, setRepairSerial] = useState('')
  const [repairSearch, setRepairSearch] = useState('')
  // PageStock — глобальні матеріали
  const [rsVals, setRsVals] = useState({})
  const [editShopId, setEditShopId] = useState(null)
  const [editShopVal, setEditShopVal] = useState('')
  const [newGlobalMat, setNewGlobalMat] = useState({ name: '', unit: '', stock: '', minStock: '', shopUrl: '', photoUrl: '' })
  const [newMatDefaultTypeId, setNewMatDefaultTypeId] = useState('')
  // PageStock — конфігурація типу (підтаб 'types')
  const [configTypeId, setConfigTypeId] = useState('')
  const [newTmMatId, setNewTmMatId] = useState('')
  const [newTmPerBattery, setNewTmPerBattery] = useState('')
  const [newTmMinStock, setNewTmMinStock] = useState('')
  // PageRepair стан
  const [repWorker, setRepWorker] = usePersistentState('zc_repWorker', '')
  const [repDate, setRepDate] = useState(todayStr())
  const [repNote, setRepNote] = useState('')
  const [repPhotoUrl, setRepPhotoUrl] = useState('')
  const [matChecks, setMatChecks] = useState({})
  const [manTypeId, setManTypeId] = usePersistentState('zc_manTypeId', '')
  const [manWorkerId, setManWorkerId] = usePersistentState('zc_manWorkerId', '')
  const [manDate, setManDate] = useState(todayStr())
  const [completingId, setCompletingId] = useState(null)
  const [compWorker, setCompWorker] = useState('')
  const [compDate, setCompDate] = useState('')
  const [compNote, setCompNote] = useState('')
  const [compPhotoUrl, setCompPhotoUrl] = useState('')
  const [compChecks, setCompChecks] = useState({})
  const [compQtys, setCompQtys] = useState({})
  // PageWorkers
  const [newWorkerName, setNewWorkerName] = useState('')
  // PageTools
  const [toolTab, setToolTab] = useState('active')
  const [newTool, setNewTool] = useState({ name: '', category: 'tool', count: '1', serial: '', notes: '' })
  const [toolRepairModal, setToolRepairModal] = useState(null)
  const [toolRepairNote, setToolRepairNote] = useState('')
  const [toolRepairDate, setToolRepairDate] = useState(todayStr())
  const [toolRepairWorker, setToolRepairWorker] = useState('')
  // PageManual
  const [manualTab, setManualTab] = useState('types')
  const [manualTypeId, setManualTypeId] = useState('')
  const [manualAsmId, setManualAsmId] = useState('')
  const [manualEditing, setManualEditing] = useState(false)
  const [manualDraft, setManualDraft] = useState('')

  // PageActionLog / PageBackup — lifted to App level to survive re-renders
  const [actionLogs, setActionLogs] = useState(null)  // null = not loaded yet
  const [filterUser, setFilterUser] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [backupDiff, setBackupDiff] = useState(null)
  const [busy, setBusy] = useState(false)
  const [snapshotDate, setSnapshotDate] = useState('')
  const [logLimit, setLogLimit] = useState(30)
  const [logShowAll, setLogShowAll] = useState(false)

  // ── Обчислювані дані ──────────────────────────────────────
  const paidByWorker = useMemo(() => {
    const map = {}
    payments.forEach(p => {
      const key = p.workerId || p.workerName
      if (!key) return
      map[key] = (map[key] || 0) + (parseInt(p.count) || 0)
    })
    return map
  }, [payments])

  const producedByName = useMemo(() => {
    const map = {}
    log.filter(l => l.kind === 'production').forEach(l => {
      const key = l.workerName
      if (!key) return
      map[key] = (map[key] || 0) + (parseInt(l.count) || 0)
    })
    return map
  }, [log])

  // ── Хелпери ──────────────────────────────────────────────
  const showToast = useCallback((msg, type = 'ok') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500) }, [])
  const openConfirm = useCallback((title, body, onYes) => setModal({ type: 'confirm', title, body, onYes }), [])
  const openInput = useCallback((title, placeholder, defaultVal, onConfirm) => setModal({ type: 'input', title, placeholder, defaultVal, onConfirm }), [])
  const closeModal = () => setModal(null)
  // Compresses arrays into dense string format to avoid GAS URL length limits
  const compressConsumed = (arr) => (arr || []).map(c => `${c.matId}:${c.amount || 0}:${c.fromPersonal || 0}:${c.fromTeam || 0}:${c.fromStock || 0}`).join('|')
  const compressMats = (arr) => (arr || []).filter(m => m.selected && m.qty > 0).map(m => `${m.matId}:${m.qty || 0}`).join('|')

  const getWorkerColor = useCallback((name) => {
    if (!name) return G.t2
    const w = workers.find(x => x.name === name)
    if (w && w.color) return w.color
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return `hsl(${Math.abs(hash) % 360}, 75%, 65%)`
  }, [workers])

  // ── Pull-to-refresh ───────────────────────────────────────
  const handleTouchStart = (e) => { const el = e.currentTarget; if (el.scrollTop <= 0) { startY.current = e.touches[0].pageY; setIsPulling(true) } }
  const handleTouchMove = (e) => { if (!isPulling) return; const dist = e.touches[0].pageY - startY.current; if (dist > 0) { setPullDist(Math.min(dist * .3, 100)); if (dist > 15 && e.cancelable) e.preventDefault() } else { setIsPulling(false); setPullDist(0) } }
  const handleTouchEnd = () => { if (pullDist > 90) window.location.reload(); setIsPulling(false); setPullDist(0) }

  // ── API обгортка ─────────────────────────────────────────
  const api = useCallback(async (action, params = []) => {
    setSync('saving')
    try { const res = await gasCall(action, params); setSync('ok'); return res }
    catch (e) { setSync('error'); showToast('Помилка: ' + e.message, 'err'); throw e }
  }, [showToast])

  // ── Ефект завантаження ─────────────────────────────────────
  useEffect(() => {
    loadAll().then(() => {
      // Ініціалізація випадаючих списків після завантаження
      const s = useStore.getState()
      if (s.batteryTypes?.length && !prodTypeId) setProdTypeId(s.batteryTypes[0].id)
      if (s.batteryTypes?.length && !calcTypeId) setCalcTypeId(s.batteryTypes[0].id)
      if (s.workers?.length && !prodWorker) {
        const id = s.workers.length > 1 ? s.workers[1].id : s.workers[0].id
        setProdWorker(id); setRepWorker(id); setManWorkerId(id); setToolRepairWorker(id); setAsmWorker(id)
      }
    })
  }, [loadAll])

  // ── Похідні дані ─────────────────────────────────────────
  const prodType = batteryTypes.find(t => t.id == prodTypeId) || batteryTypes[0]
  const configType = batteryTypes.find(t => t.id == configTypeId) || batteryTypes[0]
  const perDay = Math.max(1, workers.length) * 1.5
  const activePrep = prepItems.filter(p => p.status !== 'returned')
  const perBatteryByMat = useMemo(() => {
    const map = {}
    typeMaterials.forEach(tm => {
      map[tm.matId] = (map[tm.matId] || 0) + (parseFloat(tm.perBattery) || 0)
    })
    return map
  }, [typeMaterials])

  // ── Хелпер: знайти глобальний мат за matId ───────────────
  const globalMat = (matId) => materials.find(m => m.id == matId)

  const expandAssemblyFallback = useCallback((rootMatId, rootDeficitQty, rootParentName, workerId, typeId) => {
    const resolve = (matId, deficitQty, parentName, path = []) => {
      if (path.includes(matId)) return [] // Запобігаємо нескінченним циклам
      const currentPath = [...path, matId]
      
      const a = assemblies.find(as => as.outputMatId == matId && as.outputQty > 0 && as.components && as.components.length > 0)
      
      if (!a) return null
      
      const batchesNeeded = deficitQty / a.outputQty
      let allSubs = []
      
      a.components.forEach(ac => {
        const cgm = globalMat(ac.matId)
        if (!cgm) return
        const compAmt = +(ac.qty * batchesNeeded).toFixed(2)
        
        // Перевіряємо скільки є на руках (якщо передано workerId)
        const onHand = !workerId ? 0 : prepItems
          .filter(p => p.matId == ac.matId && (p.workerId == workerId || p.scope === 'all') && p.status !== 'returned')
          .reduce((s, p) => +(s + p.qty - p.returnedQty).toFixed(2), 0)
        
        const stock = cgm.stock || 0
        const fromPersonal = +Math.min(onHand, compAmt).toFixed(2)
        const remNeed = +(compAmt - fromPersonal).toFixed(2)
        const fromStock = +Math.min(stock, remNeed).toFixed(2)

        if (fromPersonal + fromStock >= compAmt) {
          allSubs.push({ matId: ac.matId, name: cgm.name, unit: cgm.unit, amount: compAmt, fromPersonal, fromTeam: 0, fromStock, totalStock: stock, isSubstitute: true, substituteFor: parentName })
        } else {
          // Якщо частин все одно не вистачає - пробуємо розкласти їх (рекурсія)
          if (fromPersonal + fromStock > 0) {
            allSubs.push({ matId: ac.matId, name: cgm.name, unit: cgm.unit, amount: +(fromPersonal + fromStock).toFixed(2), fromPersonal, fromTeam: 0, fromStock, totalStock: stock, isSubstitute: true, substituteFor: parentName })
          }
          const nestedDeficit = +(compAmt - fromPersonal - fromStock).toFixed(2)
          const nestedSubs = resolve(ac.matId, nestedDeficit, cgm.name, currentPath)
          if (nestedSubs && nestedSubs.length > 0) {
            allSubs.push(...nestedSubs)
          } else {
            // Реальний дефіцит компонента (сануємо екстремальні від'ємні значення)
            const safeStock = stock < -1000000 ? 0 : stock
            const safeDeficit = Math.max(0, +(compAmt - fromPersonal - safeStock).toFixed(2))
            allSubs.push({ matId: ac.matId, name: cgm.name, unit: cgm.unit, amount: safeDeficit, fromPersonal: 0, fromTeam: 0, fromStock: safeDeficit, totalStock: stock, isSubstitute: true, substituteFor: parentName })
          }
        }
      })
      return allSubs.length > 0 ? allSubs : null
    }
    return resolve(rootMatId, rootDeficitQty, rootParentName)
  }, [assemblies, materials, prepItems, typeMaterials])

  // \u0420\u043e\u0437\u0440\u0430\u0445\u0443\u043d\u043e\u043a \u0432\u0438\u0442\u0440\u0430\u0442 (\u0433\u043b\u043e\u0431\u0430\u043b\u044c\u043d\u0438\u0439 \u0441\u043a\u043b\u0430\u0434) + \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u043d\u0438\u0439 fallback \u0437\u0431\u0456\u0440\u043a\u0438
  const buildConsumed = useCallback((type, workerId, qty) => {
    if (!type) return []
    const myPrep = prepItems.filter(p => p.workerId == workerId && p.scope !== 'all' && (p.typeId == type.id || p.typeId === 'ALL') && p.status !== 'returned')
    const allPrep = prepItems.filter(p => p.scope === 'all' && (p.typeId === type.id || p.typeId === 'ALL') && p.status !== 'returned')
    const tms = typeMaterials.filter(tm => tm.typeId === type.id)
    const map = new Map()

    const addOrUpdate = (item) => {
      const id = String(item.matId)
      const ex = map.get(id)
      if (ex) {
        ex.amount = +(ex.amount + item.amount).toFixed(2)
        ex.fromPersonal = +(ex.fromPersonal + item.fromPersonal).toFixed(2)
        ex.fromTeam = +(ex.fromTeam + item.fromTeam).toFixed(2)
        ex.fromStock = +(ex.fromStock + item.fromStock).toFixed(2)
      } else {
        map.set(id, { ...item })
      }
    }

    tms.forEach(tm => {
      const gm = globalMat(tm.matId)
      if (!gm) return

      let need = +(tm.perBattery * qty).toFixed(2)
      const needOrig = need

      const pAvail = myPrep.filter(p => p.matId == tm.matId).reduce((s, p) => +(s + p.qty - p.returnedQty).toFixed(2), 0)
      const fromPersonal = +Math.min(pAvail, need).toFixed(2)
      need = +(need - fromPersonal).toFixed(2)

      const aAvail = allPrep.filter(p => p.matId == tm.matId).reduce((s, p) => +(s + p.qty - p.returnedQty).toFixed(2), 0)
      const fromTeam = +Math.min(aAvail, need).toFixed(2)
      need = +(need - fromTeam).toFixed(2)

      const fromStockDirect = +Math.min(gm.stock, need).toFixed(2)
      const deficit = +(need - fromStockDirect).toFixed(2)

      if (deficit > 0) {
        const subs = expandAssemblyFallback(tm.matId, deficit, gm.name, workerId, type.id)
        if (subs) {
          subs.forEach(addOrUpdate)
          addOrUpdate({ matId: tm.matId, name: gm.name, unit: gm.unit, amount: needOrig, fromPersonal, fromTeam, fromStock: fromStockDirect, totalStock: gm.stock })
        } else {
          addOrUpdate({ matId: tm.matId, name: gm.name, unit: gm.unit, amount: needOrig, fromPersonal, fromTeam, fromStock: need, totalStock: gm.stock })
        }
      } else {
        addOrUpdate({ matId: tm.matId, name: gm.name, unit: gm.unit, amount: needOrig, fromPersonal, fromTeam, fromStock: fromStockDirect, totalStock: gm.stock })
      }
    })
    return Array.from(map.values())
  }, [prepItems, materials, typeMaterials, assemblies, expandAssemblyFallback])


  const buildAssemblyConsumed = useCallback((assembly, workerId, qty) => {
    if (!assembly) return []
    const myPrep = prepItems.filter(p => p.workerId == workerId && p.scope !== 'all' && p.status !== 'returned')
    const allPrep = prepItems.filter(p => p.scope === 'all' && p.status !== 'returned')

    const map = new Map()
    const addOrUpdate = (item) => {
      const id = String(item.matId)
      const ex = map.get(id)
      if (ex) {
        ex.amount = +(ex.amount + item.amount).toFixed(2)
        ex.fromPersonal = +(ex.fromPersonal + item.fromPersonal).toFixed(2)
        ex.fromTeam = +(ex.fromTeam + item.fromTeam).toFixed(2)
        ex.fromStock = +(ex.fromStock + item.fromStock).toFixed(2)
      } else {
        map.set(id, { ...item })
      }
    }

    assembly.components.forEach(ac => {
      const gm = globalMat(ac.matId)
      if (!gm) return
      let need = +(ac.qty * qty).toFixed(2)
      const needOrig = need
      const pAvail = myPrep.filter(p => p.matId === ac.matId).reduce((s, p) => +(s + p.qty - p.returnedQty).toFixed(2), 0)
      const fromPersonal = +Math.min(pAvail, need).toFixed(2)
      need = +(need - fromPersonal).toFixed(2)
      const aAvail = allPrep.filter(p => p.matId === ac.matId).reduce((s, p) => +(s + p.qty - p.returnedQty).toFixed(2), 0)
      const fromTeam = +Math.min(aAvail, need).toFixed(2)
      need = +(need - fromTeam).toFixed(2)

      const fromStockDirect = +Math.min(gm.stock, need).toFixed(2)
      const deficit = +(need - fromStockDirect).toFixed(2)

      if (deficit > 0) {
        const subs = expandAssemblyFallback(ac.matId, deficit, gm.name, workerId, 'ALL')
        if (subs) {
          subs.forEach(addOrUpdate)
          addOrUpdate({ matId: ac.matId, name: gm.name, unit: gm.unit, amount: needOrig, fromPersonal, fromTeam, fromStock: fromStockDirect, totalStock: gm.stock })
        } else {
          addOrUpdate({ matId: ac.matId, name: gm.name, unit: gm.unit, amount: needOrig, fromPersonal, fromTeam, fromStock: need, totalStock: gm.stock })
        }
      } else {
        addOrUpdate({ matId: ac.matId, name: gm.name, unit: gm.unit, amount: needOrig, fromPersonal, fromTeam, fromStock: fromStockDirect, totalStock: gm.stock })
      }
    })
    return Array.from(map.values())
  }, [prepItems, materials, expandAssemblyFallback])

  const buildRepairConsumed = useCallback((repairMaterials, workerId, typeId) => {
    if (!repairMaterials || repairMaterials.length === 0) return []
    const myPrep = prepItems.filter(p => p.workerId == workerId && p.scope !== 'all' && (p.typeId == typeId || p.typeId === 'ALL') && p.status !== 'returned')
    const allPrep = prepItems.filter(p => p.scope === 'all' && (p.typeId == typeId || p.typeId === 'ALL') && p.status !== 'returned')

    const result = []
    repairMaterials.forEach(rm => {
      const gm = globalMat(rm.matId)
      if (!gm) return
      let need = +rm.qty.toFixed(2)
      const needOrig = need
      const pAvail = myPrep.filter(p => p.matId == rm.matId).reduce((s, p) => +(s + p.qty - p.returnedQty).toFixed(2), 0)
      const fromPersonal = +Math.min(pAvail, need).toFixed(2)
      need = +(need - fromPersonal).toFixed(2)
      const aAvail = allPrep.filter(p => p.matId == rm.matId).reduce((s, p) => +(s + p.qty - p.returnedQty).toFixed(2), 0)
      const fromTeam = +Math.min(aAvail, need).toFixed(2)
      need = +(need - fromTeam).toFixed(2)

      const fromStockDirect = +Math.min(gm.stock, need).toFixed(2)
      const deficit = +(need - fromStockDirect).toFixed(2)

      if (deficit > 0) {
        const subs = expandAssemblyFallback(rm.matId, deficit, gm.name, workerId, 'ALL')
        if (subs) {
          subs.forEach(sub => {
            const ex = result.find(r => r.matId == sub.matId && r.isSubstitute)
            if (ex) { ex.amount = +(ex.amount + sub.amount).toFixed(2); ex.fromStock = +(ex.fromStock + sub.fromStock).toFixed(2) }
            else result.push(sub)
          })
          result.push({ matId: rm.matId, name: gm.name, unit: gm.unit, amount: needOrig, fromPersonal, fromTeam, fromStock: fromStockDirect, totalStock: gm.stock })
        } else {
          result.push({ matId: rm.matId, name: gm.name, unit: gm.unit, amount: needOrig, fromPersonal, fromTeam, fromStock: need, totalStock: gm.stock })
        }
      } else {
        result.push({ matId: rm.matId, name: gm.name, unit: gm.unit, amount: needOrig, fromPersonal, fromTeam, fromStock: fromStockDirect, totalStock: gm.stock })
      }
    })
    return result
  }, [prepItems, materials, expandAssemblyFallback])


  // ── Хелпер оновлення глобального stock ───────────────────
  const updateGlobalStock = useCallback((matId, delta) => {
    setMaterials(prev => prev.map(m => {
      if (m.id != matId) return m
      // Захист від змішування ID та кількості (delta не може бути подібна до таймстемпу)
      if (Math.abs(delta) > 100000000) {
        console.warn('Suspicious stock update rejected:', delta)
        return m
      }
      return { ...m, stock: Math.max(-10000, +(m.stock + delta).toFixed(2)) }
    }))
  }, [])
  // ════════════════════════════════════════════════════════
  //  ACTIONS
  // ════════════════════════════════════════════════════════

  const doWriteoff = () => {
    const type = prodType
    const worker = workers.find(w => w.id === prodWorker)
    if (!type || !worker) return showToast('Оберіть тип та працівника', 'err')
    const serials = Array.from({ length: prodQty }, (_, i) => prodSerials[i] || '')
    for (const s of serials) if (!s?.trim()) return showToast('Введіть всі серійні номери', 'err')
    const consumed = buildConsumed(type, worker.id, prodQty)
    const shortage = consumed.filter(c => c.fromStock > c.totalStock)
    const hasShortage = shortage.length > 0

    openConfirm('Підтвердити списання',
      <div style={{ fontSize: 13, color: G.t2, lineHeight: 1.8 }}>
        <b style={{ color: G.t1 }}>{type.name}</b><br />
        Працівник: {worker.name}<br />
        Кількість: <b style={{ color: G.or }}>{prodQty}</b><br />
        С/н: {serials.join(', ')}
        {hasShortage && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: `1px solid ${G.rd}`, borderRadius: 8, color: G.rd, fontWeight: 700, fontSize: 11 }}>
            ⚠️ УВАГА: Не вистачає матеріалів! Залишок на складі піде в МІНУС:<br/>
            {shortage.map(s => `• ${s.name} (нестача: ${(s.fromStock - s.totalStock).toFixed(2)})`).join('\n')}
          </div>
        )}
      </div>,
      async () => {
        closeModal()
        const entry = { id: uid(), datetime: nowStr(), date: prodDate, typeId: type.id, typeName: type.name, workerId: worker.id, workerName: worker.name, count: prodQty, serials, consumed, kind: 'production', repairNote: '' }
        try {
          const entryForGas = { ...entry, consumed: compressConsumed(consumed) }
          await api('writeOff', [entryForGas])
          consumed.forEach(c => { if (c.fromStock > 0) updateGlobalStock(c.matId, -c.fromStock) })
          setPrepItems(prev => {
            const next = prev.map(p => ({ ...p }))
            consumed.forEach(c => {
              const doDeduct = (isTeam, amt) => {
                if (!amt) return
                let rem = amt
                next.filter(p => (isTeam ? p.scope === 'all' : (p.workerId === worker.id && p.scope !== 'all')) && (p.typeId === type.id || p.typeId === 'ALL') && p.matId === c.matId && p.status !== 'returned').forEach(p => {
                  if (rem <= 0) return
                  const avail = p.qty - p.returnedQty
                  const use = Math.min(avail, rem)
                  p.returnedQty = +(p.returnedQty + use).toFixed(2)
                  p.status = p.returnedQty >= p.qty ? 'returned' : 'partial'
                  rem = +(rem - use).toFixed(2)
                })
              }
              doDeduct(false, c.fromPersonal)
              doDeduct(true, c.fromTeam)
            })
            return next
          })
          setLog(prev => [entry, ...prev])
          setProdSerials([])
          setSnakeAte(true)
          showToast(`✓ Списано ${prodQty} акум. (${serials.join(', ')})`)
          const lowMats = consumed.filter(c => {
            const m = globalMat(c.matId)
            return m && (m.stock - (c.fromStock > 0 ? c.fromStock : 0)) <= m.minStock && m.minStock > 0
          })
          if (lowMats.length > 0) {
            const lines = lowMats.map(c => { const m = globalMat(c.matId); const ns = Math.max(0, +(m.stock - c.fromStock).toFixed(2)); return `• ${m.name}: ${ns} ${m.unit} (мін: ${m.minStock})` }).join('\n')
            sendTelegram(`⚠️ ZmiyCell — низький запас\n\n${lines}`)
          }
        } catch { }
      }
    )
  }


  const doUpdateRepairStatus = (repairId, status) => {
    const isCompleted = status === 'completed'
    openConfirm(isCompleted ? 'Завершити ремонт?' : 'Змінити статус',
      'Підтверджуєте зміну статусу ремонту?',
      async () => {
        closeModal()
        const dateCompleted = isCompleted ? todayStr() : ''
        try {
          await api('updateRepairStatus', [repairId, status, dateCompleted])
          setRepairLog(prev => prev.map(r => r.id == repairId ? { ...r, status, note: r.note + (isCompleted ? (r.note ? ' | ' : '') + `Завершено: ${dateCompleted}` : '') } : r))
          showToast('✓ Статус оновлено')
        } catch { }
      }
    )
  }

  const doIssuePrepAssembly = (workerId, assemblyId, qty, typeId, forAll) => {
    const worker = workers.find(w => w.id == workerId)
    const asm = assemblies.find(a => a.id == assemblyId)
    if (!asm || !worker || !qty || qty <= 0) return showToast("Заповніть всі поля", 'err')
    if (!asm.components || asm.components.length < 2) return showToast('Збірка повинна містити хоча б 2 матеріали', 'err')

    // Перевіряємо наявність компонентів на складі
    const shortage = asm.components.find(ac => {
      const gm = materials.find(m => m.id === ac.matId)
      return !gm || gm.stock < +(ac.qty * qty).toFixed(2)
    })
    if (shortage) {
      const gm = materials.find(m => m.id === shortage.matId)
      return showToast('Не вистачає: ' + (gm?.name || shortage.matId), 'err')
    }

    // Одна позиція в заготовці — готовий виріб (вихідний матеріал збірки)
    const outputQty = +(asm.outputQty * qty).toFixed(2)
    const outputMat = materials.find(m => m.id === asm.outputMatId)
    const prepItem = {
      id: uid(),
      workerId: worker.id,
      workerName: worker.name,
      typeId,
      matId: asm.outputMatId,
      matName: outputMat?.name || asm.name,
      unit: outputMat?.unit || asm.unit || 'шт',
      qty: outputQty,
      returnedQty: 0,
      date: todayStr(),
      datetime: nowStr(),
      status: 'active',
      scope: forAll ? 'all' : 'self',
    }

    openConfirm('Видача на заготовку',
      <div style={{ fontSize: 13, color: G.t2, lineHeight: 1.8 }}>
        <b style={{ color: G.t1 }}>{prepItem.matName}</b> × <b style={{ color: G.pu }}>{outputQty} {prepItem.unit}</b><br />
        Працівник: {worker.name}<br />
        Доступ: {forAll ? 'для всіх' : 'особисто'}
        <div style={{ marginTop: 8, fontSize: 11, color: G.t2 }}>
          Компоненти (будуть списані зі складу):
          {asm.components.map(ac => {
            const gm = materials.find(m => m.id === ac.matId)
            return <div key={ac.id}>• {gm?.name || ac.matId}: -{+(ac.qty * qty).toFixed(2)} {gm?.unit || ''}</div>
          })}
        </div>
      </div>,
      async () => {
        closeModal()
        try {
          await api('addPrepItemsDirect', [[prepItem]])
          // Списуємо компоненти зі складу
          asm.components.forEach(ac => updateGlobalStock(ac.matId, -(+(ac.qty * qty).toFixed(2))))
          setPrepItems(prev => [prepItem, ...prev])
          const logEntry = {
            id: uid() + 'P',
            datetime: nowStr(),
            date: todayStr(),
            typeId,
            typeName: typeId === 'ALL' ? 'Всі типи' : (batteryTypes.find(t => t.id == typeId)?.name || ''),
            workerName: worker.name,
            count: 0,
            serials: [],
            consumed: asm.components.map(ac => {
              const gm = materials.find(m => m.id === ac.matId)
              return { name: gm?.name || ac.matId, unit: gm?.unit || '', amount: +(ac.qty * qty).toFixed(2) }
            }),
            kind: 'prep',
            repairNote: `📦 Видача: ${prepItem.matName} × ${outputQty} ${prepItem.unit}`,
            prepIds: [prepItem.id],
          }
          setLog(prev => [logEntry, ...prev])
          api('logPrepEntry', [logEntry]).catch(() => {})
          showToast(`✓ Видано заготовку: ${prepItem.matName}`)
        } catch { }
      }
    )
  }


  const doChangePrepScope = async (prepId, scope) => {
    try {
      await api('updatePrepField', [prepId, 'scope', scope])
      setPrepItems(prev => prev.map(p => String(p.id) === String(prepId) ? { ...p, scope } : p))
      showToast('✓ Оновлено доступ')
    } catch { }
  }

  const doReturnPrep = async (items, all, customQty) => {
    // If we passed a single ID instead of items array (fallback)
    const prepItemsList = Array.isArray(items) ? items : [prepItems.find(p => String(p.id) === String(items))].filter(Boolean)
    if (!prepItemsList.length) return

    const totalAvail = prepItemsList.reduce((acc, p) => acc + (p.qty - p.returnedQty), 0)
    let rem = all ? totalAvail : parseFloat(customQty || 0)
    if (!rem || rem <= 0) return showToast('Введіть кількість', 'err')
    if (rem > totalAvail + 0.0001) return showToast('Більше ніж є на руках', 'err')

    const matId = prepItemsList[0].matId
    const unit = prepItemsList[0].unit

    try {
      // Sort oldest first
      const sorted = [...prepItemsList].sort((a, b) => (new Date(a.datetime || a.date) - new Date(b.datetime || b.date)))
      
      const updates = []
      for (const item of sorted) {
        if (rem <= 0) break
        const itemAvail = +(item.qty - item.returnedQty).toFixed(2)
        const use = Math.min(itemAvail, rem)
        if (use > 0) {
          await api('returnPrep', [item.id, use])
          updates.push({ id: item.id, use })
          rem = +(rem - use).toFixed(2)
        }
      }
      
      updateGlobalStock(matId, all ? totalAvail : parseFloat(customQty))
      setPrepItems(prev => prev.map(p => {
        const up = updates.find(u => String(u.id) === String(p.id))
        if (!up) return p
        const nr = +(p.returnedQty + up.use).toFixed(2)
        return { ...p, returnedQty: nr, status: nr >= p.qty ? 'returned' : 'partial' }
      }))
      showToast(`✓ Повернено ${all ? totalAvail : customQty} ${unit}`)
    } catch (e) { console.error(e) }
  }

  const doIssueConsumable = (workerId, matId, qty) => {
    const worker = workers.find(w => w.id == workerId)
    const gm = materials.find(m => m.id == matId)
    if (!worker || !gm || !qty || qty <= 0) return showToast("Заповніть всі поля", 'err')
    if (gm.stock < qty) return showToast('Не вистачає: ' + gm.name, 'err')

    const item = {
      id: uid(),
      workerId: worker.id,
      workerName: worker.name,
      typeId: 'ALL',
      matId: gm.id,
      matName: gm.name,
      unit: gm.unit || '',
      qty: +qty.toFixed(2),
      returnedQty: 0,
      date: todayStr(),
      datetime: nowStr(),
      status: 'active',
      scope: 'self',
    }

    openConfirm('Видача розхідників',
      <div style={{ fontSize: 13, color: G.t2, lineHeight: 1.8 }}>
        <b style={{ color: G.t1 }}>{gm.name}</b><br />
        Кількість: {qty} {gm.unit}<br />
        Працівник: {worker.name}
      </div>,
      async () => {
        closeModal()
        try {
          await api('addPrepItemsBatch', [[item]])
          updateGlobalStock(gm.id, -qty)
          setPrepItems(prev => [item, ...prev])
          // Записуємо в журнал
          const logEntry = {
            id: uid() + 'C',
            datetime: nowStr(),
            date: todayStr(),
            typeId: 'ALL',
            typeName: 'Розхідник',
            workerName: worker.name,
            count: 0,
            serials: [],
            consumed: [{ name: gm.name, unit: gm.unit, amount: +qty.toFixed(2) }],
            kind: 'prep',
            repairNote: `📦 Видача: ${gm.name} × ${qty} ${gm.unit}`,
            prepIds: [item.id],
          }
          setLog(prev => [logEntry, ...prev])
          api('logPrepEntry', [logEntry]).catch(() => {})
          showToast(`✓ Видано розхідник: ${gm.name}`)
        } catch { }
      }
    )
  }

  const doWriteoffPrep = async (prepId) => {
    const item = prepItems.find(p => String(p.id) === String(prepId))
    if (!item) return
    const avail = +(item.qty - item.returnedQty).toFixed(2)
    openConfirm('Остаточне списання',
      <div style={{ fontSize: 13, color: G.t2, lineHeight: 1.8 }}>Списати <b style={{ color: G.or }}>{avail} {item.unit}</b> ({item.matName}) без повернення на склад?</div>,
      async () => {
        closeModal()
        try {
          await api('returnPrep', [prepId, avail])
          setPrepItems(prev => prev.map(p => String(p.id) !== String(prepId) ? p : { ...p, returnedQty: +(p.returnedQty + avail).toFixed(2), status: 'returned' }))
          showToast(`✓ Списано безповоротно: ${avail} ${item.unit}`)
        } catch { }
      }
    )
  }

  const doProduceAssembly = () => {
    const worker = workers.find(w => w.id === asmWorker)
    if (!worker) return showToast('Оберіть працівника', 'err')

    const validBatch = asmBatch.filter(b => b.asmId && b.qty > 0)
    if (validBatch.length === 0) return showToast('Додайте хоча б одну збірку', 'err')

    const batchEntries = validBatch.map(b => {
      const asm = assemblies.find(a => a.id == b.asmId)
      if (!asm) return null
      const consumed = buildAssemblyConsumed(asm, worker.id, b.qty)
      const shortage = consumed.find(c => c.fromStock > c.totalStock)
      const outputAmt = +(asm.outputQty * b.qty).toFixed(2)
      return { asm, qty: b.qty, consumed, shortage, outputAmt }
    }).filter(Boolean)

    const firstShortage = batchEntries.find(e => e.shortage)
    if (firstShortage) return showToast(`Не вистачає матеріалів для ${firstShortage.asm.name} (Бракує: ${firstShortage.shortage.name})`, 'err')

    openConfirm('ВИГОТОВИТИ КОМПЛЕКТ ЗБІРОК',
      <div style={{ fontSize: 13, color: G.t2, lineHeight: 1.8 }}>
        Виготовляємо <b>{validBatch.length}</b> різних позицій.<br/>
        Працівник: {worker.name}<br />
        <div style={{ marginTop: 8, padding: 8, background: '#1e293b', borderRadius: 8 }}>
          {batchEntries.map((e, i) => {
             const destText = e.asm.defDest === 'personal' ? 'Особ. заготовка' : e.asm.defDest === 'team' ? 'Спільна заготовка' : 'Глоб. склад'
             return <div key={i} style={{ borderBottom: i < batchEntries.length - 1 ? `1px dashed ${G.b2}` : 'none', padding: '4px 0' }}>
               <b style={{color:G.or}}>{e.qty}</b> шт — <b style={{color:G.cy}}>{e.asm.name}</b> <br/>
               <span style={{fontSize: 11, color: G.t2}}>➔ {e.outputAmt} {e.asm.unit} ({destText})</span>
             </div>
          })}
        </div>
      </div>,
      async () => {
        closeModal()
        let successCount = 0
        let logsToAdd = []
        try {
          for (const ev of batchEntries) {
             const dest = ev.asm.defDest || 'stock'
             const entry = { assemblyId: ev.asm.id, qty: ev.qty, workerId: worker.id, workerName: worker.name, date: asmDate, datetime: nowStr(), destination: dest, consumed: ev.consumed, outputAmt: ev.outputAmt }
             await api('produceAssemblyAdvanced', [{ ...entry, consumed: compressConsumed(ev.consumed) }])
             
             ev.consumed.forEach(c => { if (c.fromStock > 0) updateGlobalStock(c.matId, -c.fromStock) })
             
             setPrepItems(prev => {
                const next = prev.map(p => ({ ...p }))
                ev.consumed.forEach(c => {
                  const doDeduct = (isTeam, amt) => {
                    if (!amt) return
                    let rem = amt
                    next.filter(p => (isTeam ? p.scope === 'all' : (p.workerId === worker.id && p.scope !== 'all')) && p.matId === c.matId && p.status !== 'returned').forEach(p => {
                      if (rem <= 0) return
                      const avail = p.qty - p.returnedQty
                      const use = Math.min(avail, rem)
                      p.returnedQty = +(p.returnedQty + use).toFixed(2)
                      p.status = p.returnedQty >= p.qty ? 'returned' : 'partial'
                      rem = +(rem - use).toFixed(2)
                    })
                  }
                  doDeduct(false, c.fromPersonal)
                  doDeduct(true, c.fromTeam)
                })
                
                if (dest !== 'stock') {
                  const gm = globalMat(ev.asm.outputMatId)
                  next.unshift({
                    id: 'tmp_prep_' + Date.now() + Math.random(),
                    workerId: worker.id,
                    workerName: worker.name,
                    typeId: 'ALL',
                    matId: ev.asm.outputMatId,
                    matName: gm?.name || ev.asm.outputMatId,
                    unit: ev.asm.unit,
                    qty: ev.outputAmt,
                    returnedQty: 0,
                    date: asmDate,
                    datetime: nowStr(),
                    status: 'active',
                    scope: dest === 'team' ? 'all' : 'self'
                  })
                }
                return next
             })

             if (dest === 'stock') {
                updateGlobalStock(ev.asm.outputMatId, ev.outputAmt)
             }

             logsToAdd.push({
               id: 'asmL_' + ev.asm.id + '_' + Date.now() + Math.random(),
               datetime: nowStr(), date: asmDate, typeId: '',
               typeName: ev.asm.name + (dest !== 'stock' ? ' (як заготовка)' : ''),
               workerName: worker.name, count: ev.qty,
               serials: [], consumed: ev.consumed, kind: 'assembly', repairNote: ''
             })
             successCount++
          }
          
          setLog(prev => [...logsToAdd, ...prev])
          setAsmBatch([{ id: Date.now(), asmId: '', qty: 1 }])
          showToast(`✓ Виготовлено позицій: ${successCount}`)
        } catch(err) {}
      }
    )
  }

  const doSubmitRepair = (repairEntry) => {
    const selectedMats = repairEntry.materials.filter(m => m.selected && m.qty > 0)

    // repairWorker in repairing is just string, we need worker.id. Oh, repairEntry has repairWorker (name) but no ID directly? 
    // Wait, let's find the worker id from repairWorker name.
    const rWorker = workers.find(w => w.name === repairEntry.repairWorker) || workers[0]
    const workerId = rWorker?.id

    const consumed = buildRepairConsumed(selectedMats, workerId, repairEntry.typeId)

    const err = consumed.find(c => c.fromStock > c.totalStock)
    if (err) return showToast('Не вистачає на складі: ' + err.name, 'err')

    openConfirm('Підтвердити ремонт',
      <div style={{ fontSize: 13, color: G.t2, lineHeight: 1.8 }}>
        С/н: <b style={{ color: G.cy }}>{repairEntry.serial}</b><br />
        Ремонтує: {repairEntry.repairWorker}
        {consumed.length > 0 && <div style={{ marginTop: 8 }}>
          <b style={{ color: G.t1, fontSize: 12 }}>Матеріали:</b>
          {consumed.map(c => {
            return <div key={c.matId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: `1px solid ${G.b1}`, fontSize: 12 }}>
              <span style={{ color: G.t1, paddingRight: 8 }}>{c.name}</span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {c.fromPersonal > 0 && <Chip bg='#2e1065' color='#c084fc' bd='#4c1d95'>👷{c.fromPersonal}</Chip>}
                {c.fromTeam > 0 && <Chip bg='#1e3a8a' color='#93c5fd' bd='#1e40af'>🤝{c.fromTeam}</Chip>}
                {c.fromStock > 0 && <Chip bg='#1c1007' color='#fb923c' bd='#9a3412'>🏭{c.fromStock}</Chip>}
                <span style={{ color: G.gn, fontWeight: 600, minWidth: 60, textAlign: 'right' }}>−{c.amount} {c.unit}</span>
              </div>
            </div>
          })}
        </div>}
      </div>,
      async () => {
        closeModal()
        // Pass consumed array to backend
        const fullEntry = { ...repairEntry, consumed, workerId }
        try {
          await api('addRepair', [fullEntry])

          // Списуємо компоненти локально
          consumed.forEach(c => { if (c.fromStock > 0) updateGlobalStock(c.matId, -c.fromStock) })

          // Зменшуємо prepItems
          setPrepItems(prev => {
            const next = prev.map(p => ({ ...p }))
            consumed.forEach(c => {
              const doDeduct = (isTeam, amt) => {
                if (!amt) return
                let rem = amt
                next.filter(p => (isTeam ? p.scope === 'all' : (p.workerId == workerId && p.scope !== 'all')) && p.matId == c.matId && p.status !== 'returned').forEach(p => {
                  if (rem <= 0) return
                  const avail = p.qty - p.returnedQty
                  const use = Math.min(avail, rem)
                  p.returnedQty = +(p.returnedQty + use).toFixed(2)
                  p.status = p.returnedQty >= p.qty ? 'returned' : 'partial'
                  rem = +(rem - use).toFixed(2)
                })
              }
              doDeduct(false, c.fromPersonal)
              doDeduct(true, c.fromTeam)
            })
            return next
          })

          setRepairLog(prev => [fullEntry, ...prev])
          setLog(prev => [{
            id: repairEntry.id + 'L', datetime: repairEntry.datetime, date: repairEntry.date,
            typeId: repairEntry.typeId, typeName: repairEntry.typeName, workerName: repairEntry.repairWorker,
            count: 0, serials: [repairEntry.serial],
            consumed: consumed.map(c => ({ name: c.name, unit: c.unit, amount: c.amount })),
            kind: 'repair', repairNote: repairEntry.note || ''
          }, ...prev])
          setRepairSerial(''); setRepairSearch('')
          showToast('✓ Ремонт зафіксовано: ' + repairEntry.serial)
        } catch { }
      }
    )
  }

  // ════════════════════════════════════════════════════════
  //  СТОРІНКИ
  // ════════════════════════════════════════════════════════
  const wrap = (children) =>
    <div style={{ padding: '12px 12px 40px', maxWidth: 700, margin: '0 auto', width: '100%' }}>{children}</div>


  // ── Таб Збірка (всередині ВИРОБНИЦТВО) ───────────────────
  const AssemblyTab = () => {
    const worker = workers.find(w => w.id === asmWorker)

    if (assemblies.length === 0) return (
      <Card>
        <div style={{ color: G.t2, fontSize: 13, textAlign: 'center', padding: '10px 0' }}>
          Збірки не налаштовано.{isAdmin ? ' Перейдіть на СКЛАД → ⚙️ ЗБІРКИ.' : ' Зверніться до адміна.'}
        </div>
      </Card>
    )

    const validBatch = asmBatch.filter(b => b.asmId && b.qty > 0)
    let summaryConsumed = []
    if (worker && validBatch.length > 0) {
      const mergedMap = new Map()
      validBatch.forEach(b => {
        const asm = assemblies.find(a => a.id == b.asmId)
        if (asm) {
           const c = buildAssemblyConsumed(asm, worker.id, b.qty)
           c.forEach(item => {
             const ex = mergedMap.get(item.matId)
             if(ex) { ex.amount += item.amount; }
             else { mergedMap.set(item.matId, {...item}) }
           })
        }
      })
      summaryConsumed = Array.from(mergedMap.values())
    }

    return <>
      <Card>
        <CardTitle color='#a78bfa'>⚙️ ВИГОТОВИТИ КОМПЛЕКТ ЗБІРОК</CardTitle>
        <FormRow label="ПРАЦІВНИК & ДАТА">
          <div style={{ display: 'flex', gap: 8 }}>
            <select style={{ flex: 2 }} value={asmWorker} onChange={e => setAsmWorker(e.target.value)}>
              <option value="">- оберіть -</option>
              {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <input style={{ flex: 1, padding: '8px', textAlign: 'center' }} value={asmDate} onChange={e => setAsmDate(e.target.value)} />
          </div>
        </FormRow>

        <div style={{ marginTop: 16 }}>
          <Label>ПОЗИЦІЇ КОМПЛЕКТУ (додаються відразу на склад):</Label>
          {asmBatch.map((item) => (
            <div key={item.id} style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
              <select style={{ flex: 1, padding: '8px 4px' }} value={item.asmId} onChange={e => setAsmBatch(v => v.map(b => b.id===item.id ? {...b, asmId: e.target.value} : b))}>
                <option value="">— оберіть збірку —</option>
                {assemblies.map(a => {
                  const gm = globalMat(a.outputMatId)
                  return <option key={a.id} value={a.id}>{a.name} → {a.outputQty} {gm?.unit || a.unit}</option>
                })}
              </select>
              <input type="number" min="1" step="any" style={{ width: 62, textAlign: 'center', padding: '8px 4px' }} value={item.qty} onChange={e => setAsmBatch(v => v.map(b => b.id===item.id ? {...b, qty: e.target.value} : b))} />
              <button 
                onClick={() => setAsmBatch(v => v.length > 1 ? v.filter(b => b.id!==item.id) : v)}
                style={{ background: '#450a0a', border: 'none', color: '#fca5a5', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', height: 35 }}
              >✕</button>
            </div>
          ))}
          <button 
            onClick={() => setAsmBatch(v => [...v, { id: Date.now()+Math.random(), asmId: '', qty: 1 }])}
            style={{ width: '100%', padding: 10, background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', border: '1px dashed #a78bfa', borderRadius: 8, marginTop: 4, cursor: 'pointer', fontFamily: "'Fira Code',monospace" }}
          >+ Додати нову позицію</button>
        </div>
      </Card>

      {summaryConsumed.length > 0 && <Card>
        <CardTitle color='#a78bfa'>⚡ ЗАГАЛОМ БУДЕ СПИСАНО ДЛЯ КОМПЛЕКТУ</CardTitle>
        {summaryConsumed.map(c => {
          return <div key={c.matId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${G.b1}`, fontSize: 13 }}>
            <span style={{ color: G.t1 }}>{c.name}</span>
            <span style={{ color: '#fb923c', fontWeight: 600 }}>−{c.amount.toFixed(2)} {c.unit}</span>
          </div>
        })}
      </Card>}

      <SubmitBtn onClick={doProduceAssembly} color='#a78bfa'>⚙️ ВИГОТОВИТИ ВСІ ПОЗИЦІЇ ({validBatch.length})</SubmitBtn>
    </>
  }

  // ── Виробництво ───────────────────────────────────────────
  const PageProd = () => {
    const consumed = prodType ? buildConsumed(prodType, prodWorker, prodQty) : []
    const serials = Array.from({ length: prodQty }, (_, i) => prodSerials[i] || '')
    return wrap(<>
      <SubTabs tabs={[['writeoff', '🔋 СПИСАННЯ'], ['prep', '📦 ЗАГОТОВКА'], ['assembly', '⚙️ ЗБІРКА']]} active={prodTab} onChange={setProdTab} />
      {prodTab === 'writeoff' && <>
        <TypeTabs types={batteryTypes} active={prodTypeId} onSelect={id => { setProdTypeId(id); setProdSerials([]); setSnakeAte(false) }} />
        <Card>
          <FormRow label="ПРАЦІВНИК">
            <select value={prodWorker} onChange={e => { setProdWorker(e.target.value); setSnakeAte(false) }}>
              {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </FormRow>
          <FormRow label="ДАТА"><input value={prodDate} onChange={e => { setProdDate(e.target.value); setSnakeAte(false) }} /></FormRow>
          <FormRow label="КІЛЬКІСТЬ АКУМУЛЯТОРІВ">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <QtyBtn onClick={() => { if (prodQty > 1) { setProdQty(q => q - 1); setProdSerials(s => s.slice(0, -1)); setSnakeAte(false) } }}>−</QtyBtn>
              <span style={{ fontSize: 28, fontWeight: 700, color: G.or, minWidth: 44, textAlign: 'center' }}>{prodQty}</span>
              <QtyBtn onClick={() => { if (prodQty < 20) { setProdQty(q => q + 1); setSnakeAte(false) } }}>+</QtyBtn>
            </div>
          </FormRow>
          <FormRow label="СЕРІЙНІ НОМЕРИ">
            {serials.map((v, i) => <input key={i} placeholder={`#${i + 1} серійний номер`} value={v}
              onChange={e => { const s = [...prodSerials]; while (s.length <= i) s.push(''); s[i] = e.target.value; setProdSerials(s); setSnakeAte(false) }}
              style={{ marginBottom: 6 }} />)}
          </FormRow>
        </Card>
        {prodType && <Card>
          <CardTitle>⚡ БУДЕ СПИСАНО</CardTitle>
          {snakeAte ? (
            <div style={{ textAlign: 'center', padding: '24px 10px', animation: 'snakeEatenAnim 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both' }}>
              <style>{`
                @keyframes snakeEatenAnim {
                  0% { transform: scale(0.8) translateY(20px); opacity: 0; }
                  50% { transform: scale(1.1) translateY(-5px); opacity: 1; }
                  100% { transform: scale(1) translateY(0); opacity: 1; }
                }
              `}</style>
              <div style={{ fontSize: 50, marginBottom: 12 }}>🐍💨</div>
              <div style={{ color: G.gn, fontWeight: 800, fontSize: 16, textTransform: 'lowercase' }}>матеріали з'їв ням-ням))</div>
              <div style={{ color: G.t2, fontSize: 13, marginTop: 6, lineHeight: 1.4 }}>
                Списання успішне. <br />Змійка чекає на наступну порцію — введіть нові номери.
              </div>
            </div>
          ) : consumed.length === 0 ? <div style={{ color: G.t2, fontSize: 13 }}>Матеріали не налаштовано для цього типу</div>
            : consumed.map(c => {
              const ok = c.fromStock <= c.totalStock
              return <div key={c.matId + (c.isSubstitute ? '_sub' : '')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${G.b1}`, fontSize: 13, marginLeft: c.isSubstitute ? 12 : 0 }}>
                <span style={{ color: c.isSubstitute ? G.cy : ok ? G.t1 : G.rd, flex: 1, paddingRight: 8 }}>
                  {c.isSubstitute && <span style={{ color: G.t2, marginRight: 4, fontSize: 11 }}>↳</span>}
                  {c.name}
                  {c.isSubstitute && <span style={{ fontSize: 10, color: G.t2, marginLeft: 4 }}>(замість {c.substituteFor})</span>}
                </span>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {c.fromPersonal > 0 && <Chip bg='#2e1065' color='#c084fc' bd='#4c1d95'>👷{c.fromPersonal}</Chip>}
                  {c.fromTeam > 0 && <Chip bg='#1e3a8a' color='#93c5fd' bd='#1e40af'>🤝{c.fromTeam}</Chip>}
                  {c.fromStock > 0 && <Chip bg='#1c1007' color='#fb923c' bd='#9a3412'>🏭{c.fromStock}</Chip>}
                  <span style={{ color: ok ? G.gn : G.rd, fontWeight: 600, minWidth: 60, textAlign: 'right' }}>{c.amount} {c.unit}</span>
                </div>
              </div>
            })}
        </Card>}
        {!snakeAte && <SubmitBtn onClick={doWriteoff}>✓ СПИСАТИ МАТЕРІАЛИ</SubmitBtn>}
        <div style={{ height: 16 }} />
      </>}
      {prodTab === 'prep' && <PrepTab
        batteryTypes={batteryTypes}
        workers={workers}
        assemblies={assemblies}
        materials={materials}
        prepItems={prepItems}
        onIssueAssembly={doIssuePrepAssembly}
        onIssueConsumable={doIssueConsumable}
        onReturn={doReturnPrep}
        onWriteoffPrep={doWriteoffPrep}
        onChangeScope={doChangePrepScope}
        isAdmin={isAdmin}
        getWorkerColor={getWorkerColor}
      />}
      {prodTab === 'assembly' && AssemblyTab()}
    </>)
  }
  // ── Склад ─────────────────────────────────────────────────
  const PageStock = () => {
    const filteredMats = materials.filter(m => !stockSearch || m.name.toLowerCase().includes(stockSearch.toLowerCase()))

    // ── Підтаб: Матеріали (глобальний склад) ─────────────
    const TabMaterials = () => {
      const restock = async (matId) => {
        const qty = parseFloat(rsVals[matId] || 0)
        if (!qty || qty <= 0) return showToast('Введіть кількість', 'err')
        await api('updateMaterialStock', [matId, qty])
        updateGlobalStock(matId, qty)
        setRsVals(v => ({ ...v, [matId]: '' }))
        showToast(`✓ Поповнено на ${qty}`)
      }

      const editStock = (m) => openInput('Новий залишок:', String(m.stock), String(m.stock), async (val) => {
        closeModal()
        const parsed = parseFloat(val)
        if (isNaN(parsed)) return showToast('Невірне значення', 'err')
        const delta = parsed - m.stock
        await api('updateMaterialStock', [m.id, delta])
        updateGlobalStock(m.id, delta)
        showToast(`✓ Залишок встановлено: ${parsed}`)
      })

      const editField = (m, field) => {
        const labels = { name: 'Нова назва:', minStock: 'Мін. запас:', shopUrl: 'Посилання на магазин:', unit: 'Одиниця виміру:', photoUrl: 'Посилання на фото:' }
        openInput(labels[field] || field, String(m[field] || ''), String(m[field] || ''), async (val) => {
          closeModal()
          const value = ['minStock'].includes(field) ? parseFloat(val) || 0 : val.trim()
          await api('updateMaterialField', [m.id, field, value])
          setMaterials(prev => prev.map(mx => mx.id !== m.id ? mx : { ...mx, [field]: value }))
          showToast('✓ Збережено')
        })
      }

      const deleteMat = (m) => openConfirm('Видалити матеріал?',
        <span>Видалить: <b style={{ color: G.rd }}>{m.name}</b> і всі прив'язки до типів</span>,
        async () => {
          closeModal()
          await api('deleteMaterial', [m.id])
          setMaterials(prev => prev.filter(mx => mx.id !== m.id))
          setTypeMaterials(prev => prev.filter(tm => tm.matId !== m.id))
          showToast('✓ Видалено ' + m.name)
        })

      const showHist = (m) => {
        const entries = log.flatMap(e => (e.consumed || []).filter(c => c.name === m.name).map(c => ({ ...c, datetime: e.datetime, workerName: e.workerName, kind: e.kind }))).slice(0, 20)
        setModal({ type: 'history', mat: m, entries })
      }

      const addMat = async () => {
        const { name, unit, stock, minStock, shopUrl, photoUrl } = newGlobalMat
        if (!name || !unit) return showToast("Назва і одиниця — обов'язкові", 'err')
        const res = await api('addMaterial', [name, unit, parseFloat(stock) || 0, parseFloat(minStock) || 0, shopUrl || '', photoUrl || ''])
        const nm = { id: res.id, name, unit, stock: parseFloat(stock) || 0, minStock: parseFloat(minStock) || 0, shopUrl: shopUrl || '', photoUrl: photoUrl || '', isOrdered: false }

        if (newMatDefaultTypeId) {
          try {
            await api('addTypeMaterial', [newMatDefaultTypeId, res.id, 1, 0])
            setTypeMaterials(prev => [...prev, { id: 'tm_' + Date.now(), typeId: newMatDefaultTypeId, matId: res.id, perBattery: 1, minStock: 0 }])
          } catch (e) { console.error('Link error:', e) }
        }

        setMaterials(prev => [...prev, nm])
        setNewGlobalMat({ name: '', unit: '', stock: '', minStock: '', shopUrl: '', photoUrl: '' })
        setNewMatDefaultTypeId('')
        setNewTmMatId(res.id)
        showToast('✓ Додано ' + name + (newMatDefaultTypeId ? ' та прив\'язано до типу' : ''))
      }

      if (!isAdmin) return <>
        <input placeholder="🔍 Пошук матеріалу..." value={stockSearch} onChange={e => setStockSearch(e.target.value)} style={{ marginBottom: 10 }} />
        {filteredMats.map(m => <div key={m.id} style={{ background: G.card, border: `1px solid ${G.b1}`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
            {m.photoUrl && <img src={m.photoUrl} alt={m.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: `1px solid ${G.b1}` }} />}
            <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <StockBadge m={m} />
            <span style={{ background: G.card2, border: `1px solid ${G.b1}`, borderRadius: 6, padding: '2px 8px', fontSize: 13, color: G.cy, fontWeight: 700 }}>{m.stock} {m.unit}</span>
            <span style={{ fontSize: 11, color: G.t2 }}>мін:{m.minStock}</span>
          </div>
          {m.shopUrl && <a href={m.shopUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: G.cy, textDecoration: 'none', display: 'inline-block', marginTop: 6 }}>🔗 Магазин</a>}
        </div>)}
      </>

      return <>
        <input placeholder="🔍 Пошук матеріалу..." value={stockSearch} onChange={e => setStockSearch(e.target.value)} style={{ marginBottom: 10 }} />

        {filteredMats.map(m => {
          const inPrep = prepItems.filter(p => p.matId === m.id && p.status !== 'returned').reduce((s, p) => +(s + p.qty - p.returnedQty).toFixed(2), 0)
          return <div key={m.id} style={{ background: G.card, border: `1px solid ${G.b1}`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
              <div style={{ flex: 1, display: 'flex', gap: 10 }}>
                {m.photoUrl && <img src={m.photoUrl} alt={m.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: `1px solid ${G.b1}` }} />}
                <div>
                  <div onClick={() => editField(m, 'name')} style={{ fontSize: 14, fontWeight: 600, cursor: 'pointer', color: G.t1 }}>{m.name}</div>
                  <div onClick={() => editField(m, 'unit')} style={{ cursor: 'pointer', fontSize: 11, color: G.t2, marginTop: 2 }}>{m.unit}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={() => showHist(m)} style={{ background: G.card2, border: `1px solid ${G.b1}`, color: G.pu, padding: '3px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>📊</button>
                <button onClick={() => deleteMat(m)} style={{ background: '#450a0a', border: 'none', color: G.rd, padding: '3px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>✕</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              <StockBadge m={m} />
              <span onClick={() => editStock(m)} style={{ background: G.card2, border: `1px solid ${G.b1}`, borderRadius: 6, padding: '2px 8px', fontSize: 12, color: G.cy, cursor: 'pointer' }}>{m.stock} {m.unit}</span>
              {m.stock < -1000000 && (
                <button 
                  onClick={async () => { 
                    if (window.confirm("Скинути цей некоректний залишок до 0?")) {
                      await api('updateMaterialField', [m.id, 'stock', 0]); 
                      setMaterials(prev => prev.map(mx => mx.id !== m.id ? mx : { ...mx, stock: 0 }));
                      showToast('✓ Обнулено');
                    }
                  }} 
                  style={{ background: G.rd, color: '#fff', border: 'none', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                >
                  Скинути в 0
                </button>
              )}
              <span onClick={() => editField(m, 'minStock')} style={{ fontSize: 11, color: G.t2, cursor: 'pointer' }}>мін:{m.minStock}</span>
              {inPrep > 0 && <Chip bg='#2e1065' color='#c084fc' bd='#4c1d95'>📦{inPrep}</Chip>}
            </div>

            {/* Посилання на магазин */}
            {editShopId === m.id ? (
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <input placeholder="https://..." value={editShopVal} onChange={e => setEditShopVal(e.target.value)} style={{ fontSize: 12 }} />
                <button onClick={async () => { await api('updateMaterialField', [m.id, 'shopUrl', editShopVal]); setMaterials(prev => prev.map(mx => mx.id !== m.id ? mx : { ...mx, shopUrl: editShopVal })); setEditShopId(null); showToast('✓ Збережено') }} style={{ padding: '6px 10px', background: G.gn, color: '#000', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>✓</button>
                <button onClick={() => setEditShopId(null)} style={{ padding: '6px 10px', background: G.b1, color: G.t2, border: `1px solid ${G.b2}`, borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>✕</button>
              </div>
            ) : (
              <div style={{ marginBottom: 8 }}>
                {m.shopUrl ? <a href={m.shopUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: G.cy, textDecoration: 'none', marginRight: 8 }}>🔗 Магазин</a> : null}
                <span onClick={() => { setEditShopId(m.id); setEditShopVal(m.shopUrl || '') }} style={{ fontSize: 11, color: G.t2, cursor: 'pointer', marginRight: 8 }}>{m.shopUrl ? '✎' : '+ посилання'}</span>
                <span onClick={() => editField(m, 'photoUrl')} style={{ fontSize: 11, color: G.t2, cursor: 'pointer' }}>{m.photoUrl ? '📷 змінити фото' : '+ фото'}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 6 }}>
              <input type="number" placeholder="+кільк." value={rsVals[m.id] || ''} onChange={e => setRsVals(v => ({ ...v, [m.id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && restock(m.id)} style={{ width: 90 }} />
              <button onClick={() => restock(m.id)} style={{ padding: '6px 12px', background: '#431407', color: '#fed7aa', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+поповнити</button>
            </div>
          </div>
        })}

        {isAdmin && <Card>
          <CardTitle color={G.gn}>+ НОВИЙ МАТЕРІАЛ НА СКЛАД</CardTitle>
          <FormRow label="НАЗВА">
            <input placeholder="напр. Нікелева стрічка" value={newGlobalMat.name} onChange={e => setNewGlobalMat(v => ({ ...v, name: e.target.value }))} />
          </FormRow>
          <FormRow label="ПРИВ'ЯЗАТИ ДО ТИПУ?">
            <select value={newMatDefaultTypeId} onChange={e => setNewMatDefaultTypeId(e.target.value)}>
              <option value="">-- не прив'язувати --</option>
              {batteryTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </FormRow>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
            <div><Label>ОДИНИЦЯ</Label><input placeholder="шт, м, г" value={newGlobalMat.unit} onChange={e => setNewGlobalMat(v => ({ ...v, unit: e.target.value }))} /></div>
            <div><Label>ЗАЛИШОК</Label><input type="number" placeholder="0" value={newGlobalMat.stock} onChange={e => setNewGlobalMat(v => ({ ...v, stock: e.target.value }))} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
            <div><Label>МІН. ЗАПАС</Label><input type="number" placeholder="0" value={newGlobalMat.minStock} onChange={e => setNewGlobalMat(v => ({ ...v, minStock: e.target.value }))} /></div>
            <div><Label>ПОСИЛАННЯ</Label><input placeholder="https://..." value={newGlobalMat.shopUrl} onChange={e => setNewGlobalMat(v => ({ ...v, shopUrl: e.target.value }))} /></div>
          </div>
          <FormRow label="ФОТО (URL)">
            <input placeholder="https://..." value={newGlobalMat.photoUrl} onChange={e => setNewGlobalMat(v => ({ ...v, photoUrl: e.target.value }))} />
          </FormRow>
          <SubmitBtn onClick={addMat} color={G.gn}>+ ДОДАТИ НА СКЛАД</SubmitBtn>
        </Card>}

        {isAdmin && <Card>
          <CardTitle color={G.cy}>✈ ВІДПРАВИТИ СКЛАД У TELEGRAM</CardTitle>
          <div style={{ color: G.t2, fontSize: 13, marginBottom: 16 }}>Згенерувати та відправити повний звіт про стан глобального складу боту.</div>
          <SubmitBtn color={G.cy} onClick={async () => {
            const lines = materials.map(m => `• ${m.name}: ${m.stock} ${m.unit} (мін: ${m.minStock})`).join('\n')
            await sendTelegram(`📦 Повний звіт зі складу\n\n${lines}`)
            showToast('✓ Звіт відправлено в Telegram')
          }}>📝 ВІДПРАВИТИ ЗВІТ</SubmitBtn>
        </Card>}
      </>
    }

    // ── Підтаб: Типи батарей (конфігурація) ──────────────
    const TabTypes = () => {
      if (!isAdmin) return <div style={{ color: G.t2, fontSize: 13, padding: 20, textAlign: 'center' }}>Доступно тільки адміну</div>

      const editTm = (tmId, typeId, matId, field, oldVal) => openInput(
        field === 'perBattery' ? 'На 1 акумулятор:' : 'Мін. запас для цього типу:',
        String(oldVal), String(oldVal),
        async (val) => {
          closeModal()
          const parsed = parseFloat(val) || 0
          await api('updateTypeMaterial', [tmId, field, parsed])
          setTypeMaterials(prev => prev.map(tm => tm.id !== tmId ? tm : { ...tm, [field]: parsed }))
          showToast('✓ Оновлено')
        }
      )

      const removeTm = (m) => openConfirm('Видалити прив\'язку?',
        <span>Матеріал <b style={{ color: G.rd }}>{m.name}</b> більше не буде списуватись для цього типу. Зі складу не видаляється.</span>,
        async () => {
          closeModal()
          await api('removeTypeMaterial', [m.id])
          setTypeMaterials(prev => prev.filter(tm => tm.id !== m.id))
          showToast('✓ Прив\'язку видалено')
        }
      )

      const addTm = async () => {
        if (!newTmMatId || !newTmPerBattery) return showToast("Оберіть матеріал і вкажіть норму", 'err')
        const alreadyExists = typeMaterials.find(tm => tm.typeId == configTypeId && tm.matId == newTmMatId)
        if (alreadyExists) return showToast('Цей матеріал вже є для даного типу', 'err')
        const gm = materials.find(m => m.id == newTmMatId)
        const pb = parseFloat(newTmPerBattery) || 0
        const ms = parseFloat(newTmMinStock) || 0
        const res = await api('addTypeMaterial', [configTypeId, newTmMatId, pb, ms])
        setTypeMaterials(prev => [...prev, { id: res.id, typeId: configTypeId, matId: gm.id, perBattery: pb, minStock: ms }])
        setNewTmPerBattery('')
        setNewTmMinStock('')
        showToast(`✓ ${gm.name} → ${configType.name}`)
      }

      const addBattType = () => openInput('Новий тип акумулятора', 'Назва типу (напр. 48V 20Ah)', '', async (name) => {
        closeModal()
        const res = await api('addBatteryType', [name])
        const newType = { id: res.id, name, color: G.or }
        setBatteryTypes(p => [...p, newType])
        setConfigTypeId(res.id)
        showToast('✓ Тип додано: ' + name)
      })

      return <>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}><TypeTabs types={batteryTypes} active={configTypeId} onSelect={setConfigTypeId} /></div>
          <button onClick={addBattType} style={{ background: G.b1, border: `1px solid ${G.b2}`, color: G.gn, padding: '10px 14px', borderRadius: 10, fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>+</button>
        </div>

        {configType && <>
          <div style={{ color: G.t2, fontSize: 12, marginBottom: 10, padding: '6px 10px', background: G.b1, borderRadius: 8 }}>
            Матеріали для <b style={{ color: configType.color || G.or }}>{configType.name}</b> — що і скільки витрачається на один акумулятор
          </div>

          {typeMaterials.filter(tm => tm.typeId == configTypeId).length === 0
            ? <Card><div style={{ color: G.t2, fontSize: 13, textAlign: 'center', padding: '10px 0' }}>Матеріали не налаштовано — додайте нижче</div></Card>
            : typeMaterials.filter(tm => tm.typeId == configTypeId).map(tm => {
              const gm = globalMat(tm.matId)
              return <div key={tm.matId} style={{ background: G.card, border: `1px solid ${G.b1}`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{gm?.name ?? '?'}</div>
                    <div style={{ fontSize: 11, color: G.t2, marginTop: 2 }}>На складі: <b style={{ color: G.cy }}>{gm?.stock ?? '?'} {gm?.unit ?? ''}</b></div>
                  </div>
                  <button onClick={() => removeTm(tm)} style={{ background: '#450a0a', border: 'none', color: G.rd, padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                  <span onClick={() => editTm(tm.id, configTypeId, tm.matId, 'perBattery', tm.perBattery)} style={{ background: G.card2, border: `1px solid ${G.or}44`, borderRadius: 8, padding: '4px 10px', fontSize: 13, color: G.or, cursor: 'pointer', fontWeight: 600 }}>
                    ×{tm.perBattery} {gm?.unit ?? ''}/акум
                  </span>
                  <span onClick={() => editTm(tm.id, configTypeId, tm.matId, 'minStock', tm.minStock)} style={{ background: G.card2, border: `1px solid ${G.b2}`, borderRadius: 8, padding: '4px 10px', fontSize: 12, color: G.t2, cursor: 'pointer' }}>
                    мін:{tm.minStock}
                  </span>
                </div>
              </div>
            })}

          <Card>
            <CardTitle color={G.gn}>+ ДОДАТИ МАТЕРІАЛ ДО ТИПУ</CardTitle>
            <FormRow label="МАТЕРІАЛ ЗІ СКЛАДУ">
              <select value={newTmMatId} onChange={e => setNewTmMatId(e.target.value)}>
                <option value="">— оберіть матеріал —</option>
                {materials.filter(m => !typeMaterials.find(tm => tm.typeId == configTypeId && tm.matId == m.id)).map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.stock} {m.unit})</option>
                ))}
              </select>
            </FormRow>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div><Label>НА 1 АКУМУЛЯТОР</Label><input type="number" placeholder="напр. 48" value={newTmPerBattery} onChange={e => setNewTmPerBattery(e.target.value)} /></div>
              <div><Label>МІН. ЗАПАС (тут)</Label><input type="number" placeholder="0" value={newTmMinStock} onChange={e => setNewTmMinStock(e.target.value)} /></div>
            </div>
            {newTmMatId && materials.find(m => m.id == newTmMatId) && (
              <div style={{ fontSize: 12, color: G.t2, marginTop: 8, padding: '6px 10px', background: G.b1, borderRadius: 8 }}>
                На складі: <b style={{ color: G.cy }}>{materials.find(m => m.id == newTmMatId)?.stock} {materials.find(m => m.id == newTmMatId)?.unit}</b>
              </div>
            )}
            <SubmitBtn onClick={addTm} color={G.gn}>+ ПРИВ'ЯЗАТИ ДО ТИПУ</SubmitBtn>
          </Card>
        </>}
      </>
    }


    // ── Підтаб: Збірки ────────────────────────────────────
    const TabAssemblies = () => {
      if (!isAdmin) return <div style={{ color: G.t2, fontSize: 13, padding: 20, textAlign: 'center' }}>Доступно тільки адміну</div>

      const createAsm = async () => {
        if (!newAsmName || !newAsmOutMatId || !newAsmOutQty) return showToast("Назва, матеріал (результат) і кількість — обов'язкові", 'err')

        const requiredComps = Object.keys(newAsmComps).map(mId => ({ matId: mId, qty: parseFloat(newAsmComps[mId]) || 0 })).filter(c => c.qty > 0)
        if (requiredComps.length < 2) return showToast("Збірка повинна містити хоча б 2 матеріали", 'err')

        const gm = globalMat(newAsmOutMatId)
        const res = await api('addAssembly', [newAsmName, newAsmOutMatId, parseFloat(newAsmOutQty) || 1, gm?.unit || '', newAsmNotes, '', newAsmDefDest])
        if (!res.ok) return showToast(res.error, 'err')

        await api('saveAssemblyComponents', [res.id, JSON.stringify(requiredComps)])
        const newComponents = requiredComps.map((c, i) => ({ id: 'ac_' + Date.now() + '_' + i, assemblyId: res.id, matId: c.matId, qty: c.qty }))

        const na = { id: res.id, name: newAsmName, outputMatId: newAsmOutMatId, outputQty: parseFloat(newAsmOutQty) || 1, unit: gm?.unit || '', notes: newAsmNotes, components: newComponents, defDest: newAsmDefDest }

        if (newAsmDefaultTypeId) {
          try {
            await api('addTypeMaterial', [newAsmDefaultTypeId, newAsmOutMatId, 1, 0])
            setTypeMaterials(prev => [...prev, { id: 'tm_' + Date.now(), typeId: newAsmDefaultTypeId, matId: newAsmOutMatId, perBattery: 1, minStock: 0 }])
          } catch (e) { console.error('Link error:', e) }
        }

        setAssemblies(prev => [...prev, na])
        setNewAsmName(''); setNewAsmNotes(''); setNewAsmComps({}); setNewAsmDefDest('stock'); setNewAsmDefaultTypeId('');
        showToast('✓ Збірку створено: ' + newAsmName + (newAsmDefaultTypeId ? ' та прив\'язано до типу' : ''))
      }

      const deleteAsm = (a) => openConfirm('Видалити збірку?',
        <span>Видалить <b style={{ color: G.rd }}>{a.name}</b> і всі компоненти</span>,
        async () => {
          closeModal()
          await api('deleteAssembly', [a.id])
          setAssemblies(prev => prev.filter(ax => ax.id !== a.id))
          if (editAsmId === a.id) setEditAsmId(null)
          showToast('✓ Видалено')
        })

      const startEditAsm = (a) => {
        const initial = {}
        a.components.forEach(ac => initial[ac.matId] = ac.qty)
        setEditAsmComps(initial)
        setEditAsmId(a.id)
        setEditAsmDefDest(a.defDest || 'stock')
      }

      const saveEditAsm = async (a) => {
        const mats = Object.keys(editAsmComps).map(matId => ({ matId, qty: parseFloat(editAsmComps[matId]) || 0 })).filter(c => c.qty > 0)
        if (mats.length < 2) return showToast('Збірка повинна містити хоча б 2 матеріали', 'err')

        closeModal()
        await api('updateAssemblyField', [a.id, 'defDest', editAsmDefDest])
        await api('saveAssemblyComponents', [a.id, JSON.stringify(mats)])

        setAssemblies(prev => prev.map(ax => {
          if (ax.id !== a.id) return ax
          const newComps = mats.map((m, i) => ({ id: 'ac_' + Date.now() + '_' + i, assemblyId: a.id, matId: m.matId, qty: m.qty }))
          return { ...ax, components: newComps, defDest: editAsmDefDest }
        }))
        setEditAsmId(null)
        showToast('✓ Склад збірки збережено')
      }

      const addComp = async () => { /* deprecated single add */ }
      const removeComp = (asmId, ac) => { /* deprecated single remove */ }
      const editCompQty = (asmId, ac) => { /* deprecated single edit */ }

      return <>
        {/* Список збірок */}
        {assemblies.map(a => {
          const gm = globalMat(a.outputMatId)
          const isEditing = editAsmId === a.id
          return <div key={a.id} style={{ background: G.card, border: `1px solid ${isEditing ? '#7c3aed' : G.b1}`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa' }}>{a.name}</div>
                <div style={{ fontSize: 12, color: G.t2, marginTop: 2 }}>
                  → <b style={{ color: G.cy }}>{a.outputQty}</b> {gm?.unit || a.unit} <b>{gm?.name || '?'}</b> на складі
                  {<span style={{ color: G.t1, marginLeft: 8, fontSize: 10, border: `1px solid ${G.b1}`, borderRadius: 4, padding: '2px 4px', background: '#1e293b' }}>{a.defDest === 'personal' ? '👷 Особ. заготовка' : a.defDest === 'team' ? '🤝 Спільна заготовка' : '🏭 На Склад'}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => {
                  if (isEditing) {
                    saveEditAsm(a)
                  } else {
                    startEditAsm(a)
                  }
                }} style={{ background: isEditing ? '#166534' : G.b1, border: `1px solid ${isEditing ? '#22c55e' : G.b2}`, color: isEditing ? '#22c55e' : '#a78bfa', padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                  {isEditing ? '✓ зберегти' : '✎ склад'}
                </button>
                {isEditing && <button onClick={() => setEditAsmId(null)} style={{ background: G.b1, border: `1px solid ${G.b2}`, color: G.t2, padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>✕ скасувати</button>}
                {!isEditing && <button onClick={() => deleteAsm(a)} style={{ background: '#450a0a', border: 'none', color: G.rd, padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>✕</button>}
              </div>
            </div>

            {/* View Mode */}
            {!isEditing && a.components.length > 0 && <div style={{ background: G.b1, borderRadius: 8, padding: '8px 10px' }}>
              {a.components.map(ac => {
                const cgm = globalMat(ac.matId)
                return <div key={ac.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 13 }}>
                  <span style={{ flex: 1, color: G.t1 }}>{cgm?.name || ac.matId}</span>
                  <span style={{ color: G.or, fontWeight: 600, background: G.card2, borderRadius: 6, padding: '2px 8px' }}>×{ac.qty} {cgm?.unit || ''}</span>
                </div>
              })}
            </div>}

            {/* Edit Mode (Multi-Select List) */}
            {isEditing && <div style={{ borderTop: `1px solid ${G.b1}`, paddingTop: 10 }}>
              <div style={{ fontSize: 12, color: G.t2, marginBottom: 10 }}>Позначте матеріали, з яких складається ця збірка:</div>
              {materials.map(m => {
                const checked = editAsmComps.hasOwnProperty(m.id)
                const qty = checked ? (editAsmComps[m.id] ?? '') : ''
                return <div key={m.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${G.b1}`, fontSize: 13 }}>
                  <input type="checkbox" checked={checked} onChange={e => {
                    const chk = e.target.checked
                    setEditAsmComps(v => {
                      const next = { ...v }
                      if (chk) next[m.id] = 1
                      else delete next[m.id]
                      return next
                    })
                  }} style={{ width: 18, height: 18, accentColor: '#a78bfa', cursor: 'pointer', flexShrink: 0 }} />
                  <div style={{ flex: '1 1 120px', color: checked ? G.t1 : G.t2, minWidth: 120, wordBreak: 'break-word', lineHeight: 1.3 }}>{m.name}</div>
                  {checked && <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <input type="number" min="0" step="any" value={qty} onChange={e => setEditAsmComps(v => ({ ...v, [m.id]: e.target.value }))} style={{ width: 70, border: `2px solid #a78bfa`, background: '#2e1065', color: G.t1, fontWeight: 'bold', textAlign: 'center', padding: '4px' }} placeholder="кількість" />
                    <span style={{ color: G.t2, fontSize: 12, width: 24 }}>{m.unit}</span>
                  </div>}
                </div>
              })}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '8px 0', borderTop: `1px dashed ${G.b1}` }}>
                <span style={{ fontSize: 13, color: G.t2 }}>Куди йде збірка?</span>
                <select value={editAsmDefDest} onChange={e => setEditAsmDefDest(e.target.value)} style={{ flex: 1, padding: '6px 4px' }}>
                  <option value="stock">🏭 На Глобальний склад</option>
                  <option value="personal">👷 В Особисту заготовку</option>
                  <option value="team">🤝 У Спільну заготовку</option>
                </select>
              </div>
            </div>}
          </div>
        })}

        {/* Форма нової збірки */}
        <Card>
          <CardTitle color='#a78bfa'>+ НОВА ЗБІРКА</CardTitle>
          <FormRow label="НАЗВА ЗБІРКИ"><input placeholder="напр. Обжатий кабель XT90" value={newAsmName} onChange={e => setNewAsmName(e.target.value)} /></FormRow>
          <div style={{ padding: '10px 0' }}>
            <div style={{ fontSize: 12, color: G.t2, marginBottom: 10, fontWeight: 'bold' }}>КОМПОНЕНТИ ЗБІРКИ (відмітьте, з чого вона складається):</div>
            <div style={{ maxHeight: 240, overflowY: 'auto', border: `1px solid ${G.b1}`, borderRadius: 8, padding: 8, background: 'rgba(0,0,0,0.2)' }}>
              {materials.map(m => {
                const checked = newAsmComps.hasOwnProperty(m.id)
                const qty = checked ? (newAsmComps[m.id] ?? '') : ''
                return <div key={m.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: `1px solid ${G.b1}`, fontSize: 13 }}>
                  <input type="checkbox" checked={checked} onChange={e => {
                    const chk = e.target.checked
                    setNewAsmComps(v => {
                      const next = { ...v }
                      if (chk) next[m.id] = 1
                      else delete next[m.id]
                      return next
                    })
                  }} style={{ width: 16, height: 16, accentColor: '#a78bfa', cursor: 'pointer', flexShrink: 0 }} />
                  <div style={{ flex: '1 1 120px', color: checked ? G.t1 : G.t2, minWidth: 120, wordBreak: 'break-word', lineHeight: 1.3 }}>{m.name}</div>
                  {checked && <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <input type="number" min="0" step="any" value={qty} onChange={e => setNewAsmComps(v => ({ ...v, [m.id]: e.target.value }))} style={{ width: 80, border: `2px solid #a78bfa`, background: '#2e1065', color: G.t1, fontWeight: 'bold', textAlign: 'center', padding: '4px', fontSize: 13 }} placeholder="кільк." />
                    <span style={{ color: G.t2, fontSize: 12, width: 24 }}>{m.unit}</span>
                  </div>}
                </div>
              })}
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${G.b1}`, marginTop: 10, paddingTop: 16 }}>
            <div style={{ fontSize: 15, color: G.or, marginBottom: 10, fontWeight: 'bold' }}>➔ РЕЗУЛЬТАТ ВИРОБНИЦТВА</div>
            <div style={{ fontSize: 12, color: G.t2, marginBottom: 10 }}>Що саме буде додано на склад, коли працівник "виготовить" цю збірку?</div>
            <FormRow label="Готовий матеріал (результат)">
              <select value={newAsmOutMatId} onChange={e => setNewAsmOutMatId(e.target.value)}>
                <option value="">-- оберіть що виробляється --</option>
                {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </FormRow>
            <FormRow label="Кількість готового виробу (зазвичай 1)">
              <input type="number" placeholder="1" value={newAsmOutQty} onChange={e => setNewAsmOutQty(e.target.value)} />
            </FormRow>
            <FormRow label="Прив'язати до типу за замовчуванням?">
              <select value={newAsmDefaultTypeId} onChange={e => setNewAsmDefaultTypeId(e.target.value)}>
                <option value="">-- не прив'язувати --</option>
                {batteryTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </FormRow>
            <FormRow label="Нотатка для працівника"><input placeholder="напр. інструкція щодо пайки" value={newAsmNotes} onChange={e => setNewAsmNotes(e.target.value)} /></FormRow>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
     <span style={{ fontSize: 13, color: G.t2 }}>Куди йде збірка?</span>
     <select value={newAsmDefDest} onChange={e => setNewAsmDefDest(e.target.value)} style={{ flex: 1, padding: 8 }}>
       <option value="stock">🏭 На Глобальний склад</option>
       <option value="personal">👷 В Особисту заготовку</option>
       <option value="team">🤝 У Спільну заготовку</option>
     </select>
   </div>
            <SubmitBtn onClick={createAsm} color='#a78bfa'>+ ЗБЕРЕГТИ ЗБІРКУ ТА ЇЇ СКЛАД</SubmitBtn>
          </div>
        </Card>
      </>
    }

    return wrap(<>
      <SubTabs tabs={[['materials', '📦 МАТЕРІАЛИ'], ['types', '🔋 ТИПИ БАТАРЕЙ'], ['assemblies', '⚙️ ЗБІРКИ']]} active={stockTab} onChange={setStockTab} />
      {stockTab === 'materials' ? TabMaterials() : stockTab === 'types' ? TabTypes() : TabAssemblies()}
    </>)
  }
  // ── Ремонт ────────────────────────────────────────────────
  const PageRepair = () => {
    const [expandedMats, setExpandedMats] = useState({})
    const serial = repairSerial
    const found = serial ? log.find(l => l.serials?.includes(serial)) : null
    const repType = found ? batteryTypes.find(t => String(t.id) === String(found.typeId)) : null
    const doSearch = () => {
      const s = repairSearch.trim()
      if (s) {
        const pending = repairLog.find(r => String(r.serial) === String(s) && r.status !== 'completed')
        if (pending) {
          // Попереджаємо, але НЕ блокуємо — можливо потрібно переглянути або дублювати запис
          showToast(`⚠ Акум ${s} вже чекає ремонту (pending)`, 'err')
        }
      }
      setRepairSerial(s)
    }


    const handleRegisterArrival = () => {
      if (!found) return
      // Use found.typeId if repType is not found due to strict matching etc., 
      // but we fixed it to == above, so repType should be ok.
      const entry = { id: uid(), datetime: nowStr(), date: repDate, serial, typeName: found.typeName, typeId: found.typeId, originalWorker: found.workerName, repairWorker: '', note: repNote, materials: [], status: 'pending', photoUrl: repPhotoUrl }
      
      openConfirm('ПРИЙНЯТИ В РЕМОНТ?', 
        <div style={{ fontSize: 14 }}>
          Підтвердити прийомку акумулятора <b style={{ color: G.cy }}>{serial}</b> на ремонт?
        </div>,
        async () => {
          closeModal()
          try {
            await api('addRepair', [entry])
            setRepairLog(prev => [entry, ...prev])
            showToast('✓ Прийнято в ремонт: ' + serial)
            setRepairSearch('')
            setRepairSerial('')
          } catch (e) {
            showToast('Помилка прийому: ' + e.message, 'err')
          }
        }
      )
    }

    const handleManualRegister = () => {
      // Якщо користувач не вибрав тип/працівника — беремо перший доступний
      const effectiveTypeId = manTypeId || batteryTypes[0]?.id || ''
      const effectiveWorkerId = manWorkerId || workers[0]?.id || ''
      const t = batteryTypes.find(t => String(t.id) === String(effectiveTypeId))
      const w = workers.find(w => String(w.id) === String(effectiveWorkerId))
      
      // Duplicate check before manual registration
      const alreadyInLog = log.find(l => (l.serials || []).some(s => String(s).trim().toLowerCase() === serial.trim().toLowerCase()))
      if (alreadyInLog) {
        showToast(`⚠ Акумулятор ${serial} вже зареєстрований як ${alreadyInLog.typeName}!`, 'err')
        setRepairSerial(serial.trim()) // force re-find to switch UI
        return
      }

      const entry = { id: uid(), datetime: nowStr(), date: manDate, typeId: effectiveTypeId, typeName: t?.name || '', workerName: w?.name || '', count: 1, serials: [serial], consumed: [], kind: 'production', repairNote: '' }
      
      openConfirm('ЗАРЕЄСТРУВАТИ ВРУЧНУ?', 
        <div style={{ fontSize: 13 }}>
          Зареєструвати акумулятор <b style={{ color: G.yw }}>{serial}</b> як виготовлений? (Додасть запис у журнал виробництва)
        </div>,
        async () => {
          closeModal()
          try {
            await api('writeOff', [entry]) // Use writeOff directly as it definitely exists
            setLog(prev => [entry, ...prev])
            showToast('✓ Зареєстровано ' + serial)
          } catch (e) {
            showToast('Помилка реєстрації: ' + e.message, 'err')
          }
        }
      )
    }

    const startCompleting = (r) => {
      setCompletingId(r.id)
      setCompWorker(r.repairWorker || repWorker || (workers.length > 0 ? workers[0].id : ''))
      setCompDate(todayStr())
      setCompNote('')
      setCompPhotoUrl(r.photoUrl || '')
      const initialChecks = {}
      const initialQtys = {}
      typeMaterials.filter(tm => String(tm.typeId) === String(r.typeId)).forEach(tm => {
        initialChecks[tm.matId] = false
        initialQtys[tm.matId] = tm.perBattery
      })
      setCompChecks(initialChecks)
      setCompQtys(initialQtys)
    }

    const confirmComplete = async (r) => {
      const cw = workers.find(w => w.id === compWorker)
      
      const selectedMats = Object.keys(compChecks)
        .filter(mId => compChecks[mId])
        .map(mId => {
          const qty = parseFloat(compQtys[mId])
          return { matId: mId, qty: isNaN(qty) ? 0 : qty }
        })
        .filter(m => m.qty > 0)

      if (selectedMats.length === 0) {
        // can complete without materials
      }

      const consumed = buildRepairConsumed(selectedMats, compWorker, r.typeId)
      const shortage = consumed.find(c => c.fromStock > c.totalStock)
      if (shortage) return showToast('Не вистачає на складі: ' + shortage.name, 'err')

      openConfirm('Завершити ремонт?', 'Будуть списані матеріали (з рук або зі складу) та оновлено статус.', async () => {
        closeModal()
        try {
          const res = await api('updateRepairStatus', [r.id, 'completed', compDate, cw?.name || '', compressConsumed(consumed), compNote, compPhotoUrl])
          if (!res.ok) throw new Error(res.error)

          // 1. Update Global Stock
          consumed.forEach(c => { if (c.fromStock > 0) updateGlobalStock(c.matId, -c.fromStock) })

          // 2. Deduct from Prep Items
          setPrepItems(prev => {
            const next = prev.map(p => ({ ...p }))
            consumed.forEach(c => {
              const doDeduct = (isTeam, amt) => {
                if (!amt) return
                let rem = amt
                next.filter(p => (isTeam ? p.scope === 'all' : (p.workerId === compWorker && p.scope !== 'all')) && (p.typeId === r.typeId || p.typeId === 'ALL') && p.matId === c.matId && p.status !== 'returned').forEach(p => {
                  if (rem <= 0) return
                  const avail = p.qty - p.returnedQty
                  const use = Math.min(avail, rem)
                  p.returnedQty = +(p.returnedQty + use).toFixed(2)
                  p.status = p.returnedQty >= p.qty ? 'returned' : 'partial'
                  rem = +(rem - use).toFixed(2)
                })
              }
              doDeduct(false, c.fromPersonal)
              doDeduct(true, c.fromTeam)
            })
            return next
          })

          // 3. Update Repair Log locally
          setRepairLog(prev => prev.map(rx => {
            if (rx.id !== r.id) return rx
            const curNote = String(rx.note || '')
            let fullAppend = ""
            if (compNote) fullAppend += compNote
            if (compDate) fullAppend += (fullAppend ? ' | ' : '') + 'Завершено: ' + compDate
            const newNote = curNote + (curNote ? ' | ' : '') + fullAppend
            
            // For the repair log entry, we store what was consumed
            return { ...rx, status: 'completed', note: newNote, repairWorker: cw?.name || '', materials: consumed, photoUrl: compPhotoUrl }
          }))

          // 4. Add to General Log if backend returned transformed consumed
          if (res.consumed || consumed.length > 0) {
            setLog(prev => [{
              id: r.id + '_C', datetime: nowStr(), date: compDate, typeId: r.typeId, typeName: r.typeName,
              workerName: cw?.name || r.repairWorker, count: 0, serials: [r.serial], consumed: res.consumed || consumed,
              kind: 'repair', repairNote: 'Завершено ремонт: ' + r.serial
            }, ...prev])
          }

          setCompletingId(null)
          showToast('✓ Ремонт успішно завершено')
        } catch (e) {
          showToast(e.message || 'Помилка', 'err')
        }
      })
    }

    const returnAll = (r) => openConfirm('Повернути всі матеріали?', 'Повернуться на склад.', async () => {
      closeModal()
      await api('returnRepairMaterials', [r.id, null])
      r.materials.filter(m => m.selected && m.qty > 0).forEach(m => updateGlobalStock(m.matId, m.qty))
      showToast('✓ Матеріали повернуто')
    })

    const deleteRep = (r) => openConfirm('Видалити запис?', 'Матеріали НЕ повернуться на склад.', async () => {
      closeModal()
      await api('deleteRepair', [r.id])
      setRepairLog(prev => prev.filter(rx => String(rx.id) !== String(r.id)))
      showToast('✓ Видалено')
    })

    return wrap(<>
      <SubTabs tabs={[['new', '🔧 НОВИЙ'], ['log', `📋 ЗАПИСИ (${repairLog.length})`], ['bms', '💔 ЗЛАМАНІ BMS']]} active={repTab} onChange={setRepTab} />
      {repTab === 'new' && <>
        <Card>
          <CardTitle color='#fb923c'>🔧 РЕЄСТРАЦІЯ РЕМОНТУ</CardTitle>
          <FormRow label="СЕРІЙНИЙ НОМЕР">
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={repairSearch} onChange={e => setRepairSearch(e.target.value)} placeholder="напр. SK-2026-001" onKeyDown={e => e.key === 'Enter' && doSearch()} />
              <button onClick={doSearch} style={{ padding: '8px 14px', background: G.b1, border: `1px solid ${G.b2}`, color: G.t1, borderRadius: 8, fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>🔍</button>
            </div>
          </FormRow>
        </Card>

        {serial && found && <Card style={{ borderColor: repType ? G.gn : G.yw }}>
          <div style={{ color: repType ? G.gn : G.yw, fontSize: 12, marginBottom: 12 }}>
            {repType ? '✓ Знайдено' : '⚠ Знайдено'}: {found.typeName} · <span style={{ color: getWorkerColor(found.workerName), fontWeight: 600 }}>{found.workerName}</span> · {found.date}
            {!repType && <span style={{ color: G.t2, fontSize: 11, display: 'block', marginTop: 4 }}>(Тип ID:{found.typeId} не знайдено — прийом все одно дозволений)</span>}
          </div>
          <FormRow label="ДАТА ПРИЙОМКИ"><input value={repDate} onChange={e => setRepDate(e.target.value)} /></FormRow>
          <FormRow label="ОПИС НЕСПРАВНОСТІ / НОТАТКА"><input value={repNote} onChange={e => setRepNote(e.target.value)} placeholder="напр. не заряджається" /></FormRow>
          <FormRow label="ФОТО (URL-посилання)"><input value={repPhotoUrl} onChange={e => setRepPhotoUrl(e.target.value)} placeholder="https://example.com/photo.jpg" /></FormRow>
          <SubmitBtn onClick={handleRegisterArrival} color='#ea580c'>🔧 ПРИЙНЯТИ В РЕМОНТ</SubmitBtn>
        </Card>}

        {serial && !found && <Card style={{ borderColor: G.yw }}>
          <div style={{ color: G.yw, fontSize: 13, marginBottom: 12 }}>⚠ Акумулятор не знайдено — зареєструйте вручну</div>
          <FormRow label="ТИП АКУМУЛЯТОРА">
            <select value={manTypeId} onChange={e => setManTypeId(e.target.value)}>
              {batteryTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </FormRow>
          <FormRow label="ВИРОБНИК">
            <select value={manWorkerId} onChange={e => setManWorkerId(e.target.value)}>
              {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </FormRow>
          <FormRow label="ДАТА ВИРОБНИЦТВА">
            <input value={manDate} onChange={e => setManDate(e.target.value)} placeholder="дд.мм.рррр" />
          </FormRow>
          <SubmitBtn color={G.yw} onClick={handleManualRegister}>+ ЗАРЕЄСТРУВАТИ</SubmitBtn>
        </Card>}
      </>}

      {repTab === 'log' && (repairLog.length === 0 ? <Center>Ремонтів немає</Center> :
        repairLog.map(r => <div key={r.id} style={{ background: G.card, border: `1px solid ${G.b1}`, borderLeft: `3px solid ${r.status === 'completed' ? '#22c55e' : '#fb923c'}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700 }}>{r.serial}</span>
                {r.status !== 'completed' ? <Chip bg='#4a1804' color='#fb923c' bd='#9a3412'>ОЧІКУЄ</Chip> : <Chip bg='#052e16' color='#22c55e' bd='#166534'>ГОТОВО</Chip>}
              </div>
              <div style={{ fontSize: 12, color: G.t2 }}>{r.typeName}</div>
            </div>
            <span style={{ fontSize: 11, color: G.t2 }}>{r.datetime}</span>
          </div>
          {r.note && <div style={{ fontSize: 12, color: '#fb923c', marginBottom: 5 }}>📝 {r.note}</div>}
          {r.photoUrl && (
            <div style={{ marginBottom: 10, borderRadius: 8, overflow: 'hidden', border: `1px solid ${G.b1}` }}>
              <img src={r.photoUrl} alt="Repair" style={{ width: '100%', maxHeight: 300, objectFit: 'cover', display: 'block', cursor: 'pointer' }} onClick={() => window.open(r.photoUrl, '_blank')} />
            </div>
          )}
          {r.repairWorker && <div style={{ fontSize: 12, color: G.t2, marginBottom: 8 }}>Ремонтував: <span style={{ color: getWorkerColor(r.repairWorker), fontWeight: 600 }}>{r.repairWorker}</span></div>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: r.status === 'completed' ? 8 : 0 }}>
            {(r.materials || []).filter(m => m.selected && m.qty > 0).map((m, i) =>
              <Chip key={i} bg={G.b1} color={G.t2} bd={G.b2}>{m.matName} ×{m.qty}</Chip>)}
          </div>

          {completingId === r.id ? <div style={{ borderTop: `1px solid ${G.b1}`, paddingTop: 10, marginTop: 10 }}>
            <FormRow label="ДАТА ЗАВЕРШЕННЯ"><input value={compDate} onChange={e => setCompDate(e.target.value)} /></FormRow>
            <FormRow label="РЕМОНТУВАВ КОНТРАКТНИК">
              <select value={compWorker} onChange={e => setCompWorker(e.target.value)}>
                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </FormRow>
            <FormRow label="ВИТРАЧЕНІ МАТЕРІАЛИ">
              {typeMaterials.filter(tm => tm.typeId === r.typeId).map(tm => {
                const gm = globalMat(tm.matId)
                if (!gm) return null
                const asm = assemblies.find(a => a.outputMatId == tm.matId)
                const isExpanded = !!expandedMats[tm.matId]

                const canFulfill = (id, q) => {
                  const m = globalMat(id)
                  const oh = prepItems.filter(p => p.matId == id && (p.workerId === compWorker || p.scope === 'all') && p.status !== 'returned').reduce((s, p) => +(s + p.qty - p.returnedQty).toFixed(2), 0)
                  const st = m?.stock || 0
                  if (oh + st >= q) return true
                  const r = assemblies.find(a => a.outputMatId == id && a.outputQty > 0 && a.components?.length > 0)
                  if (!r) return false
                  const bn = (q - oh - st) / r.outputQty
                  return r.components.every(ac => canFulfill(ac.matId, ac.qty * bn))
                }

                const renderRow = (mId, mName, mUnit, mStock, isSub = false) => {
                  const checked = !!compChecks[mId]
                  const qty = compQtys[mId] ?? (isSub ? 0 : tm.perBattery)
                  const need = parseFloat(qty) || 0

                  // Calculate availability on hand for this worker
                  const onHand = prepItems
                    .filter(p => (p.matId == mId) && (p.workerId === compWorker || p.scope === 'all') && p.status !== 'returned')
                    .reduce((sum, p) => +(sum + p.qty - p.returnedQty).toFixed(2), 0)
                  const totalAvail = +(onHand + mStock).toFixed(2)
                  
                  const ok = !checked || !need || totalAvail >= need || canFulfill(mId, need)

                  return (
                    <div key={mId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${G.b1}`, fontSize: 13, marginLeft: isSub ? 24 : 0 }}>
                      <input type="checkbox" checked={checked} onChange={e => {
                        setCompChecks(v => ({ ...v, [mId]: e.target.checked }))
                        if (e.target.checked && isSub) setCompQtys(v => ({ ...v, [mId]: v[mId] || 1 }))
                      }} style={{ width: 18, height: 18, accentColor: G.or, cursor: 'pointer', flexShrink: 0 }} />
                      
                      {!isSub && asm ? (
                        <button onClick={(e) => { e.preventDefault(); setExpandedMats(v => ({ ...v, [tm.matId]: !isExpanded })); haptic(30); }} 
                          style={{ width: 24, height: 24, borderRadius: 6, background: isExpanded ? G.cy : G.b1, border: `1px solid ${isExpanded ? G.cy : G.b2}`, color: isExpanded ? '#000' : G.cy, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontWeight: 'bold' }}>
                          {isExpanded ? '−' : '+'}
                        </button>
                      ) : !isSub ? (
                        <div style={{ width: 24, flexShrink: 0 }} />
                      ) : null}

                      <div style={{ flex: 1 }}>
                        <div style={{ color: checked ? G.t1 : G.t2, fontWeight: isSub ? 400 : 700 }}>
                          {mName}
                        </div>
                        <div style={{ fontSize: 11, color: ok ? G.t2 : G.rd }}>
                          {onHand > 0 && <span style={{ color: G.gn, marginRight: 4 }}>рук: {onHand}</span>}
                          склад: {mStock} {mUnit}
                        </div>
                      </div>
                      <input type="number" step="any" value={qty} onChange={e => setCompQtys(v => ({ ...v, [mId]: e.target.value }))} style={{ width: 95, border: `1px solid ${ok ? G.b2 : G.rd}`, textAlign: 'center', borderRadius: 8, background: '#0f172a', color: G.t1, padding: '4px 0', outline: 'none' }} />
                      <span style={{ color: G.t2, fontSize: 11, width: 32, flexShrink: 0, textAlign: 'right' }}>{mUnit}</span>
                    </div>
                  )
                }

                return (
                  <div key={tm.matId}>
                    {renderRow(tm.matId, gm.name, gm.unit, gm.stock)}
                    {isExpanded && asm && (
                      <div style={{ borderLeft: `2px dashed ${G.b1}`, background: 'rgba(255,255,255,0.01)', marginBottom: 8 }}>
                        {asm.components.map(ac => {
                          const sgm = globalMat(ac.matId)
                          if (!sgm) return null
                          return renderRow(ac.matId, sgm.name, sgm.unit, sgm.stock, true)
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </FormRow>
            <FormRow label="ДОДАТИ НОТАТКУ (необов'язково)"><input value={compNote} onChange={e => setCompNote(e.target.value)} placeholder="напр. замінено BMS" /></FormRow>
            <FormRow label="ФОТО ЗАВЕРШЕННЯ (URL)"><input value={compPhotoUrl} onChange={e => setCompPhotoUrl(e.target.value)} placeholder="https://example.com/result.jpg" /></FormRow>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => confirmComplete(r)} style={{ flex: 1, padding: '8px', background: '#166534', color: G.gn, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✓ ЗАВЕРШИТИ РЕМОНТ</button>
              <button onClick={() => setCompletingId(null)} style={{ padding: '8px 12px', background: G.b1, color: G.t2, border: `1px solid ${G.b2}`, borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Скасувати</button>
            </div>
          </div> : null}

          {!completingId && <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {r.status !== 'completed' && <button onClick={() => startCompleting(r)} style={{ flex: 2, padding: '6px 0', background: '#4c1d95', color: '#a78bfa', border: `1px solid #7c3aed`, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✓ Завершити</button>}
            {r.status === 'completed' && <button onClick={() => returnAll(r)} style={{ flex: 1, padding: '6px 0', background: '#052e16', color: G.gn, border: `1px solid #166534`, borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>↩ Повернути</button>}
            {isAdmin && <button onClick={() => deleteRep(r)} style={{ padding: '6px 10px', background: '#450a0a', border: 'none', color: G.rd, borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>✕</button>}
          </div>}
        </div>)
      )}

      {repTab === 'bms' && (() => {
        const bmsReps = repairLog.filter(r => r.status === 'completed' && ((r.note || '').toLowerCase().includes('bms') || (r.materials || []).some(m => (m.matName || '').toLowerCase().includes('bms'))))
        if (bmsReps.length === 0) return <Center>Немає записів з поломаними BMS</Center>
        return bmsReps.map(r => <div key={r.id} style={{ background: G.card, border: `1px solid ${G.b1}`, borderLeft: `3px solid #ef4444`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700 }}>{r.serial}</span>
                <Chip bg='#450a0a' color='#ef4444' bd='#7f1d1d'>BMS</Chip>
              </div>
              <div style={{ fontSize: 12, color: G.t2, marginTop: 4 }}>{r.typeName}</div>
            </div>
            <span style={{ fontSize: 11, color: G.t2 }}>{r.datetime || r.date}</span>
          </div>
          <div style={{ fontSize: 13, color: '#ef4444', marginBottom: 5 }}>📝 {r.note}</div>
          {r.repairWorker && <div style={{ fontSize: 12, color: G.t2, marginBottom: 8 }}>Ремонтував: <span style={{ color: getWorkerColor(r.repairWorker), fontWeight: 600 }}>{r.repairWorker}</span></div>}
        </div>)
      })()}
    </>)
  }

  // ── Журнал ────────────────────────────────────────────────
  const PageLog = () => {
    const filteredLog = logShowAll ? log : log.filter(l => l.date === todayStr())
    return wrap(<>
      {log.length === 0 ? <Center>Журнал порожній</Center> : <>
        {filteredLog.slice(0, logLimit).map(e => {
          const t = batteryTypes.find(t => t.id === e.typeId)
          const isPrepEntry = e.kind === 'prep'
          const workerLineColor = getWorkerColor(e.workerName) || G.t2
          const icon = isPrepEntry ? '📦' : e.kind === 'repair' ? '🔧' : '🔋'
          // Статус видачі: чи ще активна хоча б одна позиція?
          const prepActive = isPrepEntry && e.prepIds && e.prepIds.length > 0
            ? e.prepIds.some(pid => {
                const p = prepItems.find(x => String(x.id) === String(pid))
                return p && p.status !== 'returned'
              })
            : false
          return <div key={e.id} style={{ background: G.card, border: `1px solid ${G.b1}`, borderRadius: 12, padding: 12, marginBottom: 8, borderLeft: `3px solid ${workerLineColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
              <div>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700 }}>{icon} {isPrepEntry ? (e.repairNote || e.typeName) : e.typeName}</span>
                {!isPrepEntry && e.count > 0 && <span style={{ color: G.or, fontSize: 13, marginLeft: 6 }}>× {e.count}</span>}
                <div style={{ fontSize: 12, color: workerLineColor, fontWeight: 600 }}>{e.workerName}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ fontSize: 11, color: G.t2, flexShrink: 0 }}>{e.datetime}</span>
                {isPrepEntry && (
                  prepActive
                    ? <Chip bg='#1e1b4b' color='#a78bfa' bd='#3730a3'>📦 на руках</Chip>
                    : <Chip bg={G.b1} color={G.t2} bd={G.b2}>✓ списано</Chip>
                )}
              </div>
            </div>
            {e.serials?.length > 0 && <div style={{ fontSize: 12, color: G.cy, marginBottom: 5, wordBreak: 'break-all' }}>{e.serials.join(', ')}</div>}
            {!isPrepEntry && e.repairNote && <div style={{ fontSize: 12, color: '#fb923c', marginBottom: 5 }}>📝 {e.repairNote}</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {(e.consumed || []).map((c, i) => <span key={i} style={{ background: G.b1, border: `1px solid ${G.b2}`, borderRadius: 6, padding: '2px 8px', fontSize: 11, color: G.t2 }}>{c.name} ×{c.amount}</span>)}
            </div>
          </div>
        })}
        {filteredLog.length > logLimit && (
          <SubmitBtn color={G.b1} onClick={() => setLogLimit(l => l + 30)}>⬇ Показати ще ({filteredLog.length - logLimit})</SubmitBtn>
        )}
        {!logShowAll && log.length > filteredLog.length && (
          <SubmitBtn color={G.b1} onClick={() => setLogShowAll(true)}>📋 ПОКАЗАТИ ВЕСЬ ЖУРНАЛ</SubmitBtn>
        )}
      </>}
    </>)
  }

  // ── Закупівля ─────────────────────────────────────────────
  const PageShopping = () => {
    const assemblyOutputIds = assemblies.map(a => a.outputMatId)
    const lowMats = materials.filter(m => {
      if (assemblyOutputIds.includes(m.id)) return false
      const perBattery = perBatteryByMat[m.id] || 0
      const monthNeed = perBattery > 0 ? (perBattery * perDay * 30) : (m.minStock || 0)
      return m.stock <= m.minStock || m.stock < monthNeed || m.stock === 0
    })

    const setOrdered = async (mat, status) => {
      await api('updateMaterialField', [mat.id, 'isOrdered', status])
      setMaterials(prev => prev.map(m => m.id !== mat.id ? m : { ...m, isOrdered: status }))
    }

    const sendToTg = async () => {
      const itemsToSend = lowMats.length > 0 ? lowMats : materials
      if (itemsToSend.length === 0) return showToast('Склад пустий!', 'err')
      const lines = itemsToSend.map(m => {
        const perBattery = perBatteryByMat[m.id] || 0
        const monthNeed = perBattery > 0 ? +(perBattery * perDay * 30).toFixed(2) : (m.minStock || 0)
        const toOrder = Math.max(0, +(monthNeed - m.stock).toFixed(2))
        const link = m.shopUrl ? `\n  🔗 ${m.shopUrl}` : ''
        const orderedText = m.isOrdered ? ' [✅ Вже замовлено]' : ''
        return `• ${m.name}${orderedText}: ${m.stock} ${m.unit} (мін: ${m.minStock}) · потрібно/міс: ${monthNeed} · докупити: ${toOrder}${link}`
      }).join('\n')
      await sendTelegram(`🛒 ZmiyCell — Закупівля (${lowMats.length > 0 ? 'Дефіцит' : 'Всі'})\n\n${lines}`)
      showToast('✓ Відправлено в Telegram')
      for (const m of lowMats) { if (!m.isOrdered) await setOrdered(m, true) }
    }

    const sendToTgAll = async () => {
      if (materials.length === 0) return showToast('Склад пустий!', 'err')
      const lines = materials.map(m => {
        const perBattery = perBatteryByMat[m.id] || 0
        const toOrder = Math.max(0, +(((perBattery > 0 ? perBattery * perDay * 30 : m.minStock) || 0) - m.stock).toFixed(2))
        const status = m.isOrdered ? '✅' : (m.stock <= 0 ? '🔴' : m.stock <= m.minStock ? '🟡' : '🟢')
        return `${status} ${m.name}: ${m.stock} ${m.unit}${toOrder > 0 ? ` · докупити: ${toOrder}` : ''}`
      }).join('\n')
      await sendTelegram(`📋 ZmiyCell — Весь склад (${materials.length} позицій)\n\n${lines}`)
      showToast('✓ Відправлено в Telegram')
    }

    const sendCalcToTg = async () => {
      const qty = parseFloat(calcQty) || 0
      if (!calcTypeId || !qty) return showToast('Оберіть тип і кількість', 'err')
      const tms = typeMaterials.filter(tm => tm.typeId == calcTypeId)
      if (tms.length === 0) return showToast('Матеріали не налаштовані', 'err')

      const getDeficitRecursive = (mId, q) => {
        const gm = materials.find(m => String(m.id) === String(mId))
        if (!gm) return []
        
        const a = assemblies.find(as => String(as.outputMatId) === String(mId))
        if (a) {
          const factor = q / (a.outputQty || 1)
          return a.components.flatMap(ac => getDeficitRecursive(ac.matId, ac.qty * factor))
        }

        const safeStock = gm.stock || 0
        const deficit = Math.max(0, +(q - safeStock).toFixed(2))
        if (deficit <= 0) return []
        
        return [{ matId: mId, q: deficit }]
      }

      const totalDeficits = tms.flatMap(tm => getDeficitRecursive(tm.matId, tm.perBattery * qty))
      const merged = []
      totalDeficits.forEach(d => {
        const ex = merged.find(m => m.matId == d.matId)
        if (ex) ex.q = +(ex.q + d.q).toFixed(2)
        else merged.push({ ...d })
      })

      const deficitLines = merged.map(n => {
        const gm = materials.find(m => m.id == n.matId)
        if (!gm) return null
        return `• ${gm.name}: ${n.q} ${gm.unit}`
      }).filter(Boolean)

      if (deficitLines.length === 0) {
        return showToast('На складі всього вистачає!', 'info')
      }

      const typeName = batteryTypes.find(t => t.id == calcTypeId)?.name || '?'
      const msg = `📦 ZmiyCell — Різниця на виробництво\n\nДля виготовлення ${qty} шт. "${typeName}" на складі необхідно додатково:\n\n${deficitLines.join('\n')}`
      await sendTelegram(msg)
      showToast('✓ Відправлено в Telegram')
    }

    return wrap(<>
      {/* ─── Калькулятор виробництва ─────────────────── */}
      <Card>
        <CardTitle color={G.cy}>🧮 КАЛЬКУЛЯТОР ВИРОБНИЦТВА</CardTitle>
        <div style={{ color: G.t2, fontSize: 12, marginBottom: 12 }}>
          Введіть тип і кількість — побачите що треба дозамовити.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 12 }}>
          <div>
            <Label>ТИП АКУМУЛЯТОРА</Label>
            <select value={calcTypeId} onChange={e => setCalcTypeId(e.target.value)}>
              {batteryTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <Label>КІЛЬКІСТЬ</Label>
            <input
              type="number"
              min="1"
              value={calcQty}
              onChange={e => setCalcQty(e.target.value)}
              style={{ width: 80, textAlign: 'center' }}
            />
          </div>
        </div>

        {(() => {
          const qty = parseFloat(calcQty) || 0
          if (!calcTypeId || !qty) return (
            <div style={{ color: G.t2, fontSize: 12, textAlign: 'center', padding: '16px 0' }}>
              Оберіть тип і кількість
            </div>
          )
          const tms = typeMaterials.filter(tm => tm.typeId == calcTypeId)
          if (tms.length === 0) return (
            <div style={{ color: G.yw, fontSize: 12, textAlign: 'center', padding: '16px 0' }}>
              ⚠ Для цього типу матеріали не налаштовані
            </div>
          )

          const getDeficitRecursive = (mId, q) => {
            const gm = materials.find(m => String(m.id) === String(mId))
            if (!gm) return []
            
            const a = assemblies.find(as => String(as.outputMatId) === String(mId))
            if (a) {
              const factor = q / (a.outputQty || 1)
              return a.components.flatMap(ac => getDeficitRecursive(ac.matId, ac.qty * factor))
            }
            
            // Сануємо екстремальні від'ємні значення (ймовірна корупція даних або ID замість стоку)
            const safeStock = (gm.stock < -1000000) ? 0 : (gm.stock || 0)
            const deficit = Math.max(0, +(q - safeStock).toFixed(2))
            if (deficit <= 0) return []

            return [{ matId: mId, q: deficit }]
          }

          const flattened = tms.flatMap(tm => getDeficitRecursive(tm.matId, tm.perBattery * qty))
          const merged = []
          flattened.forEach(f => {
            const ex = merged.find(m => m.matId == f.matId)
            if (ex) ex.q = +(ex.q + f.q).toFixed(2)
            else merged.push({ ...f })
          })

          const rows = merged.map(n => {
            const gm = materials.find(m => m.id == n.matId)
            if (!gm) return null
            return { name: gm.name, unit: gm.unit, toOrder: n.q, matId: n.matId }
          }).filter(Boolean)

          const anyDeficit = rows.some(r => r.toOrder > 0)

          return <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 4, fontSize: 11, color: G.t2, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: .5, padding: '0 4px 6px', borderBottom: `1px solid ${G.b1}` }}>
              <span>СИРОВИНА ТА МАТЕРІАЛИ (ДЛЯ ЗАКУПІВЛІ)</span>
              <span style={{ textAlign: 'right' }}>ДЕФІЦИТ</span>
            </div>
            {rows.map((r, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1fr auto', gap: 4,
                fontSize: 13, padding: '8px 4px',
                borderBottom: `1px solid ${G.b1}`,
                background: 'rgba(239,68,68,0.05)',
                borderLeft: `3px solid ${G.rd}`,
                borderRadius: 4
              }}>
                <span style={{ color: G.t1, fontWeight: 600 }}>{r.name}</span>
                <span style={{ color: G.rd, fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  +{r.toOrder} {r.unit}
                </span>
              </div>
            ))}
            {anyDeficit
              ? <>
                  <div style={{ marginTop: 10, fontSize: 12, color: G.rd, padding: '8px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>
                    ⚠ Не вистачає матеріалів для {qty} акум. — дивіться рядки з +
                  </div>
                  <button onClick={sendCalcToTg} style={{ width: '100%', marginTop: 8, background: 'rgba(6,182,212,0.1)', color: G.cy, fontSize: 11, padding: '8px 0', border: `1px solid ${G.cy}`, borderRadius: 8, fontWeight: 700 }}>
                    📲 ВІДПРАВИТИ РІЗНИЦЮ В TELEGRAM
                  </button>
                </>
              : <div style={{ marginTop: 10, fontSize: 12, color: G.gn, padding: '8px 10px', background: 'rgba(34,197,94,0.08)', borderRadius: 8 }}>
                  ✓ На складі вистачає для {qty} акум. типу {batteryTypes.find(t => t.id == calcTypeId)?.name}
                </div>
            }
          </>
        })()}
      </Card>

      {/* ─── Список закупівлі ─────────────────────────── */}
      <Card>
        <CardTitle color={G.pu}>🛒 СПИСОК ЗАКУПІВЛІ</CardTitle>
        <div style={{ color: G.t2, fontSize: 13, marginBottom: 16 }}>Матеріали нижче мінімального запасу.</div>
        {lowMats.length === 0 ? <Center>Всі матеріали в нормі</Center> :
          lowMats.map(m => {
            const ordered = !!m.isOrdered
            const perBattery = perBatteryByMat[m.id] || 0
            const monthNeed = perBattery > 0 ? +(perBattery * perDay * 30).toFixed(2) : (m.minStock || 0)
            const toOrder = Math.max(0, +(monthNeed - m.stock).toFixed(2))
            return <div key={m.id} style={{ background: ordered ? G.card : G.card2, border: `1px solid ${G.b1}`, borderRadius: 10, padding: 12, marginBottom: 8, borderLeft: `3px solid ${ordered ? G.t2 : '#a78bfa'}`, opacity: ordered ? .6 : 1, transition: '0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: G.t2, marginTop: 2 }}>{ordered ? '✅ В очікуванні доставки' : '⏳ Потребує замовлення'}</div>
                  {m.shopUrl && <a href={m.shopUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: G.cy, textDecoration: 'none', display: 'inline-block', marginTop: 4 }}>🔗 Перейти</a>}
                  {!ordered && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ color: G.or, fontWeight: 600 }}>{m.stock} {m.unit}</span>
                    <Chip bg='#450a0a' color={G.rd} bd='#7f1d1d'>мін {m.minStock}</Chip>
                  </div>}
                  {!ordered && <div style={{ fontSize: 11, color: G.t2, marginTop: 6 }}>
                    Потрібно/міс: <b style={{ color: G.cy }}>{monthNeed}</b> · докупити: <b style={{ color: G.or }}>{toOrder}</b>
                  </div>}
                </div>
                <button onClick={() => setOrdered(m, !ordered)} style={{ background: ordered ? G.card2 : G.b1, border: `1px solid ${G.b2}`, color: ordered ? G.t2 : G.pu, padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
                  {ordered ? 'Скасувати' : 'Позначити'}
                </button>
              </div>
            </div>
          })
        }
        {lowMats.length > 0 && <SubmitBtn color={G.pu} onClick={sendToTg}>✈ ВІДПРАВИТИ ДЕФІЦИТ В TELEGRAM</SubmitBtn>}
        <SubmitBtn color={G.cy} onClick={sendToTgAll}>📋 НАДІСЛАТИ ВСЕ В TELEGRAM</SubmitBtn>
      </Card>
    </>)
  }
  // ── Команда ───────────────────────────────────────────────
  const PageWorkers = () => {
    const newName = newWorkerName; const setNewName = setNewWorkerName
    const realWorkers = workers

    const deleteWorker = (w) => openConfirm('Видалити працівника?', <b style={{ color: G.rd }}>{w.name}</b>, () => {
      closeModal()
      api('deleteWorker', [w.id]).then(() => { setWorkers(p => p.filter(wx => wx.id !== w.id)); showToast('✓ Видалено') }).catch(() => { })
    })
    const addWorker = () => {
      if (!newName.trim()) return showToast('Введіть ім\'я', 'err')
      const w = { id: 'w' + uid(), name: newName.trim() }
      api('saveWorker', [w]).then(() => { setWorkers(p => [...p, w]); setNewName(''); showToast('✓ Додано ' + w.name) }).catch(() => { })
    }
    const addPayment = (w) => openInput('Оплачено (кількість)', 'напр. 5', '', async (val) => {
      closeModal()
      const cnt = parseInt(val)
      if (!cnt || cnt <= 0) return showToast('Невірна кількість', 'err')
      const entry = { id: uid(), workerId: w.id, workerName: w.name, count: cnt, date: todayStr(), datetime: nowStr() }
      try {
        await api('addPayment', [entry])
        setPayments(prev => [entry, ...prev])
        showToast(`✓ Оплачено: ${cnt} для ${w.name}`)
      } catch { }
    })

    return wrap(<>
      <Card>
        <CardTitle>👷 КОМАНДА ({realWorkers.length})</CardTitle>
        {realWorkers.map(w => {
          const produced = producedByName[w.name] || 0
          const paid = paidByWorker[w.id] || paidByWorker[w.name] || 0
          const unpaid = Math.max(0, produced - paid)
          return <div key={w.id} style={{ padding: '10px 0', borderBottom: `1px solid ${G.b1}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isAdmin && <div style={{width:24, height:24, borderRadius:'50%', overflow:'hidden', flexShrink:0, border:`1px solid ${G.b2}`}}>
                  <input type="color" value={w.color || getWorkerColor(w.name)} title="Змінити колір працівника"
                    onChange={(e) => {
                      const val = e.target.value
                      setWorkers(prev => prev.map(wx => wx.id !== w.id ? wx : { ...wx, color: val }))
                      if (window._colorTid) clearTimeout(window._colorTid)
                      window._colorTid = setTimeout(() => {
                        api('saveWorker', [{ ...w, color: val }]).catch(()=>{})
                      }, 400)
                    }}
                    style={{ width: 40, height: 40, padding: 0, margin: -8, border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                </div>}
                <span style={{ fontSize: 14, color: getWorkerColor(w.name), fontWeight: 700 }}>{w.name}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {isAdmin && <button onClick={() => addPayment(w)} style={{ background: '#052e16', border: `1px solid #166534`, color: G.gn, padding: '4px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>+ Оплачено</button>}
                {isAdmin && <button onClick={() => deleteWorker(w)} style={{ background: '#450a0a', border: 'none', color: G.rd, padding: '4px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>✕</button>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <Chip bg={G.card2} color={G.t2} bd={G.b2}>Вироблено: {produced}</Chip>
              <Chip bg='#052e16' color={G.gn} bd='#166534'>Оплачено: {paid}</Chip>
              <Chip bg='#431407' color='#fb923c' bd='#9a3412'>Неопл.: {unpaid}</Chip>
            </div>
          </div>
        })}
      </Card>
      {isAdmin && <Card>
        <CardTitle color={G.gn}>+ ДОДАТИ ПРАЦІВНИКА</CardTitle>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Ім'я та прізвище" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addWorker()} />
          <button onClick={addWorker} style={{ padding: '8px 16px', background: G.gn, color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ ДОДАТИ</button>
        </div>
      </Card>}
    </>)
  }

  const PageCalculator = () => {
    const sendPureCalcToTg = async () => {
      const qty = parseFloat(calcPureQty) || 0
      if (!calcPureTypeId || !qty) return
      const tms = typeMaterials.filter(tm => tm.typeId == calcPureTypeId)
      if (tms.length === 0) return

      const getRawRecursive = (mId, q) => {
        const gm = materials.find(m => String(m.id) === String(mId))
        if (!gm) return []
        const a = assemblies.find(as => String(as.outputMatId) === String(mId))
        if (a) {
          const factor = q / a.outputQty
          return a.components.flatMap(ac => getRawRecursive(ac.matId, ac.qty * factor))
        }
        return [{ matId: mId, q }]
      }

      const rawReqs = tms.flatMap(tm => getRawRecursive(tm.matId, tm.perBattery * qty))
      const merged = []
      rawReqs.forEach(r => {
        const ex = merged.find(m => m.matId == r.matId)
        if (ex) ex.q = +(ex.q + r.q).toFixed(2)
        else merged.push({ ...r, q: +(r.q).toFixed(2) })
      })

      const lines = merged.map(n => {
        const gm = materials.find(m => m.id == n.matId)
        if (!gm) return null
        return `• ${gm.name}: ${n.q} ${gm.unit}`
      }).filter(Boolean)

      const typeName = batteryTypes.find(t => t.id == calcPureTypeId)?.name || '?'
      const msg = `🧮 ZmiyCell — Розрахунок потреби\n\nДля виготовлення ${qty} шт. "${typeName}" необхідно:\n\n${lines.join('\n')}`
      await sendTelegram(msg)
      showToast('✓ Відправлено в Telegram')
    }

    return wrap(<>
      <Card>
        <CardTitle color={G.cy}>🧮 РОЗРАХУНОК ПОТРЕБИ</CardTitle>
        <div style={{ color: G.t2, fontSize: 12, marginBottom: 12 }}>
          Повний розрахунок сировини без врахування складу.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 12 }}>
          <div>
            <Label>ТИП АКУМУЛЯТОРА</Label>
            <select value={calcPureTypeId} onChange={e => setCalcPureTypeId(e.target.value)}>
              <option value="">-- Оберіть тип --</option>
              {batteryTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <Label>КІЛЬКІСТЬ</Label>
            <input type="number" min="1" value={calcPureQty} onChange={e => setCalcPureQty(e.target.value)} style={{ width: 80, textAlign: 'center' }} />
          </div>
        </div>

        {(() => {
          const qty = parseFloat(calcPureQty) || 0
          if (!calcPureTypeId || !qty) return <div style={{ color: G.t2, fontSize: 12, textAlign: 'center', padding: '16px 0' }}>Оберіть тип і кількість</div>
          const tms = typeMaterials.filter(tm => tm.typeId == calcPureTypeId)
          if (tms.length === 0) return <div style={{ color: G.yw, fontSize: 12, textAlign: 'center', padding: '16px 0' }}>⚠ Матеріали не налаштовані</div>

          const getRawRecursive = (mId, q) => {
            const gm = materials.find(m => String(m.id) === String(mId))
            if (!gm) return []
            const a = assemblies.find(as => String(as.outputMatId) === String(mId))
            if (a) {
              const factor = q / a.outputQty
              return a.components.flatMap(ac => getRawRecursive(ac.matId, ac.qty * factor))
            }
            return [{ matId: mId, q }]
          }

          const rawReqs = tms.flatMap(tm => getRawRecursive(tm.matId, tm.perBattery * qty))
          const merged = []
          rawReqs.forEach(r => {
            const ex = merged.find(m => m.matId == r.matId)
            if (ex) ex.q = +(ex.q + r.q).toFixed(2)
            else merged.push({ ...r, q: +(r.q).toFixed(2) })
          })

          return <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 4, fontSize: 11, color: G.t2, fontWeight: 700, padding: '0 4px 6px', borderBottom: `1px solid ${G.b1}` }}>
              <span>СИРОВИНА ТА МАТЕРІАЛИ</span>
              <span style={{ textAlign: 'right' }}>УСЬОГО</span>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {merged.map(r => {
                const gm = materials.find(m => m.id == r.matId)
                if (!gm) return null
                return <div key={r.matId} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, padding: '10px 4px', borderBottom: `1px solid ${G.b1}`, fontSize: 13 }}>
                  <span style={{ color: G.t1 }}>{gm.name}</span>
                  <span style={{ textAlign: 'right', fontWeight: 700, color: G.cy }}>{r.q} <span style={{ color: G.t2, fontWeight: 400, fontSize: 11 }}>{gm.unit}</span></span>
                </div>
              })}
            </div>
            <div style={{ marginTop: 12 }}>
              <SubmitBtn color={G.gn} onClick={sendPureCalcToTg}>✈ НАДІСЛАТИ В TELEGRAM</SubmitBtn>
            </div>
          </>
        })()}
      </Card>
    </>)
  }

  // ── Інструменти ───────────────────────────────────────────
  const PageTools = () => {
    const nt = newTool; const setNt = setNewTool
    const repairModal = toolRepairModal; const setRepairModal = setToolRepairModal
    const repairNote = toolRepairNote; const setRepairNote = setToolRepairNote
    const repairDate = toolRepairDate; const setRepairDate = setToolRepairDate
    const repairWorker = toolRepairWorker; const setRepairWorker = setToolRepairWorker

    const changeTool = (id, field, delta) => {
      if (!isAdmin) return
      const t = tools.find(t => t.id == id); if (!t) return
      const next = { ...t, [field]: Math.max(0, t[field] + delta) }
      if (next.working > next.count) next.working = next.count
      api('saveTool', [next]).then(() => setTools(prev => prev.map(tx => tx.id !== id ? tx : next))).catch(() => { })
    }
    const deleteTool = (t) => openConfirm('Видалити інструмент?', <b style={{ color: G.rd }}>{t.name}</b>, () => {
      closeModal(); api('deleteTool', [t.id]).then(() => { setTools(p => p.filter(tx => tx.id !== t.id)); showToast('✓ Видалено') }).catch(() => { })
    })
    const addTool = () => {
      if (!nt.name.trim()) return showToast('Введіть назву', 'err')
      const t = { id: 't' + uid(), ...nt, working: nt.count, repairNote: '', repairDate: '' }
      api('saveTool', [t]).then(() => {
        setTools(p => [...p, t])
        setNt({ name: '', category: 'tool', count: '1', serial: '', notes: '' })
        showToast('✓ Додано ' + nt.name)
        api('logToolEvent', [t.id, t.name, todayStr(), nowStr(), 'added', 'Адмін', 'Додано на склад']).catch(() => { })
        setToolLog(p => [{ id: 'tl_' + Date.now(), toolId: t.id, toolName: t.name, date: todayStr(), datetime: nowStr(), event: 'added', workerName: 'Адмін', note: 'Додано на склад' }, ...p])
      }).catch(() => { })
    }
    const openRepairModal = (t) => { setRepairModal(t); setRepairNote(t.repairNote || ''); setRepairDate(todayStr()) }
    const submitToolRepair = async () => {
      if (!repairModal) return
      if (!repairNote.trim()) return showToast('Опишіть несправність', 'err')
      const worker = workers.find(w => w.id === repairWorker)
      try {
        await api('reportToolRepair', [repairModal.id, repairNote, repairDate, worker?.name || ''])
        setTools(prev => prev.map(t => t.id !== repairModal.id ? t : { ...t, repairNote, repairDate }))
        api('logToolEvent', [repairModal.id, repairModal.name, repairDate, nowStr(), 'broken', worker?.name || '', repairNote]).catch(() => { })
        setToolLog(p => [{ id: 'tl_' + Date.now(), toolId: repairModal.id, toolName: repairModal.name, date: repairDate, datetime: nowStr(), event: 'broken', workerName: worker?.name || '', note: repairNote }, ...p])
        showToast('✓ Повідомлено про ремонт — бот сповіщено'); setRepairModal(null)
      } catch { }
    }

    const completeToolRepair = async (t) => {
      openConfirm('Інструмент відремонтовано?', 'Підтверджуєте повернення в роботу?', async () => {
        closeModal()
        try {
          await api('reportToolRepair', [t.id, '', '', '']) // clear repair note
          const next = { ...t, working: t.count, repairNote: '', repairDate: '' }
          await api('saveTool', [next])
          setTools(prev => prev.map(tx => tx.id !== t.id ? tx : next))
          api('logToolEvent', [t.id, t.name, todayStr(), nowStr(), 'fixed', 'Адмін', 'Повернуто в роботу']).catch(() => { })
          setToolLog(p => [{ id: 'tl_' + Date.now(), toolId: t.id, toolName: t.name, date: todayStr(), datetime: nowStr(), event: 'fixed', workerName: 'Адмін', note: 'Повернуто в роботу' }, ...p])
          showToast('✓ Інструмент у робочому стані')
        } catch { }
      })
    }

    return wrap(<>
      {repairModal && (
        <Modal onClose={() => setRepairModal(null)}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 19, fontWeight: 700, marginBottom: 14, color: G.rd }}>🔧 Ремонт: {repairModal.name}</div>
          <FormRow label="НЕСПРАВНІСТЬ / ОПИС"><textarea value={repairNote} onChange={e => setRepairNote(e.target.value)} placeholder="Опишіть що зламалось..." style={{ minHeight: 80 }} /></FormRow>
          <FormRow label="ДАТА"><input value={repairDate} onChange={e => setRepairDate(e.target.value)} /></FormRow>
          <FormRow label="ХТО ПОВІДОМЛЯЄ">
            <select value={repairWorker} onChange={e => setRepairWorker(e.target.value)}>
              {workers.filter(w => w.id !== 'TEAM_SHARED').map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </FormRow>
          <div style={{ color: G.t2, fontSize: 12, marginBottom: 10 }}>✈ Telegram-бот отримає сповіщення</div>
          <SubmitBtn onClick={submitToolRepair} color={G.rd}>🔧 ВІДПРАВИТИ В РЕМОНТ</SubmitBtn>
        </Modal>
      )}

      <SubTabs tabs={[['active', '🛠 АКТИВНІ'], ['log', '📋 ЖУРНАЛ']]} active={toolTab} onChange={setToolTab} />

      {toolTab === 'active' && <>
        {tools.map(t => {
          const broken = t.count - t.working
          return <div key={t.id} style={{ background: G.card, border: `1px solid ${G.b1}`, borderLeft: `3px solid ${broken > 0 ? G.rd : G.gn}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 700 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: G.t2, marginTop: 2 }}>{t.category === 'equipment' ? '⚙ ОБЛАДНАННЯ' : '🛠 ІНСТРУМЕНТ'}{t.serial && ' · ' + t.serial}</div>
                {broken > 0 && <div style={{ color: G.rd, fontSize: 12, marginTop: 4 }}>⚠ {broken} шт. несправних</div>}
                {t.notes && <div style={{ color: G.t2, fontSize: 12, marginTop: 3 }}>📝 {t.notes}</div>}
                {t.repairNote && <div style={{ color: '#fb923c', fontSize: 12, marginTop: 3 }}>🔧 {t.repairNote} {t.repairDate && '· ' + t.repairDate}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexDirection: 'column', alignItems: 'flex-end' }}>
                {!t.repairNote && <button onClick={() => openRepairModal(t)} style={{ background: '#431407', border: `1px solid #9a3412`, color: '#fb923c', padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>🔧 В ремонт</button>}
                {t.repairNote && isAdmin && <button onClick={() => completeToolRepair(t)} style={{ background: '#052e16', border: `1px solid #166534`, color: G.gn, padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>✓ Відремонтовано</button>}
                {isAdmin && <button onClick={() => deleteTool(t)} style={{ background: '#450a0a', border: 'none', color: G.rd, padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, alignSelf: 'flex-end', marginTop: 4 }}>✕ Видалити</button>}
              </div>
            </div>
            {isAdmin && <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: G.t2 }}>Всього:</span>
              <QtyBtn onClick={() => changeTool(t.id, 'count', -1)}>−</QtyBtn>
              <b style={{ minWidth: 24, textAlign: 'center' }}>{t.count}</b>
              <QtyBtn onClick={() => changeTool(t.id, 'count', 1)}>+</QtyBtn>
              <span style={{ fontSize: 13, color: G.t2 }}>Робочих:</span>
              <QtyBtn onClick={() => changeTool(t.id, 'working', -1)}>−</QtyBtn>
              <b style={{ color: G.gn, minWidth: 24, textAlign: 'center' }}>{t.working}</b>
              <QtyBtn onClick={() => changeTool(t.id, 'working', 1)}>+</QtyBtn>
            </div>}
            {!isAdmin && <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <span style={{ fontSize: 12, color: G.t2 }}>Всього: <b style={{ color: G.t1 }}>{t.count}</b></span>
              <span style={{ fontSize: 12, color: G.t2 }}>· Робочих: <b style={{ color: G.gn }}>{t.working}</b></span>
              {broken > 0 && <span style={{ fontSize: 12, color: G.rd }}>· Несправних: <b>{broken}</b></span>}
            </div>}
          </div>
        })}

        {isAdmin && <Card>
          <CardTitle color={G.gn}>+ ДОДАТИ ІНСТРУМЕНТ</CardTitle>
          <input placeholder="Назва" value={nt.name} onChange={e => setNt(v => ({ ...v, name: e.target.value }))} style={{ marginBottom: 6 }} />
          <select value={nt.category} onChange={e => setNt(v => ({ ...v, category: e.target.value }))} style={{ marginBottom: 6 }}>
            <option value="tool">🛠 Інструмент</option>
            <option value="equipment">⚙ Обладнання</option>
          </select>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
            <input type="number" placeholder="Кількість" value={nt.count} min="1" onChange={e => setNt(v => ({ ...v, count: e.target.value }))} />
            <input placeholder="С/н (необов.)" value={nt.serial} onChange={e => setNt(v => ({ ...v, serial: e.target.value }))} />
          </div>
          <input placeholder="Нотатка" value={nt.notes} onChange={e => setNt(v => ({ ...v, notes: e.target.value }))} style={{ marginBottom: 4 }} />
          <SubmitBtn onClick={addTool} color={G.gn}>+ ДОДАТИ</SubmitBtn>
        </Card>}
      </>}

      {toolTab === 'log' && (
        toolLog.length === 0 ? <Center>Журнал порожній</Center> :
          toolLog.map(e => {
            const color = e.event === 'added' ? G.gn : e.event === 'broken' ? G.rd : e.event === 'fixed' ? G.cy : G.t2
            const icon = e.event === 'added' ? '+' : e.event === 'broken' ? '🔧' : e.event === 'fixed' ? '✓' : '•'
            return <div key={e.id} style={{ background: G.card, border: `1px solid ${G.b1}`, borderRadius: 12, padding: 12, marginBottom: 8, borderLeft: `3px solid ${color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                <div>
                  <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700 }}>{icon} {e.toolName}</span>
                  <div style={{ fontSize: 12, color: getWorkerColor(e.workerName), marginTop: 2, fontWeight: 600 }}>{e.workerName}</div>
                </div>
                <span style={{ fontSize: 11, color: G.t2, flexShrink: 0 }}>{e.datetime}</span>
              </div>
              {e.note && <div style={{ fontSize: 12, color: e.event === 'broken' ? '#fb923c' : G.t1, marginTop: 4 }}>{e.note}</div>}
            </div>
          })
      )}
    </>)
  }

  // ── Мануал ────────────────────────────────────────────────
  const PageManual = () => {
    const isTypes = manualTab === 'types'
    const list = isTypes ? batteryTypes : assemblies
    const activeId = isTypes ? (manualTypeId || batteryTypes[0]?.id) : (manualAsmId || assemblies[0]?.id)
    const item = list.find(t => t.id == activeId) || list[0]

    const editing = manualEditing; const setEditing = setManualEditing
    const draftSteps = manualDraft; const setDraftSteps = setManualDraft
    const currentManual = item?.manual || ''

    const startEdit = () => { setDraftSteps(currentManual); setEditing(true) }
    const saveManual = async () => {
      if (!item) return
      if (isTypes) {
        await api('updateBatteryTypeField', [item.id, 'manual', draftSteps])
        setBatteryTypes(prev => prev.map(t => t.id !== item.id ? t : { ...t, manual: draftSteps }))
      } else {
        await api('updateAssemblyField', [item.id, 'manual', draftSteps])
        setAssemblies(prev => prev.map(a => a.id !== item.id ? a : { ...a, manual: draftSteps }))
      }
      setEditing(false); showToast('✓ Технологічну карту збережено')
    }

    const formatManual = (text) => {
      if (!text) return null
      return text.split('\n').map((line, i) => {
        const isStep = /^\d+[\.\)]/.test(line.trim())
        const isNote = /^(⚠|!|УВАГА|Примітка)/i.test(line.trim())
        const isHeader = /^#{1,3}\s/.test(line.trim())
        const isImage = /!\[.*?\]\((.*?)\)/.test(line.trim())

        if (isImage) {
          const url = line.match(/!\[.*?\]\((.*?)\)/)[1]
          return <div key={i} style={{ margin: '16px 0', textAlign: 'center' }}><img src={url} alt="manual-img" style={{ maxWidth: '100%', borderRadius: 8, border: `1px solid ${G.b1}` }} /></div>
        }
        if (isHeader) return <div key={i} style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 700, color: G.or, marginTop: 16, marginBottom: 8 }}>{line.replace(/^#+\s/, '')}</div>
        if (isStep) return <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: `1px solid ${G.b1}` }}>
          <span style={{ color: G.or, fontWeight: 700, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, flexShrink: 0 }}>{line.match(/^\d+/)?.[0]}.</span>
          <span style={{ fontSize: 14, color: G.t1 }}>{line.replace(/^\d+[\.\)]\s*/, '')}</span>
        </div>
        if (isNote) return <div key={i} style={{ background: '#431407', border: `1px solid #9a3412`, borderRadius: 8, padding: '8px 12px', margin: '8px 0', fontSize: 13, color: '#fed7aa' }}>{line}</div>
        return <div key={i} style={{ fontSize: 14, color: G.t2, padding: '3px 0', minHeight: 20 }}>{line || ' '}</div>
      })
    }

    return wrap(<>
      <SubTabs tabs={[['types', 'БАТАРЕЇ'], ['assemblies', 'ЗБІРКИ']]} active={manualTab} onChange={setManualTab} />
      {list.length > 0 && <TypeTabs types={list} active={activeId} onSelect={isTypes ? setManualTypeId : setManualAsmId} />}
      {!editing ? (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <CardTitle style={{ marginBottom: 0 }}>📖 {item?.name || 'Оберіть елемент'}</CardTitle>
            {item && isAdmin && <button onClick={startEdit} style={{ padding: '6px 12px', background: G.b1, border: `1px solid ${G.b2}`, color: G.yw, borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>✎ Редагувати</button>}
          </div>
          {currentManual ? formatManual(currentManual) : <div style={{ color: G.t2, fontSize: 13, padding: '10px 0' }}>Мануал порожній. {isAdmin && 'Натисніть "Редагувати" щоб додати.'}</div>}
        </Card>
      ) : (
        <Card>
          <CardTitle color={G.yw}>✎ РЕДАГУВАННЯ МАНУАЛУ</CardTitle>
          <textarea value={draftSteps} onChange={e => setDraftSteps(e.target.value)} style={{ minHeight: 300, fontFamily: "'Fira Code',monospace", fontSize: 13 }} placeholder={'# Заголовок\n1. Крок перший\n2. Крок другий\n⚠ Примітка\n![alt](https://image.url)'} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <SubmitBtn onClick={saveManual} color={G.gn}>✓ ЗБЕРЕГТИ</SubmitBtn>
            <button onClick={() => openInput('Вставити фото', 'Введіть URL зображення (напр. з Google Drive або Imgur)', '', (val) => {
              if (val) setDraftSteps(prev => prev + (prev.endsWith('\n') ? '' : '\n') + `![img](${val})\n`)
              closeModal()
            })} style={{ flex: 1, padding: 12, background: '#1e3a8a', color: '#93c5fd', border: `1px solid #1e40af`, borderRadius: 12, cursor: 'pointer', marginTop: 10, fontWeight: 700 }}>📷 ДОДАТИ ФОТО</button>
            <button onClick={() => setEditing(false)} style={{ flex: 1, padding: 12, background: G.b1, color: G.t2, border: `1px solid ${G.b2}`, borderRadius: 12, cursor: 'pointer', marginTop: 10 }}>Скасувати</button>
          </div>
        </Card>
      )}
    </>)
  }

  // ── Радіо ──────────────────────────────────────────────────
  const PageRadio = () => wrap(<AdFreeRockPlayer />)

  // ── Лог дій (адмін) ───────────────────────────────────────
  const loadActionLogs = useCallback(() => {
    setActionLogs(null)
    gasCall('getActionLogs', []).then(d => setActionLogs(Array.isArray(d) ? d : (d?.ok === false ? [] : d || []))).catch(() => setActionLogs([]))
  }, [])
  useEffect(() => { if (path === 'actlog') loadActionLogs() }, [path])

  const loadBackupDiff = useCallback(() => {
    setBackupDiff(null)
    gasCall('getBackupDiff', []).then(d => {
      if (d?.ok && d.rows) { setBackupDiff(d.rows); setSnapshotDate(d.snapshotDate || '') }
      else { setBackupDiff([]); setSnapshotDate('') }
    }).catch(() => setBackupDiff([]))
  }, [])
  useEffect(() => { if (path === 'backup') loadBackupDiff() }, [path])

  const PageActionLog = () => {
    const filtered = (actionLogs || []).filter(e =>
      (!filterUser || (e.user || '').toLowerCase().includes(filterUser.toLowerCase())) &&
      (!filterDate || (e.date || '').includes(filterDate))
    )
    if (actionLogs === null) return wrap(<Center>⟳ Завантаження...</Center>)
    const typeColor = (t) => t === 'backup' ? G.cy : t === 'restore' ? G.rd : t === 'production' ? G.gn : t === 'repair' ? '#fb923c' : G.pu
    return wrap(<>
      <Card>
        <CardTitle color={G.pu}>📜 ЛОГ ДІЙ ({filtered.length})</CardTitle>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input placeholder="Фільтр по юзеру" value={filterUser} onChange={e => setFilterUser(e.target.value)} />
          <input placeholder="Дата (дд.мм)" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ width: 120, flexShrink: 0 }} />
          <button onClick={loadActionLogs} style={{ padding: '6px 12px', background: G.b1, border: `1px solid ${G.b2}`, color: G.t2, borderRadius: 8, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>🔄</button>
        </div>
        {filtered.length === 0 ? <Center>Лог порожній</Center> : filtered.map(e =>
          <div key={e.id} style={{ background: G.card2, borderRadius: 10, padding: '10px 12px', marginBottom: 8, borderLeft: `3px solid ${typeColor(e.actionType)}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 13, color: typeColor(e.actionType) }}>{e.actionType}</span>
                <span style={{ fontSize: 11, color: G.t2, marginLeft: 8 }}>{e.user}</span>
              </div>
              <span style={{ fontSize: 11, color: G.t2 }}>{e.datetime}</span>
            </div>
            {e.details && <div style={{ fontSize: 12, color: G.t1, marginTop: 4 }}>{e.details}</div>}
          </div>
        )}
      </Card>
    </>)
  }

  // ── Бекап / Інвентаризація (адмін) ────────────────────────
  const PageBackup = () => {
    const makeBackup = async () => {
      setBusy(true)
      try {
        await api('saveStockBackup', ['Адмін'])
        showToast('✓ Зріз складу збережено')
        loadBackupDiff()
      } catch { } finally { setBusy(false) }
    }
    const doRestore = () => openConfirm('Відновити склад з бекапу?',
      <div style={{ fontSize: 13, color: G.t2 }}>Поточний склад буде перезаписано значеннями зі зрізу від <b style={{ color: G.or }}>{snapshotDate}</b>. Продовжити?</div>,
      async () => {
        closeModal()
        setBusy(true)
        try {
          await api('restoreFromBackup', ['Адмін'])
          showToast('✓ Склад відновлено з бекапу')
          const fresh = await gasCall('loadAll', [])
          if (fresh?.materials) setMaterials(fresh.materials)
          loadBackupDiff()
        } catch { } finally { setBusy(false) }
      }
    )
    return wrap(<>
      <Card>
        <CardTitle color={G.cy}>💾 БЕКАП / ІНВЕНТАРИЗАЦІЯ</CardTitle>
        {snapshotDate ? <div style={{ fontSize: 12, color: G.t2, marginBottom: 10 }}>Зріз від: <b style={{ color: G.cy }}>{snapshotDate}</b></div>
          : <div style={{ fontSize: 12, color: G.t2, marginBottom: 10 }}>Зрізу немає. Натисніть «Зробити зріз».</div>}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <SubmitBtn color={G.gn} onClick={makeBackup} disabled={busy}>📸 ЗРОБИТИ ЗРІЗ</SubmitBtn>
          {snapshotDate && <SubmitBtn color={G.rd} onClick={doRestore} disabled={busy}>♻ ВІДНОВИТИ З БЕКАПУ</SubmitBtn>}
          <button onClick={loadBackupDiff} style={{ padding: '6px 14px', background: G.b1, border: `1px solid ${G.b2}`, color: G.t2, borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>🔄</button>
        </div>
        {backupDiff === null ? <Center>⟳ Завантаження...</Center>
          : backupDiff.length === 0 ? <Center>Бекап порожній — зробіть зріз</Center>
            : <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 70px', gap: 4, fontSize: 11, color: G.t2, fontWeight: 700, padding: '4px 0', borderBottom: `1px solid ${G.b2}` }}>
                <span>Матеріал</span><span style={{ textAlign: 'center' }}>Зріз</span><span style={{ textAlign: 'center' }}>Зараз</span><span style={{ textAlign: 'center' }}>Різниця</span>
              </div>
              {backupDiff.map(r => {
                const d = r.diff
                const dColor = d === null ? G.t2 : d < 0 ? G.rd : d > 0 ? G.gn : G.t2
                return <div key={r.matId} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 70px', gap: 4, padding: '8px 0', borderBottom: `1px solid ${G.b1}`, fontSize: 12 }}>
                  <span style={{ color: G.t1 }}>{r.name} <span style={{ color: G.t2, fontSize: 10 }}>{r.unit}</span></span>
                  <span style={{ textAlign: 'center', color: G.t2 }}>{r.backup ?? '—'}</span>
                  <span style={{ textAlign: 'center', color: G.cy, fontWeight: 600 }}>{r.current}</span>
                  <span style={{ textAlign: 'center', color: dColor, fontWeight: 700 }}>{d !== null ? (d > 0 ? '+' + d : d) : '—'}</span>
                </div>
              })}
            </>}
      </Card>
    </>)
  }

  // ── HistoryModal ──────────────────────────────────────────
  const HistoryModal = ({ mat, entries }) => <>
    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 12 }}>📊 {mat.name}</div>
    <div style={{ fontSize: 12, color: G.t2, marginBottom: 12 }}>Залишок: <b style={{ color: G.cy }}>{mat.stock} {mat.unit}</b></div>
    {entries.length === 0 ? <div style={{ color: G.t2, fontSize: 13 }}>Витрат немає</div>
      : entries.map((e, i) => <div key={i} style={{ background: G.card2, borderRadius: 10, padding: 10, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: e.kind === 'prep' ? G.pu : e.kind === 'repair' ? '#fb923c' : G.cy, fontWeight: 600 }}>
            {e.kind === 'prep' ? '📦' : e.kind === 'repair' ? '🔧' : '🔋'} <span style={{ color: getWorkerColor(e.workerName) }}>{e.workerName}</span>
          </span>
          <span style={{ color: G.rd, fontWeight: 600 }}>−{e.amount} {mat.unit}</span>
        </div>
        <div style={{ color: '#4b5563', fontSize: 11, marginTop: 2 }}>{e.datetime}</div>
      </div>)}
    <button onClick={closeModal} style={{ width: '100%', marginTop: 14, padding: 12, background: G.b1, border: `1px solid ${G.b2}`, color: G.t2, borderRadius: 10, cursor: 'pointer', fontFamily: "'Fira Code',monospace" }}>Закрити</button>
  </>

  // ════════════════════════════════════════════════════════
  //  LAYOUT
  // ════════════════════════════════════════════════════════
  const pageKeys = NAV.map(n => n[0])

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => { const idx = pageKeys.indexOf(path); if (idx < pageKeys.length - 1) setPage(pageKeys[idx + 1]); setSwipeHint(null) },
    onSwipedRight: () => { const idx = pageKeys.indexOf(path); if (idx > 0) setPage(pageKeys[idx - 1]); setSwipeHint(null) },
    onSwiping: ({ deltaX }) => {
      const idx = pageKeys.indexOf(path)
      if (deltaX < -60 && idx < pageKeys.length - 1) { const n = NAV.find(x => x[0] === pageKeys[idx + 1]); setSwipeHint({ label: n[2], icon: n[1], dir: 'left' }) }
      else if (deltaX > 60 && idx > 0) { const n = NAV.find(x => x[0] === pageKeys[idx - 1]); setSwipeHint({ label: n[2], icon: n[1], dir: 'right' }) }
      else setSwipeHint(null)
    },
    onTouchEndOrOnMouseUp: () => setSwipeHint(null),
    preventDefaultTouchmoveEvent: false,
    trackMouse: false,
    delta: 220,
    swipeDuration: 350,
  })

  return <>
    <style>{GLOBAL_CSS}</style>

    {/* Header */}
    <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(13,17,23,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: `1px solid ${G.b1}`, padding: '10px 14px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 700, margin: '0 auto', paddingBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Logo ref={headerLogoRef} size={30} />
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: 2 }}>ZmiyCell</span>
          <span style={{ fontSize: 9, color: G.t2, alignSelf: 'flex-end', marginBottom: 6, marginLeft: -4, opacity: 0.7 }}>{backendVersion}</span>
          {isAdmin && <Chip bg='#1c1107' color={G.or} bd={G.b2} style={{ fontSize: 10 }}>АДМІН</Chip>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: G.t2, marginRight: 8 }}>{todayStr().slice(0, 5)}</span>
          <SyncBadge state={sync} />
          <button onClick={onLogout} title="Вийти" style={{ background: 'transparent', border: 'none', color: G.t2, cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="6" r="2.2" fill="currentColor" opacity="0.9" /><path d="M4.5 16.5c0-2.5 1.6-3.8 3.5-3.8s3.5 1.3 3.5 3.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.9" /><rect x="13" y="3.5" width="7" height="17" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M17 12h-6m0 0l2-2m-2 2l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 700, margin: '0 auto', paddingBottom: 8, gap: 12 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            ['🔋', log.filter(l => l.kind === 'production' && l.date === todayStr()).reduce((sum, l) => sum + num(l.count), 0), G.t1, G.b1, G.b2],
            ['🔧', repairLog.filter(r => r.status !== 'completed').length, G.t1, G.b1, G.b2],
            ['✅', repairLog.filter(r => r.status === 'completed' && (r.note || '').includes(todayStr())).length, G.gn, '#052e16', '#166534'],
            ['📦', activePrep.length, activePrep.length > 0 ? G.pu : G.t2, activePrep.length > 0 ? '#1e1b4b' : G.b1, activePrep.length > 0 ? '#3730a3' : G.b2],
          ].map(([icon, val, vc, bg, bd], i) =>
            <span key={i} style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 20, padding: '3px 10px', fontSize: 11, color: G.t2 }}>
              {icon} <b style={{ color: vc }}>{val}</b>
            </span>)}
        </div>
        <div style={{ width: 140, flexShrink: 0, marginTop: -2 }}>
          <BatteryIcon />
        </div>
      </div>
      <div style={{ maxWidth: 700, width: '100%', margin: '0 auto', borderTop: `1px solid rgba(255,255,255,0.06)` }}>
        {/* Group header row */}
        <div style={{ display: 'flex' }}>
          {NAV_GROUPS.map(g => {
            const isOpen = openGroup === g.key
            const hasActive = g.keys.includes(path)
            return (
              <button key={g.key} onClick={() => {
                if (isOpen) { setOpenGroup(null) }
                else { setOpenGroup(g.key); if (!g.keys.includes(path)) setPage(g.keys[0]) }
              }} style={{
                flex: '1 1 0', padding: '8px 4px 6px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 2, background: isOpen ? 'rgba(249,115,22,0.1)' : 'none',
                border: 'none', borderBottom: `2px solid ${hasActive ? G.or : isOpen ? G.b2 : 'transparent'}`,
                cursor: 'pointer', color: hasActive ? G.or : isOpen ? G.t1 : G.t2,
                transition: '.15s', fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 11, fontWeight: 700, letterSpacing: .5, lineHeight: 1
              }}>
                <span style={{ fontSize: 18 }}>{g.icon}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {g.label}
                  <span style={{ fontSize: 9, opacity: 0.6, marginTop: 1 }}>{isOpen ? '▲' : '▼'}</span>
                </span>
              </button>
            )
          })}
        </div>
        {/* Sub-tabs for open group */}
        {openGroup && (() => {
          const grp = NAV_GROUPS.find(g => g.key === openGroup)
          if (!grp) return null
          return (
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
              {grp.keys.map(k => {
                const item = NAV.find(n => n[0] === k)
                if (!item) return null
                const [, icon, label] = item
                const active = path === k
                return (
                  <button key={k} onClick={() => setPage(k)} style={{
                    flex: '1 1 0', padding: '8px 4px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 1,
                    background: active ? 'rgba(249,115,22,0.12)' : 'none', border: 'none',
                    borderBottom: `2px solid ${active ? G.or : 'transparent'}`,
                    cursor: 'pointer', color: active ? G.or : G.t2, transition: '.15s',
                    fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700,
                    letterSpacing: .5, lineHeight: 1
                  }}>
                    <span style={{ fontSize: 15 }}>{icon}</span>
                    <span>{label}</span>
                  </button>
                )
              })}
            </div>
          )
        })()}
      </div>
    </div>

    {/* Content */}
    <div className="page-scroll" {...swipeHandlers} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ transform: `translateY(${pullDist}px)` }}>
      {pullDist > 10 && (
        <div style={{ position: 'absolute', top: -40, left: 0, right: 0, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: pullDist > 90 ? G.or : G.t2, fontSize: 12, fontWeight: 700, fontFamily: "'Barlow Condensed',sans-serif" }}>
          {pullDist > 90 ? '✓ ВІДПУСТІТЬ ДЛЯ ОНОВЛЕННЯ' : '↓ ТЯГНІТЬ ДЛЯ ОНОВЛЕННЯ'}
        </div>
      )}
      {swipeHint && (
        <div style={{ position: 'fixed', top: '50%', left: swipeHint.dir === 'right' ? 16 : 'auto', right: swipeHint.dir === 'left' ? 16 : 'auto', transform: 'translateY(-50%)', zIndex: 200, pointerEvents: 'none', background: 'rgba(17,24,39,0.92)', border: `1px solid ${G.b2}`, borderRadius: 14, padding: '12px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 72, boxShadow: '0 4px 24px rgba(0,0,0,0.6)', animation: 'slideUp .1s ease' }}>
          <span style={{ fontSize: 10, color: G.t2, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1 }}>{swipeHint.dir === 'left' ? '→' : '←'}</span>
          <span style={{ fontSize: 22 }}>{swipeHint.icon}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: G.or, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: .5, whiteSpace: 'nowrap' }}>{swipeHint.label}</span>
        </div>
      )}
      <Routes>
        <Route path="/" element={<Navigate to="/prod" replace />} />
        <Route path="/prod" element={PageProd()} />
        <Route path="/stock" element={PageStock()} />
        <Route path="/calculator" element={PageCalculator()} />
        <Route path="/repair" element={PageRepair()} />
        <Route path="/shopping" element={PageShopping()} />
        <Route path="/workers" element={PageWorkers()} />
        <Route path="/tools" element={PageTools()} />
        <Route path="/log" element={PageLog()} />
        <Route path="/actlog" element={PageActionLog()} />
        <Route path="/backup" element={PageBackup()} />
        <Route path="/manual" element={PageManual()} />
        <Route path="/radio" element={PageRadio()} />
      </Routes>

    </div>

    {toast && <Toast {...toast} />}
    {modal?.type === 'confirm' && <ConfirmModal title={modal.title} body={modal.body} onYes={modal.onYes} onNo={closeModal} />}
    {modal?.type === 'input' && <InputModal title={modal.title} placeholder={modal.placeholder} defaultValue={modal.defaultVal} onConfirm={modal.onConfirm} onCancel={closeModal} />}
    {modal?.type === 'history' && <Modal onClose={closeModal}>{HistoryModal({ mat: modal.mat, entries: modal.entries })}</Modal>}
    <SnakeCubeLoader sync={sync} logoRef={headerLogoRef} />
    <audio ref={globalAudioRef} preload="none" />
  </>
}
