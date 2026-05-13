// ── NOWPANEL 3.0 — URBYN LIVE FEED ───────────────────────────────────────────
import React from 'react'
import { EVENT_META } from '../lib/constants'
import { getLocationStatus, getActiveEvents, timeAgo } from '../lib/hotspot'
import { shareLocation } from '../lib/share'

export default function NowPanel({ open, onClose, events, usersMap, onLocationClick, allPlaces = [] }) {
  const ranked = allPlaces
    .map(loc => ({
      loc,
      status:  getLocationStatus(loc.id, events, usersMap),
      actEvts: getActiveEvents(loc.id, events),
    }))
    .filter(r => r.status.heat !== 'inactive')
    .sort((a, b) => b.status.score - a.status.score)

  const handleShare = async (loc) => {
    const result = await shareLocation(loc, events, usersMap)
    if (result === 'copied') alert('Texto copiado!')
  }

  const heatConfig = {
    hot:  { color:'#ff4757', glow:'rgba(255,71,87,0.25)',  label:'QUENTE',  dot:'#ff4757' },
    mid:  { color:'#4f8eff', glow:'rgba(79,142,255,0.2)',  label:'ATIVO',   dot:'#4f8eff' },
    low:  { color:'#7c5cfc', glow:'rgba(124,92,252,0.15)', label:'MOVIMEN', dot:'#7c5cfc' },
  }

  return (
    <>
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:1500,
        background:'rgba(0,0,0,0.72)',
        backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
        opacity:open?1:0, pointerEvents:open?'all':'none',
        transition:'opacity .3s',
      }}/>

      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:2000,
        background:'rgba(8,8,20,0.97)',
        backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)',
        border:'1px solid rgba(255,255,255,0.07)',
        borderBottom:'none',
        borderRadius:'28px 28px 0 0',
        maxHeight:'82vh', overflowY:'auto',
        transform:open?'translateY(0)':'translateY(100%)',
        transition:'transform .4s cubic-bezier(.32,.72,0,1)',
      }}>
        {/* Handle */}
        <div style={{width:36,height:4,background:'rgba(255,255,255,0.16)',borderRadius:2,margin:'14px auto 0'}}/>

        {/* Header */}
        <div style={{
          position:'sticky', top:0,
          background:'rgba(8,8,20,0.97)',
          backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
          padding:'16px 20px 14px',
          borderBottom:'1px solid rgba(255,255,255,0.06)',
          zIndex:1,
        }}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div>
              <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:4}}>
                <div style={{
                  display:'flex', alignItems:'center', gap:5,
                  background:'rgba(255,71,87,0.12)', border:'1px solid rgba(255,71,87,0.3)',
                  borderRadius:999, padding:'4px 10px',
                }}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:'#ff4757',animation:'blink 1s ease infinite'}}/>
                  <span style={{fontSize:10,fontWeight:800,color:'#ff4757',letterSpacing:'.1em'}}>LIVE</span>
                </div>
                <span style={{
                  fontFamily:"'Outfit',sans-serif",
                  fontSize:18, fontWeight:800, letterSpacing:'-.02em',
                }}>Agora em Bauru</span>
              </div>
              <div style={{fontSize:12, color:'rgba(240,240,255,0.4)', fontWeight:500}}>
                {ranked.length > 0
                  ? `${ranked.length} local${ranked.length > 1 ? 'is' : ''} com atividade`
                  : 'Nenhuma atividade registrada'}
              </div>
            </div>
            <button onClick={onClose} style={{
              width:36, height:36, borderRadius:'50%',
              background:'rgba(255,255,255,0.06)',
              border:'1px solid rgba(255,255,255,0.08)',
              cursor:'pointer', color:'rgba(240,240,255,0.5)', fontSize:16,
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'background .2s',
            }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.1)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}
            >✕</button>
          </div>
        </div>

        <div style={{padding:'14px 16px', paddingBottom:'calc(32px + env(safe-area-inset-bottom,0px))'}}>
          {ranked.length === 0 ? (
            <div style={{textAlign:'center', padding:'52px 0', color:'rgba(240,240,255,0.35)'}}>
              <div style={{fontSize:44, marginBottom:14}}>😴</div>
              <div style={{
                fontFamily:"'Outfit',sans-serif",
                fontSize:16, fontWeight:700, marginBottom:6, color:'rgba(240,240,255,0.5)',
              }}>Cidade tranquila agora</div>
              <div style={{fontSize:12}}>Seja o primeiro a reportar algo!</div>
            </div>
          ) : ranked.map(({loc, status, actEvts}, i) => {
            const cfg = heatConfig[status.heat] || heatConfig.low
            const topTypes = [...new Set(actEvts.slice(0,3).map(e=>e.type))]
            const medals = ['🥇','🥈','🥉']
            const isHot = status.heat === 'hot'

            return (
              <div key={loc.id} style={{
                background:isHot?`rgba(255,71,87,0.06)`:`rgba(255,255,255,0.03)`,
                border:`1px solid ${isHot?'rgba(255,71,87,0.25)':'rgba(255,255,255,0.06)'}`,
                borderRadius:22, padding:'16px', marginBottom:10,
                transition:'transform .15s, border-color .15s',
                boxShadow:isHot?`0 0 24px rgba(255,71,87,0.12)`:'none',
              }}
                onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'}
                onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}
              >
                <div style={{display:'flex', alignItems:'flex-start', gap:12}}>
                  {/* Rank badge */}
                  {i < 3 && (
                    <div style={{
                      width:30, height:30, borderRadius:'50%',
                      background:i===0?'rgba(255,174,0,0.15)':i===1?'rgba(148,163,184,0.15)':'rgba(161,98,7,0.15)',
                      border:`1px solid ${i===0?'rgba(255,174,0,0.3)':i===1?'rgba(148,163,184,0.3)':'rgba(161,98,7,0.3)'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:14, flexShrink:0,
                    }}>{medals[i]}</div>
                  )}

                  <div style={{flex:1, minWidth:0}}>
                    {/* Heat label */}
                    <div style={{
                      fontSize:9, fontWeight:800, color:cfg.color,
                      letterSpacing:'.1em', marginBottom:5, textTransform:'uppercase',
                      display:'flex', alignItems:'center', gap:5,
                    }}>
                      <div style={{width:5,height:5,borderRadius:'50%',background:cfg.dot,flexShrink:0}}/>
                      {cfg.label}
                    </div>

                    {/* Name */}
                    <div style={{
                      fontFamily:"'Outfit',sans-serif",
                      fontSize:15, fontWeight:800, marginBottom:7,
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                      letterSpacing:'-.02em',
                    }}>{loc.name}</div>

                    {/* Event tags */}
                    <div style={{display:'flex', alignItems:'center', gap:6, flexWrap:'wrap'}}>
                      <span style={{fontSize:15}}>{topTypes.map(t=>EVENT_META[t]?.emoji).join(' ')}</span>
                      <span style={{
                        fontSize:11, color:'rgba(240,240,255,0.4)',
                        background:'rgba(255,255,255,0.04)',
                        border:'1px solid rgba(255,255,255,0.08)',
                        borderRadius:999, padding:'2px 8px', fontWeight:600,
                      }}>
                        {actEvts.length} reporte{actEvts.length>1?'s':''}
                      </span>
                      {actEvts[0] && (
                        <span style={{fontSize:11, color:'rgba(240,240,255,0.35)'}}>
                          · {timeAgo(actEvts[0].ts)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div style={{textAlign:'right', flexShrink:0}}>
                    <div style={{
                      fontFamily:"'Space Mono',monospace",
                      fontSize:20, fontWeight:700, color:cfg.color,
                      letterSpacing:'-.02em',
                    }}>{status.score.toFixed(0)}</div>
                    <div style={{fontSize:9, color:'rgba(240,240,255,0.35)', textTransform:'uppercase', letterSpacing:'.1em'}}>score</div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{display:'flex', gap:8, marginTop:14}}>
                  <button onClick={e=>{e.stopPropagation();onClose();onLocationClick(loc)}} style={{
                    flex:1, padding:'10px 0', borderRadius:12,
                    border:`1px solid rgba(255,255,255,0.1)`,
                    background:'rgba(255,255,255,0.04)',
                    backdropFilter:'blur(8px)',
                    color:'rgba(240,240,255,0.8)',
                    fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:12,
                    cursor:'pointer', transition:'background .2s',
                  }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'}
                    onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                  >📍 Ver no mapa</button>
                  <button onClick={e=>{e.stopPropagation();handleShare(loc)}} style={{
                    flex:1, padding:'10px 0', borderRadius:12, border:'none',
                    background:`linear-gradient(135deg,${cfg.color}cc,${cfg.color}88)`,
                    color:'#fff',
                    fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:12,
                    cursor:'pointer',
                    boxShadow:`0 4px 16px ${cfg.glow}`,
                  }}>📤 Compartilhar</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </>
  )
}
