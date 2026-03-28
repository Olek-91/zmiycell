import React, { useState, useRef, useEffect } from 'react';
import { useStore } from './store.js';
import { gasCall } from './api.js';

const G = {
  bg: '#0a0f1a', card: '#111827', card2: '#0f172a',
  b1: '#1f2937', b2: '#374151', t1: '#e5e7eb', t2: '#6b7280',
  or: '#f97316', cy: '#06b6d4', gn: '#22c55e', pu: '#a78bfa',
  rd: '#f87171', yw: '#fbbf24',
}

const AdFreeRockPlayer = () => {
  const { radioStations, setRadioStations } = useStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStationIndex, setCurrentStationIndex] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const audioRef = useRef(null);

  const stations = radioStations.length > 0 ? radioStations : [
    { id: 'default', name: "Завантаження...", url: "" }
  ];

  const togglePlay = () => {
    if (!stations[currentStationIndex]?.url) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("Playback failed:", e));
    }
    setIsPlaying(!isPlaying);
  };

  const changeStation = (event) => {
    const newIndex = parseInt(event.target.value, 10);
    setCurrentStationIndex(newIndex);
    setIsPlaying(false);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [currentStationIndex, stations]);

  const addStation = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    setBusy(true);
    try {
      const res = await gasCall('saveRadioStation', [{ name: newName, url: newUrl }]);
      if (res.ok) {
        const newStation = { id: res.id, name: newName, url: newUrl };
        setRadioStations(prev => [...prev, newStation]);
        setNewName('');
        setNewUrl('');
        setShowAdd(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const deleteStation = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Видалити цю станцію?')) return;
    setBusy(true);
    try {
      const res = await gasCall('deleteRadioStation', [id]);
      if (res.ok) {
        setRadioStations(prev => prev.filter(s => s.id !== id));
        if (currentStationIndex >= radioStations.length - 1) setCurrentStationIndex(0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '20px 0' }}>
      <div style={{ 
        padding: '30px', 
        background: G.card, 
        color: G.t1, 
        borderRadius: '24px', 
        border: `1px solid ${G.b1}`, 
        width: '100%', 
        maxWidth: '400px', 
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background glow */}
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: isPlaying ? G.or : G.b1, filter: 'blur(60px)', opacity: 0.15, borderRadius: '50%', transition: 'background 0.5s' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, position: 'relative', zIndex: 1 }}>
          <h3 style={{ margin: 0, color: G.or, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '22px', fontWeight: 800, letterSpacing: '1px' }}>
            <span style={{ fontSize: '28px' }}>🤘</span> ROCK RADIO
          </h3>
          <button onClick={() => setShowAdd(!showAdd)} style={{ background: G.b1, border: `1px solid ${G.b2}`, color: G.t2, width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, transition: '.2s' }}>
            {showAdd ? '−' : '+'}
          </button>
        </div>

        {showAdd && (
          <div style={{ marginBottom: 25, background: G.card2, padding: 16, borderRadius: 16, border: `1px solid ${G.b1}`, animation: 'slideUp 0.3s ease' }}>
            <div style={{ fontSize: 11, color: G.t2, marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>НАЗВА СТАНЦІЇ</div>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Напр. Radio ROKS" style={{ width: '100%', marginBottom: 12, background: G.bg, border: `1px solid ${G.b2}`, color: G.t1, padding: '10px 14px', borderRadius: 10, outline: 'none' }} />
            <div style={{ fontSize: 11, color: G.t2, marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>URL ПОТОКУ (MP3/AAC)</div>
            <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://stream.url/path" style={{ width: '100%', marginBottom: 15, background: G.bg, border: `1px solid ${G.b2}`, color: G.t1, padding: '10px 14px', borderRadius: 10, outline: 'none' }} />
            <button onClick={addStation} disabled={busy} style={{ width: '100%', padding: '12px', background: G.gn, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, cursor: 'pointer', opacity: busy ? 0.5 : 1, transition: '.2s' }}>
              {busy ? 'ЗБЕРЕЖЕННЯ...' : 'ДОДАТИ СТАНЦІЮ'}
            </button>
          </div>
        )}
        
        <div style={{ position: 'relative', marginBottom: 25 }}>
          <div style={{ fontSize: 11, color: G.t2, marginBottom: 8, fontWeight: 700, letterSpacing: 0.5, marginLeft: 4 }}>ОБЕРІТЬ ХВИЛЮ</div>
          <select 
            value={currentStationIndex} 
            onChange={changeStation}
            style={{ width: '100%', padding: '14px 40px 14px 16px', background: G.card2, color: G.t1, border: `1px solid ${G.b2}`, borderRadius: '14px', fontSize: '15px', fontWeight: 600, outline: 'none', appearance: 'none', cursor: 'pointer' }}
          >
            {stations.map((station, index) => (
              <option key={station.id} value={index}>{station.name}</option>
            ))}
          </select>
          <div style={{ position: 'absolute', right: 45, top: 38, pointerEvents: 'none', color: G.t2 }}>▼</div>
          {radioStations.length > 0 && (
            <button 
              onClick={(e) => deleteStation(radioStations[currentStationIndex].id, e)}
              style={{ position: 'absolute', right: 14, top: 35, background: 'transparent', border: 'none', color: G.rd, cursor: 'pointer', fontSize: 18, opacity: 0.6 }}
              title="Видалити станцію"
            >
              ✕
            </button>
          )}
        </div>

        <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 25, opacity: isPlaying ? 1 : 0.2, transition: 'opacity 0.5s' }}>
          {[0.6, 1, 0.4, 0.8, 0.5, 0.9, 0.3].map((h, i) => (
            <div key={i} style={{ 
              width: 4, 
              height: isPlaying ? `${h * 100}%` : '10%', 
              background: G.or, 
              borderRadius: 2,
              animation: isPlaying ? `pulse ${0.5 + Math.random()}s infinite ease-in-out` : 'none'
            }} />
          ))}
        </div>

        <audio ref={audioRef} src={stations[currentStationIndex]?.url} preload="none" />
        
        <button 
          onClick={togglePlay} 
          disabled={!stations[currentStationIndex]?.url}
          style={{ 
            width: '100%', 
            padding: '16px', 
            fontSize: '17px', 
            cursor: 'pointer', 
            background: isPlaying ? G.b1 : G.or, 
            color: isPlaying ? G.t2 : 'white', 
            border: isPlaying ? `1px solid ${G.b2}` : 'none', 
            borderRadius: '16px', 
            fontWeight: 800, 
            fontFamily: "'Barlow Condensed', sans-serif", 
            letterSpacing: '1px', 
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transform: isPlaying ? 'scale(0.98)' : 'scale(1)',
            boxShadow: isPlaying ? 'none' : `0 8px 24px ${G.or}44`,
            opacity: !stations[currentStationIndex]?.url ? 0.5 : 1
          }}
        >
          {isPlaying ? '⏸ ПАУЗА' : '▶️ СЛУХАТИ ЗАРАЗ'}
        </button>

        {isPlaying && (
          <div style={{ textAlign: 'center', marginTop: 15, fontSize: 12, color: G.gn, fontWeight: 700, animation: 'pulse 2s infinite' }}>
            🔊 В ЕФІРІ: {stations[currentStationIndex]?.name.toUpperCase()}
          </div>
        )}
      </div>
      
      <div style={{ marginTop: 30, color: G.t2, fontSize: 12, textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
        Музика допомагає працювати швидше! <br/>Додавайте улюблені Rock/Metal стріми.
      </div>
    </div>
  );
};

export default AdFreeRockPlayer;
