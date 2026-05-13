import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ref, update, increment, get, set, remove, onValue } from 'firebase/database'
import { db } from './lib/firebase'
import { useAuth }           from './hooks/useAuth'
import { useEvents }         from './hooks/useEvents'
import { useOnline }         from './hooks/useOnline'
import { useNotifications }  from './hooks/useNotifications'
import { usePlaces }         from './hooks/usePlaces'
import { EVENT_META, DEFAULT_LAT, DEFAULT_LNG } from './lib/constants'
import { calcScore, getHeatLevel } from './lib/hotspot'
import { checkAlerts }       from './lib/alerts'
import { seedIfEmpty }       from './lib/seed'
import { uploadToCloudinary } from './lib/cloudinary'
import LoginScreen           from './components/LoginScreen'
import MapView               from './components/MapView'
import ReportPanel           from './components/ReportPanel'
import DetailPanel           from './components/DetailPanel'
import NowPanel              from './components/NowPanel'
import AddLocationPanel      from './components/AddLocationPanel'
import AdminPanel            from './components/AdminPanel'
import UserProfilePanel      from './components/UserProfilePanel'
import TrafficConfirmBanner  from './components/TrafficConfirmBanner'
import { useTrafficConfirm } from './hooks/useTrafficConfirm'
import { useNetworkStatus }  from './hooks/useNetworkStatus'
import NetworkBanner         from './components/NetworkBanner'
import NotificationsPanel, { useUserNotifications } from './components/NotificationsPanel'
import PrivateChatPanel,   { usePrivateChats }       from './components/PrivateChatPanel'
import RewardsPanel                                   from './components/RewardsPanel'

/* ── Icons ──────────────────────────────────────────────────────────────────── */
const IC = {
  Home: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Search: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="24" height="24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Activity: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  User: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Bell: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Chat: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Filter: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>,
  SearchSm: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  MapPin: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Star: ({filled}) => <svg viewBox="0 0 24 24" fill={filled?'var(--primary)':'none'} stroke="var(--primary)" strokeWidth="2" width="13" height="13"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>,
  ChevronRight: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>,
  Settings: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
}

/* ── Logo Urbyn 3.0 ──────────────────────────────────────────────────────────── */
function UrbynLogo({ size=28 }) {
  return (
    <div style={{display:'flex', alignItems:'center', gap:8}}>
      <div style={{
        width:size, height:size, borderRadius:size*.28,
        background:'linear-gradient(135deg,#4f8eff,#7c5cfc,#b44cf0)',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'0 0 20px rgba(79,142,255,0.45)', flexShrink:0,
      }}>
        <svg width={size*.58} height={size*.58} viewBox="0 0 24 24" fill="none">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="white" opacity=".95"/>
          <circle cx="12" cy="9" r="2.5" fill="white"/>
        </svg>
      </div>
      <span style={{
        fontSize:size*.92, fontWeight:900, color:'var(--text)',
        fontFamily:"'Outfit',sans-serif", letterSpacing:'-.04em', lineHeight:1,
      }}>urbyn</span>
    </div>
  )
}

/* ── Category filters ────────────────────────────────────────────────────────── */
const FILTERS = [
  {id:'all',           label:'Todos',        emoji:'🗺️'},
  {id:'estabelecimento',label:'Cafeterias',   emoji:'☕'},
  {id:'noturno',       label:'Restaurantes',  emoji:'🍽️'},
  {id:'bar',           label:'Bares',         emoji:'🍺'},
  {id:'show',          label:'Arte & Cultura',emoji:'🎭'},
  {id:'parque',        label:'Parques',        emoji:'🌿'},
  {id:'hot',           label:'Em alta',       emoji:'🔥'},
  {id:'transito',      label:'Trânsito',      emoji:'🚦'},
  {id:'blitz',         label:'Blitz',         emoji:'🚔'},
]

const CAT_EMOJI = {noturno:'🌙',transito:'🚦',estabelecimento:'☕',parque:'🌿',comercio:'🏪',show:'🎭'}
const CAT_LABEL = {noturno:'Noturno',transito:'Trânsito',estabelecimento:'Cafeteria/Bar',parque:'Parque',comercio:'Comércio',show:'Show'}

/* ── Stars ────────────────────────────────────────────────────────────────────── */
function Stars({score}) {
  const s = Math.min(5, Math.max(1, Math.round(score)))
  return (
    <div style={{display:'flex', gap:2}}>
      {[1,2,3,4,5].map(i=><IC.Star key={i} filled={i<=s}/>)}
    </div>
  )
}

/* ── Home Tab ─────────────────────────────────────────────────────────────────── */
function HomeTab({user, allPlaces, events, usersMap, hotCount, totalActive, alertCount, onlineCount, onPlace, onStartAdd, isAdmin, setAdminOpen, pendingCount, logout, onCategorySelect, onCityClick, onBell, notifCount, onChat, chatUnread, onRewards}) {
  const now = Date.now()
  const trending = [...allPlaces]
    .map(p=>({...p, _score:calcScore(p.id, events, usersMap)}))
    .sort((a,b)=>b._score-a._score)
    .slice(0,8)

  const recent = [...allPlaces]
    .sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))
    .slice(0,8)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocus, setSearchFocus] = useState(false)

  const CAT_LABEL2 = { noturno:'Bar/Balada', transito:'Trânsito', estabelecimento:'Estabelecimento', parque:'Parque', comercio:'Comércio', show:'Show', bar:'Bar', evento:'Evento', cafe:'Café' }
  const CAT_EMOJI2 = { noturno:'🌙', transito:'🚦', estabelecimento:'🏪', parque:'🌿', comercio:'🏬', show:'🎭', bar:'🍺', evento:'🎉', cafe:'☕' }

  const searchResults = searchQuery.trim().length >= 2
    ? allPlaces.filter(p =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (CAT_LABEL2[p.cat]||'').toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8)
    : []

  const showResults = searchFocus && searchQuery.trim().length >= 2

  const greeting = (() => {
    const h = new Date().getHours()
    if (h >= 5  && h < 12) return { text: 'Bom dia', sub: 'Veja o que está rolando agora ☀️' }
    if (h >= 12 && h < 18) return { text: 'Boa tarde', sub: 'A cidade está ativa 🌤️' }
    if (h >= 18 && h < 23) return { text: 'Boa noite', sub: 'Hora de explorar a cidade 🌙' }
    return { text: 'Madrugada', sub: 'Ainda tem coisa rolando por aí 🔥' }
  })()

  return (
    <div style={{
      position:'absolute', inset:0, overflowY:'auto', scrollbarWidth:'none',
      paddingBottom:'calc(100px + env(safe-area-inset-bottom,0px))',
      background:'var(--bg)',
    }}>

      {/* ── Sticky header ── */}
      <div style={{
        position:'sticky', top:0, zIndex:100,
        background:'rgba(8,8,16,0.92)',
        backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        padding:'calc(12px + var(--sat)) 16px 12px',
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <UrbynLogo size={28}/>
            <button onClick={onCityClick} style={{
              display:'flex', alignItems:'center', gap:4,
              background:'rgba(255,255,255,0.05)',
              border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:999, padding:'5px 10px',
              fontSize:11, color:'var(--muted)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif",
            }}>
              <IC.MapPin/>
              <span style={{fontWeight:600}}>Bauru, SP</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>

          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            {isAdmin && (
              <button onClick={()=>setAdminOpen(true)} className="btn-icon" style={{
                position:'relative',
                background:pendingCount>0?'rgba(255,211,42,0.1)':'',
                borderColor:pendingCount>0?'rgba(255,211,42,0.3)':'',
                color:pendingCount>0?'var(--yellow)':'var(--muted)',
                fontSize:15,
              }}>
                🛡️
                {pendingCount>0 && <span className="badge">{pendingCount}</span>}
              </button>
            )}
            <button onClick={onChat} className="btn-icon" style={{position:'relative'}}>
              <IC.Chat/>
              {chatUnread>0 && <span className="badge badge-brand">{chatUnread>9?'9+':chatUnread}</span>}
            </button>
            <button onClick={onBell} className="btn-icon" style={{position:'relative'}}>
              <IC.Bell/>
              {notifCount>0 && <span className="badge">{notifCount>9?'9+':notifCount}</span>}
            </button>
            <div className="avatar avatar-ring" style={{width:36, height:36, cursor:'pointer'}}>
              {user.photo ? <img src={user.photo} alt=""/> : '👤'}
            </div>
          </div>
        </div>
      </div>

      <div style={{padding:'20px 16px 0'}}>

        {/* ── Greeting ── */}
        <div style={{marginBottom:20}}>
          <div style={{
            fontFamily:"'Outfit',sans-serif", fontSize:26, fontWeight:800,
            letterSpacing:'-.03em', lineHeight:1.1, marginBottom:5,
          }}>{greeting.text}, <span className="grad-text">urbano.</span></div>
          <div style={{fontSize:13, color:'var(--muted)', fontWeight:500}}>{greeting.sub}</div>
        </div>

        {/* ── Search ── */}
        <div style={{position:'relative', marginBottom:20}}>
          <div className="search-bar" style={{
            borderRadius: showResults ? '16px 16px 0 0' : 999,
          }}>
            <IC.SearchSm style={{color:'var(--muted)', flexShrink:0}}/>
            <input
              value={searchQuery}
              onChange={e=>setSearchQuery(e.target.value)}
              onFocus={()=>setSearchFocus(true)}
              onBlur={()=>setTimeout(()=>setSearchFocus(false),150)}
              placeholder="Explorar lugares, experiências..."/>
            {searchQuery
              ? <button onClick={()=>setSearchQuery('')} style={{background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:16, padding:'0 2px'}}>✕</button>
              : <IC.Filter style={{color:'var(--muted)', flexShrink:0}}/>}
          </div>
          {showResults && (
            <div style={{
              position:'absolute', left:0, right:0, zIndex:500,
              background:'rgba(8,8,20,0.96)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
              border:'1px solid rgba(79,142,255,0.3)', borderTop:'none',
              borderRadius:'0 0 16px 16px', overflow:'hidden',
              boxShadow:'0 12px 32px rgba(0,0,0,0.6)',
            }}>
              {searchResults.length===0 ? (
                <div style={{padding:'16px', textAlign:'center', color:'var(--muted)', fontSize:13}}>
                  Nenhum resultado para "{searchQuery}"
                </div>
              ) : searchResults.map(p=>(
                <div key={p.id}
                  onMouseDown={()=>{onPlace(p); setSearchQuery(''); setSearchFocus(false)}}
                  style={{
                    display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
                    borderBottom:'1px solid rgba(255,255,255,0.05)', cursor:'pointer',
                    transition:'background .15s',
                  }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                >
                  <div style={{
                    width:38, height:38, borderRadius:12, flexShrink:0,
                    background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
                  }}>
                    {p.iconEmoji||CAT_EMOJI2[p.cat]||'📍'}
                  </div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{p.name}</div>
                    <div style={{fontSize:11, color:'var(--muted)', marginTop:1}}>{CAT_LABEL2[p.cat]||'Local'}{p.address?` · ${p.address}`:''}</div>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{color:'var(--dim)', flexShrink:0}}><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Live stats strip ── */}
        <div className="scroll-row" style={{marginBottom:24}}>
          {[
            {icon:'🔥', val:hotCount,    label:'Hotspots', col:'var(--hot)',    glow:'rgba(255,71,87,0.25)'},
            {icon:'📡', val:totalActive, label:'Reportes',  col:'var(--text)',  glow:'rgba(255,255,255,0.05)'},
            {icon:'🚦', val:alertCount,  label:'Alertas',   col:'var(--yellow)',glow:'rgba(255,211,42,0.2)'},
            {icon:'👥', val:onlineCount, label:'Online',    col:'var(--cyber)', glow:'rgba(0,245,160,0.2)'},
          ].map((s,i)=>(
            <div key={i} className="stat-card" style={{
              boxShadow:s.val>0?`0 0 20px ${s.glow}`:'none',
              borderColor:s.val>0?`${s.glow}`.replace('0.2','0.3').replace('0.25','0.35'):'rgba(255,255,255,0.07)',
            }}>
              <div style={{fontSize:16, marginBottom:5}}>{s.icon}</div>
              <div className="stat-value" style={{color:s.col}}>{s.val}</div>
              <div className="stat-label" style={{marginTop:4, marginBottom:0}}>{s.label}</div>
            </div>
          ))}
          <button onClick={onRewards} className="stat-card" style={{
            background:'linear-gradient(135deg,rgba(0,245,160,0.08),rgba(0,200,122,0.04))',
            borderColor:'rgba(0,245,160,0.25)',
            boxShadow:'0 0 20px rgba(0,245,160,0.1)',
            cursor:'pointer',
          }}>
            <div style={{fontSize:16, marginBottom:5}}>⚡</div>
            <div className="stat-value" style={{color:'var(--cyber)',fontSize:16}}>{user.score??0}</div>
            <div className="stat-label" style={{marginTop:4, marginBottom:0, color:'var(--cyber)'}}>Pontos</div>
          </button>
        </div>

        {/* ── Categorias ── */}
        <SectionHeader title="Categorias" action="Ver mapa"/>
        <div className="scroll-row" style={{marginBottom:24}}>
          {[
            {emoji:'☕', label:'Cafés',         filter:'estabelecimento'},
            {emoji:'🍽️', label:'Restaurantes',  filter:'noturno'},
            {emoji:'🍺', label:'Bares',          filter:'bar'},
            {emoji:'🎭', label:'Arte',           filter:'show'},
            {emoji:'🌿', label:'Parques',         filter:'parque'},
            {emoji:'🚦', label:'Trânsito',       filter:'transito'},
          ].map((c,i)=>(
            <button key={i} onClick={()=>onCategorySelect(c.filter)} style={{
              flexShrink:0, textAlign:'center', cursor:'pointer',
              background:'rgba(255,255,255,0.04)',
              border:'1px solid rgba(255,255,255,0.07)',
              borderRadius:18, padding:'14px 12px', minWidth:70,
              transition:'border-color .2s, background .2s, transform .15s',
              fontFamily:"'DM Sans',sans-serif",
            }}
              onMouseDown={e=>e.currentTarget.style.transform='scale(.93)'}
              onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
              onTouchStart={e=>e.currentTarget.style.transform='scale(.93)'}
              onTouchEnd={e=>e.currentTarget.style.transform='scale(1)'}
              onMouseEnter={e=>{ e.currentTarget.style.background='rgba(79,142,255,0.08)'; e.currentTarget.style.borderColor='rgba(79,142,255,0.3)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; }}
            >
              <div style={{fontSize:24, marginBottom:6}}>{c.emoji}</div>
              <div style={{fontSize:10, color:'var(--muted)', fontWeight:600, letterSpacing:'.01em'}}>{c.label}</div>
            </button>
          ))}
        </div>

        {/* ── Em alta ── */}
        <SectionHeader title="Em alta agora" action="Ver todos"/>
        <div className="scroll-row" style={{marginBottom:28, paddingBottom:4}}>
          {trending.map(p=>(
            <div key={p.id} onClick={()=>onPlace(p)} style={{
              flexShrink:0, width:158,
              background:'rgba(255,255,255,0.04)',
              border:'1px solid rgba(255,255,255,0.07)',
              borderRadius:20, overflow:'hidden', cursor:'pointer',
              transition:'border-color .2s, transform .2s',
            }}
              onMouseDown={e=>e.currentTarget.style.transform='scale(.97)'}
              onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
              onTouchStart={e=>e.currentTarget.style.transform='scale(.97)'}
              onTouchEnd={e=>e.currentTarget.style.transform='scale(1)'}
            >
              <div style={{
                height:88, background:`linear-gradient(135deg, rgba(79,142,255,0.12), rgba(124,92,252,0.12))`,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:34,
                position:'relative', borderBottom:'1px solid rgba(255,255,255,0.06)',
              }}>
                {CAT_EMOJI[p.cat]||'📍'}
                {p._score>6 && (
                  <div style={{
                    position:'absolute', top:7, right:7,
                    background:'rgba(255,71,87,0.9)', borderRadius:20,
                    padding:'2px 8px', fontSize:9, fontWeight:800, color:'#fff',
                    backdropFilter:'blur(8px)',
                  }}>🔥 HOT</div>
                )}
              </div>
              <div style={{padding:'10px 12px'}}>
                <div style={{
                  fontFamily:"'Outfit',sans-serif",
                  fontSize:12, fontWeight:700, marginBottom:3,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                }}>{p.name}</div>
                <div style={{fontSize:10, color:'var(--muted)', marginBottom:6}}>{CAT_LABEL[p.cat]||'Local'}</div>
                <div style={{display:'flex', alignItems:'center', gap:4}}>
                  <div style={{
                    height:3, flex:1, background:'rgba(255,255,255,0.08)',
                    borderRadius:999, overflow:'hidden',
                  }}>
                    <div style={{
                      height:'100%', borderRadius:999,
                      background:'linear-gradient(90deg,#4f8eff,#7c5cfc)',
                      width:`${Math.min(100, p._score * 20)}%`,
                      transition:'width .3s',
                    }}/>
                  </div>
                  <span style={{fontFamily:"'Space Mono',monospace", fontSize:10, color:'var(--electric)', fontWeight:700}}>
                    {Math.min(5,Math.max(1,p._score)).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Recentes ── */}
        <SectionHeader title="Adicionados recentemente"/>
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {recent.map(p=>(
            <div key={p.id} onClick={()=>onPlace(p)} style={{
              display:'flex', alignItems:'center', gap:13,
              background:'rgba(255,255,255,0.03)',
              border:'1px solid rgba(255,255,255,0.07)',
              borderRadius:18, padding:'12px 14px', cursor:'pointer',
              transition:'border-color .15s, background .15s',
            }}
              onMouseEnter={e=>{ e.currentTarget.style.background='rgba(79,142,255,0.05)'; e.currentTarget.style.borderColor='rgba(79,142,255,0.2)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; }}
            >
              <div style={{
                width:48, height:48, borderRadius:14, flexShrink:0,
                background:'rgba(79,142,255,0.1)',
                border:'1px solid rgba(79,142,255,0.2)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
              }}>{CAT_EMOJI[p.cat]||'📍'}</div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{
                  fontFamily:"'Outfit',sans-serif",
                  fontSize:14, fontWeight:700,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                }}>{p.name}</div>
                <div style={{fontSize:11, color:'var(--muted)', marginTop:2}}>{CAT_LABEL[p.cat]||'Local'} · Bauru, SP</div>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="14" height="14" style={{color:'var(--dim)', flexShrink:0}}><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          ))}
        </div>

        <div style={{height:8}}/>
      </div>
    </div>
  )
}

/* ── Atividades Tab ───────────────────────────────────────────────────────────── */
function ActivitiesTab({events, usersMap, allPlaces, onPlace, user, saved, following, onViewUser}) {
  const now = Date.now()
  const timeAgo = ts => {
    const d = Math.floor((now-ts)/1000)
    if (d<60) return `${d}s atrás`
    if (d<3600) return `${Math.floor(d/60)} min`
    if (d<86400) return `${Math.floor(d/3600)}h`
    return `${Math.floor(d/86400)}d`
  }
  const [tab, setTab] = useState('todos')

  const feedTodos = [...events].sort((a,b)=>b.ts-a.ts).slice(0,40)

  // "salvos" — reportes dos lugares salvos pelo usuário
  const savedPlaceIds = Object.keys(saved||{})
  const feedSalvos = [...events]
    .filter(e => savedPlaceIds.includes(e.locationId))
    .sort((a,b) => b.ts - a.ts)
    .slice(0, 40)

  const followingIds = Object.keys(following||{})
  const feedSeguindo = [...events]
    .filter(e=>followingIds.includes(e.userId))
    .sort((a,b)=>b.ts-a.ts).slice(0,40)

  const TABS = ['todos','salvos','seguindo']

  const EmptyState = ({msg,sub}) => (
    <div style={{textAlign:'center', padding:'56px 0', color:'var(--muted)'}}>
      <div style={{fontSize:40, marginBottom:12}}>📭</div>
      <div style={{fontSize:14, fontWeight:600, marginBottom:6}}>{msg}</div>
      <div style={{fontSize:12}}>{sub}</div>
    </div>
  )

  return (
    <div style={{
      position:'absolute', inset:0, overflowY:'auto',
      paddingBottom:'calc(72px + env(safe-area-inset-bottom,0px))',
    }}>
      {/* Header */}
      <div style={{
        position:'sticky', top:0, zIndex:100,
        background:'var(--bg)',
        padding:'calc(14px + var(--sat)) 16px 12px',
        borderBottom:'1px solid var(--border)',
      }}>
        <div style={{fontSize:20, fontWeight:800, marginBottom:14}}>Atividades</div>
        <div style={{display:'flex', gap:8}}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{
              padding:'7px 13px', borderRadius:100,
              background:tab===t?'var(--primary-dim)':'var(--surface2)',
              border:`1px solid ${tab===t?'var(--primary)':'var(--border)'}`,
              color:tab===t?'var(--primary)':'var(--muted)',
              fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600, fontSize:11, cursor:'pointer',
              textTransform:'capitalize',
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{padding:'0 16px'}}>
        {/* ── TODOS ── */}
        {tab==='todos' && (
          feedTodos.length===0
            ? <EmptyState msg="Nenhuma atividade" sub="Explore a cidade e reporte ocorrências!"/>
            : feedTodos.map(ev=>{
                const meta  = EVENT_META[ev.type]
                const place = allPlaces.find(p=>p.id===ev.locationId)
                const uInfo = usersMap[ev.userId]
                return (
                  <div key={ev.id} onClick={()=>place&&onPlace(place)} style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'14px 0', borderBottom:'1px solid var(--border)',
                    cursor:place?'pointer':'default',
                  }}>
                    <div style={{
                      width:42, height:42, borderRadius:'50%', flexShrink:0,
                      background:`${meta?.color||'var(--green)'}18`,
                      border:`1px solid ${meta?.color||'var(--green)'}33`,
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:20,
                    }}>{meta?.emoji||'📍'}</div>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{fontSize:13, fontWeight:600, lineHeight:1.5, marginBottom:2}}>
                        <span
                          onClick={e=>{e.stopPropagation();onViewUser&&onViewUser(ev.userId)}}
                          style={{color:'var(--green)', cursor:'pointer', textDecoration:'underline', textDecorationColor:'transparent'}}
                          onMouseEnter={e=>e.currentTarget.style.textDecorationColor='var(--green)'}
                          onMouseLeave={e=>e.currentTarget.style.textDecorationColor='transparent'}
                        >{ev.userName?.split(' ')[0]||'Alguém'}</span>
                        {' '}marcou{' '}
                        <span style={{color:meta?.color||'var(--green)'}}>{meta?.label||ev.type}</span>
                      </div>
                      <div style={{fontSize:12, color:'var(--muted)'}}>
                        {place?`em ${place.name}`:'local desconhecido'}
                      </div>
                    </div>
                    <div style={{fontSize:11, color:'var(--dim)', flexShrink:0}}>{timeAgo(ev.ts)}</div>
                  </div>
                )
              })
        )}

        {/* ── SALVOS ── */}
        {tab==='salvos' && (
          savedPlaceIds.length===0
            ? <EmptyState msg="Nenhum lugar salvo" sub="Salve lugares para ver o que está rolando!"/>
            : feedSalvos.length===0
              ? <EmptyState msg="Nada rolando nos seus salvos" sub="Os locais salvos estão tranquilos agora!"/>
              : feedSalvos.map(ev=>{
                  const meta  = EVENT_META[ev.type]
                  const place = allPlaces.find(p=>p.id===ev.locationId)
                  const uInfo = usersMap[ev.userId]
                  return (
                    <div key={ev.id} onClick={()=>place&&onPlace(place)} style={{
                      display:'flex', alignItems:'center', gap:12,
                      padding:'14px 0', borderBottom:'1px solid var(--border)',
                      cursor:place?'pointer':'default',
                    }}>
                      <div style={{
                        width:42, height:42, borderRadius:'50%', flexShrink:0,
                        background:`${meta?.color||'var(--green)'}18`,
                        border:`1px solid ${meta?.color||'var(--green)'}33`,
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:20,
                      }}>{meta?.emoji||'📍'}</div>
                      <div style={{flex:1, minWidth:0}}>
                        <div style={{fontSize:13, fontWeight:700, marginBottom:3}}>
                          <span style={{color:meta?.color||'var(--green)'}}>{meta?.label||ev.type}</span>
                          {place && <span style={{color:'var(--muted)', fontWeight:500}}> em {place.name}</span>}
                        </div>
                        <div style={{fontSize:12, color:'var(--muted)'}}>
                          {ev.userName?.split(' ')[0]||'Alguém'} reportou · {place?`${place.iconEmoji||CAT_EMOJI[place.cat]||'📍'} salvo`:''}
                        </div>
                      </div>
                      <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4}}>
                        <div style={{fontSize:11, color:'var(--dim)'}}>{timeAgo(ev.ts)}</div>
                        <div style={{fontSize:16}}>🔖</div>
                      </div>
                    </div>
                  )
                })
        )}

        {/* ── SEGUINDO ── */}
        {tab==='seguindo' && (
          followingIds.length===0
            ? <EmptyState msg="Você não segue ninguém" sub="Siga urbanos para ver o feed deles!"/>
            : feedSeguindo.length===0
              ? <EmptyState msg="Nenhuma atividade recente" sub="Os urbanos que você segue ainda não postaram!"/>
              : feedSeguindo.map(ev=>{
                  const meta  = EVENT_META[ev.type]
                  const place = allPlaces.find(p=>p.id===ev.locationId)
                  return (
                    <div key={ev.id} onClick={()=>place&&onPlace(place)} style={{
                      display:'flex', alignItems:'center', gap:12,
                      padding:'14px 0', borderBottom:'1px solid var(--border)',
                      cursor:place?'pointer':'default',
                    }}>
                      <div style={{
                        width:42, height:42, borderRadius:'50%', flexShrink:0,
                        background:`${meta?.color||'var(--green)'}18`,
                        border:`1px solid ${meta?.color||'var(--green)'}33`,
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:20,
                      }}>{meta?.emoji||'📍'}</div>
                      <div style={{flex:1, minWidth:0}}>
                        <div style={{fontSize:13, fontWeight:600, lineHeight:1.5, marginBottom:2}}>
                          <span style={{color:'var(--green)'}}>{ev.userName?.split(' ')[0]||'Alguém'}</span>
                          {' '}marcou{' '}
                          <span style={{color:meta?.color||'var(--green)'}}>{meta?.label||ev.type}</span>
                        </div>
                        <div style={{fontSize:12, color:'var(--muted)'}}>
                          {place?`em ${place.name}`:'local desconhecido'}
                        </div>
                      </div>
                      <div style={{fontSize:11, color:'var(--dim)', flexShrink:0}}>{timeAgo(ev.ts)}</div>
                    </div>
                  )
                })
        )}
      </div>
    </div>
  )
}

/* ── Perfil Tab ───────────────────────────────────────────────────────────────── */
function ProfileTab({user, onLogout, onlineCount, events, saved, following, onUpdateProfile, onSettings, onViewUser}) {
  const myEvents = events.filter(e=>e.userId===user?.uid)
  const savedPlaces = Object.values(saved||{})
  const followingList = Object.entries(following||{}).map(([uid,info])=>({uid,...info}))

  const [profileTab, setProfileTab] = useState('avaliacoes')
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(user?.name||'')
  const [editPhoto, setEditPhoto] = useState(null)
  const [editPhotoPreview, setEditPhotoPreview] = useState(null)
  const [editCover, setEditCover] = useState(null)
  const [editCoverPreview, setEditCoverPreview] = useState(null)
  const [saving, setSaving] = useState(false)

  const handlePhotoChange = e => {
    const file = e.target.files?.[0]; if (!file) return
    setEditPhoto(file)
    const r = new FileReader(); r.onload = ev=>setEditPhotoPreview(ev.target.result); r.readAsDataURL(file)
  }
  const handleCoverChange = e => {
    const file = e.target.files?.[0]; if (!file) return
    setEditCover(file)
    const r = new FileReader(); r.onload = ev=>setEditCoverPreview(ev.target.result); r.readAsDataURL(file)
  }

  const handleSaveProfile = async () => {
    if (!editName.trim()) return
    setSaving(true)
    try {
      let photoUrl = user.photo
      let coverUrl = user.coverUrl
      if (editPhoto) photoUrl = await uploadToCloudinary(editPhoto)
      if (editCover) coverUrl = await uploadToCloudinary(editCover)
      await onUpdateProfile({name:editName.trim(), photo:photoUrl, coverUrl})
      setEditing(false); setEditPhoto(null); setEditPhotoPreview(null)
      setEditCover(null); setEditCoverPreview(null)
    } catch(e) { console.error(e); alert(e.message) }
    setSaving(false)
  }

  const PROFILE_TABS = [
    {id:'avaliacoes', label:'Avaliações'},
    {id:'salvos',     label:'Salvos'},
    {id:'seguindo',   label:'Seguindo'},
  ]

  return (
    <div style={{
      position:'absolute', inset:0, overflowY:'auto',
      paddingBottom:'calc(72px + env(safe-area-inset-bottom,0px))',
    }}>
      {/* Cover photo area */}
      <div style={{
        height:110, position:'relative', overflow:'hidden',
        background:'linear-gradient(135deg, #0f2414, #1a3a20)',
      }}>
        {user.coverUrl&&<img src={user.coverUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover',opacity:.7}}/>}
      </div>

      {/* Header */}
      <div style={{padding:'0 16px 16px', borderBottom:'1px solid var(--border)'}}>
        {/* Title row */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, paddingTop:12}}>
          <div style={{fontSize:20, fontWeight:800}}>Perfil</div>
          <div style={{display:'flex', gap:8}}>
            <button onClick={()=>{setEditing(true);setEditName(user?.name||'')}} style={{
              width:34, height:34, borderRadius:'50%',
              background:'var(--surface2)', border:'1px solid var(--border)',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', color:'var(--muted)',
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button onClick={onSettings} style={{
              width:34, height:34, borderRadius:'50%',
              background:'var(--surface2)', border:'1px solid var(--border)',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', color:'var(--muted)',
            }}><IC.Settings/></button>
          </div>
        </div>

        {/* Avatar + info */}
        <div style={{display:'flex', alignItems:'center', gap:16, marginBottom:20}}>
          <div style={{position:'relative'}}>
            <div style={{
              width:76, height:76, borderRadius:'50%', flexShrink:0,
              background:'var(--surface3)', border:'3px solid var(--primary)',
              overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32,
            }}>
              {user.photo?<img src={user.photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:'👤'}
            </div>
            <button onClick={()=>{setEditing(true);setEditName(user?.name||'')}} style={{
              position:'absolute', bottom:-2, right:-2,
              width:24, height:24, borderRadius:'50%',
              background:'linear-gradient(135deg,var(--primary),var(--accent))', border:'2px solid var(--bg)',
              display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#052e16" strokeWidth="2.5" width="11" height="11">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </button>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:18, fontWeight:800, marginBottom:2}}>{user.name||'Urbano'}</div>
            <div style={{fontSize:12, color:'var(--muted)', marginBottom:6}}>
              @{(user.name||'user').toLowerCase().replace(/\s+/g,'')}
            </div>
            {user.bio && (
              <div style={{fontSize:12, color:'var(--text2)', lineHeight:1.6, marginBottom:6}}>
                {user.bio}
              </div>
            )}
            <div style={{
              display:'inline-flex', alignItems:'center', gap:5,
              background:'var(--primary-dim)', border:'1px solid rgba(255,92,53,.25)',
              borderRadius:100, padding:'3px 10px',
              fontSize:11, color:'var(--green)', fontWeight:700,
            }}>🏆 Explorador Urbano</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10}}>
          {[
            {val:myEvents.length||user.reports||0, label:'Avaliações'},
            {val:Object.keys(following||{}).length, label:'Seguindo'},
            {val:user.followers||0, label:'Seguidores'},
          ].map((s,i)=>(
            <div key={i} style={{
              background:'var(--surface2)', border:'1px solid var(--border)',
              borderRadius:14, padding:'14px 8px', textAlign:'center',
            }}>
              <div style={{fontFamily:"'Syne',monospace", fontSize:22, fontWeight:700, marginBottom:3}}>{s.val}</div>
              <div style={{fontSize:11, color:'var(--muted)'}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{padding:'16px 16px 0'}}>
        {/* Pontuação */}
        <div style={{
          background:'var(--primary-dim)', border:'1px solid rgba(255,92,53,.2)',
          borderRadius:16, padding:16, marginBottom:20,
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div>
            <div style={{fontSize:10, textTransform:'uppercase', letterSpacing:'.12em', color:'var(--muted)', marginBottom:4}}>⚡ PONTUAÇÃO TOTAL</div>
            <div style={{fontFamily:"'Syne',monospace", fontSize:32, fontWeight:700, color:'var(--green)'}}>
              {user.score??0} <span style={{fontSize:14, color:'var(--muted)'}}>pts</span>
            </div>
          </div>
          <div style={{fontSize:40}}>🌟</div>
        </div>

        {/* Sub-tabs */}
        <div style={{display:'flex', gap:0, borderBottom:'1px solid var(--border)', marginBottom:16}}>
          {PROFILE_TABS.map(t=>(
            <button key={t.id} onClick={()=>setProfileTab(t.id)} style={{
              flex:1, padding:'10px 0',
              background:'none', border:'none',
              borderBottom:`2px solid ${profileTab===t.id?'var(--primary)':'transparent'}`,
              color:profileTab===t.id?'var(--primary)':'var(--muted)',
              fontSize:12, fontWeight:profileTab===t.id?700:500,
              cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif",
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── AVALIAÇÕES ── */}
        {profileTab==='avaliacoes' && (
          myEvents.length===0
            ? <div style={{textAlign:'center', padding:'40px 0', color:'var(--muted)'}}>
                <div style={{fontSize:32, marginBottom:8}}>📝</div>
                <div style={{fontSize:13}}>Nenhuma avaliação ainda</div>
              </div>
            : myEvents.slice(0,20).map((ev,i)=>{
                const meta = EVENT_META[ev.type]
                return (
                  <div key={ev.id||i} style={{
                    display:'flex', alignItems:'center', gap:12,
                    background:'var(--surface2)', border:'1px solid var(--border)',
                    borderRadius:14, padding:'12px 14px', marginBottom:10,
                  }}>
                    <div style={{width:44, height:44, borderRadius:10, background:`${meta?.color||'var(--green)'}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0}}>{meta?.emoji||'📍'}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13, fontWeight:700}}>{meta?.label||ev.type}</div>
                      <div style={{fontSize:11, color:'var(--muted)', marginTop:2}}>{ev.locationName||'Local'}</div>
                    </div>
                    <div style={{fontSize:10, color:'var(--dim)'}}>{new Date(ev.ts).toLocaleDateString('pt-BR')}</div>
                  </div>
                )
              })
        )}

        {/* ── SALVOS ── */}
        {profileTab==='salvos' && (
          savedPlaces.length===0
            ? <div style={{textAlign:'center', padding:'40px 0', color:'var(--muted)'}}>
                <div style={{fontSize:32, marginBottom:8}}>🔖</div>
                <div style={{fontSize:13}}>Nenhum lugar salvo</div>
              </div>
            : savedPlaces.map((p,i)=>(
                <div key={p.id||i} style={{
                  display:'flex', alignItems:'center', gap:12,
                  background:'var(--surface2)', border:'1px solid var(--border)',
                  borderRadius:14, padding:'12px 14px', marginBottom:10, cursor:'pointer',
                }}>
                  <div style={{width:48, height:48, borderRadius:10, background:'var(--surface3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0}}>{CAT_EMOJI[p.cat]||'📍'}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14, fontWeight:700}}>{p.name}</div>
                    <div style={{fontSize:11, color:'var(--muted)', marginTop:2}}>{CAT_LABEL[p.cat]||'Local'}</div>
                  </div>
                  <span style={{fontSize:16}}>🔖</span>
                </div>
              ))
        )}

        {/* ── SEGUINDO ── */}
        {profileTab==='seguindo' && (
          followingList.length===0
            ? <div style={{textAlign:'center', padding:'40px 0', color:'var(--muted)'}}>
                <div style={{fontSize:32, marginBottom:8}}>👥</div>
                <div style={{fontSize:13}}>Você não segue ninguém ainda</div>
              </div>
            : followingList.map(u=>(
                <div key={u.uid} onClick={()=>onViewUser&&onViewUser(u.uid)} style={{
                  display:'flex', alignItems:'center', gap:12,
                  background:'var(--surface2)', border:'1px solid var(--border)',
                  borderRadius:14, padding:'12px 14px', marginBottom:10, cursor:'pointer',
                  transition:'border-color .15s',
                }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='var(--green)'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}
                >
                  <div style={{
                    width:44, height:44, borderRadius:'50%', flexShrink:0,
                    background:'var(--surface3)', border:'2px solid rgba(34,197,94,.3)',
                    overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20,
                  }}>
                    {u.photo?<img src={u.photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:'👤'}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14, fontWeight:700}}>{u.name||'Urbano'}</div>
                    <div style={{fontSize:11, color:'var(--muted)', marginTop:2}}>
                      @{(u.name||'user').toLowerCase().replace(/\s+/g,'')}
                    </div>
                  </div>
                  <div style={{
                    background:'var(--primary-dim)', border:'1px solid rgba(255,92,53,.25)',
                    borderRadius:100, padding:'4px 10px', fontSize:10, color:'var(--green)', fontWeight:600,
                  }}>Seguindo</div>
                </div>
              ))
        )}

        {/* Logout */}
        <button onClick={onLogout} style={{
          width:'100%', padding:14, borderRadius:14, marginTop:16,
          background:'rgba(239,68,68,.07)', border:'1px solid rgba(239,68,68,.25)',
          color:'var(--red)', fontFamily:"'Plus Jakarta Sans',sans-serif",
          fontWeight:700, fontSize:14, cursor:'pointer',
        }}>Sair da conta</button>
        <div style={{height:16}}/>
      </div>

      {/* ── Edit Profile Modal ── */}
      {editing && (
        <div style={{
          position:'fixed', inset:0, zIndex:2000,
          background:'rgba(0,0,0,.7)', backdropFilter:'blur(6px)',
          display:'flex', alignItems:'flex-end', justifyContent:'center',
          animation:'fadeUp .2s ease',
        }} onClick={e=>{if(e.target===e.currentTarget){setEditing(false);setEditPhotoPreview(null)}}}>
          <div style={{
            width:'100%', maxWidth:480,
            background:'var(--bg)', borderTop:'1px solid var(--border)',
            borderRadius:'24px 24px 0 0', padding:'24px 20px',
            paddingBottom:'calc(24px + env(safe-area-inset-bottom,0px))',
          }}>
            <div style={{fontSize:17, fontWeight:800, marginBottom:16, textAlign:'center'}}>Editar Perfil</div>

            {/* Cover photo */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11, color:'var(--muted)', fontWeight:700, marginBottom:8, textTransform:'uppercase', letterSpacing:'.06em'}}>🖼️ Foto de capa</div>
              <label style={{cursor:'pointer', display:'block'}}>
                <div style={{
                  height:90, borderRadius:14, overflow:'hidden',
                  background:'linear-gradient(135deg, #0f2414, #1a3a20)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  border:'2px dashed var(--border)', position:'relative',
                }}>
                  {(editCoverPreview||user.coverUrl)
                    ? <img src={editCoverPreview||user.coverUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    : <div style={{textAlign:'center', color:'var(--muted)'}}>
                        <div style={{fontSize:24, marginBottom:4}}>📷</div>
                        <div style={{fontSize:11}}>Adicionar capa</div>
                      </div>
                  }
                  <div style={{
                    position:'absolute', bottom:6, right:8,
                    background:'rgba(0,0,0,.6)', borderRadius:100,
                    padding:'3px 10px', fontSize:10, color:'#fff', fontWeight:600,
                  }}>Alterar</div>
                </div>
                <input type="file" accept="image/*" onChange={handleCoverChange} style={{display:'none'}}/>
              </label>
            </div>

            {/* Avatar photo */}
            <div style={{display:'flex', justifyContent:'center', marginBottom:20}}>
              <label style={{cursor:'pointer', position:'relative'}}>
                <div style={{
                  width:80, height:80, borderRadius:'50%',
                  background:'var(--surface3)', border:'3px solid var(--primary)',
                  overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32,
                }}>
                  {editPhotoPreview
                    ? <img src={editPhotoPreview} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    : user.photo
                      ? <img src={user.photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                      : '👤'}
                </div>
                <div style={{
                  position:'absolute', bottom:0, right:0,
                  width:26, height:26, borderRadius:'50%',
                  background:'linear-gradient(135deg,var(--primary),var(--accent))', border:'2px solid var(--bg)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#052e16" strokeWidth="2.5" width="12" height="12">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
                <input type="file" accept="image/*" onChange={handlePhotoChange} style={{display:'none'}}/>
              </label>
            </div>

            {/* Name input */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11, color:'var(--muted)', fontWeight:600, marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em'}}>Nome</div>
              <input
                value={editName}
                onChange={e=>setEditName(e.target.value)}
                placeholder="Seu nome"
                style={{
                  width:'100%', background:'var(--surface2)', border:'1.5px solid var(--border)',
                  borderRadius:12, padding:'12px 14px', color:'var(--text)',
                  fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:15, outline:'none',
                  boxSizing:'border-box',
                }}
                onFocus={e=>e.target.style.borderColor='var(--primary)'}
                onBlur={e=>e.target.style.borderColor='var(--border)'}
              />
            </div>

            <div style={{display:'flex', gap:10}}>
              <button onClick={()=>{setEditing(false);setEditPhotoPreview(null)}} style={{
                flex:1, padding:14, borderRadius:12,
                background:'var(--surface2)', border:'1px solid var(--border)',
                color:'var(--muted)', fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600, fontSize:14, cursor:'pointer',
              }}>Cancelar</button>
              <button onClick={handleSaveProfile} disabled={saving||!editName.trim()} style={{
                flex:2, padding:14, borderRadius:12,
                background:'linear-gradient(135deg,var(--primary),var(--accent))', border:'none',
                color:'#052e16', fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:14, cursor:'pointer',
                opacity:saving||!editName.trim()?0.6:1,
              }}>{saving?'Salvando...':'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Section header helper ───────────────────────────────────────────────────── */
function SectionHeader({title, action, onAction}) {
  return (
    <div className="section-header">
      <div className="section-title">{title}</div>
      {action && (
        <button className="section-action" onClick={onAction}>{action}</button>
      )}
    </div>
  )
}

/* ── Floating Dock 3.0 (replaces BottomNav) ─────────────────────────────────── */
function BottomNav({active, onChange, onAdd}) {
  const tabs = [
    {id:'home',       label:'Início',     Icon:IC.Home},
    {id:'map',        label:'Explorar',   Icon:IC.Search},
    {id:'activities', label:'Feed',       Icon:IC.Activity},
    {id:'profile',    label:'Perfil',     Icon:IC.User},
  ]
  return (
    <div className="floating-dock">
      {tabs.slice(0,2).map(tab => {
        const isActive = active === tab.id
        return (
          <button key={tab.id} className={`dock-btn${isActive?' active':''}`}
            onClick={() => onChange(tab.id)}>
            <tab.Icon/>
            {tab.label}
          </button>
        )
      })}

      {/* Central FAB */}
      <button className="dock-fab" onClick={onAdd}
        onMouseDown={e=>e.currentTarget.style.transform='scale(.9)'}
        onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
        onTouchStart={e=>e.currentTarget.style.transform='scale(.9)'}
        onTouchEnd={e=>e.currentTarget.style.transform='scale(1)'}
      ><IC.Plus/></button>

      {tabs.slice(2).map(tab => {
        const isActive = active === tab.id
        return (
          <button key={tab.id} className={`dock-btn${isActive?' active':''}`}
            onClick={() => onChange(tab.id)}>
            <tab.Icon/>
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

/* ── Settings Panel ──────────────────────────────────────────────────────────── */
function SettingsPanel({open, user, onClose, onLogout, onUpdateProfile}) {
  const [tab, setTab]           = useState('conta')
  const [theme, setTheme]       = useState(()=>localStorage.getItem('urbyn-theme')||'dark')
  const [editName, setEditName] = useState(user?.name||'')
  const [editBio,  setEditBio]  = useState(user?.bio||'')
  const [saving, setSaving]     = useState(false)
  const [saved2, setSaved2]     = useState(false)

  // Privacy toggles — loaded from Firebase
  const [privacy, setPrivacy]   = useState({
    publicProfile: true,
    activityVisible: true,
    notifications: true,
  })
  const [savingPrivacy, setSavingPrivacy] = useState(false)

  // Load privacy from Firebase on open
  useEffect(()=>{
    if (!user?.uid || !open) return
    get(ref(db, `users/${user.uid}/privacy`)).then(snap=>{
      if (snap.exists()) setPrivacy(p=>({...p,...snap.val()}))
    })
  },[user?.uid, open])

  // Apply theme to DOM immediately when changed
  useEffect(()=>{
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('urbyn-theme', theme)
  },[theme])

  // Apply saved theme on mount
  useEffect(()=>{
    const saved = localStorage.getItem('urbyn-theme')
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved)
      setTheme(saved)
    }
  },[])

  const handleSaveAccount = async () => {
    if (!editName.trim()) return
    setSaving(true)
    await onUpdateProfile({name:editName.trim(), bio:editBio.trim()})
    setSaving(false); setSaved2(true); setTimeout(()=>setSaved2(false),2000)
  }

  const togglePrivacy = async (key) => {
    const next = {...privacy, [key]:!privacy[key]}
    setPrivacy(next)
    setSavingPrivacy(true)
    await update(ref(db, `users/${user.uid}/privacy`), {[key]:next[key]})
    setSavingPrivacy(false)
  }

  const TABS = [
    {id:'conta',       label:'👤 Conta'},
    {id:'aparencia',   label:'🎨 Aparência'},
    {id:'privacidade', label:'🔒 Privacidade'},
  ]

  const THEMES = [
    {id:'dark',    emoji:'🌑', label:'Escuro',      desc:'Padrão — verde sobre preto profundo'},
    {id:'darker',  emoji:'⚫', label:'Ultra Escuro', desc:'Fundo puro #000, ideal para OLED'},
    {id:'forest',  emoji:'🌲', label:'Floresta',     desc:'Verde mais vivo, tons naturais'},
    {id:'light',   emoji:'☀️', label:'Claro',        desc:'Fundo branco, texto escuro'},
  ]

  const PRIVACY_ITEMS = [
    {key:'publicProfile',    label:'Perfil público',    desc:'Outros usuários podem ver seu perfil'},
    {key:'activityVisible',  label:'Atividade visível',  desc:'Mostrar suas avaliações e reportes'},
    {key:'notifications',    label:'Notificações',       desc:'Receber alertas de locais próximos'},
  ]

  return (
    <>
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:3000,
        background:'rgba(0,0,0,.7)', backdropFilter:'blur(4px)',
        opacity:open?1:0, pointerEvents:open?'all':'none', transition:'opacity .25s',
      }}/>
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:3100,
        background:'var(--bg)', borderRadius:'24px 24px 0 0',
        maxHeight:'90vh', overflowY:'auto',
        transform:open?'translateY(0)':'translateY(100%)',
        transition:'transform .35s cubic-bezier(.4,0,.2,1)',
      }}>
        <div style={{width:40,height:4,background:'var(--border)',borderRadius:2,margin:'12px auto 0'}}/>
        <div style={{padding:'16px 16px 0'}}>

          {/* Header */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
            <div style={{fontSize:18,fontWeight:800}}>Configurações</div>
            <button onClick={onClose} style={{
              width:32,height:32,borderRadius:'50%',
              background:'var(--surface2)',border:'1px solid var(--border)',
              cursor:'pointer',color:'var(--muted)',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,
            }}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{display:'flex',gap:6,marginBottom:20}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{
                flex:1, padding:'9px 4px', borderRadius:10, cursor:'pointer',
                background:tab===t.id?'rgba(34,197,94,.15)':'var(--surface2)',
                border:`1px solid ${tab===t.id?'var(--green)':'var(--border)'}`,
                color:tab===t.id?'var(--green)':'var(--muted)',
                fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:10,
                transition:'all .15s',
              }}>{t.label}</button>
            ))}
          </div>

          {/* ── CONTA ── */}
          {tab==='conta'&&(
            <div>
              {/* Nome */}
              <div style={{fontSize:11,color:'var(--muted)',fontWeight:700,marginBottom:6,textTransform:'uppercase',letterSpacing:'.07em'}}>👤 Nome</div>
              <input value={editName} onChange={e=>setEditName(e.target.value)}
                placeholder="Seu nome" maxLength={60}
                style={{
                  width:'100%', background:'var(--surface2)', border:'1.5px solid var(--border)',
                  borderRadius:12, padding:'12px 14px', color:'var(--text)',
                  fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:14, outline:'none',
                  boxSizing:'border-box', marginBottom:14, transition:'border-color .2s',
                }}
                onFocus={e=>e.target.style.borderColor='var(--primary)'}
                onBlur={e=>e.target.style.borderColor='var(--border)'}/>

              {/* Bio */}
              <div style={{fontSize:11,color:'var(--muted)',fontWeight:700,marginBottom:6,textTransform:'uppercase',letterSpacing:'.07em'}}>✍️ Bio</div>
              <textarea value={editBio} onChange={e=>setEditBio(e.target.value)}
                placeholder="Conte um pouco sobre você... ex: Explorador de cafés e baladas de Bauru 🌙"
                maxLength={160} rows={3}
                style={{
                  width:'100%', background:'var(--surface2)', border:'1.5px solid var(--border)',
                  borderRadius:12, padding:'12px 14px', color:'var(--text)',
                  fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:14, outline:'none',
                  resize:'none', lineHeight:1.6, boxSizing:'border-box', marginBottom:4,
                  transition:'border-color .2s',
                }}
                onFocus={e=>e.target.style.borderColor='var(--primary)'}
                onBlur={e=>e.target.style.borderColor='var(--border)'}/>
              <div style={{fontSize:10,color:'var(--dim)',textAlign:'right',marginBottom:14}}>{editBio.length}/160</div>

              {/* Email (readonly) */}
              <div style={{fontSize:11,color:'var(--muted)',fontWeight:700,marginBottom:6,textTransform:'uppercase',letterSpacing:'.07em'}}>📧 Email</div>
              <input value={user?.email||''} disabled
                style={{
                  width:'100%', background:'var(--surface3)', border:'1px solid var(--border)',
                  borderRadius:12, padding:'12px 14px', color:'var(--dim)',
                  fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:14, outline:'none',
                  boxSizing:'border-box', marginBottom:4, cursor:'not-allowed',
                }}/>
              <div style={{fontSize:10,color:'var(--dim)',marginBottom:16}}>Email não pode ser alterado</div>

              <button onClick={handleSaveAccount} disabled={saving||!editName.trim()} style={{
                width:'100%', padding:14, borderRadius:12, border:'none',
                background:saved2?'rgba(34,197,94,.2)':'var(--green)',
                color:saved2?'var(--green)':'#052e16',
                fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:14,
                cursor:editName.trim()?'pointer':'not-allowed',
                marginBottom:16, transition:'all .2s',
              }}>{saved2?'✅ Salvo!':saving?'Salvando...':'Salvar alterações'}</button>

              <div style={{height:1,background:'var(--border)',marginBottom:16}}/>
              <button onClick={onLogout} style={{
                width:'100%', padding:14, borderRadius:12,
                background:'rgba(239,68,68,.07)', border:'1px solid rgba(239,68,68,.25)',
                color:'var(--red)', fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:14, cursor:'pointer',
              }}>Sair da conta</button>
            </div>
          )}

          {/* ── APARÊNCIA ── */}
          {tab==='aparencia'&&(
            <div>
              <div style={{fontSize:12,color:'var(--muted)',lineHeight:1.6,marginBottom:16}}>
                Escolha o tema visual do app. A mudança é instantânea.
              </div>
              {THEMES.map(t=>(
                <div key={t.id} onClick={()=>setTheme(t.id)} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  background:theme===t.id?'rgba(34,197,94,.1)':'var(--surface2)',
                  border:`1.5px solid ${theme===t.id?'var(--green)':'var(--border)'}`,
                  borderRadius:14, padding:'14px 16px', marginBottom:10,
                  cursor:'pointer', transition:'all .2s',
                }}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{
                      width:40, height:40, borderRadius:10, flexShrink:0,
                      background:t.id==='dark'?'#0c1a12':t.id==='darker'?'#000':t.id==='forest'?'#0a2e12':'#f8fafc',
                      border:`2px solid ${theme===t.id?'var(--green)':'var(--border)'}`,
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
                    }}>{t.emoji}</div>
                    <div>
                      <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>{t.label}</div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{t.desc}</div>
                    </div>
                  </div>
                  <div style={{
                    width:22, height:22, borderRadius:'50%', flexShrink:0,
                    border:`2px solid ${theme===t.id?'var(--green)':'var(--border)'}`,
                    background:theme===t.id?'var(--green)':'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    transition:'all .2s',
                  }}>
                    {theme===t.id&&<div style={{width:8,height:8,borderRadius:'50%',background:'#052e16'}}/>}
                  </div>
                </div>
              ))}
              <div style={{
                marginTop:8, padding:'10px 14px', borderRadius:12,
                background:'rgba(34,197,94,.06)', border:'1px solid rgba(34,197,94,.15)',
                fontSize:11, color:'var(--muted)', lineHeight:1.7,
              }}>
                💡 O tema é salvo automaticamente e aplicado toda vez que você abrir o app.
              </div>
            </div>
          )}

          {/* ── PRIVACIDADE ── */}
          {tab==='privacidade'&&(
            <div>
              {PRIVACY_ITEMS.map(item=>(
                <div key={item.key} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'16px 0', borderBottom:'1px solid var(--border)',
                }}>
                  <div style={{flex:1, paddingRight:16}}>
                    <div style={{fontWeight:700, fontSize:14, marginBottom:3}}>{item.label}</div>
                    <div style={{fontSize:12, color:'var(--muted)', lineHeight:1.5}}>{item.desc}</div>
                  </div>
                  {/* Toggle switch */}
                  <div
                    onClick={()=>!savingPrivacy&&togglePrivacy(item.key)}
                    style={{
                      width:52, height:28, borderRadius:100, flexShrink:0,
                      background:privacy[item.key]?'var(--green)':'var(--surface3)',
                      border:`1px solid ${privacy[item.key]?'var(--green)':'var(--border)'}`,
                      position:'relative', cursor:savingPrivacy?'wait':'pointer',
                      transition:'background .25s, border-color .25s',
                    }}
                  >
                    <div style={{
                      position:'absolute',
                      top:4,
                      left:privacy[item.key]?26:4,
                      width:18, height:18, borderRadius:'50%',
                      background:'#fff',
                      transition:'left .25s cubic-bezier(.4,0,.2,1)',
                      boxShadow:'0 1px 4px rgba(0,0,0,.35)',
                    }}/>
                  </div>
                </div>
              ))}
              <div style={{
                fontSize:11, color:'var(--dim)', marginTop:16,
                lineHeight:1.8, padding:'10px 14px', borderRadius:12,
                background:'var(--surface2)', border:'1px solid var(--border)',
              }}>
                🔒 Os dados de localização são usados apenas para mostrar locais próximos e nunca são compartilhados com terceiros. Você pode alterar essas preferências a qualquer momento.
              </div>
            </div>
          )}

          <div style={{height:'calc(32px + env(safe-area-inset-bottom,0px))'}}/>
        </div>
      </div>
    </>
  )
}

/* ── City Selector ────────────────────────────────────────────────────────────── */
const AVAILABLE_CITIES = [
  {id:'bauru',    name:'Bauru',    state:'SP', lat:-22.3147, lng:-49.0611},
  {id:'marilia',  name:'Marília',  state:'SP', lat:-22.2144, lng:-49.9456},
  {id:'botucatu', name:'Botucatu', state:'SP', lat:-22.8851, lng:-48.4454},
  {id:'campinas', name:'Campinas', state:'SP', lat:-22.9068, lng:-47.0626},
  {id:'saopaulo', name:'São Paulo',state:'SP', lat:-23.5505, lng:-46.6333},
]

function CitySelector({open, currentCity, onSelect, onClose}) {
  const [search, setSearch] = useState('')
  const filtered = AVAILABLE_CITIES.filter(c=>c.name.toLowerCase().includes(search.toLowerCase()))
  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:3000,background:'rgba(0,0,0,.7)',backdropFilter:'blur(4px)',opacity:open?1:0,pointerEvents:open?'all':'none',transition:'opacity .25s'}}/>
      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:3100,background:'var(--bg)',borderRadius:'24px 24px 0 0',maxHeight:'75vh',overflowY:'auto',transform:open?'translateY(0)':'translateY(100%)',transition:'transform .35s cubic-bezier(.4,0,.2,1)'}}>
        <div style={{width:40,height:4,background:'var(--border)',borderRadius:2,margin:'12px auto 0'}}/>
        <div style={{padding:'16px 16px 0'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div style={{fontSize:17,fontWeight:800}}>Escolher cidade</div>
            <button onClick={onClose} style={{width:32,height:32,borderRadius:'50%',background:'var(--surface2)',border:'1px solid var(--border)',cursor:'pointer',color:'var(--muted)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>✕</button>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10,background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:12,padding:'10px 14px',marginBottom:16}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{color:'var(--muted)',flexShrink:0}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cidade..." style={{flex:1,background:'none',border:'none',color:'var(--text)',fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:14,outline:'none'}}/>
          </div>
          <div style={{fontSize:11,color:'var(--muted)',marginBottom:12,fontWeight:600}}>CIDADES DISPONÍVEIS</div>
          {filtered.map(c=>(
            <div key={c.id} onClick={()=>{onSelect(c);onClose()}} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 12px',borderRadius:14,marginBottom:8,cursor:'pointer',background:currentCity===c.id?'rgba(34,197,94,.1)':'var(--surface2)',border:`1px solid ${currentCity===c.id?'var(--green)':'var(--border)'}`,transition:'all .15s'}}>
              <div>
                <div style={{fontWeight:700,fontSize:15}}>{c.name}</div>
                <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{c.state} · Estabelecimentos cadastrados</div>
              </div>
              {currentCity===c.id&&<span style={{color:'var(--green)',fontSize:18}}>✓</span>}
            </div>
          ))}
          <div style={{height:'calc(24px + env(safe-area-inset-bottom,0px))'}}/>
        </div>
      </div>
    </>
  )
}

/* ── Main App ────────────────────────────────────────────────────────────────── */
export default function App() {
  const networkStatus = useNetworkStatus()
  const {user, loading, login, loginWithEmail, registerWithEmail, resetPassword, logout, authError, setAuthError} = useAuth()
  const {events, addEvent}   = useEvents(user?.uid)
  const {allPlaces, addPlace} = usePlaces(user?.uid)
  const onlineCount           = useOnline(user?.uid)
  const {permission, requestPermission} = useNotifications(user?.uid)
  const {notifications: userNotifs, unreadCount: notifCount} = useUserNotifications(user?.uid)
  const {conversations: dmConversations, totalUnread: chatUnread} = usePrivateChats(user?.uid)

  const [userPos,     setUserPos]     = useState(null)
  const [reportLoc,   setReportLoc]   = useState(null)
  const [detailLoc,   setDetailLoc]   = useState(null)
  const mapViewRef = useRef(null)
  const [nowOpen,     setNowOpen]     = useState(false)
  const [adminOpen,   setAdminOpen]   = useState(false)
  const [settingsOpen,setSettingsOpen]= useState(false)
  const [cityModal,   setCityModal]   = useState(false)
  const [viewingUid,  setViewingUid]  = useState(null)
  const [activeFilter,setActiveFilter]= useState('all')
  const [toast,       setToast]       = useState(null)
  const [pointsAlert, setPointsAlert] = useState(null)
  const [notifBanner, setNotifBanner] = useState(false)
  const [usersMap,    setUsersMap]    = useState({})
  const [seeded,      setSeeded]      = useState(false)
  const [pickMode,    setPickMode]    = useState(false)
  const [pickedCoords,setPickedCoords]= useState(null)
  const [addLocOpen,  setAddLocOpen]  = useState(false)
  const [trafficPrompt,setTrafficPrompt]=useState(null)
  const [activeTab,   setActiveTab]   = useState('home')
  const [notifOpen,   setNotifOpen]   = useState(false)
  const [chatOpen,    setChatOpen]    = useState(false)
  const [chatTarget,  setChatTarget]  = useState(null) // {uid, name, photo}
  const [mapSearch,   setMapSearch]   = useState('')
  const [mapSearchFocus, setMapSearchFocus] = useState(false)
  const [reportesOpen,setReportesOpen]= useState(false)
  const [alertasOpen, setAlertasOpen] = useState(false)
  const [onlineOpen,  setOnlineOpen]  = useState(false)
  const [rewardsOpen, setRewardsOpen] = useState(false)

  const flyToPlace = useCallback((place) => {
    setDetailLoc(place)
    if (place?.lat && place?.lng) {
      setActiveTab('map')
      setTimeout(() => mapViewRef.current?.flyTo(place.lat, place.lng, 17), 150)
    }
  }, [])
  const [likes,       setLikes]       = useState({})
  const [saved,       setSaved]       = useState({})
  const [following,   setFollowing]   = useState({})

  const isAdmin = user?.isAdmin === true

  const {confirmStillHappening, markResolved} = useTrafficConfirm({
    userPos, events, places:allPlaces, user, onConfirmPrompt:setTrafficPrompt,
  })

  useEffect(()=>{
    navigator.geolocation?.getCurrentPosition(pos=>{
      const {latitude:lat, longitude:lng} = pos.coords
      const d = Math.sqrt((lat-DEFAULT_LAT)**2+(lng-DEFAULT_LNG)**2)*111
      if (d<300) setUserPos({lat,lng})
    },()=>{})
  },[])

  useEffect(()=>{
    if (!user) return
    get(ref(db,'users')).then(s=>{if(s.val())setUsersMap(s.val())})
  },[user])

  useEffect(()=>{
    if (user&&!seeded){setSeeded(true);seedIfEmpty(user.uid,user.name)}
  },[user,seeded])

  useEffect(()=>{
    if (events.length>0) checkAlerts(events,usersMap)
  },[events,usersMap])

  useEffect(()=>{
    if (user&&permission==='default'){
      const t=setTimeout(()=>setNotifBanner(true),4000)
      return ()=>clearTimeout(t)
    }
  },[user,permission])

  useEffect(()=>{
    if (!user) return
    const unsubs = [
      onValue(ref(db,`users/${user.uid}/likes`),     s=>setLikes(s.val()||{})),
      onValue(ref(db,`users/${user.uid}/saved`),     s=>setSaved(s.val()||{})),
      onValue(ref(db,`users/${user.uid}/following`), s=>setFollowing(s.val()||{})),
    ]
    return ()=>unsubs.forEach(u=>u())
  },[user])

  // Apply saved theme on app boot
  useEffect(()=>{
    const t = localStorage.getItem('urbyn-theme')
    if (t) document.documentElement.setAttribute('data-theme', t)
  },[])

  const showToast = useCallback((msg,bg='var(--green)',color='#052e16')=>{
    setToast({msg,bg,color})
    setTimeout(()=>setToast(null),2800)
  },[])

  const handleToggleSave = useCallback(async (place) => {
    if (!user || !place?.id) return
    const savedRef = ref(db, `users/${user.uid}/saved/${place.id}`)
    if (saved[place.id]) {
      await remove(savedRef)
      showToast('🔖 Removido dos salvos')
    } else {
      await set(savedRef, { id:place.id, name:place.name, cat:place.cat, savedAt:Date.now() })
      showToast('🔖 Salvo!')
    }
  }, [user, saved, showToast])

  const handleUpdateProfile = useCallback(async({name, photo, bio, coverUrl})=>{
    if (!user) return
    await update(ref(db,`users/${user.uid}`), {
      name,
      ...(photo!==undefined?{photo}:{}),
      ...(bio!==undefined?{bio}:{}),
      ...(coverUrl!==undefined?{coverUrl}:{}),
    })
    showToast('✅ Perfil atualizado!')
  },[user, showToast])

  const handleReport = useCallback(async(type,loc)=>{
    if(!user||!loc) return
    try {
      await addEvent({locationId:loc.id,type,userId:user.uid,userName:user.name,userReports:user.reports||0})
    } catch(e) {
      if(e.message==='spam'){showToast('⚠️ Aguarde um pouco','var(--yellow)','#000');return}
      throw e
    }
    const pts=(EVENT_META[type]?.weight||1)*10
    await update(ref(db,`users/${user.uid}`),{score:increment(pts),reports:increment(1)})
    setReportLoc(null)
    showToast(`✅ +${pts} pts — ${loc.name.split(' ')[0]}!`)
    setPointsAlert(pts)
    setTimeout(()=>setPointsAlert(null),2200)
  },[user,addEvent,showToast])

  const handleStartPick = useCallback(()=>{
    setPickedCoords(null); setPickMode(true); setActiveTab('map')
    showToast('Toque no mapa para marcar o local','rgba(17,30,22,.97)','var(--text)')
  },[showToast])

  const handlePick = useCallback(coords=>{
    setPickedCoords(coords); setPickMode(false); setAddLocOpen(true)
  },[])

  const handleSavePlace = useCallback(async placeData=>{
    if(!user) return
    await addPlace(placeData,user.uid,user.name)
    setAddLocOpen(false); setPickedCoords(null)
    showToast(placeData.needsModeration
      ?`🛡️ "${placeData.name}" enviado para moderação`
      :`📍 "${placeData.name}" criado!`)
  },[user,addPlace,showToast])

  const handleCancelAdd = useCallback(()=>{
    setPickMode(false);setPickedCoords(null);setAddLocOpen(false)
  },[])

  const now = Date.now()
  const visiblePlaces = allPlaces.filter(loc=>{
    if(loc.expiresAt&&loc.expiresAt<now) return false
    if(loc.needsModeration&&loc.status!=='approved') return false
    if(loc.cat==='transito'&&loc.isBase){
      const hasActive = events.some(e=>e.locationId===loc.id&&(now-e.ts)<3600000)
      if(!hasActive) return false
    }
    return true
  })

  let hotCount=0, totalActive=0, alertCount=0
  visiblePlaces.forEach(loc=>{
    const s=calcScore(loc.id,events,usersMap)
    if(s>=6) hotCount++
    if(loc.cat==='transito'&&s>0) alertCount++
    totalActive+=events.filter(e=>e.locationId===loc.id&&now-e.ts<3600000).length
  })

  const pendingCount = allPlaces.filter(p=>p.needsModeration&&(!p.status||p.status==='pending')).length

  const filteredIds = visiblePlaces.filter(loc=>{
    if(activeFilter==='all') return true
    if(activeFilter==='noturno') return loc.cat==='noturno'
    if(activeFilter==='transito') return loc.cat==='transito'
    if(activeFilter==='hot') return getHeatLevel(calcScore(loc.id,events,usersMap))!=='inactive'
    if(activeFilter==='bar') return loc.cat==='bar'||loc.cat==='noturno'
    if(activeFilter==='show') return loc.cat==='show'
    if(activeFilter==='parque') return loc.cat==='parque'
    if(activeFilter==='blitz') return events.some(e=>e.locationId===loc.id&&e.type==='blitz')
    if(activeFilter==='estabelecimento') return loc.cat==='estabelecimento'
    return true
  }).map(l=>l.id)

  /* ── Loading ── */
  if (loading) return (
    <div style={{
      position:'fixed', inset:0, background:'var(--bg)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      gap:24, fontFamily:"'DM Sans',sans-serif",
    }}>
      <UrbynLogo size={40}/>
      <div style={{display:'flex', gap:6, alignItems:'center'}}>
        {[0,1,2].map(i=>(
          <div key={i} style={{
            width:6, height:6, borderRadius:'50%',
            background:'linear-gradient(135deg,var(--electric),var(--neon))',
            animation:`pulse 1.2s ease infinite`,
            animationDelay:`${i*0.2}s`,
          }}/>
        ))}
      </div>
      <div style={{fontSize:12, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase'}}>
        carregando a cidade...
      </div>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.6);opacity:0.4}}`}</style>
    </div>
  )

  if (!user) return <LoginScreen onLogin={login} loginWithEmail={loginWithEmail} registerWithEmail={registerWithEmail} resetPassword={resetPassword} authError={authError} setAuthError={setAuthError}/>

  return (
    <div style={{position:'relative', height:'100dvh', overflow:'hidden', background:'var(--bg)', color:'var(--text)'}}>
      <NetworkBanner status={networkStatus}/>
      <TrafficConfirmBanner prompt={trafficPrompt} onConfirm={confirmStillHappening} onResolve={markResolved} onDismiss={()=>setTrafficPrompt(null)}/>

      {/* ── MAP — always mounted ── */}
      <div style={{
        position:'absolute', inset:0,
        opacity:activeTab==='map'?1:0,
        pointerEvents:activeTab==='map'?'all':'none',
        transition:'opacity .2s',
      }}>
        <MapView
          ref={mapViewRef}
          allPlaces={visiblePlaces} events={events} usersMap={usersMap}
          filteredIds={filteredIds}
          onLocationClick={loc=>{if(!pickMode)setDetailLoc(loc)}}
          userPos={userPos} pickMode={pickMode} onPick={handlePick}
        />

        {/* Map top bar */}
        {!pickMode&&(
          <div style={{
            position:'absolute', top:0, left:0, right:0, zIndex:500,
            padding:'calc(14px + var(--sat)) 16px 0',
            background:'linear-gradient(to bottom,rgba(8,8,16,0.97) 0%,rgba(8,8,16,0.6) 65%,transparent 100%)',
          }}>
            {/* Logo row */}
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
              <UrbynLogo size={26}/>
              <div style={{display:'flex', gap:7, alignItems:'center'}}>
                {onlineCount>1&&(
                  <div className="online-pill">
                    <div style={{width:6,height:6,borderRadius:'50%',background:'var(--cyber)',animation:'blink 1s ease infinite'}}/>
                    {onlineCount} online
                  </div>
                )}
                {isAdmin&&(
                  <button onClick={()=>setAdminOpen(true)} className="btn-icon" style={{
                    width:34,height:34,
                    background:pendingCount>0?'rgba(255,211,42,0.1)':'',
                    borderColor:pendingCount>0?'rgba(255,211,42,0.3)':'',
                    color:pendingCount>0?'var(--yellow)':'var(--muted)',
                    fontSize:13, position:'relative',
                  }}>
                    🛡️
                    {pendingCount>0&&<span className="badge">{pendingCount}</span>}
                  </button>
                )}
                <div onClick={()=>setRewardsOpen(true)} style={{
                  fontFamily:"'Space Mono',monospace",
                  background:'rgba(0,245,160,0.08)', border:'1px solid rgba(0,245,160,0.2)',
                  borderRadius:999, padding:'5px 11px', fontSize:11, color:'var(--cyber)',
                  cursor:'pointer', transition:'background .2s',
                }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(0,245,160,0.15)'}
                  onMouseLeave={e=>e.currentTarget.style.background='rgba(0,245,160,0.08)'}
                >⚡ {user.score??0}</div>
                <div onClick={logout} style={{
                  width:34, height:34, borderRadius:'50%',
                  background:'rgba(255,255,255,0.06)',
                  border:'2px solid rgba(79,142,255,0.35)',
                  cursor:'pointer', overflow:'hidden',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  {user.photo?<img src={user.photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:15}}>👤</span>}
                </div>
              </div>
            </div>

            {/* Search on map */}
            <div style={{position:'relative', marginBottom:10}}>
              <div className="search-bar" style={{borderRadius: mapSearchFocus && mapSearch.trim().length>=2 ? '14px 14px 0 0' : 999}}>
                <IC.SearchSm style={{color:'var(--muted)',flexShrink:0}}/>
                <input
                  value={mapSearch}
                  onChange={e=>setMapSearch(e.target.value)}
                  onFocus={()=>setMapSearchFocus(true)}
                  onBlur={()=>setTimeout(()=>setMapSearchFocus(false),150)}
                  placeholder="Buscar lugares, experiências..."
                  style={{fontFamily:"'DM Sans',sans-serif"}}/>
                {mapSearch
                  ? <button onClick={()=>setMapSearch('')} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:16,padding:'0 2px'}}>✕</button>
                  : <IC.Filter style={{color:'var(--muted)',flexShrink:0}}/>}
              </div>
              {mapSearchFocus && mapSearch.trim().length>=2 && (() => {
                const CAT_LABEL2 = { noturno:'Bar/Balada', transito:'Trânsito', estabelecimento:'Estabelecimento', parque:'Parque', comercio:'Comércio', show:'Show', bar:'Bar', evento:'Evento', cafe:'Café' }
                const CAT_EMOJI2 = { noturno:'🌙', transito:'🚦', estabelecimento:'🏪', parque:'🌿', comercio:'🏬', show:'🎭', bar:'🍺', evento:'🎉', cafe:'☕' }
                const results = visiblePlaces.filter(p=>
                  p.name?.toLowerCase().includes(mapSearch.toLowerCase()) ||
                  p.address?.toLowerCase().includes(mapSearch.toLowerCase()) ||
                  (CAT_LABEL2[p.cat]||'').toLowerCase().includes(mapSearch.toLowerCase())
                ).slice(0,6)
                return (
                  <div style={{
                    position:'absolute', left:0, right:0, zIndex:600,
                    background:'rgba(8,8,20,0.97)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
                    border:'1px solid rgba(79,142,255,0.3)', borderTop:'none',
                    borderRadius:'0 0 16px 16px', overflow:'hidden',
                    boxShadow:'0 12px 32px rgba(0,0,0,0.7)',
                  }}>
                    {results.length===0 ? (
                      <div style={{padding:'14px',textAlign:'center',color:'var(--muted)',fontSize:12}}>
                        Nenhum resultado para "{mapSearch}"
                      </div>
                    ) : results.map(p=>(
                      <div key={p.id}
                        onMouseDown={()=>{flyToPlace(p);setMapSearch('');setMapSearchFocus(false)}}
                        style={{
                          display:'flex', alignItems:'center', gap:12, padding:'11px 14px',
                          borderBottom:'1px solid rgba(255,255,255,0.05)', cursor:'pointer',
                        }}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                      >
                        <div style={{
                          width:36,height:36,borderRadius:10,flexShrink:0,
                          background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',
                          display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,
                        }}>{p.iconEmoji||CAT_EMOJI2[p.cat]||'📍'}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                          <div style={{fontSize:11,color:'var(--muted)',marginTop:1}}>{CAT_LABEL2[p.cat]||'Local'}{p.address?` · ${p.address}`:''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>

            {/* Category chips */}
            <div style={{display:'flex', gap:7, overflowX:'auto', scrollbarWidth:'none', paddingBottom:12}}>
              {FILTERS.map(f=>(
                <button key={f.id} onClick={()=>setActiveFilter(f.id)}
                  className={`chip${activeFilter===f.id?' active':''}`}>
                  <span>{f.emoji}</span>{f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pick mode banner */}
        {pickMode&&(
          <div style={{
            position:'absolute', top:0, left:0, right:0, zIndex:600,
            background:'rgba(79,142,255,0.95)',
            backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
            padding:'calc(18px + var(--sat)) 16px 16px',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            animation:'slideDown .25s ease',
          }}>
            <div style={{display:'flex', alignItems:'center', gap:10}}>
              <span style={{fontSize:20}}>📍</span>
              <div>
                <div style={{fontWeight:800, fontSize:14, color:'#fff', fontFamily:"'Outfit',sans-serif"}}>Toque no mapa para marcar</div>
                <div style={{fontSize:11, opacity:.75, color:'rgba(255,255,255,0.85)'}}>Escolha o ponto exato do local</div>
              </div>
            </div>
            <button onClick={handleCancelAdd} style={{
              background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.3)',
              borderRadius:999, padding:'7px 14px', color:'#fff', cursor:'pointer',
              fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:12,
            }}>Cancelar</button>
          </div>
        )}

        {/* Bottom stat cards */}
        {!pickMode&&(
          <div style={{
            position:'absolute', bottom:0, left:0, right:0, zIndex:500,
            paddingTop:20, paddingLeft:16, paddingRight:16,
            paddingBottom:'calc(94px + env(safe-area-inset-bottom,0px))',
            background:'linear-gradient(to top,rgba(8,8,16,0.98) 0%,rgba(8,8,16,0.65) 55%,transparent 100%)',
            display:'flex', gap:10, overflowX:'auto', scrollbarWidth:'none',
          }}>
            {/* LIVE hotspots — clickable */}
            <button onClick={()=>setNowOpen(true)} className="stat-card" style={{
              boxShadow:hotCount>0?'0 0 24px rgba(255,71,87,0.3)':'none',
              borderColor:hotCount>0?'rgba(255,71,87,0.35)':'rgba(255,255,255,0.07)',
            }}>
              {hotCount>0 && <div className="live-badge" style={{marginBottom:7}}>
                <div className="live-dot"/>LIVE
              </div>}
              {!hotCount && <div className="stat-label" style={{marginBottom:6}}>🔴 Agora</div>}
              <div className="stat-value" style={{color:hotCount>0?'var(--hot)':'var(--text)'}}>{hotCount}</div>
              <div className="stat-sub">hotspots</div>
            </button>
            {[
              {label:'📡 Reportes', val:totalActive, sub:'última hora', col:'var(--text)',   onClick:()=>setReportesOpen(true)},
              {label:'🚦 Alertas',  val:alertCount,  sub:'trânsito',   col:'var(--yellow)', onClick:()=>setAlertasOpen(true)},
              {label:'👥 Online',   val:onlineCount,  sub:'agora',      col:'var(--cyber)',  onClick:()=>setOnlineOpen(true)},
            ].map((s,i)=>(
              <button key={i} className="stat-card" onClick={s.onClick} style={{cursor:'pointer'}}>
                <div className="stat-label" style={{marginBottom:6}}>{s.label}</div>
                <div className="stat-value" style={{color:s.col}}>{s.val}</div>
                <div className="stat-sub">{s.sub}</div>
              </button>
            ))}
          </div>
        )}

        {/* Notif banner */}
        {notifBanner&&permission==='default'&&!pickMode&&(
          <div style={{
            position:'absolute', top:136, left:16, right:16, zIndex:550,
            background:'rgba(8,8,20,0.94)',
            backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
            border:'1px solid rgba(255,211,42,0.25)',
            borderRadius:18, padding:'14px 16px',
            display:'flex', alignItems:'center', gap:10,
            animation:'slideDown .3s cubic-bezier(.34,1.56,.64,1)',
            boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
          }}>
            <span style={{fontSize:20}}>🔔</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700, fontSize:13, marginBottom:2, fontFamily:"'Outfit',sans-serif"}}>Ativar alertas?</div>
              <div style={{fontSize:11, color:'var(--muted)'}}>Avisos quando um local esquentar</div>
            </div>
            <button onClick={()=>{requestPermission();setNotifBanner(false)}} style={{
              background:'linear-gradient(135deg,var(--electric),var(--neon))',
              border:'none', borderRadius:999, padding:'7px 14px',
              fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:11,
              color:'#fff', cursor:'pointer',
            }}>Ativar</button>
            <button onClick={()=>setNotifBanner(false)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:18,padding:'0 2px'}}>✕</button>
          </div>
        )}
      </div>

      {/* ── HOME ── */}
      {activeTab==='home'&&(
        <HomeTab
          user={user} allPlaces={visiblePlaces} events={events} usersMap={usersMap}
          hotCount={hotCount} totalActive={totalActive} alertCount={alertCount} onlineCount={onlineCount}
          onPlace={loc=>flyToPlace(loc)} onStartAdd={handleStartPick}
          isAdmin={isAdmin} setAdminOpen={setAdminOpen} pendingCount={pendingCount} logout={logout}
          onCategorySelect={filterId=>{setActiveFilter(filterId);setActiveTab('map')}}
          onCityClick={()=>setCityModal(true)}
          onBell={()=>setNotifOpen(true)} notifCount={notifCount}
          onChat={()=>{setChatTarget(null);setChatOpen(true)}} chatUnread={chatUnread}
          onRewards={()=>setRewardsOpen(true)}
        />
      )}

      {/* ── ACTIVITIES ── */}
      {activeTab==='activities'&&(
        <ActivitiesTab
          events={events} usersMap={usersMap} allPlaces={visiblePlaces}
          onPlace={loc=>{setDetailLoc(loc);setActiveTab('map')}}
          user={user} saved={saved} following={following}
          onViewUser={setViewingUid}
        />
      )}

      {/* ── PROFILE ── */}
      {activeTab==='profile'&&(
        <ProfileTab user={user} onLogout={logout} onlineCount={onlineCount} events={events}
          saved={saved} following={following} onUpdateProfile={handleUpdateProfile}
          onSettings={()=>setSettingsOpen(true)} onViewUser={setViewingUid}/>
      )}

      {/* ── BOTTOM NAV ── */}
      {!pickMode&&(
        <BottomNav active={activeTab} onChange={setActiveTab} onAdd={handleStartPick}/>
      )}

      {/* Toast */}
      {toast&&(
        <div style={{
          position:'fixed', bottom:'calc(106px + var(--sab))', left:'50%',
          transform:'translateX(-50%)',
          zIndex:3000, background:toast.bg||'rgba(10,10,24,0.96)', color:toast.color||'var(--text)',
          padding:'11px 24px', borderRadius:999, fontWeight:700, fontSize:13,
          fontFamily:"'DM Sans',sans-serif",
          boxShadow:'0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08) inset',
          backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
          animation:'toastIn .35s cubic-bezier(.34,1.56,.64,1)',
          whiteSpace:'nowrap', pointerEvents:'none',
          border:'1px solid rgba(255,255,255,0.1)',
        }}>{toast.msg}</div>
      )}

      {/* Points */}
      {pointsAlert&&(
        <div style={{
          position:'fixed', top:'42%', left:'50%', transform:'translateX(-50%)',
          zIndex:3000, textAlign:'center', animation:'pointsIn .4s cubic-bezier(.34,1.56,.64,1)',
          pointerEvents:'none',
        }}>
          <div style={{
            background:'rgba(8,8,20,0.96)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
            border:'1px solid rgba(0,245,160,0.3)',
            borderRadius:24, padding:'22px 40px',
            boxShadow:'0 0 40px rgba(0,245,160,0.2)',
          }}>
            <div style={{fontSize:36, marginBottom:6}}>⚡</div>
            <div style={{
              fontFamily:"'Space Mono',monospace", fontSize:36, fontWeight:700,
              color:'var(--cyber)', letterSpacing:'-.02em',
            }}>+{pointsAlert}</div>
            <div style={{fontSize:11, color:'var(--muted)', marginTop:4, textTransform:'uppercase', letterSpacing:'.1em'}}>pontos</div>
          </div>
        </div>
      )}

      {/* Panels */}
      <DetailPanel location={detailLoc} events={events} usersMap={usersMap} user={user}
        onClose={()=>setDetailLoc(null)} onReport={loc=>{setDetailLoc(null);setReportLoc(loc)}}
        onSave={handleToggleSave} saved={saved}/>
      <ReportPanel open={!!reportLoc} location={reportLoc}
        onClose={()=>setReportLoc(null)} onConfirm={handleReport}/>
      <NowPanel open={nowOpen} onClose={()=>setNowOpen(false)}
        events={events} usersMap={usersMap} allPlaces={visiblePlaces}
        onLocationClick={loc=>{setNowOpen(false);setDetailLoc(loc)}}/>

      {/* ── REPORTES PANEL ── */}
      {reportesOpen && (
        <>
          <div onClick={()=>setReportesOpen(false)} style={{position:'fixed',inset:0,zIndex:1500,background:'rgba(0,0,0,0.72)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)'}}/>
          <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:2000,background:'rgba(8,8,20,0.97)',backdropFilter:'blur(40px)',WebkitBackdropFilter:'blur(40px)',border:'1px solid rgba(255,255,255,0.07)',borderBottom:'none',borderRadius:'28px 28px 0 0',maxHeight:'80vh',overflowY:'auto'}}>
            <div style={{width:36,height:4,background:'rgba(255,255,255,0.16)',borderRadius:2,margin:'14px auto 0'}}/>
            <div style={{position:'sticky',top:0,background:'rgba(8,8,20,0.97)',padding:'16px 20px 14px',borderBottom:'1px solid rgba(255,255,255,0.06)',zIndex:1,backdropFilter:'blur(24px)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:18,fontWeight:800,fontFamily:"'Outfit',sans-serif",marginBottom:3}}>📡 Reportes</div>
                  <div style={{fontSize:12,color:'rgba(240,240,255,0.4)'}}>Última hora · {totalActive} ocorrência{totalActive!==1?'s':''}</div>
                </div>
                <button onClick={()=>setReportesOpen(false)} style={{width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',cursor:'pointer',color:'rgba(240,240,255,0.5)',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
              </div>
            </div>
            <div style={{padding:'14px 16px 48px'}}>
              {events.length===0 ? (
                <div style={{textAlign:'center',padding:'48px 0',color:'rgba(240,240,255,0.35)'}}>
                  <div style={{fontSize:40,marginBottom:12}}>📭</div>
                  <div style={{fontSize:14,fontWeight:600}}>Nenhum reporte recente</div>
                </div>
              ) : [...events].sort((a,b)=>b.ts-a.ts).slice(0,30).map(ev=>{
                  const meta  = EVENT_META[ev.type]
                  const place = visiblePlaces.find(p=>p.id===ev.locationId)
                  const ago   = (()=>{const d=Math.floor((Date.now()-ev.ts)/1000);if(d<60)return`${d}s`;if(d<3600)return`${Math.floor(d/60)}min`;return`${Math.floor(d/3600)}h`})()
                  return (
                    <div key={ev.id} onClick={()=>{if(place){setReportesOpen(false);flyToPlace(place)}}} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:'1px solid rgba(255,255,255,0.05)',cursor:place?'pointer':'default'}}>
                      <div style={{width:40,height:40,borderRadius:'50%',flexShrink:0,background:`${meta?.color||'#4f8eff'}18`,border:`1px solid ${meta?.color||'#4f8eff'}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{meta?.emoji||'📍'}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:meta?.color||'var(--text)'}}>{meta?.label||ev.type}</div>
                        <div style={{fontSize:12,color:'rgba(240,240,255,0.4)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{place?`📍 ${place.name}`:'Local desconhecido'}</div>
                      </div>
                      <div style={{fontSize:11,color:'rgba(240,240,255,0.35)',flexShrink:0}}>{ago}</div>
                    </div>
                  )
                })
              }
            </div>
          </div>
        </>
      )}

      {/* ── ALERTAS PANEL ── */}
      {alertasOpen && (
        <>
          <div onClick={()=>setAlertasOpen(false)} style={{position:'fixed',inset:0,zIndex:1500,background:'rgba(0,0,0,0.72)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)'}}/>
          <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:2000,background:'rgba(8,8,20,0.97)',backdropFilter:'blur(40px)',WebkitBackdropFilter:'blur(40px)',border:'1px solid rgba(255,255,255,0.07)',borderBottom:'none',borderRadius:'28px 28px 0 0',maxHeight:'80vh',overflowY:'auto'}}>
            <div style={{width:36,height:4,background:'rgba(255,255,255,0.16)',borderRadius:2,margin:'14px auto 0'}}/>
            <div style={{position:'sticky',top:0,background:'rgba(8,8,20,0.97)',padding:'16px 20px 14px',borderBottom:'1px solid rgba(255,255,255,0.06)',zIndex:1,backdropFilter:'blur(24px)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:18,fontWeight:800,fontFamily:"'Outfit',sans-serif",marginBottom:3}}>🚦 Alertas de Trânsito</div>
                  <div style={{fontSize:12,color:'rgba(240,240,255,0.4)'}}>Ocorrências ativas na cidade</div>
                </div>
                <button onClick={()=>setAlertasOpen(false)} style={{width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',cursor:'pointer',color:'rgba(240,240,255,0.5)',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
              </div>
            </div>
            <div style={{padding:'14px 16px 48px'}}>
              {(() => {
                const trafficTypes = ['pesado','bloqueio','acidente','blitz','obra','alagado','perigo','transito']
                const trafficEvs   = events.filter(e=>trafficTypes.includes(e.type)||EVENT_META[e.type]?.cat==='transito').sort((a,b)=>b.ts-a.ts)
                if (trafficEvs.length===0) return (
                  <div style={{textAlign:'center',padding:'48px 0',color:'rgba(240,240,255,0.35)'}}>
                    <div style={{fontSize:40,marginBottom:12}}>✅</div>
                    <div style={{fontSize:14,fontWeight:600,color:'rgba(240,240,255,0.5)'}}>Trânsito tranquilo</div>
                    <div style={{fontSize:12,marginTop:4}}>Nenhum alerta ativo no momento</div>
                  </div>
                )
                return trafficEvs.map(ev=>{
                  const meta  = EVENT_META[ev.type]
                  const place = visiblePlaces.find(p=>p.id===ev.locationId)
                  const ago   = (()=>{const d=Math.floor((Date.now()-ev.ts)/1000);if(d<60)return`${d}s`;if(d<3600)return`${Math.floor(d/60)}min`;return`${Math.floor(d/3600)}h`})()
                  return (
                    <div key={ev.id} onClick={()=>{if(place){setAlertasOpen(false);flyToPlace(place)}}} style={{display:'flex',alignItems:'center',gap:12,padding:'13px',marginBottom:8,borderRadius:16,background:'rgba(255,211,42,0.05)',border:'1px solid rgba(255,211,42,0.15)',cursor:place?'pointer':'default',transition:'background .2s'}}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,211,42,0.1)'}
                      onMouseLeave={e=>e.currentTarget.style.background='rgba(255,211,42,0.05)'}
                    >
                      <div style={{width:44,height:44,borderRadius:14,flexShrink:0,background:`${meta?.color||'#eab308'}18`,border:`1px solid ${meta?.color||'#eab308'}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{meta?.emoji||'🚦'}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:14,fontWeight:700,color:meta?.color||'#eab308'}}>{meta?.label||ev.type}</div>
                        <div style={{fontSize:12,color:'rgba(240,240,255,0.5)',marginTop:2}}>📍 {place?place.name:'Localização desconhecida'}</div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontSize:11,color:'rgba(240,240,255,0.35)'}}>{ago}</div>
                        {place&&<div style={{fontSize:11,color:'rgba(79,142,255,0.7)',marginTop:3}}>Ver no mapa →</div>}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        </>
      )}

      {/* ── ONLINE PANEL ── */}
      {onlineOpen && (
        <>
          <div onClick={()=>setOnlineOpen(false)} style={{position:'fixed',inset:0,zIndex:1500,background:'rgba(0,0,0,0.72)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)'}}/>
          <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:2000,background:'rgba(8,8,20,0.97)',backdropFilter:'blur(40px)',WebkitBackdropFilter:'blur(40px)',border:'1px solid rgba(255,255,255,0.07)',borderBottom:'none',borderRadius:'28px 28px 0 0',maxHeight:'70vh',overflowY:'auto'}}>
            <div style={{width:36,height:4,background:'rgba(255,255,255,0.16)',borderRadius:2,margin:'14px auto 0'}}/>
            <div style={{padding:'18px 20px 32px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                <div>
                  <div style={{fontSize:18,fontWeight:800,fontFamily:"'Outfit',sans-serif",marginBottom:3}}>👥 Usuários Online</div>
                  <div style={{fontSize:12,color:'rgba(240,240,255,0.4)'}}>Explorando Bauru agora</div>
                </div>
                <button onClick={()=>setOnlineOpen(false)} style={{width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',cursor:'pointer',color:'rgba(240,240,255,0.5)',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
              </div>
              <div style={{background:'rgba(0,245,160,0.06)',border:'1px solid rgba(0,245,160,0.2)',borderRadius:20,padding:'24px',textAlign:'center',marginBottom:20}}>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:48,fontWeight:700,color:'var(--cyber)',lineHeight:1}}>{onlineCount}</div>
                <div style={{fontSize:14,color:'rgba(240,240,255,0.5)',marginTop:8}}>urbanos ativos agora</div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginTop:10}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:'var(--cyber)',animation:'blink 1s ease infinite'}}/>
                  <span style={{fontSize:12,color:'var(--cyber)',fontWeight:700}}>AO VIVO</span>
                </div>
              </div>
              <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:'16px'}}>
                <div style={{fontSize:12,color:'rgba(240,240,255,0.4)',lineHeight:1.6}}>
                  Por privacidade, as posições exatas dos usuários não são exibidas. O contador mostra quantas pessoas estão com o app aberto e conectado agora.
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── REWARDS PANEL ── */}
      <RewardsPanel
        open={rewardsOpen}
        onClose={()=>setRewardsOpen(false)}
        user={user}
        allPlaces={visiblePlaces}
      />
      <AddLocationPanel open={addLocOpen} coords={pickedCoords}
        onClose={handleCancelAdd} onSave={handleSavePlace}/>
      <AdminPanel open={adminOpen} onClose={()=>setAdminOpen(false)} adminUid={user?.uid}/>
      <SettingsPanel open={settingsOpen} user={user} onClose={()=>setSettingsOpen(false)}
        onLogout={logout} onUpdateProfile={handleUpdateProfile}/>
      <CitySelector open={cityModal} currentCity="bauru" onClose={()=>setCityModal(false)}
        onSelect={city=>{ /* could flyTo city coords */ }}/>
      <UserProfilePanel open={!!viewingUid} targetUid={viewingUid}
        currentUser={user} onClose={()=>setViewingUid(null)}
        onOpenChat={(uid,name,photo)=>{
          setChatTarget({uid,name,photo})
          setChatOpen(true)
          setViewingUid(null)
        }}/>

      {/* ── NOTIFICAÇÕES ── */}
      <NotificationsPanel
        open={notifOpen} onClose={()=>setNotifOpen(false)}
        currentUser={user}
        onViewUser={uid=>{setViewingUid(uid);setNotifOpen(false)}}
        onOpenChat={(uid,name,photo)=>{setChatTarget({uid,name,photo});setChatOpen(true);setNotifOpen(false)}}
      />

      {/* ── CHAT PRIVADO ── */}
      <PrivateChatPanel
        open={chatOpen} onClose={()=>{setChatOpen(false);setChatTarget(null)}}
        currentUser={user}
        initialTargetUid={chatTarget?.uid||null}
        initialTargetName={chatTarget?.name||null}
        initialTargetPhoto={chatTarget?.photo||null}
      />

      <style>{`
        @keyframes pulse       {0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:.6}}
        @keyframes blink       {0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes toastIn     {from{opacity:0;transform:translateX(-50%) translateY(10px) scale(.95)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
        @keyframes slideDown   {from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeUp      {from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pointsIn    {0%{opacity:0;transform:translateX(-50%) scale(.5)}70%{transform:translateX(-50%) scale(1.08)}100%{opacity:1;transform:translateX(-50%) scale(1)}}
        @keyframes markerPulse {0%{transform:scale(1);opacity:.8}50%{transform:scale(1.7);opacity:.1}100%{transform:scale(1);opacity:.8}}
        @keyframes rippleCyber {0%{box-shadow:0 0 0 0 rgba(0,245,160,.55)}70%{box-shadow:0 0 0 14px rgba(0,245,160,0)}100%{box-shadow:0 0 0 0 rgba(0,245,160,0)}}
        @keyframes gradientShift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
      `}</style>
    </div>
  )
}
