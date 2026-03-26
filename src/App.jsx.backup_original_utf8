
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSwipeable } from 'react-swipeable'
import { gasCall } from './api.js'

// тФАтФАтФА ╨Ъ╨╛╨╗╤М╨╛╤А╨╕ тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
const G = {
  bg: '#0a0f1a', card: '#111827', card2: '#0f172a',
  b1: '#1f2937', b2: '#374151', t1: '#e5e7eb', t2: '#6b7280',
  or: '#f97316', cy: '#06b6d4', gn: '#22c55e', pu: '#a78bfa',
  rd: '#f87171', yw: '#fbbf24',
}

function getWorkerColor(name) {
  if (!name) return G.t2
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return `hsl(${Math.abs(hash) % 360}, 75%, 65%)`
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

// тХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХР
//  UI ╨Р╨в╨Ю╨Ь╨Ш
// тХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХР
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
const Chip = ({ bg, color, bd, children, style = {} }) =>
  <span style={{ background: bg, color, border: `1px solid ${bd}`, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: .5, flexShrink: 0, ...style }}>{children}</span>
const Center = ({ children }) =>
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: G.t2, fontSize: 14 }}>{children}</div>

// StatusBadge ╨┤╨╗╤П ╨│╨╗╨╛╨▒╨░╨╗╤М╨╜╨╛╨│╨╛ ╨╝╨░╤В╨╡╤А╤Ц╨░╨╗╤Г (╨▒╨╡╨╖ preBattery тАФ ╤Ф ╨╝╤Ц╨╜.╨╖╨░╨┐╨░╤Б)
const StockBadge = ({ m }) => {
  if (m.stock <= 0) return <Chip bg='#2e1065' color='#c084fc' bd='#4c1d95'>╨Э╨Х╨Ь╨Р</Chip>
  if (m.stock <= m.minStock) return <Chip bg='#450a0a' color={G.rd} bd='#7f1d1d'>╨Ъ╨а╨Ш╨в.</Chip>
  return <Chip bg='#052e16' color={G.gn} bd='#166534'>╨Э╨Ю╨а╨Ь╨Р</Chip>
}

function SyncBadge({ state }) {
  const cfg = {
    loading: ['тЯ│ ╨╖╨░╨▓╨░╨╜╤В╨░╨╢╨╡╨╜╨╜╤П...', '#1e1b4b', '#a5b4fc', '#3730a3', true],
    saving: ['тЯ│ ╨╖╨▒╨╡╤А╨╡╨╢╨╡╨╜╨╜╤П...', '#1e1b4b', '#a5b4fc', '#3730a3', true],
    ok: ['тЬУ ╤Б╨╕╨╜╤Е╤А.', '#052e16', G.gn, '#166534', false],
    error: ['тЬХ ╨┐╨╛╨╝╨╕╨╗╨║╨░', '#450a0a', G.rd, '#7f1d1d', false],
  }[state] || ['...', G.b1, G.t2, G.b2, false]
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 9px', borderRadius: 10, background: cfg[1], color: cfg[2], border: `1px solid ${cfg[3]}`, animation: cfg[4] ? 'pulse 1s infinite' : '', fontFamily: "'Fira Code',monospace" }}>{cfg[0]}</span>
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
        <button onClick={onNo} style={{ flex: 1, padding: 14, background: G.b1, color: G.t2, border: `1px solid ${G.b2}`, borderRadius: 12, fontFamily: "'Fira Code',monospace", fontSize: 14, cursor: 'pointer' }}>тЬХ ╨б╨║╨░╤Б╤Г╨▓╨░╤В╨╕</button>
        <button onClick={onYes} style={{ flex: 1, padding: 14, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 12, fontFamily: "'Fira Code',monospace", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>тЬУ ╨Я╤Ц╨┤╤В╨▓╨╡╤А╨┤╨╕╤В╨╕</button>
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
        <button onClick={onCancel} style={{ flex: 1, padding: 14, background: G.b1, color: G.t2, border: `1px solid ${G.b2}`, borderRadius: 12, fontFamily: "'Fira Code',monospace", fontSize: 14, cursor: 'pointer' }}>тЬХ ╨б╨║╨░╤Б╤Г╨▓╨░╤В╨╕</button>
        <button onClick={() => val.trim() && onConfirm(val.trim())} style={{ flex: 1, padding: 14, background: G.or, color: '#fff', border: 'none', borderRadius: 12, fontFamily: "'Fira Code',monospace", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>тЬУ OK</button>
      </div>
    </Modal>
  )
}

function Logo({ size = 32 }) {
  return <img src="/logo.jpg" alt="ZmiyCell" style={{ width: size, height: size, objectFit: 'cover', borderRadius: '50%' }} />
}

// тХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХР
//  ╨Х╨Ъ╨а╨Р╨Э ╨Р╨Т╨в╨Ю╨а╨Ш╨Ч╨Р╨ж╨Ж╨З
// тХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХР
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
      else { setErr('╨Э╨╡╨▓╤Ц╤А╨╜╨╕╨╣ PIN'); setTimeout(() => { setPin(''); setErr('') }, 800) }
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
          <button onClick={() => onAuth('user')} style={{ padding: '18px 0', background: G.b1, border: `1px solid ${G.b2}`, color: G.t1, borderRadius: 14, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 700, cursor: 'pointer', letterSpacing: 1 }}>ЁЯС╖ ╨г╨Т╨Ж╨Щ╨в╨Ш ╨п╨Ъ ╨о╨Ч╨Х╨а</button>
          <button onClick={() => setMode('admin')} style={{ padding: '18px 0', background: '#1c1107', border: `1px solid ${G.or}`, color: G.or, borderRadius: 14, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 700, cursor: 'pointer', letterSpacing: 1 }}>ЁЯФР ╨Р╨Ф╨Ь╨Ж╨Э</button>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 280, textAlign: 'center' }}>
          <input ref={pinInputRef} type="tel" inputMode="numeric" value="" onChange={() => { }} onKeyDown={handleKeyboard}
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }} autoComplete="off" />
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, color: G.t2, marginBottom: 8, letterSpacing: 1 }}>╨Т╨Т╨Х╨Ф╨Ж╨в╨м PIN</div>
          <div style={{ fontSize: 11, color: G.b2, marginBottom: 16 }}>╨░╨▒╨╛ ╨╜╨░╨▒╨╡╤А╤Ц╤В╤М ╨╖ ╨║╨╗╨░╨▓╤Ц╨░╤В╤Г╤А╨╕</div>
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
            <button onClick={() => { setMode(null); setPin('') }} style={{ padding: '18px 0', background: '#450a0a', border: 'none', color: G.rd, borderRadius: 12, fontSize: 13, fontFamily: "'Fira Code',monospace", cursor: 'pointer' }}>тЖР ╨Э╨░╨╖╨░╨┤</button>
            <button onClick={() => { enterPin('0'); pinInputRef.current?.focus() }}
              style={{ padding: '18px 0', background: G.b1, border: `1px solid ${G.b2}`, color: G.t1, borderRadius: 12, fontSize: 22, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, cursor: 'pointer' }}
              onTouchStart={e => e.currentTarget.style.background = G.b2} onTouchEnd={e => e.currentTarget.style.background = G.b1}>0</button>
            <button onClick={() => { setPin(p => p.slice(0, -1)); pinInputRef.current?.focus() }} style={{ padding: '18px 0', background: G.card, border: `1px solid ${G.b2}`, color: G.t2, borderRadius: 12, fontSize: 18, cursor: 'pointer' }}>тМл</button>
          </div>
        </div>
      )}
    </div>
  )
}
// тХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХР
//  PrepTab тАФ ╨▓╨╕╨║╨╛╤А╨╕╤Б╤В╨╛╨▓╤Г╤Ф ╨│╨╗╨╛╨▒╨░╨╗╤М╨╜╤Ц ╨╝╨░╤В╨╡╤А╤Ц╨░╨╗╨╕
// тХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХР
function PrepTab({ batteryTypes, workers, assemblies, materials, prepItems, onIssueAssembly, onIssueConsumable, onReturn, onWriteoffPrep, onChangeScope, isAdmin }) {
  const [wId, setWId] = useState(workers[0]?.id || '')
  const [typeId, setTypeId] = useState(batteryTypes[0]?.id || '')
  const [asmId, setAsmId] = useState(assemblies[0]?.id || '')
  const [consId, setConsId] = useState(materials[0]?.id || '')
  const [qty, setQty] = useState(1)
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
  const asm = assemblies.find(a => a.id === asmId)

  const renderTotals = () => {
    const grouped = {}
    active.forEach(p => {
      const key = `${p.workerId}_${p.scope}_${p.matId}`
      if (!grouped[key]) grouped[key] = { workerName: p.workerName, matName: p.matName, unit: p.unit, amount: 0, scope: p.scope }
      grouped[key].amount += (p.qty - p.returnedQty)
    })
    const list = Object.values(grouped).filter(g => g.amount > 0).sort((a, b) => a.workerName.localeCompare(b.workerName))
    return <Card>
      <CardTitle color={G.pu}>ЁЯУК ╨Ч╨Р╨У╨Р╨Ы╨Ю╨Ь ╨Э╨Р ╨а╨г╨Ъ╨Р╨е</CardTitle>
      {list.length === 0 ? <div style={{ color: G.t2, fontSize: 13 }}>╨Я╤Г╤Б╤В╨╛</div> :
        list.map((g, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${G.card2}`, fontSize: 13 }}>
          <div><span style={{ fontWeight: 600, color: getWorkerColor(g.workerName) }}>{g.workerName}</span> <span style={{ color: G.t2, fontSize: 11 }}>({g.scope === 'all' ? '╨▓╤Б╤Ц' : '╨╛╤Б╨▒'})</span><br /><span style={{ color: G.t1 }}>{g.matName}</span></div>
          <div style={{ fontWeight: 700, color: G.pu }}>{+g.amount.toFixed(4)} {g.unit}</div>
        </div>)
      }
    </Card>
  }

  return <>
    <SubTabs tabs={[['active', '╨Р╨Ь. ╨Т╨Ш╨Ф╨Р╨з╨Ж'], ['totals', '╨Ч╨Р╨У╨Р╨Ы╨Ю╨Ь'], ['asm', '+ ╨Ч╨С╨Ж╨а╨Ъ╨Ш'], ['cons', '+ ╨а╨Ю╨Ч╨е╨Ж╨Ф']]} active={subTab} onChange={setSubTab} />

    {subTab === 'totals' && renderTotals()}

    {subTab === 'asm' && <Card>
      <CardTitle color={G.pu}>ЁЯУж ╨Т╨Ш╨Ф╨Р╨в╨Ш ╨Ч╨С╨Ж╨а╨Ъ╨г</CardTitle>
      <FormRow label="╨Я╨а╨Р╨ж╨Ж╨Т╨Э╨Ш╨Ъ">
        <select value={wId} onChange={e => setWId(e.target.value)}>
          {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </FormRow>
      <FormRow label="╨в╨Ш╨Я ╨Р╨Ъ╨г╨Ь╨г╨Ы╨п╨в╨Ю╨а╨Р">
        <select value={typeId} onChange={e => setTypeId(e.target.value)} disabled={allTypes}>
          {batteryTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </FormRow>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <input id="prep-all-types" type="checkbox" checked={allTypes} onChange={e => setAllTypes(e.target.checked)} />
        <label htmlFor="prep-all-types" style={{ fontSize: 12, color: G.t2 }}>╨Ф╨╗╤П ╨▓╤Б╤Ц╤Е ╤В╨╕╨┐╤Ц╨▓</label>
      </div>
      <FormRow label="╨Ч╨Р╨У╨Ю╨в╨Ю╨Т╨Ъ╨Р (╨Ч╨С╨Ж╨а╨Ъ╨Р)">
        <select value={asmId} onChange={e => setAsmId(e.target.value)}>
          <option value="">тАФ ╨╛╨▒╨╡╤А╤Ц╤В╤М ╨╖╨▒╤Ц╤А╨║╤Г тАФ</option>
          {assemblies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </FormRow>
      <FormRow label="╨Ъ╨Ж╨Ы╨м╨Ъ╨Ж╨б╨в╨м">
        <input type="number" value={qty} onChange={e => setQty(parseFloat(e.target.value) || 1)} min="0.01" step="0.01" />
      </FormRow>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <input id="prep-for-all" type="checkbox" checked={forAll} onChange={e => setForAll(e.target.checked)} />
        <label htmlFor="prep-for-all" style={{ fontSize: 12, color: G.t2 }}>╨Ф╨╗╤П ╨▓╤Б╤Ц╤Е ╨┐╤А╨░╤Ж╤Ц╨▓╨╜╨╕╨║╤Ц╨▓</label>
      </div>
      {asm && asm.components.length > 0 && (
        <div style={{ background: G.b1, borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: G.t2, marginBottom: 6, fontWeight: 700 }}>╨Ъ╨Ю╨Ь╨Я╨Ю╨Э╨Х╨Э╨в╨Ш (╨╜╨░ {qty} ╤И╤В)</div>
          {asm.components.map(ac => {
            const gm = materials.find(m => m.id === ac.matId)
            const need = +(ac.qty * qty).toFixed(4)
            const ok = gm && gm.stock >= need
            return <div key={ac.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0', color: ok ? G.t1 : G.rd }}>
              <span>{gm?.name || ac.matId}</span>
              <span>{need} {gm?.unit || ''} <span style={{ color: ok ? G.t2 : G.rd }}>(╤Ф: {gm?.stock ?? '?'})</span></span>
            </div>
          })}
        </div>
      )}
      <SubmitBtn color={G.pu} onClick={() => { if (asm) onIssueAssembly(wId, asmId, qty, allTypes ? 'ALL' : typeId, forAll) }}>ЁЯУж ╨Т╨Ш╨Ф╨Р╨в╨Ш</SubmitBtn>
    </Card>}

    {subTab === 'cons' && <Card>
      <CardTitle color={G.pu}>ЁЯУж ╨Т╨Ш╨Ф╨Р╨в╨Ш ╨а╨Ю╨Ч╨е╨Ж╨Ф╨Э╨Ш╨Щ ╨Ь╨Р╨в╨Х╨а╨Ж╨Р╨Ы</CardTitle>
      <FormRow label="╨Я╨а╨Р╨ж╨Ж╨Т╨Э╨Ш╨Ъ">
        <select value={wId} onChange={e => setWId(e.target.value)}>
          {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </FormRow>
      <FormRow label="╨Ь╨Р╨в╨Х╨а╨Ж╨Р╨Ы">
        <select value={consId} onChange={e => setConsId(e.target.value)}>
          {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.stock} {m.unit})</option>)}
        </select>
      </FormRow>
      <FormRow label="╨Ъ╨Ж╨Ы╨м╨Ъ╨Ж╨б╨в╨м">
        <input type="number" value={qty} onChange={e => setQty(parseFloat(e.target.value) || 1)} min="0.01" step="0.01" />
      </FormRow>
      <SubmitBtn color={G.pu} onClick={() => onIssueConsumable(wId, consId, qty)}>ЁЯУж ╨Т╨Ш╨Ф╨Р╨в╨Ш</SubmitBtn>
    </Card>}

    {subTab === 'active' && <Card>
      <CardTitle color={G.pu}>ЁЯУЛ ╨Р╨Ъ╨в╨Ш╨Т╨Э╨Ж ╨Т╨Ш╨Ф╨Р╨з╨Ж ({active.length})</CardTitle>
      {active.length === 0
        ? <div style={{ color: G.t2, fontSize: 13, padding: '6px 0' }}>╨Э╨╡╨╝╨░╤Ф ╨░╨║╤В╨╕╨▓╨╜╨╕╤Е ╨▓╨╕╨┤╨░╤З</div>
        : active.map(p => {
          const avail = +(p.qty - p.returnedQty).toFixed(4)
          const t = p.typeId === 'ALL' ? { name: '╨┤╨╗╤П ╨▓╤Б╤Ц╤Е ╤В╨╕╨┐╤Ц╨▓' } : batteryTypes.find(x => x.id === p.typeId)
          return <div key={p.id} style={{ background: G.card2, borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{p.matName}</div>
            <div style={{ fontSize: 12, color: getWorkerColor(p.workerName), marginTop: 2, fontWeight: 700 }}>{p.workerName} <span style={{ color: G.t2, fontWeight: 400 }}>┬╖ {p.date}</span></div>
            {t && <div style={{ fontSize: 11, color: G.t2, marginTop: 2 }}>╨в╨╕╨┐: {t.name}</div>}
            <div style={{ fontSize: 12, color: G.t2, marginTop: 2 }}>╨Ф╨╛╤Б╤В╤Г╨┐: {p.scope === 'all' ? '╨┤╨╗╤П ╨▓╤Б╤Ц╤Е' : '╨╛╤Б╨╛╨▒╨╕╤Б╤В╨╛'}</div>
            <div style={{ fontSize: 13, color: G.pu, margin: '4px 0 8px' }}>╨Э╨░ ╤А╤Г╨║╨░╤Е: <b>{avail}</b> {p.unit}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <input type="number" placeholder="╨║╤Ц╨╗╤М╨║╤Ц╤Б╤В╤М" value={retVals[p.id] || ''} onChange={e => setRetVals(v => ({ ...v, [p.id]: e.target.value }))} style={{ width: 100 }} min="0.01" step="0.01" max={avail} />
              <button onClick={() => onReturn(p.id, false, retVals[p.id])} style={{ padding: '7px 10px', background: '#1e1b4b', color: G.pu, border: `1px solid #3730a3`, borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: "'Fira Code',monospace", fontWeight: 600 }}>тЖй ╨з╨░╤Б╤В╨║╨╛╨▓╨╛</button>
              <button onClick={() => onReturn(p.id, true)} style={{ padding: '7px 10px', background: '#052e16', color: G.gn, border: `1px solid #166534`, borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: "'Fira Code',monospace", fontWeight: 600 }}>тЖйтЖй ╨Т╤Б╨╡</button>
              {isAdmin && <button onClick={() => onWriteoffPrep(p.id)} style={{ padding: '7px 10px', background: '#450a0a', color: G.rd, border: `1px solid #7f1d1d`, borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: "'Fira Code',monospace", fontWeight: 600 }}>тЬХ ╨б╨┐╨╕╤Б╨░╤В╨╕</button>}
              {isAdmin && <button onClick={() => onChangeScope(p.id, p.scope === 'all' ? 'self' : 'all')} style={{ padding: '7px 10px', background: G.b1, color: G.t2, border: `1px solid ${G.b2}`, borderRadius: 8, fontSize: 11, cursor: 'pointer', fontFamily: "'Fira Code',monospace", fontWeight: 600 }}>тЗЖ {p.scope === 'all' ? '╨▓ ╨╛╤Б╨╛╨▒╨╕╤Б╤В╤Ц' : '╨┤╨╗╤П ╨▓╤Б╤Ц╤Е'}</button>}
            </div>
          </div>
        })}
    </Card>}
  </>
}

// тХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХР
//  ╨У╨Ю╨Ы╨Ю╨Т╨Э╨Ш╨Щ ╨Ъ╨Ю╨Ь╨Я╨Ю╨Э╨Х╨Э╨в
// тХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХР
export default function App() {
  const [authRole, setAuthRole] = useState(() => { try { return localStorage.getItem(AUTH_KEY) || null } catch { return null } })
  const handleAuth = (role) => { try { localStorage.setItem(AUTH_KEY, role) } catch { } setAuthRole(role) }
  const handleLogout = () => { try { localStorage.removeItem(AUTH_KEY) } catch { } setAuthRole(null) }
  if (!authRole) return <><style>{GLOBAL_CSS}</style><AuthScreen onAuth={handleAuth} /></>
  const isAdmin = authRole === 'admin'
  return <AppInner isAdmin={isAdmin} onLogout={handleLogout} />
}

function AppInner({ isAdmin, onLogout }) {
  // тФАтФА ╨б╤В╨░╨╜ ╤Б╨╡╤А╨▓╨╡╤А╨░ тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
  const [sync, setSync] = useState('loading')
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(null)
  const [pullDist, setPullDist] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const startY = useRef(0)

  // тФАтФА ╨Э╨░╨▓╤Ц╨│╨░╤Ж╤Ц╤П тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
  const ALL_NAV = [
    ['prod', 'тЪЩ', '╨Т╨Ш╨а.'],
    ['repair', 'ЁЯФз', '╨а╨Х╨Ь╨Ю╨Э╨в'],
    ['log', 'ЁЯУЛ', '╨Ц╨г╨а╨Э╨Р╨Ы'],
    ['stock', 'ЁЯУж', '╨б╨Ъ╨Ы╨Р╨Ф'],
    ['shopping', 'ЁЯЫТ', '╨Ч╨Р╨Ъ╨г╨Я╨Ж╨Т╨Ы╨п'],
    ['workers', 'ЁЯС╖', '╨Ъ╨Ю╨Ь╨Р╨Э╨Ф╨Р'],
    ['tools', 'ЁЯЫа', '╨Ж╨Э╨б╨в╨а.'],
    ['actlog', 'ЁЯУЬ', '╨Ы╨Ю╨У'],
    ['backup', 'ЁЯТ╛', '╨С╨Х╨Ъ╨Р╨Я'],
    ['manual', 'ЁЯУЦ', '╨Ь╨Р╨Э╨г╨Р╨Ы'],
  ]
  const USER_NAV = [
    ['prod', 'тЪЩ', '╨Т╨Ш╨а.'],
    ['repair', 'ЁЯФз', '╨а╨Х╨Ь╨Ю╨Э╨в'],
    ['log', 'ЁЯУЛ', '╨Ц╨г╨а╨Э╨Р╨Ы'],
    ['stock', 'ЁЯУж', '╨б╨Ъ╨Ы╨Р╨Ф'],
    ['tools', 'ЁЯЫа', '╨Ж╨Э╨б╨в╨а.'],
    ['manual', 'ЁЯУЦ', '╨Ь╨Р╨Э╨г╨Р╨Ы'],
  ]
  const NAV = isAdmin ? ALL_NAV : USER_NAV

  const [page, setPage] = useState('prod')
  const [prodTab, setProdTab] = useState('writeoff')
  // PageAssembly ╤Б╤В╨░╨╜
  const [asmId, setAsmId] = useState('')
  const [asmQty, setAsmQty] = useState(1)
  const [asmWorker, setAsmWorker] = useState('')
  const [asmDate, setAsmDate] = useState(todayStr())
  const [asmDestination, setAsmDestination] = useState('stock') // 'stock' | 'personal' | 'team'
  // ╨а╨╡╨┤╨░╨║╤В╨╛╤А ╨╖╨▒╤Ц╤А╨╛╨║ (╨░╨┤╨╝╤Ц╨╜)
  const [asmTab, setAsmTab] = useState('produce') // 'produce' | 'manage'
  const [editAsmId, setEditAsmId] = useState(null) // ╤П╨║╤Г ╨╖╨▒╤Ц╤А╨║╤Г ╤А╨╡╨┤╨░╨│╤Г╤Ф╨╝╨╛
  const [editAsmComps, setEditAsmComps] = useState({})
  const [newAsmName, setNewAsmName] = useState('')
  const [newAsmOutMatId, setNewAsmOutMatId] = useState('')
  const [newAsmOutQty, setNewAsmOutQty] = useState('1')
  const [newAsmNotes, setNewAsmNotes] = useState('')
  const [newAsmComps, setNewAsmComps] = useState({})
  const [newAcMatId, setNewAcMatId] = useState('')
  const [newAcQty, setNewAcQty] = useState('')
  const [repTab, setRepTab] = useState('new')
  const [stockTab, setStockTab] = useState('materials') // 'materials' | 'types'

  // тФАтФА ╨Ф╨░╨╜╤Ц тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
  // materials: ╨│╨╗╨╛╨▒╨░╨╗╤М╨╜╨╕╨╣ ╤Б╨║╨╗╨░╨┤ (id, name, unit, stock, minStock[╨┤╨╗╤П TG], shopUrl, isOrdered)
  // typeMaterials: [{id, typeId, matId, perBattery, minStock}] тАФ ╨║╨╛╨╜╤Д╤Ц╨│╤Г╤А╨░╤Ж╤Ц╤П ╤В╨╕╨┐╤Ц╨▓
  const [materials, setMaterials] = useState([])
  const [typeMaterials, setTypeMaterials] = useState([])  // [{id,typeId,matId,perBattery,minStock}]
  const [assemblies, setAssemblies] = useState([])  // [{id,name,outputMatId,outputQty,unit,notes,components:[]}]
  const [batteryTypes, setBatteryTypes] = useState([])
  const [workers, setWorkers] = useState([])
  const [tools, setTools] = useState([])
  const [log, setLog] = useState([])
  const [repairLog, setRepairLog] = useState([])
  const [prepItems, setPrepItems] = useState([])
  const [payments, setPayments] = useState([])
  const [toolLog, setToolLog] = useState([])

  // тФАтФА UI ╤Б╤В╨░╨╜ тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
  const [prodTypeId, setProdTypeId] = useState('')
  const [prodWorker, setProdWorker] = useState('')
  const [prodQty, setProdQty] = useState(1)
  const [prodDate, setProdDate] = useState(todayStr())
  const [prodSerials, setProdSerials] = useState([])
  const [stockSearch, setStockSearch] = useState('')
  const [repairSerial, setRepairSerial] = useState('')
  const [repairSearch, setRepairSearch] = useState('')
  // PageStock тАФ ╨│╨╗╨╛╨▒╨░╨╗╤М╨╜╤Ц ╨╝╨░╤В╨╡╤А╤Ц╨░╨╗╨╕
  const [rsVals, setRsVals] = useState({})
  const [editShopId, setEditShopId] = useState(null)
  const [editShopVal, setEditShopVal] = useState('')
  const [newGlobalMat, setNewGlobalMat] = useState({ name: '', unit: '', stock: '', minStock: '', shopUrl: '', photoUrl: '' })
  // PageStock тАФ ╨║╨╛╨╜╤Д╤Ц╨│╤Г╤А╨░╤Ж╤Ц╤П ╤В╨╕╨┐╤Г (╨┐╤Ц╨┤╤В╨░╨▒ 'types')
  const [configTypeId, setConfigTypeId] = useState('')
  const [newTmMatId, setNewTmMatId] = useState('')
  const [newTmPerBattery, setNewTmPerBattery] = useState('')
  const [newTmMinStock, setNewTmMinStock] = useState('')
  // PageRepair ╤Б╤В╨░╨╜
  const [repWorker, setRepWorker] = useState('')
  const [repDate, setRepDate] = useState(todayStr())
  const [repNote, setRepNote] = useState('')
  const [matChecks, setMatChecks] = useState({})
  const [matQtys, setMatQtys] = useState({})
  const [manTypeId, setManTypeId] = useState('')
  const [manWorkerId, setManWorkerId] = useState('')
  const [manDate, setManDate] = useState(todayStr())
  const [completingId, setCompletingId] = useState(null)
  const [compWorker, setCompWorker] = useState('')
  const [compDate, setCompDate] = useState(todayStr())
  const [compNote, setCompNote] = useState('')
  const [compChecks, setCompChecks] = useState({})
  const [compQtys, setCompQtys] = useState({})
  // PageWorkers
  const [newWorkerName, setNewWorkerName] = useState('')
  // PageTools
  const [toolTab, setToolTab] = useState('active')
  const [newTool, setNewTool] = useState({ name: '', category: 'tool', count: 1, serial: '', notes: '' })
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
  // Swipe hint
  const [swipeHint, setSwipeHint] = useState(null)
  // PageActionLog / PageBackup тАФ lifted to App level to survive re-renders
  const [actionLogs, setActionLogs] = useState(null)  // null = not loaded yet
  const [filterUser, setFilterUser] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [backupDiff, setBackupDiff] = useState(null)
  const [busy, setBusy] = useState(false)
  const [snapshotDate, setSnapshotDate] = useState('')

  // тФАтФА ╨Ю╨▒╤З╨╕╤Б╨╗╤О╨▓╨░╨╜╤Ц ╨┤╨░╨╜╤Ц тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
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

  // тФАтФА ╨е╨╡╨╗╨┐╨╡╤А╨╕ тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
  const showToast = useCallback((msg, type = 'ok') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500) }, [])
  const openConfirm = useCallback((title, body, onYes) => setModal({ type: 'confirm', title, body, onYes }), [])
  const openInput = useCallback((title, placeholder, defaultVal, onConfirm) => setModal({ type: 'input', title, placeholder, defaultVal, onConfirm }), [])
  const closeModal = () => setModal(null)
  // Compresses arrays into dense string format to avoid GAS URL length limits
  const compressConsumed = (arr) => (arr || []).map(c => `${c.matId}:${c.amount || 0}:${c.fromPersonal || 0}:${c.fromTeam || 0}:${c.fromStock || 0}`).join('|')
  const compressMats = (arr) => (arr || []).filter(m => m.selected && m.qty > 0).map(m => `${m.matId}:${m.qty || 0}`).join('|')

  // getWorkerColor тАФ ╨╝╨╛╨┤╤Г╨╗╤М╨╜╨░ ╤Д╤Г╨╜╨║╤Ж╤Ц╤П (╨▓╨╕╨╖╨╜╨░╤З╨╡╨╜╨░ ╨▓╨╕╤Й╨╡ PrepTab)

  // тФАтФА Pull-to-refresh тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
  const handleTouchStart = (e) => { const el = e.currentTarget; if (el.scrollTop <= 0) { startY.current = e.touches[0].pageY; setIsPulling(true) } }
  const handleTouchMove = (e) => { if (!isPulling) return; const dist = e.touches[0].pageY - startY.current; if (dist > 0) { setPullDist(Math.min(dist * .3, 100)); if (dist > 15 && e.cancelable) e.preventDefault() } else { setIsPulling(false); setPullDist(0) } }
  const handleTouchEnd = () => { if (pullDist > 90) window.location.reload(); setIsPulling(false); setPullDist(0) }

  // тФАтФА API ╨╛╨▒╨│╨╛╤А╤В╨║╨░ тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
  const api = useCallback(async (action, params = []) => {
    setSync('saving')
    try { const res = await gasCall(action, params); setSync('ok'); return res }
    catch (e) { setSync('error'); showToast('╨Я╨╛╨╝╨╕╨╗╨║╨░: ' + e.message, 'err'); throw e }
  }, [showToast])

  // тФАтФА ╨Ч╨░╨▓╨░╨╜╤В╨░╨╢╨╡╨╜╨╜╤П ╨┤╨░╨╜╨╕╤Е тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
  useEffect(() => {
    setSync('loading')
    gasCall('loadAll', [])
      .then(data => {
        if (data && data.ok === false) throw new Error(data.error || 'Load failed')
        const mats = data.materials || []
        setMaterials(mats)
        setTypeMaterials(data.typeMaterials || [])
        setAssemblies(data.assemblies || [])
        setBatteryTypes(data.batteryTypes || [])
        const wks = data.workers || []
        setWorkers(wks)
        setTools(data.tools || [])
        setLog(data.log || [])
        setRepairLog(data.repairLog || [])
        setPrepItems(data.prepItems || [])
        setPayments(data.payments || [])
        setToolLog(data.toolLog || [])
        if (data.batteryTypes?.length) {
          setProdTypeId(data.batteryTypes[0].id)
          setConfigTypeId(data.batteryTypes[0].id)
          setManualTypeId(data.batteryTypes[0].id)
          setManTypeId(data.batteryTypes[0].id)
        }
        if (wks.length > 1) { setProdWorker(wks[1].id); setRepWorker(wks[1].id); setManWorkerId(wks[1].id); setToolRepairWorker(wks[1].id); setAsmWorker(wks[1].id) }
        else if (wks.length > 0) { setProdWorker(wks[0].id); setRepWorker(wks[0].id); setManWorkerId(wks[0].id); setToolRepairWorker(wks[0].id); setAsmWorker(wks[0].id) }
        if (mats.length) { setNewTmMatId(mats[0].id); setNewAsmOutMatId(mats[0].id); setNewAcMatId(mats[0].id) }
        if (data.assemblies?.length) setAsmId(data.assemblies[0].id)
        setSync('ok')
      })
      .catch(() => { setSync('error'); showToast('╨Э╨╡ ╨▓╨┤╨░╨╗╨╛╤Б╤М ╨╖╨░╨▓╨░╨╜╤В╨░╨╢╨╕╤В╨╕ ╨┤╨░╨╜╤Ц.', 'err') })
  }, [showToast])

  // тФАтФА ╨Я╨╛╤Е╤Ц╨┤╨╜╤Ц ╨┤╨░╨╜╤Ц тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
  const prodType = batteryTypes.find(t => t.id === prodTypeId) || batteryTypes[0]
  const configType = batteryTypes.find(t => t.id === configTypeId) || batteryTypes[0]
  const perDay = Math.max(1, workers.length) * 1.5
  const activePrep = prepItems.filter(p => p.status !== 'returned')
  const perBatteryByMat = useMemo(() => {
    const map = {}
    typeMaterials.forEach(tm => {
      map[tm.matId] = (map[tm.matId] || 0) + (parseFloat(tm.perBattery) || 0)
    })
    return map
  }, [typeMaterials])

  // тФАтФА ╨е╨╡╨╗╨┐╨╡╤А: ╨╖╨╜╨░╨╣╤В╨╕ ╨│╨╗╨╛╨▒╨░╨╗╤М╨╜╨╕╨╣ ╨╝╨░╤В ╨╖╨░ matId тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
  const globalMat = (matId) => materials.find(m => m.id === matId)

  // \u0414\u043e\u043f\u043e\u043c\u0456\u0436\u043d\u0438\u043a: \u0440\u043e\u0437\u043a\u043b\u0430\u0434\u0430\u0454 \u0437\u0431\u0456\u0440\u043a\u0443 \u043d\u0430 \u0441\u0438\u0440\u0456 \u043c\u0430\u0442\u0435\u0440\u0456\u0430\u043b\u0438 (\u0434\u043b\u044f fallback)
  const expandAssemblyFallback = useCallback((rootMatId, rootDeficitQty, rootParentName) => {
    const resolve = (matId, deficitQty, parentName) => {
      const recipe = assemblies.find(a => a.outputMatId === matId && a.outputQty > 0 && a.components && a.components.length > 0)
      if (!recipe) return null
      const batchesNeeded = Math.ceil(deficitQty / recipe.outputQty)
      let allSubs = []
      recipe.components.forEach(ac => {
        const cgm = materials.find(m => m.id === ac.matId)
        if (!cgm) return
        const compAmt = +(ac.qty * batchesNeeded).toFixed(4)
        const stock = cgm.stock || 0
        if (stock >= compAmt) {
          allSubs.push({ matId: ac.matId, name: cgm.name, unit: cgm.unit, amount: compAmt, fromPersonal: 0, fromTeam: 0, fromStock: compAmt, totalStock: stock, isSubstitute: true, substituteFor: parentName })
        } else {
          if (stock > 0) {
            allSubs.push({ matId: ac.matId, name: cgm.name, unit: cgm.unit, amount: stock, fromPersonal: 0, fromTeam: 0, fromStock: stock, totalStock: stock, isSubstitute: true, substituteFor: parentName })
          }
          const compDeficit = +(compAmt - stock).toFixed(4)
          const nestedSubs = resolve(ac.matId, compDeficit, cgm.name)
          if (nestedSubs) {
            allSubs.push(...nestedSubs)
          } else {
            allSubs.push({ matId: ac.matId, name: cgm.name, unit: cgm.unit, amount: compDeficit, fromPersonal: 0, fromTeam: 0, fromStock: compDeficit, totalStock: stock, isSubstitute: true, substituteFor: parentName })
          }
        }
      })
      return allSubs.length > 0 ? allSubs : null
    }
    return resolve(rootMatId, rootDeficitQty, rootParentName)
  }, [assemblies, materials])

  // \u0420\u043e\u0437\u0440\u0430\u0445\u0443\u043d\u043e\u043a \u0432\u0438\u0442\u0440\u0430\u0442 (\u0433\u043b\u043e\u0431\u0430\u043b\u044c\u043d\u0438\u0439 \u0441\u043a\u043b\u0430\u0434) + \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u043d\u0438\u0439 fallback \u0437\u0431\u0456\u0440\u043a\u0438
  const buildConsumed = useCallback((type, workerId, qty) => {
    if (!type) return []
    const myPrep = prepItems.filter(p => p.workerId === workerId && p.scope !== 'all' && (p.typeId === type.id || p.typeId === 'ALL') && p.status !== 'returned')
    const allPrep = prepItems.filter(p => p.scope === 'all' && (p.typeId === type.id || p.typeId === 'ALL') && p.status !== 'returned')
    const tms = typeMaterials.filter(tm => tm.typeId === type.id)
    const result = []

    tms.forEach(tm => {
      const gm = globalMat(tm.matId)
      if (!gm) return
      let need = +(tm.perBattery * qty).toFixed(4)
      const needOrig = need
      const pAvail = myPrep.filter(p => p.matId === tm.matId).reduce((s, p) => +(s + p.qty - p.returnedQty).toFixed(4), 0)
      const fromPersonal = +Math.min(pAvail, need).toFixed(4)
      need = +(need - fromPersonal).toFixed(4)
      const aAvail = allPrep.filter(p => p.matId === tm.matId).reduce((s, p) => +(s + p.qty - p.returnedQty).toFixed(4), 0)
      const fromTeam = +Math.min(aAvail, need).toFixed(4)
      need = +(need - fromTeam).toFixed(4)

      const fromStockDirect = +Math.min(gm.stock, need).toFixed(4)
      const deficit = +(need - fromStockDirect).toFixed(4)

      if (deficit > 0) {
        const subs = expandAssemblyFallback(tm.matId, deficit, gm.name)
        if (subs) {
          subs.forEach(sub => {
            const ex = result.find(r => r.matId === sub.matId && r.isSubstitute)
            if (ex) { ex.amount = +(ex.amount + sub.amount).toFixed(4); ex.fromStock = +(ex.fromStock + sub.fromStock).toFixed(4) }
            else result.push(sub)
          })
          result.push({ matId: tm.matId, name: gm.name, unit: gm.unit, amount: needOrig, fromPersonal, fromTeam, fromStock: fromStockDirect, totalStock: gm.stock })
        } else {
          result.push({ matId: tm.matId, name: gm.name, unit: gm.unit, amount: needOrig, fromPersonal, fromTeam, fromStock: need, totalStock: gm.stock })
        }
      } else {
        result.push({ matId: tm.matId, name: gm.name, unit: gm.unit, amount: needOrig, fromPersonal, fromTeam, fromStock: fromStockDirect, totalStock: gm.stock })
      }
    })
    return result
  }, [prepItems, materials, typeMaterials, assemblies, expandAssemblyFallback])


  const buildAssemblyConsumed = useCallback((assembly, workerId, qty) => {
    if (!assembly) return []

    // For assemblies, we consider prep items that are for 'ALL' types, since assemblies aren't tied to a specific battery type yet.
    // Except if the user specifically issued prep items for a specific battery type, we might want to allow using them, 
    // but for simplicity, we look for any prep item for this material for this worker.
    const myPrep = prepItems.filter(p => p.workerId === workerId && p.scope !== 'all' && p.status !== 'returned')
    const allPrep = prepItems.filter(p => p.scope === 'all' && p.status !== 'returned')

    return assembly.components.map(ac => {
      const gm = globalMat(ac.matId)
      if (!gm) return null
      let need = +(ac.qty * qty).toFixed(4)
      const needOrig = need
      const pAvail = myPrep.filter(p => p.matId === ac.matId).reduce((s, p) => +(s + p.qty - p.returnedQty).toFixed(4), 0)
      const fromPersonal = +Math.min(pAvail, need).toFixed(4)
      need = +(need - fromPersonal).toFixed(4)
      const aAvail = allPrep.filter(p => p.matId === ac.matId).reduce((s, p) => +(s + p.qty - p.returnedQty).toFixed(4), 0)
      const fromTeam = +Math.min(aAvail, need).toFixed(4)
      need = +(need - fromTeam).toFixed(4)
      return { matId: ac.matId, name: gm.name, unit: gm.unit, amount: needOrig, fromPersonal, fromTeam, fromStock: need, totalStock: gm.stock }
    }).filter(Boolean)
  }, [prepItems, materials])

  const buildRepairConsumed = useCallback((repairMaterials, workerId, typeId) => {
    if (!repairMaterials || repairMaterials.length === 0) return []
    const myPrep = prepItems.filter(p => p.workerId === workerId && p.scope !== 'all' && (p.typeId === typeId || p.typeId === 'ALL') && p.status !== 'returned')
    const allPrep = prepItems.filter(p => p.scope === 'all' && (p.typeId === typeId || p.typeId === 'ALL') && p.status !== 'returned')

    const result = []
    repairMaterials.forEach(rm => {
      const gm = globalMat(rm.matId)
      if (!gm) return
      let need = +rm.qty.toFixed(4)
      const needOrig = need
      const pAvail = myPrep.filter(p => p.matId === rm.matId).reduce((s, p) => +(s + p.qty - p.returnedQty).toFixed(4), 0)
      const fromPersonal = +Math.min(pAvail, need).toFixed(4)
      need = +(need - fromPersonal).toFixed(4)
      const aAvail = allPrep.filter(p => p.matId === rm.matId).reduce((s, p) => +(s + p.qty - p.returnedQty).toFixed(4), 0)
      const fromTeam = +Math.min(aAvail, need).toFixed(4)
      need = +(need - fromTeam).toFixed(4)

      const fromStockDirect = +Math.min(gm.stock, need).toFixed(4)
      const deficit = +(need - fromStockDirect).toFixed(4)

      if (deficit > 0) {
        const subs = expandAssemblyFallback(rm.matId, deficit, gm.name)
        if (subs) {
          subs.forEach(sub => {
            const ex = result.find(r => r.matId === sub.matId && r.isSubstitute)
            if (ex) { ex.amount = +(ex.amount + sub.amount).toFixed(4); ex.fromStock = +(ex.fromStock + sub.fromStock).toFixed(4) }
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


  // тФАтФА ╨е╨╡╨╗╨┐╨╡╤А ╨╛╨╜╨╛╨▓╨╗╨╡╨╜╨╜╤П ╨│╨╗╨╛╨▒╨░╨╗╤М╨╜╨╛╨│╨╛ stock тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
  const updateGlobalStock = useCallback((matId, delta) => {
    setMaterials(prev => prev.map(m => m.id !== matId ? m : { ...m, stock: Math.max(0, +(m.stock + delta).toFixed(4)) }))
  }, [])
  // тХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХР
  //  ACTIONS
  // тХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХР

  const doWriteoff = () => {
    const type = prodType
    const worker = workers.find(w => w.id === prodWorker)
    if (!type || !worker) return showToast('╨Ю╨▒╨╡╤А╤Ц╤В╤М ╤В╨╕╨┐ ╤В╨░ ╨┐╤А╨░╤Ж╤Ц╨▓╨╜╨╕╨║╨░', 'err')
    const serials = prodSerials.slice(0, prodQty)
    for (const s of serials) if (!s?.trim()) return showToast('╨Т╨▓╨╡╨┤╤Ц╤В╤М ╨▓╤Б╤Ц ╤Б╨╡╤А╤Ц╨╣╨╜╤Ц ╨╜╨╛╨╝╨╡╤А╨╕', 'err')
    const consumed = buildConsumed(type, worker.id, prodQty)
    const shortage = consumed.find(c => c.fromStock > c.totalStock)
    if (shortage) return showToast('╨Э╨╡ ╨▓╨╕╤Б╤В╨░╤З╨░╤Ф: ' + shortage.name, 'err')

    openConfirm('╨Я╤Ц╨┤╤В╨▓╨╡╤А╨┤╨╕╤В╨╕ ╤Б╨┐╨╕╤Б╨░╨╜╨╜╤П',
      <div style={{ fontSize: 13, color: G.t2, lineHeight: 1.8 }}>
        <b style={{ color: G.t1 }}>{type.name}</b><br />
        ╨Я╤А╨░╤Ж╤Ц╨▓╨╜╨╕╨║: {worker.name}<br />
        ╨Ъ╤Ц╨╗╤М╨║╤Ц╤Б╤В╤М: <b style={{ color: G.or }}>{prodQty}</b><br />
        ╨б/╨╜: {serials.join(', ')}
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
              const deduct = (wId, amt) => {
                if (!amt) return
                let rem = amt
                next.filter(p => p.workerId === wId && (p.typeId === type.id || p.typeId === 'ALL') && p.matId === c.matId && p.status !== 'returned').forEach(p => {
                  if (rem <= 0) return
                  const avail = p.qty - p.returnedQty
                  const use = Math.min(avail, rem)
                  p.returnedQty = +(p.returnedQty + use).toFixed(4)
                  p.status = p.returnedQty >= p.qty ? 'returned' : 'partial'
                  rem = +(rem - use).toFixed(4)
                })
              }
              deduct(worker.id, c.fromPersonal)
              deduct('TEAM_SHARED', c.fromTeam)
            })
            return next
          })
          setLog(prev => [entry, ...prev])
          setProdSerials([])
          showToast(`тЬУ ╨б╨┐╨╕╤Б╨░╨╜╨╛ ${prodQty} ╨░╨║╤Г╨╝. (${serials.join(', ')})`)
          const lowMats = consumed.filter(c => {
            const m = globalMat(c.matId)
            return m && (m.stock - (c.fromStock > 0 ? c.fromStock : 0)) <= m.minStock && m.minStock > 0
          })
          if (lowMats.length > 0) {
            const lines = lowMats.map(c => { const m = globalMat(c.matId); const ns = Math.max(0, +(m.stock - c.fromStock).toFixed(4)); return `тАв ${m.name}: ${ns} ${m.unit} (╨╝╤Ц╨╜: ${m.minStock})` }).join('\n')
            sendTelegram(`тЪая╕П ZmiyCell тАФ ╨╜╨╕╨╖╤М╨║╨╕╨╣ ╨╖╨░╨┐╨░╤Б\n\n${lines}`)
          }
        } catch { }
      }
    )
  }


  const doUpdateRepairStatus = (repairId, status) => {
    const isCompleted = status === 'completed'
    openConfirm(isCompleted ? '╨Ч╨░╨▓╨╡╤А╤И╨╕╤В╨╕ ╤А╨╡╨╝╨╛╨╜╤В?' : '╨Ч╨╝╤Ц╨╜╨╕╤В╨╕ ╤Б╤В╨░╤В╤Г╤Б',
      '╨Я╤Ц╨┤╤В╨▓╨╡╤А╨┤╨╢╤Г╤Ф╤В╨╡ ╨╖╨╝╤Ц╨╜╤Г ╤Б╤В╨░╤В╤Г╤Б╤Г ╤А╨╡╨╝╨╛╨╜╤В╤Г?',
      async () => {
        closeModal()
        const dateCompleted = isCompleted ? todayStr() : ''
        try {
          await api('updateRepairStatus', [repairId, status, dateCompleted])
          setRepairLog(prev => prev.map(r => r.id === repairId ? { ...r, status, note: r.note + (isCompleted ? (r.note ? ' | ' : '') + `╨Ч╨░╨▓╨╡╤А╤И╨╡╨╜╨╛: ${dateCompleted}` : '') } : r))
          showToast('тЬУ ╨б╤В╨░╤В╤Г╤Б ╨╛╨╜╨╛╨▓╨╗╨╡╨╜╨╛')
        } catch { }
      }
    )
  }

  const doIssuePrepAssembly = (workerId, assemblyId, qty, typeId, forAll) => {
    const worker = workers.find(w => w.id === workerId)
    const asm = assemblies.find(a => a.id === assemblyId)
    if (!asm || !worker || !qty || qty <= 0) return showToast("╨Ч╨░╨┐╨╛╨▓╨╜╤Ц╤В╤М ╨▓╤Б╤Ц ╨┐╨╛╨╗╤П", 'err')
    if (!asm.components || asm.components.length < 2) return showToast('╨Ч╨▒╤Ц╤А╨║╨░ ╨┐╨╛╨▓╨╕╨╜╨╜╨░ ╨╝╤Ц╤Б╤В╨╕╤В╨╕ ╤Е╨╛╤З╨░ ╨▒ 2 ╨╝╨░╤В╨╡╤А╤Ц╨░╨╗╨╕', 'err')

    // ╨Я╨╡╤А╨╡╨▓╤Ц╤А╤П╤Ф╨╝╨╛ ╨╜╨░╤П╨▓╨╜╤Ц╤Б╤В╤М ╨║╨╛╨╝╨┐╨╛╨╜╨╡╨╜╤В╤Ц╨▓ ╨╜╨░ ╤Б╨║╨╗╨░╨┤╤Ц
    const shortage = asm.components.find(ac => {
      const gm = materials.find(m => m.id === ac.matId)
      return !gm || gm.stock < +(ac.qty * qty).toFixed(4)
    })
    if (shortage) {
      const gm = materials.find(m => m.id === shortage.matId)
      return showToast('╨Э╨╡ ╨▓╨╕╤Б╤В╨░╤З╨░╤Ф: ' + (gm?.name || shortage.matId), 'err')
    }

    // ╨Ю╨┤╨╜╨░ ╨┐╨╛╨╖╨╕╤Ж╤Ц╤П ╨▓ ╨╖╨░╨│╨╛╤В╨╛╨▓╤Ж╤Ц тАФ ╨│╨╛╤В╨╛╨▓╨╕╨╣ ╨▓╨╕╤А╤Ц╨▒ (╨▓╨╕╤Е╤Ц╨┤╨╜╨╕╨╣ ╨╝╨░╤В╨╡╤А╤Ц╨░╨╗ ╨╖╨▒╤Ц╤А╨║╨╕)
    const outputQty = +(asm.outputQty * qty).toFixed(4)
    const outputMat = materials.find(m => m.id === asm.outputMatId)
    const prepItem = {
      id: uid(),
      workerId: worker.id,
      workerName: worker.name,
      typeId,
      matId: asm.outputMatId,
      matName: outputMat?.name || asm.name,
      unit: outputMat?.unit || asm.unit || '╤И╤В',
      qty: outputQty,
      returnedQty: 0,
      date: todayStr(),
      datetime: nowStr(),
      status: 'active',
      scope: forAll ? 'all' : 'self',
    }

    openConfirm('╨Т╨╕╨┤╨░╤З╨░ ╨╜╨░ ╨╖╨░╨│╨╛╤В╨╛╨▓╨║╤Г',
      <div style={{ fontSize: 13, color: G.t2, lineHeight: 1.8 }}>
        <b style={{ color: G.t1 }}>{prepItem.matName}</b> ├Ч <b style={{ color: G.pu }}>{outputQty} {prepItem.unit}</b><br />
        ╨Я╤А╨░╤Ж╤Ц╨▓╨╜╨╕╨║: {worker.name}<br />
        ╨Ф╨╛╤Б╤В╤Г╨┐: {forAll ? '╨┤╨╗╤П ╨▓╤Б╤Ц╤Е' : '╨╛╤Б╨╛╨▒╨╕╤Б╤В╨╛'}
        <div style={{ marginTop: 8, fontSize: 11, color: G.t2 }}>
          ╨Ъ╨╛╨╝╨┐╨╛╨╜╨╡╨╜╤В╨╕ (╨▒╤Г╨┤╤Г╤В╤М ╤Б╨┐╨╕╤Б╨░╨╜╤Ц ╨╖╤Ц ╤Б╨║╨╗╨░╨┤╤Г):
          {asm.components.map(ac => {
            const gm = materials.find(m => m.id === ac.matId)
            return <div key={ac.id}>тАв {gm?.name || ac.matId}: -{+(ac.qty * qty).toFixed(4)} {gm?.unit || ''}</div>
          })}
        </div>
      </div>,
      async () => {
        closeModal()
        try {
          await api('addPrepItemsDirect', [[prepItem]])
          // ╨б╨┐╨╕╤Б╤Г╤Ф╨╝╨╛ ╨║╨╛╨╝╨┐╨╛╨╜╨╡╨╜╤В╨╕ ╨╖╤Ц ╤Б╨║╨╗╨░╨┤╤Г
          asm.components.forEach(ac => updateGlobalStock(ac.matId, -(+(ac.qty * qty).toFixed(4))))
          setPrepItems(prev => [prepItem, ...prev])
          const logEntry = {
            id: uid() + 'P',
            datetime: nowStr(),
            date: todayStr(),
            typeId,
            typeName: typeId === 'ALL' ? '╨Т╤Б╤Ц ╤В╨╕╨┐╨╕' : (batteryTypes.find(t => t.id === typeId)?.name || ''),
            workerName: worker.name,
            count: 0,
            serials: [],
            consumed: asm.components.map(ac => {
              const gm = materials.find(m => m.id === ac.matId)
              return { name: gm?.name || ac.matId, unit: gm?.unit || '', amount: +(ac.qty * qty).toFixed(4) }
            }),
            kind: 'prep',
            repairNote: `ЁЯУж ╨Т╨╕╨┤╨░╤З╨░: ${prepItem.matName} ├Ч ${outputQty} ${prepItem.unit}`,
            prepIds: [prepItem.id],
          }
          setLog(prev => [logEntry, ...prev])
          api('logPrepEntry', [logEntry]).catch(() => {})
          showToast(`тЬУ ╨Т╨╕╨┤╨░╨╜╨╛ ╨╖╨░╨│╨╛╤В╨╛╨▓╨║╤Г: ${prepItem.matName}`)
        } catch { }
      }
    )
  }


  const doChangePrepScope = async (prepId, scope) => {
    try {
      await api('updatePrepField', [prepId, 'scope', scope])
      setPrepItems(prev => prev.map(p => String(p.id) === String(prepId) ? { ...p, scope } : p))
      showToast('тЬУ ╨Ю╨╜╨╛╨▓╨╗╨╡╨╜╨╛ ╨┤╨╛╤Б╤В╤Г╨┐')
    } catch { }
  }

  const doReturnPrep = async (prepId, all, customQty) => {
    const item = prepItems.find(p => String(p.id) === String(prepId))
    if (!item) return
    const avail = +(item.qty - item.returnedQty).toFixed(4)
    const qty = all ? avail : parseFloat(customQty || 0)
    if (!qty || qty <= 0) return showToast('╨Т╨▓╨╡╨┤╤Ц╤В╤М ╨║╤Ц╨╗╤М╨║╤Ц╤Б╤В╤М', 'err')
    if (qty > avail) return showToast('╨С╤Ц╨╗╤М╤И╨╡ ╨╜╤Ц╨╢ ╤Ф ╨╜╨░ ╤А╤Г╨║╨░╤Е', 'err')
    try {
      await api('returnPrep', [prepId, qty])
      updateGlobalStock(item.matId, qty)
      setPrepItems(prev => prev.map(p => String(p.id) !== String(prepId) ? p : { ...p, returnedQty: +(p.returnedQty + qty).toFixed(4), status: (p.returnedQty + qty) >= p.qty ? 'returned' : 'partial' }))
      showToast(`тЬУ ╨Я╨╛╨▓╨╡╤А╨╜╨╡╨╜╨╛ ${qty} ${item.unit}`)
    } catch { }
  }

  const doIssueConsumable = (workerId, matId, qty) => {
    const worker = workers.find(w => w.id === workerId)
    const gm = materials.find(m => m.id === matId)
    if (!worker || !gm || !qty || qty <= 0) return showToast("╨Ч╨░╨┐╨╛╨▓╨╜╤Ц╤В╤М ╨▓╤Б╤Ц ╨┐╨╛╨╗╤П", 'err')
    if (gm.stock < qty) return showToast('╨Э╨╡ ╨▓╨╕╤Б╤В╨░╤З╨░╤Ф: ' + gm.name, 'err')

    const item = {
      id: uid(),
      workerId: worker.id,
      workerName: worker.name,
      typeId: 'ALL',
      matId: gm.id,
      matName: gm.name,
      unit: gm.unit || '',
      qty: +qty.toFixed(4),
      returnedQty: 0,
      date: todayStr(),
      datetime: nowStr(),
      status: 'active',
      scope: 'self',
    }

    openConfirm('╨Т╨╕╨┤╨░╤З╨░ ╤А╨╛╨╖╤Е╤Ц╨┤╨╜╨╕╨║╤Ц╨▓',
      <div style={{ fontSize: 13, color: G.t2, lineHeight: 1.8 }}>
        <b style={{ color: G.t1 }}>{gm.name}</b><br />
        ╨Ъ╤Ц╨╗╤М╨║╤Ц╤Б╤В╤М: {qty} {gm.unit}<br />
        ╨Я╤А╨░╤Ж╤Ц╨▓╨╜╨╕╨║: {worker.name}
      </div>,
      async () => {
        closeModal()
        try {
          await api('addPrepItemsBatch', [[item]])
          updateGlobalStock(gm.id, -qty)
          setPrepItems(prev => [item, ...prev])
          // ╨Ч╨░╨┐╨╕╤Б╤Г╤Ф╨╝╨╛ ╨▓ ╨╢╤Г╤А╨╜╨░╨╗
          const logEntry = {
            id: uid() + 'C',
            datetime: nowStr(),
            date: todayStr(),
            typeId: 'ALL',
            typeName: '╨а╨╛╨╖╤Е╤Ц╨┤╨╜╨╕╨║',
            workerName: worker.name,
            count: 0,
            serials: [],
            consumed: [{ name: gm.name, unit: gm.unit, amount: +qty.toFixed(4) }],
            kind: 'prep',
            repairNote: `ЁЯУж ╨Т╨╕╨┤╨░╤З╨░: ${gm.name} ├Ч ${qty} ${gm.unit}`,
            prepIds: [item.id],
          }
          setLog(prev => [logEntry, ...prev])
          api('logPrepEntry', [logEntry]).catch(() => {})
          showToast(`тЬУ ╨Т╨╕╨┤╨░╨╜╨╛ ╤А╨╛╨╖╤Е╤Ц╨┤╨╜╨╕╨║: ${gm.name}`)
        } catch { }
      }
    )
  }

  const doWriteoffPrep = async (prepId) => {
    const item = prepItems.find(p => String(p.id) === String(prepId))
    if (!item) return
    const avail = +(item.qty - item.returnedQty).toFixed(4)
    openConfirm('╨Ю╤Б╤В╨░╤В╨╛╤З╨╜╨╡ ╤Б╨┐╨╕╤Б╨░╨╜╨╜╤П',
      <div style={{ fontSize: 13, color: G.t2, lineHeight: 1.8 }}>╨б╨┐╨╕╤Б╨░╤В╨╕ <b style={{ color: G.or }}>{avail} {item.unit}</b> ({item.matName}) ╨▒╨╡╨╖ ╨┐╨╛╨▓╨╡╤А╨╜╨╡╨╜╨╜╤П ╨╜╨░ ╤Б╨║╨╗╨░╨┤?</div>,
      async () => {
        closeModal()
        try {
          await api('returnPrep', [prepId, avail])
          setPrepItems(prev => prev.map(p => String(p.id) !== String(prepId) ? p : { ...p, returnedQty: +(p.returnedQty + avail).toFixed(4), status: 'returned' }))
          showToast(`тЬУ ╨б╨┐╨╕╤Б╨░╨╜╨╛ ╨▒╨╡╨╖╨┐╨╛╨▓╨╛╤А╨╛╤В╨╜╨╛: ${avail} ${item.unit}`)
        } catch { }
      }
    )
  }

  const doProduceAssembly = () => {
    const asm = assemblies.find(a => a.id === asmId)
    const worker = workers.find(w => w.id === asmWorker)
    if (!asm) return showToast('╨Ю╨▒╨╡╤А╤Ц╤В╤М ╨╖╨▒╤Ц╤А╨║╤Г', 'err')
    if (!worker) return showToast('╨Ю╨▒╨╡╤А╤Ц╤В╤М ╨┐╤А╨░╤Ж╤Ц╨▓╨╜╨╕╨║╨░', 'err')
    if (!asmQty || asmQty <= 0) return showToast('╨Т╨▓╨╡╨┤╤Ц╤В╤М ╨║╤Ц╨╗╤М╨║╤Ц╤Б╤В╤М', 'err')

    const consumed = buildAssemblyConsumed(asm, worker.id, asmQty)
    const shortage = consumed.find(c => c.fromStock > c.totalStock)

    if (shortage) {
      return showToast('╨Э╨╡ ╨▓╨╕╤Б╤В╨░╤З╨░╤Ф: ' + shortage.name, 'err')
    }

    const outputAmt = +(asm.outputQty * asmQty).toFixed(4)
    openConfirm('╨Я╤Ц╨┤╤В╨▓╨╡╤А╨┤╨╕╤В╨╕ ╨▓╨╕╨│╨╛╤В╨╛╨▓╨╗╨╡╨╜╨╜╤П',
      <div style={{ fontSize: 13, color: G.t2, lineHeight: 1.8 }}>
        <b style={{ color: G.or }}>{asm.name}</b><br />
        ╨Ъ╤Ц╨╗╤М╨║╤Ц╤Б╤В╤М: <b style={{ color: G.cy }}>{asmQty}</b> ╨┐╨░╤А╤В╤Ц╨╣ тЖТ {outputAmt} {asm.unit}<br />
        ╨Я╤А╨░╤Ж╤Ц╨▓╨╜╨╕╨║: {worker.name}<br />
        ╨Ъ╤Г╨┤╨╕ ╨▓╤Ц╨┤╨┐╤А╨░╨▓╨╕╤В╨╕: <b style={{ color: G.gn }}>{asmDestination === 'stock' ? '╨Э╨░ ╨│╨╗╨╛╨▒╨░╨╗╤М╨╜╨╕╨╣ ╤Б╨║╨╗╨░╨┤' : asmDestination === 'personal' ? '╨Ю╤Б╨╛╨▒╨╕╤Б╤В╨░ ╨╖╨░╨│╨╛╤В╨╛╨▓╨║╨░' : '╨б╨┐╤Ц╨╗╤М╨╜╨░ (╨┤╨╗╤П ╨▓╤Б╤Ц╤Е) ╨╖╨░╨│╨╛╤В╨╛╨▓╨║╨░'}</b><br />
        <div style={{ marginTop: 8 }}>
          {consumed.map(c => {
            return <div key={c.matId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: `1px solid ${G.b1}`, fontSize: 12 }}>
              <span style={{ color: G.t1, paddingRight: 8 }}>{c.name}</span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {c.fromPersonal > 0 && <Chip bg='#2e1065' color='#c084fc' bd='#4c1d95'>ЁЯС╖{c.fromPersonal}</Chip>}
                {c.fromTeam > 0 && <Chip bg='#1e3a8a' color='#93c5fd' bd='#1e40af'>ЁЯдЭ{c.fromTeam}</Chip>}
                {c.fromStock > 0 && <Chip bg='#1c1007' color='#fb923c' bd='#9a3412'>ЁЯПн{c.fromStock}</Chip>}
                <span style={{ color: G.gn, fontWeight: 600, minWidth: 60, textAlign: 'right' }}>тИТ{c.amount} {c.unit}</span>
              </div>
            </div>
          })}
        </div>
      </div>,
      async () => {
        closeModal()
        // Here we send the advanced payload to the backend
        const entry = { assemblyId: asm.id, qty: asmQty, workerId: worker.id, workerName: worker.name, date: asmDate, datetime: nowStr(), destination: asmDestination, consumed, outputAmt }
        try {
          await api('produceAssemblyAdvanced', [{ ...entry, consumed: compressConsumed(consumed) }])

          // ╨б╨┐╨╕╤Б╤Г╤Ф╨╝╨╛ ╨║╨╛╨╝╨┐╨╛╨╜╨╡╨╜╤В╨╕ ╨╗╨╛╨║╨░╨╗╤М╨╜╨╛
          consumed.forEach(c => { if (c.fromStock > 0) updateGlobalStock(c.matId, -c.fromStock) })

          // ╨Ч╨╝╨╡╨╜╤И╤Г╤Ф╨╝╨╛ prepItems (╨░╨╜╨░╨╗╨╛╨│╤Ц╤З╨╜╨╛ ╨┤╨╛ ╤Б╨┐╨╕╤Б╨░╨╜╨╜╤П ╨▒╨░╤В╨░╤А╨╡╨╣)
          setPrepItems(prev => {
            const next = prev.map(p => ({ ...p }))
            consumed.forEach(c => {
              const deduct = (wId, amt) => {
                if (!amt) return
                let rem = amt
                next.filter(p => p.workerId === wId && p.matId === c.matId && p.status !== 'returned').forEach(p => {
                  if (rem <= 0) return
                  const avail = p.qty - p.returnedQty
                  const use = Math.min(avail, rem)
                  p.returnedQty = +(p.returnedQty + use).toFixed(4)
                  p.status = p.returnedQty >= p.qty ? 'returned' : 'partial'
                  rem = +(rem - use).toFixed(4)
                })
              }
              deduct(worker.id, c.fromPersonal)
              deduct('TEAM_SHARED', c.fromTeam)
            })

            // ╨п╨║╤Й╨╛ ╤А╨╡╨╖╤Г╨╗╤М╤В╨░╤В ╨╣╨┤╨╡ ╤П╨║ ╨╖╨░╨│╨╛╤В╨╛╨▓╨║╨░ - ╤Б╤В╨▓╨╛╤А╤О╤Ф╨╝╨╛ ╨╜╨╛╨▓╤Г ╨╗╨╛╨║╨░╨╗╤М╨╜╨╛
            if (asmDestination !== 'stock') {
              const gm = globalMat(asm.outputMatId)
              next.unshift({
                id: 'tmp_prep_' + Date.now(),
                workerId: worker.id,
                workerName: worker.name,
                typeId: 'ALL',
                matId: asm.outputMatId,
                matName: gm?.name || asm.outputMatId,
                unit: asm.unit,
                qty: outputAmt,
                returnedQty: 0,
                date: asmDate,
                datetime: nowStr(),
                status: 'active',
                scope: asmDestination === 'team' ? 'all' : 'self'
              })
            }

            return next
          })

          // ╨Ф╨╛╨┤╨░╤Ф╨╝╨╛ ╨▓╨╕╤А╨╛╨▒╨╗╨╡╨╜╤Ц ╨╜╨░ ╤Б╨║╨╗╨░╨┤, ╤П╨║╤Й╨╛ ╨▓╨╕╨▒╤А╨░╨╜╨╛ ╨б╨║╨╗╨░╨┤
          if (asmDestination === 'stock') {
            updateGlobalStock(asm.outputMatId, outputAmt)
          }

          showToast(`тЬУ ╨Т╨╕╨│╨╛╤В╨╛╨▓╨╗╨╡╨╜╨╛: ${outputAmt} ${asm.unit} тЖТ ${asm.name}`)
        } catch { }
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
    if (err) return showToast('╨Э╨╡ ╨▓╨╕╤Б╤В╨░╤З╨░╤Ф ╨╜╨░ ╤Б╨║╨╗╨░╨┤╤Ц: ' + err.name, 'err')

    openConfirm('╨Я╤Ц╨┤╤В╨▓╨╡╤А╨┤╨╕╤В╨╕ ╤А╨╡╨╝╨╛╨╜╤В',
      <div style={{ fontSize: 13, color: G.t2, lineHeight: 1.8 }}>
        ╨б/╨╜: <b style={{ color: G.cy }}>{repairEntry.serial}</b><br />
        ╨а╨╡╨╝╨╛╨╜╤В╤Г╤Ф: {repairEntry.repairWorker}
        {consumed.length > 0 && <div style={{ marginTop: 8 }}>
          <b style={{ color: G.t1, fontSize: 12 }}>╨Ь╨░╤В╨╡╤А╤Ц╨░╨╗╨╕:</b>
          {consumed.map(c => {
            return <div key={c.matId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: `1px solid ${G.b1}`, fontSize: 12 }}>
              <span style={{ color: G.t1, paddingRight: 8 }}>{c.name}</span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {c.fromPersonal > 0 && <Chip bg='#2e1065' color='#c084fc' bd='#4c1d95'>ЁЯС╖{c.fromPersonal}</Chip>}
                {c.fromTeam > 0 && <Chip bg='#1e3a8a' color='#93c5fd' bd='#1e40af'>ЁЯдЭ{c.fromTeam}</Chip>}
                {c.fromStock > 0 && <Chip bg='#1c1007' color='#fb923c' bd='#9a3412'>ЁЯПн{c.fromStock}</Chip>}
                <span style={{ color: G.gn, fontWeight: 600, minWidth: 60, textAlign: 'right' }}>тИТ{c.amount} {c.unit}</span>
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

          // ╨б╨┐╨╕╤Б╤Г╤Ф╨╝╨╛ ╨║╨╛╨╝╨┐╨╛╨╜╨╡╨╜╤В╨╕ ╨╗╨╛╨║╨░╨╗╤М╨╜╨╛
          consumed.forEach(c => { if (c.fromStock > 0) updateGlobalStock(c.matId, -c.fromStock) })

          // ╨Ч╨╝╨╡╨╜╤И╤Г╤Ф╨╝╨╛ prepItems
          setPrepItems(prev => {
            const next = prev.map(p => ({ ...p }))
            consumed.forEach(c => {
              const deduct = (wId, amt) => {
                if (!amt) return
                let rem = amt
                next.filter(p => p.workerId === wId && p.matId === c.matId && p.status !== 'returned').forEach(p => {
                  if (rem <= 0) return
                  const avail = p.qty - p.returnedQty
                  const use = Math.min(avail, rem)
                  p.returnedQty = +(p.returnedQty + use).toFixed(4)
                  p.status = p.returnedQty >= p.qty ? 'returned' : 'partial'
                  rem = +(rem - use).toFixed(4)
                })
              }
              deduct(workerId, c.fromPersonal)
              deduct('TEAM_SHARED', c.fromTeam)
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
          showToast('тЬУ ╨а╨╡╨╝╨╛╨╜╤В ╨╖╨░╤Д╤Ц╨║╤Б╨╛╨▓╨░╨╜╨╛: ' + repairEntry.serial)
        } catch { }
      }
    )
  }

  // тХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХР
  //  ╨б╨в╨Ю╨а╨Ж╨Э╨Ъ╨Ш
  // тХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХР
  const wrap = (children) =>
    <div style={{ padding: '12px 12px 40px', maxWidth: 700, margin: '0 auto' }}>{children}</div>


  // тФАтФА ╨в╨░╨▒ ╨Ч╨▒╤Ц╤А╨║╨░ (╨▓╤Б╨╡╤А╨╡╨┤╨╕╨╜╤Ц ╨Т╨Ш╨а╨Ю╨С╨Э╨Ш╨ж╨в╨Т╨Ю) тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
  const AssemblyTab = () => {
    const curAsm = assemblies.find(a => a.id === asmId)
    const worker = workers.find(w => w.id === asmWorker)
    const consumed = curAsm && worker ? buildAssemblyConsumed(curAsm, worker.id, asmQty) : []

    if (assemblies.length === 0) return (
      <Card>
        <div style={{ color: G.t2, fontSize: 13, textAlign: 'center', padding: '10px 0' }}>
          ╨Ч╨▒╤Ц╤А╨║╨╕ ╨╜╨╡ ╨╜╨░╨╗╨░╤И╤В╨╛╨▓╨░╨╜╨╛.{isAdmin ? ' ╨Я╨╡╤А╨╡╨╣╨┤╤Ц╤В╤М ╨╜╨░ ╨б╨Ъ╨Ы╨Р╨Ф тЖТ тЪЩя╕П ╨Ч╨С╨Ж╨а╨Ъ╨Ш.' : ' ╨Ч╨▓╨╡╤А╨╜╤Ц╤В╤М╤Б╤П ╨┤╨╛ ╨░╨┤╨╝╤Ц╨╜╨░.'}
        </div>
      </Card>
    )

    return <>
      <Card>
        <CardTitle color='#a78bfa'>тЪЩя╕П ╨Т╨Ш╨У╨Ю╨в╨Ю╨Т╨Ш╨в╨Ш ╨Ч╨С╨Ж╨а╨Ъ╨г</CardTitle>
        <FormRow label="╨Ч╨С╨Ж╨а╨Ъ╨Р">
          <select value={asmId} onChange={e => setAsmId(e.target.value)}>
            <option value="">тАФ ╨╛╨▒╨╡╤А╤Ц╤В╤М ╨╖╨▒╤Ц╤А╨║╤Г тАФ</option>
            {assemblies.map(a => {
              const gm = globalMat(a.outputMatId)
              return <option key={a.id} value={a.id}>{a.name} тЖТ {a.outputQty} {gm?.unit || a.unit} {gm?.name || ''}</option>
            })}
          </select>
        </FormRow>
        <FormRow label="╨Ъ╨Ж╨Ы╨м╨Ъ╨Ж╨б╨в╨м ╨Я╨Р╨а╨в╨Ж╨Щ">
          <input type="number" min="1" value={asmQty} onChange={e => setAsmQty(parseInt(e.target.value) || 1)} />
        </FormRow>
        <FormRow label="╨Я╨а╨Р╨ж╨Ж╨Т╨Э╨Ш╨Ъ">
          <select value={asmWorker} onChange={e => setAsmWorker(e.target.value)}>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </FormRow>
        <FormRow label="╨Ф╨Р╨в╨Р"><input value={asmDate} onChange={e => setAsmDate(e.target.value)} /></FormRow>

        <FormRow label="╨Ъ╨г╨Ф╨Ш ╨Т╨Ж╨Ф╨Я╨а╨Р╨Т╨Ш╨в╨Ш ╨У╨Ю╨в╨Ю╨Т╨г ╨Ч╨С╨Ж╨а╨Ъ╨г?">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="radio" name="asmDest" value="personal" checked={asmDestination === 'personal'} onChange={e => setAsmDestination(e.target.value)} style={{ accentColor: '#a78bfa' }} />
              <span style={{ color: G.t1, fontSize: 14 }}>╨Ю╤Б╨╛╨▒╨╕╤Б╤В╨░ ╨╖╨░╨│╨╛╤В╨╛╨▓╨║╨░ ЁЯС╖</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="radio" name="asmDest" value="team" checked={asmDestination === 'team'} onChange={e => setAsmDestination(e.target.value)} style={{ accentColor: '#a78bfa' }} />
              <span style={{ color: G.t1, fontSize: 14 }}>╨б╨┐╤Ц╨╗╤М╨╜╨░ ╨╖╨░╨│╨╛╤В╨╛╨▓╨║╨░ (╨┤╨╗╤П ╨▓╤Б╤Ц╤Е) ЁЯдЭ</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="radio" name="asmDest" value="stock" checked={asmDestination === 'stock'} onChange={e => setAsmDestination(e.target.value)} style={{ accentColor: '#fb923c' }} />
              <span style={{ color: G.or, fontSize: 14 }}>╨У╨╗╨╛╨▒╨░╨╗╤М╨╜╨╕╨╣ ╤Б╨║╨╗╨░╨┤ ЁЯПн</span>
            </label>
          </div>
        </FormRow>
      </Card>

      {curAsm && consumed.length > 0 && <Card>
        <CardTitle color='#a78bfa'>тЪб ╨С╨г╨Ф╨Х ╨б╨Я╨Ш╨б╨Р╨Э╨Ю ╨Ф╨Ы╨п ╨Ч╨С╨Ж╨а╨Ъ╨Ш</CardTitle>
        {consumed.map(c => {
          const ok = c.fromStock <= c.totalStock
          return <div key={c.matId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${G.b1}`, fontSize: 13 }}>
            <span style={{ color: ok ? G.t1 : G.rd, flex: 1, paddingRight: 8 }}>{c.name}</span>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {c.fromPersonal > 0 && <Chip bg='#2e1065' color='#c084fc' bd='#4c1d95'>ЁЯС╖{c.fromPersonal}</Chip>}
              {c.fromTeam > 0 && <Chip bg='#1e3a8a' color='#93c5fd' bd='#1e40af'>ЁЯдЭ{c.fromTeam}</Chip>}
              {c.fromStock > 0 && <Chip bg='#1c1007' color='#fb923c' bd='#9a3412'>ЁЯПн{c.fromStock}</Chip>}
              <span style={{ color: ok ? G.gn : G.rd, fontWeight: 600, minWidth: 60, textAlign: 'right' }}>{c.amount} {c.unit}</span>
            </div>
          </div>
        })}
        <div style={{ borderTop: `1px solid ${G.b2}`, marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span style={{ color: G.t2 }}>╨Ю╤В╤А╨╕╨╝╨░╤Ф╨╝╨╛:</span>
          <span style={{ color: '#a78bfa', fontWeight: 800 }}>+{+(curAsm.outputQty * asmQty).toFixed(4)} {globalMat(curAsm.outputMatId)?.unit || curAsm.unit} {globalMat(curAsm.outputMatId)?.name || ''}</span>
        </div>
      </Card>}

      <SubmitBtn onClick={doProduceAssembly} color='#a78bfa'>тЪЩя╕П ╨Т╨Ш╨У╨Ю╨в╨Ю╨Т╨Ш╨в╨Ш ╨Ч╨С╨Ж╨а╨Ъ╨г</SubmitBtn>
    </>
  }

  // тФАтФА ╨Т╨╕╤А╨╛╨▒╨╜╨╕╤Ж╤В╨▓╨╛ тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
  const PageProd = () => {
    const consumed = prodType ? buildConsumed(prodType, prodWorker, prodQty) : []
    const serials = Array.from({ length: prodQty }, (_, i) => prodSerials[i] || '')
    return wrap(<>
      <SubTabs tabs={[['writeoff', 'ЁЯФЛ ╨б╨Я╨Ш╨б╨Р╨Э╨Э╨п'], ['prep', 'ЁЯУж ╨Ч╨Р╨У╨Ю╨в╨Ю╨Т╨Ъ╨Р'], ['assembly', 'тЪЩя╕П ╨Ч╨С╨Ж╨а╨Ъ╨Р']]} active={prodTab} onChange={setProdTab} />
      {prodTab === 'writeoff' && <>
        <TypeTabs types={batteryTypes} active={prodTypeId} onSelect={id => { setProdTypeId(id); setProdSerials([]) }} />
        <Card>
          <FormRow label="╨Я╨а╨Р╨ж╨Ж╨Т╨Э╨Ш╨Ъ">
            <select value={prodWorker} onChange={e => setProdWorker(e.target.value)}>
              {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </FormRow>
          <FormRow label="╨Ф╨Р╨в╨Р"><input value={prodDate} onChange={e => setProdDate(e.target.value)} /></FormRow>
          <FormRow label="╨Ъ╨Ж╨Ы╨м╨Ъ╨Ж╨б╨в╨м ╨Р╨Ъ╨г╨Ь╨г╨Ы╨п╨в╨Ю╨а╨Ж╨Т">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <QtyBtn onClick={() => { if (prodQty > 1) { setProdQty(q => q - 1); setProdSerials(s => s.slice(0, -1)) } }}>тИТ</QtyBtn>
              <span style={{ fontSize: 28, fontWeight: 700, color: G.or, minWidth: 44, textAlign: 'center' }}>{prodQty}</span>
              <QtyBtn onClick={() => { if (prodQty < 20) setProdQty(q => q + 1) }}>+</QtyBtn>
            </div>
          </FormRow>
          <FormRow label="╨б╨Х╨а╨Ж╨Щ╨Э╨Ж ╨Э╨Ю╨Ь╨Х╨а╨Ш">
            {serials.map((v, i) => <input key={i} placeholder={`#${i + 1} ╤Б╨╡╤А╤Ц╨╣╨╜╨╕╨╣ ╨╜╨╛╨╝╨╡╤А`} value={v}
              onChange={e => { const s = [...prodSerials]; while (s.length <= i) s.push(''); s[i] = e.target.value; setProdSerials(s) }}
              style={{ marginBottom: 6 }} />)}
          </FormRow>
        </Card>
        {prodType && <Card>
          <CardTitle>тЪб ╨С╨г╨Ф╨Х ╨б╨Я╨Ш╨б╨Р╨Э╨Ю</CardTitle>
          {consumed.length === 0 ? <div style={{ color: G.t2, fontSize: 13 }}>╨Ь╨░╤В╨╡╤А╤Ц╨░╨╗╨╕ ╨╜╨╡ ╨╜╨░╨╗╨░╤И╤В╨╛╨▓╨░╨╜╨╛ ╨┤╨╗╤П ╤Ж╤М╨╛╨│╨╛ ╤В╨╕╨┐╤Г</div>
            : consumed.map(c => {
              const ok = c.fromStock <= c.totalStock
              return <div key={c.matId + (c.isSubstitute ? '_sub' : '')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${G.b1}`, fontSize: 13, marginLeft: c.isSubstitute ? 12 : 0 }}>
                <span style={{ color: c.isSubstitute ? G.cy : ok ? G.t1 : G.rd, flex: 1, paddingRight: 8 }}>
                  {c.isSubstitute && <span style={{ color: G.t2, marginRight: 4, fontSize: 11 }}>тЖ│</span>}
                  {c.name}
                  {c.isSubstitute && <span style={{ fontSize: 10, color: G.t2, marginLeft: 4 }}>(╨╖╨░╨╝╤Ц╤Б╤В╤М {c.substituteFor})</span>}
                </span>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {c.fromPersonal > 0 && <Chip bg='#2e1065' color='#c084fc' bd='#4c1d95'>ЁЯС╖{c.fromPersonal}</Chip>}
                  {c.fromTeam > 0 && <Chip bg='#1e3a8a' color='#93c5fd' bd='#1e40af'>ЁЯдЭ{c.fromTeam}</Chip>}
                  {c.fromStock > 0 && <Chip bg='#1c1007' color='#fb923c' bd='#9a3412'>ЁЯПн{c.fromStock}</Chip>}
                  <span style={{ color: ok ? G.gn : G.rd, fontWeight: 600, minWidth: 60, textAlign: 'right' }}>{c.amount} {c.unit}</span>
                </div>
              </div>
            })}
        </Card>}
        <SubmitBtn onClick={doWriteoff}>тЬУ ╨б╨Я╨Ш╨б╨Р╨в╨Ш ╨Ь╨Р╨в╨Х╨а╨Ж╨Р╨Ы╨Ш</SubmitBtn>
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
      />}
      {prodTab === 'assembly' && <AssemblyTab />}
    </>)
  }
  // тФАтФА ╨б╨║╨╗╨░╨┤ тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
  const PageStock = () => {
    const filteredMats = materials.filter(m => !stockSearch || m.name.toLowerCase().includes(stockSearch.toLowerCase()))

    // тФАтФА ╨Я╤Ц╨┤╤В╨░╨▒: ╨Ь╨░╤В╨╡╤А╤Ц╨░╨╗╨╕ (╨│╨╗╨╛╨▒╨░╨╗╤М╨╜╨╕╨╣ ╤Б╨║╨╗╨░╨┤) тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
    const TabMaterials = () => {
      const restock = async (matId) => {
        const qty = parseFloat(rsVals[matId] || 0)
        if (!qty || qty <= 0) return showToast('╨Т╨▓╨╡╨┤╤Ц╤В╤М ╨║╤Ц╨╗╤М╨║╤Ц╤Б╤В╤М', 'err')
        await api('updateMaterialStock', [matId, qty])
        updateGlobalStock(matId, qty)
        setRsVals(v => ({ ...v, [matId]: '' }))
        showToast(`тЬУ ╨Я╨╛╨┐╨╛╨▓╨╜╨╡╨╜╨╛ ╨╜╨░ ${qty}`)
      }

      const editStock = (m) => openInput('╨Э╨╛╨▓╨╕╨╣ ╨╖╨░╨╗╨╕╤И╨╛╨║:', String(m.stock), String(m.stock), async (val) => {
        closeModal()
        const parsed = parseFloat(val)
        if (isNaN(parsed)) return showToast('╨Э╨╡╨▓╤Ц╤А╨╜╨╡ ╨╖╨╜╨░╤З╨╡╨╜╨╜╤П', 'err')
        const delta = parsed - m.stock
        await api('updateMaterialStock', [m.id, delta])
        updateGlobalStock(m.id, delta)
        showToast(`тЬУ ╨Ч╨░╨╗╨╕╤И╨╛╨║ ╨▓╤Б╤В╨░╨╜╨╛╨▓╨╗╨╡╨╜╨╛: ${parsed}`)
      })

      const editField = (m, field) => {
        const labels = { name: '╨Э╨╛╨▓╨░ ╨╜╨░╨╖╨▓╨░:', minStock: '╨Ь╤Ц╨╜. ╨╖╨░╨┐╨░╤Б:', shopUrl: '╨Я╨╛╤Б╨╕╨╗╨░╨╜╨╜╤П ╨╜╨░ ╨╝╨░╨│╨░╨╖╨╕╨╜:', unit: '╨Ю╨┤╨╕╨╜╨╕╤Ж╤П ╨▓╨╕╨╝╤Ц╤А╤Г:', photoUrl: '╨Я╨╛╤Б╨╕╨╗╨░╨╜╨╜╤П ╨╜╨░ ╤Д╨╛╤В╨╛:' }
        openInput(labels[field] || field, String(m[field] || ''), String(m[field] || ''), async (val) => {
          closeModal()
          const value = ['minStock'].includes(field) ? parseFloat(val) || 0 : val.trim()
          await api('updateMaterialField', [m.id, field, value])
          setMaterials(prev => prev.map(mx => mx.id !== m.id ? mx : { ...mx, [field]: value }))
          showToast('тЬУ ╨Ч╨▒╨╡╤А╨╡╨╢╨╡╨╜╨╛')
        })
      }

      const deleteMat = (m) => openConfirm('╨Т╨╕╨┤╨░╨╗╨╕╤В╨╕ ╨╝╨░╤В╨╡╤А╤Ц╨░╨╗?',
        <span>╨Т╨╕╨┤╨░╨╗╨╕╤В╤М: <b style={{ color: G.rd }}>{m.name}</b> ╤Ц ╨▓╤Б╤Ц ╨┐╤А╨╕╨▓'╤П╨╖╨║╨╕ ╨┤╨╛ ╤В╨╕╨┐╤Ц╨▓</span>,
        async () => {
          closeModal()
          await api('deleteMaterial', [m.id])
          setMaterials(prev => prev.filter(mx => mx.id !== m.id))
          setTypeMaterials(prev => prev.filter(tm => tm.matId !== m.id))
          showToast('тЬУ ╨Т╨╕╨┤╨░╨╗╨╡╨╜╨╛ ' + m.name)
        })

      const showHist = (m) => {
        const entries = log.flatMap(e => (e.consumed || []).filter(c => c.name === m.name).map(c => ({ ...c, datetime: e.datetime, workerName: e.workerName, kind: e.kind }))).slice(0, 20)
        setModal({ type: 'history', mat: m, entries })
      }

      const addMat = async () => {
        const { name, unit, stock, minStock, shopUrl, photoUrl } = newGlobalMat
        if (!name || !unit) return showToast("╨Э╨░╨╖╨▓╨░ ╤Ц ╨╛╨┤╨╕╨╜╨╕╤Ж╤П тАФ ╨╛╨▒╨╛╨▓'╤П╨╖╨║╨╛╨▓╤Ц", 'err')
        const res = await api('addMaterial', [name, unit, parseFloat(stock) || 0, parseFloat(minStock) || 0, shopUrl || '', photoUrl || ''])
        const nm = { id: res.id, name, unit, stock: parseFloat(stock) || 0, minStock: parseFloat(minStock) || 0, shopUrl: shopUrl || '', photoUrl: photoUrl || '', isOrdered: false }
        setMaterials(prev => [...prev, nm])
        setNewGlobalMat({ name: '', unit: '', stock: '', minStock: '', shopUrl: '', photoUrl: '' })
        setNewTmMatId(res.id)
        showToast('тЬУ ╨Ф╨╛╨┤╨░╨╜╨╛ ' + name)
      }

      if (!isAdmin) return <>
        <input placeholder="ЁЯФН ╨Я╨╛╤И╤Г╨║ ╨╝╨░╤В╨╡╤А╤Ц╨░╨╗╤Г..." value={stockSearch} onChange={e => setStockSearch(e.target.value)} style={{ marginBottom: 10 }} />
        {filteredMats.map(m => <div key={m.id} style={{ background: G.card, border: `1px solid ${G.b1}`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
            {m.photoUrl && <img src={m.photoUrl} alt={m.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: `1px solid ${G.b1}` }} />}
            <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <StockBadge m={m} />
            <span style={{ background: G.card2, border: `1px solid ${G.b1}`, borderRadius: 6, padding: '2px 8px', fontSize: 13, color: G.cy, fontWeight: 700 }}>{m.stock} {m.unit}</span>
            <span style={{ fontSize: 11, color: G.t2 }}>╨╝╤Ц╨╜:{m.minStock}</span>
          </div>
          {m.shopUrl && <a href={m.shopUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: G.cy, textDecoration: 'none', display: 'inline-block', marginTop: 6 }}>ЁЯФЧ ╨Ь╨░╨│╨░╨╖╨╕╨╜</a>}
        </div>)}
      </>

      return <>
        <input placeholder="ЁЯФН ╨Я╨╛╤И╤Г╨║ ╨╝╨░╤В╨╡╤А╤Ц╨░╨╗╤Г..." value={stockSearch} onChange={e => setStockSearch(e.target.value)} style={{ marginBottom: 10 }} />

        {filteredMats.map(m => {
          const inPrep = prepItems.filter(p => p.matId === m.id && p.status !== 'returned').reduce((s, p) => +(s + p.qty - p.returnedQty).toFixed(4), 0)
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
                <button onClick={() => showHist(m)} style={{ background: G.card2, border: `1px solid ${G.b1}`, color: G.pu, padding: '3px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>ЁЯУК</button>
                <button onClick={() => deleteMat(m)} style={{ background: '#450a0a', border: 'none', color: G.rd, padding: '3px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>тЬХ</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              <StockBadge m={m} />
              <span onClick={() => editStock(m)} style={{ background: G.card2, border: `1px solid ${G.b1}`, borderRadius: 6, padding: '2px 8px', fontSize: 12, color: G.cy, cursor: 'pointer' }}>{m.stock} {m.unit}</span>
              <span onClick={() => editField(m, 'minStock')} style={{ fontSize: 11, color: G.t2, cursor: 'pointer' }}>╨╝╤Ц╨╜:{m.minStock}</span>
              {inPrep > 0 && <Chip bg='#2e1065' color='#c084fc' bd='#4c1d95'>ЁЯУж{inPrep}</Chip>}
            </div>

            {/* ╨Я╨╛╤Б╨╕╨╗╨░╨╜╨╜╤П ╨╜╨░ ╨╝╨░╨│╨░╨╖╨╕╨╜ */}
            {editShopId === m.id ? (
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <input placeholder="https://..." value={editShopVal} onChange={e => setEditShopVal(e.target.value)} style={{ fontSize: 12 }} />
                <button onClick={async () => { await api('updateMaterialField', [m.id, 'shopUrl', editShopVal]); setMaterials(prev => prev.map(mx => mx.id !== m.id ? mx : { ...mx, shopUrl: editShopVal })); setEditShopId(null); showToast('тЬУ ╨Ч╨▒╨╡╤А╨╡╨╢╨╡╨╜╨╛') }} style={{ padding: '6px 10px', background: G.gn, color: '#000', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>тЬУ</button>
                <button onClick={() => setEditShopId(null)} style={{ padding: '6px 10px', background: G.b1, color: G.t2, border: `1px solid ${G.b2}`, borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>тЬХ</button>
              </div>
            ) : (
              <div style={{ marginBottom: 8 }}>
                {m.shopUrl ? <a href={m.shopUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: G.cy, textDecoration: 'none', marginRight: 8 }}>ЁЯФЧ ╨Ь╨░╨│╨░╨╖╨╕╨╜</a> : null}
                <span onClick={() => { setEditShopId(m.id); setEditShopVal(m.shopUrl || '') }} style={{ fontSize: 11, color: G.t2, cursor: 'pointer', marginRight: 8 }}>{m.shopUrl ? 'тЬО' : '+ ╨┐╨╛╤Б╨╕╨╗╨░╨╜╨╜╤П'}</span>
                <span onClick={() => editField(m, 'photoUrl')} style={{ fontSize: 11, color: G.t2, cursor: 'pointer' }}>{m.photoUrl ? 'ЁЯУ╖ ╨╖╨╝╤Ц╨╜╨╕╤В╨╕ ╤Д╨╛╤В╨╛' : '+ ╤Д╨╛╤В╨╛'}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 6 }}>
              <input type="number" placeholder="+╨║╤Ц╨╗╤М╨║." value={rsVals[m.id] || ''} onChange={e => setRsVals(v => ({ ...v, [m.id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && restock(m.id)} style={{ width: 90 }} />
              <button onClick={() => restock(m.id)} style={{ padding: '6px 12px', background: '#431407', color: '#fed7aa', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+╨┐╨╛╨┐╨╛╨▓╨╜╨╕╤В╨╕</button>
            </div>
          </div>
        })}

        {isAdmin && <Card>
          <CardTitle color={G.gn}>+ ╨Э╨Ю╨Т╨Ш╨Щ ╨Ь╨Р╨в╨Х╨а╨Ж╨Р╨Ы ╨Э╨Р ╨б╨Ъ╨Ы╨Р╨Ф</CardTitle>
          <FormRow label="╨Э╨Р╨Ч╨Т╨Р">
            <input placeholder="╨╜╨░╨┐╤А. ╨Э╤Ц╨║╨╡╨╗╨╡╨▓╨░ ╤Б╤В╤А╤Ц╤З╨║╨░" value={newGlobalMat.name} onChange={e => setNewGlobalMat(v => ({ ...v, name: e.target.value }))} />
          </FormRow>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
            <div><Label>╨Ю╨Ф╨Ш╨Э╨Ш╨ж╨п</Label><input placeholder="╤И╤В, ╨╝, ╨│" value={newGlobalMat.unit} onChange={e => setNewGlobalMat(v => ({ ...v, unit: e.target.value }))} /></div>
            <div><Label>╨Ч╨Р╨Ы╨Ш╨и╨Ю╨Ъ</Label><input type="number" placeholder="0" value={newGlobalMat.stock} onChange={e => setNewGlobalMat(v => ({ ...v, stock: e.target.value }))} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
            <div><Label>╨Ь╨Ж╨Э. ╨Ч╨Р╨Я╨Р╨б</Label><input type="number" placeholder="0" value={newGlobalMat.minStock} onChange={e => setNewGlobalMat(v => ({ ...v, minStock: e.target.value }))} /></div>
            <div><Label>╨Я╨Ю╨б╨Ш╨Ы╨Р╨Э╨Э╨п</Label><input placeholder="https://..." value={newGlobalMat.shopUrl} onChange={e => setNewGlobalMat(v => ({ ...v, shopUrl: e.target.value }))} /></div>
          </div>
          <FormRow label="╨д╨Ю╨в╨Ю (URL)">
            <input placeholder="https://..." value={newGlobalMat.photoUrl} onChange={e => setNewGlobalMat(v => ({ ...v, photoUrl: e.target.value }))} />
          </FormRow>
          <SubmitBtn onClick={addMat} color={G.gn}>+ ╨Ф╨Ю╨Ф╨Р╨в╨Ш ╨Э╨Р ╨б╨Ъ╨Ы╨Р╨Ф</SubmitBtn>
        </Card>}

        {isAdmin && <Card>
          <CardTitle color={G.cy}>тЬИ ╨Т╨Ж╨Ф╨Я╨а╨Р╨Т╨Ш╨в╨Ш ╨б╨Ъ╨Ы╨Р╨Ф ╨г TELEGRAM</CardTitle>
          <div style={{ color: G.t2, fontSize: 13, marginBottom: 16 }}>╨Ч╨│╨╡╨╜╨╡╤А╤Г╨▓╨░╤В╨╕ ╤В╨░ ╨▓╤Ц╨┤╨┐╤А╨░╨▓╨╕╤В╨╕ ╨┐╨╛╨▓╨╜╨╕╨╣ ╨╖╨▓╤Ц╤В ╨┐╤А╨╛ ╤Б╤В╨░╨╜ ╨│╨╗╨╛╨▒╨░╨╗╤М╨╜╨╛╨│╨╛ ╤Б╨║╨╗╨░╨┤╤Г ╨▒╨╛╤В╤Г.</div>
          <SubmitBtn color={G.cy} onClick={async () => {
            const lines = materials.map(m => `тАв ${m.name}: ${m.stock} ${m.unit} (╨╝╤Ц╨╜: ${m.minStock})`).join('\n')
            await sendTelegram(`ЁЯУж ╨Я╨╛╨▓╨╜╨╕╨╣ ╨╖╨▓╤Ц╤В ╨╖╤Ц ╤Б╨║╨╗╨░╨┤╤Г\n\n${lines}`)
            showToast('тЬУ ╨Ч╨▓╤Ц╤В ╨▓╤Ц╨┤╨┐╤А╨░╨▓╨╗╨╡╨╜╨╛ ╨▓ Telegram')
          }}>ЁЯУЭ ╨Т╨Ж╨Ф╨Я╨а╨Р╨Т╨Ш╨в╨Ш ╨Ч╨Т╨Ж╨в</SubmitBtn>
        </Card>}
      </>
    }

    // тФАтФА ╨Я╤Ц╨┤╤В╨░╨▒: ╨в╨╕╨┐╨╕ ╨▒╨░╤В╨░╤А╨╡╨╣ (╨║╨╛╨╜╤Д╤Ц╨│╤Г╤А╨░╤Ж╤Ц╤П) тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
    const TabTypes = () => {
      if (!isAdmin) return <div style={{ color: G.t2, fontSize: 13, padding: 20, textAlign: 'center' }}>╨Ф╨╛╤Б╤В╤Г╨┐╨╜╨╛ ╤В╤Ц╨╗╤М╨║╨╕ ╨░╨┤╨╝╤Ц╨╜╤Г</div>

      const editTm = (tmId, typeId, matId, field, oldVal) => openInput(
        field === 'perBattery' ? '╨Э╨░ 1 ╨░╨║╤Г╨╝╤Г╨╗╤П╤В╨╛╤А:' : '╨Ь╤Ц╨╜. ╨╖╨░╨┐╨░╤Б ╨┤╨╗╤П ╤Ж╤М╨╛╨│╨╛ ╤В╨╕╨┐╤Г:',
        String(oldVal), String(oldVal),
        async (val) => {
          closeModal()
          const parsed = parseFloat(val) || 0
          await api('updateTypeMaterial', [tmId, field, parsed])
          setTypeMaterials(prev => prev.map(tm => tm.id !== tmId ? tm : { ...tm, [field]: parsed }))
          showToast('тЬУ ╨Ю╨╜╨╛╨▓╨╗╨╡╨╜╨╛')
        }
      )

      const removeTm = (m) => openConfirm('╨Т╨╕╨┤╨░╨╗╨╕╤В╨╕ ╨┐╤А╨╕╨▓\'╤П╨╖╨║╤Г?',
        <span>╨Ь╨░╤В╨╡╤А╤Ц╨░╨╗ <b style={{ color: G.rd }}>{m.name}</b> ╨▒╤Ц╨╗╤М╤И╨╡ ╨╜╨╡ ╨▒╤Г╨┤╨╡ ╤Б╨┐╨╕╤Б╤Г╨▓╨░╤В╨╕╤Б╤М ╨┤╨╗╤П ╤Ж╤М╨╛╨│╨╛ ╤В╨╕╨┐╤Г. ╨Ч╤Ц ╤Б╨║╨╗╨░╨┤╤Г ╨╜╨╡ ╨▓╨╕╨┤╨░╨╗╤П╤Ф╤В╤М╤Б╤П.</span>,
        async () => {
          closeModal()
          await api('removeTypeMaterial', [m.id])
          setTypeMaterials(prev => prev.filter(tm => tm.id !== m.id))
          showToast('тЬУ ╨Я╤А╨╕╨▓\'╤П╨╖╨║╤Г ╨▓╨╕╨┤╨░╨╗╨╡╨╜╨╛')
        }
      )

      const addTm = async () => {
        if (!newTmMatId || !newTmPerBattery) return showToast("╨Ю╨▒╨╡╤А╤Ц╤В╤М ╨╝╨░╤В╨╡╤А╤Ц╨░╨╗ ╤Ц ╨▓╨║╨░╨╢╤Ц╤В╤М ╨╜╨╛╤А╨╝╤Г", 'err')
        const alreadyExists = typeMaterials.find(tm => tm.typeId === configTypeId && tm.matId === newTmMatId)
        if (alreadyExists) return showToast('╨ж╨╡╨╣ ╨╝╨░╤В╨╡╤А╤Ц╨░╨╗ ╨▓╨╢╨╡ ╤Ф ╨┤╨╗╤П ╨┤╨░╨╜╨╛╨│╨╛ ╤В╨╕╨┐╤Г', 'err')
        const gm = materials.find(m => m.id === newTmMatId)
        const pb = parseFloat(newTmPerBattery) || 0
        const ms = parseFloat(newTmMinStock) || 0
        const res = await api('addTypeMaterial', [configTypeId, newTmMatId, pb, ms])
        setTypeMaterials(prev => [...prev, { id: res.id, typeId: configTypeId, matId: gm.id, perBattery: pb, minStock: ms }])
        setNewTmPerBattery('')
        setNewTmMinStock('')
        showToast(`тЬУ ${gm.name} тЖТ ${configType.name}`)
      }

      const addBattType = () => openInput('╨Э╨╛╨▓╨╕╨╣ ╤В╨╕╨┐ ╨░╨║╤Г╨╝╤Г╨╗╤П╤В╨╛╤А╨░', '╨Э╨░╨╖╨▓╨░ ╤В╨╕╨┐╤Г (╨╜╨░╨┐╤А. 48V 20Ah)', '', async (name) => {
        closeModal()
        const res = await api('addBatteryType', [name])
        const newType = { id: res.id, name, color: G.or }
        setBatteryTypes(p => [...p, newType])
        setConfigTypeId(res.id)
        showToast('тЬУ ╨в╨╕╨┐ ╨┤╨╛╨┤╨░╨╜╨╛: ' + name)
      })

      return <>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}><TypeTabs types={batteryTypes} active={configTypeId} onSelect={setConfigTypeId} /></div>
          <button onClick={addBattType} style={{ background: G.b1, border: `1px solid ${G.b2}`, color: G.gn, padding: '10px 14px', borderRadius: 10, fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>+</button>
        </div>

        {configType && <>
          <div style={{ color: G.t2, fontSize: 12, marginBottom: 10, padding: '6px 10px', background: G.b1, borderRadius: 8 }}>
            ╨Ь╨░╤В╨╡╤А╤Ц╨░╨╗╨╕ ╨┤╨╗╤П <b style={{ color: configType.color || G.or }}>{configType.name}</b> тАФ ╤Й╨╛ ╤Ц ╤Б╨║╤Ц╨╗╤М╨║╨╕ ╨▓╨╕╤В╤А╨░╤З╨░╤Ф╤В╤М╤Б╤П ╨╜╨░ ╨╛╨┤╨╕╨╜ ╨░╨║╤Г╨╝╤Г╨╗╤П╤В╨╛╤А
          </div>

          {typeMaterials.filter(tm => tm.typeId === configTypeId).length === 0
            ? <Card><div style={{ color: G.t2, fontSize: 13, textAlign: 'center', padding: '10px 0' }}>╨Ь╨░╤В╨╡╤А╤Ц╨░╨╗╨╕ ╨╜╨╡ ╨╜╨░╨╗╨░╤И╤В╨╛╨▓╨░╨╜╨╛ тАФ ╨┤╨╛╨┤╨░╨╣╤В╨╡ ╨╜╨╕╨╢╤З╨╡</div></Card>
            : typeMaterials.filter(tm => tm.typeId === configTypeId).map(tm => {
              const gm = globalMat(tm.matId)
              return <div key={tm.matId} style={{ background: G.card, border: `1px solid ${G.b1}`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{gm?.name ?? '?'}</div>
                    <div style={{ fontSize: 11, color: G.t2, marginTop: 2 }}>╨Э╨░ ╤Б╨║╨╗╨░╨┤╤Ц: <b style={{ color: G.cy }}>{gm?.stock ?? '?'} {gm?.unit ?? ''}</b></div>
                  </div>
                  <button onClick={() => removeTm(tm)} style={{ background: '#450a0a', border: 'none', color: G.rd, padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>тЬХ</button>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                  <span onClick={() => editTm(tm.id, configTypeId, tm.matId, 'perBattery', tm.perBattery)} style={{ background: G.card2, border: `1px solid ${G.or}44`, borderRadius: 8, padding: '4px 10px', fontSize: 13, color: G.or, cursor: 'pointer', fontWeight: 600 }}>
                    ├Ч{tm.perBattery} {gm?.unit ?? ''}/╨░╨║╤Г╨╝
                  </span>
                  <span onClick={() => editTm(tm.id, configTypeId, tm.matId, 'minStock', tm.minStock)} style={{ background: G.card2, border: `1px solid ${G.b2}`, borderRadius: 8, padding: '4px 10px', fontSize: 12, color: G.t2, cursor: 'pointer' }}>
                    ╨╝╤Ц╨╜:{tm.minStock}
                  </span>
                </div>
              </div>
            })}

          <Card>
            <CardTitle color={G.gn}>+ ╨Ф╨Ю╨Ф╨Р╨в╨Ш ╨Ь╨Р╨в╨Х╨а╨Ж╨Р╨Ы ╨Ф╨Ю ╨в╨Ш╨Я╨г</CardTitle>
            <FormRow label="╨Ь╨Р╨в╨Х╨а╨Ж╨Р╨Ы ╨Ч╨Ж ╨б╨Ъ╨Ы╨Р╨Ф╨г">
              <select value={newTmMatId} onChange={e => setNewTmMatId(e.target.value)}>
                <option value="">тАФ ╨╛╨▒╨╡╤А╤Ц╤В╤М ╨╝╨░╤В╨╡╤А╤Ц╨░╨╗ тАФ</option>
                {materials.filter(m => !typeMaterials.find(tm => tm.typeId === configTypeId && tm.matId === m.id)).map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.stock} {m.unit})</option>
                ))}
              </select>
            </FormRow>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div><Label>╨Э╨Р 1 ╨Р╨Ъ╨г╨Ь╨г╨Ы╨п╨в╨Ю╨а</Label><input type="number" placeholder="╨╜╨░╨┐╤А. 48" value={newTmPerBattery} onChange={e => setNewTmPerBattery(e.target.value)} /></div>
              <div><Label>╨Ь╨Ж╨Э. ╨Ч╨Р╨Я╨Р╨б (╤В╤Г╤В)</Label><input type="number" placeholder="0" value={newTmMinStock} onChange={e => setNewTmMinStock(e.target.value)} /></div>
            </div>
            {newTmMatId && materials.find(m => m.id === newTmMatId) && (
              <div style={{ fontSize: 12, color: G.t2, marginTop: 8, padding: '6px 10px', background: G.b1, borderRadius: 8 }}>
                ╨Э╨░ ╤Б╨║╨╗╨░╨┤╤Ц: <b style={{ color: G.cy }}>{materials.find(m => m.id === newTmMatId)?.stock} {materials.find(m => m.id === newTmMatId)?.unit}</b>
              </div>
            )}
            <SubmitBtn onClick={addTm} color={G.gn}>+ ╨Я╨а╨Ш╨Т'╨п╨Ч╨Р╨в╨Ш ╨Ф╨Ю ╨в╨Ш╨Я╨г</SubmitBtn>
          </Card>
        </>}
      </>
    }


    // тФАтФА ╨Я╤Ц╨┤╤В╨░╨▒: ╨Ч╨▒╤Ц╤А╨║╨╕ тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
    const TabAssemblies = () => {
      if (!isAdmin) return <div style={{ color: G.t2, fontSize: 13, padding: 20, textAlign: 'center' }}>╨Ф╨╛╤Б╤В╤Г╨┐╨╜╨╛ ╤В╤Ц╨╗╤М╨║╨╕ ╨░╨┤╨╝╤Ц╨╜╤Г</div>

      const createAsm = async () => {
        if (!newAsmName || !newAsmOutMatId || !newAsmOutQty) return showToast("╨Э╨░╨╖╨▓╨░, ╨╝╨░╤В╨╡╤А╤Ц╨░╨╗ (╤А╨╡╨╖╤Г╨╗╤М╤В╨░╤В) ╤Ц ╨║╤Ц╨╗╤М╨║╤Ц╤Б╤В╤М тАФ ╨╛╨▒╨╛╨▓'╤П╨╖╨║╨╛╨▓╤Ц", 'err')

        const requiredComps = Object.keys(newAsmComps).map(mId => ({ matId: mId, qty: parseFloat(newAsmComps[mId]) || 0 })).filter(c => c.qty > 0)
        if (requiredComps.length < 2) return showToast("╨Ч╨▒╤Ц╤А╨║╨░ ╨┐╨╛╨▓╨╕╨╜╨╜╨░ ╨╝╤Ц╤Б╤В╨╕╤В╨╕ ╤Е╨╛╤З╨░ ╨▒ 2 ╨╝╨░╤В╨╡╤А╤Ц╨░╨╗╨╕", 'err')

        const gm = globalMat(newAsmOutMatId)
        const res = await api('addAssembly', [newAsmName, newAsmOutMatId, parseFloat(newAsmOutQty) || 1, gm?.unit || '', newAsmNotes])
        if (!res.ok) return showToast(res.error, 'err')

        await api('saveAssemblyComponents', [res.id, JSON.stringify(requiredComps)])
        const newComponents = requiredComps.map((c, i) => ({ id: 'ac_' + Date.now() + '_' + i, assemblyId: res.id, matId: c.matId, qty: c.qty }))

        const na = { id: res.id, name: newAsmName, outputMatId: newAsmOutMatId, outputQty: parseFloat(newAsmOutQty) || 1, unit: gm?.unit || '', notes: newAsmNotes, components: newComponents }

        setAssemblies(prev => [...prev, na])
        setNewAsmName(''); setNewAsmNotes(''); setNewAsmComps({})
        showToast('тЬУ ╨Ч╨▒╤Ц╤А╨║╤Г ╤Б╤В╨▓╨╛╤А╨╡╨╜╨╛: ' + newAsmName)
      }

      const deleteAsm = (a) => openConfirm('╨Т╨╕╨┤╨░╨╗╨╕╤В╨╕ ╨╖╨▒╤Ц╤А╨║╤Г?',
        <span>╨Т╨╕╨┤╨░╨╗╨╕╤В╤М <b style={{ color: G.rd }}>{a.name}</b> ╤Ц ╨▓╤Б╤Ц ╨║╨╛╨╝╨┐╨╛╨╜╨╡╨╜╤В╨╕</span>,
        async () => {
          closeModal()
          await api('deleteAssembly', [a.id])
          setAssemblies(prev => prev.filter(ax => ax.id !== a.id))
          if (editAsmId === a.id) setEditAsmId(null)
          showToast('тЬУ ╨Т╨╕╨┤╨░╨╗╨╡╨╜╨╛')
        })

      const startEditAsm = (a) => {
        const initial = {}
        a.components.forEach(ac => initial[ac.matId] = ac.qty)
        setEditAsmComps(initial)
        setEditAsmId(a.id)
      }

      const saveEditAsm = async (a) => {
        const mats = Object.keys(editAsmComps).map(matId => ({ matId, qty: parseFloat(editAsmComps[matId]) || 0 })).filter(c => c.qty > 0)
        if (mats.length < 2) return showToast('╨Ч╨▒╤Ц╤А╨║╨░ ╨┐╨╛╨▓╨╕╨╜╨╜╨░ ╨╝╤Ц╤Б╤В╨╕╤В╨╕ ╤Е╨╛╤З╨░ ╨▒ 2 ╨╝╨░╤В╨╡╤А╤Ц╨░╨╗╨╕', 'err')

        closeModal()
        // Use the new batch save API
        await api('saveAssemblyComponents', [a.id, JSON.stringify(mats)])

        // Update local state by removing old components and adding new ones
        setAssemblies(prev => prev.map(ax => {
          if (ax.id !== a.id) return ax
          const newComps = mats.map((m, i) => ({ id: 'ac_' + Date.now() + '_' + i, assemblyId: a.id, matId: m.matId, qty: m.qty }))
          return { ...ax, components: newComps }
        }))
        setEditAsmId(null)
        showToast('тЬУ ╨б╨║╨╗╨░╨┤ ╨╖╨▒╤Ц╤А╨║╨╕ ╨╖╨▒╨╡╤А╨╡╨╢╨╡╨╜╨╛')
      }

      const addComp = async () => { /* deprecated single add */ }
      const removeComp = (asmId, ac) => { /* deprecated single remove */ }
      const editCompQty = (asmId, ac) => { /* deprecated single edit */ }

      return <>
        {/* ╨б╨┐╨╕╤Б╨╛╨║ ╨╖╨▒╤Ц╤А╨╛╨║ */}
        {assemblies.map(a => {
          const gm = globalMat(a.outputMatId)
          const isEditing = editAsmId === a.id
          return <div key={a.id} style={{ background: G.card, border: `1px solid ${isEditing ? '#7c3aed' : G.b1}`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa' }}>{a.name}</div>
                <div style={{ fontSize: 12, color: G.t2, marginTop: 2 }}>
                  тЖТ <b style={{ color: G.cy }}>{a.outputQty}</b> {gm?.unit || a.unit} <b>{gm?.name || '?'}</b> ╨╜╨░ ╤Б╨║╨╗╨░╨┤╤Ц
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
                  {isEditing ? 'тЬУ ╨╖╨▒╨╡╤А╨╡╨│╤В╨╕' : 'тЬО ╤Б╨║╨╗╨░╨┤'}
                </button>
                {isEditing && <button onClick={() => setEditAsmId(null)} style={{ background: G.b1, border: `1px solid ${G.b2}`, color: G.t2, padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>тЬХ ╤Б╨║╨░╤Б╤Г╨▓╨░╤В╨╕</button>}
                {!isEditing && <button onClick={() => deleteAsm(a)} style={{ background: '#450a0a', border: 'none', color: G.rd, padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>тЬХ</button>}
              </div>
            </div>

            {/* View Mode */}
            {!isEditing && a.components.length > 0 && <div style={{ background: G.b1, borderRadius: 8, padding: '8px 10px' }}>
              {a.components.map(ac => {
                const cgm = globalMat(ac.matId)
                return <div key={ac.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 13 }}>
                  <span style={{ flex: 1, color: G.t1 }}>{cgm?.name || ac.matId}</span>
                  <span style={{ color: G.or, fontWeight: 600, background: G.card2, borderRadius: 6, padding: '2px 8px' }}>├Ч{ac.qty} {cgm?.unit || ''}</span>
                </div>
              })}
            </div>}

            {/* Edit Mode (Multi-Select List) */}
            {isEditing && <div style={{ borderTop: `1px solid ${G.b1}`, paddingTop: 10 }}>
              <div style={{ fontSize: 12, color: G.t2, marginBottom: 10 }}>╨Я╨╛╨╖╨╜╨░╤З╤В╨╡ ╨╝╨░╤В╨╡╤А╤Ц╨░╨╗╨╕, ╨╖ ╤П╨║╨╕╤Е ╤Б╨║╨╗╨░╨┤╨░╤Ф╤В╤М╤Б╤П ╤Ж╤П ╨╖╨▒╤Ц╤А╨║╨░:</div>
              {materials.map(m => {
                const checked = editAsmComps.hasOwnProperty(m.id)
                const qty = checked ? (editAsmComps[m.id] ?? '') : ''
                return <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${G.b1}`, fontSize: 13 }}>
                  <input type="checkbox" checked={checked} onChange={e => {
                    const chk = e.target.checked
                    setEditAsmComps(v => {
                      const next = { ...v }
                      if (chk) next[m.id] = 1
                      else delete next[m.id]
                      return next
                    })
                  }} style={{ width: 18, height: 18, accentColor: '#a78bfa', cursor: 'pointer', flexShrink: 0 }} />
                  <div style={{ flex: 1, color: checked ? G.t1 : G.t2 }}>{m.name}</div>
                  {checked && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="number" min="0" step="any" value={qty} onChange={e => setEditAsmComps(v => ({ ...v, [m.id]: e.target.value }))} style={{ width: 70, border: `2px solid #a78bfa`, background: '#2e1065', color: G.t1, fontWeight: 'bold', textAlign: 'center', padding: '4px' }} placeholder="╨║╤Ц╨╗╤М╨║╤Ц╤Б╤В╤М" />
                    <span style={{ color: G.t2, fontSize: 12, width: 24 }}>{m.unit}</span>
                  </div>}
                </div>
              })}
            </div>}
          </div>
        })}

        {/* ╨д╨╛╤А╨╝╨░ ╨╜╨╛╨▓╨╛╤Ч ╨╖╨▒╤Ц╤А╨║╨╕ */}
        <Card>
          <CardTitle color='#a78bfa'>+ ╨Э╨Ю╨Т╨Р ╨Ч╨С╨Ж╨а╨Ъ╨Р</CardTitle>
          <FormRow label="╨Э╨Р╨Ч╨Т╨Р ╨Ч╨С╨Ж╨а╨Ъ╨Ш"><input placeholder="╨╜╨░╨┐╤А. ╨Ю╨▒╨╢╨░╤В╨╕╨╣ ╨║╨░╨▒╨╡╨╗╤М XT90" value={newAsmName} onChange={e => setNewAsmName(e.target.value)} /></FormRow>
          <div style={{ padding: '10px 0' }}>
            <div style={{ fontSize: 12, color: G.t2, marginBottom: 10, fontWeight: 'bold' }}>╨Ъ╨Ю╨Ь╨Я╨Ю╨Э╨Х╨Э╨в╨Ш ╨Ч╨С╨Ж╨а╨Ъ╨Ш (╨▓╤Ц╨┤╨╝╤Ц╤В╤М╤В╨╡, ╨╖ ╤З╨╛╨│╨╛ ╨▓╨╛╨╜╨░ ╤Б╨║╨╗╨░╨┤╨░╤Ф╤В╤М╤Б╤П):</div>
            <div style={{ maxHeight: 240, overflowY: 'auto', border: `1px solid ${G.b1}`, borderRadius: 8, padding: 8, background: 'rgba(0,0,0,0.2)' }}>
              {materials.map(m => {
                const checked = newAsmComps.hasOwnProperty(m.id)
                const qty = checked ? (newAsmComps[m.id] ?? '') : ''
                return <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: `1px solid ${G.b1}`, fontSize: 13 }}>
                  <input type="checkbox" checked={checked} onChange={e => {
                    const chk = e.target.checked
                    setNewAsmComps(v => {
                      const next = { ...v }
                      if (chk) next[m.id] = 1
                      else delete next[m.id]
                      return next
                    })
                  }} style={{ width: 16, height: 16, accentColor: '#a78bfa', cursor: 'pointer', flexShrink: 0 }} />
                  <div style={{ flex: 1, color: checked ? G.t1 : G.t2 }}>{m.name}</div>
                  {checked && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="number" min="0" step="any" value={qty} onChange={e => setNewAsmComps(v => ({ ...v, [m.id]: e.target.value }))} style={{ width: 80, border: `2px solid #a78bfa`, background: '#2e1065', color: G.t1, fontWeight: 'bold', textAlign: 'center', padding: '4px', fontSize: 13 }} placeholder="╨║╤Ц╨╗╤М╨║." />
                    <span style={{ color: G.t2, fontSize: 12, width: 24 }}>{m.unit}</span>
                  </div>}
                </div>
              })}
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${G.b1}`, marginTop: 10, paddingTop: 16 }}>
            <div style={{ fontSize: 15, color: G.or, marginBottom: 10, fontWeight: 'bold' }}>тЮФ ╨а╨Х╨Ч╨г╨Ы╨м╨в╨Р╨в ╨Т╨Ш╨а╨Ю╨С╨Э╨Ш╨ж╨в╨Т╨Р</div>
            <div style={{ fontSize: 12, color: G.t2, marginBottom: 10 }}>╨й╨╛ ╤Б╨░╨╝╨╡ ╨▒╤Г╨┤╨╡ ╨┤╨╛╨┤╨░╨╜╨╛ ╨╜╨░ ╤Б╨║╨╗╨░╨┤, ╨║╨╛╨╗╨╕ ╨┐╤А╨░╤Ж╤Ц╨▓╨╜╨╕╨║ "╨▓╨╕╨│╨╛╤В╨╛╨▓╨╕╤В╤М" ╤Ж╤О ╨╖╨▒╤Ц╤А╨║╤Г?</div>
            <FormRow label="╨У╨╛╤В╨╛╨▓╨╕╨╣ ╨╝╨░╤В╨╡╤А╤Ц╨░╨╗ (╤А╨╡╨╖╤Г╨╗╤М╤В╨░╤В)">
              <select value={newAsmOutMatId} onChange={e => setNewAsmOutMatId(e.target.value)}>
                <option value="">-- ╨╛╨▒╨╡╤А╤Ц╤В╤М ╤Й╨╛ ╨▓╨╕╤А╨╛╨▒╨╗╤П╤Ф╤В╤М╤Б╤П --</option>
                {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </FormRow>
            <FormRow label="╨Ъ╤Ц╨╗╤М╨║╤Ц╤Б╤В╤М ╨│╨╛╤В╨╛╨▓╨╛╨│╨╛ ╨▓╨╕╤А╨╛╨▒╤Г (╨╖╨░╨╖╨▓╨╕╤З╨░╨╣ 1)">
              <input type="number" placeholder="1" value={newAsmOutQty} onChange={e => setNewAsmOutQty(e.target.value)} />
            </FormRow>
            <FormRow label="╨Э╨╛╤В╨░╤В╨║╨░ ╨┤╨╗╤П ╨┐╤А╨░╤Ж╤Ц╨▓╨╜╨╕╨║╨░"><input placeholder="╨╜╨░╨┐╤А. ╤Ц╨╜╤Б╤В╤А╤Г╨║╤Ж╤Ц╤П ╤Й╨╛╨┤╨╛ ╨┐╨░╨╣╨║╨╕" value={newAsmNotes} onChange={e => setNewAsmNotes(e.target.value)} /></FormRow>
            <SubmitBtn onClick={createAsm} color='#a78bfa'>+ ╨Ч╨С╨Х╨а╨Х╨У╨в╨Ш ╨Ч╨С╨Ж╨а╨Ъ╨г ╨в╨Р ╨З╨З ╨б╨Ъ╨Ы╨Р╨Ф</SubmitBtn>
          </div>
        </Card>
      </>
    }

    return <>
      <SubTabs tabs={[['materials', 'ЁЯУж ╨Ь╨Р╨в╨Х╨а╨Ж╨Р╨Ы╨Ш'], ['types', 'ЁЯФЛ ╨в╨Ш╨Я╨Ш ╨С╨Р╨в╨Р╨а╨Х╨Щ'], ['assemblies', 'тЪЩя╕П ╨Ч╨С╨Ж╨а╨Ъ╨Ш']]} active={stockTab} onChange={setStockTab} />
      {stockTab === 'materials' ? TabMaterials() : stockTab === 'types' ? TabTypes() : TabAssemblies()}
    </>
  }
  // тФАтФА ╨а╨╡╨╝╨╛╨╜╤В тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
  const PageRepair = () => {
    const serial = repairSerial
    const found = serial ? log.find(l => l.serials?.includes(serial)) : null
    const repType = found ? batteryTypes.find(t => t.id === found.typeId) : null
    const doSearch = () => {
      const s = repairSearch.trim()
      if (s) {
        const pending = repairLog.find(r => r.serial === s && r.status !== 'completed')
        if (pending) {
          showToast(`тЪа ╨Р╨║╤Г╨╝╤Г╨╗╤П╤В╨╛╤А ${s} ╨▓╨╢╨╡ ╨▓ ╨╛╤З╤Ц╨║╤Г╨▓╨░╨╜╨╜╤Ц ╤А╨╡╨╝╨╛╨╜╤В╤Г!`, 'err')
          return // block proceeding
        }
      }
      setRepairSerial(s)
    }


    const handleRegisterArrival = () => {
      if (!repType) return
      const entry = { id: uid(), datetime: nowStr(), date: repDate, serial, typeName: repType.name, typeId: repType.id, originalWorker: found.workerName, repairWorker: '', note: repNote, materials: [], status: 'pending' }
      doSubmitRepair(entry)
    }

    const handleManualRegister = () => {
      const t = batteryTypes.find(t => t.id === manTypeId)
      const w = workers.find(w => w.id === manWorkerId)
      const entry = { id: uid(), datetime: nowStr(), date: manDate, typeId: manTypeId, typeName: t?.name || '', workerName: w?.name || '', count: 1, serials: [serial], consumed: [], kind: 'production', repairNote: '' }
      setLog(prev => [entry, ...prev])
      showToast('тЬУ ╨Ч╨░╤А╨╡╤Ф╤Б╤В╤А╨╛╨▓╨░╨╜╨╛ ' + serial)
    }

    const startCompleting = (r) => {
      setCompletingId(r.id)
      setCompWorker(r.repairWorker || repWorker || workers[0]?.id)
      setCompDate(todayStr())
      setCompNote('')
      const initialChecks = {}
      const initialQtys = {}
      typeMaterials.filter(tm => tm.typeId === r.typeId).forEach(tm => {
        initialChecks[tm.matId] = false
        initialQtys[tm.matId] = tm.perBattery
      })
      setCompChecks(initialChecks)
      setCompQtys(initialQtys)
    }

    const confirmComplete = async (r) => {
      // Collect materials
      const cw = workers.find(w => w.id === compWorker)
      const repTms = typeMaterials.filter(tm => tm.typeId === r.typeId)
      const mats = repTms.map(tm => {
        const gm = globalMat(tm.matId)
        return { matId: tm.matId, matName: gm?.name ?? '', unit: gm?.unit ?? '', qty: parseFloat(compQtys[tm.matId] ?? tm.perBattery) || 0, selected: compChecks[tm.matId] !== false }
      })

      const err = mats.filter(m => m.selected && m.qty > 0).find(m => {
        const gm = globalMat(m.matId)
        return gm && gm.stock < m.qty
      })
      if (err) return showToast('╨Э╨╡ ╨▓╨╕╤Б╤В╨░╤З╨░╤Ф ╨╜╨░ ╤Б╨║╨╗╨░╨┤╤Ц: ' + err.matName, 'err')

      openConfirm('╨Ч╨░╨▓╨╡╤А╤И╨╕╤В╨╕ ╤А╨╡╨╝╨╛╨╜╤В?', '╨С╤Г╨┤╤Г╤В╤М ╤Б╨┐╨╕╤Б╨░╨╜╤Ц ╨╝╨░╤В╨╡╤А╤Ц╨░╨╗╨╕ ╤В╨░ ╨╛╨╜╨╛╨▓╨╗╨╡╨╜╨╛ ╤Б╤В╨░╤В╤Г╤Б.', async () => {
        closeModal()
        try {
          const res = await api('updateRepairStatus', [r.id, 'completed', compDate, cw?.name || '', compressMats(mats), compNote])
          if (!res.ok) throw new Error(res.error)

          mats.forEach(m => { if (m.selected && m.qty > 0) updateGlobalStock(m.matId, -m.qty) })
          setRepairLog(prev => prev.map(rx => {
            if (rx.id !== r.id) return rx
            const curNote = String(rx.note || '')
            let fullAppend = ""
            if (compNote) fullAppend += compNote
            if (compDate) fullAppend += (fullAppend ? ' | ' : '') + '╨Ч╨░╨▓╨╡╤А╤И╨╡╨╜╨╛: ' + compDate
            const newNote = curNote + (curNote ? ' | ' : '') + fullAppend

            // update local repair materials array too
            const curMats = rx.materials || []
            const newMats = curMats.concat(mats.filter(m => m.selected && m.qty > 0))
            return { ...rx, status: 'completed', note: newNote, repairWorker: cw?.name || '', materials: newMats }
          }))

          if (res.consumed && res.consumed.length > 0) {
            setLog(prev => [{
              id: r.id + '_C', datetime: nowStr(), date: compDate, typeId: r.typeId, typeName: r.typeName,
              workerName: cw?.name || rx.repairWorker, count: 0, serials: [r.serial], consumed: res.consumed,
              kind: 'repair', repairNote: '╨Ч╨░╨▓╨╡╤А╤И╨╡╨╜╨╛ ╤А╨╡╨╝╨╛╨╜╤В: ' + r.serial
            }, ...prev])
          }

          setCompletingId(null)
          showToast('тЬУ ╨а╨╡╨╝╨╛╨╜╤В ╤Г╤Б╨┐╤Ц╤И╨╜╨╛ ╨╖╨░╨▓╨╡╤А╤И╨╡╨╜╨╛')
        } catch (e) {
          showToast(e.message || '╨Я╨╛╨╝╨╕╨╗╨║╨░', 'err')
        }
      })
    }

    const returnAll = (r) => openConfirm('╨Я╨╛╨▓╨╡╤А╨╜╤Г╤В╨╕ ╨▓╤Б╤Ц ╨╝╨░╤В╨╡╤А╤Ц╨░╨╗╨╕?', '╨Я╨╛╨▓╨╡╤А╨╜╤Г╤В╤М╤Б╤П ╨╜╨░ ╤Б╨║╨╗╨░╨┤.', async () => {
      closeModal()
      await api('returnRepairMaterials', [r.id, null])
      r.materials.filter(m => m.selected && m.qty > 0).forEach(m => updateGlobalStock(m.matId, m.qty))
      showToast('тЬУ ╨Ь╨░╤В╨╡╤А╤Ц╨░╨╗╨╕ ╨┐╨╛╨▓╨╡╤А╨╜╤Г╤В╨╛')
    })

    const deleteRep = (r) => openConfirm('╨Т╨╕╨┤╨░╨╗╨╕╤В╨╕ ╨╖╨░╨┐╨╕╤Б?', '╨Ь╨░╤В╨╡╤А╤Ц╨░╨╗╨╕ ╨Э╨Х ╨┐╨╛╨▓╨╡╤А╨╜╤Г╤В╤М╤Б╤П ╨╜╨░ ╤Б╨║╨╗╨░╨┤.', async () => {
      closeModal()
      await api('deleteRepair', [r.id])
      setRepairLog(prev => prev.filter(rx => String(rx.id) !== String(r.id)))
      showToast('тЬУ ╨Т╨╕╨┤╨░╨╗╨╡╨╜╨╛')
    })

    return wrap(<>
      <SubTabs tabs={[['new', 'ЁЯФз ╨Э╨Ю╨Т╨Ш╨Щ'], ['log', `ЁЯУЛ ╨Ч╨Р╨Я╨Ш╨б╨Ш (${repairLog.length})`], ['bms', 'ЁЯТФ ╨Ч╨Ы╨Р╨Ь╨Р╨Э╨Ж BMS']]} active={repTab} onChange={setRepTab} />
      {repTab === 'new' && <>
        <Card>
          <CardTitle color='#fb923c'>ЁЯФз ╨а╨Х╨Д╨б╨в╨а╨Р╨ж╨Ж╨п ╨а╨Х╨Ь╨Ю╨Э╨в╨г</CardTitle>
          <FormRow label="╨б╨Х╨а╨Ж╨Щ╨Э╨Ш╨Щ ╨Э╨Ю╨Ь╨Х╨а">
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={repairSearch} onChange={e => setRepairSearch(e.target.value)} placeholder="╨╜╨░╨┐╤А. SK-2026-001" onKeyDown={e => e.key === 'Enter' && doSearch()} />
              <button onClick={doSearch} style={{ padding: '8px 14px', background: G.b1, border: `1px solid ${G.b2}`, color: G.t1, borderRadius: 8, fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>ЁЯФН</button>
            </div>
          </FormRow>
        </Card>

        {serial && found && repType && <Card style={{ borderColor: G.gn }}>
          <div style={{ color: G.gn, fontSize: 12, marginBottom: 12 }}>тЬУ ╨Ч╨╜╨░╨╣╨┤╨╡╨╜╨╛: {found.typeName} ┬╖ <span style={{ color: getWorkerColor(found.workerName), fontWeight: 600 }}>{found.workerName}</span> ┬╖ {found.date}</div>
          <FormRow label="╨Ф╨Р╨в╨Р ╨Я╨а╨Ш╨Щ╨Ю╨Ь╨Ъ╨Ш"><input value={repDate} onChange={e => setRepDate(e.target.value)} /></FormRow>
          <FormRow label="╨Ю╨Я╨Ш╨б ╨Э╨Х╨б╨Я╨а╨Р╨Т╨Э╨Ю╨б╨в╨Ж / ╨Э╨Ю╨в╨Р╨в╨Ъ╨Р"><input value={repNote} onChange={e => setRepNote(e.target.value)} placeholder="╨╜╨░╨┐╤А. ╨╜╨╡ ╨╖╨░╤А╤П╨┤╨╢╨░╤Ф╤В╤М╤Б╤П" /></FormRow>
          <SubmitBtn onClick={handleRegisterArrival} color='#ea580c'>ЁЯФз ╨Я╨а╨Ш╨Щ╨Э╨п╨в╨Ш ╨Т ╨а╨Х╨Ь╨Ю╨Э╨в</SubmitBtn>
        </Card>}

        {serial && !found && <Card style={{ borderColor: G.yw }}>
          <div style={{ color: G.yw, fontSize: 13, marginBottom: 12 }}>тЪа ╨Р╨║╤Г╨╝╤Г╨╗╤П╤В╨╛╤А ╨╜╨╡ ╨╖╨╜╨░╨╣╨┤╨╡╨╜╨╛ тАФ ╨╖╨░╤А╨╡╤Ф╤Б╤В╤А╤Г╨╣╤В╨╡ ╨▓╤А╤Г╤З╨╜╤Г</div>
          <FormRow label="╨в╨Ш╨Я ╨Р╨Ъ╨г╨Ь╨г╨Ы╨п╨в╨Ю╨а╨Р">
            <select value={manTypeId} onChange={e => setManTypeId(e.target.value)}>
              {batteryTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </FormRow>
          <FormRow label="╨Т╨Ш╨а╨Ю╨С╨Э╨Ш╨Ъ">
            <select value={manWorkerId} onChange={e => setManWorkerId(e.target.value)}>
              {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </FormRow>
          <FormRow label="╨Ф╨Р╨в╨Р ╨Т╨Ш╨а╨Ю╨С╨Э╨Ш╨ж╨в╨Т╨Р">
            <input value={manDate} onChange={e => setManDate(e.target.value)} placeholder="╨┤╨┤.╨╝╨╝.╤А╤А╤А╤А" />
          </FormRow>
          <SubmitBtn color={G.yw} onClick={handleManualRegister}>+ ╨Ч╨Р╨а╨Х╨Д╨б╨в╨а╨г╨Т╨Р╨в╨Ш</SubmitBtn>
        </Card>}
      </>}

      {repTab === 'log' && (repairLog.length === 0 ? <Center>╨а╨╡╨╝╨╛╨╜╤В╤Ц╨▓ ╨╜╨╡╨╝╨░╤Ф</Center> :
        repairLog.map(r => <div key={r.id} style={{ background: G.card, border: `1px solid ${G.b1}`, borderLeft: `3px solid ${r.status === 'completed' ? '#22c55e' : '#fb923c'}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700 }}>{r.serial}</span>
                {r.status !== 'completed' ? <Chip bg='#4a1804' color='#fb923c' bd='#9a3412'>╨Ю╨з╨Ж╨Ъ╨г╨Д</Chip> : <Chip bg='#052e16' color='#22c55e' bd='#166534'>╨У╨Ю╨в╨Ю╨Т╨Ю</Chip>}
              </div>
              <div style={{ fontSize: 12, color: G.t2 }}>{r.typeName}</div>
            </div>
            <span style={{ fontSize: 11, color: G.t2 }}>{r.datetime}</span>
          </div>
          {r.note && <div style={{ fontSize: 12, color: '#fb923c', marginBottom: 5 }}>ЁЯУЭ {r.note}</div>}
          {r.repairWorker && <div style={{ fontSize: 12, color: G.t2, marginBottom: 8 }}>╨а╨╡╨╝╨╛╨╜╤В╤Г╨▓╨░╨▓: <span style={{ color: getWorkerColor(r.repairWorker), fontWeight: 600 }}>{r.repairWorker}</span></div>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: r.status === 'completed' ? 8 : 0 }}>
            {(r.materials || []).filter(m => m.selected && m.qty > 0).map((m, i) =>
              <Chip key={i} bg={G.b1} color={G.t2} bd={G.b2}>{m.matName} ├Ч{m.qty}</Chip>)}
          </div>

          {completingId === r.id ? <div style={{ borderTop: `1px solid ${G.b1}`, paddingTop: 10, marginTop: 10 }}>
            <FormRow label="╨Ф╨Р╨в╨Р ╨Ч╨Р╨Т╨Х╨а╨и╨Х╨Э╨Э╨п"><input value={compDate} onChange={e => setCompDate(e.target.value)} /></FormRow>
            <FormRow label="╨а╨Х╨Ь╨Ю╨Э╨в╨г╨Т╨Р╨Т ╨Ъ╨Ю╨Э╨в╨а╨Р╨Ъ╨в╨Э╨Ш╨Ъ">
              <select value={compWorker} onChange={e => setCompWorker(e.target.value)}>
                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </FormRow>
            <FormRow label="╨Т╨Ш╨в╨а╨Р╨з╨Х╨Э╨Ж ╨Ь╨Р╨в╨Х╨а╨Ж╨Р╨Ы╨Ш">
              {typeMaterials.filter(tm => tm.typeId === r.typeId).map(tm => {
                const gm = globalMat(tm.matId)
                if (!gm) return null
                const checked = compChecks[tm.matId] !== false
                const qty = compQtys[tm.matId] ?? tm.perBattery
                const ok = !checked || !qty || gm.stock >= (parseFloat(qty) || 0)
                return <div key={tm.matId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${G.b1}`, fontSize: 13 }}>
                  <input type="checkbox" checked={checked} onChange={e => setCompChecks(v => ({ ...v, [tm.matId]: e.target.checked }))} style={{ width: 18, height: 18, accentColor: G.or, cursor: 'pointer', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: checked ? G.t1 : G.t2 }}>{gm.name}</div>
                    <div style={{ fontSize: 11, color: ok ? G.t2 : G.rd }}>╤Б╨║╨╗╨░╨┤: {gm.stock} {gm.unit}</div>
                  </div>
                  <input type="number" value={qty} onChange={e => setCompQtys(v => ({ ...v, [tm.matId]: e.target.value }))} style={{ width: 70, border: `1px solid ${ok ? G.b2 : G.rd}`, textAlign: 'center' }} />
                  <span style={{ color: G.t2, fontSize: 11, width: 32, flexShrink: 0 }}>{gm.unit}</span>
                </div>
              })}
            </FormRow>
            <FormRow label="╨Ф╨Ю╨Ф╨Р╨в╨Ш ╨Э╨Ю╨в╨Р╨в╨Ъ╨г (╨╜╨╡╨╛╨▒╨╛╨▓'╤П╨╖╨║╨╛╨▓╨╛)"><input value={compNote} onChange={e => setCompNote(e.target.value)} placeholder="╨╜╨░╨┐╤А. ╨╖╨░╨╝╤Ц╨╜╨╡╨╜╨╛ BMS" /></FormRow>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => confirmComplete(r)} style={{ flex: 1, padding: '8px', background: '#166534', color: G.gn, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>тЬУ ╨Ч╨Р╨Т╨Х╨а╨и╨Ш╨в╨Ш ╨а╨Х╨Ь╨Ю╨Э╨в</button>
              <button onClick={() => setCompletingId(null)} style={{ padding: '8px 12px', background: G.b1, color: G.t2, border: `1px solid ${G.b2}`, borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>╨б╨║╨░╤Б╤Г╨▓╨░╤В╨╕</button>
            </div>
          </div> : null}

          {!completingId && <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {r.status !== 'completed' && <button onClick={() => startCompleting(r)} style={{ flex: 2, padding: '6px 0', background: '#4c1d95', color: '#a78bfa', border: `1px solid #7c3aed`, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>тЬУ ╨Ч╨░╨▓╨╡╤А╤И╨╕╤В╨╕</button>}
            {r.status === 'completed' && <button onClick={() => returnAll(r)} style={{ flex: 1, padding: '6px 0', background: '#052e16', color: G.gn, border: `1px solid #166534`, borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>тЖй ╨Я╨╛╨▓╨╡╤А╨╜╤Г╤В╨╕</button>}
            {isAdmin && <button onClick={() => deleteRep(r)} style={{ padding: '6px 10px', background: '#450a0a', border: 'none', color: G.rd, borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>тЬХ</button>}
          </div>}
        </div>)
      )}

      {repTab === 'bms' && (() => {
        const bmsReps = repairLog.filter(r => r.status === 'completed' && (r.note || '').toLowerCase().includes('bms'))
        if (bmsReps.length === 0) return <Center>╨Э╨╡╨╝╨░╤Ф ╨╖╨░╨┐╨╕╤Б╤Ц╨▓ ╨╖ ╨┐╨╛╨╗╨╛╨╝╨░╨╜╨╕╨╝╨╕ BMS</Center>
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
          <div style={{ fontSize: 13, color: '#ef4444', marginBottom: 5 }}>ЁЯУЭ {r.note}</div>
          {r.repairWorker && <div style={{ fontSize: 12, color: G.t2, marginBottom: 8 }}>╨а╨╡╨╝╨╛╨╜╤В╤Г╨▓╨░╨▓: <span style={{ color: getWorkerColor(r.repairWorker), fontWeight: 600 }}>{r.repairWorker}</span></div>}
        </div>)
      })()}
    </>)
  }

  // тФАтФА ╨Ц╤Г╤А╨╜╨░╨╗ тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
  const PageLog = () => wrap(
    log.length === 0 ? <Center>╨Ц╤Г╤А╨╜╨░╨╗ ╨┐╨╛╤А╨╛╨╢╨╜╤Ц╨╣</Center> :
      log.slice(0, 120).map(e => {
        const t = batteryTypes.find(t => t.id === e.typeId)
        const isPrepEntry = e.kind === 'prep'
        const color = isPrepEntry ? G.pu : e.kind === 'repair' ? '#fb923c' : (t?.color || G.or)
        const icon = isPrepEntry ? 'ЁЯУж' : e.kind === 'repair' ? 'ЁЯФз' : 'ЁЯФЛ'
        // ╨б╤В╨░╤В╤Г╤Б ╨▓╨╕╨┤╨░╤З╤Ц: ╤З╨╕ ╤Й╨╡ ╨░╨║╤В╨╕╨▓╨╜╨░ ╤Е╨╛╤З╨░ ╨▒ ╨╛╨┤╨╜╨░ ╨┐╨╛╨╖╨╕╤Ж╤Ц╤П?
        const prepActive = isPrepEntry && e.prepIds && e.prepIds.length > 0
          ? e.prepIds.some(pid => {
              const p = prepItems.find(x => String(x.id) === String(pid))
              return p && p.status !== 'returned'
            })
          : false
        return <div key={e.id} style={{ background: G.card, border: `1px solid ${G.b1}`, borderRadius: 12, padding: 12, marginBottom: 8, borderLeft: `3px solid ${color}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
            <div>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700 }}>{icon} {isPrepEntry ? (e.repairNote || e.typeName) : e.typeName}</span>
              {!isPrepEntry && e.count > 0 && <span style={{ color: G.or, fontSize: 13, marginLeft: 6 }}>├Ч {e.count}</span>}
              <div style={{ fontSize: 12, color: getWorkerColor(e.workerName), fontWeight: 600 }}>{e.workerName}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <span style={{ fontSize: 11, color: G.t2, flexShrink: 0 }}>{e.datetime}</span>
              {isPrepEntry && (
                prepActive
                  ? <Chip bg='#1e1b4b' color='#a78bfa' bd='#3730a3'>ЁЯУж ╨╜╨░ ╤А╤Г╨║╨░╤Е</Chip>
                  : <Chip bg={G.b1} color={G.t2} bd={G.b2}>тЬУ ╤Б╨┐╨╕╤Б╨░╨╜╨╛</Chip>
              )}
            </div>
          </div>
          {e.serials?.length > 0 && <div style={{ fontSize: 12, color: G.cy, marginBottom: 5, wordBreak: 'break-all' }}>{e.serials.join(', ')}</div>}
          {!isPrepEntry && e.repairNote && <div style={{ fontSize: 12, color: '#fb923c', marginBottom: 5 }}>ЁЯУЭ {e.repairNote}</div>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {(e.consumed || []).map((c, i) => <span key={i} style={{ background: G.b1, border: `1px solid ${G.b2}`, borderRadius: 6, padding: '2px 8px', fontSize: 11, color: G.t2 }}>{c.name} ├Ч{c.amount}</span>)}
          </div>
        </div>
      })
  )

  // тФАтФА ╨Ч╨░╨║╤Г╨┐╤Ц╨▓╨╗╤П тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
  const PageShopping = () => {
    const lowMats = materials.filter(m => {
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
      if (itemsToSend.length === 0) return showToast('╨б╨║╨╗╨░╨┤ ╨┐╤Г╤Б╤В╨╕╨╣!', 'err')
      const lines = itemsToSend.map(m => {
        const perBattery = perBatteryByMat[m.id] || 0
        const monthNeed = perBattery > 0 ? +(perBattery * perDay * 30).toFixed(2) : (m.minStock || 0)
        const toOrder = Math.max(0, +(monthNeed - m.stock).toFixed(2))
        const link = m.shopUrl ? `\n  ЁЯФЧ ${m.shopUrl}` : ''
        const orderedText = m.isOrdered ? ' [тЬЕ ╨Т╨╢╨╡ ╨╖╨░╨╝╨╛╨▓╨╗╨╡╨╜╨╛]' : ''
        return `тАв ${m.name}${orderedText}: ${m.stock} ${m.unit} (╨╝╤Ц╨╜: ${m.minStock}) ┬╖ ╨┐╨╛╤В╤А╤Ц╨▒╨╜╨╛/╨╝╤Ц╤Б: ${monthNeed} ┬╖ ╨┤╨╛╨║╤Г╨┐╨╕╤В╨╕: ${toOrder}${link}`
      }).join('\n')
      await sendTelegram(`ЁЯЫТ ZmiyCell тАФ ╨Ч╨░╨║╤Г╨┐╤Ц╨▓╨╗╤П (${lowMats.length > 0 ? '╨Ф╨╡╤Д╤Ц╤Ж╨╕╤В' : '╨Т╤Б╤Ц'})\n\n${lines}`)
      showToast('тЬУ ╨Т╤Ц╨┤╨┐╤А╨░╨▓╨╗╨╡╨╜╨╛ ╨▓ Telegram')
      for (const m of lowMats) { if (!m.isOrdered) await setOrdered(m, true) }
    }

    const sendToTgAll = async () => {
      if (materials.length === 0) return showToast('╨б╨║╨╗╨░╨┤ ╨┐╤Г╤Б╤В╨╕╨╣!', 'err')
      const lines = materials.map(m => {
        const perBattery = perBatteryByMat[m.id] || 0
        const toOrder = Math.max(0, +(((perBattery > 0 ? perBattery * perDay * 30 : m.minStock) || 0) - m.stock).toFixed(2))
        const status = m.isOrdered ? 'тЬЕ' : (m.stock <= 0 ? 'ЁЯФ┤' : m.stock <= m.minStock ? 'ЁЯЯб' : 'ЁЯЯв')
        return `${status} ${m.name}: ${m.stock} ${m.unit}${toOrder > 0 ? ` ┬╖ ╨┤╨╛╨║╤Г╨┐╨╕╤В╨╕: ${toOrder}` : ''}`
      }).join('\n')
      await sendTelegram(`ЁЯУЛ ZmiyCell тАФ ╨Т╨╡╤Б╤М ╤Б╨║╨╗╨░╨┤ (${materials.length} ╨┐╨╛╨╖╨╕╤Ж╤Ц╨╣)\n\n${lines}`)
      showToast('тЬУ ╨Т╤Ц╨┤╨┐╤А╨░╨▓╨╗╨╡╨╜╨╛ ╨▓ Telegram')
    }

    return wrap(<>
      <Card>
        <CardTitle color={G.pu}>ЁЯЫТ ╨б╨Я╨Ш╨б╨Ю╨Ъ ╨Ч╨Р╨Ъ╨г╨Я╨Ж╨Т╨Ы╨Ж</CardTitle>
        <div style={{ color: G.t2, fontSize: 13, marginBottom: 16 }}>╨Ь╨░╤В╨╡╤А╤Ц╨░╨╗╨╕ ╨╜╨╕╨╢╤З╨╡ ╨╝╤Ц╨╜╤Ц╨╝╨░╨╗╤М╨╜╨╛╨│╨╛ ╨╖╨░╨┐╨░╤Б╤Г.</div>
        {lowMats.length === 0 ? <Center>╨Т╤Б╤Ц ╨╝╨░╤В╨╡╤А╤Ц╨░╨╗╨╕ ╨▓ ╨╜╨╛╤А╨╝╤Ц</Center> :
          lowMats.map(m => {
            const ordered = !!m.isOrdered
            const perBattery = perBatteryByMat[m.id] || 0
            const monthNeed = perBattery > 0 ? +(perBattery * perDay * 30).toFixed(2) : (m.minStock || 0)
            const toOrder = Math.max(0, +(monthNeed - m.stock).toFixed(2))
            return <div key={m.id} style={{ background: ordered ? G.card : G.card2, border: `1px solid ${G.b1}`, borderRadius: 10, padding: 12, marginBottom: 8, borderLeft: `3px solid ${ordered ? G.t2 : '#a78bfa'}`, opacity: ordered ? .6 : 1, transition: '0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: G.t2, marginTop: 2 }}>{ordered ? 'тЬЕ ╨Т ╨╛╤З╤Ц╨║╤Г╨▓╨░╨╜╨╜╤Ц ╨┤╨╛╤Б╤В╨░╨▓╨║╨╕' : 'тП│ ╨Я╨╛╤В╤А╨╡╨▒╤Г╤Ф ╨╖╨░╨╝╨╛╨▓╨╗╨╡╨╜╨╜╤П'}</div>
                  {m.shopUrl && <a href={m.shopUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: G.cy, textDecoration: 'none', display: 'inline-block', marginTop: 4 }}>ЁЯФЧ ╨Я╨╡╤А╨╡╨╣╤В╨╕</a>}
                  {!ordered && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ color: G.or, fontWeight: 600 }}>{m.stock} {m.unit}</span>
                    <Chip bg='#450a0a' color={G.rd} bd='#7f1d1d'>╨╝╤Ц╨╜ {m.minStock}</Chip>
                  </div>}
                  {!ordered && <div style={{ fontSize: 11, color: G.t2, marginTop: 6 }}>
                    ╨Я╨╛╤В╤А╤Ц╨▒╨╜╨╛/╨╝╤Ц╤Б: <b style={{ color: G.cy }}>{monthNeed}</b> ┬╖ ╨┤╨╛╨║╤Г╨┐╨╕╤В╨╕: <b style={{ color: G.or }}>{toOrder}</b>
                  </div>}
                </div>
                <button onClick={() => setOrdered(m, !ordered)} style={{ background: ordered ? G.card2 : G.b1, border: `1px solid ${G.b2}`, color: ordered ? G.t2 : G.pu, padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
                  {ordered ? '╨б╨║╨░╤Б╤Г╨▓╨░╤В╨╕' : '╨Я╨╛╨╖╨╜╨░╤З╨╕╤В╨╕'}
                </button>
              </div>
            </div>
          })
        }
        {lowMats.length > 0 && <SubmitBtn color={G.pu} onClick={sendToTg}>тЬИ ╨Т╨Ж╨Ф╨Я╨а╨Р╨Т╨Ш╨в╨Ш ╨Ф╨Х╨д╨Ж╨ж╨Ш╨в ╨Т TELEGRAM</SubmitBtn>}
        <SubmitBtn color={G.cy} onClick={sendToTgAll}>ЁЯУЛ ╨Э╨Р╨Ф╨Ж╨б╨Ы╨Р╨в╨Ш ╨Т╨б╨Х ╨Т TELEGRAM</SubmitBtn>
      </Card>
    </>)
  }
  // тФАтФА ╨Ъ╨╛╨╝╨░╨╜╨┤╨░ тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
  const PageWorkers = () => {
    const newName = newWorkerName; const setNewName = setNewWorkerName
    const realWorkers = workers

    const deleteWorker = (w) => openConfirm('╨Т╨╕╨┤╨░╨╗╨╕╤В╨╕ ╨┐╤А╨░╤Ж╤Ц╨▓╨╜╨╕╨║╨░?', <b style={{ color: G.rd }}>{w.name}</b>, () => {
      closeModal()
      api('deleteWorker', [w.id]).then(() => { setWorkers(p => p.filter(wx => wx.id !== w.id)); showToast('тЬУ ╨Т╨╕╨┤╨░╨╗╨╡╨╜╨╛') }).catch(() => { })
    })
    const addWorker = () => {
      if (!newName.trim()) return showToast('╨Т╨▓╨╡╨┤╤Ц╤В╤М ╤Ц╨╝\'╤П', 'err')
      const w = { id: 'w' + uid(), name: newName.trim() }
      api('saveWorker', [w]).then(() => { setWorkers(p => [...p, w]); setNewName(''); showToast('тЬУ ╨Ф╨╛╨┤╨░╨╜╨╛ ' + w.name) }).catch(() => { })
    }
    const addPayment = (w) => openInput('╨Ю╨┐╨╗╨░╤З╨╡╨╜╨╛ (╨║╤Ц╨╗╤М╨║╤Ц╤Б╤В╤М)', '╨╜╨░╨┐╤А. 5', '', async (val) => {
      closeModal()
      const cnt = parseInt(val)
      if (!cnt || cnt <= 0) return showToast('╨Э╨╡╨▓╤Ц╤А╨╜╨░ ╨║╤Ц╨╗╤М╨║╤Ц╤Б╤В╤М', 'err')
      const entry = { id: uid(), workerId: w.id, workerName: w.name, count: cnt, date: todayStr(), datetime: nowStr() }
      try {
        await api('addPayment', [entry])
        setPayments(prev => [entry, ...prev])
        showToast(`тЬУ ╨Ю╨┐╨╗╨░╤З╨╡╨╜╨╛: ${cnt} ╨┤╨╗╤П ${w.name}`)
      } catch { }
    })

    return <>
      <Card>
        <CardTitle>ЁЯС╖ ╨Ъ╨Ю╨Ь╨Р╨Э╨Ф╨Р ({realWorkers.length})</CardTitle>
        {realWorkers.map(w => {
          const produced = producedByName[w.name] || 0
          const paid = paidByWorker[w.id] || paidByWorker[w.name] || 0
          const unpaid = Math.max(0, produced - paid)
          return <div key={w.id} style={{ padding: '10px 0', borderBottom: `1px solid ${G.b1}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: getWorkerColor(w.name), fontWeight: 700 }}>{w.name}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {isAdmin && <button onClick={() => addPayment(w)} style={{ background: '#052e16', border: `1px solid #166534`, color: G.gn, padding: '4px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>+ ╨Ю╨┐╨╗╨░╤З╨╡╨╜╨╛</button>}
                {isAdmin && <button onClick={() => deleteWorker(w)} style={{ background: '#450a0a', border: 'none', color: G.rd, padding: '4px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>тЬХ</button>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <Chip bg={G.card2} color={G.t2} bd={G.b2}>╨Т╨╕╤А╨╛╨▒╨╗╨╡╨╜╨╛: {produced}</Chip>
              <Chip bg='#052e16' color={G.gn} bd='#166534'>╨Ю╨┐╨╗╨░╤З╨╡╨╜╨╛: {paid}</Chip>
              <Chip bg='#431407' color='#fb923c' bd='#9a3412'>╨Э╨╡╨╛╨┐╨╗.: {unpaid}</Chip>
            </div>
          </div>
        })}
      </Card>
      {isAdmin && <Card>
        <CardTitle color={G.gn}>+ ╨Ф╨Ю╨Ф╨Р╨в╨Ш ╨Я╨а╨Р╨ж╨Ж╨Т╨Э╨Ш╨Ъ╨Р</CardTitle>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="╨Ж╨╝'╤П ╤В╨░ ╨┐╤А╤Ц╨╖╨▓╨╕╤Й╨╡" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addWorker()} />
          <button onClick={addWorker} style={{ padding: '8px 16px', background: G.gn, color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ ╨Ф╨Ю╨Ф╨Р╨в╨Ш</button>
        </div>
      </Card>}
    </>
  }

  // тФАтФА ╨Ж╨╜╤Б╤В╤А╤Г╨╝╨╡╨╜╤В╨╕ тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
  const PageTools = () => {
    const nt = newTool; const setNt = setNewTool
    const repairModal = toolRepairModal; const setRepairModal = setToolRepairModal
    const repairNote = toolRepairNote; const setRepairNote = setToolRepairNote
    const repairDate = toolRepairDate; const setRepairDate = setToolRepairDate
    const repairWorker = toolRepairWorker; const setRepairWorker = setToolRepairWorker

    const changeTool = (id, field, delta) => {
      if (!isAdmin) return
      const t = tools.find(t => t.id === id); if (!t) return
      const next = { ...t, [field]: Math.max(0, t[field] + delta) }
      if (next.working > next.count) next.working = next.count
      api('saveTool', [next]).then(() => setTools(prev => prev.map(tx => tx.id !== id ? tx : next))).catch(() => { })
    }
    const deleteTool = (t) => openConfirm('╨Т╨╕╨┤╨░╨╗╨╕╤В╨╕ ╤Ц╨╜╤Б╤В╤А╤Г╨╝╨╡╨╜╤В?', <b style={{ color: G.rd }}>{t.name}</b>, () => {
      closeModal(); api('deleteTool', [t.id]).then(() => { setTools(p => p.filter(tx => tx.id !== t.id)); showToast('тЬУ ╨Т╨╕╨┤╨░╨╗╨╡╨╜╨╛') }).catch(() => { })
    })
    const addTool = () => {
      if (!nt.name.trim()) return showToast('╨Т╨▓╨╡╨┤╤Ц╤В╤М ╨╜╨░╨╖╨▓╤Г', 'err')
      const t = { id: 't' + uid(), ...nt, working: nt.count, repairNote: '', repairDate: '' }
      api('saveTool', [t]).then(() => {
        setTools(p => [...p, t])
        setNt({ name: '', category: 'tool', count: 1, serial: '', notes: '' })
        showToast('тЬУ ╨Ф╨╛╨┤╨░╨╜╨╛ ' + nt.name)
        api('logToolEvent', [t.id, t.name, todayStr(), nowStr(), 'added', '╨Р╨┤╨╝╤Ц╨╜', '╨Ф╨╛╨┤╨░╨╜╨╛ ╨╜╨░ ╤Б╨║╨╗╨░╨┤']).catch(() => { })
        setToolLog(p => [{ id: 'tl_' + Date.now(), toolId: t.id, toolName: t.name, date: todayStr(), datetime: nowStr(), event: 'added', workerName: '╨Р╨┤╨╝╤Ц╨╜', note: '╨Ф╨╛╨┤╨░╨╜╨╛ ╨╜╨░ ╤Б╨║╨╗╨░╨┤' }, ...p])
      }).catch(() => { })
    }
    const openRepairModal = (t) => { setRepairModal(t); setRepairNote(t.repairNote || ''); setRepairDate(todayStr()) }
    const submitToolRepair = async () => {
      if (!repairModal) return
      if (!repairNote.trim()) return showToast('╨Ю╨┐╨╕╤И╤Ц╤В╤М ╨╜╨╡╤Б╨┐╤А╨░╨▓╨╜╤Ц╤Б╤В╤М', 'err')
      const worker = workers.find(w => w.id === repairWorker)
      try {
        await api('reportToolRepair', [repairModal.id, repairNote, repairDate, worker?.name || ''])
        setTools(prev => prev.map(t => t.id !== repairModal.id ? t : { ...t, repairNote, repairDate }))
        api('logToolEvent', [repairModal.id, repairModal.name, repairDate, nowStr(), 'broken', worker?.name || '', repairNote]).catch(() => { })
        setToolLog(p => [{ id: 'tl_' + Date.now(), toolId: repairModal.id, toolName: repairModal.name, date: repairDate, datetime: nowStr(), event: 'broken', workerName: worker?.name || '', note: repairNote }, ...p])
        showToast('тЬУ ╨Я╨╛╨▓╤Ц╨┤╨╛╨╝╨╗╨╡╨╜╨╛ ╨┐╤А╨╛ ╤А╨╡╨╝╨╛╨╜╤В тАФ ╨▒╨╛╤В ╤Б╨┐╨╛╨▓╤Ц╤Й╨╡╨╜╨╛'); setRepairModal(null)
      } catch { }
    }

    const completeToolRepair = async (t) => {
      openConfirm('╨Ж╨╜╤Б╤В╤А╤Г╨╝╨╡╨╜╤В ╨▓╤Ц╨┤╤А╨╡╨╝╨╛╨╜╤В╨╛╨▓╨░╨╜╨╛?', '╨Я╤Ц╨┤╤В╨▓╨╡╤А╨┤╨╢╤Г╤Ф╤В╨╡ ╨┐╨╛╨▓╨╡╤А╨╜╨╡╨╜╨╜╤П ╨▓ ╤А╨╛╨▒╨╛╤В╤Г?', async () => {
        closeModal()
        try {
          await api('reportToolRepair', [t.id, '', '', '']) // clear repair note
          const next = { ...t, working: t.count, repairNote: '', repairDate: '' }
          await api('saveTool', [next])
          setTools(prev => prev.map(tx => tx.id !== t.id ? tx : next))
          api('logToolEvent', [t.id, t.name, todayStr(), nowStr(), 'fixed', '╨Р╨┤╨╝╤Ц╨╜', '╨Я╨╛╨▓╨╡╤А╨╜╤Г╤В╨╛ ╨▓ ╤А╨╛╨▒╨╛╤В╤Г']).catch(() => { })
          setToolLog(p => [{ id: 'tl_' + Date.now(), toolId: t.id, toolName: t.name, date: todayStr(), datetime: nowStr(), event: 'fixed', workerName: '╨Р╨┤╨╝╤Ц╨╜', note: '╨Я╨╛╨▓╨╡╤А╨╜╤Г╤В╨╛ ╨▓ ╤А╨╛╨▒╨╛╤В╤Г' }, ...p])
          showToast('тЬУ ╨Ж╨╜╤Б╤В╤А╤Г╨╝╨╡╨╜╤В ╤Г ╤А╨╛╨▒╨╛╤З╨╛╨╝╤Г ╤Б╤В╨░╨╜╤Ц')
        } catch { }
      })
    }

    return wrap(<>
      {repairModal && (
        <Modal onClose={() => setRepairModal(null)}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 19, fontWeight: 700, marginBottom: 14, color: G.rd }}>ЁЯФз ╨а╨╡╨╝╨╛╨╜╤В: {repairModal.name}</div>
          <FormRow label="╨Э╨Х╨б╨Я╨а╨Р╨Т╨Э╨Ж╨б╨в╨м / ╨Ю╨Я╨Ш╨б"><textarea value={repairNote} onChange={e => setRepairNote(e.target.value)} placeholder="╨Ю╨┐╨╕╤И╤Ц╤В╤М ╤Й╨╛ ╨╖╨╗╨░╨╝╨░╨╗╨╛╤Б╤М..." style={{ minHeight: 80 }} /></FormRow>
          <FormRow label="╨Ф╨Р╨в╨Р"><input value={repairDate} onChange={e => setRepairDate(e.target.value)} /></FormRow>
          <FormRow label="╨е╨в╨Ю ╨Я╨Ю╨Т╨Ж╨Ф╨Ю╨Ь╨Ы╨п╨Д">
            <select value={repairWorker} onChange={e => setRepairWorker(e.target.value)}>
              {workers.filter(w => w.id !== 'TEAM_SHARED').map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </FormRow>
          <div style={{ color: G.t2, fontSize: 12, marginBottom: 10 }}>тЬИ Telegram-╨▒╨╛╤В ╨╛╤В╤А╨╕╨╝╨░╤Ф ╤Б╨┐╨╛╨▓╤Ц╤Й╨╡╨╜╨╜╤П</div>
          <SubmitBtn onClick={submitToolRepair} color={G.rd}>ЁЯФз ╨Т╨Ж╨Ф╨Я╨а╨Р╨Т╨Ш╨в╨Ш ╨Т ╨а╨Х╨Ь╨Ю╨Э╨в</SubmitBtn>
        </Modal>
      )}

      <SubTabs tabs={[['active', 'ЁЯЫа ╨Р╨Ъ╨в╨Ш╨Т╨Э╨Ж'], ['log', 'ЁЯУЛ ╨Ц╨г╨а╨Э╨Р╨Ы']]} active={toolTab} onChange={setToolTab} />

      {toolTab === 'active' && <>
        {tools.map(t => {
          const broken = t.count - t.working
          return <div key={t.id} style={{ background: G.card, border: `1px solid ${G.b1}`, borderLeft: `3px solid ${broken > 0 ? G.rd : G.gn}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 700 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: G.t2, marginTop: 2 }}>{t.category === 'equipment' ? 'тЪЩ ╨Ю╨С╨Ы╨Р╨Ф╨Э╨Р╨Э╨Э╨п' : 'ЁЯЫа ╨Ж╨Э╨б╨в╨а╨г╨Ь╨Х╨Э╨в'}{t.serial && ' ┬╖ ' + t.serial}</div>
                {broken > 0 && <div style={{ color: G.rd, fontSize: 12, marginTop: 4 }}>тЪа {broken} ╤И╤В. ╨╜╨╡╤Б╨┐╤А╨░╨▓╨╜╨╕╤Е</div>}
                {t.notes && <div style={{ color: G.t2, fontSize: 12, marginTop: 3 }}>ЁЯУЭ {t.notes}</div>}
                {t.repairNote && <div style={{ color: '#fb923c', fontSize: 12, marginTop: 3 }}>ЁЯФз {t.repairNote} {t.repairDate && '┬╖ ' + t.repairDate}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexDirection: 'column', alignItems: 'flex-end' }}>
                {!t.repairNote && <button onClick={() => openRepairModal(t)} style={{ background: '#431407', border: `1px solid #9a3412`, color: '#fb923c', padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>ЁЯФз ╨Т ╤А╨╡╨╝╨╛╨╜╤В</button>}
                {t.repairNote && isAdmin && <button onClick={() => completeToolRepair(t)} style={{ background: '#052e16', border: `1px solid #166534`, color: G.gn, padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>тЬУ ╨Т╤Ц╨┤╤А╨╡╨╝╨╛╨╜╤В╨╛╨▓╨░╨╜╨╛</button>}
                {isAdmin && <button onClick={() => deleteTool(t)} style={{ background: '#450a0a', border: 'none', color: G.rd, padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, alignSelf: 'flex-end', marginTop: 4 }}>тЬХ ╨Т╨╕╨┤╨░╨╗╨╕╤В╨╕</button>}
              </div>
            </div>
            {isAdmin && <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: G.t2 }}>╨Т╤Б╤М╨╛╨│╨╛:</span>
              <QtyBtn onClick={() => changeTool(t.id, 'count', -1)}>тИТ</QtyBtn>
              <b style={{ minWidth: 24, textAlign: 'center' }}>{t.count}</b>
              <QtyBtn onClick={() => changeTool(t.id, 'count', 1)}>+</QtyBtn>
              <span style={{ fontSize: 13, color: G.t2 }}>╨а╨╛╨▒╨╛╤З╨╕╤Е:</span>
              <QtyBtn onClick={() => changeTool(t.id, 'working', -1)}>тИТ</QtyBtn>
              <b style={{ color: G.gn, minWidth: 24, textAlign: 'center' }}>{t.working}</b>
              <QtyBtn onClick={() => changeTool(t.id, 'working', 1)}>+</QtyBtn>
            </div>}
            {!isAdmin && <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <span style={{ fontSize: 12, color: G.t2 }}>╨Т╤Б╤М╨╛╨│╨╛: <b style={{ color: G.t1 }}>{t.count}</b></span>
              <span style={{ fontSize: 12, color: G.t2 }}>┬╖ ╨а╨╛╨▒╨╛╤З╨╕╤Е: <b style={{ color: G.gn }}>{t.working}</b></span>
              {broken > 0 && <span style={{ fontSize: 12, color: G.rd }}>┬╖ ╨Э╨╡╤Б╨┐╤А╨░╨▓╨╜╨╕╤Е: <b>{broken}</b></span>}
            </div>}
          </div>
        })}

        {isAdmin && <Card>
          <CardTitle color={G.gn}>+ ╨Ф╨Ю╨Ф╨Р╨в╨Ш ╨Ж╨Э╨б╨в╨а╨г╨Ь╨Х╨Э╨в</CardTitle>
          <input placeholder="╨Э╨░╨╖╨▓╨░" value={nt.name} onChange={e => setNt(v => ({ ...v, name: e.target.value }))} style={{ marginBottom: 6 }} />
          <select value={nt.category} onChange={e => setNt(v => ({ ...v, category: e.target.value }))} style={{ marginBottom: 6 }}>
            <option value="tool">ЁЯЫа ╨Ж╨╜╤Б╤В╤А╤Г╨╝╨╡╨╜╤В</option>
            <option value="equipment">тЪЩ ╨Ю╨▒╨╗╨░╨┤╨╜╨░╨╜╨╜╤П</option>
          </select>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
            <input type="number" placeholder="╨Ъ╤Ц╨╗╤М╨║╤Ц╤Б╤В╤М" value={nt.count} min="1" onChange={e => setNt(v => ({ ...v, count: parseInt(e.target.value) || 1 }))} />
            <input placeholder="╨б/╨╜ (╨╜╨╡╨╛╨▒╨╛╨▓.)" value={nt.serial} onChange={e => setNt(v => ({ ...v, serial: e.target.value }))} />
          </div>
          <input placeholder="╨Э╨╛╤В╨░╤В╨║╨░" value={nt.notes} onChange={e => setNt(v => ({ ...v, notes: e.target.value }))} style={{ marginBottom: 4 }} />
          <SubmitBtn onClick={addTool} color={G.gn}>+ ╨Ф╨Ю╨Ф╨Р╨в╨Ш</SubmitBtn>
        </Card>}
      </>}

      {toolTab === 'log' && (
        toolLog.length === 0 ? <Center>╨Ц╤Г╤А╨╜╨░╨╗ ╨┐╨╛╤А╨╛╨╢╨╜╤Ц╨╣</Center> :
          toolLog.map(e => {
            const color = e.event === 'added' ? G.gn : e.event === 'broken' ? G.rd : e.event === 'fixed' ? G.cy : G.t2
            const icon = e.event === 'added' ? '+' : e.event === 'broken' ? 'ЁЯФз' : e.event === 'fixed' ? 'тЬУ' : 'тАв'
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

  // тФАтФА ╨Ь╨░╨╜╤Г╨░╨╗ тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
  const PageManual = () => {
    const isTypes = manualTab === 'types'
    const list = isTypes ? batteryTypes : assemblies
    const activeId = isTypes ? (manualTypeId || batteryTypes[0]?.id) : (manualAsmId || assemblies[0]?.id)
    const item = list.find(t => t.id === activeId) || list[0]

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
      setEditing(false); showToast('тЬУ ╨в╨╡╤Е╨╜╨╛╨╗╨╛╨│╤Ц╤З╨╜╤Г ╨║╨░╤А╤В╤Г ╨╖╨▒╨╡╤А╨╡╨╢╨╡╨╜╨╛')
    }

    const formatManual = (text) => {
      if (!text) return null
      return text.split('\n').map((line, i) => {
        const isStep = /^\d+[\.\)]/.test(line.trim())
        const isNote = /^(тЪа|!|╨г╨Т╨Р╨У╨Р|╨Я╤А╨╕╨╝╤Ц╤В╨║╨░)/i.test(line.trim())
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
      <SubTabs tabs={[['types', '╨С╨Р╨в╨Р╨а╨Х╨З'], ['assemblies', '╨Ч╨С╨Ж╨а╨Ъ╨Ш']]} active={manualTab} onChange={setManualTab} />
      {list.length > 0 && <TypeTabs types={list} active={activeId} onSelect={isTypes ? setManualTypeId : setManualAsmId} />}
      {!editing ? (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <CardTitle style={{ marginBottom: 0 }}>ЁЯУЦ {item?.name || '╨Ю╨▒╨╡╤А╤Ц╤В╤М ╨╡╨╗╨╡╨╝╨╡╨╜╤В'}</CardTitle>
            {item && isAdmin && <button onClick={startEdit} style={{ padding: '6px 12px', background: G.b1, border: `1px solid ${G.b2}`, color: G.yw, borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>тЬО ╨а╨╡╨┤╨░╨│╤Г╨▓╨░╤В╨╕</button>}
          </div>
          {currentManual ? formatManual(currentManual) : <div style={{ color: G.t2, fontSize: 13, padding: '10px 0' }}>╨Ь╨░╨╜╤Г╨░╨╗ ╨┐╨╛╤А╨╛╨╢╨╜╤Ц╨╣. {isAdmin && '╨Э╨░╤В╨╕╤Б╨╜╤Ц╤В╤М "╨а╨╡╨┤╨░╨│╤Г╨▓╨░╤В╨╕" ╤Й╨╛╨▒ ╨┤╨╛╨┤╨░╤В╨╕.'}</div>}
        </Card>
      ) : (
        <Card>
          <CardTitle color={G.yw}>тЬО ╨а╨Х╨Ф╨Р╨У╨г╨Т╨Р╨Э╨Э╨п ╨Ь╨Р╨Э╨г╨Р╨Ы╨г</CardTitle>
          <textarea value={draftSteps} onChange={e => setDraftSteps(e.target.value)} style={{ minHeight: 300, fontFamily: "'Fira Code',monospace", fontSize: 13 }} placeholder={'# ╨Ч╨░╨│╨╛╨╗╨╛╨▓╨╛╨║\n1. ╨Ъ╤А╨╛╨║ ╨┐╨╡╤А╤И╨╕╨╣\n2. ╨Ъ╤А╨╛╨║ ╨┤╤А╤Г╨│╨╕╨╣\nтЪа ╨Я╤А╨╕╨╝╤Ц╤В╨║╨░\n![alt](https://image.url)'} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <SubmitBtn onClick={saveManual} color={G.gn}>тЬУ ╨Ч╨С╨Х╨а╨Х╨У╨в╨Ш</SubmitBtn>
            <button onClick={() => openInput('╨Т╤Б╤В╨░╨▓╨╕╤В╨╕ ╤Д╨╛╤В╨╛', '╨Т╨▓╨╡╨┤╤Ц╤В╤М URL ╨╖╨╛╨▒╤А╨░╨╢╨╡╨╜╨╜╤П (╨╜╨░╨┐╤А. ╨╖ Google Drive ╨░╨▒╨╛ Imgur)', '', (val) => {
              if (val) setDraftSteps(prev => prev + (prev.endsWith('\n') ? '' : '\n') + `![img](${val})\n`)
              closeModal()
            })} style={{ flex: 1, padding: 12, background: '#1e3a8a', color: '#93c5fd', border: `1px solid #1e40af`, borderRadius: 12, cursor: 'pointer', marginTop: 10, fontWeight: 700 }}>ЁЯУ╖ ╨Ф╨Ю╨Ф╨Р╨в╨Ш ╨д╨Ю╨в╨Ю</button>
            <button onClick={() => setEditing(false)} style={{ flex: 1, padding: 12, background: G.b1, color: G.t2, border: `1px solid ${G.b2}`, borderRadius: 12, cursor: 'pointer', marginTop: 10 }}>╨б╨║╨░╤Б╤Г╨▓╨░╤В╨╕</button>
          </div>
        </Card>
      )}
    </>)
  }

  // тФАтФА ╨Ы╨╛╨│ ╨┤╤Ц╨╣ (╨░╨┤╨╝╤Ц╨╜) тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
  const loadActionLogs = useCallback(() => {
    setActionLogs(null)
    gasCall('getActionLogs', []).then(d => setActionLogs(Array.isArray(d) ? d : (d?.ok === false ? [] : d || []))).catch(() => setActionLogs([]))
  }, [])
  useEffect(() => { if (page === 'actlog') loadActionLogs() }, [page])

  const loadBackupDiff = useCallback(() => {
    setBackupDiff(null)
    gasCall('getBackupDiff', []).then(d => {
      if (d?.ok && d.rows) { setBackupDiff(d.rows); setSnapshotDate(d.snapshotDate || '') }
      else { setBackupDiff([]); setSnapshotDate('') }
    }).catch(() => setBackupDiff([]))
  }, [])
  useEffect(() => { if (page === 'backup') loadBackupDiff() }, [page])

  const PageActionLog = () => {
    const filtered = (actionLogs || []).filter(e =>
      (!filterUser || (e.user || '').toLowerCase().includes(filterUser.toLowerCase())) &&
      (!filterDate || (e.date || '').includes(filterDate))
    )
    if (actionLogs === null) return wrap(<Center>тЯ│ ╨Ч╨░╨▓╨░╨╜╤В╨░╨╢╨╡╨╜╨╜╤П...</Center>)
    const typeColor = (t) => t === 'backup' ? G.cy : t === 'restore' ? G.rd : t === 'production' ? G.gn : t === 'repair' ? '#fb923c' : G.pu
    return wrap(<>
      <Card>
        <CardTitle color={G.pu}>ЁЯУЬ ╨Ы╨Ю╨У ╨Ф╨Ж╨Щ ({filtered.length})</CardTitle>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input placeholder="╨д╤Ц╨╗╤М╤В╤А ╨┐╨╛ ╤О╨╖╨╡╤А╤Г" value={filterUser} onChange={e => setFilterUser(e.target.value)} />
          <input placeholder="╨Ф╨░╤В╨░ (╨┤╨┤.╨╝╨╝)" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ width: 120, flexShrink: 0 }} />
          <button onClick={loadActionLogs} style={{ padding: '6px 12px', background: G.b1, border: `1px solid ${G.b2}`, color: G.t2, borderRadius: 8, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>ЁЯФД</button>
        </div>
        {filtered.length === 0 ? <Center>╨Ы╨╛╨│ ╨┐╨╛╤А╨╛╨╢╨╜╤Ц╨╣</Center> : filtered.map(e =>
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

  // тФАтФА ╨С╨╡╨║╨░╨┐ / ╨Ж╨╜╨▓╨╡╨╜╤В╨░╤А╨╕╨╖╨░╤Ж╤Ц╤П (╨░╨┤╨╝╤Ц╨╜) тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
  const PageBackup = () => {
    const makeBackup = async () => {
      setBusy(true)
      try {
        await api('saveStockBackup', ['╨Р╨┤╨╝╤Ц╨╜'])
        showToast('тЬУ ╨Ч╤А╤Ц╨╖ ╤Б╨║╨╗╨░╨┤╤Г ╨╖╨▒╨╡╤А╨╡╨╢╨╡╨╜╨╛')
        loadBackupDiff()
      } catch { } finally { setBusy(false) }
    }
    const doRestore = () => openConfirm('╨Т╤Ц╨┤╨╜╨╛╨▓╨╕╤В╨╕ ╤Б╨║╨╗╨░╨┤ ╨╖ ╨▒╨╡╨║╨░╨┐╤Г?',
      <div style={{ fontSize: 13, color: G.t2 }}>╨Я╨╛╤В╨╛╤З╨╜╨╕╨╣ ╤Б╨║╨╗╨░╨┤ ╨▒╤Г╨┤╨╡ ╨┐╨╡╤А╨╡╨╖╨░╨┐╨╕╤Б╨░╨╜╨╛ ╨╖╨╜╨░╤З╨╡╨╜╨╜╤П╨╝╨╕ ╨╖╤Ц ╨╖╤А╤Ц╨╖╤Г ╨▓╤Ц╨┤ <b style={{ color: G.or }}>{snapshotDate}</b>. ╨Я╤А╨╛╨┤╨╛╨▓╨╢╨╕╤В╨╕?</div>,
      async () => {
        closeModal()
        setBusy(true)
        try {
          await api('restoreFromBackup', ['╨Р╨┤╨╝╤Ц╨╜'])
          showToast('тЬУ ╨б╨║╨╗╨░╨┤ ╨▓╤Ц╨┤╨╜╨╛╨▓╨╗╨╡╨╜╨╛ ╨╖ ╨▒╨╡╨║╨░╨┐╤Г')
          const fresh = await gasCall('loadAll', [])
          if (fresh?.materials) setMaterials(fresh.materials)
          loadBackupDiff()
        } catch { } finally { setBusy(false) }
      }
    )
    return wrap(<>
      <Card>
        <CardTitle color={G.cy}>ЁЯТ╛ ╨С╨Х╨Ъ╨Р╨Я / ╨Ж╨Э╨Т╨Х╨Э╨в╨Р╨а╨Ш╨Ч╨Р╨ж╨Ж╨п</CardTitle>
        {snapshotDate ? <div style={{ fontSize: 12, color: G.t2, marginBottom: 10 }}>╨Ч╤А╤Ц╨╖ ╨▓╤Ц╨┤: <b style={{ color: G.cy }}>{snapshotDate}</b></div>
          : <div style={{ fontSize: 12, color: G.t2, marginBottom: 10 }}>╨Ч╤А╤Ц╨╖╤Г ╨╜╨╡╨╝╨░╤Ф. ╨Э╨░╤В╨╕╤Б╨╜╤Ц╤В╤М ┬л╨Ч╤А╨╛╨▒╨╕╤В╨╕ ╨╖╤А╤Ц╨╖┬╗.</div>}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <SubmitBtn color={G.gn} onClick={makeBackup} disabled={busy}>ЁЯУ╕ ╨Ч╨а╨Ю╨С╨Ш╨в╨Ш ╨Ч╨а╨Ж╨Ч</SubmitBtn>
          {snapshotDate && <SubmitBtn color={G.rd} onClick={doRestore} disabled={busy}>тЩ╗ ╨Т╨Ж╨Ф╨Э╨Ю╨Т╨Ш╨в╨Ш ╨Ч ╨С╨Х╨Ъ╨Р╨Я╨г</SubmitBtn>}
          <button onClick={loadBackupDiff} style={{ padding: '6px 14px', background: G.b1, border: `1px solid ${G.b2}`, color: G.t2, borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>ЁЯФД</button>
        </div>
        {backupDiff === null ? <Center>тЯ│ ╨Ч╨░╨▓╨░╨╜╤В╨░╨╢╨╡╨╜╨╜╤П...</Center>
          : backupDiff.length === 0 ? <Center>╨С╨╡╨║╨░╨┐ ╨┐╨╛╤А╨╛╨╢╨╜╤Ц╨╣ тАФ ╨╖╤А╨╛╨▒╤Ц╤В╤М ╨╖╤А╤Ц╨╖</Center>
            : <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 70px', gap: 4, fontSize: 11, color: G.t2, fontWeight: 700, padding: '4px 0', borderBottom: `1px solid ${G.b2}` }}>
                <span>╨Ь╨░╤В╨╡╤А╤Ц╨░╨╗</span><span style={{ textAlign: 'center' }}>╨Ч╤А╤Ц╨╖</span><span style={{ textAlign: 'center' }}>╨Ч╨░╤А╨░╨╖</span><span style={{ textAlign: 'center' }}>╨а╤Ц╨╖╨╜╨╕╤Ж╤П</span>
              </div>
              {backupDiff.map(r => {
                const d = r.diff
                const dColor = d === null ? G.t2 : d < 0 ? G.rd : d > 0 ? G.gn : G.t2
                return <div key={r.matId} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 70px', gap: 4, padding: '8px 0', borderBottom: `1px solid ${G.b1}`, fontSize: 12 }}>
                  <span style={{ color: G.t1 }}>{r.name} <span style={{ color: G.t2, fontSize: 10 }}>{r.unit}</span></span>
                  <span style={{ textAlign: 'center', color: G.t2 }}>{r.backup ?? 'тАФ'}</span>
                  <span style={{ textAlign: 'center', color: G.cy, fontWeight: 600 }}>{r.current}</span>
                  <span style={{ textAlign: 'center', color: dColor, fontWeight: 700 }}>{d !== null ? (d > 0 ? '+' + d : d) : 'тАФ'}</span>
                </div>
              })}
            </>}
      </Card>
    </>)
  }

  // тФАтФА HistoryModal тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
  const HistoryModal = ({ mat, entries }) => <>
    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 12 }}>ЁЯУК {mat.name}</div>
    <div style={{ fontSize: 12, color: G.t2, marginBottom: 12 }}>╨Ч╨░╨╗╨╕╤И╨╛╨║: <b style={{ color: G.cy }}>{mat.stock} {mat.unit}</b></div>
    {entries.length === 0 ? <div style={{ color: G.t2, fontSize: 13 }}>╨Т╨╕╤В╤А╨░╤В ╨╜╨╡╨╝╨░╤Ф</div>
      : entries.map((e, i) => <div key={i} style={{ background: G.card2, borderRadius: 10, padding: 10, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: e.kind === 'prep' ? G.pu : e.kind === 'repair' ? '#fb923c' : G.cy, fontWeight: 600 }}>
            {e.kind === 'prep' ? 'ЁЯУж' : e.kind === 'repair' ? 'ЁЯФз' : 'ЁЯФЛ'} <span style={{ color: getWorkerColor(e.workerName) }}>{e.workerName}</span>
          </span>
          <span style={{ color: G.rd, fontWeight: 600 }}>тИТ{e.amount} {mat.unit}</span>
        </div>
        <div style={{ color: '#4b5563', fontSize: 11, marginTop: 2 }}>{e.datetime}</div>
      </div>)}
    <button onClick={closeModal} style={{ width: '100%', marginTop: 14, padding: 12, background: G.b1, border: `1px solid ${G.b2}`, color: G.t2, borderRadius: 10, cursor: 'pointer', fontFamily: "'Fira Code',monospace" }}>╨Ч╨░╨║╤А╨╕╤В╨╕</button>
  </>

  // тХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХР
  //  LAYOUT
  // тХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХРтХР
  const pageKeys = NAV.map(n => n[0])

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => { const idx = pageKeys.indexOf(page); if (idx < pageKeys.length - 1) setPage(pageKeys[idx + 1]); setSwipeHint(null) },
    onSwipedRight: () => { const idx = pageKeys.indexOf(page); if (idx > 0) setPage(pageKeys[idx - 1]); setSwipeHint(null) },
    onSwiping: ({ deltaX }) => {
      const idx = pageKeys.indexOf(page)
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
          <Logo size={30} />
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: 2 }}>ZmiyCell</span>
          {isAdmin && <Chip bg='#1c1107' color={G.or} bd={G.b2} style={{ fontSize: 10 }}>╨Р╨Ф╨Ь╨Ж╨Э</Chip>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: G.b2 }}>{todayStr().slice(0, 5)}</span>
          <SyncBadge state={sync} />
          <button onClick={onLogout} title="╨Т╨╕╨╣╤В╨╕" style={{ background: 'transparent', border: 'none', color: G.t2, cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="6" r="2.2" fill="currentColor" opacity="0.9" /><path d="M4.5 16.5c0-2.5 1.6-3.8 3.5-3.8s3.5 1.3 3.5 3.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.9" /><rect x="13" y="3.5" width="7" height="17" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M17 12h-6m0 0l2-2m-2 2l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 700, margin: '0 auto', paddingBottom: 8 }}>
        {[
          // ['ЁЯФЛ', log.filter(l => l.kind === 'production' && String(l.datetime).startsWith(todayStr())).reduce((sum, l) => sum + num(l.count), 0), G.t1, G.b1, G.b2],
          ['ЁЯФЛ', log.filter(l => l.kind === 'production' && String(l.datetime).startsWith(todayStr())).reduce((sum, l) => sum + num(l.count), 0), G.t1, G.b1, G.b2],
          ['ЁЯФз', repairLog.filter(r => r.status !== 'completed').length, G.t1, G.b1, G.b2],
          ['тЬЕ', repairLog.filter(r => r.status === 'completed' && (r.note || '').includes(todayStr())).length, G.gn, '#052e16', '#166534'],
          ['ЁЯУж', activePrep.length, activePrep.length > 0 ? G.pu : G.t2, activePrep.length > 0 ? '#1e1b4b' : G.b1, activePrep.length > 0 ? '#3730a3' : G.b2],
        ].map(([icon, val, vc, bg, bd], i) =>
          <span key={i} style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 20, padding: '3px 10px', fontSize: 11, color: G.t2 }}>
            {icon} <b style={{ color: vc }}>{val}</b>
          </span>)}
      </div>
      <div className="tab-nav" style={{ display: 'flex', overflowX: 'auto', maxWidth: 700, margin: '0 auto', borderTop: `1px solid rgba(255,255,255,0.05)` }}>
        {NAV.map(([k, icon, label]) =>
          <button key={k} onClick={() => setPage(k)} style={{ flex: '0 0 auto', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', borderBottom: `2px solid ${page === k ? G.or : 'transparent'}`, cursor: 'pointer', color: page === k ? G.or : G.t2, transition: '.15s', whiteSpace: 'nowrap', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: .5 }}>
            <span style={{ fontSize: 16 }}>{icon}</span> {label}
          </button>)}
      </div>
    </div>

    {/* Content */}
    <div className="page-scroll" {...swipeHandlers} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ transform: `translateY(${pullDist}px)` }}>
      {pullDist > 10 && (
        <div style={{ position: 'absolute', top: -40, left: 0, right: 0, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: pullDist > 90 ? G.or : G.t2, fontSize: 12, fontWeight: 700, fontFamily: "'Barlow Condensed',sans-serif" }}>
          {pullDist > 90 ? 'тЬУ ╨Т╨Ж╨Ф╨Я╨г╨б╨в╨Ж╨в╨м ╨Ф╨Ы╨п ╨Ю╨Э╨Ю╨Т╨Ы╨Х╨Э╨Э╨п' : 'тЖУ ╨в╨п╨У╨Э╨Ж╨в╨м ╨Ф╨Ы╨п ╨Ю╨Э╨Ю╨Т╨Ы╨Х╨Э╨Э╨п'}
        </div>
      )}
      {swipeHint && (
        <div style={{ position: 'fixed', top: '50%', left: swipeHint.dir === 'right' ? 16 : 'auto', right: swipeHint.dir === 'left' ? 16 : 'auto', transform: 'translateY(-50%)', zIndex: 200, pointerEvents: 'none', background: 'rgba(17,24,39,0.92)', border: `1px solid ${G.b2}`, borderRadius: 14, padding: '12px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 72, boxShadow: '0 4px 24px rgba(0,0,0,0.6)', animation: 'slideUp .1s ease' }}>
          <span style={{ fontSize: 10, color: G.t2, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1 }}>{swipeHint.dir === 'left' ? 'тЖТ' : 'тЖР'}</span>
          <span style={{ fontSize: 22 }}>{swipeHint.icon}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: G.or, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: .5, whiteSpace: 'nowrap' }}>{swipeHint.label}</span>
        </div>
      )}
      {page === 'prod' ? PageProd()
        : page === 'stock' ? PageStock()
          : page === 'repair' ? PageRepair()
            : page === 'shopping' ? PageShopping()
              : page === 'workers' ? PageWorkers()
                : page === 'tools' ? PageTools()
                  : page === 'log' ? PageLog()
                    : page === 'actlog' ? PageActionLog()
                      : page === 'backup' ? PageBackup()
                        : PageManual()}
    </div>

    {toast && <Toast {...toast} />}
    {modal?.type === 'confirm' && <ConfirmModal title={modal.title} body={modal.body} onYes={modal.onYes} onNo={closeModal} />}
    {modal?.type === 'input' && <InputModal title={modal.title} placeholder={modal.placeholder} defaultValue={modal.defaultVal} onConfirm={modal.onConfirm} onCancel={closeModal} />}
    {modal?.type === 'history' && <Modal onClose={closeModal}><HistoryModal mat={modal.mat} entries={modal.entries} /></Modal>}
  </>
}
