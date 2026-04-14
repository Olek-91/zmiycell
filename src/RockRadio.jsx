import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from './store.js';
import { gasCall } from './api.js';

const G = {
  bg: '#0a0f1a', card: '#111827', card2: '#0f172a',
  b1: '#1f2937', b2: '#374151', t1: '#e5e7eb', t2: '#6b7280',
  or: '#f97316', cy: '#06b6d4', gn: '#22c55e', pu: '#a78bfa',
  rd: '#f87171', yw: '#fbbf24',
}

// Radio Paradise main channel now-playing API (CORS-friendly)
const RP_NOW_PLAYING_URL = 'https://api.radioparadise.com/api/now_playing?chan=0'
const RP_STATION_ID = 'r1' // id Radio Paradise (Rock) in our station list

const AdFreeRockPlayer = () => {
  const { radioStations, setRadioStations, playback, setPlayback } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [nowPlaying, setNowPlaying] = useState(null);
  const npTimerRef = useRef(null);

  const stations = radioStations.length > 0 ? radioStations : [
    { id: 'default', name: "Завантаження...", url: "" }
  ];

  const currentStationIndex = playback.stationIndex ?? 0;
  const isPlaying = playback.isPlaying;
  const currentStation = stations[currentStationIndex];

  // ── Audio element: sync volume via global ref ────────────
  const applyVolume = useCallback((v) => {
    const audio = window.__zcAudio;
    if (audio) audio.volume = v;
  }, []);

  useEffect(() => { applyVolume(volume); }, [volume, applyVolume]);
  // Re-apply when playback starts (audio element may have been recreated)
  useEffect(() => { if (playback.isPlaying) applyVolume(volume); }, [playback.isPlaying]);

  // ── Now-playing RSS/JSON for Radio Paradise ────────────────
  const fetchNowPlaying = useCallback(async () => {
    // Only fetch if current station looks like Radio Paradise Rock
    if (!currentStation) return;
    const isRP = currentStation.url?.includes('radioparadise.com') ||
                 currentStation.id === RP_STATION_ID;
    if (!isRP) { setNowPlaying(null); return; }
    try {
      const res = await fetch(RP_NOW_PLAYING_URL);
      const data = await res.json();
      if (data?.artist && data?.title) {
        setNowPlaying({ artist: data.artist, title: data.title, cover: data.cover || null });
      }
    } catch { setNowPlaying(null); }
  }, [currentStation]);

  useEffect(() => {
    fetchNowPlaying();
    clearInterval(npTimerRef.current);
    npTimerRef.current = setInterval(fetchNowPlaying, 30000);
    return () => clearInterval(npTimerRef.current);
  }, [fetchNowPlaying, isPlaying]);

  // ── Playback controls ──────────────────────────────────────
  const togglePlay = () => {
    if (!currentStation?.url) return;
    setPlayback({ isPlaying: !isPlaying });
  };

  const prevStation = () => {
    const ni = (currentStationIndex - 1 + stations.length) % stations.length;
    // Keep playing if already playing
    setPlayback({ stationIndex: ni, isPlaying: isPlaying });
  };

  const nextStation = () => {
    const ni = (currentStationIndex + 1) % stations.length;
    setPlayback({ stationIndex: ni, isPlaying: isPlaying });
  };

  const changeStation = (event) => {
    const ni = parseInt(event.target.value, 10);
    setPlayback({ stationIndex: ni, isPlaying: isPlaying });
  };

  // ── Station management ─────────────────────────────────────
  const addStation = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    setBusy(true);
    try {
      const res = await gasCall('saveRadioStation', [{ name: newName, url: newUrl }]);
      if (res.ok) {
        setRadioStations(prev => [...prev, { id: res.id, name: newName, url: newUrl }]);
        setNewName(''); setNewUrl(''); setShowAdd(false);
      }
    } catch (e) { console.error(e); } finally { setBusy(false); }
  };

  const deleteStation = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Видалити цю станцію?')) return;
    setBusy(true);
    try {
      const res = await gasCall('deleteRadioStation', [id]);
      if (res.ok) {
        setRadioStations(prev => prev.filter(s => s.id !== id));
        if (currentStationIndex >= radioStations.length - 1) setPlayback({ stationIndex: 0 });
      }
    } catch (e) { console.error(e); } finally { setBusy(false); }
  };

  // ── Waveform bars ──────────────────────────────────────────
  const bars = [0.6, 1, 0.4, 0.8, 0.5, 0.9, 0.3, 0.7, 0.45];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '20px 0' }}>
      <div style={{
        padding: '28px 24px',
        background: G.card,
        color: G.t1,
        borderRadius: '24px',
        border: `1px solid ${G.b1}`,
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative glow */}
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: isPlaying ? G.or : G.b1, filter: 'blur(60px)', opacity: 0.15, borderRadius: '50%', transition: 'background 0.5s' }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, position: 'relative', zIndex: 1 }}>
          <h3 style={{ margin: 0, color: G.or, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px', fontWeight: 800, letterSpacing: '1px' }}>
            <span style={{ fontSize: '26px' }}>🤘</span> ROCK RADIO
          </h3>
          <button onClick={() => setShowAdd(!showAdd)} style={{ background: G.b1, border: `1px solid ${G.b2}`, color: G.t2, width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            {showAdd ? '−' : '+'}
          </button>
        </div>

        {/* Add station form */}
        {showAdd && (
          <div style={{ marginBottom: 20, background: G.card2, padding: 16, borderRadius: 16, border: `1px solid ${G.b1}`, animation: 'slideUp 0.3s ease' }}>
            <div style={{ fontSize: 11, color: G.t2, marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>НАЗВА СТАНЦІЇ</div>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Напр. Radio ROKS" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 11, color: G.t2, marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>URL ПОТОКУ (MP3/AAC)</div>
            <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://stream.url/path" style={{ marginBottom: 15 }} />
            <button onClick={addStation} disabled={busy} style={{ width: '100%', padding: '12px', background: G.gn, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, cursor: 'pointer', opacity: busy ? 0.5 : 1 }}>
              {busy ? 'ЗБЕРЕЖЕННЯ...' : 'ДОДАТИ СТАНЦІЮ'}
            </button>
          </div>
        )}

        {/* Station selector row */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: G.t2, marginBottom: 8, fontWeight: 700, letterSpacing: 0.5 }}>ОБЕРІТЬ ХВИЛЮ</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Prev */}
            <button onClick={prevStation} style={{ flex: '0 0 40px', height: 44, background: G.card2, border: `1px solid ${G.b2}`, color: G.t1, borderRadius: 12, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '.15s' }}>◀</button>
            {/* Select */}
            <div style={{ flex: 1, position: 'relative' }}>
              <select value={currentStationIndex} onChange={changeStation}
                style={{ width: '100%', padding: '12px 14px', background: G.card2, color: G.t1, border: `1px solid ${G.b2}`, borderRadius: 12, fontSize: 14, fontWeight: 600, outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                {stations.map((s, i) => (
                  <option key={s.id} value={i}>{s.name}</option>
                ))}
              </select>
              <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: G.t2, fontSize: 12 }}>▼</div>
            </div>
            {/* Next */}
            <button onClick={nextStation} style={{ flex: '0 0 40px', height: 44, background: G.card2, border: `1px solid ${G.b2}`, color: G.t1, borderRadius: 12, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '.15s' }}>▶</button>
            {/* Delete */}
            {radioStations.length > 0 && (
              <button onClick={(e) => deleteStation(radioStations[currentStationIndex]?.id, e)}
                style={{ flex: '0 0 32px', height: 44, background: 'transparent', border: 'none', color: G.rd, cursor: 'pointer', fontSize: 18, opacity: 0.6, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Видалити">✕</button>
            )}
          </div>
        </div>

        {/* Volume slider */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>{volume === 0 ? '🔇' : volume < 0.4 ? '🔈' : volume < 0.75 ? '🔉' : '🔊'}</span>
            <input
              type="range" min="0" max="1" step="0.01"
              value={volume}
              onChange={e => setVolume(parseFloat(e.target.value))}
              style={{
                flex: 1, height: 4, appearance: 'none', background: `linear-gradient(to right, ${G.or} ${volume * 100}%, ${G.b2} ${volume * 100}%)`,
                borderRadius: 2, outline: 'none', cursor: 'pointer', border: 'none', padding: 0, width: 'auto'
              }}
            />
            <span style={{ color: G.t2, fontSize: 12, fontFamily: 'monospace', width: 36, textAlign: 'right' }}>{Math.round(volume * 100)}%</span>
          </div>
        </div>

        {/* Waveform */}
        <div style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginBottom: 20, opacity: isPlaying ? 1 : 0.15, transition: 'opacity 0.5s' }}>
          {bars.map((h, i) => (
            <div key={i} style={{
              width: 4, height: `${h * 100}%`, background: G.or, borderRadius: 2,
              animation: isPlaying ? `pulse ${0.5 + i * 0.1}s infinite ease-in-out` : 'none'
            }} />
          ))}
        </div>

        {/* Play button */}
        <button
          onClick={togglePlay}
          disabled={!currentStation?.url}
          style={{
            width: '100%', padding: '16px', fontSize: '17px', cursor: 'pointer',
            background: isPlaying ? G.b1 : G.or,
            color: isPlaying ? G.t2 : 'white',
            border: isPlaying ? `1px solid ${G.b2}` : 'none',
            borderRadius: '16px', fontWeight: 800,
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: '1px', transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transform: isPlaying ? 'scale(0.98)' : 'scale(1)',
            boxShadow: isPlaying ? 'none' : `0 8px 24px ${G.or}44`,
            opacity: !currentStation?.url ? 0.5 : 1
          }}
        >
          {isPlaying ? '⏸ ПАУЗА' : '▶️ СЛУХАТИ ЗАРАЗ'}
        </button>

        {/* On-air label */}
        {isPlaying && (
          <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: G.gn, fontWeight: 700, animation: 'pulse 2s infinite' }}>
            🔊 В ЕФІРІ: {currentStation?.name?.toUpperCase()}
          </div>
        )}

        {/* Now-playing RSS widget (Radio Paradise only) */}
        {nowPlaying && (
          <div style={{ marginTop: 16, background: G.card2, borderRadius: 14, padding: '12px 14px', border: `1px solid ${G.b1}`, display: 'flex', alignItems: 'center', gap: 12, animation: 'slideUp 0.4s ease' }}>
            {nowPlaying.cover && (
              <img src={nowPlaying.cover} alt="cover" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: `1px solid ${G.b2}` }} />
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, color: G.cy, fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>ЗАРАЗ ГРАЄ</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: G.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nowPlaying.title}</div>
              <div style={{ fontSize: 11, color: G.t2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nowPlaying.artist}</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 24, color: G.t2, fontSize: 12, textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
        Музика допомагає працювати швидше! <br/>Додавайте улюблені Rock/Metal стріми.
      </div>
    </div>
  );
};

export default AdFreeRockPlayer;
