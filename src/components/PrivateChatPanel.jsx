// ── CHAT PRIVADO B2B (Direto entre usuários) ──────────────────────────────────
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ref, onValue, push, set, update, get, serverTimestamp, query, orderByChild, limitToLast } from 'firebase/database'
import { db } from '../lib/firebase'

const timeAgo = ts => {
  const d = Math.floor((Date.now() - ts) / 1000)
  if (d < 60)    return `${d}s`
  if (d < 3600)  return `${Math.floor(d/60)}min`
  if (d < 86400) return `${Math.floor(d/3600)}h`
  return `${Math.floor(d/86400)}d`
}

/* ── Gera o ID único de conversa entre dois usuários (sempre o mesmo) ─────── */
function chatId(uid1, uid2) {
  return [uid1, uid2].sort().join('__')
}

/* ── Hook: lista de conversas do usuário ─────────────────────────────────── */
export function usePrivateChats(uid) {
  const [conversations, setConversations] = useState([])
  const [totalUnread, setTotalUnread]     = useState(0)

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

/* ── Componente principal ──────────────────────────────────────────────────── */
export default function PrivateChatPanel({ open, onClose, currentUser, initialTargetUid, initialTargetName, initialTargetPhoto }) {
  const [view, setView]               = useState('list') // 'list' | 'chat'
  const [conversations, setConversations] = useState([])
  const [activeChat, setActiveChat]   = useState(null) // { uid, name, photo }
  const [messages, setMessages]       = useState([])
  const [text, setText]               = useState('')
  const [sending, setSending]         = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching]     = useState(false)
  const [usersMap, setUsersMap]       = useState({})
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  /* Carrega todas as conversas do usuário */
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

  /* Se tiver target inicial, abre diretamente a conversa */
  useEffect(() => {
    if (open && initialTargetUid && currentUser?.uid) {
      setActiveChat({ uid: initialTargetUid, name: initialTargetName || 'Usuário', photo: initialTargetPhoto || null })
      setView('chat')
    }
  }, [open, initialTargetUid])

  /* Reset ao fechar */
  useEffect(() => {
    if (!open) {
      setTimeout(() => { setView('list'); setActiveChat(null); setText('') }, 350)
    }
  }, [open])

  /* Carrega mensagens da conversa ativa */
  useEffect(() => {
    if (!activeChat || !currentUser?.uid) return
    const cId   = chatId(currentUser.uid, activeChat.uid)
    const msgsRef = query(ref(db, `privateChats/messages/${cId}`), orderByChild('ts'), limitToLast(80))
    const unsub = onValue(msgsRef, snap => {
      if (!snap.exists()) { setMessages([]); return }
      const list = []
      snap.forEach(child => list.push({ id: child.key, ...child.val() }))
      setMessages(list)
      // Marca como lido
      update(ref(db, `privateChats/index/${currentUser.uid}/${activeChat.uid}`), { unread: 0 })
    })
    return unsub
  }, [activeChat, currentUser?.uid])

  /* Auto scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /* Foca input ao abrir chat */
  useEffect(() => {
    if (view === 'chat') setTimeout(() => inputRef.current?.focus(), 300)
  }, [view])

  /* Busca usuários por nome */
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return }
    setSearching(true)
    get(ref(db, 'users')).then(snap => {
      if (!snap.exists()) return
      const results = []
      snap.forEach(child => {
        const u = child.val()
        if (child.key === currentUser.uid) return
        if ((u.name || '').toLowerCase().includes(searchQuery.toLowerCase())) {
          results.push({ uid: child.key, name: u.name, photo: u.photo || null, bio: u.bio })
        }
      })
      setSearchResults(results.slice(0, 8))
      setSearching(false)
    })
  }, [searchQuery, currentUser?.uid])

  /* ── Enviar mensagem ── */
  const handleSend = useCallback(async () => {
    const msg = text.trim()
    if (!msg || !activeChat || !currentUser?.uid || sending) return
    setSending(true)
    setText('')
    const cId = chatId(currentUser.uid, activeChat.uid)
    const ts  = Date.now()

    // Salva mensagem
    await push(ref(db, `privateChats/messages/${cId}`), {
      senderId: currentUser.uid,
      senderName: currentUser.name,
      senderPhoto: currentUser.photo || null,
      text: msg,
      ts,
    })

    // Atualiza índice dos dois usuários
    await update(ref(db, `privateChats/index/${currentUser.uid}/${activeChat.uid}`), {
      name: activeChat.name, photo: activeChat.photo || null,
      lastMsg: msg, lastTs: ts, unread: 0,
    })
    const otherSnap = await get(ref(db, `privateChats/index/${activeChat.uid}/${currentUser.uid}/unread`))
    const prevUnread = otherSnap.exists() ? (otherSnap.val() || 0) : 0
    await update(ref(db, `privateChats/index/${activeChat.uid}/${currentUser.uid}`), {
      name: currentUser.name, photo: currentUser.photo || null,
      lastMsg: msg, lastTs: ts, unread: prevUnread + 1,
    })

    setSending(false)
  }, [text, activeChat, currentUser, sending])

  const handleKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }

  const openConversation = (uid, name, photo) => {
    setActiveChat({ uid, name, photo })
    setSearchQuery('')
    setSearchResults([])
    setView('chat')
  }

  /* ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 2900,
        background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(4px)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none',
        transition: 'opacity .25s',
      }}/>

      {/* Panel */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 3000,
        background: 'var(--bg)', borderRadius: '24px 24px 0 0',
        height: '88vh', display: 'flex', flexDirection: 'column',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform .35s cubic-bezier(.4,0,.2,1)',
        borderTop: '1px solid var(--border)',
        overflow: 'hidden',
      }}>
        {/* ══ LISTA DE CONVERSAS ══════════════════════════════════════════════ */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          opacity: view === 'list' ? 1 : 0,
          pointerEvents: view === 'list' ? 'all' : 'none',
          transform: view === 'list' ? 'translateX(0)' : 'translateX(-30px)',
          transition: 'opacity .2s, transform .2s',
        }}>
          {/* Handle */}
          <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 2, margin: '12px auto 0', flexShrink: 0 }}/>

          {/* Header */}
          <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(34,197,94,.15)', border: '1px solid rgba(34,197,94,.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                }}>💬</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Mensagens</div>
              </div>
              <button onClick={onClose} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--surface2)', border: '1px solid var(--border)',
                cursor: 'pointer', color: 'var(--muted)', fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>

            {/* Search para nova conversa */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--surface2)', border: '1.5px solid var(--border)',
              borderRadius: 12, padding: '10px 14px', marginBottom: 8,
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15" style={{ color: 'var(--muted)', flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar usuário para conversar..."
                style={{
                  background: 'none', border: 'none', outline: 'none',
                  color: 'var(--text)', fontFamily: "'Inter',sans-serif",
                  fontSize: 13, flex: 1,
                }}
              />
              {searchQuery && <span onClick={() => setSearchQuery('')} style={{ cursor: 'pointer', color: 'var(--muted)', fontSize: 15 }}>✕</span>}
            </div>
          </div>

          {/* Resultados de busca OU lista de conversas */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom,0px))' }}>
            {searchQuery.length >= 2 ? (
              <>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, padding: '8px 0 4px', textTransform: 'uppercase', letterSpacing: '.07em' }}>
                  Usuários encontrados
                </div>
                {searching ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>Buscando...</div>
                ) : searchResults.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>Nenhum usuário encontrado</div>
                ) : searchResults.map(u => (
                  <div key={u.uid} onClick={() => openConversation(u.uid, u.name, u.photo)} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 0', borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--surface2)', border: '2px solid rgba(34,197,94,.2)',
                      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                    }}>
                      {u.photo ? <img src={u.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : '👤'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{u.name}</div>
                      {u.bio && <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{u.bio}</div>}
                    </div>
                    <div style={{
                      background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.25)',
                      borderRadius: 8, padding: '5px 10px', fontSize: 11, color: 'var(--green)', fontWeight: 600, flexShrink: 0,
                    }}>Mensagem</div>
                  </div>
                ))}
              </>
            ) : conversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--muted)' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Sem conversas</div>
                <div style={{ fontSize: 12, lineHeight: 1.6 }}>Busque um usuário acima para iniciar uma conversa privada</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, padding: '8px 0 4px', textTransform: 'uppercase', letterSpacing: '.07em' }}>
                  Conversas recentes
                </div>
                {conversations.map(conv => (
                  <div key={conv.otherId} onClick={() => openConversation(conv.otherId, conv.name, conv.photo)} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '13px 0', borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: 'var(--surface2)', border: `2px solid ${conv.unread > 0 ? 'var(--green)' : 'rgba(34,197,94,.2)'}`,
                        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                      }}>
                        {conv.photo ? <img src={conv.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : '👤'}
                      </div>
                      {conv.unread > 0 && (
                        <div style={{
                          position: 'absolute', top: -2, right: -2,
                          width: 18, height: 18, borderRadius: '50%',
                          background: 'var(--green)', color: '#052e16',
                          fontSize: 9, fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '2px solid var(--bg)',
                        }}>{conv.unread > 9 ? '9+' : conv.unread}</div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: conv.unread > 0 ? 800 : 600, marginBottom: 3 }}>{conv.name}</div>
                      <div style={{
                        fontSize: 12, color: conv.unread > 0 ? 'var(--text)' : 'var(--muted)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        fontWeight: conv.unread > 0 ? 600 : 400,
                      }}>{conv.lastMsg || 'Inicie uma conversa'}</div>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--dim)', flexShrink: 0 }}>
                      {conv.lastTs ? timeAgo(conv.lastTs) : ''}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* ══ CONVERSA ABERTA ═════════════════════════════════════════════════ */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          opacity: view === 'chat' ? 1 : 0,
          pointerEvents: view === 'chat' ? 'all' : 'none',
          transform: view === 'chat' ? 'translateX(0)' : 'translateX(30px)',
          transition: 'opacity .2s, transform .2s',
        }}>
          {/* Chat header */}
          <div style={{
            padding: 'calc(12px + var(--sat, 0px)) 16px 12px',
            borderBottom: '1px solid var(--border)', flexShrink: 0,
            background: 'var(--bg)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <button onClick={() => setView('list')} style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--text)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              background: 'var(--surface2)', border: '2px solid rgba(34,197,94,.3)',
              overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>
              {activeChat?.photo ? <img src={activeChat.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : '👤'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeChat?.name || 'Usuário'}</div>
              <div style={{ fontSize: 11, color: 'var(--green)' }}>● Online</div>
            </div>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--muted)', fontSize: 14, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--muted)' }}>
                <div style={{ fontSize: 40 }}>👋</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Início da conversa</div>
                <div style={{ fontSize: 12, textAlign: 'center', lineHeight: 1.6 }}>
                  Diga olá para {activeChat?.name?.split(' ')[0] || 'a pessoa'}!
                </div>
              </div>
            ) : messages.map((msg, i) => {
              const isMe = msg.senderId === currentUser?.uid
              const prevMsg = messages[i - 1]
              const showAvatar = !isMe && (!prevMsg || prevMsg.senderId !== msg.senderId)
              const showTs = !prevMsg || (msg.ts - prevMsg.ts) > 300000 // 5 min
              return (
                <React.Fragment key={msg.id}>
                  {showTs && (
                    <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--dim)', margin: '4px 0' }}>
                      {new Date(msg.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                  <div style={{
                    display: 'flex', gap: 8, alignItems: 'flex-end',
                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                  }}>
                    {!isMe && (
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginBottom: 2,
                        background: 'var(--surface2)', overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                        visibility: showAvatar ? 'visible' : 'hidden',
                      }}>
                        {msg.senderPhoto ? <img src={msg.senderPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : '👤'}
                      </div>
                    )}
                    <div style={{
                      maxWidth: '72%',
                      background: isMe ? 'var(--green)' : 'var(--surface2)',
                      color: isMe ? '#052e16' : 'var(--text)',
                      borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      padding: '10px 14px',
                      fontSize: 13, lineHeight: 1.5,
                      border: isMe ? 'none' : '1px solid var(--border)',
                      wordBreak: 'break-word',
                    }}>
                      {msg.text}
                    </div>
                  </div>
                </React.Fragment>
              )
            })}
            <div ref={bottomRef}/>
          </div>

          {/* Input area */}
          <div style={{
            padding: '12px 16px',
            paddingBottom: 'calc(12px + env(safe-area-inset-bottom,0px))',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg)',
            flexShrink: 0,
            display: 'flex', gap: 10, alignItems: 'flex-end',
          }}>
            <div style={{
              flex: 1, background: 'var(--surface2)', border: '1.5px solid var(--border)',
              borderRadius: 18, padding: '10px 14px',
              display: 'flex', alignItems: 'flex-end',
            }}>
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Mensagem..."
                rows={1}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: 'var(--text)', fontFamily: "'Inter',sans-serif",
                  fontSize: 13, resize: 'none', lineHeight: 1.5,
                  maxHeight: 80, overflowY: 'auto',
                }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: text.trim() ? 'var(--green)' : 'var(--surface2)',
                border: text.trim() ? 'none' : '1px solid var(--border)',
                cursor: text.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background .2s',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke={text.trim() ? '#052e16' : 'var(--muted)'} strokeWidth="2.5" width="18" height="18">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
