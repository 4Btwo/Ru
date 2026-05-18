import React, { useState } from 'react'

function Logo() {
  return (
    <div style={{textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:14}}>
      <div style={{position:'relative'}}>
        <div style={{position:'absolute',inset:-20,borderRadius:'50%',background:'radial-gradient(circle,rgba(79,142,255,0.18),transparent 70%)',animation:'pulse 3s ease infinite'}}/>
        <div style={{
          width:88,height:88,borderRadius:26,
          background:'linear-gradient(135deg,#4f8eff,#7c5cfc,#b44cf0)',
          display:'flex',alignItems:'center',justifyContent:'center',
          boxShadow:'0 0 48px rgba(79,142,255,0.55),0 0 96px rgba(124,92,252,0.2)',
          position:'relative',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="white"/>
            <circle cx="12" cy="9" r="2.5" fill="rgba(255,255,255,0.6)"/>
          </svg>
          <div style={{position:'absolute',top:12,left:16,width:24,height:9,borderRadius:12,background:'rgba(255,255,255,0.18)',filter:'blur(3px)'}}/>
        </div>
      </div>
      <div style={{fontFamily:"'Outfit',sans-serif",fontSize:42,fontWeight:900,letterSpacing:'-.06em',lineHeight:1,
        background:'linear-gradient(135deg,#f0f0ff 30%,#7c5cfc)',
        WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>
        urbyn
      </div>
      <div style={{fontSize:13,color:'rgba(240,240,255,0.45)',fontWeight:500,letterSpacing:'.01em'}}>
        A cidade respirando em tempo real
      </div>
    </div>
  )
}

function Input({label, type='text', value, onChange, placeholder, extra}) {
  const [focused,setFocused] = useState(false)
  const [show,setShow] = useState(false)
  return (
    <div>
      {label && <label style={{display:'block',fontSize:10,color:'rgba(240,240,255,0.4)',marginBottom:7,letterSpacing:'.1em',textTransform:'uppercase',fontWeight:700,fontFamily:"'DM Sans',sans-serif"}}>{label}</label>}
      <div style={{position:'relative'}}>
        <input
          type={type==='password'&&show?'text':type}
          value={value} onChange={onChange} placeholder={placeholder}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
          style={{
            width:'100%',
            background:focused?'rgba(79,142,255,0.07)':'rgba(255,255,255,0.04)',
            border:`1.5px solid ${focused?'rgba(79,142,255,0.55)':'rgba(255,255,255,0.08)'}`,
            borderRadius:14,padding:'14px 16px',color:'#f0f0ff',
            fontFamily:"'DM Sans',sans-serif",fontSize:14,outline:'none',
            boxSizing:'border-box',paddingRight:type==='password'?48:16,
            transition:'border-color .2s,background .2s,box-shadow .2s',
            boxShadow:focused?'0 0 0 3px rgba(79,142,255,0.12)':'none',
          }}
        />
        {type==='password'&&(
          <button onClick={()=>setShow(s=>!s)} type="button" style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'rgba(240,240,255,0.38)',fontSize:17,padding:0}}>{show?'🙈':'👁️'}</button>
        )}
      </div>
      {extra}
    </div>
  )
}

function PrimaryBtn({children, onClick, type='button', disabled, busy}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled||busy} style={{
      width:'100%',padding:'15px',borderRadius:14,cursor:(disabled||busy)?'not-allowed':'pointer',
      fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:14,color:'#fff',border:'none',
      background:'linear-gradient(135deg,#4f8eff,#7c5cfc)',
      boxShadow:'0 4px 24px rgba(79,142,255,0.4)',
      transition:'opacity .15s,transform .12s',
      opacity:(disabled||busy)?0.45:1,
    }}
      onMouseDown={e=>!disabled&&!busy&&(e.currentTarget.style.transform='scale(.98)')}
      onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
    >{busy?'⏳ Aguarde...':children}</button>
  )
}

function GhostBtn({children, onClick, type='button'}) {
  return (
    <button type={type} onClick={onClick} style={{
      width:'100%',padding:'14px',borderRadius:14,cursor:'pointer',
      fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:14,color:'rgba(240,240,255,0.8)',
      background:'rgba(255,255,255,0.04)',border:'1.5px solid rgba(255,255,255,0.09)',
      transition:'background .2s,border-color .2s,transform .12s',
    }}
      onMouseDown={e=>e.currentTarget.style.transform='scale(.98)'}
      onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
      onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.07)';e.currentTarget.style.borderColor='rgba(255,255,255,0.15)'}}
      onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.borderColor='rgba(255,255,255,0.09)'}}
    >{children}</button>
  )
}

const Err = ({m}) => m ? (
  <div style={{background:'rgba(255,71,87,0.08)',border:'1px solid rgba(255,71,87,0.28)',borderRadius:12,padding:'11px 14px',fontSize:12,color:'#ff4757',lineHeight:1.6,fontFamily:"'DM Sans',sans-serif"}}>{m}</div>
) : null

const Ok = ({m}) => m ? (
  <div style={{background:'rgba(0,245,160,0.07)',border:'1px solid rgba(0,245,160,0.28)',borderRadius:12,padding:'11px 14px',fontSize:12,color:'#00f5a0',lineHeight:1.6,fontFamily:"'DM Sans',sans-serif"}}>{m}</div>
) : null

const Divider = () => (
  <div style={{display:'flex',alignItems:'center',gap:10}}>
    <div style={{flex:1,height:1,background:'rgba(255,255,255,0.07)'}}/>
    <span style={{fontSize:11,color:'rgba(240,240,255,0.3)',fontWeight:600,fontFamily:"'DM Sans',sans-serif"}}>ou</span>
    <div style={{flex:1,height:1,background:'rgba(255,255,255,0.07)'}}/>
  </div>
)

const Back = ({onClick}) => (
  <button onClick={onClick} type="button" style={{background:'none',border:'none',color:'rgba(240,240,255,0.4)',cursor:'pointer',fontSize:13,padding:'2px 0',fontFamily:"'DM Sans',sans-serif",display:'flex',alignItems:'center',gap:5,fontWeight:600,transition:'color .2s'}}
    onMouseEnter={e=>e.currentTarget.style.color='rgba(240,240,255,0.85)'}
    onMouseLeave={e=>e.currentTarget.style.color='rgba(240,240,255,0.4)'}
  >← Voltar</button>
)

const Link = ({onClick,children}) => (
  <button onClick={onClick} type="button" style={{background:'none',border:'none',color:'#4f8eff',cursor:'pointer',fontSize:12,fontFamily:"'DM Sans',sans-serif",padding:'2px 0',fontWeight:700,transition:'opacity .2s'}}>{children}</button>
)

const Card = ({children}) => (
  <div style={{
    width:'100%',maxWidth:400,
    background:'rgba(10,10,22,0.95)',
    backdropFilter:'blur(48px)',WebkitBackdropFilter:'blur(48px)',
    border:'1px solid rgba(255,255,255,0.08)',
    borderRadius:28,padding:'28px 24px',
    display:'flex',flexDirection:'column',gap:16,
    boxShadow:'0 40px 80px rgba(0,0,0,0.65),0 0 0 1px rgba(255,255,255,0.04) inset',
  }}>{children}</div>
)

const Wrap = ({children}) => (
  <div style={{
    position:'fixed',inset:0,background:'#080810',
    display:'flex',flexDirection:'column',alignItems:'center',
    justifyContent:'center',gap:28,padding:'24px 20px',
    overflowY:'auto',fontFamily:"'DM Sans',sans-serif",
  }}>
    <div style={{position:'absolute',top:-60,left:'50%',transform:'translateX(-50%)',width:600,height:600,borderRadius:'50%',background:'radial-gradient(circle,rgba(79,142,255,0.07) 0%,transparent 65%)',pointerEvents:'none'}}/>
    <div style={{position:'absolute',top:80,right:-100,width:350,height:350,borderRadius:'50%',background:'radial-gradient(circle,rgba(124,92,252,0.07) 0%,transparent 65%)',pointerEvents:'none'}}/>
    <div style={{position:'absolute',bottom:60,left:-80,width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(0,245,160,0.05) 0%,transparent 65%)',pointerEvents:'none'}}/>
    <div style={{position:'absolute',inset:0,pointerEvents:'none',opacity:.018,backgroundImage:'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',backgroundSize:'48px 48px'}}/>
    {children}
    <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.06);opacity:.7}}`}</style>
  </div>
)

function GoogleBtn({onClick,busy}) {
  return (
    <button onClick={onClick} disabled={busy} style={{
      width:'100%',padding:'14px',borderRadius:14,cursor:busy?'not-allowed':'pointer',
      fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:14,color:'rgba(240,240,255,0.88)',
      background:'rgba(255,255,255,0.05)',border:'1.5px solid rgba(255,255,255,0.1)',
      display:'flex',alignItems:'center',justifyContent:'center',gap:10,
      transition:'background .2s,transform .12s',opacity:busy?.5:1,
    }}
      onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.08)'}}
      onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.05)'}}
      onMouseDown={e=>e.currentTarget.style.transform='scale(.98)'}
      onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
    >
      <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 32.8 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.5 15.8 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.6 26.9 36 24 36c-5.2 0-9.5-3.1-11.3-7.6l-6.6 5.1C9.6 39.4 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.5 4.6-4.7 6l6.2 5.2C40.6 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"/></svg>
      {busy ? 'Conectando...' : 'Continuar com Google'}
    </button>
  )
}

export default function LoginScreen({onLogin, loginWithEmail, registerWithEmail, resetPassword, authError, setAuthError}) {
  const [tab,  setTab]  = useState('main')
  const [name, setName] = useState('')
  const [em,   setEm]   = useState('')
  const [pw,   setPw]   = useState('')
  const [pw2,  setPw2]  = useState('')
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState(null)
  const [ok,   setOk]   = useState(null)

  const e      = err || authError
  const clear  = () => { setErr(null); setAuthError?.(null) }
  const go     = t => { setTab(t); clear(); setOk(null) }
  const google = async () => { clear(); setBusy(true); await onLogin(); setBusy(false) }

  const emailLogin = async ev => {
    ev.preventDefault(); clear()
    if (!em||!pw) { setErr('Preencha e-mail e senha.'); return }
    setBusy(true); const r = await loginWithEmail?.(em,pw); setBusy(false)
    if (!r?.ok) setErr(r?.error)
  }

  const register = async ev => {
    ev.preventDefault(); clear()
    if (!name.trim()) { setErr('Informe seu nome.'); return }
    if (!em) { setErr('Informe seu e-mail.'); return }
    if (pw.length<6) { setErr('Senha mínimo 6 caracteres.'); return }
    if (pw!==pw2) { setErr('Senhas não coincidem.'); return }
    setBusy(true); const r = await registerWithEmail?.(name.trim(),em,pw); setBusy(false)
    if (r?.ok) setOk('Conta criada! Verifique seu e-mail para confirmar.'); else setErr(r?.error)
  }

  const reset = async ev => {
    ev.preventDefault(); clear()
    if (!em) { setErr('Informe seu e-mail.'); return }
    setBusy(true); const r = await resetPassword?.(em); setBusy(false)
    if (r?.ok) setOk('Link enviado! Verifique sua caixa de entrada.'); else setErr(r?.error)
  }

  const features = [{icon:'🗺️',t:'Mapa ao vivo'},{icon:'⚡',t:'Reportes'},{icon:'🔥',t:'Hotspots'},{icon:'👥',t:'Social'}]

  if (tab==='main') return (
    <Wrap>
      <Logo/>
      <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
        {features.map(f=>(
          <div key={f.t} style={{display:'flex',alignItems:'center',gap:6,background:'rgba(79,142,255,0.08)',border:'1px solid rgba(79,142,255,0.22)',borderRadius:999,padding:'6px 13px',fontSize:11,color:'#4f8eff',fontWeight:700}}>{f.icon} {f.t}</div>
        ))}
      </div>
      {authError==='unauthorized-domain'&&(
        <div style={{width:'100%',maxWidth:400,background:'rgba(255,71,87,0.08)',border:'1px solid rgba(255,71,87,0.25)',borderRadius:18,padding:16}}>
          <div style={{fontSize:12,fontWeight:800,color:'#ff4757',marginBottom:6}}>⚠️ Domínio não autorizado</div>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:'#4f8eff',background:'rgba(0,0,0,0.3)',borderRadius:8,padding:'7px 11px'}}>{window.location.hostname}</div>
        </div>
      )}
      <Card>
        <GoogleBtn onClick={google} busy={busy}/>
        <Divider/>
        <PrimaryBtn onClick={()=>go('login')}>✉️  Entrar com E-mail</PrimaryBtn>
        <div style={{textAlign:'center'}}><Link onClick={()=>go('register')}>Não tem conta? Criar grátis →</Link></div>
      </Card>
      <p style={{fontSize:11,color:'rgba(240,240,255,0.22)',display:'flex',gap:10,justifyContent:'center'}}>
        <a href="/privacidade" style={{color:'rgba(240,240,255,0.35)',textDecoration:'none'}}>Privacidade</a>
        <span>·</span>
        <a href="/termos" style={{color:'rgba(240,240,255,0.35)',textDecoration:'none'}}>Termos</a>
      </p>
    </Wrap>
  )

  if (tab==='login') return (
    <Wrap>
      <Logo/>
      <Card>
        <Back onClick={()=>go('main')}/>
        <div>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:800,letterSpacing:'-.03em',marginBottom:4,color:'#f0f0ff'}}>Bem-vindo de volta 👋</div>
          <div style={{fontSize:13,color:'rgba(240,240,255,0.4)'}}>Entre para explorar a cidade</div>
        </div>
        <Err m={e}/><Ok m={ok}/>
        <form onSubmit={emailLogin} style={{display:'flex',flexDirection:'column',gap:13}}>
          <Input label="E-mail" type="email" value={em} onChange={ev=>{setEm(ev.target.value);clear()}} placeholder="seu@email.com"/>
          <Input label="Senha" type="password" value={pw} onChange={ev=>{setPw(ev.target.value);clear()}} placeholder="••••••••"
            extra={<button onClick={()=>go('reset')} type="button" style={{background:'none',border:'none',color:'rgba(240,240,255,0.35)',cursor:'pointer',fontSize:11,padding:'5px 0',textAlign:'right',width:'100%',fontFamily:"'DM Sans',sans-serif",textDecoration:'underline',marginTop:3}}>Esqueci minha senha</button>}
          />
          <PrimaryBtn type="submit" busy={busy}>Entrar</PrimaryBtn>
        </form>
        <Divider/>
        <GoogleBtn onClick={google} busy={busy}/>
        <div style={{textAlign:'center'}}><Link onClick={()=>go('register')}>Não tem conta? Criar conta →</Link></div>
      </Card>
    </Wrap>
  )

  if (tab==='register') return (
    <Wrap>
      <Logo/>
      <Card>
        <Back onClick={()=>go('main')}/>
        <div>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:800,letterSpacing:'-.03em',marginBottom:4,color:'#f0f0ff'}}>Criar conta</div>
          <div style={{fontSize:13,color:'rgba(240,240,255,0.4)'}}>Junte-se à comunidade urbana</div>
        </div>
        <Err m={e}/><Ok m={ok}/>
        {!ok&&(
          <form onSubmit={register} style={{display:'flex',flexDirection:'column',gap:13}}>
            <Input label="Seu nome" value={name} onChange={ev=>{setName(ev.target.value);clear()}} placeholder="Como quer ser chamado?"/>
            <Input label="E-mail" type="email" value={em} onChange={ev=>{setEm(ev.target.value);clear()}} placeholder="seu@email.com"/>
            <Input label="Senha" type="password" value={pw} onChange={ev=>{setPw(ev.target.value);clear()}} placeholder="Mínimo 6 caracteres"/>
            <Input label="Confirmar senha" type="password" value={pw2} onChange={ev=>{setPw2(ev.target.value);clear()}} placeholder="Repita a senha"/>
            <PrimaryBtn type="submit" busy={busy}>Criar conta</PrimaryBtn>
          </form>
        )}
        {ok&&<GhostBtn onClick={()=>go('login')}>Ir para o login</GhostBtn>}
        <div style={{textAlign:'center'}}><Link onClick={()=>go('login')}>Já tem conta? Entrar →</Link></div>
      </Card>
    </Wrap>
  )

  if (tab==='reset') return (
    <Wrap>
      <Logo/>
      <Card>
        <Back onClick={()=>go('login')}/>
        <div>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:800,letterSpacing:'-.03em',marginBottom:4,color:'#f0f0ff'}}>Recuperar senha</div>
          <div style={{fontSize:13,color:'rgba(240,240,255,0.4)',lineHeight:1.7}}>Enviaremos um link para redefinir sua senha.</div>
        </div>
        <Err m={e}/><Ok m={ok}/>
        {!ok&&(
          <form onSubmit={reset} style={{display:'flex',flexDirection:'column',gap:13}}>
            <Input label="E-mail" type="email" value={em} onChange={ev=>{setEm(ev.target.value);clear()}} placeholder="seu@email.com"/>
            <PrimaryBtn type="submit" busy={busy}>Enviar link de recuperação</PrimaryBtn>
          </form>
        )}
        {ok&&<GhostBtn onClick={()=>go('login')}>Voltar para o login</GhostBtn>}
      </Card>
    </Wrap>
  )
  return null
}
