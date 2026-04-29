// ── CHAT DO LOCAL + FOTOS ─────────────────────────────────────────────────────
import React, { useState, useRef, useEffect } from 'react'
import { useChat } from '../hooks/useChat'
import { uploadToCloudinary } from '../lib/cloudinary'

function timeLabel(ts) {
  const d = new Date(ts)
  return d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })
}

export default function ChatPanel({ open, location, user, onClose }) {
  const { messages, sendMessage } = useChat(location?.id, user?.uid)
  const [text,      setText]      = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef    = useRef(null)
  const bottomRef  = useRef(null)

  // Scroll para o final quando chegam mensagens
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages, open])

  const handleSend = async () => {
    if (!text.trim()) return
    await sendMessage({ text, userName: user.name, userPhoto: user.photo })
    setText('')
  }

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const imageUrl = await uploadToCloudinary(file)
      await sendMessage({ imageUrl, userName: user.name, userPhoto: user.photo })
    } catch (err) {
      // Mostra a mensagem real do erro (inclui instrução de configuração do .env)
      alert(`Erro ao enviar foto:\n${err.message}`)
      console.error('[ChatPanel] upload error:', err)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  if (!location) return null

  return (
    <>
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:2500,
        background:'rgba(0,0,0,.7)', backdropFilter:'blur(4px)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none',
        transition:'opacity .25s',
      }}/>

      <div style={{
        position:'fixed', inset:0, zIndex:2600,
        background:'#0a0a0f',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition:'transform .35s cubic-bezier(.4,0,.2,1)',
        display:'flex', flexDirection:'column',
      }}>
        {/* Header */}
        <div style={{
          padding:'16px', background:'#12121a',
          borderBottom:'1px solid #2a2a3d',
          display:'flex', alignItems:'center', gap:12, flexShrink:0,
        }}>
          <button onClick={onClose} style={{
            background:'none', border:'none', color:'#6666aa',
            fontSize:22, cursor:'pointer', padding:'0 4px',
          }}>←</button>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, fontSize:15 }}>{location.name}</div>
            <div style={{ fontSize:11, color:'#6666aa', marginTop:1 }}>
              💬 Chat ao vivo · {messages.length} mensagens
            </div>
          </div>
        </div>

        {/* Mensagens */}
        <div style={{ flex:1, overflowY:'auto', padding:'12px 16px', display:'flex', flexDirection:'column', gap:12 }}>
          {messages.length === 0 && (
            <div style={{ textAlign:'center', color:'#6666aa', padding:'40px 0' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>💬</div>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>Sem mensagens ainda</div>
              <div style={{ fontSize:12 }}>Seja o primeiro a comentar!</div>
            </div>
          )}

          {messages.filter(msg => msg.text || msg.imageUrl).map(msg => {
            const isMe = msg.userId === user.uid
            return (
              <div key={msg.id} style={{
                display:'flex', flexDirection: isMe ? 'row-reverse' : 'row',
                alignItems:'flex-end', gap:8,
              }}>
                {/* Avatar */}
                {!isMe && (
                  msg.userPhoto
                    ? <img src={msg.userPhoto} alt="" style={{ width:28, height:28, borderRadius:'50%', flexShrink:0 }}/>
                    : <div style={{ width:28, height:28, borderRadius:'50%', background:'#2a2a3d', flexShrink:0 }}/>
                )}

                <div style={{ maxWidth:'72%' }}>
                  {/* Nome */}
                  {!isMe && (
                    <div style={{ fontSize:10, color:'#6666aa', marginBottom:3, marginLeft:4 }}>
                      {msg.userName?.split(' ')[0]}
                    </div>
                  )}

                  {/* Foto */}
                  {msg.imageUrl && (
                    <div style={{ borderRadius:12, overflow:'hidden', marginBottom: msg.text ? 4 : 0 }}>
                      <img
                        src={msg.imageUrl} alt="foto"
                        style={{ width:'100%', maxWidth:240, display:'block', cursor:'pointer' }}
                        onClick={() => window.open(msg.imageUrl, '_blank')}
                      />
                    </div>
                  )}

                  {/* Texto */}
                  {msg.text && (
                    <div style={{
                      background: isMe ? '#ff2d55' : '#1a1a26',
                      color:'#f0f0ff', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      padding:'10px 14px', fontSize:13, lineHeight:1.5,
                      border: isMe ? 'none' : '1px solid #2a2a3d',
                    }}>
                      {msg.text}
                    </div>
                  )}

                  {/* Hora */}
                  <div style={{ fontSize:10, color:'#6666aa', marginTop:3,
                    textAlign: isMe ? 'right' : 'left', marginRight:4, marginLeft:4 }}>
                    {timeLabel(msg.ts)}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div style={{
          padding:'12px 16px 28px', background:'#12121a',
          borderTop:'1px solid #2a2a3d', flexShrink:0,
          display:'flex', alignItems:'center', gap:8,
        }}>
          {/* Botão foto */}
          <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
            onChange={handlePhoto}/>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              width:44, height:44, borderRadius:12,
              background:'#1a1a26', border:'1px solid #2a2a3d',
              cursor:'pointer', fontSize:20, flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center',
              opacity: uploading ? .5 : 1,
            }}>
            {uploading ? '⏳' : '📷'}
          </button>

          {/* Input texto */}
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Mensagem..."
            maxLength={300}
            style={{
              flex:1, background:'#1a1a26', border:'1px solid #2a2a3d',
              borderRadius:22, padding:'11px 16px', color:'#f0f0ff',
              fontFamily:"'Syne',sans-serif", fontSize:14, outline:'none',
            }}
            onFocus={e => e.target.style.borderColor='#ff2d55'}
            onBlur={e  => e.target.style.borderColor='#2a2a3d'}
          />

          {/* Enviar */}
          <button onClick={handleSend} disabled={!text.trim()} style={{
            width:44, height:44, borderRadius:12,
            background: text.trim() ? '#ff2d55' : '#1a1a26',
            border:'none', cursor: text.trim() ? 'pointer' : 'default',
            fontSize:20, flexShrink:0,
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'background .2s',
          }}>↑</button>
        </div>
      </div>
    </>
  )
}
