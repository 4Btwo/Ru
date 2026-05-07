// ── CHAT DO LOCAL ─────────────────────────────────────────────────────────────
import React, { useState, useRef, useEffect } from 'react'
import { useChat } from '../hooks/useChat'
import { uploadToCloudinary } from '../lib/cloudinary'
import UserProfilePanel from './UserProfilePanel'

function dateSep(ts) {
  const d = new Date(ts)
  const today    = new Date(); today.setHours(0,0,0,0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate()-1)
  if (d >= today) return 'Hoje'
  if (d >= yesterday) return 'Ontem'
  return d.toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})
}
function timeLabel(ts) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })
}
function isSameDay(a, b) {
  const da = new Date(a), db = new Date(b)
  return da.getFullYear()===db.getFullYear() && da.getMonth()===db.getMonth() && da.getDate()===db.getDate()
}

export default function ChatPanel({ open, location, user, onClose }) {
  const { messages, sendMessage } = useChat(location?.id, user?.uid)
  const [text,       setText]       = useState('')
  const [uploading,  setUploading]  = useState(false)
  const [viewingUid, setViewingUid] = useState(null)
  const [lightbox,   setLightbox]   = useState(null)
  const fileRef   = useRef(null)
  const bottomRef = useRef(null)

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) }, [messages.length])

  const handleSend = async () => {
    const t = text.trim()
    if (!t || !user) return
    setText('')
    await sendMessage({ text:t, userName:user.name, userPhoto:user.photo||null })
  }
  const handleKey = e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }
  const handleFile = async e => {
    const file = e.target.files?.[0]; if (!file || !user) return
    setUploading(true)
    try {
      const url = await uploadToCloudinary(file)
      await sendMessage({ imageUrl:url, text:'', userName:user.name, userPhoto:user.photo||null })
    } catch(err) { console.error(err) }
    setUploading(false)
    e.target.value = ''
  }

  const filtered = messages.filter(m => m.text || m.imageUrl)
  const count = filtered.length

  if (!open) return null

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div onClick={()=>setLightbox(null)} style={{
          position:'fixed', inset:0, zIndex:9000,
          background:'rgba(0,0,0,.94)', display:'flex',
          alignItems:'center', justifyContent:'center', cursor:'zoom-out',
        }}>
          <img src={lightbox} alt="" style={{maxWidth:'95vw', maxHeight:'90vh', borderRadius:12, objectFit:'contain'}}/>
          <button onClick={()=>setLightbox(null)} style={{
            position:'absolute', top:16, right:16, width:36, height:36,
            borderRadius:'50%', background:'rgba(255,255,255,.15)', border:'none',
            color:'#fff', fontSize:18, cursor:'pointer',
          }}>✕</button>
        </div>
      )}

      {/* Backdrop */}
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:3500,
        background:'rgba(0,0,0,.6)', backdropFilter:'blur(4px)',
      }}/>

      {/* Panel */}
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:3600,
        background:'var(--bg)', borderRadius:'22px 22px 0 0',
        display:'flex', flexDirection:'column',
        height:'88vh', overflow:'hidden',
        boxShadow:'0 -8px 40px rgba(0,0,0,.6)',
      }}>

        {/* ── Header ── */}
        <div style={{
          display:'flex', alignItems:'center', gap:12,
          padding:'14px 16px',
          background:'var(--surface)',
          borderBottom:'1px solid var(--border)',
          flexShrink:0,
        }}>
          <button onClick={onClose} style={{
            width:32, height:32, borderRadius:'50%',
            background:'var(--surface2)', border:'1px solid var(--border)',
            color:'var(--muted)', cursor:'pointer', fontSize:16,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>←</button>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontWeight:800, fontSize:15, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
              {location?.name}
            </div>
            <div style={{fontSize:11, color:'var(--green)', display:'flex', alignItems:'center', gap:5, marginTop:1}}>
              <div style={{width:6, height:6, borderRadius:'50%', background:'var(--green)', flexShrink:0}}/>
              Chat ao vivo · {count} mensagem{count!==1?'s':''}
            </div>
          </div>
          <button onClick={()=>fileRef.current?.click()} style={{
            width:32, height:32, borderRadius:'50%',
            background:'var(--surface2)', border:'1px solid var(--border)',
            color:'var(--muted)', cursor:'pointer', fontSize:16,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>📷</button>
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFile}/>
        </div>

        {/* ── Messages ── */}
        <div style={{
          flex:1, overflowY:'auto', padding:'16px',
          display:'flex', flexDirection:'column', gap:2,
          scrollbarWidth:'thin', scrollbarColor:'var(--border) transparent',
        }}>
          {count===0 && (
            <div style={{textAlign:'center', padding:'40px 0', color:'var(--muted)'}}>
              <div style={{fontSize:40, marginBottom:12}}>💬</div>
              <div style={{fontSize:14, fontWeight:700, marginBottom:4}}>Nenhuma mensagem ainda</div>
              <div style={{fontSize:12}}>Seja o primeiro a comentar!</div>
            </div>
          )}

          {filtered.map((msg, idx) => {
            const isMe = msg.userId === user?.uid
            const prev = filtered[idx-1]
            const showSep = !prev || !isSameDay(prev.ts, msg.ts)
            const showAvatar = !isMe && (!prev || prev.userId !== msg.userId || showSep)
            const showName   = !isMe && showAvatar

            return (
              <React.Fragment key={msg.id||idx}>
                {/* Date separator */}
                {showSep && (
                  <div style={{
                    textAlign:'center', margin:'16px 0 8px',
                    display:'flex', alignItems:'center', gap:10,
                  }}>
                    <div style={{flex:1, height:1, background:'var(--border)'}}/>
                    <span style={{
                      fontSize:10, fontWeight:700, color:'var(--muted)',
                      textTransform:'uppercase', letterSpacing:'.08em',
                      background:'var(--surface2)', borderRadius:100,
                      padding:'3px 10px', border:'1px solid var(--border)',
                    }}>{dateSep(msg.ts)}</span>
                    <div style={{flex:1, height:1, background:'var(--border)'}}/>
                  </div>
                )}

                <div style={{
                  display:'flex',
                  flexDirection: isMe ? 'row-reverse' : 'row',
                  alignItems:'flex-end', gap:8,
                  marginBottom: 2,
                }}>
                  {/* Avatar */}
                  {!isMe && (
                    <div onClick={()=>setViewingUid(msg.userId)}
                      style={{cursor:'pointer', flexShrink:0, width:32, height:32, marginBottom:2}}>
                      {showAvatar ? (
                        msg.userPhoto
                          ? <img src={msg.userPhoto} alt="" style={{
                              width:32, height:32, borderRadius:'50%',
                              border:'2px solid var(--border)', objectFit:'cover',
                              transition:'border-color .2s',
                            }}
                              onMouseEnter={e=>e.currentTarget.style.borderColor='var(--green)'}
                              onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}/>
                          : <div style={{
                              width:32, height:32, borderRadius:'50%',
                              background:'var(--surface3)', border:'2px solid var(--border)',
                              display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
                            }}>👤</div>
                      ) : <div style={{width:32, height:32}}/>}
                    </div>
                  )}

                  <div style={{maxWidth:'72%', display:'flex', flexDirection:'column', alignItems: isMe?'flex-end':'flex-start'}}>
                    {/* Name */}
                    {showName && (
                      <div onClick={()=>setViewingUid(msg.userId)} style={{
                        fontSize:11, fontWeight:700, color:'var(--green)',
                        marginBottom:4, marginLeft:2, cursor:'pointer',
                      }}>{msg.userName?.split(' ')[0]||'Urbano'}</div>
                    )}

                    {/* Image */}
                    {msg.imageUrl && (
                      <div style={{
                        borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                        overflow:'hidden', marginBottom:msg.text?4:0,
                        border:'1px solid var(--border)',
                        cursor:'zoom-in', maxWidth:220,
                      }} onClick={()=>setLightbox(msg.imageUrl)}>
                        <img src={msg.imageUrl} alt="" style={{width:'100%', display:'block'}}/>
                      </div>
                    )}

                    {/* Text bubble */}
                    {msg.text && (
                      <div style={{
                        background: isMe
                          ? 'linear-gradient(135deg, var(--green), #16a34a)'
                          : 'var(--surface2)',
                        color: isMe ? '#052e16' : 'var(--text)',
                        borderRadius: isMe ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                        padding:'10px 14px',
                        fontSize:14, lineHeight:1.5, fontWeight:isMe?600:400,
                        border: isMe ? 'none' : '1px solid var(--border)',
                        boxShadow: isMe ? '0 2px 8px rgba(34,197,94,.2)' : 'none',
                        wordBreak:'break-word',
                      }}>
                        {msg.text}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div style={{
                      fontSize:10, color:'var(--dim)', marginTop:3,
                      marginRight: isMe ? 2 : 0, marginLeft: isMe ? 0 : 2,
                    }}>
                      {timeLabel(msg.ts)}{isMe && ' ✓✓'}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            )
          })}
          <div ref={bottomRef}/>
        </div>

        {/* ── Input ── */}
        <div style={{
          display:'flex', alignItems:'flex-end', gap:8, padding:'12px 16px',
          paddingBottom:'calc(12px + env(safe-area-inset-bottom,0px))',
          background:'var(--surface)', borderTop:'1px solid var(--border)', flexShrink:0,
        }}>
          <button onClick={()=>fileRef.current?.click()} disabled={uploading} style={{
            width:40, height:40, borderRadius:'50%', flexShrink:0,
            background:'var(--surface2)', border:'1px solid var(--border)',
            color: uploading ? 'var(--green)' : 'var(--muted)',
            cursor:'pointer', fontSize:18,
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'all .2s',
          }}>{uploading ? '⏳' : '📎'}</button>

          <div style={{
            flex:1, display:'flex', alignItems:'flex-end',
            background:'var(--surface2)', border:'1.5px solid var(--border)',
            borderRadius:22, padding:'8px 14px', gap:8,
            transition:'border-color .2s',
          }}
            onFocus={e=>e.currentTarget.style.borderColor='var(--green)'}
            onBlur={e=>e.currentTarget.style.borderColor='var(--border)'}
          >
            <textarea
              value={text}
              onChange={e=>{setText(e.target.value); e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,100)+'px'}}
              onKeyDown={handleKey}
              placeholder="Mensagem..."
              rows={1}
              style={{
                flex:1, background:'none', border:'none', outline:'none',
                color:'var(--text)', fontFamily:"'Inter',sans-serif", fontSize:14,
                resize:'none', lineHeight:1.5, maxHeight:100, overflowY:'auto',
                scrollbarWidth:'none',
              }}/>
          </div>

          <button onClick={handleSend} disabled={!text.trim()} style={{
            width:40, height:40, borderRadius:'50%', flexShrink:0, border:'none',
            background: text.trim() ? 'var(--green)' : 'var(--surface2)',
            color: text.trim() ? '#052e16' : 'var(--dim)',
            cursor: text.trim() ? 'pointer' : 'default',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:18, transition:'all .2s',
            boxShadow: text.trim() ? '0 2px 12px rgba(34,197,94,.3)' : 'none',
          }}>➤</button>
        </div>
      </div>

      {/* User profile panel */}
      <UserProfilePanel
        open={!!viewingUid} targetUid={viewingUid}
        currentUser={user} onClose={()=>setViewingUid(null)}
      />
    </>
  )
}
