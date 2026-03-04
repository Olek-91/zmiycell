import { useState, useEffect, useCallback, useRef } from "react";

// --- КОНФІГУРАЦІЯ ТА ПОЧАТКОВІ ДАНІ ---
const makeMaterials = (prefix) => [
  { id:`${prefix}_1`, name:"Комірки акумулятора", unit:"шт", perBattery:48, stock:500, minStock:100, photo:null },
  { id:`${prefix}_2`, name:"BMS плата", unit:"шт", perBattery:1, stock:20, minStock:5, photo:null },
  { id:`${prefix}_3`, name:"Нікелева стрічка", unit:"м", perBattery:2.5, stock:80, minStock:15, photo:null },
  { id:`${prefix}_4`, name:"Корпус (кейс)", unit:"шт", perBattery:1, stock:15, minStock:3, photo:null },
  { id:`${prefix}_5`, name:"Роз'єм XT90", unit:"шт", perBattery:2, stock:60, minStock:10, photo:null },
  { id:`${prefix}_6`, name:"Термоусадка", unit:"м", perBattery:0.5, stock:40, minStock:5, photo:null },
  { id:`${prefix}_7`, name:"Ізоляційна стрічка", unit:"м", perBattery:1.5, stock:120, minStock:20, photo:null },
  { id:`${prefix}_8`, name:"Балансувальні дроти", unit:"шт", perBattery:1, stock:18, minStock:4, photo:null },
  { id:`${prefix}_9`, name:"Провід силовий 10AWG червоний", unit:"м", perBattery:0.4, stock:25, minStock:5, photo:null },
  { id:`${prefix}_10`, name:"Провід силовий 10AWG чорний", unit:"м", perBattery:0.4, stock:25, minStock:5, photo:null },
];

const INIT_BATTERY_TYPES = [
  { id:"typeA", name:"16S3P 230Ah SK Innovation", color:"#4ade80", materials:makeMaterials("A") },
  { id:"typeB", name:"15S1P 150Ah CATL", color:"#06b6d4", materials:makeMaterials("B") },
];
const INIT_WORKERS = [{ id:"w1", name:"Іваненко О." },{ id:"w2", name:"Петренко В." }];
const INIT_TOOLS = [{ id:"t1", name:"Зварювальний апарат", category:"equipment", count:2, working:2, serial:"SW-001", photo:null, notes:"" }];

const SK = "zmiy-v8-cloud";
const todayStr = () => new Date().toLocaleDateString("uk-UA",{day:"2-digit",month:"2-digit",year:"numeric"});
const nowStr = () => new Date().toLocaleString("uk-UA",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});

// --- НОВИЙ КОМПОНЕНТ ЛОГОТИПУ (З ВАШОГО ФОТО) ---
function ZmiyLogo({ size = 60 }) {
  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <img 
        src="https://i.ibb.co/LzNf9F5/zmiy-logo.jpg" // Замініть на пряме посилання на ваше фото або покладіть в папку public
        alt="ZmiyCell Logo"
        style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover', border: '2px solid #4ade80' }}
        onError={(e) => {
            // Фолбек якщо картинка не вантажиться
            e.target.src = "https://cdn-icons-png.flaticon.com/512/2991/2991442.png";
        }}
      />
    </div>
  );
}

// --- УТИЛІТИ ДЛЯ ХМАРИ ---
const syncToFirebase = async (url, data) => {
    if (!url || !url.startsWith('http')) return;
    try {
        const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        await fetch(`${cleanUrl}/data.json`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    } catch (e) { console.error("Cloud Sync Error", e); }
};

// --- ОСНОВНИЙ ДОДАТОК ---
export default function App() {
  // Завантаження початкових даних
  const [isLoaded, setIsLoaded] = useState(false);
  const [cloudUrl, setCloudUrl] = useState(localStorage.getItem("zmiy_cloud_url") || "");
  const [batteryTypes, setBatteryTypes] = useState(INIT_BATTERY_TYPES);
  const [workers, setWorkers] = useState(INIT_WORKERS);
  const [tools, setTools] = useState(INIT_TOOLS);
  const [log, setLog] = useState([]);
  const [repairLog, setRepairLog] = useState([]);
  const [prepItems, setPrepItems] = useState([]);

  const [mainTab, setMainTab] = useState("production");
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const showToast = useCallback((msg, type="success") => setToast({msg, type}), []);

  // 1. Завантаження даних при старті
  useEffect(() => {
    const local = localStorage.getItem(SK);
    if (local) {
        const d = JSON.parse(local);
        setBatteryTypes(d.batteryTypes);
        setWorkers(d.workers);
        setTools(d.tools);
        setLog(d.log || []);
        setRepairLog(d.repairLog || []);
        setPrepItems(d.prepItems || []);
    }
    
    // Якщо є хмара - тягнемо звідти
    if (cloudUrl) {
        const fetchCloud = async () => {
            try {
                const res = await fetch(`${cloudUrl.replace(/\/$/, '')}/data.json`);
                const d = await res.json();
                if (d) {
                    setBatteryTypes(d.batteryTypes);
                    setWorkers(d.workers);
                    setTools(d.tools);
                    setLog(d.log || []);
                    setRepairLog(d.repairLog || []);
                    setPrepItems(d.prepItems || []);
                    showToast("☁️ Синхронізовано з хмарою");
                }
            } catch(e) {}
            setIsLoaded(true);
        };
        fetchCloud();
    } else {
        setIsLoaded(true);
    }
  }, [cloudUrl, showToast]);

  // 2. Автозбереження (Локальне + Хмарне)
  useEffect(() => {
    if (!isLoaded) return;
    const data = { batteryTypes, workers, tools, log, repairLog, prepItems };
    localStorage.setItem(SK, JSON.stringify(data));
    
    // Дебаунс для хмари (щоб не спамити запитами)
    const t = setTimeout(() => {
        syncToFirebase(cloudUrl, data);
    }, 2000);
    return () => clearTimeout(t);
  }, [batteryTypes, workers, tools, log, repairLog, prepItems, cloudUrl, isLoaded]);

  // --- ФУНКЦІЯ ЕКСПОРТУ (Виправлена) ---
  const exportJSON = () => {
    const data = { batteryTypes, workers, tools, log, repairLog, prepItems };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ZmiyCell_Backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
    showToast("💾 Файл збережено у 'Завантаження'");
  };

  const handleCloudSetup = () => {
    localStorage.setItem("zmiy_cloud_url", cloudUrl);
    setShowDriveModal(false);
    showToast("☁️ Налаштування хмари збережено");
    window.location.reload(); // Перезавантаження для ініціалізації синхронізації
  };

  return (
    <div style={{fontFamily:"'Fira Code',monospace", background:"#0a0f1a", minHeight:"100vh", color:"#f9fafb", paddingBottom: 80}}>
      {/* HEADER */}
      <header style={{background:"#060b14", borderBottom:"2px solid #1f2937", padding:"16px"}}>
        <div style={{display:"flex", alignItems:"center", gap:16}}>
          <ZmiyLogo size={64} />
          <div>
            <h1 style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, margin:0, color:"#4ade80"}}>ZMIY CELL</h1>
            <p style={{fontSize:10, color:"#6b7280", margin:0, letterSpacing:2}}>PROFESSIONAL BATTERY HUB</p>
          </div>
          <div style={{marginLeft:"auto", textAlign:"right"}}>
             <div style={{fontSize:20, fontWeight:800, color:"#4ade80"}}>{log.length}</div>
             <div style={{fontSize:9, color:"#4b5563"}}>ЗБІРОК</div>
          </div>
        </div>

        <div style={{display:"flex", gap:8, marginTop:16}}>
          <button onClick={exportJSON} style={btnStyle("#166534", "#bbf7d0")}>💾 Зберегти файл</button>
          <button onClick={() => setShowDriveModal(true)} style={btnStyle("#1e1b4b", "#a5b4fc")}>
            {cloudUrl ? "✅ Хмара активна" : "☁️ Налаштувати хмару"}
          </button>
        </div>
      </header>

      {/* MODAL: DRIVE / CLOUD */}
      {showDriveModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3>☁️ НАЛАШТУВАННЯ ХМАРИ</h3>
            <p style={{fontSize:12, color:"#9ca3af"}}>Вставте URL вашої Firebase бази для синхронізації між пристроями.</p>
            <input 
                placeholder="https://your-db.firebaseio.com/" 
                value={cloudUrl}
                onChange={e => setCloudUrl(e.target.value)}
                style={inputStyle}
            />
            <div style={{display:"flex", gap:10, marginTop:20}}>
                <button onClick={handleCloudSetup} style={btnStyle("#4ade80", "#064e3b", true)}>ЗБЕРЕГТИ</button>
                <button onClick={() => setShowDriveModal(false)} style={btnStyle("#374151", "#f9fafb", true)}>ЗАКРИТИ</button>
            </div>
          </div>
        </div>
      )}

      {/* Тут решта вашого коду (Production, Stock, Repair tabs)... */}
      <div style={{padding: 20, textAlign: 'center', color: '#4b5563'}}>
        <p>Керування складом та виробництвом активне.</p>
        <p style={{fontSize: 12}}>Всі зміни автоматично зберігаються в {cloudUrl ? "хмару" : "пам'ять браузера"}.</p>
      </div>

      {/* TOAST & CONFIRM */}
      {toast && <div style={toastStyle}>{toast.msg}</div>}

      {/* BOTTOM NAV */}
      <nav style={navStyle}>
        {['production', 'stock', 'repair', 'workers', 'log'].map(tab => (
            <button 
                key={tab} 
                onClick={() => setMainTab(tab)}
                style={{...navItemStyle, color: mainTab === tab ? "#4ade80" : "#4b5563"}}
            >
                {tab.slice(0,3).toUpperCase()}
            </button>
        ))}
      </nav>
    </div>
  );
}

// --- СТИЛІ ---
const btnStyle = (bg, col, flex=false) => ({
    flex: flex ? 1 : "unset",
    background: bg,
    color: col,
    border: "none",
    borderRadius: "10px",
    padding: "12px 16px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "12px"
});

const inputStyle = {
    width: "100%",
    background: "#0a0f1a",
    border: "1px solid #374151",
    color: "white",
    padding: "12px",
    borderRadius: "8px",
    marginTop: "10px"
};

const modalOverlay = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", 
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
};

const modalContent = {
    background: "#111827", padding: "24px", borderRadius: "16px", width: "90%", maxWidth: "400px",
    border: "1px solid #374151"
};

const toastStyle = {
    position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
    background: "#064e3b", color: "#4ade80", padding: "12px 24px", borderRadius: "20px",
    zIndex: 2000, boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
};

const navStyle = {
    position: "fixed", bottom: 0, left: 0, right: 0, height: 70,
    background: "#060b14", borderTop: "1px solid #1f2937",
    display: "flex", justifyContent: "space-around", alignItems: "center", paddingBottom: "env(safe-area-inset-bottom)"
};

const navItemStyle = {
    background: "none", border: "none", fontWeight: "800", fontSize: "12px", cursor: "pointer"
};
