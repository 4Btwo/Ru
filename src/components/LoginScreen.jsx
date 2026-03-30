import React from 'react'

export default function LoginScreen({ onLogin }) {
  return (
    <div style={{
      position:'fixed', inset:0, background:'#0a0a0f',
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', fontFamily:"'Syne',sans-serif", gap:28,
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
        <div style={{ fontSize:13, color:'#6666aa', marginTop:6 }}>
          Bauru ao vivo
        </div>
      </div>

      <p style={{ color:'#6666aa', fontSize:13, textAlign:'center',
        maxWidth:240, lineHeight:1.8 }}>
        Veja e reporte o que está<br/>acontecendo na cidade agora.
      </p>

      <button onClick={onLogin} style={{
        display:'flex', alignItems:'center', gap:10,
        background:'#fff', color:'#111', border:'none', borderRadius:14,
        padding:'14px 28px', fontFamily:"'Syne',sans-serif",
        fontWeight:700, fontSize:14, cursor:'pointer',
        boxShadow:'0 4px 24px rgba(0,0,0,.5)', transition:'transform .15s',
      }}
        onMouseEnter={e => e.currentTarget.style.transform='scale(1.04)'}
        onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
      >
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 32.8 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.5 15.8 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.6 26.9 36 24 36c-5.2 0-9.5-3.1-11.3-7.6l-6.6 5.1C9.6 39.4 16.3 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.5 4.6-4.7 6l6.2 5.2C40.6 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"/>
        </svg>
        Entrar com Google
      </button>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:.7}}`}</style>
    </div>
  )
}
