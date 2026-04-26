import React, { useState, useEffect, useCallback } from 'react'
import { ref, update, increment } from 'firebase/database'
import { db } from './lib/firebase'
import { useAuth } from './hooks/useAuth'
import { useEvents } from './hooks/useEvents'
import { usePresence } from './hooks/usePresence'   // ← presença real
import { SEED_LOCATIONS, EVENT_META } from './lib/constants'
import { calcScore, getHeatLevel } from './lib/mapUtils'
import LoginScreen from './components/LoginScreen'
import MapView from './components/MapView'
import ReportPanel from './components/ReportPanel'
import DetailPanel from './components/DetailPanel'
import Leaderboard from './components/Leaderboard'

// Limite anti-spam local (espelho do server-side — UI apenas)
const SPAM_WINDOW_MS  = 60_000
const SPAM_MAX        = 3

export default function App() {
  const { user, loading, login, logout } = useAuth()
  const { events, addEvent }             = useEvents()
  const onlineCount                      = usePresence(user?.uid) // ← presença real

  const [userPos,        setUserPos]        = useState(null)
  const [reportOpen,     setReportOpen]     = useState(false)
  const [detailLocation, setDetailLocation] = useState(null)
  const [leaderOpen,     setLeaderOpen]     = useState(false)
  const [toast,          setToast]          = useState(null)
  const [pointsAlert,    setPointsAlert]    = useState(null)
  const [spamCounter,    setSpamCounter]    = useState({})
  const [activeFilter,   setActiveFilter]   = useState('all')

  // Geolocalização — sem filtro de raio arbitrário
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        setUserPos({ lat, lng })
      },
      () => {} // silencia erros (permissão negada etc.)
    )
  }, [])

  const showToast = useCallback((msg, bg = 'var(--green)', color = '#0a0a0f') => {
    setToast({ msg, bg, color })
    setTimeout(() => setToast(null), 2800)
  }, [])

  const handleConfirmReport = useCallback(async (type) => {
    if (!user) return

    // Anti-spam local (feedback imediato ao usuário)
    const now  = Date.now()
    const prev = (spamCounter[type] || []).filter(t => now - t < SPAM_WINDOW_MS)
    if (prev.length >= SPAM_MAX) {
      showToast('⚠️ Aguarde um pouco para reportar novamente', '#ffcc00', '#000')
      return
    }
    setSpamCounter(s => ({ ...s, [type]: [...prev, now] }))

    // Local mais próximo ao usuário
    const base = userPos || { lat: -22.3148, lng: -49.0631 }
    let closest = SEED_LOCATIONS[0], minDist = Infinity
    SEED_LOCATIONS.forEach(loc => {
      const d = Math.hypot(loc.lat - base.lat, loc.lng - base.lng)
      if (d < minDist) { minDist = d; closest = loc }
    })

    try {
      await addEvent(closest.id, type, user.uid, user.name)

      // Atualiza score e contagem de reports do usuário
      const pts = (EVENT_META[type]?.weight || 1) * 10
      await update(ref(db, `users/${user.uid}`), {
        score:   increment(pts),
        reports: increment(1),
      })

      setReportOpen(false)
      showToast(`✅ Reporte enviado! +${pts} pts`)
      setPointsAlert(pts)
      setTimeout(() => setPointsAlert(null), 2500)
    } catch (err) {
      // Server-side rate limit atingido ou erro de rede
      if (err?.code === 'PERMISSION_DENIED') {
        showToast('⛔ Servidor rejeitou o reporte. Aguarde.', '#ff2d55', '#fff')
      } else {
        showToast('❌ Erro ao enviar reporte. Tente novamente.', '#ff2d55', '#fff')
      }
    }
  }, [user, userPos, spamCounter, addEvent, showToast])

  // Estatísticas derivadas dos eventos
  const now = Date.now()
  let hotCount = 0, totalEvents = 0, alertCount = 0
  SEED_LOCATIONS.forEach(loc => {
    const score = calcScore(loc.id, events)
    if (score >= 6) hotCount++
    if (loc.cat === 'transito' && score > 0) alertCount++
    totalEvents += events.filter(e => e.locationId === loc.id && now - e.ts < 3_600_000).length
  })

  const filteredLocations = SEED_LOCATIONS.filter(loc => {
    if (activeFilter === 'all')      return true
    if (activeFilter === 'noturno')  return loc.cat === 'noturno'
    if (activeFilter === 'transito') return loc.cat === 'transito'
    if (activeFilter === 'hot')      return getHeatLevel(calcScore(loc.id, events)) === 'hot'
    return true
  })

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0a0a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 14, height: 14, borderRadius: '50%', background: '#ff2d55',
        boxShadow: '0 0 16px #ff2d55', animation: 'pulse 1.4s ease infinite',
      }} />
    </div>
  )

  if (!user) return <LoginScreen onLogin={login} />

  return (
    <div style={{
      position: 'relative', height: '100dvh', overflow: 'hidden',
      fontFamily: "'Syne', sans-serif", background: '#0a0a0f', color: '#f0f0ff',
    }}>

      {/* MAP */}
      <MapView
        events={events}
        filteredIds={filteredLocations.map(l => l.id)}
        onLocationClick={setDetailLocation}
        userPos={userPos}
      />

      {/* TOP BAR */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(to bottom, rgba(10,10,15,.95) 70%, transparent)',
        pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'all' }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: '#ff2d55', boxShadow: '0 0 12px #ff2d55',
            animation: 'pulse 1.4s ease infinite',
          }} />
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>
            Urbyn
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', pointerEvents: 'all' }}>
          {/* Score real do usuário logado */}
          <Pill onClick={() => setLeaderOpen(true)} style={{ color: '#ffcc00', borderColor: 'rgba(255,204,0,.3)' }}>
            🏆 {user.score ?? 0} pts
          </Pill>
          <img
            src={user.photo} alt=""
            onClick={logout}
            title="Sair"
            style={{
              width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
              border: '2px solid #2a2a3d',
            }}
          />
        </div>
      </div>

      {/* FILTERS */}
      <div style={{
        position: 'absolute', top: 60, left: 0, right: 0, zIndex: 999,
        display: 'flex', gap: 8, padding: '0 16px',
        overflowX: 'auto', scrollbarWidth: 'none',
        pointerEvents: 'all',
      }}>
        {[
          { id: 'all',      label: '● Tudo'     },
          { id: 'noturno',  label: '🌙 Noturno'  },
          { id: 'transito', label: '🚦 Trânsito' },
          { id: 'hot',      label: '🔥 Quentes'  },
        ].map(f => (
          <button key={f.id} onClick={() => setActiveFilter(f.id)} style={{
            flexShrink: 0,
            background: activeFilter === f.id ? '#ff2d55' : 'rgba(18,18,26,.9)',
            border: `1px solid ${activeFilter === f.id ? '#ff2d55' : '#2a2a3d'}`,
            borderRadius: 20, padding: '6px 14px',
            fontFamily: "'Space Mono',monospace", fontSize: 11,
            color: activeFilter === f.id ? '#fff' : '#f0f0ff',
            cursor: 'pointer', transition: 'all .2s',
          }}>{f.label}</button>
        ))}
      </div>

      {/* FAB */}
      <button onClick={() => setReportOpen(true)} style={{
        position: 'absolute', bottom: 130, right: 20, zIndex: 1000,
        width: 58, height: 58, borderRadius: '50%',
        background: '#ff2d55', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, boxShadow: '0 0 0 0 rgba(255,45,85,.6)',
        animation: 'fabPulse 2s ease infinite',
        transition: 'transform .15s',
      }}
        onMouseDown={e => e.currentTarget.style.transform = 'scale(.9)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      >📡</button>

      {/* BOTTOM STATS — onlineCount é real agora */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000,
        padding: '12px 16px 28px',
        background: 'linear-gradient(to top, rgba(10,10,15,.98) 60%, transparent)',
        display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        <StatCard label="Quentes"  value={hotCount}     sub="locais"       heat="hot" />
        <StatCard label="Eventos"  value={totalEvents}   sub="última hora"             />
        <StatCard label="Alertas"  value={alertCount}    sub="trânsito"     heat="mid" />
        <StatCard label="Online"   value={onlineCount}   sub="usuários"                />
      </div>

      {/* POINTS ALERT */}
      {pointsAlert && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          zIndex: 3000, textAlign: 'center',
          animation: 'pointsPop .4s ease',
          pointerEvents: 'none',
        }}>
          <div style={{
            background: 'rgba(18,18,26,.95)', border: '1px solid #2a2a3d',
            borderRadius: 16, padding: '20px 32px',
          }}>
            <div style={{ fontSize: 36 }}>⚡</div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 28, fontWeight: 700, color: '#ffcc00' }}>
              +{pointsAlert}
            </div>
            <div style={{ fontSize: 12, color: '#6666aa' }}>pontos</div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 100, left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 3000,
          background: toast.bg, color: toast.color,
          padding: '10px 20px', borderRadius: 20,
          fontWeight: 700, fontSize: 13,
          boxShadow: '0 4px 20px rgba(0,0,0,.5)',
          animation: 'toastIn .3s ease',
          whiteSpace: 'nowrap',
        }}>{toast.msg}</div>
      )}

      {/* PANELS */}
      <ReportPanel
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onConfirm={handleConfirmReport}
      />
      <DetailPanel
        location={detailLocation}
        events={events}
        user={user}
        onClose={() => setDetailLocation(null)}
      />
      <Leaderboard
        open={leaderOpen}
        onClose={() => setLeaderOpen(false)}
        currentUid={user.uid}
      />

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow: hidden; }
        .leaflet-tile { filter: invert(1) hue-rotate(195deg) saturate(1.4) brightness(.8); }
        .leaflet-container { background: #0a0a0f; }
        .leaflet-control-zoom { display: none; }
        ::-webkit-scrollbar { display: none; }
        @keyframes pulse {
          0%,100% { transform:scale(1); opacity:1; }
          50%      { transform:scale(1.3); opacity:.7; }
        }
        @keyframes fabPulse {
          0%   { box-shadow: 0 0 0 0 rgba(255,45,85,.55); }
          70%  { box-shadow: 0 0 0 16px rgba(255,45,85,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,45,85,0); }
        }
        @keyframes toastIn {
          from { opacity:0; transform: translateX(-50%) translateY(10px); }
          to   { opacity:1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes pointsPop {
          0%   { transform: translate(-50%,-50%) scale(.7); opacity:0; }
          60%  { transform: translate(-50%,-50%) scale(1.1); opacity:1; }
          100% { transform: translate(-50%,-50%) scale(1); opacity:1; }
        }
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
      `}</style>
    </div>
  )
}

function Pill({ children, onClick, style = {} }) {
  return (
    <button onClick={onClick} style={{
      background: '#12121a', border: '1px solid #2a2a3d',
      borderRadius: 20, padding: '6px 12px',
      fontFamily: "'Space Mono',monospace", fontSize: 11,
      cursor: 'pointer', color: '#f0f0ff',
      transition: 'all .2s', ...style,
    }}>{children}</button>
  )
}

function StatCard({ label, value, sub, heat }) {
  const color = heat === 'hot' ? '#ff2d55' : heat === 'mid' ? '#ffcc00' : '#f0f0ff'
  return (
    <div style={{
      flexShrink: 0, minWidth: 110,
      background: '#12121a', border: '1px solid #2a2a3d',
      borderRadius: 12, padding: '10px 14px', cursor: 'pointer',
      transition: 'all .2s',
    }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: '#6666aa', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 20, fontWeight: 700, color }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: '#6666aa', marginTop: 2 }}>{sub}</div>
    </div>
  )
}
