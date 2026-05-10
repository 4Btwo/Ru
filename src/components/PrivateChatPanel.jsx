// ── CHAT PRIVADO ENTRE USUÁRIOS ───────────────────────────────────────────────
import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  ref, onValue, push, update, get, serverTimestamp, increment,
} from 'firebase/database'
import { db } from '../lib/firebase'
import { uploadToCloudinary } from '../lib/cloudinary'

/* ── helpers de data/hora ──────────────────────────────────────────────────── */
function dateSep(ts) {
  const d = new Date(ts)
  const today     = new Date(); today.setHours(0,0,0,0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate()-1)
  if (d >= today)     return 'Hoje'
  if (d >= yesterday) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
function timeLabel(ts) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function isSameDay(a, b) {
  const da = new Date(a), db = new Date(b)
  return da.getFullYear()===db.getFullYear() && da.getMonth()===db.getMonth() && da.getDate()===db.getDate()
}
function timeAgo(ts) {
  const d = Math.floor((Date.now() - ts) / 1000)
  if (d < 60)    return `${d}s`
  if (d < 3600)  return `${Math.floor(d/60)}min`
  if (d < 86400) return `${Math.floor(d/3600)}h`
  return `${Math.floor(d/86400)}d`
}

/* ── ID único de conversa (idempotente) ────────────────────────────────────── */
function chatId(uid1, uid2) {
  return [uid1, uid2].sort().join('__')
}

/* ── Hook exportado: lista de conversas + unread total ─────────────────────── */
export function usePrivateChats(uid) {
  const [conversations, setConversations] = useState([])
  const [totalUnread,   setTotalUnread]   = useState(0)

  useEffect(() => {
    if (!uid) return
    const convRef = ref(db, `privateChats/index/${uid}`)
    return onValue(convRef, snap => {
      if (!snap.exists()) { setConversations([]); setTotalUnread(0); return }
      const list = Object.entries(snap.val())
        .map(([otherId, data]) => ({ otherId, ...data }))
        .sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0))
      setConversations(list)
      setTotalUnread(list.reduce((sum, c) => sum + (c.unread || 0), 0))
    })
  }, [uid])

  return { conversations, totalUnread }
}

/* ══════════════════════════════════════════════════════════════════════════════
   Componente principal
══════════════════════════════════════════════════════════════════════════════ */
export default function PrivateChatPanel({
  open, onClose,
  currentUser,
  initialTargetUid, initialTargetName, initialTargetPhoto,
}) {
  const [view,            setView]          = useState('list')   // 'list' | 'chat'
  const [conversations,   setConversations] = useState([])
  const [activeChat,      setActiveChat]    = useState(null)     // { uid, name, photo }
  const [messages,        setMessages]      = useState([])
  const [text,            setText]          = useState('')
  const [uploading,       setUploading]     = useState(false)
  const [sending,         setSending]       = useState(false)
  const [searchQuery,     setSearchQuery]   = useState('')
  const [searchResults,   setSearchResults] = useState([])
  const [searching,       setSearching]     = useState(false)
  const [lightbox,        setLightbox]      = useState(null)

  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const fileRef   = useRef(null)

  /* ── lista de conversas ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (!currentUser?.uid || !open) return
    const convRef = ref(db, `privateChats/index/${currentUser.uid}`)
    return onValue(convRef, snap => {
      if (!snap.exists()) { setConversations([]); return }
      const list = Object.entries(snap.val())
        .map(([otherId, data]) => ({ otherId, ...data }))
        .sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0))
      setConversations(list)
    })
  }, [currentUser?.uid, open])

  /* ── abre direto numa conversa se vier target inicial ───────────────────── */
  useEffect(() => {
    if (open && initialTargetUid && currentUser?.uid) {
      setActiveChat({
        uid:   initialTargetUid,
        name:  initialTargetName  || 'Usuário',
        photo: initialTargetPhoto || null,
      })
      setView('chat')
    }
  }, [open, initialTargetUid]) // eslint-disable-line

  /* ── reset ao fechar ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setView('list'); setActiveChat(null); setText('')
        setSearchQuery(''); setSearchResults([])
      }, 350)
    }
  }, [open])

  /* ── mensagens da conversa ativa (mesmo padrão de useChat.js) ───────────── */
  useEffect(() => {
    if (!activeChat || !currentUser?.uid) return
    const cId = chatId(currentUser.uid, activeChat.uid)
    const msgsRef = ref(db, `privateChats/messages/${cId}`)
    const unsub = onValue(msgsRef, snap => {
      if (!snap.exists()) { setMessages([]); return }
      const list = []
      snap.forEach(child => list.push({ id: child.key, ...child.val() }))
      list.sort((a, b) => (a.ts || 0) - (b.ts || 0))
      setMessages(list.slice(-80))
      // marca como lido (sem await, silencia erro)
      update(ref(db, `privateChats/index/${currentUser.uid}/${activeChat.uid}`), { unread: 0 }).catch(() => {})
    }, err => console.warn('[PrivateChat]', err.message))
    return unsub
  }, [activeChat, currentUser?.uid])

  /* ── auto scroll ────────────────────────────────────────────────────────── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  /* ── foca input ao abrir chat ───────────────────────────────────────────── */
  useEffect(() => {
    if (view === 'chat') setTimeout(() => inputRef.current?.focus(), 300)
  }, [view])

  /* ── busca usuários por nome ────────────────────────────────────────────── */
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return }
    setSearching(true)
    get(ref(db, 'users')).then(snap => {
      if (!snap.exists()) { setSearching(false); return }
      const results = []
      snap.forEach(child => {
        const u = child.val()
        if (child.key === currentUser?.uid) return
        if ((u.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
          results.push({ uid: child.key, name: u.name, photo: u.photo || null, bio: u.bio })
      })
      setSearchResults(results.slice(0, 8))
      setSearching(false)
    })
  }, [searchQuery, currentUser?.uid])

  /* ── enviar texto ───────────────────────────────────────────────────────── */
  const handleSend = useCallback(async () => {
    const msg = text.trim()
    if (!msg || !activeChat || !currentUser?.uid || sending) return
    setSending(true)
    setText('')
    const cId = chatId(currentUser.uid, activeChat.uid)
    const ts  = Date.now()

    // grava mensagem com serverTimestamp para o ts (passa a validação do Firebase)
    await push(ref(db, `privateChats/messages/${cId}`), {
      senderId:    currentUser.uid,
      senderName:  currentUser.name,
      senderPhoto: currentUser.photo || null,
      text:        msg,
      ts:          serverTimestamp(),
    })

    // atualiza índice dos dois lados
    await update(ref(db, `privateChats/index/${currentUser.uid}/${activeChat.uid}`), {
      name: activeChat.name, photo: activeChat.photo || null,
      lastMsg: msg, lastTs: ts, unread: 0,
    })
    await update(ref(db, `privateChats/index/${activeChat.uid}/${currentUser.uid}`), {
      name: currentUser.name, photo: currentUser.photo || null,
      lastMsg: msg, lastTs: ts, unread: increment(1),
    })

    setSending(false)
  }, [text, activeChat, currentUser, sending])

  /* ── enviar imagem ──────────────────────────────────────────────────────── */
  const handleFile = async e => {
    const file = e.target.files?.[0]
    if (!file || !activeChat || !currentUser?.uid) return
    setUploading(true)
    try {
      const imageUrl = await uploadToCloudinary(file)
      const cId = chatId(currentUser.uid, activeChat.uid)
      const ts  = Date.now()

      await push(ref(db, `privateChats/messages/${cId}`), {
        senderId:    currentUser.uid,
        senderName:  currentUser.name,
        senderPhoto: currentUser.photo || null,
        text:        '📷',
        imageUrl,
        ts:          serverTimestamp(),
      })

      const preview = '📷 Imagem'
      await update(ref(db, `privateChats/index/${currentUser.uid}/${activeChat.uid}`), {
        name: activeChat.name, photo: activeChat.photo || null,
        lastMsg: preview, lastTs: ts, unread: 0,
      })
      await update(ref(db, `privateChats/index/${activeChat.uid}/${currentUser.uid}`), {
        name: currentUser.name, photo: currentUser.photo || null,
        lastMsg: preview, lastTs: ts, unread: increment(1),
      })
    } catch (err) { console.error('[PrivateChat upload]', err) }
    setUploading(false)
    e.target.value = ''
  }

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const openConversation = (uid, name, photo) => {
    setActiveChat({ uid, name, photo })
    setSearchQuery(''); setSearchResults([])
    setView('chat')
  }

  const filtered = messages.filter(m => m.text || m.imageUrl)

  /* ════════════════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position:'fixed', inset:0, zIndex:9000,
          background:'rgba(0,0,0,.94)', display:'flex',
          alignItems:'center', justifyContent:'center', cursor:'zoom-out',
        }}>
          <img src={lightbox} alt="" style={{ maxWidth:'95vw', maxHeight:'90vh', borderRadius:12, objectFit:'contain' }}/>
          <button onClick={() => setLightbox(null)} style={{
            position:'absolute', top:16, right:16, width:36, height:36,
            borderRadius:'50%', background:'rgba(255,255,255,.15)', border:'none',
            color:'#fff', fontSize:18, cursor:'pointer',
          }}>✕</button>
        </div>
      )}

      {/* Backdrop */}
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:2900,
        background:'rgba(0,0,0,.65)', backdropFilter:'blur(4px)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none',
        transition:'opacity .25s',
      }}/>

      {/* Painel */}
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:3000,
        background:'var(--bg)', borderRadius:'24px 24px 0 0',
        height:'88vh', display:'flex', flexDirection:'column',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition:'transform .35s cubic-bezier(.4,0,.2,1)',
        borderTop:'1px solid var(--border)', overflow:'hidden',
      }}>

        {/* ══ LISTA DE CONVERSAS ════════════════════════════════════════════ */}
        <div style={{
          position:'absolute', inset:0, display:'flex', flexDirection:'column',
          opacity: view==='list' ? 1 : 0,
          pointerEvents: view==='list' ? 'all' : 'none',
          transform: view==='list' ? 'translateX(0)' : 'translateX(-30px)',
          transition:'opacity .2s, transform .2s',
        }}>
          {/* Handle */}
          <div style={{ width:40, height:4, background:'var(--border)', borderRadius:2, margin:'12px auto 0', flexShrink:0 }}/>

          {/* Header */}
          <div style={{ padding:'16px 20px 0', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{
                  width:32, height:32, borderRadius:'50%',
                  background:'rgba(34,197,94,.15)', border:'1px solid rgba(34,197,94,.3)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
                }}>💬</div>
                <div style={{ fontSize:18, fontWeight:800 }}>Mensagens</div>
              </div>
              <button onClick={onClose} style={{
                width:32, height:32, borderRadius:'50%',
                background:'var(--surface2)', border:'1px solid var(--border)',
                cursor:'pointer', color:'var(--muted)', fontSize:14,
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>✕</button>
            </div>

            {/* Busca */}
            <div style={{
              display:'flex', alignItems:'center', gap:8,
              background:'var(--surface2)', border:'1.5px solid var(--border)',
              borderRadius:12, padding:'10px 14px', marginBottom:8,
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15" style={{ color:'var(--muted)', flexShrink:0 }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar usuário para conversar..."
                style={{
                  background:'none', border:'none', outline:'none',
                  color:'var(--text)', fontFamily:"'Inter',sans-serif",
                  fontSize:13, flex:1,
                }}
              />
              {searchQuery && (
                <span onClick={() => setSearchQuery('')} style={{ cursor:'pointer', color:'var(--muted)', fontSize:15 }}>✕</span>
              )}
            </div>
          </div>

          {/* Resultados ou lista */}
          <div style={{ flex:1, overflowY:'auto', padding:'0 20px', paddingBottom:'calc(16px + env(safe-area-inset-bottom,0px))' }}>
            {searchQuery.length >= 2 ? (
              <>
                <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600, padding:'8px 0 4px', textTransform:'uppercase', letterSpacing:'.07em' }}>
                  Usuários encontrados
                </div>
                {searching ? (
                  <div style={{ textAlign:'center', padding:'24px 0', color:'var(--muted)', fontSize:13 }}>Buscando...</div>
                ) : searchResults.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'24px 0', color:'var(--muted)', fontSize:13 }}>Nenhum usuário encontrado</div>
                ) : searchResults.map(u => (
                  <div key={u.uid} onClick={() => openConversation(u.uid, u.name, u.photo)} style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'12px 0', borderBottom:'1px solid var(--border)', cursor:'pointer',
                  }}>
                    <div style={{
                      width:46, height:46, borderRadius:'50%', flexShrink:0,
                      background:'var(--surface2)', border:'2px solid rgba(34,197,94,.2)',
                      overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20,
                    }}>
                      {u.photo ? <img src={u.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : '👤'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:700 }}>{u.name}</div>
                      {u.bio && <div style={{ fontSize:11, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:2 }}>{u.bio}</div>}
                    </div>
                    <div style={{
                      background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.25)',
                      borderRadius:8, padding:'5px 10px', fontSize:11, color:'var(--green)', fontWeight:600, flexShrink:0,
                    }}>Mensagem</div>
                  </div>
                ))}
              </>
            ) : conversations.length === 0 ? (
              <div style={{ textAlign:'center', padding:'56px 0', color:'var(--muted)' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>💬</div>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Sem conversas</div>
                <div style={{ fontSize:12, lineHeight:1.6 }}>Busque um usuário acima para iniciar uma conversa</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600, padding:'8px 0 4px', textTransform:'uppercase', letterSpacing:'.07em' }}>
                  Conversas recentes
                </div>
                {conversations.map(conv => (
                  <div key={conv.otherId} onClick={() => openConversation(conv.otherId, conv.name, conv.photo)} style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'13px 0', borderBottom:'1px solid var(--border)', cursor:'pointer',
                  }}>
                    <div style={{ position:'relative', flexShrink:0 }}>
                      <div style={{
                        width:48, height:48, borderRadius:'50%',
                        background:'var(--surface2)', border:`2px solid ${conv.unread > 0 ? 'var(--green)' : 'rgba(34,197,94,.2)'}`,
                        overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
                      }}>
                        {conv.photo ? <img src={conv.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : '👤'}
                      </div>
                      {conv.unread > 0 && (
                        <div style={{
                          position:'absolute', top:-2, right:-2,
                          width:18, height:18, borderRadius:'50%',
                          background:'var(--green)', color:'#052e16',
                          fontSize:9, fontWeight:800,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          border:'2px solid var(--bg)',
                        }}>{conv.unread > 9 ? '9+' : conv.unread}</div>
                      )}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight: conv.unread > 0 ? 800 : 600, marginBottom:3 }}>{conv.name}</div>
                      <div style={{
                        fontSize:12, color: conv.unread > 0 ? 'var(--text)' : 'var(--muted)',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                        fontWeight: conv.unread > 0 ? 600 : 400,
                      }}>{conv.lastMsg || 'Inicie uma conversa'}</div>
                    </div>
                    <div style={{ fontSize:10, color:'var(--dim)', flexShrink:0 }}>
                      {conv.lastTs ? timeAgo(conv.lastTs) : ''}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* ══ CONVERSA ABERTA ══════════════════════════════════════════════ */}
        <div style={{
          position:'absolute', inset:0, display:'flex', flexDirection:'column',
          opacity: view==='chat' ? 1 : 0,
          pointerEvents: view==='chat' ? 'all' : 'none',
          transform: view==='chat' ? 'translateX(0)' : 'translateX(30px)',
          transition:'opacity .2s, transform .2s',
        }}>
          {/* Header */}
          <div style={{
            display:'flex', alignItems:'center', gap:12,
            padding:'14px 16px',
            background:'var(--surface)',
            borderBottom:'1px solid var(--border)',
            flexShrink:0,
          }}>
            <button onClick={() => setView('list')} style={{
              width:32, height:32, borderRadius:'50%',
              background:'var(--surface2)', border:'1px solid var(--border)',
              color:'var(--muted)', cursor:'pointer', fontSize:16,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>←</button>

            <div style={{
              width:38, height:38, borderRadius:'50%', flexShrink:0,
              background:'var(--surface2)', border:'2px solid rgba(34,197,94,.3)',
              overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
            }}>
              {activeChat?.photo
                ? <img src={activeChat.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                : '👤'}
            </div>

            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:800, fontSize:15, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {activeChat?.name || 'Usuário'}
              </div>
              <div style={{ fontSize:11, color:'var(--green)', display:'flex', alignItems:'center', gap:5, marginTop:1 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', flexShrink:0 }}/>
                Chat privado
              </div>
            </div>

            <button onClick={() => fileRef.current?.click()} style={{
              width:32, height:32, borderRadius:'50%',
              background:'var(--surface2)', border:'1px solid var(--border)',
              color:'var(--muted)', cursor:'pointer', fontSize:16,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>📷</button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFile}/>

            <button onClick={onClose} style={{
              width:32, height:32, borderRadius:'50%',
              background:'var(--surface2)', border:'1px solid var(--border)',
              color:'var(--muted)', cursor:'pointer', fontSize:14,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>✕</button>
          </div>

          {/* Mensagens */}
          <div style={{
            flex:1, overflowY:'auto', padding:'16px',
            display:'flex', flexDirection:'column', gap:2,
            scrollbarWidth:'thin', scrollbarColor:'var(--border) transparent',
          }}>
            {filtered.length === 0 ? (
              <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, color:'var(--muted)', padding:'40px 0' }}>
                <div style={{ fontSize:40, marginBottom:8 }}>👋</div>
                <div style={{ fontSize:14, fontWeight:700 }}>Início da conversa</div>
                <div style={{ fontSize:12, textAlign:'center', lineHeight:1.6 }}>
                  Diga olá para {activeChat?.name?.split(' ')[0] || 'a pessoa'}!
                </div>
              </div>
            ) : filtered.map((msg, idx) => {
              const isMe       = msg.senderId === currentUser?.uid
              const prev       = filtered[idx - 1]
              const showSep    = !prev || !isSameDay(prev.ts, msg.ts)
              const showAvatar = !isMe && (!prev || prev.senderId !== msg.senderId || showSep)
              const showName   = !isMe && showAvatar

              return (
                <React.Fragment key={msg.id || idx}>
                  {/* Separador de data */}
                  {showSep && (
                    <div style={{ textAlign:'center', margin:'16px 0 8px', display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ flex:1, height:1, background:'var(--border)' }}/>
                      <span style={{
                        fontSize:10, fontWeight:700, color:'var(--muted)',
                        textTransform:'uppercase', letterSpacing:'.08em',
                        background:'var(--surface2)', borderRadius:100,
                        padding:'3px 10px', border:'1px solid var(--border)',
                      }}>{dateSep(msg.ts)}</span>
                      <div style={{ flex:1, height:1, background:'var(--border)' }}/>
                    </div>
                  )}

                  <div style={{
                    display:'flex',
                    flexDirection: isMe ? 'row-reverse' : 'row',
                    alignItems:'flex-end', gap:8, marginBottom:2,
                  }}>
                    {/* Avatar */}
                    {!isMe && (
                      <div style={{ flexShrink:0, width:32, height:32, marginBottom:2 }}>
                        {showAvatar ? (
                          msg.senderPhoto
                            ? <img src={msg.senderPhoto} alt="" style={{
                                width:32, height:32, borderRadius:'50%',
                                border:'2px solid var(--border)', objectFit:'cover',
                              }}/>
                            : <div style={{
                                width:32, height:32, borderRadius:'50%',
                                background:'var(--surface3)', border:'2px solid var(--border)',
                                display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
                              }}>👤</div>
                        ) : <div style={{ width:32, height:32 }}/>}
                      </div>
                    )}

                    <div style={{ maxWidth:'72%', display:'flex', flexDirection:'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                      {/* Nome */}
                      {showName && (
                        <div style={{ fontSize:11, fontWeight:700, color:'var(--green)', marginBottom:4, marginLeft:2 }}>
                          {msg.senderName?.split(' ')[0] || 'Usuário'}
                        </div>
                      )}

                      {/* Imagem */}
                      {msg.imageUrl && (
                        <div style={{
                          borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                          overflow:'hidden', marginBottom: msg.text ? 4 : 0,
                          border:'1px solid var(--border)', cursor:'zoom-in', maxWidth:220,
                        }} onClick={() => setLightbox(msg.imageUrl)}>
                          <img src={msg.imageUrl} alt="" style={{ width:'100%', display:'block' }}/>
                        </div>
                      )}

                      {/* Bolha de texto — não exibe se for só placeholder de imagem */}
                      {msg.text && !(msg.imageUrl && msg.text === '📷') && (
                        <div style={{
                          background: isMe
                            ? 'linear-gradient(135deg, var(--green), #16a34a)'
                            : 'var(--surface2)',
                          color: isMe ? '#052e16' : 'var(--text)',
                          borderRadius: isMe ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                          padding:'10px 14px',
                          fontSize:14, lineHeight:1.5, fontWeight: isMe ? 600 : 400,
                          border: isMe ? 'none' : '1px solid var(--border)',
                          boxShadow: isMe ? '0 2px 8px rgba(34,197,94,.2)' : 'none',
                          wordBreak:'break-word',
                        }}>
                          {msg.text}
                        </div>
                      )}

                      {/* Horário */}
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

          {/* Input */}
          <div style={{
            display:'flex', alignItems:'flex-end', gap:8, padding:'12px 16px',
            paddingBottom:'calc(12px + env(safe-area-inset-bottom,0px))',
            background:'var(--surface)', borderTop:'1px solid var(--border)', flexShrink:0,
          }}>
            <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{
              width:40, height:40, borderRadius:'50%', flexShrink:0,
              background:'var(--surface2)', border:'1px solid var(--border)',
              color: uploading ? 'var(--green)' : 'var(--muted)',
              cursor:'pointer', fontSize:18,
              display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s',
            }}>{uploading ? '⏳' : '📎'}</button>

            <div style={{
              flex:1, display:'flex', alignItems:'flex-end',
              background:'var(--surface2)', border:'1.5px solid var(--border)',
              borderRadius:22, padding:'8px 14px', gap:8, transition:'border-color .2s',
            }}
              onFocus={e => e.currentTarget.style.borderColor='var(--green)'}
              onBlur={e  => e.currentTarget.style.borderColor='var(--border)'}
            >
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => {
                  setText(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
                }}
                onKeyDown={handleKey}
                placeholder="Mensagem..."
                rows={1}
                style={{
                  flex:1, background:'none', border:'none', outline:'none',
                  color:'var(--text)', fontFamily:"'Inter',sans-serif",
                  fontSize:14, resize:'none', lineHeight:1.5,
                  maxHeight:100, overflowY:'auto', scrollbarWidth:'none',
                }}
              />
            </div>

            <button onClick={handleSend} disabled={!text.trim() || sending} style={{
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
      </div>
    </>
  )
}
