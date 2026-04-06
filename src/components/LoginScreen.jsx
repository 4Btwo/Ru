import React from 'react'

export default function LoginScreen({ onLogin, authError }) {
  return (
    <div style={{
      position:'fixed', inset:0, background:'#0a0a0f',
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', fontFamily:"'Syne',sans-serif", gap:24,
      padding:'0 24px',
    }}>
      {/* Logo */}
      <div style={{ textAlign:'center' }}>
        <div style={{
          width:16, height:16, borderRadius:'50%', background:'#ff2d55',
          boxShadow:'0 0 20px #ff2d55', margin:'0 auto 14px',
          animation:'pulse 1.4s ease infinite',
        }}/>
        <div style={{ fontSize:26, fontWeight:800, letterSpacing:'.14em',
          textTransform:'uppercase', color:'#f0f0ff' }}>Radar Urbano</div>
        <div style={{ fontSize:13, color:'#6666aa', marginTop:6 }}>Bauru ao vivo</div>
      </div>

      <p style={{ color:'#6666aa', fontSize:13, textAlign:'center',
        maxWidth:240, lineHeight:1.8 }}>
        Veja e reporte o que está<br/>acontecendo na cidade agora.
      </p>

      {/* Erro de domínio não autorizado — instrução clara */}
      {authError === 'unauthorized-domain' && (
        <div style={{
          width:'100%', maxWidth:360,
          background:'rgba(255,45,85,.08)', border:'1px solid rgba(255,45,85,.35)',
          borderRadius:14, padding:'16px',
        }}>
          <div style={{ fontSize:13, fontWeight:800, color:'#ff2d55', marginBottom:8 }}>
            ⚠️ Domínio não autorizado no Firebase
          </div>
          <div style={{ fontSize:11, color:'#aaaacc', lineHeight:1.7 }}>
            Para resolver, acesse o Firebase Console e adicione este domínio:
          </div>
          <div style={{
            background:'#0a0a0f', borderRadius:8, padding:'8px 12px',
            fontFamily:"'Space Mono',monospace", fontSize:11,
            color:'#00ff88', margin:'8px 0',
          }}>
            {window.location.hostname}
          </div>
          <div style={{ fontSize:11, color:'#6666aa', lineHeight:1.7 }}>
            <strong style={{ color:'#aaaacc' }}>Caminho:</strong><br/>
            Firebase Console → Authentication<br/>
            → Settings → Authorized domains<br/>
            → Add domain
          </div>
        </div>
      )}

      <button onClick={onLogin} style={{
        display:'flex', alignItems:'center', gap:10,
        background:'#fff', color:'#111', border:'none', borderRadius:14,
        padding:'14px 28px', fontFamily:"'Syne',sans-serif",
        fontWeight:700, fontSize:14, cursor:'pointer',
        boxShadow:'0 4px 24px rgba(0,0,0,.5)', transition:'transform .15s',
      }}
        onMouseEnter={e => e.currentTarget.style.transform='scale(1.04)'}
        onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
        onTouchStart={e => e.currentTarget.style.transform='scale(.97)'}
        onTouchEnd={e   => e.currentTarget.style.transform='scale(1)'}
      >
        <GoogleIcon />
        Entrar com Google
      </button>

      <div style={{ fontSize:11, color:'#3a3a5a', textAlign:'center', maxWidth:260, lineHeight:1.6 }}>
        Você será redirecionado para o Google.<br/>
        Nenhuma senha é armazenada aqui.
      </div>

      <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:.7}}`}</style>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 32.8 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.5 15.8 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.6 26.9 36 24 36c-5.2 0-9.5-3.1-11.3-7.6l-6.6 5.1C9.6 39.4 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.5 4.6-4.7 6l6.2 5.2C40.6 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"/>
    </svg>
  )
}
