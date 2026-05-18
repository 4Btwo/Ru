import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ref, get, set, remove, increment, update } from 'firebase/database'
import { db } from '../lib/firebase'

const timeAgo=ts=>{const d=Math.floor((Date.now()-ts)/1000);if(d<60)return `${d}s`;if(d<3600)return `${Math.floor(d/60)}min`;if(d<86400)return `${Math.floor(d/3600)}h`;return `${Math.floor(d/86400)}d`}
const CAT_EMOJI={noturno:'🌙',transito:'🚦',estabelecimento:'☕',parque:'🌿',comercio:'🏪',show:'🎭',bar:'🍺'}
const EV_META={cheio:{emoji:'🔥',label:'Cheio',color:'#ff4757'},evento:{emoji:'🎉',label:'Evento',color:'#7c5cfc'},morto:{emoji:'💤',label:'Vazio',color:'#6b7280'},pesado:{emoji:'🚗',label:'Trânsito',color:'#ff6b35'},bloqueio:{emoji:'🚧',label:'Bloqueio',color:'#ffa502'},acidente:{emoji:'⚠️',label:'Acidente',color:'#ff4757'},blitz:{emoji:'🚔',label:'Blitz',color:'#4f8eff'},agitado:{emoji:'⚡',label:'Agitado',color:'#00f5a0'}}
const TIER=s=>s>=60000?{l:'Lendário',i:'🌟',bg:'rgba(255,211,42,.14)',b:'rgba(255,211,42,.4)',c:'#ffd32a'}:s>=30000?{l:'Influencer',i:'👑',bg:'rgba(124,92,252,.14)',b:'rgba(124,92,252,.4)',c:'#7c5cfc'}:s>=15000?{l:'Local',i:'💙',bg:'rgba(79,142,255,.14)',b:'rgba(79,142,255,.4)',c:'#4f8eff'}:s>=5000?{l:'Urbano',i:'⚡',bg:'rgba(0,245,160,.12)',b:'rgba(0,245,160,.35)',c:'#00f5a0'}:{l:'Explorer',i:'🗺️',bg:'rgba(148,163,184,.1)',b:'rgba(148,163,184,.25)',c:'#94a3b8'}
const T={muted:'rgba(240,240,255,0.38)',text:'#f0f0ff',dim:'rgba(240,240,255,0.16)',border:'rgba(255,255,255,0.07)',surface:'rgba(255,255,255,0.04)'}

function Stars({score}){const s=Math.min(5,Math.max(1,Math.round(score||0)));return <div style={{display:'flex',gap:3}}>{[1,2,3,4,5].map(i=><svg key={i} width="13" height="13" viewBox="0 0 24 24" fill={i<=s?'#4f8eff':'none'} stroke={i<=s?'#4f8eff':'rgba(255,255,255,0.15)'} strokeWidth="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>)}</div>}

export default function UserProfilePanel({open,targetUid,currentUser,onClose,onOpenChat}) {
  const [profile,     setProfile]    = useState(null)
  const [reviews,     setReviews]    = useState([])
  const [evts,        setEvts]       = useState([])
  const [followers,   setFollowers]  = useState(0)
  const [following,   setFollowing]  = useState(0)
  const [isFollowing, setIsFollow]   = useState(false)
  const [isPending,   setIsPending]  = useState(false)
  const [loading,     setLoading]    = useState(true)
  const [tab,         setTab]        = useState('atividade')
  const [toggling,    setToggling]   = useState(false)
  const scrollRef = useRef(null)
  const isOwn = currentUser?.uid===targetUid

  useEffect(()=>{
    if(!open||!targetUid) return
    setLoading(true);setTab('atividade');setProfile(null)
    if(scrollRef.current) scrollRef.current.scrollTop=0
    Promise.all([
      get(ref(db,`users/${targetUid}`)).then(s=>{if(s.exists())setProfile({uid:targetUid,...s.val()})}),
      get(ref(db,`followers/${targetUid}`)).then(s=>setFollowers(s.exists()?Object.keys(s.val()).length:0)),
      get(ref(db,`users/${targetUid}/following`)).then(s=>setFollowing(s.exists()?Object.keys(s.val()).length:0)),
      currentUser?.uid&&targetUid!==currentUser.uid?get(ref(db,`followers/${targetUid}/${currentUser.uid}`)).then(s=>setIsFollow(s.exists())):Promise.resolve(),
      currentUser?.uid&&targetUid!==currentUser.uid?get(ref(db,`followRequests/${targetUid}/${currentUser.uid}`)).then(s=>setIsPending(s.exists())):Promise.resolve(),
    ]).finally(()=>setLoading(false))
    get(ref(db,'events')).then(s=>{if(!s.exists())return setEvts([]);const all=Object.entries(s.val()).map(([id,v])=>({id,...v}));setEvts(all.filter(e=>e.userId===targetUid).sort((a,b)=>b.ts-a.ts).slice(0,30))})
    get(ref(db,'reviews')).then(s=>{if(!s.exists())return setReviews([]);const all=[];s.forEach(loc=>loc.forEach(r=>{const v=r.val();if(v.userId===targetUid)all.push({id:r.key,locationId:loc.key,...v})}));setReviews(all.sort((a,b)=>b.ts-a.ts).slice(0,20))})
  },[open,targetUid,currentUser?.uid])

  const handleFollow = useCallback(async()=>{
    if(!currentUser?.uid||!targetUid||toggling||isOwn) return
    setToggling(true)
    const fRef=ref(db,`followers/${targetUid}/${currentUser.uid}`)
    const gRef=ref(db,`users/${currentUser.uid}/following/${targetUid}`)
    if(isFollowing){
      await remove(fRef);await remove(gRef)
      await update(ref(db,`users/${targetUid}`),{followers:increment(-1)})
      setFollowers(c=>Math.max(0,c-1));setIsFollow(false)
    } else if(isPending){
      await remove(ref(db,`followRequests/${targetUid}/${currentUser.uid}`))
      const nSnap=await get(ref(db,`notifications/${targetUid}`))
      if(nSnap.exists())nSnap.forEach(c=>{const v=c.val();if(v.type==='follow_request'&&v.fromUid===currentUser.uid)remove(ref(db,`notifications/${targetUid}/${c.key}`))})
      setIsPending(false)
    } else {
      const privSnap=await get(ref(db,`users/${targetUid}/privacy/publicProfile`))
      const isPrivate=privSnap.exists()?!privSnap.val():false
      if(isPrivate){
        await set(ref(db,`followRequests/${targetUid}/${currentUser.uid}`),{name:currentUser.name,photo:currentUser.photo||null,ts:Date.now()})
        await set(ref(db,`notifications/${targetUid}/${Date.now()}_req`),{type:'follow_request',title:`${currentUser.name} quer te seguir`,body:'Toque para aceitar ou recusar',fromUid:currentUser.uid,fromName:currentUser.name,fromPhoto:currentUser.photo||null,ts:Date.now(),read:false})
        setIsPending(true)
      } else {
        await set(fRef,{followedAt:Date.now(),name:currentUser.name,photo:currentUser.photo||null})
        await set(gRef,{followedAt:Date.now(),name:profile?.name||'',photo:profile?.photo||null})
        await update(ref(db,`users/${targetUid}`),{followers:increment(1)})
        await set(ref(db,`notifications/${targetUid}/${Date.now()}_flw`),{type:'new_follower',title:`${currentUser.name} começou a te seguir`,body:'Toque para ver o perfil',fromUid:currentUser.uid,fromName:currentUser.name,fromPhoto:currentUser.photo||null,ts:Date.now(),read:false})
        setFollowers(c=>c+1);setIsFollow(true)
      }
    }
    setToggling(false)
  },[currentUser,targetUid,isFollowing,isPending,toggling,profile,isOwn])

  if(!open) return null
  const tier=TIER(profile?.score||0)

  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:3500,background:'rgba(0,0,0,.86)',backdropFilter:'blur(10px)',animation:'ppFadeIn .25s ease'}}/>
      <div ref={scrollRef} style={{position:'fixed',bottom:0,left:0,right:0,zIndex:3600,background:'rgba(8,8,20,0.98)',backdropFilter:'blur(40px)',WebkitBackdropFilter:'blur(40px)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'28px 28px 0 0',maxHeight:'94vh',overflowY:'auto',overflowX:'hidden',animation:'ppSlideUp .32s cubic-bezier(.22,1,.36,1)',scrollbarWidth:'none'}}>

        {/* Cover */}
        <div style={{position:'relative',height:200,background:profile?.coverUrl?'none':'linear-gradient(135deg,#06060e 0%,#0e0e22 40%,#12122a 100%)',overflow:'hidden',flexShrink:0}}>
          {profile?.coverUrl&&<img src={profile.coverUrl} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>}
          <div style={{position:'absolute',inset:0,background:profile?.coverUrl?'linear-gradient(to bottom,rgba(0,0,0,.1) 0%,transparent 40%,rgba(8,8,20,.85) 80%,rgba(8,8,20,1) 100%)':'linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.3) 60%,rgba(8,8,20,1) 100%)'}}/>
          {!profile?.coverUrl&&<div style={{position:'absolute',inset:0,opacity:.04,backgroundImage:'radial-gradient(circle,#4f8eff 1px,transparent 1px)',backgroundSize:'28px 28px'}}/>}
          {!profile?.coverUrl&&<div style={{position:'absolute',top:-40,right:-40,width:240,height:240,borderRadius:'50%',background:'radial-gradient(circle,rgba(79,142,255,0.07) 0%,transparent 70%)'}}/>}
          <div style={{position:'absolute',top:12,left:'50%',transform:'translateX(-50%)',width:40,height:4,background:'rgba(255,255,255,.18)',borderRadius:2}}/>
          <button onClick={onClose} style={{position:'absolute',top:14,right:14,width:34,height:34,borderRadius:'50%',background:'rgba(0,0,0,.55)',border:'1px solid rgba(255,255,255,.12)',color:'#fff',cursor:'pointer',fontSize:13,backdropFilter:'blur(12px)',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          {isOwn&&<label style={{position:'absolute',top:14,right:56,width:34,height:34,borderRadius:'50%',background:'rgba(0,0,0,.55)',border:'1px solid rgba(255,255,255,.12)',color:'#fff',cursor:'pointer',backdropFilter:'blur(12px)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>📷<input type="file" accept="image/*" style={{display:'none'}} onChange={async e=>{const file=e.target.files?.[0];if(!file)return;try{const{uploadToCloudinary}=await import('../lib/cloudinary');const url=await uploadToCloudinary(file);const{ref:fbRef,update:fbUpdate}=await import('firebase/database');await fbUpdate(fbRef(db,`users/${targetUid}`),{coverUrl:url});setProfile(p=>({...p,coverUrl:url}))}catch(e){console.error(e)}}}/></label>}
        </div>

        {/* Content */}
        <div style={{position:'relative',padding:'0 20px',marginTop:-60}}>
          {/* Avatar */}
          <div style={{position:'relative',display:'inline-block',marginBottom:12}}>
            <div style={{width:90,height:90,borderRadius:'50%',background:T.surface,border:'3px solid rgba(8,8,20,1)',boxShadow:`0 0 0 2px ${tier.c}55,0 8px 32px rgba(0,0,0,.6)`,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontSize:36}}>
              {profile?.photo?<img src={profile.photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:'👤'}
            </div>
            <div style={{position:'absolute',bottom:4,right:4,width:16,height:16,borderRadius:'50%',background:'#00f5a0',border:'2.5px solid rgba(8,8,20,1)',boxShadow:'0 0 8px rgba(0,245,160,.6)'}}/>
          </div>

          {loading?(
            <div style={{paddingTop:20}}>{[140,90,200,60].map((w,i)=><div key={i} style={{height:i===0?22:i===1?14:i===2?12:30,width:w,borderRadius:6,background:'rgba(255,255,255,0.06)',marginBottom:12,animation:'ppPulse 1.4s ease infinite',animationDelay:`${i*.15}s`}}/>)}</div>
          ):!profile?(
            <div style={{textAlign:'center',padding:'40px 0',color:T.muted}}><div style={{fontSize:40,marginBottom:12}}>👤</div><div style={{fontSize:14,fontWeight:700,color:'rgba(240,240,255,0.5)'}}>Perfil não encontrado</div></div>
          ):(
            <>
              {/* Name + actions */}
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:6}}>
                <div style={{minWidth:0}}>
                  <div style={{fontFamily:"'Outfit',sans-serif",fontSize:24,fontWeight:900,lineHeight:1.1,letterSpacing:'-.03em',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:T.text}}>{profile.name||'Urbano'}</div>
                  <div style={{fontSize:13,color:T.muted,marginTop:3}}>@{(profile.name||'user').toLowerCase().replace(/\s+/g,'')}</div>
                </div>
                {!isOwn&&<div style={{display:'flex',gap:8,flexShrink:0,paddingTop:4}}>
                  {onOpenChat&&<button onClick={()=>{onOpenChat(targetUid,profile.name,profile.photo||null);onClose()}} style={{width:38,height:38,borderRadius:'50%',background:T.surface,border:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:16}}>💬</button>}
                  <button onClick={handleFollow} disabled={toggling} style={{padding:'0 18px',height:38,borderRadius:999,background:isFollowing?T.surface:isPending?'rgba(255,211,42,.1)':'linear-gradient(135deg,#4f8eff,#7c5cfc)',color:isFollowing?T.muted:isPending?'#ffd32a':'#fff',fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:12,cursor:toggling?'wait':'pointer',border:`1px solid ${isFollowing?T.border:isPending?'rgba(255,211,42,.35)':'transparent'}`,boxShadow:!isFollowing&&!isPending?'0 4px 16px rgba(79,142,255,.35)':'none',transition:'all .2s',whiteSpace:'nowrap'}}>
                    {toggling?'···':isFollowing?'✓ Seguindo':isPending?'⏳ Solicitado':'＋ Seguir'}
                  </button>
                </div>}
              </div>

              {/* Tier badge */}
              <div style={{marginBottom:14}}><div style={{display:'inline-flex',alignItems:'center',gap:6,background:tier.bg,border:`1px solid ${tier.b}`,borderRadius:999,padding:'5px 12px',fontSize:11,color:tier.c,fontWeight:700}}><span>{tier.i}</span>{tier.l}</div></div>

              {profile.bio&&<div style={{fontSize:13,color:'rgba(240,240,255,0.7)',lineHeight:1.75,marginBottom:20,padding:'12px 16px',background:T.surface,borderLeft:`3px solid ${tier.c}55`,borderRadius:'0 12px 12px 0'}}>{profile.bio}</div>}

              {/* Stats */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:24}}>
                {[{v:profile.score||0,l:'Pontos',i:'⚡',c:tier.c},{v:evts.length,l:'Reportes',i:'📡',c:'#4f8eff'},{v:following,l:'Seguindo',i:'👣',c:'#7c5cfc'},{v:followers,l:'Seguidores',i:'🫂',c:'#00f5a0'}].map((s,i)=>(
                  <div key={i} style={{background:T.surface,border:T.border,borderRadius:16,padding:'14px 6px',textAlign:'center',position:'relative',overflow:'hidden',animation:'ppStatIn .4s ease both',animationDelay:`${i*.07}s`,border:`1px solid ${T.border}`}}>
                    <div style={{position:'absolute',inset:0,background:`radial-gradient(circle at 50% 0%,${s.c}18 0%,transparent 70%)`}}/>
                    <div style={{position:'relative'}}>
                      <div style={{fontSize:16,marginBottom:5}}>{s.i}</div>
                      <div style={{fontFamily:"'Space Mono',monospace",fontSize:s.v>9999?13:18,fontWeight:700,color:s.c,lineHeight:1,marginBottom:5}}>{s.v.toLocaleString('pt-BR')}</div>
                      <div style={{fontSize:9,color:T.muted,textTransform:'uppercase',letterSpacing:'.07em',fontWeight:700}}>{s.l}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,0.07)',marginLeft:-20,marginRight:-20,paddingLeft:20}}>
                {[{id:'atividade',l:'Atividade',n:evts.length},{id:'avaliacoes',l:'Avaliações',n:reviews.length}].map(t=>(
                  <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'12px 20px 12px 0',background:'none',border:'none',borderBottom:`2.5px solid ${tab===t.id?tier.c:'transparent'}`,color:tab===t.id?tier.c:T.muted,fontSize:13,fontWeight:tab===t.id?700:500,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",transition:'all .2s',display:'flex',alignItems:'center',gap:6}}>
                    {t.l}{t.n>0&&<span style={{background:tab===t.id?`${tier.c}22`:T.surface,color:tab===t.id?tier.c:T.dim,borderRadius:999,padding:'1px 7px',fontSize:10,fontWeight:700,border:`1px solid ${T.border}`}}>{t.n}</span>}
                  </button>
                ))}
              </div>

              {tab==='atividade'&&<div style={{paddingBottom:56,paddingTop:4}}>
                {evts.length===0?<div style={{textAlign:'center',padding:'52px 0',color:T.muted}}><div style={{fontSize:40,marginBottom:12}}>📭</div><div style={{fontSize:14,fontWeight:700,marginBottom:4,color:'rgba(240,240,255,0.5)'}}>Sem atividade</div><div style={{fontSize:12}}>Ainda sem reportes</div></div>
                :evts.map((ev,i)=>{const m=EV_META[ev.type]||{emoji:'📍',label:ev.type||'Reporte',color:'#4f8eff'};return(
                  <div key={ev.id} style={{display:'flex',alignItems:'center',gap:13,padding:'13px 0',borderBottom:'1px solid rgba(255,255,255,0.05)',animation:'ppFadeIn .3s ease both',animationDelay:`${i*.04}s`}}>
                    <div style={{width:44,height:44,borderRadius:13,flexShrink:0,background:`${m.color}14`,border:`1px solid ${m.color}28`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>{m.emoji}</div>
                    <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,marginBottom:2,color:m.color}}>{m.label}</div><div style={{fontSize:12,color:T.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>📍 {ev.locationName||'Local desconhecido'}</div></div>
                    <div style={{fontSize:10,color:T.dim,flexShrink:0,background:T.surface,borderRadius:999,padding:'3px 8px',border:`1px solid ${T.border}`,fontFamily:"'Space Mono',monospace"}}>{timeAgo(ev.ts)}</div>
                  </div>
                )})}
              </div>}

              {tab==='avaliacoes'&&<div style={{paddingBottom:56,paddingTop:12}}>
                {reviews.length===0?<div style={{textAlign:'center',padding:'52px 0',color:T.muted}}><div style={{fontSize:40,marginBottom:12}}>⭐</div><div style={{fontSize:14,fontWeight:700,marginBottom:4,color:'rgba(240,240,255,0.5)'}}>Sem avaliações</div><div style={{fontSize:12}}>Ainda não avaliou nenhum local</div></div>
                :reviews.map((r,i)=>(
                  <div key={r.id} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,padding:'16px',marginBottom:12,animation:'ppFadeIn .3s ease both',animationDelay:`${i*.05}s`}}>
                    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:38,height:38,borderRadius:11,flexShrink:0,background:'rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{CAT_EMOJI[r.locationCat]||'📍'}</div>
                        <div><div style={{fontSize:13,fontWeight:700,color:T.text}}>{r.locationName||'Local'}</div><div style={{fontSize:10,color:T.dim,marginTop:1,fontFamily:"'Space Mono',monospace"}}>{timeAgo(r.ts)}</div></div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}><Stars score={r.stars}/><span style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:'#4f8eff',fontWeight:800}}>{r.stars}.0</span></div>
                    </div>
                    {r.text&&<div style={{fontSize:13,color:T.muted,lineHeight:1.7,padding:'10px 12px',background:'rgba(255,255,255,0.02)',borderRadius:10,marginTop:4,fontStyle:'italic'}}>"{r.text}"</div>}
                  </div>
                ))}
              </div>}
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes ppFadeIn{from{opacity:0}to{opacity:1}}@keyframes ppSlideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes ppStatIn{from{opacity:0;transform:translateY(12px) scale(.94)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes ppPulse{0%,100%{opacity:.35}50%{opacity:.7}}`}</style>
    </>
  )
}
