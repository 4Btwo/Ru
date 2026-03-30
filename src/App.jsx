import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ref, update, increment, get } from 'firebase/database'
import { db } from './lib/firebase'
import { useAuth } from './hooks/useAuth'
import { useEvents } from './hooks/useEvents'
import { useOnline } from './hooks/useOnline'
import { useNotifications } from './hooks/useNotifications'
import { usePlaces } from './hooks/usePlaces'
import { EVENT_META, DEFAULT_LAT, DEFAULT_LNG } from './lib/constants'
import { calcScore, getHeatLevel } from './lib/hotspot'
import { checkAlerts } from './lib/alerts'
import { seedIfEmpty } from './lib/seed'
import LoginScreen from './components/LoginScreen'
import MapView from './components/MapView'
import ReportPanel from './components/ReportPanel'
import DetailPanel from './components/DetailPanel'
import NowPanel from './components/NowPanel'
import AddLocationPanel from './components/AddLocationPanel'
import { useNetworkStatus } from './hooks/useNetworkStatus'
import NetworkBanner        from './components/NetworkBanner'

export default function App() {
  const networkStatus = useNetworkStatus()
  const { user, loading, login, logout }   = useAuth()
  const { events, addEvent }               = useEvents(user?.uid)
  const { allPlaces, addPlace }            = usePlaces(user?.uid)
  const onlineCount                        = useOnline(user?.uid)
  const { permission, requestPermission }  = useNotifications(user?.uid)
  const mapRef = useRef(null)

  const [userPos,      setUserPos]      = useState(null)
  const [reportLoc,    setReportLoc]    = useState(null)
  const [detailLoc,    setDetailLoc]    = useState(null)
  const [nowOpen,      setNowOpen]      = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')
  const [toast,        setToast]        = useState(null)
  const [pointsAlert,  setPointsAlert]  = useState(null)
  const [notifBanner,  setNotifBanner]  = useState(false)
  const [usersMap,     setUsersMap]     = useState({})
  const [seeded,       setSeeded]       = useState(false)

  // Modo de criação de novo local
  const [pickMode,     setPickMode]     = useState(false)   // cursor crosshair
  const [pickedCoords, setPickedCoords] = useState(null)    // coordenadas clicadas
  const [addLocOpen,   setAddLocOpen]   = useState(false)   // painel de criação

  // Geolocalização
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords
      const d = Math.sqrt((lat - DEFAULT_LAT)**2 + (lng - DEFAULT_LNG)**2) * 111
      if (d < 300) setUserPos({ lat, lng })
    }, () => {})
  }, [])

  useEffect(() => {
    if (!user) return
    get(ref(db, 'users')).then(s => { if (s.val()) setUsersMap(s.val()) })
  }, [user])

  useEffect(() => {
    if (user && !seeded) {
      setSeeded(true)
      seedIfEmpty(user.uid, user.name)
    }
  }, [user, seeded])

  useEffect(() => {
    if (events.length > 0) checkAlerts(events, usersMap)
  }, [events, usersMap])

  useEffect(() => {
    if (user && permission === 'default') {
      const t = setTimeout(() => setNotifBanner(true), 4000)
      return () => clearTimeout(t)
    }
  }, [user, permission])

  const showToast = useCallback((msg, bg='var(--green)', color='#0a0a0f') => {
    setToast({ msg, bg, color })
    setTimeout(() => setToast(null), 2800)
  }, [])

  const handleMarkerClick = useCallback((loc) => {
    if (pickMode) return  // em pick mode não abre detail
    setDetailLoc(loc)
  }, [pickMode])

  const handleOpenReport = useCallback((loc) => setReportLoc(loc), [])

  const handleReport = useCallback(async (type, loc) => {
    if (!user || !loc) return
    try {
      await addEvent({ locationId: loc.id, type,
        userId: user.uid, userName: user.name, userReports: user.reports || 0 })
    } catch (e) {
      if (e.message === 'spam') { showToast('⚠️ Aguarde um pouco', '#ffcc00', '#000'); return }
      throw e
    }
    const pts = (EVENT_META[type]?.weight || 1) * 10
    await update(ref(db, `users/${user.uid}`), { score: increment(pts), reports: increment(1) })
    setReportLoc(null)
    showToast(`✅ +${pts} pts — ${loc.name.split(' ')[0]}!`)
    setPointsAlert(pts)
    setTimeout(() => setPointsAlert(null), 2200)
  }, [user, addEvent, showToast])

  // ── FLUXO CRIAR LOCAL ─────────────────────────────────────────────────────
  const handleStartPick = useCallback(() => {
    setPickedCoords(null)
    setPickMode(true)
    showToast('Toque no mapa para marcar o local', 'rgba(18,18,26,.98)', '#f0f0ff')
  }, [showToast])

  // Usuário clicou no mapa em pick mode
  const handlePick = useCallback((coords) => {
    setPickedCoords(coords)
    setPickMode(false)
    setAddLocOpen(true)
  }, [])

  // Salva novo local no Firebase
  const handleSavePlace = useCallback(async (placeData) => {
    if (!user) return
    await addPlace(placeData, user.uid, user.name)
    setAddLocOpen(false)
    setPickedCoords(null)
    showToast(`📍 "${placeData.name}" criado!`)
  }, [user, addPlace, showToast])

  // Cancela criação
  const handleCancelAdd = useCallback(() => {
    setPickMode(false)
    setPickedCoords(null)
    setAddLocOpen(false)
  }, [])

  // Stats
  const now = Date.now()
  let hotCount = 0, totalActive = 0, alertCount = 0
  allPlaces.forEach(loc => {
    const score = calcScore(loc.id, events, usersMap)
    if (score >= 6) hotCount++
    if (loc.cat === 'transito' && score > 0) alertCount++
    totalActive += events.filter(e => e.locationId === loc.id && now - e.ts < 3600000).length
  })

  // Filtro
  const filteredIds = allPlaces.filter(loc => {
    if (activeFilter === 'all')      return true
    if (activeFilter === 'noturno')  return loc.cat === 'noturno'
    if (activeFilter === 'transito') return loc.cat === 'transito'
    if (activeFilter === 'hot')      return getHeatLevel(calcScore(loc.id, events, usersMap)) !== 'inactive'
    return true
  }).map(l => l.id)

  if (loading) return (
    <div style={{ position:'fixed', inset:0, background:'#0a0a0f',
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:16, height:16, borderRadius:'50%', background:'#ff2d55',
        boxShadow:'0 0 20px #ff2d55', animation:'pulse 1.4s ease infinite' }}/>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.4);opacity:.6}}`}</style>
    </div>
  )

  if (!user) return <LoginScreen onLogin={login} />

  return (
    <div style={{ position:'relative', height:'100dvh', overflow:'hidden',
      fontFamily:"'Syne',sans-serif", background:'#0a0a0f', color:'#f0f0ff' }}>
      <NetworkBanner status={networkStatus} />
      <MapView
        ref={mapRef}
        allPlaces={allPlaces}
        events={events}
        usersMap={usersMap}
        filteredIds={filteredIds}
        onLocationClick={handleMarkerClick}
        userPos={userPos}
        pickMode={pickMode}
        onPick={handlePick}
      />

      {/* BANNER PICK MODE */}
      {pickMode && (
        <div style={{
          position:'absolute', top:0, left:0, right:0, zIndex:1100,
          background:'rgba(255,45,85,.95)', padding:'14px 16px',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          animation:'slideDown .25s ease',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:20 }}>📍</span>
            <div>
              <div style={{ fontWeight:800, fontSize:14 }}>Toque no mapa para marcar</div>
              <div style={{ fontSize:11, opacity:.85 }}>Escolha o ponto exato do local</div>
            </div>
          </div>
          <button onClick={handleCancelAdd} style={{
            background:'rgba(255,255,255,.2)', border:'none', borderRadius:8,
            padding:'6px 12px', color:'#fff', cursor:'pointer',
            fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:12,
          }}>Cancelar</button>
        </div>
      )}

      {/* TOP BAR */}
      {!pickMode && (
        <div style={{
          position:'absolute', top:0, left:0, right:0, zIndex:1000,
          padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'linear-gradient(to bottom,rgba(10,10,15,.96) 70%,transparent)',
          pointerEvents:'none',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, pointerEvents:'all' }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:'#ff2d55',
              boxShadow:'0 0 12px #ff2d55', animation:'pulse 1.4s ease infinite' }}/>
            <span style={{ fontSize:13, fontWeight:800, letterSpacing:'.12em', textTransform:'uppercase' }}>
              Radar Urbano
            </span>
            {onlineCount > 1 && (
              <span style={{ background:'rgba(0,255,136,.12)', border:'1px solid rgba(0,255,136,.3)',
                borderRadius:20, padding:'2px 8px', fontSize:10, color:'#00ff88',
                fontFamily:"'Space Mono',monospace" }}>● {onlineCount} online</span>
            )}
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center', pointerEvents:'all' }}>
            <div style={{ background:'#12121a', border:'1px solid rgba(255,204,0,.3)',
              borderRadius:20, padding:'6px 12px',
              fontFamily:"'Space Mono',monospace", fontSize:11, color:'#ffcc00' }}>
              ⚡ {user.score ?? 0} pts
            </div>
            <div onClick={logout} title="Sair" style={{
              width:32, height:32, borderRadius:'50%', overflow:'hidden',
              background:'#1a1a26', border:'1px solid #2a2a3d', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              {user.photo
                ? <img src={user.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                : <span style={{ fontSize:15 }}>👤</span>}
            </div>
          </div>
        </div>
      )}

      {/* BANNER NOTIFICAÇÃO */}
      {!pickMode && notifBanner && permission === 'default' && (
        <div style={{
          position:'absolute', top:60, left:16, right:16, zIndex:1001,
          background:'#12121a', border:'1px solid rgba(255,204,0,.35)',
          borderRadius:12, padding:'12px 14px',
          display:'flex', alignItems:'center', gap:10, animation:'slideDown .3s ease',
        }}>
          <span style={{ fontSize:20 }}>🔔</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:1 }}>Ativar alertas?</div>
            <div style={{ fontSize:11, color:'#6666aa' }}>Avisos quando um local esquentar</div>
          </div>
          <button onClick={() => { requestPermission(); setNotifBanner(false) }} style={{
            background:'#ffcc00', border:'none', borderRadius:8, padding:'6px 12px',
            fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:11, color:'#000', cursor:'pointer',
          }}>Ativar</button>
          <button onClick={() => setNotifBanner(false)} style={{
            background:'none', border:'none', color:'#6666aa', cursor:'pointer', fontSize:16,
          }}>✕</button>
        </div>
      )}

      {/* FILTROS */}
      {!pickMode && (
        <div style={{
          position:'absolute', top: notifBanner ? 118 : 58, left:0, right:0, zIndex:999,
          padding:'8px 16px', display:'flex', gap:8,
          overflowX:'auto', scrollbarWidth:'none', transition:'top .3s',
        }}>
          {[
            { id:'all',      label:'🗺️ Tudo'     },
            { id:'noturno',  label:'🌙 Noturno'  },
            { id:'transito', label:'🚦 Trânsito' },
            { id:'hot',      label:'🔥 Ativos'   },
          ].map(f => {
            const active = activeFilter === f.id
            const col    = f.id === 'transito' ? '#ff6b35' : '#ff2d55'
            return (
              <button key={f.id} onClick={() => setActiveFilter(f.id)} style={{
                flexShrink:0, padding:'6px 14px', borderRadius:20,
                background: active ? `${col}22` : 'rgba(18,18,26,.92)',
                border:`1px solid ${active ? col : '#2a2a3d'}`,
                fontSize:11, fontWeight:600, cursor:'pointer', color: active ? col : '#6666aa',
                fontFamily:"'Syne',sans-serif", backdropFilter:'blur(8px)', transition:'all .2s',
              }}>{f.label}</button>
            )
          })}
        </div>
      )}

      {/* LEGENDA */}
      {!pickMode && (
        <div style={{
          position:'absolute', bottom:138, left:16, zIndex:1000,
          background:'rgba(18,18,26,.94)', border:'1px solid #2a2a3d',
          borderRadius:12, padding:'10px 12px', backdropFilter:'blur(8px)',
        }}>
          {[
            { c:'#ff2d55', label:'Forte (0–10min)'  },
            { c:'#ffcc00', label:'Médio (10–30min)' },
            { c:'#4a4a6a', label:'Fraco (30–60min)' },
          ].map(l => (
            <div key={l.label} style={{ display:'flex', alignItems:'center', gap:7,
              fontSize:11, color:'#6666aa', marginBottom:5 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:l.c, flexShrink:0,
                boxShadow: l.c !== '#4a4a6a' ? `0 0 5px ${l.c}` : 'none' }}/>
              {l.label}
            </div>
          ))}
        </div>
      )}

      {/* BOTTOM STATS */}
      {!pickMode && (
        <div style={{
          position:'absolute', bottom:0, left:0, right:0, zIndex:1000,
          padding:'12px 16px 28px',
          background:'linear-gradient(to top,rgba(10,10,15,.98) 60%,transparent)',
          display:'flex', gap:10, overflowX:'auto', scrollbarWidth:'none',
        }}>
          {/* Botão AGORA */}
          <button onClick={() => setNowOpen(true)} style={{
            flexShrink:0, minWidth:100,
            background: hotCount > 0 ? 'rgba(255,45,85,.15)' : '#12121a',
            border:`1px solid ${hotCount > 0 ? '#ff2d55' : '#2a2a3d'}`,
            borderRadius:12, padding:'10px 14px', cursor:'pointer',
            fontFamily:"'Syne',sans-serif", transition:'all .2s',
          }}>
            <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.1em',
              color: hotCount > 0 ? '#ff2d55' : '#6666aa', marginBottom:4 }}>🔴 Agora</div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:20, fontWeight:700,
              color: hotCount > 0 ? '#ff2d55' : '#f0f0ff' }}>{hotCount}</div>
            <div style={{ fontSize:10, color:'#6666aa', marginTop:2 }}>hotspots</div>
          </button>

          <StatCard label="📍 Reportes" value={totalActive}  sub="última hora"  color="#f0f0ff"/>
          <StatCard label="🚦 Alertas"  value={alertCount}   sub="no trânsito"  color="#ffcc00"/>
          <StatCard label="👥 Online"   value={onlineCount}  sub="agora"        color="#f0f0ff"/>

          {/* Botão CRIAR LOCAL — Bloco novo */}
          <button onClick={handleStartPick} style={{
            flexShrink:0, minWidth:100, background:'#12121a',
            border:'1px solid #2a2a3d', borderRadius:12, padding:'10px 14px',
            cursor:'pointer', fontFamily:"'Syne',sans-serif", transition:'all .2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background='#1a1a26'; e.currentTarget.style.borderColor='#ff2d55' }}
            onMouseLeave={e => { e.currentTarget.style.background='#12121a'; e.currentTarget.style.borderColor='#2a2a3d' }}
          >
            <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.1em',
              color:'#6666aa', marginBottom:4 }}>➕ Criar</div>
            <div style={{ fontSize:20 }}>📍</div>
            <div style={{ fontSize:10, color:'#6666aa', marginTop:2 }}>novo local</div>
          </button>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{
          position:'fixed', bottom:112, left:'50%', transform:'translateX(-50%)',
          zIndex:3000, background:toast.bg, color:toast.color,
          padding:'10px 22px', borderRadius:22, fontWeight:700, fontSize:13,
          boxShadow:'0 4px 20px rgba(0,0,0,.5)', animation:'toastIn .3s ease',
          whiteSpace:'nowrap', pointerEvents:'none',
        }}>{toast.msg}</div>
      )}

      {/* POINTS ALERT */}
      {pointsAlert && (
        <div style={{
          position:'fixed', top:'42%', left:'50%', transform:'translateX(-50%)',
          zIndex:3000, textAlign:'center', animation:'pointsIn .35s ease', pointerEvents:'none',
        }}>
          <div style={{ background:'rgba(18,18,26,.97)', border:'1px solid #2a2a3d',
            borderRadius:16, padding:'18px 32px' }}>
            <div style={{ fontSize:32 }}>⚡</div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:30,
              fontWeight:700, color:'#ffcc00' }}>+{pointsAlert}</div>
            <div style={{ fontSize:11, color:'#6666aa', marginTop:2 }}>pontos</div>
          </div>
        </div>
      )}

      {/* PANELS */}
      <DetailPanel location={detailLoc} events={events} usersMap={usersMap} user={user}
        onClose={() => setDetailLoc(null)} onReport={handleOpenReport} />
      <ReportPanel open={!!reportLoc} location={reportLoc}
        onClose={() => setReportLoc(null)} onConfirm={handleReport} />
      <NowPanel open={nowOpen} onClose={() => setNowOpen(false)}
        events={events} usersMap={usersMap} onLocationClick={handleMarkerClick} />
      <AddLocationPanel
        open={addLocOpen}
        coords={pickedCoords}
        onClose={handleCancelAdd}
        onSave={handleSavePlace}
      />

      <style>{`
        @keyframes pulse     { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.3);opacity:.7} }
        @keyframes toastIn   { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pointsIn  { 0%{opacity:0;transform:translateX(-50%) scale(.7)} 70%{transform:translateX(-50%) scale(1.1)} 100%{opacity:1;transform:translateX(-50%) scale(1)} }
        @keyframes markerPulse { 0%{transform:scale(1);opacity:.7} 50%{transform:scale(1.5);opacity:.2} 100%{transform:scale(1);opacity:.7} }
      `}</style>
    </div>
  )
}

function StatCard({ label, value, sub, color, onClick }) {
  return (
    <div onClick={onClick} style={{
      flexShrink:0, minWidth:110, background:'#12121a', border:'1px solid #2a2a3d',
      borderRadius:12, padding:'10px 14px', cursor: onClick ? 'pointer' : 'default', transition:'all .2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background='#1a1a26'; e.currentTarget.style.transform='translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.background='#12121a'; e.currentTarget.style.transform='translateY(0)' }}
    >
      <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.1em', color:'#6666aa', marginBottom:4 }}>{label}</div>
      <div style={{ fontFamily:"'Space Mono',monospace", fontSize:20, fontWeight:700, color }}>{value}</div>
      <div style={{ fontSize:10, color:'#6666aa', marginTop:2 }}>{sub}</div>
    </div>
  )
}
