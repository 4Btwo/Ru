// ── PERFIL PÚBLICO DO USUÁRIO ─────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react'
import { ref, get, onValue, set, remove, increment, update } from 'firebase/database'
import { db } from '../lib/firebase'

const timeAgo = ts => {
  const d = Math.floor((Date.now() - ts) / 1000)
  if (d < 60)    return `${d}s`
  if (d < 3600)  return `${Math.floor(d/60)}min`
  if (d < 86400) return `${Math.floor(d/3600)}h`
  return `${Math.floor(d/86400)}d`
}

function StarBar({score}) {
  const stars = Math.min(5, Math.max(1, Math.round(score||0)))
  return (
    <div style={{display:'flex', gap:2}}>
      {[1,2,3,4,5].map(i=>(
        <svg key={i} width="11" height="11" viewBox="0 0 24 24"
          fill={i<=stars?'#22c55e':'none'} stroke={i<=stars?'#22c55e':'#374d3c'} strokeWidth="2">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
      ))}
    </div>
  )
}

const CAT_EMOJI  = { noturno:'🌙', transito:'🚦', estabelecimento:'☕', parque:'🌿', comercio:'🏪', show:'🎭', bar:'🍺' }
const EVENT_EMOJI = { cheio:'🔥', evento:'🎉', morto:'💤', pesado:'🚗', bloqueio:'🚧', acidente:'⚠️', blitz:'🚔' }

export default function UserProfilePanel({ open, targetUid, currentUser, onClose }) {
  const [profile,      setProfile]      = useState(null)
  const [reviews,      setReviews]      = useState([])
  const [userEvents,   setUserEvents]   = useState([])
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing,  setIsFollowing]  = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [tab,          setTab]          = useState('atividade')
  const [toggling,     setToggling]     = useState(false)

  const isOwnProfile = currentUser?.uid === targetUid

  // Load profile data when panel opens
  useEffect(() => {
    if (!open || !targetUid) return
    setLoading(true)
    setTab('atividade')

    const loads = [
      // User profile
      get(ref(db, `users/${targetUid}`)).then(s => {
        if (s.exists()) setProfile({ uid: targetUid, ...s.val() })
      }),
      // Followers count
      get(ref(db, `followers/${targetUid}`)).then(s => {
        setFollowersCount(s.exists() ? Object.keys(s.val()).length : 0)
      }),
      // Following count
      get(ref(db, `users/${targetUid}/following`)).then(s => {
        setFollowingCount(s.exists() ? Object.keys(s.val()).length : 0)
      }),
      // Is current user following this user?
      currentUser?.uid && targetUid !== currentUser.uid
        ? get(ref(db, `followers/${targetUid}/${currentUser.uid}`)).then(s => setIsFollowing(s.exists()))
        : Promise.resolve(),
    ]

    // Load events by this user
    get(ref(db, 'events')).then(s => {
      if (!s.exists()) return setUserEvents([])
      const all = Object.entries(s.val()).map(([id,v])=>({id,...v}))
      setUserEvents(all.filter(e=>e.userId===targetUid).sort((a,b)=>b.ts-a.ts).slice(0,20))
    })

    // Load reviews by this user (scan all review nodes — lightweight for now)
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
      setFollowersCount(c => Math.max(0, c - 1))
      setIsFollowing(false)
    } else {
      await set(followerRef, { followedAt: Date.now(), name: currentUser.name, photo: currentUser.photo||null })
      await set(followingRef, { followedAt: Date.now(), name: profile?.name||'', photo: profile?.photo||null })
      setFollowersCount(c => c + 1)
      setIsFollowing(true)
    }
    setToggling(false)
  }, [currentUser, targetUid, isFollowing, toggling, profile, isOwnProfile])

  if (!open) return null

  const badge = profile?.score >= 5000 ? '🏆 Lendário'
    : profile?.score >= 2000 ? '🥇 Expert Urbano'
    : profile?.score >= 1000 ? '🥈 Explorador Urbano'
    : profile?.score >= 300  ? '🥉 Urbano Iniciante'
    : '🌱 Novato'

  const TABS = [
    { id:'atividade', label:'Atividade' },
    { id:'avaliacoes', label:'Avaliações' },
  ]

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:3500,
        background:'rgba(0,0,0,.8)', backdropFilter:'blur(6px)',
        animation:'fadeIn .2s ease',
      }}/>

      {/* Panel */}
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:3600,
        background:'var(--bg)', borderRadius:'24px 24px 0 0',
        maxHeight:'92vh', overflowY:'auto',
        animation:'slideUp .3s cubic-bezier(.4,0,.2,1)',
      }}>
        <div style={{width:40,height:4,background:'var(--border)',borderRadius:2,margin:'12px auto 0'}}/>

        {loading ? (
          <div style={{textAlign:'center', padding:'60px 0', color:'var(--muted)'}}>
            <div style={{fontSize:32, marginBottom:12, animation:'spin 1s linear infinite', display:'inline-block'}}>⏳</div>
            <div style={{fontSize:13}}>Carregando perfil...</div>
          </div>
        ) : !profile ? (
          <div style={{textAlign:'center', padding:'60px 0', color:'var(--muted)'}}>
            <div style={{fontSize:40, marginBottom:12}}>👤</div>
            <div style={{fontSize:14, fontWeight:700}}>Perfil não encontrado</div>
          </div>
        ) : (
          <>
            {/* ── Header com capa ── */}
            <div style={{
              height:120, background:'linear-gradient(135deg, #0f2414, #1a3a20)',
              position:'relative', margin:'0 0 0 0',
            }}>
              {/* Botão fechar */}
              <button onClick={onClose} style={{
                position:'absolute', top:12, right:12,
                width:32, height:32, borderRadius:'50%',
                background:'rgba(0,0,0,.5)', border:'none',
                color:'#fff', cursor:'pointer', fontSize:14,
                display:'flex', alignItems:'center', justifyContent:'center',
                backdropFilter:'blur(8px)',
              }}>✕</button>

              {/* Avatar — sobreposto à capa */}
              <div style={{
                position:'absolute', bottom:-36, left:20,
                width:72, height:72, borderRadius:'50%',
                border:'3px solid var(--bg)',
                background:'var(--surface2)',
                overflow:'hidden',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:28, boxShadow:'0 4px 16px rgba(0,0,0,.5)',
              }}>
                {profile.photo
                  ? <img src={profile.photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  : '👤'}
              </div>

              {/* Badge */}
              <div style={{
                position:'absolute', bottom:-16, right:16,
                background:'rgba(34,197,94,.15)', border:'1px solid rgba(34,197,94,.3)',
                borderRadius:100, padding:'4px 12px',
                fontSize:11, color:'var(--green)', fontWeight:700,
              }}>{badge}</div>
            </div>

            {/* ── Info ── */}
            <div style={{padding:'48px 20px 0'}}>
              <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12}}>
                <div>
                  <div style={{fontSize:20, fontWeight:800, marginBottom:2}}>{profile.name||'Urbano'}</div>
                  <div style={{fontSize:12, color:'var(--muted)'}}>
                    @{(profile.name||'user').toLowerCase().replace(/\s+/g,'')}
                  </div>
                </div>

                {/* Botão Seguir / Seguindo / Editar */}
                {!isOwnProfile && (
                  <button onClick={handleToggleFollow} disabled={toggling} style={{
                    padding:'9px 20px', borderRadius:100, border:'none',
                    background: isFollowing ? 'var(--surface2)' : 'var(--green)',
                    color: isFollowing ? 'var(--muted)' : '#052e16',
                    fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:12,
                    cursor:'pointer', transition:'all .2s', flexShrink:0,
                    border: isFollowing ? '1px solid var(--border)' : 'none',
                  }}>
                    {toggling ? '...' : isFollowing ? '✓ Seguindo' : '+ Seguir'}
                  </button>
                )}
              </div>

              {/* Bio */}
              {profile.bio && (
                <div style={{
                  fontSize:13, color:'var(--text2)', lineHeight:1.7,
                  marginBottom:14, padding:'10px 14px',
                  background:'var(--surface2)', borderRadius:12,
                  border:'1px solid var(--border)',
                }}>{profile.bio}</div>
              )}

              {/* Stats */}
              <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16}}>
                {[
                  {val: profile.score||0, label:'Pontos', mono:true},
                  {val: reviews.length,   label:'Avaliações'},
                  {val: followingCount,   label:'Seguindo'},
                  {val: followersCount,   label:'Seguidores'},
                ].map((s,i)=>(
                  <div key={i} style={{
                    background:'var(--surface2)', border:'1px solid var(--border)',
                    borderRadius:12, padding:'12px 6px', textAlign:'center',
                  }}>
                    <div style={{
                      fontFamily: s.mono ? "'Space Mono',monospace" : 'inherit',
                      fontSize: s.val > 9999 ? 14 : 18,
                      fontWeight:800, color:'var(--green)', marginBottom:3,
                    }}>{s.val.toLocaleString('pt-BR')}</div>
                    <div style={{fontSize:9, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em'}}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div style={{display:'flex', borderBottom:'1px solid var(--border)', marginBottom:16}}>
                {TABS.map(t=>(
                  <button key={t.id} onClick={()=>setTab(t.id)} style={{
                    flex:1, padding:'11px 0',
                    background:'none', border:'none',
                    borderBottom:`2px solid ${tab===t.id?'var(--green)':'transparent'}`,
                    color:tab===t.id?'var(--green)':'var(--muted)',
                    fontSize:12, fontWeight:tab===t.id?700:500,
                    cursor:'pointer', fontFamily:"'Inter',sans-serif", transition:'all .2s',
                  }}>{t.label}</button>
                ))}
              </div>

              {/* ── Tab: Atividade ── */}
              {tab==='atividade' && (
                <div style={{paddingBottom:32}}>
                  {userEvents.length===0 ? (
                    <div style={{textAlign:'center', padding:'32px 0', color:'var(--muted)'}}>
                      <div style={{fontSize:32, marginBottom:8}}>📭</div>
                      <div style={{fontSize:13}}>Nenhuma atividade ainda</div>
                    </div>
                  ) : userEvents.map(ev=>(
                    <div key={ev.id} style={{
                      display:'flex', alignItems:'center', gap:12,
                      padding:'12px 0', borderBottom:'1px solid var(--border)',
                    }}>
                      <div style={{
                        width:42, height:42, borderRadius:'50%', flexShrink:0,
                        background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.2)',
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:20,
                      }}>
                        {EVENT_EMOJI[ev.type] || '📍'}
                      </div>
                      <div style={{flex:1, minWidth:0}}>
                        <div style={{fontSize:13, fontWeight:700, marginBottom:2, textTransform:'capitalize'}}>{ev.type}</div>
                        <div style={{fontSize:11, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                          {ev.locationName || 'Local'}
                        </div>
                      </div>
                      <div style={{fontSize:10, color:'var(--dim)', flexShrink:0}}>{timeAgo(ev.ts)}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Tab: Avaliações ── */}
              {tab==='avaliacoes' && (
                <div style={{paddingBottom:32}}>
                  {reviews.length===0 ? (
                    <div style={{textAlign:'center', padding:'32px 0', color:'var(--muted)'}}>
                      <div style={{fontSize:32, marginBottom:8}}>⭐</div>
                      <div style={{fontSize:13}}>Nenhuma avaliação ainda</div>
                    </div>
                  ) : reviews.map(r=>(
                    <div key={r.id} style={{
                      background:'var(--surface2)', border:'1px solid var(--border)',
                      borderRadius:14, padding:'14px', marginBottom:10,
                    }}>
                      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6}}>
                        <div style={{fontSize:13, fontWeight:700, color:'var(--text)'}}>
                          {CAT_EMOJI[r.locationCat]||'📍'} {r.locationName||'Local'}
                        </div>
                        <div style={{display:'flex', alignItems:'center', gap:6}}>
                          <StarBar score={r.stars}/>
                          <span style={{fontFamily:"'Space Mono',monospace", fontSize:11, color:'var(--green)', fontWeight:700}}>{r.stars}.0</span>
                        </div>
                      </div>
                      {r.text && (
                        <div style={{fontSize:12, color:'var(--muted)', lineHeight:1.6}}>{r.text}</div>
                      )}
                      <div style={{fontSize:10, color:'var(--dim)', marginTop:6}}>{timeAgo(r.ts)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{transform:translateY(60px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes spin    { to{transform:rotate(360deg)} }
      `}</style>
    </>
  )
}
