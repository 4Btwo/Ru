import React, { useState, useRef, useEffect } from 'react'
import { useChat } from '../hooks/useChat'
import { uploadToCloudinary } from '../lib/cloudinary'
import UserProfilePanel from './UserProfilePanel'

function dateSep(ts) {
  const d=new Date(ts),today=new Date();today.setHours(0,0,0,0)
  const yest=new Date(today);yest.setDate(today.getDate()-1)
  if(d>=today) return 'Hoje'; if(d>=yest) return 'Ontem'
  return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})
}
function timeLabel(ts){return new Date(ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
function isSameDay(a,b){const da=new Date(a),db=new Date(b);return da.getFullYear()===db.getFullYear()&&da.getMonth()===db.getMonth()&&da.getDate()===db.getDate()}
const T = {muted:'rgba(240,240,255,0.38)',text:'#f0f0ff',dim:'rgba(240,240,255,0.16)',border:'rgba(255,255,255,0.07)',surface:'rgba(255,255,255,0.04)'}

export default function ChatPanel({open,location,user,onClose}) {
  const {messages,sendMessage} = useChat(location?.id,user?.uid)
  const [text,setText]         = useState('')
  const [uploading,setUpl]     = useState(false)
  const [viewingUid,setVUid]   = useState(null)
  const [lightbox,setLightbox] = useState(null)
  const fileRef   = useRef(null)
  const bottomRef = useRef(null)

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'})},[messages.length])

  const handleSend = async()=>{ const t=text.trim();if(!t||!user) return;setText('');await sendMessage({text:t,userName:user.name,userPhoto:user.photo||null}) }
  const handleKey  = e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend()} }
  const handleFile = async e=>{
    const file=e.target.files?.[0];if(!file||!user) return;setUpl(true)
    try{const url=await uploadToCloudinary(file);await sendMessage({imageUrl:url,text:'',userName:user.name,userPhoto:user.photo||null})}catch(err){console.error(err)}
    setUpl(false);e.target.value=''
  }

  const filtered = messages.filter(m=>m.text||m.imageUrl)
  const count    = filtered.length
  if (!open) return null

  return (
    <>
      {lightbox&&<div onClick={()=>setLightbox(null)} style={{position:'fixed',inset:0,zIndex:9000,background:'rgba(0,0,0,.96)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'zoom-out'}}><img src={lightbox} alt="" style={{maxWidth:'95vw',maxHeight:'90vh',borderRadius:16,objectFit:'contain'}}/><button onClick={()=>setLightbox(null)} style={{position:'absolute',top:18,right:18,width:38,height:38,borderRadius:'50%',background:'rgba(255,255,255,.12)',border:'none',color:'#fff',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button></div>}
      <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:3500,background:'rgba(0,0,0,.74)',backdropFilter:'blur(8px)'}}/>
      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:3600,background:'rgba(8,8,20,0.97)',backdropFilter:'blur(40px)',WebkitBackdropFilter:'blur(40px)',border:'1px solid rgba(255,255,255,0.07)',borderBottom:'none',borderRadius:'28px 28px 0 0',display:'flex',flexDirection:'column',height:'88vh',overflow:'hidden',boxShadow:'0 -12px 48px rgba(0,0,0,.6)'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:11,padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
          <button onClick={onClose} style={{width:34,height:34,borderRadius:'50%',background:T.surface,border:'1px solid rgba(255,255,255,0.08)',color:T.muted,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>←</button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:800,fontSize:15,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:T.text,fontFamily:"'Outfit',sans-serif"}}>{location?.name}</div>
            <div style={{fontSize:11,color:'#00f5a0',display:'flex',alignItems:'center',gap:5,marginTop:1}}>
              <div style={{width:5,height:5,borderRadius:'50%',background:'#00f5a0',animation:'blink 1s ease infinite'}}/> Chat ao vivo · {count} msg{count!==1?'s':''}
            </div>
          </div>
          <button onClick={()=>fileRef.current?.click()} style={{width:34,height:34,borderRadius:'50%',background:T.surface,border:'1px solid rgba(255,255,255,0.08)',color:T.muted,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>📷</button>
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFile}/>
        </div>

        {/* Messages */}
        <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:2,scrollbarWidth:'none'}}>
          {count===0&&<div style={{textAlign:'center',padding:'40px 0',color:T.muted}}><div style={{fontSize:40,marginBottom:12}}>💬</div><div style={{fontSize:14,fontWeight:700,marginBottom:4,color:'rgba(240,240,255,0.5)'}}>Nenhuma mensagem</div><div style={{fontSize:12}}>Seja o primeiro a comentar!</div></div>}
          {filtered.map((msg,idx)=>{
            const isMe=msg.userId===user?.uid
            const prev=filtered[idx-1]
            const showSep=!prev||!isSameDay(prev.ts,msg.ts)
            const showAvatar=!isMe&&(!prev||prev.userId!==msg.userId||showSep)
            return (
              <React.Fragment key={msg.id||idx}>
                {showSep&&<div style={{textAlign:'center',margin:'16px 0 8px',display:'flex',alignItems:'center',gap:10}}><div style={{flex:1,height:1,background:'rgba(255,255,255,0.06)'}}/><span style={{fontSize:10,fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:'.08em',background:'rgba(14,14,28,1)',borderRadius:999,padding:'3px 10px',border:'1px solid rgba(255,255,255,0.07)'}}>{dateSep(msg.ts)}</span><div style={{flex:1,height:1,background:'rgba(255,255,255,0.06)'}}/></div>}
                <div style={{display:'flex',flexDirection:isMe?'row-reverse':'row',alignItems:'flex-end',gap:8,marginBottom:2}}>
                  {!isMe&&<div onClick={()=>setVUid(msg.userId)} style={{cursor:'pointer',flexShrink:0,width:32,height:32,marginBottom:2}}>
                    {showAvatar?(msg.userPhoto?<img src={msg.userPhoto} alt="" style={{width:32,height:32,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.1)',objectFit:'cover'}}/>:<div style={{width:32,height:32,borderRadius:'50%',background:T.surface,border:'2px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>👤</div>):<div style={{width:32,height:32}}/>}
                  </div>}
                  <div style={{maxWidth:'72%',display:'flex',flexDirection:'column',alignItems:isMe?'flex-end':'flex-start'}}>
                    {showAvatar&&!isMe&&<div onClick={()=>setVUid(msg.userId)} style={{fontSize:11,fontWeight:700,color:'#00f5a0',marginBottom:4,marginLeft:2,cursor:'pointer'}}>{msg.userName?.split(' ')[0]||'Urbano'}</div>}
                    {msg.imageUrl&&<div style={{borderRadius:isMe?'16px 4px 16px 16px':'4px 16px 16px 16px',overflow:'hidden',marginBottom:msg.text?4:0,border:'1px solid rgba(255,255,255,0.07)',cursor:'zoom-in',maxWidth:220}} onClick={()=>setLightbox(msg.imageUrl)}><img src={msg.imageUrl} alt="" style={{width:'100%',display:'block'}}/></div>}
                    {msg.text&&<div style={{background:isMe?'linear-gradient(135deg,#4f8eff,#7c5cfc)':'rgba(255,255,255,0.06)',color:isMe?'#fff':'rgba(240,240,255,0.9)',borderRadius:isMe?'18px 18px 4px 18px':'4px 18px 18px 18px',padding:'10px 14px',fontSize:14,lineHeight:1.5,fontWeight:isMe?600:400,border:isMe?'none':'1px solid rgba(255,255,255,0.07)',boxShadow:isMe?'0 2px 12px rgba(79,142,255,0.25)':'none',wordBreak:'break-word'}}>{msg.text}</div>}
                    <div style={{fontSize:10,color:T.dim,marginTop:3,fontFamily:"'Space Mono',monospace"}}>{timeLabel(msg.ts)}{isMe&&' ✓✓'}</div>
                  </div>
                </div>
              </React.Fragment>
            )
          })}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div style={{display:'flex',alignItems:'flex-end',gap:8,padding:'12px 16px',paddingBottom:'calc(12px + env(safe-area-inset-bottom,0px))',borderTop:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
          <button onClick={()=>fileRef.current?.click()} disabled={uploading} style={{width:42,height:42,borderRadius:'50%',flexShrink:0,background:T.surface,border:'1px solid rgba(255,255,255,0.08)',color:uploading?'#4f8eff':T.muted,cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>{uploading?'⏳':'📎'}</button>
          <div style={{flex:1,display:'flex',alignItems:'flex-end',background:'rgba(255,255,255,0.05)',border:'1.5px solid rgba(255,255,255,0.08)',borderRadius:22,padding:'9px 14px',gap:8,transition:'border-color .2s'}}
            onFocusCapture={e=>e.currentTarget.style.borderColor='rgba(79,142,255,0.5)'}
            onBlurCapture={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'}
          >
            <textarea value={text} onChange={e=>{setText(e.target.value);e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,100)+'px'}} onKeyDown={handleKey} placeholder="Mensagem..." rows={1}
              style={{flex:1,background:'none',border:'none',outline:'none',color:T.text,fontFamily:"'DM Sans',sans-serif",fontSize:14,resize:'none',lineHeight:1.5,maxHeight:100,overflowY:'auto',scrollbarWidth:'none'}}/>
          </div>
          <button onClick={handleSend} disabled={!text.trim()} style={{width:42,height:42,borderRadius:'50%',flexShrink:0,border:'none',background:text.trim()?'linear-gradient(135deg,#4f8eff,#7c5cfc)':'rgba(255,255,255,0.05)',color:text.trim()?'#fff':'rgba(240,240,255,0.2)',cursor:text.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,transition:'all .2s',boxShadow:text.trim()?'0 2px 14px rgba(79,142,255,0.35)':'none'}}>➤</button>
        </div>
      </div>
      <UserProfilePanel open={!!viewingUid} targetUid={viewingUid} currentUser={user} onClose={()=>setVUid(null)}/>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </>
  )
}
