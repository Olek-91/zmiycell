import { useState, useEffect, useCallback, useRef } from 'react'
import { useSwipeable } from 'react-swipeable'
import { gasCall } from './api.js'

// ─── Кольори ─────────────────────────────────────────────
const G = {
  bg: '#0a0f1a', card: '#111827', card2: '#0f172a',
  b1: '#1f2937', b2: '#374151', t1: '#e5e7eb', t2: '#6b7280',
  or: '#f97316', cy: '#06b6d4', gn: '#22c55e', pu: '#a78bfa',
  rd: '#f87171', yw: '#fbbf24',
}

const GLOBAL_CSS = `
@keyframes slideUp{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
input,select,textarea{background:#0f172a;border:1px solid #374151;color:#e5e7eb;border-radius:8px;padding:8px 12px;font-family:'Fira Code',monospace;font-size:14px;outline:none;width:100%;transition:border-color .15s}
textarea{resize:vertical;min-height:80px}
input:focus,select:focus,textarea:focus{border-color:#f97316}
select option{background:#1f2937}
html,body{height:100%;height:100dvh;margin:0;background:#0a0f1a url('/logo.jpg') center center / cover no-repeat fixed;}
#root{height:100%;height:100dvh;display:flex;flex-direction:column;background:rgba(10,15,26,0.88);position:relative;overflow:hidden;}
.page-scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;transition:transform 0.15s ease-out;}
.tab-nav::-webkit-scrollbar{display:none;}
.tab-nav{scrollbar-width:none;}
@media (min-width: 850px) { .tab-nav { justify-content: center; max-width: 100% !important; } }
`

// ─── Конфіг авторизації ──────────────────────────────────
const ADMIN_PIN = '1235' // Змінити на свій PIN
const AUTH_KEY = 'zc_auth'

// ─── Telegram ────────────────────────────────────────────
const TG_BOT_TOKEN = import.meta.env.VITE_TG_TOKEN || ''
const TG_CHAT_ID = import.meta.env.VITE_TG_CHAT_ID || ''

const sendTelegram = async (text) => {
  if (!TG_BOT_TOKEN || !TG_CHAT_ID) return
  try {
    await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT_ID, text, parse_mode: 'HTML' })
    })
  } catch (e) { console.warn('TG error:', e) }
}

// ─── Хелпери ─────────────────────────────────────────────
const todayStr = () => new Date().toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })
const nowStr = () => new Date().toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const uid = () => String(Date.now()) + String(Math.floor(Math.random() * 9999))

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
  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 17, fontWeight: 700, color, letterSpacing: .5, marginBottom: 10 }}>{children}</div>

const QtyBtn = ({ onClick, children }) =>
  <button onClick={onClick} style={{ width: 38, height: 38, borderRadius: 8, background: G.b1, border: `1px solid ${G.b2}`, color: G.t1, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: 'monospace' }}>{children}</button>

const SubmitBtn = ({ children, onClick, color = G.or, disabled = false }) =>
  <button onClick={onClick} disabled={disabled} style={{ width: '100%', padding: '15px 0', background: disabled ? G.b1 : color, color: disabled ? G.t2 : color === G.yw ? '#000' : '#fff', border: 'none', borderRadius: 12, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: .5, marginTop: 10, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .5 : 1, transition: '.15s' }}>{children}</button>

const TypeTabs = ({ types, active, onSelect }) =>
  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
    {types.map(t => <button key={t.id} onClick={() => onSelect(t.id)} style={{ flex: '1 1 auto', minWidth: 80, padding: '10px 6px', borderRadius: 10, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: .5, cursor: 'pointer', border: `1px solid ${t.id === active ? (t.color || G.or) : G.b2}`, background: t.id === active ? '#1c1107' : G.card, color: t.id === active ? (t.color || G.or) : G.t2, transition: '.15s' }}>{t.name}</button>)}
  </div>

const SubTabs = ({ tabs, active, onChange }) =>
  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
    {tabs.map(([k, label]) => <button key={k} onClick={() => onChange(k)} style={{ flex: 1, padding: 9, borderRadius: 10, border: `1px solid ${k === active ? G.or : G.b2}`, background: k === active ? '#1c1917' : G.card, color: k === active ? G.or : G.t2, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: .5, cursor: 'pointer' }}>{label}</button>)}
  </div>

const StatusBadge = ({ m, perDay }) => {
  const days = m.perBattery > 0 ? m.stock / (m.perBattery * perDay) : Infinity
  if (m.stock <= 0) return <Chip bg='#2e1065' color='#c084fc' bd='#4c1d95'>НЕМА</Chip>
  if (m.stock <= m.minStock) return <Chip bg='#450a0a' color={G.rd} bd='#7f1d1d'>КРИТ.</Chip>
  if (days < 3) return <Chip bg='#431407' color='#fb923c' bd='#9a3412'>МАЛО ~{Math.floor(days)}д</Chip>
  return <Chip bg='#052e16' color={G.gn} bd='#166534'>НОРМА ~{Math.floor(days)}д</Chip>
}

const Chip = ({ bg, color, bd, children, style = {} }) =>
  <span style={{ background: bg, color, border: `1px solid ${bd}`, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: .5, flexShrink: 0, ...style }}>{children}</span>

const Center = ({ children }) =>
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: G.t2, fontSize: 14 }}>{children}</div>

function SyncBadge({ state }) {
  const cfg = {
    loading: ['⟳ завантаження...', '#1e1b4b', '#a5b4fc', '#3730a3', true],
    saving: ['⟳ збереження...', '#1e1b4b', '#a5b4fc', '#3730a3', true],
    ok: ['✓ синхр.', '#052e16', G.gn, '#166534', false],
    error: ['✕ помилка', '#450a0a', G.rd, '#7f1d1d', false],
  }[state] || ['...', G.b1, G.t2, G.b2, false]
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 9px', borderRadius: 10, background: cfg[1], color: cfg[2], border: `1px solid ${cfg[3]}`, animation: cfg[4] ? 'pulse 1s infinite' : '', fontFamily: "'Fira Code',monospace" }}>{cfg[0]}</span>
}

function Toast({ msg, type }) {
  return <div style={{
    position: 'fixed', top: 14, left: 12, right: 12, zIndex: 9999,
    background: type === 'err' ? '#450a0a' : '#052e16',
    border: `1px solid ${type === 'err' ? G.rd : G.gn}`,
    color: type === 'err' ? '#fca5a5' : '#86efac',
    padding: '13px 16px', borderRadius: 12, fontSize: 13,
    fontFamily: "'Fira Code',monospace",
    boxShadow: '0 8px 32px rgba(0,0,0,.7)',
    animation: 'slideUp .2s ease'
  }}>{msg}</div>
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
        <button onClick={onYes} style={{ flex: 1, padding: 14, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 12, fontFamily: "'Fira Code',monospace", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>✓ Підтвердити</button>
      </div>
    </Modal>
  )
}

// Модаль для введення тексту (замість prompt())
function InputModal({ title, placeholder, defaultValue = '', onConfirm, onCancel }) {
  const [val, setVal] = useState(defaultValue)
  return (
    <Modal onClose={onCancel}>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 19, fontWeight: 700, marginBottom: 14 }}>{title}</div>
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder={placeholder}
        onKeyDown={e => { if (e.key === 'Enter' && val.trim()) onConfirm(val.trim()) }}
        style={{ marginBottom: 12 }}
      />
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: 14, background: G.b1, color: G.t2, border: `1px solid ${G.b2}`, borderRadius: 12, fontFamily: "'Fira Code',monospace", fontSize: 14, cursor: 'pointer' }}>✕ Скасувати</button>
        <button onClick={() => val.trim() && onConfirm(val.trim())} style={{ flex: 1, padding: 14, background: G.or, color: '#fff', border: 'none', borderRadius: 12, fontFamily: "'Fira Code',monospace", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>✓ OK</button>
      </div>
    </Modal>
  )
}

function Logo({ size = 32 }) {
  return <img src="/logo.jpg" alt="ZmiyCell" style={{ width: size, height: size, objectFit: 'cover', borderRadius: '50%' }} />
}

// ════════════════════════════════════════════════════════
//  ЕКРАН АВТОРИЗАЦІЇ
// ════════════════════════════════════════════════════════
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState(null) // null | 'admin'
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')

  const enterPin = (d) => {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    if (next.length === 4) {
      if (next === ADMIN_PIN) {
        onAuth('admin')
      } else {
        setErr('Невірний PIN')
        setTimeout(() => { setPin(''); setErr('') }, 800)
      }
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(10,15,26,0.97)' }}>
      <Logo size={64} />
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 32, fontWeight: 800, letterSpacing: 3, marginTop: 12, marginBottom: 32, color: G.or }}>ZmiyCell</div>

      {!mode ? (
        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button onClick={() => onAuth('user')} style={{ padding: '18px 0', background: G.b1, border: `1px solid ${G.b2}`, color: G.t1, borderRadius: 14, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 700, cursor: 'pointer', letterSpacing: 1 }}>
            👷 УВІЙТИ ЯК ЮЗЕР
          </button>
          <button onClick={() => setMode('admin')} style={{ padding: '18px 0', background: '#1c1107', border: `1px solid ${G.or}`, color: G.or, borderRadius: 14, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 700, cursor: 'pointer', letterSpacing: 1 }}>
            🔐 АДМІН
          </button>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 280, textAlign: 'center' }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, color: G.t2, marginBottom: 16, letterSpacing: 1 }}>ВВЕДІТЬ PIN</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: pin.length > i ? G.or : G.b2, border: `2px solid ${pin.length > i ? G.or : G.b1}`, transition: '.15s' }} />
            ))}
          </div>
          {err && <div style={{ color: G.rd, fontSize: 13, marginBottom: 12 }}>{err}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
            {[1,2,3,4,5,6,7,8,9].map(d => (
              <button key={d} onClick={() => enterPin(String(d))} style={{ padding: '18px 0', background: G.b1, border: `1px solid ${G.b2}`, color: G.t1, borderRadius: 12, fontSize: 22, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, cursor: 'pointer' }}>{d}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={() => { setMode(null); setPin('') }} style={{ padding: '18px 0', background: '#450a0a', border: 'none', color: G.rd, borderRadius: 12, fontSize: 14, fontFamily: "'Fira Code',monospace", cursor: 'pointer' }}>← Назад</button>
            <button onClick={() => enterPin('0')} style={{ padding: '18px 0', background: G.b1, border: `1px solid ${G.b2}`, color: G.t1, borderRadius: 12, fontSize: 22, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, cursor: 'pointer' }}>0</button>
          </div>
          <button onClick={() => setPin(p => p.slice(0,-1))} style={{ width: '100%', marginTop: 10, padding: '12px 0', background: G.card, border: `1px solid ${G.b2}`, color: G.t2, borderRadius: 12, fontSize: 14, fontFamily: "'Fira Code',monospace", cursor: 'pointer' }}>⌫ Стерти</button>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════
//  ПІДКОМПОНЕНТИ СТОРІНОК
// ════════════════════════════════════════════════════════

function PrepTab({ batteryTypes, workers, prepItems, prodTypeId, onIssue, onReturn }) {
  const [wId, setWId] = useState(workers[0]?.id || '')
  const [matId, setMatId] = useState('')
  const [qty, setQty] = useState(1)
  const [retVals, setRetVals] = useState({})
  const type = batteryTypes.find(t => t.id === prodTypeId) || batteryTypes[0]
  const active = prepItems.filter(p => p.status !== 'returned')

  return <>
    <Card>
      <CardTitle color={G.pu}>📦 ВИДАТИ МАТЕРІАЛ</CardTitle>
      <FormRow label="ПРАЦІВНИК">
        <select value={wId} onChange={e => setWId(e.target.value)}>
          {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </FormRow>
      <FormRow label="МАТЕРІАЛ">
        <select value={matId} onChange={e => setMatId(e.target.value)}>
          <option value="">— оберіть матеріал —</option>
          {(type?.materials || []).map(m => <option key={m.id} value={m.id}>{m.name} ({m.stock} {m.unit})</option>)}
        </select>
      </FormRow>
      <FormRow label="КІЛЬКІСТЬ">
        <input type="number" value={qty} onChange={e => setQty(parseFloat(e.target.value) || 1)} min="0.01" step="0.01" />
      </FormRow>
      <SubmitBtn color={G.pu} onClick={() => onIssue(wId, matId, qty, prodTypeId)}>📦 ВИДАТИ</SubmitBtn>
    </Card>

    <Card>
      <CardTitle color={G.pu}>📋 АКТИВНІ ВИДАЧІ ({active.length})</CardTitle>
      {active.length === 0
        ? <div style={{ color: G.t2, fontSize: 13, padding: '6px 0' }}>Немає активних видач</div>
        : active.map(p => {
          const avail = +(p.qty - p.returnedQty).toFixed(4)
          return <div key={p.id} style={{ background: G.card2, borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{p.matName}</div>
            <div style={{ fontSize: 12, color: G.t2, marginTop: 2 }}>{p.workerName} · {p.date}</div>
            <div style={{ fontSize: 13, color: G.pu, margin: '4px 0 8px' }}>На руках: <b>{avail}</b> {p.unit}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <input type="number" placeholder="кількість" value={retVals[p.id] || ''} onChange={e => setRetVals(v => ({ ...v, [p.id]: e.target.value }))} style={{ width: 100 }} min="0.01" step="0.01" max={avail} />
              <button onClick={() => onReturn(p.id, false, retVals[p.id])} style={{ padding: '7px 10px', background: '#1e1b4b', color: G.pu, border: `1px solid #3730a3`, borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: "'Fira Code',monospace", fontWeight: 600 }}>↩ Частково</button>
              <button onClick={() => onReturn(p.id, true)} style={{ padding: '7px 10px', background: '#052e16', color: G.gn, border: `1px solid #166534`, borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: "'Fira Code',monospace", fontWeight: 600 }}>↩↩ Все</button>
            </div>
          </div>
        })}
    </Card>
  </>
}

// ════════════════════════════════════════════════════════
//  ГОЛОВНИЙ КОМПОНЕНТ
// ════════════════════════════════════════════════════════
export default function App() {
  // ── Авторизація ──────────────────────────────────────────
  const [authRole, setAuthRole] = useState(() => {
    try { return localStorage.getItem(AUTH_KEY) || null } catch { return null }
  })

  const handleAuth = (role) => {
    try { localStorage.setItem(AUTH_KEY, role) } catch {}
    setAuthRole(role)
  }
  const handleLogout = () => {
    try { localStorage.removeItem(AUTH_KEY) } catch {}
    setAuthRole(null)
  }

  // ── Якщо не авторизовано ─────────────────────────────────
  if (!authRole) return <><style>{GLOBAL_CSS}</style><AuthScreen onAuth={handleAuth} /></>

  const isAdmin = authRole === 'admin'

  return <AppInner isAdmin={isAdmin} onLogout={handleLogout} />
}

// ── Основна частина (рендериться після авторизації) ──────
function AppInner({ isAdmin, onLogout }) {
  // ── Стан сервера ─────────────────────────────────────────
  const [sync, setSync] = useState('loading')
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(null)
  const [pullDist, setPullDist] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const startY = useRef(0)

  // ── Навігація ─────────────────────────────────────────────
  const ALL_NAV = [
    ['prod',     '⚙',  'ВИР.'],
    ['repair',   '🔧', 'РЕМОНТ'],
    ['log',      '📋', 'ЖУРНАЛ'],
    ['stock',    '📦', 'СКЛАД'],
    ['shopping', '🛒', 'ЗАКУПІВЛЯ'],
    ['workers',  '👷', 'КОМАНДА'],
    ['tools',    '🛠', 'ІНСТР.'],
    ['manual',   '📖', 'МАНУАЛ'],
  ]
  // Юзер бачить: виробництво, ремонт, журнал, склад (тільки перегляд), інструменти (тільки перегляд + ремонт)
  const USER_NAV = [
    ['prod',   '⚙',  'ВИР.'],
    ['repair', '🔧', 'РЕМОНТ'],
    ['log',    '📋', 'ЖУРНАЛ'],
    ['stock',  '📦', 'СКЛАД'],
    ['tools',  '🛠', 'ІНСТР.'],
    ['manual', '📖', 'МАНУАЛ'],
  ]
  const NAV = isAdmin ? ALL_NAV : USER_NAV

  const [page, setPage] = useState('prod')
  const [prodTab, setProdTab] = useState('writeoff')
  const [repTab, setRepTab] = useState('new')

  // ── Дані ─────────────────────────────────────────────────
  const [batteryTypes, setBatteryTypes] = useState([])
  const [workers, setWorkers] = useState([])
  const [tools, setTools] = useState([])
  const [log, setLog] = useState([])
  const [repairLog, setRepairLog] = useState([])
  const [prepItems, setPrepItems] = useState([])

  // ── UI стан ──────────────────────────────────────────────
  const [prodTypeId, setProdTypeId] = useState('')
  const [stockTypeId, setStockTypeId] = useState('')
  const [prodWorker, setProdWorker] = useState('')
  const [prodQty, setProdQty] = useState(1)
  const [prodDate, setProdDate] = useState(todayStr())
  const [prodSerials, setProdSerials] = useState([])
  const [stockSearch, setStockSearch] = useState('')
  const [repairSerial, setRepairSerial] = useState('')
  const [repairSearch, setRepairSearch] = useState('')

  // ── Хелпери ──────────────────────────────────────────────
  const showToast = useCallback((msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const openConfirm = useCallback((title, body, onYes) => {
    setModal({ type: 'confirm', title, body, onYes })
  }, [])

  const openInput = useCallback((title, placeholder, defaultVal, onConfirm) => {
    setModal({ type: 'input', title, placeholder, defaultVal, onConfirm })
  }, [])

  const closeModal = () => setModal(null)

  // ── Pull-to-refresh ───────────────────────────────────────
  const handleTouchStart = (e) => {
    const el = e.currentTarget
    if (el.scrollTop <= 0) { startY.current = e.touches[0].pageY; setIsPulling(true) }
  }
  const handleTouchMove = (e) => {
    if (!isPulling) return
    const dist = e.touches[0].pageY - startY.current
    if (dist > 0) {
      setPullDist(Math.min(dist * 0.4, 80))
      if (dist > 10 && e.cancelable) e.preventDefault()
    } else { setIsPulling(false); setPullDist(0) }
  }
  const handleTouchEnd = () => {
    if (pullDist > 65) window.location.reload()
    setIsPulling(false); setPullDist(0)
  }

  // ── API обгортка ─────────────────────────────────────────
  const api = useCallback(async (action, params = []) => {
    setSync('saving')
    try {
      const res = await gasCall(action, params)
      setSync('ok')
      return res
    } catch (e) {
      setSync('error')
      showToast('Помилка: ' + e.message, 'err')
      throw e
    }
  }, [showToast])

  // ── Завантаження даних ────────────────────────────────────
  useEffect(() => {
    setSync('loading')
    gasCall('loadAll', [])
      .then(data => {
        setBatteryTypes(data.batteryTypes || [])
        const wks = data.workers || []
        if (!wks.find(w => w.id === 'TEAM_SHARED')) {
          wks.unshift({ id: 'TEAM_SHARED', name: '🤝 СПІЛЬНИЙ СТІЛ (Команда)' })
        }
        setWorkers(wks)
        setTools(data.tools || [])
        setLog(data.log || [])
        setRepairLog(data.repairLog || [])
        setPrepItems(data.prepItems || [])
        if (data.batteryTypes?.length) {
          setProdTypeId(data.batteryTypes[0].id)
          setStockTypeId(data.batteryTypes[0].id)
        }
        if (wks.length > 1) setProdWorker(wks[1].id)
        else if (wks.length > 0) setProdWorker(wks[0].id)
        setSync('ok')
      })
      .catch(() => {
        setSync('error')
        showToast('Не вдалось завантажити дані.', 'err')
      })
  }, [showToast])

  // ── Похідні дані ─────────────────────────────────────────
  const prodType = batteryTypes.find(t => t.id === prodTypeId) || batteryTypes[0]
  const stockType = batteryTypes.find(t => t.id === stockTypeId) || batteryTypes[0]
  const perDay = Math.max(1, workers.filter(w => w.id !== 'TEAM_SHARED').length) * 1.5
  const activePrep = prepItems.filter(p => p.status !== 'returned')

  // ── Розрахунок витрат ─────────────────────────────────────
  const buildConsumed = useCallback((type, workerId, qty) => {
    if (!type) return []
    const myPrep = prepItems.filter(p => p.workerId === workerId && p.typeId === type.id && p.status !== 'returned')
    const teamPrep = prepItems.filter(p => p.workerId === 'TEAM_SHARED' && p.typeId === type.id && p.status !== 'returned')

    return type.materials.map(m => {
      let need = +(m.perBattery * qty).toFixed(4)
      const needOrig = need
      const pAvail = myPrep.filter(p => p.matId === m.id).reduce((s, p) => +(s + p.qty - p.returnedQty).toFixed(4), 0)
      const fromPersonal = +Math.min(pAvail, need).toFixed(4)
      need = +(need - fromPersonal).toFixed(4)
      const tAvail = teamPrep.filter(p => p.matId === m.id).reduce((s, p) => +(s + p.qty - p.returnedQty).toFixed(4), 0)
      const fromTeam = +Math.min(tAvail, need).toFixed(4)
      need = +(need - fromTeam).toFixed(4)
      return { matId: m.id, name: m.name, unit: m.unit, amount: needOrig, fromPersonal, fromTeam, fromStock: need, totalStock: m.stock }
    })
  }, [prepItems])

  // ── Глобальне оновлення матеріалу за назвою ──────────────
  const syncMatByName = useCallback((name, deltaOrNew, isAbsolute = false) => {
    // isAbsolute=true: встановити новий залишок
    // isAbsolute=false: додати/відняти delta
    const tasks = []
    const updates = []
    batteryTypes.forEach(bt => {
      const m = bt.materials.find(mx => mx.name === name)
      if (m) {
        const newStock = isAbsolute ? deltaOrNew : Math.max(0, +(m.stock + deltaOrNew).toFixed(4))
        const delta = isAbsolute ? newStock - m.stock : deltaOrNew
        tasks.push(api('updateMaterialStock', [bt.id, m.id, delta]))
        updates.push({ typeId: bt.id, matId: m.id, newStock })
      }
    })
    setBatteryTypes(prev => prev.map(t => {
      const u = updates.filter(x => x.typeId === t.id)
      if (!u.length) return t
      return { ...t, materials: t.materials.map(m => { const up = u.find(x => x.matId === m.id); return up ? { ...m, stock: up.newStock } : m }) }
    }))
    return tasks
  }, [batteryTypes, api])

  // ════════════════════════════════════════════════════════
  //  ACTIONS
  // ════════════════════════════════════════════════════════

  const doWriteoff = () => {
    const type = prodType
    const worker = workers.find(w => w.id === prodWorker)
    if (!type || !worker) return showToast('Оберіть тип та працівника', 'err')
    const serials = prodSerials.slice(0, prodQty)
    for (const s of serials) if (!s?.trim()) return showToast('Введіть всі серійні номери', 'err')
    const consumed = buildConsumed(type, worker.id, prodQty)
    const shortage = consumed.find(c => c.fromStock > c.totalStock)
    if (shortage) return showToast('Не вистачає: ' + shortage.name, 'err')

    openConfirm(
      'Підтвердити списання',
      <div style={{ fontSize: 13, color: G.t2, lineHeight: 1.8 }}>
        <b style={{ color: G.t1 }}>{type.name}</b><br />
        Працівник: {worker.name}<br />
        Кількість: <b style={{ color: G.or }}>{prodQty}</b><br />
        С/н: {serials.join(', ')}
      </div>,
      async () => {
        closeModal()
        const entry = {
          id: uid(), datetime: nowStr(), date: prodDate,
          typeId: type.id, typeName: type.name, workerName: worker.name,
          count: prodQty, serials, consumed, kind: 'production', repairNote: '',
        }
        try {
          const syncTasks = []
          const syncMatUpdates = []
          consumed.forEach(c => {
            if (c.fromStock > 0) {
              batteryTypes.forEach(bt => {
                const sameNamedMat = bt.materials.find(mx => mx.name === c.name)
                if (sameNamedMat) {
                  syncTasks.push(api('updateMaterialStock', [bt.id, sameNamedMat.id, -c.fromStock]))
                  syncMatUpdates.push({ typeId: bt.id, matId: sameNamedMat.id, deduct: c.fromStock })
                }
              })
            }
          })

          await Promise.all([api('writeOff', [entry]), ...syncTasks])

          setBatteryTypes(prev => prev.map(t => {
            const ups = syncMatUpdates.filter(u => u.typeId === t.id)
            if (!ups.length) return t
            return { ...t, materials: t.materials.map(m => { const up = ups.find(u => u.matId === m.id); return up ? { ...m, stock: Math.max(0, +(m.stock - up.deduct).toFixed(4)) } : m }) }
          }))

          setPrepItems(prev => {
            const next = prev.map(p => ({ ...p }))
            consumed.forEach(c => {
              const deductPrep = (wId, amt) => {
                if (!amt) return
                let rem = amt
                next.filter(p => p.workerId === wId && p.typeId === type.id && p.matId === c.matId && p.status !== 'returned').forEach(p => {
                  if (rem <= 0) return
                  const avail = p.qty - p.returnedQty
                  const use = Math.min(avail, rem)
                  p.returnedQty = +(p.returnedQty + use).toFixed(4)
                  p.status = p.returnedQty >= p.qty ? 'returned' : 'partial'
                  rem = +(rem - use).toFixed(4)
                })
              }
              deductPrep(worker.id, c.fromPersonal)
              deductPrep('TEAM_SHARED', c.fromTeam)
            })
            return next
          })

          setLog(prev => [entry, ...prev])
          setProdSerials([])
          showToast(`✓ Списано ${prodQty} акум. (${serials.join(', ')})`)

          // Telegram сповіщення про низький запас
          const lowMats = type.materials.filter(m => {
            const up = syncMatUpdates.find(u => u.matId === m.id)
            const ns = up ? Math.max(0, +(m.stock - up.deduct).toFixed(4)) : m.stock
            return ns <= m.minStock && m.minStock > 0
          })
          if (lowMats.length > 0) {
            const lines = lowMats.map(m => {
              const up = syncMatUpdates.find(u => u.matId === m.id)
              const ns = up ? Math.max(0, +(m.stock - up.deduct).toFixed(4)) : m.stock
              const shopLink = m.shopUrl ? `\n  🔗 <a href="${m.shopUrl}">${m.shopUrl}</a>` : ''
              return `• ${m.name}: <b>${ns} ${m.unit}</b> (мін: ${m.minStock})${shopLink}`
            }).join('\n')
            sendTelegram(`⚠️ <b>ZmiyCell — низький запас</b>\n\n${lines}`)
          }
        } catch { }
      }
    )
  }

  const doIssuePrep = (workerId, matId, qty, typeId) => {
    const type = batteryTypes.find(t => t.id === typeId)
    const worker = workers.find(w => w.id === workerId)
    const mat = type?.materials.find(m => m.id === matId)
    if (!mat || !worker || !qty || qty <= 0) return showToast('Заповніть всі поля', 'err')
    if (mat.stock < qty) return showToast('Не вистачає: ' + mat.name, 'err')

    openConfirm('Видача на заготовку',
      <div style={{ fontSize: 13, color: G.t2, lineHeight: 1.8 }}><b style={{ color: G.t1 }}>{mat.name}</b><br />Кількість: {qty} {mat.unit}<br />Працівник: {worker.name}</div>,
      async () => {
        closeModal()
        const item = { id: uid(), workerId: worker.id, workerName: worker.name, typeId: type.id, matId: mat.id, matName: mat.name, unit: mat.unit, qty, returnedQty: 0, date: todayStr(), datetime: nowStr(), status: 'active' }
        try {
          await api('addPrepItem', [item])
          setBatteryTypes(prev => prev.map(t => t.id !== type.id ? t : { ...t, materials: t.materials.map(m => m.id !== mat.id ? m : { ...m, stock: Math.max(0, +(m.stock - qty).toFixed(4)) }) }))
          setPrepItems(prev => [item, ...prev])
          showToast(`✓ Видано ${qty} ${mat.unit} → ${worker.name}`)
        } catch { }
      }
    )
  }

  const doReturnPrep = async (prepId, all, customQty) => {
    const item = prepItems.find(p => String(p.id) === String(prepId))
    if (!item) return
    const avail = +(item.qty - item.returnedQty).toFixed(4)
    const qty = all ? avail : parseFloat(customQty || 0)
    if (!qty || qty <= 0) return showToast('Введіть кількість', 'err')
    if (qty > avail) return showToast('Більше ніж є на руках', 'err')
    try {
      await api('returnPrep', [prepId, qty])
      setBatteryTypes(prev => prev.map(t => t.id !== item.typeId ? t : { ...t, materials: t.materials.map(m => m.id !== item.matId ? m : { ...m, stock: +(m.stock + qty).toFixed(4) }) }))
      setPrepItems(prev => prev.map(p => String(p.id) !== String(prepId) ? p : { ...p, returnedQty: +(p.returnedQty + qty).toFixed(4), status: (p.returnedQty + qty) >= p.qty ? 'returned' : 'partial' }))
      showToast(`✓ Повернено ${qty} ${item.unit}`)
    } catch { }
  }

  const doSubmitRepair = (repairEntry) => {
    const type = batteryTypes.find(t => t.id === repairEntry.typeId)
    const err = repairEntry.materials.filter(m => m.selected && m.qty > 0).find(m => {
      const mat = type?.materials.find(mx => mx.id === m.matId)
      return mat && mat.stock < m.qty
    })
    if (err) return showToast('Не вистачає: ' + err.matName, 'err')

    openConfirm('Підтвердити ремонт',
      <div style={{ fontSize: 13, color: G.t2, lineHeight: 1.8 }}>
        С/н: <b style={{ color: G.cy }}>{repairEntry.serial}</b><br />
        Ремонтує: {repairEntry.repairWorker}
      </div>,
      async () => {
        closeModal()
        try {
          const syncTasks = []
          const syncMatUpdates = []
          repairEntry.materials.forEach(r => {
            if (r.selected && r.qty > 0) {
              batteryTypes.forEach(bt => {
                const sameNamedMat = bt.materials.find(mx => mx.name === r.matName)
                if (sameNamedMat) {
                  syncTasks.push(api('updateMaterialStock', [bt.id, sameNamedMat.id, -r.qty]))
                  syncMatUpdates.push({ typeId: bt.id, matId: sameNamedMat.id, deduct: r.qty })
                }
              })
            }
          })
          await Promise.all([api('addRepair', [repairEntry]), ...syncTasks])
          setBatteryTypes(prev => prev.map(t => {
            const ups = syncMatUpdates.filter(u => u.typeId === t.id)
            if (!ups.length) return t
            return { ...t, materials: t.materials.map(m => { const up = ups.find(u => u.matId === m.id); return up ? { ...m, stock: Math.max(0, +(m.stock - up.deduct).toFixed(4)) } : m }) }
          }))
          setRepairLog(prev => [repairEntry, ...prev])
          setLog(prev => [{ id: repairEntry.id + 'L', datetime: repairEntry.datetime, date: repairEntry.date, typeId: repairEntry.typeId, typeName: repairEntry.typeName, workerName: repairEntry.repairWorker, count: 0, serials: [repairEntry.serial], consumed: repairEntry.materials.filter(m => m.selected && m.qty > 0).map(m => ({ name: m.matName, unit: m.unit, amount: m.qty })), kind: 'repair', repairNote: repairEntry.note || '' }, ...prev])
          setRepairSerial('')
          setRepairSearch('')
          showToast('✓ Ремонт зафіксовано: ' + repairEntry.serial)
        } catch { }
      }
    )
  }

  // ════════════════════════════════════════════════════════
  //  СТОРІНКИ
  // ════════════════════════════════════════════════════════

  const wrap = (children) =>
    <div style={{ padding: '12px 12px 40px', maxWidth: 700, margin: '0 auto' }}>{children}</div>

  // ── Виробництво ───────────────────────────────────────────
  const PageProd = () => {
    const consumed = prodType ? buildConsumed(prodType, prodWorker, prodQty) : []
    const serials = Array.from({ length: prodQty }, (_, i) => prodSerials[i] || '')
    return wrap(<>
      <SubTabs tabs={[['writeoff', '🔋 СПИСАННЯ'], ['prep', '📦 ЗАГОТОВКА']]} active={prodTab} onChange={setProdTab} />
      {prodTab === 'writeoff' && <>
        <TypeTabs types={batteryTypes} active={prodTypeId} onSelect={id => { setProdTypeId(id); setProdSerials([]) }} />
        <Card>
          <FormRow label="ПРАЦІВНИК">
            <select value={prodWorker} onChange={e => setProdWorker(e.target.value)}>
              {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </FormRow>
          <FormRow label="ДАТА">
            <input value={prodDate} onChange={e => setProdDate(e.target.value)} />
          </FormRow>
          <FormRow label="КІЛЬКІСТЬ АКУМУЛЯТОРІВ">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <QtyBtn onClick={() => { if (prodQty > 1) { setProdQty(q => q - 1); setProdSerials(s => s.slice(0, -1)) } }}>−</QtyBtn>
              <span style={{ fontSize: 28, fontWeight: 700, color: G.or, minWidth: 44, textAlign: 'center' }}>{prodQty}</span>
              <QtyBtn onClick={() => { if (prodQty < 20) setProdQty(q => q + 1) }}>+</QtyBtn>
            </div>
          </FormRow>
          <FormRow label="СЕРІЙНІ НОМЕРИ">
            {serials.map((v, i) =>
              <input key={i} placeholder={`#${i + 1} серійний номер`} value={v}
                onChange={e => { const s = [...prodSerials]; while (s.length <= i) s.push(''); s[i] = e.target.value; setProdSerials(s) }}
                style={{ marginBottom: 6 }} />)}
          </FormRow>
        </Card>
        {prodType && <Card>
          <CardTitle>⚡ БУДЕ СПИСАНО</CardTitle>
          {consumed.map(c => {
            const ok = c.fromStock <= c.totalStock
            return <div key={c.matId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${G.b1}`, fontSize: 13 }}>
              <span style={{ color: ok ? G.t1 : G.rd, flex: 1, paddingRight: 8 }}>{c.name}</span>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {c.fromPersonal > 0 && <Chip bg='#2e1065' color='#c084fc' bd='#4c1d95'>👷{c.fromPersonal}</Chip>}
                {c.fromTeam > 0 && <Chip bg='#1e3a8a' color='#93c5fd' bd='#1e40af'>🤝{c.fromTeam}</Chip>}
                {c.fromStock > 0 && <Chip bg='#1c1007' color='#fb923c' bd='#9a3412'>🏭{c.fromStock}</Chip>}
                <span style={{ color: ok ? G.gn : G.rd, fontWeight: 600, minWidth: 60, textAlign: 'right' }}>{c.amount} {c.unit}</span>
              </div>
            </div>
          })}
        </Card>}
        <SubmitBtn onClick={doWriteoff}>✓ СПИСАТИ МАТЕРІАЛИ</SubmitBtn>
        <div style={{ height: 16 }} />
      </>}
      {prodTab === 'prep' && <PrepTab batteryTypes={batteryTypes} workers={workers} prepItems={prepItems} prodTypeId={prodTypeId} onIssue={doIssuePrep} onReturn={doReturnPrep} />}
    </>)
  }

  // ── Склад ─────────────────────────────────────────────────
  const PageStock = () => {
    const [rsVals, setRsVals] = useState({})
    const [newMat, setNewMat] = useState({ name: '', unit: '', perBattery: '', stock: '', minStock: '', shopUrl: '' })
    const [editShopId, setEditShopId] = useState(null)
    const [editShopVal, setEditShopVal] = useState('')
    const type = stockType
    if (!type) return wrap(<Center>Немає даних</Center>)
    const mats = type.materials.filter(m => !stockSearch || m.name.toLowerCase().includes(stockSearch.toLowerCase()))

    // Режим тільки перегляд для юзерів
    if (!isAdmin) return wrap(<>
      <TypeTabs types={batteryTypes} active={stockTypeId} onSelect={setStockTypeId} />
      <input placeholder="🔍 Пошук матеріалу..." value={stockSearch} onChange={e => setStockSearch(e.target.value)} style={{ marginBottom: 10 }} />
      <div style={{ color: G.t2, fontSize: 12, marginBottom: 10, padding: '6px 10px', background: G.b1, borderRadius: 8 }}>
        👁 Перегляд залишків — редагування доступне тільки адміну
      </div>
      {mats.map(m => <div key={m.id} style={{ background: G.card, border: `1px solid ${G.b1}`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{m.name}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <StatusBadge m={m} perDay={perDay} />
          <span style={{ background: G.card2, border: `1px solid ${G.b1}`, borderRadius: 6, padding: '2px 8px', fontSize: 13, color: G.cy, fontWeight: 700 }}>{m.stock} {m.unit}</span>
          <span style={{ fontSize: 11, color: G.t2 }}>x{m.perBattery}/акум</span>
          <span style={{ fontSize: 11, color: G.t2 }}>мін:{m.minStock}</span>
        </div>
        {m.shopUrl && <a href={m.shopUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: G.cy, textDecoration: 'none', display: 'inline-block', marginTop: 6 }}>Магазин</a>}
      </div>)}
    </>)

    const restock = async (matId, customQty) => {
      const qty = parseFloat(customQty ?? rsVals[matId] ?? 0)
      if (!qty || qty <= 0) return showToast('Введіть кількість', 'err')
      const targetMat = type.materials.find(m => m.id === matId)
      if (!targetMat) return
      const tasks = []
      const updates = []
      batteryTypes.forEach(bt => {
        const m = bt.materials.find(mx => mx.name === targetMat.name)
        if (m) {
          tasks.push(api('updateMaterialStock', [bt.id, m.id, qty]))
          updates.push({ typeId: bt.id, matId: m.id, added: qty })
        }
      })
      await Promise.all(tasks)
      setBatteryTypes(prev => prev.map(t => {
        const ups = updates.filter(u => u.typeId === t.id)
        if (!ups.length) return t
        return { ...t, materials: t.materials.map(m => { const up = ups.find(u => u.matId === m.id); return up ? { ...m, stock: +(m.stock + up.added).toFixed(4) } : m }) }
      }))
      setRsVals(v => ({ ...v, [matId]: '' }))
      showToast(`✓ Поповнено на ${qty}`)
    }

    const editField = (matId, field, old) => {
      openInput(
        field === 'name' ? 'Нова назва:' : field === 'stock' ? 'Новий залишок:' : field === 'perBattery' ? 'На 1 акумулятор:' : 'Мін. запас:',
        String(old),
        String(old),
        async (val) => {
          closeModal()
          if (field === 'name') {
            if (!val.trim() || val.trim() === String(old)) return
            await api('updateMaterialField', [type.id, matId, 'name', val.trim()])
            setBatteryTypes(prev => prev.map(t => t.id !== type.id ? t : { ...t, materials: t.materials.map(m => m.id !== matId ? m : { ...m, name: val.trim() }) }))
            return showToast('✓ Назву змінено')
          }
          const parsed = parseFloat(val)
          if (isNaN(parsed)) return showToast('Невірне значення', 'err')

          if (field === 'stock') {
            // Встановити НОВИЙ абсолютний залишок глобально
            const targetMat = type.materials.find(m => m.id === matId)
            if (!targetMat) return
            const tasks = []
            const updates = []
            batteryTypes.forEach(bt => {
              const m = bt.materials.find(mx => mx.name === targetMat.name)
              if (m) {
                const delta = parsed - m.stock
                tasks.push(api('updateMaterialStock', [bt.id, m.id, delta]))
                updates.push({ typeId: bt.id, matId: m.id, newStock: parsed })
              }
            })
            await Promise.all(tasks)
            setBatteryTypes(prev => prev.map(t => {
              const ups = updates.filter(u => u.typeId === t.id)
              if (!ups.length) return t
              return { ...t, materials: t.materials.map(m => { const up = ups.find(u => u.matId === m.id); return up ? { ...m, stock: up.newStock } : m }) }
            }))
            return showToast(`✓ Залишок встановлено: ${parsed}`)
          }

          await api('updateMaterialField', [type.id, matId, field, parsed])
          setBatteryTypes(prev => prev.map(t => t.id !== type.id ? t : { ...t, materials: t.materials.map(m => m.id !== matId ? m : { ...m, [field]: parsed }) }))
          showToast('✓ Збережено')
        }
      )
    }

    const saveShopUrl = async (matId, url) => {
      const targetMat = type.materials.find(m => m.id === matId)
      if (!targetMat) return
      // Save shopUrl across ALL types with same name
      const tasks = []
      batteryTypes.forEach(bt => {
        const m = bt.materials.find(mx => mx.name === targetMat.name)
        if (m) tasks.push(api('updateMaterialField', [bt.id, m.id, 'shopUrl', url]))
      })
      await Promise.all(tasks)
      setBatteryTypes(prev => prev.map(t => ({
        ...t, materials: t.materials.map(m => m.name === targetMat.name ? { ...m, shopUrl: url } : m)
      })))
      setEditShopId(null)
      showToast('✓ Посилання збережено')
    }

    const deleteMat = (m) => openConfirm('Видалити матеріал?',
      <span>Буде видалено: <b style={{ color: G.rd }}>{m.name}</b></span>,
      async () => {
        closeModal()
        await api('deleteMaterial', [type.id, m.id])
        setBatteryTypes(prev => prev.map(t => t.id !== type.id ? t : { ...t, materials: t.materials.filter(mx => mx.id !== m.id) }))
        showToast('✓ Видалено ' + m.name)
      })

    const showHist = (m) => {
      const entries = log.flatMap(e => (e.consumed || []).filter(c => c.name === m.name).map(c => ({ ...c, datetime: e.datetime, workerName: e.workerName, kind: e.kind }))).slice(0, 20)
      setModal({ type: 'history', mat: m, entries })
    }

    const addMat = async () => {
      const { name, unit, perBattery, stock, minStock, shopUrl } = newMat
      if (!name || !unit || !perBattery) return showToast("Назва, одиниця та норма — обов'язкові", 'err')
      const res = await api('addMaterial', [type.id, name, unit, parseFloat(perBattery), parseFloat(stock) || 0, parseFloat(minStock) || 0, shopUrl || ''])
      setBatteryTypes(prev => prev.map(t => t.id !== type.id ? t : {
        ...t, materials: [...t.materials, { id: res.id, name, unit, perBattery: parseFloat(perBattery), stock: parseFloat(stock) || 0, minStock: parseFloat(minStock) || 0, shopUrl: shopUrl || '', photoUrl: null }]
      }))
      setNewMat({ name: '', unit: '', perBattery: '', stock: '', minStock: '', shopUrl: '' })
      showToast('✓ Додано ' + name)
    }

    const addBatteryType = () => {
      openInput('Новий тип акумулятора', 'Назва типу (напр. 48V 20Ah)', '', async (name) => {
        closeModal()
        api('addBatteryType', [name]).then(res => {
          const newType = { id: res.id, name, materials: [], color: G.or }
          setBatteryTypes(p => [...p, newType])
          setStockTypeId(res.id)
          showToast('✓ Тип додано: ' + name)
        }).catch(() => { })
      })
    }

    const prepBadge = (matId) => prepItems.filter(p => p.typeId === type.id && p.matId === matId && p.status !== 'returned').reduce((s, p) => +(s + p.qty - p.returnedQty).toFixed(4), 0)

    return wrap(<>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <TypeTabs types={batteryTypes} active={stockTypeId} onSelect={setStockTypeId} />
        </div>
        <button onClick={addBatteryType} style={{ background: G.b1, border: `1px solid ${G.b2}`, color: G.gn, padding: '10px 14px', borderRadius: 10, fontSize: 18, cursor: 'pointer', flexShrink: 0, marginTop: 0 }}>+</button>
      </div>
      <input placeholder="🔍 Пошук матеріалу..." value={stockSearch} onChange={e => setStockSearch(e.target.value)} style={{ marginBottom: 10 }} />

      {mats.map(m => <div key={m.id} style={{ background: G.card, border: `1px solid ${G.b1}`, borderRadius: 12, padding: 12, marginBottom: 8, display: 'flex', gap: 10 }}>
        <div style={{ width: 50, height: 42, borderRadius: 8, border: `1px dashed ${G.b2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: G.b2, background: G.card2, flexShrink: 0, overflow: 'hidden' }}>
          {m.photoUrl ? <img src={m.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📷'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div onClick={() => editField(m.id, 'name', m.name)} style={{ fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 5, color: G.t1 }}>{m.name}</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', marginBottom: 7 }}>
            <StatusBadge m={m} perDay={perDay} />
            <span onClick={() => editField(m.id, 'stock', m.stock)} style={{ background: G.card2, border: `1px solid ${G.b1}`, borderRadius: 6, padding: '2px 8px', fontSize: 12, color: G.cy, cursor: 'pointer' }}>{m.stock} {m.unit}</span>
            <span onClick={() => editField(m.id, 'perBattery', m.perBattery)} style={{ fontSize: 11, color: G.t2, cursor: 'pointer' }}>×{m.perBattery}/акум</span>
            <span onClick={() => editField(m.id, 'minStock', m.minStock)} style={{ fontSize: 11, color: G.t2, cursor: 'pointer' }}>мін:{m.minStock}</span>
            {prepBadge(m.id) > 0 && <Chip bg='#2e1065' color='#c084fc' bd='#4c1d95'>📦{prepBadge(m.id)}</Chip>}
            <button onClick={() => showHist(m)} style={{ background: G.card2, border: `1px solid ${G.b1}`, color: G.pu, padding: '2px 7px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>📊</button>
            <button onClick={() => deleteMat(m)} style={{ background: '#450a0a', border: 'none', color: G.rd, padding: '2px 7px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>✕</button>
          </div>

          {/* Посилання на магазин */}
          {editShopId === m.id ? (
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input placeholder="https://..." value={editShopVal} onChange={e => setEditShopVal(e.target.value)} style={{ fontSize: 12 }} />
              <button onClick={() => saveShopUrl(m.id, editShopVal)} style={{ padding: '6px 10px', background: G.gn, color: '#000', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>✓</button>
              <button onClick={() => setEditShopId(null)} style={{ padding: '6px 10px', background: G.b1, color: G.t2, border: `1px solid ${G.b2}`, borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>✕</button>
            </div>
          ) : (
            <div style={{ marginBottom: 6 }}>
              {m.shopUrl
                ? <a href={m.shopUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: G.cy, textDecoration: 'none', marginRight: 8 }}>🔗 Магазин</a>
                : null}
              <span onClick={() => { setEditShopId(m.id); setEditShopVal(m.shopUrl || '') }} style={{ fontSize: 11, color: G.t2, cursor: 'pointer' }}>{m.shopUrl ? '✎' : '+ додати посилання'}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 6 }}>
            <input type="number" placeholder="+кільк." value={rsVals[m.id] || ''} onChange={e => setRsVals(v => ({ ...v, [m.id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && restock(m.id)} style={{ width: 90 }} />
            <button onClick={() => restock(m.id)} style={{ padding: '6px 12px', background: '#431407', color: '#fed7aa', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+</button>
          </div>
        </div>
      </div>)}

      <Card>
        <CardTitle color={G.gn}>+ ДОДАТИ МАТЕРІАЛ</CardTitle>
        <input placeholder="Назва матеріалу" value={newMat.name} onChange={e => setNewMat(v => ({ ...v, name: e.target.value }))} style={{ marginBottom: 6 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
          <input placeholder="Одиниця (шт, м, г)" value={newMat.unit} onChange={e => setNewMat(v => ({ ...v, unit: e.target.value }))} />
          <input type="number" placeholder="На 1 акум" value={newMat.perBattery} onChange={e => setNewMat(v => ({ ...v, perBattery: e.target.value }))} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
          <input type="number" placeholder="Залишок" value={newMat.stock} onChange={e => setNewMat(v => ({ ...v, stock: e.target.value }))} />
          <input type="number" placeholder="Мін. запас" value={newMat.minStock} onChange={e => setNewMat(v => ({ ...v, minStock: e.target.value }))} />
        </div>
        <input placeholder="🔗 Посилання на магазин (необов.)" value={newMat.shopUrl} onChange={e => setNewMat(v => ({ ...v, shopUrl: e.target.value }))} style={{ marginBottom: 4 }} />
        <SubmitBtn onClick={addMat} color={G.gn}>+ ДОДАТИ МАТЕРІАЛ</SubmitBtn>
      </Card>
    </>)
  }

  // ── Ремонт ────────────────────────────────────────────────
  const PageRepair = () => {
    const [repWorker, setRepWorker] = useState(workers[0]?.id || '')
    const [repDate, setRepDate] = useState(todayStr())
    const [repNote, setRepNote] = useState('')
    const [matChecks, setMatChecks] = useState({})
    const [matQtys, setMatQtys] = useState({})
    // Виправлено: useState замість document.getElementById
    const [manTypeId, setManTypeId] = useState(batteryTypes[0]?.id || '')
    const [manWorkerId, setManWorkerId] = useState(workers[0]?.id || '')
    const [manDate, setManDate] = useState(todayStr())

    const serial = repairSerial
    const found = serial ? log.find(l => l.serials?.includes(serial)) : null
    const repType = found ? batteryTypes.find(t => t.id === found.typeId) : null
    const doSearch = () => setRepairSerial(repairSearch.trim())

    const handleSubmit = () => {
      if (!repType) return
      const rw = workers.find(w => w.id === repWorker)
      const materials = repType.materials.map(m => ({
        matId: m.id, matName: m.name, unit: m.unit,
        qty: parseFloat(matQtys[m.id] ?? m.perBattery) || 0,
        selected: matChecks[m.id] !== false,
      }))
      doSubmitRepair({ id: uid(), datetime: nowStr(), date: repDate, serial, typeName: repType.name, typeId: repType.id, originalWorker: found.workerName, repairWorker: rw?.name || '', note: repNote, materials, status: 'completed' })
    }

    const handleManualRegister = () => {
      const t = batteryTypes.find(t => t.id === manTypeId)
      const w = workers.find(w => w.id === manWorkerId)
      const entry = { id: uid(), datetime: nowStr(), date: manDate, typeId: manTypeId, typeName: t?.name || '', workerName: w?.name || '', count: 1, serials: [serial], consumed: [], kind: 'production', repairNote: '' }
      setLog(prev => [entry, ...prev])
      showToast('✓ Зареєстровано ' + serial)
    }

    const returnAll = (r) => openConfirm('Повернути всі матеріали?', 'Повернуться на склад.', async () => {
      closeModal()
      await api('returnRepairMaterials', [r.id, null])
      setBatteryTypes(prev => prev.map(t => t.id !== r.typeId ? t : {
        ...t, materials: t.materials.map(m => { const rm = r.materials.find(rx => rx.matId === m.id && rx.selected && rx.qty > 0); return rm ? { ...m, stock: +(m.stock + rm.qty).toFixed(4) } : m })
      }))
      showToast('✓ Матеріали повернуто')
    })

    const deleteRep = (r) => openConfirm('Видалити запис?', 'Матеріали НЕ повернуться на склад.', async () => {
      closeModal()
      await api('deleteRepair', [r.id])
      setRepairLog(prev => prev.filter(rx => String(rx.id) !== String(r.id)))
      showToast('✓ Видалено')
    })

    return wrap(<>
      <SubTabs tabs={[['new', '🔧 НОВИЙ'], ['log', '📋 ЗАПИСИ']]} active={repTab} onChange={setRepTab} />
      {repTab === 'new' && <>
        <Card>
          <CardTitle color='#fb923c'>🔧 НОВИЙ РЕМОНТ</CardTitle>
          <FormRow label="СЕРІЙНИЙ НОМЕР">
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={repairSearch} onChange={e => setRepairSearch(e.target.value)} placeholder="напр. SK-2026-001" onKeyDown={e => e.key === 'Enter' && doSearch()} />
              <button onClick={doSearch} style={{ padding: '8px 14px', background: G.b1, border: `1px solid ${G.b2}`, color: G.t1, borderRadius: 8, fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>🔍</button>
            </div>
          </FormRow>
        </Card>

        {serial && found && repType && <Card style={{ borderColor: G.gn }}>
          <div style={{ color: G.gn, fontSize: 12, marginBottom: 12 }}>✓ Знайдено: {found.typeName} · {found.workerName} · {found.date}</div>
          <FormRow label="РЕМОНТУЄ">
            <select value={repWorker} onChange={e => setRepWorker(e.target.value)}>
              {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </FormRow>
          <FormRow label="ДАТА"><input value={repDate} onChange={e => setRepDate(e.target.value)} /></FormRow>
          <FormRow label="НОТАТКА / НЕСПРАВНІСТЬ"><input value={repNote} onChange={e => setRepNote(e.target.value)} placeholder="напр. заміна BMS" /></FormRow>
          <FormRow label="МАТЕРІАЛИ ДЛЯ ЗАМІНИ">
            {repType.materials.map(m => {
              const checked = matChecks[m.id] !== false
              const qty = matQtys[m.id] ?? m.perBattery
              const mat = repType.materials.find(mx => mx.id === m.id)
              const ok = !checked || !qty || !mat || mat.stock >= parseFloat(qty) || 0
              return <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${G.b1}`, fontSize: 13 }}>
                <input type="checkbox" checked={checked} onChange={e => setMatChecks(v => ({ ...v, [m.id]: e.target.checked }))} style={{ width: 18, height: 18, accentColor: G.or, cursor: 'pointer', flexShrink: 0 }} />
                <span style={{ flex: 1, color: checked ? G.t1 : G.t2 }}>{m.name}</span>
                <input type="number" value={qty} onChange={e => setMatQtys(v => ({ ...v, [m.id]: e.target.value }))} style={{ width: 70, border: `1px solid ${ok ? G.b2 : G.rd}`, textAlign: 'center' }} />
                <span style={{ color: G.t2, fontSize: 11, width: 32, flexShrink: 0 }}>{m.unit}</span>
              </div>
            })}
          </FormRow>
          <SubmitBtn onClick={handleSubmit} color='#ea580c'>🔧 СПИСАТИ НА РЕМОНТ</SubmitBtn>
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
        repairLog.map(r => <div key={r.id} style={{ background: G.card, border: `1px solid ${G.b1}`, borderLeft: '3px solid #fb923c', borderRadius: 12, padding: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700 }}>{r.serial}</div>
              <div style={{ fontSize: 12, color: G.t2 }}>{r.typeName}</div>
            </div>
            <span style={{ fontSize: 11, color: G.t2 }}>{r.datetime}</span>
          </div>
          {r.note && <div style={{ fontSize: 12, color: '#fb923c', marginBottom: 5 }}>📝 {r.note}</div>}
          <div style={{ fontSize: 12, color: G.t2, marginBottom: 8 }}>Ремонтував: {r.repairWorker}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {(r.materials || []).filter(m => m.selected && m.qty > 0).map((m, i) => <span key={i} style={{ background: G.b1, border: `1px solid ${G.b2}`, borderRadius: 6, padding: '2px 8px', fontSize: 11, color: G.t2 }}>{m.matName} ×{m.qty}</span>)}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => returnAll(r)} style={{ padding: '7px 12px', background: '#052e16', color: G.gn, border: `1px solid #166534`, borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: "'Fira Code',monospace", fontWeight: 600 }}>↩ Повернути матеріали</button>
            <button onClick={() => deleteRep(r)} style={{ padding: '7px 12px', background: '#450a0a', color: G.rd, border: `1px solid #7f1d1d`, borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: "'Fira Code',monospace", fontWeight: 600 }}>✕ Видалити</button>
          </div>
        </div>)
      )}
    </>)
  }

  // ── Команда ───────────────────────────────────────────────
  const PageWorkers = () => {
    const [newName, setNewName] = useState('')
    const prodCounts = log.filter(l => l.kind === 'production').reduce((acc, l) => ({ ...acc, [l.workerName]: (acc[l.workerName] || 0) + l.count }), {})
    const repCounts = repairLog.reduce((acc, r) => ({ ...acc, [r.repairWorker]: (acc[r.repairWorker] || 0) + 1 }), {})

    const renameWorker = (w) => openInput("Нове ім'я:", w.name, w.name, async (n) => {
      closeModal()
      api('saveWorker', [{ id: w.id, name: n }]).then(() => {
        setWorkers(prev => prev.map(wx => wx.id !== w.id ? wx : { ...wx, name: n }))
        showToast('✓ Збережено')
      }).catch(() => { })
    })

    const addWorker = () => {
      if (!newName.trim()) return showToast("Введіть ім'я", 'err')
      const id = 'w' + uid()
      api('saveWorker', [{ id, name: newName.trim() }]).then(() => {
        setWorkers(prev => [...prev, { id, name: newName.trim() }])
        setNewName('')
        showToast('✓ Додано ' + newName.trim())
      }).catch(() => { })
    }

    const deleteWorker = (w) => openConfirm('Видалити працівника?',
      <b style={{ color: G.rd }}>{w.name}</b>,
      () => {
        closeModal()
        api('deleteWorker', [w.id]).then(() => {
          setWorkers(prev => prev.filter(wx => wx.id !== w.id))
          showToast('✓ Видалено ' + w.name)
        }).catch(() => { })
      })

    return wrap(<>
      {workers.map(w => {
        const wp = prepItems.filter(p => p.workerId === w.id && p.status !== 'returned')
        return <div key={w.id} style={{ background: G.card, border: `1px solid ${G.b1}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, background: G.b1, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>👷</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 17, fontWeight: 700 }}>{w.name}</div>
              {w.id !== 'TEAM_SHARED' && <div style={{ fontSize: 12, color: G.t2, marginTop: 2 }}>🔋 {prodCounts[w.name] || 0} шт · 🔧 {repCounts[w.name] || 0} рем.</div>}
            </div>
            {w.id !== 'TEAM_SHARED' && <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => renameWorker(w)} style={{ background: G.b1, border: `1px solid ${G.b2}`, color: G.cy, padding: '6px 10px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>✎</button>
              <button onClick={() => deleteWorker(w)} style={{ background: '#450a0a', border: `1px solid #7f1d1d`, color: G.rd, padding: '6px 10px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>✕</button>
            </div>}
          </div>
          {wp.length > 0 && <div style={{ background: '#1e1b4b', border: `1px solid #3730a3`, borderRadius: 8, padding: '8px 10px', marginTop: 10 }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", color: G.pu, fontWeight: 700, fontSize: 13, marginBottom: 5 }}>📦 НА РУКАХ</div>
            {wp.map(p => <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid #2e2a6e`, fontSize: 12 }}>
              <span>{p.matName}</span>
              <span style={{ color: G.pu }}>{+(p.qty - p.returnedQty).toFixed(4)} {p.unit}</span>
            </div>)}
          </div>}
        </div>
      })}
      <Card>
        <CardTitle color={G.gn}>+ ДОДАТИ ПРАЦІВНИКА</CardTitle>
        <div style={{ display: 'flex', gap: 6 }}>
          <input placeholder="Прізвище Ім'я" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addWorker()} />
          <button onClick={addWorker} style={{ padding: '8px 16px', background: G.gn, color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ ДОДАТИ</button>
        </div>
      </Card>
    </>)
  }

  // ── Інструменти ───────────────────────────────────────────
  const PageTools = () => {
    const [nt, setNt] = useState({ name: '', category: 'tool', count: 1, serial: '', notes: '' })
    const [repairModal, setRepairModal] = useState(null) // {tool}
    const [repairNote, setRepairNote] = useState('')
    const [repairDate, setRepairDate] = useState(todayStr())
    const [repairWorker, setRepairWorker] = useState(workers.find(w => w.id !== 'TEAM_SHARED')?.id || '')

    const changeTool = (id, field, delta) => {
      if (!isAdmin) return
      const t = tools.find(t => t.id === id)
      if (!t) return
      const next = { ...t, [field]: Math.max(0, t[field] + delta) }
      if (next.working > next.count) next.working = next.count
      api('saveTool', [next]).then(() => setTools(prev => prev.map(tx => tx.id !== id ? tx : next))).catch(() => { })
    }

    const deleteTool = (t) => openConfirm('Видалити інструмент?', <b style={{ color: G.rd }}>{t.name}</b>, () => {
      closeModal()
      api('deleteTool', [t.id]).then(() => { setTools(p => p.filter(tx => tx.id !== t.id)); showToast('✓ Видалено') }).catch(() => { })
    })

    const addTool = () => {
      if (!nt.name.trim()) return showToast('Введіть назву', 'err')
      const t = { id: 't' + uid(), ...nt, working: nt.count, repairNote: '', repairDate: '' }
      api('saveTool', [t]).then(() => { setTools(p => [...p, t]); setNt({ name: '', category: 'tool', count: 1, serial: '', notes: '' }); showToast('✓ Додано ' + nt.name) }).catch(() => { })
    }

    const openRepairModal = (t) => {
      setRepairModal(t)
      setRepairNote(t.repairNote || '')
      setRepairDate(todayStr())
    }

    const submitToolRepair = async () => {
      if (!repairModal) return
      if (!repairNote.trim()) return showToast('Опишіть несправність', 'err')
      const worker = workers.find(w => w.id === repairWorker)
      try {
        await api('reportToolRepair', [repairModal.id, repairNote, repairDate, worker?.name || ''])
        setTools(prev => prev.map(t => t.id !== repairModal.id ? t : { ...t, repairNote, repairDate }))
        showToast('✓ Повідомлено про ремонт — бот сповіщено')
        setRepairModal(null)
      } catch { }
    }

    return wrap(<>
      {repairModal && (
        <Modal onClose={() => setRepairModal(null)}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 19, fontWeight: 700, marginBottom: 14, color: G.rd }}>
            🔧 Ремонт: {repairModal.name}
          </div>
          <FormRow label="НЕСПРАВНІСТЬ / ОПИС">
            <textarea
              value={repairNote}
              onChange={e => setRepairNote(e.target.value)}
              placeholder="Опишіть що зламалось..."
              style={{ minHeight: 80 }}
            />
          </FormRow>
          <FormRow label="ДАТА">
            <input value={repairDate} onChange={e => setRepairDate(e.target.value)} />
          </FormRow>
          <FormRow label="ХТО ПОВІДОМЛЯЄ">
            <select value={repairWorker} onChange={e => setRepairWorker(e.target.value)}>
              {workers.filter(w => w.id !== 'TEAM_SHARED').map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </FormRow>
          <div style={{ color: G.t2, fontSize: 12, marginBottom: 10 }}>
            ✈ Telegram-бот отримає сповіщення одразу після підтвердження
          </div>
          <SubmitBtn onClick={submitToolRepair} color={G.rd}>🔧 ВІДПРАВИТИ В РЕМОНТ</SubmitBtn>
        </Modal>
      )}

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
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => openRepairModal(t)} style={{ background: '#431407', border: `1px solid #9a3412`, color: '#fb923c', padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontFamily: "'Fira Code',monospace" }}>🔧 Ремонт</button>
              {isAdmin && <button onClick={() => deleteTool(t)} style={{ background: '#450a0a', border: 'none', color: G.rd, padding: '5px 9px', borderRadius: 8, cursor: 'pointer' }}>✕</button>}
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
          <input type="number" placeholder="Кількість" value={nt.count} min="1" onChange={e => setNt(v => ({ ...v, count: parseInt(e.target.value) || 1 }))} />
          <input placeholder="С/н (необов.)" value={nt.serial} onChange={e => setNt(v => ({ ...v, serial: e.target.value }))} />
        </div>
        <input placeholder="Нотатка" value={nt.notes} onChange={e => setNt(v => ({ ...v, notes: e.target.value }))} style={{ marginBottom: 4 }} />
        <SubmitBtn onClick={addTool} color={G.gn}>+ ДОДАТИ</SubmitBtn>
      </Card>}
    </>)
  }

  // ── Журнал ────────────────────────────────────────────────
  const PageLog = () => wrap(
    log.length === 0 ? <Center>Журнал порожній</Center> :
      log.slice(0, 120).map(e => {
        const t = batteryTypes.find(t => t.id === e.typeId)
        const color = e.kind === 'prep' ? G.pu : e.kind === 'repair' ? '#fb923c' : (t?.color || G.or)
        const icon = e.kind === 'prep' ? '📦' : e.kind === 'repair' ? '🔧' : '🔋'
        return <div key={e.id} style={{ background: G.card, border: `1px solid ${G.b1}`, borderRadius: 12, padding: 12, marginBottom: 8, borderLeft: `3px solid ${color}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
            <div>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700 }}>{icon} {e.typeName}</span>
              {e.count > 0 && <span style={{ color: G.or, fontSize: 13, marginLeft: 6 }}>× {e.count}</span>}
              <div style={{ fontSize: 12, color: G.t2 }}>{e.workerName}</div>
            </div>
            <span style={{ fontSize: 11, color: G.t2, flexShrink: 0 }}>{e.datetime}</span>
          </div>
          {e.serials?.length > 0 && <div style={{ fontSize: 12, color: G.cy, marginBottom: 5, wordBreak: 'break-all' }}>{e.serials.join(', ')}</div>}
          {e.repairNote && <div style={{ fontSize: 12, color: '#fb923c', marginBottom: 5 }}>📝 {e.repairNote}</div>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {(e.consumed || []).map((c, i) => <span key={i} style={{ background: G.b1, border: `1px solid ${G.b2}`, borderRadius: 6, padding: '2px 8px', fontSize: 11, color: G.t2 }}>{c.name} ×{c.amount}</span>)}
          </div>
        </div>
      })
  )

  // ── Закупівля ─────────────────────────────────────────────
  const PageShopping = () => {
    let lowMats = []
    batteryTypes.forEach(t => {
      t.materials.forEach(m => {
        const days = m.perBattery > 0 ? m.stock / (m.perBattery * perDay) : Infinity
        if (days < 30 || m.stock <= m.minStock) {
          if (!lowMats.find(x => x.mat.name === m.name)) {
            lowMats.push({ type: t, mat: m, days: Math.floor(days) })
          }
        }
      })
    })

    const setOrdered = async (matsToOrder, status) => {
      const names = [...new Set(matsToOrder.map(x => x.mat.name))]
      const tasks = []
      const updates = []
      batteryTypes.forEach(bt => {
        bt.materials.forEach(mx => {
          if (names.includes(mx.name)) {
            tasks.push(api('updateMaterialField', [bt.id, mx.id, 'isOrdered', status]))
            updates.push({ typeId: bt.id, matId: mx.id, isOrdered: status })
          }
        })
      })
      await Promise.all(tasks)
      setBatteryTypes(prev => prev.map(t => {
        const ups = updates.filter(u => u.typeId === t.id)
        if (!ups.length) return t
        return { ...t, materials: t.materials.map(m => { const up = ups.find(u => u.matId === m.id); return up ? { ...m, isOrdered: status } : m }) }
      }))
    }

    const sendToTg = async () => {
      const pendingMats = lowMats.filter(x => !x.mat.isOrdered)
      if (pendingMats.length === 0) return showToast('Немає нових матеріалів для замовлення!', 'err')
      const lines = pendingMats.map(({ mat, days }) => {
        const shopLink = mat.shopUrl ? `\n  🔗 <a href="${mat.shopUrl}">${mat.shopUrl}</a>` : ''
        return `• ${mat.name}: <b>${mat.stock} ${mat.unit}</b> (~${days}д, мін: ${mat.minStock})${shopLink}`
      }).join('\n')
      await sendTelegram(`🛒 <b>ZmiyCell — Закупівля</b>\n\n${lines}`)
      showToast('✓ Відправлено в Telegram')
      await setOrdered(pendingMats, true)
    }

    return wrap(<>
      <Card>
        <CardTitle color={G.pu}>🛒 СПИСОК ЗАКУПІВЛІ</CardTitle>
        <div style={{ color: G.t2, fontSize: 13, marginBottom: 16 }}>Матеріали, яких залишилось менш ніж на 30 днів роботи.</div>
        {lowMats.length === 0 ? <Center>Всі матеріали в нормі</Center> :
          lowMats.map((item, i) => {
            const { mat, days } = item
            const ordered = !!mat.isOrdered
            return <div key={i} style={{ background: ordered ? G.card : G.card2, border: `1px solid ${G.b1}`, borderRadius: 10, padding: 12, marginBottom: 8, borderLeft: `3px solid ${ordered ? G.t2 : '#a78bfa'}`, opacity: ordered ? 0.6 : 1, transition: '0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{mat.name}</div>
                  <div style={{ fontSize: 12, color: G.t2, marginTop: 2 }}>{ordered ? '✅ В очікуванні доставки' : '⏳ Потребує замовлення'}</div>
                  {mat.shopUrl && <a href={mat.shopUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: G.cy, textDecoration: 'none', display: 'inline-block', marginTop: 4 }}>🔗 Перейти в магазин</a>}
                  {!ordered && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ color: G.or, fontWeight: 600 }}>{mat.stock} {mat.unit}</span>
                    <Chip bg='#450a0a' color={G.rd} bd='#7f1d1d'>~{days}д (мін {mat.minStock})</Chip>
                  </div>}
                </div>
                <button onClick={() => setOrdered([item], !ordered)} style={{ background: ordered ? G.card2 : G.b1, border: `1px solid ${G.b2}`, color: ordered ? G.t2 : G.pu, padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
                  {ordered ? 'Скасувати' : 'Позначити'}
                </button>
              </div>
            </div>
          })
        }
        {lowMats.filter(x => !x.mat.isOrdered).length > 0 && <SubmitBtn color={G.pu} onClick={sendToTg}>✈ ВІДПРАВИТИ В TELEGRAM</SubmitBtn>}
      </Card>
    </>)
  }

  // ── Мануал ────────────────────────────────────────────────
  const PageManual = () => {
    const [manualTypeId, setManualTypeId] = useState(batteryTypes[0]?.id || '')
    const type = batteryTypes.find(t => t.id === manualTypeId)
    const [editing, setEditing] = useState(false)
    const [draftSteps, setDraftSteps] = useState('')

    const currentManual = type?.manual || ''

    const startEdit = () => {
      setDraftSteps(currentManual)
      setEditing(true)
    }

    const saveManual = async () => {
      if (!type) return
      await api('updateBatteryTypeField', [type.id, 'manual', draftSteps])
      setBatteryTypes(prev => prev.map(t => t.id !== type.id ? t : { ...t, manual: draftSteps }))
      setEditing(false)
      showToast('✓ Технологічну карту збережено')
    }

    const formatManual = (text) => {
      if (!text) return null
      return text.split('\n').map((line, i) => {
        const isStep = /^\d+[\.\)]/.test(line.trim())
        const isNote = /^(⚠|!|УВАГА|Примітка)/i.test(line.trim())
        const isHeader = /^#{1,3}\s/.test(line.trim())
        if (isHeader) {
          return <div key={i} style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 700, color: G.or, marginTop: 16, marginBottom: 8 }}>{line.replace(/^#+\s/, '')}</div>
        }
        if (isStep) {
          return <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: `1px solid ${G.b1}` }}>
            <span style={{ color: G.or, fontWeight: 700, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, flexShrink: 0 }}>{line.match(/^\d+/)?.[0]}.</span>
            <span style={{ fontSize: 14, color: G.t1 }}>{line.replace(/^\d+[\.\)]\s*/, '')}</span>
          </div>
        }
        if (isNote) {
          return <div key={i} style={{ background: '#431407', border: `1px solid #9a3412`, borderRadius: 8, padding: '8px 12px', margin: '8px 0', fontSize: 13, color: '#fed7aa' }}>{line}</div>
        }
        if (!line.trim()) return <div key={i} style={{ height: 8 }} />
        return <div key={i} style={{ fontSize: 13, color: G.t2, padding: '3px 0' }}>{line}</div>
      })
    }

    return wrap(<>
      <TypeTabs types={batteryTypes} active={manualTypeId} onSelect={setManualTypeId} />
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <CardTitle style={{ margin: 0 }}>📖 {type?.name || '—'}</CardTitle>
          {!editing
            ? <button onClick={startEdit} style={{ padding: '7px 14px', background: G.b1, border: `1px solid ${G.b2}`, color: G.cy, borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: "'Fira Code',monospace" }}>✎ Редагувати</button>
            : <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setEditing(false)} style={{ padding: '7px 12px', background: G.b1, border: `1px solid ${G.b2}`, color: G.t2, borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Скасувати</button>
              <button onClick={saveManual} style={{ padding: '7px 14px', background: G.gn, color: '#000', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>✓ Зберегти</button>
            </div>}
        </div>

        {editing ? (
          <>
            <div style={{ color: G.t2, fontSize: 12, marginBottom: 8 }}>
              Підтримує: нумеровані кроки (1. 2. 3.), заголовки (# Заголовок), нотатки (⚠ текст)
            </div>
            <textarea
              value={draftSteps}
              onChange={e => setDraftSteps(e.target.value)}
              placeholder={'# Підготовка\n1. Перевірити осередки на напругу\n2. Відсортувати за ємністю\n\n# Збірка\n3. Скласти пакет\n⚠ УВАГА: дотримуйтесь полярності!'}
              style={{ minHeight: 300, fontFamily: "'Fira Code',monospace", fontSize: 13 }}
            />
          </>
        ) : (
          currentManual
            ? <div>{formatManual(currentManual)}</div>
            : <Center>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📖</div>
                <div style={{ color: G.t2, marginBottom: 16 }}>Технологічна карта ще не заповнена</div>
                <button onClick={startEdit} style={{ padding: '10px 20px', background: G.or, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Barlow Condensed',sans-serif" }}>+ ДОДАТИ МАНУАЛ</button>
              </div>
            </Center>
        )}
      </Card>
    </>)
  }

  // ── Модаль Історії ────────────────────────────────────────
  const HistoryModal = ({ mat, entries }) => <>
    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 14 }}>📊 {mat.name}</div>
    {mat.shopUrl && <a href={mat.shopUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginBottom: 12, fontSize: 13, color: G.cy }}>🔗 Перейти в магазин</a>}
    {entries.length === 0
      ? <Center>Операцій не знайдено</Center>
      : entries.map((e, i) => <div key={i} style={{ padding: '8px 0', borderBottom: `1px solid ${G.b1}`, fontSize: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: e.kind === 'prep' ? G.pu : e.kind === 'repair' ? '#fb923c' : G.cy, fontWeight: 600 }}>
            {e.kind === 'prep' ? '📦' : e.kind === 'repair' ? '🔧' : '🔋'} {e.workerName}
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
  const PAGES = {
    prod: <PageProd />, stock: <PageStock />, repair: <PageRepair />,
    shopping: <PageShopping />, workers: <PageWorkers />, tools: <PageTools />,
    log: <PageLog />, manual: <PageManual />
  }

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => { const idx = pageKeys.indexOf(page); if (idx < pageKeys.length - 1) setPage(pageKeys[idx + 1]) },
    onSwipedRight: () => { const idx = pageKeys.indexOf(page); if (idx > 0) setPage(pageKeys[idx - 1]) },
    preventDefaultTouchmoveEvent: false,
    trackMouse: false
  })

  return <>
    <style>{GLOBAL_CSS}</style>

    {/* Header */}
    <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(13, 17, 23, 0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: `1px solid ${G.b1}`, padding: '10px 14px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 700, margin: '0 auto', paddingBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Logo size={30} />
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: 2 }}>ZmiyCell</span>
          {isAdmin && <Chip bg='#1c1107' color={G.or} bd={G.b2} style={{ fontSize: 10 }}>АДМІН</Chip>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: G.b2 }}>{todayStr().slice(0, 5)}</span>
          <SyncBadge state={sync} />
          <button onClick={onLogout} title="Вийти" style={{ background: 'transparent', border: 'none', color: G.t2, fontSize: 16, cursor: 'pointer', padding: '2px 6px' }}>⎋</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 700, margin: '0 auto', paddingBottom: 8 }}>
        {[
          ['🔋', log.filter(l => l.kind === 'production').length, G.t1, G.b1, G.b2],
          ['🔧', repairLog.length, G.t1, G.b1, G.b2],
          ['📦', activePrep.length, activePrep.length > 0 ? G.pu : G.t2, activePrep.length > 0 ? '#1e1b4b' : G.b1, activePrep.length > 0 ? '#3730a3' : G.b2],
        ].map(([icon, val, vc, bg, bd], i) =>
          <span key={i} style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 20, padding: '3px 10px', fontSize: 11, color: G.t2 }}>
            {icon} <b style={{ color: vc }}>{val}</b>
          </span>)}
      </div>
      {/* Tab navigation */}
      <div className="tab-nav" style={{ display: 'flex', overflowX: 'auto', maxWidth: 700, margin: '0 auto', borderTop: `1px solid rgba(255,255,255,0.05)` }}>
        {NAV.map(([k, icon, label]) =>
          <button key={k} onClick={() => setPage(k)} style={{
            flex: '0 0 auto', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', borderBottom: `2px solid ${page === k ? G.or : 'transparent'}`,
            cursor: 'pointer', color: page === k ? G.or : G.t2, transition: '.15s', whiteSpace: 'nowrap',
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: .5
          }}>
            <span style={{ fontSize: 16 }}>{icon}</span> {label}
          </button>)}
      </div>
    </div>

    {/* Content */}
    <div
      className="page-scroll"
      {...swipeHandlers}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ transform: `translateY(${pullDist}px)` }}
    >
      {pullDist > 10 && (
        <div style={{ position: 'absolute', top: -40, left: 0, right: 0, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: pullDist > 65 ? G.or : G.t2, fontSize: 12, fontWeight: 700, fontFamily: "'Barlow Condensed',sans-serif" }}>
          {pullDist > 65 ? '✓ ВІДПУСТІТЬ ДЛЯ ОНОВЛЕННЯ' : '↓ ТЯГНІТЬ ДЛЯ ОНОВЛЕННЯ'}
        </div>
      )}
      {PAGES[page]}
    </div>

    {/* Toast */}
    {toast && <Toast {...toast} />}

    {/* Modals */}
    {modal?.type === 'confirm' && <ConfirmModal title={modal.title} body={modal.body} onYes={modal.onYes} onNo={closeModal} />}
    {modal?.type === 'input' && <InputModal title={modal.title} placeholder={modal.placeholder} defaultValue={modal.defaultVal} onConfirm={modal.onConfirm} onCancel={closeModal} />}
    {modal?.type === 'history' && <Modal onClose={closeModal}><HistoryModal mat={modal.mat} entries={modal.entries} /></Modal>}
  </>
}
