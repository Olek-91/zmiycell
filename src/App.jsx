import { useState, useEffect, useCallback, useRef } from 'react'
import { gasCall } from './api.js'

// ─── CSS ─────────────────────────────────────────────────
const G = {
  bg:'#0a0f1a', card:'#111827', card2:'#0f172a',
  b1:'#1f2937', b2:'#374151', t1:'#e5e7eb', t2:'#6b7280',
  or:'#f97316', cy:'#06b6d4', gn:'#22c55e', pu:'#a78bfa', rd:'#f87171', yw:'#fbbf24',
}

const GLOBAL_CSS = `
@keyframes slideUp{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
input,select{background:#0f172a;border:1px solid #374151;color:#e5e7eb;border-radius:8px;padding:8px 12px;font-family:'Fira Code',monospace;font-size:14px;outline:none;width:100%;transition:border-color .15s}
input:focus,select:focus{border-color:#f97316}
select option{background:#1f2937}
`

// ─── Default materials ────────────────────────────────────
const makeMats = p => [
  ['Комірки акумулятора','шт',48,500,100],
  ['BMS плата','шт',1,20,5],
  ['Нікелева стрічка','м',2.5,80,15],
  ['Корпус (кейс)','шт',1,15,3],
  ["Роз'єм XT90",'шт',2,60,10],
  ['Термоусадка','м',0.5,40,5],
  ['Ізоляційна стрічка','м',1.5,120,20],
  ['Балансувальні дроти','шт',1,18,4],
  ['Провід 10AWG червоний','м',0.4,25,5],
  ['Провід 10AWG чорний','м',0.4,25,5],
  ["Роз'єм JST балансувальний",'шт',1,30,8],
  ['Паяльний флюс','мл',2,200,50],
  ['Припій ПОС-60','г',5,300,80],
  ['Ізолятор торцевий','шт',4,100,20],
  ['Плата захисту від перезаряду','шт',1,12,3],
  ['Термістор NTC','шт',1,22,5],
  ['Стяжка кабельна','шт',6,500,100],
  ['Двосторонній скотч','м',0.2,15,3],
  ['Клей епоксидний','г',3,150,30],
  ['Гвинти M3x6','шт',8,400,80],
  ['Гайка M3','шт',8,400,80],
  ['Шайба M3','шт',16,600,100],
  ['Пінопластова прокладка','шт',2,40,10],
  ['Силіконовий герметик','г',4,200,50],
  ['Індикатор заряду LED','шт',1,18,4],
  ['Резистор 100 Ом','шт',2,80,20],
  ['Конденсатор 100мкФ','шт',1,35,8],
  ['Виводи нікелеві U-подібні','шт',12,200,50],
  ['Малярська стрічка','м',0.3,30,5],
  ['Папір наждачний P400','шт',0.5,20,5],
  ['Мастило контактне','мл',1,100,20],
  ['Стікер маркування QR','шт',1,150,30],
  ['Пакувальна плівка стрейч','м',0.5,40,8],
  ['Карта контролю якості','шт',1,100,20],
  ['Поліетиленовий пакет','шт',1,80,15],
].map((n,i)=>({id:`${p}_${i+1}`,name:n[0],unit:n[1],perBattery:n[2],stock:n[3],minStock:n[4],photoUrl:null}))

// ─── Helpers ─────────────────────────────────────────────
const todayStr = () => new Date().toLocaleDateString('uk-UA',{day:'2-digit',month:'2-digit',year:'numeric'})
const nowStr   = () => new Date().toLocaleString('uk-UA',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})
const uid      = () => String(Date.now()) + String(Math.floor(Math.random()*9999))
const s = (styles) => Object.assign({},styles)

// ─── UI atoms ─────────────────────────────────────────────
const Label = ({children}) =>
  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,color:G.t2,letterSpacing:.5,marginBottom:5}}>{children}</div>

const FormRow = ({label,children}) =>
  <div style={{marginBottom:12}}>{label && <Label>{label}</Label>}{children}</div>

const Card = ({children,style={}}) =>
  <div style={{background:G.card,border:`1px solid ${G.b1}`,borderRadius:14,padding:14,marginBottom:10,...style}}>{children}</div>

const CardTitle = ({children,color=G.or}) =>
  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:17,fontWeight:700,color,letterSpacing:.5,marginBottom:10}}>{children}</div>

const QtyBtn = ({onClick,children}) =>
  <button onClick={onClick} style={{width:38,height:38,borderRadius:8,background:G.b1,border:`1px solid ${G.b2}`,color:G.t1,fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontFamily:'monospace'}}>{children}</button>

const SubmitBtn = ({children,onClick,color=G.or,disabled=false}) =>
  <button onClick={onClick} disabled={disabled} style={{width:'100%',padding:'15px 0',background:disabled?G.b1:color,color:disabled?G.t2:color===G.yw?'#000':'#fff',border:'none',borderRadius:12,fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:700,letterSpacing:.5,marginTop:10,cursor:disabled?'not-allowed':'pointer',opacity:disabled?.5:1,transition:'.15s'}}>{children}</button>

const TypeTabs = ({types,active,onSelect}) =>
  <div style={{display:'flex',gap:8,marginBottom:12}}>
    {types.map(t=><button key={t.id} onClick={()=>onSelect(t.id)} style={{flex:1,padding:'10px 6px',borderRadius:10,fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:.5,cursor:'pointer',border:`1px solid ${t.id===active?t.color:G.b2}`,background:t.id===active?'#1c1107':G.card,color:t.id===active?t.color:G.t2,transition:'.15s'}}>{t.name}</button>)}
  </div>

const SubTabs = ({tabs,active,onChange}) =>
  <div style={{display:'flex',gap:8,marginBottom:12}}>
    {tabs.map(([k,label])=><button key={k} onClick={()=>onChange(k)} style={{flex:1,padding:9,borderRadius:10,border:`1px solid ${k===active?G.or:G.b2}`,background:k===active?'#1c1917':G.card,color:k===active?G.or:G.t2,fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:.5,cursor:'pointer'}}>{label}</button>)}
  </div>

const StatusBadge = ({m,perDay}) => {
  const days = m.perBattery>0 ? m.stock/(m.perBattery*perDay) : Infinity
  if (m.stock<=0)          return <Chip bg='#2e1065' color='#c084fc' bd='#4c1d95'>НЕМА</Chip>
  if (m.stock<=m.minStock) return <Chip bg='#450a0a' color={G.rd} bd='#7f1d1d'>КРИТ.</Chip>
  if (days<3)              return <Chip bg='#431407' color='#fb923c' bd='#9a3412'>МАЛО ~{Math.floor(days)}д</Chip>
  return <Chip bg='#052e16' color={G.gn} bd='#166534'>НОРМА ~{Math.floor(days)}д</Chip>
}

const Chip = ({bg,color,bd,children,style={}}) =>
  <span style={{background:bg,color,border:`1px solid ${bd}`,padding:'2px 8px',borderRadius:99,fontSize:11,fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:.5,flexShrink:0,...style}}>{children}</span>

const Center = ({children}) =>
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:40,color:G.t2,fontSize:14}}>{children}</div>

function SyncBadge({state}) {
  const cfg = {
    loading:['⟳ завантаження...','#1e1b4b','#a5b4fc','#3730a3',true],
    saving: ['⟳ збереження...' ,'#1e1b4b','#a5b4fc','#3730a3',true],
    ok:     ['✓ синхр.'        ,'#052e16',G.gn    ,'#166534',false],
    error:  ['✕ помилка'       ,'#450a0a',G.rd    ,'#7f1d1d',false],
  }[state] || ['...',G.b1,G.t2,G.b2,false]
  return <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,padding:'3px 9px',borderRadius:10,background:cfg[1],color:cfg[2],border:`1px solid ${cfg[3]}`,animation:cfg[4]?'pulse 1s infinite':'',fontFamily:"'Fira Code',monospace"}}>{cfg[0]}</span>
}

function Toast({msg,type}) {
  return <div style={{position:'fixed',top:14,left:12,right:12,zIndex:9999,
    background:type==='err'?'#450a0a':'#052e16',
    border:`1px solid ${type==='err'?G.rd:G.gn}`,
    color:type==='err'?'#fca5a5':'#86efac',
    padding:'13px 16px',borderRadius:12,fontSize:13,
    fontFamily:"'Fira Code',monospace",
    boxShadow:'0 8px 32px rgba(0,0,0,.7)',
    animation:'slideUp .2s ease'}}>{msg}</div>
}

function Modal({children,onClose}) {
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:500,padding:`0 0 env(safe-area-inset-bottom,0)`}}>
      <div onClick={e=>e.stopPropagation()} style={{background:G.card,border:`1px solid ${G.b2}`,borderRadius:'18px 18px 0 0',padding:'20px 18px 32px',width:'100%',maxWidth:700,maxHeight:'90vh',overflowY:'auto',animation:'slideUp .25s ease'}}>
        <div style={{width:40,height:4,background:G.b2,borderRadius:2,margin:'0 auto 18px'}}/>
        {children}
      </div>
    </div>
  )
}

function ConfirmModal({title,body,onYes,onNo}) {
  return (
    <Modal onClose={onNo}>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:19,fontWeight:700,marginBottom:10}}>{title}</div>
      <div style={{color:G.t2,fontSize:13,lineHeight:1.7,marginBottom:18}}>{body}</div>
      <div style={{display:'flex',gap:10}}>
        <button onClick={onNo} style={{flex:1,padding:14,background:G.b1,color:G.t2,border:`1px solid ${G.b2}`,borderRadius:12,fontFamily:"'Fira Code',monospace",fontSize:14,cursor:'pointer'}}>✕ Скасувати</button>
        <button onClick={onYes} style={{flex:1,padding:14,background:'#16a34a',color:'#fff',border:'none',borderRadius:12,fontFamily:"'Fira Code',monospace",fontSize:14,fontWeight:600,cursor:'pointer'}}>✓ Підтвердити</button>
      </div>
    </Modal>
  )
}

function Logo({size=32}) {
  return (
    <svg width={size} height={Math.round(size*.86)} viewBox="0 0 140 120" fill="none">
      <circle cx="75" cy="60" r="48" fill="#0a0f1a" stroke="#f97316" strokeWidth="2.5"/>
      <rect x="42" y="44" width="54" height="32" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1.5"/>
      <rect x="96" y="52" width="6" height="16" rx="2" fill="#334155"/>
      <rect x="46" y="49" width="10" height="22" rx="2" fill="#06b6d4" opacity=".9"/>
      <rect x="59" y="49" width="10" height="22" rx="2" fill="#06b6d4" opacity=".7"/>
      <rect x="72" y="49" width="10" height="22" rx="2" fill="#06b6d4" opacity=".5"/>
      <path d="M68 46L63 58h5L63 70l9-14h-5z" fill="#fbbf24"/>
      <path d="M30 70Q45 85 65 80Q85 75 100 80Q110 83 108 76Q115 65 105 56Q98 50 85 44Q70 37 55 42Q40 47 36 58Q32 68 30 70" stroke="#4ade80" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      <ellipse cx="17" cy="56" rx="9" ry="6" fill="#4ade80" transform="rotate(-20 17 56)"/>
      <path d="M9 57L4 54M9 57L4 60" stroke="#f87171" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════
export default function App() {
  // ── Core state ───────────────────────────────────────────
  const [sync,  setSync]  = useState('loading')
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(null)   // {type, ...props}

  const [page,    setPage]    = useState('prod')
  const [prodTab, setProdTab] = useState('writeoff')
  const [repTab,  setRepTab]  = useState('new')

  // ── Data state ───────────────────────────────────────────
  const [batteryTypes, setBatteryTypes] = useState([])
  const [workers,      setWorkers]      = useState([])
  const [tools,        setTools]        = useState([])
  const [log,          setLog]          = useState([])
  const [repairLog,    setRepairLog]    = useState([])
  const [prepItems,    setPrepItems]    = useState([])

  // ── UI state ─────────────────────────────────────────────
  const [prodTypeId,   setProdTypeId]   = useState('')
  const [stockTypeId,  setStockTypeId]  = useState('')
  const [prodWorker,   setProdWorker]   = useState('')
  const [prodQty,      setProdQty]      = useState(1)
  const [prodDate,     setProdDate]     = useState(todayStr)
  const [prodSerials,  setProdSerials]  = useState([])
  const [stockSearch,  setStockSearch]  = useState('')
  const [repairSerial, setRepairSerial] = useState('')
  const [repairSearch, setRepairSearch] = useState('')

  // ── Helpers ───────────────────────────────────────────────
  const showToast = useCallback((msg, type='ok') => {
    setToast({msg,type})
    setTimeout(()=>setToast(null), 3500)
  }, [])

  const openConfirm = useCallback((title, body, onYes) => {
    setModal({type:'confirm', title, body, onYes})
  }, [])
  const closeModal = () => setModal(null)

  // ── API wrapper ───────────────────────────────────────────
  const api = useCallback(async (action, params=[]) => {
    setSync('saving')
    try {
      const res = await gasCall(action, params)
      setSync('ok')
      return res
    } catch(e) {
      setSync('error')
      showToast('Помилка: ' + e.message, 'err')
      throw e
    }
  }, [showToast])

  // ── Load all data ─────────────────────────────────────────
  useEffect(() => {
    setSync('loading')
    gasCall('loadAll', [])
      .then(data => {
        setBatteryTypes(data.batteryTypes || [])
        setWorkers(data.workers || [])
        setTools(data.tools || [])
        setLog(data.log || [])
        setRepairLog(data.repairLog || [])
        setPrepItems(data.prepItems || [])
        if (data.batteryTypes?.length) {
          setProdTypeId(data.batteryTypes[0].id)
          setStockTypeId(data.batteryTypes[0].id)
        }
        if (data.workers?.length) setProdWorker(data.workers[0].id)
        setSync('ok')
      })
      .catch(e => {
        setSync('error')
        showToast('Не вдалось завантажити дані. Перевірте підключення.', 'err')
      })
  }, [showToast])

  // ── Derived ───────────────────────────────────────────────
  const prodType  = batteryTypes.find(t=>t.id===prodTypeId)  || batteryTypes[0]
  const stockType = batteryTypes.find(t=>t.id===stockTypeId) || batteryTypes[0]
  const perDay    = Math.max(1, workers.length) * 1.5
  const activePrep = prepItems.filter(p=>p.status!=='returned')

  // ── Build consumed list ───────────────────────────────────
  const buildConsumed = useCallback((type, workerId, qty) => {
    if (!type) return []
    const wPrep = prepItems.filter(p=>p.workerId===workerId && p.typeId===type.id && p.status!=='returned')
    return type.materials.map(m => {
      const need      = +(m.perBattery * qty).toFixed(4)
      const prepAvail = wPrep.filter(p=>p.matId===m.id).reduce((s,p)=>+(s+p.qty-p.returnedQty).toFixed(4), 0)
      const fromPrep  = +Math.min(prepAvail, need).toFixed(4)
      const fromStock = +(need - fromPrep).toFixed(4)
      return {matId:m.id, name:m.name, unit:m.unit, amount:need, fromPrep, fromStock, totalStock:m.stock}
    })
  }, [prepItems])

  // ════════════════════════════════════════════════════════
  //  ACTIONS
  // ════════════════════════════════════════════════════════

  // ── Writeoff ─────────────────────────────────────────────
  const doWriteoff = () => {
    const type   = prodType
    const worker = workers.find(w=>w.id===prodWorker)
    if (!type || !worker) return showToast('Оберіть тип та працівника', 'err')

    const serials = prodSerials.slice(0, prodQty)
    for (const s of serials) if (!s?.trim()) return showToast('Введіть всі серійні номери', 'err')

    const consumed = buildConsumed(type, worker.id, prodQty)
    const shortage = consumed.find(c => c.fromStock > c.totalStock)
    if (shortage) return showToast('Не вистачає: ' + shortage.name, 'err')

    openConfirm(
      'Підтвердити списання',
      <div style={{fontSize:13,color:G.t2,lineHeight:1.8}}>
        <b style={{color:G.t1}}>{type.name}</b><br/>
        Працівник: {worker.name}<br/>
        Кількість: <b style={{color:G.or}}>{prodQty}</b><br/>
        С/н: {serials.join(', ')}
      </div>,
      async () => {
        closeModal()
        const entry = {
          id:uid(), datetime:nowStr(), date:prodDate,
          typeId:type.id, typeName:type.name, workerName:worker.name,
          count:prodQty, serials, consumed, kind:'production', repairNote:'',
        }
        try {
          await api('writeOff', [entry])
          // Local state sync
          setBatteryTypes(prev => prev.map(t => t.id!==type.id ? t : {
            ...t, materials: t.materials.map(m => {
              const c = consumed.find(c=>c.matId===m.id)
              return c ? {...m, stock: Math.max(0, +(m.stock - c.fromStock).toFixed(4))} : m
            })
          }))
          // Deduct prep
          setPrepItems(prev => {
            const next = prev.map(p=>({...p}))
            consumed.forEach(c => {
              if (!c.fromPrep) return
              let rem = c.fromPrep
              next.filter(p=>p.workerId===worker.id && p.typeId===type.id && p.matId===c.matId && p.status!=='returned').forEach(p => {
                if (rem<=0) return
                const avail = p.qty - p.returnedQty
                const use   = Math.min(avail, rem)
                p.returnedQty = +(p.returnedQty + use).toFixed(4)
                p.status = p.returnedQty >= p.qty ? 'returned' : 'partial'
                rem = +(rem - use).toFixed(4)
              })
            })
            return next
          })
          setLog(prev => [entry, ...prev])
          setProdSerials([])
          showToast(`✓ Списано ${prodQty} акум. (${serials.join(', ')})`)
        } catch {}
      }
    )
  }

  // ── Prep issue ────────────────────────────────────────────
  const doIssuePrep = (workerId, matId, qty, typeId) => {
    const type   = batteryTypes.find(t=>t.id===typeId)
    const worker = workers.find(w=>w.id===workerId)
    const mat    = type?.materials.find(m=>m.id===matId)
    if (!mat || !worker || !qty || qty<=0) return showToast('Заповніть всі поля', 'err')
    if (mat.stock < qty) return showToast('Не вистачає: ' + mat.name, 'err')

    openConfirm('Видача на заготовку',
      <div style={{fontSize:13,color:G.t2,lineHeight:1.8}}><b style={{color:G.t1}}>{mat.name}</b><br/>Кількість: {qty} {mat.unit}<br/>Працівник: {worker.name}</div>,
      async () => {
        closeModal()
        const item = {id:uid(),workerId:worker.id,workerName:worker.name,typeId:type.id,
          matId:mat.id,matName:mat.name,unit:mat.unit,qty,returnedQty:0,
          date:todayStr(),datetime:nowStr(),status:'active'}
        try {
          await api('addPrepItem', [item])
          setBatteryTypes(prev => prev.map(t => t.id!==type.id ? t : {
            ...t, materials: t.materials.map(m => m.id!==mat.id ? m : {...m, stock: Math.max(0, +(m.stock-qty).toFixed(4))})
          }))
          setPrepItems(prev => [item, ...prev])
          showToast(`✓ Видано ${qty} ${mat.unit} → ${worker.name}`)
        } catch {}
      }
    )
  }

  // ── Prep return ───────────────────────────────────────────
  const doReturnPrep = async (prepId, all, customQty) => {
    const item  = prepItems.find(p=>String(p.id)===String(prepId))
    if (!item) return
    const avail = +(item.qty - item.returnedQty).toFixed(4)
    const qty   = all ? avail : parseFloat(customQty||0)
    if (!qty || qty<=0)  return showToast('Введіть кількість', 'err')
    if (qty > avail)     return showToast('Більше ніж є на руках', 'err')
    try {
      await api('returnPrep', [prepId, qty])
      setBatteryTypes(prev => prev.map(t => t.id!==item.typeId ? t : {
        ...t, materials: t.materials.map(m => m.id!==item.matId ? m : {...m, stock: +(m.stock+qty).toFixed(4)})
      }))
      setPrepItems(prev => prev.map(p => String(p.id)!==String(prepId) ? p : {
        ...p, returnedQty: +(p.returnedQty+qty).toFixed(4),
        status: (p.returnedQty+qty)>=p.qty ? 'returned' : 'partial'
      }))
      showToast(`✓ Повернено ${qty} ${item.unit}`)
    } catch {}
  }

  // ── Repair submit ─────────────────────────────────────────
  const doSubmitRepair = (repairEntry) => {
    const type = batteryTypes.find(t=>t.id===repairEntry.typeId)
    const err  = repairEntry.materials.filter(m=>m.selected && m.qty>0).find(m => {
      const mat = type?.materials.find(mx=>mx.id===m.matId)
      return mat && mat.stock < m.qty
    })
    if (err) return showToast('Не вистачає: ' + err.matName, 'err')

    openConfirm('Підтвердити ремонт',
      <div style={{fontSize:13,color:G.t2,lineHeight:1.8}}>
        С/н: <b style={{color:G.cy}}>{repairEntry.serial}</b><br/>
        Ремонтує: {repairEntry.repairWorker}
      </div>,
      async () => {
        closeModal()
        try {
          await api('addRepair', [repairEntry])
          setBatteryTypes(prev => prev.map(t => t.id!==repairEntry.typeId ? t : {
            ...t, materials: t.materials.map(m => {
              const rm = repairEntry.materials.find(r=>r.matId===m.id && r.selected && r.qty>0)
              return rm ? {...m, stock: Math.max(0, +(m.stock-rm.qty).toFixed(4))} : m
            })
          }))
          setRepairLog(prev => [repairEntry, ...prev])
          setLog(prev => [{
            id:repairEntry.id+'L', datetime:repairEntry.datetime, date:repairEntry.date,
            typeId:repairEntry.typeId, typeName:repairEntry.typeName, workerName:repairEntry.repairWorker,
            count:0, serials:[repairEntry.serial],
            consumed:repairEntry.materials.filter(m=>m.selected && m.qty>0).map(m=>({name:m.matName,unit:m.unit,amount:m.qty})),
            kind:'repair', repairNote:repairEntry.note||'',
          }, ...prev])
          setRepairSerial('')
          setRepairSearch('')
          showToast('✓ Ремонт зафіксовано: ' + repairEntry.serial)
        } catch {}
      }
    )
  }

  // ════════════════════════════════════════════════════════
  //  PAGES
  // ════════════════════════════════════════════════════════
  const wrap = (children) =>
    <div style={{padding:'12px 12px 80',maxWidth:700,margin:'0 auto'}}>{children}</div>

  // ── Production ────────────────────────────────────────────
  const PageProd = () => {
    const consumed = prodType ? buildConsumed(prodType, prodWorker, prodQty) : []
    const serials  = Array.from({length:prodQty},(_,i)=>prodSerials[i]||'')

    return wrap(<>
      <SubTabs tabs={[['writeoff','🔋 СПИСАННЯ'],['prep','📦 ЗАГОТОВКА']]} active={prodTab} onChange={setProdTab}/>

      {prodTab==='writeoff' && <>
        <TypeTabs types={batteryTypes} active={prodTypeId} onSelect={id=>{setProdTypeId(id);setProdSerials([])}}/>
        <Card>
          <FormRow label="ПРАЦІВНИК">
            <select value={prodWorker} onChange={e=>setProdWorker(e.target.value)}>
              {workers.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </FormRow>
          <FormRow label="ДАТА">
            <input value={prodDate} onChange={e=>setProdDate(e.target.value)}/>
          </FormRow>
          <FormRow label="КІЛЬКІСТЬ АКУМУЛЯТОРІВ">
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <QtyBtn onClick={()=>{if(prodQty>1){setProdQty(q=>q-1);setProdSerials(s=>s.slice(0,-1))}}}>−</QtyBtn>
              <span style={{fontSize:28,fontWeight:700,color:G.or,minWidth:44,textAlign:'center'}}>{prodQty}</span>
              <QtyBtn onClick={()=>{if(prodQty<20) setProdQty(q=>q+1)}}>+</QtyBtn>
            </div>
          </FormRow>
          <FormRow label="СЕРІЙНІ НОМЕРИ">
            {serials.map((v,i)=>
              <input key={i} placeholder={`#${i+1} серійний номер`} value={v}
                onChange={e=>{const s=[...prodSerials];while(s.length<=i)s.push('');s[i]=e.target.value;setProdSerials(s)}}
                style={{marginBottom:6}}/>)}
          </FormRow>
        </Card>

        {prodType && <Card>
          <CardTitle>⚡ БУДЕ СПИСАНО</CardTitle>
          {consumed.map(c => {
            const ok = c.fromStock <= c.totalStock
            return <div key={c.matId} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:`1px solid ${G.b1}`,fontSize:13}}>
              <span style={{color:ok?G.t1:G.rd,flex:1,paddingRight:8}}>{c.name}</span>
              <div style={{display:'flex',gap:5,alignItems:'center',flexWrap:'wrap',justifyContent:'flex-end'}}>
                {c.fromPrep>0  && <Chip bg='#2e1065' color='#c084fc' bd='#4c1d95'>📦{c.fromPrep}</Chip>}
                {c.fromStock>0 && <Chip bg='#1c1007' color='#fb923c' bd='#9a3412'>🏭{c.fromStock}</Chip>}
                <span style={{color:ok?G.gn:G.rd,fontWeight:600,minWidth:60,textAlign:'right'}}>{c.amount} {c.unit}</span>
              </div>
            </div>
          })}
        </Card>}

        <SubmitBtn onClick={doWriteoff}>✓ СПИСАТИ МАТЕРІАЛИ</SubmitBtn>
        <div style={{height:16}}/>
      </>}

      {prodTab==='prep' && <PrepTab
        batteryTypes={batteryTypes} workers={workers} prepItems={prepItems}
        prodTypeId={prodTypeId} onIssue={doIssuePrep} onReturn={doReturnPrep}
      />}
    </>)
  }

  // ── Stock ─────────────────────────────────────────────────
  const PageStock = () => {
    const [rsVals, setRsVals] = useState({})
    const [newMat, setNewMat] = useState({name:'',unit:'',perBattery:'',stock:'',minStock:''})
    const type = stockType
    if (!type) return wrap(<Center>Немає даних</Center>)

    const mats = type.materials.filter(m => !stockSearch || m.name.toLowerCase().includes(stockSearch.toLowerCase()))

    const restock = async (matId) => {
      const qty = parseFloat(rsVals[matId]||0)
      if (!qty || qty<=0) return showToast('Введіть кількість', 'err')
      const res = await api('updateMaterialStock', [type.id, matId, qty])
      setBatteryTypes(prev => prev.map(t => t.id!==type.id ? t : {
        ...t, materials: t.materials.map(m => m.id!==matId ? m : {...m, stock:res.stock})
      }))
      setRsVals(v=>({...v,[matId]:''}))
      showToast(`✓ Поповнено на ${qty}`)
    }

    const editField = async (matId, field, old) => {
      const val = prompt(field==='name'?'Нова назва:':field==='stock'?'Новий залишок:':field==='perBattery'?'На 1 акумулятор:':'Мін. запас:', String(old))
      if (val===null || val===String(old)) return
      const parsed = field==='name' ? val.trim() : parseFloat(val)
      if (field!=='name' && isNaN(parsed)) return showToast('Невірне значення','err')
      if (!parsed && field==='name') return
      await api('updateMaterialField', [type.id, matId, field, parsed])
      setBatteryTypes(prev => prev.map(t => t.id!==type.id ? t : {
        ...t, materials: t.materials.map(m => m.id!==matId ? m : {...m, [field]:parsed})
      }))
      showToast('✓ Збережено')
    }

    const deleteMat = (m) => openConfirm('Видалити матеріал?',
      <span>Буде видалено: <b style={{color:G.rd}}>{m.name}</b></span>,
      async () => {
        closeModal()
        await api('deleteMaterial', [type.id, m.id])
        setBatteryTypes(prev => prev.map(t => t.id!==type.id ? t : {
          ...t, materials: t.materials.filter(mx => mx.id!==m.id)
        }))
        showToast('✓ Видалено ' + m.name)
      })

    const showHist = (m) => {
      const entries = log.flatMap(e=>(e.consumed||[]).filter(c=>c.name===m.name).map(c=>({...c,datetime:e.datetime,workerName:e.workerName,kind:e.kind}))).slice(0,20)
      setModal({type:'history', mat:m, entries})
    }

    const addMat = async () => {
      const {name,unit,perBattery,stock,minStock} = newMat
      if (!name||!unit||!perBattery) return showToast('Назва, одиниця та норма — обов\'язкові','err')
      const res = await api('addMaterial',[type.id,name,unit,parseFloat(perBattery),parseFloat(stock)||0,parseFloat(minStock)||0])
      setBatteryTypes(prev => prev.map(t => t.id!==type.id ? t : {
        ...t, materials: [...t.materials, {id:res.id,name,unit,perBattery:parseFloat(perBattery),stock:parseFloat(stock)||0,minStock:parseFloat(minStock)||0,photoUrl:null}]
      }))
      setNewMat({name:'',unit:'',perBattery:'',stock:'',minStock:''})
      showToast('✓ Додано ' + name)
    }

    const prepBadge = (matId) => prepItems.filter(p=>p.typeId===type.id&&p.matId===matId&&p.status!=='returned').reduce((s,p)=>+(s+p.qty-p.returnedQty).toFixed(4),0)

    return wrap(<>
      <TypeTabs types={batteryTypes} active={stockTypeId} onSelect={setStockTypeId}/>
      <input placeholder="🔍 Пошук матеріалу..." value={stockSearch} onChange={e=>setStockSearch(e.target.value)} style={{marginBottom:10}}/>

      {mats.map(m => <div key={m.id} style={{background:G.card,border:`1px solid ${G.b1}`,borderRadius:12,padding:12,marginBottom:8,display:'flex',gap:10}}>
        <div style={{width:50,height:42,borderRadius:8,border:`1px dashed ${G.b2}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,color:G.b2,background:G.card2,flexShrink:0,overflow:'hidden'}}>
          {m.photoUrl ? <img src={m.photoUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : '📷'}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div onClick={()=>editField(m.id,'name',m.name)} style={{fontSize:14,fontWeight:600,cursor:'pointer',marginBottom:5,color:G.t1}}>{m.name}</div>
          <div style={{display:'flex',gap:5,flexWrap:'wrap',alignItems:'center',marginBottom:7}}>
            <StatusBadge m={m} perDay={perDay}/>
            <span onClick={()=>editField(m.id,'stock',m.stock)} style={{background:G.card2,border:`1px solid ${G.b1}`,borderRadius:6,padding:'2px 8px',fontSize:12,color:G.cy,cursor:'pointer'}}>{m.stock} {m.unit}</span>
            <span style={{fontSize:11,color:G.t2}}>×{m.perBattery}/акум</span>
            <span style={{fontSize:11,color:G.t2}}>мін:{m.minStock}</span>
            {prepBadge(m.id)>0 && <Chip bg='#2e1065' color='#c084fc' bd='#4c1d95'>📦{prepBadge(m.id)}</Chip>}
            <button onClick={()=>showHist(m)} style={{background:G.card2,border:`1px solid ${G.b1}`,color:G.pu,padding:'2px 7px',borderRadius:6,fontSize:11,cursor:'pointer'}}>📊</button>
            <button onClick={()=>deleteMat(m)} style={{background:'#450a0a',border:'none',color:G.rd,padding:'2px 7px',borderRadius:6,fontSize:11,cursor:'pointer'}}>✕</button>
          </div>
          <div style={{display:'flex',gap:6}}>
            <input type="number" placeholder="+кільк." value={rsVals[m.id]||''} onChange={e=>setRsVals(v=>({...v,[m.id]:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&restock(m.id)} style={{width:90}}/>
            <button onClick={()=>restock(m.id)} style={{padding:'6px 12px',background:'#431407',color:'#fed7aa',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>+</button>
          </div>
        </div>
      </div>)}

      <Card>
        <CardTitle color={G.gn}>+ ДОДАТИ МАТЕРІАЛ</CardTitle>
        <input placeholder="Назва матеріалу" value={newMat.name} onChange={e=>setNewMat(v=>({...v,name:e.target.value}))} style={{marginBottom:6}}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:6}}>
          <input placeholder="Одиниця (шт, м, г)" value={newMat.unit} onChange={e=>setNewMat(v=>({...v,unit:e.target.value}))}/>
          <input type="number" placeholder="На 1 акум" value={newMat.perBattery} onChange={e=>setNewMat(v=>({...v,perBattery:e.target.value}))}/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:4}}>
          <input type="number" placeholder="Залишок" value={newMat.stock} onChange={e=>setNewMat(v=>({...v,stock:e.target.value}))}/>
          <input type="number" placeholder="Мін. запас" value={newMat.minStock} onChange={e=>setNewMat(v=>({...v,minStock:e.target.value}))}/>
        </div>
        <SubmitBtn onClick={addMat} color={G.gn}>+ ДОДАТИ МАТЕРІАЛ</SubmitBtn>
      </Card>
    </>)
  }

  // ── Repair ────────────────────────────────────────────────
  const PageRepair = () => {
    const [repWorker,  setRepWorker]  = useState(workers[0]?.id||'')
    const [repDate,    setRepDate]    = useState(todayStr())
    const [repNote,    setRepNote]    = useState('')
    const [matChecks,  setMatChecks]  = useState({})
    const [matQtys,    setMatQtys]    = useState({})

    const serial = repairSerial
    const found  = serial ? log.find(l=>l.serials?.includes(serial)) : null
    const repType = found ? batteryTypes.find(t=>t.id===found.typeId) : null

    const doSearch = () => setRepairSerial(repairSearch.trim())

    const handleSubmit = () => {
      if (!repType) return
      const rw = workers.find(w=>w.id===repWorker)
      const materials = repType.materials.map(m=>({
        matId:m.id, matName:m.name, unit:m.unit,
        qty: parseFloat(matQtys[m.id] ?? m.perBattery)||0,
        selected: matChecks[m.id] !== false,
      }))
      doSubmitRepair({
        id:uid(), datetime:nowStr(), date:repDate,
        serial, typeName:repType.name, typeId:repType.id,
        originalWorker:found.workerName, repairWorker:rw?.name||'',
        note:repNote, materials, status:'completed',
      })
    }

    const returnAll = (r) => openConfirm('Повернути всі матеріали?','Повернуться на склад.',async()=>{
      closeModal()
      await api('returnRepairMaterials',[r.id,null])
      const type = batteryTypes.find(t=>t.id===r.typeId)
      if (type) setBatteryTypes(prev=>prev.map(t=>t.id!==r.typeId?t:{...t,materials:t.materials.map(m=>{
        const rm=r.materials.find(rx=>rx.matId===m.id&&rx.selected&&rx.qty>0)
        return rm?{...m,stock:+(m.stock+rm.qty).toFixed(4)}:m
      })}))
      showToast('✓ Матеріали повернуто')
    })

    const deleteRep = (r) => openConfirm('Видалити запис?','Матеріали НЕ повернуться на склад.',async()=>{
      closeModal()
      await api('deleteRepair',[r.id])
      setRepairLog(prev=>prev.filter(rx=>String(rx.id)!==String(r.id)))
      showToast('✓ Видалено')
    })

    return wrap(<>
      <SubTabs tabs={[['new','🔧 НОВИЙ'],['log','📋 ЗАПИСИ']]} active={repTab} onChange={setRepTab}/>

      {repTab==='new' && <>
        <Card>
          <CardTitle color='#fb923c'>🔧 НОВИЙ РЕМОНТ</CardTitle>
          <FormRow label="СЕРІЙНИЙ НОМЕР">
            <div style={{display:'flex',gap:6}}>
              <input value={repairSearch} onChange={e=>setRepairSearch(e.target.value)} placeholder="напр. SK-2026-001" onKeyDown={e=>e.key==='Enter'&&doSearch()}/>
              <button onClick={doSearch} style={{padding:'8px 14px',background:G.b1,border:`1px solid ${G.b2}`,color:G.t1,borderRadius:8,fontSize:18,cursor:'pointer',flexShrink:0}}>🔍</button>
            </div>
          </FormRow>
        </Card>

        {serial && found && repType && <Card style={{borderColor:G.gn}}>
          <div style={{color:G.gn,fontSize:12,marginBottom:12}}>✓ Знайдено: {found.typeName} · {found.workerName} · {found.date}</div>
          <FormRow label="РЕМОНТУЄ">
            <select value={repWorker} onChange={e=>setRepWorker(e.target.value)}>
              {workers.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </FormRow>
          <FormRow label="ДАТА"><input value={repDate} onChange={e=>setRepDate(e.target.value)}/></FormRow>
          <FormRow label="НОТАТКА / НЕСПРАВНІСТЬ"><input value={repNote} onChange={e=>setRepNote(e.target.value)} placeholder="напр. заміна BMS"/></FormRow>
          <FormRow label="МАТЕРІАЛИ ДЛЯ ЗАМІНИ">
            {repType.materials.map(m => {
              const checked = matChecks[m.id] !== false
              const qty     = matQtys[m.id] ?? m.perBattery
              const mat     = repType.materials.find(mx=>mx.id===m.id)
              const ok      = !checked || !qty || !mat || mat.stock >= parseFloat(qty)||0
              return <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:`1px solid ${G.b1}`,fontSize:13}}>
                <input type="checkbox" checked={checked} onChange={e=>setMatChecks(v=>({...v,[m.id]:e.target.checked}))} style={{width:18,height:18,accentColor:G.or,cursor:'pointer',flexShrink:0}}/>
                <span style={{flex:1,color:checked?G.t1:G.t2}}>{m.name}</span>
                <input type="number" value={qty} onChange={e=>setMatQtys(v=>({...v,[m.id]:e.target.value}))} style={{width:70,border:`1px solid ${ok?G.b2:G.rd}`,textAlign:'center'}}/>
                <span style={{color:G.t2,fontSize:11,width:32,flexShrink:0}}>{m.unit}</span>
              </div>
            })}
          </FormRow>
          <SubmitBtn onClick={handleSubmit} color='#ea580c'>🔧 СПИСАТИ НА РЕМОНТ</SubmitBtn>
        </Card>}

        {serial && !found && <Card style={{borderColor:G.yw}}>
          <div style={{color:G.yw,fontSize:13,marginBottom:12}}>⚠ Акумулятор не знайдено — зареєструйте вручну</div>
          <FormRow label="ТИП АКУМУЛЯТОРА">
            <select id="manType">{batteryTypes.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
          </FormRow>
          <FormRow label="ВИРОБНИК">
            <select id="manWorker">{workers.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select>
          </FormRow>
          <FormRow label="ДАТА ВИРОБНИЦТВА">
            <input id="manDate" defaultValue={todayStr()} placeholder="дд.мм.рррр"/>
          </FormRow>
          <SubmitBtn color={G.yw} onClick={()=>{
            const typeId   = document.getElementById('manType').value
            const workerId = document.getElementById('manWorker').value
            const date     = document.getElementById('manDate').value
            const t = batteryTypes.find(t=>t.id===typeId)
            const w = workers.find(w=>w.id===workerId)
            const entry = {id:uid(),datetime:nowStr(),date,typeId,typeName:t?.name||'',workerName:w?.name||'',count:1,serials:[serial],consumed:[],kind:'production',repairNote:''}
            setLog(prev=>[entry,...prev])
            showToast('✓ Зареєстровано ' + serial)
          }}>+ ЗАРЕЄСТРУВАТИ</SubmitBtn>
        </Card>}
      </>}

      {repTab==='log' && (repairLog.length===0 ? <Center>Ремонтів немає</Center> :
        repairLog.map(r => <div key={r.id} style={{background:G.card,border:`1px solid ${G.b1}`,borderLeft:'3px solid #fb923c',borderRadius:12,padding:12,marginBottom:10}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
            <div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:700}}>{r.serial}</div>
              <div style={{fontSize:12,color:G.t2}}>{r.typeName}</div>
            </div>
            <span style={{fontSize:11,color:G.t2}}>{r.datetime}</span>
          </div>
          {r.note && <div style={{fontSize:12,color:'#fb923c',marginBottom:5}}>📝 {r.note}</div>}
          <div style={{fontSize:12,color:G.t2,marginBottom:8}}>Ремонтував: {r.repairWorker}</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:8}}>
            {(r.materials||[]).filter(m=>m.selected&&m.qty>0).map((m,i)=><span key={i} style={{background:G.b1,border:`1px solid ${G.b2}`,borderRadius:6,padding:'2px 8px',fontSize:11,color:G.t2}}>{m.matName} ×{m.qty}</span>)}
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            <button onClick={()=>returnAll(r)} style={{padding:'7px 12px',background:'#052e16',color:G.gn,border:`1px solid #166534`,borderRadius:8,fontSize:12,cursor:'pointer',fontFamily:"'Fira Code',monospace",fontWeight:600}}>↩ Повернути матеріали</button>
            <button onClick={()=>deleteRep(r)} style={{padding:'7px 12px',background:'#450a0a',color:G.rd,border:`1px solid #7f1d1d`,borderRadius:8,fontSize:12,cursor:'pointer',fontFamily:"'Fira Code',monospace",fontWeight:600}}>✕ Видалити</button>
          </div>
        </div>)
      )}
    </>)
  }

  // ── Workers ───────────────────────────────────────────────
  const PageWorkers = () => {
    const [newName, setNewName] = useState('')
    const prodCounts = log.filter(l=>l.kind==='production').reduce((acc,l)=>({...acc,[l.workerName]:(acc[l.workerName]||0)+l.count}),{})
    const repCounts  = repairLog.reduce((acc,r)=>({...acc,[r.repairWorker]:(acc[r.repairWorker]||0)+1}),{})

    const renameWorker = (w) => {
      const n = prompt("Нове ім'я:", w.name)
      if (!n || n.trim()===w.name) return
      api('saveWorker',[{id:w.id,name:n.trim()}]).then(()=>{
        setWorkers(prev=>prev.map(wx=>wx.id!==w.id?wx:{...wx,name:n.trim()}))
        showToast('✓ Збережено')
      }).catch(()=>{})
    }

    const addWorker = () => {
      if (!newName.trim()) return showToast("Введіть ім'я",'err')
      const id = 'w'+uid()
      api('saveWorker',[{id,name:newName.trim()}]).then(()=>{
        setWorkers(prev=>[...prev,{id,name:newName.trim()}])
        setNewName('')
        showToast('✓ Додано ' + newName.trim())
      }).catch(()=>{})
    }

    const deleteWorker = (w) => openConfirm('Видалити працівника?',
      <b style={{color:G.rd}}>{w.name}</b>,
      ()=>{
        closeModal()
        api('deleteWorker',[w.id]).then(()=>{
          setWorkers(prev=>prev.filter(wx=>wx.id!==w.id))
          showToast('✓ Видалено ' + w.name)
        }).catch(()=>{})
      })

    return wrap(<>
      {workers.map(w => {
        const wp = prepItems.filter(p=>p.workerId===w.id&&p.status!=='returned')
        return <div key={w.id} style={{background:G.card,border:`1px solid ${G.b1}`,borderRadius:12,padding:14,marginBottom:10}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:44,height:44,background:G.b1,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>👷</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:17,fontWeight:700}}>{w.name}</div>
              <div style={{fontSize:12,color:G.t2,marginTop:2}}>🔋 {prodCounts[w.name]||0} шт · 🔧 {repCounts[w.name]||0} рем.</div>
            </div>
            <div style={{display:'flex',gap:6}}>
              <button onClick={()=>renameWorker(w)} style={{background:G.b1,border:`1px solid ${G.b2}`,color:G.cy,padding:'6px 10px',borderRadius:8,fontSize:13,cursor:'pointer'}}>✎</button>
              <button onClick={()=>deleteWorker(w)} style={{background:'#450a0a',border:`1px solid #7f1d1d`,color:G.rd,padding:'6px 10px',borderRadius:8,fontSize:13,cursor:'pointer'}}>✕</button>
            </div>
          </div>
          {wp.length>0 && <div style={{background:'#1e1b4b',border:`1px solid #3730a3`,borderRadius:8,padding:'8px 10px',marginTop:10}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",color:G.pu,fontWeight:700,fontSize:13,marginBottom:5}}>📦 НА РУКАХ</div>
            {wp.map(p=><div key={p.id} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:`1px solid #2e2a6e`,fontSize:12}}>
              <span>{p.matName}</span>
              <span style={{color:G.pu}}>{+(p.qty-p.returnedQty).toFixed(4)} {p.unit}</span>
            </div>)}
          </div>}
        </div>
      })}
      <Card>
        <CardTitle color={G.gn}>+ ДОДАТИ ПРАЦІВНИКА</CardTitle>
        <div style={{display:'flex',gap:6}}>
          <input placeholder="Прізвище Ім'я" value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addWorker()}/>
          <button onClick={addWorker} style={{padding:'8px 16px',background:G.gn,color:'#000',border:'none',borderRadius:8,fontWeight:700,fontSize:13,cursor:'pointer',whiteSpace:'nowrap'}}>+ ДОДАТИ</button>
        </div>
      </Card>
    </>)
  }

  // ── Tools ─────────────────────────────────────────────────
  const PageTools = () => {
    const [nt, setNt] = useState({name:'',category:'tool',count:1,serial:'',notes:''})

    const changeTool = (id, field, delta) => {
      const t = tools.find(t=>t.id===id)
      if (!t) return
      const next = {...t, [field]: Math.max(0, t[field]+delta)}
      if (next.working > next.count) next.working = next.count
      api('saveTool',[next]).then(()=>setTools(prev=>prev.map(tx=>tx.id!==id?tx:next))).catch(()=>{})
    }

    const deleteTool = (t) => openConfirm('Видалити інструмент?',<b style={{color:G.rd}}>{t.name}</b>,()=>{
      closeModal()
      api('deleteTool',[t.id]).then(()=>{setTools(p=>p.filter(tx=>tx.id!==t.id));showToast('✓ Видалено')}).catch(()=>{})
    })

    const addTool = () => {
      if (!nt.name.trim()) return showToast('Введіть назву','err')
      const t = {id:'t'+uid(),...nt,working:nt.count}
      api('saveTool',[t]).then(()=>{setTools(p=>[...p,t]);setNt({name:'',category:'tool',count:1,serial:'',notes:''});showToast('✓ Додано '+nt.name)}).catch(()=>{})
    }

    return wrap(<>
      {tools.map(t => {
        const broken = t.count - t.working
        return <div key={t.id} style={{background:G.card,border:`1px solid ${G.b1}`,borderLeft:`3px solid ${broken>0?G.rd:G.gn}`,borderRadius:12,padding:14,marginBottom:10}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:700}}>{t.name}</div>
              <div style={{fontSize:12,color:G.t2,marginTop:2}}>{t.category==='equipment'?'⚙ ОБЛАДНАННЯ':'🛠 ІНСТРУМЕНТ'}{t.serial&&' · '+t.serial}</div>
              {broken>0 && <div style={{color:G.rd,fontSize:12,marginTop:4}}>⚠ {broken} шт. несправних</div>}
              {t.notes && <div style={{color:G.t2,fontSize:12,marginTop:3}}>📝 {t.notes}</div>}
            </div>
            <button onClick={()=>deleteTool(t)} style={{background:'#450a0a',border:'none',color:G.rd,padding:'5px 9px',borderRadius:8,cursor:'pointer',flexShrink:0}}>✕</button>
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center',marginTop:10,flexWrap:'wrap'}}>
            <span style={{fontSize:13,color:G.t2}}>Всього:</span>
            <QtyBtn onClick={()=>changeTool(t.id,'count',-1)}>−</QtyBtn>
            <b style={{minWidth:24,textAlign:'center'}}>{t.count}</b>
            <QtyBtn onClick={()=>changeTool(t.id,'count',1)}>+</QtyBtn>
            <span style={{fontSize:13,color:G.t2}}>Робочих:</span>
            <QtyBtn onClick={()=>changeTool(t.id,'working',-1)}>−</QtyBtn>
            <b style={{color:G.gn,minWidth:24,textAlign:'center'}}>{t.working}</b>
            <QtyBtn onClick={()=>changeTool(t.id,'working',1)}>+</QtyBtn>
          </div>
        </div>
      })}
      <Card>
        <CardTitle color={G.gn}>+ ДОДАТИ ІНСТРУМЕНТ</CardTitle>
        <input placeholder="Назва" value={nt.name} onChange={e=>setNt(v=>({...v,name:e.target.value}))} style={{marginBottom:6}}/>
        <select value={nt.category} onChange={e=>setNt(v=>({...v,category:e.target.value}))} style={{marginBottom:6}}>
          <option value="tool">🛠 Інструмент</option>
          <option value="equipment">⚙ Обладнання</option>
        </select>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:6}}>
          <input type="number" placeholder="Кількість" value={nt.count} min="1" onChange={e=>setNt(v=>({...v,count:parseInt(e.target.value)||1}))}/>
          <input placeholder="С/н (необов.)" value={nt.serial} onChange={e=>setNt(v=>({...v,serial:e.target.value}))}/>
        </div>
        <input placeholder="Нотатка" value={nt.notes} onChange={e=>setNt(v=>({...v,notes:e.target.value}))} style={{marginBottom:4}}/>
        <SubmitBtn onClick={addTool} color={G.gn}>+ ДОДАТИ</SubmitBtn>
      </Card>
    </>)
  }

  // ── Log ───────────────────────────────────────────────────
  const PageLog = () => wrap(
    log.length===0 ? <Center>Журнал порожній</Center> :
    log.slice(0,120).map(e => {
      const t     = batteryTypes.find(t=>t.id===e.typeId)
      const color = e.kind==='prep'?G.pu : e.kind==='repair'?'#fb923c' : (t?.color||G.or)
      const icon  = e.kind==='prep'?'📦' : e.kind==='repair'?'🔧' : '🔋'
      return <div key={e.id} style={{background:G.card,border:`1px solid ${G.b1}`,borderRadius:12,padding:12,marginBottom:8,borderLeft:`3px solid ${color}`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:5}}>
          <div>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:700}}>{icon} {e.typeName}</span>
            {e.count>0 && <span style={{color:G.or,fontSize:13,marginLeft:6}}>× {e.count}</span>}
            <div style={{fontSize:12,color:G.t2}}>{e.workerName}</div>
          </div>
          <span style={{fontSize:11,color:G.t2,flexShrink:0}}>{e.datetime}</span>
        </div>
        {e.serials?.length>0 && <div style={{fontSize:12,color:G.cy,marginBottom:5,wordBreak:'break-all'}}>{e.serials.join(', ')}</div>}
        {e.repairNote && <div style={{fontSize:12,color:'#fb923c',marginBottom:5}}>📝 {e.repairNote}</div>}
        <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
          {(e.consumed||[]).map((c,i)=><span key={i} style={{background:G.b1,border:`1px solid ${G.b2}`,borderRadius:6,padding:'2px 8px',fontSize:11,color:G.t2}}>{c.name} ×{c.amount}</span>)}
        </div>
      </div>
    })
  )

  // ── History modal ─────────────────────────────────────────
  const HistoryModal = ({mat,entries}) => <>
    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:700,marginBottom:14}}>📊 {mat.name}</div>
    {entries.length===0
      ? <Center>Операцій не знайдено</Center>
      : entries.map((e,i)=><div key={i} style={{padding:'8px 0',borderBottom:`1px solid ${G.b1}`,fontSize:12}}>
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
  const NAV = [['prod','⚙','ВИР.'],['stock','📦','СКЛАД'],['repair','🔧','РЕМОНТ'],['workers','👷','КОМАНДА'],['tools','🛠','ІНСТР.'],['log','📋','ЖУРНАЛ']]
  const PAGES = {prod:<PageProd/>,stock:<PageStock/>,repair:<PageRepair/>,workers:<PageWorkers/>,tools:<PageTools/>,log:<PageLog/>}

  return <>
    <style>{GLOBAL_CSS}</style>

    {/* HEADER */}
    <div style={{background:'linear-gradient(135deg,#0d1117,#111827)',borderBottom:`1px solid ${G.b1}`,padding:'10px 14px',position:'sticky',top:0,zIndex:100}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',maxWidth:700,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <Logo size={30}/>
          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:26,fontWeight:800,letterSpacing:2}}>ZmiyCell</span>
        </div>
        <SyncBadge state={sync}/>
      </div>
      <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap',maxWidth:700,margin:'8px auto 0'}}>
        {[
          ['🔋', log.filter(l=>l.kind==='production').length, G.t1, G.b1, G.b2],
          ['🔧', repairLog.length,                            G.t1, G.b1, G.b2],
          ['📦', activePrep.length, activePrep.length>0?G.pu:G.t2, activePrep.length>0?'#1e1b4b':G.b1, activePrep.length>0?'#3730a3':G.b2],
        ].map(([icon,val,vc,bg,bd],i)=>
          <span key={i} style={{background:bg,border:`1px solid ${bd}`,borderRadius:20,padding:'4px 12px',fontSize:12,color:G.t2}}>
            {icon} <b style={{color:vc}}>{val}</b>
          </span>)}
        <span style={{fontSize:11,color:G.b2,alignSelf:'center'}}>{new Date().toLocaleDateString('uk-UA',{weekday:'short',day:'numeric',month:'short'})}</span>
      </div>
    </div>

    {/* PAGE */}
    {PAGES[page]}
    <div style={{height:16}}/>

    {/* NAV */}
    <nav style={{position:'fixed',bottom:0,left:0,right:0,background:'#0d1117',borderTop:`1px solid ${G.b1}`,display:'flex',zIndex:200,paddingBottom:'env(safe-area-inset-bottom,0)'}}>
      {NAV.map(([k,icon,label])=>
        <button key={k} onClick={()=>setPage(k)} style={{flex:1,padding:'10px 4px 8px',display:'flex',flexDirection:'column',alignItems:'center',gap:2,background:'none',border:'none',cursor:'pointer',color:page===k?G.or:G.t2,transition:'.15s'}}>
          <span style={{fontSize:20}}>{icon}</span>
          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,letterSpacing:.5}}>{label}</span>
        </button>)}
    </nav>

    {/* TOAST */}
    {toast && <Toast {...toast}/>}

    {/* MODALS */}
    {modal?.type==='confirm'  && <ConfirmModal title={modal.title} body={modal.body} onYes={modal.onYes} onNo={closeModal}/>}
    {modal?.type==='history'  && <Modal onClose={closeModal}><HistoryModal mat={modal.mat} entries={modal.entries}/></Modal>}
  </>
}

// ─── Prep sub-component ───────────────────────────────────
function PrepTab({batteryTypes, workers, prepItems, prodTypeId, onIssue, onReturn}) {
  const [wId,     setWId]    = useState(workers[0]?.id||'')
  const [matId,   setMatId]  = useState('')
  const [qty,     setQty]    = useState(1)
  const [retVals, setRetVals]= useState({})
  const type   = batteryTypes.find(t=>t.id===prodTypeId) || batteryTypes[0]
  const active = prepItems.filter(p=>p.status!=='returned')

  return <>
    <Card>
      <CardTitle color={G.pu}>📦 ВИДАТИ МАТЕРІАЛ</CardTitle>
      <FormRow label="ПРАЦІВНИК">
        <select value={wId} onChange={e=>setWId(e.target.value)}>
          {workers.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </FormRow>
      <FormRow label="МАТЕРІАЛ">
        <select value={matId} onChange={e=>setMatId(e.target.value)}>
          <option value="">— оберіть матеріал —</option>
          {(type?.materials||[]).map(m=><option key={m.id} value={m.id}>{m.name} ({m.stock} {m.unit})</option>)}
        </select>
      </FormRow>
      <FormRow label="КІЛЬКІСТЬ">
        <input type="number" value={qty} onChange={e=>setQty(parseFloat(e.target.value)||1)} min="0.01" step="0.01"/>
      </FormRow>
      <SubmitBtn color={G.pu} onClick={()=>onIssue(wId,matId,qty,prodTypeId)}>📦 ВИДАТИ</SubmitBtn>
    </Card>

    <Card>
      <CardTitle color={G.pu}>📋 АКТИВНІ ВИДАЧІ ({active.length})</CardTitle>
      {active.length===0
        ? <div style={{color:G.t2,fontSize:13,padding:'6px 0'}}>Немає активних видач</div>
        : active.map(p => {
            const avail = +(p.qty - p.returnedQty).toFixed(4)
            return <div key={p.id} style={{background:G.card2,borderRadius:10,padding:12,marginBottom:8}}>
              <div style={{fontWeight:600,fontSize:14}}>{p.matName}</div>
              <div style={{fontSize:12,color:G.t2,marginTop:2}}>{p.workerName} · {p.date}</div>
              <div style={{fontSize:13,color:G.pu,margin:'4px 0 8px'}}>На руках: <b>{avail}</b> {p.unit}</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                <input type="number" placeholder="кількість" value={retVals[p.id]||''} onChange={e=>setRetVals(v=>({...v,[p.id]:e.target.value}))} style={{width:100}} min="0.01" step="0.01" max={avail}/>
                <button onClick={()=>onReturn(p.id,false,retVals[p.id])} style={{padding:'7px 10px',background:'#1e1b4b',color:G.pu,border:`1px solid #3730a3`,borderRadius:8,fontSize:12,cursor:'pointer',fontFamily:"'Fira Code',monospace",fontWeight:600}}>↩ Частково</button>
                <button onClick={()=>onReturn(p.id,true)} style={{padding:'7px 10px',background:'#052e16',color:G.gn,border:`1px solid #166534`,borderRadius:8,fontSize:12,cursor:'pointer',fontFamily:"'Fira Code',monospace",fontWeight:600}}>↩↩ Все</button>
              </div>
            </div>
          })}
    </Card>
  </>
}
