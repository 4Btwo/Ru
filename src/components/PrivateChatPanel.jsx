import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ref, onValue, push, update, get, serverTimestamp, increment } from 'firebase/database'
import { db } from '../lib/firebase'
import { uploadToCloudinary } from '../lib/cloudinary'

function dateSep(ts) {
  if (!ts) return 'Hoje'
  const d=new Date(ts),today=new Date();today.setHours(0,0,0,0)
  const yest=new Date(today);yest.setDate(today.getDate()-1)
  if(d>=today) return 'Hoje'; if(d>=yest) return 'Ontem'
  return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})
}
function timeLabel(ts) { if(!ts) return '...'; return new Date(ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) }
function isSameDay(a,b) { if(!a||!b) return true; const da=new Date(a),db2=new Date(b); return da.getFullYear()===db2.getFullYear()&&da.getMonth()===db2.getMonth()&&da.getDate()===db2.getDate() }
function timeAgo(ts) { const d=Math.floor((Date.now()-ts)/1000); if(d<60) return `${d}s`; if(d<3600) return `${Math.floor(d/60)}min`; if(d<86400) return `${Math.floor(d/3600)}h`; return `${Math.floor(d/86400)}d` }
function chatId(u1,u2) { return [u1,u2].sort().join('__') }

export function usePrivateChats(uid) {
  const [conversations,setConversations]=useState([])
  const [totalUnread,setTotalUnread]=useState(0)
  useEffect(()=>{
    if (!uid) return
    return onValue(ref(db,`privateChats/index/${uid}`),snap=>{
      if(!snap.exists()){setConversations([]);setTotalUnread(0);return}
      const list=Object.entries(snap.val()).map(([otherId,data])=>({otherId,...data})).sort((a,b)=>(b.lastTs||0)-(a.lastTs||0))
      setConversations(list); setTotalUnread(list.reduce((s,c)=>s+(c.unread||0),0))
    })
  },[uid])
  return {conversations,totalUnread}
}

const T = { muted:'rgba(240,240,255,0.38)', text:'#f0f0ff', dim:'rgba(240,240,255,0.16)', border:'rgba(255,255,255,0.07)', surface:'rgba(255,255,255,0.04)' }

export default function PrivateChatPanel({open,onClose,currentUser,initialTargetUid,initialTargetName,initialTargetPhoto}) {
  const [view,setView]                   = useState('list')
  const [conversations,setConversations] = useState([])
  const [activeChat,setActiveChat]       = useState(null)
  const [messages,setMessages]           = useState([])
  const [text,setText]                   = useState('')
  const [uploading,setUploading]         = useState(false)
  const [sending,setSending]             = useState(false)
  const [searchQuery,setSearchQuery]     = useState('')
  const [searchResults,setSearchResults] = useState([])
  const [searching,setSearching]         = useState(false)
  const [lightbox,setLightbox]           = useState(null)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const fileRef   = useRef(null)

  useEffect(()=>{ if(!currentUser?.uid||!open) return; return onValue(ref(db,`privateChats/index/${currentUser.uid}`),snap=>{ if(!snap.exists()){setConversations([]);return}; const list=Object.entries(snap.val()).map(([otherId,data])=>({otherId,...data})).sort((a,b)=>(b.lastTs||0)-(a.lastTs||0)); setConversations(list) }) },[currentUser?.uid,open])
  useEffect(()=>{ if(open&&initialTargetUid&&currentUser?.uid){setActiveChat({uid:initialTargetUid,name:initialTargetName||'Usuário',photo:initialTargetPhoto||null});setView('chat')} },[open,initialTargetUid]) // eslint-disable-line
  useEffect(()=>{ if(!open){setTimeout(()=>{setView('list');setActiveChat(null);setText('');setSearchQuery('');setSearchResults([])},350)} },[open])

  useEffect(()=>{
    if(!activeChat||!currentUser?.uid) return
    const cId=chatId(currentUser.uid,activeChat.uid)
    return onValue(ref(db,`privateChats/messages/${cId}`),snap=>{
      if(!snap.exists()){setMessages([]);return}
      const list=[];snap.forEach(c=>{const v=c.val();list.push({id:c.key,...v,ts:typeof v.ts==='number'?v.ts:null})})
      list.sort((a,b)=>{ if(a.ts!==null&&b.ts!==null) return a.ts-b.ts; if(a.ts!==null) return -1; if(b.ts!==null) return 1; return a.id<b.id?-1:1 })
      setMessages(list.slice(-80))
      update(ref(db,`privateChats/index/${currentUser.uid}/${activeChat.uid}`),{unread:0}).catch(()=>{})
    },err=>console.warn('[PC]',err.message))
  },[activeChat,currentUser?.uid])

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages.length])
  useEffect(()=>{ if(view==='chat') setTimeout(()=>inputRef.current?.focus(),300) },[view])

  useEffect(()=>{
    if(searchQuery.length<2){setSearchResults([]);return}
    setSearching(true)
    get(ref(db,'users')).then(snap=>{
      if(!snap.exists()){setSearching(false);return}
      const r=[];snap.forEach(c=>{const u=c.val();if(c.key===currentUser?.uid) return;if((u.name||'').toLowerCase().includes(searchQuery.toLowerCase()))r.push({uid:c.key,name:u.name,photo:u.photo||null,bio:u.bio})})
      setSearchResults(r.slice(0,8));setSearching(false)
    })
  },[searchQuery,currentUser?.uid])

  const handleSend = useCallback(async()=>{
    const msg=text.trim();if(!msg||!activeChat||!currentUser?.uid||sending) return
    setSending(true);setText('')
    const cId=chatId(currentUser.uid,activeChat.uid),ts=Date.now()
    await push(ref(db,`privateChats/messages/${cId}`),{senderId:currentUser.uid,senderName:currentUser.name,senderPhoto:currentUser.photo||null,text:msg,ts:serverTimestamp()})
    await update(ref(db,`privateChats/index/${currentUser.uid}/${activeChat.uid}`),{name:activeChat.name,photo:activeChat.photo||null,lastMsg:msg,lastTs:ts,unread:0})
    await update(ref(db,`privateChats/index/${activeChat.uid}/${currentUser.uid}`),{name:currentUser.name,photo:currentUser.photo||null,lastMsg:msg,lastTs:ts,unread:increment(1)})
    setSending(false)
  },[text,activeChat,currentUser,sending])

  const handleFile = async e=>{
    const file=e.target.files?.[0];if(!file||!activeChat||!currentUser?.uid) return
    setUploading(true)
    try {
      const imageUrl=await uploadToCloudinary(file)
      const cId=chatId(currentUser.uid,activeChat.uid),ts=Date.now()
      await push(ref(db,`privateChats/messages/${cId}`),{senderId:currentUser.uid,senderName:currentUser.name,senderPhoto:currentUser.photo||null,text:'📷',imageUrl,ts:serverTimestamp()})
      const p='📷 Imagem'
      await update(ref(db,`privateChats/index/${currentUser.uid}/${activeChat.uid}`),{name:activeChat.name,photo:activeChat.photo||null,lastMsg:p,lastTs:ts,unread:0})
      await update(ref(db,`privateChats/index/${activeChat.uid}/${currentUser.uid}`),{name:currentUser.name,photo:currentUser.photo||null,lastMsg:p,lastTs:ts,unread:increment(1)})
    } catch(err){console.error(err)} finally{setUploading(false);e.target.value=''}
  }

  const handleKey = e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend()} }
  const openConv  = (uid,name,photo)=>{ setActiveChat({uid,name,photo});setSearchQuery('');setSearchResults([]);setView('chat') }
  const filtered  = messages.filter(m=>m.text||m.imageUrl)

  const panelStyle = {position:'fixed',bottom:0,left:0,right:0,zIndex:3000,background:'rgba(8,8,20,0.97)',backdropFilter:'blur(40px)',WebkitBackdropFilter:'blur(40px)',border:'1px solid rgba(255,255,255,0.07)',borderBottom:'none',borderRadius:'28px 28px 0 0',height:'88vh',display:'flex',flexDirection:'column',transform:open?'translateY(0)':'translateY(100%)',transition:'transform .38s cubic-bezier(.32,.72,0,1)',overflow:'hidden'}

  return (
    <>
      {lightbox&&<div onClick={()=>setLightbox(null)} style={{position:'fixed',inset:0,zIndex:9000,background:'rgba(0,0,0,.96)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'zoom-out'}}><img src={lightbox} alt="" style={{maxWidth:'95vw',maxHeight:'90vh',borderRadius:16,objectFit:'contain'}}/><button onClick={()=>setLightbox(null)} style={{position:'absolute',top:18,right:18,width:38,height:38,borderRadius:'50%',background:'rgba(255,255,255,.12)',border:'none',color:'#fff',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button></div>}
      <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:2900,background:'rgba(0,0,0,.78)',backdropFilter:'blur(9px)',WebkitBackdropFilter:'blur(9px)',opacity:open?1:0,pointerEvents:open?'all':'none',transition:'opacity .25s'}}/>
      <div style={panelStyle}>
        {/* ── LISTA ── */}
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',opacity:view==='list'?1:0,pointerEvents:view==='list'?'all':'none',transform:view==='list'?'translateX(0)':'translateX(-28px)',transition:'opacity .22s,transform .22s'}}>
          <div style={{width:36,height:4,background:'rgba(255,255,255,0.15)',borderRadius:2,margin:'14px auto 0',flexShrink:0}}/>
          <div style={{padding:'16px 16px 0',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <div style={{display:'flex',alignItems:'center',gap:9}}>
                <div style={{width:34,height:34,borderRadius:'50%',background:'rgba(79,142,255,0.12)',border:'1px solid rgba(79,142,255,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17}}>💬</div>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:800,letterSpacing:'-.03em',color:T.text}}>Mensagens</div>
              </div>
              <button onClick={onClose} style={{width:34,height:34,borderRadius:'50%',background:T.surface,border:'1px solid rgba(255,255,255,0.08)',cursor:'pointer',color:T.muted,fontSize:15,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>
            <div className="search-bar" style={{marginBottom:10}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{color:T.muted,flexShrink:0}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Buscar usuário para conversar..." style={{background:'none',border:'none',outline:'none',color:T.text,fontFamily:"'DM Sans',sans-serif",fontSize:13,flex:1}}/>
              {searchQuery&&<span onClick={()=>setSearchQuery('')} style={{cursor:'pointer',color:T.muted,fontSize:15}}>✕</span>}
            </div>
          </div>

          <div style={{flex:1,overflowY:'auto',padding:'0 16px',paddingBottom:'calc(20px + env(safe-area-inset-bottom,0px))'}}>
            {searchQuery.length>=2?(
              <>
                <div style={{fontSize:10,color:T.muted,fontWeight:700,padding:'10px 0 6px',textTransform:'uppercase',letterSpacing:'.1em'}}>Usuários encontrados</div>
                {searching?<div style={{textAlign:'center',padding:'24px 0',color:T.muted,fontSize:13}}>Buscando...</div>
                :searchResults.length===0?<div style={{textAlign:'center',padding:'24px 0',color:T.muted,fontSize:13}}>Nenhum usuário encontrado</div>
                :searchResults.map(u=>(
                  <div key={u.uid} onClick={()=>openConv(u.uid,u.name,u.photo)} style={{display:'flex',alignItems:'center',gap:12,padding:'13px 0',borderBottom:'1px solid rgba(255,255,255,0.05)',cursor:'pointer'}}>
                    <div style={{width:46,height:46,borderRadius:'50%',flexShrink:0,background:T.surface,border:'2px solid rgba(79,142,255,0.25)',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{u.photo?<img src={u.photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:'👤'}</div>
                    <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:700,color:T.text}}>{u.name}</div>{u.bio&&<div style={{fontSize:11,color:T.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginTop:1}}>{u.bio}</div>}</div>
                    <div style={{background:'rgba(79,142,255,0.1)',border:'1px solid rgba(79,142,255,0.3)',borderRadius:999,padding:'6px 12px',fontSize:11,color:'#4f8eff',fontWeight:700}}>Mensagem</div>
                  </div>
                ))}
              </>
            ):conversations.length===0?(
              <div style={{textAlign:'center',padding:'56px 0',color:T.muted}}>
                <div style={{fontSize:42,marginBottom:12}}>💬</div>
                <div style={{fontSize:14,fontWeight:700,marginBottom:6,color:'rgba(240,240,255,0.55)'}}>Sem conversas</div>
                <div style={{fontSize:12,lineHeight:1.6}}>Busque um usuário acima para começar</div>
              </div>
            ):(
              <>
                <div style={{fontSize:10,color:T.muted,fontWeight:700,padding:'10px 0 6px',textTransform:'uppercase',letterSpacing:'.1em'}}>Conversas recentes</div>
                {conversations.map(conv=>(
                  <div key={conv.otherId} onClick={()=>openConv(conv.otherId,conv.name,conv.photo)} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 0',borderBottom:'1px solid rgba(255,255,255,0.05)',cursor:'pointer'}}>
                    <div style={{position:'relative',flexShrink:0}}>
                      <div style={{width:48,height:48,borderRadius:'50%',background:T.surface,border:`2px solid ${conv.unread>0?'rgba(79,142,255,0.55)':'rgba(255,255,255,0.1)'}`,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>{conv.photo?<img src={conv.photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:'👤'}</div>
                      {conv.unread>0&&<div style={{position:'absolute',top:-2,right:-2,width:18,height:18,borderRadius:'50%',background:'#4f8eff',color:'#fff',fontSize:9,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid rgba(8,8,20,1)',fontFamily:"'Space Mono',monospace"}}>{conv.unread>9?'9+':conv.unread}</div>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:conv.unread>0?800:600,marginBottom:3,color:T.text}}>{conv.name}</div>
                      <div style={{fontSize:12,color:conv.unread>0?T.text:T.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight:conv.unread>0?600:400}}>{conv.lastMsg||'Inicie uma conversa'}</div>
                    </div>
                    <div style={{fontSize:10,color:T.dim,flexShrink:0,fontFamily:"'Space Mono',monospace"}}>{conv.lastTs?timeAgo(conv.lastTs):''}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* ── CHAT ABERTO ── */}
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',opacity:view==='chat'?1:0,pointerEvents:view==='chat'?'all':'none',transform:view==='chat'?'translateX(0)':'translateX(28px)',transition:'opacity .22s,transform .22s'}}>
          {/* Header */}
          <div style={{display:'flex',alignItems:'center',gap:11,padding:'14px 16px',background:'rgba(8,8,20,0.97)',backdropFilter:'blur(24px)',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
            <button onClick={()=>setView('list')} style={{width:34,height:34,borderRadius:'50%',background:T.surface,border:'1px solid rgba(255,255,255,0.08)',color:T.muted,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>←</button>
            <div style={{width:40,height:40,borderRadius:'50%',flexShrink:0,background:T.surface,border:'2px solid rgba(79,142,255,0.35)',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{activeChat?.photo?<img src={activeChat.photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:'👤'}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:800,fontSize:15,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:T.text}}>{activeChat?.name||'Usuário'}</div>
              <div style={{fontSize:11,color:'#00f5a0',display:'flex',alignItems:'center',gap:5,marginTop:1}}><div style={{width:5,height:5,borderRadius:'50%',background:'#00f5a0'}}/> Chat privado</div>
            </div>
            <button onClick={()=>fileRef.current?.click()} style={{width:34,height:34,borderRadius:'50%',background:T.surface,border:'1px solid rgba(255,255,255,0.08)',color:T.muted,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>📷</button>
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFile}/>
            <button onClick={onClose} style={{width:34,height:34,borderRadius:'50%',background:T.surface,border:'1px solid rgba(255,255,255,0.08)',color:T.muted,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          </div>

          {/* Mensagens */}
          <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:2,scrollbarWidth:'none'}}>
            {filtered.length===0?(
              <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,color:T.muted,padding:'40px 0'}}>
                <div style={{fontSize:40,marginBottom:8}}>👋</div>
                <div style={{fontSize:14,fontWeight:700,color:'rgba(240,240,255,0.55)'}}>Início da conversa</div>
                <div style={{fontSize:12,textAlign:'center',lineHeight:1.6}}>Diga olá para {activeChat?.name?.split(' ')[0]||'a pessoa'}!</div>
              </div>
            ):filtered.map((msg,idx)=>{
              const isMe=msg.senderId===currentUser?.uid
              const prev=filtered[idx-1]
              const showSep=!prev||!isSameDay(prev.ts,msg.ts)
              const showAvatar=!isMe&&(!prev||prev.senderId!==msg.senderId||showSep)
              return (
                <React.Fragment key={msg.id||idx}>
                  {showSep&&<div style={{textAlign:'center',margin:'16px 0 8px',display:'flex',alignItems:'center',gap:10}}>
                    <div style={{flex:1,height:1,background:'rgba(255,255,255,0.06)'}}/>
                    <span style={{fontSize:10,fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:'.08em',background:'rgba(14,14,28,1)',borderRadius:999,padding:'3px 10px',border:'1px solid rgba(255,255,255,0.07)'}}>{dateSep(msg.ts)}</span>
                    <div style={{flex:1,height:1,background:'rgba(255,255,255,0.06)'}}/>
                  </div>}
                  <div style={{display:'flex',flexDirection:isMe?'row-reverse':'row',alignItems:'flex-end',gap:8,marginBottom:2}}>
                    {!isMe&&<div style={{flexShrink:0,width:32,height:32,marginBottom:2}}>
                      {showAvatar?(msg.senderPhoto?<img src={msg.senderPhoto} alt="" style={{width:32,height:32,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.1)',objectFit:'cover'}}/>:<div style={{width:32,height:32,borderRadius:'50%',background:T.surface,border:'2px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>👤</div>):<div style={{width:32,height:32}}/>}
                    </div>}
                    <div style={{maxWidth:'72%',display:'flex',flexDirection:'column',alignItems:isMe?'flex-end':'flex-start'}}>
                      {msg.imageUrl&&<div style={{borderRadius:isMe?'16px 4px 16px 16px':'4px 16px 16px 16px',overflow:'hidden',marginBottom:msg.text?4:0,border:'1px solid rgba(255,255,255,0.07)',cursor:'zoom-in',maxWidth:220}} onClick={()=>setLightbox(msg.imageUrl)}><img src={msg.imageUrl} alt="" style={{width:'100%',display:'block'}}/></div>}
                      {msg.text&&!(msg.imageUrl&&msg.text==='📷')&&(
                        <div style={{background:isMe?'linear-gradient(135deg,#4f8eff,#7c5cfc)':'rgba(255,255,255,0.06)',color:isMe?'#fff':'rgba(240,240,255,0.9)',borderRadius:isMe?'18px 18px 4px 18px':'4px 18px 18px 18px',padding:'10px 14px',fontSize:14,lineHeight:1.5,fontWeight:isMe?600:400,border:isMe?'none':'1px solid rgba(255,255,255,0.07)',boxShadow:isMe?'0 2px 12px rgba(79,142,255,0.25)':'none',wordBreak:'break-word'}}>{msg.text}</div>
                      )}
                      <div style={{fontSize:10,color:T.dim,marginTop:3,fontFamily:"'Space Mono',monospace"}}>{timeLabel(msg.ts)}{isMe&&' ✓✓'}</div>
                    </div>
                  </div>
                </React.Fragment>
              )
            })}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div style={{display:'flex',alignItems:'flex-end',gap:8,padding:'12px 16px',paddingBottom:'calc(12px + env(safe-area-inset-bottom,0px))',background:'rgba(8,8,20,0.97)',borderTop:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
            <button onClick={()=>fileRef.current?.click()} disabled={uploading} style={{width:42,height:42,borderRadius:'50%',flexShrink:0,background:T.surface,border:'1px solid rgba(255,255,255,0.08)',color:uploading?'#4f8eff':T.muted,cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s'}}>{uploading?'⏳':'📎'}</button>
            <div style={{flex:1,display:'flex',alignItems:'flex-end',background:'rgba(255,255,255,0.05)',border:'1.5px solid rgba(255,255,255,0.08)',borderRadius:22,padding:'9px 14px',gap:8,transition:'border-color .2s'}}
              onFocusCapture={e=>e.currentTarget.style.borderColor='rgba(79,142,255,0.5)'}
              onBlurCapture={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'}
            >
              <textarea ref={inputRef} value={text} onChange={e=>{setText(e.target.value);e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,100)+'px'}} onKeyDown={handleKey} placeholder="Mensagem..." rows={1}
                style={{flex:1,background:'none',border:'none',outline:'none',color:T.text,fontFamily:"'DM Sans',sans-serif",fontSize:14,resize:'none',lineHeight:1.5,maxHeight:100,overflowY:'auto',scrollbarWidth:'none'}}/>
            </div>
            <button onClick={handleSend} disabled={!text.trim()||sending} style={{width:42,height:42,borderRadius:'50%',flexShrink:0,border:'none',background:text.trim()?'linear-gradient(135deg,#4f8eff,#7c5cfc)':'rgba(255,255,255,0.05)',color:text.trim()?'#fff':'rgba(240,240,255,0.2)',cursor:text.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,transition:'all .2s',boxShadow:text.trim()?'0 2px 14px rgba(79,142,255,0.35)':'none'}}>➤</button>
          </div>
        </div>
      </div>
    </>
  )
}
