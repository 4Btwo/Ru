// ── PAINEL ADMIN — moderação de estabelecimentos ─────────────────────────────
import React, { useState, useEffect } from 'react'
import { ref, onValue, update, remove } from 'firebase/database'
import { db } from '../lib/firebase'

const STATUS_COLORS = {
  pending:  { color:'#ffcc00', bg:'rgba(255,204,0,.12)',  label:'Pendente'  },
  approved: { color:'#00ff88', bg:'rgba(0,255,136,.10)', label:'Aprovado'  },
  rejected: { color:'#ff2d55', bg:'rgba(255,45,85,.10)', label:'Rejeitado' },
}

export default function AdminPanel({ open, onClose, adminUid }) {
  const [tab,    setTab]    = useState('pending') // 'pending' | 'approved' | 'rejected'
  const [places, setPlaces] = useState([])
  const [busy,   setBusy]   = useState(null)

  useEffect(() => {
    if (!open) return
    const unsub = onValue(ref(db, 'places'), snap => {
      const data = snap.val()
      if (!data) return setPlaces([])
      const list = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .filter(p => p.cat === 'estabelecimento' || p.needsModeration)
      setPlaces(list)
    })
    return unsub
  }, [open])

  const pending  = places.filter(p => !p.status || p.status === 'pending')
  const approved = places.filter(p => p.status === 'approved')
  const rejected = places.filter(p => p.status === 'rejected')

  const tabList = [
    { id:'pending',  label:'Pendentes', count: pending.length,  color:'#ffcc00' },
    { id:'approved', label:'Aprovados', count: approved.length, color:'#00ff88' },
    { id:'rejected', label:'Rejeitados',count: rejected.length, color:'#ff2d55' },
  ]

  const currentList = { pending, approved, rejected }[tab]

  const approve = async (place) => {
    setBusy(place.id)
    await update(ref(db, `places/${place.id}`), {
      status: 'approved',
      approvedBy: adminUid,
      approvedAt: Date.now(),
    })
    setBusy(null)
  }

  const reject = async (place) => {
    setBusy(place.id)
    await update(ref(db, `places/${place.id}`), {
      status: 'rejected',
      rejectedBy: adminUid,
      rejectedAt: Date.now(),
    })
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
    await update(ref(db, `places/${place.id}`), { status: 'pending' })
    setBusy(null)
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:2400,
        background:'rgba(0,0,0,.75)', backdropFilter:'blur(4px)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none',
        transition:'opacity .25s',
      }}/>

      {/* Painel */}
      <div style={{
        position:'fixed', inset:0, zIndex:2500,
        background:'#0d0d15',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition:'transform .35s cubic-bezier(.4,0,.2,1)',
        display:'flex', flexDirection:'column',
        fontFamily:"'Syne',sans-serif",
      }}>
        {/* Header */}
        <div style={{
          padding:'16px 20px 0',
          borderBottom:'1px solid #1e1e30',
          background:'#0d0d15',
          flexShrink:0,
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{
                  width:32, height:32, borderRadius:8,
                  background:'rgba(255,204,0,.15)', border:'1px solid rgba(255,204,0,.3)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
                }}>🛡️</div>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, letterSpacing:'.02em' }}>Moderação</div>
                  <div style={{ fontSize:11, color:'#6666aa', marginTop:1 }}>Estabelecimentos aguardando aprovação</div>
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

          {/* Tabs */}
          <div style={{ display:'flex', gap:4, paddingBottom:0 }}>
            {tabList.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex:1, padding:'10px 4px', border:'none', borderBottom: tab===t.id ? `2px solid ${t.color}` : '2px solid transparent',
                background:'transparent', cursor:'pointer',
                fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:12,
                color: tab===t.id ? t.color : '#4a4a6a',
                transition:'all .2s',
              }}>
                {t.label}
                {t.count > 0 && (
                  <span style={{
                    marginLeft:6, background: tab===t.id ? `${t.color}22` : '#1a1a26',
                    color: t.color, fontSize:10, borderRadius:10, padding:'1px 6px',
                  }}>{t.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
          {currentList.length === 0 ? (
            <div style={{
              textAlign:'center', padding:'60px 20px',
              color:'#3a3a5a',
            }}>
              <div style={{ fontSize:40, marginBottom:12 }}>
                { tab==='pending' ? '✅' : tab==='approved' ? '🏪' : '🗑️' }
              </div>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>
                { tab==='pending' ? 'Nenhum pendente' : tab==='approved' ? 'Nenhum aprovado' : 'Nenhum rejeitado' }
              </div>
              <div style={{ fontSize:12 }}>
                { tab==='pending' ? 'Tudo em dia por aqui!' : 'Itens processados aparecerão aqui' }
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {currentList.map(place => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  tab={tab}
                  busy={busy === place.id}
                  onApprove={() => approve(place)}
                  onReject={() => reject(place)}
                  onDelete={() => deletePlace(place)}
                  onRestore={() => restore(place)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function PlaceCard({ place, tab, busy, onApprove, onReject, onDelete, onRestore }) {
  const ts   = place.createdAt ? new Date(place.createdAt).toLocaleDateString('pt-BR') : '—'
  const sc   = STATUS_COLORS[place.status || 'pending']

  return (
    <div style={{
      background:'#12121a', border:'1px solid #1e1e30',
      borderRadius:16, padding:'16px',
      opacity: busy ? 0.6 : 1,
      transition:'opacity .2s',
    }}>
      {/* Top row */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ flex:1, paddingRight:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <span style={{ fontSize:18 }}>🏪</span>
            <span style={{ fontSize:15, fontWeight:800 }}>{place.name}</span>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            <Tag icon="👤" label={place.createdName || 'Anônimo'} />
            <Tag icon="📅" label={ts} />
            <Tag icon="📍" label={`${place.lat?.toFixed(4)}, ${place.lng?.toFixed(4)}`} mono />
          </div>
        </div>
        <div style={{
          flexShrink:0, background:sc.bg, border:`1px solid ${sc.color}44`,
          borderRadius:20, padding:'4px 10px',
          fontSize:10, fontWeight:800, color:sc.color, letterSpacing:'.06em',
        }}>{sc.label}</div>
      </div>

      {place.description && (
        <div style={{
          background:'#0a0a0f', borderRadius:10, padding:'10px 12px',
          fontSize:12, color:'#8888bb', lineHeight:1.6, marginBottom:12,
        }}>
          {place.description}
        </div>
      )}

      {/* Actions */}
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
        background: bg, color, cursor: disabled ? 'wait' : 'pointer',
        fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:12,
        transition:'all .15s', opacity: disabled ? .5 : 1,
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
