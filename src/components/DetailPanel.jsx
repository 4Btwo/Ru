// ── DETAIL PANEL — lotação, info, chat, dono, "Vou Lá" e histórico ────────────
import React, { useState } from 'react'
import { EVENT_META } from '../lib/constants'
import { getLocationStatus, getActiveEvents, timeAgo, strengthLabel } from '../lib/hotspot'
import { shareWithImage } from '../lib/shareImage'
import { useOwner } from '../hooks/useOwner'
import { useGoingTo } from '../hooks/useGoingTo'
import { useHistory } from '../hooks/useHistory'
import OwnerPanel from './OwnerPanel'
import ChatPanel from './ChatPanel'

function occupancyColor(p) {
  if (p === null || p === undefined) return null
  if (p >= 90) return { color:'var(--red)', label:`🚨 Lotado (${p}%)`,  bg:'rgba(255,45,85,.12)'  }
  if (p >= 60) return { color:'#ffcc00', label:`⚡ Quase cheio (${p}%)`, bg:'rgba(255,204,0,.1)' }
  return              { color:'#00ff88', label:`✅ Tem espaço (${p}%)`, bg:'rgba(0,255,136,.08)' }
}

// Mini barra de historico
function HistBar({ pct, color, highlight }) {
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <div style={{ width:'100%', height:40, background:'var(--surface2)', borderRadius:6,
        display:'flex', alignItems:'flex-end', overflow:'hidden',
        border: highlight ? `1px solid ${color}` : '1px solid #2a2a3d' }}>
        <div style={{
          width:'100%', borderRadius:'4px 4px 0 0',
          height: `${Math.max(pct, 4)}%`,
          background: highlight ? color : `${color}55`,
          transition: 'height .4s ease',
        }}/>
      </div>
    </div>
  )
}

export default function DetailPanel({ location, events, usersMap, user, onClose, onReport }) {
  const [sharing,     setSharing]     = useState(false)
  const [ownerOpen,   setOwnerOpen]   = useState(false)
  const [chatOpen,    setChatOpen]    = useState(false)
  const [histTab,     setHistTab]     = useState('day') // 'day' | 'hour'

  const { isOwner }                         = useOwner(location?.id, user?.uid)
  const { goingList, isGoing, toggleGoing } = useGoingTo(location?.id, user?.uid)
  const { history }                         = useHistory(location?.id)

  const open = !!location
  if (!location) return null

  const status     = getLocationStatus(location.id, events, usersMap)
  const actEvts    = getActiveEvents(location.id, events).slice(0, 6)
  const typeCounts = {}
  actEvts.forEach(e => { typeCounts[e.type] = (typeCounts[e.type] || 0) + 1 })

  const proofParts = Object.entries(typeCounts).map(([type, cnt]) =>
    `${cnt} ${cnt > 1 ? 'marcaram' : 'marcou'} ${EVENT_META[type]?.label?.toLowerCase() || type}`)
  const proofText  = proofParts.join(' · ')

  const occ    = location.occupancy !== undefined ? location.occupancy : null
  const occCfg = occupancyColor(occ)
  const goingCount   = goingList.length
  const othersGoing  = goingList.filter(g => g.userId !== user?.uid).slice(0, 3)

  // Dia da semana atual (0=Dom)
  const todayIdx = new Date().getDay()
  // Faixa de hora atual
  const nowHour  = new Date().getHours()
  const nowSlot  = nowHour < 6 ? 0 : nowHour < 12 ? 1 : nowHour < 18 ? 2 : 3

  const handleShareImage = async () => {
    setSharing(true)
    try {
      const r = await shareWithImage(location, status.score, actEvts)
      if (r === 'downloaded') alert('Imagem salva! Compartilhe no WhatsApp ou Instagram.')
    } finally { setSharing(false) }
  }

  const HIST_COLOR = location.cat === 'transito' ? '#ff6b35' : '#bf5fff'

  return (
    <>
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:1500,
        background:'rgba(0,0,0,.65)', backdropFilter:'blur(3px)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none',
        transition:'opacity .25s',
      }}/>

      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:2000,
        background:'var(--surface)', borderTop:'1px solid #2a2a3d',
        borderRadius:'20px 20px 0 0', padding:'0 16px 36px',
        maxHeight:'85vh', overflowY:'auto',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition:'transform .35s cubic-bezier(.4,0,.2,1)',
      }}>
        <div style={{ width:40, height:4, background:'var(--border)', borderRadius:2, margin:'12px auto 18px' }}/>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
          <div style={{ flex:1, paddingRight:12 }}>
            {status.heat !== 'inactive' && status.domType !== 'morto' && (
              <div style={{ fontSize:11, fontWeight:800, color:status.color,
                letterSpacing:'.07em', marginBottom:6, textTransform:'uppercase' }}>
                {status.label}
              </div>
            )}
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <div style={{ fontSize:18, fontWeight:800 }}>{location.name}</div>
              {isOwner(location) && <span style={{ fontSize:14 }}>👑</span>}
            </div>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:6,
              background:`${status.color}18`, border:`1px solid ${status.color}44`,
              borderRadius:20, padding:'5px 12px',
            }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:status.color,
                boxShadow:`0 0 6px ${status.color}`,
                animation: status.heat==='hot' && status.domType!=='morto'
                  ? 'pulse 1.2s ease infinite' : 'none' }}/>
              <span style={{ fontSize:11, fontWeight:800, color:status.color, letterSpacing:'.06em' }}>
                {status.emoji} {status.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{
            width:32, height:32, borderRadius:'50%', background:'var(--surface2)',
            border:'1px solid var(--border)', cursor:'pointer', color:'var(--muted)',
            fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
          }}>✕</button>
        </div>

        {/* VOu LÁ — banner quando há interessados */}
        {goingCount > 0 && (
          <div style={{
            background:'rgba(0,200,255,.07)', border:'1px solid rgba(0,200,255,.25)',
            borderRadius:12, padding:'10px 14px', marginBottom:12,
            display:'flex', alignItems:'center', gap:10,
          }}>
            <span style={{ fontSize:20 }}>🙋</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#00c8ff' }}>
                {goingCount === 1
                  ? (isGoing ? 'Você vai pra cá' : `${goingList[0].userName?.split(' ')[0]} vai pra cá`)
                  : isGoing
                    ? `Você + ${goingCount - 1} pessoa${goingCount > 2 ? 's' : ''} vão pra cá`
                    : `${goingCount} pessoas vão pra cá`
                }
              </div>
              {othersGoing.length > 0 && (
                <div style={{ fontSize:11, color:'#6688aa', marginTop:2 }}>
                  {othersGoing.map(g => g.userName?.split(' ')[0]).join(', ')}
                  {goingList.length > 4 ? ` +${goingList.length - 4}` : ''}
                </div>
              )}
            </div>
          </div>
        )}

        {/* LOTAÇÃO DO DONO */}
        {occCfg && (
          <div style={{
            background: occCfg.bg, border:`1px solid ${occCfg.color}44`,
            borderRadius:12, padding:'10px 14px', marginBottom:12,
            display:'flex', alignItems:'center', gap:10,
          }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color: occCfg.color }}>{occCfg.label}</div>
              <div style={{ background:'var(--border)', borderRadius:10, height:6, marginTop:6, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:10, background: occCfg.color,
                  width:`${occ}%`, transition:'width .4s' }}/>
              </div>
            </div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:22,
              fontWeight:700, color: occCfg.color }}>{occ}%</div>
          </div>
        )}

        {/* DESCRIÇÃO DO DONO */}
        {location.description && (
          <div style={{
            background:'var(--surface2)', border:'1px solid var(--border)',
            borderRadius:12, padding:'12px 14px', marginBottom:12,
          }}>
            <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.1em',
              color:'var(--muted)', marginBottom:6 }}>📝 Sobre o local</div>
            <div style={{ fontSize:13, color:'#c0c0e0', lineHeight:1.6 }}>
              {location.description}
            </div>
          </div>
        )}

        {/* INFO EXTRA */}
        {(location.schedule || location.instagram || location.phone) && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:12 }}>
            {location.schedule && (
              <span style={{ background:'var(--surface2)', border:'1px solid var(--border)',
                borderRadius:20, padding:'5px 12px', fontSize:12, color:'#a0a0cc' }}>
                🕐 {location.schedule}
              </span>
            )}
            {location.instagram && (
              <a href={`https://instagram.com/${location.instagram.replace('@','')}`}
                target="_blank" rel="noopener" style={{
                  background:'var(--surface2)', border:'1px solid #bf5fff44',
                  borderRadius:20, padding:'5px 12px', fontSize:12, color:'#bf5fff',
                  textDecoration:'none',
                }}>
                📸 {location.instagram}
              </a>
            )}
            {location.phone && (
              <a href={`https://wa.me/55${location.phone.replace(/\D/g,'')}`}
                target="_blank" rel="noopener" style={{
                  background:'var(--surface2)', border:'1px solid #00ff8844',
                  borderRadius:20, padding:'5px 12px', fontSize:12, color:'#00ff88',
                  textDecoration:'none',
                }}>
                💬 WhatsApp
              </a>
            )}
          </div>
        )}

        {/* Prova social */}
        {proofText.length > 0 && (
          <div style={{ background:'rgba(255,255,255,.04)', borderRadius:10,
            padding:'8px 12px', marginBottom:12, fontSize:12, color:'#a0a0cc', fontStyle:'italic' }}>
            👥 {proofText}
          </div>
        )}

        {/* Score cards */}
        <div style={{ display:'flex', gap:10, marginBottom:14 }}>
          {[
            { val: status.score.toFixed(1), label:'INTENSIDADE', color:status.color },
            { val: actEvts.length,          label:'REPORTES',    color:'var(--text)' },
            { val: location.cat === 'transito' ? '🚦' : '🌙',
              label: location.cat === 'transito' ? 'TRÂNSITO' : 'NOTURNO', color:'var(--text)' },
          ].map((c, i) => (
            <div key={i} style={{ flex:1, background:'var(--surface2)', border:'1px solid var(--border)',
              borderRadius:12, padding:'10px 0', textAlign:'center' }}>
              <div style={{ fontFamily:"'Space Mono',monospace",
                fontSize:i===2?18:22, fontWeight:700, color:c.color }}>{c.val}</div>
              <div style={{ fontSize:10, color:'var(--muted)', marginTop:3 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Tags */}
        {Object.keys(typeCounts).length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 }}>
            {Object.entries(typeCounts).sort((a,b)=>b[1]-a[1]).map(([type, cnt]) => {
              const meta = EVENT_META[type]; if (!meta) return null
              const isDom = type === status.domType
              return (
                <span key={type} style={{
                  background: isDom ? `${meta.color}22` : '#1a1a26',
                  border:`1px solid ${isDom ? meta.color : meta.color+'44'}`,
                  borderRadius:20, padding:'5px 12px',
                  fontSize:12, color:meta.color, fontWeight: isDom ? 800 : 600,
                }}>
                  {meta.emoji} {meta.label} ({cnt}){isDom && <span style={{ fontSize:9, marginLeft:4 }}>↑</span>}
                </span>
              )
            })}
          </div>
        )}

        {/* ── HISTÓRICO ─────────────────────────────────────────────────────── */}
        {history && (
          <div style={{
            background:'var(--surface2)', border:'1px solid var(--border)',
            borderRadius:14, padding:'14px', marginBottom:14,
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div>
                <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--muted)' }}>
                  📊 MOVIMENTO HISTÓRICO
                </div>
                <div style={{ fontSize:12, color: HIST_COLOR, marginTop:3, fontWeight:700 }}>
                  Costuma agitar: {history.peakLabel}
                </div>
              </div>
              {/* Toggle dia / hora */}
              <div style={{ display:'flex', gap:4 }}>
                {['day','hour'].map(t => (
                  <button key={t} onClick={() => setHistTab(t)} style={{
                    padding:'4px 10px', borderRadius:8, border:'none', cursor:'pointer',
                    background: histTab===t ? HIST_COLOR : '#2a2a3d',
                    color: histTab===t ? '#000' : '#6666aa',
                    fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:11,
                  }}>{t==='day' ? 'Dia' : 'Hora'}</button>
                ))}
              </div>
            </div>

            {histTab === 'day' && (
              <div>
                <div style={{ display:'flex', gap:4, alignItems:'flex-end', height:50 }}>
                  {history.byDay.map((d, i) => (
                    <HistBar key={d.label} pct={d.pct} color={HIST_COLOR} highlight={i === todayIdx} />
                  ))}
                </div>
                <div style={{ display:'flex', gap:4, marginTop:6 }}>
                  {history.byDay.map((d, i) => (
                    <div key={d.label} style={{ flex:1, textAlign:'center',
                      fontSize:10, color: i===todayIdx ? HIST_COLOR : '#6666aa',
                      fontWeight: i===todayIdx ? 800 : 400 }}>
                      {d.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {histTab === 'hour' && (
              <div>
                <div style={{ display:'flex', gap:4, alignItems:'flex-end', height:50 }}>
                  {history.byHour.map((h, i) => (
                    <HistBar key={h.label} pct={h.pct} color={HIST_COLOR} highlight={i === nowSlot} />
                  ))}
                </div>
                <div style={{ display:'flex', gap:4, marginTop:6 }}>
                  {history.byHour.map((h, i) => (
                    <div key={h.label} style={{ flex:1, textAlign:'center',
                      fontSize:10, color: i===nowSlot ? HIST_COLOR : '#6666aa',
                      fontWeight: i===nowSlot ? 800 : 400 }}>
                      {h.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontSize:10, color:'#3a3a5a', marginTop:10, textAlign:'right' }}>
              baseado em {history.total} reportes
            </div>
          </div>
        )}

        {/* Timeline */}
        <p style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.1em',
          color:'var(--muted)', marginBottom:10 }}>📋 ÚLTIMOS REPORTES</p>
        {actEvts.length === 0 ? (
          <p style={{ color:'var(--muted)', fontSize:13, padding:'8px 0 14px' }}>
            Sem reportes. Seja o primeiro! 👇
          </p>
        ) : (
          <div style={{ marginBottom:14 }}>
            {actEvts.map(ev => {
              const meta = EVENT_META[ev.type]; if (!meta) return null
              const str  = strengthLabel(ev.ts)
              const isDom = ev.type === status.domType
              return (
                <div key={ev.id} style={{ display:'flex', alignItems:'center', gap:12,
                  padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,.04)',
                  opacity: isDom ? 1 : 0.65 }}>
                  <span style={{ fontSize:20 }}>{meta.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight: isDom?700:500,
                      color: isDom ? meta.color : '#f0f0ff' }}>
                      {meta.label}
                      {isDom && <span style={{ fontSize:9, marginLeft:6, color:meta.color }}>● dominante</span>}
                    </div>
                    <div style={{ fontSize:11, color:str.color, marginTop:1 }}>sinal {str.label}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:'var(--muted)' }}>
                      {timeAgo(ev.ts)}
                    </div>
                    {ev.userName && (
                      <div style={{ fontSize:10, color:'#3a3a5a', marginTop:2 }}>
                        {ev.userName.split(' ')[0]}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* CTAs */}
        <div style={{ display:'flex', gap:8, marginBottom:10 }}>
          <button onClick={() => { onClose(); onReport(location) }} style={{
            flex:2, padding:14, borderRadius:14, border:'none',
            background:'var(--red)', color:'#fff',
            fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:14,
            cursor:'pointer', textTransform:'uppercase', letterSpacing:'.04em',
          }}
            onMouseDown={e  => e.currentTarget.style.transform='scale(.97)'}
            onMouseUp={e    => e.currentTarget.style.transform='scale(1)'}
            onTouchStart={e => e.currentTarget.style.transform='scale(.97)'}
            onTouchEnd={e   => e.currentTarget.style.transform='scale(1)'}
          >📡 Reportar</button>

          <button onClick={() => setChatOpen(true)} style={{
            flex:1, padding:14, borderRadius:14,
            border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text)',
            fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, cursor:'pointer',
          }}>💬</button>

          <button onClick={handleShareImage} disabled={sharing} style={{
            flex:1, padding:14, borderRadius:14,
            border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text)',
            fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14,
            cursor: sharing ? 'wait' : 'pointer', opacity: sharing ? .6 : 1,
          }}>
            {sharing ? '⏳' : '📤'}
          </button>
        </div>

        {/* VOu LÁ */}
        <button
          onClick={() => toggleGoing(user?.name || 'Alguém')}
          style={{
            width:'100%', padding:14, borderRadius:14, marginBottom:10,
            border: isGoing ? '1px solid #00c8ff' : '1px solid rgba(0,200,255,.3)',
            background: isGoing ? 'rgba(0,200,255,.18)' : 'rgba(0,200,255,.06)',
            color: isGoing ? '#00c8ff' : '#6699bb',
            fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:14,
            cursor:'pointer', transition:'all .2s',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          }}
          onMouseDown={e  => e.currentTarget.style.transform='scale(.98)'}
          onMouseUp={e    => e.currentTarget.style.transform='scale(1)'}
          onTouchStart={e => e.currentTarget.style.transform='scale(.98)'}
          onTouchEnd={e   => e.currentTarget.style.transform='scale(1)'}
        >
          <span style={{ fontSize:18 }}>{isGoing ? '✅' : '🙋'}</span>
          {isGoing
            ? `Vou lá! ${goingCount > 1 ? `(+${goingCount - 1} também)` : ''}`
            : `Vou lá${goingCount > 0 ? ` · ${goingCount} indo` : ''}`
          }
        </button>

        {/* Botão do Dono */}
        {isOwner(location) && (
          <button onClick={() => setOwnerOpen(true)} style={{
            width:'100%', padding:13, borderRadius:14,
            border:'1px solid rgba(255,204,0,.4)',
            background:'rgba(255,204,0,.08)', color:'#ffcc00',
            fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:13,
            cursor:'pointer', transition:'all .15s',
          }}>
            👑 Gerenciar estabelecimento
          </button>
        )}
      </div>

      <OwnerPanel open={ownerOpen} place={location} uid={user?.uid} onClose={() => setOwnerOpen(false)} />
      <ChatPanel  open={chatOpen}  location={location} user={user} onClose={() => setChatOpen(false)} />
      <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:.7}}`}</style>
    </>
  )
}
