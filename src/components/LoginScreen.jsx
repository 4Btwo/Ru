import React, { useState } from 'react'

const T = {
  bg:'#0d0d14', surface:'#13131f', surf2:'#191927',
  border:'#252538', primary:'#ff5c35', red:'#ff4757',
  text:'#f5f4ff', muted:'#6b6990', dim:'#3a3a5c',
  accent:'#a855f7',
}

function Logo() {
  return (
    <div style={{textAlign:'center'}}>
      <div style={{display:'inline-flex',flexDirection:'column',alignItems:'center',gap:12,marginBottom:8}}>
        {/* Ícone com gradiente hero */}
        <div style={{
          width:72, height:72, borderRadius:22,
          background:'linear-gradient(135deg,#ff5c35,#d946a8,#a855f7)',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 12px 40px rgba(255,92,53,.35), 0 4px 16px rgba(168,85,247,.2)',
          position:'relative',
        }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="white" opacity=".95"/>
            <circle cx="12" cy="9" r="2.5" fill="white"/>
          </svg>
          {/* Reflexo */}
          <div style={{position:'absolute',top:6,left:10,width:20,height:8,borderRadius:10,background:'rgba(255,255,255,.2)',filter:'blur(2px)'}}/>
        </div>
        <div>
          <span style={{
            fontSize:34, fontWeight:900, color:T.text,
            fontFamily:"'Syne','Plus Jakarta Sans',sans-serif",
            letterSpacing:'-.04em', lineHeight:1,
          }}>Urbyn</span>
          <p style={{fontSize:13, color:T.muted, marginTop:5, lineHeight:1.5}}>
            Sua cidade. <span style={{color:T.primary, fontWeight:700}}>Do seu jeito.</span>
          </p>
        </div>
      </div>
    </div>
  )
}

function Input({label, type='text', value, onChange, placeholder, extra}) {
  const [focused, setFocused] = useState(false)
  const [show, setShow]       = useState(false)
  return (
    <div>
      {label && <label style={{display:'block',fontSize:11,color:T.muted,marginBottom:6,letterSpacing:'.07em',textTransform:'uppercase',fontWeight:700}}>{label}</label>}
      <div style={{position:'relative'}}>
        <input
          type={type==='password'&&show?'text':type}
          value={value} onChange={onChange} placeholder={placeholder}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
          style={{
            width:'100%', background:focused?'rgba(255,92,53,.05)':T.surf2,
            border:`1.5px solid ${focused?T.primary:T.border}`,
            borderRadius:14, padding:'14px 15px', color:T.text,
            fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:14, outline:'none',
            boxSizing:'border-box', paddingRight:type==='password'?46:15,
            transition:'border-color .2s, background .2s',
            boxShadow:focused?`0 0 0 3px rgba(255,92,53,.1)`:none,
          }}
        />
        {type==='password'&&(
          <button onClick={()=>setShow(s=>!s)} type="button" style={{
            position:'absolute',right:13,top:'50%',transform:'translateY(-50%)',
            background:'none',border:'none',cursor:'pointer',color:T.muted,fontSize:17,padding:0,
          }}>{show?'🙈':'👁️'}</button>
        )}
      </div>
      {extra}
    </div>
  )
}

function Btn({children, onClick, type='button', variant='primary', disabled, busy}) {
  const styles = {
    primary: {
      background:'linear-gradient(135deg,#ff5c35,#d946a8)',
      color:'#fff', border:'none',
      boxShadow:'0 4px 20px rgba(255,92,53,.4)',
    },
    google: {
      background:T.surf2, color:T.text,
      border:`1.5px solid ${T.border}`,
    },
    ghost: {background:'transparent', color:T.muted, border:'none'},
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled||busy} style={{
      width:'100%', padding:'15px', borderRadius:14, cursor:(disabled||busy)?'not-allowed':'pointer',
      fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:14,
      transition:'opacity .15s, transform .12s, box-shadow .2s',
      opacity:(disabled||busy)?0.5:1, ...styles[variant],
    }}
      onMouseEnter={e=>!disabled&&!busy&&(e.currentTarget.style.opacity='.9')}
      onMouseLeave={e=>e.currentTarget.style.opacity=(disabled||busy)?'.5':'1'}
      onMouseDown={e=>!disabled&&!busy&&(e.currentTarget.style.transform='scale(.98)')}
      onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
    >{busy?'⏳ Aguarde...':children}</button>
  )
}

const ErrBox = ({msg}) => msg ? (
  <div style={{background:'rgba(255,71,87,.08)',border:'1px solid rgba(255,71,87,.3)',
    borderRadius:12,padding:'11px 14px',fontSize:12,color:T.red,lineHeight:1.6}}>{msg}</div>
) : null

const OkBox = ({msg}) => msg ? (
  <div style={{background:'rgba(52,211,153,.08)',border:'1px solid rgba(52,211,153,.3)',
    borderRadius:12,padding:'11px 14px',fontSize:12,color:'#34d399',lineHeight:1.6}}>{msg}</div>
) : null

const Divider = () => (
  <div style={{display:'flex',alignItems:'center',gap:10}}>
    <div style={{flex:1,height:1,background:T.border}}/>
    <span style={{fontSize:11,color:T.muted,fontWeight:600}}>ou</span>
    <div style={{flex:1,height:1,background:T.border}}/>
  </div>
)

const Back = ({onClick}) => (
  <button onClick={onClick} type="button" style={{
    background:'none',border:'none',color:T.muted,cursor:'pointer',
    fontSize:13,padding:'2px 0',fontFamily:"'Plus Jakarta Sans',sans-serif",
    display:'flex',alignItems:'center',gap:4,fontWeight:600,
  }}>← Voltar</button>
)

const TextLink = ({onClick, children}) => (
  <button onClick={onClick} type="button" style={{
    background:'none',border:'none',color:T.primary,cursor:'pointer',
    fontSize:12,fontFamily:"'Plus Jakarta Sans',sans-serif",
    textDecoration:'none',padding:'2px 0',fontWeight:700,
  }}>{children}</button>
)

const Card = ({children}) => (
  <div style={{
    width:'100%',maxWidth:390,
    background:T.surface,border:`1px solid ${T.border}`,
    borderRadius:24,padding:'26px 22px',
    display:'flex',flexDirection:'column',gap:15,
    boxShadow:'0 24px 60px rgba(0,0,0,.5)',
  }}>{children}</div>
)

const Wrap = ({children}) => (
  <div style={{
    position:'fixed',inset:0,background:T.bg,
    display:'flex',flexDirection:'column',alignItems:'center',
    justifyContent:'center',gap:22,padding:'24px 20px',
    overflowY:'auto',fontFamily:"'Plus Jakarta Sans',sans-serif",
  }}>
    {/* Orbes decorativos — padrão visual de apps modernos */}
    <div style={{position:'absolute',top:-60,left:'50%',transform:'translateX(-50%)',
      width:400,height:400,borderRadius:'50%',
      background:'radial-gradient(circle,rgba(255,92,53,.12) 0%,transparent 65%)',
      pointerEvents:'none'}}/>
    <div style={{position:'absolute',top:80,right:-100,
      width:260,height:260,borderRadius:'50%',
      background:'radial-gradient(circle,rgba(168,85,247,.1) 0%,transparent 65%)',
      pointerEvents:'none'}}/>
    <div style={{position:'absolute',bottom:60,left:-80,
      width:220,height:220,borderRadius:'50%',
      background:'radial-gradient(circle,rgba(217,70,168,.1) 0%,transparent 65%)',
      pointerEvents:'none'}}/>
    {children}
  </div>
)

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

  const features = ['🔍 Descubra lugares','👥 Conecte-se','⭐ Avalie e compartilhe']

  if (tab==='main') return (
    <Wrap>
      <Logo/>
      <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:7,maxWidth:340}}>
        {features.map(f=>(
          <span key={f} style={{
            background:'rgba(255,92,53,.08)',border:'1px solid rgba(255,92,53,.2)',
            borderRadius:100,padding:'5px 13px',fontSize:11,color:T.primary,fontWeight:700,
          }}>{f}</span>
        ))}
      </div>
      {authError==='unauthorized-domain'&&(
        <div style={{width:'100%',maxWidth:390,background:'rgba(255,71,87,.08)',border:'1px solid rgba(255,71,87,.3)',borderRadius:16,padding:14}}>
          <div style={{fontSize:12,fontWeight:800,color:T.red,marginBottom:6}}>⚠️ Domínio não autorizado no Firebase</div>
          <div style={{fontFamily:"'Syne',monospace",fontSize:11,color:T.primary,background:T.bg,borderRadius:8,padding:'6px 10px'}}>{window.location.hostname}</div>
        </div>
      )}
      <Card>
        <Btn onClick={google} variant="google" busy={busy}>
          <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:9}}>
            <GoogleSVG/> Continuar com Google
          </span>
        </Btn>
        <Divider/>
        <Btn onClick={()=>go('login')} variant="primary">✉️  Entrar com E-mail</Btn>
        <div style={{textAlign:'center'}}>
          <TextLink onClick={()=>go('register')}>Não tem conta? Criar conta grátis →</TextLink>
        </div>
      </Card>
      <p style={{fontSize:11,color:T.dim,textAlign:'center',display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
        <a href="/privacidade" style={{color:T.muted}}>Política de Privacidade</a>
        <span style={{color:T.dim}}>·</span>
        <a href="/termos" style={{color:T.muted}}>Termos de Uso</a>
      </p>
    </Wrap>
  )

  if (tab==='login') return (
    <Wrap>
      <Logo/>
      <Card>
        <Back onClick={()=>go('main')}/>
        <p style={{fontSize:18,fontWeight:800}}>Bem-vindo de volta! 👋</p>
        <ErrBox msg={e}/><OkBox msg={ok}/>
        <form onSubmit={emailLogin} style={{display:'flex',flexDirection:'column',gap:13}}>
          <Input label="E-mail" type="email" value={em} onChange={ev=>{setEm(ev.target.value);clear()}} placeholder="seu@email.com"/>
          <Input label="Senha" type="password" value={pw} onChange={ev=>{setPw(ev.target.value);clear()}} placeholder="••••••••"
            extra={<button onClick={()=>go('reset')} type="button" style={{background:'none',border:'none',color:T.muted,cursor:'pointer',fontSize:11,padding:'5px 0',textAlign:'right',width:'100%',fontFamily:"'Plus Jakarta Sans',sans-serif",textDecoration:'underline',marginTop:3}}>Esqueci minha senha</button>}
          />
          <Btn type="submit" variant="primary" busy={busy}>Entrar</Btn>
        </form>
        <Divider/>
        <Btn onClick={google} variant="google" busy={busy}><span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:9}}><GoogleSVG/> Continuar com Google</span></Btn>
        <div style={{textAlign:'center'}}><TextLink onClick={()=>go('register')}>Não tem conta? Criar conta →</TextLink></div>
      </Card>
    </Wrap>
  )

  if (tab==='register') return (
    <Wrap>
      <Logo/>
      <Card>
        <Back onClick={()=>go('main')}/>
        <p style={{fontSize:18,fontWeight:800}}>Criar conta</p>
        <ErrBox msg={e}/><OkBox msg={ok}/>
        {!ok&&(
          <form onSubmit={register} style={{display:'flex',flexDirection:'column',gap:13}}>
            <Input label="Seu nome" value={name} onChange={ev=>{setName(ev.target.value);clear()}} placeholder="Como quer ser chamado?"/>
            <Input label="E-mail" type="email" value={em} onChange={ev=>{setEm(ev.target.value);clear()}} placeholder="seu@email.com"/>
            <Input label="Senha" type="password" value={pw} onChange={ev=>{setPw(ev.target.value);clear()}} placeholder="Mínimo 6 caracteres"/>
            <Input label="Confirmar senha" type="password" value={pw2} onChange={ev=>{setPw2(ev.target.value);clear()}} placeholder="Repita a senha"/>
            <Btn type="submit" variant="primary" busy={busy}>Criar conta</Btn>
          </form>
        )}
        {ok&&<Btn onClick={()=>go('login')} variant="google">Ir para o login</Btn>}
        <div style={{textAlign:'center'}}><TextLink onClick={()=>go('login')}>Já tem conta? Entrar →</TextLink></div>
      </Card>
    </Wrap>
  )

  if (tab==='reset') return (
    <Wrap>
      <Logo/>
      <Card>
        <Back onClick={()=>go('login')}/>
        <p style={{fontSize:18,fontWeight:800}}>Recuperar senha</p>
        <p style={{fontSize:13,color:T.muted,lineHeight:1.7}}>Enviaremos um link para redefinir sua senha.</p>
        <ErrBox msg={e}/><OkBox msg={ok}/>
        {!ok&&(
          <form onSubmit={reset} style={{display:'flex',flexDirection:'column',gap:13}}>
            <Input label="E-mail" type="email" value={em} onChange={ev=>{setEm(ev.target.value);clear()}} placeholder="seu@email.com"/>
            <Btn type="submit" variant="primary" busy={busy}>Enviar link</Btn>
          </form>
        )}
        {ok&&<Btn onClick={()=>go('login')} variant="google">Voltar para o login</Btn>}
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
