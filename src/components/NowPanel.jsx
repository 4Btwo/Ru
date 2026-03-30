import React from 'react'
import { LOCATIONS, EVENT_META } from '../lib/constants'
import { getLocationStatus, getActiveEvents, timeAgo } from '../lib/hotspot'
import { shareLocation } from '../lib/share'

export default function NowPanel({ open, onClose, events, usersMap, onLocationClick }) {
  const ranked = LOCATIONS
    .map(loc => ({
      loc,
      status:  getLocationStatus(loc.id, events, usersMap),
      actEvts: getActiveEvents(loc.id, events),
    }))
    .filter(r => r.status.heat !== 'inactive')
    .sort((a, b) => b.status.score - a.status.score)

  const handleShare = async (loc, status, actEvts) => {
    const result = await shareLocation(loc, events, usersMap)
    if (result === 'copied') alert('Texto copiado! Cole no WhatsApp ou Instagram.')
  }

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
        background:'#12121a', borderTop:'1px solid #2a2a3d',
        borderRadius:'20px 20px 0 0',
        maxHeight:'80vh', overflowY:'auto',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition:'transform .35s cubic-bezier(.4,0,.2,1)',
      }}>
        <div style={{
          position:'sticky', top:0, background:'#12121a',
          padding:'0 16px 16px', zIndex:1, borderBottom:'1px solid #2a2a3d',
        }}>
          <div style={{ width:40, height:4, background:'#2a2a3d', borderRadius:2, margin:'12px auto 18px' }}/>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <p style={{ fontSize:18, fontWeight:800 }}>🔴 Agora em Bauru</p>
              <p style={{ fontSize:12, color:'#6666aa', marginTop:3 }}>
                {ranked.length > 0
                  ? `${ranked.length} local${ranked.length > 1 ? 'is' : ''} com atividade`
                  : 'Nenhuma atividade registrada'}
              </p>
            </div>
            <button onClick={onClose} style={{
              width:32, height:32, borderRadius:'50%', background:'#1a1a26',
              border:'1px solid #2a2a3d', cursor:'pointer', color:'#6666aa',
              fontSize:14, display:'flex', alignItems:'center', justifyContent:'center',
            }}>✕</button>
          </div>
        </div>

        <div style={{ padding:'12px 16px 36px' }}>
          {ranked.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:'#6666aa' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>😴</div>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>Cidade tranquila agora</div>
              <div style={{ fontSize:12 }}>Seja o primeiro a reportar algo!</div>
            </div>
          ) : ranked.map(({ loc, status, actEvts }, i) => {
            const { color, label, emoji, score, domType } = status
            const topTypes = [...new Set(actEvts.slice(0,3).map(e => e.type))]
            const medals   = ['🥇','🥈','🥉']

            return (
              <div key={loc.id} style={{
                background:`${color}0f`,
                border:`1px solid ${color}33`,
                borderRadius:14, padding:'14px 16px', marginBottom:10,
                transition:'transform .15s',
              }}
                onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
              >
                <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  {/* Rank */}
                  {i < 3 && (
                    <div style={{
                      width:28, height:28, borderRadius:'50%',
                      background: i===0?'#ffcc00':i===1?'#c0c0c0':'#cd7f32',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:12, fontWeight:800, color:'#0a0a0f', flexShrink:0,
                    }}>{medals[i]}</div>
                  )}

                  <div style={{ flex:1, minWidth:0 }}>
                    {/* Status label baseado no tipo dominante */}
                    <div style={{ fontSize:10, fontWeight:800, color,
                      letterSpacing:'.06em', marginBottom:4, textTransform:'uppercase' }}>
                      {label}
                    </div>
                    <div style={{ fontSize:15, fontWeight:800, marginBottom:6,
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {loc.name}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <span style={{ fontSize:16 }}>
                        {topTypes.map(t => EVENT_META[t]?.emoji).join(' ')}
                      </span>
                      <span style={{ fontSize:11, color:'#6666aa' }}>
                        {actEvts.length} reporte{actEvts.length > 1 ? 's' : ''}
                      </span>
                      {actEvts[0] && (
                        <span style={{ fontSize:11, color:'#6666aa' }}>
                          · {timeAgo(actEvts[0].ts)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontFamily:"'Space Mono',monospace",
                      fontSize:18, fontWeight:700, color }}>{score.toFixed(0)}</div>
                    <div style={{ fontSize:9, color:'#6666aa', textTransform:'uppercase' }}>score</div>
                  </div>
                </div>

                <div style={{ display:'flex', gap:8, marginTop:12 }}>
                  <button onClick={(e) => { e.stopPropagation(); onClose(); onLocationClick(loc) }} style={{
                    flex:1, padding:'9px 0', borderRadius:10, border:`1px solid ${color}55`,
                    background:'transparent', color, fontFamily:"'Syne',sans-serif",
                    fontWeight:700, fontSize:12, cursor:'pointer',
                  }}>📍 Ver no mapa</button>
                  <button onClick={(e) => { e.stopPropagation(); handleShare(loc, status, actEvts) }} style={{
                    flex:1, padding:'9px 0', borderRadius:10, border:'none',
                    background:color, color:'#fff', fontFamily:"'Syne',sans-serif",
                    fontWeight:700, fontSize:12, cursor:'pointer',
                  }}>📤 Compartilhar</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
