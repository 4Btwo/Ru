// ── PAINEL ADMIN — reports gerais + moderação de locais fixos ─────────────────
import React, { useState, useEffect } from 'react'
import { ref, onValue, update, remove } from 'firebase/database'
import { db } from '../lib/firebase'
import { EVENT_META } from '../lib/constants'

const STATUS_COLORS = {
  pending:  { color:'#ffcc00', bg:'rgba(255,204,0,.12)',  label:'Pendente'  },
  approved: { color:'#00ff88', bg:'rgba(0,255,136,.10)', label:'Aprovado'  },
  rejected: { color:'#ff2d55', bg:'rgba(255,45,85,.10)', label:'Rejeitado' },
}

// ── Abas principais ────────────────────────────────────────────────────────────
const MAIN_TABS = [
  { id:'reports',  label:'📊 Reports',   color:'#ff2d55' },
  { id:'moderation', label:'🛡️ Moderação', color:'#ffcc00' },
]

export default function AdminPanel({ open, onClose, adminUid }) {
  const [mainTab,  setMainTab]  = useState('reports')
  const [modTab,   setModTab]   = useState('pending')
  const [places,   setPlaces]   = useState([])
  const [events,   setEvents]   = useState([])
  const [allPlaces,setAllPlaces]= useState([])
  const [busy,     setBusy]     = useState(null)
  const [reportFilter, setReportFilter] = useState('all')

  useEffect(() => {
    if (!open) return

    // Escuta places (moderação)
    const unsubPlaces = onValue(ref(db, 'places'), snap => {
      const data = snap.val()
      if (!data) return setPlaces([])
      const list = Object.entries(data).map(([id, v]) => ({ id, ...v }))
      setAllPlaces(list)
      // Moderação: apenas fixos que precisam de revisão
      setPlaces(list.filter(p => p.needsModeration === true || p.cat === 'noturno' || p.cat === 'estabelecimento'))
    })

    // Escuta events (todos os reports)
    const unsubEvents = onValue(ref(db, 'events'), snap => {
      const data = snap.val()
      if (!data) return setEvents([])
      const list = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 200)  // últimos 200
      setEvents(list)
    })

    return () => { unsubPlaces(); unsubEvents() }
  }, [open])

  // ── Moderação helpers ────────────────────────────────────────────────────────
  const pending  = places.filter(p => !p.status || p.status === 'pending')
  const approved = places.filter(p => p.status === 'approved')
  const rejected = places.filter(p => p.status === 'rejected')
  const modList  = { pending, approved, rejected }[modTab]

  const approve = async (place) => {
    setBusy(place.id)
    await update(ref(db, `places/${place.id}`), { status:'approved', approvedBy:adminUid, approvedAt:Date.now() })
    setBusy(null)
  }
  const reject = async (place) => {
    setBusy(place.id)
    await update(ref(db, `places/${place.id}`), { status:'rejected', rejectedBy:adminUid, rejectedAt:Date.now() })
    setBusy(null)
  }
  const deletePlace = async (place) => {
    if (!confirm(`Remover "${place.name}" permanentemente?`)) return
    setBusy(place.id)
    await remove(ref(db, `places/${place.id}`))
    setBusy(null)
  }
  const restore = async (place) => {
    setBusy(place.id)
    await update(ref(db, `places/${place.id}`), { status:'pending' })
    setBusy(null)
  }
  const deleteEvent = async (ev) => {
    if (!confirm('Remover este reporte?')) return
    await remove(ref(db, `events/${ev.id}`))
  }

  // ── Filtros de reports ───────────────────────────────────────────────────────
  const filteredEvents = reportFilter === 'all'
    ? events
    : events.filter(ev => {
        if (reportFilter === 'transito') return ['pesado','bloqueio','acidente','blitz'].includes(ev.type)
        if (reportFilter === 'noturno')  return ['cheio','evento','morto'].includes(ev.type)
        if (reportFilter === 'spam')     return ev.isSpam
        return true
      })

  const pendingCount = pending.length

  return (
    <>
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:2400,
        background:'rgba(0,0,0,.75)', backdropFilter:'blur(4px)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none',
        transition:'opacity .25s',
      }}/>

      <div style={{
        position:'fixed', inset:0, zIndex:2500,
        background:'#0d0d15',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition:'transform .35s cubic-bezier(.4,0,.2,1)',
        display:'flex', flexDirection:'column',
        fontFamily:"'Syne',sans-serif",
      }}>
        {/* ── Header ── */}
        <div style={{
          padding:'16px 20px 0',
          borderBottom:'1px solid #1e1e30',
          background:'#0d0d15',
          flexShrink:0,
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{
                width:32, height:32, borderRadius:8,
                background:'rgba(255,45,85,.15)', border:'1px solid rgba(255,45,85,.3)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
              }}>🛡️</div>
              <div>
                <div style={{ fontSize:16, fontWeight:800 }}>Painel Admin</div>
                <div style={{ fontSize:11, color:'#6666aa', marginTop:1 }}>
                  {events.length} reports · {places.length} locais fixos
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{
              width:36, height:36, borderRadius:10,
              background:'#1a1a26', border:'1px solid #2a2a3d',
              cursor:'pointer', color:'#6666aa', fontSize:16,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>✕</button>
          </div>

          {/* ── Tabs principais ── */}
          <div style={{ display:'flex', gap:4 }}>
            {MAIN_TABS.map(t => (
              <button key={t.id} onClick={() => setMainTab(t.id)} style={{
                flex:1, padding:'10px 4px', border:'none',
                borderBottom: mainTab===t.id ? `2px solid ${t.color}` : '2px solid transparent',
                background:'transparent', cursor:'pointer',
                fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:13,
                color: mainTab===t.id ? t.color : '#4a4a6a',
                transition:'all .2s', position:'relative',
              }}>
                {t.label}
                {t.id === 'moderation' && pendingCount > 0 && (
                  <span style={{
                    marginLeft:6, background:'#ff2d55', color:'#fff',
                    fontSize:9, fontWeight:800, borderRadius:'50%',
                    width:16, height:16, display:'inline-flex',
                    alignItems:'center', justifyContent:'center',
                  }}>{pendingCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Conteúdo ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>

          {/* ===== REPORTS ===== */}
          {mainTab === 'reports' && (
            <>
              {/* Filtros */}
              <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
                {[
                  { id:'all',      label:'🗺️ Todos' },
                  { id:'transito', label:'🚦 Trânsito' },
                  { id:'noturno',  label:'🌙 Noturno' },
                ].map(f => (
                  <button key={f.id} onClick={() => setReportFilter(f.id)} style={{
                    padding:'5px 12px', borderRadius:20,
                    background: reportFilter===f.id ? 'rgba(255,45,85,.15)' : '#1a1a26',
                    border:`1px solid ${reportFilter===f.id ? '#ff2d55' : '#2a2a3d'}`,
                    color: reportFilter===f.id ? '#ff2d55' : '#6666aa',
                    fontFamily:"'Syne',sans-serif", fontWeight:600, fontSize:11, cursor:'pointer',
                  }}>{f.label}</button>
                ))}
                <div style={{ marginLeft:'auto', fontSize:11, color:'#4a4a6a', alignSelf:'center' }}>
                  {filteredEvents.length} reports
                </div>
              </div>

              {/* Lista de events */}
              {filteredEvents.length === 0 ? (
                <EmptyState icon="📊" title="Nenhum reporte" sub="Os reports aparecem aqui em tempo real" />
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {filteredEvents.map(ev => {
                    const meta  = EVENT_META[ev.type]
                    const place = allPlaces.find(p => p.id === ev.locationId)
                    const mins  = Math.round((Date.now() - ev.ts) / 60000)
                    const timeStr = mins === 0 ? 'agora' : mins < 60 ? `há ${mins}min` : `há ${Math.floor(mins/60)}h`
                    return (
                      <div key={ev.id} style={{
                        background:'#12121a', border:'1px solid #1e1e30',
                        borderRadius:12, padding:'12px 14px',
                        display:'flex', alignItems:'center', gap:10,
                      }}>
                        <div style={{
                          width:36, height:36, borderRadius:9, flexShrink:0,
                          background:`${meta?.color || '#333'}20`,
                          border:`1px solid ${meta?.color || '#333'}44`,
                          display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
                        }}>
                          {meta?.emoji || '📍'}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                            <span style={{ fontSize:12, fontWeight:700, color: meta?.color }}>{meta?.label || ev.type}</span>
                            {ev.isConfirmation && (
                              <span style={{ fontSize:9, background:'rgba(0,255,136,.15)', color:'#00ff88', borderRadius:8, padding:'1px 6px' }}>CONFIRMAÇÃO</span>
                            )}
                            {ev.isResolution && (
                              <span style={{ fontSize:9, background:'rgba(0,255,136,.15)', color:'#00ff88', borderRadius:8, padding:'1px 6px' }}>RESOLUÇÃO</span>
                            )}
                          </div>
                          <div style={{ fontSize:11, color:'#6666aa', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            📍 {place?.name || ev.locationId} · 👤 {ev.userName || 'Anônimo'} · {timeStr}
                          </div>
                        </div>
                        <button onClick={() => deleteEvent(ev)} style={{
                          width:28, height:28, borderRadius:8, border:'1px solid rgba(255,45,85,.25)',
                          background:'rgba(255,45,85,.08)', color:'#ff2d55',
                          cursor:'pointer', fontSize:12, flexShrink:0,
                          display:'flex', alignItems:'center', justifyContent:'center',
                        }} title="Remover reporte">🗑</button>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ===== MODERAÇÃO ===== */}
          {mainTab === 'moderation' && (
            <>
              {/* Info */}
              <div style={{
                background:'rgba(255,204,0,.06)', border:'1px solid rgba(255,204,0,.2)',
                borderRadius:10, padding:'10px 14px', marginBottom:16,
                fontSize:12, color:'#ffcc00', display:'flex', gap:8, alignItems:'center',
              }}>
                <span>ℹ️</span>
                <span>Apenas <strong>locais fixos</strong> (bares, baladas, estabelecimentos) passam por moderação.</span>
              </div>

              {/* Sub-tabs */}
              <div style={{ display:'flex', gap:6, marginBottom:16 }}>
                {[
                  { id:'pending',  label:'Pendentes', count:pending.length,  color:'#ffcc00' },
                  { id:'approved', label:'Aprovados', count:approved.length, color:'#00ff88' },
                  { id:'rejected', label:'Rejeitados',count:rejected.length, color:'#ff2d55' },
                ].map(t => (
                  <button key={t.id} onClick={() => setModTab(t.id)} style={{
                    flex:1, padding:'8px 4px', borderRadius:10,
                    background: modTab===t.id ? `${t.color}18` : '#1a1a26',
                    border:`1px solid ${modTab===t.id ? t.color : '#2a2a3d'}`,
                    color: modTab===t.id ? t.color : '#4a4a6a',
                    fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:11, cursor:'pointer',
                    transition:'all .2s',
                  }}>
                    {t.label}
                    {t.count > 0 && (
                      <span style={{ marginLeft:5, fontSize:10, opacity:.8 }}>({t.count})</span>
                    )}
                  </button>
                ))}
              </div>

              {modList.length === 0 ? (
                <EmptyState
                  icon={modTab==='pending' ? '✅' : modTab==='approved' ? '🏪' : '🗑️'}
                  title={modTab==='pending' ? 'Nenhum pendente' : modTab==='approved' ? 'Nenhum aprovado' : 'Nenhum rejeitado'}
                  sub="Tudo em ordem por aqui!"
                />
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {modList.map(place => (
                    <PlaceCard
                      key={place.id}
                      place={place}
                      tab={modTab}
                      busy={busy === place.id}
                      onApprove={() => approve(place)}
                      onReject={()  => reject(place)}
                      onDelete={()  => deletePlace(place)}
                      onRestore={() => restore(place)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign:'center', padding:'60px 20px', color:'#3a3a5a' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:12 }}>{sub}</div>
    </div>
  )
}

function PlaceCard({ place, tab, busy, onApprove, onReject, onDelete, onRestore }) {
  const ts = place.createdAt ? new Date(place.createdAt).toLocaleDateString('pt-BR') : '—'
  const sc = STATUS_COLORS[place.status || 'pending']
  const catEmoji = place.cat === 'noturno' ? '🌙' : place.cat === 'estabelecimento' ? '🏪' : '🚦'

  return (
    <div style={{
      background:'#12121a', border:'1px solid #1e1e30',
      borderRadius:16, padding:'16px',
      opacity: busy ? 0.6 : 1,
      transition:'opacity .2s',
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ flex:1, paddingRight:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <span style={{ fontSize:20 }}>{catEmoji}</span>
            <span style={{ fontSize:15, fontWeight:800 }}>{place.name}</span>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            <Tag icon="👤" label={place.createdName || 'Anônimo'} />
            <Tag icon="📅" label={ts} />
            <Tag icon="📍" label={`${place.lat?.toFixed(4)}, ${place.lng?.toFixed(4)}`} mono />
            {place.expiresAt && (
              <Tag icon="⏱" label={`Expira ${new Date(place.expiresAt).toLocaleDateString('pt-BR')}`} />
            )}
          </div>
        </div>
        <div style={{
          flexShrink:0, background:sc.bg, border:`1px solid ${sc.color}44`,
          borderRadius:20, padding:'4px 10px',
          fontSize:10, fontWeight:800, color:sc.color, letterSpacing:'.06em',
        }}>{sc.label}</div>
      </div>

      <div style={{ display:'flex', gap:8 }}>
        {tab === 'pending' && (
          <>
            <ActionBtn color="#00ff88" bg="rgba(0,255,136,.12)" label="✅ Aprovar"  onClick={onApprove} disabled={busy} />
            <ActionBtn color="#ff2d55" bg="rgba(255,45,85,.12)"  label="❌ Rejeitar" onClick={onReject}  disabled={busy} />
          </>
        )}
        {tab === 'approved' && (
          <>
            <ActionBtn color="#ff6b35" bg="rgba(255,107,53,.12)" label="↩️ Rever"   onClick={onRestore} disabled={busy} />
            <ActionBtn color="#ff2d55" bg="rgba(255,45,85,.08)"  label="🗑️ Remover" onClick={onDelete}  disabled={busy} />
          </>
        )}
        {tab === 'rejected' && (
          <>
            <ActionBtn color="#00ff88" bg="rgba(0,255,136,.08)" label="↩️ Reabrir"  onClick={onRestore} disabled={busy} />
            <ActionBtn color="#ff2d55" bg="rgba(255,45,85,.08)" label="🗑️ Remover"  onClick={onDelete}  disabled={busy} />
          </>
        )}
      </div>
    </div>
  )
}

function Tag({ icon, label, mono }) {
  return (
    <span style={{
      background:'#1a1a26', border:'1px solid #2a2a3d',
      borderRadius:20, padding:'3px 10px',
      fontSize:11, color:'#6666aa',
      fontFamily: mono ? "'Space Mono',monospace" : "'Syne',sans-serif",
    }}>
      {icon} {label}
    </span>
  )
}

function ActionBtn({ color, bg, label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex:1, padding:'10px 8px', borderRadius:10, border:`1px solid ${color}44`,
        background:bg, color, cursor:disabled ? 'wait' : 'pointer',
        fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:12,
        transition:'all .15s', opacity:disabled ? .5 : 1,
      }}
      onMouseDown={e  => !disabled && (e.currentTarget.style.transform='scale(.97)')}
      onMouseUp={e    => (e.currentTarget.style.transform='scale(1)')}
      onTouchStart={e => !disabled && (e.currentTarget.style.transform='scale(.97)')}
      onTouchEnd={e   => (e.currentTarget.style.transform='scale(1)')}
    >
      {label}
    </button>
  )
}
