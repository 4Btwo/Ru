// ── RECOMPENSAS URBYN — Sistema de Pontos ─────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react'
import { ref, onValue, push, set, update, get, serverTimestamp } from 'firebase/database'
import { db } from '../lib/firebase'

/* ── Gera código alfanumérico único ─────────────────────────────────────────── */
function genCode() {
  return Math.random().toString(36).substring(2,8).toUpperCase()
}

/* ── Hook: recompensas de um local ─────────────────────────────────────────── */
function useRewards(placeId) {
  const [rewards, setRewards] = useState([])
  useEffect(() => {
    if (!placeId) return
    const r = ref(db, `rewards/${placeId}`)
    return onValue(r, snap => {
      const data = snap.val() || {}
      setRewards(Object.entries(data).map(([id, v]) => ({ id, ...v })).filter(r => r.active !== false))
    })
  }, [placeId])
  return rewards
}

/* ── Hook: resgates do usuário ──────────────────────────────────────────────── */
function useMyRedemptions(uid) {
  const [redemptions, setRedemptions] = useState([])
  useEffect(() => {
    if (!uid) return
    const r = ref(db, `redemptions/${uid}`)
    return onValue(r, snap => {
      const data = snap.val() || {}
      setRedemptions(Object.entries(data).map(([id, v]) => ({ id, ...v })))
    })
  }, [uid])
  return redemptions
}

/* ── Hook: todas as recompensas (para explorar) ─────────────────────────────── */
function useAllRewards(allPlaces) {
  const [allRewards, setAllRewards] = useState([])
  useEffect(() => {
    if (!allPlaces?.length) return
    const placesWithOwner = allPlaces.filter(p => p.ownerId)
    if (!placesWithOwner.length) return
    const refs = placesWithOwner.map(p => get(ref(db, `rewards/${p.id}`)))
    Promise.all(refs).then(snaps => {
      const result = []
      snaps.forEach((snap, i) => {
        const place = placesWithOwner[i]
        const data = snap.val() || {}
        Object.entries(data).forEach(([id, v]) => {
          if (v.active !== false) result.push({ id, placeId: place.id, placeName: place.name, placeEmoji: place.iconEmoji || '📍', ...v })
        })
      })
      result.sort((a,b) => (a.pointsCost||0) - (b.pointsCost||0))
      setAllRewards(result)
    })
  }, [allPlaces])
  return allRewards
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PAINEL DE RECOMPENSAS — Visão do Usuário
═══════════════════════════════════════════════════════════════════════════════ */
export default function RewardsPanel({ open, onClose, user, allPlaces, onUpdateScore }) {
  const [tab,          setTab]         = useState('explorar')
  const [redeeming,    setRedeeming]   = useState(null)  // reward being redeemed
  const [redeemCode,   setRedeemCode]  = useState(null)  // generated code
  const [redeemLoading,setRedeemLoading] = useState(false)
  const [redeemError,  setRedeemError] = useState(null)

  const allRewards    = useAllRewards(allPlaces)
  const myRedemptions = useMyRedemptions(user?.uid)

  const userScore = user?.score ?? 0

  /* ── Resgatar recompensa ──────────────────────────────────────────────────── */
  const handleRedeem = async (reward) => {
    if (!user?.uid) return
    if (userScore < reward.pointsCost) {
      setRedeemError('Pontos insuficientes! Continue explorando a cidade.')
      return
    }
    setRedeemLoading(true)
    setRedeemError(null)
    try {
      const code = genCode()
      const redemptionId = `${reward.placeId}_${reward.id}_${Date.now()}`
      const now = Date.now()

      // Save redemption record
      await set(ref(db, `redemptions/${user.uid}/${redemptionId}`), {
        code,
        placeId:   reward.placeId,
        placeName: reward.placeName,
        rewardId:  reward.id,
        rewardTitle: reward.title,
        rewardEmoji: reward.emoji || '🎁',
        pointsCost: reward.pointsCost,
        status: 'pending',  // pending → used
        ts: serverTimestamp(),
        expiresAt: now + 24 * 60 * 60 * 1000,  // 24h to use
      })

      // Notify owner
      await push(ref(db, `places/${reward.placeId}/pendingRedemptions`), {
        uid: user.uid,
        userName: user.name || 'Urbano',
        code,
        rewardId:  reward.id,
        rewardTitle: reward.title,
        pointsCost: reward.pointsCost,
        ts: serverTimestamp(),
        status: 'pending',
      })

      // Deduct points from user
      const userRef = ref(db, `users/${user.uid}/score`)
      const snap = await get(userRef)
      const current = snap.val() || 0
      await set(userRef, Math.max(0, current - reward.pointsCost))
      if (onUpdateScore) onUpdateScore(Math.max(0, current - reward.pointsCost))

      setRedeemCode({ code, reward })
    } catch(e) {
      console.error(e)
      setRedeemError('Erro ao resgatar. Tente novamente.')
    }
    setRedeemLoading(false)
  }

  const closeRedeem = () => {
    setRedeeming(null)
    setRedeemCode(null)
    setRedeemError(null)
  }

  const TIER_CONFIG = [
    { min: 0,      max: 4999,  label: 'Explorer',   color: '#94a3b8', emoji: '🗺️' },
    { min: 5000,   max: 14999, label: 'Urbano',      color: '#22c55e', emoji: '⚡' },
    { min: 15000,  max: 29999, label: 'Local',       color: '#3b82f6', emoji: '💙' },
    { min: 30000,  max: 59999, label: 'Influencer',  color: '#a855f7', emoji: '👑' },
    { min: 60000,  max: Infinity, label: 'Lendário', color: '#f59e0b', emoji: '🌟' },
  ]
  const tier = TIER_CONFIG.find(t => userScore >= t.min && userScore <= t.max) || TIER_CONFIG[0]
  const nextTier = TIER_CONFIG[TIER_CONFIG.indexOf(tier) + 1]
  const progress = nextTier ? Math.min(100, ((userScore - tier.min) / (nextTier.min - tier.min)) * 100) : 100

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:2400,
        background:'rgba(0,0,0,0.75)',
        backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
      }}/>

      {/* Panel */}
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:2500,
        background:'rgba(8,8,20,0.98)',
        backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)',
        border:'1px solid rgba(255,255,255,0.08)',
        borderRadius:'28px 28px 0 0',
        maxHeight:'90vh', display:'flex', flexDirection:'column',
        overflow:'hidden',
      }}>
        {/* Handle */}
        <div style={{width:36,height:4,background:'rgba(255,255,255,0.15)',borderRadius:2,margin:'14px auto 0',flexShrink:0}}/>

        {/* Header com pontos do usuário */}
        <div style={{
          padding:'18px 20px 0',
          borderBottom:'1px solid rgba(255,255,255,0.06)',
          flexShrink:0,
        }}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18}}>
            <div>
              <div style={{
                fontFamily:"'Outfit',sans-serif", fontSize:22, fontWeight:800,
                letterSpacing:'-.03em', marginBottom:4,
              }}>
                <span style={{background:'linear-gradient(135deg,#00f5a0,#00c87a)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
                  ⚡ Recompensas
                </span>
              </div>
              <div style={{fontSize:12, color:'rgba(240,240,255,0.4)'}}>
                Troque seus pontos por benefícios exclusivos
              </div>
            </div>
            <button onClick={onClose} style={{
              width:36, height:36, borderRadius:'50%',
              background:'rgba(255,255,255,0.06)',
              border:'1px solid rgba(255,255,255,0.1)',
              cursor:'pointer', color:'rgba(240,240,255,0.5)', fontSize:16,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>✕</button>
          </div>

          {/* User score card */}
          <div style={{
            background:'linear-gradient(135deg,rgba(0,245,160,0.08),rgba(0,200,122,0.04))',
            border:'1px solid rgba(0,245,160,0.2)',
            borderRadius:18, padding:'16px', marginBottom:16,
          }}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
              <div style={{display:'flex', alignItems:'center', gap:10}}>
                <div style={{
                  width:42, height:42, borderRadius:14,
                  background:'rgba(0,245,160,0.12)', border:'1px solid rgba(0,245,160,0.3)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:20,
                }}>{tier.emoji}</div>
                <div>
                  <div style={{fontSize:11, color:'rgba(240,240,255,0.4)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.08em'}}>
                    Nível {tier.label}
                  </div>
                  <div style={{
                    fontFamily:"'Space Mono',monospace", fontSize:24, fontWeight:700,
                    color:'var(--cyber)', lineHeight:1,
                  }}>{userScore.toLocaleString('pt-BR')}</div>
                  <div style={{fontSize:11, color:'rgba(240,240,255,0.4)'}}>pontos disponíveis</div>
                </div>
              </div>
              {nextTier && (
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:10, color:'rgba(240,240,255,0.35)'}}>Próximo nível</div>
                  <div style={{fontSize:13, fontWeight:700, color:nextTier.color}}>{nextTier.emoji} {nextTier.label}</div>
                  <div style={{fontSize:10, color:'rgba(240,240,255,0.35)'}}>
                    {(nextTier.min - userScore).toLocaleString('pt-BR')} pts
                  </div>
                </div>
              )}
            </div>
            {/* Progress bar */}
            <div style={{background:'rgba(255,255,255,0.06)', borderRadius:999, height:6, overflow:'hidden'}}>
              <div style={{
                width:`${progress}%`, height:'100%', borderRadius:999,
                background:'linear-gradient(90deg,#00f5a0,#00c87a)',
                transition:'width .5s ease',
              }}/>
            </div>
          </div>

          {/* Tabs */}
          <div style={{display:'flex', gap:6, paddingBottom:16}}>
            {[
              {id:'explorar', label:'🎁 Explorar'},
              {id:'meus',     label:'🎫 Meus Resgates'},
              {id:'como',     label:'❓ Como ganhar'},
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex:1, padding:'9px 4px', borderRadius:12,
                background: tab===t.id ? 'rgba(0,245,160,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${tab===t.id ? 'rgba(0,245,160,0.4)' : 'rgba(255,255,255,0.07)'}`,
                color: tab===t.id ? 'var(--cyber)' : 'rgba(240,240,255,0.5)',
                fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:11, cursor:'pointer',
                transition:'all .2s',
                whiteSpace:'nowrap',
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1, overflowY:'auto', padding:'16px', paddingBottom:32}}>

          {/* ── EXPLORAR ── */}
          {tab==='explorar' && (
            <div>
              {allRewards.length === 0 ? (
                <div style={{textAlign:'center', padding:'56px 0', color:'rgba(240,240,255,0.35)'}}>
                  <div style={{fontSize:44, marginBottom:14}}>🎁</div>
                  <div style={{fontSize:16, fontWeight:700, marginBottom:6, color:'rgba(240,240,255,0.5)'}}>
                    Nenhuma recompensa disponível
                  </div>
                  <div style={{fontSize:12}}>Os estabelecimentos ainda não cadastraram recompensas</div>
                </div>
              ) : (
                <>
                  <div style={{fontSize:12, color:'rgba(240,240,255,0.35)', marginBottom:14, fontWeight:600, textTransform:'uppercase', letterSpacing:'.08em'}}>
                    {allRewards.length} recompensa{allRewards.length!==1?'s':''} disponíveis
                  </div>
                  {allRewards.map(reward => {
                    const canAfford = userScore >= reward.pointsCost
                    const pct = Math.min(100, (userScore / reward.pointsCost) * 100)
                    return (
                      <div key={reward.id} style={{
                        background: canAfford ? 'rgba(0,245,160,0.04)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${canAfford ? 'rgba(0,245,160,0.2)' : 'rgba(255,255,255,0.07)'}`,
                        borderRadius:20, padding:'16px', marginBottom:10,
                        transition:'transform .15s',
                      }}>
                        <div style={{display:'flex', gap:14, alignItems:'flex-start'}}>
                          {/* Emoji badge */}
                          <div style={{
                            width:52, height:52, borderRadius:16, flexShrink:0,
                            background: canAfford ? 'rgba(0,245,160,0.1)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${canAfford ? 'rgba(0,245,160,0.25)' : 'rgba(255,255,255,0.1)'}`,
                            display:'flex', alignItems:'center', justifyContent:'center', fontSize:24,
                          }}>{reward.emoji || '🎁'}</div>

                          <div style={{flex:1, minWidth:0}}>
                            <div style={{fontSize:15, fontWeight:700, marginBottom:3}}>{reward.title}</div>
                            <div style={{fontSize:12, color:'rgba(240,240,255,0.5)', marginBottom:8, lineHeight:1.4}}>
                              {reward.description}
                            </div>
                            <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:10}}>
                              <div style={{fontSize:12, color:'rgba(240,240,255,0.4)'}}>
                                {reward.placeEmoji} {reward.placeName}
                              </div>
                            </div>

                            {/* Cost + progress */}
                            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:10}}>
                              <div>
                                <div style={{
                                  fontFamily:"'Space Mono',monospace",
                                  fontSize:14, fontWeight:700,
                                  color: canAfford ? 'var(--cyber)' : 'rgba(240,240,255,0.4)',
                                }}>
                                  ⚡ {reward.pointsCost.toLocaleString('pt-BR')} pts
                                </div>
                                {!canAfford && (
                                  <div style={{fontSize:10, color:'rgba(240,240,255,0.3)', marginTop:2}}>
                                    Faltam {(reward.pointsCost - userScore).toLocaleString('pt-BR')} pts
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  if (canAfford) { setRedeeming(reward); setRedeemError(null) }
                                }}
                                disabled={!canAfford}
                                style={{
                                  padding:'9px 18px', borderRadius:12, border:'none',
                                  background: canAfford
                                    ? 'linear-gradient(135deg,#00f5a0,#00c87a)'
                                    : 'rgba(255,255,255,0.06)',
                                  color: canAfford ? '#0a0f1e' : 'rgba(240,240,255,0.25)',
                                  fontFamily:"'DM Sans',sans-serif", fontWeight:800, fontSize:13,
                                  cursor: canAfford ? 'pointer' : 'not-allowed',
                                  transition:'transform .15s, box-shadow .15s',
                                  boxShadow: canAfford ? '0 4px 16px rgba(0,245,160,0.3)' : 'none',
                                }}
                                onMouseDown={e => { if(canAfford) e.currentTarget.style.transform='scale(.95)' }}
                                onMouseUp={e => { e.currentTarget.style.transform='scale(1)' }}
                              >
                                {canAfford ? 'Resgatar' : 'Bloqueado'}
                              </button>
                            </div>

                            {/* Progress bar (se não pode pagar) */}
                            {!canAfford && (
                              <div style={{marginTop:8}}>
                                <div style={{background:'rgba(255,255,255,0.06)', borderRadius:999, height:4}}>
                                  <div style={{
                                    width:`${pct}%`, height:'100%', borderRadius:999,
                                    background:'rgba(0,245,160,0.4)',
                                  }}/>
                                </div>
                                <div style={{fontSize:9, color:'rgba(240,240,255,0.25)', marginTop:3}}>
                                  {Math.round(pct)}% do total necessário
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          )}

          {/* ── MEUS RESGATES ── */}
          {tab==='meus' && (
            <div>
              {myRedemptions.length === 0 ? (
                <div style={{textAlign:'center', padding:'56px 0', color:'rgba(240,240,255,0.35)'}}>
                  <div style={{fontSize:44, marginBottom:14}}>🎫</div>
                  <div style={{fontSize:16, fontWeight:700, marginBottom:6, color:'rgba(240,240,255,0.5)'}}>
                    Nenhum resgate ainda
                  </div>
                  <div style={{fontSize:12}}>Explore as recompensas e troque seus pontos!</div>
                </div>
              ) : (
                myRedemptions.sort((a,b) => (b.ts||0) - (a.ts||0)).map(r => {
                  const isExpired = r.expiresAt && Date.now() > r.expiresAt
                  const isUsed    = r.status === 'used'
                  return (
                    <div key={r.id} style={{
                      background: isUsed || isExpired ? 'rgba(255,255,255,0.02)' : 'rgba(0,245,160,0.04)',
                      border: `1px solid ${isUsed||isExpired ? 'rgba(255,255,255,0.07)' : 'rgba(0,245,160,0.2)'}`,
                      borderRadius:18, padding:'16px', marginBottom:10,
                      opacity: isUsed || isExpired ? 0.6 : 1,
                    }}>
                      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:12}}>
                        <div style={{fontSize:28}}>{r.rewardEmoji || '🎁'}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:14, fontWeight:700}}>{r.rewardTitle}</div>
                          <div style={{fontSize:12, color:'rgba(240,240,255,0.4)'}}>📍 {r.placeName}</div>
                        </div>
                        <div style={{
                          padding:'4px 10px', borderRadius:999, fontSize:10, fontWeight:700,
                          background: isUsed ? 'rgba(100,116,139,0.2)' : isExpired ? 'rgba(239,68,68,0.15)' : 'rgba(0,245,160,0.12)',
                          color: isUsed ? '#64748b' : isExpired ? '#ef4444' : '#00f5a0',
                          border: `1px solid ${isUsed ? 'rgba(100,116,139,0.3)' : isExpired ? 'rgba(239,68,68,0.3)' : 'rgba(0,245,160,0.3)'}`,
                        }}>
                          {isUsed ? '✓ Usado' : isExpired ? '⏰ Expirado' : '🔑 Ativo'}
                        </div>
                      </div>

                      {/* Code display */}
                      {!isUsed && !isExpired && (
                        <div style={{
                          background:'rgba(0,0,0,0.4)',
                          border:'1px solid rgba(0,245,160,0.3)',
                          borderRadius:14, padding:'12px 16px',
                          display:'flex', alignItems:'center', justifyContent:'space-between',
                        }}>
                          <div>
                            <div style={{fontSize:10, color:'rgba(240,240,255,0.4)', marginBottom:4, textTransform:'uppercase', letterSpacing:'.1em'}}>
                              Código de resgate
                            </div>
                            <div style={{
                              fontFamily:"'Space Mono',monospace", fontSize:24, fontWeight:700,
                              color:'var(--cyber)', letterSpacing:'.15em',
                            }}>{r.code}</div>
                          </div>
                          <div style={{fontSize:10, color:'rgba(240,240,255,0.3)', textAlign:'right'}}>
                            Mostre este código<br/>no estabelecimento
                          </div>
                        </div>
                      )}

                      <div style={{fontSize:11, color:'rgba(240,240,255,0.3)', marginTop:8, display:'flex', justifyContent:'space-between'}}>
                        <span>⚡ -{r.pointsCost?.toLocaleString('pt-BR')} pontos</span>
                        {r.expiresAt && !isUsed && !isExpired && (
                          <span>⏱ Expira em {Math.ceil((r.expiresAt - Date.now()) / 3600000)}h</span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* ── COMO GANHAR ── */}
          {tab==='como' && (
            <div>
              <div style={{
                background:'rgba(0,245,160,0.04)', border:'1px solid rgba(0,245,160,0.15)',
                borderRadius:20, padding:'20px', marginBottom:16,
              }}>
                <div style={{fontSize:16, fontWeight:800, marginBottom:12, fontFamily:"'Outfit',sans-serif"}}>
                  🎮 Como funciona o sistema
                </div>
                <div style={{fontSize:13, color:'rgba(240,240,255,0.6)', lineHeight:1.7}}>
                  Ganhe pontos ao explorar e contribuir com a cidade. Quanto mais você reportar, mais pontos você acumula!
                </div>
              </div>

              {[
                { emoji:'📍', title:'Reportar ocorrência',      pts:10,  desc:'Trânsito, blitz, acidentes e mais' },
                { emoji:'🍻', title:'Reportar movimento',       pts:15,  desc:'Cheio, evento, show, promoção' },
                { emoji:'💬', title:'Mensagem no chat público', pts:5,   desc:'Contribuir com a conversa da cidade' },
                { emoji:'🏆', title:'1º report do dia',         pts:30,  desc:'Bônus por ser o primeiro a reportar' },
                { emoji:'🔥', title:'Hotspot criado',           pts:50,  desc:'Seu local atingiu nível QUENTE' },
                { emoji:'✅', title:'Report confirmado',        pts:20,  desc:'Outros usuários confirmaram seu report' },
                { emoji:'👥', title:'Indicar amigo',            pts:100, desc:'Amigo se cadastra com seu link' },
              ].map((item, i) => (
                <div key={i} style={{
                  display:'flex', alignItems:'center', gap:14,
                  padding:'14px 0',
                  borderBottom: i < 6 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}>
                  <div style={{
                    width:44, height:44, borderRadius:14, flexShrink:0,
                    background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
                  }}>{item.emoji}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14, fontWeight:700}}>{item.title}</div>
                    <div style={{fontSize:12, color:'rgba(240,240,255,0.4)', marginTop:2}}>{item.desc}</div>
                  </div>
                  <div style={{
                    fontFamily:"'Space Mono',monospace",
                    fontSize:14, fontWeight:700, color:'var(--cyber)', flexShrink:0,
                  }}>+{item.pts}</div>
                </div>
              ))}

              {/* Tier table */}
              <div style={{marginTop:24}}>
                <div style={{fontSize:14, fontWeight:700, marginBottom:12}}>🏅 Níveis e benefícios</div>
                {[
                  { emoji:'🗺️', label:'Explorer',   pts:'0',      color:'#94a3b8', desc:'Acesso básico às recompensas' },
                  { emoji:'⚡', label:'Urbano',      pts:'5.000',  color:'#22c55e', desc:'+10% de multiplicador nos reports' },
                  { emoji:'💙', label:'Local',       pts:'15.000', color:'#3b82f6', desc:'Acesso antecipado a recompensas especiais' },
                  { emoji:'👑', label:'Influencer',  pts:'30.000', color:'#a855f7', desc:'Badge exclusivo no perfil + prioridade' },
                  { emoji:'🌟', label:'Lendário',    pts:'60.000', color:'#f59e0b', desc:'Recompensas exclusivas + reconhecimento VIP' },
                ].map((t, i) => (
                  <div key={i} style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'12px 14px',
                    background: userScore >= parseInt(t.pts.replace('.',''))*1 ? `${t.color}12` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${userScore >= parseInt(t.pts.replace('.',''))*1 ? `${t.color}35` : 'rgba(255,255,255,0.06)'}`,
                    borderRadius:14, marginBottom:6,
                  }}>
                    <span style={{fontSize:20}}>{t.emoji}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13, fontWeight:700, color:t.color}}>{t.label}</div>
                      <div style={{fontSize:11, color:'rgba(240,240,255,0.4)'}}>{t.desc}</div>
                    </div>
                    <div style={{
                      fontFamily:"'Space Mono',monospace", fontSize:11, color:'rgba(240,240,255,0.4)',
                    }}>{t.pts} pts</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal de confirmação de resgate ──────────────────────────────────── */}
      {redeeming && !redeemCode && (
        <>
          <div style={{position:'fixed', inset:0, zIndex:3000, background:'rgba(0,0,0,0.8)'}} onClick={closeRedeem}/>
          <div style={{
            position:'fixed', bottom:'50%', left:'50%',
            transform:'translate(-50%, 50%)',
            zIndex:3100,
            background:'rgba(8,8,20,0.99)',
            border:'1px solid rgba(0,245,160,0.3)',
            borderRadius:28, padding:'28px 24px', width:'calc(100% - 32px)', maxWidth:400,
            boxShadow:'0 0 60px rgba(0,245,160,0.15)',
            animation:'fadeIn .25s ease',
          }}>
            <div style={{textAlign:'center', marginBottom:20}}>
              <div style={{fontSize:44, marginBottom:10}}>{redeeming.emoji || '🎁'}</div>
              <div style={{fontSize:18, fontWeight:800, fontFamily:"'Outfit',sans-serif", marginBottom:6}}>
                {redeeming.title}
              </div>
              <div style={{fontSize:13, color:'rgba(240,240,255,0.5)', lineHeight:1.5}}>
                {redeeming.description}
              </div>
            </div>

            <div style={{
              background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:16, padding:'14px 18px', marginBottom:16,
            }}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:8}}>
                <span style={{color:'rgba(240,240,255,0.5)', fontSize:13}}>Seus pontos</span>
                <span style={{fontFamily:"'Space Mono',monospace", color:'var(--cyber)'}}>
                  ⚡ {userScore.toLocaleString('pt-BR')}
                </span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:8}}>
                <span style={{color:'rgba(240,240,255,0.5)', fontSize:13}}>Custo</span>
                <span style={{fontFamily:"'Space Mono',monospace", color:'#ff4757'}}>
                  -⚡ {redeeming.pointsCost.toLocaleString('pt-BR')}
                </span>
              </div>
              <div style={{height:1, background:'rgba(255,255,255,0.08)', marginBottom:8}}/>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span style={{fontWeight:700, fontSize:13}}>Saldo após</span>
                <span style={{fontFamily:"'Space Mono',monospace", color:'var(--cyber)', fontWeight:700}}>
                  ⚡ {(userScore - redeeming.pointsCost).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>

            {redeemError && (
              <div style={{
                background:'rgba(255,71,87,0.1)', border:'1px solid rgba(255,71,87,0.3)',
                borderRadius:12, padding:'10px 14px', fontSize:12, color:'#ff4757', marginBottom:12,
              }}>{redeemError}</div>
            )}

            <div style={{display:'flex', gap:10}}>
              <button onClick={closeRedeem} style={{
                flex:1, padding:'13px 0', borderRadius:14,
                background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
                color:'rgba(240,240,255,0.7)', fontFamily:"'DM Sans',sans-serif", fontWeight:700,
                fontSize:14, cursor:'pointer',
              }}>Cancelar</button>
              <button
                onClick={() => handleRedeem(redeeming)}
                disabled={redeemLoading}
                style={{
                  flex:2, padding:'13px 0', borderRadius:14, border:'none',
                  background: redeemLoading ? 'rgba(0,245,160,0.5)' : 'linear-gradient(135deg,#00f5a0,#00c87a)',
                  color:'#0a0f1e', fontFamily:"'DM Sans',sans-serif", fontWeight:800,
                  fontSize:14, cursor: redeemLoading ? 'not-allowed' : 'pointer',
                  boxShadow:'0 4px 20px rgba(0,245,160,0.3)',
                }}
              >{redeemLoading ? 'Processando...' : '⚡ Confirmar resgate'}</button>
            </div>
          </div>
        </>
      )}

      {/* ── Código gerado com sucesso ─────────────────────────────────────────── */}
      {redeemCode && (
        <>
          <div style={{position:'fixed', inset:0, zIndex:3000, background:'rgba(0,0,0,0.85)'}} onClick={closeRedeem}/>
          <div style={{
            position:'fixed', bottom:'50%', left:'50%',
            transform:'translate(-50%, 50%)',
            zIndex:3100,
            background:'rgba(8,8,20,0.99)',
            border:'1px solid rgba(0,245,160,0.4)',
            borderRadius:28, padding:'32px 24px', width:'calc(100% - 32px)', maxWidth:400,
            boxShadow:'0 0 80px rgba(0,245,160,0.2)',
            textAlign:'center',
            animation:'fadeIn .3s ease',
          }}>
            <div style={{fontSize:52, marginBottom:12}}>🎉</div>
            <div style={{
              fontFamily:"'Outfit',sans-serif", fontSize:20, fontWeight:800,
              color:'var(--cyber)', marginBottom:8,
            }}>Resgate confirmado!</div>
            <div style={{fontSize:13, color:'rgba(240,240,255,0.5)', marginBottom:24}}>
              Apresente o código abaixo no estabelecimento
            </div>

            {/* Code */}
            <div style={{
              background:'rgba(0,0,0,0.5)',
              border:'2px solid rgba(0,245,160,0.4)',
              borderRadius:20, padding:'20px',
              marginBottom:20,
              boxShadow:'0 0 30px rgba(0,245,160,0.15) inset',
            }}>
              <div style={{fontSize:11, color:'rgba(240,240,255,0.4)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.12em'}}>
                Código de resgate
              </div>
              <div style={{
                fontFamily:"'Space Mono',monospace", fontSize:34, fontWeight:700,
                color:'var(--cyber)', letterSpacing:'.2em',
                textShadow:'0 0 20px rgba(0,245,160,0.5)',
              }}>{redeemCode.code}</div>
              <div style={{fontSize:11, color:'rgba(240,240,255,0.4)', marginTop:10}}>
                ⏱ Válido por 24 horas · {redeemCode.reward.placeName}
              </div>
            </div>

            <div style={{fontSize:12, color:'rgba(240,240,255,0.4)', marginBottom:20, lineHeight:1.5}}>
              📱 O código também aparece em "Meus Resgates". O estabelecimento vai validar e marcar como usado.
            </div>

            <button onClick={closeRedeem} style={{
              width:'100%', padding:'14px 0', borderRadius:16, border:'none',
              background:'linear-gradient(135deg,#00f5a0,#00c87a)',
              color:'#0a0f1e', fontFamily:"'DM Sans',sans-serif", fontWeight:800,
              fontSize:15, cursor:'pointer',
              boxShadow:'0 4px 20px rgba(0,245,160,0.3)',
            }}>Perfeito! ✓</button>
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translate(-50%,calc(50% + 20px)) } to { opacity:1; transform:translate(-50%,50%) } }
      `}</style>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PAINEL DO DONO — Aba de Recompensas
   Use dentro do OwnerPanel como <OwnerRewardsTab placeId={...} />
═══════════════════════════════════════════════════════════════════════════════ */
export function OwnerRewardsTab({ placeId }) {
  const rewards = useRewards(placeId)
  const [creating,  setCreating]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [form, setForm] = useState({ title:'', description:'', pointsCost:10000, emoji:'🎁' })
  const [pendingRedemptions, setPending] = useState([])

  // Load pending redemptions
  useEffect(() => {
    if (!placeId) return
    const r = ref(db, `places/${placeId}/pendingRedemptions`)
    return onValue(r, snap => {
      const data = snap.val() || {}
      setPending(Object.entries(data).map(([id,v]) => ({id,...v})).filter(r => r.status === 'pending'))
    })
  }, [placeId])

  const handleCreate = async () => {
    if (!form.title.trim() || form.pointsCost < 100) return
    setSaving(true)
    try {
      await push(ref(db, `rewards/${placeId}`), {
        ...form,
        pointsCost: Number(form.pointsCost),
        active: true,
        createdAt: serverTimestamp(),
      })
      setCreating(false)
      setForm({ title:'', description:'', pointsCost:10000, emoji:'🎁' })
    } catch(e) { console.error(e) }
    setSaving(false)
  }

  const handleToggleActive = async (rewardId, current) => {
    await update(ref(db, `rewards/${placeId}/${rewardId}`), { active: !current })
  }

  const handleValidateRedemption = async (redemption) => {
    try {
      // Mark as used in pendingRedemptions
      await update(ref(db, `places/${placeId}/pendingRedemptions/${redemption.id}`), { status: 'used' })
      // Find and mark user's redemption record
      // (simplification: we mark via placeId+rewardId+code lookup)
    } catch(e) { console.error(e) }
  }

  const EMOJI_OPTIONS = ['🎁','🍺','☕','🍕','🍔','🎉','💸','🎫','🥤','🍷','🎭','🏆','💅','🎸','🌟']

  return (
    <div style={{padding:'0 0 32px'}}>

      {/* Pending redemptions */}
      {pendingRedemptions.length > 0 && (
        <div style={{marginBottom:20}}>
          <div style={{
            fontSize:12, fontWeight:700, color:'#ff4757', textTransform:'uppercase',
            letterSpacing:'.08em', marginBottom:10, display:'flex', alignItems:'center', gap:6,
          }}>
            <div style={{width:6,height:6,borderRadius:'50%',background:'#ff4757',animation:'blink 1s ease infinite'}}/>
            {pendingRedemptions.length} resgate{pendingRedemptions.length!==1?'s':''} para validar
          </div>
          {pendingRedemptions.map(r => (
            <div key={r.id} style={{
              background:'rgba(255,71,87,0.06)', border:'1px solid rgba(255,71,87,0.25)',
              borderRadius:16, padding:'14px', marginBottom:8,
            }}>
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
                <div>
                  <div style={{fontSize:13, fontWeight:700}}>{r.rewardTitle}</div>
                  <div style={{fontSize:12, color:'rgba(240,240,255,0.5)'}}>
                    👤 {r.userName} · ⚡ {r.pointsCost?.toLocaleString('pt-BR')} pts
                  </div>
                </div>
                <div style={{
                  fontFamily:"'Space Mono',monospace", fontSize:18, fontWeight:700,
                  color:'var(--cyber)', letterSpacing:'.1em',
                }}>{r.code}</div>
              </div>
              <button onClick={() => handleValidateRedemption(r)} style={{
                width:'100%', padding:'9px', borderRadius:10, border:'none',
                background:'rgba(0,245,160,0.15)', color:'var(--cyber)',
                fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:12, cursor:'pointer',
              }}>✓ Validar e marcar como usado</button>
            </div>
          ))}
        </div>
      )}

      {/* Rewards list */}
      <div style={{marginBottom:16}}>
        {rewards.map(reward => (
          <div key={reward.id} style={{
            background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
            borderRadius:16, padding:'14px', marginBottom:8,
            display:'flex', alignItems:'center', gap:12,
          }}>
            <div style={{fontSize:24, flexShrink:0}}>{reward.emoji || '🎁'}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13, fontWeight:700}}>{reward.title}</div>
              <div style={{fontSize:12, color:'rgba(240,240,255,0.4)'}}>
                ⚡ {reward.pointsCost?.toLocaleString('pt-BR')} pts · {reward.active ? 'Ativo' : 'Inativo'}
              </div>
            </div>
            <button onClick={() => handleToggleActive(reward.id, reward.active)} style={{
              padding:'6px 12px', borderRadius:8,
              background: reward.active ? 'rgba(0,245,160,0.1)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${reward.active ? 'rgba(0,245,160,0.3)' : 'rgba(255,255,255,0.1)'}`,
              color: reward.active ? 'var(--cyber)' : 'rgba(240,240,255,0.4)',
              fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif",
            }}>{reward.active ? '● Ativo' : '○ Inativo'}</button>
          </div>
        ))}
      </div>

      {/* Create new reward */}
      {!creating ? (
        <button onClick={() => setCreating(true)} style={{
          width:'100%', padding:'13px', borderRadius:14,
          background:'rgba(0,245,160,0.08)', border:'1px dashed rgba(0,245,160,0.3)',
          color:'var(--cyber)', fontFamily:"'DM Sans',sans-serif", fontWeight:700,
          fontSize:13, cursor:'pointer',
        }}>+ Criar nova recompensa</button>
      ) : (
        <div style={{
          background:'rgba(0,245,160,0.04)', border:'1px solid rgba(0,245,160,0.2)',
          borderRadius:18, padding:'18px',
        }}>
          <div style={{fontSize:14, fontWeight:700, marginBottom:14}}>✨ Nova recompensa</div>

          {/* Emoji picker */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11, color:'rgba(240,240,255,0.4)', marginBottom:8}}>Ícone</div>
            <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
              {EMOJI_OPTIONS.map(e => (
                <button key={e} onClick={() => setForm(f => ({...f, emoji:e}))} style={{
                  width:36, height:36, borderRadius:10, border:`2px solid ${form.emoji===e?'var(--cyber)':'rgba(255,255,255,0.1)'}`,
                  background: form.emoji===e?'rgba(0,245,160,0.15)':'rgba(255,255,255,0.04)',
                  fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                }}>{e}</button>
              ))}
            </div>
          </div>

          {[
            { key:'title', label:'Nome da recompensa', placeholder:'Ex: Uma cerveja grátis' },
            { key:'description', label:'Descrição', placeholder:'Ex: Válido para qualquer chope em dias de semana' },
          ].map(field => (
            <div key={field.key} style={{marginBottom:12}}>
              <div style={{fontSize:11, color:'rgba(240,240,255,0.4)', marginBottom:6}}>{field.label}</div>
              <input
                value={form[field.key]}
                onChange={e => setForm(f => ({...f, [field.key]: e.target.value}))}
                placeholder={field.placeholder}
                style={{
                  width:'100%', background:'rgba(255,255,255,0.06)',
                  border:'1px solid rgba(255,255,255,0.1)', borderRadius:12,
                  padding:'10px 14px', color:'var(--text)',
                  fontFamily:"'DM Sans',sans-serif", fontSize:13, outline:'none',
                  boxSizing:'border-box',
                }}
              />
            </div>
          ))}

          <div style={{marginBottom:16}}>
            <div style={{fontSize:11, color:'rgba(240,240,255,0.4)', marginBottom:6}}>Custo em pontos</div>
            <input
              type="number" min="100" step="1000"
              value={form.pointsCost}
              onChange={e => setForm(f => ({...f, pointsCost: parseInt(e.target.value)||0}))}
              style={{
                width:'100%', background:'rgba(255,255,255,0.06)',
                border:'1px solid rgba(0,245,160,0.2)', borderRadius:12,
                padding:'10px 14px', color:'var(--cyber)',
                fontFamily:"'Space Mono',monospace", fontSize:16, outline:'none',
                boxSizing:'border-box', fontWeight:700,
              }}
            />
            <div style={{fontSize:11, color:'rgba(240,240,255,0.3)', marginTop:5}}>
              Recomendação: 5.000–50.000 pontos dependendo do valor do benefício
            </div>
          </div>

          <div style={{display:'flex', gap:8}}>
            <button onClick={() => setCreating(false)} style={{
              flex:1, padding:'11px', borderRadius:12, cursor:'pointer',
              background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
              color:'rgba(240,240,255,0.6)', fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:13,
            }}>Cancelar</button>
            <button onClick={handleCreate} disabled={saving} style={{
              flex:2, padding:'11px', borderRadius:12, border:'none', cursor:'pointer',
              background: saving ? 'rgba(0,245,160,0.5)' : 'linear-gradient(135deg,#00f5a0,#00c87a)',
              color:'#0a0f1e', fontFamily:"'DM Sans',sans-serif", fontWeight:800, fontSize:13,
              boxShadow:'0 4px 16px rgba(0,245,160,0.25)',
            }}>{saving ? 'Salvando...' : '✓ Criar recompensa'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
