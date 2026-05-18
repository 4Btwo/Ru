import React, { useState, useEffect, useCallback } from 'react'
import { ref, onValue, update, remove, set, get, increment } from 'firebase/database'
import { db } from '../lib/firebase'

const timeAgo = ts => {
  const d = Math.floor((Date.now()-ts)/1000)
  if (d<60)    return `${d}s`
  if (d<3600)  return `${Math.floor(d/60)}min`
  if (d<86400) return `${Math.floor(d/3600)}h`
  return `${Math.floor(d/86400)}d`
}

export function useUserNotifications(uid) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  useEffect(()=>{
    if (!uid) return
    return onValue(ref(db,`notifications/${uid}`), snap=>{
      if (!snap.exists()){setNotifications([]);setUnreadCount(0);return}
      const list = Object.entries(snap.val()).map(([id,v])=>({id,...v})).sort((a,b)=>b.ts-a.ts)
      setNotifications(list); setUnreadCount(list.filter(n=>!n.read).length)
    })
  },[uid])
  const markAllRead  = useCallback(async()=>{ if(!uid)return; const snap=await get(ref(db,`notifications/${uid}`)); if(!snap.exists())return; const u={}; snap.forEach(c=>{u[`notifications/${uid}/${c.key}/read`]=true}); await update(ref(db),u) },[uid])
  const markRead     = useCallback(async id=>{ if(!uid)return; await update(ref(db,`notifications/${uid}/${id}`),{read:true}) },[uid])
  const deleteNotif  = useCallback(async id=>{ if(!uid)return; await remove(ref(db,`notifications/${uid}/${id}`)) },[uid])
  return {notifications,unreadCount,markAllRead,markRead,deleteNotif}
}

export async function sendNotification(toUid, notification) {
  await set(ref(db,`notifications/${toUid}/${Date.now()}_${Math.random().toString(36).slice(2,7)}`),{...notification,ts:Date.now(),read:false})
}

const NOTIF_ICON  = {follow_request:'👤',follow_accepted:'✅',new_follower:'🫂',promo:'🎁',mention:'💬',alert:'🔔'}
const NOTIF_COLOR = {follow_request:'#4f8eff',follow_accepted:'#00f5a0',new_follower:'#00f5a0',promo:'#ffd32a',mention:'#7c5cfc',alert:'#ff4757'}
const T = { muted:'rgba(240,240,255,0.38)', text:'#f0f0ff', dim:'rgba(240,240,255,0.16)', border:'rgba(255,255,255,0.07)', surface:'rgba(255,255,255,0.04)' }
const TABS = [{id:'todas',l:'Todas'},{id:'pessoas',l:'👥 Pessoas'},{id:'promos',l:'🎁 Promos'}]

export default function NotificationsPanel({open, onClose, currentUser, onOpenChat, onViewUser}) {
  const {notifications,unreadCount,markAllRead,markRead,deleteNotif} = useUserNotifications(currentUser?.uid)
  const [tab, setTab] = useState('todas')

  useEffect(()=>{
    if (open && unreadCount>0) { const t=setTimeout(()=>markAllRead(),2000); return ()=>clearTimeout(t) }
  },[open,unreadCount])

  const handleAcceptFollow = useCallback(async notif=>{
    if (!currentUser?.uid||!notif.fromUid) return
    await set(ref(db,`followers/${currentUser.uid}/${notif.fromUid}`),{name:notif.fromName,photo:notif.fromPhoto||null,since:Date.now()})
    await set(ref(db,`users/${notif.fromUid}/following/${currentUser.uid}`),{name:currentUser.name,photo:currentUser.photo||null,since:Date.now()})
    await update(ref(db,`users/${currentUser.uid}`),{followers:increment(1)})
    await sendNotification(notif.fromUid,{type:'follow_accepted',title:'✅ Solicitação aceita',body:`${currentUser.name} aceitou seu pedido de seguir`,fromUid:currentUser.uid,fromName:currentUser.name,fromPhoto:currentUser.photo||null})
    await deleteNotif(notif.id)
    await remove(ref(db,`followRequests/${currentUser.uid}/${notif.fromUid}`))
  },[currentUser,deleteNotif])

  const handleRejectFollow = useCallback(async notif=>{
    await deleteNotif(notif.id)
    await remove(ref(db,`followRequests/${currentUser.uid}/${notif.fromUid}`))
  },[currentUser,deleteNotif])

  const filtered = notifications.filter(n=>{
    if (tab==='todas')   return true
    if (tab==='pessoas') return ['follow_request','follow_accepted','new_follower'].includes(n.type)
    if (tab==='promos')  return n.type==='promo'
    return true
  })

  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:2900,background:'rgba(0,0,0,.78)',backdropFilter:'blur(9px)',WebkitBackdropFilter:'blur(9px)',opacity:open?1:0,pointerEvents:open?'all':'none',transition:'opacity .25s'}}/>
      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:3000,background:'rgba(8,8,20,0.97)',backdropFilter:'blur(40px)',WebkitBackdropFilter:'blur(40px)',border:'1px solid rgba(255,255,255,0.07)',borderBottom:'none',borderRadius:'28px 28px 0 0',maxHeight:'88vh',display:'flex',flexDirection:'column',transform:open?'translateY(0)':'translateY(100%)',transition:'transform .38s cubic-bezier(.32,.72,0,1)'}}>
        
        <div style={{width:36,height:4,background:'rgba(255,255,255,0.15)',borderRadius:2,margin:'14px auto 0',flexShrink:0}}/>

        {/* Header */}
        <div style={{padding:'16px 20px 0',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:800,letterSpacing:'-.03em',color:T.text}}>Notificações</div>
              {unreadCount>0&&<div style={{background:'#ff4757',color:'#fff',borderRadius:999,padding:'3px 9px',fontSize:11,fontWeight:800,fontFamily:"'Space Mono',monospace"}}>{unreadCount}</div>}
            </div>
            <div style={{display:'flex',gap:8}}>
              {notifications.some(n=>!n.read)&&(
                <button onClick={markAllRead} style={{background:'none',border:'1px solid rgba(255,255,255,0.08)',borderRadius:999,padding:'6px 12px',cursor:'pointer',color:T.muted,fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:700}}>Marcar lidas</button>
              )}
              <button onClick={onClose} style={{width:34,height:34,borderRadius:'50%',background:T.surface,border:'1px solid rgba(255,255,255,0.08)',cursor:'pointer',color:T.muted,fontSize:15,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>
          </div>
          {/* Tabs */}
          <div style={{display:'flex',gap:6,marginBottom:16}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'7px 14px',borderRadius:999,background:tab===t.id?'rgba(79,142,255,0.12)':T.surface,border:`1px solid ${tab===t.id?'rgba(79,142,255,0.4)':'rgba(255,255,255,0.07)'}`,color:tab===t.id?'#4f8eff':T.muted,fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:11,cursor:'pointer',transition:'all .2s'}}>{t.l}</button>
            ))}
          </div>
        </div>

        {/* List */}
        <div style={{flex:1,overflowY:'auto',padding:'0 16px',paddingBottom:'calc(24px + env(safe-area-inset-bottom,0px))'}}>
          {filtered.length===0?(
            <div style={{textAlign:'center',padding:'56px 0',color:T.muted}}>
              <div style={{fontSize:42,marginBottom:12}}>🔔</div>
              <div style={{fontSize:14,fontWeight:700,marginBottom:6,color:'rgba(240,240,255,0.5)'}}>Nada por aqui</div>
              <div style={{fontSize:12}}>Suas notificações aparecerão aqui</div>
            </div>
          ):filtered.map(notif=>{
            const color = NOTIF_COLOR[notif.type]||'#4f8eff'
            return (
              <div key={notif.id} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'14px 0',borderBottom:'1px solid rgba(255,255,255,0.05)',position:'relative',background:notif.read?'transparent':'rgba(79,142,255,0.02)'}}>
                {!notif.read&&<div style={{position:'absolute',left:-6,top:'50%',transform:'translateY(-50%)',width:5,height:5,borderRadius:'50%',background:'#4f8eff'}}/>}
                
                <div style={{position:'relative',flexShrink:0}}>
                  <div style={{width:46,height:46,borderRadius:'50%',background:`${color}16`,border:`1px solid ${color}33`,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {notif.fromPhoto?<img src={notif.fromPhoto} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:22}}>{NOTIF_ICON[notif.type]||'🔔'}</span>}
                  </div>
                  {notif.fromPhoto&&<div style={{position:'absolute',bottom:-2,right:-2,width:18,height:18,borderRadius:'50%',background:'rgba(8,8,20,1)',border:'1.5px solid rgba(8,8,20,1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11}}>{NOTIF_ICON[notif.type]||'🔔'}</div>}
                </div>

                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:notif.read?500:700,lineHeight:1.5,marginBottom:3,color:T.text}}>{notif.title}</div>
                  <div style={{fontSize:12,color:T.muted,lineHeight:1.5}}>{notif.body}</div>

                  {notif.type==='follow_request'&&(
                    <div style={{display:'flex',gap:8,marginTop:10}}>
                      <button onClick={()=>handleAcceptFollow(notif)} style={{flex:1,padding:'9px 0',borderRadius:12,border:'none',background:'linear-gradient(135deg,#4f8eff,#7c5cfc)',color:'#fff',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:12,cursor:'pointer'}}>Aceitar</button>
                      <button onClick={()=>handleRejectFollow(notif)} style={{flex:1,padding:'9px 0',borderRadius:12,background:T.surface,border:'1px solid rgba(255,255,255,0.08)',color:T.muted,fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:12,cursor:'pointer'}}>Recusar</button>
                    </div>
                  )}
                  {['new_follower','follow_accepted'].includes(notif.type)&&notif.fromUid&&(
                    <button onClick={()=>{onViewUser&&onViewUser(notif.fromUid);onClose()}} style={{marginTop:8,padding:'6px 14px',borderRadius:999,background:T.surface,border:'1px solid rgba(255,255,255,0.08)',color:T.muted,fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:11,cursor:'pointer'}}>Ver perfil</button>
                  )}
                  {notif.type==='promo'&&notif.data?.cta&&(
                    <div style={{marginTop:10,padding:'10px 12px',borderRadius:12,background:'rgba(255,211,42,0.08)',border:'1px solid rgba(255,211,42,0.25)',fontSize:12,color:'#ffd32a',fontWeight:700}}>🎁 {notif.data.cta}</div>
                  )}
                </div>

                <div style={{fontSize:10,color:T.dim,flexShrink:0,paddingTop:2,fontFamily:"'Space Mono',monospace"}}>{timeAgo(notif.ts)}</div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
