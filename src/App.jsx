
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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

const ADMIN_PIN = '1234'
const AUTH_KEY = 'zc_auth'

const sendTelegram = async (text) => {
  try {
    const plain = text.replace(/<[^>]*>/g, '')
    await gasCall('sendTelegram', [plain])
  } catch (e) { console.warn('TG error:', e) }
}

const todayStr = () => new Date().toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })
const nowStr   = () => new Date().toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const uid      = () => String(Date.now()) + String(Math.floor(Math.random() * 9999))

// ════════════════════════════════════════════════════════
//  UI АТОМИ
// ════════════════════════════════════════════════════════
const Label    = ({ children }) =>
  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700, color:G.t2, letterSpacing:.5, marginBottom:5 }}>{children}</div>
const FormRow  = ({ label, children }) =>
  <div style={{ marginBottom:12 }}>{label && <Label>{label}</Label>}{children}</div>
const Card     = ({ children, style={} }) =>
  <div style={{ background:G.card, border:`1px solid ${G.b1}`, borderRadius:14, padding:14, marginBottom:10, ...style }}>{children}</div>
const CardTitle = ({ children, color=G.or }) =>
  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:17, fontWeight:700, color, letterSpacing:.5, marginBottom:10 }}>{children}</div>
const QtyBtn   = ({ onClick, children }) =>
  <button onClick={onClick} style={{ width:38, height:38, borderRadius:8, background:G.b1, border:`1px solid ${G.b2}`, color:G.t1, fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:'monospace' }}>{children}</button>
const SubmitBtn = ({ children, onClick, color=G.or, disabled=false }) =>
  <button onClick={onClick} disabled={disabled} style={{ width:'100%', padding:'15px 0', background:disabled?G.b1:color, color:disabled?G.t2:color===G.yw?'#000':'#fff', border:'none', borderRadius:12, fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:700, letterSpacing:.5, marginTop:10, cursor:disabled?'not-allowed':'pointer', opacity:disabled?.5:1, transition:'.15s' }}>{children}</button>
const TypeTabs = ({ types, active, onSelect }) =>
  <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
    {types.map(t => <button key={t.id} onClick={() => onSelect(t.id)} style={{ flex:'1 1 auto', minWidth:80, padding:'10px 6px', borderRadius:10, fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, letterSpacing:.5, cursor:'pointer', border:`1px solid ${t.id===active?(t.color||G.or):G.b2}`, background:t.id===active?'#1c1107':G.card, color:t.id===active?(t.color||G.or):G.t2, transition:'.15s' }}>{t.name}</button>)}
  </div>
const SubTabs  = ({ tabs, active, onChange }) =>
  <div style={{ display:'flex', gap:8, marginBottom:12 }}>
    {tabs.map(([k,label]) => <button key={k} onClick={() => onChange(k)} style={{ flex:1, padding:9, borderRadius:10, border:`1px solid ${k===active?G.or:G.b2}`, background:k===active?'#1c1917':G.card, color:k===active?G.or:G.t2, fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, letterSpacing:.5, cursor:'pointer' }}>{label}</button>)}
  </div>
const Chip     = ({ bg, color, bd, children, style={} }) =>
  <span style={{ background:bg, color, border:`1px solid ${bd}`, padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:.5, flexShrink:0, ...style }}>{children}</span>
const Center   = ({ children }) =>
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:40, color:G.t2, fontSize:14 }}>{children}</div>

// StatusBadge для глобального матеріалу (без preBattery — є мін.запас)
const StockBadge = ({ m }) => {
  if (m.stock <= 0)            return <Chip bg='#2e1065' color='#c084fc' bd='#4c1d95'>НЕМА</Chip>
  if (m.stock <= m.minStock)   return <Chip bg='#450a0a' color={G.rd}   bd='#7f1d1d'>КРИТ.</Chip>
  return <Chip bg='#052e16' color={G.gn} bd='#166534'>НОРМА</Chip>
}

function SyncBadge({ state }) {
  const cfg = {
    loading: ['⟳ завантаження...','#1e1b4b','#a5b4fc','#3730a3',true],
    saving:  ['⟳ збереження...',  '#1e1b4b','#a5b4fc','#3730a3',true],
    ok:      ['✓ синхр.',          '#052e16', G.gn,    '#166534',false],
    error:   ['✕ помилка',         '#450a0a', G.rd,    '#7f1d1d',false],
  }[state] || ['...', G.b1, G.t2, G.b2, false]
  return <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, padding:'3px 9px', borderRadius:10, background:cfg[1], color:cfg[2], border:`1px solid ${cfg[3]}`, animation:cfg[4]?'pulse 1s infinite':'', fontFamily:"'Fira Code',monospace" }}>{cfg[0]}</span>
}

function Toast({ msg, type }) {
  return <div style={{ position:'fixed', top:14, left:12, right:12, zIndex:9999, background:type==='err'?'#450a0a':'#052e16', border:`1px solid ${type==='err'?G.rd:G.gn}`, color:type==='err'?'#fca5a5':'#86efac', padding:'13px 16px', borderRadius:12, fontSize:13, fontFamily:"'Fira Code',monospace", boxShadow:'0 8px 32px rgba(0,0,0,.7)', animation:'slideUp .2s ease' }}>{msg}</div>
}

function Modal({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:500, padding:`0 0 env(safe-area-inset-bottom,0)` }}>
      <div onClick={e => e.stopPropagation()} style={{ background:G.card, border:`1px solid ${G.b2}`, borderRadius:'18px 18px 0 0', padding:'20px 18px 32px', width:'100%', maxWidth:700, maxHeight:'90vh', overflowY:'auto', animation:'slideUp .25s ease' }}>
        <div style={{ width:40, height:4, background:G.b2, borderRadius:2, margin:'0 auto 18px' }} />
        {children}
      </div>
    </div>
  )
}

function ConfirmModal({ title, body, onYes, onNo }) {
  return (
    <Modal onClose={onNo}>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:19, fontWeight:700, marginBottom:10 }}>{title}</div>
      <div style={{ color:G.t2, fontSize:13, lineHeight:1.7, marginBottom:18 }}>{body}</div>
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={onNo} style={{ flex:1, padding:14, background:G.b1, color:G.t2, border:`1px solid ${G.b2}`, borderRadius:12, fontFamily:"'Fira Code',monospace", fontSize:14, cursor:'pointer' }}>✕ Скасувати</button>
        <button onClick={onYes} style={{ flex:1, padding:14, background:'#16a34a', color:'#fff', border:'none', borderRadius:12, fontFamily:"'Fira Code',monospace", fontSize:14, fontWeight:600, cursor:'pointer' }}>✓ Підтвердити</button>
      </div>
    </Modal>
  )
}

function InputModal({ title, placeholder, defaultValue='', onConfirm, onCancel }) {
  const [val, setVal] = useState(defaultValue)
  return (
    <Modal onClose={onCancel}>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:19, fontWeight:700, marginBottom:14 }}>{title}</div>
      <input autoFocus value={val} onChange={e => setVal(e.target.value)} placeholder={placeholder}
        onKeyDown={e => { if (e.key==='Enter' && val.trim()) onConfirm(val.trim()) }} style={{ marginBottom:12 }} />
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={onCancel} style={{ flex:1, padding:14, background:G.b1, color:G.t2, border:`1px solid ${G.b2}`, borderRadius:12, fontFamily:"'Fira Code',monospace", fontSize:14, cursor:'pointer' }}>✕ Скасувати</button>
        <button onClick={() => val.trim() && onConfirm(val.trim())} style={{ flex:1, padding:14, background:G.or, color:'#fff', border:'none', borderRadius:12, fontFamily:"'Fira Code',monospace", fontSize:14, fontWeight:600, cursor:'pointer' }}>✓ OK</button>
      </div>
    </Modal>
  )
}

function Logo({ size=32 }) {
  return <img src="/logo.jpg" alt="ZmiyCell" style={{ width:size, height:size, objectFit:'cover', borderRadius:'50%' }} />
}

// ════════════════════════════════════════════════════════
//  ЕКРАН АВТОРИЗАЦІЇ
// ════════════════════════════════════════════════════════
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState(null)
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const pinInputRef = useRef(null)

  useEffect(() => { if (mode==='admin' && pinInputRef.current) pinInputRef.current.focus() }, [mode])

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
    else if (e.key === 'Backspace') setPin(p => p.slice(0,-1))
    else if (e.key === 'Escape') { setMode(null); setPin('') }
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, background:'rgba(10,15,26,0.97)' }}>
      <Logo size={64} />
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:32, fontWeight:800, letterSpacing:3, marginTop:12, marginBottom:32, color:G.or }}>ZmiyCell</div>
      {!mode ? (
        <div style={{ width:'100%', maxWidth:320, display:'flex', flexDirection:'column', gap:14 }}>
          <button onClick={() => onAuth('user')} style={{ padding:'18px 0', background:G.b1, border:`1px solid ${G.b2}`, color:G.t1, borderRadius:14, fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:700, cursor:'pointer', letterSpacing:1 }}>👷 УВІЙТИ ЯК ЮЗЕР</button>
          <button onClick={() => setMode('admin')} style={{ padding:'18px 0', background:'#1c1107', border:`1px solid ${G.or}`, color:G.or, borderRadius:14, fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:700, cursor:'pointer', letterSpacing:1 }}>🔐 АДМІН</button>
        </div>
      ) : (
        <div style={{ width:'100%', maxWidth:280, textAlign:'center' }}>
          <input ref={pinInputRef} type="tel" inputMode="numeric" value="" onChange={() => {}} onKeyDown={handleKeyboard}
            style={{ position:'absolute', opacity:0, pointerEvents:'none', width:1, height:1 }} autoComplete="off" />
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, color:G.t2, marginBottom:8, letterSpacing:1 }}>ВВЕДІТЬ PIN</div>
          <div style={{ fontSize:11, color:G.b2, marginBottom:16 }}>або наберіть з клавіатури</div>
          <div style={{ display:'flex', justifyContent:'center', gap:12, marginBottom:24 }}>
            {[0,1,2,3].map(i => <div key={i} style={{ width:18, height:18, borderRadius:'50%', background:pin.length>i?G.or:G.b2, border:`2px solid ${pin.length>i?G.or:G.b1}`, transition:'.15s', boxShadow:pin.length>i?`0 0 8px ${G.or}88`:'none' }} />)}
          </div>
          {err && <div style={{ color:G.rd, fontSize:13, marginBottom:12, animation:'pulse .3s ease' }}>{err}</div>}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10, marginBottom:10 }}>
            {[1,2,3,4,5,6,7,8,9].map(d => (
              <button key={d} onClick={() => { enterPin(String(d)); pinInputRef.current?.focus() }}
                style={{ padding:'18px 0', background:G.b1, border:`1px solid ${G.b2}`, color:G.t1, borderRadius:12, fontSize:22, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, cursor:'pointer', transition:'.1s', WebkitTapHighlightColor:'transparent', userSelect:'none' }}
                onTouchStart={e => e.currentTarget.style.background=G.b2} onTouchEnd={e => e.currentTarget.style.background=G.b1}>{d}</button>))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            <button onClick={() => { setMode(null); setPin('') }} style={{ padding:'18px 0', background:'#450a0a', border:'none', color:G.rd, borderRadius:12, fontSize:13, fontFamily:"'Fira Code',monospace", cursor:'pointer' }}>← Назад</button>
            <button onClick={() => { enterPin('0'); pinInputRef.current?.focus() }}
              style={{ padding:'18px 0', background:G.b1, border:`1px solid ${G.b2}`, color:G.t1, borderRadius:12, fontSize:22, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, cursor:'pointer' }}
              onTouchStart={e => e.currentTarget.style.background=G.b2} onTouchEnd={e => e.currentTarget.style.background=G.b1}>0</button>
            <button onClick={() => { setPin(p => p.slice(0,-1)); pinInputRef.current?.focus() }} style={{ padding:'18px 0', background:G.card, border:`1px solid ${G.b2}`, color:G.t2, borderRadius:12, fontSize:18, cursor:'pointer' }}>⌫</button>
          </div>
        </div>
      )}
    </div>
  )
}
// ════════════════════════════════════════════════════════
//  PrepTab — використовує глобальні матеріали
// ════════════════════════════════════════════════════════
function PrepTab({ batteryTypes, workers, assemblies, materials, prepItems, onIssueAssembly, onIssueConsumable, onReturn, onChangeScope, isAdmin }) {
  const [wId, setWId]         = useState(workers[0]?.id || '')
  const [typeId, setTypeId]   = useState(batteryTypes[0]?.id || '')
  const [asmId, setAsmId]     = useState(assemblies[0]?.id || '')
  const [consId, setConsId]   = useState(materials[0]?.id || '')
  const [qty, setQty]         = useState(1)
  const [allTypes, setAllTypes] = useState(false)
  const [forAll, setForAll]   = useState(false)
  const [retVals, setRetVals] = useState({})
  const [subTab, setSubTab]   = useState('active')
  
  const active = prepItems.filter(p => p.status !== 'returned')
  const asm = assemblies.find(a => a.id===asmId)

  const renderTotals = () => {
    const grouped = {}
    active.forEach(p => {
      const key = `${p.workerId}_${p.scope}_${p.matId}`
      if (!grouped[key]) grouped[key] = { workerName: p.workerName, matName: p.matName, unit: p.unit, amount: 0, scope: p.scope }
      grouped[key].amount += (p.qty - p.returnedQty)
    })
    const list = Object.values(grouped).filter(g => g.amount > 0).sort((a,b) => a.workerName.localeCompare(b.workerName))
    return <Card>
      <CardTitle color={G.pu}>📊 ЗАГАЛОМ НА РУКАХ</CardTitle>
      {list.length === 0 ? <div style={{ color:G.t2, fontSize:13 }}>Пусто</div> : 
        list.map((g,i) => <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${G.card2}`, fontSize:13 }}>
          <div><span style={{ fontWeight:600 }}>{g.workerName}</span> <span style={{ color:G.t2, fontSize:11 }}>({g.scope==='all'?'всі':'осб'})</span><br/><span style={{ color:G.t1 }}>{g.matName}</span></div>
          <div style={{ fontWeight:700, color:G.pu }}>{+g.amount.toFixed(4)} {g.unit}</div>
        </div>)
      }
    </Card>
  }

  return <>
    <SubTabs tabs={[['active','АМ. ВИДАЧІ'],['totals','ЗАГАЛОМ'],['asm','+ ЗБІРКИ'],['cons','+ РОЗХІД']]} active={subTab} onChange={setSubTab} />

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
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <input id="prep-all-types" type="checkbox" checked={allTypes} onChange={e => setAllTypes(e.target.checked)} />
        <label htmlFor="prep-all-types" style={{ fontSize:12, color:G.t2 }}>Для всіх типів</label>
      </div>
      <FormRow label="ЗАГОТОВКА (ЗБІРКА)">
        <select value={asmId} onChange={e => setAsmId(e.target.value)}>
          <option value="">— оберіть збірку —</option>
          {assemblies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </FormRow>
      <FormRow label="КІЛЬКІСТЬ">
        <input type="number" value={qty} onChange={e => setQty(parseFloat(e.target.value)||1)} min="0.01" step="0.01" />
      </FormRow>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
        <input id="prep-for-all" type="checkbox" checked={forAll} onChange={e => setForAll(e.target.checked)} />
        <label htmlFor="prep-for-all" style={{ fontSize:12, color:G.t2 }}>Для всіх працівників</label>
      </div>
      {asm && asm.components.length>0 && (
        <div style={{ background:G.b1, borderRadius:8, padding:'8px 10px', marginBottom:10 }}>
          <div style={{ fontSize:11, color:G.t2, marginBottom:6, fontWeight:700 }}>КОМПОНЕНТИ (на {qty} шт)</div>
          {asm.components.map(ac => {
            const gm = materials.find(m => m.id===ac.matId)
            const need = +(ac.qty * qty).toFixed(4)
            const ok = gm && gm.stock >= need
            return <div key={ac.id} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'2px 0', color:ok?G.t1:G.rd }}>
              <span>{gm?.name||ac.matId}</span>
              <span>{need} {gm?.unit||''} <span style={{ color:ok?G.t2:G.rd }}>(є: {gm?.stock??'?'})</span></span>
            </div>
          })}
        </div>
      )}
      <SubmitBtn color={G.pu} onClick={() => { if(asm) onIssueAssembly(wId, asmId, qty, allTypes ? 'ALL' : typeId, forAll) }}>📦 ВИДАТИ</SubmitBtn>
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
        <input type="number" value={qty} onChange={e => setQty(parseFloat(e.target.value)||1)} min="0.01" step="0.01" />
      </FormRow>
      <SubmitBtn color={G.pu} onClick={() => onIssueConsumable(wId, consId, qty)}>📦 ВИДАТИ</SubmitBtn>
    </Card>}

    {subTab === 'active' && <Card>
      <CardTitle color={G.pu}>📋 АКТИВНІ ВИДАЧІ ({active.length})</CardTitle>
      {active.length === 0
        ? <div style={{ color:G.t2, fontSize:13, padding:'6px 0' }}>Немає активних видач</div>
        : active.map(p => {
          const avail = +(p.qty - p.returnedQty).toFixed(4)
          const t = p.typeId === 'ALL' ? { name:'для всіх типів' } : batteryTypes.find(x => x.id === p.typeId)
          return <div key={p.id} style={{ background:G.card2, borderRadius:10, padding:12, marginBottom:8 }}>
            <div style={{ fontWeight:600, fontSize:14 }}>{p.matName}</div>
            <div style={{ fontSize:12, color:G.t2, marginTop:2 }}>{p.workerName} · {p.date}</div>
            {t && <div style={{ fontSize:11, color:G.t2, marginTop:2 }}>Тип: {t.name}</div>}
            <div style={{ fontSize:12, color:G.t2, marginTop:2 }}>Доступ: {p.scope==='all'?'для всіх':'особисто'}</div>
            <div style={{ fontSize:13, color:G.pu, margin:'4px 0 8px' }}>На руках: <b>{avail}</b> {p.unit}</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <input type="number" placeholder="кількість" value={retVals[p.id]||''} onChange={e => setRetVals(v => ({...v,[p.id]:e.target.value}))} style={{ width:100 }} min="0.01" step="0.01" max={avail} />
              <button onClick={() => onReturn(p.id, false, retVals[p.id])} style={{ padding:'7px 10px', background:'#1e1b4b', color:G.pu, border:`1px solid #3730a3`, borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:"'Fira Code',monospace", fontWeight:600 }}>↩ Частково</button>
              <button onClick={() => onReturn(p.id, true)} style={{ padding:'7px 10px', background:'#052e16', color:G.gn, border:`1px solid #166534`, borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:"'Fira Code',monospace", fontWeight:600 }}>↩↩ Все</button>
              {isAdmin && <button onClick={() => onChangeScope(p.id, p.scope==='all'?'self':'all')} style={{ padding:'7px 10px', background:G.b1, color:G.t2, border:`1px solid ${G.b2}`, borderRadius:8, fontSize:11, cursor:'pointer', fontFamily:"'Fira Code',monospace", fontWeight:600 }}>⇆ {p.scope==='all'?'в особисті':'для всіх'}</button>}
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
  const [authRole, setAuthRole] = useState(() => { try { return localStorage.getItem(AUTH_KEY)||null } catch { return null } })
  const handleAuth = (role) => { try { localStorage.setItem(AUTH_KEY, role) } catch {} setAuthRole(role) }
  const handleLogout = () => { try { localStorage.removeItem(AUTH_KEY) } catch {} setAuthRole(null) }
  if (!authRole) return <><style>{GLOBAL_CSS}</style><AuthScreen onAuth={handleAuth} /></>
  const isAdmin = authRole === 'admin'
  return <AppInner isAdmin={isAdmin} onLogout={handleLogout} />
}

function AppInner({ isAdmin, onLogout }) {
  // ── Стан сервера ─────────────────────────────────────────
  const [sync, setSync]         = useState('loading')
  const [toast, setToast]       = useState(null)
  const [modal, setModal]       = useState(null)
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
  const USER_NAV = [
    ['prod',   '⚙',  'ВИР.'],
    ['repair', '🔧', 'РЕМОНТ'],
    ['log',    '📋', 'ЖУРНАЛ'],
    ['stock',  '📦', 'СКЛАД'],
    ['tools',  '🛠', 'ІНСТР.'],
    ['manual', '📖', 'МАНУАЛ'],
  ]
  const NAV = isAdmin ? ALL_NAV : USER_NAV

  const [page, setPage]       = useState('prod')
  const [prodTab, setProdTab] = useState('writeoff')
  // PageAssembly стан
  const [asmId, setAsmId]           = useState('')
  const [asmQty, setAsmQty]         = useState(1)
  const [asmWorker, setAsmWorker]   = useState('')
  const [asmDate, setAsmDate]       = useState(todayStr())
  // Редактор збірок (адмін)
  const [asmTab, setAsmTab]         = useState('produce') // 'produce' | 'manage'
  const [editAsmId, setEditAsmId]   = useState(null) // яку збірку редагуємо
  const [editAsmComps, setEditAsmComps] = useState({})
  const [newAsmName, setNewAsmName] = useState('')
  const [newAsmOutMatId, setNewAsmOutMatId] = useState('')
  const [newAsmOutQty, setNewAsmOutQty]     = useState('1')
  const [newAsmNotes, setNewAsmNotes]       = useState('')
  const [newAsmComps, setNewAsmComps]       = useState({})
  const [newAcMatId, setNewAcMatId] = useState('')
  const [newAcQty, setNewAcQty]     = useState('')
  const [repTab, setRepTab]   = useState('new')
  const [stockTab, setStockTab] = useState('materials') // 'materials' | 'types'

  // ── Дані ─────────────────────────────────────────────────
  // materials: глобальний склад (id, name, unit, stock, minStock[для TG], shopUrl, isOrdered)
  // typeMaterials: [{id, typeId, matId, perBattery, minStock}] — конфігурація типів
  const [materials, setMaterials]         = useState([])
  const [typeMaterials, setTypeMaterials] = useState([])  // [{id,typeId,matId,perBattery,minStock}]
  const [assemblies, setAssemblies]       = useState([])  // [{id,name,outputMatId,outputQty,unit,notes,components:[]}]
  const [batteryTypes, setBatteryTypes]   = useState([])
  const [workers, setWorkers]         = useState([])
  const [tools, setTools]             = useState([])
  const [log, setLog]                 = useState([])
  const [repairLog, setRepairLog]     = useState([])
  const [prepItems, setPrepItems]     = useState([])
  const [payments, setPayments]       = useState([])
  const [toolLog, setToolLog]         = useState([])

  // ── UI стан ──────────────────────────────────────────────
  const [prodTypeId, setProdTypeId]   = useState('')
  const [prodWorker, setProdWorker]   = useState('')
  const [prodQty, setProdQty]         = useState(1)
  const [prodDate, setProdDate]       = useState(todayStr())
  const [prodSerials, setProdSerials] = useState([])
  const [stockSearch, setStockSearch] = useState('')
  const [repairSerial, setRepairSerial] = useState('')
  const [repairSearch, setRepairSearch] = useState('')
  // PageStock — глобальні матеріали
  const [rsVals, setRsVals]           = useState({})
  const [editShopId, setEditShopId]   = useState(null)
  const [editShopVal, setEditShopVal] = useState('')
  const [newGlobalMat, setNewGlobalMat] = useState({ name:'', unit:'', stock:'', minStock:'', shopUrl:'', photoUrl:'' })
  // PageStock — конфігурація типу (підтаб 'types')
  const [configTypeId, setConfigTypeId] = useState('')
  const [newTmMatId, setNewTmMatId]     = useState('')
  const [newTmPerBattery, setNewTmPerBattery] = useState('')
  const [newTmMinStock, setNewTmMinStock]     = useState('')
  // PageRepair стан
  const [repWorker, setRepWorker]     = useState('')
  const [repDate, setRepDate]         = useState(todayStr())
  const [repNote, setRepNote]         = useState('')
  const [matChecks, setMatChecks]     = useState({})
  const [matQtys, setMatQtys]         = useState({})
  const [manTypeId, setManTypeId]     = useState('')
  const [manWorkerId, setManWorkerId] = useState('')
  const [manDate, setManDate]         = useState(todayStr())
  const [completingId, setCompletingId] = useState(null)
  const [compWorker, setCompWorker]     = useState('')
  const [compDate, setCompDate]         = useState(todayStr())
  const [compNote, setCompNote]         = useState('')
  const [compChecks, setCompChecks]     = useState({})
  const [compQtys, setCompQtys]         = useState({})
  // PageWorkers
  const [newWorkerName, setNewWorkerName] = useState('')
  // PageTools
  const [toolTab, setToolTab]             = useState('active')
  const [newTool, setNewTool]             = useState({ name:'', category:'tool', count:1, serial:'', notes:'' })
  const [toolRepairModal, setToolRepairModal] = useState(null)
  const [toolRepairNote, setToolRepairNote]   = useState('')
  const [toolRepairDate, setToolRepairDate]   = useState(todayStr())
  const [toolRepairWorker, setToolRepairWorker] = useState('')
  // PageManual
  const [manualTab, setManualTab]         = useState('types')
  const [manualTypeId, setManualTypeId]   = useState('')
  const [manualAsmId, setManualAsmId]     = useState('')
  const [manualEditing, setManualEditing] = useState(false)
  const [manualDraft, setManualDraft]     = useState('')
  // Swipe hint
  const [swipeHint, setSwipeHint] = useState(null)

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
    log.filter(l => l.kind==='production').forEach(l => {
      const key = l.workerName
      if (!key) return
      map[key] = (map[key] || 0) + (parseInt(l.count) || 0)
    })
    return map
  }, [log])

  // ── Хелпери ──────────────────────────────────────────────
  const showToast  = useCallback((msg, type='ok') => { setToast({msg,type}); setTimeout(() => setToast(null), 3500) }, [])
  const openConfirm = useCallback((title, body, onYes) => setModal({type:'confirm',title,body,onYes}), [])
  const openInput  = useCallback((title, placeholder, defaultVal, onConfirm) => setModal({type:'input',title,placeholder,defaultVal,onConfirm}), [])
  const closeModal = () => setModal(null)

  // ── Pull-to-refresh ───────────────────────────────────────
  const handleTouchStart = (e) => { const el=e.currentTarget; if(el.scrollTop<=0){startY.current=e.touches[0].pageY;setIsPulling(true)} }
  const handleTouchMove  = (e) => { if(!isPulling) return; const dist=e.touches[0].pageY-startY.current; if(dist>0){setPullDist(Math.min(dist*.4,80));if(dist>10&&e.cancelable)e.preventDefault()}else{setIsPulling(false);setPullDist(0)} }
  const handleTouchEnd   = ()  => { if(pullDist>65) window.location.reload(); setIsPulling(false); setPullDist(0) }

  // ── API обгортка ─────────────────────────────────────────
  const api = useCallback(async (action, params=[]) => {
    setSync('saving')
    try { const res = await gasCall(action, params); setSync('ok'); return res }
    catch (e) { setSync('error'); showToast('Помилка: '+e.message, 'err'); throw e }
  }, [showToast])

  // ── Завантаження даних ────────────────────────────────────
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
      .catch(() => { setSync('error'); showToast('Не вдалось завантажити дані.','err') })
  }, [showToast])

  // ── Похідні дані ─────────────────────────────────────────
  const prodType   = batteryTypes.find(t => t.id===prodTypeId) || batteryTypes[0]
  const configType = batteryTypes.find(t => t.id===configTypeId) || batteryTypes[0]
  const perDay     = Math.max(1, workers.length) * 1.5
  const activePrep = prepItems.filter(p => p.status!=='returned')
  const perBatteryByMat = useMemo(() => {
    const map = {}
    typeMaterials.forEach(tm => {
      map[tm.matId] = (map[tm.matId] || 0) + (parseFloat(tm.perBattery) || 0)
    })
    return map
  }, [typeMaterials])

  // ── Хелпер: знайти глобальний мат за matId ───────────────
  const globalMat = (matId) => materials.find(m => m.id===matId)

  // ── Розрахунок витрат (глобальний склад) ─────────────────
  const buildConsumed = useCallback((type, workerId, qty) => {
    if (!type) return []
    const myPrep   = prepItems.filter(p => p.workerId===workerId && p.scope!=='all' && (p.typeId===type.id || p.typeId==='ALL') && p.status!=='returned')
    const allPrep  = prepItems.filter(p => p.scope==='all' && (p.typeId===type.id || p.typeId==='ALL') && p.status!=='returned')

    const tms = typeMaterials.filter(tm => tm.typeId===type.id)
    return tms.map(tm => {
      const gm = globalMat(tm.matId)
      if (!gm) return null
      let need = +(tm.perBattery * qty).toFixed(4)
      const needOrig = need
      const pAvail = myPrep.filter(p => p.matId===tm.matId).reduce((s,p) => +(s+p.qty-p.returnedQty).toFixed(4), 0)
      const fromPersonal = +Math.min(pAvail, need).toFixed(4)
      need = +(need - fromPersonal).toFixed(4)
      const aAvail = allPrep.filter(p => p.matId===tm.matId).reduce((s,p) => +(s+p.qty-p.returnedQty).toFixed(4), 0)
      const fromTeam = +Math.min(aAvail, need).toFixed(4)
      need = +(need - fromTeam).toFixed(4)
      return { matId:tm.matId, name:gm.name, unit:gm.unit, amount:needOrig, fromPersonal, fromTeam, fromStock:need, totalStock:gm.stock }
    }).filter(Boolean)
  }, [prepItems, materials, typeMaterials])

  // ── Хелпер оновлення глобального stock ───────────────────
  const updateGlobalStock = useCallback((matId, delta) => {
    setMaterials(prev => prev.map(m => m.id!==matId ? m : {...m, stock:Math.max(0, +(m.stock+delta).toFixed(4))}))
  }, [])
  // ════════════════════════════════════════════════════════
  //  ACTIONS
  // ════════════════════════════════════════════════════════

  const doWriteoff = () => {
    const type = prodType
    const worker = workers.find(w => w.id===prodWorker)
    if (!type || !worker) return showToast('Оберіть тип та працівника', 'err')
    const serials = prodSerials.slice(0, prodQty)
    for (const s of serials) if (!s?.trim()) return showToast('Введіть всі серійні номери', 'err')
    const consumed = buildConsumed(type, worker.id, prodQty)
    const shortage = consumed.find(c => c.fromStock > c.totalStock)
    if (shortage) return showToast('Не вистачає: '+shortage.name, 'err')

    openConfirm('Підтвердити списання',
      <div style={{ fontSize:13, color:G.t2, lineHeight:1.8 }}>
        <b style={{ color:G.t1 }}>{type.name}</b><br/>
        Працівник: {worker.name}<br/>
        Кількість: <b style={{ color:G.or }}>{prodQty}</b><br/>
        С/н: {serials.join(', ')}
      </div>,
      async () => {
        closeModal()
        const entry = { id:uid(), datetime:nowStr(), date:prodDate, typeId:type.id, typeName:type.name, workerId:worker.id, workerName:worker.name, count:prodQty, serials, consumed, kind:'production', repairNote:'' }
        try {
          await api('writeOff', [entry])
          // Оновлюємо глобальний stock
          consumed.forEach(c => { if (c.fromStock>0) updateGlobalStock(c.matId, -c.fromStock) })
          // Зменшуємо prepItems
          setPrepItems(prev => {
            const next = prev.map(p => ({...p}))
            consumed.forEach(c => {
              const deduct = (wId, amt) => {
                if (!amt) return
                let rem = amt
                next.filter(p => p.workerId===wId && (p.typeId===type.id || p.typeId==='ALL') && p.matId===c.matId && p.status!=='returned').forEach(p => {
                  if (rem<=0) return
                  const avail = p.qty-p.returnedQty
                  const use = Math.min(avail, rem)
                  p.returnedQty = +(p.returnedQty+use).toFixed(4)
                  p.status = p.returnedQty>=p.qty?'returned':'partial'
                  rem = +(rem-use).toFixed(4)
                })
              }
              deduct(worker.id, c.fromPersonal)
              deduct('TEAM_SHARED', c.fromTeam)
            })
            return next
          })
          setLog(prev => [entry, ...prev])
          setProdSerials([])
          showToast(`✓ Списано ${prodQty} акум. (${serials.join(', ')})`)
          // Telegram — низький запас
          const lowMats = consumed.filter(c => {
            const m = globalMat(c.matId)
            return m && (m.stock - (c.fromStock>0?c.fromStock:0)) <= m.minStock && m.minStock>0
          })
          if (lowMats.length>0) {
            const lines = lowMats.map(c => { const m=globalMat(c.matId); const ns=Math.max(0,+(m.stock-c.fromStock).toFixed(4)); return `• ${m.name}: ${ns} ${m.unit} (мін: ${m.minStock})` }).join('\n')
            sendTelegram(`⚠️ ZmiyCell — низький запас\n\n${lines}`)
          }
        } catch {}
      }
    )
  }

  const doIssueConsumable = (workerId, matId, qty) => {
    const worker = workers.find(w => w.id===workerId)
    const gm = materials.find(m => m.id===matId)
    if (!worker || !gm || !qty || qty<=0) return showToast('Заповніть всі поля', 'err')
    if (gm.stock < qty) return showToast('Не вистачає: '+gm.name, 'err')
    openConfirm('Видати розхідний матеріал',
      <div style={{ fontSize:13, color:G.t2, lineHeight:1.8 }}>
        <b style={{ color:G.or }}>{gm.name}</b><br/>
        Кількість: {qty} {gm.unit}<br/>
        Працівнику: {worker.name}
      </div>,
      async () => {
        closeModal()
        try {
          await api('issueConsumable', [worker.id, worker.name, gm.id, gm.name, qty, gm.unit, todayStr(), nowStr()])
          updateGlobalStock(gm.id, -qty)
          setLog(prev => [{
             id:'log_'+Date.now(), datetime:nowStr(), date:todayStr(), typeId:'ALL', typeName:'Розхідні матеріали',
             workerName:worker.name, count:0, serials:[], consumed:[{matId:gm.id, name:gm.name, unit:gm.unit, amount:qty}], kind:'consumable', repairNote:''
          }, ...prev])
          showToast(`✓ Видано ${qty} ${gm.unit}`)
        } catch {}
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
          setRepairLog(prev => prev.map(r => r.id===repairId ? {...r, status, note: r.note + (isCompleted ? (r.note ? ' | ' : '') + `Завершено: ${dateCompleted}` : '')} : r))
          showToast('✓ Статус оновлено')
        } catch {}
      }
    )
  }

  const doIssuePrepAssembly = (workerId, assemblyId, qty, typeId, forAll) => {
    const worker = workers.find(w => w.id===workerId)
    const asm = assemblies.find(a => a.id===assemblyId)
    if (!asm || !worker || !qty || qty<=0) return showToast("Заповніть всі поля", 'err')
    if (!asm.components || asm.components.length < 2) return showToast('Збірка повинна містити хоча б 2 матеріали', 'err')

    const items = asm.components.map(ac => {
      const gm = materials.find(m => m.id===ac.matId)
      return {
        id: uid(),
        workerId: worker.id,
        workerName: worker.name,
        typeId,
        matId: ac.matId,
        matName: gm?.name || ac.matId,
        unit: gm?.unit || '',
        qty: +(ac.qty * qty).toFixed(4),
        returnedQty: 0,
        date: todayStr(),
        datetime: nowStr(),
        status: 'active',
        scope: forAll ? 'all' : 'self',
      }
    })

    const shortage = items.find(it => {
      const gm = materials.find(m => m.id===it.matId)
      return !gm || gm.stock < it.qty
    })
    if (shortage) return showToast('Не вистачає: '+shortage.matName, 'err')

    openConfirm('Видача на заготовку',
      <div style={{ fontSize:13, color:G.t2, lineHeight:1.8 }}>
        <b style={{ color:G.t1 }}>{asm.name}</b><br/>
        Кількість: {qty} шт<br/>
        Працівник: {worker.name}<br/>
        Доступ: {forAll?'для всіх':'особисто'}
      </div>,
      async () => {
        closeModal()
        try {
          await api('addPrepItemsBatch', [items])
          items.forEach(it => updateGlobalStock(it.matId, -it.qty))
          setPrepItems(prev => [...items, ...prev])
          showToast(`✓ Видано заготовку: ${asm.name}`)
        } catch {}
      }
    )
  }

  const doChangePrepScope = async (prepId, scope) => {
    try {
      await api('updatePrepField', [prepId, 'scope', scope])
      setPrepItems(prev => prev.map(p => String(p.id)===String(prepId) ? {...p, scope} : p))
      showToast('✓ Оновлено доступ')
    } catch {}
  }

  const doReturnPrep = async (prepId, all, customQty) => {
    const item  = prepItems.find(p => String(p.id)===String(prepId))
    if (!item) return
    const avail = +(item.qty - item.returnedQty).toFixed(4)
    const qty   = all ? avail : parseFloat(customQty||0)
    if (!qty || qty<=0) return showToast('Введіть кількість', 'err')
    if (qty>avail) return showToast('Більше ніж є на руках', 'err')
    try {
      await api('returnPrep', [prepId, qty])
      updateGlobalStock(item.matId, qty)
      setPrepItems(prev => prev.map(p => String(p.id)!==String(prepId) ? p : {...p, returnedQty:+(p.returnedQty+qty).toFixed(4), status:(p.returnedQty+qty)>=p.qty?'returned':'partial'}))
      showToast(`✓ Повернено ${qty} ${item.unit}`)
    } catch {}
  }

  const doProduceAssembly = () => {
    const asm = assemblies.find(a => a.id===asmId)
    const worker = workers.find(w => w.id===asmWorker)
    if (!asm) return showToast('Оберіть збірку','err')
    if (!worker) return showToast('Оберіть працівника','err')
    if (!asmQty || asmQty<=0) return showToast('Введіть кількість','err')

    // Перевіряємо наявність компонентів
    const shortage = asm.components.find(ac => {
      const gm = globalMat(ac.matId)
      return !gm || gm.stock < +(ac.qty * asmQty).toFixed(4)
    })
    if (shortage) {
      const gm = globalMat(shortage.matId)
      return showToast('Не вистачає: '+(gm?.name||shortage.matId), 'err')
    }

    const outputAmt = +(asm.outputQty * asmQty).toFixed(4)
    openConfirm('Підтвердити виготовлення',
      <div style={{ fontSize:13, color:G.t2, lineHeight:1.8 }}>
        <b style={{ color:G.or }}>{asm.name}</b><br/>
        Кількість: <b style={{ color:G.cy }}>{asmQty}</b> партій → {outputAmt} {asm.unit}<br/>
        Працівник: {worker.name}<br/>
        {asm.components.map(ac => {
          const gm = globalMat(ac.matId)
          return <div key={ac.id}>− {+(ac.qty*asmQty).toFixed(4)} {gm?.unit||''} {gm?.name||''}</div>
        })}
      </div>,
      async () => {
        closeModal()
        const entry = { assemblyId:asm.id, qty:asmQty, workerId:worker.id, workerName:worker.name, date:asmDate, datetime:nowStr() }
        try {
          await api('produceAssembly', [entry])
          // Списуємо компоненти локально
          asm.components.forEach(ac => updateGlobalStock(ac.matId, -(ac.qty*asmQty)))
          // Додаємо вироблені на склад
          updateGlobalStock(asm.outputMatId, outputAmt)
          showToast(`✓ Виготовлено: ${outputAmt} ${asm.unit} → ${asm.name}`)
        } catch {}
      }
    )
  }

  const doSubmitRepair = (repairEntry) => {
    const err = repairEntry.materials.filter(m => m.selected && m.qty>0).find(m => {
      const gm = globalMat(m.matId)
      return gm && gm.stock < m.qty
    })
    if (err) return showToast('Не вистачає: '+err.matName, 'err')

    openConfirm('Підтвердити ремонт',
      <div style={{ fontSize:13, color:G.t2, lineHeight:1.8 }}>С/н: <b style={{ color:G.cy }}>{repairEntry.serial}</b><br/>Ремонтує: {repairEntry.repairWorker}</div>,
      async () => {
        closeModal()
        try {
          await api('addRepair', [repairEntry])
          repairEntry.materials.forEach(m => { if (m.selected && m.qty>0) updateGlobalStock(m.matId, -m.qty) })
          setRepairLog(prev => [repairEntry, ...prev])
          setLog(prev => [{
            id:repairEntry.id+'L', datetime:repairEntry.datetime, date:repairEntry.date,
            typeId:repairEntry.typeId, typeName:repairEntry.typeName, workerName:repairEntry.repairWorker,
            count:0, serials:[repairEntry.serial],
            consumed:repairEntry.materials.filter(m => m.selected&&m.qty>0).map(m => ({name:m.matName,unit:m.unit,amount:m.qty})),
            kind:'repair', repairNote:repairEntry.note||''
          }, ...prev])
          setRepairSerial(''); setRepairSearch('')
          showToast('✓ Ремонт зафіксовано: '+repairEntry.serial)
        } catch {}
      }
    )
  }

  // ════════════════════════════════════════════════════════
  //  СТОРІНКИ
  // ════════════════════════════════════════════════════════
  const wrap = (children) =>
    <div style={{ padding:'12px 12px 40px', maxWidth:700, margin:'0 auto' }}>{children}</div>


  // ── Таб Збірка (всередині ВИРОБНИЦТВО) ───────────────────
  const AssemblyTab = () => {
    const curAsm = assemblies.find(a => a.id===asmId)

    if (assemblies.length===0) return (
      <Card>
        <div style={{ color:G.t2, fontSize:13, textAlign:'center', padding:'10px 0' }}>
          Збірки не налаштовано.{isAdmin ? ' Перейдіть на СКЛАД → ⚙️ ЗБІРКИ.' : ' Зверніться до адміна.'}
        </div>
      </Card>
    )

    return <>
      <Card>
        <CardTitle color='#a78bfa'>⚙️ ВИГОТОВИТИ ЗБІРКУ</CardTitle>
        <FormRow label="ЗБІРКА">
          <select value={asmId} onChange={e => setAsmId(e.target.value)}>
            <option value="">— оберіть збірку —</option>
            {assemblies.map(a => {
              const gm = globalMat(a.outputMatId)
              return <option key={a.id} value={a.id}>{a.name} → {a.outputQty} {gm?.unit||a.unit} {gm?.name||''}</option>
            })}
          </select>
        </FormRow>
        <FormRow label="КІЛЬКІСТЬ ПАРТІЙ">
          <input type="number" min="1" value={asmQty} onChange={e => setAsmQty(parseInt(e.target.value)||1)} />
        </FormRow>
        <FormRow label="ПРАЦІВНИК">
          <select value={asmWorker} onChange={e => setAsmWorker(e.target.value)}>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </FormRow>
        <FormRow label="ДАТА"><input value={asmDate} onChange={e => setAsmDate(e.target.value)} /></FormRow>

        {curAsm && curAsm.components.length>0 && (
          <div style={{ background:G.b1, borderRadius:8, padding:'10px 12px', marginBottom:10 }}>
            <div style={{ fontSize:11, color:G.t2, marginBottom:6, fontWeight:700 }}>КОМПОНЕНТИ (на {asmQty} партій)</div>
            {curAsm.components.map(ac => {
              const gm  = globalMat(ac.matId)
              const need = +(ac.qty * asmQty).toFixed(4)
              const ok   = gm && gm.stock >= need
              return <div key={ac.id} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'3px 0', color:ok?G.t1:G.rd }}>
                <span>{gm?.name||ac.matId}</span>
                <span style={{ fontWeight:600 }}>{need} {gm?.unit||''} <span style={{ color:ok?G.t2:G.rd, fontSize:11 }}>(є: {gm?.stock??'?'})</span></span>
              </div>
            })}
            <div style={{ borderTop:`1px solid ${G.b2}`, marginTop:8, paddingTop:8, display:'flex', justifyContent:'space-between', fontSize:13 }}>
              <span style={{ color:G.t2 }}>Вийде на склад:</span>
              <span style={{ color:'#a78bfa', fontWeight:700 }}>+{+(curAsm.outputQty*asmQty).toFixed(4)} {globalMat(curAsm.outputMatId)?.unit||curAsm.unit} {globalMat(curAsm.outputMatId)?.name||''}</span>
            </div>
          </div>
        )}

        <SubmitBtn onClick={doProduceAssembly} color='#a78bfa'>⚙️ ВИГОТОВИТИ</SubmitBtn>
      </Card>
    </>
  }

  // ── Виробництво ───────────────────────────────────────────
  const PageProd = () => {
    const consumed = prodType ? buildConsumed(prodType, prodWorker, prodQty) : []
    const serials  = Array.from({length:prodQty}, (_,i) => prodSerials[i]||'')
    return wrap(<>
      <SubTabs tabs={[['writeoff','🔋 СПИСАННЯ'],['prep','📦 ЗАГОТОВКА'],['assembly','⚙️ ЗБІРКА']]} active={prodTab} onChange={setProdTab} />
      {prodTab==='writeoff' && <>
        <TypeTabs types={batteryTypes} active={prodTypeId} onSelect={id => {setProdTypeId(id);setProdSerials([])}} />
        <Card>
          <FormRow label="ПРАЦІВНИК">
            <select value={prodWorker} onChange={e => setProdWorker(e.target.value)}>
              {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </FormRow>
          <FormRow label="ДАТА"><input value={prodDate} onChange={e => setProdDate(e.target.value)} /></FormRow>
          <FormRow label="КІЛЬКІСТЬ АКУМУЛЯТОРІВ">
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <QtyBtn onClick={() => {if(prodQty>1){setProdQty(q=>q-1);setProdSerials(s=>s.slice(0,-1))}}}>−</QtyBtn>
              <span style={{ fontSize:28, fontWeight:700, color:G.or, minWidth:44, textAlign:'center' }}>{prodQty}</span>
              <QtyBtn onClick={() => {if(prodQty<20)setProdQty(q=>q+1)}}>+</QtyBtn>
            </div>
          </FormRow>
          <FormRow label="СЕРІЙНІ НОМЕРИ">
            {serials.map((v,i) => <input key={i} placeholder={`#${i+1} серійний номер`} value={v}
              onChange={e => {const s=[...prodSerials];while(s.length<=i)s.push('');s[i]=e.target.value;setProdSerials(s)}}
              style={{ marginBottom:6 }} />)}
          </FormRow>
        </Card>
        {prodType && <Card>
          <CardTitle>⚡ БУДЕ СПИСАНО</CardTitle>
          {consumed.length===0 ? <div style={{ color:G.t2, fontSize:13 }}>Матеріали не налаштовано для цього типу</div>
          : consumed.map(c => {
            const ok = c.fromStock<=c.totalStock
            return <div key={c.matId} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:`1px solid ${G.b1}`, fontSize:13 }}>
              <span style={{ color:ok?G.t1:G.rd, flex:1, paddingRight:8 }}>{c.name}</span>
              <div style={{ display:'flex', gap:5, alignItems:'center', flexWrap:'wrap', justifyContent:'flex-end' }}>
                {c.fromPersonal>0 && <Chip bg='#2e1065' color='#c084fc' bd='#4c1d95'>👷{c.fromPersonal}</Chip>}
                {c.fromTeam>0    && <Chip bg='#1e3a8a' color='#93c5fd' bd='#1e40af'>🤝{c.fromTeam}</Chip>}
                {c.fromStock>0   && <Chip bg='#1c1007' color='#fb923c' bd='#9a3412'>🏭{c.fromStock}</Chip>}
                <span style={{ color:ok?G.gn:G.rd, fontWeight:600, minWidth:60, textAlign:'right' }}>{c.amount} {c.unit}</span>
              </div>
            </div>
          })}
        </Card>}
        <SubmitBtn onClick={doWriteoff}>✓ СПИСАТИ МАТЕРІАЛИ</SubmitBtn>
        <div style={{ height:16 }} />
      </>}
      {prodTab==='prep' && <PrepTab
        batteryTypes={batteryTypes}
        workers={workers}
        assemblies={assemblies}
        materials={materials}
        prepItems={prepItems}
        onIssueAssembly={doIssuePrepAssembly}
        onReturn={doReturnPrep}
        onChangeScope={doChangePrepScope}
        isAdmin={isAdmin}
      />}
      {prodTab==='assembly' && <AssemblyTab />}
    </>)
  }
  // ── Склад ─────────────────────────────────────────────────
  const PageStock = () => {
    const filteredMats = materials.filter(m => !stockSearch || m.name.toLowerCase().includes(stockSearch.toLowerCase()))

    // ── Підтаб: Матеріали (глобальний склад) ─────────────
    const TabMaterials = () => {
      const restock = async (matId) => {
        const qty = parseFloat(rsVals[matId]||0)
        if (!qty || qty<=0) return showToast('Введіть кількість', 'err')
        await api('updateMaterialStock', [matId, qty])
        updateGlobalStock(matId, qty)
        setRsVals(v => ({...v,[matId]:''}))
        showToast(`✓ Поповнено на ${qty}`)
      }

      const editStock = (m) => openInput('Новий залишок:', String(m.stock), String(m.stock), async (val) => {
        closeModal()
        const parsed = parseFloat(val)
        if (isNaN(parsed)) return showToast('Невірне значення','err')
        const delta = parsed - m.stock
        await api('updateMaterialStock', [m.id, delta])
        updateGlobalStock(m.id, delta)
        showToast(`✓ Залишок встановлено: ${parsed}`)
      })

      const editField = (m, field) => {
        const labels = { name:'Нова назва:', minStock:'Мін. запас:', shopUrl:'Посилання на магазин:', unit:'Одиниця виміру:', photoUrl:'Посилання на фото:' }
        openInput(labels[field]||field, String(m[field]||''), String(m[field]||''), async (val) => {
          closeModal()
          const value = ['minStock'].includes(field) ? parseFloat(val)||0 : val.trim()
          await api('updateMaterialField', [m.id, field, value])
          setMaterials(prev => prev.map(mx => mx.id!==m.id ? mx : {...mx,[field]:value}))
          showToast('✓ Збережено')
        })
      }

      const deleteMat = (m) => openConfirm('Видалити матеріал?',
        <span>Видалить: <b style={{ color:G.rd }}>{m.name}</b> і всі прив'язки до типів</span>,
        async () => {
          closeModal()
          await api('deleteMaterial', [m.id])
          setMaterials(prev => prev.filter(mx => mx.id!==m.id))
          setTypeMaterials(prev => prev.filter(tm => tm.matId!==m.id))
          showToast('✓ Видалено '+m.name)
        })

      const showHist = (m) => {
        const entries = log.flatMap(e => (e.consumed||[]).filter(c => c.name===m.name).map(c => ({...c,datetime:e.datetime,workerName:e.workerName,kind:e.kind}))).slice(0,20)
        setModal({type:'history', mat:m, entries})
      }

      const addMat = async () => {
        const {name,unit,stock,minStock,shopUrl,photoUrl} = newGlobalMat
        if (!name||!unit) return showToast("Назва і одиниця — обов'язкові",'err')
        const res = await api('addMaterial', [name, unit, parseFloat(stock)||0, parseFloat(minStock)||0, shopUrl||'', photoUrl||''])
        const nm = {id:res.id, name, unit, stock:parseFloat(stock)||0, minStock:parseFloat(minStock)||0, shopUrl:shopUrl||'', photoUrl:photoUrl||'', isOrdered:false}
        setMaterials(prev => [...prev, nm])
        setNewGlobalMat({name:'',unit:'',stock:'',minStock:'',shopUrl:'',photoUrl:''})
        setNewTmMatId(res.id)
        showToast('✓ Додано '+name)
      }

      if (!isAdmin) return <>
        <input placeholder="🔍 Пошук матеріалу..." value={stockSearch} onChange={e => setStockSearch(e.target.value)} style={{ marginBottom:10 }} />
        {filteredMats.map(m => <div key={m.id} style={{ background:G.card, border:`1px solid ${G.b1}`, borderRadius:12, padding:12, marginBottom:8 }}>
          <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:6 }}>
            {m.photoUrl && <img src={m.photoUrl} alt={m.name} style={{ width:44, height:44, borderRadius:8, objectFit:'cover', border:`1px solid ${G.b1}` }} />}
            <div style={{ fontSize:14, fontWeight:600 }}>{m.name}</div>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
            <StockBadge m={m} />
            <span style={{ background:G.card2, border:`1px solid ${G.b1}`, borderRadius:6, padding:'2px 8px', fontSize:13, color:G.cy, fontWeight:700 }}>{m.stock} {m.unit}</span>
            <span style={{ fontSize:11, color:G.t2 }}>мін:{m.minStock}</span>
          </div>
          {m.shopUrl && <a href={m.shopUrl} target="_blank" rel="noreferrer" style={{ fontSize:11, color:G.cy, textDecoration:'none', display:'inline-block', marginTop:6 }}>🔗 Магазин</a>}
        </div>)}
      </>

      return <>
        <input placeholder="🔍 Пошук матеріалу..." value={stockSearch} onChange={e => setStockSearch(e.target.value)} style={{ marginBottom:10 }} />

        {filteredMats.map(m => {
          const inPrep = prepItems.filter(p => p.matId===m.id && p.status!=='returned').reduce((s,p) => +(s+p.qty-p.returnedQty).toFixed(4), 0)
          return <div key={m.id} style={{ background:G.card, border:`1px solid ${G.b1}`, borderRadius:12, padding:12, marginBottom:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:6 }}>
              <div style={{ flex:1, display:'flex', gap:10 }}>
                {m.photoUrl && <img src={m.photoUrl} alt={m.name} style={{ width:44, height:44, borderRadius:8, objectFit:'cover', border:`1px solid ${G.b1}` }} />}
                <div>
                  <div onClick={() => editField(m,'name')} style={{ fontSize:14, fontWeight:600, cursor:'pointer', color:G.t1 }}>{m.name}</div>
                  <div onClick={() => editField(m,'unit')} style={{ cursor:'pointer', fontSize:11, color:G.t2, marginTop:2 }}>{m.unit}</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                <button onClick={() => showHist(m)} style={{ background:G.card2, border:`1px solid ${G.b1}`, color:G.pu, padding:'3px 8px', borderRadius:6, fontSize:11, cursor:'pointer' }}>📊</button>
                <button onClick={() => deleteMat(m)} style={{ background:'#450a0a', border:'none', color:G.rd, padding:'3px 8px', borderRadius:6, fontSize:11, cursor:'pointer' }}>✕</button>
              </div>
            </div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center', marginBottom:8 }}>
              <StockBadge m={m} />
              <span onClick={() => editStock(m)} style={{ background:G.card2, border:`1px solid ${G.b1}`, borderRadius:6, padding:'2px 8px', fontSize:12, color:G.cy, cursor:'pointer' }}>{m.stock} {m.unit}</span>
              <span onClick={() => editField(m,'minStock')} style={{ fontSize:11, color:G.t2, cursor:'pointer' }}>мін:{m.minStock}</span>
              {inPrep>0 && <Chip bg='#2e1065' color='#c084fc' bd='#4c1d95'>📦{inPrep}</Chip>}
            </div>

            {/* Посилання на магазин */}
            {editShopId===m.id ? (
              <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                <input placeholder="https://..." value={editShopVal} onChange={e => setEditShopVal(e.target.value)} style={{ fontSize:12 }} />
                <button onClick={async () => { await api('updateMaterialField',[m.id,'shopUrl',editShopVal]); setMaterials(prev => prev.map(mx => mx.id!==m.id?mx:{...mx,shopUrl:editShopVal})); setEditShopId(null); showToast('✓ Збережено') }} style={{ padding:'6px 10px', background:G.gn, color:'#000', border:'none', borderRadius:8, fontSize:12, cursor:'pointer', fontWeight:700 }}>✓</button>
                <button onClick={() => setEditShopId(null)} style={{ padding:'6px 10px', background:G.b1, color:G.t2, border:`1px solid ${G.b2}`, borderRadius:8, fontSize:12, cursor:'pointer' }}>✕</button>
              </div>
            ) : (
              <div style={{ marginBottom:8 }}>
                {m.shopUrl ? <a href={m.shopUrl} target="_blank" rel="noreferrer" style={{ fontSize:11, color:G.cy, textDecoration:'none', marginRight:8 }}>🔗 Магазин</a> : null}
                <span onClick={() => {setEditShopId(m.id);setEditShopVal(m.shopUrl||'')}} style={{ fontSize:11, color:G.t2, cursor:'pointer', marginRight:8 }}>{m.shopUrl?'✎':'+ посилання'}</span>
                <span onClick={() => editField(m,'photoUrl')} style={{ fontSize:11, color:G.t2, cursor:'pointer' }}>{m.photoUrl?'📷 змінити фото':'+ фото'}</span>
              </div>
            )}

            <div style={{ display:'flex', gap:6 }}>
              <input type="number" placeholder="+кільк." value={rsVals[m.id]||''} onChange={e => setRsVals(v => ({...v,[m.id]:e.target.value}))} onKeyDown={e => e.key==='Enter'&&restock(m.id)} style={{ width:90 }} />
              <button onClick={() => restock(m.id)} style={{ padding:'6px 12px', background:'#431407', color:'#fed7aa', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>+поповнити</button>
            </div>
          </div>
        })}

        {isAdmin && <Card>
          <CardTitle color={G.gn}>+ НОВИЙ МАТЕРІАЛ НА СКЛАД</CardTitle>
          <FormRow label="НАЗВА">
            <input placeholder="напр. Нікелева стрічка" value={newGlobalMat.name} onChange={e => setNewGlobalMat(v => ({...v,name:e.target.value}))} />
          </FormRow>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:6 }}>
            <div><Label>ОДИНИЦЯ</Label><input placeholder="шт, м, г" value={newGlobalMat.unit} onChange={e => setNewGlobalMat(v => ({...v,unit:e.target.value}))} /></div>
            <div><Label>ЗАЛИШОК</Label><input type="number" placeholder="0" value={newGlobalMat.stock} onChange={e => setNewGlobalMat(v => ({...v,stock:e.target.value}))} /></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:6 }}>
            <div><Label>МІН. ЗАПАС</Label><input type="number" placeholder="0" value={newGlobalMat.minStock} onChange={e => setNewGlobalMat(v => ({...v,minStock:e.target.value}))} /></div>
            <div><Label>ПОСИЛАННЯ</Label><input placeholder="https://..." value={newGlobalMat.shopUrl} onChange={e => setNewGlobalMat(v => ({...v,shopUrl:e.target.value}))} /></div>
          </div>
          <FormRow label="ФОТО (URL)">
            <input placeholder="https://..." value={newGlobalMat.photoUrl} onChange={e => setNewGlobalMat(v => ({...v,photoUrl:e.target.value}))} />
          </FormRow>
          <SubmitBtn onClick={addMat} color={G.gn}>+ ДОДАТИ НА СКЛАД</SubmitBtn>
        </Card>}
      </>
    }

    // ── Підтаб: Типи батарей (конфігурація) ──────────────
    const TabTypes = () => {
      if (!isAdmin) return <div style={{ color:G.t2, fontSize:13, padding:20, textAlign:'center' }}>Доступно тільки адміну</div>

      const editTm = (tmId, typeId, matId, field, oldVal) => openInput(
        field==='perBattery'?'На 1 акумулятор:':'Мін. запас для цього типу:',
        String(oldVal), String(oldVal),
        async (val) => {
          closeModal()
          const parsed = parseFloat(val)||0
          await api('updateTypeMaterial', [tmId, field, parsed])
          setTypeMaterials(prev => prev.map(tm => tm.id!==tmId ? tm : {...tm,[field]:parsed}))
          showToast('✓ Оновлено')
        }
      )

      const removeTm = (m) => openConfirm('Видалити прив\'язку?',
        <span>Матеріал <b style={{ color:G.rd }}>{m.name}</b> більше не буде списуватись для цього типу. Зі складу не видаляється.</span>,
        async () => {
          closeModal()
          await api('removeTypeMaterial', [m.id])
          setTypeMaterials(prev => prev.filter(tm => tm.id!==m.id))
          showToast('✓ Прив\'язку видалено')
        }
      )

      const addTm = async () => {
        if (!newTmMatId || !newTmPerBattery) return showToast("Оберіть матеріал і вкажіть норму",'err')
        const alreadyExists = typeMaterials.find(tm => tm.typeId===configTypeId && tm.matId===newTmMatId)
        if (alreadyExists) return showToast('Цей матеріал вже є для даного типу','err')
        const gm = materials.find(m => m.id===newTmMatId)
        const pb = parseFloat(newTmPerBattery)||0
        const ms = parseFloat(newTmMinStock)||0
        const res = await api('addTypeMaterial', [configTypeId, newTmMatId, pb, ms])
        setTypeMaterials(prev => [...prev, {id:res.id, typeId:configTypeId, matId:gm.id, perBattery:pb, minStock:ms}])
        setNewTmPerBattery('')
        setNewTmMinStock('')
        showToast(`✓ ${gm.name} → ${configType.name}`)
      }

      const addBattType = () => openInput('Новий тип акумулятора','Назва типу (напр. 48V 20Ah)','', async (name) => {
        closeModal()
        const res = await api('addBatteryType', [name])
        const newType = {id:res.id, name, color:G.or}
        setBatteryTypes(p => [...p, newType])
        setConfigTypeId(res.id)
        showToast('✓ Тип додано: '+name)
      })

      return <>
        <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'flex-start' }}>
          <div style={{ flex:1 }}><TypeTabs types={batteryTypes} active={configTypeId} onSelect={setConfigTypeId} /></div>
          <button onClick={addBattType} style={{ background:G.b1, border:`1px solid ${G.b2}`, color:G.gn, padding:'10px 14px', borderRadius:10, fontSize:18, cursor:'pointer', flexShrink:0 }}>+</button>
        </div>

        {configType && <>
          <div style={{ color:G.t2, fontSize:12, marginBottom:10, padding:'6px 10px', background:G.b1, borderRadius:8 }}>
            Матеріали для <b style={{ color:configType.color||G.or }}>{configType.name}</b> — що і скільки витрачається на один акумулятор
          </div>

          {typeMaterials.filter(tm=>tm.typeId===configTypeId).length===0
            ? <Card><div style={{ color:G.t2, fontSize:13, textAlign:'center', padding:'10px 0' }}>Матеріали не налаштовано — додайте нижче</div></Card>
            : typeMaterials.filter(tm=>tm.typeId===configTypeId).map(tm => {
              const gm = globalMat(tm.matId)
              return <div key={tm.matId} style={{ background:G.card, border:`1px solid ${G.b1}`, borderRadius:12, padding:12, marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600 }}>{gm?.name??'?'}</div>
                    <div style={{ fontSize:11, color:G.t2, marginTop:2 }}>На складі: <b style={{ color:G.cy }}>{gm?.stock??'?'} {gm?.unit??''}</b></div>
                  </div>
                  <button onClick={() => removeTm(tm)} style={{ background:'#450a0a', border:'none', color:G.rd, padding:'4px 8px', borderRadius:6, fontSize:11, cursor:'pointer' }}>✕</button>
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:8, alignItems:'center' }}>
                  <span onClick={() => editTm(tm.id, configTypeId, tm.matId, 'perBattery', tm.perBattery)} style={{ background:G.card2, border:`1px solid ${G.or}44`, borderRadius:8, padding:'4px 10px', fontSize:13, color:G.or, cursor:'pointer', fontWeight:600 }}>
                    ×{tm.perBattery} {gm?.unit??''}/акум
                  </span>
                  <span onClick={() => editTm(tm.id, configTypeId, tm.matId, 'minStock', tm.minStock)} style={{ background:G.card2, border:`1px solid ${G.b2}`, borderRadius:8, padding:'4px 10px', fontSize:12, color:G.t2, cursor:'pointer' }}>
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
                {materials.filter(m => !typeMaterials.find(tm => tm.typeId===configTypeId && tm.matId===m.id)).map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.stock} {m.unit})</option>
                ))}
              </select>
            </FormRow>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              <div><Label>НА 1 АКУМУЛЯТОР</Label><input type="number" placeholder="напр. 48" value={newTmPerBattery} onChange={e => setNewTmPerBattery(e.target.value)} /></div>
              <div><Label>МІН. ЗАПАС (тут)</Label><input type="number" placeholder="0" value={newTmMinStock} onChange={e => setNewTmMinStock(e.target.value)} /></div>
            </div>
            {newTmMatId && materials.find(m => m.id===newTmMatId) && (
              <div style={{ fontSize:12, color:G.t2, marginTop:8, padding:'6px 10px', background:G.b1, borderRadius:8 }}>
                На складі: <b style={{ color:G.cy }}>{materials.find(m => m.id===newTmMatId)?.stock} {materials.find(m => m.id===newTmMatId)?.unit}</b>
              </div>
            )}
            <SubmitBtn onClick={addTm} color={G.gn}>+ ПРИВ'ЯЗАТИ ДО ТИПУ</SubmitBtn>
          </Card>
        </>}
      </>
    }


    // ── Підтаб: Збірки ────────────────────────────────────
    const TabAssemblies = () => {
      if (!isAdmin) return <div style={{ color:G.t2, fontSize:13, padding:20, textAlign:'center' }}>Доступно тільки адміну</div>

      const createAsm = async () => {
        if (!newAsmName||!newAsmOutMatId||!newAsmOutQty) return showToast("Назва, матеріал (результат) і кількість — обов'язкові",'err')
        
        const requiredComps = Object.keys(newAsmComps).filter(mId => newAsmComps[mId]>0).map(mId => ({matId:mId, qty:newAsmComps[mId]}))
        if(requiredComps.length < 2) return showToast("Збірка повинна містити хоча б 2 матеріали", 'err')

        const gm = globalMat(newAsmOutMatId)
        const res = await api('addAssembly', [newAsmName, newAsmOutMatId, parseFloat(newAsmOutQty)||1, gm?.unit||'', newAsmNotes])
        if (!res.ok) return showToast(res.error, 'err')
        
        await api('saveAssemblyComponents', [res.id, JSON.stringify(requiredComps)])
        const newComponents = requiredComps.map((c, i) => ({ id: 'ac_' + Date.now() + '_' + i, assemblyId: res.id, matId: c.matId, qty: c.qty }))

        const na = {id:res.id, name:newAsmName, outputMatId:newAsmOutMatId, outputQty:parseFloat(newAsmOutQty)||1, unit:gm?.unit||'', notes:newAsmNotes, components:newComponents}
        
        setAssemblies(prev => [...prev, na])
        setNewAsmName(''); setNewAsmNotes(''); setNewAsmComps({})
        showToast('✓ Збірку створено: '+newAsmName)
      }

      const deleteAsm = (a) => openConfirm('Видалити збірку?',
        <span>Видалить <b style={{ color:G.rd }}>{a.name}</b> і всі компоненти</span>,
        async () => {
          closeModal()
          await api('deleteAssembly', [a.id])
          setAssemblies(prev => prev.filter(ax => ax.id!==a.id))
          if (editAsmId===a.id) setEditAsmId(null)
          showToast('✓ Видалено')
        })

      const startEditAsm = (a) => {
        const initial = {}
        a.components.forEach(ac => initial[ac.matId] = ac.qty)
        setEditAsmComps(initial)
        setEditAsmId(a.id)
      }

      const saveEditAsm = async (a) => {
        const mats = Object.keys(editAsmComps).filter(matId => editAsmComps[matId] > 0).map(matId => ({ matId, qty: editAsmComps[matId] }))
        if (mats.length < 2) return showToast('Збірка повинна містити хоча б 2 матеріали', 'err')
        
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
        showToast('✓ Склад збірки збережено')
      }

      const addComp = async () => { /* deprecated single add */ }
      const removeComp = (asmId, ac) => { /* deprecated single remove */ }
      const editCompQty = (asmId, ac) => { /* deprecated single edit */ }

      return <>
        {/* Список збірок */}
        {assemblies.map(a => {
          const gm = globalMat(a.outputMatId)
          const isEditing = editAsmId===a.id
          return <div key={a.id} style={{ background:G.card, border:`1px solid ${isEditing?'#7c3aed':G.b1}`, borderRadius:12, padding:12, marginBottom:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:'#a78bfa' }}>{a.name}</div>
                <div style={{ fontSize:12, color:G.t2, marginTop:2 }}>
                  → <b style={{ color:G.cy }}>{a.outputQty}</b> {gm?.unit||a.unit} <b>{gm?.name||'?'}</b> на складі
                </div>
              </div>
              <div style={{ display:'flex', gap:4 }}>
                <button onClick={() => {
                  if (isEditing) {
                    saveEditAsm(a)
                  } else {
                    startEditAsm(a)
                  }
                }} style={{ background:isEditing?'#166534':G.b1, border:`1px solid ${isEditing?'#22c55e':G.b2}`, color:isEditing?'#22c55e':'#a78bfa', padding:'4px 10px', borderRadius:6, fontSize:11, cursor:'pointer' }}>
                  {isEditing?'✓ зберегти':'✎ склад'}
                </button>
                {isEditing && <button onClick={() => setEditAsmId(null)} style={{ background:G.b1, border:`1px solid ${G.b2}`, color:G.t2, padding:'4px 10px', borderRadius:6, fontSize:11, cursor:'pointer' }}>✕ скасувати</button>}
                {!isEditing && <button onClick={() => deleteAsm(a)} style={{ background:'#450a0a', border:'none', color:G.rd, padding:'4px 8px', borderRadius:6, fontSize:11, cursor:'pointer' }}>✕</button>}
              </div>
            </div>

            {/* View Mode */}
            {!isEditing && a.components.length>0 && <div style={{ background:G.b1, borderRadius:8, padding:'8px 10px' }}>
              {a.components.map(ac => {
                const cgm = globalMat(ac.matId)
                return <div key={ac.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'3px 0', fontSize:13 }}>
                  <span style={{ flex:1, color:G.t1 }}>{cgm?.name||ac.matId}</span>
                  <span style={{ color:G.or, fontWeight:600, background:G.card2, borderRadius:6, padding:'2px 8px' }}>×{ac.qty} {cgm?.unit||''}</span>
                </div>
              })}
            </div>}

            {/* Edit Mode (Multi-Select List) */}
            {isEditing && <div style={{ borderTop:`1px solid ${G.b1}`, paddingTop:10 }}>
              <div style={{ fontSize:12, color:G.t2, marginBottom:10 }}>Позначте матеріали, з яких складається ця збірка:</div>
              {materials.map(m => {
                const checked = (editAsmComps[m.id] !== undefined && editAsmComps[m.id] > 0)
                const qty = editAsmComps[m.id] || ''
                return <div key={m.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:`1px solid ${G.b1}`, fontSize:13 }}>
                  <input type="checkbox" checked={checked} onChange={e => {
                    const chk = e.target.checked
                    setEditAsmComps(v => ({ ...v, [m.id]: chk ? 1 : 0 }))
                  }} style={{ width:18, height:18, accentColor:'#a78bfa', cursor:'pointer', flexShrink:0 }} />
                  <div style={{ flex:1, color:checked?G.t1:G.t2 }}>{m.name}</div>
                  {checked && <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <input type="number" min="0.001" step="any" value={qty} onChange={e => setEditAsmComps(v => ({...v,[m.id]:parseFloat(e.target.value)||0}))} style={{ width:70, border:`1px solid #7c3aed`, textAlign:'center', padding:'4px' }} placeholder="кількість" />
                    <span style={{ color:G.t2, fontSize:11, width:24 }}>{m.unit}</span>
                  </div>}
                </div>
              })}
            </div>}
          </div>
        })}

        {/* Форма нової збірки */}
        <Card>
          <CardTitle color='#a78bfa'>+ НОВА ЗБІРКА</CardTitle>
          <FormRow label="НАЗВА ЗБІРКИ"><input placeholder="напр. Обжатий кабель XT90" value={newAsmName} onChange={e => setNewAsmName(e.target.value)} /></FormRow>
          <div style={{ padding:'10px 0' }}>
            <div style={{ fontSize:12, color:G.t2, marginBottom:10, fontWeight:'bold' }}>КОМПОНЕНТИ ЗБІРКИ (відмітьте, з чого вона складається):</div>
            <div style={{ maxHeight:240, overflowY:'auto', border:`1px solid ${G.b1}`, borderRadius:8, padding:8, background:'rgba(0,0,0,0.2)' }}>
              {materials.map(m => {
                const checked = (newAsmComps[m.id] !== undefined && newAsmComps[m.id] > 0)
                const qty = newAsmComps[m.id] || ''
                return <div key={m.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0', borderBottom:`1px solid ${G.b1}`, fontSize:13 }}>
                  <input type="checkbox" checked={checked} onChange={e => {
                    const chk = e.target.checked
                    setNewAsmComps(v => ({ ...v, [m.id]: chk ? 1 : 0 }))
                  }} style={{ width:16, height:16, accentColor:'#a78bfa', cursor:'pointer', flexShrink:0 }} />
                  <div style={{ flex:1, color:checked?G.t1:G.t2 }}>{m.name}</div>
                  {checked && <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <input type="number" min="0.001" step="any" value={qty} onChange={e => setNewAsmComps(v => ({...v,[m.id]:parseFloat(e.target.value)||0}))} style={{ width:60, border:`1px solid #7c3aed`, textAlign:'center', padding:'2px', fontSize:12 }} placeholder="кільк." />
                    <span style={{ color:G.t2, fontSize:10, width:20 }}>{m.unit}</span>
                  </div>}
                </div>
              })}
            </div>
          </div>
          <div style={{ borderTop:`1px solid ${G.b1}`, marginTop:10, paddingTop:16 }}>
            <FormRow label="РЕЗУЛЬТАТ (МАТЕРІАЛ, ЯКИЙ СТВОРЮЄТЬСЯ)">
              <select value={newAsmOutMatId} onChange={e => setNewAsmOutMatId(e.target.value)}>
                <option value="">-- оберіть що виробляється --</option>
                {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </FormRow>
            <FormRow label="КІЛЬКІСТЬ ОТРИМАНОГО З ОДНІЄЇ ЗБІРКИ">
              <input type="number" placeholder="1" value={newAsmOutQty} onChange={e => setNewAsmOutQty(e.target.value)} />
            </FormRow>
            <FormRow label="НОТАТКА (необов'язково)"><input placeholder="опис" value={newAsmNotes} onChange={e => setNewAsmNotes(e.target.value)} /></FormRow>
            <SubmitBtn onClick={createAsm} color='#a78bfa'>+ СТВОРИТИ ЗБІРКУ</SubmitBtn>
          </div>
        </Card>
      </>
    }

    return <>
      <SubTabs tabs={[['materials','📦 МАТЕРІАЛИ'],['types','🔋 ТИПИ БАТАРЕЙ'],['assemblies','⚙️ ЗБІРКИ']]} active={stockTab} onChange={setStockTab} />
      {stockTab==='materials' ? TabMaterials() : stockTab==='types' ? TabTypes() : TabAssemblies()}
    </>
  }
  // ── Ремонт ────────────────────────────────────────────────
  const PageRepair = () => {
    const serial   = repairSerial
    const found    = serial ? log.find(l => l.serials?.includes(serial)) : null
    const repType  = found ? batteryTypes.find(t => t.id===found.typeId) : null
    const doSearch = () => setRepairSerial(repairSearch.trim())
    

    const handleRegisterArrival = () => {
      if (!repType) return
      const entry = {id:uid(), datetime:nowStr(), date:repDate, serial, typeName:repType.name, typeId:repType.id, originalWorker:found.workerName, repairWorker:'', note:repNote, materials:[], status:'pending'}
      doSubmitRepair(entry)
    }

    const handleManualRegister = () => {
      const t = batteryTypes.find(t => t.id===manTypeId)
      const w = workers.find(w => w.id===manWorkerId)
      const entry = {id:uid(), datetime:nowStr(), date:manDate, typeId:manTypeId, typeName:t?.name||'', workerName:w?.name||'', count:1, serials:[serial], consumed:[], kind:'production', repairNote:''}
      setLog(prev => [entry,...prev])
      showToast('✓ Зареєстровано '+serial)
    }

    const startCompleting = (r) => {
      setCompletingId(r.id)
      setCompWorker(r.repairWorker || repWorker || workers[0]?.id)
      setCompDate(todayStr())
      setCompNote('')
      const initialChecks = {}
      const initialQtys = {}
      typeMaterials.filter(tm => tm.typeId===r.typeId).forEach(tm => {
        initialChecks[tm.matId] = true
        initialQtys[tm.matId] = tm.perBattery
      })
      setCompChecks(initialChecks)
      setCompQtys(initialQtys)
    }

    const confirmComplete = async (r) => {
      // Collect materials
      const cw = workers.find(w => w.id===compWorker)
      const repTms = typeMaterials.filter(tm => tm.typeId===r.typeId)
      const mats = repTms.map(tm => {
        const gm = globalMat(tm.matId)
        return { matId:tm.matId, matName:gm?.name??'', unit:gm?.unit??'', qty:parseFloat(compQtys[tm.matId]??tm.perBattery)||0, selected:compChecks[tm.matId]!==false }
      })
      
      const err = mats.filter(m => m.selected && m.qty>0).find(m => {
        const gm = globalMat(m.matId)
        return gm && gm.stock < m.qty
      })
      if (err) return showToast('Не вистачає на складі: '+err.matName, 'err')
      
      openConfirm('Завершити ремонт?', 'Будуть списані матеріали та оновлено статус.', async () => {
        closeModal()
        try {
          const res = await api('updateRepairStatus', [r.id, 'completed', compDate, cw?.name||'', JSON.stringify(mats), compNote])
          if (!res.ok) throw new Error(res.error)
          
          mats.forEach(m => { if (m.selected && m.qty>0) updateGlobalStock(m.matId, -m.qty) })
          setRepairLog(prev => prev.map(rx => {
            if (rx.id!==r.id) return rx
            const curNote = String(rx.note || '')
            let fullAppend = ""
            if (compNote) fullAppend += compNote
            if (compDate) fullAppend += (fullAppend ? ' | ':'') + 'Завершено: ' + compDate
            const newNote = curNote + (curNote ? ' | ' : '') + fullAppend
            
            // update local repair materials array too
            const curMats = rx.materials || []
            const newMats = curMats.concat(mats.filter(m => m.selected && m.qty>0))
            return {...rx, status:'completed', note:newNote, repairWorker:cw?.name||'', materials:newMats}
          }))
          
          if (res.consumed && res.consumed.length > 0) {
            setLog(prev => [{
               id:r.id+'_C', datetime:nowStr(), date:compDate, typeId:r.typeId, typeName:r.typeName, 
               workerName:cw?.name||rx.repairWorker, count:0, serials:[r.serial], consumed:res.consumed, 
               kind:'repair', repairNote:'Завершено ремонт: '+r.serial
            }, ...prev])
          }
          
          setCompletingId(null)
          showToast('✓ Ремонт успішно завершено')
        } catch (e) {
          showToast(e.message||'Помилка', 'err')
        }
      })
    }

    const returnAll = (r) => openConfirm('Повернути всі матеріали?','Повернуться на склад.', async () => {
      closeModal()
      await api('returnRepairMaterials', [r.id, null])
      r.materials.filter(m => m.selected&&m.qty>0).forEach(m => updateGlobalStock(m.matId, m.qty))
      showToast('✓ Матеріали повернуто')
    })

    const deleteRep = (r) => openConfirm('Видалити запис?','Матеріали НЕ повернуться на склад.', async () => {
      closeModal()
      await api('deleteRepair', [r.id])
      setRepairLog(prev => prev.filter(rx => String(rx.id)!==String(r.id)))
      showToast('✓ Видалено')
    })

    return wrap(<>
      <SubTabs tabs={[['new','🔧 НОВИЙ'],['log','📋 ЗАПИСИ'],['bms','💔 ЗЛАМАНІ BMS']]} active={repTab} onChange={setRepTab} />
      {repTab==='new' && <>
        <Card>
          <CardTitle color='#fb923c'>🔧 РЕЄСТРАЦІЯ РЕМОНТУ</CardTitle>
          <FormRow label="СЕРІЙНИЙ НОМЕР">
            <div style={{ display:'flex', gap:6 }}>
              <input value={repairSearch} onChange={e => setRepairSearch(e.target.value)} placeholder="напр. SK-2026-001" onKeyDown={e => e.key==='Enter'&&doSearch()} />
              <button onClick={doSearch} style={{ padding:'8px 14px', background:G.b1, border:`1px solid ${G.b2}`, color:G.t1, borderRadius:8, fontSize:18, cursor:'pointer', flexShrink:0 }}>🔍</button>
            </div>
          </FormRow>
        </Card>

        {serial && found && repType && <Card style={{ borderColor:G.gn }}>
          <div style={{ color:G.gn, fontSize:12, marginBottom:12 }}>✓ Знайдено: {found.typeName} · {found.workerName} · {found.date}</div>
          <FormRow label="ДАТА ПРИЙОМКИ"><input value={repDate} onChange={e => setRepDate(e.target.value)} /></FormRow>
          <FormRow label="ОПИС НЕСПРАВНОСТІ / НОТАТКА"><input value={repNote} onChange={e => setRepNote(e.target.value)} placeholder="напр. не заряджається" /></FormRow>
          <SubmitBtn onClick={handleRegisterArrival} color='#ea580c'>🔧 ПРИЙНЯТИ В РЕМОНТ</SubmitBtn>
        </Card>}

        {serial && !found && <Card style={{ borderColor:G.yw }}>
          <div style={{ color:G.yw, fontSize:13, marginBottom:12 }}>⚠ Акумулятор не знайдено — зареєструйте вручну</div>
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

      {repTab==='log' && (repairLog.length===0 ? <Center>Ремонтів немає</Center> :
        repairLog.map(r => <div key={r.id} style={{ background:G.card, border:`1px solid ${G.b1}`, borderLeft:`3px solid ${r.status==='completed'?'#22c55e':'#fb923c'}`, borderRadius:12, padding:12, marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:700 }}>{r.serial}</span>
                {r.status!=='completed' ? <Chip bg='#4a1804' color='#fb923c' bd='#9a3412'>ОЧІКУЄ</Chip> : <Chip bg='#052e16' color='#22c55e' bd='#166534'>ГОТОВО</Chip>}
              </div>
              <div style={{ fontSize:12, color:G.t2 }}>{r.typeName}</div>
            </div>
            <span style={{ fontSize:11, color:G.t2 }}>{r.datetime}</span>
          </div>
          {r.note && <div style={{ fontSize:12, color:'#fb923c', marginBottom:5 }}>📝 {r.note}</div>}
          {r.repairWorker && <div style={{ fontSize:12, color:G.t2, marginBottom:8 }}>Ремонтував: {r.repairWorker}</div>}
          <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:r.status==='completed'?8:0 }}>
            {(r.materials||[]).filter(m => m.selected&&m.qty>0).map((m,i) =>
              <Chip key={i} bg={G.b1} color={G.t2} bd={G.b2}>{m.matName} ×{m.qty}</Chip>)}
          </div>
          
          {completingId === r.id ? <div style={{ borderTop:`1px solid ${G.b1}`, paddingTop:10, marginTop:10 }}>
            <FormRow label="ДАТА ЗАВЕРШЕННЯ"><input value={compDate} onChange={e => setCompDate(e.target.value)} /></FormRow>
            <FormRow label="РЕМОНТУВАВ КОНТРАКТНИК">
              <select value={compWorker} onChange={e => setCompWorker(e.target.value)}>
                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </FormRow>
            <FormRow label="ВИТРАЧЕНІ МАТЕРІАЛИ">
              {typeMaterials.filter(tm => tm.typeId===r.typeId).map(tm => {
                const gm = globalMat(tm.matId)
                if (!gm) return null
                const checked = compChecks[tm.matId]!==false
                const qty = compQtys[tm.matId]??tm.perBattery
                const ok = !checked || !qty || gm.stock>=(parseFloat(qty)||0)
                return <div key={tm.matId} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0', borderBottom:`1px solid ${G.b1}`, fontSize:13 }}>
                  <input type="checkbox" checked={checked} onChange={e => setCompChecks(v => ({...v,[tm.matId]:e.target.checked}))} style={{ width:18, height:18, accentColor:G.or, cursor:'pointer', flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ color:checked?G.t1:G.t2 }}>{gm.name}</div>
                    <div style={{ fontSize:11, color:ok?G.t2:G.rd }}>склад: {gm.stock} {gm.unit}</div>
                  </div>
                  <input type="number" value={qty} onChange={e => setCompQtys(v => ({...v,[tm.matId]:e.target.value}))} style={{ width:70, border:`1px solid ${ok?G.b2:G.rd}`, textAlign:'center' }} />
                  <span style={{ color:G.t2, fontSize:11, width:32, flexShrink:0 }}>{gm.unit}</span>
                </div>
              })}
            </FormRow>
            <FormRow label="ДОДАТИ НОТАТКУ (необов'язково)"><input value={compNote} onChange={e => setCompNote(e.target.value)} placeholder="напр. замінено BMS" /></FormRow>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => confirmComplete(r)} style={{ flex:1, padding:'8px', background:'#166534', color:G.gn, border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>✓ ЗАВЕРШИТИ РЕМОНТ</button>
              <button onClick={() => setCompletingId(null)} style={{ padding:'8px 12px', background:G.b1, color:G.t2, border:`1px solid ${G.b2}`, borderRadius:8, fontSize:13, cursor:'pointer' }}>Скасувати</button>
            </div>
          </div> : null}

          {!completingId && <div style={{ display:'flex', gap:6, marginTop:8 }}>
            {r.status !== 'completed' && <button onClick={() => startCompleting(r)} style={{ flex:2, padding:'6px 0', background:'#4c1d95', color:'#a78bfa', border:`1px solid #7c3aed`, borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>✓ Завершити</button>}
            {r.status === 'completed' && <button onClick={() => returnAll(r)} style={{ flex:1, padding:'6px 0', background:'#052e16', color:G.gn, border:`1px solid #166534`, borderRadius:8, fontSize:12, cursor:'pointer' }}>↩ Повернути</button>}
            {isAdmin && <button onClick={() => deleteRep(r)} style={{ padding:'6px 10px', background:'#450a0a', border:'none', color:G.rd, borderRadius:8, fontSize:12, cursor:'pointer' }}>✕</button>}
          </div>}
        </div>)
      )}

      {repTab==='bms' && (() => {
        const bmsReps = repairLog.filter(r => r.status === 'completed' && (r.note || '').toLowerCase().includes('bms'))
        if (bmsReps.length === 0) return <Center>Немає записів з поломаними BMS</Center>
        return bmsReps.map(r => <div key={r.id} style={{ background:G.card, border:`1px solid ${G.b1}`, borderLeft:`3px solid #ef4444`, borderRadius:12, padding:12, marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:700 }}>{r.serial}</span>
                <Chip bg='#450a0a' color='#ef4444' bd='#7f1d1d'>BMS</Chip>
              </div>
              <div style={{ fontSize:12, color:G.t2, marginTop:4 }}>{r.typeName}</div>
            </div>
            <span style={{ fontSize:11, color:G.t2 }}>{r.datetime || r.date}</span>
          </div>
          <div style={{ fontSize:13, color:'#ef4444', marginBottom:5 }}>📝 {r.note}</div>
          {r.repairWorker && <div style={{ fontSize:12, color:G.t2, marginBottom:8 }}>Ремонтував: {r.repairWorker}</div>}
        </div>)
      })()}
    </>)
  }

  // ── Журнал ────────────────────────────────────────────────
  const PageLog = () => wrap(
    log.length===0 ? <Center>Журнал порожній</Center> :
      log.slice(0,120).map(e => {
        const t = batteryTypes.find(t => t.id===e.typeId)
        const color = e.kind==='prep'?G.pu:e.kind==='repair'?'#fb923c':(t?.color||G.or)
        const icon  = e.kind==='prep'?'📦':e.kind==='repair'?'🔧':'🔋'
        return <div key={e.id} style={{ background:G.card, border:`1px solid ${G.b1}`, borderRadius:12, padding:12, marginBottom:8, borderLeft:`3px solid ${color}` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:5 }}>
            <div>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:700 }}>{icon} {e.typeName}</span>
              {e.count>0 && <span style={{ color:G.or, fontSize:13, marginLeft:6 }}>× {e.count}</span>}
              <div style={{ fontSize:12, color:G.t2 }}>{e.workerName}</div>
            </div>
            <span style={{ fontSize:11, color:G.t2, flexShrink:0 }}>{e.datetime}</span>
          </div>
          {e.serials?.length>0 && <div style={{ fontSize:12, color:G.cy, marginBottom:5, wordBreak:'break-all' }}>{e.serials.join(', ')}</div>}
          {e.repairNote && <div style={{ fontSize:12, color:'#fb923c', marginBottom:5 }}>📝 {e.repairNote}</div>}
          <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
            {(e.consumed||[]).map((c,i) => <span key={i} style={{ background:G.b1, border:`1px solid ${G.b2}`, borderRadius:6, padding:'2px 8px', fontSize:11, color:G.t2 }}>{c.name} ×{c.amount}</span>)}
          </div>
        </div>
      })
  )

  // ── Закупівля ─────────────────────────────────────────────
  const PageShopping = () => {
    const lowMats = materials.filter(m => {
      const perBattery = perBatteryByMat[m.id] || 0
      const monthNeed = perBattery>0 ? (perBattery * perDay * 30) : (m.minStock || 0)
      return m.stock <= m.minStock || m.stock < monthNeed || m.stock===0
    })

    const setOrdered = async (mat, status) => {
      await api('updateMaterialField', [mat.id, 'isOrdered', status])
      setMaterials(prev => prev.map(m => m.id!==mat.id?m:{...m,isOrdered:status}))
    }

    const sendToTg = async () => {
      const pending = lowMats.filter(m => !m.isOrdered)
      if (pending.length===0) return showToast('Немає нових матеріалів для замовлення!','err')
      const lines = pending.map(m => {
        const perBattery = perBatteryByMat[m.id] || 0
        const monthNeed = perBattery>0 ? +(perBattery * perDay * 30).toFixed(2) : (m.minStock || 0)
        const toOrder = Math.max(0, +(monthNeed - m.stock).toFixed(2))
        const link=m.shopUrl?`\n  🔗 ${m.shopUrl}`:''
        return `• ${m.name}: ${m.stock} ${m.unit} (мін: ${m.minStock}) · потрібно/міс: ${monthNeed} · докупити: ${toOrder}${link}`
      }).join('\n')
      await sendTelegram(`🛒 ZmiyCell — Закупівля\n\n${lines}`)
      showToast('✓ Відправлено в Telegram')
      for (const m of pending) await setOrdered(m, true)
    }

    return wrap(<>
      <Card>
        <CardTitle color={G.pu}>🛒 СПИСОК ЗАКУПІВЛІ</CardTitle>
        <div style={{ color:G.t2, fontSize:13, marginBottom:16 }}>Матеріали нижче мінімального запасу.</div>
        {lowMats.length===0 ? <Center>Всі матеріали в нормі</Center> :
          lowMats.map(m => {
            const ordered = !!m.isOrdered
            const perBattery = perBatteryByMat[m.id] || 0
            const monthNeed = perBattery>0 ? +(perBattery * perDay * 30).toFixed(2) : (m.minStock || 0)
            const toOrder = Math.max(0, +(monthNeed - m.stock).toFixed(2))
            return <div key={m.id} style={{ background:ordered?G.card:G.card2, border:`1px solid ${G.b1}`, borderRadius:10, padding:12, marginBottom:8, borderLeft:`3px solid ${ordered?G.t2:'#a78bfa'}`, opacity:ordered?.6:1, transition:'0.2s' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:14 }}>{m.name}</div>
                  <div style={{ fontSize:12, color:G.t2, marginTop:2 }}>{ordered?'✅ В очікуванні доставки':'⏳ Потребує замовлення'}</div>
                  {m.shopUrl && <a href={m.shopUrl} target="_blank" rel="noreferrer" style={{ fontSize:11, color:G.cy, textDecoration:'none', display:'inline-block', marginTop:4 }}>🔗 Перейти</a>}
                  {!ordered && <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
                    <span style={{ color:G.or, fontWeight:600 }}>{m.stock} {m.unit}</span>
                    <Chip bg='#450a0a' color={G.rd} bd='#7f1d1d'>мін {m.minStock}</Chip>
                  </div>}
                  {!ordered && <div style={{ fontSize:11, color:G.t2, marginTop:6 }}>
                    Потрібно/міс: <b style={{ color:G.cy }}>{monthNeed}</b> · докупити: <b style={{ color:G.or }}>{toOrder}</b>
                  </div>}
                </div>
                <button onClick={() => setOrdered(m, !ordered)} style={{ background:ordered?G.card2:G.b1, border:`1px solid ${G.b2}`, color:ordered?G.t2:G.pu, padding:'4px 8px', borderRadius:6, fontSize:11, cursor:'pointer', flexShrink:0 }}>
                  {ordered?'Скасувати':'Позначити'}
                </button>
              </div>
            </div>
          })
        }
        {lowMats.filter(m => !m.isOrdered).length>0 && <SubmitBtn color={G.pu} onClick={sendToTg}>✈ ВІДПРАВИТИ В TELEGRAM</SubmitBtn>}
      </Card>
    </>)
  }
  // ── Команда ───────────────────────────────────────────────
  const PageWorkers = () => {
    const newName = newWorkerName; const setNewName = setNewWorkerName
    const realWorkers = workers

    const deleteWorker = (w) => openConfirm('Видалити працівника?', <b style={{ color:G.rd }}>{w.name}</b>, () => {
      closeModal()
      api('deleteWorker',[w.id]).then(() => { setWorkers(p => p.filter(wx => wx.id!==w.id)); showToast('✓ Видалено') }).catch(()=>{})
    })
    const addWorker = () => {
      if (!newName.trim()) return showToast('Введіть ім\'я','err')
      const w = {id:'w'+uid(), name:newName.trim()}
      api('saveWorker',[w]).then(() => { setWorkers(p => [...p,w]); setNewName(''); showToast('✓ Додано '+w.name) }).catch(()=>{})
    }
    const addPayment = (w) => openInput('Оплачено (кількість)', 'напр. 5', '', async (val) => {
      closeModal()
      const cnt = parseInt(val)
      if (!cnt || cnt<=0) return showToast('Невірна кількість','err')
      const entry = { id:uid(), workerId:w.id, workerName:w.name, count:cnt, date:todayStr(), datetime:nowStr() }
      try {
        await api('addPayment', [entry])
        setPayments(prev => [entry, ...prev])
        showToast(`✓ Оплачено: ${cnt} для ${w.name}`)
      } catch {}
    })

    return <>
      <Card>
        <CardTitle>👷 КОМАНДА ({realWorkers.length})</CardTitle>
        {realWorkers.map(w => {
          const produced = producedByName[w.name] || 0
          const paid = paidByWorker[w.id] || paidByWorker[w.name] || 0
          const unpaid = Math.max(0, produced - paid)
          return <div key={w.id} style={{ padding:'10px 0', borderBottom:`1px solid ${G.b1}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:14 }}>{w.name}</span>
              <div style={{ display:'flex', gap:6 }}>
                {isAdmin && <button onClick={() => addPayment(w)} style={{ background:'#052e16', border:`1px solid #166534`, color:G.gn, padding:'4px 10px', borderRadius:8, cursor:'pointer', fontSize:12 }}>+ Оплачено</button>}
                {isAdmin && <button onClick={() => deleteWorker(w)} style={{ background:'#450a0a', border:'none', color:G.rd, padding:'4px 10px', borderRadius:8, cursor:'pointer', fontSize:12 }}>✕</button>}
              </div>
            </div>
            <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
              <Chip bg={G.card2} color={G.t2} bd={G.b2}>Вироблено: {produced}</Chip>
              <Chip bg='#052e16' color={G.gn} bd='#166534'>Оплачено: {paid}</Chip>
              <Chip bg='#431407' color='#fb923c' bd='#9a3412'>Неопл.: {unpaid}</Chip>
            </div>
          </div>
        })}
      </Card>
      {isAdmin && <Card>
        <CardTitle color={G.gn}>+ ДОДАТИ ПРАЦІВНИКА</CardTitle>
        <div style={{ display:'flex', gap:8 }}>
          <input placeholder="Ім'я та прізвище" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key==='Enter'&&addWorker()} />
          <button onClick={addWorker} style={{ padding:'8px 16px', background:G.gn, color:'#000', border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer', whiteSpace:'nowrap' }}>+ ДОДАТИ</button>
        </div>
      </Card>}
    </>
  }

  // ── Інструменти ───────────────────────────────────────────
  const PageTools = () => {
    const nt=newTool; const setNt=setNewTool
    const repairModal=toolRepairModal; const setRepairModal=setToolRepairModal
    const repairNote=toolRepairNote; const setRepairNote=setToolRepairNote
    const repairDate=toolRepairDate; const setRepairDate=setToolRepairDate
    const repairWorker=toolRepairWorker; const setRepairWorker=setToolRepairWorker

    const changeTool = (id,field,delta) => {
      if (!isAdmin) return
      const t=tools.find(t=>t.id===id); if(!t) return
      const next={...t,[field]:Math.max(0,t[field]+delta)}
      if(next.working>next.count) next.working=next.count
      api('saveTool',[next]).then(()=>setTools(prev=>prev.map(tx=>tx.id!==id?tx:next))).catch(()=>{})
    }
    const deleteTool = (t) => openConfirm('Видалити інструмент?',<b style={{color:G.rd}}>{t.name}</b>,()=>{
      closeModal(); api('deleteTool',[t.id]).then(()=>{setTools(p=>p.filter(tx=>tx.id!==t.id));showToast('✓ Видалено')}).catch(()=>{})
    })
    const addTool = () => {
      if(!nt.name.trim()) return showToast('Введіть назву','err')
      const t={id:'t'+uid(),...nt,working:nt.count,repairNote:'',repairDate:''}
      api('saveTool',[t]).then(()=>{
        setTools(p=>[...p,t])
        setNt({name:'',category:'tool',count:1,serial:'',notes:''})
        showToast('✓ Додано '+nt.name)
        api('logToolEvent', [t.id, t.name, todayStr(), nowStr(), 'added', 'Адмін', 'Додано на склад']).catch(()=>{})
        setToolLog(p=>[{id:'tl_'+Date.now(), toolId:t.id, toolName:t.name, date:todayStr(), datetime:nowStr(), event:'added', workerName:'Адмін', note:'Додано на склад'}, ...p])
      }).catch(()=>{})
    }
    const openRepairModal = (t) => { setRepairModal(t); setRepairNote(t.repairNote||''); setRepairDate(todayStr()) }
    const submitToolRepair = async () => {
      if(!repairModal) return
      if(!repairNote.trim()) return showToast('Опишіть несправність','err')
      const worker=workers.find(w=>w.id===repairWorker)
      try {
        await api('reportToolRepair',[repairModal.id,repairNote,repairDate,worker?.name||''])
        setTools(prev=>prev.map(t=>t.id!==repairModal.id?t:{...t,repairNote,repairDate}))
        api('logToolEvent', [repairModal.id, repairModal.name, repairDate, nowStr(), 'broken', worker?.name||'', repairNote]).catch(()=>{})
        setToolLog(p=>[{id:'tl_'+Date.now(), toolId:repairModal.id, toolName:repairModal.name, date:repairDate, datetime:nowStr(), event:'broken', workerName:worker?.name||'', note:repairNote}, ...p])
        showToast('✓ Повідомлено про ремонт — бот сповіщено'); setRepairModal(null)
      } catch {}
    }

    const completeToolRepair = async (t) => {
      openConfirm('Інструмент відремонтовано?', 'Підтверджуєте повернення в роботу?', async () => {
        closeModal()
        try {
          await api('reportToolRepair',[t.id,'','','']) // clear repair note
          const next={...t, working:t.count, repairNote:'', repairDate:''}
          await api('saveTool',[next])
          setTools(prev=>prev.map(tx=>tx.id!==t.id?tx:next))
          api('logToolEvent', [t.id, t.name, todayStr(), nowStr(), 'fixed', 'Адмін', 'Повернуто в роботу']).catch(()=>{})
          setToolLog(p=>[{id:'tl_'+Date.now(), toolId:t.id, toolName:t.name, date:todayStr(), datetime:nowStr(), event:'fixed', workerName:'Адмін', note:'Повернуто в роботу'}, ...p])
          showToast('✓ Інструмент у робочому стані')
        } catch {}
      })
    }

    return wrap(<>
      {repairModal && (
        <Modal onClose={() => setRepairModal(null)}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:19, fontWeight:700, marginBottom:14, color:G.rd }}>🔧 Ремонт: {repairModal.name}</div>
          <FormRow label="НЕСПРАВНІСТЬ / ОПИС"><textarea value={repairNote} onChange={e=>setRepairNote(e.target.value)} placeholder="Опишіть що зламалось..." style={{minHeight:80}} /></FormRow>
          <FormRow label="ДАТА"><input value={repairDate} onChange={e=>setRepairDate(e.target.value)} /></FormRow>
          <FormRow label="ХТО ПОВІДОМЛЯЄ">
            <select value={repairWorker} onChange={e=>setRepairWorker(e.target.value)}>
              {workers.filter(w=>w.id!=='TEAM_SHARED').map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </FormRow>
          <div style={{color:G.t2,fontSize:12,marginBottom:10}}>✈ Telegram-бот отримає сповіщення</div>
          <SubmitBtn onClick={submitToolRepair} color={G.rd}>🔧 ВІДПРАВИТИ В РЕМОНТ</SubmitBtn>
        </Modal>
      )}

      <SubTabs tabs={[['active','🛠 АКТИВНІ'],['log','📋 ЖУРНАЛ']]} active={toolTab} onChange={setToolTab} />

      {toolTab==='active' && <>
        {tools.map(t => {
          const broken=t.count-t.working
          return <div key={t.id} style={{ background:G.card, border:`1px solid ${G.b1}`, borderLeft:`3px solid ${broken>0?G.rd:G.gn}`, borderRadius:12, padding:14, marginBottom:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:700 }}>{t.name}</div>
                <div style={{ fontSize:12, color:G.t2, marginTop:2 }}>{t.category==='equipment'?'⚙ ОБЛАДНАННЯ':'🛠 ІНСТРУМЕНТ'}{t.serial&&' · '+t.serial}</div>
                {broken>0 && <div style={{color:G.rd,fontSize:12,marginTop:4}}>⚠ {broken} шт. несправних</div>}
                {t.notes && <div style={{color:G.t2,fontSize:12,marginTop:3}}>📝 {t.notes}</div>}
                {t.repairNote && <div style={{color:'#fb923c',fontSize:12,marginTop:3}}>🔧 {t.repairNote} {t.repairDate&&'· '+t.repairDate}</div>}
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0, flexDirection:'column', alignItems:'flex-end' }}>
                {!t.repairNote && <button onClick={()=>openRepairModal(t)} style={{ background:'#431407', border:`1px solid #9a3412`, color:'#fb923c', padding:'5px 10px', borderRadius:8, cursor:'pointer', fontSize:12 }}>🔧 В ремонт</button>}
                {t.repairNote && isAdmin && <button onClick={()=>completeToolRepair(t)} style={{ background:'#052e16', border:`1px solid #166534`, color:G.gn, padding:'5px 10px', borderRadius:8, cursor:'pointer', fontSize:12 }}>✓ Відремонтовано</button>}
                {isAdmin && <button onClick={()=>deleteTool(t)} style={{ background:'#450a0a', border:'none', color:G.rd, padding:'5px 10px', borderRadius:8, cursor:'pointer', fontSize:12, alignSelf:'flex-end', marginTop:4 }}>✕ Видалити</button>}
              </div>
            </div>
            {isAdmin && <div style={{ display:'flex', gap:10, alignItems:'center', marginTop:10, flexWrap:'wrap' }}>
              <span style={{fontSize:13,color:G.t2}}>Всього:</span>
              <QtyBtn onClick={()=>changeTool(t.id,'count',-1)}>−</QtyBtn>
              <b style={{minWidth:24,textAlign:'center'}}>{t.count}</b>
              <QtyBtn onClick={()=>changeTool(t.id,'count',1)}>+</QtyBtn>
              <span style={{fontSize:13,color:G.t2}}>Робочих:</span>
              <QtyBtn onClick={()=>changeTool(t.id,'working',-1)}>−</QtyBtn>
              <b style={{color:G.gn,minWidth:24,textAlign:'center'}}>{t.working}</b>
              <QtyBtn onClick={()=>changeTool(t.id,'working',1)}>+</QtyBtn>
            </div>}
            {!isAdmin && <div style={{ display:'flex', gap:6, marginTop:8 }}>
              <span style={{fontSize:12,color:G.t2}}>Всього: <b style={{color:G.t1}}>{t.count}</b></span>
              <span style={{fontSize:12,color:G.t2}}>· Робочих: <b style={{color:G.gn}}>{t.working}</b></span>
              {broken>0&&<span style={{fontSize:12,color:G.rd}}>· Несправних: <b>{broken}</b></span>}
            </div>}
          </div>
        })}

        {isAdmin && <Card>
          <CardTitle color={G.gn}>+ ДОДАТИ ІНСТРУМЕНТ</CardTitle>
          <input placeholder="Назва" value={nt.name} onChange={e=>setNt(v=>({...v,name:e.target.value}))} style={{marginBottom:6}} />
          <select value={nt.category} onChange={e=>setNt(v=>({...v,category:e.target.value}))} style={{marginBottom:6}}>
            <option value="tool">🛠 Інструмент</option>
            <option value="equipment">⚙ Обладнання</option>
          </select>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:6 }}>
            <input type="number" placeholder="Кількість" value={nt.count} min="1" onChange={e=>setNt(v=>({...v,count:parseInt(e.target.value)||1}))} />
            <input placeholder="С/н (необов.)" value={nt.serial} onChange={e=>setNt(v=>({...v,serial:e.target.value}))} />
          </div>
          <input placeholder="Нотатка" value={nt.notes} onChange={e=>setNt(v=>({...v,notes:e.target.value}))} style={{marginBottom:4}} />
          <SubmitBtn onClick={addTool} color={G.gn}>+ ДОДАТИ</SubmitBtn>
        </Card>}
      </>}

      {toolTab==='log' && (
        toolLog.length===0 ? <Center>Журнал порожній</Center> :
        toolLog.map(e => {
          const color = e.event==='added'?G.gn:e.event==='broken'?G.rd:e.event==='fixed'?G.cy:G.t2
          const icon  = e.event==='added'?'+':e.event==='broken'?'🔧':e.event==='fixed'?'✓':'•'
          return <div key={e.id} style={{ background:G.card, border:`1px solid ${G.b1}`, borderRadius:12, padding:12, marginBottom:8, borderLeft:`3px solid ${color}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:5 }}>
              <div>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:700 }}>{icon} {e.toolName}</span>
                <div style={{ fontSize:12, color:G.t2, marginTop:2 }}>{e.workerName}</div>
              </div>
              <span style={{ fontSize:11, color:G.t2, flexShrink:0 }}>{e.datetime}</span>
            </div>
            {e.note && <div style={{ fontSize:12, color:e.event==='broken'?'#fb923c':G.t1, marginTop:4 }}>{e.note}</div>}
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
              if(val) setDraftSteps(prev => prev + (prev.endsWith('\n')?'':'\n') + `![img](${val})\n`)
              closeModal()
            })} style={{ flex: 1, padding: 12, background: '#1e3a8a', color: '#93c5fd', border: `1px solid #1e40af`, borderRadius: 12, cursor: 'pointer', marginTop: 10, fontWeight: 700 }}>📷 ДОДАТИ ФОТО</button>
            <button onClick={() => setEditing(false)} style={{ flex: 1, padding: 12, background: G.b1, color: G.t2, border: `1px solid ${G.b2}`, borderRadius: 12, cursor: 'pointer', marginTop: 10 }}>Скасувати</button>
          </div>
        </Card>
      )}
    </>)
  }

  // ── HistoryModal ──────────────────────────────────────────
  const HistoryModal = ({mat, entries}) => <>
    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:700, marginBottom:12 }}>📊 {mat.name}</div>
    <div style={{ fontSize:12, color:G.t2, marginBottom:12 }}>Залишок: <b style={{color:G.cy}}>{mat.stock} {mat.unit}</b></div>
    {entries.length===0 ? <div style={{color:G.t2,fontSize:13}}>Витрат немає</div>
    : entries.map((e,i) => <div key={i} style={{background:G.card2,borderRadius:10,padding:10,marginBottom:8}}>
      <div style={{display:'flex',justifyContent:'space-between'}}>
        <span style={{color:e.kind==='prep'?G.pu:e.kind==='repair'?'#fb923c':G.cy,fontWeight:600}}>
          {e.kind==='prep'?'📦':e.kind==='repair'?'🔧':'🔋'} {e.workerName}
        </span>
        <span style={{color:G.rd,fontWeight:600}}>−{e.amount} {mat.unit}</span>
      </div>
      <div style={{color:'#4b5563',fontSize:11,marginTop:2}}>{e.datetime}</div>
    </div>)}
    <button onClick={closeModal} style={{width:'100%',marginTop:14,padding:12,background:G.b1,border:`1px solid ${G.b2}`,color:G.t2,borderRadius:10,cursor:'pointer',fontFamily:"'Fira Code',monospace"}}>Закрити</button>
  </>

  // ════════════════════════════════════════════════════════
  //  LAYOUT
  // ════════════════════════════════════════════════════════
  const pageKeys = NAV.map(n => n[0])

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => { const idx=pageKeys.indexOf(page); if(idx<pageKeys.length-1)setPage(pageKeys[idx+1]); setSwipeHint(null) },
    onSwipedRight: () => { const idx=pageKeys.indexOf(page); if(idx>0)setPage(pageKeys[idx-1]); setSwipeHint(null) },
    onSwiping: ({ deltaX }) => {
      const idx=pageKeys.indexOf(page)
      if (deltaX<-20 && idx<pageKeys.length-1) { const n=NAV.find(x=>x[0]===pageKeys[idx+1]); setSwipeHint({label:n[2],icon:n[1],dir:'left'}) }
      else if (deltaX>20 && idx>0) { const n=NAV.find(x=>x[0]===pageKeys[idx-1]); setSwipeHint({label:n[2],icon:n[1],dir:'right'}) }
      else setSwipeHint(null)
    },
    onTouchEndOrOnMouseUp: () => setSwipeHint(null),
    preventDefaultTouchmoveEvent: false,
    trackMouse: false,
  })

  return <>
    <style>{GLOBAL_CSS}</style>

    {/* Header */}
    <div style={{ position:'sticky', top:0, zIndex:10, background:'rgba(13,17,23,0.85)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', borderBottom:`1px solid ${G.b1}`, padding:'10px 14px 0' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', maxWidth:700, margin:'0 auto', paddingBottom:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Logo size={30} />
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:26, fontWeight:800, letterSpacing:2 }}>ZmiyCell</span>
          {isAdmin && <Chip bg='#1c1107' color={G.or} bd={G.b2} style={{fontSize:10}}>АДМІН</Chip>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, color:G.b2 }}>{todayStr().slice(0,5)}</span>
          <SyncBadge state={sync} />
          <button onClick={onLogout} title="Вийти" style={{ background:'transparent', border:'none', color:G.t2, cursor:'pointer', padding:'2px 4px', display:'flex', alignItems:'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="6" r="2.2" fill="currentColor" opacity="0.9"/><path d="M4.5 16.5c0-2.5 1.6-3.8 3.5-3.8s3.5 1.3 3.5 3.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.9"/><rect x="13" y="3.5" width="7" height="17" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M17 12h-6m0 0l2-2m-2 2l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', maxWidth:700, margin:'0 auto', paddingBottom:8 }}>
        {[
          ['🔋', log.filter(l=>l.kind==='production').length, G.t1, G.b1, G.b2],
          ['🔧', repairLog.length, G.t1, G.b1, G.b2],
          ['📦', activePrep.length, activePrep.length>0?G.pu:G.t2, activePrep.length>0?'#1e1b4b':G.b1, activePrep.length>0?'#3730a3':G.b2],
        ].map(([icon,val,vc,bg,bd],i) =>
          <span key={i} style={{ background:bg, border:`1px solid ${bd}`, borderRadius:20, padding:'3px 10px', fontSize:11, color:G.t2 }}>
            {icon} <b style={{color:vc}}>{val}</b>
          </span>)}
      </div>
      <div className="tab-nav" style={{ display:'flex', overflowX:'auto', maxWidth:700, margin:'0 auto', borderTop:`1px solid rgba(255,255,255,0.05)` }}>
        {NAV.map(([k,icon,label]) =>
          <button key={k} onClick={() => setPage(k)} style={{ flex:'0 0 auto', padding:'10px 16px', display:'flex', alignItems:'center', gap:5, background:'none', border:'none', borderBottom:`2px solid ${page===k?G.or:'transparent'}`, cursor:'pointer', color:page===k?G.or:G.t2, transition:'.15s', whiteSpace:'nowrap', fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, letterSpacing:.5 }}>
            <span style={{fontSize:16}}>{icon}</span> {label}
          </button>)}
      </div>
    </div>

    {/* Content */}
    <div className="page-scroll" {...swipeHandlers} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ transform:`translateY(${pullDist}px)` }}>
      {pullDist>10 && (
        <div style={{ position:'absolute', top:-40, left:0, right:0, height:40, display:'flex', alignItems:'center', justifyContent:'center', color:pullDist>65?G.or:G.t2, fontSize:12, fontWeight:700, fontFamily:"'Barlow Condensed',sans-serif" }}>
          {pullDist>65?'✓ ВІДПУСТІТЬ ДЛЯ ОНОВЛЕННЯ':'↓ ТЯГНІТЬ ДЛЯ ОНОВЛЕННЯ'}
        </div>
      )}
      {swipeHint && (
        <div style={{ position:'fixed', top:'50%', left:swipeHint.dir==='right'?16:'auto', right:swipeHint.dir==='left'?16:'auto', transform:'translateY(-50%)', zIndex:200, pointerEvents:'none', background:'rgba(17,24,39,0.92)', border:`1px solid ${G.b2}`, borderRadius:14, padding:'12px 16px', display:'flex', flexDirection:'column', alignItems:'center', gap:4, minWidth:72, boxShadow:'0 4px 24px rgba(0,0,0,0.6)', animation:'slideUp .1s ease' }}>
          <span style={{fontSize:10,color:G.t2,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>{swipeHint.dir==='left'?'→':'←'}</span>
          <span style={{fontSize:22}}>{swipeHint.icon}</span>
          <span style={{fontSize:11,fontWeight:700,color:G.or,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:.5,whiteSpace:'nowrap'}}>{swipeHint.label}</span>
        </div>
      )}
      { page==='prod'     ? PageProd()
      : page==='stock'    ? PageStock()
      : page==='repair'   ? PageRepair()
      : page==='shopping' ? PageShopping()
      : page==='workers'  ? PageWorkers()
      : page==='tools'    ? PageTools()
      : page==='log'      ? PageLog()
      : PageManual() }
    </div>

    {toast && <Toast {...toast} />}
    {modal?.type==='confirm' && <ConfirmModal title={modal.title} body={modal.body} onYes={modal.onYes} onNo={closeModal} />}
    {modal?.type==='input'   && <InputModal title={modal.title} placeholder={modal.placeholder} defaultValue={modal.defaultVal} onConfirm={modal.onConfirm} onCancel={closeModal} />}
    {modal?.type==='history' && <Modal onClose={closeModal}><HistoryModal mat={modal.mat} entries={modal.entries} /></Modal>}
  </>
}
