// ── PERFIL PÚBLICO DO USUÁRIO — redesign completo ─────────────────────────────
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ref, get, set, remove, increment, update } from 'firebase/database'
import { db } from '../lib/firebase'

const timeAgo = ts => {
  const d = Math.floor((Date.now() - ts) / 1000)
  if (d < 60)    return `${d}s`
  if (d < 3600)  return `${Math.floor(d/60)}min`
  if (d < 86400) return `${Math.floor(d/3600)}h`
  return `${Math.floor(d/86400)}d`
}

const CAT_EMOJI  = { noturno:'🌙', transito:'🚦', estabelecimento:'☕', parque:'🌿', comercio:'🏪', show:'🎭', bar:'🍺' }
const EVENT_META = {
  cheio:    { emoji:'🔥', label:'Cheio',    color:'#ef4444' },
  evento:   { emoji:'🎉', label:'Evento',   color:'#8b5cf6' },
  morto:    { emoji:'💤', label:'Vazio',    color:'#6b7280' },
  pesado:   { emoji:'🚗', label:'Trânsito', color:'#f59e0b' },
  bloqueio: { emoji:'🚧', label:'Bloqueio', color:'#f97316' },
  acidente: { emoji:'⚠️', label:'Acidente', color:'#ef4444' },
  blitz:    { emoji:'🚔', label:'Blitz',    color:'#3b82f6' },
  agitado:  { emoji:'⚡', label:'Agitado',  color:'#22c55e' },
}

function StarBar({ score }) {
  const stars = Math.min(5, Math.max(1, Math.round(score || 0)))
  return (
    <div style={{ display:'flex', gap:3 }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width="13" height="13" viewBox="0 0 24 24"
          fill={i<=stars?'#22c55e':'none'} stroke={i<=stars?'#22c55e':'#2d4a35'} strokeWidth="2">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
      ))}
    </div>
  )
}

function LevelBadge({ score }) {
  const level =
    score >= 5000 ? { label:'Lendário',        icon:'🏆', bg:'rgba(251,191,36,.15)', border:'rgba(251,191,36,.4)',  color:'#fbbf24' } :
    score >= 2000 ? { label:'Expert Urbano',    icon:'🥇', bg:'rgba(34,197,94,.15)',  border:'rgba(34,197,94,.4)',   color:'#22c55e' } :
    score >= 1000 ? { label:'Explorador',       icon:'🥈', bg:'rgba(148,163,184,.1)', border:'rgba(148,163,184,.3)', color:'#94a3b8' } :
    score >= 300  ? { label:'Urbano Iniciante', icon:'🥉', bg:'rgba(180,83,9,.12)',   border:'rgba(180,83,9,.3)',    color:'#d97706' } :
                    { label:'Novato',            icon:'🌱', bg:'rgba(34,197,94,.08)',  border:'rgba(34,197,94,.2)',   color:'#4ade80' }
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap:6,
      background:level.bg, border:`1px solid ${level.border}`,
      borderRadius:100, padding:'5px 12px',
      fontSize:11, color:level.color, fontWeight:700,
    }}>
      <span>{level.icon}</span> {level.label}
    </div>
  )
}

export default function UserProfilePanel({ open, targetUid, currentUser, onClose, onOpenChat }) {
  const [profile,          setProfile]          = useState(null)
  const [reviews,          setReviews]          = useState([])
  const [userEvents,       setUserEvents]       = useState([])
  const [followersCount,   setFollowersCount]   = useState(0)
  const [followingCount,   setFollowingCount]   = useState(0)
  const [isFollowing,      setIsFollowing]      = useState(false)
  const [isPendingRequest, setIsPendingRequest] = useState(false)
  const [loading,          setLoading]          = useState(true)
  const [tab,              setTab]              = useState('atividade')
  const [toggling,         setToggling]         = useState(false)
  const scrollRef = useRef(null)

  const isOwnProfile = currentUser?.uid === targetUid

  useEffect(() => {
    if (!open || !targetUid) return
    setLoading(true)
    setTab('atividade')
    setProfile(null)
    if (scrollRef.current) scrollRef.current.scrollTop = 0

    const loads = [
      get(ref(db, `users/${targetUid}`)).then(s => {
        if (s.exists()) setProfile({ uid: targetUid, ...s.val() })
      }),
      get(ref(db, `followers/${targetUid}`)).then(s => {
        setFollowersCount(s.exists() ? Object.keys(s.val()).length : 0)
      }),
      get(ref(db, `users/${targetUid}/following`)).then(s => {
        setFollowingCount(s.exists() ? Object.keys(s.val()).length : 0)
      }),
      currentUser?.uid && targetUid !== currentUser.uid
        ? get(ref(db, `followers/${targetUid}/${currentUser.uid}`)).then(s => setIsFollowing(s.exists()))
        : Promise.resolve(),
      currentUser?.uid && targetUid !== currentUser.uid
        ? get(ref(db, `followRequests/${targetUid}/${currentUser.uid}`)).then(s => setIsPendingRequest(s.exists()))
        : Promise.resolve(),
    ]

    get(ref(db, 'events')).then(s => {
      if (!s.exists()) return setUserEvents([])
      const all = Object.entries(s.val()).map(([id,v])=>({id,...v}))
      setUserEvents(all.filter(e=>e.userId===targetUid).sort((a,b)=>b.ts-a.ts).slice(0,30))
    })

    get(ref(db, 'reviews')).then(s => {
      if (!s.exists()) return setReviews([])
      const all = []
      s.forEach(locSnap => {
        locSnap.forEach(r => {
          const v = r.val()
          if (v.userId === targetUid) all.push({ id:r.key, locationId:locSnap.key, ...v })
        })
      })
      setReviews(all.sort((a,b)=>b.ts-a.ts).slice(0,20))
    })

    Promise.all(loads).finally(() => setLoading(false))
  }, [open, targetUid, currentUser?.uid])

  const handleToggleFollow = useCallback(async () => {
    if (!currentUser?.uid || !targetUid || toggling || isOwnProfile) return
    setToggling(true)
    const followerRef  = ref(db, `followers/${targetUid}/${currentUser.uid}`)
    const followingRef = ref(db, `users/${currentUser.uid}/following/${targetUid}`)

    if (isFollowing) {
      await remove(followerRef)
      await remove(followingRef)
      await update(ref(db, `users/${targetUid}`), { followers: increment(-1) })
      setFollowersCount(c => Math.max(0, c - 1))
      setIsFollowing(false)
    } else if (isPendingRequest) {
      await remove(ref(db, `followRequests/${targetUid}/${currentUser.uid}`))
      const nSnap = await get(ref(db, `notifications/${targetUid}`))
      if (nSnap.exists()) {
        nSnap.forEach(child => {
          const v = child.val()
          if (v.type === 'follow_request' && v.fromUid === currentUser.uid)
            remove(ref(db, `notifications/${targetUid}/${child.key}`))
        })
      }
      setIsPendingRequest(false)
    } else {
      const privSnap = await get(ref(db, `users/${targetUid}/privacy/publicProfile`))
      const isPrivate = privSnap.exists() ? !privSnap.val() : false

      if (isPrivate) {
        await set(ref(db, `followRequests/${targetUid}/${currentUser.uid}`), {
          name:currentUser.name, photo:currentUser.photo||null, ts:Date.now()
        })
        await set(ref(db, `notifications/${targetUid}/${Date.now()}_req`), {
          type:'follow_request', title:`${currentUser.name} quer te seguir`,
          body:'Toque para aceitar ou recusar', fromUid:currentUser.uid,
          fromName:currentUser.name, fromPhoto:currentUser.photo||null,
          ts:Date.now(), read:false,
        })
        setIsPendingRequest(true)
      } else {
        await set(followerRef, { followedAt:Date.now(), name:currentUser.name, photo:currentUser.photo||null })
        await set(followingRef, { followedAt:Date.now(), name:profile?.name||'', photo:profile?.photo||null })
        await update(ref(db, `users/${targetUid}`), { followers: increment(1) })
        await set(ref(db, `notifications/${targetUid}/${Date.now()}_flw`), {
          type:'new_follower', title:`${currentUser.name} começou a te seguir`,
          body:'Toque para ver o perfil', fromUid:currentUser.uid,
          fromName:currentUser.name, fromPhoto:currentUser.photo||null,
          ts:Date.now(), read:false,
        })
        setFollowersCount(c => c + 1)
        setIsFollowing(true)
      }
    }
    setToggling(false)
  }, [currentUser, targetUid, isFollowing, isPendingRequest, toggling, profile, isOwnProfile])

  if (!open) return null

  const accentColor = profile?.score >= 5000 ? '#fbbf24' : '#22c55e'
  const TABS = [
    { id:'atividade',  label:'Atividade',  count: userEvents.length },
    { id:'avaliacoes', label:'Avaliações', count: reviews.length },
  ]

  return (
    <>
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:3500,
        background:'rgba(0,0,0,.85)', backdropFilter:'blur(8px)',
        animation:'ppFadeIn .25s ease',
      }}/>

      <div ref={scrollRef} style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:3600,
        background:'var(--bg)',
        borderRadius:'28px 28px 0 0',
        maxHeight:'94vh',
        overflowY:'auto',
        overflowX:'hidden',
        animation:'ppSlideUp .32s cubic-bezier(.22,1,.36,1)',
        scrollbarWidth:'none',
      }}>

        {/* ── CAPA ── */}
        <div style={{
          position:'relative', height:200,
          background: profile?.coverUrl ? 'none' : 'linear-gradient(135deg, #071a0e 0%, #0d2d17 40%, #112e1a 100%)',
          overflow:'hidden', flexShrink:0,
        }}>
          {profile?.coverUrl && (
            <img src={profile.coverUrl} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>
          )}
          <div style={{
            position:'absolute', inset:0,
            background: profile?.coverUrl
              ? 'linear-gradient(to bottom, rgba(0,0,0,.1) 0%, transparent 40%, rgba(0,0,0,.75) 80%, var(--bg) 100%)'
              : 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,.3) 60%, var(--bg) 100%)',
          }}/>
          {!profile?.coverUrl && (
            <div style={{
              position:'absolute', inset:0, opacity:.07,
              backgroundImage:'radial-gradient(circle, #22c55e 1px, transparent 1px)',
              backgroundSize:'28px 28px',
            }}/>
          )}
          {!profile?.coverUrl && (
            <div style={{
              position:'absolute', top:-40, right:-40, width:240, height:240,
              borderRadius:'50%',
              background:'radial-gradient(circle, rgba(34,197,94,.06) 0%, transparent 70%)',
            }}/>
          )}

          {/* Handle */}
          <div style={{position:'absolute',top:12,left:'50%',transform:'translateX(-50%)',width:40,height:4,background:'rgba(255,255,255,.18)',borderRadius:2}}/>

          {/* Fechar */}
          <button onClick={onClose} style={{
            position:'absolute', top:14, right:14, width:34, height:34, borderRadius:'50%',
            background:'rgba(0,0,0,.5)', border:'1px solid rgba(255,255,255,.1)',
            color:'#fff', cursor:'pointer', fontSize:13, backdropFilter:'blur(12px)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>✕</button>

          {/* Editar capa (próprio perfil) */}
          {isOwnProfile && (
            <label style={{
              position:'absolute', top:14, right:56, width:34, height:34, borderRadius:'50%',
              background:'rgba(0,0,0,.5)', border:'1px solid rgba(255,255,255,.1)',
              color:'#fff', cursor:'pointer', backdropFilter:'blur(12px)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
            }}>
              📷
              <input type="file" accept="image/*" style={{display:'none'}} onChange={async e=>{
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  const { uploadToCloudinary } = await import('../lib/cloudinary')
                  const url = await uploadToCloudinary(file)
                  const { ref: fbRef, update: fbUpdate } = await import('firebase/database')
                  await fbUpdate(fbRef(db, `users/${targetUid}`), { coverUrl: url })
                  setProfile(p=>({...p, coverUrl:url}))
                } catch(e) { console.error(e) }
              }}/>
            </label>
          )}
        </div>

        {/* ── CONTEÚDO ── */}
        <div style={{position:'relative', padding:'0 20px', marginTop:-60}}>

          {/* Avatar */}
          <div style={{position:'relative', display:'inline-block', marginBottom:12}}>
            <div style={{
              width:90, height:90, borderRadius:'50%',
              background:'var(--surface2)',
              border:'3px solid var(--bg)',
              boxShadow:`0 0 0 2px ${accentColor}60, 0 8px 32px rgba(0,0,0,.6)`,
              overflow:'hidden',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:36,
            }}>
              {profile?.photo
                ? <img src={profile.photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                : '👤'}
            </div>
            <div style={{
              position:'absolute', bottom:4, right:4,
              width:16, height:16, borderRadius:'50%',
              background:'#22c55e', border:'2.5px solid var(--bg)',
              boxShadow:'0 0 8px rgba(34,197,94,.6)',
            }}/>
          </div>

          {/* Loading skeleton */}
          {loading ? (
            <div style={{paddingTop:20}}>
              {[140,90,200,60].map((w,i) => (
                <div key={i} style={{
                  height:i===0?22:i===1?14:i===2?12:30,
                  width:w, borderRadius:6,
                  background:'var(--surface2)', marginBottom:12,
                  animation:'ppPulse 1.4s ease infinite',
                  animationDelay:`${i*0.15}s`,
                }}/>
              ))}
            </div>
          ) : !profile ? (
            <div style={{textAlign:'center',padding:'40px 0',color:'var(--muted)'}}>
              <div style={{fontSize:40,marginBottom:12}}>👤</div>
              <div style={{fontSize:14,fontWeight:700}}>Perfil não encontrado</div>
            </div>
          ) : (
            <>
              {/* Nome + ações */}
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:6}}>
                <div style={{minWidth:0}}>
                  <div style={{
                    fontSize:24, fontWeight:900, lineHeight:1.1,
                    letterSpacing:'-.02em',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                  }}>{profile.name || 'Urbano'}</div>
                  <div style={{fontSize:13, color:'var(--muted)', marginTop:3}}>
                    @{(profile.name||'user').toLowerCase().replace(/\s+/g,'')}
                  </div>
                </div>

                {!isOwnProfile && (
                  <div style={{display:'flex', gap:8, flexShrink:0, paddingTop:4}}>
                    {onOpenChat && (
                      <button
                        onClick={()=>{ onOpenChat(targetUid, profile.name, profile.photo||null); onClose() }}
                        style={{
                          width:38, height:38, borderRadius:'50%',
                          background:'var(--surface2)', border:'1px solid var(--border)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          cursor:'pointer', fontSize:16, transition:'border-color .2s',
                        }}
                        onMouseEnter={e=>e.currentTarget.style.borderColor='var(--primary)'}
                        onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}
                        title="Enviar mensagem"
                      >💬</button>
                    )}
                    <button onClick={handleToggleFollow} disabled={toggling} style={{
                      padding:'0 18px', height:38, borderRadius:100,
                      background: isFollowing
                        ? 'var(--surface2)'
                        : isPendingRequest
                        ? 'rgba(245,158,11,.12)'
                        : 'linear-gradient(135deg, #22c55e, #16a34a)',
                      color: isFollowing ? 'var(--muted)' : isPendingRequest ? '#f59e0b' : '#052e16',
                      fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:12,
                      cursor: toggling ? 'wait' : 'pointer',
                      border: isFollowing
                        ? '1px solid var(--border)'
                        : isPendingRequest
                        ? '1px solid rgba(245,158,11,.35)'
                        : 'none',
                      boxShadow: isFollowing||isPendingRequest ? 'none' : '0 4px 16px rgba(34,197,94,.35)',
                      transition:'all .2s', whiteSpace:'nowrap',
                    }}>
                      {toggling ? '···' : isFollowing ? '✓ Seguindo' : isPendingRequest ? '⏳ Solicitado' : '＋ Seguir'}
                    </button>
                  </div>
                )}
              </div>

              {/* Badge nível */}
              <div style={{marginBottom:14}}>
                <LevelBadge score={profile.score||0}/>
              </div>

              {/* Bio */}
              {profile.bio && (
                <div style={{
                  fontSize:13, color:'var(--text2)', lineHeight:1.75,
                  marginBottom:20, padding:'12px 16px',
                  background:'rgba(255,255,255,.03)',
                  borderLeft:`3px solid ${accentColor}60`,
                  borderRadius:'0 10px 10px 0',
                }}>{profile.bio}</div>
              )}

              {/* Stats 4 cards */}
              <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:24}}>
                {[
                  { val:profile.score||0, label:'Pontos',     icon:'⚡', mono:true,  accent:accentColor },
                  { val:userEvents.length, label:'Reportes',  icon:'📡', mono:false, accent:'#60a5fa' },
                  { val:followingCount,    label:'Seguindo',  icon:'👣', mono:false, accent:'#a78bfa' },
                  { val:followersCount,    label:'Seguidores',icon:'🫂', mono:false, accent:'#34d399' },
                ].map((s,i) => (
                  <div key={i} style={{
                    background:'var(--surface2)', border:'1px solid var(--border)',
                    borderRadius:16, padding:'14px 8px', textAlign:'center',
                    position:'relative', overflow:'hidden',
                    animation:'ppStatIn .4s ease both',
                    animationDelay:`${i*0.07}s`,
                  }}>
                    <div style={{
                      position:'absolute', inset:0,
                      background:`radial-gradient(circle at 50% 0%, ${s.accent}14 0%, transparent 70%)`,
                    }}/>
                    <div style={{position:'relative'}}>
                      <div style={{fontSize:16, marginBottom:5}}>{s.icon}</div>
                      <div style={{
                        fontFamily:s.mono?"'Syne',monospace":'inherit',
                        fontSize:s.val>9999?14:20, fontWeight:900,
                        color:s.accent, lineHeight:1, marginBottom:5,
                      }}>{s.val.toLocaleString('pt-BR')}</div>
                      <div style={{fontSize:9,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.07em',fontWeight:600}}>
                        {s.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div style={{
                display:'flex', borderBottom:'1px solid var(--border)',
                marginLeft:-20, marginRight:-20, paddingLeft:20,
              }}>
                {TABS.map(t => (
                  <button key={t.id} onClick={()=>setTab(t.id)} style={{
                    padding:'12px 20px 12px 0', background:'none', border:'none',
                    borderBottom:`2.5px solid ${tab===t.id?accentColor:'transparent'}`,
                    color:tab===t.id?accentColor:'var(--muted)',
                    fontSize:13, fontWeight:tab===t.id?700:500,
                    cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif",
                    transition:'all .2s', display:'flex', alignItems:'center', gap:6,
                  }}>
                    {t.label}
                    {t.count > 0 && (
                      <span style={{
                        background:tab===t.id?`${accentColor}20`:'var(--surface2)',
                        color:tab===t.id?accentColor:'var(--dim)',
                        borderRadius:100, padding:'1px 7px', fontSize:10, fontWeight:700,
                      }}>{t.count}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab: Atividade */}
              {tab==='atividade' && (
                <div style={{paddingBottom:56, paddingTop:4}}>
                  {userEvents.length===0 ? (
                    <div style={{textAlign:'center',padding:'52px 0',color:'var(--muted)'}}>
                      <div style={{fontSize:40,marginBottom:12}}>📭</div>
                      <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>Nenhuma atividade</div>
                      <div style={{fontSize:12}}>Ainda não há reportes por aqui</div>
                    </div>
                  ) : userEvents.map((ev,i) => {
                    const meta = EVENT_META[ev.type] || { emoji:'📍', label:ev.type||'Reporte', color:'#22c55e' }
                    return (
                      <div key={ev.id} style={{
                        display:'flex', alignItems:'center', gap:14,
                        padding:'14px 0', borderBottom:'1px solid var(--border)',
                        animation:'ppFadeIn .3s ease both',
                        animationDelay:`${i*0.04}s`,
                      }}>
                        <div style={{
                          width:46, height:46, borderRadius:14, flexShrink:0,
                          background:`${meta.color}15`, border:`1px solid ${meta.color}30`,
                          display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
                        }}>{meta.emoji}</div>
                        <div style={{flex:1, minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:700,marginBottom:3,color:meta.color}}>
                            {meta.label}
                          </div>
                          <div style={{fontSize:12,color:'var(--muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                            📍 {ev.locationName || 'Local desconhecido'}
                          </div>
                        </div>
                        <div style={{
                          fontSize:10, color:'var(--dim)', flexShrink:0,
                          background:'var(--surface2)', borderRadius:100,
                          padding:'3px 8px', border:'1px solid var(--border)',
                        }}>{timeAgo(ev.ts)}</div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Tab: Avaliações */}
              {tab==='avaliacoes' && (
                <div style={{paddingBottom:56, paddingTop:12}}>
                  {reviews.length===0 ? (
                    <div style={{textAlign:'center',padding:'52px 0',color:'var(--muted)'}}>
                      <div style={{fontSize:40,marginBottom:12}}>⭐</div>
                      <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>Nenhuma avaliação</div>
                      <div style={{fontSize:12}}>Ainda não avaliou nenhum local</div>
                    </div>
                  ) : reviews.map((r,i) => (
                    <div key={r.id} style={{
                      background:'var(--surface2)', border:'1px solid var(--border)',
                      borderRadius:18, padding:'16px', marginBottom:12,
                      animation:'ppFadeIn .3s ease both',
                      animationDelay:`${i*0.05}s`,
                    }}>
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{
                            width:38, height:38, borderRadius:10, flexShrink:0,
                            background:'var(--surface3)',
                            display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
                          }}>{CAT_EMOJI[r.locationCat]||'📍'}</div>
                          <div>
                            <div style={{fontSize:13,fontWeight:700}}>{r.locationName||'Local'}</div>
                            <div style={{fontSize:10,color:'var(--muted)',marginTop:1}}>{timeAgo(r.ts)}</div>
                          </div>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                          <StarBar score={r.stars}/>
                          <span style={{fontFamily:"'Syne',monospace",fontSize:12,color:'#22c55e',fontWeight:800}}>
                            {r.stars}.0
                          </span>
                        </div>
                      </div>
                      {r.text && (
                        <div style={{
                          fontSize:13, color:'var(--muted)', lineHeight:1.7,
                          padding:'10px 12px', background:'rgba(255,255,255,.03)',
                          borderRadius:10, marginTop:4, fontStyle:'italic',
                        }}>"{r.text}"</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes ppFadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes ppSlideUp { from{transform:translateY(60px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes ppStatIn  { from{opacity:0;transform:translateY(12px) scale(.94)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes ppPulse   { 0%,100%{opacity:.4} 50%{opacity:.9} }
      `}</style>
    </>
  )
}
