import React, { useState, useEffect, useCallback } from 'react'
import { ref, push, onValue, query, orderByChild, limitToLast } from 'firebase/database'
import { db } from '../lib/firebase'
import { EVENT_META } from '../lib/constants'
import { getLocationStatus, getActiveEvents, timeAgo } from '../lib/hotspot'
import { shareWithImage } from '../lib/shareImage'
import { useOwner }   from '../hooks/useOwner'
import { useGoingTo } from '../hooks/useGoingTo'
import { useHistory } from '../hooks/useHistory'
import { useChat }    from '../hooks/useChat'
import OwnerPanel from './OwnerPanel'
import ChatPanel  from './ChatPanel'

const CAT_LABEL = {noturno:'Noturno',transito:'Trânsito',estabelecimento:'Estabelecimento',parque:'Parque',comercio:'Comércio',show:'Show',bar:'Bar'}
const CAT_EMOJI = {noturno:'🌙',transito:'🚦',estabelecimento:'☕',parque:'🌿',comercio:'🏪',show:'🎭',bar:'🍺'}
const T = { muted:'rgba(240,240,255,0.38)', text:'#f0f0ff', dim:'rgba(240,240,255,0.16)', border:'rgba(255,255,255,0.07)', surface:'rgba(255,255,255,0.04)' }

function StarBar({score}) {
  const s = Math.min(5,Math.max(1,Math.round(score)))
  return (
    <div style={{display:'flex',gap:3}}>
      {[1,2,3,4,5].map(i=>(
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i<=s?'#4f8eff':'none'} stroke={i<=s?'#4f8eff':'rgba(255,255,255,0.18)'} strokeWidth="2">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
      ))}
    </div>
  )
}
function InteractiveStar({value,onChange}) {
  return (
    <div style={{display:'flex',gap:8}}>
      {[1,2,3,4,5].map(i=>(
        <svg key={i} onClick={()=>onChange(i)} width="30" height="30" viewBox="0 0 24 24"
          fill={i<=value?'#4f8eff':'none'} stroke={i<=value?'#4f8eff':'rgba(255,255,255,0.2)'}
          strokeWidth="2" style={{cursor:'pointer',transition:'transform .1s'}}
          onMouseEnter={e=>e.currentTarget.style.transform='scale(1.2)'}
          onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
      ))}
    </div>
  )
}
function HistBar({pct,color,highlight}) {
  return (
    <div style={{flex:1}}>
      <div style={{width:'100%',height:38,background:'rgba(255,255,255,0.04)',borderRadius:7,display:'flex',alignItems:'flex-end',overflow:'hidden',border:highlight?`1px solid ${color}66`:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{width:'100%',borderRadius:'5px 5px 0 0',height:`${Math.max(pct,4)}%`,background:highlight?color:`${color}44`,transition:'height .4s ease'}}/>
      </div>
    </div>
  )
}
function useReviews(locationId) {
  const [reviews,setReviews] = useState([])
  useEffect(()=>{
    if (!locationId) return
    const q = query(ref(db,`reviews/${locationId}`),orderByChild('ts'),limitToLast(50))
    return onValue(q,snap=>{const d=snap.val();if(!d)return setReviews([]);setReviews(Object.entries(d).map(([id,v])=>({id,...v})).sort((a,b)=>b.ts-a.ts))})
  },[locationId])
  const addReview = useCallback(async({userId,userName,userPhoto,stars,text})=>{if(!locationId)return;await push(ref(db,`reviews/${locationId}`),{userId,userName,userPhoto,stars,text:text?.trim()||null,ts:Date.now()})},[locationId])
  return {reviews,addReview}
}

const InfoRow = ({icon,label,val}) => (
  <div style={{display:'flex',alignItems:'center',gap:12,background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:'12px 14px'}}>
    <div style={{width:38,height:38,borderRadius:12,background:'rgba(79,142,255,0.1)',border:'1px solid rgba(79,142,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,flexShrink:0}}>{icon}</div>
    <div><div style={{fontSize:10,color:T.muted,marginBottom:2,textTransform:'uppercase',letterSpacing:'.08em',fontWeight:700}}>{label}</div><div style={{fontSize:13,fontWeight:600,color:T.text}}>{val}</div></div>
  </div>
)

export default function DetailPanel({location,events,usersMap,user,onClose,onReport,onSave,saved}) {
  const [sharing,   setSharing]   = useState(false)
  const [ownerOpen, setOwnerOpen] = useState(false)
  const [chatOpen,  setChatOpen]  = useState(false)
  const [histTab,   setHistTab]   = useState('day')
  const [tab,       setTab]       = useState('sobre')
  const [revStars,  setRevStars]  = useState(0)
  const [revText,   setRevText]   = useState('')
  const [submitting,setSubmitting]= useState(false)
  const [submitted, setSubmitted] = useState(false)

  const {isOwner}                         = useOwner(location?.id,user?.uid)
  const {goingList,isGoing,toggleGoing}   = useGoingTo(location?.id,user?.uid)
  const {history}                         = useHistory(location?.id)
  const {reviews,addReview}               = useReviews(location?.id)
  const {messages}                        = useChat(location?.id,user?.uid)

  const open = !!location
  if (!location) return null

  const status     = getLocationStatus(location.id,events,usersMap)
  const actEvts    = getActiveEvents(location.id,events).slice(0,6)
  const occ        = location.occupancy??null
  const goingCount = goingList.length
  const todayIdx   = new Date().getDay()
  const nowSlot    = new Date().getHours()<6?0:new Date().getHours()<12?1:new Date().getHours()<18?2:3
  const HIST_COLOR = location.cat==='transito'?'#ff6b35':'#00f5a0'
  const catEmoji   = CAT_EMOJI[location.cat]||'📍'
  const catLabel   = CAT_LABEL[location.cat]||'Local'
  const chatPhotos = messages.filter(m=>m.imageUrl)
  const avgStars   = reviews.length?(reviews.reduce((s,r)=>s+r.stars,0)/reviews.length).toFixed(1):Math.min(5,Math.max(1,status.score)).toFixed(1)
  const totalReviews = reviews.length+actEvts.length+42
  const myReview   = reviews.find(r=>r.userId===user?.uid)
  const isSaved    = !!(saved&&location&&saved[location.id])

  const handleShare = async()=>{ setSharing(true); try{const r=await shareWithImage(location,status.score,actEvts);if(r==='downloaded')alert('Imagem salva!')}finally{setSharing(false)} }
  const handleNav = ()=>{ const url=location.lat&&location.lng?`https://maps.google.com/maps?daddr=${location.lat},${location.lng}`:`https://maps.google.com/maps?q=${encodeURIComponent((location.name||'')+' Bauru SP')}`; window.open(url,'_blank') }
  const handleReview = async()=>{
    if(!revStars)return; setSubmitting(true)
    try{await addReview({userId:user.uid,userName:user.name,userPhoto:user.photo,stars:revStars,text:revText});setSubmitted(true);setRevStars(0);setRevText('');setTimeout(()=>setSubmitted(false),3000)}catch(e){console.error(e)}
    setSubmitting(false)
  }

  const TABS = [{id:'sobre',l:'Sobre'},{id:'avaliacoes',l:'Avaliações'},{id:'fotos',l:'Fotos'},{id:'info',l:'Info'}]

  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:1500,background:'rgba(0,0,0,.78)',backdropFilter:'blur(9px)',WebkitBackdropFilter:'blur(9px)',opacity:open?1:0,pointerEvents:open?'all':'none',transition:'opacity .25s'}}/>
      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:2000,background:'rgba(8,8,20,0.97)',backdropFilter:'blur(40px)',WebkitBackdropFilter:'blur(40px)',border:'1px solid rgba(255,255,255,0.07)',borderBottom:'none',borderRadius:'28px 28px 0 0',maxHeight:'90vh',overflowY:'auto',transform:open?'translateY(0)':'translateY(100%)',transition:'transform .38s cubic-bezier(.32,.72,0,1)'}}>
        
        <div style={{width:36,height:4,background:'rgba(255,255,255,0.15)',borderRadius:2,margin:'14px auto 0'}}/>

        {/* Cover */}
        <div style={{height:190,margin:'14px 16px 0',borderRadius:20,overflow:'hidden',position:'relative',background:'linear-gradient(135deg,rgba(79,142,255,0.15),rgba(124,92,252,0.12))',display:'flex',alignItems:'center',justifyContent:'center'}}>
          {location.coverUrl?<img src={location.coverUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:60,opacity:.6}}>{catEmoji}</span>}
          <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(8,8,20,0.7) 0%,transparent 50%)'}}/>
          <button onClick={onClose} style={{position:'absolute',top:12,right:12,width:34,height:34,borderRadius:'50%',background:'rgba(8,8,20,0.75)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.15)',cursor:'pointer',color:'rgba(240,240,255,0.8)',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          {status.heat!=='inactive'&&<div style={{position:'absolute',bottom:12,left:12,background:status.color,borderRadius:999,padding:'4px 12px',fontSize:11,fontWeight:800,color:'#fff',backdropFilter:'blur(8px)'}}>{status.emoji} {status.label}</div>}
          <div style={{position:'absolute',bottom:12,right:12,background:'rgba(0,245,160,0.15)',border:'1px solid rgba(0,245,160,0.4)',borderRadius:999,padding:'4px 12px',fontSize:11,fontWeight:700,color:'#00f5a0',backdropFilter:'blur(8px)'}}>Aberto</div>
        </div>

        {/* Header */}
        <div style={{padding:'16px 16px 0'}}>
          <div style={{fontSize:11,color:T.muted,marginBottom:5,fontWeight:600,letterSpacing:'.04em'}}>{catLabel} · {location.address||'Bauru, SP'}</div>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
            <div style={{flex:1}}>
              <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:900,marginBottom:7,letterSpacing:'-.03em',color:T.text,lineHeight:1.1}}>{location.name}</h2>
              <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                <StarBar score={parseFloat(avgStars)}/>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:'#4f8eff'}}>{avgStars}</span>
                <span style={{fontSize:12,color:T.muted}}>({totalReviews} avaliações)</span>
                {isOwner(location)&&<span style={{fontSize:14}}>👑</span>}
              </div>
            </div>
          </div>

          {location.schedule&&(
            <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:12}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:'#00f5a0',boxShadow:'0 0 6px rgba(0,245,160,0.6)',flexShrink:0}}/>
              <span style={{fontSize:12,color:'#00f5a0',fontWeight:700}}>Aberto agora</span>
              <span style={{fontSize:12,color:T.muted}}>{location.schedule}</span>
            </div>
          )}

          {occ!==null&&(
            <div style={{background:occ>=90?'rgba(255,71,87,0.08)':occ>=60?'rgba(255,211,42,0.07)':'rgba(0,245,160,0.06)',border:`1px solid ${occ>=90?'rgba(255,71,87,0.28)':occ>=60?'rgba(255,211,42,0.25)':'rgba(0,245,160,0.22)'}`,borderRadius:14,padding:'10px 14px',marginBottom:12,display:'flex',alignItems:'center',gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:700,color:occ>=90?'#ff4757':occ>=60?'#ffd32a':'#00f5a0',marginBottom:5}}>{occ>=90?'🚨 Lotado':'⚡ Quase cheio'} ({occ}%)</div>
                <div style={{background:'rgba(255,255,255,0.08)',borderRadius:999,height:5,overflow:'hidden'}}><div style={{height:'100%',borderRadius:999,width:`${occ}%`,background:occ>=90?'#ff4757':occ>=60?'#ffd32a':'#00f5a0',transition:'width .4s'}}/></div>
              </div>
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:20,fontWeight:700,color:occ>=90?'#ff4757':occ>=60?'#ffd32a':'#00f5a0'}}>{occ}%</span>
            </div>
          )}

          {/* Tabs */}
          <div style={{display:'flex',gap:0,borderBottom:'1px solid rgba(255,255,255,0.07)',marginBottom:16}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:'10px 0',background:'none',border:'none',borderBottom:`2px solid ${tab===t.id?'#4f8eff':'transparent'}`,color:tab===t.id?'#4f8eff':T.muted,fontSize:12,fontWeight:tab===t.id?700:500,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",transition:'all .2s'}}>{t.l}</button>
            ))}
          </div>

          {/* SOBRE */}
          {tab==='sobre'&&(
            <div style={{paddingBottom:4}}>
              <p style={{fontSize:13,color:location.description?T.text:T.muted,lineHeight:1.75,marginBottom:18}}>{location.description||'Um cantinho com experiências incríveis para todos os urbanos da cidade.'}</p>
              <div style={{display:'flex',flexDirection:'column',gap:9,marginBottom:18}}>
                {location.schedule&&<InfoRow icon="🕐" label="Horário" val={location.schedule}/>}
                <InfoRow icon="📍" label="Endereço" val={location.address||'Bauru, SP'}/>
              </div>
              {(location.instagram||location.phone)&&(
                <div style={{display:'flex',gap:8,marginBottom:18,flexWrap:'wrap'}}>
                  {location.instagram&&<a href={`https://instagram.com/${location.instagram.replace('@','')}`} target="_blank" rel="noopener" style={{background:'rgba(124,92,252,0.1)',border:'1px solid rgba(124,92,252,0.3)',borderRadius:999,padding:'7px 14px',fontSize:12,color:'#7c5cfc',textDecoration:'none',fontWeight:700}}>📸 {location.instagram}</a>}
                  {location.phone&&<a href={`https://wa.me/55${location.phone.replace(/\D/g,'')}`} target="_blank" rel="noopener" style={{background:'rgba(0,245,160,0.08)',border:'1px solid rgba(0,245,160,0.25)',borderRadius:999,padding:'7px 14px',fontSize:12,color:'#00f5a0',textDecoration:'none',fontWeight:700}}>💬 WhatsApp</a>}
                </div>
              )}
              {actEvts.length>0&&(
                <div style={{marginBottom:18}}>
                  <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'.1em',color:T.muted,marginBottom:12,fontWeight:700}}>📋 Últimos Reportes</div>
                  {actEvts.map(ev=>{const meta=EVENT_META[ev.type];if(!meta)return null;return(
                    <div key={ev.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                      <div style={{width:36,height:36,borderRadius:10,background:`${meta.color}18`,border:`1px solid ${meta.color}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,flexShrink:0}}>{meta.emoji}</div>
                      <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:meta.color}}>{meta.label}</div>{ev.userName&&<div style={{fontSize:11,color:T.muted,marginTop:1}}>{ev.userName.split(' ')[0]}</div>}</div>
                      <div style={{fontSize:11,color:T.dim}}>{timeAgo(ev.ts)}</div>
                    </div>
                  )})}
                </div>
              )}
              {history&&(
                <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,padding:16,marginBottom:18}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                    <div>
                      <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'.1em',color:T.muted,fontWeight:700}}>📊 Movimento Histórico</div>
                      <div style={{fontSize:12,color:HIST_COLOR,marginTop:3,fontWeight:700}}>Pico: {history.peakLabel}</div>
                    </div>
                    <div style={{display:'flex',gap:5}}>
                      {['day','hour'].map(t=>(
                        <button key={t} onClick={()=>setHistTab(t)} style={{padding:'4px 10px',borderRadius:999,border:'none',cursor:'pointer',background:histTab===t?HIST_COLOR:'rgba(255,255,255,0.06)',color:histTab===t?'#001a0d':'rgba(240,240,255,0.5)',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:10,transition:'all .15s'}}>{t==='day'?'Dia':'Hora'}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:4,alignItems:'flex-end',height:48}}>
                    {(histTab==='day'?history.byDay:history.byHour).map((d,i)=>(
                      <HistBar key={d.label} pct={d.pct} color={HIST_COLOR} highlight={histTab==='day'?i===todayIdx:i===nowSlot}/>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:4,marginTop:6}}>
                    {(histTab==='day'?history.byDay:history.byHour).map((d,i)=>(
                      <div key={d.label} style={{flex:1,textAlign:'center',fontSize:9,color:(histTab==='day'?i===todayIdx:i===nowSlot)?HIST_COLOR:T.dim,fontWeight:(histTab==='day'?i===todayIdx:i===nowSlot)?800:400}}>{d.label}</div>
                    ))}
                  </div>
                  <div style={{fontSize:10,color:T.dim,marginTop:8,textAlign:'right'}}>baseado em {history.total} reportes</div>
                </div>
              )}
            </div>
          )}

          {/* AVALIAÇÕES */}
          {tab==='avaliacoes'&&(
            <div style={{paddingBottom:4}}>
              <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,padding:16,marginBottom:16,display:'flex',alignItems:'center',gap:16}}>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:38,fontWeight:700,color:'#4f8eff',lineHeight:1}}>{avgStars}</div>
                  <StarBar score={parseFloat(avgStars)}/>
                  <div style={{fontSize:11,color:T.muted,marginTop:5}}>{totalReviews} avaliações</div>
                </div>
                <div style={{flex:1}}>
                  {[5,4,3,2,1].map(n=>{
                    const cnt=reviews.filter(r=>r.stars===n).length
                    const pct=reviews.length?Math.round(cnt/reviews.length*100):n===5?60:n===4?25:n===3?10:n===2?3:2
                    return(
                      <div key={n} style={{display:'flex',alignItems:'center',gap:7,marginBottom:5}}>
                        <span style={{fontSize:10,color:T.muted,width:7,fontFamily:"'Space Mono',monospace"}}>{n}</span>
                        <div style={{flex:1,height:5,background:'rgba(255,255,255,0.07)',borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',borderRadius:3,background:'#4f8eff',width:`${pct}%`,transition:'width .5s'}}/></div>
                      </div>
                    )
                  })}
                </div>
              </div>
              {!myReview?(
                <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,padding:16,marginBottom:18}}>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:12,color:T.text,fontFamily:"'DM Sans',sans-serif"}}>✍️ Deixe sua avaliação</div>
                  <div style={{display:'flex',justifyContent:'center',marginBottom:14}}><InteractiveStar value={revStars} onChange={setRevStars}/></div>
                  <textarea value={revText} onChange={e=>setRevText(e.target.value)} placeholder="Conte sua experiência... (opcional)" rows={2} maxLength={300}
                    style={{width:'100%',background:'rgba(255,255,255,0.03)',border:'1.5px solid rgba(255,255,255,0.08)',borderRadius:12,padding:'11px 14px',color:T.text,fontFamily:"'DM Sans',sans-serif",fontSize:13,outline:'none',resize:'none',lineHeight:1.6,boxSizing:'border-box',marginBottom:12,transition:'border-color .2s'}}
                    onFocus={e=>e.target.style.borderColor='rgba(79,142,255,0.5)'}
                    onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
                  <button onClick={handleReview} disabled={!revStars||submitting} style={{width:'100%',padding:'12px',borderRadius:12,border:'none',background:submitted?'rgba(0,245,160,0.15)':revStars?'linear-gradient(135deg,#4f8eff,#7c5cfc)':'rgba(255,255,255,0.05)',color:submitted?'#00f5a0':revStars?'#fff':'rgba(240,240,255,0.22)',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,cursor:revStars?'pointer':'not-allowed',transition:'all .2s',boxShadow:revStars&&!submitted?'0 4px 16px rgba(79,142,255,0.3)':'none'}}>
                    {submitted?'✅ Avaliação enviada!':submitting?'Enviando...':'Enviar avaliação'}
                  </button>
                </div>
              ):(
                <div style={{background:'rgba(0,245,160,0.07)',border:'1px solid rgba(0,245,160,0.22)',borderRadius:14,padding:'11px 14px',marginBottom:16,fontSize:12,color:'#00f5a0',fontWeight:700}}>✅ Você já avaliou este local</div>
              )}
              {reviews.length===0?(
                <div style={{textAlign:'center',padding:'24px 0',color:T.muted,fontSize:12,fontWeight:500}}>Ainda sem avaliações — seja o primeiro!</div>
              ):reviews.slice(0,20).map(r=>(
                <div key={r.id} style={{borderBottom:'1px solid rgba(255,255,255,0.05)',paddingBottom:14,marginBottom:14}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                    <div style={{width:38,height:38,borderRadius:'50%',background:T.surface,border:`1px solid ${T.border}`,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{r.userPhoto?<img src={r.userPhoto} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:'👤'}</div>
                    <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:T.text}}>{r.userName||'Urbano'}</div><div style={{fontSize:11,color:T.muted}}>{timeAgo(r.ts)}</div></div>
                    <StarBar score={r.stars}/>
                  </div>
                  {r.text&&<p style={{fontSize:13,color:'rgba(240,240,255,0.7)',lineHeight:1.65}}>{r.text}</p>}
                </div>
              ))}
            </div>
          )}

          {/* FOTOS */}
          {tab==='fotos'&&(
            <div style={{paddingBottom:4}}>
              {chatPhotos.length===0?(
                <div style={{textAlign:'center',padding:'44px 0',color:T.muted}}>
                  <div style={{fontSize:38,marginBottom:10}}>📷</div>
                  <div style={{fontSize:13,fontWeight:700,marginBottom:4,color:'rgba(240,240,255,0.55)'}}>Nenhuma foto ainda</div>
                  <div style={{fontSize:12,marginBottom:16}}>Seja o primeiro a postar!</div>
                  <button onClick={()=>setChatOpen(true)} style={{background:'linear-gradient(135deg,#4f8eff,#7c5cfc)',border:'none',borderRadius:999,padding:'11px 22px',color:'#fff',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,cursor:'pointer',boxShadow:'0 4px 16px rgba(79,142,255,0.35)'}}>Abrir chat e enviar foto</button>
                </div>
              ):(
                <>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:14}}>
                    {chatPhotos.map((m,i)=>(
                      <div key={m.id||i} style={{aspectRatio:'1',borderRadius:12,overflow:'hidden',background:T.surface,cursor:'pointer'}}>
                        <img src={m.imageUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                      </div>
                    ))}
                  </div>
                  <button onClick={()=>setChatOpen(true)} style={{width:'100%',padding:'12px',borderRadius:14,background:T.surface,border:`1px solid ${T.border}`,color:T.muted,fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:12,cursor:'pointer'}}>💬 Abrir chat para enviar foto</button>
                </>
              )}
            </div>
          )}

          {/* INFO */}
          {tab==='info'&&(
            <div style={{paddingBottom:4,display:'flex',flexDirection:'column',gap:9}}>
              <InfoRow icon="🕐" label="Horário" val={location.schedule||'—'}/>
              <InfoRow icon="📍" label="Endereço" val={location.address||'Bauru, SP'}/>
              <InfoRow icon="📞" label="Telefone" val={location.phone||'—'}/>
              <InfoRow icon="📸" label="Instagram" val={location.instagram||'—'}/>
              <InfoRow icon="🏷️" label="Categoria" val={catLabel}/>
            </div>
          )}
        </div>

        {/* Sticky actions */}
        <div style={{position:'sticky',bottom:0,background:'rgba(8,8,20,0.97)',backdropFilter:'blur(32px)',WebkitBackdropFilter:'blur(32px)',padding:'14px 16px',paddingBottom:'calc(14px + env(safe-area-inset-bottom,0px))',borderTop:'1px solid rgba(255,255,255,0.07)'}}>
          {/* Quick action row */}
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            {[{icon:'💬',label:'Chat',fn:()=>setChatOpen(true)},{icon:'📤',label:'Compart.',fn:handleShare},{icon:'⭐',label:'Avaliar',fn:()=>setTab('avaliacoes')},{icon:'📷',label:'Fotos',fn:()=>setTab('fotos')}].map(a=>(
              <button key={a.label} onClick={a.fn} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4,background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:'10px 4px',cursor:'pointer',color:T.muted,fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:700,transition:'background .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(79,142,255,0.08)';e.currentTarget.style.color='#4f8eff'}}
                onMouseLeave={e=>{e.currentTarget.style.background=T.surface;e.currentTarget.style.color=T.muted}}
              ><span style={{fontSize:18}}>{a.icon}</span>{a.label}</button>
            ))}
          </div>

          {goingCount>0&&(
            <div style={{background:'rgba(79,142,255,0.07)',border:'1px solid rgba(79,142,255,0.22)',borderRadius:12,padding:'9px 14px',marginBottom:12,display:'flex',alignItems:'center',gap:8,fontSize:13}}>
              <span style={{fontSize:18}}>🙋</span>
              <span style={{color:'#4f8eff',fontWeight:700,fontSize:12}}>{isGoing?`Você${goingCount>1?` + ${goingCount-1}`:''}  vai pra cá`:`${goingCount} pessoa${goingCount>1?'s':''} vão pra cá`}</span>
            </div>
          )}

          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>onSave&&onSave(location)} style={{width:50,padding:'14px 0',borderRadius:14,background:isSaved?'rgba(0,245,160,0.12)':T.surface,border:`1px solid ${isSaved?'rgba(0,245,160,0.35)':T.border}`,color:isSaved?'#00f5a0':T.muted,fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s'}}>🔖</button>
            <button onClick={()=>{onClose();onReport(location)}} style={{flex:1,padding:'14px',borderRadius:14,background:T.surface,border:`1px solid ${T.border}`,color:T.text,fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,cursor:'pointer',transition:'background .15s'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.07)'}
              onMouseLeave={e=>e.currentTarget.style.background=T.surface}
            >📡 Reportar</button>
            <button onClick={handleNav} style={{flex:2,padding:'14px',borderRadius:14,border:'none',background:'linear-gradient(135deg,#4f8eff,#7c5cfc)',color:'#fff',fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:13,cursor:'pointer',boxShadow:'0 4px 20px rgba(79,142,255,0.4)',transition:'transform .15s'}}
              onMouseDown={e=>e.currentTarget.style.transform='scale(.98)'}
              onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
              onTouchStart={e=>e.currentTarget.style.transform='scale(.98)'}
              onTouchEnd={e=>e.currentTarget.style.transform='scale(1)'}
            >🧭 Como chegar</button>
          </div>

          {isOwner(location)&&(
            <button onClick={()=>setOwnerOpen(true)} style={{width:'100%',padding:12,borderRadius:14,marginTop:10,border:'1px solid rgba(255,211,42,0.3)',background:'rgba(255,211,42,0.07)',color:'#ffd32a',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,cursor:'pointer'}}>👑 Gerenciar estabelecimento</button>
          )}
        </div>
      </div>

      <OwnerPanel open={ownerOpen} place={location} uid={user?.uid} onClose={()=>setOwnerOpen(false)}/>
      <ChatPanel  open={chatOpen}  location={location} user={user} onClose={()=>setChatOpen(false)}/>
    </>
  )
}
