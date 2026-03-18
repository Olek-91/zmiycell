
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
const SubmitBtn = ({ children, onClick, color = G.or, disabled = false }) =>
  <button onClick={onClick} disabled={disabled} style={{ width: '100%', padding: '15px 0', background: disabled ? G.b1 : color, color: disabled ? G.t2 : color === '#fbbf24' ? '#000' : '#fff', border: 'none', borderRadius: 12, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: .5, marginTop: 10, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .5 : 1, transition: '.15s' }}>{children}</button>
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
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 9px', borderRadius: 10, background: cfg[1], color: cfg[2], border: `1px solid ${cfg[3]}`, animation: cfg[4] ? 'pulse 1s infinite' : '', fontFamily: "'Fira Code',monospace" }}>{cfg[0]}</span>
}
function Toast({ message, type, onHide }) {
  useEffect(() => { const t = setTimeout(onHide, 3000); return () => clearTimeout(t) }, [message, onHide])
  if (!message) return null
  return <div style={{ position: 'fixed', top: 14, left: 12, right: 12, zIndex: 9999, background: type === 'err' ? '#450a0a' : '#052e16', border: `1px solid ${type === 'err' ? G.rd : G.gn}`, color: type === 'err' ? '#fca5a5' : '#86efac', padding: '13px 16px', borderRadius: 12, fontSize: 13, fontFamily: "'Fira Code',monospace", boxShadow: '0 8px 32px rgba(0,0,0,.7)', animation: 'slideUp .2s ease' }}>{message}</div>
}
function Modal({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 500, padding: `0 0 env(safe-area-inset-bottom,0)` }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.card, border: `1px solid ${G.b1}`, borderRadius: '18px 18px 0 0', padding: '20px 18px 32px', width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', animation: 'slideUp .25s ease' }}>
        <div style={{ width: 40, height: 4, background: G.b2, borderRadius: 2, margin: '0 auto 18px' }} />
        {children}
      </div>
    </div>
  )
}

// ─── ЕКРАНИ ──────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState(null)
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const pinInputRef = useRef(null)
  useEffect(() => { if (mode === 'admin' && pinInputRef.current) pinInputRef.current.focus() }, [mode])
  const enterPin = (d) => {
    if (pin.length >= 4) return
    const next = pin + d; setPin(next)
    if (next.length === 4) {
      if (next === ADMIN_PIN) { onAuth('admin') }
      else { setErr('Невірний PIN'); setTimeout(() => { setPin(''); setErr('') }, 800) }
    }
  }
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(10,15,26,0.97)' }}>
      <img src="/logo.jpg" alt="ZmiyCell" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: '50%' }} />
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 32, fontWeight: 800, letterSpacing: 3, marginTop: 12, marginBottom: 32, color: G.or }}>ZmiyCell</div>
      {!mode ? (
        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button onClick={() => onAuth('user')} style={{ padding: '18px 0', background: G.b1, border: `1px solid ${G.b2}`, color: G.t1, borderRadius: 14, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 700, cursor: 'pointer', letterSpacing: 1 }}>👷 УВІЙТИ ЯК ЮЗЕР</button>
          <button onClick={() => setMode('admin')} style={{ padding: '18px 0', background: '#1c1107', border: `1px solid ${G.or}`, color: G.or, borderRadius: 14, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 700, cursor: 'pointer', letterSpacing: 1 }}>🔐 АДМІН</button>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 280, textAlign: 'center' }}>
          <input ref={pinInputRef} type="tel" inputMode="numeric" value="" onChange={() => { }} onKeyDown={e => { if (e.key >= '0' && e.key <= '9') enterPin(e.key); else if (e.key === 'Backspace') setPin(p => p.slice(0, -1)) }} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }} autoComplete="off" />
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, color: G.t2, marginBottom: 8, letterSpacing: 1 }}>ВВЕДІТЬ PIN</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
            {[0, 1, 2, 3].map(i => <div key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: pin.length > i ? G.or : G.b2, transition: '.15s' }} />)}
          </div>
          {err && <div style={{ color: G.rd, fontSize: 13, marginBottom: 12 }}>{err}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => <button key={d} onClick={() => enterPin(String(d))} style={{ padding: '18px 0', background: G.b1, border: `1px solid ${G.b2}`, color: G.t1, borderRadius: 12, fontSize: 22, fontWeight: 700 }}>{d}</button>)}
            <button onClick={() => setMode(null)} style={{ background: '#450a0a', color: G.rd, borderRadius: 12, fontSize: 13 }}>Назад</button>
            <button onClick={() => enterPin('0')} style={{ padding: '18px 0', background: G.b1, border: `1px solid ${G.b2}`, color: G.t1, borderRadius: 12, fontSize: 22, fontWeight: 700 }}>0</button>
            <button onClick={() => setPin(p => p.slice(0, -1))} style={{ background: G.card, color: G.t2, borderRadius: 12, fontSize: 18 }}>⌫</button>
          </div>
        </div>
      )}
    </div>
  )
}

function PrepTab({ batteryTypes, workers, assemblies, materials, prepItems, onIssueAssembly, onIssueConsumable, onReturn, onWriteoffPrep, isAdmin }) {
  const [wId, setWId] = useState(workers[0]?.id || '')
  const [typeId, setTypeId] = useState(batteryTypes[0]?.id || '')
  const [asmId, setAsmId] = useState(assemblies[0]?.id || '')
  const [consId, setConsId] = useState(materials[0]?.id || '')
  const [qty, setQty] = useState(1)
  const [allTypes, setAllTypes] = useState(false)
  const [forAll, setForAll] = useState(false)
  const [retVals, setRetVals] = useState({})
  const [subTab, setSubTab] = useState('active')
  const active = prepItems.filter(p => p.status !== 'returned')
  return <>
    <SubTabs tabs={[['active', 'АМ. ВИДАЧІ'], ['asm', '+ ЗБІРКИ'], ['cons', '+ РОЗХІД']]} active={subTab} onChange={setSubTab} />
    {subTab === 'asm' && <Card>
      <CardTitle color={G.pu}>📦 ВИДАТИ ЗБІРКУ</CardTitle>
      <FormRow label="ПРАЦІВНИК"><select value={wId} onChange={e => setWId(e.target.value)}>{workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></FormRow>
      <FormRow label="ТИП АКУМУЛЯТОРА"><select value={typeId} onChange={e => setTypeId(e.target.value)} disabled={allTypes}>{batteryTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></FormRow>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}><input type="checkbox" checked={allTypes} onChange={e => setAllTypes(e.target.checked)} />Для всіх типів</div>
      <FormRow label="ЗБІРКА"><select value={asmId} onChange={e => setAsmId(e.target.value)}>{assemblies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></FormRow>
      <FormRow label="КІЛЬКІСТЬ"><input type="number" value={qty} onChange={e => setQty(e.target.value)} /></FormRow>
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}><input type="checkbox" checked={forAll} onChange={e => setForAll(e.target.checked)} />Для всіх працівників</div>
      <SubmitBtn color={G.pu} onClick={() => onIssueAssembly(wId, asmId, parseFloat(qty) || 0, allTypes ? 'ALL' : typeId, forAll)}>📦 ВИДАТИ</SubmitBtn>
    </Card>}
    {subTab === 'cons' && <Card>
      <CardTitle color={G.pu}>📦 ВИДАТИ РОЗХІДНИЙ МАТЕРІАЛ</CardTitle>
      <FormRow label="ПРАЦІВНИК"><select value={wId} onChange={e => setWId(e.target.value)}>{workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></FormRow>
      <FormRow label="МАТЕРІАЛ"><select value={consId} onChange={e => setConsId(e.target.value)}>{materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.stock})</option>)}</select></FormRow>
      <FormRow label="КІЛЬКІСТЬ"><input type="number" value={qty} onChange={e => setQty(e.target.value)} /></FormRow>
      <SubmitBtn color={G.pu} onClick={() => onIssueConsumable(wId, consId, parseFloat(qty) || 0)}>📦 ВИДАТИ</SubmitBtn>
    </Card>}
    {subTab === 'active' && active.map(p => <div key={p.id} style={{ background: G.card2, padding: 12, borderRadius: 10, marginBottom: 8 }}>
      <div style={{ fontWeight: 600 }}>{p.matName} (на руках: {+(p.qty - p.returnedQty).toFixed(4)})</div>
      <div style={{ fontSize: 12, color: getWorkerColor(p.workerName) }}>{p.workerName} · {p.date}</div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <input type="number" placeholder="кільк." value={retVals[p.id] || ''} onChange={e => setRetVals(v => ({ ...v, [p.id]: e.target.value }))} style={{ width: 80 }} />
        <button onClick={() => onReturn(p.id, false, retVals[p.id])} style={{ background: G.b1, color: G.pu, padding: '4px 8px', borderRadius: 8 }}>↩ Частково</button>
        <button onClick={() => onReturn(p.id, true)} style={{ background: '#052e16', color: G.gn, padding: '4px 8px', borderRadius: 8 }}>↩ Все</button>
        {isAdmin && <button onClick={() => onWriteoffPrep(p.id)} style={{ background: '#450a0a', color: G.rd, padding: '4px 8px', borderRadius: 8 }}>✕</button>}
      </div>
    </div>)}
  </>
}

// ── СТОРІНКИ ───────────────────────────────────────────────
const PageProd = (props) => <>
  <SubTabs tabs={[['writeoff', '🔋 СПИСАННЯ'], ['prep', '📦 ПІДГОТОВКА'], ['assembly', '⚙️ ЗБІРКА']]} active={props.prodTab} onChange={props.setProdTab} />
  {props.prodTab === 'writeoff' && <Card>
    <CardTitle>🔋 НОВЕ СПИСАННЯ</CardTitle>
    <TypeTabs types={props.batteryTypes} active={props.prodType?.id} onSelect={props.setProdTypeId} />
    <FormRow label="ПРАЦІВНИК"><select value={props.prodWorker} onChange={e => props.setProdWorker(e.target.value)}>{props.workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></FormRow>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><FormRow label="КІЛЬКІСТЬ"><input type="number" value={props.prodQty} onChange={e => props.setProdQty(e.target.value)} /></FormRow><FormRow label="ДАТА"><input value={props.prodDate} onChange={e => props.setProdDate(e.target.value)} /></FormRow></div>
    <SubmitBtn onClick={props.doWriteoff}>✓ СПИСАТИ {parseInt(props.prodQty)||0} АКУМ.</SubmitBtn>
  </Card>}
  {props.prodTab === 'prep' && <PrepTab {...props} />}
  {props.prodTab === 'assembly' && <Card>
    <CardTitle color={G.pu}>⚙️ ВИГОТОВИТИ ЗБІРКУ</CardTitle>
    <FormRow label="ЗБІРКА"><select value={props.asmId} onChange={e => props.setAsmId(e.target.value)}>{props.assemblies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></FormRow>
    <FormRow label="ПРАЦІВНИК"><select value={props.asmWorker} onChange={e => props.setAsmWorker(e.target.value)}>{props.workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></FormRow>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><FormRow label="КІЛЬКІСТЬ"><input type="number" value={props.asmQty} onChange={e => props.setAsmQty(e.target.value)} /></FormRow><FormRow label="ДАТА"><input value={props.asmDate} onChange={e => props.setAsmDate(e.target.value)} /></FormRow></div>
    <SubmitBtn color={G.pu} onClick={props.doIssuePrepAssembly}>⚙️ ВИГОТОВИТИ</SubmitBtn>
  </Card>}
</>

const PageRepair = (props) => <>
  <SubTabs tabs={[['new', '🔧 НОВИЙ'], ['log', `📋 ЗАПИСИ (${props.repairLog.length})`]]} active={props.repTab} onChange={props.setRepTab} />
  {props.repTab === 'new' && <Card><CardTitle color='#fb923c'>🔧 РЕЄСТРАЦІЯ РЕМОНТУ</CardTitle><FormRow label="СЕРІЙНИЙ НОМЕР"><div style={{ display: 'flex', gap: 6 }}><input value={props.repairSearch} onChange={e => props.setRepairSearch(e.target.value)} placeholder="SK-2026-..." /><button onClick={props.doSearch} style={{ padding: 10, background: G.b1, borderRadius: 8 }}>🔍</button></div></FormRow></Card>}
  {props.repTab === 'log' && (props.repairLog.length === 0 ? <Center>Немає записів</Center> : props.repairLog.map(r => <div key={r.id} style={{ background: G.card, borderLeft: `3px solid ${r.status === 'completed' ? G.gn : G.or}`, padding: 12, borderRadius: 12, marginBottom: 8 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>{r.serial}</b><span style={{ fontSize: 11 }}>{r.datetime}</span></div>
    <div style={{ fontSize: 12, color: G.t2 }}>{r.typeName}</div>
    {r.note && <div style={{ fontSize: 13, color: G.or, marginTop: 4 }}>📝 {r.note}</div>}
    {r.status !== 'completed' && <button onClick={() => props.startCompleting(r)} style={{ marginTop: 8, background: G.pu, padding: '6px 15px', borderRadius: 8, width: '100%', border: 'none', color: '#fff' }}>✓ Завершити</button>}
  </div>))}
</>

const PageLog = ({ log, getWorkerColor }) => <>
  {log.length === 0 ? <Center>Журнал порожній</Center> : log.slice(0, 100).map(e => <div key={e.id} style={{ background: G.card, padding: 12, borderRadius: 12, marginBottom: 8, borderLeft: `3px solid ${G.or}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>{e.typeName} × {e.count}</b><span style={{ fontSize: 11 }}>{e.datetime}</span></div>
    <div style={{ fontSize: 12, color: getWorkerColor(e.workerName), fontWeight: 600 }}>{e.workerName}</div>
    <div style={{ fontSize: 11, color: G.cy, marginTop: 4, wordBreak: 'break-all' }}>{e.serials?.join(', ')}</div>
  </div>)}
</>

const PageStock = (props) => {
  const filtered = props.materials.filter(m => !props.stockSearch || m.name.toLowerCase().includes(props.stockSearch.toLowerCase()))
  return <>
    <SubTabs tabs={[['materials', '📦 МАТЕРІАЛИ'], ['types', '🔋 ТИПИ'], ['assemblies', '⚙️ ЗБІРКИ']]} active={props.stockTab} onChange={props.setStockTab} />
    {props.stockTab === 'materials' && <>
      <input placeholder="🔍 Пошук..." value={props.stockSearch} onChange={e => props.setStockSearch(e.target.value)} style={{ marginBottom: 10 }} />
      {filtered.map(m => <div key={m.id} style={{ background: G.card, padding: 12, borderRadius: 12, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><div><b>{m.name}</b><div style={{ fontSize: 12, color: G.t2 }}>{m.stock} {m.unit}</div></div><StockBadge m={m} /></div>
        {props.isAdmin && <div style={{ display: 'flex', gap: 6, marginTop: 8 }}><input type="number" placeholder="+кільк." value={props.rsVals[m.id] || ''} onChange={e => props.setRsVals(v => ({ ...v, [m.id]: e.target.value }))} /><button onClick={() => props.restock(m.id)} style={{ background: '#431407', padding: '0 10px', borderRadius: 8, color: '#fff', border: 'none' }}>+ додати</button></div>}
      </div>)}
    </>}
    {props.stockTab !== 'materials' && <Center>В розробці</Center>}
  </>
}

const PageShopping = ({ materials, sendTelegram, showToast }) => {
  const low = materials.filter(m => m.stock <= m.minStock)
  return <Card><CardTitle color={G.pu}>🛒 ЗАКУПІВЛЯ</CardTitle>
    {low.length === 0 ? <Center>Склад в нормі</Center> : low.map(m => <div key={m.id} style={{ background: G.card2, padding: 10, borderRadius: 8, marginBottom: 6 }}>{m.name}: {m.stock} {m.unit}</div>)}
    <SubmitBtn color={G.pu} onClick={() => { sendTelegram('Дефіцит: ' + low.map(m => m.name).join(', ')); showToast('✓ Відправлено') }}>✈ ОПОВІСТИТИ В ТЕЛЕГРАМ</SubmitBtn>
  </Card>
}

const PageWorkers = ({ workers, producedByName, paidByWorker, getWorkerColor }) => <Card><CardTitle>👷 КОМАНДА</CardTitle>
  {workers.map(w => {
    const prod = producedByName[w.name] || 0; const paid = paidByWorker[w.id] || 0; const unpaid = Math.max(0, prod - paid)
    return <div key={w.id} style={{ padding: '10px 0', borderBottom: `1px solid ${G.b1}` }}>
      <div style={{ color: getWorkerColor(w.name), fontWeight: 700 }}>{w.name}</div>
      <div style={{ display: 'flex', gap: 6, fontSize: 12, marginTop: 4 }}><Chip bg={G.card2} color={G.t2} bd={G.b2}>Вир: {prod}</Chip><Chip bg='#052e16' color={G.gn} bd='#166534'>Опл: {paid}</Chip><Chip bg='#431407' color='#fb923c' bd='#9a3412'>Борг: {unpaid}</Chip></div>
    </div>
  })}
</Card>

const PageTools = ({ tools }) => <>{tools.length === 0 ? <Center>Інструментів немає</Center> : tools.map(t => <div key={t.id} style={{ background: G.card, padding: 14, borderRadius: 12, marginBottom: 10 }}><b>{t.name}</b><div style={{ fontSize: 12, color: G.t2 }}>{t.category}</div></div>)}</>
const PageManual = ({ batteryTypes }) => <Card><CardTitle>📖 МАНУАЛИ</CardTitle>{batteryTypes.map(t => <div key={t.id} style={{ marginBottom: 15 }}><b>{t.name}</b><div style={{ fontSize: 13, color: G.t2, whiteSpace: 'pre-wrap' }}>{t.manual || 'Немає інструкції'}</div></div>)}</Card>
const PageActionLog = ({ actionLogs }) => <Card><CardTitle>📜 ЛОГ ДІЙ</CardTitle>{(actionLogs || []).slice(0, 100).map(e => <div key={e.id} style={{ fontSize: 12, marginBottom: 4, borderBottom: `1px solid ${G.b1}`, paddingBottom: 2 }}><span style={{ color: G.pu }}>{e.user}</span>: {e.details}</div>)}</Card>
const PageBackup = ({ snapshotDate, makeBackup, doRestore }) => <Card><CardTitle color={G.cy}>💾 БЕКАП</CardTitle><div>Зріз: {snapshotDate || '---'}</div><div style={{ display: 'flex', gap: 10, marginTop: 10 }}><button onClick={makeBackup} style={{ flex: 1, padding: 10, background: G.gn, borderRadius: 8, border: 'none' }}>📸 Бекап</button><button onClick={doRestore} style={{ flex: 1, padding: 10, background: G.rd, borderRadius: 8, border: 'none' }}>♻ Відновити</button></div></Card>

// ─── AppInner ─────────────────────────────────────────────
const NAV_ADMIN = [['prod','⚙','ВИР.'],['repair','🔧','РЕМОНТ'],['log','📋','ЖУРНАЛ'],['stock','📦','СКЛАД'],['shopping','🛒','ЗАКУПІВЛЯ'],['workers','👷','КОМАНДА'],['tools','🛠','ІНСТР.'],['actlog','📜','ЛОГ'],['backup','💾','БЕКАП'],['manual','📖','МАНУАЛ']]
const NAV_USER = [['prod','⚙','ВИР.'],['repair','🔧','РЕМОНТ'],['log','📋','ЖУРНАЛ'],['stock','📦','СКЛАД'],['tools','🛠','ІНСТР.'],['manual','📖','МАНУАЛ']]

function AppInner({ isAdmin, onLogout }) {
  const [sync, setSync] = useState('ok')
  const [toast, setToast] = useState({ msg: '', type: '' })
  const [modal, setModal] = useState(null)
  const [page, setPage] = useState('prod')
  const [lastSync, setLastSync] = useState(null)

  const [batteryTypes, setBatteryTypes] = useState([]); const [workers, setWorkers] = useState([]); const [materials, setMaterials] = useState([])
  const [assemblies, setAssemblies] = useState([]); const [prepItems, setPrepItems] = useState([]); const [log, setLog] = useState([])
  const [repairLog, setRepairLog] = useState([]); const [tools, setTools] = useState([]); const [actionLogs, setActionLogs] = useState([])
  const [snapshotDate, setSnapshotDate] = useState('')

  const [prodTab, setProdTab] = useState('writeoff'); const [prodTypeId, setProdTypeId] = useState('')
  const [prodWorker, setProdWorker] = useState(''); const [prodQty, setProdQty] = useState('1')
  const [prodDate, setProdDate] = useState(todayStr()); const [prodSerials, setProdSerials] = useState([])
  const [asmId, setAsmId] = useState(''); const [asmQty, setAsmQty] = useState('1'); const [asmWorker, setAsmWorker] = useState(''); const [asmDate, setAsmDate] = useState(todayStr())
  const [repTab, setRepTab] = useState('new'); const [repairSearch, setRepairSearch] = useState(''); const [stockTab, setStockTab] = useState('materials'); const [stockSearch, setStockSearch] = useState(''); const [rsVals, setRsVals] = useState({})

  const showToast = (msg, type = 'ok') => setToast({ msg, type })
  const api = async (fn, args = []) => { setSync('saving'); try { const res = await gasCall(fn, args); setSync('ok'); return res; } catch (e) { setSync('error'); showToast('Помилка сервера', 'err'); throw e; } }
  const loadAll = useCallback(async () => {
    setSync('loading'); try {
      const d = await gasCall('getAllData');
      setBatteryTypes(d.batteryTypes); setWorkers(d.workers); setMaterials(d.materials); setAssemblies(d.assemblies);
      setPrepItems(d.prepItems); setLog(d.logs || []); setRepairLog(d.repairEntries || []); setTools(d.tools || []); setSnapshotDate(d.snapshotDate);
      if (d.batteryTypes.length && !prodTypeId) setProdTypeId(d.batteryTypes[0].id);
      if (d.workers.length && !prodWorker) { setProdWorker(d.workers[0].id); setAsmWorker(d.workers[0].id); }
      if (d.assemblies.length && !asmId) setAsmId(d.assemblies[0].id);
      setSync('ok'); setLastSync(new Date());
    } catch (e) { setSync('error'); }
  }, [prodTypeId, prodWorker, asmId])

  useEffect(() => { loadAll() }, [loadAll])

  const producedByName = useMemo(() => {
    const r = {}; log.forEach(e => r[e.workerName] = (r[e.workerName] || 0) + (e.count || 0)); return r
  }, [log])

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => { const nav = isAdmin ? NAV_ADMIN : NAV_USER; const idx = nav.findIndex(n => n[0] === page); if (idx < nav.length - 1) setPage(nav[idx+1][0]) },
    onSwipedRight: () => { const nav = isAdmin ? NAV_ADMIN : NAV_USER; const idx = nav.findIndex(n => n[0] === page); if (idx > 0) setPage(nav[idx-1][0]) },
    trackMouse: true
  })

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${G.b1}`, padding: '12px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <img src="/logo.jpg" alt="Z" style={{ width: 32, height: 32, borderRadius: '50%' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><SyncBadge state={sync} /><div onClick={onLogout} style={{ width: 32, height: 32, borderRadius: '50%', background: G.b1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>🚪</div></div>
        </div>
        <div className="tab-nav" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {(isAdmin ? NAV_ADMIN : NAV_USER).map(([id, icon, name]) => (
            <button key={id} onClick={() => setPage(id)} style={{ padding: '6px 12px', borderRadius: 8, background: page === id ? G.b1 : 'transparent', border: `1px solid ${page === id ? G.b2 : 'transparent'}`, color: page === id ? G.t1 : G.t2, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{icon} {name}</button>
          ))}
        </div>
      </div>

      <div {...swipeHandlers} className="page-scroll" style={{ flex: 1, padding: '16px 16px 80px 16px', maxWidth: 600, margin: '0 auto', width: '100%' }}>
        {page === 'prod' && <PageProd
          prodTab={prodTab} setProdTab={setProdTab} batteryTypes={batteryTypes} prodType={batteryTypes.find(t => t.id === prodTypeId)} setProdTypeId={setProdTypeId} workers={workers} prodWorker={prodWorker} setProdWorker={setProdWorker} prodQty={prodQty} setProdQty={setProdQty} prodDate={prodDate} setProdDate={setProdDate} prodSerials={prodSerials} setProdSerials={setProdSerials} assemblies={assemblies} materials={materials} prepItems={prepItems} isAdmin={isAdmin}
          doWriteoff={async () => { if (!prodSerials.filter(s => s).length && (parseInt(prodQty)||0) > 0) return showToast('Введіть С/Н', 'err'); await api('produceBatteries', [{ typeId: prodTypeId, workerId: prodWorker, count: parseInt(prodQty)||0, serials: prodSerials, date: prodDate }]); showToast('✓ Списано'); loadAll() }}
          asmId={asmId} setAsmId={setAsmId} asmQty={asmQty} setAsmQty={setAsmQty} asmWorker={asmWorker} setAsmWorker={setAsmWorker} asmDate={asmDate} setAsmDate={setAsmDate}
          doIssuePrepAssembly={async () => { await api('issueAssemblyToPrep', [asmWorker, asmId, parseFloat(asmQty)||0, 'ALL', false]); showToast('✓ Видано'); loadAll() }}
          onIssueAssembly={(w, a, q, t, f) => api('issueAssemblyToPrep', [w, a, q, t, f]).then(loadAll)}
          onIssueConsumable={(w, m, q) => api('issueConsumableToPrep', [w, m, q]).then(loadAll)}
          onReturn={(id, all, qty) => api('returnPrepItem', [id, all, parseFloat(qty) || 0]).then(loadAll)}
          onWriteoffPrep={(id) => api('writeoffPrepItem', [id]).then(loadAll)}
        />}
        {page === 'repair' && <PageRepair
          repTab={repTab} setRepTab={setRepTab} repairLog={repairLog} repairSearch={repairSearch} setRepairSearch={setRepairSearch} doSearch={() => showToast('Пошук поки що локальний')}
          startCompleting={async (r) => { await api('updateRepairStatus', [r.id, 'completed', prodWorker, todayStr(), '[]']); showToast('✓ Готово'); loadAll() }}
        />}
        {page === 'log' && <PageLog log={log} getWorkerColor={getWorkerColor} />}
        {page === 'stock' && <PageStock materials={materials} stockSearch={stockSearch} setStockSearch={setStockSearch} stockTab={stockTab} setStockTab={setStockTab} isAdmin={isAdmin} rsVals={rsVals} setRsVals={setRsVals} restock={mId => api('restockMaterial', [mId, parseFloat(rsVals[mId])]).then(() => { setRsVals(v => ({...v, [mId]: ''})); loadAll(); showToast('✓ Поповнено') })} />}
        {page === 'shopping' && <PageShopping materials={materials} sendTelegram={sendTelegram} showToast={showToast} />}
        {page === 'workers' && <PageWorkers workers={workers} producedByName={producedByName} paidByWorker={{}} getWorkerColor={getWorkerColor} />}
        {page === 'tools' && <PageTools tools={tools} />}
        {page === 'manual' && <PageManual batteryTypes={batteryTypes} />}
        {page === 'actlog' && <PageActionLog actionLogs={actionLogs} />}
        {page === 'backup' && <PageBackup snapshotDate={snapshotDate} makeBackup={() => api('makeSnapshot').then(loadAll)} doRestore={() => api('restoreFromLastSnapshot').then(loadAll)} />}
      </div>

      <Toast message={toast.msg} type={toast.type} onHide={() => setToast({ msg: '', type: '' })} />
      {modal && <Modal onClose={() => setModal(null)}>{modal.content}</Modal>}
    </div>
  )
}

// ─── Експорт ──────────────────────────────────────────────
export default function App() {
  const [authRole, setAuthRole] = useState(() => localStorage.getItem(AUTH_KEY))
  const handleAuth = (role) => { localStorage.setItem(AUTH_KEY, role); setAuthRole(role) }
  const handleLogout = () => { localStorage.removeItem(AUTH_KEY); setAuthRole(null) }
  if (!authRole) return <AuthScreen onAuth={handleAuth} />
  return <AppInner isAdmin={authRole === 'admin'} onLogout={handleLogout} />
}
