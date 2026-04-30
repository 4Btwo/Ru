import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ref, update, increment, get } from 'firebase/database'
import { db } from './lib/firebase'
import { useAuth }           from './hooks/useAuth'
import { useEvents }         from './hooks/useEvents'
import { useOnline }         from './hooks/useOnline'
import { useNotifications }  from './hooks/useNotifications'
import { usePlaces }         from './hooks/usePlaces'
import { EVENT_META, DEFAULT_LAT, DEFAULT_LNG, ADMIN_UIDS } from './lib/constants'
import { calcScore, getHeatLevel } from './lib/hotspot'
import { checkAlerts }       from './lib/alerts'
import { seedIfEmpty }       from './lib/seed'
import LoginScreen           from './components/LoginScreen'
import MapView               from './components/MapView'
import ReportPanel           from './components/ReportPanel'
import DetailPanel           from './components/DetailPanel'
import NowPanel              from './components/NowPanel'
import AddLocationPanel      from './components/AddLocationPanel'
import AdminPanel            from './components/AdminPanel'
import TrafficConfirmBanner  from './components/TrafficConfirmBanner'
import { useTrafficConfirm } from './hooks/useTrafficConfirm'
import { useNetworkStatus }  from './hooks/useNetworkStatus'
import NetworkBanner         from './components/NetworkBanner'

/* ── Icons ──────────────────────────────────────────────────────────────────── */
const IC = {
  Home: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Search: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="24" height="24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Activity: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  User: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Bell: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Filter: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>,
  SearchSm: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  MapPin: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Star: ({filled}) => <svg viewBox="0 0 24 24" fill={filled?'#22c55e':'none'} stroke="#22c55e" strokeWidth="2" width="13" height="13"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>,
  ChevronRight: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>,
  Settings: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
}

/* ── Logo Urbyn ──────────────────────────────────────────────────────────────── */
function UrbynLogo({ size=28 }) {
  return (
    <div style={{display:'flex', alignItems:'center', gap:7}}>
      <div style={{
        width:size, height:size, borderRadius:size*.28,
        background:'linear-gradient(135deg,#22c55e,#16a34a)',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'0 4px 14px rgba(34,197,94,.4)', flexShrink:0,
      }}>
        <svg width={size*.55} height={size*.55} viewBox="0 0 24 24" fill="none">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="white" opacity=".92"/>
          <circle cx="12" cy="9" r="2.5" fill="white"/>
        </svg>
      </div>
      <span style={{
        fontSize:size*.85, fontWeight:900, color:'var(--text)',
        fontFamily:"'Inter',sans-serif", letterSpacing:'-.03em', lineHeight:1,
      }}>Urbyn</span>
    </div>
  )
}

/* ── Category filters ────────────────────────────────────────────────────────── */
const FILTERS = [
  {id:'all',           label:'Todos',        emoji:'🗺️'},
  {id:'estabelecimento',label:'Cafeterias',   emoji:'☕'},
  {id:'noturno',       label:'Restaurantes',  emoji:'🍽️'},
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
function HomeTab({user, allPlaces, events, usersMap, hotCount, totalActive, alertCount, onlineCount, onPlace, onStartAdd, isAdmin, setAdminOpen, pendingCount, logout}) {
  const now = Date.now()
  const trending = [...allPlaces]
    .map(p=>({...p, _score:calcScore(p.id, events, usersMap)}))
    .sort((a,b)=>b._score-a._score)
    .slice(0,8)

  const recent = [...allPlaces]
    .sort(()=>Math.random()-.5)
    .slice(0,5)

  return (
    <div style={{
      position:'absolute', inset:0, overflowY:'auto',
      paddingBottom:'calc(72px + env(safe-area-inset-bottom,0px))',
    }}>
      {/* ── Header ── */}
      <div style={{
        position:'sticky', top:0, zIndex:100,
        background:'var(--bg)',
        padding:'calc(14px + var(--sat)) 16px 12px',
        borderBottom:'1px solid var(--border)',
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <UrbynLogo size={28}/>
            <div style={{
              display:'flex', alignItems:'center', gap:4,
              background:'var(--surface2)', border:'1px solid var(--border)',
              borderRadius:100, padding:'5px 10px',
              fontSize:11, color:'var(--muted)', cursor:'pointer',
            }}>
              <IC.MapPin/> <span style={{fontWeight:600}}>Bauru, SP</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            {isAdmin&&(
              <button onClick={()=>setAdminOpen(true)} style={{
                position:'relative', background:pendingCount>0?'rgba(234,179,8,.1)':'var(--surface2)',
                border:`1px solid ${pendingCount>0?'rgba(234,179,8,.4)':'var(--border)'}`,
                borderRadius:10, padding:'7px 10px', cursor:'pointer',
                color:pendingCount>0?'var(--yellow)':'var(--muted)',
                fontSize:14,
              }}>
                🛡️
                {pendingCount>0&&<span style={{position:'absolute', top:-4, right:-4, background:'var(--red)', color:'#fff', fontSize:9, fontWeight:800, borderRadius:'50%', width:15, height:15, display:'flex', alignItems:'center', justifyContent:'center'}}>{pendingCount}</span>}
              </button>
            )}
            <button style={{
              width:36, height:36, borderRadius:'50%',
              background:'var(--surface2)', border:'1px solid var(--border)',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', color:'var(--muted)',
            }}><IC.Bell/></button>
            <div style={{
              width:36, height:36, borderRadius:'50%',
              background:'var(--surface2)', border:'2px solid rgba(34,197,94,.4)',
              overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:16, cursor:'pointer',
            }} onClick={()=>{}}>
              {user.photo?<img src={user.photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:'👤'}
            </div>
          </div>
        </div>
        {/* Greeting */}
        <div style={{fontSize:20, fontWeight:800}}>
          Bom dia, urbano 🤙
        </div>
      </div>

      <div style={{padding:'16px 16px 0'}}>

        {/* Search */}
        <div style={{
          display:'flex', alignItems:'center', gap:10,
          background:'var(--surface2)', border:'1.5px solid var(--border)',
          borderRadius:14, padding:'12px 14px', marginBottom:20,
          transition:'border-color .2s',
        }}
          onClick={()=>{}}
          onFocus={e=>e.currentTarget.style.borderColor='var(--green)'}
          onBlur={e=>e.currentTarget.style.borderColor='var(--border)'}
        >
          <IC.SearchSm/>
          <input placeholder="Buscar lugares, comidas, experiências..."
            style={{background:'none', border:'none', outline:'none', color:'var(--text)',
              fontFamily:"'Inter',sans-serif", fontSize:14, flex:1}}/>
          <IC.Filter/>
        </div>

        {/* Stats strip */}
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(4,1fr)',
          gap:8, marginBottom:24,
        }}>
          {[
            {icon:'🔥', val:hotCount,    label:'Hotspots', col:'var(--red)'},
            {icon:'📡', val:totalActive, label:'Reportes',  col:'var(--text)'},
            {icon:'🚦', val:alertCount,  label:'Alertas',   col:'var(--yellow)'},
            {icon:'👥', val:onlineCount, label:'Online',    col:'var(--blue)'},
          ].map((s,i)=>(
            <div key={i} style={{
              background:'var(--surface2)', border:'1px solid var(--border)',
              borderRadius:14, padding:'12px 8px', textAlign:'center',
            }}>
              <div style={{fontSize:18, marginBottom:4}}>{s.icon}</div>
              <div style={{fontFamily:"'Space Mono',monospace", fontSize:16, fontWeight:700, color:s.col, lineHeight:1}}>{s.val}</div>
              <div style={{fontSize:9, color:'var(--muted)', marginTop:3, textTransform:'uppercase', letterSpacing:'.05em'}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Categorias */}
        <SectionHeader title="Categorias" action="Ver todas"/>
        <div style={{display:'flex', gap:10, marginBottom:24, overflowX:'auto', scrollbarWidth:'none', paddingBottom:2}}>
          {[
            {emoji:'☕', label:'Cafeterias',   col:'#f97316'},
            {emoji:'🍽️', label:'Restaurantes', col:'var(--purple)'},
            {emoji:'🍺', label:'Bares',         col:'var(--yellow)'},
            {emoji:'🎭', label:'Arte & Cultura',col:'var(--blue)'},
            {emoji:'🌿', label:'Parques',        col:'var(--green)'},
          ].map((c,i)=>(
            <div key={i} style={{
              flexShrink:0, textAlign:'center', cursor:'pointer',
              background:'var(--surface2)', border:'1px solid var(--border)',
              borderRadius:16, padding:'16px 12px', minWidth:74,
              transition:'border-color .2s',
            }}>
              <div style={{fontSize:26, marginBottom:7}}>{c.emoji}</div>
              <div style={{fontSize:10, color:'var(--muted)', fontWeight:600}}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Em alta */}
        <SectionHeader title="🔥 Em alta perto de você"/>
        <div style={{display:'flex', gap:12, marginBottom:24, overflowX:'auto', scrollbarWidth:'none', paddingBottom:4}}>
          {trending.map(p=>(
            <div key={p.id} onClick={()=>onPlace(p)} style={{
              flexShrink:0, width:165,
              background:'var(--surface2)', border:'1px solid var(--border)',
              borderRadius:16, overflow:'hidden', cursor:'pointer',
              transition:'border-color .2s',
            }}>
              <div style={{
                height:96, background:`linear-gradient(135deg, var(--surface3), var(--bg2))`,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:36,
                position:'relative',
              }}>
                {CAT_EMOJI[p.cat]||'📍'}
                {p._score>6&&<div style={{
                  position:'absolute', top:6, right:6,
                  background:'var(--red)', borderRadius:20,
                  padding:'2px 7px', fontSize:9, fontWeight:800, color:'#fff',
                }}>🔥 HOT</div>}
              </div>
              <div style={{padding:'10px 11px'}}>
                <div style={{fontSize:12, fontWeight:700, marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{p.name}</div>
                <div style={{fontSize:10, color:'var(--muted)', marginBottom:5}}>{CAT_LABEL[p.cat]||'Local'} · Bauru</div>
                <div style={{display:'flex', alignItems:'center', gap:4}}>
                  <Stars score={p._score}/>
                  <span style={{fontFamily:"'Space Mono',monospace", fontSize:10, color:'var(--green)', fontWeight:700}}>
                    {Math.min(5,Math.max(1,p._score)).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recomendados */}
        <SectionHeader title="Recomendados para você" action="Ver todos"/>
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {recent.map(p=>(
            <div key={p.id} onClick={()=>onPlace(p)} style={{
              display:'flex', alignItems:'center', gap:12,
              background:'var(--surface2)', border:'1px solid var(--border)',
              borderRadius:16, padding:'12px 14px', cursor:'pointer',
              transition:'border-color .15s',
            }}>
              <div style={{
                width:50, height:50, borderRadius:12, flexShrink:0,
                background:'var(--surface3)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
              }}>{CAT_EMOJI[p.cat]||'📍'}</div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:14, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{p.name}</div>
                <div style={{fontSize:11, color:'var(--muted)', marginTop:2}}>{CAT_LABEL[p.cat]||'Local'} · Bauru, SP</div>
                <div style={{display:'flex', alignItems:'center', gap:6, marginTop:4}}>
                  <Stars score={calcScore(p.id,events,usersMap)}/>
                  <span style={{fontSize:10, color:'var(--green)', fontWeight:700}}>
                    {Math.min(5,Math.max(1,calcScore(p.id,events,usersMap))).toFixed(1)}
                  </span>
                  <span style={{fontSize:10, color:'var(--muted)'}}>
                    · {(Math.random()*2+0.1).toFixed(1)} km
                  </span>
                </div>
              </div>
              <IC.ChevronRight/>
            </div>
          ))}
        </div>

        <div style={{height:16}}/>
      </div>
    </div>
  )
}

/* ── Atividades Tab ───────────────────────────────────────────────────────────── */
function ActivitiesTab({events, usersMap, allPlaces, onPlace}) {
  const now = Date.now()
  const recent = [...events].sort((a,b)=>b.ts-a.ts).slice(0,30)
  const timeAgo = ts => {
    const d = Math.floor((now-ts)/1000)
    if (d<60) return `${d}s atrás`
    if (d<3600) return `${Math.floor(d/60)} min`
    return `${Math.floor(d/3600)}h`
  }
  const [tab, setTab] = useState('todos')

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
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
          <div style={{fontSize:20, fontWeight:800}}>Atividades</div>
          <button style={{
            width:34, height:34, borderRadius:'50%',
            background:'var(--surface2)', border:'1px solid var(--border)',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', color:'var(--muted)',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
            </svg>
          </button>
        </div>
        <div style={{display:'flex', gap:8}}>
          {['todos','curtidas','comentários','seguindo'].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{
              padding:'7px 13px', borderRadius:100,
              background:tab===t?'rgba(34,197,94,.13)':'var(--surface2)',
              border:`1px solid ${tab===t?'var(--green)':'var(--border)'}`,
              color:tab===t?'var(--green)':'var(--muted)',
              fontFamily:"'Inter',sans-serif", fontWeight:600, fontSize:11, cursor:'pointer',
              textTransform:'capitalize',
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{padding:'0 16px'}}>
        {recent.length===0 ? (
          <div style={{textAlign:'center', padding:'56px 0', color:'var(--muted)'}}>
            <div style={{fontSize:40, marginBottom:12}}>📭</div>
            <div style={{fontSize:14, fontWeight:600, marginBottom:6}}>Nenhuma atividade</div>
            <div style={{fontSize:12}}>Explore a cidade e reporte ocorrências!</div>
          </div>
        ) : recent.map(ev=>{
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
                  <span style={{color:meta?.color||'var(--green)'}}>
                    {meta?.label||ev.type}
                  </span>
                </div>
                <div style={{fontSize:12, color:'var(--muted)'}}>
                  {place?`em ${place.name}`:'local desconhecido'}
                </div>
              </div>
              <div style={{fontSize:11, color:'var(--dim)', flexShrink:0}}>{timeAgo(ev.ts)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Perfil Tab ───────────────────────────────────────────────────────────────── */
function ProfileTab({user, onLogout, onlineCount, events}) {
  const myReports = events.filter(e=>e.userId===user?.uid).length

  return (
    <div style={{
      position:'absolute', inset:0, overflowY:'auto',
      paddingBottom:'calc(72px + env(safe-area-inset-bottom,0px))',
    }}>
      {/* Header */}
      <div style={{
        padding:'calc(14px + var(--sat)) 16px 16px',
        borderBottom:'1px solid var(--border)',
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
          <div style={{fontSize:20, fontWeight:800}}>Perfil</div>
          <div style={{display:'flex', gap:8}}>
            <button style={{
              width:34, height:34, borderRadius:'50%',
              background:'var(--surface2)', border:'1px solid var(--border)',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', color:'var(--muted)',
            }}><IC.Settings/></button>
            <button style={{
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
          </div>
        </div>

        {/* Avatar + info */}
        <div style={{display:'flex', alignItems:'center', gap:16, marginBottom:20}}>
          <div style={{
            width:76, height:76, borderRadius:'50%', flexShrink:0,
            background:'var(--surface3)', border:'3px solid var(--green)',
            overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32,
          }}>
            {user.photo?<img src={user.photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:'👤'}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:18, fontWeight:800, marginBottom:2}}>{user.name||'Urbano'}</div>
            <div style={{fontSize:12, color:'var(--muted)', marginBottom:6}}>
              @{(user.name||'user').toLowerCase().replace(/\s+/g,'')}
            </div>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:5,
              background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.25)',
              borderRadius:100, padding:'3px 10px',
              fontSize:11, color:'var(--green)', fontWeight:700,
            }}>🏆 Explorador Urbano</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10}}>
          {[
            {val:myReports||user.reports||0, label:'Avaliações'},
            {val:32, label:'Seguindo'},
            {val:156, label:'Seguidores'},
          ].map((s,i)=>(
            <div key={i} style={{
              background:'var(--surface2)', border:'1px solid var(--border)',
              borderRadius:14, padding:'14px 8px', textAlign:'center',
            }}>
              <div style={{fontFamily:"'Space Mono',monospace", fontSize:22, fontWeight:700, marginBottom:3}}>{s.val}</div>
              <div style={{fontSize:11, color:'var(--muted)'}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{padding:'16px 16px 0'}}>
        {/* Pontuação */}
        <div style={{
          background:'rgba(34,197,94,.07)', border:'1px solid rgba(34,197,94,.2)',
          borderRadius:16, padding:16, marginBottom:20,
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div>
            <div style={{fontSize:10, textTransform:'uppercase', letterSpacing:'.12em', color:'var(--muted)', marginBottom:4}}>⚡ PONTUAÇÃO TOTAL</div>
            <div style={{fontFamily:"'Space Mono',monospace", fontSize:32, fontWeight:700, color:'var(--green)'}}>
              {user.score??0} <span style={{fontSize:14, color:'var(--muted)'}}>pts</span>
            </div>
          </div>
          <div style={{fontSize:40}}>🌟</div>
        </div>

        {/* Tabs Avaliações / Salvos / Selos */}
        <div style={{display:'flex', gap:0, borderBottom:'1px solid var(--border)', marginBottom:16}}>
          {['Avaliações','Salvos','Selos'].map((t,i)=>(
            <button key={t} style={{
              flex:1, padding:'10px 0',
              background:'none', border:'none',
              borderBottom:`2px solid ${i===0?'var(--green)':'transparent'}`,
              color:i===0?'var(--green)':'var(--muted)',
              fontSize:12, fontWeight:i===0?700:500,
              cursor:'pointer', fontFamily:"'Inter',sans-serif",
            }}>{t}</button>
          ))}
        </div>

        {/* Placeholder cards */}
        {[
          {emoji:'☕', name:'Café Recanto', cat:'Cafeteria · Vila Madalena', score:4.8, time:'2 dias atrás'},
          {emoji:'🍔', name:'Beco do Hambúrguer', cat:'Hamburgeria · Pinheiros', score:4.6, time:'1 semana atrás'},
        ].map((p,i)=>(
          <div key={i} style={{
            display:'flex', alignItems:'center', gap:12,
            background:'var(--surface2)', border:'1px solid var(--border)',
            borderRadius:14, padding:'12px 14px', marginBottom:10,
            cursor:'pointer',
          }}>
            <div style={{width:48, height:48, borderRadius:10, background:'var(--surface3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0}}>{p.emoji}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14, fontWeight:700}}>{p.name}</div>
              <div style={{fontSize:11, color:'var(--muted)', marginTop:2}}>{p.cat}</div>
              <div style={{display:'flex', alignItems:'center', gap:4, marginTop:4}}>
                <Stars score={p.score}/>
                <span style={{fontFamily:"'Space Mono',monospace", fontSize:10, color:'var(--green)'}}>{p.score}</span>
              </div>
            </div>
            <div style={{fontSize:10, color:'var(--dim)'}}>{p.time}</div>
          </div>
        ))}

        {/* Logout */}
        <button onClick={onLogout} style={{
          width:'100%', padding:14, borderRadius:14, marginTop:8,
          background:'rgba(239,68,68,.07)', border:'1px solid rgba(239,68,68,.25)',
          color:'var(--red)', fontFamily:"'Inter',sans-serif",
          fontWeight:700, fontSize:14, cursor:'pointer',
        }}>Sair da conta</button>
        <div style={{height:16}}/>
      </div>
    </div>
  )
}

/* ── Section header helper ───────────────────────────────────────────────────── */
function SectionHeader({title, action}) {
  return (
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
      <div style={{fontSize:15, fontWeight:800}}>{title}</div>
      {action&&<button style={{background:'none', border:'none', color:'var(--green)', fontSize:12, fontWeight:600, cursor:'pointer'}}>{action}</button>}
    </div>
  )
}

/* ── Bottom Nav ──────────────────────────────────────────────────────────────── */
function BottomNav({active, onChange, onAdd}) {
  const tabs = [
    {id:'home',       label:'Início',     Icon:IC.Home},
    {id:'map',        label:'Explorar',   Icon:IC.Search},
    {id:'__fab__',    label:'',           Icon:null},
    {id:'activities', label:'Atividades', Icon:IC.Activity},
    {id:'profile',    label:'Perfil',     Icon:IC.User},
  ]
  return (
    <div style={{
      position:'fixed', bottom:0, left:0, right:0, zIndex:900,
      background:'var(--surface)',
      borderTop:'1px solid var(--border)',
      display:'flex', alignItems:'center', justifyContent:'space-around',
      paddingTop:8,
      paddingBottom:'calc(8px + var(--sab))',
    }}>
      {tabs.map(tab=>{
        if (!tab.Icon) return (
          <button key="fab" onClick={onAdd} style={{
            width:52, height:52, borderRadius:'50%',
            background:'var(--green)', border:'none', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 4px 20px rgba(34,197,94,.45)',
            marginTop:-20, flexShrink:0, color:'#052e16',
            transition:'transform .15s, box-shadow .15s',
          }}
            onMouseDown={e=>e.currentTarget.style.transform='scale(.93)'}
            onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
            onTouchStart={e=>e.currentTarget.style.transform='scale(.93)'}
            onTouchEnd={e=>e.currentTarget.style.transform='scale(1)'}
          ><IC.Plus/></button>
        )
        const isActive = active===tab.id
        return (
          <button key={tab.id} onClick={()=>onChange(tab.id)} style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:3,
            padding:'5px 14px', cursor:'pointer',
            border:'none', background:'none',
            color:isActive?'var(--green)':'var(--muted)',
            fontFamily:"'Inter',sans-serif", fontWeight:600, fontSize:10,
            transition:'color .2s',
          }}>
            <tab.Icon/>
            {tab.label}
          </button>
        )
      })}
    </div>
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

  const [userPos,     setUserPos]     = useState(null)
  const [reportLoc,   setReportLoc]   = useState(null)
  const [detailLoc,   setDetailLoc]   = useState(null)
  const [nowOpen,     setNowOpen]     = useState(false)
  const [adminOpen,   setAdminOpen]   = useState(false)
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

  const isAdmin = ADMIN_UIDS.includes(user?.uid)

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

  const showToast = useCallback((msg,bg='var(--green)',color='#052e16')=>{
    setToast({msg,bg,color})
    setTimeout(()=>setToast(null),2800)
  },[])

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
    if(activeFilter==='blitz') return events.some(e=>e.locationId===loc.id&&e.type==='blitz')
    if(activeFilter==='estabelecimento') return loc.cat==='estabelecimento'
    return true
  }).map(l=>l.id)

  /* ── Loading ── */
  if (loading) return (
    <div style={{position:'fixed',inset:0,background:'var(--bg)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20}}>
      <UrbynLogo size={36}/>
      <div style={{width:12,height:12,borderRadius:'50%',background:'var(--green)',boxShadow:'0 0 20px var(--green)',animation:'pulse 1.4s ease infinite'}}/>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.4);opacity:.6}}`}</style>
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
          allPlaces={visiblePlaces} events={events} usersMap={usersMap}
          filteredIds={filteredIds}
          onLocationClick={loc=>{if(!pickMode)setDetailLoc(loc)}}
          userPos={userPos} pickMode={pickMode} onPick={handlePick}
        />

        {/* Map top bar */}
        {!pickMode&&(
          <div style={{
            position:'absolute', top:0, left:0, right:0, zIndex:500,
            padding:'calc(12px + var(--sat)) 16px 0',
            background:'linear-gradient(to bottom,rgba(12,26,18,.97) 60%,transparent)',
          }}>
            {/* Logo row */}
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
              <UrbynLogo size={26}/>
              <div style={{display:'flex', gap:8, alignItems:'center'}}>
                {onlineCount>1&&(
                  <span style={{
                    background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.25)',
                    borderRadius:100, padding:'4px 10px', fontSize:10, color:'var(--green)',
                    fontFamily:"'Space Mono',monospace",
                  }}>● {onlineCount} online</span>
                )}
                {isAdmin&&(
                  <button onClick={()=>setAdminOpen(true)} style={{
                    position:'relative',
                    background:pendingCount>0?'rgba(234,179,8,.1)':'var(--surface2)',
                    border:`1px solid ${pendingCount>0?'rgba(234,179,8,.4)':'var(--border)'}`,
                    borderRadius:10, padding:'6px 10px', cursor:'pointer',
                    color:pendingCount>0?'var(--yellow)':'var(--muted)',
                    fontSize:14,
                  }}>
                    🛡️
                    {pendingCount>0&&<span style={{position:'absolute', top:-4, right:-4, background:'var(--red)', color:'#fff', fontSize:9, fontWeight:800, borderRadius:'50%', width:15, height:15, display:'flex', alignItems:'center', justifyContent:'center'}}>{pendingCount}</span>}
                  </button>
                )}
                <div style={{
                  fontFamily:"'Space Mono',monospace",
                  background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.2)',
                  borderRadius:100, padding:'5px 12px', fontSize:11, color:'var(--green)',
                }}>⚡ {user.score??0} pts</div>
                <div onClick={logout} style={{
                  width:34, height:34, borderRadius:'50%',
                  background:'var(--surface2)', border:'2px solid rgba(34,197,94,.3)',
                  cursor:'pointer', overflow:'hidden',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  {user.photo?<img src={user.photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:15}}>👤</span>}
                </div>
              </div>
            </div>

            {/* Search on map */}
            <div style={{
              display:'flex', alignItems:'center', gap:10,
              background:'rgba(17,30,22,.94)', border:'1px solid var(--border)',
              borderRadius:14, padding:'10px 14px', marginBottom:10,
              backdropFilter:'blur(12px)',
            }}>
              <IC.SearchSm/>
              <input placeholder="Buscar lugares, comidas..."
                style={{background:'none', border:'none', outline:'none', color:'var(--text)',
                  fontFamily:"'Inter',sans-serif", fontSize:13, flex:1}}/>
              <IC.Filter/>
            </div>

            {/* Category chips */}
            <div style={{display:'flex', gap:8, overflowX:'auto', scrollbarWidth:'none', paddingBottom:10}}>
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
            background:'rgba(34,197,94,.95)',
            padding:'calc(16px + var(--sat)) 16px 14px',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            animation:'slideDown .25s ease',
          }}>
            <div style={{display:'flex', alignItems:'center', gap:10}}>
              <span style={{fontSize:20}}>📍</span>
              <div>
                <div style={{fontWeight:800, fontSize:14, color:'#052e16'}}>Toque no mapa para marcar</div>
                <div style={{fontSize:11, opacity:.8, color:'#052e16'}}>Escolha o ponto exato</div>
              </div>
            </div>
            <button onClick={handleCancelAdd} style={{
              background:'rgba(0,0,0,.15)', border:'none', borderRadius:8,
              padding:'6px 12px', color:'#052e16', cursor:'pointer',
              fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:12,
            }}>Cancelar</button>
          </div>
        )}

        {/* Bottom stat cards */}
        {!pickMode&&(
          <div style={{
            position:'absolute', bottom:0, left:0, right:0, zIndex:500,
            paddingTop:14, paddingLeft:16, paddingRight:16,
            paddingBottom:'calc(72px + env(safe-area-inset-bottom,0px))',
            background:'linear-gradient(to top,rgba(12,26,18,.97) 55%,transparent)',
            display:'flex', gap:10, overflowX:'auto', scrollbarWidth:'none',
          }}>
            <button onClick={()=>setNowOpen(true)} style={{
              flexShrink:0, minWidth:110,
              background:hotCount>0?'rgba(239,68,68,.1)':'var(--surface)',
              border:`1px solid ${hotCount>0?'rgba(239,68,68,.45)':'var(--border)'}`,
              borderRadius:14, padding:'10px 14px', cursor:'pointer',
              fontFamily:"'Inter',sans-serif",
            }}>
              <div style={{fontSize:10, textTransform:'uppercase', letterSpacing:'.1em', color:hotCount>0?'var(--red)':'var(--muted)', marginBottom:4}}>🔴 Agora</div>
              <div style={{fontFamily:"'Space Mono',monospace", fontSize:20, fontWeight:700, color:hotCount>0?'var(--red)':'var(--text)'}}>{hotCount}</div>
              <div style={{fontSize:10, color:'var(--muted)', marginTop:2}}>hotspots</div>
            </button>
            {[
              {label:'📡 Reportes', val:totalActive, sub:'última hora', col:'var(--text)'},
              {label:'🚦 Alertas',  val:alertCount,  sub:'trânsito',   col:'var(--yellow)'},
              {label:'👥 Online',   val:onlineCount,  sub:'agora',      col:'var(--text)'},
            ].map((s,i)=>(
              <div key={i} style={{
                flexShrink:0, minWidth:110,
                background:'var(--surface)', border:'1px solid var(--border)',
                borderRadius:14, padding:'10px 14px',
              }}>
                <div style={{fontSize:10, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--muted)', marginBottom:4}}>{s.label}</div>
                <div style={{fontFamily:"'Space Mono',monospace", fontSize:20, fontWeight:700, color:s.col}}>{s.val}</div>
                <div style={{fontSize:10, color:'var(--muted)', marginTop:2}}>{s.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Notif banner */}
        {notifBanner&&permission==='default'&&!pickMode&&(
          <div style={{
            position:'absolute', top:130, left:16, right:16, zIndex:550,
            background:'var(--surface)', border:'1px solid rgba(234,179,8,.3)',
            borderRadius:14, padding:'12px 14px',
            display:'flex', alignItems:'center', gap:10,
            animation:'slideDown .3s ease',
          }}>
            <span style={{fontSize:20}}>🔔</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700, fontSize:13, marginBottom:1}}>Ativar alertas?</div>
              <div style={{fontSize:11, color:'var(--muted)'}}>Avisos quando um local esquentar</div>
            </div>
            <button onClick={()=>{requestPermission();setNotifBanner(false)}} style={{
              background:'var(--green)', border:'none', borderRadius:8, padding:'6px 12px',
              fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:11, color:'#052e16', cursor:'pointer',
            }}>Ativar</button>
            <button onClick={()=>setNotifBanner(false)} style={{background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:16}}>✕</button>
          </div>
        )}
      </div>

      {/* ── HOME ── */}
      {activeTab==='home'&&(
        <HomeTab
          user={user} allPlaces={visiblePlaces} events={events} usersMap={usersMap}
          hotCount={hotCount} totalActive={totalActive} alertCount={alertCount} onlineCount={onlineCount}
          onPlace={loc=>setDetailLoc(loc)} onStartAdd={handleStartPick}
          isAdmin={isAdmin} setAdminOpen={setAdminOpen} pendingCount={pendingCount} logout={logout}
        />
      )}

      {/* ── ACTIVITIES ── */}
      {activeTab==='activities'&&(
        <ActivitiesTab
          events={events} usersMap={usersMap} allPlaces={visiblePlaces}
          onPlace={loc=>{setDetailLoc(loc);setActiveTab('map')}}
        />
      )}

      {/* ── PROFILE ── */}
      {activeTab==='profile'&&(
        <ProfileTab user={user} onLogout={logout} onlineCount={onlineCount} events={events}/>
      )}

      {/* ── BOTTOM NAV ── */}
      {!pickMode&&(
        <BottomNav active={activeTab} onChange={setActiveTab} onAdd={handleStartPick}/>
      )}

      {/* Toast */}
      {toast&&(
        <div style={{
          position:'fixed', bottom:88, left:'50%', transform:'translateX(-50%)',
          zIndex:3000, background:toast.bg, color:toast.color,
          padding:'10px 22px', borderRadius:22, fontWeight:700, fontSize:13,
          boxShadow:'0 4px 24px rgba(0,0,0,.5)', animation:'toastIn .3s ease',
          whiteSpace:'nowrap', pointerEvents:'none',
        }}>{toast.msg}</div>
      )}

      {/* Points */}
      {pointsAlert&&(
        <div style={{
          position:'fixed', top:'42%', left:'50%', transform:'translateX(-50%)',
          zIndex:3000, textAlign:'center', animation:'pointsIn .35s ease', pointerEvents:'none',
        }}>
          <div style={{background:'rgba(17,30,22,.97)', border:'1px solid var(--border)', borderRadius:20, padding:'20px 36px'}}>
            <div style={{fontSize:32}}>⚡</div>
            <div style={{fontFamily:"'Space Mono',monospace", fontSize:32, fontWeight:700, color:'var(--green)'}}>+{pointsAlert}</div>
            <div style={{fontSize:11, color:'var(--muted)', marginTop:2}}>pontos</div>
          </div>
        </div>
      )}

      {/* Panels */}
      <DetailPanel location={detailLoc} events={events} usersMap={usersMap} user={user}
        onClose={()=>setDetailLoc(null)} onReport={loc=>{setDetailLoc(null);setReportLoc(loc)}}/>
      <ReportPanel open={!!reportLoc} location={reportLoc}
        onClose={()=>setReportLoc(null)} onConfirm={handleReport}/>
      <NowPanel open={nowOpen} onClose={()=>setNowOpen(false)}
        events={events} usersMap={usersMap} onLocationClick={loc=>{setNowOpen(false);setDetailLoc(loc)}}/>
      <AddLocationPanel open={addLocOpen} coords={pickedCoords}
        onClose={handleCancelAdd} onSave={handleSavePlace}/>
      <AdminPanel open={adminOpen} onClose={()=>setAdminOpen(false)} adminUid={user?.uid}/>

      <style>{`
        @keyframes pulse     {0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:.7}}
        @keyframes toastIn   {from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes slideDown {from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeUp    {from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pointsIn  {0%{opacity:0;transform:translateX(-50%) scale(.6)}70%{transform:translateX(-50%) scale(1.1)}100%{opacity:1;transform:translateX(-50%) scale(1)}}
        @keyframes markerPulse {0%{transform:scale(1);opacity:.7}50%{transform:scale(1.5);opacity:.15}100%{transform:scale(1);opacity:.7}}
      `}</style>
    </div>
  )
}
