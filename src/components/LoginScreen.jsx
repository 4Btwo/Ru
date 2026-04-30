import React, { useState } from 'react'

/* ── Design tokens ─────────────────────────────────────────────────────────── */
const T = {
  bg:'#0c1a12', surface:'#111e16', surf2:'#162018',
  border:'#1f2e23', green:'#22c55e', red:'#ef4444',
  text:'#f0fdf4', muted:'#6b7f70', dim:'#374d3c',
}

/* ── Logo Urbyn ────────────────────────────────────────────────────────────── */
function Logo() {
  return (
    <div style={{textAlign:'center'}}>
      <div style={{
        display:'inline-flex', alignItems:'center', gap:6, marginBottom:16,
      }}>
        <div style={{
          width:48, height:48, borderRadius:14,
          background:`linear-gradient(135deg, ${T.green}, #16a34a)`,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:`0 8px 32px rgba(34,197,94,.35)`,
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="white" opacity=".9"/>
            <circle cx="12" cy="9" r="2.5" fill="white"/>
          </svg>
        </div>
        <span style={{
          fontSize:30, fontWeight:900, color:T.text,
          fontFamily:"'Inter',sans-serif", letterSpacing:'-.02em',
        }}>Urbyn</span>
      </div>
      <p style={{fontSize:13, color:T.muted, lineHeight:1.6}}>
        Sua cidade. <span style={{color:T.green, fontWeight:600}}>Do seu jeito.</span>
      </p>
    </div>
  )
}

/* ── Input ─────────────────────────────────────────────────────────────────── */
function Input({label, type='text', value, onChange, placeholder, extra}) {
  const [focused, setFocused] = useState(false)
  const [show, setShow]       = useState(false)
  return (
    <div>
      {label && <label style={{display:'block', fontSize:11, color:T.muted, marginBottom:5, letterSpacing:'.06em', textTransform:'uppercase'}}>{label}</label>}
      <div style={{position:'relative'}}>
        <input
          type={type==='password' && show ? 'text' : type}
          value={value} onChange={onChange} placeholder={placeholder}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width:'100%', background:T.surf2,
            border:`1.5px solid ${focused ? T.green : T.border}`,
            borderRadius:12, padding:'13px 14px', color:T.text,
            fontFamily:"'Inter',sans-serif", fontSize:14, outline:'none',
            boxSizing:'border-box', paddingRight: type==='password' ? 46 : 14,
            transition:'border-color .2s',
          }}
        />
        {type==='password' && (
          <button onClick={()=>setShow(s=>!s)} type="button" style={{
            position:'absolute', right:13, top:'50%', transform:'translateY(-50%)',
            background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:17, padding:0,
          }}>{show?'🙈':'👁️'}</button>
        )}
      </div>
      {extra}
    </div>
  )
}

/* ── Button ────────────────────────────────────────────────────────────────── */
function Btn({children, onClick, type='button', variant='primary', disabled, busy}) {
  const v = {
    primary:  {background:T.green,   color:'#052e16', border:'none'},
    google:   {background:T.surf2,   color:T.text,    border:`1.5px solid ${T.border}`},
    ghost:    {background:'transparent', color:T.muted, border:'none'},
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled||busy} style={{
      width:'100%', padding:'14px', borderRadius:12, cursor:(disabled||busy)?'not-allowed':'pointer',
      fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:14,
      transition:'opacity .15s, transform .1s',
      opacity:(disabled||busy)?0.5:1, ...v[variant],
    }}
      onMouseEnter={e=>!disabled&&!busy&&(e.currentTarget.style.opacity='.88')}
      onMouseLeave={e=>e.currentTarget.style.opacity=(disabled||busy)?'.5':'1'}
      onMouseDown={e=>!disabled&&!busy&&(e.currentTarget.style.transform='scale(.98)')}
      onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
    >{busy?'⏳ Aguarde...':children}</button>
  )
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */
const ErrBox = ({msg}) => msg ? (
  <div style={{background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.3)',
    borderRadius:10, padding:'10px 14px', fontSize:12, color:T.red, lineHeight:1.6}}>{msg}</div>
) : null

const OkBox = ({msg}) => msg ? (
  <div style={{background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.3)',
    borderRadius:10, padding:'10px 14px', fontSize:12, color:T.green, lineHeight:1.6}}>{msg}</div>
) : null

const Divider = () => (
  <div style={{display:'flex', alignItems:'center', gap:10}}>
    <div style={{flex:1, height:1, background:T.border}}/>
    <span style={{fontSize:11, color:T.muted}}>ou</span>
    <div style={{flex:1, height:1, background:T.border}}/>
  </div>
)

const Back = ({onClick}) => (
  <button onClick={onClick} type="button" style={{
    background:'none', border:'none', color:T.muted, cursor:'pointer',
    fontSize:13, padding:'2px 0', fontFamily:"'Inter',sans-serif", display:'flex', alignItems:'center', gap:4,
  }}>← Voltar</button>
)

const TextLink = ({onClick, children}) => (
  <button onClick={onClick} type="button" style={{
    background:'none', border:'none', color:T.muted, cursor:'pointer',
    fontSize:12, fontFamily:"'Inter',sans-serif", textDecoration:'underline', padding:'2px 0',
  }}>{children}</button>
)

/* ── Card wrapper ──────────────────────────────────────────────────────────── */
const Card = ({children}) => (
  <div style={{
    width:'100%', maxWidth:380,
    background:T.surface, border:`1px solid ${T.border}`,
    borderRadius:20, padding:'24px 22px',
    display:'flex', flexDirection:'column', gap:14,
  }}>{children}</div>
)

const Wrap = ({children}) => (
  <div style={{
    position:'fixed', inset:0, background:T.bg,
    display:'flex', flexDirection:'column', alignItems:'center',
    justifyContent:'center', gap:20, padding:'24px 20px',
    overflowY:'auto', fontFamily:"'Inter',sans-serif",
  }}>
    {/* Glow decorativo */}
    <div style={{
      position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
      width:340, height:340, borderRadius:'50%',
      background:'radial-gradient(circle, rgba(34,197,94,.1) 0%, transparent 65%)',
      pointerEvents:'none',
    }}/>
    {children}
    <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:.7}}`}</style>
  </div>
)

/* ── Tela principal ────────────────────────────────────────────────────────── */
export default function LoginScreen({onLogin, loginWithEmail, registerWithEmail, resetPassword, authError, setAuthError}) {
  const [tab,  setTab]  = useState('main')
  const [name, setName] = useState('')
  const [em,   setEm]   = useState('')
  const [pw,   setPw]   = useState('')
  const [pw2,  setPw2]  = useState('')
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState(null)
  const [ok,   setOk]   = useState(null)

  const e = err || authError
  const clear = () => { setErr(null); setAuthError?.(null) }
  const go = t => { setTab(t); clear(); setOk(null) }

  const google = async () => { clear(); setBusy(true); await onLogin(); setBusy(false) }

  const emailLogin = async (ev) => {
    ev.preventDefault(); clear()
    if (!em||!pw) { setErr('Preencha e-mail e senha.'); return }
    setBusy(true)
    const r = await loginWithEmail?.(em,pw)
    setBusy(false)
    if (!r?.ok) setErr(r?.error)
  }

  const register = async (ev) => {
    ev.preventDefault(); clear()
    if (!name.trim()) { setErr('Informe seu nome.'); return }
    if (!em) { setErr('Informe seu e-mail.'); return }
    if (pw.length<6) { setErr('Senha mínimo 6 caracteres.'); return }
    if (pw!==pw2) { setErr('Senhas não coincidem.'); return }
    setBusy(true)
    const r = await registerWithEmail?.(name.trim(),em,pw)
    setBusy(false)
    if (r?.ok) setOk('Conta criada! Verifique seu e-mail.')
    else setErr(r?.error)
  }

  const reset = async (ev) => {
    ev.preventDefault(); clear()
    if (!em) { setErr('Informe seu e-mail.'); return }
    setBusy(true)
    const r = await resetPassword?.(em)
    setBusy(false)
    if (r?.ok) setOk('Link enviado! Verifique seu e-mail.')
    else setErr(r?.error)
  }

  /* ── main ── */
  if (tab==='main') return (
    <Wrap>
      <Logo/>
      <div style={{display:'flex', flexWrap:'wrap', justifyContent:'center', gap:8, maxWidth:320}}>
        {['🔍 Descubra lugares','👥 Conecte-se','⭐ Avalie e compartilhe'].map(f=>(
          <span key={f} style={{
            background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.2)',
            borderRadius:100, padding:'5px 12px', fontSize:11, color:'#22c55e', fontWeight:600,
          }}>{f}</span>
        ))}
      </div>

      {authError==='unauthorized-domain' && (
        <div style={{width:'100%', maxWidth:380, background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.3)', borderRadius:14, padding:14}}>
          <div style={{fontSize:12, fontWeight:700, color:T.red, marginBottom:6}}>⚠️ Domínio não autorizado no Firebase</div>
          <div style={{fontFamily:"'Space Mono',monospace", fontSize:11, color:'#22c55e', background:T.bg, borderRadius:8, padding:'6px 10px'}}>{window.location.hostname}</div>
        </div>
      )}

      <Card>
        <Btn onClick={google} variant="google" busy={busy}>
          <span style={{display:'flex', alignItems:'center', justifyContent:'center', gap:9}}>
            <GoogleSVG/> Continuar com Google
          </span>
        </Btn>
        <Divider/>
        <Btn onClick={()=>go('login')} variant="google">✉️  Entrar com E-mail</Btn>
        <TextLink onClick={()=>go('register')}>Não tem conta? Criar conta grátis</TextLink>
      </Card>

      <p style={{fontSize:11, color:T.dim, textAlign:'center'}}>
        <a href="/privacy" style={{color:T.muted}}>Política de Privacidade</a>
      </p>
    </Wrap>
  )

  /* ── login ── */
  if (tab==='login') return (
    <Wrap>
      <Logo/>
      <Card>
        <Back onClick={()=>go('main')}/>
        <p style={{fontSize:17, fontWeight:800}}>Bem-vindo de volta! 👋</p>
        <ErrBox msg={e}/><OkBox msg={ok}/>
        <form onSubmit={emailLogin} style={{display:'flex', flexDirection:'column', gap:12}}>
          <Input label="E-mail" type="email" value={em} onChange={ev=>{setEm(ev.target.value);clear()}} placeholder="seu@email.com"/>
          <Input label="Senha" type="password" value={pw} onChange={ev=>{setPw(ev.target.value);clear()}} placeholder="••••••••"
            extra={<button onClick={()=>go('reset')} type="button" style={{background:'none', border:'none', color:T.muted, cursor:'pointer', fontSize:11, padding:'4px 0', textAlign:'right', width:'100%', fontFamily:"'Inter',sans-serif", textDecoration:'underline', marginTop:3}}>Esqueci minha senha</button>}
          />
          <Btn type="submit" variant="primary" busy={busy}>Entrar</Btn>
        </form>
        <Divider/>
        <Btn onClick={google} variant="google" busy={busy}><span style={{display:'flex', alignItems:'center', justifyContent:'center', gap:9}}><GoogleSVG/> Continuar com Google</span></Btn>
        <TextLink onClick={()=>go('register')}>Não tem conta? Criar conta</TextLink>
      </Card>
    </Wrap>
  )

  /* ── register ── */
  if (tab==='register') return (
    <Wrap>
      <Logo/>
      <Card>
        <Back onClick={()=>go('main')}/>
        <p style={{fontSize:17, fontWeight:800}}>Criar conta</p>
        <ErrBox msg={e}/><OkBox msg={ok}/>
        {!ok && (
          <form onSubmit={register} style={{display:'flex', flexDirection:'column', gap:12}}>
            <Input label="Seu nome" value={name} onChange={ev=>{setName(ev.target.value);clear()}} placeholder="Como quer ser chamado?"/>
            <Input label="E-mail" type="email" value={em} onChange={ev=>{setEm(ev.target.value);clear()}} placeholder="seu@email.com"/>
            <Input label="Senha" type="password" value={pw} onChange={ev=>{setPw(ev.target.value);clear()}} placeholder="Mínimo 6 caracteres"/>
            <Input label="Confirmar senha" type="password" value={pw2} onChange={ev=>{setPw2(ev.target.value);clear()}} placeholder="Repita a senha"/>
            <Btn type="submit" variant="primary" busy={busy}>Criar conta</Btn>
          </form>
        )}
        {ok && <Btn onClick={()=>go('login')} variant="google">Ir para o login</Btn>}
        <TextLink onClick={()=>go('login')}>Já tem conta? Entrar</TextLink>
      </Card>
    </Wrap>
  )

  /* ── reset ── */
  if (tab==='reset') return (
    <Wrap>
      <Logo/>
      <Card>
        <Back onClick={()=>go('login')}/>
        <p style={{fontSize:17, fontWeight:800}}>Recuperar senha</p>
        <p style={{fontSize:13, color:T.muted, lineHeight:1.7}}>Enviaremos um link para redefinir sua senha.</p>
        <ErrBox msg={e}/><OkBox msg={ok}/>
        {!ok && (
          <form onSubmit={reset} style={{display:'flex', flexDirection:'column', gap:12}}>
            <Input label="E-mail" type="email" value={em} onChange={ev=>{setEm(ev.target.value);clear()}} placeholder="seu@email.com"/>
            <Btn type="submit" variant="primary" busy={busy}>Enviar link</Btn>
          </form>
        )}
        {ok && <Btn onClick={()=>go('login')} variant="google">Voltar para o login</Btn>}
      </Card>
    </Wrap>
  )
  return null
}

function GoogleSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 32.8 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.5 15.8 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.6 26.9 36 24 36c-5.2 0-9.5-3.1-11.3-7.6l-6.6 5.1C9.6 39.4 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.5 4.6-4.7 6l6.2 5.2C40.6 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"/>
    </svg>
  )
}
