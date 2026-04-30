import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ref, update, increment, get } from 'firebase/database'
import { db } from './lib/firebase'
import { useAuth } from './hooks/useAuth'
import { useEvents } from './hooks/useEvents'
import { useOnline } from './hooks/useOnline'
import { useNotifications } from './hooks/useNotifications'
import { usePlaces } from './hooks/usePlaces'
import { EVENT_META, DEFAULT_LAT, DEFAULT_LNG, ADMIN_UIDS } from './lib/constants'
import { calcScore, getHeatLevel } from './lib/hotspot'
import { checkAlerts } from './lib/alerts'
import { seedIfEmpty } from './lib/seed'
import LoginScreen from './components/LoginScreen'
import MapView from './components/MapView'
import ReportPanel from './components/ReportPanel'
import DetailPanel from './components/DetailPanel'
import NowPanel from './components/NowPanel'
import AddLocationPanel from './components/AddLocationPanel'
import AdminPanel from './components/AdminPanel'
import TrafficConfirmBanner from './components/TrafficConfirmBanner'
import { useTrafficConfirm } from './hooks/useTrafficConfirm'
import { useNetworkStatus } from './hooks/useNetworkStatus'
import NetworkBanner from './components/NetworkBanner'

// ─── Icons ────────────────────────────────────────────────────────────────────
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const ExploreIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const ActivityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)
const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)
const MapPinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const FilterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="6" x2="20" y2="6"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
    <line x1="11" y1="18" x2="13" y2="18"/>
  </svg>
)
const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)

// ─── Category filters (matching Ru+ image layout) ─────────────────────────────
const CATEGORY_FILTERS = [
  { id:'all',             label:'Todos',          emoji:'🗺️',  col:'#1db954' },
  { id:'estabelecimento', label:'Cafeterias',      emoji:'☕',  col:'#ff9f43' },
  { id:'noturno',         label:'Restaurantes',    emoji:'🍽️', col:'#c77dff' },
  { id:'hot',             label:'Mais avaliados',  emoji:'⭐',  col:'#ffd60a' },
  { id:'transito',        label:'Trânsito',        emoji:'🚦',  col:'#ff6b35' },
  { id:'blitz',           label:'Blitz',           emoji:'🚔',  col:'#3d9eff' },
  { id:'estabelecimento', label:'Arte & Cultura',  emoji:'🎭',  col:'#c77dff', id2:'arte' },
  { id:'parques',         label:'Parques',         emoji:'🌿',  col:'#1db954' },
  { id:'hot',             label:'Novos',           emoji:'✨',  col:'#00e5ff', id2:'novos' },
]

// dedupe
const FILTERS = [
  { id:'all',             label:'Todos',          emoji:'🗺️',  col:'#1db954' },
  { id:'estabelecimento', label:'Cafeterias',      emoji:'☕',  col:'#ff9f43' },
  { id:'noturno',         label:'Restaurantes',    emoji:'🍽️', col:'#c77dff' },
  { id:'hot',             label:'Mais avaliados',  emoji:'⭐',  col:'#ffd60a' },
  { id:'transito',        label:'Trânsito',        emoji:'🚦',  col:'#ff6b35' },
  { id:'blitz',           label:'Blitz',           emoji:'🚔',  col:'#3d9eff' },
]

// ─── Profile Panel ─────────────────────────────────────────────────────────────
function ProfilePanel({ user, onLogout, onlineCount }) {
  return (
    <div style={{ padding:'24px 20px', paddingBottom:'calc(80px + env(safe-area-inset-bottom,0px))' }}>
      {/* Avatar + info */}
      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24 }}>
        <div style={{
          width:72, height:72, borderRadius:'50%',
          background: 'var(--surface3)', border:'2px solid var(--green)',
          overflow:'hidden', flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:28,
        }}>
          {user.photo
            ? <img src={user.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            : '👤'}
        </div>
        <div>
          <div style={{ fontSize:18, fontWeight:800, color:'var(--text)', marginBottom:4 }}>
            {user.name || 'Urbano'}
          </div>
          <div style={{ fontSize:12, color:'var(--muted)' }}>@{(user.name||'user').toLowerCase().replace(/\s+/g,'')}</div>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:5, marginTop:6,
            background:'rgba(29,185,84,.12)', border:'1px solid rgba(29,185,84,.3)',
            borderRadius:20, padding:'3px 10px', fontSize:11, color:'var(--green)', fontWeight:700,
          }}>
            🏆 Explorador Urbano
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:24 }}>
        {[
          { val: user.reports || 0, label:'Avaliações' },
          { val: 0, label:'Seguindo' },
          { val: 0, label:'Seguidores' },
        ].map((s, i) => (
          <div key={i} style={{
            background:'var(--surface2)', border:'1px solid var(--border)',
            borderRadius:14, padding:'14px 10px', textAlign:'center',
          }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:20, fontWeight:700, color:'var(--text)', marginBottom:3 }}>{s.val}</div>
            <div style={{ fontSize:11, color:'var(--muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Score */}
      <div style={{
        background:'rgba(29,185,84,.08)', border:'1px solid rgba(29,185,84,.25)',
        borderRadius:16, padding:16, marginBottom:20,
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div>
          <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>⚡ PONTUAÇÃO</div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:28, fontWeight:700, color:'var(--green)' }}>
            {user.score ?? 0} <span style={{ fontSize:14, color:'var(--muted)' }}>pts</span>
          </div>
        </div>
        <div style={{ fontSize:36 }}>🌟</div>
      </div>

      {/* Logout */}
      <button onClick={onLogout} style={{
        width:'100%', padding:14, borderRadius:14,
        background:'rgba(255,59,92,.08)', border:'1px solid rgba(255,59,92,.3)',
        color:'var(--red)', fontFamily:"'Plus Jakarta Sans',sans-serif",
        fontWeight:700, fontSize:14, cursor:'pointer',
      }}>
        Sair da conta
      </button>
    </div>
  )
}

// ─── Activities Panel ──────────────────────────────────────────────────────────
function ActivitiesPanel({ events, usersMap, allPlaces, onLocationClick }) {
  const now = Date.now()
  const recent = [...events]
    .sort((a,b) => b.ts - a.ts)
    .slice(0, 20)

  const timeAgo = (ts) => {
    const d = Math.floor((now - ts) / 1000)
    if (d < 60) return `${d}s atrás`
    if (d < 3600) return `${Math.floor(d/60)} min atrás`
    return `${Math.floor(d/3600)}h atrás`
  }

  return (
    <div style={{ padding:'20px 16px', paddingBottom:'calc(80px + env(safe-area-inset-bottom,0px))' }}>
      <div style={{ fontSize:20, fontWeight:800, marginBottom:4 }}>Atividades</div>
      <div style={{ fontSize:13, color:'var(--muted)', marginBottom:20 }}>O que está acontecendo na cidade</div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {['Todos','Curtidas','Comentários','Seguindo'].map((t,i) => (
          <button key={t} style={{
            padding:'7px 14px', borderRadius:100,
            background: i===0 ? 'rgba(29,185,84,.15)' : 'var(--surface2)',
            border: `1px solid ${i===0 ? 'var(--green)' : 'var(--border)'}`,
            color: i===0 ? 'var(--green)' : 'var(--muted)',
            fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600, fontSize:12, cursor:'pointer',
          }}>{t}</button>
        ))}
      </div>

      {recent.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--muted)' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>📭</div>
          <div style={{ fontSize:14 }}>Nenhuma atividade ainda</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          {recent.map(ev => {
            const meta = EVENT_META[ev.type]
            const place = allPlaces.find(p => p.id === ev.locationId)
            return (
              <div key={ev.id} onClick={() => place && onLocationClick(place)}
                style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'14px 0',
                  borderBottom:'1px solid var(--border)',
                  cursor: place ? 'pointer' : 'default',
                  animation:'fadeUp .3s ease',
                }}>
                <div style={{
                  width:40, height:40, borderRadius:'50%', flexShrink:0,
                  background:'var(--surface3)', border:'1px solid var(--border)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:18,
                }}>
                  {meta?.emoji || '📍'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:2 }}>
                    <span style={{ color:'var(--green)' }}>{ev.userName?.split(' ')[0] || 'Alguém'}</span>
                    {' '}marcou <span style={{ color: meta?.color || 'var(--text)' }}>{meta?.label || ev.type}</span>
                  </div>
                  <div style={{ fontSize:12, color:'var(--muted)' }}>
                    {place ? `em ${place.name}` : 'local desconhecido'}
                  </div>
                </div>
                <div style={{ fontSize:11, color:'var(--dim)', flexShrink:0 }}>
                  {timeAgo(ev.ts)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Home Panel (Início) ───────────────────────────────────────────────────────
function HomePanel({ user, allPlaces, events, usersMap, hotCount, totalActive, alertCount, onlineCount, onLocationClick, onStartAdd, isAdmin, adminOpen, setAdminOpen, pendingCount }) {
  const now = Date.now()
  const trending = [...allPlaces]
    .map(p => ({ ...p, score: calcScore(p.id, events, usersMap) }))
    .sort((a,b) => b.score - a.score)
    .slice(0, 6)

  const recommended = [...allPlaces]
    .sort(() => Math.random() - .5)
    .slice(0, 4)

  return (
    <div style={{
      position:'absolute', top:0, left:0, right:0, bottom:0,
      overflowY:'auto', paddingBottom:'calc(80px + env(safe-area-inset-bottom,0px))',
    }}>
      {/* Header */}
      <div style={{
        position:'sticky', top:0, zIndex:100,
        background:'var(--bg)',
        padding:'calc(14px + var(--sat)) 16px 12px',
        borderBottom:'1px solid var(--border)',
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <RuLogo size={28} />
              <div style={{
                fontSize:11, background:'rgba(29,185,84,.12)', border:'1px solid rgba(29,185,84,.25)',
                borderRadius:20, padding:'3px 10px', color:'var(--green)', fontWeight:600,
              }}>
                📍 Bauru, SP ▾
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            {isAdmin && (
              <button onClick={() => setAdminOpen(true)} style={{
                position:'relative', background: pendingCount > 0 ? 'rgba(255,214,10,.12)' : 'var(--surface2)',
                border:`1px solid ${pendingCount > 0 ? 'rgba(255,214,10,.4)' : 'var(--border)'}`,
                borderRadius:10, padding:'6px 10px', cursor:'pointer',
                color: pendingCount > 0 ? 'var(--yellow)' : 'var(--muted)',
                fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:12,
              }}>
                🛡️
                {pendingCount > 0 && (
                  <span style={{
                    position:'absolute', top:-4, right:-4,
                    background:'var(--red)', color:'#fff', fontSize:9, fontWeight:800,
                    borderRadius:'50%', width:16, height:16,
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>{pendingCount}</span>
                )}
              </button>
            )}
            <button style={{
              width:36, height:36, borderRadius:'50%',
              background:'var(--surface2)', border:'1px solid var(--border)',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', color:'var(--muted)',
            }}>
              <BellIcon />
            </button>
            <div style={{
              width:36, height:36, borderRadius:'50%',
              background:'var(--surface3)', border:'2px solid rgba(29,185,84,.4)',
              overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
            }}>
              {user.photo ? <img src={user.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : '👤'}
            </div>
          </div>
        </div>
        <div style={{ fontSize:20, fontWeight:800 }}>Bom dia, urbano 🤙</div>
      </div>

      <div style={{ padding:'16px 16px 0' }}>
        {/* Search */}
        <div style={{
          display:'flex', alignItems:'center', gap:10,
          background:'var(--surface2)', border:'1px solid var(--border)',
          borderRadius:14, padding:'11px 14px', marginBottom:16,
        }}>
          <SearchIcon />
          <input
            placeholder="Buscar lugares, comidas, experiências..."
            style={{ background:'none', border:'none', outline:'none', color:'var(--text)',
              fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:14, flex:1, }}
          />
          <FilterIcon />
        </div>

        {/* Stats strip */}
        <div style={{ display:'flex', gap:10, marginBottom:24, overflowX:'auto', scrollbarWidth:'none' }}>
          {[
            { icon:'🔥', val: hotCount, label:'Hotspots', col:'var(--red)' },
            { icon:'📡', val: totalActive, label:'Reportes/h', col:'var(--text)' },
            { icon:'🚦', val: alertCount, label:'Alertas', col:'var(--yellow)' },
            { icon:'👥', val: onlineCount, label:'Online', col:'var(--blue)' },
          ].map((s,i) => (
            <div key={i} style={{
              flexShrink:0, background:'var(--surface2)', border:'1px solid var(--border)',
              borderRadius:14, padding:'12px 16px', minWidth:90, textAlign:'center',
            }}>
              <div style={{ fontSize:18, marginBottom:4 }}>{s.icon}</div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:18, fontWeight:700, color:s.col }}>{s.val}</div>
              <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Categories */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontSize:15, fontWeight:800 }}>Categorias</div>
          <button style={{ background:'none', border:'none', color:'var(--green)', fontSize:12, fontWeight:600, cursor:'pointer' }}>Ver todas</button>
        </div>
        <div style={{ display:'flex', gap:10, marginBottom:24, overflowX:'auto', scrollbarWidth:'none' }}>
          {[
            { emoji:'☕', label:'Cafeterias', col:'#ff9f43' },
            { emoji:'🍽️', label:'Restaurantes', col:'var(--purple)' },
            { emoji:'🍺', label:'Bares', col:'var(--orange)' },
            { emoji:'🎭', label:'Arte & Cultura', col:'var(--blue)' },
            { emoji:'🌿', label:'Parques', col:'var(--green)' },
          ].map((c,i) => (
            <div key={i} style={{
              flexShrink:0, background:'var(--surface2)', border:'1px solid var(--border)',
              borderRadius:14, padding:'14px 16px', textAlign:'center', cursor:'pointer',
              minWidth:76, transition:'border-color .2s',
            }}>
              <div style={{ fontSize:22, marginBottom:6 }}>{c.emoji}</div>
              <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Em alta */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontSize:15, fontWeight:800 }}>🔥 Em alta perto de você</div>
        </div>
        <div style={{ display:'flex', gap:12, marginBottom:24, overflowX:'auto', scrollbarWidth:'none', paddingBottom:4 }}>
          {trending.map(p => (
            <div key={p.id} onClick={() => onLocationClick(p)}
              style={{
                flexShrink:0, width:180,
                background:'var(--surface2)', border:'1px solid var(--border)',
                borderRadius:16, overflow:'hidden', cursor:'pointer',
              }}>
              <div style={{
                height:100, background:`linear-gradient(135deg, var(--surface3), var(--bg2))`,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:36,
              }}>
                {p.cat==='noturno' ? '🌙' : p.cat==='transito' ? '🚦' : p.cat==='estabelecimento' ? '☕' : '📍'}
              </div>
              <div style={{ padding:'10px 12px' }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ fontSize:11, color:'var(--muted)' }}>
                    {p.cat === 'estabelecimento' ? 'Estabelecimento' : p.cat === 'noturno' ? 'Noturno' : 'Local'}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                    <span style={{ color:'var(--green)', fontSize:11 }}>★</span>
                    <span style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:'var(--green)' }}>
                      {p.score.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recomendados */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontSize:15, fontWeight:800 }}>Recomendados para você</div>
          <button style={{ background:'none', border:'none', color:'var(--green)', fontSize:12, fontWeight:600, cursor:'pointer' }}>Ver todos</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {recommended.map(p => (
            <div key={p.id} onClick={() => onLocationClick(p)}
              style={{
                display:'flex', alignItems:'center', gap:12,
                background:'var(--surface2)', border:'1px solid var(--border)',
                borderRadius:16, padding:'12px 14px', cursor:'pointer',
              }}>
              <div style={{
                width:50, height:50, borderRadius:12, flexShrink:0,
                background:'var(--surface3)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
              }}>
                {p.cat==='noturno' ? '🌙' : p.cat==='transito' ? '🚦' : p.cat==='estabelecimento' ? '☕' : '📍'}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700 }}>{p.name}</div>
                <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>
                  {p.cat === 'estabelecimento' ? 'Estabelecimento' : p.cat === 'noturno' ? 'Noturno' : 'Local'} · Bauru, SP
                </div>
              </div>
              <div style={{ fontSize:11, color:'var(--green)', fontWeight:700 }}>
                ★ {calcScore(p.id, events, usersMap).toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Ru Logo ──────────────────────────────────────────────────────────────────
function RuLogo({ size = 32 }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
      <div style={{
        fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:900,
        fontSize: size, color:'var(--green)', letterSpacing:'-.04em',
        lineHeight:1,
      }}>Ru</div>
      <div style={{
        width: size * 0.28, height: size * 0.28,
        borderRadius: '50%', background:'var(--green)',
        boxShadow:'0 0 8px var(--green)',
        flexShrink:0,
      }}/>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const networkStatus = useNetworkStatus()
  const { user, loading, login, loginWithEmail, registerWithEmail, resetPassword, logout, authError, setAuthError } = useAuth()
  const { events, addEvent }  = useEvents(user?.uid)
  const { allPlaces, addPlace } = usePlaces(user?.uid)
  const onlineCount             = useOnline(user?.uid)
  const { permission, requestPermission } = useNotifications(user?.uid)
  const mapRef = useRef(null)

  const [userPos,      setUserPos]      = useState(null)
  const [reportLoc,    setReportLoc]    = useState(null)
  const [detailLoc,    setDetailLoc]    = useState(null)
  const [nowOpen,      setNowOpen]      = useState(false)
  const [adminOpen,    setAdminOpen]    = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')
  const [toast,        setToast]        = useState(null)
  const [pointsAlert,  setPointsAlert]  = useState(null)
  const [notifBanner,  setNotifBanner]  = useState(false)
  const [usersMap,     setUsersMap]     = useState({})
  const [seeded,       setSeeded]       = useState(false)
  const [pickMode,     setPickMode]     = useState(false)
  const [pickedCoords, setPickedCoords] = useState(null)
  const [addLocOpen,   setAddLocOpen]   = useState(false)
  const [trafficPrompt, setTrafficPrompt] = useState(null)
  const [activeTab,    setActiveTab]    = useState('map') // 'home' | 'map' | 'add' | 'activities' | 'profile'

  const isAdmin = ADMIN_UIDS.includes(user?.uid)

  const { confirmStillHappening, markResolved } = useTrafficConfirm({
    userPos, events, places: allPlaces, user, onConfirmPrompt: setTrafficPrompt,
  })

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
    if (user && !seeded) { setSeeded(true); seedIfEmpty(user.uid, user.name) }
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

  const showToast = useCallback((msg, bg='var(--green)', color='#0b1410') => {
    setToast({ msg, bg, color })
    setTimeout(() => setToast(null), 2800)
  }, [])

  const handleMarkerClick = useCallback((loc) => {
    if (pickMode) return
    setDetailLoc(loc)
  }, [pickMode])

  const handleOpenReport = useCallback((loc) => setReportLoc(loc), [])

  const handleReport = useCallback(async (type, loc) => {
    if (!user || !loc) return
    try {
      await addEvent({ locationId: loc.id, type, userId: user.uid, userName: user.name, userReports: user.reports || 0 })
    } catch (e) {
      if (e.message === 'spam') { showToast('⚠️ Aguarde um pouco', 'var(--yellow)', '#000'); return }
      throw e
    }
    const pts = (EVENT_META[type]?.weight || 1) * 10
    await update(ref(db, `users/${user.uid}`), { score: increment(pts), reports: increment(1) })
    setReportLoc(null)
    showToast(`✅ +${pts} pts — ${loc.name.split(' ')[0]}!`)
    setPointsAlert(pts)
    setTimeout(() => setPointsAlert(null), 2200)
  }, [user, addEvent, showToast])

  const handleStartPick = useCallback(() => {
    setPickedCoords(null)
    setPickMode(true)
    setActiveTab('map')
    showToast('Toque no mapa para marcar o local', 'rgba(19,31,24,.98)', 'var(--text)')
  }, [showToast])

  const handlePick = useCallback((coords) => {
    setPickedCoords(coords); setPickMode(false); setAddLocOpen(true)
  }, [])

  const handleSavePlace = useCallback(async (placeData) => {
    if (!user) return
    await addPlace(placeData, user.uid, user.name)
    setAddLocOpen(false); setPickedCoords(null)
    showToast(placeData.needsModeration
      ? `🛡️ "${placeData.name}" enviado para moderação`
      : `📍 "${placeData.name}" criado!`)
  }, [user, addPlace, showToast])

  const handleCancelAdd = useCallback(() => {
    setPickMode(false); setPickedCoords(null); setAddLocOpen(false)
  }, [])

  const now = Date.now()
  const visiblePlaces = allPlaces.filter(loc => {
    if (loc.expiresAt && loc.expiresAt < now) return false
    if (loc.needsModeration && loc.status !== 'approved') return false
    if (loc.cat === 'transito' && loc.isBase) {
      const hasActive = events.some(e => e.locationId === loc.id && (now - e.ts) < 3600000)
      if (!hasActive) return false
    }
    return true
  })

  let hotCount = 0, totalActive = 0, alertCount = 0
  visiblePlaces.forEach(loc => {
    const score = calcScore(loc.id, events, usersMap)
    if (score >= 6) hotCount++
    if (loc.cat === 'transito' && score > 0) alertCount++
    totalActive += events.filter(e => e.locationId === loc.id && now - e.ts < 3600000).length
  })

  const pendingCount = allPlaces.filter(p => p.needsModeration && (!p.status || p.status === 'pending')).length

  const filteredIds = visiblePlaces.filter(loc => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'noturno') return loc.cat === 'noturno'
    if (activeFilter === 'transito') return loc.cat === 'transito'
    if (activeFilter === 'hot') return getHeatLevel(calcScore(loc.id, events, usersMap)) !== 'inactive'
    if (activeFilter === 'blitz') return events.some(e => e.locationId === loc.id && e.type === 'blitz')
    if (activeFilter === 'estabelecimento') return loc.cat === 'estabelecimento'
    return true
  }).map(l => l.id)

  if (loading) return (
    <div style={{ position:'fixed', inset:0, background:'var(--bg)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20 }}>
      <RuLogo size={40} />
      <div style={{ width:14, height:14, borderRadius:'50%', background:'var(--green)',
        boxShadow:'0 0 20px var(--green)', animation:'pulse 1.4s ease infinite' }}/>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.4);opacity:.6}}`}</style>
    </div>
  )

  if (!user) return <LoginScreen onLogin={login} loginWithEmail={loginWithEmail} registerWithEmail={registerWithEmail} resetPassword={resetPassword} authError={authError} setAuthError={setAuthError} />

  const NAV_TABS = [
    { id:'home',       label:'Início',      Icon: HomeIcon },
    { id:'map',        label:'Explorar',    Icon: ExploreIcon },
    { id:'add',        label:'',            Icon: null },      // FAB slot
    { id:'activities', label:'Atividades',  Icon: ActivityIcon },
    { id:'profile',    label:'Perfil',      Icon: ProfileIcon },
  ]

  return (
    <div style={{ position:'relative', height:'100dvh', overflow:'hidden',
      fontFamily:"'Plus Jakarta Sans',sans-serif", background:'var(--bg)', color:'var(--text)' }}>

      <NetworkBanner status={networkStatus} />
      <TrafficConfirmBanner
        prompt={trafficPrompt}
        onConfirm={confirmStillHappening}
        onResolve={markResolved}
        onDismiss={() => setTrafficPrompt(null)}
      />

      {/* ── MAP (always mounted, shown/hidden based on tab) ── */}
      <div style={{ position:'absolute', inset:0,
        opacity: activeTab==='map' ? 1 : 0,
        pointerEvents: activeTab==='map' ? 'all' : 'none',
        transition:'opacity .25s',
      }}>
        <MapView
          ref={mapRef}
          allPlaces={visiblePlaces}
          events={events}
          usersMap={usersMap}
          filteredIds={filteredIds}
          onLocationClick={handleMarkerClick}
          userPos={userPos}
          pickMode={pickMode}
          onPick={handlePick}
        />

        {/* Map top bar */}
        {!pickMode && (
          <div style={{
            position:'absolute', top:0, left:0, right:0, zIndex:500,
            padding:'calc(12px + var(--sat)) 16px 0',
            background:'linear-gradient(to bottom, rgba(11,20,16,.97) 65%, transparent)',
          }}>
            {/* Header row */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <RuLogo size={26} />
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                {onlineCount > 1 && (
                  <span style={{
                    background:'rgba(29,185,84,.12)', border:'1px solid rgba(29,185,84,.3)',
                    borderRadius:20, padding:'3px 10px', fontSize:10, color:'var(--green)',
                    fontFamily:"'Space Mono',monospace",
                  }}>● {onlineCount} online</span>
                )}
                {isAdmin && (
                  <button onClick={() => setAdminOpen(true)} style={{
                    position:'relative',
                    background: pendingCount > 0 ? 'rgba(255,214,10,.12)' : 'var(--surface2)',
                    border:`1px solid ${pendingCount > 0 ? 'rgba(255,214,10,.4)' : 'var(--border)'}`,
                    borderRadius:10, padding:'5px 10px', cursor:'pointer',
                    color: pendingCount > 0 ? 'var(--yellow)' : 'var(--muted)',
                    fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:12,
                  }}>
                    🛡️
                    {pendingCount > 0 && (
                      <span style={{
                        position:'absolute', top:-4, right:-4,
                        background:'var(--red)', color:'#fff', fontSize:9,
                        borderRadius:'50%', width:15, height:15,
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>{pendingCount}</span>
                    )}
                  </button>
                )}
                <div style={{ fontFamily:"'Space Mono',monospace",
                  background:'rgba(29,185,84,.1)', border:'1px solid rgba(29,185,84,.25)',
                  borderRadius:20, padding:'5px 12px', fontSize:11, color:'var(--green)' }}>
                  ⚡ {user.score ?? 0} pts
                </div>
                <div onClick={logout} title="Sair" style={{
                  width:34, height:34, borderRadius:'50%',
                  background:'var(--surface2)', border:'2px solid rgba(29,185,84,.35)',
                  cursor:'pointer', overflow:'hidden',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  {user.photo
                    ? <img src={user.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    : <span style={{ fontSize:15 }}>👤</span>}
                </div>
              </div>
            </div>

            {/* Search on map */}
            <div style={{
              display:'flex', alignItems:'center', gap:10,
              background:'rgba(19,31,24,.94)', border:'1px solid var(--border)',
              borderRadius:14, padding:'10px 14px', marginBottom:10,
              backdropFilter:'blur(10px)',
            }}>
              <SearchIcon />
              <input
                placeholder="Buscar lugares, comidas..."
                style={{ background:'none', border:'none', outline:'none', color:'var(--text)',
                  fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:13, flex:1 }}
              />
              <FilterIcon />
            </div>

            {/* Category chips */}
            <div style={{ display:'flex', gap:8, overflowX:'auto', scrollbarWidth:'none', paddingBottom:10 }}>
              {FILTERS.map(f => {
                const active = activeFilter === f.id
                return (
                  <button key={f.id+f.label} onClick={() => setActiveFilter(f.id)}
                    className={`chip${active ? ' active' : ''}`}
                    style={{ '--chip-col': f.col }}>
                    <span>{f.emoji}</span>
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Pick mode banner */}
        {pickMode && (
          <div style={{
            position:'absolute', top:0, left:0, right:0, zIndex:600,
            background:'rgba(29,185,84,.95)', padding:'calc(16px + var(--sat)) 16px 14px',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            animation:'slideDown .25s ease',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:20 }}>📍</span>
              <div>
                <div style={{ fontWeight:800, fontSize:14, color:'#0b1410' }}>Toque no mapa para marcar</div>
                <div style={{ fontSize:11, opacity:.8, color:'#0b1410' }}>Escolha o ponto exato do local</div>
              </div>
            </div>
            <button onClick={handleCancelAdd} style={{
              background:'rgba(0,0,0,.2)', border:'none', borderRadius:8,
              padding:'6px 12px', color:'#0b1410', cursor:'pointer',
              fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:12,
            }}>Cancelar</button>
          </div>
        )}

        {/* Bottom stats bar (map) */}
        {!pickMode && (
          <div style={{
            position:'absolute', bottom:0, left:0, right:0, zIndex:500,
            paddingTop:12, paddingLeft:16, paddingRight:16,
            paddingBottom:'calc(72px + env(safe-area-inset-bottom, 0px))',
            background:'linear-gradient(to top,rgba(11,20,16,.97) 55%,transparent)',
            display:'flex', gap:10, overflowX:'auto', scrollbarWidth:'none',
          }}>
            <button onClick={() => setNowOpen(true)} style={{
              flexShrink:0, minWidth:100,
              background: hotCount > 0 ? 'rgba(255,59,92,.12)' : 'var(--surface)',
              border:`1px solid ${hotCount > 0 ? 'rgba(255,59,92,.5)' : 'var(--border)'}`,
              borderRadius:14, padding:'10px 14px', cursor:'pointer',
              fontFamily:"'Plus Jakarta Sans',sans-serif", transition:'all .2s',
            }}>
              <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.1em',
                color: hotCount > 0 ? 'var(--red)' : 'var(--muted)', marginBottom:4 }}>🔴 Agora</div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:20, fontWeight:700,
                color: hotCount > 0 ? 'var(--red)' : 'var(--text)' }}>{hotCount}</div>
              <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>hotspots</div>
            </button>

            <MapStatCard label="📡 Reportes" value={totalActive} sub="última hora" color="var(--text)" />
            <MapStatCard label="🚦 Alertas"  value={alertCount}  sub="trânsito"   color="var(--yellow)" />
            <MapStatCard label="👥 Online"   value={onlineCount} sub="agora"      color="var(--text)" />
          </div>
        )}

        {/* Notif banner */}
        {notifBanner && permission === 'default' && !pickMode && (
          <div style={{
            position:'absolute', top:130, left:16, right:16, zIndex:550,
            background:'var(--surface)', border:'1px solid rgba(255,214,10,.35)',
            borderRadius:14, padding:'12px 14px',
            display:'flex', alignItems:'center', gap:10, animation:'slideDown .3s ease',
          }}>
            <span style={{ fontSize:20 }}>🔔</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:1 }}>Ativar alertas?</div>
              <div style={{ fontSize:11, color:'var(--muted)' }}>Avisos quando um local esquentar</div>
            </div>
            <button onClick={() => { requestPermission(); setNotifBanner(false) }} style={{
              background:'var(--green)', border:'none', borderRadius:8, padding:'6px 12px',
              fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:11, color:'#0b1410', cursor:'pointer',
            }}>Ativar</button>
            <button onClick={() => setNotifBanner(false)} style={{
              background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:16,
            }}>✕</button>
          </div>
        )}
      </div>

      {/* ── HOME TAB ── */}
      {activeTab === 'home' && (
        <div style={{ position:'absolute', inset:0, overflowY:'auto' }}>
          <HomePanel
            user={user}
            allPlaces={visiblePlaces}
            events={events}
            usersMap={usersMap}
            hotCount={hotCount}
            totalActive={totalActive}
            alertCount={alertCount}
            onlineCount={onlineCount}
            onLocationClick={(loc) => { setDetailLoc(loc) }}
            onStartAdd={handleStartPick}
            isAdmin={isAdmin}
            adminOpen={adminOpen}
            setAdminOpen={setAdminOpen}
            pendingCount={pendingCount}
          />
        </div>
      )}

      {/* ── ACTIVITIES TAB ── */}
      {activeTab === 'activities' && (
        <div style={{ position:'absolute', inset:0, overflowY:'auto' }}>
          <div style={{ paddingTop:'calc(14px + var(--sat))' }}>
            <ActivitiesPanel
              events={events}
              usersMap={usersMap}
              allPlaces={visiblePlaces}
              onLocationClick={(loc) => { setDetailLoc(loc); setActiveTab('map') }}
            />
          </div>
        </div>
      )}

      {/* ── PROFILE TAB ── */}
      {activeTab === 'profile' && (
        <div style={{ position:'absolute', inset:0, overflowY:'auto' }}>
          <div style={{ paddingTop:'calc(14px + var(--sat))' }}>
            <ProfilePanel user={user} onLogout={logout} onlineCount={onlineCount} />
          </div>
        </div>
      )}

      {/* ── BOTTOM NAVIGATION ── */}
      {!pickMode && (
        <div style={{
          position:'fixed', bottom:0, left:0, right:0, zIndex:900,
          background:'var(--surface)',
          borderTop:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-around',
          paddingBottom:'calc(8px + var(--sab))',
          paddingTop:8,
          backdropFilter:'blur(20px)',
        }}>
          {NAV_TABS.map(tab => {
            if (!tab.Icon) {
              // FAB
              return (
                <button key="fab" onClick={handleStartPick} style={{
                  width:54, height:54, borderRadius:'50%',
                  background:'var(--green)',
                  border:'none', cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow:'0 4px 20px rgba(29,185,84,.45)',
                  transition:'transform .15s, box-shadow .15s',
                  marginTop:-18, flexShrink:0,
                  color:'#0b1410',
                }}
                  onMouseDown={e => e.currentTarget.style.transform='scale(.93)'}
                  onMouseUp={e => e.currentTarget.style.transform='scale(1)'}
                  onTouchStart={e => e.currentTarget.style.transform='scale(.93)'}
                  onTouchEnd={e => e.currentTarget.style.transform='scale(1)'}
                >
                  <PlusIcon />
                </button>
              )
            }
            const active = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                padding:'6px 14px', cursor:'pointer',
                border:'none', background:'none',
                color: active ? 'var(--green)' : 'var(--muted)',
                fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600,
                fontSize:10, transition:'color .2s',
              }}>
                <div style={{ width:22, height:22 }}><tab.Icon /></div>
                {tab.label}
              </button>
            )
          })}
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{
          position:'fixed', bottom:90, left:'50%', transform:'translateX(-50%)',
          zIndex:3000, background:toast.bg, color:toast.color,
          padding:'10px 22px', borderRadius:22, fontWeight:700, fontSize:13,
          boxShadow:'0 4px 24px rgba(0,0,0,.5)', animation:'toastIn .3s ease',
          whiteSpace:'nowrap', pointerEvents:'none',
        }}>{toast.msg}</div>
      )}

      {/* POINTS ALERT */}
      {pointsAlert && (
        <div style={{
          position:'fixed', top:'42%', left:'50%', transform:'translateX(-50%)',
          zIndex:3000, textAlign:'center', animation:'pointsIn .35s ease', pointerEvents:'none',
        }}>
          <div style={{ background:'rgba(19,31,24,.97)', border:'1px solid var(--border)',
            borderRadius:20, padding:'20px 36px' }}>
            <div style={{ fontSize:32 }}>⚡</div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:32, fontWeight:700, color:'var(--green)' }}>+{pointsAlert}</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>pontos</div>
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
      <AddLocationPanel open={addLocOpen} coords={pickedCoords}
        onClose={handleCancelAdd} onSave={handleSavePlace} />
      <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} adminUid={user?.uid} />

      <style>{`
        @keyframes pulse     { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.3);opacity:.7} }
        @keyframes toastIn   { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeUp    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pointsIn  { 0%{opacity:0;transform:translateX(-50%) scale(.7)} 70%{transform:translateX(-50%) scale(1.1)} 100%{opacity:1;transform:translateX(-50%) scale(1)} }
        @keyframes markerPulse { 0%{transform:scale(1);opacity:.7} 50%{transform:scale(1.5);opacity:.2} 100%{transform:scale(1);opacity:.7} }
      `}</style>
    </div>
  )
}

function MapStatCard({ label, value, sub, color }) {
  return (
    <div style={{
      flexShrink:0, minWidth:110, background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:14, padding:'10px 14px',
    }}>
      <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--muted)', marginBottom:4 }}>{label}</div>
      <div style={{ fontFamily:"'Space Mono',monospace", fontSize:20, fontWeight:700, color }}>{value}</div>
      <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>{sub}</div>
    </div>
  )
}
